/**
 * Esquema de dados do Quadro Inteligente.
 *
 * Este arquivo é o contrato entre o motor pedagógico (IA, no backend) e o
 * motor visual (frontend). A IA nunca envia código: ela descreve, por meio
 * destes tipos, o que deve ser escrito ou desenhado no quadro, e o frontend
 * decide como construir e animar cada elemento.
 *
 * Convenções importantes (também usadas no prompt da IA):
 * - Todos os campos são obrigatórios. "Ausência" é representada por valores
 *   sentinela: string vazia "" ou "none". Isso mantém o esquema compatível
 *   com saídas estruturadas (constrained decoding) dos provedores de IA.
 * - Textos aceitam LaTeX inline entre cifrões: "A força $F = ma$ ...".
 * - Coordenadas de diagramas são cartesianas (y cresce para cima), em
 *   unidades arbitrárias definidas por xRange / yRange.
 */
import { z } from "zod";

// ---------------------------------------------------------------------------
// Primitivas
// ---------------------------------------------------------------------------

export const INKS = ["ink", "red", "blue", "orange", "green", "purple", "gray"] as const;
export const Ink = z.enum(INKS);
export type Ink = z.infer<typeof Ink>;

export const Fill = z.enum([...INKS, "highlight", "none"]);
export type Fill = z.infer<typeof Fill>;

/** Ponto [x, y]. */
export const Pt = z.array(z.number()).length(2);
export type Pt = [number, number];

/** Intervalo [min, max]. */
export const Range = z.array(z.number()).length(2);

export const ArrowEnds = z.enum(["none", "end", "start", "both"]);
export const Size = z.enum(["sm", "md", "lg", "xl"]);
export const Align = z.enum(["left", "center", "right"]);
export const Width = z.enum(["sm", "md", "lg", "full"]);

const Id = z.string().min(1);

// ---------------------------------------------------------------------------
// Formas usadas em diagramas
// ---------------------------------------------------------------------------

export const PointShape = z.object({
  kind: z.literal("point"),
  at: Pt,
  label: z.string(),
  ink: Ink,
});

export const SegmentShape = z.object({
  kind: z.literal("segment"),
  from: Pt,
  to: Pt,
  ink: Ink,
  dashed: z.boolean(),
  arrow: ArrowEnds,
  label: z.string(),
  weight: z.enum(["thin", "normal", "bold"]),
});

export const VectorShape = z.object({
  kind: z.literal("vector"),
  from: Pt,
  to: Pt,
  ink: Ink,
  label: z.string(),
});

export const PolygonShape = z.object({
  kind: z.literal("polygon"),
  points: z.array(Pt),
  closed: z.boolean(),
  ink: Ink,
  fill: Fill,
  dashed: z.boolean(),
  label: z.string(),
});

export const CircleShape = z.object({
  kind: z.literal("circle"),
  center: Pt,
  radius: z.number(),
  ink: Ink,
  fill: Fill,
  dashed: z.boolean(),
  label: z.string(),
});

export const ArcShape = z.object({
  kind: z.literal("arc"),
  center: Pt,
  radius: z.number(),
  startDeg: z.number(),
  endDeg: z.number(),
  ink: Ink,
  dashed: z.boolean(),
  arrow: ArrowEnds,
  label: z.string(),
});

export const AngleShape = z.object({
  kind: z.literal("angle"),
  vertex: Pt,
  from: Pt,
  to: Pt,
  radius: z.number(),
  label: z.string(),
  ink: Ink,
  arrow: z.boolean(),
  right: z.boolean(),
});

export const RectShape = z.object({
  kind: z.literal("rect"),
  from: Pt,
  to: Pt,
  ink: Ink,
  fill: Fill,
  dashed: z.boolean(),
  label: z.string(),
});

export const BodyShape = z.object({
  kind: z.literal("body"),
  shape: z.enum(["ball", "block"]),
  at: Pt,
  size: z.number(),
  ink: Ink,
  label: z.string(),
});

export const SupportShape = z.object({
  kind: z.literal("support"),
  from: Pt,
  to: Pt,
  ink: Ink,
  side: z.enum(["above", "below", "left", "right"]),
});

export const SpringShape = z.object({
  kind: z.literal("spring"),
  from: Pt,
  to: Pt,
  ink: Ink,
  coils: z.number(),
  label: z.string(),
});

