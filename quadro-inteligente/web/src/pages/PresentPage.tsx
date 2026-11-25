import { ASSIST_LABELS, type AssistAction, type LessonRecord } from "@qi/shared";
import { ArrowLeft, FileDown, MonitorPlay, PanelRightClose, PanelRightOpen, Smartphone } from "lucide-react";
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Board, type EntryMode } from "../board/Board";
import type { BoardFormat } from "../board/context";
import { REELS, Stage } from "../board/Stage";
import type { Timeline } from "../board/anim/timeline";
import { ErrorBox, initialJob, reduceJob, ThinkingFeed } from "../components/JobProgress";
import { Button, IconButton, Segmented, Spinner } from "../components/ui";
import { api, type Health } from "../lib/api";
import { usePref } from "../lib/storage";
import { ControlBar, type AdvanceMode } from "../present/ControlBar";
import { AssistMenu, SettingsMenu, type PresentPrefs } from "../present/menus";
import { ScriptPanel } from "../present/ScriptPanel";

const DEFAULT_PREFS: PresentPrefs = {
  theme: "paper",
  math: "hand",
  font: "patrick",
  showStepNumbers: false,
  showScript: true,
  guides: false,
  signature: "",
  reelsHeader: true,
};

export function PresentPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState<LessonRecord | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    api.get(id).then(setLesson).catch((e) => setLoadError(e.message));
    api.health().then(setHealth).catch(() => setHealth(null));
  }, [id]);

  if (loadError) {
    return (
      <div className="mx-auto max-w-xl p-10">
        <ErrorBox message={loadError}>
          <Button onClick={() => navigate("/aulas")}>Ir para a biblioteca</Button>
        </ErrorBox>
      </div>
    );
  }
  if (!lesson) {
    return (
      <div className="flex h-full items-center justify-center bg-slate-950 text-slate-400">
        <Spinner />
      </div>
    );
  }
  if (!lesson.content) return <Navigate to={`/aulas/${lesson.id}/preparar`} replace />;
  return <Presenter lesson={lesson} onLesson={setLesson} health={health} />;
}

