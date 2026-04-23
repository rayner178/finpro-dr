// src/validators/index.js
// express-validator rule sets for each domain.
// Each exported array is used directly as route middleware.

const { body, query, param, validationResult } = require('express-validator')
const { ValidationError } = require('../middleware/errorHandler')

// Run validation and throw if any errors exist
const validate = (req, _res, next) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    const messages = errors.array().map(e => e.msg).join('; ')
    throw new ValidationError(messages)
  }
  next()
}

// ── Auth ─────────────────────────────────────────────────
const loginRules = [
  body('usuario').trim().notEmpty().withMessage('Usuario requerido'),
  body('password').notEmpty().withMessage('Contraseña requerida'),
  validate,
]

const changePasswordRules = [
  body('password_actual').notEmpty().withMessage('Contraseña actual requerida'),
  body('password_nuevo')
    .isLength({ min: 8 }).withMessage('La nueva contraseña debe tener al menos 8 caracteres'),
  validate,
]

// ── Clientes ─────────────────────────────────────────────
const crearClienteRules = [
  body('cedula')
    .trim().notEmpty().withMessage('Cédula requerida')
    .matches(/^\d{3}-\d{7}-\d{1}$|^\d{11}$/).withMessage('Formato de cédula inválido (ej: 001-1234567-8)'),
  body('nombre').trim().notEmpty().withMessage('Nombre requerido').isLength({ max: 150 }),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email inválido'),
  body('telefono').optional({ checkFalsy: true }).trim(),
  validate,
]

const actualizarClienteRules = [
  param('id').isInt({ min: 1 }).withMessage('ID inválido'),
  body('email').optional({ checkFalsy: true }).isEmail().withMessage('Email inválido'),
  body('estado')
    .optional()
    .isIn(['activo', 'moroso', 'bloqueado', 'inactivo'])
    .withMessage('Estado inválido'),
  validate,
]

// ── Préstamos ────────────────────────────────────────────
const simularRules = [
  body('monto_principal')
    .isFloat({ min: 100 }).withMessage('Monto mínimo RD$ 100'),
  body('tipo_prestamo')
    .isIn(['diario', 'semanal', 'quincenal', 'mensual'])
    .withMessage('Tipo de préstamo inválido'),
  body('num_cuotas')
    .isInt({ min: 1, max: 360 }).withMessage('Número de cuotas debe estar entre 1 y 360'),
  body('tasa_mensual')
    .isFloat({ min: 0.1, max: 50 }).withMessage('Tasa mensual debe estar entre 0.1% y 50%'),
  validate,
]

const crearPrestamoRules = [
  body('cliente_id').isInt({ min: 1 }).withMessage('cliente_id inválido'),
  ...simularRules.slice(0, -1), // reuse same field rules, remove the final validate
  validate,
]

// ── Pagos ────────────────────────────────────────────────
const registrarPagoRules = [
  body('prestamo_id').isInt({ min: 1 }).withMessage('prestamo_id inválido'),
  body('monto').isFloat({ min: 0.01 }).withMessage('Monto debe ser mayor a 0'),
  body('tipo_pago')
    .optional()
    .isIn(['cuota', 'abono', 'cancelacion', 'mora'])
    .withMessage('Tipo de pago inválido'),
  body('metodo_pago')
    .optional()
    .isIn(['efectivo', 'transferencia', 'cheque', 'tarjeta'])
    .withMessage('Método de pago inválido'),
  validate,
]

// ── Caja ─────────────────────────────────────────────────
const registrarCajaRules = [
  body('tipo').isIn(['entrada', 'salida']).withMessage('Tipo debe ser entrada o salida'),
  body('concepto').trim().notEmpty().withMessage('Concepto requerido').isLength({ max: 500 }),
  body('monto').isFloat({ min: 0.01 }).withMessage('Monto debe ser mayor a 0'),
  validate,
]

// ── Usuarios ─────────────────────────────────────────────
const crearUsuarioRules = [
  body('nombre').trim().notEmpty().withMessage('Nombre requerido'),
  body('usuario')
    .trim().notEmpty()
    .isAlphanumeric().withMessage('Usuario solo puede contener letras y números')
    .isLength({ min: 3, max: 30 }).withMessage('Usuario debe tener entre 3 y 30 caracteres'),
  body('email').isEmail().withMessage('Email inválido'),
  body('password')
    .isLength({ min: 8 }).withMessage('Contraseña mínimo 8 caracteres'),
  body('rol')
    .isIn(['Administrador', 'Supervisor', 'Cobrador', 'Cajero'])
    .withMessage('Rol inválido'),
  validate,
]

module.exports = {
  loginRules,
  changePasswordRules,
  crearClienteRules,
  actualizarClienteRules,
  simularRules,
  crearPrestamoRules,
  registrarPagoRules,
  registrarCajaRules,
  crearUsuarioRules,
}
