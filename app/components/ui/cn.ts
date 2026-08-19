/**
 * Une clases condicionales descartando los valores vacíos.
 *
 * No resuelve conflictos entre clases de Tailwind (para eso haría falta
 * tailwind-merge). Los componentes de `ui/` ponen `className` al final, así
 * que quien los usa siempre puede sobrescribir el estilo por defecto.
 */
export function cn(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(" ");
}
