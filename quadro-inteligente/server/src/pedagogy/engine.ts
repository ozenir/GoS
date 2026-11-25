/**
 * Motor pedagógico: orquestra as fases da IA.
 *   FASE A — analyze():  leitura da imagem, resolução e verificação.
 *   FASE B — generate(): transformação da resolução em aula (quadro + roteiro).
 *   assist():            etapas complementares sob demanda.
 * Toda saída passa por validação de formato (Zod) e validação semântica
 * (ids, referências, LaTeX, expressões). Problemas semânticos geram uma
 * rodada de correção pela própria IA; o que restar é saneado sem perda.
 */
import fs from "node:fs";
import {
  Analysis,
  LessonContent,
  SupplementContent,
  sanitizeSteps,
  validateLesson,
  validateSteps,
  type AssistAction,
  type LessonRecord,
  type ProgressEvent,
  type Step,
} from "@qi/shared";
import { AIError, getAI, type ContentPart, type StructuredRequest } from "../ai/index.ts";
import { config } from "../config.ts";
import { imagePath, lessons } from "../db.ts";
import { checkLatex } from "./latex.ts";
import {
  ANALYSIS_SYSTEM,
  ASSIST_SYSTEM,
  LESSON_SYSTEM,
  analysisUserText,
  assistUserText,
  lessonUserText,
} from "./prompts.ts";

type Emit = (ev: ProgressEvent) => void;

function imagePart(id: string): ContentPart | null {
  const p = imagePath(id);
  if (!fs.existsSync(p)) return null;
  return { type: "image", mediaType: "image/jpeg", base64: fs.readFileSync(p).toString("base64") };
}

/** Repassa o resumo do raciocínio da IA em blocos (evita inundar o cliente). */
function thinkingForwarder(emit: Emit) {
  let buf = "";
  let timer: NodeJS.Timeout | null = null;
  const flush = () => {
    if (buf) emit({ type: "thinking", text: buf });
    buf = "";
    timer = null;
  };
  return {
    push(delta: string) {
      buf += delta;
      timer ??= setTimeout(flush, 250);
    },
    flush() {
      if (timer) clearTimeout(timer);
      flush();
    },
  };
}

function progressCounter(emit: Emit) {
  let last = 0;
  return (_d: string, snapshot: string) => {
    const now = Date.now();
    if (now - last < 600) return;
    last = now;
    const steps = (snapshot.match(/"goal"\s*:/g) ?? []).length;
    emit({ type: "progress", chars: snapshot.length, steps });
  };
}

async function generateValidated<T>(
  req: StructuredRequest<T>,
  emit: Emit,
  semanticCheck: (data: T) => string[],
): Promise<{ data: T; problems: string[] }> {
  const first = await getAI().generateStructured(req);
  let data = first.data;
  let problems = semanticCheck(data);
  if (problems.length > 0) {
    emit({ type: "status", phase: "repair", message: `Revisando ${problems.length} detalhe(s) de formatação...` });
    console.warn(`[engine] ${problems.length} problema(s) semântico(s); pedindo correção.`, problems.slice(0, 10));
    try {
      const repaired = await getAI().generateStructured({
        ...req,
        content: [
          ...req.content,
          {
            type: "text",
            text: `Uma versão anterior da sua resposta tinha os problemas abaixo. Corrija TODOS mantendo o restante do conteúdo (mesma qualidade pedagógica, mesma ordem) e devolva o objeto completo.\n\n# Problemas\n${problems.map((p) => `- ${p}`).join("\n")}\n\n# Versão anterior\n${JSON.stringify(data)}`,
          },
        ],
        onText: undefined,
      });
      const repairedProblems = semanticCheck(repaired.data);
      if (repairedProblems.length <= problems.length) {
        data = repaired.data;
        problems = repairedProblems;
      }
    } catch (err) {
      console.warn("[engine] Correção falhou; mantendo a versão original.", (err as Error).message);
    }
  }
  return { data, problems };
}

export async function analyze(id: string, corrections: string, emit: Emit, signal?: AbortSignal): Promise<LessonRecord> {
  const lesson = lessons.get(id);
  if (!lesson) throw new AIError("Aula não encontrada.", "bad_request", false);
  const img = imagePart(id);
  if (!img) throw new AIError("A imagem da questão não foi encontrada.", "bad_request", false);

  lessons.update(id, { status: "analyzing", error: "" });
  emit({ type: "status", phase: "reading", message: "Lendo a imagem e interpretando a questão..." });
  const thinking = thinkingForwarder(emit);
  let phase: "reading" | "solving" | "writing" = "reading";
  try {
    const { data } = await generateValidated(
      {
        system: ANALYSIS_SYSTEM,
        content: [img, { type: "text", text: analysisUserText({ ...lesson, corrections }) }],
        schema: Analysis,
        schemaName: "analysis",
        maxTokens: 32000,
        effort: config.ai.effortAnalysis,
        signal,
        onThinking: (d) => {
          if (phase === "reading") {
            phase = "solving";
            emit({ type: "status", phase: "solving", message: "Resolvendo e verificando a resolução..." });
          }
          thinking.push(d);
        },
        onText: () => {
          if (phase !== "writing") {
            phase = "writing";
            thinking.flush();
            emit({ type: "status", phase: "writing", message: "Organizando a estrutura pedagógica da aula..." });
          }
        },
      },
      emit,
      (a) => {
        const problems: string[] = [];
        a.formulas.forEach((f) => { const e = checkLatex(f.latex, true); if (e) problems.push(`Fórmula "${f.name}": LaTeX inválido (${e}).`); });
        a.solution.forEach((s, i) => s.latex.forEach((l) => { const e = checkLatex(l, true); if (e) problems.push(`Resolução, passo ${i + 1}: LaTeX inválido "${l}" (${e}).`); }));
        if (a.finalAnswer.latex) { const e = checkLatex(a.finalAnswer.latex, true); if (e) problems.push(`Resposta final: LaTeX inválido (${e}).`); }
        return problems;
      },
    );
    thinking.flush();
    const blocking = data.uncertainties.filter((u) => u.blocking).length;
    if (blocking) emit({ type: "warning", message: `A IA precisa de confirmação em ${blocking} ponto(s) antes de gerar a aula.` });
    return lessons.update(id, {
      status: "analyzed",
      analysis: data,
      subject: lesson.subject || data.subject,
      topic: data.topic,
      title: data.topic,
      level: lesson.level || data.suggestedLevel,
    });
  } catch (err) {
    thinking.flush();
    const e = err instanceof AIError ? err : new AIError("Falha inesperada na análise.", "unknown", true, String(err));
    lessons.update(id, { status: lesson.analysis ? "analyzed" : "error", error: e.message });
    throw e;
  }
}

