/**
 * Ganancia del período en curso: lo que entró menos lo que salió.
 *
 * El período no es el mes calendario: corta el día 28. El que está en curso es
 * el que ya arrancó, así que el 5 de noviembre pertenece al período que va del
 * 28 de octubre al 27 de noviembre.
 *
 * Vive aparte de la página para poder probar los bordes del rango —el 27 y el
 * 28 son justo donde un filtro de fechas falla.
 */

/** Día en que arranca cada período contable. */
export const DIA_CORTE = 28;

export type MovimientoMes = {
  created_at?: unknown;
  status?: unknown;
  total_amount?: unknown;
  amount?: unknown;
};

export type GananciaMes = {
  ventas: number;
  gastos: number;
  /** ventas - gastos. Negativo si el período cerró en pérdida. */
  ganancia: number;
};

/**
 * Primer instante del período que contiene a `ref`.
 *
 * Antes del día 28 el período vigente arrancó el mes anterior; desde el 28,
 * arrancó este mes.
 */
const diasDelMes = (ano: number, mes: number): number =>
  new Date(ano, mes + 1, 0).getDate();

/**
 * Arma una fecha sin que el día desborde al mes siguiente: pedir el 29 de
 * febrero en un año común da el 28, no el 1 de marzo. `setMonth` y `setDate`
 * desbordan, así que las fechas se construyen de cero.
 */
const diaDelMes = (ano: number, mes: number, dia: number): Date => {
  // Normaliza mes fuera de rango (-1 → diciembre del año anterior).
  const base = new Date(ano, mes, 1);
  const a = base.getFullYear();
  const m = base.getMonth();
  return new Date(a, m, Math.min(dia, diasDelMes(a, m)));
};

export const inicioDePeriodo = (ref: Date = new Date()): Date => {
  // Con DIA_CORTE 28 esto nunca recorta, porque todos los meses llegan al 28.
  // Queda para que subir el corte a 29, 30 o 31 siga funcionando: en un mes
  // más corto el corte es su último día, no un día que no existe.
  const corteDeEsteMes = Math.min(
    DIA_CORTE,
    diasDelMes(ref.getFullYear(), ref.getMonth()),
  );

  const antesDelCorte = ref.getDate() < corteDeEsteMes;
  const d = diaDelMes(
    ref.getFullYear(),
    ref.getMonth() - (antesDelCorte ? 1 : 0),
    DIA_CORTE,
  );
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Último instante del período: el día anterior al inicio del siguiente.
 *
 * Se calcula así y no como "día anterior al corte" porque en un mes corto el
 * corte se adelanta —febrero no tiene 29— y las dos fechas dejarían de
 * coincidir, con un día contado en dos períodos o ninguno.
 */
export const finDePeriodo = (ref: Date = new Date()): Date => {
  const inicio = inicioDePeriodo(ref);

  // Un día después del inicio cae siempre dentro del período siguiente.
  const dentroDelSiguiente = new Date(inicio);
  dentroDelSiguiente.setDate(dentroDelSiguiente.getDate() + 1);
  dentroDelSiguiente.setMonth(dentroDelSiguiente.getMonth() + 1);

  const d = inicioDePeriodo(dentroDelSiguiente);
  d.setDate(d.getDate() - 1);
  d.setHours(23, 59, 59, 999);
  return d;
};

/** true si la fecha del movimiento cae dentro del período de `ref`. */
export const esDelPeriodo = (
  createdAt: unknown,
  ref: Date = new Date(),
): boolean => {
  if (!createdAt) return false;
  const fecha = new Date(String(createdAt));
  if (Number.isNaN(fecha.getTime())) return false;
  return fecha >= inicioDePeriodo(ref) && fecha <= finDePeriodo(ref);
};

/**
 * Ganancia real del período: ventas completadas menos gastos, ambos dentro
 * del mismo rango 28 → 27.
 *
 * Los pedidos pendientes no cuentan como venta —todavía no se cobraron—
 * igual que en el resto del panel.
 */
export const calcularGananciaMes = (
  transacciones: MovimientoMes[],
  gastos: MovimientoMes[],
  ref: Date = new Date(),
): GananciaMes => {
  let ventas = 0;
  for (const t of transacciones) {
    const estado = t.status ? String(t.status).toLowerCase() : "completado";
    if (estado === "pending") continue;
    if (!esDelPeriodo(t.created_at, ref)) continue;
    ventas += Number(t.total_amount) || 0;
  }

  let gastado = 0;
  for (const g of gastos) {
    if (!esDelPeriodo(g.created_at, ref)) continue;
    gastado += Number(g.amount) || 0;
  }

  return { ventas, gastos: gastado, ganancia: ventas - gastado };
};

/**
 * Rango del período en curso para mostrar, por ejemplo "28 oct → 27 nov".
 *
 * Va explícito y no como nombre de mes: con un corte a mitad de mes, decir
 * "octubre" deja dudas sobre qué incluye.
 */
export const rangoDelPeriodo = (ref: Date = new Date()): string => {
  const corto = (d: Date) =>
    d
      .toLocaleDateString("es-CL", { day: "numeric", month: "short" })
      .replace(".", "");

  return `${corto(inicioDePeriodo(ref))} → ${corto(finDePeriodo(ref))}`;
};

/* ------------------------------------------------------------------ *
 * Rango personalizado
 * ------------------------------------------------------------------ */

/** Un movimiento ya clasificado, para listar el detalle del rango. */
export type MovimientoDetalle = {
  fecha: string;
  descripcion: string;
  monto: number;
  tipo: "venta" | "gasto";
};

export type ResumenRango = {
  ventas: number;
  gastos: number;
  ganancia: number;
  /** Los movimientos del rango, del más reciente al más antiguo. */
  detalle: MovimientoDetalle[];
};

/** Fecha de un `<input type="date">` (YYYY-MM-DD) al inicio de ese día. */
export const desdeInputDate = (valor: string): Date | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(valor);
  if (!m) return null;
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isNaN(d.getTime()) ? null : d;
};