function Presenter({ lesson, onLesson, health }: { lesson: LessonRecord; onLesson: (l: LessonRecord) => void; health: Health | null }) {
  const content = lesson.content!;
  const steps = content.steps;
  const [prefs, setPrefs] = usePref<PresentPrefs>("present", DEFAULT_PREFS);
  const [format, setFormat] = usePref<BoardFormat>("format", "wide");
  const [advance, setAdvance] = usePref<AdvanceMode>("advance", "step");
  const [rate, setRate] = usePref<number>("rate", 1);
  const [fontScale, setFontScale] = usePref<number>("scriptFont", 1);

  const [index, setIndex] = useState(0);
  const [entry, setEntry] = useState<EntryMode>("play");
  const [buildKey, setBuildKey] = useState(0);
  const [ui, setUi] = useState({ playing: false, ended: false, segment: 0, progress: 0 });
  const tlRef = useRef<Timeline | null>(null);
  const entryRef = useRef(entry);
  entryRef.current = entry;
  const advanceRef = useRef(advance);
  advanceRef.current = advance;
  const rootRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  const step = steps[Math.min(index, steps.length - 1)];

  const syncUi = useCallback((tl: Timeline) => {
    setUi({ playing: tl.isPlaying, ended: tl.ended, segment: tl.segmentAt(), progress: tl.total ? tl.time / tl.total : 0 });
  }, []);

  /** Toca a partir do tempo atual; no modo "por fala" para ao fim do segmento indicado. */
  const playFrom = useCallback((tl: Timeline, segment: number) => {
    const stop = advanceRef.current === "segment" ? (tl.segments[segment]?.end ?? null) : null;
    tl.play(stop);
  }, []);

  const onTimeline = useCallback(
    (tl: Timeline | null) => {
      tlRef.current = tl;
      if (!tl) return;
      let last = 0;
      tl.onTick = () => {
        const now = performance.now();
        if (now - last > 90) {
          last = now;
          syncUi(tl);
        }
      };
      tl.onStateChange = () => syncUi(tl);
      if (entryRef.current === "play") playFrom(tl, 0);
      syncUi(tl);
    },
    [playFrom, syncUi],
  );

  const goTo = useCallback(
    (i: number, mode: EntryMode) => {
      const clamped = Math.max(0, Math.min(steps.length - 1, i));
      setEntry(mode);
      setIndex(clamped);
      setBuildKey((k) => k + 1);
    },
    [steps.length],
  );

  const next = useCallback(() => {
    const tl = tlRef.current;
    if (advanceRef.current === "segment" && tl && !tl.ended) {
      const cur = tl.segmentAt();
      const seg = tl.segments[cur];
      if (tl.isPlaying || (seg && tl.time < seg.end - 1)) {
        // termina a fala atual imediatamente
        tl.pause();
        tl.seek(seg ? seg.end : tl.total);
        syncUi(tl);
        return;
      }
      if (cur + 1 < tl.segments.length) {
        playFrom(tl, cur + 1);
        return;
      }
    }
    if (index < steps.length - 1) goTo(index + 1, "play");
    else if (tl && !tl.ended) tl.finish();
  }, [goTo, index, playFrom, steps.length, syncUi]);

  const prev = useCallback(() => {
    if (index > 0) goTo(index - 1, "revealed");
  }, [goTo, index]);

  const replay = useCallback(() => {
    const tl = tlRef.current;
    if (!tl) return;
    tl.pause();
    tl.seek(0);
    playFrom(tl, 0);
  }, [playFrom]);

  const toggle = useCallback(() => {
    const tl = tlRef.current;
    if (!tl) return;
    if (tl.isPlaying) tl.pause();
    else if (tl.ended) replay();
    else {
      const cur = tl.segmentAt();
      const seg = tl.segments[cur];
      playFrom(tl, seg && tl.time >= seg.end - 1 ? cur + 1 : cur);
    }
  }, [playFrom, replay]);

  const reveal = useCallback(() => tlRef.current?.finish(), []);

  const onSegmentClick = useCallback(
    (i: number) => {
      const tl = tlRef.current;
      if (!tl || !tl.segments[i]) return;
      tl.pause();
      tl.seek(tl.segments[i].start);
      playFrom(tl, i);
    },
    [playFrom],
  );

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else rootRef.current?.requestFullscreen().catch(() => {});
  }, []);

  useEffect(() => {
    const onFs = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onFs);
    return () => document.removeEventListener("fullscreenchange", onFs);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest("input, textarea, select, [contenteditable=true]")) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key;
      if (k === "ArrowRight" || k === "PageDown" || k === "Enter") next();
      else if (k === "ArrowLeft" || k === "PageUp") prev();
      else if (k === " ") toggle();
      else if (k === "r" || k === "R") replay();
      else if (k === "a" || k === "A") reveal();
      else if (k === "f" || k === "F") toggleFullscreen();
      else if (k === "s" || k === "S") setPrefs((p) => ({ ...p, showScript: !p.showScript }));
      else return;
      e.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, toggle, replay, reveal, toggleFullscreen, setPrefs]);

  // Recursos pedagógicos (etapas complementares geradas sob demanda)
  const [job, dispatch] = useReducer(reduceJob, initialJob);
  const [jobAction, setJobAction] = useState<AssistAction | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const runAssist = async (action: AssistAction) => {
    setJobAction(action);
    dispatch({ type: "reset" });
    dispatch({ type: "status", phase: "start", message: "Conectando à IA..." });
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    try {
      const final = await api.assist(lesson.id, step.id, action, dispatch, ctrl.signal);
      if (final.type === "done") {
        onLesson(final.lesson);
        setJobAction(null);
        goTo(index + 1, "play");
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") dispatch({ type: "error", message: (e as Error).message, retryable: true });
    }
  };

  const imageUrl = lesson.hasImage ? api.imageUrl(lesson.id) : null;
  const settings = useMemo(() => ({ theme: prefs.theme, math: prefs.math, font: prefs.font, showStepNumbers: prefs.showStepNumbers }), [prefs.theme, prefs.math, prefs.font, prefs.showStepNumbers]);
  const aiReady = Boolean(health?.ai.configured);

  return (
    <div ref={rootRef} className="flex h-full flex-col bg-slate-950">
      <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-white/10 bg-slate-900 px-3 py-2 text-white">
        <Link to="/aulas" className="inline-flex size-9 items-center justify-center rounded-lg text-slate-300 hover:bg-white/10 hover:text-white" title="Voltar à biblioteca">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[15px] font-semibold">{content.plan.title || lesson.title}</h1>
          <p className="truncate text-xs text-slate-400">
            {[content.plan.subject, content.plan.topic].filter(Boolean).join(" · ")}
            {lesson.sample && <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-slate-300">Exemplo</span>}
          </p>
        </div>
        <Segmented
          dark
          value={format}
          onChange={(v) => setFormat(v)}
          options={[
            { value: "wide", label: <><MonitorPlay className="size-4" /> Tela completa</>, title: "Quadro ocupando toda a área (16:9)" },
            { value: "reels", label: <><Smartphone className="size-4" /> Reels 9:16</>, title: "Quadro vertical no tamanho do Instagram Reels (1080×1920)" },
          ]}
        />
        <AssistMenu disabled={!aiReady} reason="Configure a chave da API de IA no servidor para usar estes recursos." onPick={runAssist} />
        <SettingsMenu prefs={prefs} onChange={setPrefs} reels={format === "reels"} />
        <IconButton dark label="Exportar PDF" onClick={() => window.open(`/aulas/${lesson.id}/imprimir`, "_blank")}>
          <FileDown className="size-5" />
        </IconButton>
        <IconButton dark label={prefs.showScript ? "Ocultar roteiro (S)" : "Mostrar roteiro (S)"} onClick={() => setPrefs({ ...prefs, showScript: !prefs.showScript })}>
          {prefs.showScript ? <PanelRightClose className="size-5" /> : <PanelRightOpen className="size-5" />}
        </IconButton>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <main className={`relative h-[68svh] shrink-0 lg:h-auto lg:flex-1 lg:shrink ${format === "reels" ? "bg-[radial-gradient(ellipse_at_center,#334155_0%,#0f172a_70%)] p-4" : "bg-slate-800 p-3"}`}>
          <Stage format={format} guides={prefs.guides}>
            {({ width, height, fontSize }) => (
              <Board
                steps={steps}
                current={index}
                entry={entry}
                buildKey={buildKey}
                format={format}
                settings={settings}
                imageUrl={imageUrl}
                fontSize={fontSize}
                rate={rate}
                onTimeline={onTimeline}
                padding={
                  format === "reels"
                    ? `${height * (REELS.safeTop + (prefs.reelsHeader ? 0.075 : 0.01))}px ${width * 0.075}px ${height * REELS.safeBottom}px ${width * 0.075}px`
                    : undefined
                }
                overlayTop={
                  format === "reels" && prefs.reelsHeader ? (
                    <ReelsHeader height={height} width={width} title={step.title} index={index} total={steps.length} signature={prefs.signature} />
                  ) : null
                }
              />
            )}
          </Stage>
        </main>
        {prefs.showScript && (
          <div className="w-full shrink-0 border-t border-slate-200 lg:h-auto lg:w-[400px] lg:border-l lg:border-t-0 xl:w-[440px]">
            <ScriptPanel step={step} index={index} total={steps.length} activeSegment={ui.segment} onSegmentClick={onSegmentClick} fontScale={fontScale} onFontScale={setFontScale} />
          </div>
        )}
      </div>

      <ControlBar
        index={index}
        total={steps.length}
        progress={ui.progress}
        playing={ui.playing}
        ended={ui.ended}
        advance={advance}
        rate={rate}
        fullscreen={fullscreen}
        onPrev={prev}
        onNext={next}
        onReplay={replay}
        onToggle={toggle}
        onReveal={reveal}
        onJump={(i) => goTo(i, i < index ? "revealed" : "play")}
        onAdvance={setAdvance}
        onRate={setRate}
        onFullscreen={toggleFullscreen}
      />

      {jobAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center gap-3">
              {job.error ? null : <Spinner className="size-5 text-indigo-600" />}
              <div>
                <h3 className="font-semibold text-slate-900">{ASSIST_LABELS[jobAction]}</h3>
                <p className="text-sm text-slate-500">{job.error ? "Não foi possível concluir." : job.message || "Preparando..."}</p>
              </div>
            </div>
            {job.error ? (
              <div className="mt-4">
                <ErrorBox message={job.error} />
              </div>
            ) : (
              <ThinkingFeed text={job.thinking} className="mt-4" />
            )}
            <div className="mt-5 flex justify-end gap-2">
              {job.error && job.retryable && <Button variant="primary" onClick={() => runAssist(jobAction)}>Tentar novamente</Button>}
              <Button
                onClick={() => {
                  abortRef.current?.abort();
                  setJobAction(null);
                }}
              >
                {job.error ? "Fechar" : "Cancelar"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReelsHeader({ height, width, title, index, total, signature }: { height: number; width: number; title: string; index: number; total: number; signature: string }) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 z-10"
      style={{
        height: height * (REELS.safeTop + 0.07),
        paddingTop: height * REELS.safeTop,
        paddingLeft: width * 0.075,
        paddingRight: width * 0.075,
        background: "linear-gradient(var(--paper) 85%, transparent)",
      }}
    >
      <div className="flex items-baseline gap-[0.5em]">
        <span className="ink-red shrink-0 text-[0.78em] tracking-wide">
          {String(index + 1).padStart(2, "0")}/{String(total).padStart(2, "0")}
        </span>
        <span className="ink-orange min-w-0 flex-1 truncate text-[1.05em]">{title}</span>
        {signature && <span className="ink-gray shrink-0 text-[0.72em]">{signature}</span>}
      </div>
    </div>
  );
}
