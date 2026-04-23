// src/api/client.js
// Capa única de comunicación con el backend
// Maneja token JWT, errores globales y logout automático

const BASE = import.meta.env.VITE_API_URL || '/api'

// ── Core fetch wrapper ─────────────────────────────────────
async function apiFetch(path, options = {}) {
  const token = localStorage.getItem('fp_token')
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE}${path}`, { ...options, headers })

  // Token expirado → logout automático
  if (res.status === 401) {
    localStorage.removeItem('fp_token')
    localStorage.removeItem('fp_user')
    window.dispatchEvent(new Event('fp:logout'))
    throw new Error('Sesión expirada. Por favor inicia sesión de nuevo.')
  }

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new Error(data.error || `Error ${res.status}`)
  }
  return data
}

const get    = (path, params) => {
  const qs = params ? '?' + new URLSearchParams(params).toString() : ''
  return apiFetch(path + qs)
}
const post   = (path, body)  => apiFetch(path, { method: 'POST',   body: JSON.stringify(body) })
const put    = (path, body)  => apiFetch(path, { method: 'PUT',    body: JSON.stringify(body) })
const del    = (path)        => apiFetch(path, { method: 'DELETE' })

// URL para abrir PDF en nueva pestaña (necesita token en query string)
const pdfUrl = (path) => {
  const token = localStorage.getItem('fp_token')
  return `${BASE}${path}?token=${token}`
}

// ── AUTH ────────────────────────────────────────────────────
export const auth = {
  login: (usuario, password) => post('/auth/login', { usuario, password }),
  perfil: () => get('/auth/perfil'),
  cambiarPassword: (data) => put('/auth/cambiar-password', data),
}

// ── CLIENTES ────────────────────────────────────────────────
export const clientes = {
  listar:     (params) => get('/clientes', params),
  obtener:    (id)     => get(`/clientes/${id}`),
  crear:      (data)   => post('/clientes', data),
  actualizar: (id, data) => put(`/clientes/${id}`, data),
}

// ── PRÉSTAMOS ────────────────────────────────────────────────
export const prestamos = {
  listar:          (params) => get('/prestamos', params),
  obtener:         (id)     => get(`/prestamos/${id}`),
  simular:         (data)   => post('/prestamos/simular', data),
  crear:           (data)   => post('/prestamos', data),
  contratoUrl:     (id)     => `${BASE}/prestamos/${id}/contrato?_t=${localStorage.getItem('fp_token')}`,
}

// ── PAGOS ────────────────────────────────────────────────────
export const pagos = {
  listar:       (params) => get('/pagos', params),
  registrar:    (data)   => post('/pagos', data),
  reciboUrl:    (id)     => `${BASE}/pagos/${id}/recibo?_t=${localStorage.getItem('fp_token')}`,
}

// ── CAJA ─────────────────────────────────────────────────────
export const caja = {
  listar:    (params) => get('/caja', params),
  registrar: (data)  => post('/caja', data),
}

// ── MORA ─────────────────────────────────────────────────────
export const mora = {
  listar:           () => get('/mora'),
  notificarMasivo:  () => post('/mora/notificar-masivo'),
  bloquear:         (clienteId) => post(`/mora/bloquear/${clienteId}`),
}

// ── USUARIOS ─────────────────────────────────────────────────
export const usuarios = {
  listar:  ()        => get('/usuarios'),
  crear:   (data)    => post('/usuarios', data),
  toggle:  (id)      => put(`/usuarios/${id}/toggle`),
}

// ── REPORTES ─────────────────────────────────────────────────
export const reportes = {
  dashboard:      () => get('/reportes/dashboard'),
  cartActiva:     (fmt='json') => fmt === 'pdf'
    ? window.open(`${BASE}/reportes/cartera-activa?formato=pdf&_t=${localStorage.getItem('fp_token')}`, '_blank')
    : get('/reportes/cartera-activa'),
  cartVencida:    (fmt='json') => fmt === 'pdf'
    ? window.open(`${BASE}/reportes/cartera-vencida?formato=pdf&_t=${localStorage.getItem('fp_token')}`, '_blank')
    : get('/reportes/cartera-vencida'),
  caja:           (fecha) => get('/reportes/caja', { fecha }),
  sib:            (mes, anio) => get('/reportes/sib', { mes, anio }),
  auditoria:      (params) => get('/reportes/auditoria', params),
}

// ── HEALTH ────────────────────────────────────────────────────
export const health = () => get('/health')
