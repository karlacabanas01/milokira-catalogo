import { describe, expect, it } from "vitest";
import {
  aInputDate,
  calcularGananciaMes,
  desdeInputDate,
  DIA_CORTE,
  resumirRango,
  esDelPeriodo,
  finDePeriodo,
  inicioDePeriodo,
  rangoDelPeriodo,
} from "./mesHelpers";

// Dos referencias a cada lado del corte: una antes del 29 (período ya
// arrancado el mes anterior) y una desde el 28.
const ANTES_DEL_28 = new Date("2026-11-15T12:00:00");
const DESPUES_DEL_28 = new Date("2026-10-30T12:00:00");

describe("rango del período", () => {
  it("corta el día 28", () => {
    expect(DIA_CORTE).toBe(28);
  });

  it("antes del 28, el período arrancó el mes anterior", () => {
    const i = inicioDePeriodo(ANTES_DEL_28);
    expect(i.getDate()).toBe(28);
    expect(i.getMonth()).toBe(9); // octubre
    const f = finDePeriodo(ANTES_DEL_28);
    expect(f.getDate()).toBe(27);
    expect(f.getMonth()).toBe(10); // noviembre
  });

  it("desde el 28, el período arrancó este mes", () => {
    const i = inicioDePeriodo(DESPUES_DEL_28);
    expect(i.getDate()).toBe(28);
    expect(i.getMonth()).toBe(9); // octubre
    const f = finDePeriodo(DESPUES_DEL_28);
    expect(f.getDate()).toBe(27);
    expect(f.getMonth()).toBe(10); // noviembre
  });

  it("el día 28 mismo ya es período nuevo", () => {
    const i = inicioDePeriodo(new Date("2026-10-28T00:00:00"));
    expect(i.getMonth()).toBe(9); // octubre, no septiembre
    expect(i.getDate()).toBe(28);
  });

  it("el día 27 todavía es del período anterior", () => {
    const i = inicioDePeriodo(new Date("2026-10-27T23:00:00"));
    expect(i.getMonth()).toBe(8); // septiembre
  });

  it("arranca a las 00:00 y termina a las 23:59", () => {
    expect(inicioDePeriodo(ANTES_DEL_28).getHours()).toBe(0);
    expect(finDePeriodo(ANTES_DEL_28).getHours()).toBe(23);
  });

  it("cruza el fin de año sin romperse", () => {
    const i = inicioDePeriodo(new Date("2027-01-10T12:00:00"));
    expect(i.getFullYear()).toBe(2026);
    expect(i.getMonth()).toBe(11); // diciembre
    const f = finDePeriodo(new Date("2027-01-10T12:00:00"));
    expect(f.getFullYear()).toBe(2027);
    expect(f.getMonth()).toBe(0); // enero
    expect(f.getDate()).toBe(27);
  });

  it("febrero no necesita caso especial: el 28 existe siempre", () => {
    const i = inicioDePeriodo(new Date("2026-03-10T12:00:00"));
    expect(i.getMonth()).toBe(1); // febrero
    expect(i.getDate()).toBe(28);
    const f = finDePeriodo(new Date("2026-03-10T12:00:00"));
    expect(f.getMonth()).toBe(2); // marzo
    expect(f.getDate()).toBe(27);
  });

  it("los períodos encadenan sin huecos ni días repetidos", () => {
    // El fin de uno es siempre el día anterior al inicio del siguiente,
    // incluso cuando el corte se adelanta por un mes corto.
    const meses = [
      "2026-01-15", "2026-02-15", "2026-03-15", "2026-04-15",
      "2026-11-15", "2026-12-15", "2028-02-15",
    ];
    for (const mes of meses) {
      const ref = new Date(mes + "T12:00:00");
      const fin = finDePeriodo(ref);

      const siguiente = new Date(fin);
      siguiente.setDate(siguiente.getDate() + 1);
      const inicioSiguiente = inicioDePeriodo(siguiente);

      expect(inicioSiguiente.toDateString(), `tras ${mes}`).toBe(
        siguiente.toDateString(),
      );
    }
  });
});

