"use client";

import { cn } from "./cn";

/** Mismas intenciones que Button, en versión etiqueta. */
export type BadgeTone =
  | "neutra"
  | "primaria"
  | "exito"
  | "peligro"
  | "alerta"
  | "info";

const TONOS: Record<BadgeTone, string> = {
  neutra: "bg-stone-100 text-stone-600 border-stone-300",
  primaria: "bg-indigo-100 text-indigo-700 border-indigo-200",
  exito: "bg-emerald-100 text-emerald-700 border-emerald-200",
  peligro: "bg-rose-100 text-rose-700 border-rose-200",
  alerta: "bg-amber-100 text-amber-700 border-amber-200",
  info: "bg-teal-100 text-teal-700 border-teal-200",
};

type BadgeProps = {
  readonly tone?: BadgeTone;
  readonly className?: string;
  readonly children: React.ReactNode;
};

export function Badge({ tone = "neutra", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-block text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border",
        TONOS[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
