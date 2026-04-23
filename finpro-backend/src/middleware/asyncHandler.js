// src/middleware/asyncHandler.js
// Wraps async route handlers so thrown errors reach the global error handler
// instead of crashing the process with an unhandled promise rejection.

/**
 * Wraps an async Express handler and forwards any thrown error to next().
 * Usage: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next)
}

module.exports = asyncHandler
