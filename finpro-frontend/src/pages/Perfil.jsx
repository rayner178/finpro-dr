// src/pages/Perfil.jsx
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { auth as authApi } from '../api/client'
import { useMutation } from '../hooks/useApi'
import {
  Btn, Card, Field, Avatar, toast
} from '../components/UI'

export default function Perfil() {
  const { user, logout } = useAuth()
  const [form, setForm] = useState({
    password_actual: '',
    password_nuevo: '',
    password_confirmar: '',
  })
  const [show, setShow] = useState({
    actual: false, nuevo: false, confirmar: false
  })
  const [success, setSuccess] = useState(false)

  const { mutate: cambiar, loading } = useMutation(authApi.cambiarPassword)

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSuccess(false)

    if (!form.password_actual) {
      toast.error('Ingresa tu contraseña actual')
      return
    }
    if (form.password_nuevo.length < 8) {
      toast.error('La nueva contraseña debe tener al menos 8 caracteres')
      return
    }
    if (form.password_nuevo !== form.password_confirmar) {
      toast.error('Las contraseñas nuevas no coinciden')
      return
    }
    if (form.password_actual === form.password_nuevo) {
      toast.error('La nueva contraseña debe ser diferente a la actual')
      return
    }

    const res = await cambiar({
      password_actual:  form.password_actual,
      password_nuevo:   form.password_nuevo,
    })

    if (res.ok) {
      setSuccess(true)
      setForm({ password_actual: '', password_nuevo: '', password_confirmar: '' })
      toast.success('Contraseña actualizada correctamente')
    } else {
      toast.error(res.error || 'Error al cambiar la contraseña')
    }
  }

  const initials = user?.nombre?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U'

  const ROL_COLOR = {
    Administrador: 'var(--indigo)',
    Supervisor:    'var(--blue)',
    Cobrador:      'var(--green)',
    Cajero:        'var(--amber)',
  }

  return (
    <div className="animate-up" style={{ maxWidth: '680px' }}>

      {/* Header */}
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '24px', fontWeight: 700 }}>
          Mi perfil
        </h1>
        <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>
          Información de tu cuenta y seguridad
        </p>
      </div>

      {/* Info de usuario */}
      <Card style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Avatar
            initials={initials}
            size={64}
            color={ROL_COLOR[user?.rol] || 'var(--blue)'}
          />
          <div style={{ flex: 1 }}>
            <div style={{
              fontFamily: 'var(--font-head)', fontSize: '20px',
              fontWeight: 700, marginBottom: '4px'
            }}>
              {user?.nombre}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: '12px',
              color: 'var(--text3)', marginBottom: '10px'
            }}>
              @{user?.usuario}
            </div>
            <span className="badge" style={{
              background: (ROL_COLOR[user?.rol] || 'var(--blue)') + '22',
              color: ROL_COLOR[user?.rol] || 'var(--blue)',
            }}>
              {user?.rol}
            </span>
          </div>
        </div>

        {/* Detalles */}
        <div style={{
          marginTop: '20px', paddingTop: '20px',
          borderTop: '1px solid var(--border)',
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px'
        }}>
          {[
            ['Usuario',   user?.usuario],
            ['Sucursal',  user?.sucursal_nombre || 'Principal'],
            ['Rol',       user?.rol],
            ['ID',        `#${user?.id}`],
          ].map(([label, value]) => (
            <div key={label} style={{
              background: 'var(--surface2)', borderRadius: 'var(--r)',
              padding: '10px 14px'
            }}>
              <div style={{
                fontSize: '10px', color: 'var(--text3)',
                fontFamily: 'var(--font-head)', textTransform: 'uppercase',
                letterSpacing: '.07em', marginBottom: '4px'
              }}>{label}</div>
              <div style={{ fontWeight: 600, fontSize: '13px' }}>{value}</div>
            </div>
          ))}
        </div>
      </Card>

      {/* Cambiar contraseña */}
      <Card>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          marginBottom: '20px', paddingBottom: '16px',
          borderBottom: '1px solid var(--border)'
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '10px',
            background: 'var(--blue-dim)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', fontSize: '18px'
          }}>🔐</div>
          <div>
            <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '15px' }}>
              Cambiar contraseña
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px' }}>
              Usa una contraseña segura con letras, números y símbolos
            </div>
          </div>
        </div>

        {success && (
          <div style={{
            background: 'var(--green-dim)',
            border: '1px solid rgba(52,211,153,.3)',
            borderRadius: 'var(--r)', padding: '12px 16px',
            color: 'var(--green)', fontSize: '13px',
            marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px'
          }}>
            ✓ Contraseña actualizada exitosamente. Úsala la próxima vez que inicies sesión.
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>

            {/* Contraseña actual */}
            <Field label="Contraseña actual">
              <div style={{ position: 'relative' }}>
                <input
                  type={show.actual ? 'text' : 'password'}
                  value={form.password_actual}
                  onChange={f('password_actual')}
                  placeholder="Tu contraseña actual"
                  autoComplete="current-password"
                  style={{ paddingRight: '44px' }}
                />
                <button type="button"
                  onClick={() => setShow(p => ({ ...p, actual: !p.actual }))}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '16px'
                  }}>
                  {show.actual ? '🙈' : '👁'}
                </button>
              </div>
            </Field>

            {/* Divisor */}
            <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0 12px' }} />

            {/* Nueva contraseña */}
            <Field label="Nueva contraseña" note="Mínimo 8 caracteres">
              <div style={{ position: 'relative' }}>
                <input
                  type={show.nuevo ? 'text' : 'password'}
                  value={form.password_nuevo}
                  onChange={f('password_nuevo')}
                  placeholder="Nueva contraseña"
                  autoComplete="new-password"
                  style={{ paddingRight: '44px' }}
                />
                <button type="button"
                  onClick={() => setShow(p => ({ ...p, nuevo: !p.nuevo }))}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '16px'
                  }}>
                  {show.nuevo ? '🙈' : '👁'}
                </button>
              </div>
            </Field>

            {/* Indicador de fortaleza */}
            {form.password_nuevo && (
              <PasswordStrength password={form.password_nuevo} />
            )}

            {/* Confirmar contraseña */}
            <Field label="Confirmar nueva contraseña" style={{ marginTop: '8px' }}>
              <div style={{ position: 'relative' }}>
                <input
                  type={show.confirmar ? 'text' : 'password'}
                  value={form.password_confirmar}
                  onChange={f('password_confirmar')}
                  placeholder="Repite la nueva contraseña"
                  autoComplete="new-password"
                  style={{
                    paddingRight: '44px',
                    borderColor: form.password_confirmar && form.password_nuevo !== form.password_confirmar
                      ? 'var(--red)' : undefined
                  }}
                />
                <button type="button"
                  onClick={() => setShow(p => ({ ...p, confirmar: !p.confirmar }))}
                  style={{
                    position: 'absolute', right: '12px', top: '50%',
                    transform: 'translateY(-50%)', background: 'none',
                    border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: '16px'
                  }}>
                  {show.confirmar ? '🙈' : '👁'}
                </button>
              </div>
              {form.password_confirmar && form.password_nuevo !== form.password_confirmar && (
                <p style={{ fontSize: '11px', color: 'var(--red)', marginTop: '4px' }}>
                  Las contraseñas no coinciden
                </p>
              )}
            </Field>

          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', marginTop: '20px', paddingTop: '16px',
            borderTop: '1px solid var(--border)'
          }}>
            <p style={{ fontSize: '12px', color: 'var(--text3)' }}>
              Después de cambiarla tendrás que volver a iniciar sesión
            </p>
            <Btn
              type="submit"
              loading={loading}
              disabled={
                !form.password_actual ||
                !form.password_nuevo ||
                form.password_nuevo !== form.password_confirmar
              }
            >
              Actualizar contraseña
            </Btn>
          </div>
        </form>
      </Card>

      {/* Cerrar sesión */}
      <div style={{ marginTop: '16px', textAlign: 'right' }}>
        <Btn variant="danger" onClick={logout}>
          ⏻ Cerrar sesión
        </Btn>
      </div>

    </div>
  )
}

