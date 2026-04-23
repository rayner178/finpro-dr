// src/pages/Mora.jsx
import { useMutation } from '../hooks/useApi'
import { useApi } from '../hooks/useApi'
import { mora as moraApi } from '../api/client'
import { Btn, KPI, Section, StatusBadge, Empty, FullPageSpinner, fmt, fmtDate, toast, useConfirm } from '../components/UI'

export default function Mora() {
  const { data: morosos, loading, refetch } = useApi(() => moraApi.listar())
  const { mutate: notificar, loading: notificando } = useMutation(moraApi.notificarMasivo)
  const { mutate: bloquear }                        = useMutation((id) => moraApi.bloquear(id))
  const { confirm, Dialog }                         = useConfirm()

  const lista = morosos || []
  const tasaMoraDiaria = parseFloat(import.meta.env.VITE_MORA_TASA || 0.003)

  const handleNotificar = async () => {
    const ok = await confirm('Se enviará SMS/WhatsApp a todos los clientes con atraso. ¿Continuar?', 'Notificación masiva de mora')
    if (!ok) return
    const res = await notificar()
    if (res.ok) toast.success(`${res.data.exitosos} notificaciones enviadas`)
    else toast.error(res.error)
  }

  const handleBloquear = async (clienteId, nombre) => {
    const ok = await confirm(`¿Bloquear al cliente ${nombre}? No podrá recibir nuevos préstamos.`, 'Bloquear cliente')
    if (!ok) return
    const res = await bloquear(clienteId)
    if (res.ok) { toast.success('Cliente bloqueado'); refetch() }
    else toast.error(res.error)
  }

  return (
    <div className="animate-up">
      {Dialog}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '28px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '24px', fontWeight: 700 }}>Control de mora</h1>
          <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>{lista.length} préstamos con atraso</p>
        </div>
        <Btn variant="amber" onClick={handleNotificar} loading={notificando}>📱 Notificar todos</Btn>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(170px,1fr))', gap: '14px', marginBottom: '24px' }}>
        <KPI label="1–7 días"     value={lista.filter(p=>p.dias_atraso<=7).length}              color="var(--amber)" icon="🟡" />
        <KPI label="8–30 días"    value={lista.filter(p=>p.dias_atraso>7&&p.dias_atraso<=30).length} color="var(--red)" icon="🔴" />
        <KPI label="+30 días"     value={lista.filter(p=>p.dias_atraso>30).length}              color="#7c2d2d"      icon="🚨" />
        <KPI label="Monto en riesgo" value={fmt(lista.reduce((s,p)=>s+Number(p.saldo_pendiente||0),0))} color="var(--red)" icon="💸" />
      </div>

      {loading ? <FullPageSpinner /> : lista.length === 0
        ? <div style={{ textAlign: 'center', padding: '60px', color: 'var(--green)' }}>
            <div style={{ fontSize: '36px', marginBottom: '12px' }}>✓</div>
            <div style={{ fontFamily: 'var(--font-head)', fontSize: '18px', fontWeight: 700 }}>Sin préstamos en mora</div>
          </div>
        : (
          <Section>
            <table>
              <thead><tr><th>Cliente</th><th>Préstamo</th><th>Días atraso</th><th>Saldo</th><th>Penalidad/día</th><th>Mora total</th><th>Acciones</th></tr></thead>
              <tbody>
                {lista.map(p => {
                  const saldo    = Number(p.saldo_pendiente || 0)
                  const penDia   = saldo * tasaMoraDiaria
                  const moraTot  = penDia * Number(p.dias_atraso || 0)
                  const diasColor = p.dias_atraso > 30 ? 'var(--red)' : p.dias_atraso > 7 ? 'var(--amber)' : 'var(--text2)'
                  return (
                    <tr key={p.id}>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{p.cliente_nombre}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text3)' }}>{p.cedula}</div>
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px' }}>#{p.id} · {fmt(p.monto_principal)}</td>
                      <td><span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: diasColor, fontSize: '14px' }}>{p.dias_atraso}d</span></td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--red)', fontWeight: 600 }}>{fmt(saldo)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', color: 'var(--amber)' }}>{fmt(penDia)}</td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '13px', color: 'var(--red)', fontWeight: 700 }}>{fmt(moraTot)}</td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <Btn variant="danger" size="xs" onClick={() => handleBloquear(p.cliente_id, p.cliente_nombre)}>Bloquear</Btn>
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
    </div>
  )
}
