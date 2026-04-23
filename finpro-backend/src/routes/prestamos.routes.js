// src/routes/prestamos.routes.js
const { Router } = require('express')
const ctrl       = require('../controllers/prestamos')
const { authenticate, authorize, audit } = require('../middleware/auth')
const { simularRules, crearPrestamoRules } = require('../validators')

const router = Router()

router.use(authenticate)

router.get ('/',            ctrl.listar)
router.post('/simular',     simularRules, ctrl.simular)
router.get ('/:id',         ctrl.obtener)
router.get ('/:id/contrato',ctrl.descargarContrato)

router.post('/',
  authorize('Administrador', 'Supervisor'),
  crearPrestamoRules,
  audit('CREAR_PRESTAMO', 'prestamos'),
  ctrl.crear
)

module.exports = router
