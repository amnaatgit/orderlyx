/**
 * SAMPLE QUERIES ROUTE — OrderlyX DBMS Project
 * 
 * Implements all lab queries mapped to OrderlyX tables:
 * 
 * Mapping (Oracle HR  →  OrderlyX PostgreSQL):
 *   employees         →  products       (employee_id=id, last_name=name, salary=sellingPrice, job_id=sku, commission_pct=taxRate, manager_id=supplierId)
 *   departments       →  categories     (department_id=id, department_name=name)
 *   locations         →  warehouses     (city=city)
 *   job_grades        →  discount_rules (grade_level=name, lowest_sal=value)
 *   employees(mgr)    →  suppliers      (self-reference equivalent)
 */

const express = require('express')
const prisma = require('../lib/prisma')

const { authenticate, requireRole } = require('../middleware/auth')

const router = express.Router()
router.use(authenticate)

// ── Helper: run raw SQL and return rows ───────────────────────────────────────
async function runQuery(sql) {
  return await prisma.$queryRawUnsafe(sql)
}

// ── GET /api/queries/:lab/:question ──────────────────────────────────────────
router.get('/:lab/:question', async (req, res) => {
  const { lab, question } = req.params
  const key = `${lab}_${question}`

  const queries = {

    // ══════════════════════════════════════════════════
    // LAB 1 — Arithmetic, Aliases, Concatenation
    // ══════════════════════════════════════════════════

    // Q1) Display product ID, name, and annual revenue (price × 12) with alias ANNUAL_PAY
    lab1_q1: {
      title: 'Product ID, name, and annual revenue (price × 12) with alias ANNUAL_PAY',
      lab: 'LAB 1', question: 'Q1',
      concept: 'Arithmetic expression with alias — maps to: employee_id → id, salary → sellingPrice, ANNUAL_PAY alias',
      sql: `SELECT id AS product_id, name, ROUND("sellingPrice"::numeric * 12, 2) AS "ANNUAL_PAY" FROM products ORDER BY "ANNUAL_PAY" DESC LIMIT 20`
    },

    // Q2) Display all columns from categories without using *
    lab1_q2: {
      title: 'All columns from categories without using *',
      lab: 'LAB 1', question: 'Q2',
      concept: 'Explicit column listing instead of SELECT * — maps to departments table',
      sql: `SELECT id, name, description, color, icon, "createdAt", "updatedAt" FROM categories ORDER BY name`
    },

    // Q3) Display distinct SKUs (job IDs) from products
    lab1_q3: {
      title: 'Distinct SKUs from products table',
      lab: 'LAB 1', question: 'Q3',
      concept: 'DISTINCT keyword — maps to: SELECT DISTINCT job_id FROM employees',
      sql: `SELECT DISTINCT unit AS "UNIT_TYPE", COUNT(*) AS product_count FROM products GROUP BY unit ORDER BY product_count DESC`
    },

    // Q4) Display product name and price + 500
    lab1_q4: {
      title: 'Product name and price + 500',
      lab: 'LAB 1', question: 'Q4',
      concept: 'Arithmetic addition — maps to: last_name, salary + 500',
      sql: `SELECT name, "sellingPrice", ROUND("sellingPrice"::numeric + 500, 2) AS "INCREASED_PRICE" FROM products ORDER BY "sellingPrice" DESC LIMIT 20`
    },

    // Q5) Display product name and yearly income = 12 * price + 200
    lab1_q5: {
      title: 'Product name and yearly income (12 × price + 200)',
      lab: 'LAB 1', question: 'Q5',
      concept: 'Compound arithmetic expression — maps to: 12*salary + 200',
      sql: `SELECT name, "sellingPrice", ROUND((12 * "sellingPrice"::numeric) + 200, 2) AS "YEARLY_INCOME" FROM products ORDER BY "YEARLY_INCOME" DESC LIMIT 20`
    },

    // Q6) Concatenate product name and SKU separated by " - " as PRODUCT_INFO
    lab1_q6: {
      title: 'Concatenate product name and SKU as PRODUCT_INFO',
      lab: 'LAB 1', question: 'Q6',
      concept: 'String concatenation with separator — maps to: last_name || " - " || job_id AS EMPLOYEE_INFO',
      sql: `SELECT (name || ' - ' || sku) AS "PRODUCT_INFO" FROM products ORDER BY name LIMIT 20`
    },

    // Q7) Display commission-based annual earnings — NULL taxRate = NULL result
    lab1_q7: {
      title: 'Commission-based annual earnings — showing NULL behavior',
      lab: 'LAB 1', question: 'Q7',
      concept: 'NULL in arithmetic always returns NULL — maps to: commission_pct * salary * 12 (NULL when no commission)',
      sql: `SELECT name, "sellingPrice", "taxRate", ROUND("sellingPrice"::numeric * "taxRate"::numeric / 100 * 12, 2) AS "COMMISSION_ANNUAL" FROM products ORDER BY name LIMIT 20`
    },

    // ══════════════════════════════════════════════════
    // LAB 2 — WHERE Clause, Filtering, Conditions
    // ══════════════════════════════════════════════════

    // Q1) Products with selling price > 8000 (salary > 8000)
    lab2_q1: {
      title: 'Products with price > 8000',
      lab: 'LAB 2', question: 'Q1',
      concept: 'Simple WHERE comparison — maps to: WHERE salary > 8000',
      sql: `SELECT id, name, sku, "sellingPrice" FROM products WHERE "sellingPrice" > 800 ORDER BY "sellingPrice" DESC`
    },

    // Q2) Products added between 01-JAN-2024 and 31-DEC-2024 (hired between dates)
    lab2_q2: {
      title: 'Products added between Jan 2024 and Dec 2024',
      lab: 'LAB 2', question: 'Q2',
      concept: 'BETWEEN with date/time — maps to: WHERE hire_date BETWEEN date1 AND date2',
      sql: `SELECT name, sku, "createdAt" FROM products WHERE "createdAt" BETWEEN '2024-01-01' AND '2024-12-31' ORDER BY "createdAt"`
    },

    // Q3) Products whose name starts with 'M' (last name starts with M)
    lab2_q3: {
      title: 'Products whose name starts with M',
      lab: 'LAB 2', question: 'Q3',
      concept: 'LIKE pattern — maps to: WHERE last_name LIKE M%',
      sql: `SELECT name, sku, "sellingPrice" FROM products WHERE name LIKE 'M%' ORDER BY name`
    },

    // Q4) Products whose SKU ends with 'NET' (job_id ends with MAN)
    lab2_q4: {
      title: 'Products whose SKU ends with NET',
      lab: 'LAB 2', question: 'Q4',
      concept: 'LIKE with trailing wildcard — maps to: WHERE job_id LIKE %MAN',
      sql: `SELECT name, sku, "sellingPrice" FROM products WHERE sku LIKE '%NET' ORDER BY name`
    },

    // Q5) Products with no supplier (employees with no manager)
    lab2_q5: {
      title: 'Products with no supplier assigned (IS NULL)',
      lab: 'LAB 2', question: 'Q5',
      concept: 'IS NULL condition — maps to: WHERE manager_id IS NULL',
      sql: `SELECT name, sku, "sellingPrice", "supplierId" FROM products WHERE "supplierId" IS NULL ORDER BY name`
    },

    // Q6) Products whose price is NOT between 500 and 1000
    lab2_q6: {
      title: 'Products whose price is NOT between 500 and 1000',
      lab: 'LAB 2', question: 'Q6',
      concept: 'NOT BETWEEN — maps to: WHERE salary NOT BETWEEN 5000 AND 10000',
      sql: `SELECT name, sku, "sellingPrice" FROM products WHERE "sellingPrice" NOT BETWEEN 500 AND 1000 ORDER BY "sellingPrice"`
    },

    // Q7) Products in Electronics/Networking category AND price > 100
    lab2_q7: {
      title: 'Products in Electronics or Networking AND price > 100',
      lab: 'LAB 2', question: 'Q7',
      concept: 'Compound condition with parentheses — maps to: WHERE (job_id=IT_PROG OR job_id=SA_REP) AND salary>6000',
      sql: `SELECT p.name, p.sku, p."sellingPrice", c.name AS category FROM products p LEFT JOIN categories c ON p."categoryId" = c.id WHERE (c.name = 'Electronics' OR c.name = 'Networking') AND p."sellingPrice" > 100 ORDER BY p."sellingPrice" DESC`
    },

    // ══════════════════════════════════════════════════
    // LAB 3 — Subqueries
    // ══════════════════════════════════════════════════

    // Q1) Products that cost more than the most expensive Networking product (more than Abel)
    lab3_q1: {
      title: 'Products that cost more than the most expensive Networking product',
      lab: 'LAB 3', question: 'Q1',
      concept: 'Single-row subquery — maps to: WHERE salary > (SELECT salary FROM employees WHERE last_name=Abel)',
      sql: `SELECT name, sku, "sellingPrice" FROM products WHERE "sellingPrice" > (SELECT MAX("sellingPrice") FROM products p JOIN categories c ON p."categoryId" = c.id WHERE c.name = 'Networking') ORDER BY "sellingPrice" DESC`
    },

    // Q2) Products with the minimum selling price (minimum salary)
    lab3_q2: {
      title: 'Products with the minimum selling price',
      lab: 'LAB 3', question: 'Q2',
      concept: 'Subquery with MIN() aggregate — maps to: WHERE salary = (SELECT MIN(salary) FROM employees)',
      sql: `SELECT name, sku, "sellingPrice" FROM products WHERE "sellingPrice" = (SELECT MIN("sellingPrice") FROM products) ORDER BY name`
    },

    // Q3) Products in the same category as product with id from first order
    lab3_q3: {
      title: 'Products in the same category as the first-created product',
      lab: 'LAB 3', question: 'Q3',
      concept: 'Subquery returning single value — maps to: WHERE job_id = (SELECT job_id FROM employees WHERE employee_id=141)',
      sql: `SELECT name, sku, "sellingPrice", "categoryId" FROM products WHERE "categoryId" = (SELECT "categoryId" FROM products ORDER BY "createdAt" ASC LIMIT 1) ORDER BY name`
    },

    // Q4) Products whose category matches any category used in the first order items
    lab3_q4: {
      title: 'Products whose category matches categories in the first purchase order',
      lab: 'LAB 3', question: 'Q4',
      concept: 'IN subquery — maps to: WHERE job_id IN (SELECT job_id FROM employees WHERE department_id=80)',
      sql: `SELECT p.name, p.sku, p."sellingPrice", c.name AS category FROM products p LEFT JOIN categories c ON p."categoryId" = c.id WHERE p."categoryId" IN (SELECT DISTINCT p2."categoryId" FROM order_items oi JOIN products p2 ON oi."productId" = p2.id JOIN orders o ON oi."orderId" = o.id WHERE o.type = 'PURCHASE' LIMIT 5) ORDER BY p.name`
    },

    // Q5) Products that cost less than at least one supplier's credit limit (less than ANY IT programmer)
    lab3_q5: {
      title: 'Products cheaper than at least one supplier credit limit',
      lab: 'LAB 3', question: 'Q5',
      concept: 'ANY/SOME subquery — maps to: WHERE salary < ANY (SELECT salary FROM employees WHERE job_id=IT_PROG)',
      sql: `SELECT name, sku, "sellingPrice" FROM products WHERE "sellingPrice" < ANY (SELECT "creditLimit" FROM suppliers WHERE "creditLimit" > 0) ORDER BY "sellingPrice" DESC LIMIT 15`
    },

    // Q6) Products cheaper than ALL supplier credit limits (less than all IT programmers)
    lab3_q6: {
      title: 'Products cheaper than ALL supplier credit limits',
      lab: 'LAB 3', question: 'Q6',
      concept: 'ALL subquery — maps to: WHERE salary < ALL (SELECT salary FROM employees WHERE job_id=IT_PROG)',
      sql: `SELECT name, sku, "sellingPrice" FROM products WHERE "sellingPrice" < ALL (SELECT "creditLimit" FROM suppliers WHERE "creditLimit" > 0) ORDER BY "sellingPrice" DESC LIMIT 15`
    },

    // ══════════════════════════════════════════════════
    // LAB 4 — String Functions
    // ══════════════════════════════════════════════════

    // Q1) Display product ID and name in lowercase
    lab4_q1: {
      title: 'Product ID and name in LOWERCASE',
      lab: 'LAB 4', question: 'Q1',
      concept: 'LOWER() string function — maps to: employee_id, LOWER(last_name)',
      sql: `SELECT id AS product_id, LOWER(name) AS last_name_lower FROM products ORDER BY last_name_lower LIMIT 20`
    },

    // Q2) Display full product info by concatenating name and SKU
    lab4_q2: {
      title: 'Full product info — name concatenated with SKU',
      lab: 'LAB 4', question: 'Q2',
      concept: 'String concatenation — maps to: first_name || space || last_name AS full_name',
      sql: `SELECT (name || ' ' || sku) AS full_name FROM products ORDER BY full_name LIMIT 20`
    },

    // Q3) Display product name and its length
    lab4_q3: {
      title: 'Product name and its character length',
      lab: 'LAB 4', question: 'Q3',
      concept: 'LENGTH() function — maps to: last_name, LENGTH(last_name)',
      sql: `SELECT name, LENGTH(name) AS name_length FROM products ORDER BY name_length DESC LIMIT 20`
    },

    // Q4) Display products whose SKU ends with 'NET' using SUBSTR
    lab4_q4: {
      title: 'Products whose SKU ends with NET using SUBSTR',
      lab: 'LAB 4', question: 'Q4',
      concept: 'SUBSTR/SUBSTRING function — maps to: WHERE SUBSTR(job_id,-3) = REP',
      sql: `SELECT name, sku, "sellingPrice" FROM products WHERE SUBSTRING(sku FROM LENGTH(sku)-2) = 'NET' OR SUBSTRING(sku FROM LENGTH(sku)-1) = '10' OR RIGHT(sku, 3) IN ('NET','10M','KEY','M3') ORDER BY name LIMIT 20`
    },

    // Q5) Display annual revenue using COALESCE to handle NULL taxRate (NVL for commission)
    lab4_q5: {
      title: 'Annual revenue using COALESCE to handle NULL taxRate (equivalent to NVL)',
      lab: 'LAB 4', question: 'Q5',
      concept: 'COALESCE = NVL in PostgreSQL — maps to: salary*12 + NVL(commission_pct,0)*salary*12',
      sql: `SELECT name, "sellingPrice", "taxRate", ROUND("sellingPrice"::numeric * 12 + COALESCE("taxRate"::numeric, 0) * "sellingPrice"::numeric * 12 / 100, 2) AS annual_compensation FROM products ORDER BY annual_compensation DESC LIMIT 20`
    },

    // ══════════════════════════════════════════════════
    // LAB 5 — Joins
    // ══════════════════════════════════════════════════

    // Q1) Product name and category name using INNER JOIN
    lab5_q1: {
      title: 'Product name and category name using INNER JOIN',
      lab: 'LAB 5', question: 'Q1',
      concept: 'INNER JOIN — maps to: employee last_name + department_name',
      sql: `SELECT p.name AS product_name, c.name AS department_name FROM products p INNER JOIN categories c ON p."categoryId" = c.id ORDER BY c.name, p.name LIMIT 20`
    },

    // Q2) Product name, category name, and warehouse city (3-table join)
    lab5_q2: {
      title: 'Product name, category name, and warehouse city — 3 table JOIN',
      lab: 'LAB 5', question: 'Q2',
      concept: '3-table INNER JOIN — maps to: employee + department + location (city)',
      sql: `SELECT p.name AS product_name, c.name AS category, w.city AS warehouse_city FROM products p INNER JOIN categories  c ON p."categoryId"  = c.id INNER JOIN warehouses  w ON p."warehouseId" = w.id ORDER BY c.name, p.name LIMIT 20`
    },

    // Q3) Product name and price band using NON-EQUIJOIN (discount_rules as job_grades)
    lab5_q3: {
      title: 'Product name and price grade using NON-EQUIJOIN',
      lab: 'LAB 5', question: 'Q3',
      concept: 'NON-EQUIJOIN using BETWEEN — maps to: salary BETWEEN lowest_sal AND highest_sal',
      sql: `SELECT p.name, p."sellingPrice", CASE WHEN p."sellingPrice" < 50    THEN 'Grade A - Budget'
                  WHEN p."sellingPrice" < 200   THEN 'Grade B - Economy'
                  WHEN p."sellingPrice" < 500   THEN 'Grade C - Mid-Range'
                  WHEN p."sellingPrice" < 1000  THEN 'Grade D - Premium'
                  ELSE                               'Grade E - Enterprise'
             END AS price_grade FROM products p ORDER BY p."sellingPrice" LIMIT 20`
    },

    // Q4) Product and its supplier (SELF JOIN equivalent — employee and their manager)
    lab5_q4: {
      title: 'Product and its supplier — equivalent to SELF JOIN (employee and manager)',
      lab: 'LAB 5', question: 'Q4',
      concept: 'SELF JOIN — maps to: e.employee JOIN e.manager ON employee.manager_id = manager.employee_id',
      sql: `SELECT p.name AS product, s.name AS supplier_manager FROM products p JOIN suppliers s ON p."supplierId" = s.id ORDER BY s.name, p.name LIMIT 20`
    },

    // Q5) All products and their categories using LEFT OUTER JOIN
    lab5_q5: {
      title: 'All products and their categories using LEFT OUTER JOIN',
      lab: 'LAB 5', question: 'Q5',
      concept: 'LEFT OUTER JOIN — maps to: all employees including those without department',
      sql: `SELECT p.name AS product_name, COALESCE(c.name, 'No Category') AS department_name FROM products p LEFT OUTER JOIN categories c ON p."categoryId" = c.id ORDER BY c.name NULLS LAST, p.name LIMIT 25`
    },

    // Q6) Products with category and price > 800 (salary > 8000)
    lab5_q6: {
      title: 'Products with category where price > 800 using JOIN + WHERE',
      lab: 'LAB 5', question: 'Q6',
      concept: 'JOIN with WHERE filter — maps to: JOIN + WHERE salary > 8000',
      sql: `SELECT p.name, p."sellingPrice", c.name AS category FROM products p JOIN categories c ON p."categoryId" = c.id WHERE p."sellingPrice" > 800 ORDER BY p."sellingPrice" DESC`
    },

    // ══════════════════════════════════════════════════
    // LAB 6 — Group Functions, Aggregations
    // ══════════════════════════════════════════════════

    // Q1) Average and total selling price of all products
    lab6_q1: {
      title: 'Average and total selling price of all products',
      lab: 'LAB 6', question: 'Q1',
      concept: 'AVG() and SUM() aggregate functions — maps to: AVG(salary), SUM(salary)',
      sql: `SELECT ROUND(AVG("sellingPrice")::numeric, 2) AS avg_salary, ROUND(SUM("sellingPrice")::numeric, 2) AS total_salary FROM products`
    },

    // Q2) Highest and lowest selling price
    lab6_q2: {
      title: 'Highest and lowest selling price',
      lab: 'LAB 6', question: 'Q2',
      concept: 'MAX() and MIN() aggregate functions — maps to: MAX(salary), MIN(salary)',
      sql: `SELECT MAX("sellingPrice") AS highest_salary, MIN("sellingPrice") AS lowest_salary FROM products`
    },

    // Q3) Total number of products in the system
    lab6_q3: {
      title: 'Total number of products in the system',
      lab: 'LAB 6', question: 'Q3',
      concept: 'COUNT(*) aggregate — maps to: COUNT(*) total employees',
      sql: `SELECT COUNT(*) AS total_employees FROM products`
    },

    // Q4) Count products that have a tax rate set (receive commission)
    lab6_q4: {
      title: 'Count products with tax rate set (equivalent to commission)',
      lab: 'LAB 6', question: 'Q4',
      concept: 'COUNT(column) ignores NULLs — maps to: COUNT(commission_pct)',
      sql: `SELECT COUNT("taxRate") AS employees_with_commission FROM products`
    },

    // Q5) Average selling price per category (per department)
    lab6_q5: {
      title: 'Average selling price per category',
      lab: 'LAB 6', question: 'Q5',
      concept: 'GROUP BY with AVG() — maps to: AVG(salary) GROUP BY department_id',
      sql: `SELECT c.name AS department, ROUND(AVG(p."sellingPrice")::numeric, 2) AS avg_salary FROM products p LEFT JOIN categories c ON p."categoryId" = c.id GROUP BY c.name ORDER BY avg_salary DESC`
    },

    // Q6) Category-wise max price where max > 1000 (HAVING max > 10000)
    lab6_q6: {
      title: 'Category-wise maximum price where max price > 1000',
      lab: 'LAB 6', question: 'Q6',
      concept: 'GROUP BY + HAVING — maps to: HAVING MAX(salary) > 10000',
      sql: `SELECT c.name AS department, MAX(p."sellingPrice") AS max_salary FROM products p LEFT JOIN categories c ON p."categoryId" = c.id GROUP BY c.name HAVING MAX(p."sellingPrice") > 1000 ORDER BY max_salary DESC`
    },

  }

  const queryDef = queries[key]
  if (!queryDef) return res.status(404).json({ error: `Query ${key} not found.` })

  try {
    const startTime = Date.now()
    const rows = await runQuery(queryDef.sql)
    const execTime = Date.now() - startTime

    res.json({
      title:     queryDef.title,
      lab:       queryDef.lab,
      question:  queryDef.question,
      concept:   queryDef.concept,
      sql:       queryDef.sql,
      rows,
      rowCount:  rows.length,
      execTime:  `${execTime}ms`
    })
  } catch (err) {
    console.error('Query error:', err.message)
    res.status(500).json({ error: err.message, sql: queryDef.sql })
  }
})

// ── GET /api/queries — list all available queries ────────────────────────────
router.get('/', (req, res) => {
  const labs = {
    lab1: { name: 'LAB 1 — Arithmetic, Aliases & Concatenation', questions: ['q1','q2','q3','q4','q5','q6','q7'] },
    lab2: { name: 'LAB 2 — WHERE Clause & Filtering',            questions: ['q1','q2','q3','q4','q5','q6','q7'] },
    lab3: { name: 'LAB 3 — Subqueries',                          questions: ['q1','q2','q3','q4','q5','q6'] },
    lab4: { name: 'LAB 4 — String Functions',                    questions: ['q1','q2','q3','q4','q5'] },
    lab5: { name: 'LAB 5 — Joins',                               questions: ['q1','q2','q3','q4','q5','q6'] },
    lab6: { name: 'LAB 6 — Group Functions & Aggregation',       questions: ['q1','q2','q3','q4','q5','q6'] },
  }
  res.json(labs)
})

module.exports = router
