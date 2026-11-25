import { memo, useMemo } from "react";
import katex from "katex";
import { KATEX_OPTIONS } from "@qi/shared";

const cache = new Map<string, { html: string; error: string | null }>();

export function renderLatex(latex: string, display: boolean) {
  const key = `${display ? "D" : "I"}${latex}`;
  let hit = cache.get(key);
  if (!hit) {
    try {
      hit = { html: katex.renderToString(latex, { ...KATEX_OPTIONS, macros: { ...KATEX_OPTIONS.macros }, displayMode: display }), error: null };
    } catch (e) {
      hit = { html: "", error: (e as Error).message };
    }
    if (cache.size > 2000) cache.clear();
    cache.set(key, hit);
  }
  return hit;
}

/** Fórmula renderizada com KaTeX. O motor de animação divide os glifos ao construir a linha do tempo. */
export const MathView = memo(function MathView({ latex, display = false, className = "" }: { latex: string; display?: boolean; className?: string }) {
  const r = useMemo(() => renderLatex(latex, display), [latex, display]);
  if (r.error) {
    return (
      <span className={`inline-block rounded px-1 font-mono text-[0.7em] ink-red ${className}`} title={r.error} data-u="fade">
        {latex}
      </span>
    );
  }
  const Tag = display ? "div" : "span";
  return <Tag className={`${display ? "qi-display" : ""} ${className}`} data-katex dangerouslySetInnerHTML={{ __html: r.html }} />;
});