export async function generate(id: string, emit: Emit, signal?: AbortSignal): Promise<LessonRecord> {
  const lesson = lessons.get(id);
  if (!lesson?.analysis) throw new AIError("Analise a questão antes de gerar a aula.", "bad_request", false);
  const img = imagePart(id);
  lessons.update(id, { status: "generating", error: "" });
  emit({ type: "status", phase: "planning", message: "Planejando os blocos da aula..." });
  const thinking = thinkingForwarder(emit);
  const counter = progressCounter(emit);
  let writing = false;
  try {
    const { data, problems } = await generateValidated(
      {
        system: LESSON_SYSTEM,
        content: [
          ...(img ? [img] : []),
          { type: "text", text: lessonUserText({ analysis: lesson.analysis, level: lesson.level, depth: lesson.depth, teacherNotes: lesson.teacherNotes, hasImage: Boolean(img) }) },
        ],
        schema: LessonContent,
        schemaName: "lesson",
        maxTokens: 64000,
        effort: config.ai.effortLesson,
        signal,
        onThinking: (d) => thinking.push(d),
        onText: (d, snap) => {
          if (!writing) {
            writing = true;
            thinking.flush();
            emit({ type: "status", phase: "writing", message: "Escrevendo o quadro e o roteiro do professor..." });
          }
          counter(d, snap);
        },
      },
      emit,
      (c) => validateLesson(c, checkLatex),
    );
    if (problems.length) {
      console.warn("[engine] Problemas remanescentes saneados:", problems.slice(0, 10));
      emit({ type: "warning", message: "Alguns detalhes visuais foram ajustados automaticamente." });
    }
    const content: LessonContent = { ...data, steps: sanitizeSteps(data.steps) };
    return lessons.update(id, { status: "ready", content, title: content.plan.title, topic: content.plan.topic, subject: content.plan.subject || lesson.subject });
  } catch (err) {
    thinking.flush();
    const e = err instanceof AIError ? err : new AIError("Falha inesperada ao gerar a aula.", "unknown", true, String(err));
    lessons.update(id, { status: lesson.content ? "ready" : "analyzed", error: e.message });
    throw e;
  }
}

export async function assist(id: string, stepId: string, action: AssistAction, emit: Emit, signal?: AbortSignal): Promise<LessonRecord> {
  const lesson = lessons.get(id);
  if (!lesson?.content) throw new AIError("A aula ainda não foi gerada.", "bad_request", false);
  const index = lesson.content.steps.findIndex((s) => s.id === stepId);
  if (index < 0) throw new AIError("Etapa não encontrada.", "bad_request", false);
  const current = lesson.content.steps[index];
  const idPrefix = `x${Date.now().toString(36)}-`;
  const thinking = thinkingForwarder(emit);
  emit({ type: "status", phase: "planning", message: "Preparando a etapa complementar..." });
  try {
    const img = imagePart(id);
    const { data } = await generateValidated(
      {
        system: ASSIST_SYSTEM,
        content: [
          ...(img && (action === "alternative_solution" || action === "formula_origin") ? [img] : []),
          { type: "text", text: assistUserText({ action, content: lesson.content, current, analysis: lesson.analysis, depth: lesson.depth, idPrefix }) },
        ],
        schema: SupplementContent,
        schemaName: "supplement",
        maxTokens: 32000,
        effort: config.ai.effortAssist,
        signal,
        onThinking: (d) => thinking.push(d),
        onText: () => thinking.flush(),
      },
      emit,
      (s) => {
        // Valida a etapa nova no contexto da aula (ids não podem colidir com os existentes).
        const all = [...lesson.content!.steps, s.step];
        return validateSteps(all, checkLatex).filter((p) => (p.startsWith(`etapa ${all.length} `) || p.startsWith(`etapa ${all.length}:`)) || p.includes("duplicado"));
      },
    );
    thinking.flush();
    let step: Step = { ...data.step, kind: "supplement" };
    const taken = new Set(lesson.content.steps.map((s) => s.id));
    if (taken.has(step.id)) step = { ...step, id: `${idPrefix}step` };
    const steps = [...lesson.content.steps];
    steps.splice(index + 1, 0, step);
    return lessons.update(id, { content: { ...lesson.content, steps: sanitizeSteps(steps) } });
  } catch (err) {
    thinking.flush();
    throw err instanceof AIError ? err : new AIError("Falha ao gerar a etapa complementar.", "unknown", true, String(err));
  }
}
