const express   = require('express')
const prisma = require('../lib/prisma')
const { authenticate, requireRole } = require('../middleware/auth')

// ── CUSTOMERS ──────────────────────────────────────────────────────────────
const custRouter = express.Router()
custRouter.use(authenticate)

custRouter.get('/', async (req, res) => {
  try {
    const { search } = req.query
    const where = search
      ? { OR: [
          { name:  { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { city:  { contains: search, mode: 'insensitive' } },
        ]}
      : {}
    res.json(await prisma.customer.findMany({ where, orderBy: { name: 'asc' } }))
  } catch { res.status(500).json({ error: 'Failed to fetch customers.' }) }
})

// ADMIN and MANAGER only
custRouter.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const data = { ...req.body }
    if (data.creditLimit) data.creditLimit = parseFloat(data.creditLimit)
    res.status(201).json(await prisma.customer.create({ data }))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

custRouter.put('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try { res.json(await prisma.customer.update({ where: { id: req.params.id }, data: req.body })) }
  catch { res.status(500).json({ error: 'Failed.' }) }
})

// ADMIN ONLY
custRouter.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  try { await prisma.customer.delete({ where: { id: req.params.id } }); res.json({ message: 'Deleted.' }) }
  catch { res.status(500).json({ error: 'Failed.' }) }
})

module.exports.customersRouter = custRouter

// ── USERS (Admin only) ─────────────────────────────────────────────────────
const usersRouter = express.Router()
usersRouter.use(authenticate)
usersRouter.use(requireRole('ADMIN'))

usersRouter.get('/', async (req, res) => {
  try {
    const users = await prisma.user.findMany({ select: { id: true, name: true, email: true, role: true, isActive: true, lastLogin: true, createdAt: true }, orderBy: { createdAt: 'asc' } })
    res.json(users)
  } catch { res.status(500).json({ error: 'Failed.' }) }
})

usersRouter.post('/', async (req, res) => {
  try {
    const bcrypt = require('bcryptjs')
    const { name, email, password, role } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email and password required.' })
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) return res.status(409).json({ error: 'Email already exists.' })
    const hashed = await bcrypt.hash(password, 10)
    const user = await prisma.user.create({ data: { name, email, password: hashed, role: role || 'STAFF' }, select: { id: true, name: true, email: true, role: true, createdAt: true } })
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'CREATE', tableName: 'users', recordId: user.id, newValues: JSON.stringify({ name, email, role }) } }).catch(() => {})
    res.status(201).json(user)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

usersRouter.put('/:id', async (req, res) => {
  try {
    const { role, isActive } = req.body
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot modify your own account.' })
    const user = await prisma.user.update({ where: { id: req.params.id }, data: { ...(role && { role }), ...(isActive !== undefined && { isActive }) }, select: { id: true, name: true, email: true, role: true, isActive: true } })
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'UPDATE', tableName: 'users', recordId: req.params.id, newValues: JSON.stringify({ role, isActive }) } }).catch(() => {})
    res.json(user)
  } catch { res.status(500).json({ error: 'Failed.' }) }
})

usersRouter.delete('/:id', async (req, res) => {
  try {
    if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account.' })
    await prisma.user.delete({ where: { id: req.params.id } })
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'DELETE', tableName: 'users', recordId: req.params.id } }).catch(() => {})
    res.json({ message: 'User deleted.' })
  } catch { res.status(500).json({ error: 'Failed.' }) }
})

module.exports.usersRouter = usersRouter

// ── AUDIT LOGS (Admin only) ────────────────────────────────────────────────
const auditRouter = express.Router()
auditRouter.use(authenticate)
auditRouter.use(requireRole('ADMIN'))

auditRouter.get('/', async (req, res) => {
  try {
    const logs = await prisma.auditLog.findMany({
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100
    })
    res.json(logs)
  } catch { res.status(500).json({ error: 'Failed.' }) }
})

module.exports.auditRouter = auditRouter

// ── DASHBOARD ──────────────────────────────────────────────────────────────
const dashRouter = express.Router()
dashRouter.use(authenticate)

