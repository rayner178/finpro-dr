// src/controllers/auth.js
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { query } = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler')
const logger = require('../services/logger');

// ── LOGIN ───────────────────────────────────────────────────
const login = asyncHandler(async (req, res) => {
  const { usuario, password } = req.body;

  if (!usuario || !password) {
    return res.status(400).json({ error: 'Usuario y contraseña requeridos' });
  }

  try {
    const { rows } = await query(`
      SELECT u.*, s.nombre AS sucursal_nombre
      FROM usuarios u
      LEFT JOIN sucursales s ON s.id = u.sucursal_id
      WHERE u.usuario = $1
    `, [usuario.trim().toLowerCase()]);

    const user = rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    if (!user.activo) {
      return res.status(401).json({ error: 'Cuenta desactivada. Contacte al administrador.' });
    }

    const passwordOk = await bcrypt.compare(password, user.password_hash);
    if (!passwordOk) {
      logger.warn(`Intento fallido de login: usuario ${usuario} | IP: ${req.ip}`);
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Generar JWT
    const token = jwt.sign(
      { id: user.id, rol: user.rol, sucursal_id: user.sucursal_id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    // Actualizar último login
    await query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1', [user.id]);

    // Registrar en auditoría
    await query(
      `INSERT INTO auditoria (usuario_id, accion, ip) VALUES ($1, 'LOGIN', $2)`,
      [user.id, req.ip]
    );

    logger.info(`Login exitoso: ${user.usuario} (${user.rol})`);

    res.json({
      token,
      usuario: {
        id: user.id,
        nombre: user.nombre,
        usuario: user.usuario,
        email: user.email,
        rol: user.rol,
        sucursal_id: user.sucursal_id,
        sucursal_nombre: user.sucursal_nombre,
      }
    });
  } catch (err) {
    logger.error('Error en login:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── CAMBIAR CONTRASEÑA ──────────────────────────────────────
const cambiarPassword = asyncHandler(async (req, res) => {
  const { password_actual, password_nuevo } = req.body;

  if (!password_actual || !password_nuevo) {
    return res.status(400).json({ error: 'Ambas contraseñas son requeridas' });
  }

  if (password_nuevo.length < 8) {
    return res.status(400).json({ error: 'La nueva contraseña debe tener al menos 8 caracteres' });
  }

  try {
    const { rows } = await query('SELECT password_hash FROM usuarios WHERE id = $1', [req.user.id]);
    const ok = await bcrypt.compare(password_actual, rows[0].password_hash);
    if (!ok) return res.status(401).json({ error: 'Contraseña actual incorrecta' });

    const hash = await bcrypt.hash(password_nuevo, 12);
    await query('UPDATE usuarios SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hash, req.user.id]);

    res.json({ mensaje: 'Contraseña actualizada exitosamente' });
  } catch (err) {
    logger.error('Error cambiando password:', err);
    res.status(500).json({ error: 'Error interno' });
  }
});

// ── PERFIL ──────────────────────────────────────────────────
const perfil = asyncHandler(async (req, res) => {
  try {
    const { rows } = await query(`
      SELECT u.id, u.nombre, u.usuario, u.email, u.rol, u.ultimo_login, u.sucursal_id, s.nombre AS sucursal_nombre
      FROM usuarios u
      LEFT JOIN sucursales s ON s.id = u.sucursal_id
      WHERE u.id = $1
    `, [req.user.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Error obteniendo perfil' });
  }
});

module.exports = { login, cambiarPassword, perfil };
