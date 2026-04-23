// src/routes/pagos.routes.js
const { Router } = require('express')
const ctrl       = require('../controllers/pagos')
const { authenticate, authorize, audit } = require('../middleware/auth')
const { registrarPagoRules } = require('../validators')

const router = Router()

router.use(authenticate)

router.get ('/',           ctrl.listar)
router.get ('/:id/recibo', ctrl.descargarRecibo)

router.post('/',
  authorize('Administrador', 'Supervisor', 'Cobrador', 'Cajero'),
  registrarPagoRules,
  audit('REGISTRAR_PAGO', 'pagos'),
  ctrl.registrar
)

module.exports = router
