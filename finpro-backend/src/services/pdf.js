// src/services/pdf.js
// Generación de PDFs con pdfmake
// - Recibo de pago
// - Contrato de préstamo (Ley 288-05)
// - Tabla de amortización

const PdfPrinter = require('pdfmake');
const path = require('path');
const fs = require('fs');

// Fuentes estándar (incluidas en pdfmake)
const fonts = {
  Roboto: {
    normal: path.join(__dirname, '../../node_modules/pdfmake/build/vfs_fonts.js'),
    bold: path.join(__dirname, '../../node_modules/pdfmake/build/vfs_fonts.js'),
  }
};

// Helper: usar pdfmake con fuentes virtuales
const getPrinter = () => {
  // pdfmake incluye fuentes en su VFS
  const vfsFonts = require('pdfmake/build/vfs_fonts');
  const PdfPrinter = require('pdfmake/build/pdfmake');
  PdfPrinter.vfs = vfsFonts.pdfMake.vfs;
  return PdfPrinter;
};

// ── Colores corporativos ────────────────────────────────────
const C = {
  primary: '#1e40af',
  accent: '#3b82f6',
  dark: '#1e293b',
  gray: '#64748b',
  light: '#f1f5f9',
  border: '#e2e8f0',
  success: '#16a34a',
  danger: '#dc2626',
};

const empresa = () => ({
  nombre: process.env.EMPRESA_NOMBRE || 'FinanPro S.R.L.',
  rnc: process.env.EMPRESA_RNC || '1-23-45678-9',
  direccion: process.env.EMPRESA_DIRECCION || 'Santo Domingo, RD',
  telefono: process.env.EMPRESA_TELEFONO || '809-555-0100',
  email: process.env.EMPRESA_EMAIL || 'info@finpro.com.do',
});

