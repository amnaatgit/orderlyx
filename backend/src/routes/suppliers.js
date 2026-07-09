const express = require('express')
const prisma = require('../lib/prisma')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()
router.use(authenticate)

// ALL roles can read
router.get('/', async (req, res) => {
  try {
    const { search, status } = req.query
    const where = {}
    if (search) where.OR = [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }]
    if (status) where.status = status
    const suppliers = await prisma.supplier.findMany({ where, include: { _count: { select: { products: true, orders: true } }, contacts: { where: { isPrimary: true }, take: 1 } }, orderBy: { name: 'asc' } })
    res.json(suppliers)
  } catch { res.status(500).json({ error: 'Failed.' }) }
})

router.get('/:id', async (req, res) => {
  try {
    const s = await prisma.supplier.findUnique({ where: { id: req.params.id }, include: { contacts: true, products: { select: { id: true, name: true, sku: true, quantity: true, sellingPrice: true } }, orders: { take: 5, orderBy: { createdAt: 'desc' } } } })
    if (!s) return res.status(404).json({ error: 'Not found.' })
    res.json(s)
  } catch { res.status(500).json({ error: 'Failed.' }) }
})

// ADMIN and MANAGER can create/update
router.post('/', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const data = { ...req.body }
    if (data.creditLimit)   data.creditLimit   = parseFloat(data.creditLimit)
    if (data.paymentTerms)  data.paymentTerms  = parseInt(data.paymentTerms)
    res.status(201).json(await prisma.supplier.create({ data }))
  } catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', requireRole('ADMIN', 'MANAGER'), async (req, res) => {
  try {
    const data = { ...req.body }
    if (data.creditLimit) data.creditLimit = parseFloat(data.creditLimit)
    res.json(await prisma.supplier.update({ where: { id: req.params.id }, data }))
  } catch { res.status(500).json({ error: 'Failed.' }) }
})

// ADMIN ONLY can delete
router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.supplier.delete({ where: { id: req.params.id } })
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'DELETE', tableName: 'suppliers', recordId: req.params.id } }).catch(() => {})
    res.json({ message: 'Deleted.' })
  } catch { res.status(500).json({ error: 'Failed.' }) }
})

module.exports = router
