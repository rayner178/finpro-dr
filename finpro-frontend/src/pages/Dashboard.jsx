// src/pages/Dashboard.jsx
import { useNavigate } from 'react-router-dom'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useApi } from '../hooks/useApi'
import { reportes as reportesApi } from '../api/client'
import { KPI, Card, Section, FullPageSpinner, StatusBadge, fmt, fmtDate, fmtPct } from '../components/UI'

// TODO: Replace with real data from GET /api/reportes/tendencia (6-month aggregation).
// Endpoint is not yet implemented in the backend; add it to reportes.routes.js when ready.
// Shape: [{ mes: string, prestado: number, cobrado: number }]
const TENDENCIA = [
  { mes: 'Jul', prestado: 180000, cobrado: 140000 },
  { mes: 'Ago', prestado: 210000, cobrado: 175000 },
  { mes: 'Sep', prestado: 195000, cobrado: 185000 },
  { mes: 'Oct', prestado: 240000, cobrado: 210000 },
  { mes: 'Nov', prestado: 280000, cobrado: 245000 },
  { mes: 'Dic', prestado: 310000, cobrado: 270000 },
]

const PIE_COLORS = ['var(--blue)', 'var(--green)', 'var(--amber)', 'var(--indigo)']

export default function Dashboard() {
  const navigate = useNavigate()
  const { data, loading } = useApi(() => reportesApi.dashboard())

  if (loading) return <FullPageSpinner text="Cargando dashboard..." />

  const kpi        = data?.cartera   || {}
  const moraData   = data?.mora      || {}
  const cajaData   = data?.caja      || {}
  const clientData = data?.clientes  || {}
  const dist       = data?.distribucion_tipo || []

  return (
    <div className="animate-up">
      {/* KPIs row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
        <KPI label="Total prestado"   value={fmt(kpi.total_prestado)}   sub={`${kpi.total_prestamos} préstamos`}            color="var(--blue)"   icon="💼" />
        <KPI label="Por cobrar"       value={fmt(kpi.total_por_cobrar)} sub={`${kpi.prestamos_activos} activos`}             color="var(--indigo)" icon="📋" />
        <KPI label="Cobrado hoy"      value={fmt(cajaData.entradas_hoy)}sub={`Saldo: ${fmt(cajaData.saldo_hoy)}`}            color="var(--green)"  icon="💵" />
        <KPI label="Cartera en riesgo"value={fmt(kpi.cartera_vencida)}  sub={`Mora: ${fmtPct(moraData.tasa_morosidad)}`}    color="var(--red)"    icon="⚠️" />
        <KPI label="Clientes activos" value={clientData.activos}        sub={`${clientData.morosos || 0} morosos`}           color="var(--amber)"  icon="👥" />
      </div>

      {/* Charts row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '16px', marginBottom: '24px' }}>
        {/* Area chart */}
        <Card>
          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '13px', fontWeight: 700, marginBottom: '20px', color: 'var(--text2)' }}>TENDENCIA ÚLTIMOS 6 MESES</h3>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={TENDENCIA}>
              <defs>
                <linearGradient id="gBlue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--blue)"  stopOpacity={0.25} />
                  <stop offset="95%" stopColor="var(--blue)"  stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gGreen" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--green)" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="var(--green)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="mes" tick={{ fill: 'var(--text3)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'var(--text3)', fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }}
                labelStyle={{ color: 'var(--text)', fontFamily: 'var(--font-head)' }}
                formatter={(v, n) => [fmt(v), n === 'prestado' ? 'Prestado' : 'Cobrado']}
              />
              <Area type="monotone" dataKey="prestado" stroke="var(--blue)"  strokeWidth={2} fill="url(#gBlue)"  />
              <Area type="monotone" dataKey="cobrado"  stroke="var(--green)" strokeWidth={2} fill="url(#gGreen)" />
            </AreaChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
            {[['var(--blue)','Prestado'],['var(--green)','Cobrado']].map(([c,l]) => (
              <div key={l} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text2)' }}>
                <div style={{ width: 10, height: 3, background: c, borderRadius: 2 }} />{l}
              </div>
            ))}
          </div>
        </Card>

        {/* Pie chart */}
        <Card>
          <h3 style={{ fontFamily: 'var(--font-head)', fontSize: '13px', fontWeight: 700, marginBottom: '16px', color: 'var(--text2)' }}>POR TIPO</h3>
          {dist.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={150}>
                <PieChart>
                  <Pie data={dist} dataKey="cantidad" nameKey="tipo_prestamo" cx="50%" cy="50%" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {dist.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v, n) => [v, n]} contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '12px' }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {dist.map((d, i) => (
                  <div key={d.tipo_prestamo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                      <span style={{ fontSize: '12px', textTransform: 'capitalize' }}>{d.tipo_prestamo}</span>
                    </div>
                    <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: 'var(--text2)' }}>{d.cantidad}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <div style={{ color: 'var(--text3)', fontSize: '13px', textAlign: 'center', padding: '40px 0' }}>Sin datos</div>}
        </Card>
      </div>

      {/* Mora alerts + mora stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
        {/* Alertas mora */}
        <Section title="⚠ Alertas de mora">
          {moraData.en_mora > 0 ? (
            <div>
              {[
                ['1–7 días',  moraData.mora_1_7,   'var(--amber)'],
                ['8–30 días', moraData.mora_8_30,  'var(--red)'],
                ['+30 días',  moraData.mora_mas_30,'#7c2d2d'],
              ].map(([label, count, color]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: '13px' }}>{label}</span>
                  </div>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color }}>{count ?? 0} préstamos</span>
                </div>
              ))}
              <div style={{ padding: '12px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '12px', color: 'var(--text2)' }}>Mora acumulada</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--red)' }}>{fmt(moraData.mora_total_acumulada)}</span>
              </div>
            </div>
          ) : (
            <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--green)' }}>
              <div style={{ fontSize: '28px', marginBottom: '8px' }}>✓</div>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 600 }}>Sin préstamos en mora</div>
            </div>
          )}
        </Section>

        {/* Caja hoy */}
        <Section title="💰 Caja del día">
          {[
            ['Entradas',   fmt(cajaData.entradas_hoy), 'var(--green)'],
            ['Salidas',    fmt(cajaData.salidas_hoy),  'var(--red)'],
            ['Saldo neto', fmt(cajaData.saldo_hoy),    Number(cajaData.saldo_hoy) >= 0 ? 'var(--blue)' : 'var(--red)'],
          ].map(([label, value, color]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: '1px solid var(--border)' }}>
              <span style={{ fontSize: '13px', color: 'var(--text2)' }}>{label}</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '15px', color }}>{value}</span>
            </div>
          ))}
          <div style={{ padding: '14px 20px' }}>
            <button onClick={() => navigate('/caja')} style={{
              width: '100%', padding: '8px', background: 'var(--surface2)', border: '1px solid var(--border)',
              borderRadius: 'var(--r)', color: 'var(--text2)', fontSize: '12px', fontFamily: 'var(--font-head)',
              fontWeight: 600, cursor: 'pointer', letterSpacing: '.05em'
            }}>VER CAJA COMPLETA →</button>
          </div>
        </Section>
      </div>
    </div>
  )
}
