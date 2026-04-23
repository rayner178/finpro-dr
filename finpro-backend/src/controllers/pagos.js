// src/controllers/pagos.js
const { query, transaction } = require('../db/pool');
const asyncHandler = require('../middleware/asyncHandler')
const logger = require('../services/logger');
const { generarRecibo } = require('../services/pdf');
const { notificar, MENSAJES } = require('../services/twilio');
const { recalcularScore } = require('./clientes');

// ── LISTAR ──────────────────────────────────────────────────
const listar = asyncHandler(async (req, res) => {
  const { prestamo_id, cobrador_id, fecha_desde, fecha_hasta, pagina = 1, limite = 30 } = req.query;
  const offset = (pagina - 1) * limite;

  let sql = `
    SELECT pg.*, c.nombre AS cliente_nombre, c.cedula,
      u.nombre AS cobrador_nombre, p.tipo_prestamo
    FROM pagos pg
    JOIN prestamos p ON p.id = pg.prestamo_id
    JOIN clientes c ON c.id = pg.cliente_id
    LEFT JOIN usuarios u ON u.id = pg.cobrador_id
    WHERE 1=1
  `;
  const params = [];

  if (prestamo_id) { params.push(prestamo_id); sql += ` AND pg.prestamo_id = $${params.length}`; }
  if (cobrador_id) { params.push(cobrador_id); sql += ` AND pg.cobrador_id = $${params.length}`; }
  if (fecha_desde) { params.push(fecha_desde); sql += ` AND pg.fecha_pago >= $${params.length}`; }
  if (fecha_hasta) { params.push(fecha_hasta); sql += ` AND pg.fecha_pago <= $${params.length}`; }

  if (req.user.rol === 'Cobrador') {
    params.push(req.user.id);
    sql += ` AND pg.cobrador_id = $${params.length}`;
  }

  sql += ` ORDER BY pg.created_at DESC`;

  const countRes = await query(`SELECT COUNT(*) FROM (${sql}) t`, params);
  const dataRes  = await query(`${sql} LIMIT $${params.length+1} OFFSET $${params.length+2}`, [...params, limite, offset]);

  res.json({ total: parseInt(countRes.rows[0].count), pagina: parseInt(pagina), datos: dataRes.rows });
});

