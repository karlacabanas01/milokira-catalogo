import { describe, expect, it } from "vitest";
import {
  slugify,
  redondearComercial,
  parsePastedList,
  calcularCostoYsugerido,
  calcularCostoPlanta,
} from "./helpers";

describe("slugify", () => {
  it("genera slug en kebab-case desde un nombre simple", () => {
    expect(slugify("Monstera Deliciosa")).toBe("monstera-deliciosa");
  });

  it("elimina tildes y caracteres especiales", () => {
    expect(slugify("Begoña Rex")).toBe("begona-rex");
    expect(slugify("Ficus var. M17!")).toBe("ficus-var-m17");
  });

  it("colapsa espacios y guiones múltiples", () => {
    expect(slugify("   Philo   Pink   Princess   ")).toBe(
      "philo-pink-princess",
    );
  });

  it("trim de guiones al inicio y final", () => {
    expect(slugify(" - Hoya - ")).toBe("hoya");
  });
});

describe("redondearComercial", () => {
  it("retorna 0 para valores no positivos", () => {
    expect(redondearComercial(0)).toBe(0);
    expect(redondearComercial(-500)).toBe(0);
  });

  it("redondea bajo 10.000 al múltiplo de 500 más cercano", () => {
    expect(redondearComercial(1230)).toBe(1000);
    expect(redondearComercial(2780)).toBe(3000);
    expect(redondearComercial(4735)).toBe(4500);
    expect(redondearComercial(7890)).toBe(8000);
    expect(redondearComercial(9250)).toBe(9500);
  });

  it("redondea ≥10.000 al múltiplo de 1.000 más cercano", () => {
    expect(redondearComercial(10000)).toBe(10000);
    expect(redondearComercial(16278)).toBe(16000);
    expect(redondearComercial(24700)).toBe(25000);
  });

  it("respeta valores que ya son comerciales", () => {
    expect(redondearComercial(4500)).toBe(4500);
    expect(redondearComercial(16000)).toBe(16000);
  });
});

describe("parsePastedList", () => {
  it("formato A: 'Nx NOMBRE - $X/unid'", () => {
    const r = parsePastedList(
      "4x ARR. HYPOESTE B20 (Cód: PHYPOESTE20) - $1,650/unid",
    );
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({
      nombre: "ARR. HYPOESTE B20",
      unidades: 4,
      precioUnitNeto: 1650,
      plantasPorMaceta: 1,
    });
  });

  it("formato B: línea compacta con 1 precio", () => {
    const r = parsePastedList("1x KENTIA M17 $ 5,800");
    expect(r[0]).toMatchObject({
      nombre: "KENTIA M17",
      unidades: 1,
      precioUnitNeto: 5800,
    });
  });

  it("formato B: línea compacta con 2 precios (unit + subtotal)", () => {
    const r = parsePastedList("4x ARR. HYPOESTE B20 $ 1,650 $ 6,600");
    expect(r[0]).toMatchObject({ unidades: 4, precioUnitNeto: 1650 });
  });

  it("formato C multilínea: detecta cantidad / nombre / precio", () => {
    const r = parsePastedList(
      ["1x", "AMYDRIUM SILVER M12", "$ 8,500 $ 6,500", "$ 6,500"].join("\n"),
    );
    expect(r[0]).toMatchObject({
      nombre: "AMYDRIUM SILVER M12",
      unidades: 1,
      precioUnitNeto: 6500,
    });
  });

  it("formato C: precio tachado + efectivo, elige el efectivo", () => {
    const r = parsePastedList(
      ["4x", "GYNURA M13", "$ 1,550 $ 1,250", "$ 5,000"].join("\n"),
    );
    expect(r[0].precioUnitNeto).toBe(1250);
  });

  it("formato C: tres precios (tachado/efectivo/subtotal) toma el del medio", () => {
    const r = parsePastedList(
      ["4x", "PHILO SILVER SWORD M13", "$ 2,700 $ 1,990", "$ 7,960"].join("\n"),
    );
    expect(r[0].precioUnitNeto).toBe(1990);
  });

  it("ignora líneas vacías y texto basura", () => {
    const r = parsePastedList(
      [
        "",
        "1x KENTIA M17 $ 5,800",
        "totalmente decorativa",
        "",
        "2x HOYA $ 3,000",
      ].join("\n"),
    );
    expect(r).toHaveLength(2);
  });

  it("strip de código en paréntesis del nombre", () => {
    const r = parsePastedList(
      "4x ARR. HYPOESTE B20 (Cód: PHYPOESTE20) - $1,650/unid",
    );
    expect(r[0].nombre).toBe("ARR. HYPOESTE B20");
    expect(r[0].nombre).not.toMatch(/Cód/);
  });

  it("recibo real Vivero Arcoíris: 7 items en formato mixto", () => {
    const recibo = `1x
AMYDRIUM SILVER M12
$ 8,500 $ 6,500
$ 6,500
4x
ARR. HYPOESTE B20
$ 1,650
$ 6,600
1x KENTIA M17 $ 5,800
4x
GYNURA M13
$ 1,550 $ 1,250
$ 5,000
4x
PHILO SILVER SWORD M13
$ 2,700 $ 1,990
$ 7,960
3x
SANSEVIERIA M17
$ 12,500
$ 37,500
2x BEGONIA REX M15 $ 3,500 $ 7,000`;

    const r = parsePastedList(recibo);
    expect(r).toHaveLength(7);
    const total = r.reduce((a, b) => a + b.unidades * b.precioUnitNeto, 0);
    // 1×6500 + 4×1650 + 1×5800 + 4×1250 + 4×1990 + 3×12500 + 2×3500 = 76360
    expect(total).toBe(76360);
  });
});

