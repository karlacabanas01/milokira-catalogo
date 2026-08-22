"use client";

import { useCallback } from "react";

/**
 * Evita que la rueda del mouse cambie el valor de un `<input type="number">`.
 *
 * Por defecto el navegador incrementa o reduce el número al hacer scroll con
 * el cursor sobre el campo, así que basta pasar por encima de un monto para
 * alterarlo sin querer. Esto lo bloquea y deja que la página siga scrolleando.
 *
 * Uso: `<input type="number" onWheel={useNoWheelScroll()} />`
 */
export function useNoWheelScroll() {
  return useCallback((e: React.WheelEvent<HTMLInputElement>) => {
    // blur() detiene el ajuste: sin foco el input ignora la rueda, y el scroll
    // de la página sigue funcionando normalmente.
    e.currentTarget.blur();
  }, []);
}
