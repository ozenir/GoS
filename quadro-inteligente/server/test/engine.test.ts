/**
 * Testa o pipeline pedagógico completo (análise → aula → correção
 * automática → etapa complementar) com um provedor de IA simulado. Este
 * teste não substitui a IA real: ele verifica a orquestração, a validação
 * e a persistência ao redor dela.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "qi-test-"));
process.env.DATA_DIR = dir;

const { setAIProvider } = await import("../src/ai/index.ts");
const { lessons, imagePath } = await import("../src/db.ts");
const { analyze, generate, assist } = await import("../src/pedagogy/engine.ts");
const { PENDULUM_LESSON } = await import("../src/samples/pendulum.ts");
const { default: sharp } = await import("sharp");
type Req<T> = import("../src/ai/provider.ts").StructuredRequest<T>;
type Res<T> = import("../src/ai/provider.ts").StructuredResult<T>;

const analysis = {
  legibility: "good",
  transcription: { statement: "Deduza o período do pêndulo simples.", alternatives: [], figureDescription: "pêndulo", handwrittenNotes: "" },
  subject: "Física", topic: "Pêndulo simples", subtopics: ["MHS"], suggestedLevel: "Ensino Médio",
  learningObjective: "Deduzir o período.", prerequisites: ["Newton"], concepts: [{ term: "MHS", definition: "movimento harmônico simples" }],
  formulas: [{ name: "Período", latex: "T_0 = 2\\pi\\sqrt{\\ell/g}", origin: "EDO do MHS", whyApplicable: "pequenos ângulos", variables: [] }],
  givens: [], unknowns: [{ symbol: "T_0", description: "período" }], strategy: "Newton + aproximação",
  solution: [{ title: "Newton", explanation: "...", latex: ["-mg\\sin\\theta = ma"] }],
  verification: { interpretationCheck: "ok", calculationCheck: "ok", unitsCheck: "s", answersTheQuestion: "sim", confidence: "high" },
  finalAnswer: { text: "T0 = 2π√(ℓ/g)", latex: "T_0 = 2\\pi\\sqrt{\\ell/g}", alternative: "" },
  uncertainties: [], recommendedSteps: 8,
};

const calls: string[] = [];
let lessonCalls = 0;

setAIProvider({
  name: "mock",
  model: "mock",
  isConfigured: () => true,
  async generateStructured<T>(req: Req<T>): Promise<Res<T>> {
    calls.push(req.schemaName);
    let data: unknown;
    if (req.schemaName === "analysis") data = analysis;
    else if (req.schemaName === "lesson") {
      lessonCalls++;
      const broken = structuredClone(PENDULUM_LESSON);
      if (lessonCalls === 1) {
        // primeira resposta com problemas: LaTeX inválido e referência inexistente
        (broken.steps[0].board[0] as { content: string }).content = "Pêndulo $\\frac{1}{$";
        broken.steps[0].script[0].elements.push("nao-existe");
      } else {
        const last = req.content[req.content.length - 1];
        assert.ok(last.type === "text" && last.text.includes("Problemas"), "a correção deve listar os problemas");
      }
      data = broken;
    } else if (req.schemaName === "supplement") {
      data = { step: { ...structuredClone(PENDULUM_LESSON.steps[2]), id: "extra", board: [{ id: "extra-eq", type: "equation", latex: "a = -\\omega^2 x", ink: "ink", size: "md", align: "left", label: "", marks: [] }], script: [{ text: "Outra forma.", elements: ["extra-eq"] }] } };
    }
    return { data: req.schema.parse(data), usage: { inputTokens: 1, outputTokens: 1 }, model: "mock" };
  },
});

let id = "";
before(async () => {
  const rec = lessons.create({ subject: "", level: "", depth: "intermediate", teacherNotes: "", hasImage: true });
  id = rec.id;
  const img = await sharp({ create: { width: 400, height: 300, channels: 3, background: "#ffffff" } }).jpeg().toBuffer();
  fs.writeFileSync(imagePath(id), img);
});

test("fase A: análise salva e status atualizado", async () => {
  const events: string[] = [];
  const rec = await analyze(id, "", (e) => events.push(e.type));
  assert.equal(rec.status, "analyzed");
  assert.equal(rec.analysis?.topic, "Pêndulo simples");
  assert.equal(rec.subject, "Física");
  assert.ok(events.includes("status"));
});

test("fase B: problemas semânticos disparam uma rodada de correção", async () => {
  const rec = await generate(id, () => {});
  assert.equal(rec.status, "ready");
  assert.equal(lessonCalls, 2);
  assert.equal(rec.content?.steps.length, PENDULUM_LESSON.steps.length);
  assert.ok(!rec.content!.steps[0].script[0].elements.includes("nao-existe"));
});

test("recurso pedagógico insere etapa complementar após a atual", async () => {
  const rec = await assist(id, "s3", "explain_differently", () => {});
  const ids = rec.content!.steps.map((s) => s.id);
  assert.equal(ids[3], "extra");
  assert.equal(rec.content!.steps[3].kind, "supplement");
  assert.deepEqual(calls.filter((c) => c === "supplement").length, 1);
});
