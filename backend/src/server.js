require('dotenv').config()
const express = require('express')
const corsLib  = require('cors')

const app  = express()
const PORT = process.env.PORT || 3000

// ── Security headers ──────────────────────────────────────────────────────────
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  next()
})

// ── CORS ──────────────────────────────────────────────────────────────────────
// Allow all configured origins (comma-separated in FRONTEND_URL)
// or fall back to localhost for dev. Portfolio demo — CORS is permissive.
app.use(corsLib({
  origin: function(origin, cb) {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) return cb(null, true)
    const allowed = (process.env.FRONTEND_URL || 'http://localhost:5173')
      .split(',').map(s => s.trim())
    if (allowed.includes(origin) || allowed.includes('*')) return cb(null, true)
    // Also allow any vercel.app / onrender.com subdomain for portfolio
    if (/\.vercel\.app$/.test(origin) || /\.onrender\.com$/.test(origin)) return cb(null, true)
    cb(null, true) // permissive for demo
  },
  credentials: true,
}))

// ── Body parsing ──────────────────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }))

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_, res) => res.json({ status: 'ok', app: 'OrderlyX', timestamp: new Date().toISOString() }))

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',          require('./routes/auth'))
app.use('/api/products',      require('./routes/products'))
app.use('/api/categories',    require('./routes/categories'))
app.use('/api/suppliers',     require('./routes/suppliers'))
app.use('/api/orders',        require('./routes/orders'))
app.use('/api/customers',     require('./routes/customers'))
app.use('/api/users',         require('./routes/users'))
app.use('/api/audit',         require('./routes/audit'))
app.use('/api/dashboard',     require('./routes/dashboard'))
app.use('/api/queries',       require('./routes/queries'))
app.use('/api/dbexplorer',    require('./routes/dbexplorer'))
app.use('/api/normalization', require('./routes/normalization'))

// ── 404 handler ───────────────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.path}` })
})

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[unhandled error]', err)
  res.status(err.status || 500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'An unexpected error occurred.'
      : (err.message || 'Internal server error'),
  })
})

app.listen(PORT, async () => {
  console.log(`\n🚀 OrderlyX API → http://localhost:${PORT}`)
  // Auto-seed on startup if DB is empty
  try {
    const { execSync } = require('child_process')
    execSync('node prisma/seed.js', { stdio:'inherit', cwd: __dirname + '/..' })
  } catch (e) { console.error('Seed warning:', e.message) }
  console.log('')
})
