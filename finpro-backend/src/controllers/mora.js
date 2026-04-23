// src/controllers/mora.js
const { query }              = require('../db/pool')
const asyncHandler           = require('../middleware/asyncHandler')
const { NotFoundError }      = require('../middleware/errorHandler')
const { notificarMoraMasiva } = require('../services/twilio')

const listar = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT p.*, c.nombre AS cliente_nombre, c.cedula, c.telefono
    FROM prestamos p
    JOIN clientes c ON c.id = p.cliente_id
    WHERE p.dias_atraso > 0 OR p.estado = 'vencido'
    ORDER BY p.dias_atraso DESC
  `)
  res.json(rows)
})

const notificarMasivo = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT p.id, p.cliente_id, p.dias_atraso, p.saldo_pendiente, p.cuota_monto,
           c.nombre AS cliente_nombre, c.telefono
    FROM prestamos p
    JOIN clientes c ON c.id = p.cliente_id
    WHERE p.dias_atraso > 0
      AND p.estado IN ('activo', 'vencido')
      AND c.telefono IS NOT NULL
  `)

  const result = await notificarMoraMasiva(rows)
  res.json({ mensaje: 'Proceso de notificación completado', ...result })
})

const bloquearCliente = asyncHandler(async (req, res) => {
  const { clienteId } = req.params

  const { rows } = await query(
    `UPDATE clientes SET estado = 'bloqueado', updated_at = NOW()
     WHERE id = $1
     RETURNING id, nombre, estado`,
    [parseInt(clienteId)]
  )

  if (!rows[0]) throw new NotFoundError('Cliente')

  res.json({ mensaje: 'Cliente bloqueado exitosamente', cliente: rows[0] })
})

module.exports = { listar, notificarMasivo, bloquearCliente }
