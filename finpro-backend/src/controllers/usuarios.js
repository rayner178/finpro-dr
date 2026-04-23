// src/controllers/usuarios.js
const bcrypt             = require('bcryptjs')
const { query }          = require('../db/pool')
const asyncHandler       = require('../middleware/asyncHandler')
const { NotFoundError, ConflictError } = require('../middleware/errorHandler')

const listar = asyncHandler(async (req, res) => {
  const { rows } = await query(`
    SELECT u.id, u.nombre, u.usuario, u.email, u.rol,
           u.activo, u.ultimo_login,
           s.nombre AS sucursal_nombre
    FROM usuarios u
    LEFT JOIN sucursales s ON s.id = u.sucursal_id
    ORDER BY u.nombre
  `)
  res.json(rows)
})

const crear = asyncHandler(async (req, res) => {
  const { nombre, usuario, email, password, rol, sucursal_id } = req.body

  // Check uniqueness before hashing (cheap check first)
  const existe = await query(
    'SELECT id FROM usuarios WHERE usuario = $1 OR email = $2',
    [usuario.toLowerCase(), email]
  )
  if (existe.rows[0]) {
    throw new ConflictError('Ya existe un usuario con ese nombre de usuario o email')
  }

  const hash = await bcrypt.hash(password, 12)
  const { rows } = await query(
    `INSERT INTO usuarios (nombre, usuario, email, password_hash, rol, sucursal_id)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, nombre, usuario, email, rol, sucursal_id, activo`,
    [nombre, usuario.toLowerCase(), email, hash, rol, sucursal_id ?? 1]
  )

  res.locals.newId = rows[0].id
  res.status(201).json(rows[0])
})

const toggleActivo = asyncHandler(async (req, res) => {
  const { rows } = await query(
    `UPDATE usuarios
     SET activo = NOT activo, updated_at = NOW()
     WHERE id = $1
     RETURNING id, nombre, activo`,
    [parseInt(req.params.id)]
  )
  if (!rows[0]) throw new NotFoundError('Usuario')
  res.json(rows[0])
})

module.exports = { listar, crear, toggleActivo }
