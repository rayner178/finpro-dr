// src/controllers/prestamos.js
const { query, transaction } = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler')
const logger = require('../services/logger');
const financiero = require('../services/financiero');
const { generarContrato } = require('../services/pdf');
const { notificar, MENSAJES } = require('../services/twilio');
const { recalcularScore } = require('./clientes');

// ── LISTAR ──────────────────────────────────────────────────
const listar = asyncHandler(async (req, res) => {
  const { estado, tipo, cliente_id, pagina = 1, limite = 20 } = req.query;
  const offset = (pagina - 1) * limite;

  let sql = `
    SELECT p.*, c.nombre AS cliente_nombre, c.cedula, c.telefono,
      u.nombre AS cobrador_nombre
    FROM prestamos p
    JOIN clientes c ON c.id = p.cliente_id
    LEFT JOIN usuarios u ON u.id = p.cobrador_id
    WHERE 1=1
  `;
  const params = [];

  if (estado) { params.push(estado); sql += ` AND p.estado = $${params.length}`; }
  if (tipo)   { params.push(tipo);   sql += ` AND p.tipo_prestamo = $${params.length}`; }
  if (cliente_id) { params.push(cliente_id); sql += ` AND p.cliente_id = $${params.length}`; }

  if (req.user.rol === 'Cobrador') {
    params.push(req.user.id);
    sql += ` AND p.cobrador_id = $${params.length}`;
  }

  sql += ` ORDER BY p.created_at DESC`;

  const countRes = await query(`SELECT COUNT(*) FROM (${sql}) t`, params);
  const dataRes = await query(
    `${sql} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
    [...params, limite, offset]
  );

  res.json({
    total: parseInt(countRes.rows[0].count),
    pagina: parseInt(pagina),
    datos: dataRes.rows
  });
});

// ── OBTENER ─────────────────────────────────────────────────
const obtener = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { rows } = await query(`
    SELECT p.*, c.nombre AS cliente_nombre, c.cedula, c.telefono, c.direccion,
      u.nombre AS cobrador_nombre,
      ap.nombre AS aprobado_por_nombre
    FROM prestamos p
    JOIN clientes c ON c.id = p.cliente_id
    LEFT JOIN usuarios u  ON u.id  = p.cobrador_id
    LEFT JOIN usuarios ap ON ap.id = p.aprobado_por
    WHERE p.id = $1
  `, [id]);

  if (!rows[0]) return res.status(404).json({ error: 'Préstamo no encontrado' });

  // Tabla de amortización
  const { rows: cuotas } = await query(
    'SELECT * FROM cuotas WHERE prestamo_id = $1 ORDER BY numero_cuota',
    [id]
  );

  res.json({ ...rows[0], tabla_amortizacion: cuotas });
});

// ── SIMULAR (sin guardar) ───────────────────────────────────
const simular = asyncHandler(async (req, res) => {
  const { monto, tipo_prestamo, num_cuotas, tasa_mensual } = req.body;

  if (!monto || !tipo_prestamo || !num_cuotas || !tasa_mensual) {
    return res.status(400).json({ error: 'Todos los campos son requeridos' });
  }

  const resumen = financiero.generarResumenTransparencia(
    Number(monto), Number(tasa_mensual), Number(num_cuotas), tipo_prestamo
  );
  const fechas = financiero.calcularFechas(tipo_prestamo, num_cuotas);
  const tabla = financiero.generarTablaAmortizacion(
    Number(monto), Number(tasa_mensual), Number(num_cuotas),
    fechas.fecha_primer_pago, tipo_prestamo
  );

  res.json({ ...resumen, ...fechas, tabla_amortizacion: tabla });
});

// ── CREAR Y APROBAR ─────────────────────────────────────────
const crear = asyncHandler(async (req, res) => {
  const {
    cliente_id, monto_principal, tipo_prestamo, num_cuotas,
    tasa_mensual, proposito, garantia, cobrador_id
  } = req.body;

  // Validaciones básicas
  if (!cliente_id || !monto_principal || !tipo_prestamo || !num_cuotas || !tasa_mensual) {
    return res.status(400).json({ error: 'Todos los campos obligatorios son requeridos' });
  }

  // Solo Admin y Supervisor pueden aprobar
  if (!['Administrador', 'Supervisor'].includes(req.user.rol)) {
    return res.status(403).json({ error: 'Solo Administrador o Supervisor pueden aprobar préstamos' });
  }

  try {
    // Verificar cliente existe y no está bloqueado
    const { rows: clienteRows } = await query(
      'SELECT * FROM clientes WHERE id = $1', [cliente_id]
    );
    if (!clienteRows[0]) return res.status(404).json({ error: 'Cliente no encontrado' });
    if (clienteRows[0].estado === 'bloqueado') {
      return res.status(400).json({ error: 'Este cliente está bloqueado. Regularice su situación.' });
    }
    const cliente = clienteRows[0];

    // Calcular financiero
    const monto = Number(monto_principal);
    const tasa = Number(tasa_mensual);
    const cuotas = Number(num_cuotas);

    const cuotaMonto = financiero.calcularCuota(monto, tasa, cuotas);
    const tea = financiero.calcularTEA(tasa);
    const montoTotal = Math.round(cuotaMonto * cuotas * 100) / 100;
    const fechas = financiero.calcularFechas(tipo_prestamo, cuotas);
    const tabla = financiero.generarTablaAmortizacion(
      monto, tasa, cuotas, fechas.fecha_primer_pago, tipo_prestamo
    );

    await transaction(async (client) => {
      // Insertar préstamo
      const { rows: [prestamo] } = await client.query(`
        INSERT INTO prestamos (
          cliente_id, sucursal_id, monto_principal, tipo_prestamo, num_cuotas,
          tasa_mensual, tasa_tea, cuota_monto, monto_total, saldo_pendiente,
          estado, fecha_aprobacion, fecha_primer_pago, fecha_vencimiento,
          proposito, garantia, aprobado_por, cobrador_id
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'activo',CURRENT_DATE,$11,$12,$13,$14,$15,$16)
        RETURNING *
      `, [
        cliente_id, req.user.sucursal_id, monto, tipo_prestamo, cuotas,
        tasa, tea, cuotaMonto, montoTotal, montoTotal,
        fechas.fecha_primer_pago, fechas.fecha_vencimiento,
        proposito, garantia, req.user.id, cobrador_id || req.user.id
      ]);

      // Insertar tabla de amortización
      for (const cuota of tabla) {
        await client.query(`
          INSERT INTO cuotas (prestamo_id, numero_cuota, fecha_vence, capital, interes, monto_cuota, saldo_restante)
          VALUES ($1,$2,$3,$4,$5,$6,$7)
        `, [prestamo.id, cuota.numero_cuota, cuota.fecha_vence,
            cuota.capital, cuota.interes, cuota.monto_cuota, cuota.saldo_restante]);
      }

      // Registrar en caja
      await client.query(`
        INSERT INTO caja (sucursal_id, tipo, concepto, monto, referencia_tipo, referencia_id, usuario_id)
        VALUES ($1, 'salida', $2, $3, 'prestamo', $4, $5)
      `, [req.user.sucursal_id, `Desembolso préstamo #${prestamo.id} - ${cliente.nombre}`,
          monto, prestamo.id, req.user.id]);

      // Notificar al cliente
      try {
        if (cliente.telefono) {
          const msg = MENSAJES.aprobacion_prestamo(cliente, prestamo);
          await notificar(cliente, msg, { clienteId: cliente_id, prestamoId: prestamo.id, motivo: 'aprobacion' });
        }
      } catch (notifErr) {
        logger.warn('No se pudo notificar al cliente:', notifErr.message);
      }

      logger.info(`Préstamo #${prestamo.id} creado: ${cliente.nombre} | RD$ ${monto}`);
      res.status(201).json({
        ...prestamo,
        tabla_amortizacion: tabla,
        cliente_nombre: cliente.nombre
      });
    });
  } catch (err) {
    logger.error('Error creando préstamo:', err);
    res.status(500).json({ error: 'Error creando préstamo: ' + err.message });
  }
});