describe("esDelPeriodo", () => {
  it("cuenta el día 28 y el 27 siguiente", () => {
    expect(esDelPeriodo("2026-10-28T00:30:00", ANTES_DEL_28)).toBe(true);
    expect(esDelPeriodo("2026-11-27T23:00:00", ANTES_DEL_28)).toBe(true);
  });

  it("descarta el día anterior al corte y el posterior al cierre", () => {
    expect(esDelPeriodo("2026-10-27T23:59:00", ANTES_DEL_28)).toBe(false);
    expect(esDelPeriodo("2026-11-28T00:01:00", ANTES_DEL_28)).toBe(false);
  });

  it("descarta fechas ausentes o ilegibles", () => {
    expect(esDelPeriodo(undefined, ANTES_DEL_28)).toBe(false);
    expect(esDelPeriodo("", ANTES_DEL_28)).toBe(false);
    expect(esDelPeriodo("no es fecha", ANTES_DEL_28)).toBe(false);
  });
});

describe("calcularGananciaMes", () => {
  it("resta los gastos del período a las ventas del período", () => {
    const r = calcularGananciaMes(
      [
        { created_at: "2026-10-30T10:00:00", total_amount: 50000 },
        { created_at: "2026-11-20T10:00:00", total_amount: 30000 },
      ],
      [{ created_at: "2026-11-10T10:00:00", amount: 20000 }],
      DESPUES_DEL_28,
    );
    expect(r.ventas).toBe(80000);
    expect(r.gastos).toBe(20000);
    expect(r.ganancia).toBe(60000);
  });

  it("deja fuera lo anterior al 28 de este mes", () => {
    const r = calcularGananciaMes(
      [
        { created_at: "2026-10-30T10:00:00", total_amount: 50000 },
        // 20 de octubre: período anterior.
        { created_at: "2026-10-20T10:00:00", total_amount: 99000 },
      ],
      [{ created_at: "2026-10-15T10:00:00", amount: 80000 }],
      DESPUES_DEL_28,
    );
    expect(r.ventas).toBe(50000);
    expect(r.gastos).toBe(0);
  });

  it("un gasto del 30 cuenta para el período que acaba de empezar", () => {
    const r = calcularGananciaMes(
      [],
      [{ created_at: "2026-10-30T10:00:00", amount: 15000 }],
      DESPUES_DEL_28,
    );
    expect(r.gastos).toBe(15000);
  });

  it("no cuenta los pedidos pendientes como venta", () => {
    const r = calcularGananciaMes(
      [
        { created_at: "2026-10-30T10:00:00", total_amount: 50000 },
        {
          created_at: "2026-10-31T10:00:00",
          total_amount: 40000,
          status: "pending",
        },
      ],
      [],
      DESPUES_DEL_28,
    );
    expect(r.ventas).toBe(50000);
  });

  it("devuelve ganancia negativa si el período cerró en pérdida", () => {
    const r = calcularGananciaMes(
      [{ created_at: "2026-10-30T10:00:00", total_amount: 20000 }],
      [{ created_at: "2026-10-31T10:00:00", amount: 90000 }],
      DESPUES_DEL_28,
    );
    expect(r.ganancia).toBe(-70000);
  });

  it("devuelve ceros si el período no tuvo movimientos", () => {
    expect(calcularGananciaMes([], [], DESPUES_DEL_28)).toEqual({
      ventas: 0,
      gastos: 0,
      ganancia: 0,
    });
  });
});

describe("rangoDelPeriodo", () => {
  it("muestra el rango explícito del período en curso", () => {
    expect(rangoDelPeriodo(DESPUES_DEL_28)).toBe("28 oct → 27 nov");
    expect(rangoDelPeriodo(ANTES_DEL_28)).toBe("28 oct → 27 nov");
  });
});

describe("conversión de fechas del input", () => {
  it("convierte YYYY-MM-DD a fecha local", () => {
    const d = desdeInputDate("2026-10-29");
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(9);
    expect(d?.getDate()).toBe(29);
  });

  it("devuelve null si el formato no sirve", () => {
    expect(desdeInputDate("")).toBeNull();
    expect(desdeInputDate("29/10/2026")).toBeNull();
    expect(desdeInputDate("hola")).toBeNull();
  });

  it("vuelve al formato del input con ceros a la izquierda", () => {
    expect(aInputDate(new Date(2026, 0, 5))).toBe("2026-01-05");
    expect(aInputDate(new Date(2026, 9, 29))).toBe("2026-10-29");
  });

  it("ida y vuelta conserva el día", () => {
    const original = "2026-02-28";
    expect(aInputDate(desdeInputDate(original)!)).toBe(original);
  });
});