describe("calcularCostoYsugerido", () => {
  it("sin IVA ni despacho, costo = precio neto", () => {
    const r = calcularCostoYsugerido(
      { precioUnitNeto: 1000, plantasPorMaceta: 1, unidades: 1 },
      {
        ivaPorcentaje: 0,
        despachoTotal: 0,
        unidadesTotales: 1,
        margenSugerido: 0,
      },
    );
    expect(r.costoRealPorPlanta).toBe(1000);
    expect(r.precioSugerido).toBe(1000);
    expect(r.plantasTotales).toBe(1);
  });

  it("aplica IVA 19% sobre el neto", () => {
    const r = calcularCostoYsugerido(
      { precioUnitNeto: 1000, plantasPorMaceta: 1, unidades: 1 },
      {
        ivaPorcentaje: 19,
        despachoTotal: 0,
        unidadesTotales: 1,
        margenSugerido: 0,
      },
    );
    expect(r.costoRealPorPlanta).toBeCloseTo(1190);
  });

  it("prorratea despacho entre las unidades totales", () => {
    const r = calcularCostoYsugerido(
      { precioUnitNeto: 1000, plantasPorMaceta: 1, unidades: 1 },
      {
        ivaPorcentaje: 0,
        despachoTotal: 10000,
        unidadesTotales: 100,
        margenSugerido: 0,
      },
    );
    // despachoPorUnidad = 100 → costo = 1100
    expect(r.costoRealPorPlanta).toBe(1100);
  });

  it("divide costo entre plantasPorMaceta", () => {
    const r = calcularCostoYsugerido(
      { precioUnitNeto: 2000, plantasPorMaceta: 4, unidades: 1 },
      {
        ivaPorcentaje: 0,
        despachoTotal: 0,
        unidadesTotales: 1,
        margenSugerido: 0,
      },
    );
    expect(r.costoRealPorPlanta).toBe(500);
    expect(r.plantasTotales).toBe(4);
  });

  it("aplica margen sugerido sobre el costo real", () => {
    const r = calcularCostoYsugerido(
      { precioUnitNeto: 1000, plantasPorMaceta: 1, unidades: 1 },
      {
        ivaPorcentaje: 0,
        despachoTotal: 0,
        unidadesTotales: 1,
        margenSugerido: 100,
      },
    );
    expect(r.precioSugerido).toBe(2000);
  });

  it("caso real: planta de Vivero Arcoíris", () => {
    // 4 unidades de ARR. HYPOESTE @ $1650 neto, IVA 19%, despacho $40000 / 99 unid,
    // 1 planta por maceta, margen 100%.
    const r = calcularCostoYsugerido(
      { precioUnitNeto: 1650, plantasPorMaceta: 1, unidades: 4 },
      {
        ivaPorcentaje: 19,
        despachoTotal: 40000,
        unidadesTotales: 99,
        margenSugerido: 100,
      },
    );
    // costoBruto = 1650 * 1.19 + 40000/99 = 1963.5 + 404.04 = 2367.54
    expect(r.costoRealPorPlanta).toBeCloseTo(2367.54, 1);
    expect(r.precioSugerido).toBeCloseTo(4735.08, 1);
    // El redondeo comercial de 4735 → 4500 ya está testeado arriba.
  });

  it("plantasPorMaceta < 1 se clampa a 1 en costo y plantasTotales", () => {
    const r = calcularCostoYsugerido(
      { precioUnitNeto: 1000, plantasPorMaceta: 0, unidades: 1 },
      {
        ivaPorcentaje: 0,
        despachoTotal: 0,
        unidadesTotales: 1,
        margenSugerido: 0,
      },
    );
    expect(r.costoRealPorPlanta).toBe(1000);
    expect(r.plantasTotales).toBe(1);
  });
});

