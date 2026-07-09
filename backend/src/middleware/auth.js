const jwt    = require('jsonwebtoken')
const prisma = require('../lib/prisma')

/**
 * authenticate — verifies Bearer JWT and attaches req.user.
 * Returns 401 on missing/invalid/expired token.
 */
const authenticate = async (req, res, next) => {
  try {
    const auth = req.headers.authorization
    if (!auth?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authentication required.' })
    }
    const decoded = jwt.verify(auth.split(' ')[1], process.env.JWT_SECRET)
    const user = await prisma.user.findUnique({
      where:  { id: decoded.userId },
      select: { id: true, name: true, email: true, role: true, isActive: true },
    })
    if (!user)           return res.status(401).json({ error: 'User not found.' })
    if (!user.isActive)  return res.status(403).json({ error: 'Account is deactivated.' })
    req.user = user
    next()
  } catch (err) {
    const msg = err.name === 'TokenExpiredError' ? 'Session expired. Please log in again.' : 'Invalid token.'
    res.status(401).json({ error: msg })
  }
}

/**
 * requireRole(...roles) — middleware factory.
 * Must be used after authenticate.
 */
const requireRole = (...roles) => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Not authenticated.' })
  if (!roles.includes(req.user.role)) {
    return res.status(403).json({ error: `Access denied. Required role: ${roles.join(' or ')}.` })
  }
  next()
}

module.exports = { authenticate, requireRole }
