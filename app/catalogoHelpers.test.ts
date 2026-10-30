import { describe, expect, it } from "vitest";
import {
  compararNombres,
  estaDisponible,
  ordenarCatalogo,
  textoActualizacion,
  ultimaActualizacion,
  type PlantaOrdenable,
} from "./catalogoHelpers";

const planta = (
  nombre: string,
  stock?: number,
  disponible?: boolean,
): PlantaOrdenable => ({
  nombre,
  stock,
  ...(disponible === undefined ? {} : { precio: { disponible } }),
});

describe("estaDisponible", () => {
  it("con stock y sin marca está disponible", () => {
    expect(estaDisponible(planta("Monstera", 5))).toBe(true);
  });

  it("sin stock está agotada", () => {
    expect(estaDisponible(planta("Monstera", 0))).toBe(false);
  });

  it("marcada como no disponible está agotada aunque haya stock", () => {
    expect(estaDisponible(planta("Monstera", 10, false))).toBe(false);
  });

  it("sin el campo stock se asume que hay", () => {
    // Las plantas cargadas antes del campo no deben desaparecer.
    expect(estaDisponible({ nombre: "Antigua" })).toBe(true);
  });
});

describe("compararNombres", () => {
  it("ordena alfabéticamente", () => {
    expect(compararNombres("Aloe", "Begonia")).toBeLessThan(0);
    expect(compararNombres("Begonia", "Aloe")).toBeGreaterThan(0);
  });

  it("distingue nombres que comparten las primeras letras", () => {
    // El orden viejo comparaba solo 3 letras y los dejaba arbitrarios.
    expect(
      compararNombres("Monstera Adansonii", "Monstera Deliciosa"),
    ).toBeLessThan(0);
  });

  it("ignora mayúsculas y tildes", () => {
    expect(compararNombres("áloe", "ALOE")).toBe(0);
    expect(compararNombres("MONSTERA", "monstera")).toBe(0);
  });

  it("la ñ es su propia letra, después de la n", () => {
    // En español no es una "n con tilde": Ñandú va después de Nogal.
    expect(compararNombres("Ñandú", "Nogal")).toBeGreaterThan(0);
  });

  it("ordena los números como números", () => {
    expect(compararNombres("Maceta 2", "Maceta 10")).toBeLessThan(0);
  });

  it("ignora espacios al principio y al final", () => {
    expect(compararNombres("  Aloe  ", "Aloe")).toBe(0);
  });
});

describe("ordenarCatalogo", () => {
  it("pone las agotadas al final", () => {
    const r = ordenarCatalogo([
      planta("Aloe", 0),
      planta("Zamia", 5),
    ]);
    expect(r.map((p) => p.nombre)).toEqual(["Zamia", "Aloe"]);
  });

  it("ordena alfabéticamente dentro de cada grupo", () => {
    const r = ordenarCatalogo([
      planta("Zamia", 3),
      planta("Begonia", 0),
      planta("Aloe", 2),
      planta("Yuca", 0),
    ]);
    expect(r.map((p) => p.nombre)).toEqual([
      "Aloe",
      "Zamia",
      "Begonia",
      "Yuca",
    ]);
  });

  it("trata la marcada como no disponible igual que la sin stock", () => {
    const r = ordenarCatalogo([
      planta("Aloe", 10, false),
      planta("Zamia", 1),
    ]);
    expect(r.map((p) => p.nombre)).toEqual(["Zamia", "Aloe"]);
  });

  it("no muta el arreglo original", () => {
    const original = [planta("Zamia", 0), planta("Aloe", 5)];
    ordenarCatalogo(original);
    expect(original[0].nombre).toBe("Zamia");
  });

  it("con todas disponibles queda solo el alfabético", () => {
    const r = ordenarCatalogo([
      planta("Zamia", 1),
      planta("Aloe", 1),
      planta("Monstera", 1),
    ]);
    expect(r.map((p) => p.nombre)).toEqual(["Aloe", "Monstera", "Zamia"]);
  });

  it("con todas agotadas queda solo el alfabético", () => {
    const r = ordenarCatalogo([
      planta("Zamia", 0),
      planta("Aloe", 0),
    ]);
    expect(r.map((p) => p.nombre)).toEqual(["Aloe", "Zamia"]);
  });

  it("con la lista vacía devuelve vacío", () => {
    expect(ordenarCatalogo([])).toEqual([]);
  });
});

