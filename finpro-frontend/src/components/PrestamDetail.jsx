// src/components/PrestamDetail.jsx
// Loan detail panel — used inside Prestamos.jsx modal
import { useApi }      from '../hooks/useApi'
import { prestamos as prestamosApi } from '../api/client'
import { FullPageSpinner, StatusBadge, ProgressBar, fmt, fmtDate, fmtPct } from './UI'

export default function PrestamDetail({ id }) {
  const { data, loading } = useApi(() => prestamosApi.obtener(id), [id])

  if (loading) return <FullPageSpinner text="Cargando préstamo..." />
  if (!data)   return <div style={{ color: 'var(--text2)' }}>No encontrado</div>

  const tabla = data.tabla_amortizacion || []
  const pct   = data.monto_total > 0
    ? Math.round(((data.monto_total - data.saldo_pendiente) / data.monto_total) * 100)
    : 0

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '20px' }}>
        {[
          ['Cliente',       data.cliente_nombre],
          ['Cédula',        data.cedula],
          ['Tipo',          data.tipo_prestamo],
          ['Monto',         fmt(data.monto_principal)],
          ['Cuota',         fmt(data.cuota_monto)],
          ['Total a pagar', fmt(data.monto_total)],
          ['TEA',           fmtPct(data.tasa_tea)],
          ['Vencimiento',   fmtDate(data.fecha_vencimiento)],
        ].map(([k, v]) => (
          <div key={k} style={{ background: 'var(--surface2)', borderRadius: 'var(--r)', padding: '10px 14px' }}>
            <div style={{ fontSize: '10px', color: 'var(--text3)', fontFamily: 'var(--font-head)', textTransform: 'uppercase', letterSpacing: '.07em' }}>{k}</div>
            <div style={{ fontWeight: 600, fontFamily: 'var(--font-mono)', marginTop: '4px', fontSize: '13px' }}>{v}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12px' }}>
          <span style={{ color: 'var(--text2)' }}>Progreso de pago</span>
          <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--blue)' }}>{pct}%</span>
        </div>
        <ProgressBar value={pct} height={8} color="var(--green)" />
      </div>

      <div style={{ fontFamily: 'var(--font-head)', fontSize: '11px', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: '10px' }}>
        Tabla de amortización
      </div>
      <div style={{ maxHeight: '260px', overflow: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--r)' }}>
        <table>
          <thead>
            <tr><th>#</th><th>Fecha</th><th>Capital</th><th>Interés</th><th>Cuota</th><th>Saldo</th><th>Estado</th></tr>
          </thead>
          <tbody>
            {tabla.map(c => (
              <tr key={c.id}>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{c.numero_cuota}</td>
                <td style={{ fontSize: '11px' }}>{fmtDate(c.fecha_vence)}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{fmt(c.capital)}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', color: 'var(--amber)' }}>{fmt(c.interes)}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px', fontWeight: 600 }}>{fmt(c.monto_cuota)}</td>
                <td style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>{fmt(c.saldo_restante)}</td>
                <td><StatusBadge estado={c.estado} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
