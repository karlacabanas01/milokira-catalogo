import { describe, expect, it } from "vitest";
import {
  fechaNota,
  filtrarNotas,
  MAX_TEXTO,
  MAX_TITULO,
  ordenarNotas,
  selloDeTiempo,
  validarNota,
  type NotaNegocio,
} from "./notasHelpers";

const nota = (
  idFirebase: string,
  texto: string,
  created_at: string,
  fijada = false,
  titulo?: string,
): NotaNegocio => ({ idFirebase, texto, created_at, fijada, titulo });

describe("validarNota", () => {
  it("acepta y limpia un texto normal", () => {
    const r = validarNota("  Las calatheas se venden mejor en invierno  ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.texto).toBe("Las calatheas se venden mejor en invierno");
  });

  it("rechaza el texto vacío o solo espacios", () => {
    expect(validarNota("").ok).toBe(false);
    expect(validarNota("   \n  ").ok).toBe(false);
  });

  it("rechaza un texto más largo que el límite", () => {
    const r = validarNota("a".repeat(MAX_TEXTO + 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(String(MAX_TEXTO));
  });

  it("acepta un texto exactamente en el límite", () => {
    expect(validarNota("a".repeat(MAX_TEXTO)).ok).toBe(true);
  });
});

describe("ordenarNotas", () => {
  it("pone las fijadas primero", () => {
    const r = ordenarNotas([
      nota("a", "vieja", "2026-10-01T10:00:00"),
      nota("b", "fijada", "2026-09-01T10:00:00", true),
    ]);
    expect(r.map((n) => n.idFirebase)).toEqual(["b", "a"]);
  });

  it("dentro de cada grupo, las más recientes arriba", () => {
    const r = ordenarNotas([
      nota("a", "antigua", "2026-10-01T10:00:00"),
      nota("b", "nueva", "2026-10-10T10:00:00"),
      nota("c", "fijada antigua", "2026-08-01T10:00:00", true),
      nota("d", "fijada nueva", "2026-09-01T10:00:00", true),
    ]);
    expect(r.map((n) => n.idFirebase)).toEqual(["d", "c", "b", "a"]);
  });

  it("no muta el arreglo original", () => {
    const original = [
      nota("a", "x", "2026-10-01T10:00:00"),
      nota("b", "y", "2026-10-10T10:00:00"),
    ];
    ordenarNotas(original);
    expect(original[0].idFirebase).toBe("a");
  });
});

describe("filtrarNotas", () => {
  const notas = [
    nota("a", "Las Calatheas se venden en invierno", "2026-10-01T10:00:00"),
    nota("b", "El proveedor sube precios en marzo", "2026-10-02T10:00:00"),
  ];

  it("encuentra sin distinguir mayúsculas", () => {
    expect(filtrarNotas(notas, "calathea")).toHaveLength(1);
    expect(filtrarNotas(notas, "CALATHEA")).toHaveLength(1);
  });

  it("encuentra sin distinguir tildes", () => {
    const conTilde = [nota("c", "Caláthea especial", "2026-10-01T10:00:00")];
    expect(filtrarNotas(conTilde, "calathea")).toHaveLength(1);
  });

  it("con búsqueda vacía devuelve todo", () => {
    expect(filtrarNotas(notas, "")).toHaveLength(2);
    expect(filtrarNotas(notas, "   ")).toHaveLength(2);
  });

  it("devuelve vacío si nada calza", () => {
    expect(filtrarNotas(notas, "monstera")).toHaveLength(0);
  });
});

describe("fechaNota", () => {
  const HOY = new Date("2026-10-14T12:00:00");

  it("muestra día y mes si es del año en curso", () => {
    expect(fechaNota("2026-10-01T10:00:00", HOY)).toBe("1 oct");
  });

  it("agrega el año si es de otro año", () => {
    expect(fechaNota("2025-10-01T10:00:00", HOY)).toContain("2025");
  });

  it("devuelve un guion si la fecha es ilegible", () => {
    expect(fechaNota("no es fecha", HOY)).toBe("—");
    expect(fechaNota("", HOY)).toBe("—");
  });
});

describe("notas editadas", () => {
  const HOY = new Date("2026-10-14T12:00:00");

  it("una nota editada sube como si fuera reciente", () => {
    const r = ordenarNotas([
      nota("nueva", "recién escrita", "2026-10-10T10:00:00"),
      {
        ...nota("vieja", "lista del taller", "2026-09-01T10:00:00"),
        updated_at: "2026-10-13T10:00:00",
      },
    ]);
    expect(r[0].idFirebase).toBe("vieja");
  });

  it("sin updated_at ordena por la fecha de creación", () => {
    const r = ordenarNotas([
      nota("a", "antigua", "2026-10-01T10:00:00"),
      nota("b", "nueva", "2026-10-10T10:00:00"),
    ]);
    expect(r[0].idFirebase).toBe("b");
  });

  it("una fecha de edición ilegible no rompe el orden", () => {
    const r = ordenarNotas([
      nota("a", "normal", "2026-10-10T10:00:00"),
      { ...nota("b", "rota", "2026-10-01T10:00:00"), updated_at: "no es fecha" },
    ]);
    expect(r.map((n) => n.idFirebase)).toEqual(["a", "b"]);
  });

  it("marca como editada y usa la fecha de edición", () => {
    const r = selloDeTiempo(
      { created_at: "2026-09-01T10:00:00", updated_at: "2026-10-13T10:00:00" },
      HOY,
    );
    expect(r.etiqueta).toBe("Editada");
    expect(r.fecha).toBe("13 oct");
  });

  it("sin editar no lleva etiqueta y usa la fecha de creación", () => {
    const r = selloDeTiempo({ created_at: "2026-10-01T10:00:00" }, HOY);
    expect(r.etiqueta).toBe("");
    expect(r.fecha).toBe("1 oct");
  });

  it("un updated_at vacío cuenta como no editada", () => {
    expect(
      selloDeTiempo({ created_at: "2026-10-01T10:00:00", updated_at: "  " }, HOY)
        .etiqueta,
    ).toBe("");
  });
});

describe("título opcional", () => {
  it("acepta una nota con título", () => {
    const r = validarNota("1. María\n2. Carolina", "  Taller 25 oct  ");
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.titulo).toBe("Taller 25 oct");
      expect(r.texto).toBe("1. María\n2. Carolina");
    }
  });

  it("acepta una nota sin título", () => {
    const r = validarNota("Las calatheas se venden en invierno");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.titulo).toBe("");
  });

  it("un título de solo espacios queda vacío", () => {
    const r = validarNota("algo", "   ");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.titulo).toBe("");
  });

  it("rechaza un título más largo que el límite", () => {
    const r = validarNota("algo", "t".repeat(MAX_TITULO + 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(String(MAX_TITULO));
  });

  it("acepta un título exactamente en el límite", () => {
    expect(validarNota("algo", "t".repeat(MAX_TITULO)).ok).toBe(true);
  });

  it("sigue exigiendo el texto aunque haya título", () => {
    expect(validarNota("", "Taller 25 oct").ok).toBe(false);
  });

  it("el buscador encuentra por título", () => {
    const notas = [
      nota("a", "1. María\n2. Carolina", "2026-10-01T10:00:00", false, "Taller suculentas"),
      nota("b", "El proveedor sube en marzo", "2026-10-02T10:00:00"),
    ];
    expect(filtrarNotas(notas, "taller")).toHaveLength(1);
    expect(filtrarNotas(notas, "SUCULENTAS")).toHaveLength(1);
  });

  it("el buscador sigue encontrando por texto en notas sin título", () => {
    const notas = [nota("b", "El proveedor sube en marzo", "2026-10-02T10:00:00")];
    expect(filtrarNotas(notas, "proveedor")).toHaveLength(1);
  });
});