describe("stock cero vs marca de no disponible", () => {
  it("una planta con stock 0 y disponible true cuenta como agotada", () => {
    // La card mostraba estas a la venta porque solo miraba `disponible`.
    const p = planta("Monstera", 0, true);
    expect(estaDisponible(p)).toBe(false);
  });

  it("las agotadas por stock van al final junto a las marcadas", () => {
    const r = ordenarCatalogo([
      planta("Yuca", 0, true),
      planta("Zamia", 4),
      planta("Aloe", 7, false),
      planta("Begonia", 2),
    ]);
    expect(r.map((p) => p.nombre)).toEqual([
      "Begonia",
      "Zamia",
      "Aloe",
      "Yuca",
    ]);
  });
});

describe("ultimaActualizacion", () => {
  it("devuelve la fecha más reciente entre las plantas", () => {
    const r = ultimaActualizacion([
      { nombre: "Aloe", updated_at: "2026-10-01T10:00:00" },
      { nombre: "Zamia", updated_at: "2026-10-20T10:00:00" },
      { nombre: "Monstera", updated_at: "2026-10-05T10:00:00" },
    ]);
    expect(r?.toISOString()).toBe(new Date("2026-10-20T10:00:00").toISOString());
  });

  it("devuelve null si ninguna tiene fecha", () => {
    // Las 200 plantas cargadas antes de que existiera el campo.
    expect(ultimaActualizacion([{ nombre: "Aloe" }, { nombre: "Zamia" }])).toBeNull();
  });

  it("ignora las que no tienen fecha y usa las que sí", () => {
    const r = ultimaActualizacion([
      { nombre: "Aloe" },
      { nombre: "Zamia", updated_at: "2026-10-20T10:00:00" },
    ]);
    expect(r).not.toBeNull();
  });

  it("ignora fechas ilegibles", () => {
    expect(
      ultimaActualizacion([{ nombre: "Aloe", updated_at: "no es fecha" }]),
    ).toBeNull();
  });

  it("con la lista vacía devuelve null", () => {
    expect(ultimaActualizacion([])).toBeNull();
  });
});

describe("textoActualizacion", () => {
  const HOY = new Date("2026-10-29T15:00:00");

  it("dice hoy cuando es del mismo día", () => {
    expect(textoActualizacion(new Date("2026-10-29T08:00:00"), HOY)).toBe("hoy");
  });

  it("dice ayer", () => {
    expect(textoActualizacion(new Date("2026-10-28T20:00:00"), HOY)).toBe("ayer");
  });

  it("cuenta los días dentro de la semana", () => {
    expect(textoActualizacion(new Date("2026-10-26T10:00:00"), HOY)).toBe(
      "hace 3 días",
    );
  });

  it("pasada la semana muestra la fecha escrita", () => {
    expect(textoActualizacion(new Date("2026-10-10T10:00:00"), HOY)).toBe(
      "10 de octubre",
    );
  });

  it("agrega el año si es de otro año", () => {
    expect(textoActualizacion(new Date("2025-10-10T10:00:00"), HOY)).toContain(
      "2025",
    );
  });

  it("una fecha futura se muestra como hoy", () => {
    // Un reloj desfasado no debería decir "hace -2 días".
    expect(textoActualizacion(new Date("2026-10-31T10:00:00"), HOY)).toBe("hoy");
  });
});
