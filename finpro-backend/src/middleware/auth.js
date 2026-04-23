// src/middleware/auth.js
const jwt        = require('jsonwebtoken')
const { query }  = require('../db/pool')
const logger     = require('../services/logger')

// ── Verify JWT and attach req.user ────────────────────────
const authenticate = async (req, res, next) => {
  try {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticación requerido' })
    }

    const token   = header.split(' ')[1]
    const decoded = jwt.verify(token, process.env.JWT_SECRET)

    // Re-check DB so a deactivated account is blocked immediately
    const { rows } = await query(
      'SELECT id, nombre, usuario, rol, sucursal_id, activo FROM usuarios WHERE id = $1',
      [decoded.id]
    )

    if (!rows[0] || !rows[0].activo) {
      return res.status(401).json({ error: 'Usuario inactivo o no encontrado' })
    }

    req.user = rows[0]
    next()
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Sesión expirada, vuelve a iniciar sesión' })
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' })
    }
    logger.error('Error en middleware authenticate:', err)
    next(err)
  }
}

// ── Role-based access control ─────────────────────────────
const authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user?.rol)) {
    return res.status(403).json({
      error: `Acceso denegado. Se requiere uno de los roles: ${roles.join(', ')}`,
    })
  }
  next()
}

// ── Audit log (strips sensitive fields) ──────────────────
const SENSITIVE = new Set(['password','password_hash','password_actual','password_nuevo','token'])

const sanitizeBody = (body) => {
  if (!body || typeof body !== 'object') return {}
  return Object.fromEntries(Object.entries(body).filter(([k]) => !SENSITIVE.has(k)))
}

const audit = (accion, tabla) => async (req, res, next) => {
  res.on('finish', async () => {
    if (res.statusCode < 400 && req.user) {
      try {
        await query(
          `INSERT INTO auditoria (usuario_id, accion, tabla, registro_id, detalle, ip)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            req.user.id, accion, tabla,
            req.params.id ? parseInt(req.params.id) : (res.locals.newId ?? null),
            JSON.stringify({ body: sanitizeBody(req.body), params: req.params }),
            req.ip,
          ]
        )
      } catch (e) {
        logger.error('Error guardando auditoria:', e.message)
      }
    }
  })
  next()
}

module.exports = { authenticate, authorize, audit }
