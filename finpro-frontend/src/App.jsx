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

// ── Hook: detectar si es móvil ────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 768)
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])
  return isMobile
}

// ── Protected route ───────────────────────────────────────
function Protected({ children }) {
  const { user } = useAuth()
  return user ? children : <Navigate to="/login" replace />
}

// ── Desktop nav item (sidebar) ────────────────────────────
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
          background: 'var(--red)', color: '#fff', fontSize: '10px',
          fontWeight: 700, padding: '1px 6px', borderRadius: '10px',
          flexShrink: 0, marginLeft: 'auto',
        }}>{badge}</span>
      )}
    </NavLink>
  )
}

// ── Mobile bottom nav item ────────────────────────────────
function BottomNavItem({ to, icon, label, badge }) {
  return (
    <NavLink to={to} style={({ isActive }) => ({
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', flex: 1, gap: '3px', textDecoration: 'none',
      color: isActive ? 'var(--blue)' : 'var(--text3)',
      position: 'relative', padding: '6px 4px',
      transition: 'color .15s',
    })}>
      {({ isActive }) => (
        <>
          {/* Indicador activo */}
          {isActive && (
            <div style={{
              position: 'absolute', top: '4px', left: '50%',
              transform: 'translateX(-50%)',
              width: '20px', height: '3px', borderRadius: '2px',
              background: 'var(--blue)',
            }} />
          )}
          <span style={{ fontSize: '20px', lineHeight: 1, marginTop: '6px' }}>{icon}</span>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-head)', fontWeight: 500, letterSpacing: '.02em' }}>{label}</span>
          {badge > 0 && (
            <span style={{
              position: 'absolute', top: '4px', right: '18%',
              background: 'var(--red)', color: '#fff',
              fontSize: '9px', fontWeight: 700,
              minWidth: '16px', height: '16px',
              borderRadius: '8px', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              padding: '0 4px',
            }}>{badge}</span>
          )}
        </>
      )}
    </NavLink>
  )
}

// ── API status ────────────────────────────────────────────
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
      <div style={{ width: 7, height: 7, borderRadius: '50%', background: color, animation: status === 'ok' ? 'pulse-dot 2s infinite' : undefined }} />
      {label}
    </div>
  )
}

// ── Page title map ────────────────────────────────────────
const PAGE_TITLES = {
  '/':          'Dashboard',
  '/clientes':  'Clientes',
  '/prestamos': 'Préstamos',
  '/cobros':    'Cobros',
  '/mora':      'Control de mora',
  '/caja':      'Caja diaria',
  '/reportes':  'Reportes',
  '/usuarios':  'Usuarios',
  '/perfil':    'Mi perfil',
}

