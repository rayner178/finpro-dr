// src/services/twilio.js
// Notificaciones SMS y WhatsApp para mora, vencimiento, etc.
const logger = require('./logger');
const { query } = require('../db/pool');

// Inicializar cliente Twilio (solo si están configuradas las credenciales)
let twilioClient = null;
const initTwilio = () => {
  if (twilioClient) return twilioClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token || sid.startsWith('AC') === false) {
    logger.warn('Twilio no configurado. Notificaciones deshabilitadas.');
    return null;
  }
  twilioClient = require('twilio')(sid, token);
  return twilioClient;
};

// ── Plantillas de mensajes ──────────────────────────────────
const MENSAJES = {
  mora: (cliente, prestamo) =>
    `Estimado/a ${cliente.nombre}, FinanPro le informa que su préstamo #${prestamo.id} tiene ${prestamo.dias_atraso} día(s) de atraso. Saldo pendiente: RD$ ${Number(prestamo.saldo_pendiente).toLocaleString('es-DO')}. Por favor regularice su situación. Tel: ${process.env.EMPRESA_TELEFONO}`,

  vencimiento_proximo: (cliente, prestamo, diasFaltantes) =>
    `Recordatorio FinanPro: Su cuota del préstamo #${prestamo.id} vence en ${diasFaltantes} día(s). Monto: RD$ ${Number(prestamo.cuota_monto).toLocaleString('es-DO')}. ¡Evite cargos por mora!`,

  pago_confirmado: (cliente, pago) =>
    `FinanPro confirma su pago. Recibo: ${pago.numero_recibo}. Monto: RD$ ${Number(pago.monto).toLocaleString('es-DO')}. ¡Gracias por pagar a tiempo!`,

  bloqueo: (cliente) =>
    `${cliente.nombre}, su cuenta en FinanPro ha sido bloqueada por mora acumulada. Contáctenos al ${process.env.EMPRESA_TELEFONO} para regularizar.`,

  aprobacion_prestamo: (cliente, prestamo) =>
    `FinanPro: Su préstamo #${prestamo.id} por RD$ ${Number(prestamo.monto_principal).toLocaleString('es-DO')} ha sido APROBADO. Cuota: RD$ ${Number(prestamo.cuota_monto).toLocaleString('es-DO')}. Primer pago: ${new Date(prestamo.fecha_primer_pago).toLocaleDateString('es-DO')}.`,
};

// ── Enviar SMS ──────────────────────────────────────────────
const enviarSMS = async (telefono, mensaje, { clienteId, prestamoId, motivo } = {}) => {
  const client = initTwilio();
  if (!client) {
    logger.info(`[SMS SIMULADO] → ${telefono}: ${mensaje.substring(0, 60)}...`);
    return { sid: 'SIMULADO', status: 'queued' };
  }

  try {
    // Formatear número RD → +1809xxxxxxx
    const numero = formatearTelefono(telefono);
    const message = await client.messages.create({
      body: mensaje,
      from: process.env.TWILIO_PHONE_FROM,
      to: numero
    });

    logger.info(`SMS enviado a ${numero} | SID: ${message.sid}`);
    await guardarNotificacion({ clienteId, prestamoId, tipo: 'sms', motivo, mensaje, sid: message.sid });
    return message;
  } catch (err) {
    logger.error(`Error enviando SMS a ${telefono}: ${err.message}`);
    throw err;
  }
};

// ── Enviar WhatsApp ─────────────────────────────────────────
const enviarWhatsApp = async (telefono, mensaje, { clienteId, prestamoId, motivo } = {}) => {
  const client = initTwilio();
  if (!client) {
    logger.info(`[WHATSAPP SIMULADO] → ${telefono}: ${mensaje.substring(0, 60)}...`);
    return { sid: 'SIMULADO', status: 'queued' };
  }

  try {
    const numero = formatearTelefono(telefono);
    const message = await client.messages.create({
      body: mensaje,
      from: process.env.TWILIO_WHATSAPP_FROM,
      to: `whatsapp:${numero}`
    });

    logger.info(`WhatsApp enviado a ${numero} | SID: ${message.sid}`);
    await guardarNotificacion({ clienteId, prestamoId, tipo: 'whatsapp', motivo, mensaje, sid: message.sid });
    return message;
  } catch (err) {
    logger.error(`Error enviando WhatsApp a ${telefono}: ${err.message}`);
    throw err;
  }
};

// ── Enviar ambos (SMS + WhatsApp) ───────────────────────────
const notificar = async (cliente, mensaje, opciones = {}) => {
  const resultados = [];

  if (cliente.telefono) {
    try {
      const r = await enviarWhatsApp(cliente.telefono, mensaje, opciones);
      resultados.push({ canal: 'whatsapp', ...r });
    } catch {
      // Fallback a SMS si WhatsApp falla
      try {
        const r = await enviarSMS(cliente.telefono, mensaje, opciones);
        resultados.push({ canal: 'sms', ...r });
      } catch (e) {
        logger.error('No se pudo notificar al cliente:', e.message);
      }
    }
  }

  return resultados;
};

// ── Notificaciones masivas de mora (llamado por cron job) ───
const notificarMoraMasiva = async (prestamosEnMora) => {
  logger.info(`Iniciando notificaciones de mora para ${prestamosEnMora.length} préstamos`);
  const resultados = { exitosos: 0, fallidos: 0 };

  for (const p of prestamosEnMora) {
    try {
      // Solo notificar si no se notificó hoy
      const { rows } = await query(`
        SELECT id FROM notificaciones 
        WHERE prestamo_id = $1 AND motivo = 'mora' AND created_at::date = CURRENT_DATE
      `, [p.id]);

      if (rows.length > 0) continue; // Ya fue notificado hoy

      const mensaje = MENSAJES.mora(
        { nombre: p.cliente_nombre },
        { id: p.id, dias_atraso: p.dias_atraso, saldo_pendiente: p.saldo_pendiente, cuota_monto: p.cuota_monto }
      );

      await notificar(
        { telefono: p.telefono },
        mensaje,
        { clienteId: p.cliente_id, prestamoId: p.id, motivo: 'mora' }
      );

      resultados.exitosos++;
      // Pequeña pausa para no saturar Twilio
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      resultados.fallidos++;
      logger.error(`Error notificando préstamo #${p.id}:`, err.message);
    }
  }

  logger.info(`Notificaciones mora: ${resultados.exitosos} exitosas, ${resultados.fallidos} fallidas`);
  return resultados;
};

// ── Helpers ─────────────────────────────────────────────────
const formatearTelefono = (tel) => {
  // Limpiar caracteres no numéricos
  const limpio = tel.replace(/\D/g, '');
  // Si empieza con 1, ya tiene código de país
  if (limpio.startsWith('1') && limpio.length === 11) return `+${limpio}`;
  // Números RD sin código de país (8 o 10 dígitos)
  if (limpio.length === 10) return `+1${limpio}`;
  if (limpio.length === 7) return `+1809${limpio}`;
  return `+${limpio}`;
};

const guardarNotificacion = async ({ clienteId, prestamoId, tipo, motivo, mensaje, sid }) => {
  try {
    await query(`
      INSERT INTO notificaciones (cliente_id, prestamo_id, tipo, motivo, mensaje, twilio_sid)
      VALUES ($1, $2, $3, $4, $5, $6)
    `, [clienteId, prestamoId, tipo, motivo, mensaje, sid]);
  } catch (err) {
    logger.error('Error guardando notificación en BD:', err.message);
  }
};

module.exports = {
  enviarSMS,
  enviarWhatsApp,
  notificar,
  notificarMoraMasiva,
  MENSAJES
};
