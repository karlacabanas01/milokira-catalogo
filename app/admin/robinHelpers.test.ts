import { describe, expect, it } from "vitest";
import {
  calcularAporteRobin,
  calcularSaldoRobin,
  montoPago,
  repartirPedido,
  ROBIN_DESDE,
} from "./robinHelpers";

const DESPUES = "2026-08-22T12:00:00";
const ANTES = "2026-08-20T12:00:00";

describe("calcularAporteRobin", () => {
  it("cuenta el delivery aunque no haya ítems marcados", () => {
    const r = calcularAporteRobin({
      created_at: DESPUES,
      total_amount: 18000,
      delivery_type: "delivery",
      delivery_fee: 3000,
      items: [{ nombre: "Monstera", quantity: 1, unit_price: 15000 }],
    });
    expect(r?.total).toBe(3000);
    expect(r?.delivery).toBe(3000);
    expect(r?.productos).toEqual([]);
  });

  it("suma delivery más los ítems marcados", () => {
    const r = calcularAporteRobin({
      created_at: DESPUES,
      total_amount: 23000,
      delivery_type: "delivery",
      delivery_fee: 3000,
      items: [
        { nombre: "Monstera", quantity: 1, unit_price: 12000 },
        { nombre: "Maceta", quantity: 1, unit_price: 8000, es_de_companero: true },
      ],
    });
    expect(r?.total).toBe(11000);
    expect(r?.productos).toHaveLength(1);
    expect(r?.productos[0].nombre).toBe("Maceta");
  });

  it("no cuenta el delivery si el pedido fue retiro", () => {
    const r = calcularAporteRobin({
      created_at: DESPUES,
      total_amount: 20000,
      delivery_type: "retiro",
      delivery_fee: 3000,
      items: [{ nombre: "Maceta", quantity: 2, unit_price: 4000, es_de_companero: true }],
    });
    expect(r?.total).toBe(8000);
    expect(r?.delivery).toBe(0);
  });

  it("descarta los pedidos anteriores al inicio del acuerdo", () => {
    const r = calcularAporteRobin({
      created_at: ANTES,
      total_amount: 18000,
      delivery_type: "delivery",
      delivery_fee: 3000,
    });
    expect(r).toBeNull();
  });

  it("descarta los pedidos pendientes", () => {
    const r = calcularAporteRobin({
      status: "pending",
      created_at: DESPUES,
      total_amount: 18000,
      delivery_type: "delivery",
      delivery_fee: 3000,
    });
    expect(r).toBeNull();
  });

  it("devuelve null si no hay delivery ni ítems marcados", () => {
    const r = calcularAporteRobin({
      created_at: DESPUES,
      total_amount: 15000,
      delivery_type: "retiro",
      items: [{ nombre: "Monstera", quantity: 1, unit_price: 15000 }],
    });
    expect(r).toBeNull();
  });

  it("nunca supera el total cobrado y marca el ajuste", () => {
    // Pedido guardado con total manual menor que la suma de sus partes.
    const r = calcularAporteRobin({
      created_at: DESPUES,
      total_amount: 5000,
      delivery_type: "delivery",
      delivery_fee: 3000,
      items: [{ nombre: "Maceta", quantity: 1, unit_price: 8000, es_de_companero: true }],
    });
    expect(r?.total).toBe(5000);
    expect(r?.ajustado).toBe(true);
  });

  it("una venta directa sin items no aporta", () => {
    const r = calcularAporteRobin({
      created_at: DESPUES,
      total_amount: 9000,
      tipo: "venta_directa",
    } as Parameters<typeof calcularAporteRobin>[0]);
    expect(r).toBeNull();
  });

  it("cuenta el monto de Robin en una venta directa", () => {
    const r = calcularAporteRobin({
      created_at: DESPUES,
      total_amount: 30000,
      robin_amount: 12000,
    });
    expect(r?.total).toBe(12000);
    expect(r?.directo).toBe(12000);
    expect(r?.delivery).toBe(0);
    expect(r?.productos).toEqual([]);
  });

  it("una venta directa sin monto de Robin no aporta", () => {
    const r = calcularAporteRobin({
      created_at: DESPUES,
      total_amount: 30000,
      robin_amount: 0,
    });
    expect(r).toBeNull();
  });

  it("el corte del acuerdo es el 21-08-2026", () => {
    expect(new Date(ROBIN_DESDE).getFullYear()).toBe(2026);
    expect(new Date(ROBIN_DESDE).getMonth()).toBe(7); // 0-indexed
    expect(new Date(ROBIN_DESDE).getDate()).toBe(21);
  });
});

