// src/index.js
require('dotenv').config()
const express    = require('express')
const cors       = require('cors')
const helmet     = require('helmet')
const morgan     = require('morgan')
const rateLimit  = require('express-rate-limit')
const logger     = require('./services/logger')
const routes     = require('./routes')
const { globalErrorHandler } = require('./middleware/errorHandler')
const { iniciarCronJobs }    = require('./services/cron')

const app  = express()
const PORT = process.env.PORT || 3001

// ── Security ──────────────────────────────────────────────
app.set('trust proxy', 1)

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://localhost:4173',
].filter(Boolean)

app.use(cors({
  origin: (origin, cb) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return cb(null, true)
    if (
      allowedOrigins.includes(origin) ||
      /\.railway\.app$/.test(origin) ||
      /\.render\.com$/.test(origin) ||
      /\.vercel\.app$/.test(origin)
    ) return cb(null, true)
    cb(new Error(`CORS bloqueado para origen: ${origin}`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// Global rate limit: 200 req / 15 min per IP
app.use('/api', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes. Intenta de nuevo en 15 minutos.' },
}))

// Strict login rate limit: 10 attempts / 15 min per IP
app.use('/api/auth/login', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos de login. Espera 15 minutos.' },
}))

// ── Parsing ───────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// ── Logging ───────────────────────────────────────────────
app.use(morgan(
  process.env.NODE_ENV === 'production' ? 'combined' : 'dev',
  { stream: { write: (msg) => logger.info(msg.trim()) } }
))

// ── Routes ────────────────────────────────────────────────
app.use('/api', routes)

// Root
app.get('/', (_req, res) =>
  res.json({ app: 'FinanPro API', version: '1.0.0', docs: '/api/health' })
)

// 404 for unmatched routes
app.use((req, res) =>
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.path}` })
)

// ── Global error handler (must be last) ───────────────────
app.use(globalErrorHandler)

// ── Start ─────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`FinanPro API v1.0 · Puerto ${PORT} · ${process.env.NODE_ENV ?? 'development'}`)
  if (process.env.NODE_ENV !== 'test') iniciarCronJobs()
})

module.exports = app
