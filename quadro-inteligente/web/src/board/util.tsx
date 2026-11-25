import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { PathSpec } from "./rough";

/** Desenha caminhos gerados pelo rough.js como unidades de animação. */
export function Paths({ specs, className = "" }: { specs: PathSpec[]; className?: string }) {
  return (
    <>
      {specs.map((s, i) =>
        s.kind === "stroke" ? (
          <path key={i} d={s.d} className={`qi-stroke ${className}`} data-u="stroke" pathLength={1} />
        ) : (
          <path key={i} d={s.d} className={`qi-fill ${className}`} data-u="fill" />
        ),
      )}
    </>
  );
}

/**
 * Mede a geometria derivada do DOM (posições de partes de equações, células
 * de tabelas etc.) e a recalcula quando o tamanho muda. `measure` deve ser
 * determinística; o estado só é atualizado quando o resultado muda.
 */
export function useMeasured<T>(ref: RefObject<HTMLElement | null>, measure: (el: HTMLElement) => T, initial: T): T {
  const [value, setValue] = useState<T>(initial);
  const last = useRef("");
  const fn = useRef(measure);
  fn.current = measure;
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const run = () => {
      const v = fn.current(el);
      const key = JSON.stringify(v);
      if (key !== last.current) {
        last.current = key;
        setValue(v);
      }
    };
    run();
    const ro = new ResizeObserver(run);
    ro.observe(el);
    document.fonts?.ready.then(run).catch(() => {});
    return () => ro.disconnect();
  });
  return value;
}

export function relRect(el: Element, base: Element) {
  const r = el.getBoundingClientRect();
  const b = base.getBoundingClientRect();
  return { x: r.left - b.left, y: r.top - b.top, w: r.width, h: r.height };
}

export function emPx(el: Element) {
  return parseFloat(getComputedStyle(el).fontSize) || 16;
}

export const SIZE_EM: Record<string, string> = { sm: "0.9em", md: "1.05em", lg: "1.28em", xl: "1.55em" };

/** Rótulo posicionado sobre um SVG, em porcentagem da área. */
export function OverlayLabel({ x, y, dir, children, className = "" }: { x: number; y: number; dir: [number, number]; children: React.ReactNode; className?: string }) {
  const [dx, dy] = dir;
  const tx = -50 + 50 * dx;
  const ty = -50 + 50 * dy;
  return (
    <div
      className={`pointer-events-none absolute whitespace-nowrap leading-none ${className}`}
      style={{ left: `${x}%`, top: `${y}%`, transform: `translate(${tx}%, ${ty}%) translate(${dx * 0.25}em, ${dy * 0.25}em)` }}
    >
      {children}
    </div>
  );
}
