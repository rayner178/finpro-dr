// src/services/financiero.js
// Motor de cálculos financieros
// Cumple con Ley 288-05 de Protección al Consumidor (RD)
// y transparencia de tasas SIB

/**
 * Calcula la cuota periódica usando la fórmula de cuota nivelada
 * Método: Precio Francés (cuota fija, amortización creciente)
 */
const calcularCuota = (monto, tasaMensual, numCuotas) => {
  const i = tasaMensual / 100;
  if (i === 0) return monto / numCuotas;
  const cuota = monto * (i * Math.pow(1 + i, numCuotas)) / (Math.pow(1 + i, numCuotas) - 1);
  return Math.round(cuota * 100) / 100;
};

/**
 * Calcula la Tasa Efectiva Anual (TEA)
 * Requerida por Ley 288-05 para transparencia con el cliente
 * TEA = (1 + tasa_mensual/100)^12 - 1
 */
const calcularTEA = (tasaMensual) => {
  const tea = (Math.pow(1 + tasaMensual / 100, 12) - 1) * 100;
  return Math.round(tea * 100) / 100;
};

/**
 * Calcula la TIR (Tasa Interna de Retorno) del préstamo
 * Método Newton-Raphson
 */
const calcularTIR = (monto, cuota, numCuotas) => {
  let r = 0.05; // estimación inicial 5%
  for (let i = 0; i < 100; i++) {
    const f = cuota * (1 - Math.pow(1 + r, -numCuotas)) / r - monto;
    const df = cuota * (Math.pow(1 + r, -numCuotas) * numCuotas / r - (1 - Math.pow(1 + r, -numCuotas)) / (r * r));
    const rNew = r - f / df;
    if (Math.abs(rNew - r) < 1e-8) break;
    r = rNew;
  }
  return Math.round(r * 100 * 100) / 100; // mensual en %
};

/**
 * Genera la tabla de amortización completa
 * Retorna array de cuotas con capital, interés, saldo
 */
const generarTablaAmortizacion = (monto, tasaMensual, numCuotas, fechaPrimerPago, tipoPrestamo) => {
  const cuota = calcularCuota(monto, tasaMensual, numCuotas);
  const i = tasaMensual / 100;
  const tabla = [];
  let saldo = monto;

  // Días entre cuotas según tipo
  const diasEntreCuotas = {
    diario: 1, semanal: 7, quincenal: 15, mensual: 30
  };

  let fechaCuota = new Date(fechaPrimerPago);

  for (let n = 1; n <= numCuotas; n++) {
    const interes = Math.round(saldo * i * 100) / 100;
    const capital = Math.round((cuota - interes) * 100) / 100;
    saldo = Math.round((saldo - capital) * 100) / 100;

    // Ajuste en última cuota para evitar diferencias de centavos
    const montoFinal = n === numCuotas ? capital + interes + saldo : cuota;
    if (n === numCuotas) saldo = 0;

    tabla.push({
      numero_cuota: n,
      fecha_vence: new Date(fechaCuota).toISOString().split('T')[0],
      capital: n === numCuotas ? capital + Math.abs(saldo) : capital,
      interes,
      monto_cuota: n === numCuotas ? montoFinal : cuota,
      saldo_restante: Math.max(0, saldo),
      estado: 'pendiente'
    });

    // Siguiente fecha
    const dias = diasEntreCuotas[tipoPrestamo] || 30;
    fechaCuota = new Date(fechaCuota.getTime() + dias * 24 * 60 * 60 * 1000);
  }

  return tabla;
};

/**
 * Calcula días de atraso y monto de mora para un préstamo
 * Tasa mora: configurable por sucursal (default 0.3% diario sobre saldo)
 */
const calcularMora = (cuotasPendientes, tasaMoraDiaria = 0.003) => {
  const hoy = new Date();
  let diasMaxAtraso = 0;
  let moraTotal = 0;

  for (const cuota of cuotasPendientes) {
    const fechaVence = new Date(cuota.fecha_vence);
    if (fechaVence < hoy && cuota.estado !== 'pagada') {
      const dias = Math.floor((hoy - fechaVence) / (1000 * 60 * 60 * 24));
      if (dias > diasMaxAtraso) diasMaxAtraso = dias;
      moraTotal += cuota.monto_cuota * tasaMoraDiaria * dias;
    }
  }

  return {
    dias_atraso: diasMaxAtraso,
    mora_total: Math.round(moraTotal * 100) / 100
  };
};

/**
 * Resumen del préstamo para mostrar al cliente (Ley 288-05)
 * Incluye: TEA, costo total, cuota, tabla de amortización
 */
const generarResumenTransparencia = (monto, tasaMensual, numCuotas, tipoPrestamo) => {
  const cuota = calcularCuota(monto, tasaMensual, numCuotas);
  const montoTotal = Math.round(cuota * numCuotas * 100) / 100;
  const tea = calcularTEA(tasaMensual);
  const tir = calcularTIR(monto, cuota, numCuotas);

  return {
    monto_solicitado: monto,
    tipo_prestamo: tipoPrestamo,
    num_cuotas: numCuotas,
    tasa_mensual: tasaMensual,
    tasa_tea: tea,
    tasa_tir_mensual: tir,
    cuota_monto: cuota,
    monto_total: montoTotal,
    total_intereses: Math.round((montoTotal - monto) * 100) / 100,
    costo_financiero_pct: Math.round(((montoTotal - monto) / monto) * 10000) / 100,
    // Cumplimiento Ley 288-05 RD
    transparencia: {
      ley: 'Ley 288-05 de Protección al Consumidor, RD',
      descripcion: `Por cada RD$ 1,000 prestados, el costo total es RD$ ${Math.round((montoTotal / monto) * 1000 * 100) / 100}`,
      tae_formato: `TEA: ${tea}% anual`,
    }
  };
};

/**
 * Calcula la fecha de primer pago y vencimiento según tipo
 */
const calcularFechas = (tipoPrestamo, numCuotas) => {
  const hoy = new Date();
  const dias = { diario: 1, semanal: 7, quincenal: 15, mensual: 30 };
  const diasCuota = dias[tipoPrestamo] || 30;

  const fechaPrimerPago = new Date(hoy.getTime() + diasCuota * 24 * 60 * 60 * 1000);
  const fechaVencimiento = new Date(hoy.getTime() + diasCuota * numCuotas * 24 * 60 * 60 * 1000);

  return {
    fecha_primer_pago: fechaPrimerPago.toISOString().split('T')[0],
    fecha_vencimiento: fechaVencimiento.toISOString().split('T')[0]
  };
};

module.exports = {
  calcularCuota,
  calcularTEA,
  calcularTIR,
  generarTablaAmortizacion,
  calcularMora,
  generarResumenTransparencia,
  calcularFechas
};
