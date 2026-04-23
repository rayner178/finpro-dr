// src/controllers/caja.js
const { query }          = require('../db/pool')
const asyncHandler       = require('../middleware/asyncHandler')
const { ValidationError } = require('../middleware/errorHandler')

const listar = asyncHandler(async (req, res) => {
  const { fecha, limite = 50 } = req.query
  const params = []
  let sql = `
    SELECT cj.*, u.nombre AS usuario_nombre
    FROM caja cj
    LEFT JOIN usuarios u ON u.id = cj.usuario_id
    WHERE 1=1
  `
  if (fecha) {
    params.push(fecha)
    sql += ` AND cj.fecha = $${params.length}`
  }
  sql += ` ORDER BY cj.created_at DESC LIMIT $${params.length + 1}`

  const { rows } = await query(sql, [...params, parseInt(limite)])
  res.json(rows)
})

const registrar = asyncHandler(async (req, res) => {
  const { tipo, concepto, monto } = req.body

  const { rows } = await query(
    `INSERT INTO caja (sucursal_id, tipo, concepto, monto, fecha, usuario_id)
     VALUES ($1, $2, $3, $4, CURRENT_DATE, $5)
     RETURNING *`,
    [req.user.sucursal_id, tipo, concepto, parseFloat(monto), req.user.id]
  )
  res.status(201).json(rows[0])
})

module.exports = { listar, registrar }
