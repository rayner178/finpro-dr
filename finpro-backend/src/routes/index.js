// src/routes/index.js
// Root router — mounts all domain sub-routers.
// No SQL, no business logic lives here.

const { Router } = require('express')
const { query }  = require('../db/pool')

const router = Router()

router.use('/auth',      require('./auth.routes'))
router.use('/clientes',  require('./clientes.routes'))
router.use('/prestamos', require('./prestamos.routes'))
router.use('/pagos',     require('./pagos.routes'))
router.use('/caja',      require('./caja.routes'))
router.use('/mora',      require('./mora.routes'))
router.use('/usuarios',  require('./usuarios.routes'))
router.use('/reportes',  require('./reportes.routes'))

// Health check — intentionally unauthenticated
router.get('/health', async (req, res, next) => {
  try {
    await query('SELECT 1')
    res.json({
      status:    'ok',
      db:        'connected',
      timestamp: new Date().toISOString(),
      version:   process.env.npm_package_version ?? '1.0.0',
    })
  } catch (err) {
    next(err)
  }
})

module.exports = router
