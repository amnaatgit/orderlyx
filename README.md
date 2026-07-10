# OrderlyX — Inventory Management System

A full-stack inventory management platform with role-based access control, real-time stock tracking, order processing, and analytics dashboards.

Built with **Node.js + Express + Prisma (PostgreSQL)** on the backend and **React + Vite + Tailwind CSS** on the frontend.

---

## Features

| Module | Description |
|---|---|
| **Products** | Full catalog with SKU, barcode, pricing, reorder levels, stock alerts, and pagination |
| **Orders** | Purchase, sale, and adjustment orders with atomic stock updates in a DB transaction |
| **Suppliers** | Vendor management with contacts and linked product/order history |
| **Customers** | Customer records with server-side search and credit limits |
| **Reports** | Inventory valuation, margin analysis, and category breakdowns |
| **User Management** | Role-based access: Admin, Manager, Staff, Viewer |
| **Audit Logs** | Immutable log of every create/update/delete action with actor tracking |


---

## Architecture

```
orderlyx/
├── backend/
│   ├── src/
│   │   ├── lib/
│   │   │   └── prisma.js          ← Prisma singleton (prevents connection exhaustion)
│   │   ├── middleware/
│   │   │   └── auth.js            ← JWT authentication + role guard
│   │   └── routes/
│   │       ├── auth.js            ← Login with timing-safe password comparison
│   │       ├── products.js        ← CRUD + low-stock filter + role-scoped field stripping
│   │       ├── orders.js          ← Transactional order creation + stock adjustment
│   │       ├── suppliers.js
│   │       ├── categories.js
│   │       ├── customers.js (→ _combined.js)
│   │       ├── users.js    (→ _combined.js)
│   │       ├── audit.js    (→ _combined.js)
│   │       ├── dashboard.js (→ _combined.js)
│   │       ├── normalization.js
│   │       ├── dbexplorer.js
│   │       └── queries.js
│   └── prisma/
│       ├── schema.prisma          ← Full normalized schema (3NF/BCNF)
│       └── seed.js
└── frontend/
    └── src/
        ├── context/AuthContext.jsx ← Token validated against server on every mount
        ├── api/index.js            ← Axios instance + namespaced API helpers
        ├── components/
        │   ├── layout/index.jsx    ← Sidebar + header with role-filtered navigation
        │   └── ui/index.jsx        ← Modal, Toast, Loader, Empty, Confirm, Pagination
        └── pages/                  ← One file per module
```

---



## Role permissions

| Feature | Admin | Manager | Staff | Viewer |
|---|---|---|---|---|
| View products, orders, suppliers | ✓ | ✓ | ✓ | ✓ |
| See cost prices & financial data | ✓ | ✓ | — | — |
| Create / edit products | ✓ | ✓ | qty+status only | — |
| Create orders | ✓ | ✓ | ✓ | — |
| Manage customers | ✓ | ✓ | — | — |
| User management & audit logs | ✓ | — | — | — |


---

## Setup

**Prerequisites:** Node.js 18+, PostgreSQL 14+

```bash
# 1. Clone and install
cd backend  && npm install
cd ../frontend && npm install

# 2. Configure environment
cp backend/.env.example backend/.env
# Set DATABASE_URL and JWT_SECRET in backend/.env

# 3. Initialise the database
cd backend
npx prisma db push
node prisma/seed.js

# 4. Start servers (two terminals)
npm run dev        # backend → http://localhost:3000
cd ../frontend && npm run dev  # frontend → http://localhost:5173
```

---

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Admin | admin@orderlyx.com | admin123 |
| Manager | manager@orderlyx.com | manager123 |
| Staff | staff@orderlyx.com | staff123 |
| Viewer | viewer@orderlyx.com | viewer123 |

Click any row on the login page to auto-fill credentials.
