/**
 * Orden del catálogo.
 *
 * Lógica pura, sin React ni Firebase, para poder probar los casos que se
 * rompen solos: nombres que empiezan igual, tildes, agotadas mezcladas.
 */

export type PlantaOrdenable = {
  nombre: string;
  stock?: number;
  precio?: { disponible?: boolean };
  /** Última vez que se tocó esta planta. Las cargadas antes no lo traen. */
  updated_at?: string;
};

/**
 * Una planta está disponible si no se marcó como no disponible y le queda
 * stock. Sin el campo `stock` se asume que hay: las plantas cargadas antes de
 * que existiera el campo no deberían desaparecer del catálogo.
 */
export const estaDisponible = (planta: PlantaOrdenable): boolean =>
  planta.precio?.disponible !== false && (planta.stock ?? 1) > 0;

/**
 * Compara dos nombres alfabéticamente en español: ignora mayúsculas y tildes,
 * y ordena los números como números ("Maceta 2" antes de "Maceta 10").
 */
export const compararNombres = (a: string, b: string): number =>
  a.trim().localeCompare(b.trim(), "es", {
    sensitivity: "base",
    numeric: true,
  });

/**
 * Ordena el catálogo: primero lo disponible, después lo agotado, y cada grupo
 * alfabético.
 *
 * Las agotadas van al final porque el catálogo se recorre para comprar: lo que
 * no hay estorba arriba, pero sirve abajo para ver el surtido completo.
 */
export const ordenarCatalogo = <T extends PlantaOrdenable>(plantas: T[]): T[] =>
  [...plantas].sort((a, b) => {
    const dispA = estaDisponible(a);
    const dispB = estaDisponible(b);
    if (dispA !== dispB) return dispA ? -1 : 1;
    return compararNombres(a.nombre, b.nombre);
  });

/**
 * Cuándo se actualizó el catálogo por última vez: la fecha más reciente entre
 * todas las plantas.
 *
 * Devuelve null si ninguna tiene fecha —las cargadas antes de que el campo
 * existiera— y entonces la vista no muestra nada en vez de inventar una.
 */
export const ultimaActualizacion = (
  plantas: PlantaOrdenable[],
): Date | null => {
  let masReciente: number | null = null;

  for (const planta of plantas) {
    if (!planta.updated_at) continue;
    const t = new Date(planta.updated_at).getTime();
    if (Number.isNaN(t)) continue;
    if (masReciente === null || t > masReciente) masReciente = t;
  }

  return masReciente === null ? null : new Date(masReciente);
};

/**
 * La fecha como se muestra al cliente: "hoy", "ayer" o la fecha escrita.
 *
 * Los primeros días se dicen en palabras porque es lo que responde la pregunta
 * real —¿esto está al día?— sin obligar a calcular.
 */
export const textoActualizacion = (
  fecha: Date,
  hoy: Date = new Date(),
): string => {
  const soloDia = (d: Date) =>
    new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

  const dias = Math.round(
    (soloDia(hoy) - soloDia(fecha)) / (1000 * 60 * 60 * 24),
  );

  if (dias <= 0) return "hoy";
  if (dias === 1) return "ayer";
  if (dias < 7) return `hace ${dias} días`;

  const mismoAno = fecha.getFullYear() === hoy.getFullYear();
  return fecha.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    ...(mismoAno ? {} : { year: "numeric" }),
  });
};