/** Una fecha al formato que espera un `<input type="date">`. */
export const aInputDate = (fecha: Date): string => {
  const dos = (n: number) => String(n).padStart(2, "0");
  return `${fecha.getFullYear()}-${dos(fecha.getMonth() + 1)}-${dos(fecha.getDate())}`;
};

/**
 * Resumen de un rango de fechas elegido a mano.
 *
 * Toma el día completo en los dos extremos: elegir el 5 al 5 incluye todo lo
 * del día 5, no solo lo de las 00:00.
 */
export const resumirRango = (
  transacciones: MovimientoMes[],
  gastos: MovimientoMes[],
  desde: Date,
  hasta: Date,
): ResumenRango => {
  const ini = new Date(desde);
  ini.setHours(0, 0, 0, 0);
  const fin = new Date(hasta);
  fin.setHours(23, 59, 59, 999);

  const dentro = (valor: unknown): boolean => {
    if (!valor) return false;
    const f = new Date(String(valor));
    if (Number.isNaN(f.getTime())) return false;
    return f >= ini && f <= fin;
  };

  const detalle: MovimientoDetalle[] = [];
  let ventas = 0;
  let gastado = 0;

  for (const t of transacciones) {
    const estado = t.status ? String(t.status).toLowerCase() : "completado";
    if (estado === "pending") continue;
    if (!dentro(t.created_at)) continue;

    const monto = Number(t.total_amount) || 0;
    ventas += monto;
    detalle.push({
      fecha: String(t.created_at),
      descripcion:
        String((t as { customer_name?: unknown }).customer_name ?? "") ||
        "Venta",
      monto,
      tipo: "venta",
    });
  }

  for (const g of gastos) {
    if (!dentro(g.created_at)) continue;

    const monto = Number(g.amount) || 0;
    gastado += monto;
    detalle.push({
      fecha: String(g.created_at),
      descripcion:
        String((g as { description?: unknown }).description ?? "") || "Gasto",
      monto,
      tipo: "gasto",
    });
  }

  detalle.sort(
    (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime(),
  );

  return { ventas, gastos: gastado, ganancia: ventas - gastado, detalle };
};
