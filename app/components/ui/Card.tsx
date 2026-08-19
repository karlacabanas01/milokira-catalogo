"use client";

import { cn } from "./cn";

type CardProps = {
  /** Resalta el borde cuando algo requiere atención (ej. stock en cero). */
  readonly tone?: "neutra" | "peligro" | "alerta";
  readonly interactive?: boolean;
  readonly className?: string;
  readonly children: React.ReactNode;
};

const TONOS_BORDE = {
  neutra: "border-borde",
  peligro: "border-rose-300",
  alerta: "border-amber-300",
};

export function Card({
  tone = "neutra",
  interactive = false,
  className,
  children,
}: CardProps) {
  return (
    <div
      className={cn(
        "bg-superficie border rounded-2xl p-3 sm:p-4 transition-colors",
        TONOS_BORDE[tone],
        interactive && "hover:border-stone-400 hover:shadow-md cursor-pointer",
        className,
      )}
    >
      {children}
    </div>
  );
}

/** Estado vacío estándar de listados. */
export function EmptyState({
  children,
  className,
}: {
  readonly children: React.ReactNode;
  readonly className?: string;
}) {
  return (
    <div
      className={cn(
        "text-center text-stone-500 py-10 border border-dashed border-borde rounded-xl text-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
