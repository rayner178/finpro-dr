// src/middleware/errorHandler.js
// Typed application errors + Express global error handler

class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.statusCode = statusCode
    this.isOperational = true // distinguish from programmer errors
    Error.captureStackTrace(this, this.constructor)
  }
}

class NotFoundError extends AppError {
  constructor(resource = 'Recurso') {
    super(`${resource} no encontrado`, 404)
  }
}

class ValidationError extends AppError {
  constructor(message) {
    super(message, 400)
  }
}

class ForbiddenError extends AppError {
  constructor(message = 'Acceso denegado') {
    super(message, 403)
  }
}

class ConflictError extends AppError {
  constructor(message) {
    super(message, 409)
  }
}

// ── Global Express error handler ──────────────────────────
// Must be registered LAST in app.use() chain (4 params = error handler)
const globalErrorHandler = (err, req, res, next) => {
  const logger = require('../services/logger')

  // PostgreSQL constraint violations → friendly messages
  if (err.code === '23505') {
    return res.status(409).json({ error: 'Ya existe un registro con ese valor' })
  }
  if (err.code === '23503') {
    return res.status(400).json({ error: 'Referencia inválida: el registro relacionado no existe' })
  }
  if (err.code === '23514') {
    return res.status(400).json({ error: 'Valor fuera del rango permitido' })
  }

  // Known operational errors (AppError subclasses)
  if (err.isOperational) {
    return res.status(err.statusCode).json({ error: err.message })
  }

  // Unknown / programmer errors — log full stack, hide details in production
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    user: req.user?.id,
  })

  res.status(500).json({
    error: process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message,
  })
}

module.exports = {
  AppError,
  NotFoundError,
  ValidationError,
  ForbiddenError,
  ConflictError,
  globalErrorHandler,
}