// ── CONTRATO PDF ────────────────────────────────────────────
const descargarContrato = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: [prestamo] } = await query(`
      SELECT p.*, c.nombre AS cliente_nombre, c.cedula, c.telefono, c.direccion
      FROM prestamos p JOIN clientes c ON c.id = p.cliente_id WHERE p.id = $1
    `, [id]);
    if (!prestamo) return res.status(404).json({ error: 'Préstamo no encontrado' });

    const { rows: tabla } = await query(
      'SELECT * FROM cuotas WHERE prestamo_id = $1 ORDER BY numero_cuota', [id]
    );

    const cliente = {
      nombre: prestamo.cliente_nombre,
      cedula: prestamo.cedula,
      direccion: prestamo.direccion
    };

    const buffer = await generarContrato({
      prestamo,
      cliente,
      tablaAmortizacion: tabla,
      resumenTEA: financiero.generarResumenTransparencia(
        prestamo.monto_principal, prestamo.tasa_mensual,
        prestamo.num_cuotas, prestamo.tipo_prestamo
      )
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="contrato-prestamo-${id}.pdf"`);
    res.send(buffer);
  } catch (err) {
    logger.error('Error generando contrato:', err);
    res.status(500).json({ error: 'Error generando contrato PDF' });
  }
});

module.exports = { listar, obtener, simular, crear, descargarContrato };
