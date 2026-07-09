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
| **DB Explorer** | Live schema browser and raw SQL runner (Manager+) |
| **DBMS Proof** | Normalization walkthrough (1NF → BCNF) and sample query lab |

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

## Bugs fixed in this version

1. **Prisma `N+1` connection pool exhaustion** — Every route file previously created its own `PrismaClient` instance. With many concurrent requests this exhausts the connection pool. Fixed with a module-level singleton in `lib/prisma.js`.

2. **Email enumeration in login** — The original login route returned immediately on a missing user, leaking that the email doesn't exist. Fixed with a dummy hash comparison so timing is consistent for both valid and invalid emails.

3. **Deactivated users could still authenticate** — The `isActive` check was missing from the login flow and the auth middleware. Both now reject deactivated accounts.

4. **Stale role data in frontend** — `AuthContext` loaded user data from `localStorage` on mount without re-validating against the server. If an admin changed a user's role, the client still showed the old role until manual logout. Fixed by calling `/auth/me` on every mount and refreshing from the server response.

5. **Client-side search in Customers** — `load()` fetched all customers then filtered in JavaScript. This breaks on large datasets and doesn't leverage DB indexes. Fixed by passing `search` as a query param and filtering in the DB with Prisma's `contains` mode.

6. **`lowStock` filter applied after pagination** — The `lowStock=true` parameter was filtering results *after* `take: limit` was applied, so you'd get fewer than the requested page size. Fixed by fetching the full unfiltered set when `lowStock=true` and applying the cross-field comparison before responding.

7. **Order number collisions under concurrent requests** — Order numbers were generated as `prefix-year-(count+1)`. Two simultaneous requests would get the same count and produce duplicate order numbers. Fixed with a `Date.now().toString(36)` suffix which is unique per millisecond.

8. **ADJUSTMENT orders subtracted stock** — `ADJUSTMENT` type orders used `-item.quantity` delta (same as `SALE`). Adjustments should use the signed quantity directly (positive = add stock, negative = remove). Fixed with explicit delta logic per order type.

9. **Missing Escape key handler on Modal** — Modals had no keyboard dismiss. Added a `keydown` listener for `Escape` that calls `onClose`.

10. **Global error handler missing `next` parameter** — Express's 4-parameter error handler `(err, req, res, next)` requires all four arguments; without `next`, Express does not recognize it as an error handler. Fixed.

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
| DB Explorer | ✓ | ✓ | — | — |

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
