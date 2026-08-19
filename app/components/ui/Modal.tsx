"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "./cn";

/** Ancho del panel. `full` se usa en vistas densas como Estadísticas. */
export type ModalSize = "sm" | "md" | "lg" | "full";

const ANCHOS: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
  full: "max-w-6xl",
};

type ModalProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
  readonly title?: string;
  /** Texto pequeño sobre el título (ej. "Resumen financiero"). */
  readonly eyebrow?: string;
  readonly size?: ModalSize;
  /** Anidado dentro de otro modal: sube el z-index y oscurece más el fondo. */
  readonly nested?: boolean;
  /** El panel ocupa el alto disponible y hace scroll interno. Para listados largos. */
  readonly tall?: boolean;
  readonly hideCloseButton?: boolean;
  /** Acciones fijas al pie, fuera del área de scroll. */
  readonly footer?: React.ReactNode;
  readonly className?: string;
  readonly children: React.ReactNode;
};

/**
 * Shell de modal de la app: overlay, panel, header y cierre con Escape.
 *
 * Unifica los seis overlays distintos que habían divergido entre modales
 * (`bg-black/90`, `/80`, `/60`, `/50`…) en el patrón dominante
 * `bg-stone-900/40` + `backdrop-blur-sm`.
 *
 * En móvil el panel entra desde abajo y se ancla al borde inferior; desde
 * `sm` se centra. Ese comportamiento ya era el mayoritario en el admin.
 */
export function Modal({
  isOpen,
  onClose,
  title,
  eyebrow,
  size = "sm",
  nested = false,
  tall = false,
  hideCloseButton = false,
  footer,
  className,
  children,
}: ModalProps) {
  // Escape para cerrar: antes ningún modal lo tenía.
  useEffect(() => {
    if (!isOpen) return;
    const alPresionar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", alPresionar);
    return () => document.removeEventListener("keydown", alPresionar);
  }, [isOpen, onClose]);

  // Evita que el fondo haga scroll mientras el modal está abierto.
  useEffect(() => {
    if (!isOpen) return;
    const previo = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previo;
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const tieneCabecera = Boolean(title) || !hideCloseButton;

  return (
    <div
      className={cn(
        "fixed inset-0 flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200",
        nested ? "z-modal-anidado" : "z-modal",
      )}
    >
      {/* Overlay como <button> real: cerrar con click queda accesible por
          teclado sin handlers sobre elementos no interactivos. */}
      <button
        type="button"
        aria-label="Cerrar"
        tabIndex={-1}
        onClick={onClose}
        className={cn(
          "absolute inset-0 w-full h-full cursor-default backdrop-blur-sm",
          nested ? "bg-stone-900/50" : "bg-stone-900/40",
        )}
      />

      <dialog
        open
        aria-modal="true"
        aria-label={title}
        className={cn(
          "relative m-0 p-0 bg-superficie text-stone-800 w-full border border-borde shadow-2xl overflow-hidden flex flex-col",
          "rounded-t-3xl sm:rounded-3xl",
          "animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 duration-200",
          ANCHOS[size],
          tall ? "h-[95vh] sm:h-[85vh]" : "max-h-[90vh]",
          className,
        )}
      >
        {tieneCabecera && (
          <header className="flex justify-between items-center gap-3 p-4 sm:p-5 border-b border-borde bg-campo shrink-0">
            <div className="min-w-0">
              {eyebrow && (
                <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] text-stone-500 font-semibold">
                  {eyebrow}
                </p>
              )}
              {title && (
                <h2 className="text-lg sm:text-xl font-bold text-stone-800 truncate">
                  {title}
                </h2>
              )}
            </div>
            {!hideCloseButton && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Cerrar"
                className="shrink-0 p-2 bg-stone-100 rounded-full text-stone-500 hover:text-stone-800 hover:bg-stone-200 transition-colors"
              >
                <X size={18} className="sm:w-5 sm:h-5" />
              </button>
            )}
          </header>
        )}

        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-5">
          {children}
        </div>

        {footer && (
          <footer className="shrink-0 border-t border-borde bg-campo p-4 sm:p-5">
            {footer}
          </footer>
        )}
      </dialog>
    </div>
  );
}
