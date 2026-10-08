import { describe, expect, it } from "vitest";
import {
  calcularGananciaMes,
  DIA_CORTE,
  esDelPeriodo,
  finDePeriodo,
  inicioDePeriodo,
  rangoDelPeriodo,
} from "./mesHelpers";

// Dos referencias que caen a cada lado del corte, dentro del mismo mes.
const ANTES_DEL_25 = new Date("2026-10-07T12:00:00");
const DESPUES_DEL_25 = new Date("2026-10-28T12:00:00");

describe("rango del período", () => {
  it("corta el día 25", () => {
    expect(DIA_CORTE).toBe(25);
  });

  it("antes del 25, el período arrancó el mes anterior", () => {
    const i = inicioDePeriodo(ANTES_DEL_25);
    expect(i.getDate()).toBe(25);
    expect(i.getMonth()).toBe(8); // septiembre
    const f = finDePeriodo(ANTES_DEL_25);
    expect(f.getDate()).toBe(24);
    expect(f.getMonth()).toBe(9); // octubre
  });

  it("desde el 25, el período arrancó este mes", () => {
    const i = inicioDePeriodo(DESPUES_DEL_25);
    expect(i.getDate()).toBe(25);
    expect(i.getMonth()).toBe(9); // octubre
    const f = finDePeriodo(DESPUES_DEL_25);
    expect(f.getDate()).toBe(24);
    expect(f.getMonth()).toBe(10); // noviembre
  });

  it("el día 25 mismo ya es período nuevo", () => {
    const i = inicioDePeriodo(new Date("2026-10-25T00:00:00"));
    expect(i.getMonth()).toBe(9); // octubre, no septiembre
    expect(i.getDate()).toBe(25);
  });

  it("arranca a las 00:00 y termina a las 23:59", () => {
    expect(inicioDePeriodo(ANTES_DEL_25).getHours()).toBe(0);
    expect(finDePeriodo(ANTES_DEL_25).getHours()).toBe(23);
  });

  it("cruza el fin de año sin romperse", () => {
    // 10 de enero 2027 → el período arrancó el 25 de diciembre 2026.
    const i = inicioDePeriodo(new Date("2027-01-10T12:00:00"));
    expect(i.getFullYear()).toBe(2026);
    expect(i.getMonth()).toBe(11); // diciembre
    const f = finDePeriodo(new Date("2027-01-10T12:00:00"));
    expect(f.getFullYear()).toBe(2027);
    expect(f.getMonth()).toBe(0); // enero
    expect(f.getDate()).toBe(24);
  });

  it("funciona con febrero, que no tiene 30 días", () => {
    // 10 de marzo → el período arrancó el 25 de febrero.
    const i = inicioDePeriodo(new Date("2026-03-10T12:00:00"));
    expect(i.getMonth()).toBe(1); // febrero
    expect(i.getDate()).toBe(25);
    const f = finDePeriodo(new Date("2026-03-10T12:00:00"));
    expect(f.getMonth()).toBe(2); // marzo
    expect(f.getDate()).toBe(24);
  });
});

describe("esDelPeriodo", () => {
  it("cuenta el día 25 y el 24 siguiente", () => {
    expect(esDelPeriodo("2026-09-25T00:30:00", ANTES_DEL_25)).toBe(true);
    expect(esDelPeriodo("2026-10-24T23:00:00", ANTES_DEL_25)).toBe(true);
  });

  it("descarta el día anterior al corte y el posterior al cierre", () => {
    expect(esDelPeriodo("2026-09-24T23:59:00", ANTES_DEL_25)).toBe(false);
    expect(esDelPeriodo("2026-10-25T00:01:00", ANTES_DEL_25)).toBe(false);
  });

  it("descarta fechas ausentes o ilegibles", () => {
    expect(esDelPeriodo(undefined, ANTES_DEL_25)).toBe(false);
    expect(esDelPeriodo("", ANTES_DEL_25)).toBe(false);
    expect(esDelPeriodo("no es fecha", ANTES_DEL_25)).toBe(false);
  });
});

describe("calcularGananciaMes", () => {
  it("resta los gastos del período a las ventas del período", () => {
    const r = calcularGananciaMes(
      [
        { created_at: "2026-09-26T10:00:00", total_amount: 50000 },
        { created_at: "2026-10-20T10:00:00", total_amount: 30000 },
      ],
      [{ created_at: "2026-10-01T10:00:00", amount: 20000 }],
      ANTES_DEL_25,
    );
    expect(r.ventas).toBe(80000);
    expect(r.gastos).toBe(20000);
    expect(r.ganancia).toBe(60000);
  });

  it("deja fuera lo anterior al 25 del mes pasado", () => {
    const r = calcularGananciaMes(
      [
        { created_at: "2026-10-05T10:00:00", total_amount: 50000 },
        // 20 de septiembre: período anterior.
        { created_at: "2026-09-20T10:00:00", total_amount: 99000 },
      ],
      [{ created_at: "2026-09-10T10:00:00", amount: 80000 }],
      ANTES_DEL_25,
    );
    expect(r.ventas).toBe(50000);
    expect(r.gastos).toBe(0);
  });

  it("un gasto del 26 cuenta para el período que acaba de empezar", () => {
    const r = calcularGananciaMes(
      [],
      [{ created_at: "2026-10-26T10:00:00", amount: 15000 }],
      DESPUES_DEL_25,
    );
    expect(r.gastos).toBe(15000);
  });

  it("no cuenta los pedidos pendientes como venta", () => {
    const r = calcularGananciaMes(
      [
        { created_at: "2026-10-05T10:00:00", total_amount: 50000 },
        {
          created_at: "2026-10-06T10:00:00",
          total_amount: 40000,
          status: "pending",
        },
      ],
      [],
      ANTES_DEL_25,
    );
    expect(r.ventas).toBe(50000);
  });

  it("devuelve ganancia negativa si el período cerró en pérdida", () => {
    const r = calcularGananciaMes(
      [{ created_at: "2026-10-05T10:00:00", total_amount: 20000 }],
      [{ created_at: "2026-10-06T10:00:00", amount: 90000 }],
      ANTES_DEL_25,
    );
    expect(r.ganancia).toBe(-70000);
  });

  it("devuelve ceros si el período no tuvo movimientos", () => {
    expect(calcularGananciaMes([], [], ANTES_DEL_25)).toEqual({
      ventas: 0,
      gastos: 0,
      ganancia: 0,
    });
  });
});

describe("rangoDelPeriodo", () => {
  it("muestra el rango explícito del período en curso", () => {
    expect(rangoDelPeriodo(ANTES_DEL_25)).toBe("25 sept → 24 oct");
    expect(rangoDelPeriodo(DESPUES_DEL_25)).toBe("25 oct → 24 nov");
  });
});