// ── RECIBO DE PAGO ──────────────────────────────────────────
const generarRecibo = (data) => {
  const { pago, prestamo, cliente } = data;
  const emp = empresa();

  const docDef = {
    pageSize: { width: 226.77, height: 'auto' }, // 80mm de ancho (rollo térmico)
    pageMargins: [10, 10, 10, 10],
    defaultStyle: { fontSize: 8, font: 'Courier' },
    content: [
      { text: emp.nombre, style: 'header', alignment: 'center' },
      { text: `RNC: ${emp.rnc}`, alignment: 'center', fontSize: 7, color: C.gray },
      { text: emp.telefono, alignment: 'center', fontSize: 7, color: C.gray },
      { canvas: [{ type: 'line', x1: 0, y1: 3, x2: 206, y2: 3, lineWidth: 0.5 }] },
      { text: '\nRECIBO DE PAGO', style: 'title', alignment: 'center' },
      { text: `No. ${pago.numero_recibo}`, alignment: 'center', bold: true, fontSize: 10, color: C.primary },
      { text: ' ', fontSize: 4 },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [{ text: 'Fecha:', color: C.gray, fontSize: 7 }, { text: new Date(pago.fecha_pago).toLocaleDateString('es-DO'), fontSize: 7 }],
            [{ text: 'Cliente:', color: C.gray, fontSize: 7 }, { text: cliente.nombre, fontSize: 7 }],
            [{ text: 'Cédula:', color: C.gray, fontSize: 7 }, { text: cliente.cedula, fontSize: 7 }],
            [{ text: 'Préstamo #:', color: C.gray, fontSize: 7 }, { text: String(prestamo.id), fontSize: 7 }],
            [{ text: 'Tipo:', color: C.gray, fontSize: 7 }, { text: prestamo.tipo_prestamo, fontSize: 7 }],
          ]
        },
        layout: 'noBorders'
      },
      { canvas: [{ type: 'line', x1: 0, y1: 3, x2: 206, y2: 3, lineWidth: 0.5, dash: { length: 3 } }] },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [{ text: 'Capital:', color: C.gray, fontSize: 7 }, { text: `RD$ ${Number(pago.monto_capital||0).toLocaleString('es-DO', {minimumFractionDigits:2})}`, fontSize: 7 }],
            [{ text: 'Interés:', color: C.gray, fontSize: 7 }, { text: `RD$ ${Number(pago.monto_interes||0).toLocaleString('es-DO', {minimumFractionDigits:2})}`, fontSize: 7 }],
            [{ text: 'Mora:', color: pago.monto_mora > 0 ? C.danger : C.gray, fontSize: 7 }, { text: `RD$ ${Number(pago.monto_mora||0).toLocaleString('es-DO', {minimumFractionDigits:2})}`, fontSize: 7, color: pago.monto_mora > 0 ? C.danger : 'black' }],
          ]
        },
        layout: 'noBorders'
      },
      { canvas: [{ type: 'line', x1: 0, y1: 3, x2: 206, y2: 3, lineWidth: 1 }] },
      {
        columns: [
          { text: 'TOTAL PAGADO:', bold: true, fontSize: 9 },
          { text: `RD$ ${Number(pago.monto).toLocaleString('es-DO', {minimumFractionDigits:2})}`, bold: true, fontSize: 11, color: C.primary, alignment: 'right' }
        ]
      },
      { canvas: [{ type: 'line', x1: 0, y1: 4, x2: 206, y2: 4, lineWidth: 0.5 }] },
      { text: `\nSaldo pendiente: RD$ ${Number(prestamo.saldo_pendiente||0).toLocaleString('es-DO', {minimumFractionDigits:2})}`, fontSize: 7, color: C.gray, alignment: 'center' },
      { text: `Cobrador: ${pago.cobrador_nombre || 'Sistema'}`, fontSize: 7, color: C.gray, alignment: 'center' },
      { text: '\n¡Gracias por su pago puntual!', italic: true, alignment: 'center', fontSize: 7, color: C.gray },
      { text: 'Este recibo es válido como comprobante de pago', fontSize: 6, color: C.gray, alignment: 'center' },
    ],
    styles: {
      header: { fontSize: 11, bold: true, color: C.primary },
      title: { fontSize: 9, bold: true },
    }
  };

  return new Promise((resolve, reject) => {
    const pdfmake = getPrinter();
    const doc = pdfmake.createPdf(docDef);
    doc.getBuffer((buffer) => {
      resolve(buffer);
    });
  });
};