export const CurveShape = z.object({
  kind: z.literal("curve"),
  points: z.array(Pt),
  ink: Ink,
  dashed: z.boolean(),
  arrow: ArrowEnds,
  smooth: z.boolean(),
  label: z.string(),
});

export const AxesShape = z.object({
  kind: z.literal("axes"),
  origin: Pt,
  xLength: z.number(),
  yLength: z.number(),
  xLabel: z.string(),
  yLabel: z.string(),
  ink: Ink,
});

export const LabelShape = z.object({
  kind: z.literal("label"),
  at: Pt,
  text: z.string(),
  ink: Ink,
  size: Size,
  anchor: z.enum(["center", "left", "right", "above", "below"]),
});

export const Shape = z.discriminatedUnion("kind", [
  PointShape,
  SegmentShape,
  VectorShape,
  PolygonShape,
  CircleShape,
  ArcShape,
  AngleShape,
  RectShape,
  BodyShape,
  SupportShape,
  SpringShape,
  CurveShape,
  AxesShape,
  LabelShape,
]);
export type Shape = z.infer<typeof Shape>;

// ---------------------------------------------------------------------------
// Elementos do quadro
// ---------------------------------------------------------------------------

export const TextEl = z.object({
  id: Id,
  type: z.literal("text"),
  variant: z.enum(["title", "subtitle", "body", "note", "label"]),
  content: z.string(),
  ink: Ink,
  align: Align,
});

export const EquationMark = z.object({
  id: Id,
  shape: z.enum(["circle", "underline", "box"]),
  ink: Ink,
  note: z.string(),
});

export const EquationEl = z.object({
  id: Id,
  type: z.literal("equation"),
  latex: z.string(),
  ink: Ink,
  size: Size,
  align: Align,
  label: z.string(),
  marks: z.array(EquationMark),
});

export const DerivationLine = z.object({
  latex: z.string(),
  ink: Ink,
  connector: z.enum(["none", "implies", "equals", "therefore", "equivalent"]),
  annotation: z.string(),
});

export const DerivationEl = z.object({
  id: Id,
  type: z.literal("derivation"),
  layout: z.enum(["vertical", "horizontal"]),
  size: Size,
  lines: z.array(DerivationLine),
});

export const ListEl = z.object({
  id: Id,
  type: z.literal("list"),
  style: z.enum(["bullet", "number", "check", "arrow"]),
  ink: Ink,
  items: z.array(z.string()),
});

export const MatrixEl = z.object({
  id: Id,
  type: z.literal("matrix"),
  prefix: z.string(),
  rows: z.array(z.array(z.string())),
  brackets: z.enum(["parentheses", "brackets", "bars"]),
  ink: Ink,
  size: Size,
});

export const TableEl = z.object({
  id: Id,
  type: z.literal("table"),
  caption: z.string(),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  ink: Ink,
  highlightRow: z.number(),
});

export const GraphFunction = z.object({
  expr: z.string(),
  ink: Ink,
  label: z.string(),
  domain: Range,
  dashed: z.boolean(),
});

export const GraphPoint = z.object({
  x: z.number(),
  y: z.number(),
  label: z.string(),
  ink: Ink,
  guides: z.boolean(),
});

export const GraphSegment = z.object({
  from: Pt,
  to: Pt,
  ink: Ink,
  dashed: z.boolean(),
  arrow: ArrowEnds,
  label: z.string(),
});

export const GraphEl = z.object({
  id: Id,
  type: z.literal("graph"),
  caption: z.string(),
  xRange: Range,
  yRange: Range,
  xLabel: z.string(),
  yLabel: z.string(),
  grid: z.boolean(),
  aspect: z.enum(["wide", "square", "tall"]),
  width: Width,
  functions: z.array(GraphFunction),
  points: z.array(GraphPoint),
  segments: z.array(GraphSegment),
});

export const DiagramEl = z.object({
  id: Id,
  type: z.literal("diagram"),
  caption: z.string(),
  xRange: Range,
  yRange: Range,
  width: Width,
  shapes: z.array(Shape),
});

export const ResultEl = z.object({
  id: Id,
  type: z.literal("result"),
  label: z.string(),
  latex: z.string(),
  text: z.string(),
  ink: Ink,
});