describe("repartirPedido", () => {
  it("reparte un pedido pendiente (la vista de pedidos los muestra)", () => {
    const r = repartirPedido({
      status: "pending",
      created_at: DESPUES,
      total_amount: 23000,
      delivery_type: "delivery",
      delivery_fee: 3000,
      items: [
        { nombre: "Maceta", quantity: 1, unit_price: 8000, es_de_companero: true },
      ],
    });
    expect(r?.total).toBe(11000);
  });

  it("reparte sin importar la fecha del acuerdo", () => {
    const r = repartirPedido({
      created_at: ANTES,
      total_amount: 18000,
      delivery_type: "delivery",
      delivery_fee: 3000,
    });
    expect(r?.total).toBe(3000);
  });

  it("aplica el tope del total también acá", () => {
    const r = repartirPedido({
      status: "pending",
      total_amount: 5000,
      delivery_type: "delivery",
      delivery_fee: 3000,
      items: [
        { nombre: "Maceta", quantity: 1, unit_price: 8000, es_de_companero: true },
      ],
    });
    expect(r?.total).toBe(5000);
    expect(r?.ajustado).toBe(true);
  });
});

describe("rubro de los ítems de Robin", () => {
  it("separa macetas de los demás productos suyos", () => {
    const r = calcularAporteRobin({
      created_at: DESPUES,
      total_amount: 40000,
      delivery_type: "delivery",
      delivery_fee: 3000,
      items: [
        { nombre: "Maceta gris", quantity: 2, unit_price: 8000, es_de_companero: true, rubro_companero: "maceta" },
        { nombre: "Fertilizante", quantity: 1, unit_price: 5000, es_de_companero: true, rubro_companero: "otro" },
        { nombre: "Monstera", quantity: 1, unit_price: 16000 },
      ],
    });
    expect(r?.macetas).toBe(16000);
    expect(r?.otros).toBe(5000);
    expect(r?.delivery).toBe(3000);
    expect(r?.total).toBe(24000);
  });

  it("los ítems sin rubro (pedidos viejos) cuentan como otros", () => {
    const r = calcularAporteRobin({
      created_at: DESPUES,
      total_amount: 30000,
      delivery_type: "retiro",
      items: [
        { nombre: "Maceta", quantity: 1, unit_price: 8000, es_de_companero: true },
      ],
    });
    expect(r?.macetas).toBe(0);
    expect(r?.otros).toBe(8000);
    expect(r?.productos[0].rubro).toBe("otro");
  });

  it("un rubro desconocido cae en otros", () => {
    const r = calcularAporteRobin({
      created_at: DESPUES,
      total_amount: 30000,
      delivery_type: "retiro",
      items: [
        { nombre: "Cosa", quantity: 1, unit_price: 8000, es_de_companero: true, rubro_companero: "vidrio" },
      ],
    });
    expect(r?.otros).toBe(8000);
    expect(r?.productos[0].rubro).toBe("otro");
  });

  it("los subtotales suman el total cuando no hay tope", () => {
    const r = calcularAporteRobin({
      created_at: DESPUES,
      total_amount: 50000,
      delivery_type: "delivery",
      delivery_fee: 3000,
      robin_amount: 2000,
      items: [
        { nombre: "Maceta", quantity: 1, unit_price: 8000, es_de_companero: true, rubro_companero: "maceta" },
        { nombre: "Fertilizante", quantity: 1, unit_price: 5000, es_de_companero: true, rubro_companero: "otro" },
      ],
    });
    const suma = (r?.delivery ?? 0) + (r?.macetas ?? 0) + (r?.otros ?? 0) + (r?.directo ?? 0);
    expect(suma).toBe(r?.total);
  });

  it("prorratea los subtotales cuando el tope recorta el monto", () => {
    // Bruto = 3000 delivery + 8000 maceta = 11000, pero solo se cobraron 5500:
    // cada parte se achica a la mitad para no mostrar más de lo cobrado.
    const r = calcularAporteRobin({
      created_at: DESPUES,
      total_amount: 5500,
      delivery_type: "delivery",
      delivery_fee: 3000,
      items: [
        { nombre: "Maceta", quantity: 1, unit_price: 8000, es_de_companero: true, rubro_companero: "maceta" },
      ],
    });
    expect(r?.total).toBe(5500);
    expect(r?.ajustado).toBe(true);
    expect(r?.delivery).toBe(1500);
    expect(r?.macetas).toBe(4000);
    const suma = (r?.delivery ?? 0) + (r?.macetas ?? 0) + (r?.otros ?? 0) + (r?.directo ?? 0);
    expect(suma).toBe(r?.total);
  });
});

