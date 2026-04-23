// src/pages/Reportes.jsx
import { useState } from 'react'
import { useApi } from '../hooks/useApi'
import { reportes as reportesApi } from '../api/client'
import { Btn, Card, KPI, Section, FullPageSpinner, fmt, fmtPct, toast } from '../components/UI'

export default function Reportes() {
  const [mes,  setMes]  = useState(new Date().getMonth() + 1)
  const [anio, setAnio] = useState(new Date().getFullYear())

  const { data: sib, loading: sibLoading } = useApi(() => reportesApi.sib(mes, anio), [mes, anio])

  const REPORTES = [
    { titulo: 'Cartera activa',    desc: 'Todos los préstamos activos con saldos', icon: '📋', onPdf: () => reportesApi.cartActiva('pdf'),  onJson: () => reportesApi.cartActiva() },
    { titulo: 'Cartera vencida',   desc: 'Préstamos con días de atraso',           icon: '⚠️', onPdf: () => reportesApi.cartVencida('pdf'), onJson: () => reportesApi.cartVencida() },
    { titulo: 'Caja del período',  desc: 'Movimientos de entrada y salida',         icon: '💰', onPdf: () => toast.info('Exportación PDF próximamente'), onJson: () => {} },
    { titulo: 'Reporte SIB',       desc: 'Formato Superintendencia de Bancos RD',   icon: '🏛️', onPdf: () => toast.info('Descarga SIB próximamente'), onJson: () => {} },
    { titulo: 'Estado de clientes',desc: 'Lista completa de clientes y scores',     icon: '👥', onPdf: () => toast.info('Próximamente'), onJson: () => {} },
    { titulo: 'Auditoría',         desc: 'Registro completo de acciones del sistema',icon: '🔐', onPdf: () => toast.info('Próximamente'), onJson: () => reportesApi.auditoria() },
  ]

  return (
    <div className="animate-up">
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ fontFamily: 'var(--font-head)', fontSize: '24px', fontWeight: 700 }}>Reportes regulatorios</h1>
        <p style={{ color: 'var(--text2)', fontSize: '13px', marginTop: '4px' }}>Exportación a PDF y Excel · Cumplimiento Ley 288-05 RD</p>
      </div>

      {/* Grilla de reportes */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(270px,1fr))', gap: '14px', marginBottom: '32px' }}>
        {REPORTES.map(r => (
          <Card key={r.titulo} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '28px' }}>{r.icon}</div>
            <div>
              <div style={{ fontFamily: 'var(--font-head)', fontWeight: 700, fontSize: '14px', marginBottom: '4px' }}>{r.titulo}</div>
              <div style={{ fontSize: '12px', color: 'var(--text2)' }}>{r.desc}</div>
            </div>
            <div style={{ display: 'flex', gap: '8px', marginTop: 'auto' }}>
              <Btn variant="secondary" size="sm" onClick={r.onPdf}>↓ PDF</Btn>
              <Btn variant="secondary" size="sm" onClick={r.onJson}>↓ Excel</Btn>
            </div>
          </Card>
        ))}
      </div>

      {/* Reporte SIB período */}
      <div style={{ marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: '16px', fontWeight: 700 }}>Reporte SIB por período</h2>
        <select value={mes}  onChange={e=>setMes(e.target.value)}  style={{ width: '130px' }}>
          {['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
            .map((m,i) => <option key={i} value={i+1}>{m}</option>)}
        </select>
        <select value={anio} onChange={e=>setAnio(e.target.value)} style={{ width: '90px' }}>
          {[2024,2025,2026].map(a => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      {sibLoading ? <FullPageSpinner text="Generando reporte..." /> : sib && (
        <div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '12px', marginBottom: '20px' }}>
            <KPI label="Total cobrado"     value={fmt(sib.cobros_periodo?.total_cobrado)}    color="var(--green)"  />
            <KPI label="Mora cobrada"      value={fmt(sib.cobros_periodo?.mora_cobrada)}     color="var(--red)"    />
            <KPI label="Total pagos"       value={sib.cobros_periodo?.total_pagos}           color="var(--blue)"   />
            <KPI label="Nuevos clientes"   value={sib.nuevos_clientes?.nuevos_clientes}      color="var(--amber)"  />
          </div>

          <Section title="Cartera por tipo de préstamo">
            <table>
              <thead><tr><th>Tipo</th><th>Cantidad</th><th>Monto otorgado</th><th>Saldo vigente</th><th>Saldo mora</th><th>Tasa prom.</th><th>TEA prom.</th></tr></thead>
              <tbody>
                {(sib.cartera_por_tipo||[]).map(r => (
                  <tr key={r.tipo_prestamo}>
                    <td style={{ textTransform: 'capitalize', fontWeight: 600 }}>{r.tipo_prestamo}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{r.cantidad}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{fmt(r.monto_otorgado)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>{fmt(r.saldo_vigente)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>{fmt(r.saldo_mora)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--amber)' }}>{fmtPct(r.tasa_promedio)}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--red)' }}>{fmtPct(r.tea_promedio)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>
        </div>
      )}
    </div>
  )
}
