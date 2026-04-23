// src/controllers/clientes.js
const { query, transaction } = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler')
const logger = require('../services/logger');

// ── LISTAR ──────────────────────────────────────────────────
const listar = asyncHandler(async (req, res) => {
  const { buscar, estado, pagina = 1, limite = 20 } = req.query;
  const offset = (pagina - 1) * limite;

  let sql = `
    SELECT 
      c.*,
      s.nombre AS sucursal_nombre,
      COUNT(p.id) AS total_prestamos,
      COUNT(CASE WHEN p.estado = 'activo' THEN 1 END) AS prestamos_activos,
      SUM(CASE WHEN p.estado = 'activo' THEN p.saldo_pendiente ELSE 0 END) AS saldo_total
    FROM clientes c
    LEFT JOIN sucursales s ON s.id = c.sucursal_id
    LEFT JOIN prestamos p ON p.cliente_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (buscar) {
    params.push(`%${buscar}%`);
    sql += ` AND (c.nombre ILIKE $${params.length} OR c.cedula ILIKE $${params.length})`;
  }
  if (estado) {
    params.push(estado);
    sql += ` AND c.estado = $${params.length}`;
  }

  // Solo ver clientes de su sucursal (excepto admin)
  if (req.user.rol !== 'Administrador') {
    params.push(req.user.sucursal_id);
    sql += ` AND c.sucursal_id = $${params.length}`;
  }

  sql += ` GROUP BY c.id, s.nombre ORDER BY c.nombre`;

  // Total para paginación
  const countSql = `SELECT COUNT(*) FROM (${sql}) t`;
  const [countRes, dataRes] = await Promise.all([
    query(countSql, params),
    query(`${sql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`, [...params, limite, offset])
  ]);

  res.json({
    total: parseInt(countRes.rows[0].count),
    pagina: parseInt(pagina),
    limite: parseInt(limite),
    datos: dataRes.rows
  });
});

// ── OBTENER UNO ─────────────────────────────────────────────
const obtener = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rows } = await query(`
    SELECT c.*, s.nombre AS sucursal_nombre,
      (SELECT json_agg(p ORDER BY p.created_at DESC) FROM prestamos p WHERE p.cliente_id = c.id) AS historial_prestamos
    FROM clientes c
    LEFT JOIN sucursales s ON s.id = c.sucursal_id
    WHERE c.id = $1
  `, [id]);

  if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
  res.json(rows[0]);
});

// ── CREAR ───────────────────────────────────────────────────
const crear = asyncHandler(async (req, res) => {
  const {
    cedula, nombre, telefono, telefono2, email, direccion,
    fecha_nac, ocupacion, ingresos_mensual, referencias, notas
  } = req.body;

  if (!cedula || !nombre) {
    return res.status(400).json({ error: 'Cédula y nombre son requeridos' });
  }

  try {
    // Verificar cédula única
    const existe = await query('SELECT id FROM clientes WHERE cedula = $1', [cedula]);
    if (existe.rows[0]) {
      return res.status(409).json({ error: `Ya existe un cliente con la cédula ${cedula}` });
    }

    const { rows } = await query(`
      INSERT INTO clientes 
        (cedula, nombre, telefono, telefono2, email, direccion, fecha_nac, 
         ocupacion, ingresos_mensual, referencias, notas, sucursal_id, created_by)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
      RETURNING *
    `, [cedula, nombre, telefono, telefono2, email, direccion, fecha_nac,
        ocupacion, ingresos_mensual, referencias, notas,
        req.user.sucursal_id, req.user.id]);

    res.locals.newId = rows[0].id;
    logger.info(`Cliente creado: ${nombre} (${cedula}) por ${req.user.usuario}`);
    res.status(201).json(rows[0]);
  } catch (err) {
    logger.error('Error creando cliente:', err);
    res.status(500).json({ error: 'Error creando cliente' });
  }
});

// ── ACTUALIZAR ──────────────────────────────────────────────
const actualizar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const {
    nombre, telefono, telefono2, email, direccion,
    fecha_nac, ocupacion, ingresos_mensual, referencias, notas, estado
  } = req.body;

  try {
    const { rows } = await query(`
      UPDATE clientes SET
        nombre = COALESCE($1, nombre),
        telefono = COALESCE($2, telefono),
        telefono2 = COALESCE($3, telefono2),
        email = COALESCE($4, email),
        direccion = COALESCE($5, direccion),
        fecha_nac = COALESCE($6, fecha_nac),
        ocupacion = COALESCE($7, ocupacion),
        ingresos_mensual = COALESCE($8, ingresos_mensual),
        referencias = COALESCE($9, referencias),
        notas = COALESCE($10, notas),
        estado = COALESCE($11, estado),
        updated_at = NOW()
      WHERE id = $12
      RETURNING *
    `, [nombre, telefono, telefono2, email, direccion,
        fecha_nac, ocupacion, ingresos_mensual, referencias, notas, estado, id]);

    if (!rows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    res.json(rows[0]);
  } catch (err) {
    logger.error('Error actualizando cliente:', err);
    res.status(500).json({ error: 'Error actualizando cliente' });
  }
});

// ── ACTUALIZAR SCORE ────────────────────────────────────────
const recalcularScore = async (clienteId) => {
  // Score basado en historial de pagos
  const { rows } = await query(`
    SELECT
      COUNT(CASE WHEN p.estado = 'pagado' THEN 1 END) AS pagados,
      COUNT(CASE WHEN p.estado = 'vencido' THEN 1 END) AS vencidos,
      COUNT(p.id) AS total,
      COALESCE(MAX(p.dias_atraso), 0) AS max_atraso
    FROM prestamos p WHERE p.cliente_id = $1
  `, [clienteId]);

  const { pagados, vencidos, total, max_atraso } = rows[0];
  let score = 70; // Base

  if (parseInt(total) > 0) {
    const tasaPago = parseInt(pagados) / parseInt(total);
    score = Math.round(
      50 +                         // base
      (tasaPago * 30) +            // historial (+30 si pagó todo)
      (parseInt(vencidos) === 0 ? 10 : 0) +  // sin vencidos (+10)
      (parseInt(max_atraso) === 0 ? 10 : Math.max(0, 10 - parseInt(max_atraso)))
    );
  }

  score = Math.min(100, Math.max(0, score));
  await query('UPDATE clientes SET score = $1 WHERE id = $2', [score, clienteId]);
  return score;
};

module.exports = { listar, obtener, crear, actualizar, recalcularScore };
