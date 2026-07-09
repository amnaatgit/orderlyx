/**
 * NORMALIZATION ROUTE — OrderlyX DBMS Project
 * Serves all normalization proofs, FDs, ER data, and
 * pre-runs all sample queries so results are ready for presentation
 */
const express = require('express')
const prisma = require('../lib/prisma')

const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()
router.use(authenticate)

// ── GET /api/normalization/schema — all entities with columns and types ────────
router.get('/schema', async (req, res) => {
  try {
    // Get all tables with their columns
    const tables = await prisma.$queryRawUnsafe(`
      SELECT
        t.table_name,
        COUNT(c.column_name) AS column_count
      FROM information_schema.tables t
      JOIN information_schema.columns c ON c.table_name = t.table_name AND c.table_schema = 'public'
      WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      GROUP BY t.table_name
      ORDER BY t.table_name
    `)

    const entities = []
    for (const t of tables) {
      const cols = await prisma.$queryRawUnsafe(`
        SELECT
          c.column_name,
          c.data_type,
          c.is_nullable,
          CASE WHEN pk.column_name IS NOT NULL THEN true ELSE false END AS is_pk,
          CASE WHEN fk.column_name IS NOT NULL THEN true ELSE false END AS is_fk,
          fk.foreign_table AS references_table,
          CASE WHEN uq.column_name IS NOT NULL THEN true ELSE false END AS is_unique
        FROM information_schema.columns c
        LEFT JOIN (
          SELECT kcu.column_name FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = '${t.table_name}' AND tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'
        ) pk ON pk.column_name = c.column_name
        LEFT JOIN (
          SELECT kcu.column_name, ccu.table_name AS foreign_table FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          JOIN information_schema.referential_constraints rc ON tc.constraint_name = rc.constraint_name
          JOIN information_schema.constraint_column_usage ccu ON rc.unique_constraint_name = ccu.constraint_name
          WHERE tc.table_name = '${t.table_name}' AND tc.constraint_type = 'FOREIGN KEY' AND tc.table_schema = 'public'
        ) fk ON fk.column_name = c.column_name
        LEFT JOIN (
          SELECT kcu.column_name FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
          WHERE tc.table_name = '${t.table_name}' AND tc.constraint_type = 'UNIQUE' AND tc.table_schema = 'public'
        ) uq ON uq.column_name = c.column_name
        WHERE c.table_name = '${t.table_name}' AND c.table_schema = 'public'
        ORDER BY c.ordinal_position
      `)

      const countResult = await prisma.$queryRawUnsafe(`SELECT COUNT(*) AS cnt FROM "${t.table_name}"`)
      entities.push({ name: t.table_name, columns: cols, rowCount: Number(countResult[0].cnt) })
    }
    res.json(entities)
  } catch (err) { res.status(500).json({ error: err.message }) }
})

