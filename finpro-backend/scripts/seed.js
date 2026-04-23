// scripts/seed.js
// Datos iniciales: usuario admin + clientes y préstamos de ejemplo
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { pool } = require('../src/db/pool');

async function seed() {
  console.log('🌱 Cargando datos iniciales...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // ── USUARIO ADMINISTRADOR ──────────────────────────────
    const hash = await bcrypt.hash('Admin123!', 12);
    await client.query(`
      INSERT INTO usuarios (nombre, usuario, email, password_hash, rol, sucursal_id)
      VALUES
        ('Administrador Principal', 'admin',   'admin@finpro.com',    $1, 'Administrador', 1),
        ('Luis Vargas',             'lvargas', 'lvargas@finpro.com',  $1, 'Cobrador',       1),
        ('Ana Torres',              'atorres', 'atorres@finpro.com',  $1, 'Cajero',         1),
        ('Roberto Díaz',            'rdiaz',   'rdiaz@finpro.com',   $1, 'Supervisor',     1)
      ON CONFLICT (usuario) DO NOTHING
    `, [hash]);
    console.log('  ✓ Usuarios creados (contraseña: Admin123!)');

    // ── CLIENTES DE EJEMPLO ────────────────────────────────
    const clientes = await client.query(`
      INSERT INTO clientes (cedula, nombre, telefono, email, direccion, score, estado, referencias)
      VALUES
        ('001-1234567-8', 'María González',  '809-555-0101', 'maria@email.com',  'Calle 5 #23, SDO',        85, 'activo',  'Pedro González 809-555-0201'),
        ('002-9876543-2', 'Carlos Méndez',   '809-555-0102', 'carlos@email.com', 'Av. 27 de Feb #45, SDO',  72, 'activo',  'Ana Méndez 809-555-0302'),
        ('003-4567890-1', 'Rosa Familia',    '809-555-0103', 'rosa@email.com',   'Los Jardines #12, SDO',   60, 'moroso',  'Luis Familia 809-555-0403'),
        ('004-3210987-5', 'Juan Pérez',      '809-555-0104', 'juan@email.com',   'Villa Consuelo #8, SDO',  90, 'activo',  'Sara Pérez 809-555-0504')
      ON CONFLICT (cedula) DO NOTHING
      RETURNING id, nombre
    `);
    console.log(`  ✓ ${clientes.rowCount} clientes creados`);

    await client.query('COMMIT');
    console.log('✅ Datos iniciales cargados exitosamente');
    console.log('\n📋 Credenciales de acceso:');
    console.log('   URL:      http://localhost:3001/api');
    console.log('   Usuario:  admin');
    console.log('   Password: Admin123!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Error en seed:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

seed();
