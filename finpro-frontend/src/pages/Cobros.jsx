// src/pages/Cobros.jsx
import { useState } from 'react'
import { useApi, useMutation } from '../hooks/useApi'
import { pagos as pagosApi, prestamos as prestamosApi } from '../api/client'
import { Btn, Modal, Field, PageHeader, Section, StatusBadge, Empty, FullPageSpinner, fmt, fmtDate, toast } from '../components/UI'

export default function Cobros() {
  const [modal, setModal] = useState(false)
  const [form,  setForm]  = useState({ tipo_pago: 'cuota', metodo_pago: 'efectivo' })

  const { data, loading, refetch } = useApi(() => pagosApi.listar({ limite: 100 }))
  const { data: prestData }        = useApi(() => prestamosApi.listar({ estado: 'activo', limite: 200 }))
  const { mutate: registrar, loading: guardando } = useMutation(pagosApi.registrar)

  const f = k => e => setForm(p => ({ ...p, [k]: e.target.value }))

  const selPrestamo = (e) => {
    const p = (prestData?.datos||[]).find(x => String(x.id) === e.target.value)
    setForm(prev => ({ ...prev, prestamo_id: e.target.value, monto: p ? p.cuota_monto : '' }))
  }

  const guardar = async () => {
    if (!form.prestamo_id || !form.monto) { toast.error('Préstamo y monto son requeridos'); return }
    const res = await registrar(form)
    if (res.ok) {
      toast.success(`Pago registrado — ${res.data.numero_recibo}`)
      setModal(false); setForm({ tipo_pago: 'cuota', metodo_pago: 'efectivo' }); refetch()
    } else toast.error(res.error)
  }

  const pagos = data?.datos || []

  return (
    <div className="animate-up">
      <PageHeader title="Cobros y pagos" sub={`${data?.total ?? 0} pagos registrados`}
        action={<Btn onClick={() => setModal(true)}>+ Registrar pago</Btn>} />

      {loading ? <FullPageSpinner /> : pagos.length === 0 ? <Empty icon="💳" text="Sin pagos registrados" /> : (
        <Section>
          <table>
            <thead><tr><th>Recibo</th><th>Cliente</th><th>Monto</th><th>Tipo pago</th><th>Método</th><th>Cobrador</th><th>Fecha</th><th></th></tr></thead>
            <tbody>
              {pagos.map(p => (
                <tr key={p.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--blue)' }}>{p.numero_recibo}</td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.cliente_nombre}</div>
                    <div style={{ fontSize: '11px', color: 'var(--text3)' }}>Préstamo #{p.prestamo_id}</div>
                  </td>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', fontWeight: 700, color: 'var(--green)' }}>{fmt(p.monto)}</td>
                  <td><span className="badge badge-blue">{p.tipo_pago}</span></td>
                  <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{p.metodo_pago}</td>
                  <td style={{ fontSize: '12px' }}>{p.cobrador_nombre}</td>
                  <td style={{ fontSize: '12px', color: 'var(--text2)' }}>{fmtDate(p.fecha_pago)}</td>
                  <td>
                    <Btn variant="ghost" size="xs" onClick={() => window.open(pagosApi.reciboUrl(p.id))}>🖨 Recibo</Btn>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Registrar pago" width={500}
        footer={<>
          <Btn variant="secondary" onClick={() => setModal(false)}>Cancelar</Btn>
          <Btn onClick={guardar} loading={guardando}>Registrar y generar recibo</Btn>
        </>}>
        <Field label="Préstamo activo">
          <select value={form.prestamo_id||''} onChange={selPrestamo}>
            <option value="">Seleccionar préstamo...</option>
            {(prestData?.datos||[]).map(p => (
              <option key={p.id} value={p.id}>#{p.id} · {p.cliente_nombre} · Cuota: {fmt(p.cuota_monto)}</option>
            ))}
          </select>
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
          <Field label="Monto recibido (DOP)" half>
            <input type="number" value={form.monto||''} onChange={f('monto')} />
          </Field>
          <Field label="Tipo de pago" half>
            <select value={form.tipo_pago} onChange={f('tipo_pago')}>
              <option value="cuota">Cuota regular</option>
              <option value="abono">Abono a capital</option>
              <option value="cancelacion">Cancelación total</option>
              <option value="mora">Pago de mora</option>
            </select>
          </Field>
          <Field label="Método de pago" half>
            <select value={form.metodo_pago} onChange={f('metodo_pago')}>
              <option value="efectivo">Efectivo</option>
              <option value="transferencia">Transferencia</option>
              <option value="cheque">Cheque</option>
              <option value="tarjeta">Tarjeta</option>
            </select>
          </Field>
        </div>
        <Field label="Notas (opcional)">
          <textarea value={form.notas||''} onChange={f('notas')} rows={2} placeholder="Observaciones del pago..." />
        </Field>
      </Modal>
    </div>
  )
}
