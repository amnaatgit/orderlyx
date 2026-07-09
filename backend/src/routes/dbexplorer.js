/**
 * DATABASE EXPLORER ROUTE — OrderlyX DBMS Project
 * Shows real database schema, table data, raw SQL execution,
 * and the actual Prisma queries used throughout the system.
 * Admin/Manager only.
 */

const express = require('express')
const prisma = require('../lib/prisma')

const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()
router.use(authenticate)
router.use(requireRole('ADMIN', 'MANAGER'))

// ── GET /api/dbexplorer/tables — list all tables with row counts ───────────────
router.get('/tables', async (req, res) => {
  try {
    const tables = await prisma.$queryRawUnsafe(`
      SELECT
        t.table_name,
        pg_stat_get_tuples_inserted(c.oid)  AS inserts,
        (SELECT COUNT(*) FROM information_schema.columns col
         WHERE col.table_name = t.table_name
         AND col.table_schema = 'public') AS column_count,
        obj_description(c.oid, 'pg_class') AS description
      FROM information_schema.tables t
      JOIN pg_class c ON c.relname = t.table_name
      WHERE t.table_schema = 'public'
        AND t.table_type = 'BASE TABLE'
      ORDER BY t.table_name
    `)

    // get row counts separately (more reliable)
    const counts = {}
    for (const t of tables) {
      try {
        const r = await prisma.$queryRawUnsafe(
          `SELECT COUNT(*) AS cnt FROM "${t.table_name}"`
        )
        counts[t.table_name] = Number(r[0].cnt)
      } catch {
        counts[t.table_name] = 0
      }
    }

    res.json(tables.map(t => ({
      name: t.table_name,
      columns: Number(t.column_count),
      rows: counts[t.table_name] ?? 0,
    })))
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/dbexplorer/schema/:table — columns, types, constraints ───────────
router.get('/schema/:table', async (req, res) => {
  const tableName = req.params.table.replace(/[^a-zA-Z0-9_]/g, '')
  try {
    const columns = await prisma.$queryRawUnsafe(`
      SELECT
        c.column_name,
        c.data_type,
        c.character_maximum_length,
        c.numeric_precision,
        c.is_nullable,
        c.column_default,
        CASE WHEN pk.column_name IS NOT NULL THEN 'YES' ELSE 'NO' END AS is_primary_key,
        CASE WHEN fk.column_name IS NOT NULL THEN fk.foreign_table_name ELSE NULL END AS references_table,
        CASE WHEN uq.column_name IS NOT NULL THEN 'YES' ELSE 'NO' END AS is_unique
      FROM information_schema.columns c
      LEFT JOIN (
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = '${tableName}'
          AND tc.constraint_type = 'PRIMARY KEY'
          AND tc.table_schema = 'public'
      ) pk ON pk.column_name = c.column_name
      LEFT JOIN (
        SELECT kcu.column_name, ccu.table_name AS foreign_table_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.referential_constraints rc
          ON tc.constraint_name = rc.constraint_name
        JOIN information_schema.constraint_column_usage ccu
          ON rc.unique_constraint_name = ccu.constraint_name
        WHERE tc.table_name = '${tableName}'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND tc.table_schema = 'public'
      ) fk ON fk.column_name = c.column_name
      LEFT JOIN (
        SELECT kcu.column_name
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu
          ON tc.constraint_name = kcu.constraint_name
        WHERE tc.table_name = '${tableName}'
          AND tc.constraint_type = 'UNIQUE'
          AND tc.table_schema = 'public'
      ) uq ON uq.column_name = c.column_name
      WHERE c.table_name = '${tableName}'
        AND c.table_schema = 'public'
      ORDER BY c.ordinal_position
    `)
    res.json(columns)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/dbexplorer/data/:table — first 50 rows of any table ───────────────
router.get('/data/:table', async (req, res) => {
  const tableName = req.params.table.replace(/[^a-zA-Z0-9_]/g, '')
  const limit = Math.min(parseInt(req.query.limit) || 50, 100)
  const offset = parseInt(req.query.offset) || 0
  try {
    const [rows, countResult] = await Promise.all([
      prisma.$queryRawUnsafe(`SELECT * FROM "${tableName}" LIMIT ${limit} OFFSET ${offset}`),
      prisma.$queryRawUnsafe(`SELECT COUNT(*) AS total FROM "${tableName}"`)
    ])
    res.json({ rows, total: Number(countResult[0].total), limit, offset })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── POST /api/dbexplorer/sql — run custom SQL (SELECT only for safety) ─────────
router.post('/sql', async (req, res) => {
  const { sql } = req.body
  if (!sql || typeof sql !== 'string') return res.status(400).json({ error: 'SQL required.' })

  // Safety: only allow SELECT statements
  const trimmed = sql.trim().toUpperCase()
  if (!trimmed.startsWith('SELECT') && !trimmed.startsWith('EXPLAIN')) {
    return res.status(403).json({ error: 'Only SELECT and EXPLAIN statements are allowed in the explorer.' })
  }

  try {
    const start = Date.now()
    const rows = await prisma.$queryRawUnsafe(sql)
    const execTime = Date.now() - start
    res.json({ rows, rowCount: rows.length, execTime: `${execTime}ms`, sql })
  } catch (err) {
    res.status(400).json({ error: err.message, sql })
  }
})

// ── GET /api/dbexplorer/relationships — all FK relationships ─────────────────
router.get('/relationships', async (req, res) => {
  try {
    const rels = await prisma.$queryRawUnsafe(`
      SELECT
        tc.table_name          AS from_table,
        kcu.column_name        AS from_column,
        ccu.table_name         AS to_table,
        ccu.column_name        AS to_column,
        tc.constraint_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu
        ON tc.constraint_name = kcu.constraint_name
        AND tc.table_schema = kcu.table_schema
      JOIN information_schema.referential_constraints rc
        ON tc.constraint_name = rc.constraint_name
      JOIN information_schema.constraint_column_usage ccu
        ON rc.unique_constraint_name = ccu.constraint_name
      WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_schema = 'public'
      ORDER BY tc.table_name, kcu.column_name
    `)
    res.json(rels)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/dbexplorer/stats — database-level statistics ────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [dbSize, tableStats, indexStats] = await Promise.all([
      prisma.$queryRawUnsafe(`
        SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size,
               current_database() AS db_name,
               version() AS pg_version
      `),
      prisma.$queryRawUnsafe(`
        SELECT relname AS table_name,
               n_live_tup AS row_count,
               pg_size_pretty(pg_total_relation_size(relid)) AS total_size,
               n_dead_tup AS dead_rows,
               last_analyze
        FROM pg_stat_user_tables
        ORDER BY n_live_tup DESC
      `),
      prisma.$queryRawUnsafe(`
        SELECT indexname, tablename, indexdef
        FROM pg_indexes
        WHERE schemaname = 'public'
        ORDER BY tablename, indexname
      `)
    ])
    res.json({ dbSize: dbSize[0], tableStats, indexStats })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ── GET /api/dbexplorer/prisma-queries — show all Prisma ORM queries used ───
router.get('/prisma-queries', async (req, res) => {
  const prismaQueries = [
    {
      category: 'Authentication',
      queries: [
        { description: 'Find user by email for login', operation: 'findUnique', code: `prisma.user.findUnique({ where: { email } })`, sql: `SELECT * FROM users WHERE email = $1 LIMIT 1` },
        { description: 'Update last login timestamp', operation: 'update', code: `prisma.user.update({ where: { id }, data: { lastLogin: new Date() } })`, sql: `UPDATE users SET "lastLogin" = $1 WHERE id = $2` },
      ]
    },
    {
      category: 'Products',
      queries: [
        { description: 'Get all products with filters and pagination', operation: 'findMany + count', code: `prisma.product.findMany({ where, include: { category, subCategory, supplier, warehouse }, orderBy: { createdAt: 'desc' }, skip, take })`, sql: `SELECT p.*, c.name, s.name, w.name FROM products p LEFT JOIN categories c ON p."categoryId"=c.id LEFT JOIN suppliers s ON p."supplierId"=s.id LEFT JOIN warehouses w ON p."warehouseId"=w.id WHERE [filters] ORDER BY p."createdAt" DESC LIMIT $1 OFFSET $2` },
        { description: 'Create new product', operation: 'create', code: `prisma.product.create({ data: { name, sku, costPrice, sellingPrice, quantity, ... } })`, sql: `INSERT INTO products (name, sku, "costPrice", "sellingPrice", quantity, ...) VALUES ($1,$2,$3,...) RETURNING *` },
        { description: 'Update product by ID', operation: 'update', code: `prisma.product.update({ where: { id }, data })`, sql: `UPDATE products SET name=$1, sku=$2, ... WHERE id=$3 RETURNING *` },
        { description: 'Delete product by ID', operation: 'delete', code: `prisma.product.delete({ where: { id } })`, sql: `DELETE FROM products WHERE id=$1` },
        { description: 'Get unresolved stock alerts', operation: 'findMany', code: `prisma.stockAlert.findMany({ where: { isResolved: false }, include: { product: { select: { name, sku, quantity } } } })`, sql: `SELECT sa.*, p.name, p.sku, p.quantity FROM stock_alerts sa JOIN products p ON sa."productId"=p.id WHERE sa."isResolved"=false ORDER BY sa."createdAt" DESC LIMIT 20` },
      ]
    },
    {
      category: 'Orders (Transaction)',
      queries: [
        { description: 'Create order with atomic stock update (TRANSACTION)', operation: '$transaction', code: `prisma.$transaction(async (tx) => {\n  const order = await tx.order.create({ data: {..., items: { create: orderItemsData } } })\n  for (const item of items) {\n    await tx.product.update({ where: { id: item.productId }, data: { quantity: { increment: delta } } })\n  }\n  return order\n})`, sql: `BEGIN;\nINSERT INTO orders (...) VALUES (...);\nINSERT INTO order_items (...) VALUES (...);\nUPDATE products SET quantity = quantity + $1 WHERE id = $2;\nCOMMIT;` },
      ]
    },
    {
      category: 'Dashboard Analytics',
      queries: [
        { description: 'Count active products', operation: 'count', code: `prisma.product.count({ where: { status: 'ACTIVE' } })`, sql: `SELECT COUNT(*) FROM products WHERE status = 'ACTIVE'` },
        { description: 'Get inventory value (all products)', operation: 'findMany (aggregate)', code: `prisma.product.findMany({ select: { quantity: true, sellingPrice: true, costPrice: true, reorderLevel: true } })`, sql: `SELECT quantity, "sellingPrice", "costPrice", "reorderLevel" FROM products` },
        { description: 'Monthly order totals', operation: 'findMany', code: `prisma.order.findMany({ where: { createdAt: { gte: thisMonth }, status: { not: 'CANCELLED' } }, select: { type: true, totalAmount: true } })`, sql: `SELECT type, "totalAmount" FROM orders WHERE "createdAt" >= $1 AND status != 'CANCELLED'` },
        { description: 'Category stats with product counts', operation: 'findMany (nested)', code: `prisma.category.findMany({ include: { products: { select: { quantity, sellingPrice } }, _count: { select: { products: true } } } })`, sql: `SELECT c.*, COUNT(p.id) AS product_count, SUM(p.quantity * p."sellingPrice") AS retail_value FROM categories c LEFT JOIN products p ON p."categoryId"=c.id GROUP BY c.id` },
      ]
    },
    {
      category: 'User Management (Admin Only)',
      queries: [
        { description: 'Get all users (no passwords)', operation: 'findMany', code: `prisma.user.findMany({ select: { id, name, email, role, isActive, lastLogin, createdAt } })`, sql: `SELECT id, name, email, role, "isActive", "lastLogin", "createdAt" FROM users ORDER BY "createdAt" ASC` },
        { description: 'Create new user with hashed password', operation: 'create', code: `prisma.user.create({ data: { name, email, password: hashedPassword, role } })`, sql: `INSERT INTO users (name, email, password, role) VALUES ($1,$2,$3,$4) RETURNING id, name, email, role` },
        { description: 'Update user role or active status', operation: 'update', code: `prisma.user.update({ where: { id }, data: { role, isActive } })`, sql: `UPDATE users SET role=$1, "isActive"=$2 WHERE id=$3` },
      ]
    },
    {
      category: 'Audit Logs',
      queries: [
        { description: 'Get all audit logs with user info', operation: 'findMany', code: `prisma.auditLog.findMany({ include: { user: { select: { name, email } } }, orderBy: { createdAt: 'desc' }, take: 100 })`, sql: `SELECT al.*, u.name, u.email FROM audit_logs al LEFT JOIN users u ON al."userId"=u.id ORDER BY al."createdAt" DESC LIMIT 100` },
        { description: 'Create audit log entry', operation: 'create', code: `prisma.auditLog.create({ data: { userId, action, tableName, recordId, newValues: JSON.stringify(data) } })`, sql: `INSERT INTO audit_logs ("userId", action, "tableName", "recordId", "newValues") VALUES ($1,$2,$3,$4,$5)` },
      ]
    },
  ]
  res.json(prismaQueries)
})

module.exports = router
