// src/App.jsx
import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, NavLink, Navigate, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider }         from './components/UI'
import ErrorBoundary              from './components/ErrorBoundary'
import { mora as moraApi }        from './api/client'

import Login     from './pages/Login'
import Dashboard from './pages/Dashboard'
import Clientes  from './pages/Clientes'
import Prestamos from './pages/Prestamos'
import Cobros    from './pages/Cobros'
import Mora      from './pages/Mora'
import Caja      from './pages/Caja'
import Reportes  from './pages/Reportes'
import Usuarios  from './pages/Usuarios'
import Perfil    from './pages/Perfil'

// ── Protected route ───────────────────────────────────────
function Protected({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

// ── Nav item ──────────────────────────────────────────────
function NavItem({ to, icon, label, badge }) {
  return (
    <NavLink to={to} style={({ isActive }) => ({
      display: 'flex', alignItems: 'center', gap: '10px',
      padding: '9px 12px', borderRadius: '9px', marginBottom: '2px',
      background: isActive ? 'rgba(79,142,247,.15)' : 'transparent',
      color: isActive ? 'var(--blue)' : 'var(--text2)',
      border: isActive ? '1px solid rgba(79,142,247,.2)' : '1px solid transparent',
      textDecoration: 'none', fontSize: '13px',
      fontWeight: isActive ? 600 : 400,
      fontFamily: 'var(--font-head)', letterSpacing: '.01em',
      transition: 'all .15s', whiteSpace: 'nowrap', overflow: 'hidden',
    })}
      onMouseEnter={e => {
        if (!e.currentTarget.style.background.includes('247')) {
          e.currentTarget.style.background = 'rgba(255,255,255,.04)'
          e.currentTarget.style.color = 'var(--text)'
        }
      }}
      onMouseLeave={e => {
        if (!e.currentTarget.style.background.includes('247')) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--text2)'
        }
      }}
    >
      <span style={{ fontSize: '16px', flexShrink: 0, width: '20px', textAlign: 'center' }}>{icon}</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', flex: 1 }}>{label}</span>
      {badge > 0 && (
        <span style={{
          background: 'var(--red)', color: '#fff',
          fontSize: '10px', fontWeight: 700,
          padding: '1px 6px', borderRadius: '10px',
          flexShrink: 0, marginLeft: 'auto',
        }}>{badge}</span>
      )}
    </NavLink>
  )
}

// ── API status indicator ──────────────────────────────────
function ApiStatus() {
  const [status, setStatus] = useState('checking')

  useEffect(() => {
    const base = import.meta.env.VITE_API_URL || '/api'
    fetch(`${base}/health`)
      .then(r => r.json())
      .then(d => setStatus(d.status === 'ok' ? 'ok' : 'error'))
      .catch(() => setStatus('error'))
  }, [])

  const color = status === 'ok' ? 'var(--green)' : status === 'error' ? 'var(--red)' : 'var(--amber)'
  const label = status === 'ok' ? 'API conectada' : status === 'error' ? 'API desconectada' : 'Verificando...'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '7px', padding: '8px 12px', fontSize: '11px', color: 'var(--text3)' }}>
      <div style={{
        width: 7, height: 7, borderRadius: '50%', background: color,
        animation: status === 'ok' ? 'pulse-dot 2s infinite' : undefined,
      }} />
      {label}
    </div>
  )
}

