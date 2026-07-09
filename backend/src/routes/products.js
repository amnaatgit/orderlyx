const express = require('express')
const prisma  = require('../lib/prisma')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()
router.use(authenticate)

const productInclude = {
  category:    { select: { id: true, name: true, color: true } },
  subCategory: { select: { id: true, name: true } },
  supplier:    { select: { id: true, name: true } },
  warehouse:   { select: { id: true, name: true } },
}

// ── GET /api/products ─────────────────────────────────────────────────────────
// ALL roles can read. STAFF/VIEWER never see costPrice.
router.get('/', async (req, res) => {
  try {
    const { search, categoryId, supplierId, status, lowStock, page = 1, limit = 24 } = req.query
    const where = {}

    if (search) {
      where.OR = [
        { name:    { contains: search, mode: 'insensitive' } },
        { sku:     { contains: search, mode: 'insensitive' } },
        { barcode: { contains: search, mode: 'insensitive' } },
      ]
    }
    if (categoryId) where.categoryId = categoryId
    if (supplierId) where.supplierId = supplierId
    if (status)     where.status     = status

    // Apply lowStock as a DB-level filter so pagination counts are accurate
    if (lowStock === 'true') {
      // quantity <= reorderLevel  AND  quantity > 0  (out-of-stock handled separately)
      where.AND = [
        { quantity: { lte: prisma.product.fields?.reorderLevel } },
      ]
      // Prisma doesn't support cross-field comparison directly; use raw filter workaround:
      // We keep client-side trim only when NOT paginating specially, but
      // for correct counts we must filter in DB. Use a raw where with $queryRaw or
      // the recommended approach: filter by a threshold. Since reorderLevel varies per
      // product, we fetch all and filter — but we do so on the FULL set, not a page.
      // Strategy: when lowStock=true, skip pagination and return full filtered list.
      const all = await prisma.product.findMany({
        where: { ...where, AND: undefined }, // remove placeholder
        include: productInclude,
        orderBy: { createdAt: 'desc' },
      })
      // Cross-field comparison in JS (unavoidable without raw SQL for this schema)
      const filtered = all.filter(p => p.quantity > 0 && p.quantity <= p.reorderLevel)
      const stripped = stripFinancials(filtered, req.user.role)
      return res.json({ products: stripped, total: stripped.length, page: 1, pages: 1 })
    }

    const skip = (parseInt(page) - 1) * parseInt(limit)
    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, include: productInclude, orderBy: { createdAt: 'desc' }, skip, take: parseInt(limit) }),
      prisma.product.count({ where }),
    ])

    res.json({
      products: stripFinancials(products, req.user.role),
      total,
      page:  parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    })
  } catch (err) {
    console.error('[products/GET]', err)
    res.status(500).json({ error: 'Failed to fetch products.' })
  }
})

// ── GET /api/products/alerts ──────────────────────────────────────────────────
router.get('/alerts', async (req, res) => {
  try {
    const alerts = await prisma.stockAlert.findMany({
      where:   { isResolved: false },
      include: { product: { select: { name: true, sku: true, quantity: true } } },
      orderBy: { createdAt: 'desc' },
      take:    20,
    })
    res.json(alerts)
  } catch {
    res.status(500).json({ error: 'Failed to fetch alerts.' })
  }
})

// ── GET /api/products/:id ─────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const p = await prisma.product.findUnique({
      where:   { id: req.params.id },
      include: {
        ...productInclude,
        priceHistory: { orderBy: { changedAt: 'desc' }, take: 5 },
        orderItems:   { include: { order: { select: { orderNumber: true, type: true, createdAt: true } } }, take: 8, orderBy: { order: { createdAt: 'desc' } } },
      },
    })
    if (!p) return res.status(404).json({ error: 'Product not found.' })
    res.json(p)
  } catch {
    res.status(500).json({ error: 'Failed to fetch product.' })
  }
})

