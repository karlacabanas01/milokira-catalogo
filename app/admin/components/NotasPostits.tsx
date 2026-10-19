"use client";

import { NotebookPen, Pin, Plus } from "lucide-react";
import { selloDeTiempo, type NotaNegocio } from "../notasHelpers";

/**
 * Las notas del negocio como post-its en el panel.
 *
 * Es una vista de lectura: sirve para tener los apuntes a la vista sin abrir
 * nada. Tocar un post-it abre el modal, que es donde se escribe y se edita.
 */

type Props = {
  readonly notas: NotaNegocio[];
  /** Abre el modal de notas, que es donde se escribe y se edita. */
  readonly onAbrir: () => void;
};

/**
 * Tonos de papel. Se reparten por posición y no al azar para que un post-it
 * no cambie de color en cada render.
 */
const TONOS = [
  { fondo: "bg-amber-100", borde: "border-amber-200", texto: "text-amber-950" },
  { fondo: "bg-lime-100", borde: "border-lime-200", texto: "text-lime-950" },
  { fondo: "bg-sky-100", borde: "border-sky-200", texto: "text-sky-950" },
  { fondo: "bg-pink-100", borde: "border-pink-200", texto: "text-pink-950" },
] as const;

/** Una inclinación chica y fija por posición: papel pegado a mano. */
const INCLINACION = ["-rotate-1", "rotate-1", "-rotate-[0.5deg]", "rotate-[0.5deg]"];

/** Cuántos post-its caben antes de que la sección pese más que el panel. */
const MAX_VISIBLES = 6;

export default function NotasPostits({ notas, onAbrir }: Props) {
  const visibles = notas.slice(0, MAX_VISIBLES);
  const restantes = notas.length - visibles.length;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-4 sm:mb-5">
        <h2 className="text-xs sm:text-sm font-bold text-stone-700 uppercase tracking-widest flex items-center gap-2.5 sm:gap-3">
          <div className="p-2 bg-amber-500/10 rounded-xl text-amber-600 border border-amber-500/30 shadow-sm">
            <NotebookPen size={14} className="sm:w-4 sm:h-4" />
          </div>
          Notas
        </h2>
        <button
          type="button"
          onClick={() => onAbrir()}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] sm:text-xs font-black bg-white border border-stone-200 text-stone-600 hover:border-amber-400 hover:text-amber-700 transition-all active:scale-95"
        >
          <Plus size={12} strokeWidth={3} />
          Agregar
        </button>
      </div>

      {notas.length === 0 ? (
        <button
          type="button"
          onClick={() => onAbrir()}
          className="w-full rounded-2xl border border-dashed border-stone-300 bg-white/60 py-8 text-center text-sm text-stone-500 hover:border-amber-400 hover:text-amber-700 transition-all"
        >
          Anota lo que no quieras olvidar del negocio.
        </button>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {visibles.map((nota, i) => {
            const tono = TONOS[i % TONOS.length];
            const sello = selloDeTiempo(nota);
            return (
              <button
                key={nota.idFirebase}
                type="button"
                onClick={() => onAbrir()}
                // `rotate-0` al pasar el mouse endereza el papel: da la
                // sensación de levantarlo para leerlo.
                className={`group relative text-left p-3 sm:p-4 rounded-sm border ${tono.fondo} ${tono.borde} ${INCLINACION[i % INCLINACION.length]} shadow-md hover:rotate-0 hover:-translate-y-1 hover:shadow-xl transition-all duration-200 active:scale-[0.98] min-h-[7.5rem] flex flex-col`}
              >
                {nota.fijada && (
                  <Pin
                    size={13}
                    strokeWidth={2.5}
                    className={`absolute top-2 right-2 ${tono.texto} opacity-50`}
                  />
                )}

                {nota.titulo && (
                  <p
                    className={`text-xs sm:text-sm font-black ${tono.texto} mb-1 pr-4 break-words line-clamp-2`}
                  >
                    {nota.titulo}
                  </p>
                )}

                <p
                  className={`text-[11px] sm:text-xs ${tono.texto} opacity-80 whitespace-pre-wrap break-words line-clamp-4 flex-grow`}
                >
                  {nota.texto}
                </p>

                <span
                  className={`mt-2 text-[9px] sm:text-[10px] font-bold uppercase tracking-wider ${tono.texto} opacity-50`}
                >
                  {sello.etiqueta ? `${sello.etiqueta} ${sello.fecha}` : sello.fecha}
                </span>
              </button>
            );
          })}

          {restantes > 0 && (
            <button
              type="button"
              onClick={() => onAbrir()}
              className="rounded-sm border border-dashed border-stone-300 bg-white/60 min-h-[7.5rem] flex flex-col items-center justify-center gap-1 text-stone-500 hover:border-amber-400 hover:text-amber-700 transition-all active:scale-[0.98]"
            >
              <span className="text-lg font-black">+{restantes}</span>
              <span className="text-[10px] font-bold uppercase tracking-wider">
                {restantes === 1 ? "nota más" : "notas más"}
              </span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
