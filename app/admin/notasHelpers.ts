/**
 * Apuntes del negocio: lo que se aprende y conviene no olvidar.
 *
 * No son recordatorios ni tareas —esas no se marcan como hechas acá— sino
 * notas que se releen: qué se vende en cada temporada, cuándo sube un
 * proveedor, qué le preguntan los clientes.
 *
 * Viven en la colección `NotasNegocio`. Lógica pura acá para poder probarla
 * sin Firebase.
 */

export type NotaNegocio = {
  idFirebase: string;
  /** Opcional: una nota sin título se muestra solo con su texto. */
  titulo?: string;
  texto: string;
  created_at: string;
  /** Las fijadas van primero: son las que se consultan seguido. */
  fijada?: boolean;
  /** Última edición. Ausente en las notas que nunca se editaron. */
  updated_at?: string;
};

/** Lo que se guarda en Firestore al crear una nota. */
export type NotaNueva = {
  titulo: string;
  texto: string;
  created_at: string;
  fijada: boolean;
};

/**
 * Mapea un documento de Firestore a una nota. Devuelve null si no tiene texto:
 * una nota sin cuerpo no se puede mostrar.
 *
 * Lo usan el modal y los post-its del panel para que los dos lean igual.
 */
export const mapearNota = (
  idFirebase: string,
  data: Record<string, unknown>,
): NotaNegocio | null => {
  if (!data.texto) return null;

  return {
    idFirebase,
    titulo: data.titulo ? String(data.titulo) : undefined,
    texto: String(data.texto),
    created_at: String(data.created_at ?? ""),
    fijada: Boolean(data.fijada),
    updated_at: data.updated_at ? String(data.updated_at) : undefined,
  };
};

/** Límite del texto: una nota más larga que esto es un documento, no un apunte. */
export const MAX_TEXTO = 2000;

/** Límite del título: cabe en una línea de la lista sin cortarse. */
export const MAX_TITULO = 80;

/**
 * Valida una nota antes de guardar. Devuelve los campos limpios, o un error
 * para mostrar en el formulario.
 *
 * El título es opcional; el texto no, porque una nota sin cuerpo no dice nada.
 */
export const validarNota = (
  texto: string,
  titulo = "",
):
  | { ok: true; texto: string; titulo: string }
  | { ok: false; error: string } => {
  const limpio = texto.trim();
  if (!limpio) return { ok: false, error: "Escribe algo antes de guardar." };
  if (limpio.length > MAX_TEXTO) {
    return {
      ok: false,
      error: `La nota no puede pasar de ${MAX_TEXTO} caracteres.`,
    };
  }

  const tituloLimpio = titulo.trim();
  if (tituloLimpio.length > MAX_TITULO) {
    return {
      ok: false,
      error: `El título no puede pasar de ${MAX_TITULO} caracteres.`,
    };
  }

  return { ok: true, texto: limpio, titulo: tituloLimpio };
};

/** Fecha por la que ordena una nota: la de su última edición si la hubo. */
const fechaOrden = (nota: NotaNegocio): number => {
  const fuente = nota.updated_at || nota.created_at;
  const t = new Date(fuente).getTime();
  return Number.isNaN(t) ? 0 : t;
};

/**
 * Ordena las notas como se leen: primero las fijadas, y dentro de cada grupo
 * las más recientes arriba.
 *
 * Una nota editada cuenta como reciente: si se está completando —la lista de
 * inscritos de un taller, por ejemplo— tiene que quedar a mano.
 */
export const ordenarNotas = (notas: NotaNegocio[]): NotaNegocio[] =>
  [...notas].sort((a, b) => {
    if (Boolean(a.fijada) !== Boolean(b.fijada)) return a.fijada ? -1 : 1;
    return fechaOrden(b) - fechaOrden(a);
  });

/**
 * Filtra por título y texto, sin distinguir mayúsculas ni tildes: buscar
 * "calathea" tiene que encontrar "Calathea" y "caláthea".
 */
export const filtrarNotas = (
  notas: NotaNegocio[],
  busqueda: string,
): NotaNegocio[] => {
  const q = normalizar(busqueda);
  if (!q) return notas;
  return notas.filter((n) =>
    normalizar(`${n.titulo ?? ""} ${n.texto}`).includes(q),
  );
};

const normalizar = (s: string): string =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/**
 * Qué fecha mostrar y con qué rótulo: si la nota se editó interesa cuándo fue
 * la última vez, no cuándo se creó.
 */
export const selloDeTiempo = (
  nota: Pick<NotaNegocio, "created_at" | "updated_at">,
  hoy: Date = new Date(),
): { etiqueta: string; fecha: string } => {
  const editada =
    typeof nota.updated_at === "string" && nota.updated_at.trim() !== "";

  return editada
    ? { etiqueta: "Editada", fecha: fechaNota(nota.updated_at!, hoy) }
    : { etiqueta: "", fecha: fechaNota(nota.created_at, hoy) };
};

/** Fecha de la nota como se muestra: "14 oct" o "14 oct 2025" si es de otro año. */
export const fechaNota = (
  createdAt: string,
  hoy: Date = new Date(),
): string => {
  const fecha = new Date(createdAt);
  if (Number.isNaN(fecha.getTime())) return "—";

  const mismoAno = fecha.getFullYear() === hoy.getFullYear();
  return fecha.toLocaleDateString("es-CL", {
    day: "numeric",
    month: "short",
    ...(mismoAno ? {} : { year: "numeric" }),
  });
};