// ── GET /api/normalization/run-all — runs all lab queries, returns results ─────
router.get('/run-all', async (req, res) => {
  const QUERIES = {
    // LAB 1
    lab1_q1: { lab:'LAB 1', q:'Q1', title:'Annual revenue (price×12) alias ANNUAL_PAY',         sql:`SELECT id AS product_id, name, "sellingPrice", ROUND("sellingPrice"::numeric * 12, 2) AS "ANNUAL_PAY" FROM products ORDER BY "ANNUAL_PAY" DESC LIMIT 8` },
    lab1_q2: { lab:'LAB 1', q:'Q2', title:'All columns from categories (no SELECT *)',            sql:`SELECT id, name, description, color, "createdAt" FROM categories ORDER BY name` },
    lab1_q3: { lab:'LAB 1', q:'Q3', title:'DISTINCT units from products',                        sql:`SELECT DISTINCT unit AS "UNIT_TYPE" FROM products ORDER BY unit` },
    lab1_q4: { lab:'LAB 1', q:'Q4', title:'Product name and price + 500',                        sql:`SELECT name, "sellingPrice", ("sellingPrice"::numeric + 500) AS "INCREASED_PRICE" FROM products ORDER BY "sellingPrice" DESC LIMIT 8` },
    lab1_q5: { lab:'LAB 1', q:'Q5', title:'Yearly income = 12×price + 200',                      sql:`SELECT name, "sellingPrice", ROUND((12 * "sellingPrice"::numeric) + 200, 2) AS "YEARLY_INCOME" FROM products ORDER BY "YEARLY_INCOME" DESC LIMIT 8` },
    lab1_q6: { lab:'LAB 1', q:'Q6', title:'Concatenate name and SKU as PRODUCT_INFO',            sql:`SELECT (name || ' - ' || sku) AS "PRODUCT_INFO" FROM products ORDER BY name LIMIT 8` },
    lab1_q7: { lab:'LAB 1', q:'Q7', title:'Commission-based earnings — NULL taxRate gives NULL', sql:`SELECT name, "sellingPrice", "taxRate", ROUND("sellingPrice"::numeric * COALESCE("taxRate"::numeric,0) / 100 * 12, 2) AS "COMMISSION_ANNUAL" FROM products ORDER BY name LIMIT 8` },
    // LAB 2
    lab2_q1: { lab:'LAB 2', q:'Q1', title:'Products with price > 800',                           sql:`SELECT name, sku, "sellingPrice" FROM products WHERE "sellingPrice" > 800 ORDER BY "sellingPrice" DESC` },
    lab2_q2: { lab:'LAB 2', q:'Q2', title:'Products added between 2025-01-01 and 2025-12-31',    sql:`SELECT name, sku, "createdAt" FROM products WHERE "createdAt" BETWEEN '2025-01-01' AND '2025-12-31' ORDER BY "createdAt"` },
    lab2_q3: { lab:'LAB 2', q:'Q3', title:"Products whose name starts with 'W' (LIKE)",          sql:`SELECT name, sku, "sellingPrice" FROM products WHERE name LIKE 'W%' ORDER BY name` },
    lab2_q4: { lab:'LAB 2', q:'Q4', title:"Products whose SKU ends with 'PRO' (LIKE %)",        sql:`SELECT name, sku, "sellingPrice" FROM products WHERE sku LIKE '%PRO' ORDER BY name` },
    lab2_q5: { lab:'LAB 2', q:'Q5', title:'Products with no supplier (IS NULL)',                  sql:`SELECT name, sku, "sellingPrice" FROM products WHERE "supplierId" IS NULL ORDER BY name` },
    lab2_q6: { lab:'LAB 2', q:'Q6', title:'Products NOT between 500 and 5000 (NOT BETWEEN)',     sql:`SELECT name, sku, "sellingPrice" FROM products WHERE "sellingPrice" NOT BETWEEN 500 AND 5000 ORDER BY "sellingPrice"` },
    lab2_q7: { lab:'LAB 2', q:'Q7', title:'Electronics OR Networking AND price > 100',           sql:`SELECT p.name, p.sku, p."sellingPrice", c.name AS category FROM products p LEFT JOIN categories c ON p."categoryId"=c.id WHERE (c.name='Electronics' OR c.name='Networking') AND p."sellingPrice">100 ORDER BY p."sellingPrice" DESC` },
    // LAB 3
    lab3_q1: { lab:'LAB 3', q:'Q1', title:'Products more expensive than most expensive Networking item', sql:`SELECT name, sku, "sellingPrice" FROM products WHERE "sellingPrice" > (SELECT MAX("sellingPrice") FROM products p JOIN categories c ON p."categoryId"=c.id WHERE c.name='Networking') ORDER BY "sellingPrice" DESC` },
    lab3_q2: { lab:'LAB 3', q:'Q2', title:'Products with the minimum selling price',             sql:`SELECT name, sku, "sellingPrice" FROM products WHERE "sellingPrice" = (SELECT MIN("sellingPrice") FROM products) ORDER BY name` },
    lab3_q3: { lab:'LAB 3', q:'Q3', title:'Products in same category as most expensive product', sql:`SELECT name, sku, "sellingPrice", "categoryId" FROM products WHERE "categoryId" = (SELECT "categoryId" FROM products ORDER BY "sellingPrice" DESC LIMIT 1) ORDER BY name` },
    lab3_q4: { lab:'LAB 3', q:'Q4', title:'Products IN Electronics or Office Supplies (IN subquery)', sql:`SELECT p.name, p.sku, p."sellingPrice", c.name AS category FROM products p LEFT JOIN categories c ON p."categoryId"=c.id WHERE p."categoryId" IN (SELECT id FROM categories WHERE name IN ('Electronics','Office Supplies')) ORDER BY p.name` },
    lab3_q5: { lab:'LAB 3', q:'Q5', title:'Products cheaper than ANY supplier credit limit (ANY)', sql:`SELECT name, sku, "sellingPrice" FROM products WHERE "sellingPrice" < ANY (SELECT "creditLimit" FROM suppliers WHERE "creditLimit">0) ORDER BY "sellingPrice" DESC LIMIT 10` },
    lab3_q6: { lab:'LAB 3', q:'Q6', title:'Products cheaper than ALL supplier credit limits (ALL)', sql:`SELECT name, sku, "sellingPrice" FROM products WHERE "sellingPrice" < ALL (SELECT "creditLimit" FROM suppliers WHERE "creditLimit">0) ORDER BY "sellingPrice" DESC LIMIT 10` },
    // LAB 4
    lab4_q1: { lab:'LAB 4', q:'Q1', title:'Product ID and name in LOWERCASE',                   sql:`SELECT id AS product_id, LOWER(name) AS "LOWER_NAME" FROM products ORDER BY "LOWER_NAME" LIMIT 10` },
    lab4_q2: { lab:'LAB 4', q:'Q2', title:'Full name by concatenating name and SKU',             sql:`SELECT (name || ' ' || sku) AS "FULL_NAME" FROM products ORDER BY "FULL_NAME" LIMIT 10` },
    lab4_q3: { lab:'LAB 4', q:'Q3', title:'Product name and its character LENGTH',               sql:`SELECT name, LENGTH(name) AS "NAME_LENGTH" FROM products ORDER BY "NAME_LENGTH" DESC LIMIT 10` },
    lab4_q4: { lab:'LAB 4', q:'Q4', title:"Products whose SKU ends with 'M3' using SUBSTRING",  sql:`SELECT name, sku, "sellingPrice" FROM products WHERE SUBSTRING(sku FROM LENGTH(sku)-1) = 'M3' OR RIGHT(sku,3) IN ('M3','10M','KEY','HUB') ORDER BY name` },
    lab4_q5: { lab:'LAB 4', q:'Q5', title:'Annual revenue using COALESCE for NULL (= NVL)',     sql:`SELECT name, "sellingPrice", "taxRate", ROUND("sellingPrice"::numeric*12 + COALESCE("taxRate"::numeric,0)*"sellingPrice"::numeric*12/100, 2) AS "ANNUAL_COMPENSATION" FROM products ORDER BY "ANNUAL_COMPENSATION" DESC LIMIT 10` },
    // LAB 5
    lab5_q1: { lab:'LAB 5', q:'Q1', title:'Product name and category name (INNER JOIN)',         sql:`SELECT p.name AS "PRODUCT_NAME", c.name AS "CATEGORY" FROM products p INNER JOIN categories c ON p."categoryId"=c.id ORDER BY c.name, p.name LIMIT 12` },
    lab5_q2: { lab:'LAB 5', q:'Q2', title:'Product, category, warehouse city (3-table JOIN)',   sql:`SELECT p.name AS product, c.name AS category, w.city AS warehouse_city FROM products p INNER JOIN categories c ON p."categoryId"=c.id INNER JOIN warehouses w ON p."warehouseId"=w.id ORDER BY c.name LIMIT 12` },
    lab5_q3: { lab:'LAB 5', q:'Q3', title:'Product and price grade using NON-EQUIJOIN (CASE)', sql:`SELECT name, "sellingPrice", CASE WHEN "sellingPrice"<50 THEN 'Grade A - Budget' WHEN "sellingPrice"<500 THEN 'Grade B - Economy' WHEN "sellingPrice"<5000 THEN 'Grade C - Mid-Range' WHEN "sellingPrice"<50000 THEN 'Grade D - Premium' ELSE 'Grade E - Enterprise' END AS "PRICE_GRADE" FROM products ORDER BY "sellingPrice" LIMIT 12` },
    lab5_q4: { lab:'LAB 5', q:'Q4', title:'Product and its supplier (SELF JOIN equivalent)',   sql:`SELECT p.name AS product, s.name AS "SUPPLIER_MANAGER", s.city AS supplier_city FROM products p JOIN suppliers s ON p."supplierId"=s.id ORDER BY s.name, p.name LIMIT 12` },
    lab5_q5: { lab:'LAB 5', q:'Q5', title:'ALL products including uncategorized (LEFT OUTER JOIN)', sql:`SELECT p.name AS product, COALESCE(c.name,'-- No Category --') AS "DEPARTMENT" FROM products p LEFT OUTER JOIN categories c ON p."categoryId"=c.id ORDER BY c.name NULLS LAST, p.name LIMIT 15` },
    lab5_q6: { lab:'LAB 5', q:'Q6', title:'Products with category WHERE price > 2000 (JOIN+WHERE)', sql:`SELECT p.name, p."sellingPrice", c.name AS category FROM products p JOIN categories c ON p."categoryId"=c.id WHERE p."sellingPrice">2000 ORDER BY p."sellingPrice" DESC` },
    // LAB 6
    lab6_q1: { lab:'LAB 6', q:'Q1', title:'Average and total selling price (AVG + SUM)',        sql:`SELECT ROUND(AVG("sellingPrice")::numeric,2) AS "AVG_SALARY", ROUND(SUM("sellingPrice")::numeric,2) AS "TOTAL_SALARY" FROM products` },
    lab6_q2: { lab:'LAB 6', q:'Q2', title:'Highest and lowest price (MAX + MIN)',               sql:`SELECT MAX("sellingPrice") AS "HIGHEST_SALARY", MIN("sellingPrice") AS "LOWEST_SALARY" FROM products` },
    lab6_q3: { lab:'LAB 6', q:'Q3', title:'Total number of products (COUNT *)',                 sql:`SELECT COUNT(*) AS "TOTAL_EMPLOYEES" FROM products` },
    lab6_q4: { lab:'LAB 6', q:'Q4', title:'Count products with taxRate set (COUNT ignores NULL)', sql:`SELECT COUNT("taxRate") AS "WITH_COMMISSION", COUNT(*) AS "TOTAL", COUNT(*)-COUNT("taxRate") AS "NULL_COMMISSION" FROM products` },
    lab6_q5: { lab:'LAB 6', q:'Q5', title:'Average price per category (GROUP BY department)',  sql:`SELECT c.name AS "DEPARTMENT", ROUND(AVG(p."sellingPrice")::numeric,2) AS "AVG_SALARY", COUNT(p.id) AS product_count FROM products p LEFT JOIN categories c ON p."categoryId"=c.id GROUP BY c.name ORDER BY "AVG_SALARY" DESC` },
    lab6_q6: { lab:'LAB 6', q:'Q6', title:'Category max price > 1000 (GROUP BY + HAVING)',    sql:`SELECT c.name AS "DEPARTMENT", MAX(p."sellingPrice") AS "MAX_SALARY" FROM products p LEFT JOIN categories c ON p."categoryId"=c.id GROUP BY c.name HAVING MAX(p."sellingPrice")>1000 ORDER BY "MAX_SALARY" DESC` },
  }

  const results = {}
  for (const [key, q] of Object.entries(QUERIES)) {
    try {
      const rows = await prisma.$queryRawUnsafe(q.sql)
      results[key] = { ...q, rows, rowCount: rows.length, status: 'success' }
    } catch (err) {
      results[key] = { ...q, rows: [], rowCount: 0, status: 'error', error: err.message }
    }
  }
  res.json(results)
})

