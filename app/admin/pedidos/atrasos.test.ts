import { describe, expect, it } from "vitest";
import { diasDesde, estaMuyAtrasado, empujarAtrasadosAlFinal } from "./page";

// Fecha de referencia fija para que los tests no dependan del día en que corren.
const AHORA = new Date("2026-08-21T12:00:00").getTime();
const hace = (dias: number) =>
  new Date(AHORA - dias * 24 * 60 * 60 * 1000).toISOString();

describe("diasDesde", () => {
  it("cuenta los días transcurridos", () => {
    expect(diasDesde(hace(0), AHORA)).toBe(0);
    expect(diasDesde(hace(5), AHORA)).toBe(5);
    expect(diasDesde(hace(30), AHORA)).toBe(30);
  });

  it("devuelve 0 si la fecha es inválida", () => {
    expect(diasDesde("", AHORA)).toBe(0);
    expect(diasDesde("no-es-fecha", AHORA)).toBe(0);
  });
});

describe("estaMuyAtrasado", () => {
  it("no marca los pedidos de menos de dos semanas", () => {
    expect(estaMuyAtrasado({ created_at: hace(0) }, AHORA)).toBe(false);
    expect(estaMuyAtrasado({ created_at: hace(7) }, AHORA)).toBe(false);
    expect(estaMuyAtrasado({ created_at: hace(13) }, AHORA)).toBe(false);
  });

  it("marca desde los 14 días exactos", () => {
    expect(estaMuyAtrasado({ created_at: hace(14) }, AHORA)).toBe(true);
    expect(estaMuyAtrasado({ created_at: hace(20) }, AHORA)).toBe(true);
    expect(estaMuyAtrasado({ created_at: hace(90) }, AHORA)).toBe(true);
  });

  it("no marca un pedido con fecha inválida", () => {
    expect(estaMuyAtrasado({ created_at: "" }, AHORA)).toBe(false);
  });
});

describe("empujarAtrasadosAlFinal", () => {
  // Los tests fijan un `created_at` relativo a hoy, no a AHORA, porque la
  // función usa la fecha real del sistema.
  const haceReal = (dias: number) =>
    new Date(Date.now() - dias * 24 * 60 * 60 * 1000).toISOString();

  const pedido = (id: string, dias: number) =>
    ({ idFirebase: id, created_at: haceReal(dias) }) as Parameters<
      typeof empujarAtrasadosAlFinal
    >[0][number];

  it("manda los atrasados al final conservando el orden de los demás", () => {
    const lista = [
      pedido("viejo", 30),
      pedido("hoy", 0),
      pedido("ayer", 1),
      pedido("dos-semanas", 15),
    ];
    const r = empujarAtrasadosAlFinal(lista).map((o) => o.idFirebase);
    expect(r).toEqual(["hoy", "ayer", "viejo", "dos-semanas"]);
  });

  it("entre los atrasados deja primero al más antiguo", () => {
    const lista = [pedido("de-20", 20), pedido("de-40", 40), pedido("de-30", 30)];
    const r = empujarAtrasadosAlFinal(lista).map((o) => o.idFirebase);
    expect(r).toEqual(["de-40", "de-30", "de-20"]);
  });

  it("no altera la lista si ninguno está atrasado", () => {
    const lista = [pedido("a", 1), pedido("b", 5), pedido("c", 10)];
    const r = empujarAtrasadosAlFinal(lista).map((o) => o.idFirebase);
    expect(r).toEqual(["a", "b", "c"]);
  });

  it("devuelve la misma lista vacía sin romperse", () => {
    expect(empujarAtrasadosAlFinal([])).toEqual([]);
  });
});