export const NoteEl = z.object({
  id: Id,
  type: z.literal("note"),
  tone: z.enum(["definition", "tip", "warning", "remember", "info"]),
  title: z.string(),
  content: z.string(),
});

export const DividerEl = z.object({
  id: Id,
  type: z.literal("divider"),
  ink: Ink,
});

export const SourceImageEl = z.object({
  id: Id,
  type: z.literal("source_image"),
  caption: z.string(),
});

export const ConnectorEl = z.object({
  id: Id,
  type: z.literal("connector"),
  from: Id,
  to: Id,
  ink: Ink,
  style: z.enum(["bracket", "arrow"]),
  label: z.string(),
});

/** Elementos que podem aparecer dentro de colunas de uma linha. */
export const LeafEl = z.discriminatedUnion("type", [
  TextEl,
  EquationEl,
  DerivationEl,
  ListEl,
  MatrixEl,
  TableEl,
  GraphEl,
  DiagramEl,
  ResultEl,
  NoteEl,
  DividerEl,
  SourceImageEl,
]);
export type LeafEl = z.infer<typeof LeafEl>;

export const RowColumn = z.object({
  weight: z.number(),
  elements: z.array(LeafEl),
});

export const RowEl = z.object({
  id: Id,
  type: z.literal("row"),
  columns: z.array(RowColumn),
});

export const BoardEl = z.discriminatedUnion("type", [
  TextEl,
  EquationEl,
  DerivationEl,
  ListEl,
  MatrixEl,
  TableEl,
  GraphEl,
  DiagramEl,
  ResultEl,
  NoteEl,
  DividerEl,
  SourceImageEl,
  ConnectorEl,
  RowEl,
]);
export type BoardEl = z.infer<typeof BoardEl>;

export type TextEl = z.infer<typeof TextEl>;
export type EquationEl = z.infer<typeof EquationEl>;
export type DerivationEl = z.infer<typeof DerivationEl>;
export type ListEl = z.infer<typeof ListEl>;
export type MatrixEl = z.infer<typeof MatrixEl>;
export type TableEl = z.infer<typeof TableEl>;
export type GraphEl = z.infer<typeof GraphEl>;
export type DiagramEl = z.infer<typeof DiagramEl>;
export type ResultEl = z.infer<typeof ResultEl>;
export type NoteEl = z.infer<typeof NoteEl>;
export type DividerEl = z.infer<typeof DividerEl>;
export type SourceImageEl = z.infer<typeof SourceImageEl>;
export type ConnectorEl = z.infer<typeof ConnectorEl>;
export type RowEl = z.infer<typeof RowEl>;

// ---------------------------------------------------------------------------
// Etapas e aula
// ---------------------------------------------------------------------------

export const STEP_KINDS = [
  "introduction",
  "interpretation",
  "concepts",
  "definitions",
  "development",
  "solution",
  "verification",
  "conclusion",
  "supplement",
] as const;

export const ScriptSegment = z.object({
  /** Fala do professor (pode conter LaTeX inline entre $...$). */
  text: z.string(),
  /** Ids dos elementos do quadro que são escritos durante esta fala. */
  elements: z.array(z.string()),
});
export type ScriptSegment = z.infer<typeof ScriptSegment>;

export const StudentQuestion = z.object({
  question: z.string(),
  answer: z.string(),
});

export const Step = z.object({
  id: Id,
  kind: z.enum(STEP_KINDS),
  title: z.string(),
  goal: z.string(),
  newPage: z.boolean(),
  board: z.array(BoardEl),
  script: z.array(ScriptSegment),
  teacherNotes: z.string(),
  studentQuestions: z.array(StudentQuestion),
});
export type Step = z.infer<typeof Step>;

export const LessonPlan = z.object({
  title: z.string(),
  subject: z.string(),
  topic: z.string(),
  subtopics: z.array(z.string()),
  level: z.string(),
  learningObjective: z.string(),
  prerequisites: z.array(z.string()),
  finalAnswer: z.string(),
  estimatedMinutes: z.number(),
});
export type LessonPlan = z.infer<typeof LessonPlan>;

