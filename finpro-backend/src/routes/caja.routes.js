// src/routes/caja.routes.js
const { Router } = require('express')
const ctrl       = require('../controllers/caja')
const { authenticate, authorize } = require('../middleware/auth')
const { registrarCajaRules } = require('../validators')

const router = Router()

router.use(authenticate)

router.get ('/', ctrl.listar)
router.post('/', authorize('Administrador', 'Cajero'), registrarCajaRules, ctrl.registrar)

module.exports = router