// ── REGISTRAR PAGO ──────────────────────────────────────────
const registrar = asyncHandler(async (req, res) => {
  const {
    prestamo_id, monto, tipo_pago = 'cuota',
    metodo_pago = 'efectivo', notas
  } = req.body;

  if (!prestamo_id || !monto) {
    return res.status(400).json({ error: 'Préstamo y monto son requeridos' });
  }

  try {
    // Obtener préstamo con datos del cliente
    const { rows: [prestamo] } = await query(`
      SELECT p.*, c.nombre AS cliente_nombre, c.cedula, c.telefono
      FROM prestamos p JOIN clientes c ON c.id = p.cliente_id
      WHERE p.id = $1
    `, [prestamo_id]);

    if (!prestamo) return res.status(404).json({ error: 'Préstamo no encontrado' });
    if (prestamo.estado === 'pagado') return res.status(400).json({ error: 'Este préstamo ya está completamente pagado' });

    const montoNum = Number(monto);

    await transaction(async (client) => {
      // Número de recibo único
      const { rows: [seq] } = await client.query("SELECT nextval('recibo_seq') AS n");
      const numeroRecibo = `REC-${String(seq.n).padStart(6, '0')}`;

      // Calcular distribución del pago (capital + interés + mora)
      // Obtener cuota más antigua pendiente
      const { rows: [cuotaPendiente] } = await client.query(`
        SELECT * FROM cuotas 
        WHERE prestamo_id = $1 AND estado IN ('pendiente','vencida')
        ORDER BY numero_cuota LIMIT 1
      `, [prestamo_id]);

      let montoCapital = 0, montoInteres = 0, montoCuota = 0, moraPagada = 0;
      let cuotaId = null;

      if (cuotaPendiente) {
        cuotaId = cuotaPendiente.id;
        montoCapital = Math.min(montoNum, Number(cuotaPendiente.capital));
        montoInteres = Math.min(montoNum - montoCapital, Number(cuotaPendiente.interes));
        montoCuota   = montoCapital + montoInteres;
        moraPagada   = Math.max(0, montoNum - montoCuota);
      }

      // Insertar pago
      const { rows: [pago] } = await client.query(`
        INSERT INTO pagos (
          prestamo_id, cliente_id, cuota_id, sucursal_id,
          numero_recibo, monto, monto_capital, monto_interes, monto_mora,
          tipo_pago, metodo_pago, fecha_pago, cobrador_id, notas
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,CURRENT_DATE,$12,$13)
        RETURNING *
      `, [
        prestamo_id, prestamo.cliente_id, cuotaId, req.user.sucursal_id,
        numeroRecibo, montoNum, montoCapital, montoInteres, moraPagada,
        tipo_pago, metodo_pago, req.user.id, notas
      ]);

      // Marcar cuota como pagada
      if (cuotaId) {
        await client.query(
          `UPDATE cuotas SET estado = 'pagada', fecha_pago = CURRENT_DATE WHERE id = $1`,
          [cuotaId]
        );
      }

      // Actualizar saldo del préstamo
      const nuevoSaldo = Math.max(0, Number(prestamo.saldo_pendiente) - montoNum);
      const nuevoEstado = nuevoSaldo <= 0 ? 'pagado' : prestamo.estado;

      await client.query(`
        UPDATE prestamos SET 
          saldo_pendiente = $1, estado = $2,
          dias_atraso = CASE WHEN $2 = 'pagado' THEN 0 ELSE dias_atraso END,
          updated_at = NOW()
        WHERE id = $3
      `, [nuevoSaldo, nuevoEstado, prestamo_id]);

      // Registrar en caja
      await client.query(`
        INSERT INTO caja (sucursal_id, tipo, concepto, monto, referencia_tipo, referencia_id, usuario_id)
        VALUES ($1, 'entrada', $2, $3, 'pago', $4, $5)
      `, [req.user.sucursal_id,
          `Cobro ${numeroRecibo} - ${prestamo.cliente_nombre}`,
          montoNum, pago.id, req.user.id]);

      // Actualizar score del cliente si pagó a tiempo
      try { await recalcularScore(prestamo.cliente_id); } catch {}

      // Enviar confirmación por WhatsApp
      try {
        if (prestamo.telefono) {
          const msg = MENSAJES.pago_confirmado({ nombre: prestamo.cliente_nombre }, { numero_recibo: numeroRecibo, monto: montoNum });
          await notificar({ telefono: prestamo.telefono }, msg, {
            clienteId: prestamo.cliente_id, prestamoId: prestamo_id, motivo: 'pago'
          });
        }
      } catch (notifErr) {
        logger.warn('Notificación de pago no enviada:', notifErr.message);
      }

      logger.info(`Pago registrado: ${numeroRecibo} | ${prestamo.cliente_nombre} | RD$ ${montoNum}`);
      res.status(201).json({
        ...pago,
        cliente_nombre: prestamo.cliente_nombre,
        saldo_restante: nuevoSaldo,
        prestamo_estado: nuevoEstado
      });
    });
  } catch (err) {
    logger.error('Error registrando pago:', err);
    res.status(500).json({ error: 'Error registrando pago: ' + err.message });
  }
});

// ── DESCARGAR RECIBO PDF ────────────────────────────────────
const descargarRecibo = asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const { rows: [pago] } = await query(`
      SELECT pg.*, c.nombre, c.cedula, p.tipo_prestamo, p.saldo_pendiente,
        u.nombre AS cobrador_nombre
      FROM pagos pg
      JOIN clientes c ON c.id = pg.cliente_id
      JOIN prestamos p ON p.id = pg.prestamo_id
      LEFT JOIN usuarios u ON u.id = pg.cobrador_id
      WHERE pg.id = $1
    `, [id]);

    if (!pago) return res.status(404).json({ error: 'Pago no encontrado' });

    const buffer = await generarRecibo({
      pago: { ...pago, cobrador_nombre: pago.cobrador_nombre },
      prestamo: { id: pago.prestamo_id, tipo_prestamo: pago.tipo_prestamo, saldo_pendiente: pago.saldo_pendiente },
      cliente: { nombre: pago.nombre, cedula: pago.cedula }
    });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="recibo-${pago.numero_recibo}.pdf"`);
    res.send(buffer);
  } catch (err) {
    logger.error('Error generando recibo:', err);
    res.status(500).json({ error: 'Error generando recibo PDF' });
  }
});

module.exports = { listar, registrar, descargarRecibo };
