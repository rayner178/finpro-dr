// src/components/UI.jsx
// Librería de componentes UI compartidos
import { useState, useEffect, useCallback } from 'react'

// ── Formato helpers ───────────────────────────────────────
export const fmt    = (n) => new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP', minimumFractionDigits: 0 }).format(n ?? 0)
export const fmtNum = (n) => new Intl.NumberFormat('es-DO').format(n ?? 0)
export const fmtDate = (d) => d && d !== '-' ? new Date(d + 'T00:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'
export const fmtPct = (n) => `${Number(n ?? 0).toFixed(1)}%`

// ── Button ────────────────────────────────────────────────
const VARIANTS = {
  primary: { bg: 'var(--blue)',         color: '#fff',         border: 'transparent' },
  secondary:{ bg: 'var(--surface3)',    color: 'var(--text)',  border: 'var(--border)' },
  danger:  { bg: 'var(--red-dim)',      color: 'var(--red)',   border: 'rgba(248,113,113,.25)' },
  success: { bg: 'var(--green-dim)',    color: 'var(--green)', border: 'rgba(52,211,153,.25)' },
  ghost:   { bg: 'transparent',         color: 'var(--text2)', border: 'transparent' },
  amber:   { bg: 'var(--amber-dim)',    color: 'var(--amber)', border: 'rgba(251,191,36,.25)' },
}
const SIZES = {
  xs: { padding: '4px 10px',  fontSize: '11px', height: '26px' },
  sm: { padding: '6px 14px',  fontSize: '12px', height: '30px' },
  md: { padding: '9px 18px',  fontSize: '13px', height: '36px' },
  lg: { padding: '12px 24px', fontSize: '14px', height: '42px' },
}

export function Btn({ children, onClick, variant='primary', size='md', full, disabled, loading, icon }) {
  const v = VARIANTS[variant]
  const s = SIZES[size]
  return (
    <button onClick={onClick} disabled={disabled || loading} style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
      background: v.bg, color: v.color, border: `1px solid ${v.border}`,
      borderRadius: 'var(--r)', fontFamily: 'var(--font-head)', fontWeight: 600,
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      opacity: disabled ? .5 : 1, transition: 'all .15s', letterSpacing: '.02em',
      width: full ? '100%' : undefined, ...s
    }}
      onMouseEnter={e => { if (!disabled && !loading) { e.currentTarget.style.filter='brightness(1.12)'; e.currentTarget.style.transform='translateY(-1px)' } }}
      onMouseLeave={e => { e.currentTarget.style.filter=''; e.currentTarget.style.transform='' }}
    >
      {loading && <Spinner size={14} color={v.color} />}
      {!loading && icon && icon}
      {children}
    </button>
  )
}

// ── Card ──────────────────────────────────────────────────
export function Card({ children, style, pad = true }) {
  return (
    <div style={{
      background: 'var(--surface)', border: '1px solid var(--border)',
      borderRadius: 'var(--r-lg)', padding: pad ? '20px' : undefined, ...style
    }}>
      {children}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 520, footer }) {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768

  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="modal-backdrop" style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.72)',
      display: 'flex',
      alignItems: isMobile ? 'flex-end' : 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: isMobile ? '0' : '16px',
      backdropFilter: 'blur(4px)', animation: 'fadeIn .2s ease'
    }} onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-inner" style={{
        background: 'var(--surface)', border: '1px solid var(--border2)',
        borderRadius: isMobile ? 'var(--r-xl) var(--r-xl) 0 0' : 'var(--r-xl)',
        width: '100%', maxWidth: isMobile ? '100%' : width,
        maxHeight: isMobile ? '92vh' : '90vh',
        display: 'flex', flexDirection: 'column',
        animation: 'fadeUp .25s ease', boxShadow: '0 25px 80px rgba(0,0,0,.6)',
        paddingBottom: isMobile ? 'env(safe-area-inset-bottom)' : undefined,
      }}>
        {/* Handle bar en móvil */}
        {isMobile && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--border2)' }} />
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: isMobile ? '10px 20px 14px' : '18px 24px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '16px', fontWeight: 700 }}>{title}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: '0 4px' }}>×</button>
        </div>
        <div style={{ padding: isMobile ? '16px 20px' : '24px', overflow: 'auto', flex: 1 }}>{children}</div>
        {footer && <div style={{ padding: isMobile ? '12px 20px' : '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>{footer}</div>}
      </div>
    </div>
  )
}

// ── FormField ─────────────────────────────────────────────
export function Field({ label, children, error, note, half }) {
  return (
    <div style={{ marginBottom: '16px', gridColumn: half ? undefined : 'span 2' }}>
      {label && <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, fontFamily: 'var(--font-head)', color: 'var(--text3)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '.07em' }}>{label}</label>}
      {children}
      {error && <p style={{ fontSize: '11px', color: 'var(--red)', marginTop: '4px' }}>{error}</p>}
      {note  && <p style={{ fontSize: '11px', color: 'var(--text3)', marginTop: '4px' }}>{note}</p>}
    </div>
  )
}

// ── Spinner ───────────────────────────────────────────────
export function Spinner({ size = 20, color = 'var(--blue)' }) {
  return (
    <div style={{
      width: size, height: size, border: `2px solid transparent`,
      borderTopColor: color, borderRadius: '50%',
      animation: 'spin .7s linear infinite', flexShrink: 0
    }} />
  )
}

// ── FullPageSpinner ───────────────────────────────────────
export function FullPageSpinner({ text = 'Cargando...' }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: '16px' }}>
      <Spinner size={36} />
      <span style={{ color: 'var(--text2)', fontSize: '14px' }}>{text}</span>
    </div>
  )
}

