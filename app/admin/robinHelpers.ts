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

export type ItemRobin = {
  nombre: string;
  cantidad: number;
  monto: number;
};

export type AporteRobin = {
  /** Lo que le toca a Robin de este pedido, ya topado al total cobrado. */
  total: number;
  delivery: number;
  productos: ItemRobin[];
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
      }[])
    : [];

  const productos = items
    .filter((i) => i?.es_de_companero)
    .map((i) => ({
      nombre: i.nombre || "Producto",
      cantidad: Number(i.quantity) || 0,
      monto: (Number(i.unit_price) || 0) * (Number(i.quantity) || 0),
    }));

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

  return { total, delivery, productos, directo, ajustado: total < bruto };
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
