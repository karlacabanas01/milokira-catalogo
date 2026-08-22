"use client";

import { useId } from "react";
import { cn } from "./cn";
import { useNoWheelScroll } from "./useNoWheelScroll";

const BASE_CAMPO =
  "w-full bg-campo border border-borde rounded-xl text-stone-800 placeholder:text-stone-400 transition-all outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-60";

type InputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "prefix"> & {
  readonly label?: string;
  /** Texto de error; pinta el borde en rose y se anuncia al lector de pantalla. */
  readonly error?: string;
  /** Adorno fijo a la izquierda, típicamente "$" en los montos. */
  readonly prefix?: string;
};

export function Input({
  label,
  error,
  prefix,
  id,
  className,
  onWheel,
  ...props
}: InputProps) {
  const idAuto = useId();
  const inputId = id ?? idAuto;
  const errorId = `${inputId}-error`;
  // En los campos numéricos la rueda del mouse cambiaría el valor al pasar por
  // encima; se bloquea salvo que quien lo use pase su propio onWheel.
  const bloquearRueda = useNoWheelScroll();
  const manejarRueda =
    onWheel ?? (props.type === "number" ? bloquearRueda : undefined);

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-xs font-medium text-stone-500 ml-1"
        >
          {label}
        </label>
      )}

      <div className="relative">
        {prefix && (
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 pointer-events-none">
            {prefix}
          </span>
        )}
        <input
          id={inputId}
          onWheel={manejarRueda}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? errorId : undefined}
          className={cn(
            BASE_CAMPO,
            "px-4 py-3",
            prefix && "pl-8",
            error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500",
            className,
          )}
          {...props}
        />
      </div>

      {error && (
        <p id={errorId} className="text-xs text-rose-600 ml-1">
          {error}
        </p>
      )}
    </div>
  );
}

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
  readonly label?: string;
};

export function Textarea({ label, id, className, ...props }: TextareaProps) {
  const idAuto = useId();
  const textareaId = id ?? idAuto;

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-xs font-medium text-stone-500 ml-1"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={cn(BASE_CAMPO, "px-4 py-3 resize-y", className)}
        {...props}
      />
    </div>
  );
}
