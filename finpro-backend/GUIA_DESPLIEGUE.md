# FinanPro — Guía Completa de Instalación y Despliegue

## Resumen del proyecto

```
finpro-backend/
├── src/
│   ├── index.js                  ← Servidor Express principal
│   ├── db/
│   │   └── pool.js               ← Conexión PostgreSQL
│   ├── middleware/
│   │   └── auth.js               ← JWT + roles + auditoría
│   ├── controllers/
│   │   ├── auth.js               ← Login, perfil, contraseña
│   │   ├── clientes.js           ← CRUD clientes + score
│   │   ├── prestamos.js          ← Préstamos + amortización
│   │   ├── pagos.js              ← Cobros + recibos PDF
│   │   └── reportes.js           ← Dashboard + reportes SIB
│   ├── routes/
│   │   └── index.js              ← Todas las rutas /api/*
│   └── services/
│       ├── financiero.js         ← TEA, TIR, amortización
│       ├── pdf.js                ← Recibos y contratos PDF
│       ├── twilio.js             ← SMS/WhatsApp mora
│       ├── cron.js               ← Tareas diarias automáticas
│       └── logger.js             ← Winston logging
├── scripts/
│   ├── migrate.js                ← Crear tablas BD
│   └── seed.js                   ← Datos iniciales
├── .env.example                  ← Plantilla de variables
├── railway.toml                  ← Config Railway
├── render.yaml                   ← Config Render
└── Procfile                      ← Start command
```
---

## Parte 1 — Instalación local (desarrollo)

### Requisitos previos

| Herramienta | Versión | Descarga |
|-------------|---------|----------|
| Node.js     | ≥ 18    | https://nodejs.org |
| PostgreSQL   | ≥ 14    | https://postgresql.org |
| Git         | cualquiera | https://git-scm.com |

### Paso 1 — Clonar e instalar dependencias

```bash
cd finpro-backend
npm install
```

### Paso 2 — Configurar variables de entorno

```bash
cp .env.example .env
```

Edita `.env` con tus datos:

```env
DATABASE_URL=postgresql://postgres:tu_password@localhost:5432/finpro_db
JWT_SECRET=un_secreto_largo_y_seguro_minimo_32_caracteres_aqui
NODE_ENV=development
PORT=3001
```

### Paso 3 — Crear la base de datos

```bash
# En PostgreSQL (psql o pgAdmin)
CREATE DATABASE finpro_db;
```

### Paso 4 — Ejecutar migraciones y seed

```bash
# Crear todas las tablas
npm run db:migrate

# Cargar datos iniciales (admin + clientes de ejemplo)
npm run db:seed
```

### Paso 5 — Iniciar el servidor

```bash
# Desarrollo con recarga automática
npm run dev

# Producción
npm start
```

El servidor corre en: **http://localhost:3001**

Prueba que funcione:
```bash
curl http://localhost:3001/api/health
# → {"status":"ok","db":"connected"}
```

---

## Parte 2 — Despliegue en Railway.app (GRATIS)

Railway ofrece $5 USD de crédito mensual gratis — suficiente para una app pequeña.

### Paso 1 — Crear cuenta

Ve a https://railway.app → **Login with GitHub**

### Paso 2 — Nuevo proyecto con base de datos

1. Click **New Project**
2. Click **Deploy from GitHub repo** → conecta tu repositorio
3. En el mismo proyecto, click **+ New** → **Database** → **PostgreSQL**
4. Railway crea la base de datos automáticamente

### Paso 3 — Conectar la base de datos al servicio

1. Ve al servicio de tu app (no la base de datos)
2. Click en **Variables**
3. Click **+ Add** → **Reference Variable**
4. Nombre: `DATABASE_URL` → selecciona la variable `DATABASE_URL` de tu servicio PostgreSQL

### Paso 4 — Agregar las demás variables

En la pestaña **Variables** de tu app agrega:

```
JWT_SECRET          = un_secreto_muy_largo_y_aleatorio_aqui
NODE_ENV            = production
EMPRESA_NOMBRE      = Tu Empresa S.R.L.
EMPRESA_RNC         = 1-23-45678-9
EMPRESA_TELEFONO    = 809-555-0100
TWILIO_ACCOUNT_SID  = ACxxxxxxxx   (opcional)
TWILIO_AUTH_TOKEN   = xxxxxxxx     (opcional)
```

