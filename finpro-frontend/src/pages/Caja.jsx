// src/pages/Caja.jsx
import { useState } from 'react'
import { useApi, useMutation } from '../hooks/useApi'
import { caja as cajaApi } from '../api/client'
import { Btn, KPI, Modal, Field, Section, StatusBadge, Empty, FullPageSpinner, fmt, fmtDate, toast } from '../components/UI'

export default function Caja() {
  const [modal, setModal] = useState(false)
  const [form,  setForm]  = useState({ tipo: 'entrada', concepto: '', monto: '' })
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])

  const { data, loading, refetch } = useApi(() => cajaApi.listar({ fecha, limite: 100 }), [fecha])
  const { mutate: registrar, loading: guardando } = useMutation(cajaApi.registrar)

  const movs     = Array.isArray(data) ? data : []
  const entradas = movs.filter(m=>m.tipo==='entrada').reduce((s,m)=>s+Number(m.monto),0)
  const salidas  = movs.filter(m=>m.tipo==='salida').reduce((s,m)=>s+Number(m.monto),0)
  const saldo    = entradas - salidas

  const guardar = async () => {
    if (!form.concepto || !form.monto) { toast.error('Concepto y monto requeridos'); return }
    const res = await registrar(form)
    if (res.ok) { toast.success('Movimiento registrado'); setModal(false); setForm({ tipo:'entrada', concepto:'', monto:'' }); refetch() }
    else toast.error(res.error)
  }

  return (
    <div className="animate-up">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '24px', fontWeight: 700 }}>Caja diaria</h1>
          <input type="date" value={fecha} onChange={e=>setFecha(e.target.value)} style={{ marginTop: '8px', width: 'auto', padding: '6px 12px', fontSize: '13px' }} />
        </div>
        <Btn onClick={() => setModal(true)}>+ Movimiento</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '14px', marginBottom: '24px' }}>
        <KPI label="Total entradas" value={fmt(entradas)} color="var(--green)" icon="⬆" />
        <KPI label="Total salidas"  value={fmt(salidas)}  color="var(--red)"   icon="⬇" />
        <KPI label="Saldo en caja"  value={fmt(saldo)}    color={saldo>=0?'var(--blue)':'var(--red)'} icon="💰" />
      </div>

      {loading ? <FullPageSpinner /> : movs.length === 0
        ? <Empty icon="💰" text="Sin movimientos en esta fecha" />
        : (
          <Section>
            <table>
              <thead><tr><th>Tipo</th><th>Concepto</th><th>Monto</th><th>Usuario</th><th>Hora</th></tr></thead>
              <tbody>
                {movs.map(m => (
                  <tr key={m.id}>
                    <td><StatusBadge estado={m.tipo} /></td>
                    <td style={{ fontSize: '13px', maxWidth: '300px' }}>{m.concepto}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '13px', color: m.tipo==='entrada'?'var(--green)':'var(--red)' }}>
                      {m.tipo==='entrada'?'+':'-'}{fmt(m.monto)}
                    </td>
                    <td style={{ fontSize: '12px' }}>{m.usuario_nombre}</td>
                    <td style={{ fontSize: '11px', color: 'var(--text3)' }}>{new Date(m.created_at).toLocaleTimeString('es-DO',{hour:'2-digit',minute:'2-digit'})}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        )
      }

      <Modal open={modal} onClose={() => setModal(false)} title="Registrar movimiento" width={420}
        footer={<><Btn variant="secondary" onClick={()=>setModal(false)}>Cancelar</Btn><Btn onClick={guardar} loading={guardando}>Registrar</Btn></>}>
        <Field label="Tipo">
          <select value={form.tipo} onChange={e=>setForm(p=>({...p,tipo:e.target.value}))}>
            <option value="entrada">Entrada</option>
            <option value="salida">Salida</option>
          </select>
        </Field>
        <Field label="Concepto"><input value={form.concepto} onChange={e=>setForm(p=>({...p,concepto:e.target.value}))} placeholder="Descripción del movimiento" /></Field>
        <Field label="Monto (RD$)"><input type="number" value={form.monto} onChange={e=>setForm(p=>({...p,monto:e.target.value}))} /></Field>
      </Modal>
    </div>
  )
}
