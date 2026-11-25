/**
 * Configuração compartilhada do KaTeX (frontend e validação no backend).
 * \qimark{id}{trecho} marca parte de uma equação para receber um destaque
 * desenhado à mão (círculo, sublinhado, caixa). Apenas \htmlClass com
 * classes "qimark" é confiável; qualquer outro comando HTML é bloqueado.
 */
export const KATEX_MACROS: Record<string, string> = {
  "\\qimark": "\\htmlClass{qimark qimark-#1}{#2}",
};

export function katexTrust(ctx: { command: string; class?: string }): boolean {
  return ctx.command === "\\htmlClass" && typeof ctx.class === "string" && /^qimark qimark-[A-Za-z0-9_-]+$/.test(ctx.class);
}

export const KATEX_OPTIONS = {
  macros: KATEX_MACROS,
  trust: katexTrust,
  strict: "ignore" as const,
  throwOnError: true,
  output: "html" as const,
};
