import katex from "katex";
import { KATEX_OPTIONS } from "@qi/shared";

/** Verifica se um LaTeX é renderizável pelo KaTeX (mesmas opções do frontend). */
export function checkLatex(latex: string, displayMode: boolean): string | null {
  if (!latex.trim()) return null;
  try {
    katex.renderToString(latex, { ...KATEX_OPTIONS, macros: { ...KATEX_OPTIONS.macros }, displayMode });
    return null;
  } catch (e) {
    return (e as Error).message.replace(/^KaTeX parse error: /, "").slice(0, 160);
  }
}
