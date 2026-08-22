import { describe, expect, it } from "vitest";
import { calcularAporteRobin, repartirPedido, ROBIN_DESDE } from "./robinHelpers";

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
