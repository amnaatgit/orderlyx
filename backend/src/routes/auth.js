const express = require('express')
const bcrypt  = require('bcryptjs')
const jwt     = require('jsonwebtoken')
const prisma  = require('../lib/prisma')
const { authenticate } = require('../middleware/auth')

const router = express.Router()

// ── POST /api/auth/login ──────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' })
    }

    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } })

    // Use constant-time comparison even on missing user to prevent email enumeration
    const dummyHash = '$2a$10$abcdefghijklmnopqrstuvuXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX'
    const valid = user
      ? await bcrypt.compare(password, user.password)
      : await bcrypt.compare(password, dummyHash).then(() => false)

    if (!user || !valid) {
      return res.status(401).json({ error: 'Invalid email or password.' })
    }
    if (!user.isActive) {
      return res.status(403).json({ error: 'Your account has been deactivated. Contact an admin.' })
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' })

    // Record last login (non-blocking — failure should not break login)
    prisma.user.update({ where: { id: user.id }, data: { lastLogin: new Date() } }).catch(() => {})

    // Never return password hash to client
    const { password: _pw, ...safeUser } = user
    res.json({ user: safeUser, token })
  } catch (err) {
    console.error('[auth/login]', err)
    res.status(500).json({ error: 'Login failed. Please try again.' })
  }
})

// ── GET /api/auth/me ──────────────────────────────────────────────────────────
router.get('/me', authenticate, (req, res) => {
  // req.user is already populated by authenticate (no password field)
  res.json({ user: req.user })
})

module.exports = router
