import { describe, expect, it } from "vitest";
import {
  calcularDv,
  COMUNAS_POR_REGION,
  comunasDe,
  COURIERS,
  formatearRut,
  nombreCourier,
  REGIONES,
  validarEmail,
  validarRut,
} from "./helpers";

describe("calcularDv", () => {
  it("calcula el dígito verificador", () => {
    expect(calcularDv("12345678")).toBe("5");
    expect(calcularDv("17958909")).toBe("5");
  });

  it("devuelve K cuando corresponde", () => {
    expect(calcularDv("11111111")).toBe("1");
    expect(calcularDv("20347878")).toBe("K");
  });

  it("devuelve vacío si el cuerpo no es numérico", () => {
    expect(calcularDv("abc")).toBe("");
    expect(calcularDv("")).toBe("");
  });
});

describe("validarRut", () => {
  it("acepta un RUT válido en cualquier formato", () => {
    expect(validarRut("12.345.678-5")).toBe(true);
    expect(validarRut("12345678-5")).toBe(true);
    expect(validarRut("123456785")).toBe(true);
  });

  it("acepta un RUT con dígito verificador K", () => {
    expect(validarRut("20.347.878-K")).toBe(true);
    expect(validarRut("20347878k")).toBe(true);
  });

  it("rechaza un dígito verificador equivocado", () => {
    expect(validarRut("12.345.678-9")).toBe(false);
  });

  it("rechaza un RUT demasiado corto o largo", () => {
    expect(validarRut("1234-5")).toBe(false);
    expect(validarRut("123456789012-5")).toBe(false);
    expect(validarRut("")).toBe(false);
  });
});

describe("formatearRut", () => {
  it("agrega puntos y guion", () => {
    expect(formatearRut("123456785")).toBe("12.345.678-5");
    expect(formatearRut("20347878K")).toBe("20.347.878-K");
  });

  it("deja pasar lo escrito si todavía no tiene forma de RUT", () => {
    expect(formatearRut("1")).toBe("1");
  });
});

describe("validarEmail", () => {
  it("acepta correos con forma válida", () => {
    expect(validarEmail("karla@milokira.cl")).toBe(true);
  });

  it("rechaza lo que claramente no es un correo", () => {
    expect(validarEmail("karla@")).toBe(false);
    expect(validarEmail("karla.milokira.cl")).toBe(false);
    expect(validarEmail("")).toBe(false);
  });
});

describe("catálogos", () => {
  it("tiene las 16 regiones de Chile", () => {
    expect(REGIONES).toHaveLength(16);
    expect(REGIONES).toContain("Maule");
    expect(REGIONES).toContain("Magallanes");
  });

  it("cubre las 346 comunas del país", () => {
    const total = Object.values(COMUNAS_POR_REGION).reduce(
      (acc, lista) => acc + lista.length,
      0,
    );
    expect(total).toBe(346);
  });

  it("no repite una comuna dentro de su región", () => {
    for (const [region, lista] of Object.entries(COMUNAS_POR_REGION)) {
      expect(new Set(lista).size, `duplicadas en ${region}`).toBe(lista.length);
    }
  });

  it("todas las regiones tienen al menos una comuna", () => {
    for (const region of REGIONES) {
      expect(comunasDe(region).length, region).toBeGreaterThan(0);
    }
  });

  it("traduce el courier a su nombre visible", () => {
    expect(nombreCourier("starken")).toBe("Starken");
    expect(nombreCourier("correos")).toBe("Correos de Chile");
    expect(nombreCourier("blueexpress")).toBe("BlueExpress");
    expect(nombreCourier("otro")).toBe("");
    expect(nombreCourier(undefined)).toBe("");
  });

  it("acota las comunas a su región", () => {
    expect(comunasDe("Maule")).toContain("Talca");
    expect(comunasDe("Maule")).not.toContain("Temuco");
    expect(comunasDe("La Araucanía")).toContain("Temuco");
    expect(comunasDe("Metropolitana")).toContain("Ñuñoa");
  });

  it("devuelve lista vacía si la región no existe o está sin elegir", () => {
    expect(comunasDe("")).toEqual([]);
    expect(comunasDe("Narnia")).toEqual([]);
  });

  it("ofrece los tres couriers", () => {
    expect(COURIERS.map((c) => c.valor)).toEqual([
      "correos",
      "starken",
      "blueexpress",
    ]);
  });
});