dashRouter.get('/stats', async (req, res) => {
  try {
    const role = req.user.role

    const [totalProducts, totalSuppliers, totalOrders, totalCustomers, allProducts, recentOrders, categoryStats, alerts, reorderRequests] = await Promise.all([
      prisma.product.count({ where: { status: 'ACTIVE' } }),
      prisma.supplier.count({ where: { status: 'ACTIVE' } }),
      prisma.order.count(),
      prisma.customer.count(),
      prisma.product.findMany({ select: { quantity: true, sellingPrice: true, costPrice: true, reorderLevel: true } }),
      prisma.order.findMany({ take: 6, orderBy: { createdAt: 'desc' }, include: { user: { select: { name: true } }, items: { include: { product: { select: { name: true } } } } } }),
      prisma.category.findMany({ include: { products: { select: { quantity: true, sellingPrice: true } }, _count: { select: { products: true } } } }),
      prisma.stockAlert.findMany({ where: { isResolved: false }, include: { product: { select: { name: true, sku: true, quantity: true } } }, orderBy: { createdAt: 'desc' }, take: 5 }),
      prisma.reorderRequest.count({ where: { status: 'pending' } }),
    ])

    const inventoryValue   = allProducts.reduce((s, p) => s + Number(p.costPrice) * p.quantity, 0)
    const retailValue      = allProducts.reduce((s, p) => s + Number(p.sellingPrice) * p.quantity, 0)
    const lowStock         = allProducts.filter(p => p.quantity > 0 && p.quantity <= p.reorderLevel).length
    const outOfStock       = allProducts.filter(p => p.quantity === 0).length

    const thisMonth = new Date(); thisMonth.setDate(1); thisMonth.setHours(0,0,0,0)
    const monthlyOrders    = await prisma.order.findMany({ where: { createdAt: { gte: thisMonth }, status: { not: 'CANCELLED' } }, select: { type: true, totalAmount: true } })
    const monthlyRevenue   = monthlyOrders.filter(o => o.type === 'SALE').reduce((s, o) => s + Number(o.totalAmount), 0)
    const monthlyPurchases = monthlyOrders.filter(o => o.type === 'PURCHASE').reduce((s, o) => s + Number(o.totalAmount), 0)

    // Base stats for all roles
    const baseStats = { totalProducts, totalSuppliers, totalOrders, totalCustomers, lowStock, outOfStock, reorderRequests }

    // Financial stats — ADMIN and MANAGER only
    const financialStats = (role === 'ADMIN' || role === 'MANAGER')
      ? { inventoryValue: inventoryValue.toFixed(2), retailValue: retailValue.toFixed(2), potentialProfit: (retailValue - inventoryValue).toFixed(2), monthlyRevenue: monthlyRevenue.toFixed(2), monthlyPurchases: monthlyPurchases.toFixed(2) }
      : {}

    // Audit stats — ADMIN only
    const adminStats = role === 'ADMIN'
      ? { totalUsers: await prisma.user.count(), recentAuditCount: await prisma.auditLog.count({ where: { createdAt: { gte: new Date(Date.now() - 86400000) } } }) }
      : {}

    res.json({
      stats: { ...baseStats, ...financialStats, ...adminStats },
      recentOrders,
      categoryStats: categoryStats.map(c => ({ name: c.name, count: c._count.products, value: c.products.reduce((s, p) => s + Number(p.sellingPrice) * p.quantity, 0) })),
      alerts,
    })
  } catch (err) { console.error(err); res.status(500).json({ error: 'Failed.' }) }
})

dashRouter.get('/chart-data', async (req, res) => {
  try {
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const orders = await prisma.order.findMany({ where: { createdAt: { gte: sixMonthsAgo }, status: { not: 'CANCELLED' } }, select: { type: true, totalAmount: true, createdAt: true }, orderBy: { createdAt: 'asc' } })
    const monthly = {}
    orders.forEach(o => {
      const key = o.createdAt.toLocaleString('en', { month: 'short', year: '2-digit' })
      if (!monthly[key]) monthly[key] = { month: key, purchases: 0, sales: 0 }
      if (o.type === 'PURCHASE') monthly[key].purchases += Number(o.totalAmount)
      if (o.type === 'SALE')     monthly[key].sales     += Number(o.totalAmount)
    })
    const topProducts = await prisma.product.findMany({ orderBy: { quantity: 'desc' }, take: 8, select: { name: true, quantity: true, reorderLevel: true, category: { select: { name: true, color: true } } } })
    res.json({ monthlyOrders: Object.values(monthly), topProducts })
  } catch { res.status(500).json({ error: 'Failed.' }) }
})

module.exports.dashboardRouter = dashRouter