/** Saída da FASE B — aula completa em etapas. */
export const LessonContent = z.object({
  plan: LessonPlan,
  steps: z.array(Step),
});
export type LessonContent = z.infer<typeof LessonContent>;

/** Uma etapa complementar gerada por um recurso pedagógico sob demanda. */
export const SupplementContent = z.object({
  step: Step,
});
export type SupplementContent = z.infer<typeof SupplementContent>;

// ---------------------------------------------------------------------------
// FASE A — análise e resolução
// ---------------------------------------------------------------------------

export const Analysis = z.object({
  legibility: z.enum(["good", "partial", "poor"]),
  transcription: z.object({
    statement: z.string(),
    alternatives: z.array(z.object({ label: z.string(), text: z.string() })),
    figureDescription: z.string(),
    handwrittenNotes: z.string(),
  }),
  subject: z.string(),
  topic: z.string(),
  subtopics: z.array(z.string()),
  suggestedLevel: z.string(),
  learningObjective: z.string(),
  prerequisites: z.array(z.string()),
  concepts: z.array(z.object({ term: z.string(), definition: z.string() })),
  formulas: z.array(
    z.object({
      name: z.string(),
      latex: z.string(),
      origin: z.string(),
      whyApplicable: z.string(),
      variables: z.array(z.object({ symbol: z.string(), meaning: z.string(), unit: z.string() })),
    }),
  ),
  givens: z.array(
    z.object({ symbol: z.string(), value: z.string(), unit: z.string(), description: z.string() }),
  ),
  unknowns: z.array(z.object({ symbol: z.string(), description: z.string() })),
  strategy: z.string(),
  solution: z.array(
    z.object({ title: z.string(), explanation: z.string(), latex: z.array(z.string()) }),
  ),
  verification: z.object({
    interpretationCheck: z.string(),
    calculationCheck: z.string(),
    unitsCheck: z.string(),
    answersTheQuestion: z.string(),
    confidence: z.enum(["high", "medium", "low"]),
  }),
  finalAnswer: z.object({
    text: z.string(),
    latex: z.string(),
    alternative: z.string(),
  }),
  uncertainties: z.array(
    z.object({
      id: Id,
      issue: z.string(),
      assumption: z.string(),
      question: z.string(),
      blocking: z.boolean(),
    }),
  ),
  recommendedSteps: z.number(),
});
export type Analysis = z.infer<typeof Analysis>;

// ---------------------------------------------------------------------------
// Registro persistido e API
// ---------------------------------------------------------------------------

export const DEPTHS = ["basic", "intermediate", "advanced"] as const;
export type Depth = (typeof DEPTHS)[number];

export const LESSON_STATUSES = ["uploaded", "analyzing", "analyzed", "generating", "ready", "error"] as const;
export type LessonStatus = (typeof LESSON_STATUSES)[number];

export interface LessonRecord {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: LessonStatus;
  title: string;
  subject: string;
  topic: string;
  level: string;
  depth: Depth;
  teacherNotes: string;
  hasImage: boolean;
  analysis: Analysis | null;
  content: LessonContent | null;
  error: string;
  /** Aulas de exemplo empacotadas com o sistema (não geradas por IA). */
  sample: boolean;
}

export type LessonSummary = Omit<LessonRecord, "analysis" | "content"> & {
  stepCount: number;
};

export const ASSIST_ACTIONS = [
  "explain_differently",
  "formula_origin",
  "analogy",
  "alternative_solution",
  "extra_example",
  "similar_exercises",
] as const;
export type AssistAction = (typeof ASSIST_ACTIONS)[number];

export const ASSIST_LABELS: Record<AssistAction, string> = {
  explain_differently: "Explicar de outra forma",
  formula_origin: "Mostrar de onde vem a fórmula",
  analogy: "Criar uma analogia",
  alternative_solution: "Verificar outra solução",
  extra_example: "Gerar exemplo adicional",
  similar_exercises: "Gerar exercícios semelhantes",
};

/** Eventos enviados pelo servidor via SSE durante análise e geração. */
export type ProgressEvent =
  | { type: "status"; phase: string; message: string }
  | { type: "thinking"; text: string }
  | { type: "progress"; chars: number; steps: number }
  | { type: "warning"; message: string }
  | { type: "done"; lesson: LessonRecord }
  | { type: "error"; message: string; retryable: boolean };