// ── CONTRATO DE PRÉSTAMO ────────────────────────────────────
const generarContrato = (data) => {
  const { prestamo, cliente, tablaAmortizacion, resumenTEA } = data;
  const emp = empresa();
  const hoy = new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' });

  const docDef = {
    pageSize: 'LETTER',
    pageMargins: [60, 80, 60, 80],
    header: (page, pages) => ({
      columns: [
        { text: emp.nombre, bold: true, color: C.primary, margin: [60, 20, 0, 0] },
        { text: `Página ${page} de ${pages}`, alignment: 'right', fontSize: 9, color: C.gray, margin: [0, 20, 60, 0] }
      ]
    }),
    footer: {
      columns: [
        { text: `RNC: ${emp.rnc} | ${emp.telefono} | ${emp.email}`, fontSize: 8, color: C.gray, margin: [60, 0] },
      ]
    },
    defaultStyle: { fontSize: 11, lineHeight: 1.4, color: C.dark },
    content: [
      // Título
      { text: 'CONTRATO DE PRÉSTAMO', style: 'titulo', alignment: 'center' },
      { text: `Contrato No. ${prestamo.id} — ${hoy}`, alignment: 'center', fontSize: 10, color: C.gray, margin: [0, 0, 0, 20] },

      // Partes
      { text: 'PARTES CONTRATANTES', style: 'seccion' },
      {
        text: [
          { text: 'PRESTAMISTA: ', bold: true },
          `${emp.nombre}, con RNC ${emp.rnc}, ubicada en ${emp.direccion}, en adelante "LA EMPRESA".\n\n`,
          { text: 'PRESTATARIO: ', bold: true },
          `${cliente.nombre}, portador de la Cédula de Identidad No. ${cliente.cedula}, con domicilio en ${cliente.direccion || 'declarado al momento de la solicitud'}, en adelante "EL CLIENTE".`
        ],
        margin: [0, 0, 0, 15]
      },

      // Condiciones
      { text: 'CONDICIONES DEL PRÉSTAMO', style: 'seccion' },
      {
        table: {
          widths: ['*', '*'],
          body: [
            [{ text: 'Monto del Préstamo:', bold: true, fillColor: C.light }, { text: `RD$ ${Number(prestamo.monto_principal).toLocaleString('es-DO', {minimumFractionDigits:2})}`, fillColor: C.light }],
            ['Tipo de Préstamo:', prestamo.tipo_prestamo.toUpperCase()],
            [{ text: 'Número de Cuotas:', bold: true, fillColor: C.light }, { text: String(prestamo.num_cuotas), fillColor: C.light }],
            ['Monto por Cuota:', `RD$ ${Number(prestamo.cuota_monto).toLocaleString('es-DO', {minimumFractionDigits:2})}`],
            [{ text: 'Tasa de Interés Mensual:', bold: true, fillColor: C.light }, { text: `${prestamo.tasa_mensual}%`, fillColor: C.light }],
            [{ text: 'TASA EFECTIVA ANUAL (TEA):', bold: true, color: C.danger, fillColor: '#fef2f2' }, { text: `${prestamo.tasa_tea}% ANUAL`, bold: true, color: C.danger, fillColor: '#fef2f2' }],
            ['Fecha de Primer Pago:', new Date(prestamo.fecha_primer_pago).toLocaleDateString('es-DO')],
            [{ text: 'MONTO TOTAL A PAGAR:', bold: true, fillColor: C.light }, { text: `RD$ ${Number(prestamo.monto_total).toLocaleString('es-DO', {minimumFractionDigits:2})}`, bold: true, fillColor: C.light }],
          ]
        },
        layout: { paddingLeft: () => 10, paddingRight: () => 10, paddingTop: () => 6, paddingBottom: () => 6 },
        margin: [0, 0, 0, 15]
      },

      // Transparencia TEA (Ley 288-05)
      {
        fillColor: '#eff6ff',
        table: {
          widths: ['*'],
          body: [[{
            text: [
              { text: '⚠ INFORMACIÓN DE TRANSPARENCIA — Ley 288-05 de Protección al Consumidor\n', bold: true, color: C.primary },
              `Por cada RD$ 1,000 prestados, el costo financiero total es RD$ ${Math.round((prestamo.monto_total / prestamo.monto_principal) * 1000 * 100) / 100}. La Tasa Efectiva Anual (TEA) es ${prestamo.tasa_tea}% anual. El cliente ha sido informado de todas las condiciones antes de la firma.`
            ],
            fontSize: 10
          }]]
        },
        layout: { paddingLeft: () => 12, paddingRight: () => 12, paddingTop: () => 10, paddingBottom: () => 10 },
        margin: [0, 0, 0, 20]
      },

      // Cláusulas
      { text: 'CLÁUSULAS Y CONDICIONES', style: 'seccion' },
      { text: 'PRIMERA — DESTINO DEL PRÉSTAMO: EL CLIENTE se compromete a utilizar los fondos para los fines declarados en la solicitud. LA EMPRESA no se hace responsable por el uso de los fondos.\n\n', fontSize: 10 },
      { text: 'SEGUNDA — PAGO DE CUOTAS: EL CLIENTE se compromete a pagar las cuotas en las fechas establecidas en la tabla de amortización. Los pagos deberán realizarse en las oficinas de LA EMPRESA o mediante los medios de pago autorizados.\n\n', fontSize: 10 },
      { text: `TERCERA — MORA: En caso de atraso en el pago de una o más cuotas, se aplicará una penalidad del ${process.env.MORA_TASA_DIARIA * 100 || 0.3}% diario sobre el saldo vencido, conforme a lo permitido por la normativa vigente de la Superintendencia de Bancos.\n\n`, fontSize: 10 },
      { text: 'CUARTA — PREPAGO: EL CLIENTE podrá cancelar el préstamo de forma anticipada sin penalidad, pagando el capital pendiente más los intereses devengados a la fecha.\n\n', fontSize: 10 },
      { text: 'QUINTA — DOMICILIO Y JURISDICCIÓN: Para los efectos del presente contrato, las partes fijan su domicilio en Santo Domingo, República Dominicana, y se someten a la jurisdicción de los Tribunales Ordinarios.\n\n', fontSize: 10 },

      // Tabla de amortización (si se incluye)
      ...(tablaAmortizacion ? [
        { text: 'TABLA DE AMORTIZACIÓN', style: 'seccion', pageBreak: 'before' },
        {
          table: {
            widths: [30, 65, 55, 55, 55, 65],
            headerRows: 1,
            body: [
              [
                { text: '#', bold: true, fillColor: C.primary, color: 'white', alignment: 'center' },
                { text: 'Fecha', bold: true, fillColor: C.primary, color: 'white' },
                { text: 'Capital', bold: true, fillColor: C.primary, color: 'white', alignment: 'right' },
                { text: 'Interés', bold: true, fillColor: C.primary, color: 'white', alignment: 'right' },
                { text: 'Cuota', bold: true, fillColor: C.primary, color: 'white', alignment: 'right' },
                { text: 'Saldo', bold: true, fillColor: C.primary, color: 'white', alignment: 'right' },
              ],
              ...tablaAmortizacion.map((c, idx) => [
                { text: c.numero_cuota, alignment: 'center', fontSize: 9, fillColor: idx % 2 ? '#f8fafc' : 'white' },
                { text: new Date(c.fecha_vence).toLocaleDateString('es-DO'), fontSize: 9, fillColor: idx % 2 ? '#f8fafc' : 'white' },
                { text: `RD$ ${Number(c.capital).toLocaleString('es-DO', {minimumFractionDigits:2})}`, alignment: 'right', fontSize: 9, fillColor: idx % 2 ? '#f8fafc' : 'white' },
                { text: `RD$ ${Number(c.interes).toLocaleString('es-DO', {minimumFractionDigits:2})}`, alignment: 'right', fontSize: 9, fillColor: idx % 2 ? '#f8fafc' : 'white' },
                { text: `RD$ ${Number(c.monto_cuota).toLocaleString('es-DO', {minimumFractionDigits:2})}`, alignment: 'right', bold: true, fontSize: 9, fillColor: idx % 2 ? '#f8fafc' : 'white' },
                { text: `RD$ ${Number(c.saldo_restante).toLocaleString('es-DO', {minimumFractionDigits:2})}`, alignment: 'right', fontSize: 9, fillColor: idx % 2 ? '#f8fafc' : 'white' },
              ])
            ]
          },
          fontSize: 9,
          margin: [0, 0, 0, 20]
        }
      ] : []),

      // Firmas
      { text: 'FIRMAS', style: 'seccion', pageBreak: tablaAmortizacion ? undefined : 'before' },
      { text: '\n\nEn Santo Domingo, República Dominicana, a los ______ días del mes de __________ del año _______.\n\n', fontSize: 10 },
      {
        columns: [
          {
            text: [
              { text: '\n\n\n_______________________________\n', fontSize: 10 },
              { text: emp.nombre + '\n', bold: true, fontSize: 10 },
              { text: 'EL PRESTAMISTA', fontSize: 9, color: C.gray }
            ],
            alignment: 'center'
          },
          {
            text: [
              { text: '\n\n\n_______________________________\n', fontSize: 10 },
              { text: cliente.nombre + '\n', bold: true, fontSize: 10 },
              { text: `C.I. ${cliente.cedula}`, fontSize: 9, color: C.gray },
              { text: '\nEL PRESTATARIO', fontSize: 9, color: C.gray }
            ],
            alignment: 'center'
          }
        ],
        margin: [0, 20, 0, 0]
      }
    ],
    styles: {
      titulo: { fontSize: 18, bold: true, color: C.primary, margin: [0, 0, 0, 5] },
      seccion: { fontSize: 12, bold: true, color: C.primary, decoration: 'underline', margin: [0, 15, 0, 8] },
    }
  };

  return new Promise((resolve, reject) => {
    const pdfmake = getPrinter();
    const doc = pdfmake.createPdf(docDef);
    doc.getBuffer((buffer) => {
      resolve(buffer);
    });
  });
};

