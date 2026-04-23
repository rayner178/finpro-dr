// src/db/pool.js
// Conexión a PostgreSQL con pg Pool
const { Pool } = require('pg');
const logger = require('../services/logger');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // En producción (Railway/Render) con SSL:
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

pool.on('connect', () => {
  logger.info('Nueva conexión establecida con PostgreSQL');
});

pool.on('error', (err) => {
  logger.error('Error inesperado en el pool de PostgreSQL:', err);
});

// Helper: ejecutar queries con logging automático
const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    if (process.env.NODE_ENV === 'development') {
      logger.debug(`Query ejecutada en ${duration}ms: ${text.substring(0, 80)}`);
    }
    return res;
  } catch (err) {
    logger.error(`Error en query: ${err.message}\nSQL: ${text}`);
    throw err;
  }
};

// Helper: transacciones
const transaction = async (callback) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

module.exports = { pool, query, transaction };
