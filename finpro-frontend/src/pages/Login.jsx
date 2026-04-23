// src/pages/Login.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { Btn, Spinner } from '../components/UI'

export default function Login() {
  const { login, loading } = useAuth()
  const [form, setForm]     = useState({ usuario: '', password: '' })
  const [error, setError]   = useState('')
  const [show, setShow]     = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    const res = await login(form.usuario, form.password)
    if (!res.ok) setError(res.error)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '20px', position: 'relative', overflow: 'hidden'
    }}>
      {/* Glow de fondo */}
      <div style={{ position: 'absolute', top: '15%', left: '20%', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(79,142,247,.07) 0%, transparent 70%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: '10%', right: '15%', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(124,111,247,.05) 0%, transparent 70%)', pointerEvents: 'none' }} />

      {/* Grid pattern */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: 'linear-gradient(rgba(79,142,247,.03) 1px, transparent 1px), linear-gradient(90deg, rgba(79,142,247,.03) 1px, transparent 1px)',
        backgroundSize: '60px 60px'
      }} />

      <div style={{ width: '100%', maxWidth: '420px', position: 'relative', animation: 'fadeUp .4s ease' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            width: '56px', height: '56px', borderRadius: '16px', margin: '0 auto 16px',
            background: 'linear-gradient(135deg, var(--blue), var(--indigo))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px', fontWeight: 800, fontFamily: 'var(--font-head)', color: '#fff',
            boxShadow: '0 8px 32px var(--blue-glow)'
          }}>F</div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '28px', fontWeight: 800, letterSpacing: '-.02em' }}>FinanPro</h1>
          <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '6px' }}>Sistema de Gestión de Préstamos</p>
        </div>

        {/* Card */}
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 'var(--r-xl)', padding: '32px',
          boxShadow: '0 20px 60px rgba(0,0,0,.5)'
        }}>
          <form onSubmit={submit}>
            <div style={{ marginBottom: '18px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-head)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '7px' }}>Usuario</label>
              <input
                type="text" autoFocus autoComplete="username"
                placeholder="admin"
                value={form.usuario}
                onChange={e => setForm(p => ({ ...p, usuario: e.target.value }))}
                style={{ fontSize: '14px' }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-head)', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.07em', marginBottom: '7px' }}>Contraseña</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={show ? 'text' : 'password'} autoComplete="current-password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                  style={{ fontSize: '14px', paddingRight: '44px' }}
                />
                <button type="button" onClick={() => setShow(p => !p)} style={{
                  position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '16px'
                }}>{show ? '🙈' : '👁'}</button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'var(--red-dim)', border: '1px solid rgba(248,113,113,.3)',
                borderRadius: 'var(--r)', padding: '10px 14px',
                color: 'var(--red)', fontSize: '13px', marginBottom: '18px',
                display: 'flex', alignItems: 'center', gap: '8px'
              }}>
                ✕ {error}
              </div>
            )}

            <Btn full size="lg" loading={loading} disabled={!form.usuario || !form.password}>
              {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
            </Btn>
          </form>
        </div>

        <p style={{ textAlign: 'center', color: 'var(--text3)', fontSize: '12px', marginTop: '20px' }}>
          Acceso solo para personal autorizado
        </p>
      </div>
    </div>
  )
}
