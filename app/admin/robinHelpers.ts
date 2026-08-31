/**
 * Reparto con el compañero de ventas (Robin).
 *
 * Le corresponde el delivery de cada pedido, siempre, más los ítems marcados
 * como suyos al armar el pedido. El cliente paga el total completo: esto solo
 * dice a quién le toca cada monto.
 *
 * La card del panel y el modal de detalle comparten este cálculo para que sus
 * números no puedan divergir.
 */

/** Inicio del acuerdo: los pedidos anteriores no cuentan. Fecha fija a
 *  propósito — con una fecha dinámica el contador se reiniciaría solo. */
export const ROBIN_DESDE = new Date("2026-08-21T00:00:00").getTime();

export type TransaccionRobin = {
  status?: unknown;
  created_at?: unknown;
  total_amount?: unknown;
  delivery_type?: unknown;
  delivery_fee?: unknown;
  items?: unknown;
  /** Ventas directas: monto de Robin cargado a mano (no tienen ítems). */
  robin_amount?: unknown;
};

/**
 * Rubro de un ítem de Robin. Se elige a mano al marcar el ítem como suyo.
 * Los pedidos guardados antes de que existiera el selector no lo traen: esos
 * caen en "otro" en vez de inventarles un rubro.
 */
export type RubroRobin = "maceta" | "otro";

export type ItemRobin = {
  nombre: string;
  cantidad: number;
  monto: number;
  rubro: RubroRobin;
};

export type AporteRobin = {
  /** Lo que le toca a Robin de este pedido, ya topado al total cobrado. */
  total: number;
  delivery: number;
  productos: ItemRobin[];
  /** Suma de los ítems marcados como maceta. */
  macetas: number;
  /** Suma del resto de los ítems suyos. */
  otros: number;
  /** Monto cargado a mano en una venta directa. */
  directo: number;
  /** true si el tope recortó el monto (pedido guardado con total manual). */
  ajustado: boolean;
};

/**
 * Reparte un pedido sin mirar su estado ni su fecha: responde solo "de este
 * monto, ¿cuánto es de Robin?". Lo usa la vista de pedidos, que muestra
 * pendientes y necesita el desglose igual.
 *
 * Devuelve null si el pedido no reparte nada (ni delivery ni ítems marcados).
 */
export const repartirPedido = (data: TransaccionRobin): AporteRobin | null => {
  const monto = Number(data.total_amount) || 0;

  const items = Array.isArray(data.items)
    ? (data.items as {
        nombre?: string;
        quantity?: number;
        unit_price?: number;
        es_de_companero?: boolean;
        rubro_companero?: string;
      }[])
    : [];

  const productos: ItemRobin[] = items
    .filter((i) => i?.es_de_companero)
    .map((i) => ({
      nombre: i.nombre || "Producto",
      cantidad: Number(i.quantity) || 0,
      monto: (Number(i.unit_price) || 0) * (Number(i.quantity) || 0),
      rubro: i.rubro_companero === "maceta" ? "maceta" : "otro",
    }));

  const sumaPor = (rubro: RubroRobin) =>
    productos.reduce((acc, p) => (p.rubro === rubro ? acc + p.monto : acc), 0);

  const delivery =
    data.delivery_type === "delivery" ? Number(data.delivery_fee) || 0 : 0;

  // Venta directa: no tiene ítems, así que el monto se carga a mano.
  const directo = Math.max(0, Number(data.robin_amount) || 0);

  const bruto =
    delivery + directo + productos.reduce((acc, p) => acc + p.monto, 0);
  if (bruto <= 0) return null;

  // Nunca puede pasarse de lo que realmente se cobró: un pedido guardado con
  // total manual no reparte ese monto entre sus ítems.
  const total = Math.min(bruto, monto);

  // Si el tope recortó el monto, los subtotales se achican en la misma
  // proporción para que macetas + otros + delivery + directo cierren con el
  // total y la suma de la vista no muestre más de lo que se cobró.
  const factor = total < bruto && bruto > 0 ? total / bruto : 1;

  return {
    total,
    delivery: delivery * factor,
    productos,
    macetas: sumaPor("maceta") * factor,
    otros: sumaPor("otro") * factor,
    directo: directo * factor,
    ajustado: total < bruto,
  };
};

/**
 * Aporte de un pedido al total acumulado de Robin.
 * Devuelve null si el pedido no cuenta: pendiente, anterior al inicio del
 * acuerdo, o sin nada que repartir.
 */
export const calcularAporteRobin = (
  data: TransaccionRobin,
  desde: number = ROBIN_DESDE,
): AporteRobin | null => {
  const estado = data.status ? String(data.status).toLowerCase() : "completado";
  if (estado === "pending") return null;

  const createdAt = data.created_at
    ? new Date(String(data.created_at)).getTime()
    : 0;
  if (!createdAt || createdAt < desde) return null;

  return repartirPedido(data);
};

/* ------------------------------------------------------------------ *
 * Pagos a Robin
 * ------------------------------------------------------------------ */

/**
 * Un abono ya entregado a Robin. Vive en la colección `PagosRobin` y baja el
 * saldo pendiente. No toca las ventas ni los gastos del negocio: es plata que
 * ya estaba contada como suya, solo cambia de manos.
 */
export type PagoRobin = {
  description?: unknown;
  amount?: unknown;
  created_at?: unknown;
};

export type SaldoRobin = {
  /** Todo lo que le tocó a Robin desde el inicio del acuerdo. */
  acumulado: number;
  /** Suma de los abonos ya entregados. */
  pagado: number;
  /** acumulado - pagado. Negativo significa que Robin quedó pagado de más. */
  saldo: number;
  /** true si se le pagó de más y ahora la deuda es al revés. */
  aFavor: boolean;
};

/**
 * Monto de un abono: descarta los que no cuentan (sin monto, negativos, o
 * anteriores al inicio del acuerdo). Devuelve 0 cuando no suma.
 */
export const montoPago = (
  pago: PagoRobin,
  desde: number = ROBIN_DESDE,
): number => {
  const createdAt = pago.created_at
    ? new Date(String(pago.created_at)).getTime()
    : 0;
  if (!createdAt || createdAt < desde) return 0;

  const monto = Number(pago.amount);
  if (!Number.isFinite(monto) || monto <= 0) return 0;

  return monto;
};

/**
 * Saldo pendiente con Robin: lo que le tocó menos lo que ya se le pagó.
 *
 * El saldo puede quedar negativo a propósito — si se le pagó de más, la deuda
 * cambia de lado y la vista lo dice con todas sus letras en vez de esconderlo
 * en un cero.
 */
export const calcularSaldoRobin = (
  acumulado: number,
  pagos: PagoRobin[],
  desde: number = ROBIN_DESDE,
): SaldoRobin => {
  const pagado = pagos.reduce((acc, p) => acc + montoPago(p, desde), 0);
  const saldo = acumulado - pagado;

  return { acumulado, pagado, saldo, aFavor: saldo < 0 };
};
