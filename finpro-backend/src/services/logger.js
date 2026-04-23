// src/services/logger.js
const { createLogger, format, transports } = require('winston');
const path = require('path');

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }),
    format.json()
  ),
  transports: [
    // Consola con colores en desarrollo
    new transports.Console({
      format: format.combine(
        format.colorize(),
        format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
          return `${timestamp} [${level}] ${message}${metaStr}`;
        })
      )
    }),
    // Archivos de log en producción
    ...(process.env.NODE_ENV === 'production' ? [
      new transports.File({ filename: 'logs/error.log', level: 'error' }),
      new transports.File({ filename: 'logs/combined.log' }),
    ] : [])
  ]
});

module.exports = logger;