// ── Empty State ───────────────────────────────────────────
export function Empty({ icon = '📭', text = 'Sin datos disponibles', sub }) {
  return (
    <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text2)' }}>
      <div style={{ fontSize: '36px', marginBottom: '12px' }}>{icon}</div>
      <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600, marginBottom: '6px' }}>{text}</div>
      {sub && <div style={{ fontSize: '12px', color: 'var(--text3)' }}>{sub}</div>}
    </div>
  )
}

// ── KPI Card ──────────────────────────────────────────────
export function KPI({ label, value, sub, color = 'var(--blue)', icon, loading }) {
  return (
    <Card style={{ position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: color }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '10px', fontFamily: 'var(--font-head)', fontWeight: 600, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>{label}</div>
          {loading
            ? <div style={{ height: '32px', background: 'var(--surface2)', borderRadius: '6px', width: '80%', animation: 'pulse-dot 1.5s infinite' }} />
            : <div style={{ fontSize: '26px', fontWeight: 700, fontFamily: 'var(--font-head)', color: 'var(--text)', lineHeight: 1 }}>{value}</div>
          }
          {sub && <div style={{ fontSize: '11px', color: 'var(--text2)', marginTop: '6px' }}>{sub}</div>}
        </div>
        {icon && <div style={{ fontSize: '20px', opacity: .4, marginLeft: '12px', marginTop: '2px' }}>{icon}</div>}
      </div>
    </Card>
  )
}

// ── Avatar ────────────────────────────────────────────────
export function Avatar({ initials, size = 34, color = 'var(--blue)' }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color + '22', border: `1.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * .33, fontWeight: 700, fontFamily: 'var(--font-head)',
      color, flexShrink: 0, letterSpacing: '.02em'
    }}>{initials}</div>
  )
}

// ── Toast notifications ───────────────────────────────────
// Uses a module-level Set of listeners so StrictMode double-invoke
// doesn't accidentally clear the real listener.
const _toastListeners = new Set()

export const toast = {
  success: (msg) => _toastListeners.forEach(fn => fn({ msg, type: 'success' })),
  error:   (msg) => _toastListeners.forEach(fn => fn({ msg, type: 'error' })),
  info:    (msg) => _toastListeners.forEach(fn => fn({ msg, type: 'info' })),
}

export function ToastProvider() {
  const [toasts, setToasts] = useState([])

  useEffect(() => {
    const handler = ({ msg, type }) => {
      const id = Date.now() + Math.random()
      setToasts(p => [...p, { id, msg, type }])
      setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 4000)
    }
    _toastListeners.add(handler)
    return () => { _toastListeners.delete(handler) }
  }, [])

  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', display: 'flex', flexDirection: 'column', gap: '8px', zIndex: 9999 }}>
      {toasts.map(t => (
        <div key={t.id} style={{
          padding: '12px 18px', borderRadius: 'var(--r)',
          background: t.type === 'success' ? 'var(--green-dim)' : t.type === 'error' ? 'var(--red-dim)' : 'var(--blue-dim)',
          border: `1px solid ${t.type === 'success' ? 'rgba(52,211,153,.3)' : t.type === 'error' ? 'rgba(248,113,113,.3)' : 'var(--border2)'}`,
          color: t.type === 'success' ? 'var(--green)' : t.type === 'error' ? 'var(--red)' : 'var(--blue)',
          fontSize: '13px', fontWeight: 500, maxWidth: '340px',
          boxShadow: '0 8px 30px rgba(0,0,0,.4)', animation: 'fadeUp .25s ease'
        }}>
          {t.type === 'success' ? '✓' : t.type === 'error' ? '✕' : 'ℹ'} {t.msg}
        </div>
      ))}
    </div>
  )
}

// ── Confirm dialog ────────────────────────────────────────
export function useConfirm() {
  const [state, setState] = useState(null)
  const confirm = useCallback((message, title = '¿Confirmar acción?') =>
    new Promise(resolve => setState({ message, title, resolve }))
  , [])

  const Dialog = state ? (
    <Modal open title={state.title} onClose={() => { state.resolve(false); setState(null) }} width={380}
      footer={<>
        <Btn variant="secondary" onClick={() => { state.resolve(false); setState(null) }}>Cancelar</Btn>
        <Btn variant="danger"    onClick={() => { state.resolve(true);  setState(null) }}>Confirmar</Btn>
      </>}>
      <p style={{ color: 'var(--text2)', lineHeight: 1.6 }}>{state.message}</p>
    </Modal>
  ) : null

  return { confirm, Dialog }
}

// ── Progress bar ──────────────────────────────────────────
export function ProgressBar({ value, color = 'var(--blue)', height = 6 }) {
  return (
    <div style={{ height, background: 'var(--surface2)', borderRadius: height, overflow: 'hidden' }}>
      <div style={{ height: '100%', width: `${Math.min(100, value)}%`, background: color, borderRadius: height, transition: 'width .5s ease' }} />
    </div>
  )
}

// ── Score badge ───────────────────────────────────────────
export function ScoreBadge({ score }) {
  const color = score >= 80 ? 'var(--green)' : score >= 60 ? 'var(--amber)' : 'var(--red)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <ProgressBar value={score} color={color} />
      <span style={{ fontSize: '12px', fontWeight: 700, fontFamily: 'var(--font-mono)', color, minWidth: '28px' }}>{score}</span>
    </div>
  )
}

// ── Status badge map ──────────────────────────────────────
export function StatusBadge({ estado }) {
  const map = {
    activo:    'badge-green',
    pagado:    'badge-blue',
    vencido:   'badge-red',
    pendiente: 'badge-amber',
    moroso:    'badge-red',
    bloqueado: 'badge-red',
    inactivo:  'badge-gray',
    cancelado: 'badge-gray',
    entrada:   'badge-green',
    salida:    'badge-red',
  }
  return <span className={`badge ${map[estado] || 'badge-gray'}`}>{estado}</span>
}

// ── Page header ───────────────────────────────────────────
export function PageHeader({ title, sub, action }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
      <div>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '24px', fontWeight: 700, letterSpacing: '-.01em' }}>{title}</h1>
        {sub && <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>{sub}</p>}
      </div>
      {action}
    </div>
  )
}

// ── Section card with title ───────────────────────────────
export function Section({ title, action, children, pad = true }) {
  return (
    <Card pad={false}>
      {(title || action) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          {title && <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '14px', fontWeight: 700 }}>{title}</h3>}
          {action}
        </div>
      )}
      {/* Wrap table in scrollable div for mobile */}
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        {children}
      </div>
    </Card>
  )
}

// ── Filter tabs ───────────────────────────────────────────
export function FilterTabs({ options, value, onChange }) {
  return (
    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
      {options.map(o => (
        <button key={o.value} onClick={() => onChange(o.value)} style={{
          padding: '6px 16px', borderRadius: '20px', fontSize: '12px', fontWeight: 600,
          fontFamily: 'var(--font-head)', cursor: 'pointer', transition: 'all .15s',
          background: value === o.value ? 'var(--blue)' : 'var(--surface2)',
          color:      value === o.value ? '#fff' : 'var(--text2)',
          border:     value === o.value ? '1px solid transparent' : '1px solid var(--border)',
        }}>
          {o.label} {o.count !== undefined && <span style={{ opacity: .7, fontSize: '11px' }}>({o.count})</span>}
        </button>
      ))}
    </div>
  )
}
