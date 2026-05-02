import { useEffect } from "react";

/**
 * Llama a `callback` cada vez que el usuario vuelve a esta pestaña
 * (documento pasa de hidden → visible).
 * Limpia el listener automáticamente al desmontar.
 */
export function useRefreshOnFocus(callback: () => void) {
  useEffect(() => {
    const handler = () => {
      if (!document.hidden) callback();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [callback]);
}