// ── App Shell ─────────────────────────────────────────────
function Shell() {
  const { user, logout, isAdmin, isSupervisor } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [moraCnt,   setMoraCnt]   = useState(0)
  const location = useLocation()

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      try {
        const data = await moraApi.listar()
        if (!cancelled) setMoraCnt(Array.isArray(data) ? data.length : 0)
      } catch { /* silently ignore */ }
    }
    poll()
    const id = setInterval(poll, 60_000)
    return () => { cancelled = true; clearInterval(id) }
  }, [])

  const initials = user?.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── SIDEBAR ─────────────────────────────────────── */}
      <aside style={{
        width: collapsed ? 60 : 220, flexShrink: 0,
        background: 'var(--surface)', borderRight: '1px solid var(--border)',
        display: 'flex', flexDirection: 'column',
        transition: 'width .2s ease', overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          padding: collapsed ? '16px 14px' : '18px 16px',
          borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: '10px', minHeight: '64px',
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '9px', flexShrink: 0,
            background: 'linear-gradient(135deg, var(--blue), var(--indigo))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', fontWeight: 800, fontFamily: 'var(--font-head)', color: '#fff',
            boxShadow: '0 4px 14px var(--blue-glow)',
          }}>F</div>
          {!collapsed && (
            <div style={{ overflow: 'hidden' }}>
              <div style={{ fontFamily: 'var(--font-head)', fontSize: '15px', fontWeight: 800, letterSpacing: '-.01em', whiteSpace: 'nowrap' }}>FinanPro</div>
              <div style={{ fontSize: '10px', color: 'var(--text3)', whiteSpace: 'nowrap', letterSpacing: '.04em' }}>GESTIÓN DE PRÉSTAMOS</div>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflow: 'auto' }}>
          {collapsed ? (
            [['/', '⬡'], ['clientes', '◉'], ['prestamos', '◎'], ['cobros', '◇'],
             ['mora', '⚠'], ['caja', '▣'], ['reportes', '▤'],
             ...((isAdmin || isSupervisor) ? [['usuarios', '◈']] : []),
             ['perfil', '👤']
            ].map(([path, icon]) => (
              <NavLink key={path} to={path === '/' ? '/' : `/${path}`} title={path}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '40px', height: '36px', borderRadius: '8px', margin: '2px auto',
                  background: isActive ? 'rgba(79,142,247,.15)' : 'transparent',
                  color: isActive ? 'var(--blue)' : 'var(--text2)',
                  textDecoration: 'none', fontSize: '15px', transition: 'all .15s',
                  border: isActive ? '1px solid rgba(79,142,247,.2)' : '1px solid transparent',
                })}>
                {icon}
              </NavLink>
            ))
          ) : (
            <>
              <NavItem to="/"          icon="⬡" label="Dashboard" />
              <NavItem to="/clientes"  icon="◉" label="Clientes" />
              <NavItem to="/prestamos" icon="◎" label="Préstamos" />
              <NavItem to="/cobros"    icon="◇" label="Cobros" />
              <NavItem to="/mora"      icon="⚠" label="Control mora" badge={moraCnt} />
              <NavItem to="/caja"      icon="▣" label="Caja diaria" />
              <NavItem to="/reportes"  icon="▤" label="Reportes" />
              {(isAdmin || isSupervisor) && <NavItem to="/usuarios" icon="◈" label="Usuarios" />}
              <div style={{ height: '1px', background: 'var(--border)', margin: '12px 4px' }} />
              <NavItem to="/perfil"    icon="👤" label="Mi perfil" />
              <ApiStatus />
            </>
          )}
        </nav>

        {/* User + collapse */}
        <div style={{ padding: '10px 8px', borderTop: '1px solid var(--border)' }}>
          {!collapsed && (
            <div style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              padding: '8px 10px', background: 'var(--surface2)',
              borderRadius: 'var(--r)', marginBottom: '8px',
            }}>
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'var(--blue-dim)', border: '1.5px solid var(--blue)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-head)',
                color: 'var(--blue)', flexShrink: 0,
              }}>{initials}</div>
              <div style={{ overflow: 'hidden', flex: 1 }}>
                <div style={{ fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.nombre?.split(' ')[0]}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--text3)', whiteSpace: 'nowrap' }}>{user?.rol}</div>
              </div>
              <button onClick={logout} title="Cerrar sesión" style={{
                background: 'none', border: 'none', color: 'var(--text3)',
                cursor: 'pointer', fontSize: '14px', padding: '2px 4px', flexShrink: 0,
              }}>⏻</button>
            </div>
          )}
          <button onClick={() => setCollapsed(p => !p)} style={{
            width: '100%', padding: '7px', borderRadius: 'var(--r)',
            background: 'none', border: '1px solid var(--border)',
            color: 'var(--text3)', cursor: 'pointer', fontSize: '13px',
            transition: 'all .15s', fontFamily: 'var(--font-head)',
          }}>{collapsed ? '→' : '← Colapsar'}</button>
        </div>
      </aside>

      {/* ── MAIN ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <header style={{
          height: '56px', borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 28px', flexShrink: 0,
        }}>
          <div style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'var(--font-head)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
            {location.pathname === '/' ? 'Dashboard' : location.pathname.replace('/', '').replace('-', ' ')}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            {moraCnt > 0 && (
              <div style={{
                fontSize: '12px', color: 'var(--red)', background: 'var(--red-dim)',
                padding: '4px 12px', borderRadius: '20px',
                border: '1px solid rgba(248,113,113,.2)',
                fontFamily: 'var(--font-head)', fontWeight: 600,
              }}>⚠ {moraCnt} en mora</div>
            )}
            <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-mono)' }}>
              {new Date().toLocaleDateString('es-DO', { weekday: 'short', day: '2-digit', month: 'short' })}
            </div>
          </div>
        </header>

        {/* Páginas */}
        <main style={{ flex: 1, overflow: 'auto', padding: '28px' }}>
          <Routes>
            <Route path="/"          element={<ErrorBoundary key="dashboard"><Dashboard /></ErrorBoundary>} />
            <Route path="/clientes"  element={<ErrorBoundary key="clientes"><Clientes /></ErrorBoundary>} />
            <Route path="/prestamos" element={<ErrorBoundary key="prestamos"><Prestamos /></ErrorBoundary>} />
            <Route path="/cobros"    element={<ErrorBoundary key="cobros"><Cobros /></ErrorBoundary>} />
            <Route path="/mora"      element={<ErrorBoundary key="mora"><Mora /></ErrorBoundary>} />
            <Route path="/caja"      element={<ErrorBoundary key="caja"><Caja /></ErrorBoundary>} />
            <Route path="/reportes"  element={<ErrorBoundary key="reportes"><Reportes /></ErrorBoundary>} />
            <Route path="/usuarios"  element={<ErrorBoundary key="usuarios"><Usuarios /></ErrorBoundary>} />
            <Route path="/perfil"    element={<ErrorBoundary key="perfil"><Perfil /></ErrorBoundary>} />
            <Route path="*"          element={<Navigate to="/" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

// ── Root ──────────────────────────────────────────────────
export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider />
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

function AppRoutes() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/*"     element={<Protected><Shell /></Protected>} />
    </Routes>
  )
}
