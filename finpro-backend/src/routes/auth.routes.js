// src/routes/auth.routes.js
const { Router }   = require('express')
const ctrl         = require('../controllers/auth')
const { authenticate } = require('../middleware/auth')
const { loginRules, changePasswordRules } = require('../validators')

const router = Router()

router.post('/login',            loginRules,          ctrl.login)
router.get ('/perfil',           authenticate,        ctrl.perfil)
router.put ('/cambiar-password', authenticate, changePasswordRules, ctrl.cambiarPassword)

module.exports = router