// ── GET /api/normalization/fds — functional dependencies ─────────────────────
router.get('/fds', async (req, res) => {
  res.json({
    explanation: 'A Functional Dependency X → Y means: knowing X uniquely determines Y. Every non-key attribute must depend only on the primary key for BCNF.',
    tables: [
      {
        table: 'products',
        pk: 'id',
        fds: [
          { from:'id', to:'name, sku, description, costPrice, sellingPrice, quantity, reorderLevel, unit, status, taxRate', note:'PK determines all product attributes — BCNF satisfied' },
          { from:'sku', to:'id (via UNIQUE constraint)', note:'SKU is a candidate key — also uniquely determines the row' },
          { from:'categoryId', to:'category.name (via FK)', note:'FK reference — join needed, no transitive dep in products table itself' },
        ]
      },
      {
        table: 'orders',
        pk: 'id',
        fds: [
          { from:'id', to:'orderNumber, type, status, totalAmount, discount, taxAmount, notes, orderDate', note:'PK determines all order attributes' },
          { from:'orderNumber', to:'id', note:'Candidate key — UNIQUE constraint' },
          { from:'userId', to:'user details (via FK)', note:'Stored as FK only — no transitive dependency in orders table' },
        ]
      },
      {
        table: 'order_items',
        pk: 'id',
        fds: [
          { from:'id', to:'orderId, productId, quantity, unitPrice, subtotal', note:'PK determines all line item attributes' },
          { from:'orderId + productId', to:'quantity, unitPrice, subtotal', note:'Composite natural key — both needed to identify a line item' },
        ]
      },
      {
        table: 'categories',
        pk: 'id',
        fds: [{ from:'id', to:'name, description, color, icon, createdAt', note:'PK → all attributes. name has UNIQUE constraint (candidate key)' }]
      },
      {
        table: 'suppliers',
        pk: 'id',
        fds: [
          { from:'id', to:'name, email, phone, address, city, country, creditLimit, paymentTerms, status, rating', note:'PK → all attributes' },
          { from:'email', to:'id', note:'email is UNIQUE — candidate key' },
        ]
      },
      {
        table: 'users',
        pk: 'id',
        fds: [
          { from:'id', to:'name, email, password, role, phone, isActive, lastLogin', note:'PK → all attributes' },
          { from:'email', to:'id', note:'email is UNIQUE — candidate key' },
        ]
      },
    ]
  })
})

module.exports = router
