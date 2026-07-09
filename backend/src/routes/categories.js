const express = require('express')
const prisma = require('../lib/prisma')
const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()
router.use(authenticate)

// ALL roles can read
router.get('/', async (req, res) => {
  try {
    const cats = await prisma.category.findMany({ include: { _count: { select: { products: true } }, subCategories: true }, orderBy: { name: 'asc' } })
    res.json(cats)
  } catch { res.status(500).json({ error: 'Failed.' }) }
})

router.get('/warehouses', async (req, res) => {
  try { res.json(await prisma.warehouse.findMany({ orderBy: { name: 'asc' } })) }
  catch { res.status(500).json({ error: 'Failed.' }) }
})

// ADMIN ONLY can create, update, delete categories
router.post('/', requireRole('ADMIN'), async (req, res) => {
  try { res.status(201).json(await prisma.category.create({ data: req.body })) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

router.put('/:id', requireRole('ADMIN'), async (req, res) => {
  try { res.json(await prisma.category.update({ where: { id: req.params.id }, data: req.body })) }
  catch (err) { res.status(500).json({ error: err.message }) }
})

router.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    await prisma.category.delete({ where: { id: req.params.id } })
    await prisma.auditLog.create({ data: { userId: req.user.id, action: 'DELETE', tableName: 'categories', recordId: req.params.id } }).catch(() => {})
    res.json({ message: 'Deleted.' })
  } catch { res.status(500).json({ error: 'Failed. Products may be linked.' }) }
})

module.exports = router
