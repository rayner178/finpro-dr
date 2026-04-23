// scripts/migrate.js
// Crea todas las tablas del sistema
require('dotenv').config();
const { pool } = require('../src/db/pool');

const migrations = `

-- ─────────────────────────────────────────────────────────
--  EXTENSIONES
-- ─────────────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ─────────────────────────────────────────────────────────
--  SUCURSALES
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sucursales (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  direccion   TEXT,
  telefono    VARCHAR(20),
  activo      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT NOW()
);

INSERT INTO sucursales (nombre, direccion) 
VALUES ('Principal', 'Sede Central')
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────
--  USUARIOS Y AUTENTICACIÓN
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id              SERIAL PRIMARY KEY,
  nombre          VARCHAR(150) NOT NULL,
  usuario         VARCHAR(50) UNIQUE NOT NULL,
  email           VARCHAR(150) UNIQUE NOT NULL,
  password_hash   TEXT NOT NULL,
  rol             VARCHAR(30) NOT NULL CHECK (rol IN ('Administrador','Supervisor','Cobrador','Cajero')),
  sucursal_id     INTEGER REFERENCES sucursales(id) DEFAULT 1,
  activo          BOOLEAN DEFAULT TRUE,
  ultimo_login    TIMESTAMP,
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
--  LOG DE AUDITORÍA
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS auditoria (
  id          BIGSERIAL PRIMARY KEY,
  usuario_id  INTEGER REFERENCES usuarios(id),
  accion      VARCHAR(100) NOT NULL,
  tabla       VARCHAR(50),
  registro_id INTEGER,
  detalle     JSONB,
  ip          VARCHAR(45),
  created_at  TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
--  CLIENTES
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS clientes (
  id              SERIAL PRIMARY KEY,
  cedula          VARCHAR(20) UNIQUE NOT NULL,
  nombre          VARCHAR(150) NOT NULL,
  telefono        VARCHAR(20),
  telefono2       VARCHAR(20),
  email           VARCHAR(150),
  direccion       TEXT,
  fecha_nac       DATE,
  ocupacion       VARCHAR(100),
  ingresos_mensual NUMERIC(12,2),
  foto_path       VARCHAR(255),
  estado          VARCHAR(20) DEFAULT 'activo' 
                  CHECK (estado IN ('activo','moroso','bloqueado','inactivo')),
  score           INTEGER DEFAULT 70 CHECK (score BETWEEN 0 AND 100),
  referencias     TEXT,
  notas           TEXT,
  sucursal_id     INTEGER REFERENCES sucursales(id) DEFAULT 1,
  created_by      INTEGER REFERENCES usuarios(id),
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
--  CONFIGURACIÓN DE TASAS (por tipo de préstamo)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS configuracion_tasas (
  id              SERIAL PRIMARY KEY,
  tipo_prestamo   VARCHAR(20) NOT NULL CHECK (tipo_prestamo IN ('diario','semanal','quincenal','mensual')),
  tasa_mensual_min  NUMERIC(5,2) DEFAULT 5.00,
  tasa_mensual_max  NUMERIC(5,2) DEFAULT 15.00,
  tasa_mora_diaria  NUMERIC(6,4) DEFAULT 0.30,
  dias_gracia       INTEGER DEFAULT 1,
  monto_min         NUMERIC(12,2) DEFAULT 500.00,
  monto_max         NUMERIC(12,2) DEFAULT 500000.00,
  activo            BOOLEAN DEFAULT TRUE,
  updated_at        TIMESTAMP DEFAULT NOW()
);

INSERT INTO configuracion_tasas (tipo_prestamo, tasa_mensual_min, tasa_mensual_max, monto_min, monto_max)
VALUES
  ('diario',    8.00, 15.00,   500.00,  50000.00),
  ('semanal',   6.00, 12.00,  1000.00, 100000.00),
  ('quincenal', 5.00, 10.00,  2000.00, 200000.00),
  ('mensual',   3.00,  8.00,  5000.00, 500000.00)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────
--  PRÉSTAMOS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS prestamos (
  id                SERIAL PRIMARY KEY,
  cliente_id        INTEGER NOT NULL REFERENCES clientes(id),
  sucursal_id       INTEGER REFERENCES sucursales(id) DEFAULT 1,
  monto_principal   NUMERIC(12,2) NOT NULL,
  tipo_prestamo     VARCHAR(20) NOT NULL CHECK (tipo_prestamo IN ('diario','semanal','quincenal','mensual')),
  num_cuotas        INTEGER NOT NULL,
  tasa_mensual      NUMERIC(5,2) NOT NULL,
  tasa_tea          NUMERIC(7,2) NOT NULL,       -- TEA calculada al crear
  cuota_monto       NUMERIC(12,2) NOT NULL,
  monto_total       NUMERIC(12,2) NOT NULL,      -- capital + intereses totales
  saldo_pendiente   NUMERIC(12,2) NOT NULL,
  estado            VARCHAR(20) DEFAULT 'activo' 
                    CHECK (estado IN ('pendiente','activo','pagado','vencido','cancelado')),
  fecha_aprobacion  DATE DEFAULT CURRENT_DATE,
  fecha_primer_pago DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  proposito         TEXT,
  garantia          TEXT,
  aprobado_por      INTEGER REFERENCES usuarios(id),
  cobrador_id       INTEGER REFERENCES usuarios(id),
  dias_atraso       INTEGER DEFAULT 0,
  total_mora        NUMERIC(12,2) DEFAULT 0,
  contrato_path     VARCHAR(255),
  notas             TEXT,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
--  TABLA DE AMORTIZACIÓN (cuotas programadas)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS cuotas (
  id              BIGSERIAL PRIMARY KEY,
  prestamo_id     INTEGER NOT NULL REFERENCES prestamos(id) ON DELETE CASCADE,
  numero_cuota    INTEGER NOT NULL,
  fecha_vence     DATE NOT NULL,
  capital         NUMERIC(12,2) NOT NULL,
  interes         NUMERIC(12,2) NOT NULL,
  monto_cuota     NUMERIC(12,2) NOT NULL,       -- capital + interes
  mora_acumulada  NUMERIC(12,2) DEFAULT 0,
  saldo_restante  NUMERIC(12,2) NOT NULL,
  estado          VARCHAR(20) DEFAULT 'pendiente'
                  CHECK (estado IN ('pendiente','pagada','vencida','parcial')),
  fecha_pago      DATE,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
--  PAGOS / COBROS
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pagos (
  id              BIGSERIAL PRIMARY KEY,
  prestamo_id     INTEGER NOT NULL REFERENCES prestamos(id),
  cliente_id      INTEGER NOT NULL REFERENCES clientes(id),
  cuota_id        BIGINT REFERENCES cuotas(id),
  sucursal_id     INTEGER REFERENCES sucursales(id) DEFAULT 1,
  numero_recibo   VARCHAR(30) UNIQUE NOT NULL,
  monto           NUMERIC(12,2) NOT NULL,
  monto_capital   NUMERIC(12,2) DEFAULT 0,
  monto_interes   NUMERIC(12,2) DEFAULT 0,
  monto_mora      NUMERIC(12,2) DEFAULT 0,
  tipo_pago       VARCHAR(30) DEFAULT 'cuota'
                  CHECK (tipo_pago IN ('cuota','abono','cancelacion','mora')),
  metodo_pago     VARCHAR(30) DEFAULT 'efectivo'
                  CHECK (metodo_pago IN ('efectivo','transferencia','cheque','tarjeta')),
  fecha_pago      DATE DEFAULT CURRENT_DATE,
  cobrador_id     INTEGER REFERENCES usuarios(id),
  recibo_path     VARCHAR(255),
  notas           TEXT,
  created_at      TIMESTAMP DEFAULT NOW()
);

-- Secuencia para número de recibo
CREATE SEQUENCE IF NOT EXISTS recibo_seq START 1000;

-- ─────────────────────────────────────────────────────────
--  CAJA DIARIA
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS caja (
  id              BIGSERIAL PRIMARY KEY,
  sucursal_id     INTEGER REFERENCES sucursales(id) DEFAULT 1,
  tipo            VARCHAR(10) NOT NULL CHECK (tipo IN ('entrada','salida')),
  concepto        TEXT NOT NULL,
  monto           NUMERIC(12,2) NOT NULL,
  referencia_tipo VARCHAR(30),   -- 'pago', 'prestamo', 'gasto', etc.
  referencia_id   INTEGER,
  fecha           DATE DEFAULT CURRENT_DATE,
  usuario_id      INTEGER REFERENCES usuarios(id),
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
--  NOTIFICACIONES (historial de SMS/WhatsApp)
-- ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notificaciones (
  id              BIGSERIAL PRIMARY KEY,
  cliente_id      INTEGER REFERENCES clientes(id),
  prestamo_id     INTEGER REFERENCES prestamos(id),
  tipo            VARCHAR(20) CHECK (tipo IN ('sms','whatsapp','email')),
  motivo          VARCHAR(50),   -- 'mora', 'vencimiento', 'pago', etc.
  mensaje         TEXT,
  estado          VARCHAR(20) DEFAULT 'enviado',
  twilio_sid      VARCHAR(100),
  created_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────
--  ÍNDICES para performance
-- ─────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_clientes_cedula     ON clientes(cedula);
CREATE INDEX IF NOT EXISTS idx_clientes_estado     ON clientes(estado);
CREATE INDEX IF NOT EXISTS idx_prestamos_cliente   ON prestamos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_estado    ON prestamos(estado);
CREATE INDEX IF NOT EXISTS idx_pagos_prestamo      ON pagos(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha         ON pagos(fecha_pago);
CREATE INDEX IF NOT EXISTS idx_cuotas_prestamo     ON cuotas(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_vence        ON cuotas(fecha_vence);
CREATE INDEX IF NOT EXISTS idx_caja_fecha          ON caja(fecha);
CREATE INDEX IF NOT EXISTS idx_auditoria_usuario   ON auditoria(usuario_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_created   ON auditoria(created_at);

-- ─────────────────────────────────────────────────────────
--  TRIGGER: updated_at automático
-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_usuarios_upd  BEFORE UPDATE ON usuarios  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER trg_clientes_upd  BEFORE UPDATE ON clientes  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
  CREATE TRIGGER trg_prestamos_upd BEFORE UPDATE ON prestamos FOR EACH ROW EXECUTE FUNCTION update_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
`;

async function migrate() {
  console.log('🚀 Iniciando migraciones...');
  try {
    await pool.query(migrations);
    console.log('✅ Todas las tablas creadas correctamente');
  } catch (err) {
    console.error('❌ Error en migración:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

migrate();
