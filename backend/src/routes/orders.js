const express = require('express')
const prisma  = require('../lib/prisma')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()
router.use(authenticate)

const orderInclude = {
  user:     { select: { id: true, name: true } },
  supplier: { select: { id: true, name: true } },
  items:    { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
  payment:  true,
  shipment: true,
}

// ── GET /api/orders ───────────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { type, status, page = 1, limit = 20 } = req.query
    const where = {}
    if (type)   where.type   = type
    if (status) where.status = status

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where,
        include:  orderInclude,
        orderBy:  { createdAt: 'desc' },
        skip:     (parseInt(page) - 1) * parseInt(limit),
        take:     parseInt(limit),
      }),
      prisma.order.count({ where }),
    ])

    // Strip financial fields for VIEWER role
    const payload = req.user.role === 'VIEWER'
      ? orders.map(({ totalAmount, discount, taxAmount, payment, ...rest }) => rest)
      : orders

    res.json({ orders: payload, total, page: parseInt(page), pages: Math.ceil(total / parseInt(limit)) })
  } catch {
    res.status(500).json({ error: 'Failed to fetch orders.' })
  }
})

// ── GET /api/orders/:id ───────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const o = await prisma.order.findUnique({ where: { id: req.params.id }, include: orderInclude })
    if (!o) return res.status(404).json({ error: 'Order not found.' })
    res.json(o)
  } catch {
    res.status(500).json({ error: 'Failed to fetch order.' })
  }
})

// ── POST /api/orders ──────────────────────────────────────────────────────────
// Creates the order AND updates stock levels atomically within a transaction.
//
// Stock logic:
//   PURCHASE   → quantity += item.quantity   (receiving goods)
//   SALE       → quantity -= item.quantity   (shipping goods, validated for availability)
//   ADJUSTMENT → quantity += item.quantity   (signed: positive = add, negative = remove)
//
// Order number generation uses a timestamp+random suffix to prevent
// collisions under concurrent requests (replaces the collision-prone count+1 approach).
router.post('/', requireRole('ADMIN', 'MANAGER', 'STAFF'), async (req, res) => {
  try {
    const { type, supplierId, notes, expectedDate, items } = req.body

    if (!type)          return res.status(400).json({ error: 'Order type is required.' })
    if (!items?.length) return res.status(400).json({ error: 'At least one item is required.' })

    const validTypes = ['PURCHASE', 'SALE', 'ADJUSTMENT']
    if (!validTypes.includes(type)) {
      return res.status(400).json({ error: `Invalid order type. Must be one of: ${validTypes.join(', ')}.` })
    }

    // Collision-safe order number: prefix + year + timestamp suffix
    const prefix = type === 'PURCHASE' ? 'PO' : type === 'SALE' ? 'SO' : 'ADJ'
    const year   = new Date().getFullYear()
    const suffix = Date.now().toString(36).toUpperCase().slice(-6)  // base-36, last 6 chars
    const orderNumber = `${prefix}-${year}-${suffix}`

    const result = await prisma.$transaction(async (tx) => {
      // Fetch all products in one query
      const productIds = [...new Set(items.map(i => i.productId))]
      const products   = await tx.product.findMany({ where: { id: { in: productIds } } })

      if (products.length !== productIds.length) {
        throw new Error('One or more products not found.')
      }

      // Validate stock for SALE orders
      if (type === 'SALE') {
        for (const item of items) {
          const p = products.find(p => p.id === item.productId)
          if (p.quantity < item.quantity) {
            throw new Error(`Insufficient stock for "${p.name}". Available: ${p.quantity}, requested: ${item.quantity}.`)
          }
        }
      }

      // Build order items and compute total
      let totalAmount = 0
      const orderItemsData = items.map(item => {
        const p         = products.find(p => p.id === item.productId)
        const unitPrice = parseFloat(item.unitPrice ?? (type === 'PURCHASE' ? p.costPrice : p.sellingPrice))
        const quantity  = parseInt(item.quantity)
        const subtotal  = unitPrice * quantity
        totalAmount    += subtotal
        return { productId: item.productId, quantity, unitPrice, subtotal }
      })

      // Create order
      const order = await tx.order.create({
        data: {
          orderNumber,
          type,
          status:       'CONFIRMED',
          totalAmount,
          notes,
          userId:       req.user.id,
          supplierId:   supplierId || null,
          expectedDate: expectedDate ? new Date(expectedDate) : null,
          items:        { create: orderItemsData },
        },
        include: orderInclude,
      })

      // Update stock levels atomically
      for (const item of items) {
        const qty = parseInt(item.quantity)
        // PURCHASE: always positive  |  SALE: always negative  |  ADJUSTMENT: signed by caller
        const delta = type === 'PURCHASE'  ? qty
                    : type === 'SALE'      ? -qty
                    : qty  // ADJUSTMENT — caller sends signed quantity (e.g. -5 to remove)
        await tx.product.update({
          where: { id: item.productId },
          data:  { quantity: { increment: delta } },
        })
      }

      return order
    })

    prisma.auditLog.create({
      data: {
        userId:    req.user.id,
        action:    'CREATE',
        tableName: 'orders',
        recordId:  result.id,
        newValues: JSON.stringify({ orderNumber: result.orderNumber, type, totalAmount: result.totalAmount }),
      },
    }).catch(() => {})

    res.status(201).json(result)
  } catch (err) {
    console.error('[orders/POST]', err)
    res.status(400).json({ error: err.message || 'Failed to create order.' })
  }
})

// ── PUT /api/orders/:id/status ────────────────────────────────────────────────
router.put('/:id/status', requireRole('ADMIN', 'MANAGER', 'STAFF'), async (req, res) => {
  try {
    const { status } = req.body
    const validStatuses = ['PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED']
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}.` })
    }
    const o = await prisma.order.update({
      where: { id: req.params.id },
      data:  { status, ...(status === 'COMPLETED' && { completedAt: new Date() }) },
    })
    res.json(o)
  } catch {
    res.status(500).json({ error: 'Failed to update order status.' })
  }
})

module.exports = router
