// src/pages/Clientes.jsx
import { useState } from 'react'
import { useApi, useMutation } from '../hooks/useApi'
import { clientes as clientesApi } from '../api/client'
import {
  Btn, Card, Modal, Field, PageHeader, Section, StatusBadge, Avatar,
  ScoreBadge, Empty, FullPageSpinner, fmt, fmtDate, toast, useConfirm
} from '../components/UI'

export default function Clientes() {
  const [search, setSearch] = useState('')
  const [estado, setEstado] = useState('')
  const [modal,  setModal]  = useState(false)
  const [detail, setDetail] = useState(null)
  const [form,   setForm]   = useState({})
  const { confirm, Dialog } = useConfirm()

  const { data, loading, refetch } = useApi(
    () => clientesApi.listar({ buscar: search, estado, limite: 50 }),
    [search, estado]
  )
  const { mutate: crear, loading: creando } = useMutation(clientesApi.crear)

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const guardar = async () => {
    if (!form.cedula || !form.nombre) { toast.error('Cédula y nombre son requeridos'); return }
    const res = await crear(form)
    if (res.ok) {
      toast.success(`Cliente ${form.nombre} registrado`)
      setModal(false); setForm({}); refetch()
    } else toast.error(res.error)
  }

  const clientes = data?.datos || []

  return (
    <div className="animate-up">
      {Dialog}
      <PageHeader
        title="Clientes"
        sub={`${data?.total ?? 0} clientes registrados`}
        action={<Btn onClick={() => setModal(true)}>+ Nuevo cliente</Btn>}
      />

      {/* Búsqueda + filtros */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '18px', flexWrap: 'wrap' }}>
        <input placeholder="🔍  Buscar por nombre o cédula..." value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: '320px', flex: '1 1 200px' }} />
        <select value={estado} onChange={e => setEstado(e.target.value)} style={{ width: '160px' }}>
          <option value="">Todos los estados</option>
          <option value="activo">Activo</option>
          <option value="moroso">Moroso</option>
          <option value="bloqueado">Bloqueado</option>
        </select>
      </div>

      {loading ? <FullPageSpinner /> : clientes.length === 0 ? <Empty icon="👥" text="No hay clientes" sub="Registra el primer cliente" /> : (
        <Section>
          <table>
            <thead>
              <tr>
                <th>Cliente</th><th>Cédula</th><th>Teléfono</th>
                <th>Score</th><th>Préstamos</th><th>Estado</th><th></th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c, i) => {
                const initials = c.nombre.split(' ').map(n => n[0]).join('').slice(0,2).toUpperCase()
                const color = c.estado === 'moroso' || c.estado === 'bloqueado' ? 'var(--red)' : 'var(--blue)'
                return (
                  <tr key={c.id} style={{ animationDelay: `${i * 0.03}s` }}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Avatar initials={initials} size={32} color={color} />
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '13px' }}>{c.nombre}</div>
                          <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{c.email}</div>
                        </div>
                      </div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{c.cedula}</td>
                    <td style={{ fontSize: '13px' }}>{c.telefono}</td>
                    <td style={{ minWidth: '120px' }}><ScoreBadge score={c.score} /></td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', textAlign: 'center' }}>{c.total_prestamos ?? 0}</td>
                    <td><StatusBadge estado={c.estado} /></td>
                    <td><Btn variant="ghost" size="xs" onClick={() => setDetail(c)}>Ver →</Btn></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </Section>
      )}

      {/* Modal crear */}
      <Modal open={modal} onClose={() => { setModal(false); setForm({}) }} title="Registrar nuevo cliente" width={580}
        footer={<>
          <Btn variant="secondary" onClick={() => { setModal(false); setForm({}) }}>Cancelar</Btn>
          <Btn onClick={guardar} loading={creando}>Registrar cliente</Btn>
        </>}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Field label="Nombre completo"><input value={form.nombre||''} onChange={f('nombre')} placeholder="María González" /></Field>
          <Field label="Cédula de identidad"><input value={form.cedula||''} onChange={f('cedula')} placeholder="001-1234567-8" /></Field>
          <Field label="Teléfono principal"><input value={form.telefono||''} onChange={f('telefono')} placeholder="809-555-0100" /></Field>
          <Field label="Teléfono secundario"><input value={form.telefono2||''} onChange={f('telefono2')} placeholder="Optional" /></Field>
          <Field label="Email"><input type="email" value={form.email||''} onChange={f('email')} placeholder="cliente@email.com" /></Field>
          <Field label="Ocupación"><input value={form.ocupacion||''} onChange={f('ocupacion')} placeholder="Comerciante" /></Field>
          <Field label="Ingresos mensuales (RD$)"><input type="number" value={form.ingresos_mensual||''} onChange={f('ingresos_mensual')} placeholder="25000" /></Field>
          <Field label="Fecha de nacimiento"><input type="date" value={form.fecha_nac||''} onChange={f('fecha_nac')} /></Field>
        </div>
        <Field label="Dirección"><input value={form.direccion||''} onChange={f('direccion')} placeholder="Calle, sector, ciudad" /></Field>
        <Field label="Referencias personales">
          <textarea value={form.referencias||''} onChange={f('referencias')} rows={2}
            placeholder="Nombre y teléfono de persona de referencia" />
        </Field>
      </Modal>

      {/* Modal detalle */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title="Expediente del cliente" width={560}>
        {detail && (
          <div>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', padding: '16px', background: 'var(--surface2)', borderRadius: 'var(--r)', marginBottom: '20px' }}>
              <Avatar initials={detail.nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()} size={52} />
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: '18px', fontWeight: 700 }}>{detail.nombre}</div>
                <div style={{ fontSize: '12px', color: 'var(--text2)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>{detail.cedula}</div>
                <div style={{ marginTop: '8px' }}><StatusBadge estado={detail.estado} /></div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '36px', fontWeight: 800, fontFamily: 'var(--font-head)', color: detail.score >= 80 ? 'var(--green)' : detail.score >= 60 ? 'var(--amber)' : 'var(--red)' }}>{detail.score}</div>
                <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--font-head)', letterSpacing: '.08em' }}>SCORE</div>
              </div>
            </div>

            {[
              ['Teléfono', detail.telefono],
              ['Email', detail.email],
              ['Dirección', detail.direccion],
              ['Ocupación', detail.ocupacion],
              ['Ingresos mensuales', detail.ingresos_mensual ? fmt(detail.ingresos_mensual) : '—'],
              ['Referencias', detail.referencias],
              ['Registrado', fmtDate(detail.created_at)],
              ['Sucursal', detail.sucursal_nombre],
            ].map(([k, v]) => v && (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                <span style={{ color: 'var(--text2)' }}>{k}</span>
                <span style={{ fontWeight: 500, textAlign: 'right', maxWidth: '65%' }}>{v}</span>
              </div>
            ))}

            {detail.historial_prestamos?.length > 0 && (
              <div style={{ marginTop: '20px' }}>
                <div style={{ fontFamily: 'var(--font-head)', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.1em', marginBottom: '10px' }}>Historial de préstamos</div>
                {detail.historial_prestamos.slice(0, 5).map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--surface2)', borderRadius: 'var(--r)', marginBottom: '6px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text2)' }}>#{p.id} · {p.tipo_prestamo}</span>
                    <span style={{ fontFamily: 'var(--font-mono)' }}>{fmt(p.monto_principal)}</span>
                    <StatusBadge estado={p.estado} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
