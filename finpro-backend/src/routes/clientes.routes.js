// src/routes/clientes.routes.js
const { Router } = require('express')
const ctrl       = require('../controllers/clientes')
const { authenticate, authorize, audit } = require('../middleware/auth')
const { crearClienteRules, actualizarClienteRules } = require('../validators')

const router = Router()

router.use(authenticate) // all routes in this file require auth

router.get ('/',    ctrl.listar)
router.get ('/:id', ctrl.obtener)

router.post('/',
  authorize('Administrador', 'Supervisor', 'Cajero'),
  crearClienteRules,
  audit('CREAR_CLIENTE', 'clientes'),
  ctrl.crear
)

router.put('/:id',
  authorize('Administrador', 'Supervisor'),
  actualizarClienteRules,
  audit('ACTUALIZAR_CLIENTE', 'clientes'),
  ctrl.actualizar
)

module.exports = router
