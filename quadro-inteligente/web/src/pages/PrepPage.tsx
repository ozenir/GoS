import type { Analysis, Depth, LessonRecord } from "@qi/shared";
import { AlertTriangle, BookOpen, CheckCircle2, ChevronDown, ClipboardList, FileText, HelpCircle, ListOrdered, Play, RefreshCw, Sigma, Wand2 } from "lucide-react";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { MathView } from "../board/Math";
import { ErrorBox, initialJob, PhaseList, reduceJob, ThinkingFeed } from "../components/JobProgress";
import { ScriptText } from "../components/ScriptText";
import { Badge, Button, Card, Field, inputCls, Segmented, Spinner } from "../components/ui";
import { api } from "../lib/api";

type Job = "analyze" | "generate" | null;

const ANALYZE_PHASES = [
  { id: "reading", label: "Lendo a imagem e transcrevendo a questão" },
  { id: "solving", label: "Resolvendo e verificando cálculos, unidades e hipóteses" },
  { id: "writing", label: "Organizando a estrutura pedagógica" },
  { id: "repair", label: "Revisão final" },
];
const GENERATE_PHASES = [
  { id: "planning", label: "Planejando os blocos da aula" },
  { id: "writing", label: "Escrevendo o quadro e o roteiro do professor" },
  { id: "repair", label: "Conferindo fórmulas, desenhos e sincronização" },
];

const CONFIDENCE = { high: { tone: "green", label: "Confiança alta" }, medium: { tone: "amber", label: "Confiança média" }, low: { tone: "rose", label: "Confiança baixa" } } as const;

