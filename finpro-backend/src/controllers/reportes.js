// src/controllers/reportes.js
const { query }    = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler');
const { generarReporteCartera } = require('../services/pdf');
const logger = require('../services/logger');

// ── DASHBOARD / KPIs ────────────────────────────────────────
const dashboard = asyncHandler(async (req, res) => {
  try {
    const [carteras, mora, caja, clientes, tiposDist] = await Promise.all([
      // Cartera total
      query(`
        SELECT
          SUM(monto_principal) AS total_prestado,
          SUM(saldo_pendiente) AS total_por_cobrar,
          SUM(CASE WHEN estado='activo' THEN saldo_pendiente ELSE 0 END) AS cartera_activa,
          SUM(CASE WHEN estado='vencido' THEN saldo_pendiente ELSE 0 END) AS cartera_vencida,
          COUNT(*) AS total_prestamos,
          COUNT(CASE WHEN estado='activo' THEN 1 END) AS prestamos_activos,
          COUNT(CASE WHEN estado='vencido' THEN 1 END) AS prestamos_vencidos,
          COUNT(CASE WHEN estado='pagado' THEN 1 END) AS prestamos_pagados
        FROM prestamos
      `),
      // Mora
      query(`
        SELECT
          COUNT(CASE WHEN dias_atraso > 0 THEN 1 END) AS en_mora,
          COUNT(CASE WHEN dias_atraso BETWEEN 1 AND 7 THEN 1 END) AS mora_1_7,
          COUNT(CASE WHEN dias_atraso BETWEEN 8 AND 30 THEN 1 END) AS mora_8_30,
          COUNT(CASE WHEN dias_atraso > 30 THEN 1 END) AS mora_mas_30,
          SUM(total_mora) AS mora_total_acumulada
        FROM prestamos WHERE estado IN ('activo','vencido')
      `),
      // Caja del día
      query(`
        SELECT
          SUM(CASE WHEN tipo='entrada' THEN monto ELSE 0 END) AS entradas_hoy,
          SUM(CASE WHEN tipo='salida' THEN monto ELSE 0 END) AS salidas_hoy,
          SUM(CASE WHEN tipo='entrada' THEN monto ELSE -monto END) AS saldo_hoy
        FROM caja WHERE fecha = CURRENT_DATE
      `),
      // Clientes
      query(`
        SELECT
          COUNT(*) AS total,
          COUNT(CASE WHEN estado='activo' THEN 1 END) AS activos,
          COUNT(CASE WHEN estado='moroso' THEN 1 END) AS morosos,
          COUNT(CASE WHEN estado='bloqueado' THEN 1 END) AS bloqueados
        FROM clientes
      `),
      // Distribución por tipo
      query(`
        SELECT tipo_prestamo, COUNT(*) AS cantidad, SUM(saldo_pendiente) AS saldo
        FROM prestamos WHERE estado='activo'
        GROUP BY tipo_prestamo
      `)
    ]);

    const cartera = carteras.rows[0];
    const moraData = mora.rows[0];
    const totalActivos = parseInt(cartera.prestamos_activos) + parseInt(cartera.prestamos_vencidos);
    const tasaMorosidad = totalActivos > 0
      ? ((parseInt(moraData.en_mora) / totalActivos) * 100).toFixed(1)
      : '0.0';

    res.json({
      cartera: cartera,
      mora: { ...moraData, tasa_morosidad: tasaMorosidad },
      caja: caja.rows[0],
      clientes: clientes.rows[0],
      distribucion_tipo: tiposDist.rows,
      generado_en: new Date().toISOString()
    });
  } catch (err) {
    logger.error('Error generando dashboard:', err);
    res.status(500).json({ error: 'Error obteniendo dashboard' });
  }
});

// ── REPORTE: CARTERA ACTIVA ─────────────────────────────────
const carteraActiva = asyncHandler(async (req, res) => {
  const { formato = 'json' } = req.query;
  const { rows } = await query(`
    SELECT p.*, c.nombre AS cliente_nombre, c.cedula, c.telefono,
      u.nombre AS cobrador_nombre
    FROM prestamos p
    JOIN clientes c ON c.id = p.cliente_id
    LEFT JOIN usuarios u ON u.id = p.cobrador_id
    WHERE p.estado = 'activo'
    ORDER BY p.dias_atraso DESC, p.created_at DESC
  `);

  if (formato === 'pdf') {
    const buffer = await generarReporteCartera(rows, 'activa');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cartera-activa-${new Date().toISOString().split('T')[0]}.pdf"`);
    return res.send(buffer);
  }

  res.json({ total: rows.length, datos: rows });
});

