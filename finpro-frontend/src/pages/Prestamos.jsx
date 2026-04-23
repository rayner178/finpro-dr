// src/pages/Prestamos.jsx
import { useState } from 'react'
import { useApi, useMutation } from '../hooks/useApi'
import { prestamos as prestamosApi, clientes as clientesApi } from '../api/client'
import PrestamDetail from '../components/PrestamDetail'
import {
  Btn, Modal, Field, PageHeader, Section, StatusBadge, FilterTabs,
  Empty, FullPageSpinner, fmt, fmtDate, fmtPct, ProgressBar, toast
} from '../components/UI'

const TIPOS = ['diario','semanal','quincenal','mensual']

export default function Prestamos() {
  const [filtro,  setFiltro]  = useState('todos')
  const [modal,   setModal]   = useState(false)
  const [detail,  setDetail]  = useState(null)
  const [sim,     setSim]     = useState(null)  // resultado simulación
  const [form,    setForm]    = useState({ monto_principal: 10000, tipo_prestamo: 'semanal', num_cuotas: 12, tasa_mensual: 8 })

  const { data, loading, refetch } = useApi(() => prestamosApi.listar({ estado: filtro === 'todos' ? '' : filtro, limite: 100 }))
  const { data: clData }           = useApi(() => clientesApi.listar({ limite: 200 }))
  const { mutate: simular, loading: simulando } = useMutation(prestamosApi.simular)
  const { mutate: crear,   loading: creando   } = useMutation(prestamosApi.crear)

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }))

  const handleSimular = async () => {
    const res = await simular(form)
    if (res.ok) setSim(res.data)
    else toast.error(res.error)
  }

  const handleCrear = async () => {
    if (!form.cliente_id) { toast.error('Selecciona un cliente'); return }
    const res = await crear(form)
    if (res.ok) {
      toast.success('Préstamo aprobado y desembolsado')
      setModal(false); setSim(null); setForm({ monto_principal: 10000, tipo_prestamo: 'semanal', num_cuotas: 12, tasa_mensual: 8 })
      refetch()
    } else toast.error(res.error)
  }

  const prestamos = data?.datos || []
  const estados   = ['activo','pagado','vencido','pendiente']
  const tabs = [
    { value: 'todos', label: 'Todos', count: prestamos.length },
    ...estados.map(e => ({ value: e, label: e.charAt(0).toUpperCase()+e.slice(1), count: prestamos.filter(p=>p.estado===e).length }))
  ]

  return (
    <div className="animate-up">
      <PageHeader
        title="Préstamos"
        sub={`${data?.total ?? 0} en el sistema`}
        action={<Btn onClick={() => setModal(true)}>+ Nuevo préstamo</Btn>}
      />

      <FilterTabs options={tabs} value={filtro} onChange={setFiltro} />

      {loading ? <FullPageSpinner /> : prestamos.length === 0
        ? <Empty icon="📋" text="Sin préstamos" sub="Crea el primer préstamo" />
        : (
          <Section>
            <table>
              <thead>
                <tr><th>Cliente</th><th>Tipo</th><th>Capital</th><th>Cuota</th><th>Progreso</th><th>TEA</th><th>Atraso</th><th>Estado</th><th></th></tr>
              </thead>
              <tbody>
                {prestamos.map(p => {
                  const pct = p.monto_total > 0 ? Math.round(((p.monto_total - p.saldo_pendiente) / p.monto_total) * 100) : 0
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.cliente_nombre}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>#{p.id} · {fmtDate(p.fecha_aprobacion)}</div>
                      </td>
                      <td><span style={{ fontSize: '11px', textTransform: 'capitalize', color: 'var(--text2)' }}>{p.tipo_prestamo}</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{fmt(p.monto_principal)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>{fmt(p.cuota_monto)}</td>
                      <td style={{ minWidth: '100px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <ProgressBar value={pct} color={pct === 100 ? 'var(--green)' : 'var(--blue)'} />
                          <span style={{ fontSize: '11px', minWidth: '28px', color: 'var(--text2)' }}>{pct}%</span>
                        </div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--amber)' }}>{fmtPct(p.tasa_tea)}</td>
                      <td>
                        {p.dias_atraso > 0
                          ? <span style={{ fontSize: '12px', color: 'var(--red)', fontWeight: 700 }}>{p.dias_atraso}d</span>
                          : <span style={{ color: 'var(--text3)', fontSize: '12px' }}>—</span>
                        }
                      </td>
                      <td><StatusBadge estado={p.estado} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <Btn variant="ghost" size="xs" onClick={() => setDetail(p)}>Ver</Btn>
                          <Btn variant="ghost" size="xs" onClick={() => window.open(prestamosApi.contratoUrl(p.id))}>PDF</Btn>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </Section>
        )
      }

      {/* Modal crear préstamo */}
      <Modal open={modal} onClose={() => { setModal(false); setSim(null) }} title="Nuevo préstamo" width={600}
        footer={sim
          ? <><Btn variant="secondary" onClick={() => setSim(null)}>Recalcular</Btn><Btn variant="success" onClick={handleCrear} loading={creando}>✓ Aprobar y desembolsar</Btn></>
          : <><Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn><Btn onClick={handleSimular} loading={simulando}>Calcular simulación</Btn></>
        }>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Field label="Cliente" half>
            <select value={form.cliente_id||''} onChange={f('cliente_id')}>
              <option value="">Seleccionar cliente...</option>
              {(clData?.datos||[]).filter(c=>c.estado!=='bloqueado').map(c =>
                <option key={c.id} value={c.id}>{c.nombre} — Score: {c.score}</option>
              )}
            </select>
          </Field>
          <Field label="Tipo de préstamo" half>
            <select value={form.tipo_prestamo} onChange={f('tipo_prestamo')}>
              {TIPOS.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase()+t.slice(1)}</option>)}
            </select>
          </Field>
          <Field label="Monto a prestar (DOP)" half>
            <input type="number" value={form.monto_principal} onChange={f('monto_principal')} min="500" />
          </Field>
          <Field label="Número de cuotas" half>
            <input type="number" value={form.num_cuotas} onChange={f('num_cuotas')} min="1" max="360" />
          </Field>
          <Field label="Tasa mensual (%)" half note="Interés mensual sobre el capital">
            <input type="number" step="0.1" value={form.tasa_mensual} onChange={f('tasa_mensual')} />
          </Field>
          <Field label="Propósito del préstamo" half>
            <input value={form.proposito||''} onChange={f('proposito')} placeholder="Negocio, personal, etc." />
          </Field>
        </div>

        {/* Resultado simulación */}
        {sim && (
          <div style={{ marginTop: '4px', background: 'var(--surface2)', borderRadius: 'var(--r)', border: '1px solid var(--border)', overflow: 'hidden' }}>
            <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)', fontFamily: 'var(--font-head)', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em' }}>Resultado de simulación</div>
            {[
              ['Cuota por período', fmt(sim.cuota_monto), 'var(--text)'],
              ['Total a pagar',     fmt(sim.monto_total), 'var(--text)'],
              ['Total en intereses',fmt(sim.total_intereses), 'var(--amber)'],
            ].map(([k, v, c]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: '1px solid var(--border)', fontSize: '13px' }}>
                <span style={{ color: 'var(--text2)' }}>{k}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600, color: c }}>{v}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', padding: '14px 16px', background: 'rgba(248,113,113,.06)' }}>
              <div>
                <div style={{ fontSize: '11px', color: 'var(--text3)', fontFamily: 'var(--font-head)', textTransform: 'uppercase', letterSpacing: '.08em' }}>TEA — Ley 288-05 RD</div>
                <div style={{ fontSize: '10px', color: 'var(--text3)', marginTop: '2px' }}>{sim.transparencia?.descripcion}</div>
              </div>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '20px', color: 'var(--red)' }}>{fmtPct(sim.tasa_tea)}</span>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal detalle */}
      <Modal open={!!detail} onClose={() => setDetail(null)} title={`Préstamo #${detail?.id}`} width={680}>
        {detail && <PrestamDetail id={detail.id} onClose={() => setDetail(null)} />}
      </Modal>
    </div>
  )
}
