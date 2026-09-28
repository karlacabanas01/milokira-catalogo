import { describe, expect, it } from "vitest";
import { jsonLdNegocio, NEGOCIO } from "./negocio";

describe("JSON-LD del negocio", () => {
  const ld = jsonLdNegocio();

  it("se declara como vivero para el buscador", () => {
    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("GardenStore");
  });

  it("lleva el nombre, teléfono y sitio del negocio", () => {
    expect(ld.name).toBe("Milokira");
    expect(ld.telephone).toBe(NEGOCIO.telefono);
    expect(ld.url).toBe(NEGOCIO.sitio);
  });

  it("ubica el negocio en Talca, Región del Maule", () => {
    expect(ld.address.addressLocality).toBe("Talca");
    expect(ld.address.addressRegion).toBe("Región del Maule");
    expect(ld.address.addressCountry).toBe("CL");
  });

  it("declara la zona que atiende", () => {
    const zonas = ld.areaServed.map((a) => a.name);
    expect(zonas).toContain("Talca");
    expect(zonas).toContain("Región del Maule");
    expect(zonas).toContain("Chile");
  });

  it("es serializable: si no, el script del layout queda roto", () => {
    expect(() => JSON.stringify(ld)).not.toThrow();
    expect(JSON.parse(JSON.stringify(ld))["@type"]).toBe("GardenStore");
  });

  it("el teléfono va en formato internacional", () => {
    expect(NEGOCIO.telefono).toMatch(/^\+56\d{9}$/);
  });

  it("las coordenadas caen dentro de Chile", () => {
    expect(NEGOCIO.lat).toBeLessThan(-17);
    expect(NEGOCIO.lat).toBeGreaterThan(-56);
    expect(NEGOCIO.lng).toBeLessThan(-66);
    expect(NEGOCIO.lng).toBeGreaterThan(-76);
  });
});