### Paso 5 — Ejecutar migraciones en Railway

En tu proyecto Railway, abre la terminal de la base de datos o usa:

```bash
# Instala Railway CLI
npm install -g @railway/cli
railway login
railway run npm run db:migrate
railway run npm run db:seed
```

### Paso 6 — Obtener tu URL pública

Railway te da una URL automática tipo:
`https://finpro-api-production.up.railway.app`

---

## Parte 3 — Despliegue en Render.com (GRATIS)

Render ofrece plan gratuito con 750 horas/mes.
> ⚠️ El plan gratuito "duerme" tras 15 min de inactividad. Para producción real usa el plan Starter ($7/mes).

### Paso 1 — Crear cuenta

Ve a https://render.com → **Sign up with GitHub**

### Paso 2 — Crear base de datos PostgreSQL

1. **New** → **PostgreSQL**
2. Nombre: `finpro-db`
3. Plan: **Free**
4. Click **Create Database**
5. Guarda el **External Database URL** (lo usarás en el paso 4)

### Paso 3 — Crear Web Service

1. **New** → **Web Service**
2. Conecta tu repositorio GitHub
3. Configuración:
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

### Paso 4 — Variables de entorno

En Environment Variables agrega:

```
DATABASE_URL   = [URL de tu PostgreSQL de Render]
JWT_SECRET     = tu_secreto_aqui
NODE_ENV       = production
EMPRESA_NOMBRE = Tu Empresa S.R.L.
```

### Paso 5 — Ejecutar migraciones

En Render, ve a tu servicio → **Shell** tab:

```bash
npm run db:migrate
npm run db:seed
```

---

## Parte 4 — Conectar el Frontend

En tu frontend React (Vite), crea o edita `.env`:

```env
# Desarrollo local
VITE_API_URL=http://localhost:3001/api

# Producción Railway
VITE_API_URL=https://tu-app.up.railway.app/api

# Producción Render
VITE_API_URL=https://tu-app.onrender.com/api
```

Ejemplo de uso en el frontend:

```javascript
// src/api/cliente.js
const API = import.meta.env.VITE_API_URL;

// Login
export const login = async (usuario, password) => {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ usuario, password })
  });
  const data = await res.json();
  if (data.token) localStorage.setItem('token', data.token);
  return data;
};

// Helper para requests autenticados
export const apiFetch = (path, options = {}) => {
  const token = localStorage.getItem('token');
  return fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...options.headers
    }
  }).then(r => r.json());
};

// Ejemplos de uso
export const getClientes  = ()         => apiFetch('/clientes');
export const crearCliente = (data)     => apiFetch('/clientes', { method: 'POST', body: JSON.stringify(data) });
export const simular      = (data)     => apiFetch('/prestamos/simular', { method: 'POST', body: JSON.stringify(data) });
export const registrarPago= (data)     => apiFetch('/pagos', { method: 'POST', body: JSON.stringify(data) });
export const getDashboard = ()         => apiFetch('/reportes/dashboard');
export const getContrato  = (id)       => `${API}/prestamos/${id}/contrato`;
export const getRecibo    = (id)       => `${API}/pagos/${id}/recibo`;
```

---

## Parte 5 — Configurar Twilio (SMS/WhatsApp)

### Cuenta gratuita de Twilio

1. Ve a https://www.twilio.com/try-twilio
2. Crea una cuenta (te dan ~$15 de crédito gratis)
3. Ve a **Console Dashboard** y copia:
   - **Account SID** → `TWILIO_ACCOUNT_SID`
   - **Auth Token** → `TWILIO_AUTH_TOKEN`

### Para SMS

1. Ve a **Phone Numbers** → **Manage** → **Buy a number**
2. Busca un número con capacidad SMS
3. Copia el número → `TWILIO_PHONE_FROM=+1XXXXXXXXXX`

### Para WhatsApp (Sandbox gratuito)

1. Ve a **Messaging** → **Try it out** → **Send a WhatsApp message**
2. El número del sandbox es: `+1 415 523 8886`
3. Tus clientes deben enviar el código de activación al número para recibir mensajes
4. En producción, debes solicitar aprobación de WhatsApp Business

