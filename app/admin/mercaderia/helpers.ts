// Helpers puros del módulo Mercadería.
// Sin dependencias de React/Firebase para permitir tests unitarios.

export type ParsedItem = {
  nombre: string;
  unidades: number;
  precioUnitNeto: number;
  plantasPorMaceta: number;
};

export const slugify = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

// Redondea a precio "comercial": múltiplos de 500 bajo 10.000, de 1.000 sobre eso.
export const redondearComercial = (valor: number): number => {
  if (valor <= 0) return 0;
  const paso = valor >= 10000 ? 1000 : 500;
  return Math.round(valor / paso) * paso;
};

// Parser de listas pegadas. Reconoce 3 formatos del recibo de proveedor:
//   A) "4x NOMBRE - $1,650/unid"
//   B) "1x KENTIA M17 $ 5,800"   |   "4x NOMBRE $ 1,650 $ 6,600"
//   C) multilínea:  "4x" / "NOMBRE" / "$ 1,650 [$ 1,250]" / "$ 6,600"
// El precio devuelto es el unitario neto. Si hay precio tachado, usa el nuevo.
export const parsePastedList = (text: string): ParsedItem[] => {
  const codigoRegex = /\s*\(c[oó]d[:\s.][^)]*\)/i;
  const regexUnid =
    /^\s*(\d+)\s*x\s+(.+?)\s*-\s*\$?\s*([\d.,]+)\s*\/?\s*unid/i;
  const regexLineaConPrecios =
    /^\s*(\d+)\s*x\s+(.+?)\s+\$\s*([\d.,]+)(?:\s+\$\s*([\d.,]+))?(?:\s+\$\s*([\d.,]+))?\s*$/i;
  const regexSoloCantidad = /^\s*(\d+)\s*x\s*$/i;
  const regexPrecios = /\$\s*([\d.,]+)/g;

  const toNum = (s: string) => Number(s.replace(/[.,]/g, ""));

  const lineas = text.split(/\r?\n/).map((l) => l.trim());
  const out: ParsedItem[] = [];

  const pushItem = (unidades: number, nombre: string, precio: number) => {
    const nombreLimpio = nombre.replace(codigoRegex, "").trim();
    if (!unidades || !nombreLimpio || !precio) return;
    out.push({
      nombre: nombreLimpio,
      unidades,
      precioUnitNeto: precio,
      plantasPorMaceta: 1,
    });
  };

  const extraerPrecios = (s: string): number[] => {
    const arr: number[] = [];
    let m: RegExpExecArray | null;
    regexPrecios.lastIndex = 0;
    while ((m = regexPrecios.exec(s)) !== null) {
      arr.push(toNum(m[1]));
    }
    return arr;
  };

  // Heurística para múltiples precios en la misma línea:
  //   1 precio: ése
  //   2 precios: si A*N === B → A unit, B subtotal. Si no, asumir tachado+efectivo → B
  //   3+ precios: tachado / efectivo / subtotal → el del medio
  const elegirPrecioUnit = (unidades: number, precios: number[]): number => {
    if (precios.length === 0) return 0;
    if (precios.length === 1) return precios[0];
    if (precios.length === 2) {
      const [a, b] = precios;
      if (a * unidades === b) return a;
      if (b * unidades === a) return b;
      return b;
    }
    // precios.length >= 3
    const [, b] = precios;
    return b;
  };

  let i = 0;
  while (i < lineas.length) {
    const linea = lineas[i];
    if (!linea) {
      i++;
      continue;
    }

    const mA = regexUnid.exec(linea);
    if (mA) {
      pushItem(Number(mA[1]), mA[2].trim(), toNum(mA[3]));
      i++;
      continue;
    }

    const mB = regexLineaConPrecios.exec(linea);
    if (mB) {
      const unidades = Number(mB[1]);
      const nombre = mB[2].trim();
      const precios = [mB[3], mB[4], mB[5]]
        .filter((s): s is string => Boolean(s))
        .map(toNum);
      const unit = elegirPrecioUnit(unidades, precios);
      pushItem(unidades, nombre, unit);
      i++;
      continue;
    }

    const mC = regexSoloCantidad.exec(linea);
    if (mC) {
      const unidades = Number(mC[1]);
      const nombre = lineas[i + 1] || "";
      if (!nombre || /^\$/.test(nombre) || /^\d+\s*x/i.test(nombre)) {
        i++;
        continue;
      }

      const precios: number[] = [];
      let j = i + 2;
      while (j < lineas.length && /^\$/.test(lineas[j])) {
        precios.push(...extraerPrecios(lineas[j]));
        j++;
      }

      const unit = elegirPrecioUnit(unidades, precios);
      pushItem(unidades, nombre, unit);
      i = j;
      continue;
    }

    i++;
  }

  return out;
};

export type CalcInput = {
  precioUnitNeto: number;
  plantasPorMaceta: number;
  unidades: number;
};

export type CalcConfig = {
  ivaPorcentaje: number;
  despachoTotal: number;
  unidadesTotales: number;
  margenSugerido: number;
};

// Costo real por planta y precio sugerido a partir de un item + la config de la compra.
// Centraliza la fórmula para que tests y código de UI usen lo mismo.
export const calcularCostoYsugerido = (
  item: CalcInput,
  cfg: CalcConfig,
) => {
  const ivaFactor = 1 + cfg.ivaPorcentaje / 100;
  const despachoPorUnidad =
    cfg.unidadesTotales > 0 ? cfg.despachoTotal / cfg.unidadesTotales : 0;
  const costoBrutoUnit = item.precioUnitNeto * ivaFactor + despachoPorUnidad;
  const plantasExtraidas = Math.max(1, item.plantasPorMaceta);
  const costoRealPorPlanta = costoBrutoUnit / plantasExtraidas;
  const precioSugerido = costoRealPorPlanta * (1 + cfg.margenSugerido / 100);
  const plantasTotales = item.unidades * plantasExtraidas;
  return { costoRealPorPlanta, precioSugerido, plantasTotales };
};

// Costo por planta a partir de los datos que guarda una planta del inventario.
// Es el mismo cálculo que calcularCostoYsugerido pero sin despacho (una planta
// ya ingresada no arrastra el flete de la compra original). Lo usa el modal de
// editar producto; vive acá para que ambas pantallas compartan la fórmula y no
// vuelvan a divergir.
export const calcularCostoPlanta = (input: {
  precioUnitNeto: number;
  unidades: number;
  plantasPorMaceta: number;
  ivaPorcentaje: number;
}) => {
  const ivaFactor = 1 + input.ivaPorcentaje / 100;
  const precioUnitConIva = input.precioUnitNeto * ivaFactor;
  const unidades = Math.max(1, input.unidades);
  const plantasExtraidas = Math.max(1, input.plantasPorMaceta);
  const costoCompraTotal = unidades * precioUnitConIva;
  const totalPlantasExtraidas = unidades * plantasExtraidas;
  const costoPorPlanta =
    totalPlantasExtraidas > 0 ? costoCompraTotal / totalPlantasExtraidas : 0;
  return { precioUnitConIva, costoCompraTotal, costoPorPlanta };
};
