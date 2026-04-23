// src/routes/reportes.routes.js
const { Router } = require('express')
const ctrl       = require('../controllers/reportes')
const { authenticate, authorize } = require('../middleware/auth')

const router = Router()

router.use(authenticate)

router.get('/dashboard',       ctrl.dashboard)
router.get('/cartera-activa',  authorize('Administrador', 'Supervisor'), ctrl.carteraActiva)
router.get('/cartera-vencida', authorize('Administrador', 'Supervisor'), ctrl.carteraVencida)
router.get('/caja',            ctrl.reporteCaja)
router.get('/sib',             authorize('Administrador'), ctrl.reporteSIB)
router.get('/auditoria',       authorize('Administrador'), ctrl.auditoria)

module.exports = router