// ── App Shell ─────────────────────────────────────────────
function Shell() {
  const { user, logout, isAdmin, isSupervisor } = useAuth()
  const [collapsed, setCollapsed] = useState(false)
  const [moraCnt,   setMoraCnt]   = useState(0)
  const isMobile  = useIsMobile()
  const location  = useLocation()
  const pageTitle = PAGE_TITLES[location.pathname] || 'FinanPro'

  // Mora polling con API client autenticado
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

  // Items del sidebar / bottom nav
  const navItems = [
    { to: '/',          icon: '⬡', label: 'Inicio',    badge: 0 },
    { to: '/clientes',  icon: '◉', label: 'Clientes',  badge: 0 },
    { to: '/prestamos', icon: '◎', label: 'Préstamos', badge: 0 },
    { to: '/cobros',    icon: '◇', label: 'Cobros',    badge: 0 },
    { to: '/mora',      icon: '⚠', label: 'Mora',      badge: moraCnt },
    { to: '/caja',      icon: '▣', label: 'Caja',      badge: 0 },
    { to: '/reportes',  icon: '▤', label: 'Reportes',  badge: 0 },
    ...(isAdmin || isSupervisor ? [{ to: '/usuarios', icon: '◈', label: 'Usuarios', badge: 0 }] : []),
    { to: '/perfil',    icon: '👤', label: 'Perfil',    badge: 0 },
  ]

  // En móvil solo mostramos 5 items en el bottom nav (los más usados)
  const bottomNavItems = [
    { to: '/',          icon: '⬡', label: 'Inicio',    badge: 0 },
    { to: '/clientes',  icon: '◉', label: 'Clientes',  badge: 0 },
    { to: '/prestamos', icon: '◎', label: 'Préstamos', badge: 0 },
    { to: '/cobros',    icon: '◇', label: 'Cobros',    badge: 0 },
    { to: '/mora',      icon: '⚠', label: 'Mora',      badge: moraCnt },
  ]

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>

      {/* ── SIDEBAR (solo desktop) ───────────────────────── */}
      {!isMobile && (
        <aside className="desktop-sidebar" style={{
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

          {/* Nav desktop */}
          <nav style={{ flex: 1, padding: '10px 8px', overflow: 'auto' }}>
            {collapsed ? (
              navItems.map(({ to, icon, label }) => (
                <NavLink key={to} to={to} title={label}
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
                {navItems.map(({ to, icon, label, badge }) => (
                  <NavItem key={to} to={to} icon={icon} label={label} badge={badge} />
                ))}
                <div style={{ height: '1px', background: 'var(--border)', margin: '12px 4px' }} />
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
      )}

      {/* ── MAIN ────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* Topbar */}
        <header className="topbar" style={{
          height: isMobile ? '52px' : '56px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: isMobile ? '0 16px' : '0 28px', flexShrink: 0,
        }}>
          {/* Móvil: logo + título */}
          {isMobile ? (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '8px',
                  background: 'linear-gradient(135deg, var(--blue), var(--indigo))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '14px', fontWeight: 800, fontFamily: 'var(--font-head)', color: '#fff',
                }}>F</div>
                <span style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '15px' }}>
                  {pageTitle}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {moraCnt > 0 && (
                  <div style={{
                    fontSize: '11px', color: 'var(--red)', background: 'var(--red-dim)',
                    padding: '3px 10px', borderRadius: '20px',
                    border: '1px solid rgba(248,113,113,.2)',
                    fontFamily: 'var(--font-head)', fontWeight: 600,
                  }}>⚠ {moraCnt}</div>
                )}
                {/* Avatar + logout en móvil */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: 'var(--blue-dim)', border: '1.5px solid var(--blue)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--blue)',
                  }}>{initials}</div>
                </div>
              </div>
            </>
          ) : (
            /* Desktop topbar */
            <>
              <div className="topbar-desktop-items" style={{ fontSize: '12px', color: 'var(--text3)', fontFamily: 'var(--font-head)', letterSpacing: '.08em', textTransform: 'uppercase' }}>
                {pageTitle}
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
            </>
          )}
        </header>

        {/* Contenido de páginas */}
        <main className="page-content mobile-main-content" style={{
          flex: 1, overflow: 'auto',
          padding: isMobile ? '16px' : '28px',
        }}>
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

      {/* ── BOTTOM NAV (solo móvil) ───────────────────────── */}
      <nav className="bottom-nav">
        {bottomNavItems.map(({ to, icon, label, badge }) => (
          <BottomNavItem key={to} to={to} icon={icon} label={label} badge={badge} />
        ))}
        {/* Botón "más" para acceder a caja, reportes, perfil */}
        <NavLink to="/perfil" style={({ isActive }) => ({
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', flex: 1, gap: '3px', textDecoration: 'none',
          color: ['/caja','/reportes','/usuarios','/perfil'].includes(location.pathname)
            ? 'var(--blue)' : 'var(--text3)',
          position: 'relative', padding: '6px 4px', transition: 'color .15s',
        })}>
          <span style={{ fontSize: '20px', lineHeight: 1, marginTop: '6px' }}>☰</span>
          <span style={{ fontSize: '10px', fontFamily: 'var(--font-head)', fontWeight: 500 }}>Más</span>
        </NavLink>
      </nav>

    </div>
  )
}

// ── More menu para móvil (caja, reportes, usuarios, perfil) ──
// Se accede tocando "Más" → va a /perfil que tiene links a todo

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