### Prueba de notificación

```bash
curl -X POST http://localhost:3001/api/mora/notificar-masivo \
  -H "Authorization: Bearer TU_TOKEN" \
  -H "Content-Type: application/json"
```

---

## Parte 6 — Referencia de la API

### Autenticación

```
POST /api/auth/login
Body: { "usuario": "admin", "password": "Admin123!" }
→ { "token": "eyJ...", "usuario": {...} }

GET /api/auth/perfil
Headers: Authorization: Bearer {token}
```

### Clientes

```
GET    /api/clientes?buscar=maria&estado=activo&pagina=1
GET    /api/clientes/:id
POST   /api/clientes       Body: { cedula, nombre, telefono, ... }
PUT    /api/clientes/:id   Body: campos a actualizar
```

### Préstamos

```
POST   /api/prestamos/simular
Body:  { monto_principal, tipo_prestamo, num_cuotas, tasa_mensual }
→ Retorna TEA, cuota, tabla de amortización (SIN guardar)

POST   /api/prestamos
Body:  { cliente_id, monto_principal, tipo_prestamo, num_cuotas, tasa_mensual }
→ Crea préstamo, genera cuotas, registra en caja, notifica cliente

GET    /api/prestamos/:id/contrato   → Descarga PDF del contrato
```

### Pagos

```
POST   /api/pagos
Body:  { prestamo_id, monto, tipo_pago, metodo_pago }
→ Registra pago, actualiza saldo, genera recibo, notifica cliente

GET    /api/pagos/:id/recibo   → Descarga recibo PDF (80mm térmico)
```

### Reportes

```
GET /api/reportes/dashboard         → KPIs en tiempo real
GET /api/reportes/cartera-activa?formato=pdf   → PDF descargable
GET /api/reportes/cartera-vencida?formato=pdf
GET /api/reportes/caja?fecha=2024-12-01
GET /api/reportes/sib?mes=12&anio=2024
GET /api/reportes/auditoria         → Solo Administrador
```

### Mora

```
GET  /api/mora                        → Lista préstamos en mora
POST /api/mora/notificar-masivo       → Envía SMS/WhatsApp a todos
POST /api/mora/bloquear/:clienteId    → Bloquea cliente moroso
```

---

## Parte 7 — Tareas automáticas (Cron Jobs)

El sistema ejecuta automáticamente cada día:

| Hora | Tarea |
|------|-------|
| 6:00 AM | Actualiza días de atraso en todos los préstamos |
| 6:05 AM | Calcula y registra mora acumulada |
| 6:10 AM | Marca clientes como morosos (>7 días) |
| 6:15 AM | Envía SMS/WhatsApp a clientes en mora |
| 9:00 AM | Recordatorios de cuotas que vencen en 2 días |

Zona horaria: `America/Santo_Domingo`

---

## Parte 8 — Seguridad implementada

| Medida | Implementación |
|--------|---------------|
| Contraseñas | bcrypt con salt 12 rounds |
| Tokens | JWT firmados, expiran en 8h |
| Rate limiting | 200 req/15min general, 10 req/15min en login |
| Headers | Helmet.js (XSS, CSRF, etc.) |
| SQL Injection | Queries parametrizadas (pg driver) |
| Auditoría | Todas las acciones quedan en tabla `auditoria` |
| Roles | 4 niveles: Admin > Supervisor > Cobrador > Cajero |
| HTTPS | Manejado por Railway/Render automáticamente |

---

## Credenciales iniciales

```
Usuario:    admin
Password:   Admin123!
Rol:        Administrador
```

> ⚠️ Cambia la contraseña inmediatamente después del primer login usando `PUT /api/auth/cambiar-password`

---

## Soporte y siguiente pasos

Una vez desplegado, los siguientes módulos pueden agregarse en Fase 2:

- **Multi-sucursal completo** — Ya tiene la estructura en BD (`sucursal_id` en todas las tablas)
- **App móvil** — La API REST funciona directamente con React Native o Flutter
- **Backup automático** — Railway/Render hacen backup diario automáticamente
- **Firma digital** — Integrar DocuSign o firma en pantalla táctil en el contrato PDF
- **Integración contable** — Exportar a QuickBooks o sistemas contables locales