// ── Indicador de fortaleza ────────────────────────────────
function PasswordStrength({ password }) {
  const checks = [
    { label: 'Mínimo 8 caracteres', ok: password.length >= 8 },
    { label: 'Letra mayúscula',      ok: /[A-Z]/.test(password) },
    { label: 'Letra minúscula',      ok: /[a-z]/.test(password) },
    { label: 'Número',               ok: /[0-9]/.test(password) },
    { label: 'Símbolo (!@#$...)',    ok: /[^A-Za-z0-9]/.test(password) },
  ]
  const score  = checks.filter(c => c.ok).length
  const color  = score <= 2 ? 'var(--red)' : score <= 3 ? 'var(--amber)' : 'var(--green)'
  const label  = score <= 2 ? 'Débil' : score <= 3 ? 'Regular' : score === 4 ? 'Buena' : 'Fuerte'

  return (
    <div style={{
      background: 'var(--surface2)', borderRadius: 'var(--r)',
      padding: '12px 14px', marginBottom: '12px'
    }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        alignItems: 'center', marginBottom: '8px'
      }}>
        <span style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-head)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Fortaleza
        </span>
        <span style={{ fontSize: '12px', fontWeight: 700, color }}>{label}</span>
      </div>
      <div style={{
        display: 'flex', gap: '4px', marginBottom: '10px'
      }}>
        {[1,2,3,4,5].map(i => (
          <div key={i} style={{
            flex: 1, height: '4px', borderRadius: '2px',
            background: i <= score ? color : 'var(--border)',
            transition: 'background .2s'
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {checks.map(c => (
          <div key={c.label} style={{
            display: 'flex', alignItems: 'center', gap: '7px', fontSize: '12px',
            color: c.ok ? 'var(--green)' : 'var(--text3)'
          }}>
            <span style={{ fontSize: '11px' }}>{c.ok ? '✓' : '○'}</span>
            {c.label}
          </div>
        ))}
      </div>
    </div>
  )
}