describe("calcularCostoPlanta", () => {
  it("suma el IVA al precio neto de compra", () => {
    const r = calcularCostoPlanta({
      precioUnitNeto: 1000,
      unidades: 1,
      plantasPorMaceta: 1,
      ivaPorcentaje: 19,
    });
    expect(r.precioUnitConIva).toBeCloseTo(1190, 2);
    expect(r.costoPorPlanta).toBeCloseTo(1190, 2);
  });

  it("con IVA 0 el costo es el neto (proveedor que no cobra IVA)", () => {
    const r = calcularCostoPlanta({
      precioUnitNeto: 1000,
      unidades: 1,
      plantasPorMaceta: 1,
      ivaPorcentaje: 0,
    });
    expect(r.costoPorPlanta).toBe(1000);
  });

  it("reparte el costo entre las plantas extraídas por maceta", () => {
    // 2 macetas a $1.000 neto, 19% IVA, 3 plantas por maceta
    // total = 2 * 1190 = 2380 ; plantas = 6 ; costo = 396.67
    const r = calcularCostoPlanta({
      precioUnitNeto: 1000,
      unidades: 2,
      plantasPorMaceta: 3,
      ivaPorcentaje: 19,
    });
    expect(r.costoCompraTotal).toBeCloseTo(2380, 2);
    expect(r.costoPorPlanta).toBeCloseTo(396.67, 1);
  });

  it("clampa unidades y plantasPorMaceta a 1 cuando vienen en 0", () => {
    const r = calcularCostoPlanta({
      precioUnitNeto: 500,
      unidades: 0,
      plantasPorMaceta: 0,
      ivaPorcentaje: 0,
    });
    expect(r.costoPorPlanta).toBe(500);
  });

  // Este es el bug que motivó el helper: el modal de editar producto calculaba
  // el costo sin IVA mientras mercadería sí lo aplicaba, así que la misma
  // planta mostraba dos márgenes distintos según dónde se mirara.
  it("coincide con calcularCostoYsugerido cuando no hay despacho", () => {
    const entrada = {
      precioUnitNeto: 1650,
      plantasPorMaceta: 3,
      unidades: 33,
    };
    const desdeMercaderia = calcularCostoYsugerido(entrada, {
      ivaPorcentaje: 19,
      despachoTotal: 0,
      unidadesTotales: 99,
      margenSugerido: 100,
    });
    const desdeInventario = calcularCostoPlanta({
      precioUnitNeto: entrada.precioUnitNeto,
      unidades: entrada.unidades,
      plantasPorMaceta: entrada.plantasPorMaceta,
      ivaPorcentaje: 19,
    });
    expect(desdeInventario.costoPorPlanta).toBeCloseTo(
      desdeMercaderia.costoRealPorPlanta,
      2,
    );
  });
});