// ── REPORTE DE CARTERA ──────────────────────────────────────
const generarReporteCartera = (prestamos, tipo = 'activa') => {
  const emp = empresa();
  const total = prestamos.reduce((s, p) => s + Number(p.saldo_pendiente || 0), 0);

  const docDef = {
    pageSize: 'LETTER',
    pageOrientation: 'landscape',
    pageMargins: [40, 70, 40, 50],
    header: {
      columns: [
        { text: `${emp.nombre} — Reporte de Cartera ${tipo === 'activa' ? 'Activa' : 'Vencida'}`, bold: true, color: C.primary, margin: [40, 20, 0, 0] },
        { text: new Date().toLocaleDateString('es-DO', { year: 'numeric', month: 'long', day: 'numeric' }), alignment: 'right', fontSize: 9, color: C.gray, margin: [0, 22, 40, 0] }
      ]
    },
    defaultStyle: { fontSize: 9 },
    content: [
      { text: `Cartera ${tipo === 'activa' ? 'Activa' : 'Vencida'} — ${prestamos.length} préstamos — Total: RD$ ${total.toLocaleString('es-DO', {minimumFractionDigits:2})}`, fontSize: 11, bold: true, margin: [0, 0, 0, 12] },
      {
        table: {
          widths: [30, 110, 55, 55, 55, 55, 55, 55, 50],
          headerRows: 1,
          body: [
            ['#', 'Cliente', 'Cédula', 'Tipo', 'Monto', 'Cuota', 'Saldo', 'Mora', 'Estado'].map(h => ({
              text: h, bold: true, fillColor: C.primary, color: 'white', fontSize: 8
            })),
            ...prestamos.map((p, i) => [
              { text: p.id, alignment: 'center', fillColor: i % 2 ? '#f8fafc' : 'white' },
              { text: p.cliente_nombre || '', fillColor: i % 2 ? '#f8fafc' : 'white' },
              { text: p.cedula || '', fontSize: 8, fillColor: i % 2 ? '#f8fafc' : 'white' },
              { text: p.tipo_prestamo || '', fillColor: i % 2 ? '#f8fafc' : 'white' },
              { text: `RD$ ${Number(p.monto_principal).toLocaleString('es-DO')}`, alignment: 'right', fillColor: i % 2 ? '#f8fafc' : 'white' },
              { text: `RD$ ${Number(p.cuota_monto).toLocaleString('es-DO')}`, alignment: 'right', fillColor: i % 2 ? '#f8fafc' : 'white' },
              { text: `RD$ ${Number(p.saldo_pendiente).toLocaleString('es-DO')}`, alignment: 'right', bold: true, fillColor: i % 2 ? '#f8fafc' : 'white' },
              { text: p.dias_atraso > 0 ? `${p.dias_atraso}d` : '-', alignment: 'center', color: p.dias_atraso > 0 ? C.danger : 'black', fillColor: i % 2 ? '#f8fafc' : 'white' },
              { text: p.estado || '', fillColor: i % 2 ? '#f8fafc' : 'white' },
            ])
          ]
        },
        layout: { paddingTop: () => 5, paddingBottom: () => 5, paddingLeft: () => 8, paddingRight: () => 8 }
      }
    ]
  };

  return new Promise((resolve) => {
    const pdfmake = getPrinter();
    pdfmake.createPdf(docDef).getBuffer(resolve);
  });
};

module.exports = { generarRecibo, generarContrato, generarReporteCartera };
