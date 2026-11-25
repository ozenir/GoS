import { useEffect, useState } from "react";

/** Preferência local do navegador (tolerante a armazenamento bloqueado). */
export function usePref<T>(key: string, initial: T): [T, (v: T | ((p: T) => T)) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(`qi:${key}`);
      if (!raw) return initial;
      const parsed = JSON.parse(raw);
      const isObj = (v: unknown) => typeof v === "object" && v !== null && !Array.isArray(v);
      return (isObj(initial) && isObj(parsed) ? { ...initial, ...parsed } : parsed) as T;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(`qi:${key}`, JSON.stringify(value));
    } catch {
      /* ignora */
    }
  }, [key, value]);
  return [value, setValue];
}
