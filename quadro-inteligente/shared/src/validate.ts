/**
 * Validação semântica de uma aula (além do formato garantido pelo Zod):
 * ids únicos, referências válidas, expressões de gráficos e coerência de
 * diagramas. Retorna a lista de problemas encontrados, em português, para
 * que o backend possa pedir uma correção à IA.
 */
import { checkExpression } from "./mathExpr.ts";
import type { BoardEl, LeafEl, LessonContent, Step } from "./schema.ts";

export interface LatexChecker { (latex: string, displayMode: boolean): string | null }

/** Extrai trechos $...$ de um texto com LaTeX inline. */
export function inlineMathParts(text: string): string[] {
  const parts: string[] = [];
  const re = /\$([^$]+)\$/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) parts.push(m[1]);
  return parts;
}

export function forEachLeaf(board: BoardEl[], fn: (el: LeafEl | BoardEl) => void) {
  for (const el of board) {
    fn(el);
    if (el.type === "row") for (const c of el.columns) for (const leaf of c.elements) fn(leaf);
  }
}

function latexOf(el: LeafEl | BoardEl): { latex: string[]; inline: string[] } {
  const latex: string[] = [];
  const inline: string[] = [];
  switch (el.type) {
    case "text": inline.push(el.content); break;
    case "equation": latex.push(el.latex); el.marks.forEach((m) => inline.push(m.note)); break;
    case "derivation": el.lines.forEach((l) => { latex.push(l.latex); inline.push(l.annotation); }); break;
    case "list": inline.push(...el.items); break;
    case "matrix": el.rows.forEach((r) => latex.push(...r)); if (el.prefix) latex.push(el.prefix); break;
    case "table": inline.push(el.caption, ...el.headers, ...el.rows.flat()); break;
    case "graph": inline.push(el.caption, el.xLabel, el.yLabel, ...el.functions.map((f) => f.label), ...el.points.map((p) => p.label), ...el.segments.map((s) => s.label)); break;
    case "diagram":
      inline.push(el.caption);
      for (const s of el.shapes) {
        if ("label" in s) inline.push(s.label);
        if (s.kind === "label") inline.push(s.text);
        if (s.kind === "axes") inline.push(s.xLabel, s.yLabel);
      }
      break;
    case "result": if (el.latex) latex.push(el.latex); inline.push(el.text, el.label); break;
    case "note": inline.push(el.title, el.content); break;
    case "connector": inline.push(el.label); break;
  }
  return { latex, inline };
}

export function validateSteps(steps: Step[], checkLatex?: LatexChecker): string[] {
  const problems: string[] = [];
  const ids = new Set<string>();
  const stepIds = new Set<string>();
  steps.forEach((step, si) => {
    const where = `etapa ${si + 1} ("${step.title}")`;
    if (stepIds.has(step.id)) problems.push(`${where}: id de etapa duplicado "${step.id}".`);
    stepIds.add(step.id);
    if (step.board.length === 0 && step.script.length === 0) problems.push(`${where}: etapa vazia.`);
    if (step.script.length === 0) problems.push(`${where}: falta o roteiro do professor (script).`);
    forEachLeaf(step.board, (el) => {
      if (ids.has(el.id)) problems.push(`${where}: id de elemento duplicado "${el.id}".`);
      ids.add(el.id);
    });
  });
  const allIds = ids;
  steps.forEach((step, si) => {
    const where = `etapa ${si + 1}`;
    const local = new Set<string>();
    forEachLeaf(step.board, (el) => local.add(el.id));
    for (const seg of step.script) {
      for (const ref of seg.elements) {
        if (!local.has(ref)) problems.push(`${where}: o roteiro referencia "${ref}", que não existe nesta etapa.`);
      }
    }
    forEachLeaf(step.board, (el) => {
      if (el.type === "connector") {
        if (!allIds.has(el.from)) problems.push(`${where}: conector "${el.id}" aponta de "${el.from}", inexistente.`);
        if (!allIds.has(el.to)) problems.push(`${where}: conector "${el.id}" aponta para "${el.to}", inexistente.`);
      }
      if (el.type === "graph") {
        el.functions.forEach((f) => {
          const err = checkExpression(f.expr);
          if (err) problems.push(`${where}: gráfico "${el.id}", expressão "${f.expr}" inválida (${err}). Use sintaxe como "2*sin(x) + x^2".`);
        });
        if (el.xRange[0] >= el.xRange[1] || el.yRange[0] >= el.yRange[1]) problems.push(`${where}: gráfico "${el.id}" com intervalo inválido.`);
      }
      if (el.type === "diagram") {
        if (el.xRange[0] >= el.xRange[1] || el.yRange[0] >= el.yRange[1]) problems.push(`${where}: diagrama "${el.id}" com intervalo inválido.`);
        if (el.shapes.length === 0) problems.push(`${where}: diagrama "${el.id}" sem formas.`);
      }
      if (el.type === "row" && el.columns.length < 2) problems.push(`${where}: linha "${el.id}" precisa de pelo menos 2 colunas.`);
      if (checkLatex) {
        const { latex, inline } = latexOf(el);
        for (const l of latex) {
          const err = checkLatex(l, true);
          if (err) problems.push(`${where}: LaTeX inválido em "${el.id}": ${l} → ${err}`);
        }
        for (const t of inline) {
          for (const l of inlineMathParts(t)) {
            const err = checkLatex(l, false);
            if (err) problems.push(`${where}: LaTeX inline inválido em "${el.id}": ${l} → ${err}`);
          }
        }
      }
    });
    if (checkLatex) {
      for (const seg of step.script) for (const l of inlineMathParts(seg.text)) {
        const err = checkLatex(l, false);
        if (err) problems.push(`${where}: LaTeX inválido no roteiro: ${l} → ${err}`);
      }
    }
  });
  return problems;
}

export function validateLesson(content: LessonContent, checkLatex?: LatexChecker): string[] {
  const problems = validateSteps(content.steps, checkLatex);
  if (content.steps.length === 0) problems.unshift("A aula não possui etapas.");
  return problems;
}

/**
 * Correções automáticas e não destrutivas: remove referências inexistentes
 * do roteiro e conectores quebrados. Usado como última linha de defesa
 * quando a IA não consegue corrigir os problemas.
 */
export function sanitizeSteps(steps: Step[]): Step[] {
  const all = new Set<string>();
  steps.forEach((s) => forEachLeaf(s.board, (el) => all.add(el.id)));
  return steps.map((step) => {
    const local = new Set<string>();
    forEachLeaf(step.board, (el) => local.add(el.id));
    return {
      ...step,
      board: step.board.filter((el) => el.type !== "connector" || (all.has(el.from) && all.has(el.to))),
      script: step.script.map((seg) => ({ ...seg, elements: seg.elements.filter((r) => local.has(r)) })),
    };
  });
}
