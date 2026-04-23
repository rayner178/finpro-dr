// src/routes/mora.routes.js
const { Router } = require('express')
const ctrl       = require('../controllers/mora')
const { authenticate, authorize } = require('../middleware/auth')

const router = Router()

router.use(authenticate)

router.get ('/',                      ctrl.listar)
router.post('/notificar-masivo',      authorize('Administrador', 'Supervisor'), ctrl.notificarMasivo)
router.post('/bloquear/:clienteId',   authorize('Administrador', 'Supervisor'), ctrl.bloquearCliente)

module.exports = router
