// src/services/cron.js
// Tareas programadas diarias:
// 1. Actualizar días de atraso y mora en préstamos
// 2. Marcar cuotas vencidas
// 3. Enviar notificaciones de mora por SMS/WhatsApp
// 4. Actualizar score de clientes morosos

const cron = require('node-cron');
const { query, transaction } = require('../db/pool');
const { notificarMoraMasiva, MENSAJES, notificar } = require('./twilio');
const logger = require('./logger');

// ── Tarea 1: Actualizar mora (cada día a las 7 AM) ──────────
const actualizarMora = async () => {
  logger.info('🕐 Iniciando actualización diaria de mora...');
  try {
    await transaction(async (client) => {

      // 1. Marcar cuotas como vencidas
      const cuotasVencidas = await client.query(`
        UPDATE cuotas
        SET estado = 'vencida'
        WHERE estado = 'pendiente'
          AND fecha_vence < CURRENT_DATE
        RETURNING id, prestamo_id
      `);
      logger.info(`  ✓ ${cuotasVencidas.rowCount} cuotas marcadas como vencidas`);

      // 2. Calcular días de atraso por préstamo
      const { rows: prestamos } = await client.query(`
        SELECT 
          p.id,
          p.cliente_id,
          p.tasa_mensual,
          p.saldo_pendiente,
          COALESCE(
            (SELECT GREATEST(0, CURRENT_DATE - MIN(c.fecha_vence))
             FROM cuotas c 
             WHERE c.prestamo_id = p.id AND c.estado = 'vencida'),
            0
          ) AS dias_atraso
        FROM prestamos p
        WHERE p.estado = 'activo'
      `);

      const tasaMora = parseFloat(process.env.MORA_TASA_DIARIA || 0.003);

      for (const p of prestamos) {
        const diasAtraso = parseInt(p.dias_atraso) || 0;
        const moraTotal = diasAtraso > 0
          ? Number(p.saldo_pendiente) * tasaMora * diasAtraso
          : 0;

        await client.query(`
          UPDATE prestamos 
          SET dias_atraso = $1, 
              total_mora = $2,
              estado = CASE WHEN $1 > 60 THEN 'vencido' ELSE estado END,
              updated_at = NOW()
          WHERE id = $3
        `, [diasAtraso, moraTotal.toFixed(2), p.id]);
      }

      // 3. Actualizar estado de cliente a 'moroso' si tiene préstamos con >7 días
      await client.query(`
        UPDATE clientes SET estado = 'moroso'
        WHERE id IN (
          SELECT DISTINCT cliente_id FROM prestamos 
          WHERE dias_atraso > 7 AND estado = 'activo'
        ) AND estado = 'activo'
      `);

      logger.info(`  ✓ Mora actualizada para ${prestamos.length} préstamos`);
    });
  } catch (err) {
    logger.error('Error actualizando mora:', err.message);
  }
};

// ── Tarea 2: Notificaciones de mora ────────────────────────
const enviarNotificacionesMora = async () => {
  try {
    const { rows } = await query(`
      SELECT 
        p.id, p.cliente_id, p.dias_atraso, p.saldo_pendiente, p.cuota_monto,
        c.nombre AS cliente_nombre, c.telefono
      FROM prestamos p
      JOIN clientes c ON c.id = p.cliente_id
      WHERE p.dias_atraso > 0 AND p.estado IN ('activo', 'vencido')
        AND c.telefono IS NOT NULL
      ORDER BY p.dias_atraso DESC
    `);

    if (rows.length > 0) {
      await notificarMoraMasiva(rows);
    }
  } catch (err) {
    logger.error('Error en notificaciones de mora:', err.message);
  }
};

// ── Tarea 3: Recordatorio de vencimiento (2 días antes) ────
const enviarRecordatoriosVencimiento = async () => {
  try {
    const { rows } = await query(`
      SELECT 
        cu.id AS cuota_id, cu.fecha_vence, cu.monto_cuota,
        p.id AS prestamo_id, p.cliente_id,
        c.nombre, c.telefono
      FROM cuotas cu
      JOIN prestamos p ON p.id = cu.prestamo_id
      JOIN clientes c ON c.id = p.cliente_id
      WHERE cu.estado = 'pendiente'
        AND cu.fecha_vence = CURRENT_DATE + INTERVAL '2 days'
        AND c.telefono IS NOT NULL
    `);

    for (const r of rows) {
      const mensaje = MENSAJES.vencimiento_proximo(
        { nombre: r.nombre },
        { id: r.prestamo_id, cuota_monto: r.monto_cuota },
        2
      );
      await notificar({ telefono: r.telefono }, mensaje, {
        clienteId: r.cliente_id,
        prestamoId: r.prestamo_id,
        motivo: 'vencimiento_proximo'
      });
    }

    logger.info(`  ✓ ${rows.length} recordatorios de vencimiento enviados`);
  } catch (err) {
    logger.error('Error en recordatorios de vencimiento:', err.message);
  }
};

// ── Iniciar todos los cron jobs ─────────────────────────────
const iniciarCronJobs = () => {
  // Actualizar mora: cada día a las 6:00 AM
  cron.schedule('0 6 * * *', async () => {
    logger.info('⏰ CRON: Actualización diaria de mora');
    await actualizarMora();
    await enviarNotificacionesMora();
  }, { timezone: 'America/Santo_Domingo' });

  // Recordatorios de vencimiento: cada día a las 9:00 AM
  cron.schedule('0 9 * * *', async () => {
    logger.info('⏰ CRON: Recordatorios de vencimiento');
    await enviarRecordatoriosVencimiento();
  }, { timezone: 'America/Santo_Domingo' });

  logger.info('✅ Cron jobs iniciados (zona horaria: America/Santo_Domingo)');
};

module.exports = { iniciarCronJobs, actualizarMora };
