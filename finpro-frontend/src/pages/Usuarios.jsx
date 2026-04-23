// src/pages/Usuarios.jsx
import { useState } from 'react'
import { useApi, useMutation } from '../hooks/useApi'
import { usuarios as usuariosApi } from '../api/client'
import { Btn, Modal, Field, Section, StatusBadge, Avatar, Empty, FullPageSpinner, fmtDate, toast, useConfirm } from '../components/UI'

const ROLES = ['Administrador','Supervisor','Cobrador','Cajero']
const ROL_COLOR = { Administrador: 'var(--indigo)', Supervisor: 'var(--blue)', Cobrador: 'var(--green)', Cajero: 'var(--amber)' }
const PERMISOS = [
  ['Dashboard',  ['✓ Completo',  '✓ Completo',  'Solo propio',   'Solo caja']],
  ['Clientes',   ['✓ CRUD',      '✓ CRUD',       'Solo lectura',  'Solo lectura']],
  ['Préstamos',  ['✓ CRUD',      '✓ Aprobar',    'Solo lectura',  'Sin acceso']],
  ['Cobros',     ['✓ CRUD',      '✓ Ver',        '✓ Registrar',   '✓ Registrar']],
  ['Caja',       ['✓ CRUD',      '✓ Ver',        'Sin acceso',    '✓ Registrar']],
  ['Mora',       ['✓ Gestionar', '✓ Ver',        'Notificar',     'Sin acceso']],
  ['Reportes',   ['✓ Todos',     '✓ Ver',        'Sin acceso',    'Solo caja']],
  ['Usuarios',   ['✓ CRUD',      'Solo ver',     'Sin acceso',    'Sin acceso']],
]

export default function Usuarios() {
  const [modal, setModal] = useState(false)
  const [form,  setForm]  = useState({ rol: 'Cobrador' })
  const { confirm, Dialog } = useConfirm()

  const { data, loading, refetch } = useApi(usuariosApi.listar)
  const { mutate: crear, loading: creando } = useMutation(usuariosApi.crear)
  const { mutate: toggle }                  = useMutation(usuariosApi.toggle)

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const guardar = async () => {
    if (!form.nombre||!form.usuario||!form.email||!form.password) { toast.error('Todos los campos son requeridos'); return }
    const res = await crear(form)
    if (res.ok) { toast.success('Usuario creado'); setModal(false); setForm({ rol: 'Cobrador' }); refetch() }
    else toast.error(res.error)
  }

  const handleToggle = async (u) => {
    const accion = u.activo ? 'desactivar' : 'activar'
    const ok = await confirm(`¿${accion.charAt(0).toUpperCase()+accion.slice(1)} al usuario ${u.nombre}?`)
    if (!ok) return
    await toggle(u.id); refetch()
  }

  const usuarios = data || []

  return (
    <div className="animate-up">
      {Dialog}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '24px', fontWeight: 700 }}>Usuarios y roles</h1>
          <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>{usuarios.length} usuarios registrados</p>
        </div>
        <Btn onClick={() => setModal(true)}>+ Nuevo usuario</Btn>
      </div>

      {loading ? <FullPageSpinner /> : (
        <Section>
          <table>
            <thead><tr><th>Usuario</th><th>Nombre</th><th>Rol</th><th>Sucursal</th><th>Último login</th><th>Estado</th><th></th></tr></thead>
            <tbody>
              {usuarios.map(u => {
                const initials = u.nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()
                return (
                  <tr key={u.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--blue)' }}>{u.usuario}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar initials={initials} size={28} color={ROL_COLOR[u.rol]||'var(--blue)'} />
                        <span style={{ fontWeight: 600, fontSize: '13px' }}>{u.nombre}</span>
                      </div>
                    </td>
                    <td><span className="badge" style={{ background: (ROL_COLOR[u.rol]||'var(--blue)')+'22', color: ROL_COLOR[u.rol]||'var(--blue)' }}>{u.rol}</span></td>
                    <td style={{ fontSize: '12px' }}>{u.sucursal_nombre}</td>
                    <td style={{ fontSize: '11px', color: 'var(--text3)' }}>{u.ultimo_login ? fmtDate(u.ultimo_login) : 'Nunca'}</td>
                    <td><StatusBadge estado={u.activo?'activo':'inactivo'} /></td>
                    <td><Btn variant="ghost" size="xs" onClick={() => handleToggle(u)}>{u.activo?'Desactivar':'Activar'}</Btn></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Section>
      )}

      {/* Matriz de permisos */}
      <div style={{ marginTop: '28px' }}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Matriz de permisos</h2>
        <Section>
          <table>
            <thead>
              <tr>
                <th>Módulo</th>
                {ROLES.map(r => <th key={r} style={{ color: ROL_COLOR[r] }}>{r}</th>)}
              </tr>
            </thead>
            <tbody>
              {PERMISOS.map(([mod, perms]) => (
                <tr key={mod}>
                  <td style={{ fontWeight: 600, fontSize: '13px' }}>{mod}</td>
                  {perms.map((p,i) => (
                    <td key={i} style={{ fontSize: '12px', color: p==='Sin acceso'?'var(--text3)':p.startsWith('✓')?'var(--green)':'var(--amber)' }}>{p}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} title="Nuevo usuario" width={480}
        footer={<><Btn variant="secondary" onClick={()=>setModal(false)}>Cancelar</Btn><Btn onClick={guardar} loading={creando}>Crear usuario</Btn></>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Field label="Nombre completo"><input value={form.nombre||''} onChange={f('nombre')} placeholder="Juan Pérez" /></Field>
          <Field label="Usuario (login)"><input value={form.usuario||''} onChange={f('usuario')} placeholder="jperez" /></Field>
          <Field label="Email"><input type="email" value={form.email||''} onChange={f('email')} placeholder="j@empresa.com" /></Field>
          <Field label="Contraseña"><input type="password" value={form.password||''} onChange={f('password')} placeholder="Mínimo 8 caracteres" /></Field>
          <Field label="Rol">
            <select value={form.rol} onChange={f('rol')}>
              {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </Field>
        </div>
      </Modal>
    </div>
  )
}