describe("resumirRango", () => {
  const DESDE = new Date(2026, 9, 1);
  const HASTA = new Date(2026, 9, 31);

  it("suma ventas y gastos del rango", () => {
    const r = resumirRango(
      [
        { created_at: "2026-10-05T10:00:00", total_amount: 50000 },
        { created_at: "2026-10-20T10:00:00", total_amount: 30000 },
      ],
      [{ created_at: "2026-10-10T10:00:00", amount: 20000 }],
      DESDE,
      HASTA,
    );
    expect(r.ventas).toBe(80000);
    expect(r.gastos).toBe(20000);
    expect(r.ganancia).toBe(60000);
  });

  it("incluye el día completo en los dos extremos", () => {
    // Elegir 1 al 31 toma desde las 00:00 del 1 hasta las 23:59 del 31.
    const r = resumirRango(
      [
        { created_at: "2026-10-01T00:30:00", total_amount: 1000 },
        { created_at: "2026-10-31T23:30:00", total_amount: 2000 },
      ],
      [],
      DESDE,
      HASTA,
    );
    expect(r.ventas).toBe(3000);
  });

  it("deja fuera lo que cae antes o después", () => {
    const r = resumirRango(
      [
        { created_at: "2026-09-30T23:59:00", total_amount: 9000 },
        { created_at: "2026-11-01T00:01:00", total_amount: 9000 },
      ],
      [],
      DESDE,
      HASTA,
    );
    expect(r.ventas).toBe(0);
  });

  it("no cuenta los pedidos pendientes", () => {
    const r = resumirRango(
      [
        { created_at: "2026-10-05T10:00:00", total_amount: 50000 },
        {
          created_at: "2026-10-06T10:00:00",
          total_amount: 40000,
          status: "pending",
        },
      ],
      [],
      DESDE,
      HASTA,
    );
    expect(r.ventas).toBe(50000);
    expect(r.detalle).toHaveLength(1);
  });

  it("lista el detalle del más reciente al más antiguo", () => {
    const r = resumirRango(
      [{ created_at: "2026-10-05T10:00:00", total_amount: 1000 }],
      [{ created_at: "2026-10-20T10:00:00", amount: 500 }],
      DESDE,
      HASTA,
    );
    expect(r.detalle.map((d) => d.tipo)).toEqual(["gasto", "venta"]);
  });

  it("usa el nombre del cliente y la descripción del gasto", () => {
    const r = resumirRango(
      [
        {
          created_at: "2026-10-05T10:00:00",
          total_amount: 1000,
          customer_name: "Ana",
        } as never,
      ],
      [
        {
          created_at: "2026-10-06T10:00:00",
          amount: 500,
          description: "Maceteros",
        } as never,
      ],
      DESDE,
      HASTA,
    );
    const textos = r.detalle.map((d) => d.descripcion);
    expect(textos).toContain("Ana");
    expect(textos).toContain("Maceteros");
  });

  it("sin nombre usa una etiqueta genérica", () => {
    const r = resumirRango(
      [{ created_at: "2026-10-05T10:00:00", total_amount: 1000 }],
      [{ created_at: "2026-10-06T10:00:00", amount: 500 }],
      DESDE,
      HASTA,
    );
    expect(r.detalle.map((d) => d.descripcion).sort()).toEqual([
      "Gasto",
      "Venta",
    ]);
  });

  it("un rango de un solo día toma ese día entero", () => {
    const dia = new Date(2026, 9, 15);
    const r = resumirRango(
      [
        { created_at: "2026-10-15T08:00:00", total_amount: 1000 },
        { created_at: "2026-10-15T22:00:00", total_amount: 2000 },
        { created_at: "2026-10-16T08:00:00", total_amount: 9000 },
      ],
      [],
      dia,
      dia,
    );
    expect(r.ventas).toBe(3000);
  });

  it("sin movimientos devuelve ceros y detalle vacío", () => {
    const r = resumirRango([], [], DESDE, HASTA);
    expect(r).toEqual({ ventas: 0, gastos: 0, ganancia: 0, detalle: [] });
  });
});