describe("montoPago", () => {
  it("cuenta un abono posterior al inicio del acuerdo", () => {
    expect(montoPago({ amount: 15000, created_at: DESPUES })).toBe(15000);
  });

  it("descarta los abonos anteriores al inicio del acuerdo", () => {
    expect(montoPago({ amount: 15000, created_at: ANTES })).toBe(0);
  });

  it("descarta un abono sin fecha", () => {
    expect(montoPago({ amount: 15000 })).toBe(0);
  });

  it("descarta montos negativos, cero o no numéricos", () => {
    expect(montoPago({ amount: -5000, created_at: DESPUES })).toBe(0);
    expect(montoPago({ amount: 0, created_at: DESPUES })).toBe(0);
    expect(montoPago({ amount: "hola", created_at: DESPUES })).toBe(0);
  });
});

describe("calcularSaldoRobin", () => {
  it("resta los abonos del acumulado", () => {
    const r = calcularSaldoRobin(40000, [
      { amount: 15000, created_at: DESPUES },
      { amount: 10000, created_at: DESPUES },
    ]);
    expect(r.acumulado).toBe(40000);
    expect(r.pagado).toBe(25000);
    expect(r.saldo).toBe(15000);
    expect(r.aFavor).toBe(false);
  });

  it("sin abonos el saldo es todo el acumulado", () => {
    const r = calcularSaldoRobin(40000, []);
    expect(r.pagado).toBe(0);
    expect(r.saldo).toBe(40000);
  });

  it("da vuelta el saldo si se le pagó de más", () => {
    const r = calcularSaldoRobin(20000, [{ amount: 30000, created_at: DESPUES }]);
    expect(r.saldo).toBe(-10000);
    expect(r.aFavor).toBe(true);
  });

  it("queda en cero cuando se le pagó justo", () => {
    const r = calcularSaldoRobin(20000, [{ amount: 20000, created_at: DESPUES }]);
    expect(r.saldo).toBe(0);
    expect(r.aFavor).toBe(false);
  });

  it("ignora los abonos anteriores al acuerdo al sacar el saldo", () => {
    const r = calcularSaldoRobin(40000, [
      { amount: 15000, created_at: DESPUES },
      { amount: 99000, created_at: ANTES },
    ]);
    expect(r.pagado).toBe(15000);
    expect(r.saldo).toBe(25000);
  });

  it("resta los pagos tal como los arma la vista", () => {
    // Regresión: la vista guardaba la fecha en un campo `fecha` y el helper
    // busca `created_at`, así que no restaba nada y el saldo quedaba entero.
    // Este caso usa la forma real de los pagos del modal, campos extra incluidos.
    const pagosDeLaVista = [
      {
        idFirebase: "a",
        description: "Pagué con transferencia",
        amount: 10000,
        created_at: "2026-08-31T02:18:06.755Z",
      },
      {
        idFirebase: "b",
        description: "Pagado en efectivo",
        amount: 5000,
        created_at: "2026-08-31T02:25:37.066Z",
      },
    ];
    const r = calcularSaldoRobin(38000, pagosDeLaVista);
    expect(r.pagado).toBe(15000);
    expect(r.saldo).toBe(23000);
  });
});
