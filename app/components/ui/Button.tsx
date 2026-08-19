"use client";

import { cn } from "./cn";

/**
 * Intención de la acción, no su color. `primaria` = acción principal
 * (indigo), `exito` = cobrar/vender (emerald), `peligro` = borrar (rose),
 * `neutra` = cancelar, `fantasma` = acciones de icono en barras.
 */
export type ButtonVariant =
  | "primaria"
  | "exito"
  | "peligro"
  | "alerta"
  | "neutra"
  | "fantasma";

export type ButtonSize = "sm" | "md" | "lg";

const VARIANTES: Record<ButtonVariant, string> = {
  primaria:
    "bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-900/20",
  exito:
    "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20",
  peligro:
    "bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/20",
  alerta:
    "bg-amber-500 hover:bg-amber-400 text-white shadow-lg shadow-amber-900/20",
  neutra:
    "bg-stone-100 hover:bg-stone-200 text-stone-700 hover:text-stone-800 border border-stone-300/60",
  fantasma: "bg-transparent hover:bg-stone-100 text-stone-500 hover:text-stone-800",
};

const TAMANOS: Record<ButtonSize, string> = {
  sm: "px-3 py-2 text-xs gap-1.5",
  md: "px-4 py-3 text-sm gap-2",
  lg: "px-5 py-3.5 text-sm sm:text-base gap-2",
};

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly fullWidth?: boolean;
  /** Deshabilita y muestra texto de progreso. */
  readonly loading?: boolean;
  readonly loadingText?: string;
};

export function Button({
  variant = "primaria",
  size = "md",
  fullWidth = false,
  loading = false,
  loadingText,
  disabled,
  className,
  children,
  // `type` explícito: por defecto los <button> dentro de un <form> envían.
  type = "button",
  ...props
}: ButtonProps) {
  const inactivo = disabled || loading;

  return (
    <button
      type={type}
      disabled={inactivo}
      className={cn(
        "inline-flex items-center justify-center font-bold rounded-xl transition-all",
        "active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500",
        VARIANTES[variant],
        TAMANOS[size],
        fullWidth && "w-full",
        className,
      )}
      {...props}
    >
      {loading && loadingText ? loadingText : children}
    </button>
  );
}