// ── REPORTE: CARTERA VENCIDA ────────────────────────────────
const carteraVencida = asyncHandler(async (req, res) => {
  const { formato = 'json' } = req.query;
  const { rows } = await query(`
    SELECT p.*, c.nombre AS cliente_nombre, c.cedula, c.telefono,
      u.nombre AS cobrador_nombre
    FROM prestamos p
    JOIN clientes c ON c.id = p.cliente_id
    LEFT JOIN usuarios u ON u.id = p.cobrador_id
    WHERE p.estado IN ('vencido','activo') AND p.dias_atraso > 0
    ORDER BY p.dias_atraso DESC
  `);

  if (formato === 'pdf') {
    const buffer = await generarReporteCartera(rows, 'vencida');
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="cartera-vencida-${new Date().toISOString().split('T')[0]}.pdf"`);
    return res.send(buffer);
  }

  res.json({ total: rows.length, datos: rows });
});

// ── REPORTE: CAJA DIARIA ────────────────────────────────────
const reporteCaja = asyncHandler(async (req, res) => {
  const { fecha = new Date().toISOString().split('T')[0], sucursal_id } = req.query;
  const params = [fecha];
  let sql = `
    SELECT cj.*, u.nombre AS usuario_nombre
    FROM caja cj
    LEFT JOIN usuarios u ON u.id = cj.usuario_id
    WHERE cj.fecha = $1
  `;

  if (sucursal_id) { params.push(sucursal_id); sql += ` AND cj.sucursal_id = $${params.length}`; }
  sql += ' ORDER BY cj.created_at DESC';

  const [movimientos, resumen] = await Promise.all([
    query(sql, params),
    query(`
      SELECT
        SUM(CASE WHEN tipo='entrada' THEN monto ELSE 0 END) AS total_entradas,
        SUM(CASE WHEN tipo='salida' THEN monto ELSE 0 END) AS total_salidas,
        SUM(CASE WHEN tipo='entrada' THEN monto ELSE -monto END) AS saldo_neto,
        COUNT(*) AS total_movimientos
      FROM caja WHERE fecha = $1
    `, [fecha])
  ]);

  res.json({
    fecha,
    resumen: resumen.rows[0],
    movimientos: movimientos.rows
  });
});

// ── REPORTE SIB (Superintendencia de Bancos RD) ─────────────
const reporteSIB = asyncHandler(async (req, res) => {
  const { mes, anio } = req.query;
  const mesNum = mes || (new Date().getMonth() + 1);
  const anioNum = anio || new Date().getFullYear();

  try {
    const [cartera, pagos, clientes] = await Promise.all([
      query(`
        SELECT
          tipo_prestamo,
          COUNT(*) AS cantidad,
          SUM(monto_principal) AS monto_otorgado,
          SUM(saldo_pendiente) AS saldo_vigente,
          SUM(CASE WHEN dias_atraso > 0 THEN saldo_pendiente ELSE 0 END) AS saldo_mora,
          AVG(tasa_mensual) AS tasa_promedio,
          AVG(tasa_tea) AS tea_promedio
        FROM prestamos
        WHERE EXTRACT(MONTH FROM fecha_aprobacion) = $1
          AND EXTRACT(YEAR FROM fecha_aprobacion) = $2
        GROUP BY tipo_prestamo
      `, [mesNum, anioNum]),
      query(`
        SELECT
          COUNT(*) AS total_pagos,
          SUM(monto) AS total_cobrado,
          SUM(monto_mora) AS mora_cobrada
        FROM pagos
        WHERE EXTRACT(MONTH FROM fecha_pago) = $1
          AND EXTRACT(YEAR FROM fecha_pago) = $2
      `, [mesNum, anioNum]),
      query(`
        SELECT COUNT(*) AS nuevos_clientes
        FROM clientes
        WHERE EXTRACT(MONTH FROM created_at) = $1
          AND EXTRACT(YEAR FROM created_at) = $2
      `, [mesNum, anioNum])
    ]);

    res.json({
      periodo: `${String(mesNum).padStart(2,'0')}/${anioNum}`,
      cartera_por_tipo: cartera.rows,
      cobros_periodo: pagos.rows[0],
      nuevos_clientes: clientes.rows[0],
      generado_en: new Date().toISOString(),
      nota: 'Reporte preparado según formato SIB - Superintendencia de Bancos de la República Dominicana'
    });
  } catch (err) {
    logger.error('Error generando reporte SIB:', err);
    res.status(500).json({ error: 'Error generando reporte SIB' });
  }
});

// ── AUDITORÍA ───────────────────────────────────────────────
const auditoria = asyncHandler(async (req, res) => {
  // Solo Administrador
  const { pagina = 1, limite = 50 } = req.query;
  const offset = (pagina - 1) * limite;

  const { rows } = await query(`
    SELECT a.*, u.nombre AS usuario_nombre, u.rol
    FROM auditoria a
    LEFT JOIN usuarios u ON u.id = a.usuario_id
    ORDER BY a.created_at DESC
    LIMIT $1 OFFSET $2
  `, [limite, offset]);

  res.json({ pagina: parseInt(pagina), datos: rows });
});

module.exports = { dashboard, carteraActiva: carteraActiva, carteraVencida, reporteCaja, reporteSIB, auditoria };
