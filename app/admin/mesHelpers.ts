/**
 * Ganancia del período en curso: lo que entró menos lo que salió.
 *
 * El período no es el mes calendario: corta el día 25. El que está en curso
 * es el que ya arrancó, así que el 7 de octubre pertenece al período que va
 * del 25 de septiembre al 24 de octubre.
 *
 * Vive aparte de la página para poder probar los bordes del rango —el 24 y el
 * 25 son justo donde un filtro de fechas falla.
 */

/** Día en que arranca cada período contable. */
export const DIA_CORTE = 25;

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
 * Antes del día 25 el período vigente arrancó el mes anterior; desde el 25,
 * arrancó este mes.
 */
export const inicioDePeriodo = (ref: Date = new Date()): Date => {
  const d = new Date(ref);
  if (d.getDate() < DIA_CORTE) d.setMonth(d.getMonth() - 1);
  d.setDate(DIA_CORTE);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Último instante del período: el día 24 del mes siguiente al inicio. */
export const finDePeriodo = (ref: Date = new Date()): Date => {
  const d = inicioDePeriodo(ref);
  d.setMonth(d.getMonth() + 1);
  d.setDate(DIA_CORTE - 1);
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
 * del mismo rango 25 → 24.
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
 * Rango del período en curso para mostrar, por ejemplo "25 sep → 24 oct".
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
