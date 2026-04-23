// src/routes/usuarios.routes.js
const { Router } = require('express')
const ctrl       = require('../controllers/usuarios')
const { authenticate, authorize, audit } = require('../middleware/auth')
const { crearUsuarioRules } = require('../validators')

const router = Router()

router.use(authenticate)

router.get('/', authorize('Administrador', 'Supervisor'), ctrl.listar)

router.post('/',
  authorize('Administrador'),
  crearUsuarioRules,
  audit('CREAR_USUARIO', 'usuarios'),
  ctrl.crear
)

router.put('/:id/toggle',
  authorize('Administrador'),
  audit('TOGGLE_USUARIO', 'usuarios'),
  ctrl.toggleActivo
)

module.exports = router