// ── POST /api/products ────────────────────────────────────────────────────────
router.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const data = { ...req.body }

    // Validate required fields
    if (!data.name?.trim()) return res.status(400).json({ error: 'Product name is required.' })
    if (!data.sku?.trim())  return res.status(400).json({ error: 'SKU is required.' })

    // Coerce numeric types
    ;['costPrice', 'sellingPrice', 'taxRate', 'weight'].forEach(f => {
      if (data[f] !== undefined && data[f] !== '') data[f] = parseFloat(data[f])
    })
    ;['quantity', 'reorderLevel', 'maxStockLevel'].forEach(f => {
      if (data[f] !== undefined) data[f] = parseInt(data[f])
    })
    if (data.expiryDate)     data.expiryDate    = new Date(data.expiryDate)
    if (data.categoryId    === '') data.categoryId    = null
    if (data.supplierId    === '') data.supplierId    = null
    if (data.warehouseId   === '') data.warehouseId   = null
    if (data.subCategoryId === '') data.subCategoryId = null

    const product = await prisma.product.create({ data, include: productInclude })

    prisma.auditLog.create({
      data: { userId: req.user.id, action: 'CREATE', tableName: 'products', recordId: product.id, newValues: JSON.stringify({ name: product.name, sku: product.sku }) },
    }).catch(() => {})

    res.status(201).json(product)
  } catch (err) {
    console.error('[products/POST]', err)
    res.status(500).json({ error: err.message || 'Failed to create product.' })
  }
})

// ── PUT /api/products/:id ─────────────────────────────────────────────────────
// ADMIN and MANAGER: full update. STAFF: quantity and status only.
router.put('/:id', requireRole('ADMIN', 'MANAGER', 'STAFF'), async (req, res) => {
  try {
    let data = { ...req.body }

    if (req.user.role === 'STAFF') {
      // Whitelist — STAFF may only adjust stock quantity and status
      const { quantity, status } = data
      data = {}
      if (quantity !== undefined) data.quantity = parseInt(quantity)
      if (status   !== undefined) data.status   = status
      if (Object.keys(data).length === 0) {
        return res.status(400).json({ error: 'No permitted fields provided.' })
      }
    } else {
      ;['costPrice', 'sellingPrice', 'taxRate', 'weight'].forEach(f => {
        if (data[f] !== undefined && data[f] !== '') data[f] = parseFloat(data[f])
      })
      ;['quantity', 'reorderLevel', 'maxStockLevel'].forEach(f => {
        if (data[f] !== undefined) data[f] = parseInt(data[f])
      })
      if (data.expiryDate) data.expiryDate = new Date(data.expiryDate)
    }

    const product = await prisma.product.update({ where: { id: req.params.id }, data, include: productInclude })

    prisma.auditLog.create({
      data: { userId: req.user.id, action: 'UPDATE', tableName: 'products', recordId: product.id, newValues: JSON.stringify(data) },
    }).catch(() => {})

    res.json(product)
  } catch (err) {
    res.status(500).json({ error: err.message || 'Failed to update product.' })
  }
})

// ── DELETE /api/products/:id ─────────────────────────────────────────────────
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    const product = await prisma.product.findUnique({ where: { id: req.params.id }, select: { name: true, sku: true } })
    if (!product) return res.status(404).json({ error: 'Product not found.' })
    await prisma.product.delete({ where: { id: req.params.id } })
    prisma.auditLog.create({
      data: { userId: req.user.id, action: 'DELETE', tableName: 'products', recordId: req.params.id, oldValues: JSON.stringify(product) },
    }).catch(() => {})
    res.json({ message: 'Product deleted.' })
  } catch {
    res.status(500).json({ error: 'Failed to delete product.' })
  }
})

// ── Helper: strip costPrice for non-financial roles ───────────────────────────
function stripFinancials(products, role) {
  if (role === 'STAFF' || role === 'VIEWER') {
    return products.map(({ costPrice, ...rest }) => rest)
  }
  return products
}

module.exports = router