export function PrepPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [lesson, setLesson] = useState<LessonRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [job, setJob] = useState<Job>(null);
  const [state, dispatch] = useReducer(reduceJob, initialJob);
  const abortRef = useRef<AbortController | null>(null);
  const started = useRef(false);

  const run = useCallback(
    async (kind: "analyze" | "generate", corrections = "") => {
      setJob(kind);
      dispatch({ type: "reset" });
      dispatch({ type: "status", phase: kind === "analyze" ? "reading" : "planning", message: "Conectando à IA..." });
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const final = kind === "analyze" ? await api.analyze(id, corrections, dispatch, ctrl.signal) : await api.generate(id, dispatch, ctrl.signal);
        if (final.type === "done") {
          setLesson(final.lesson);
          setJob(null);
          if (kind === "generate") navigate(`/aulas/${id}`);
        }
      } catch (e) {
        if ((e as Error).name === "AbortError") {
          setJob(null);
          api.get(id).then(setLesson).catch(() => {});
        } else dispatch({ type: "error", message: (e as Error).message, retryable: true });
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [id, navigate],
  );

  useEffect(() => {
    api
      .get(id)
      .then((l) => {
        setLesson(l);
        const auto = (location.state as { autostart?: boolean } | null)?.autostart;
        if (!started.current && l.status === "uploaded" && (auto || l.hasImage)) {
          started.current = true;
          run("analyze");
        }
      })
      .catch((e) => setLoadError(e.message));
    return () => abortRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loadError) return <div className="mx-auto max-w-xl p-10"><ErrorBox message={loadError} /></div>;
  if (!lesson) return <div className="flex justify-center p-16 text-slate-400"><Spinner /></div>;

  const image = lesson.hasImage ? api.imageUrl(lesson.id) : null;

  if (job) {
    const phases = job === "analyze" ? ANALYZE_PHASES : GENERATE_PHASES;
    return (
      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card>{image && <img src={image} alt="Questão" className="mx-auto max-h-[60vh] rounded-lg object-contain" />}</Card>
        <div className="flex flex-col gap-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">{job === "analyze" ? "Fase A · Análise e resolução" : "Fase B · Construção da aula"}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{job === "analyze" ? "Analisando a questão" : "Montando a aula"}</h1>
            <p className="mt-1 text-sm text-slate-500">{state.error ? "O processo foi interrompido." : state.message}</p>
          </div>
          {state.error ? (
            <ErrorBox message={state.error}>
              {state.retryable && <Button variant="primary" icon={<RefreshCw className="size-4" />} onClick={() => run(job)}>Tentar novamente</Button>}
              <Button onClick={() => { setJob(null); api.get(id).then(setLesson); }}>Voltar</Button>
            </ErrorBox>
          ) : (
            <Card>
              <PhaseList phases={phases} current={state.phase} />
              {job === "generate" && (
                <div className="mt-5">
                  <div className="mb-1.5 flex justify-between text-xs text-slate-500">
                    <span>Etapas escritas: <b className="text-slate-800">{state.steps}</b>{lesson.analysis ? ` de ~${lesson.analysis.recommendedSteps}` : ""}</span>
                    <span>{(state.chars / 1000).toFixed(1)} mil caracteres</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-indigo-500 transition-all duration-500" style={{ width: `${Math.min(97, (state.steps / Math.max(1, lesson.analysis?.recommendedSteps ?? 8)) * 100)}%` }} />
                  </div>
                </div>
              )}
            </Card>
          )}
          {state.warnings.map((w, i) => (
            <p key={i} className="flex gap-2 rounded-lg bg-amber-50 p-3 text-sm text-amber-800 ring-1 ring-amber-200"><AlertTriangle className="size-4 shrink-0" />{w}</p>
          ))}
          {!state.error && <ThinkingFeed text={state.thinking} />}
          {!state.error && (
            <div>
              <Button variant="ghost" onClick={() => abortRef.current?.abort()}>Cancelar</Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!lesson.analysis) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
        <Card>
          <div className="flex flex-col items-center text-center">
            {image && <img src={image} alt="Questão" className="mb-5 max-h-72 rounded-lg object-contain ring-1 ring-slate-200" />}
            {lesson.error ? <ErrorBox message={lesson.error} /> : <p className="text-slate-600">A questão ainda não foi analisada.</p>}
            <Button className="mt-5" variant="primary" icon={<Wand2 className="size-4" />} onClick={() => run("analyze")}>
              {lesson.error ? "Tentar novamente" : "Analisar questão"}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return <Review lesson={lesson} image={image} onLesson={setLesson} onReanalyze={(c) => run("analyze", c)} onGenerate={() => run("generate")} />;
}

function Review({ lesson, image, onLesson, onReanalyze, onGenerate }: { lesson: LessonRecord; image: string | null; onLesson: (l: LessonRecord) => void; onReanalyze: (corrections: string) => void; onGenerate: () => void }) {
  const a = lesson.analysis as Analysis;
  const [statement, setStatement] = useState(a.transcription.statement);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [extra, setExtra] = useState("");
  const [useAssumptions, setUseAssumptions] = useState(false);
  const [showSolution, setShowSolution] = useState(false);
  const [level, setLevel] = useState(lesson.level);

  const corrections = [
    statement.trim() !== a.transcription.statement.trim() ? `Enunciado corrigido pelo professor:\n${statement.trim()}` : "",
    ...a.uncertainties.filter((u) => answers[u.id]?.trim()).map((u) => `Sobre "${u.issue}": ${answers[u.id].trim()}`),
    extra.trim() ? `Outras observações: ${extra.trim()}` : "",
  ].filter(Boolean).join("\n\n");

  const pendingBlocking = a.uncertainties.filter((u) => u.blocking && !answers[u.id]?.trim());
  const canGenerate = !corrections && (pendingBlocking.length === 0 || useAssumptions) && a.legibility !== "poor";
  const conf = CONFIDENCE[a.verification.confidence];

  const save = (patch: { depth?: Depth; level?: string }) => api.patch(lesson.id, patch).then(onLesson).catch(() => {});

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">Revisão antes de gerar a aula</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900">{a.topic || "Questão analisada"}</h1>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge tone="indigo">{a.subject}</Badge>
            <Badge tone={conf.tone}>{conf.label}</Badge>
            {a.legibility !== "good" && <Badge tone={a.legibility === "poor" ? "rose" : "amber"}>{a.legibility === "poor" ? "Imagem ilegível" : "Leitura parcial"}</Badge>}
            {lesson.content && <Badge tone="green">Aula já gerada</Badge>}
          </div>
        </div>
        {lesson.content && (
          <Link to={`/aulas/${lesson.id}`}><Button icon={<Play className="size-4" />}>Abrir aula atual</Button></Link>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.3fr)]">
        <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
          {image && (
            <Card>
              <a href={image} target="_blank" rel="noreferrer" title="Abrir em tamanho real">
                <img src={image} alt="Questão enviada" className="mx-auto max-h-[52vh] rounded-lg object-contain" />
              </a>
            </Card>
          )}
          <Card title="Configuração da aula" icon={<BookOpen className="size-4" />}>
            <div className="space-y-4">
              <Field label="Nível do aluno">
                <input className={inputCls} value={level} onChange={(e) => setLevel(e.target.value)} onBlur={() => level !== lesson.level && save({ level })} />
              </Field>
              <div>
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Profundidade</span>
                <Segmented value={lesson.depth} onChange={(v) => save({ depth: v })} options={[{ value: "basic", label: "Básica" }, { value: "intermediate", label: "Intermediária" }, { value: "advanced", label: "Avançada" }]} />
              </div>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          {a.uncertainties.length > 0 && (
            <Card title="A IA precisa da sua confirmação" icon={<HelpCircle className="size-4 text-amber-500" />} className="ring-amber-300">
              <ul className="space-y-4">
                {a.uncertainties.map((u) => (
                  <li key={u.id} className="rounded-xl bg-amber-50/60 p-4 ring-1 ring-amber-200">
                    <div className="flex items-start gap-2">
                      {u.blocking && <Badge tone="rose">Afeta a resposta</Badge>}
                      <p className="text-sm font-medium text-slate-900"><ScriptText text={u.question || u.issue} /></p>
                    </div>
                    <p className="mt-1 text-xs text-slate-600"><ScriptText text={u.issue} /></p>
                    <p className="mt-1 text-xs text-slate-500">Suposição da IA: <ScriptText text={u.assumption} /></p>
                    <input className={`${inputCls} mt-2`} placeholder="Sua resposta (deixe em branco para aceitar a suposição)" value={answers[u.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [u.id]: e.target.value })} />
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card title="Transcrição da questão" icon={<FileText className="size-4" />} actions={<span className="text-xs text-slate-400">Editável</span>}>
            <textarea className={`${inputCls} min-h-36 resize-y leading-relaxed`} value={statement} onChange={(e) => setStatement(e.target.value)} />
            {a.transcription.alternatives.length > 0 && (
              <ul className="mt-3 space-y-1 text-sm text-slate-700">
                {a.transcription.alternatives.map((alt) => (
                  <li key={alt.label}><b>{alt.label})</b> <ScriptText text={alt.text} /></li>
                ))}
              </ul>
            )}
            {a.transcription.figureDescription && <p className="mt-3 rounded-lg bg-slate-50 p-3 text-xs text-slate-600"><b>Figura:</b> <ScriptText text={a.transcription.figureDescription} /></p>}
          </Card>

          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Dados e incógnitas" icon={<ClipboardList className="size-4" />}>
              <table className="w-full text-sm">
                <tbody className="divide-y divide-slate-100">
                  {a.givens.map((g, i) => (
                    <tr key={i}>
                      <td className="py-1.5 pr-3 font-medium text-slate-900"><MathView latex={g.symbol || "?"} /></td>
                      <td className="py-1.5 pr-3 text-slate-800">{g.value} {g.unit}</td>
                      <td className="py-1.5 text-xs text-slate-500">{g.description}</td>
                    </tr>
                  ))}
                  {a.unknowns.map((u, i) => (
                    <tr key={`u${i}`}>
                      <td className="py-1.5 pr-3 font-medium text-indigo-700"><MathView latex={u.symbol || "?"} /></td>
                      <td className="py-1.5 pr-3 text-indigo-700">?</td>
                      <td className="py-1.5 text-xs text-slate-500">{u.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
            <Card title="Resposta final" icon={<CheckCircle2 className="size-4 text-emerald-500" />}>
              {a.finalAnswer.latex && <div className="text-lg"><MathView latex={a.finalAnswer.latex} display /></div>}
              <p className="mt-2 text-sm text-slate-700"><ScriptText text={a.finalAnswer.text} /></p>
              {a.finalAnswer.alternative && <p className="mt-2 text-sm font-medium text-emerald-700">Alternativa {a.finalAnswer.alternative}</p>}
            </Card>
          </div>

          <Card title="Plano pedagógico" icon={<ListOrdered className="size-4" />} actions={<span className="text-xs text-slate-500">~{a.recommendedSteps} etapas</span>}>
            <dl className="space-y-4 text-sm">
              <div><dt className="font-medium text-slate-900">Objetivo de aprendizagem</dt><dd className="mt-0.5 text-slate-600"><ScriptText text={a.learningObjective} /></dd></div>
              {a.prerequisites.length > 0 && (
                <div><dt className="font-medium text-slate-900">Conhecimentos prévios</dt><dd className="mt-1.5 flex flex-wrap gap-1.5">{a.prerequisites.map((p) => <Badge key={p}>{p}</Badge>)}</dd></div>
              )}
              {a.concepts.length > 0 && (
                <div><dt className="font-medium text-slate-900">Conceitos e definições</dt>
                  <dd className="mt-1 space-y-1 text-slate-600">{a.concepts.map((c) => <p key={c.term}><b className="text-slate-800">{c.term}:</b> <ScriptText text={c.definition} /></p>)}</dd>
                </div>
              )}
              <div><dt className="font-medium text-slate-900">Estratégia</dt><dd className="mt-0.5 text-slate-600"><ScriptText text={a.strategy} /></dd></div>
            </dl>
          </Card>

          {a.formulas.length > 0 && (
            <Card title="Fórmulas e suas origens" icon={<Sigma className="size-4" />}>
              <ul className="space-y-4">
                {a.formulas.map((f, i) => (
                  <li key={i} className="rounded-xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-sm font-medium text-slate-900">{f.name}</span>
                      <MathView latex={f.latex} />
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-600"><b>Origem:</b> <ScriptText text={f.origin} /></p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-600"><b>Por que vale aqui:</b> <ScriptText text={f.whyApplicable} /></p>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <button className="flex w-full items-center gap-2 text-sm font-semibold text-slate-900" onClick={() => setShowSolution((s) => !s)}>
              <CheckCircle2 className="size-4 text-slate-400" /> Resolução verificada pela IA
              <ChevronDown className={`ml-auto size-4 transition-transform ${showSolution ? "rotate-180" : ""}`} />
            </button>
            {showSolution && (
              <ol className="mt-4 space-y-4">
                {a.solution.map((s, i) => (
                  <li key={i}>
                    <p className="text-sm font-medium text-slate-900">{i + 1}. {s.title}</p>
                    <p className="mt-0.5 text-sm text-slate-600"><ScriptText text={s.explanation} /></p>
                    {s.latex.map((l, k) => <MathView key={k} latex={l} display className="my-1 text-slate-800" />)}
                  </li>
                ))}
                <li className="rounded-lg bg-emerald-50 p-3 text-xs leading-relaxed text-emerald-900 ring-1 ring-emerald-200">
                  <p><b>Unidades:</b> <ScriptText text={a.verification.unitsCheck} /></p>
                  <p className="mt-1"><b>Cálculos:</b> <ScriptText text={a.verification.calculationCheck} /></p>
                  <p className="mt-1"><b>Atende ao pedido:</b> <ScriptText text={a.verification.answersTheQuestion} /></p>
                </li>
              </ol>
            )}
          </Card>

          <Card title="Correções adicionais" icon={<Wand2 className="size-4" />}>
            <textarea className={`${inputCls} min-h-20`} placeholder="Algo que a IA leu ou interpretou errado? Descreva aqui." value={extra} onChange={(e) => setExtra(e.target.value)} />
          </Card>

          <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl bg-white/95 p-4 shadow-lg ring-1 ring-slate-200 backdrop-blur">
            {corrections ? (
              <>
                <p className="flex-1 text-sm text-slate-600">Você fez correções. A IA vai refazer a análise considerando-as.</p>
                <Button variant="primary" icon={<RefreshCw className="size-4" />} onClick={() => onReanalyze(corrections)}>Reanalisar com correções</Button>
              </>
            ) : (
              <>
                {pendingBlocking.length > 0 ? (
                  <label className="flex flex-1 items-center gap-2 text-sm text-slate-700">
                    <input type="checkbox" className="size-4 rounded border-slate-300 text-indigo-600" checked={useAssumptions} onChange={(e) => setUseAssumptions(e.target.checked)} />
                    Usar as suposições da IA nos pontos não confirmados
                  </label>
                ) : (
                  <p className="flex-1 text-sm text-slate-600">{a.legibility === "poor" ? "A imagem não pôde ser lida. Envie outra foto ou transcreva o enunciado acima." : "Tudo certo? A IA vai transformar a resolução em uma aula em etapas."}</p>
                )}
                <Button variant="ghost" icon={<RefreshCw className="size-4" />} onClick={() => onReanalyze("")}>Reanalisar</Button>
                <Button variant="primary" size="lg" disabled={!canGenerate} icon={<Wand2 className="size-5" />} onClick={onGenerate}>
                  {lesson.content ? "Gerar aula novamente" : "Gerar aula"}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
