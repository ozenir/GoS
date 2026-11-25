import type { Step } from "@qi/shared";
import { forwardRef, useCallback, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState } from "react";
import { BoardContext, type BoardFormat } from "./context";
import { BoardElement } from "./elements/layout";
import { Timeline, type ElementSlot } from "./anim/timeline";
import { writingOrder } from "./anim/order";

export type BoardTheme = "paper" | "whiteboard" | "chalkboard";
export type MathStyle = "hand" | "classic";
export type HandFont = "patrick" | "kalam";

export interface BoardSettings {
  theme: BoardTheme;
  math: MathStyle;
  font: HandFont;
  showStepNumbers: boolean;
}

/** Como a etapa atual deve começar ao ser montada. */
export type EntryMode = "play" | "revealed" | "paused";

export interface BoardHandle {
  timeline: Timeline | null;
}

interface Props {
  steps: Step[];
  current: number;
  entry: EntryMode;
  /** Incrementar força a reconstrução da etapa atual (ex.: repetir). */
  buildKey: number;
  format: BoardFormat;
  settings: BoardSettings;
  imageUrl: string | null;
  fontSize: number;
  rate: number;
  /** Chamado quando a linha do tempo da etapa atual está pronta. */
  onTimeline: (tl: Timeline | null) => void;
  padding?: string;
  /** Conteúdo fixo sobre o quadro (ex.: cabeçalho do Reels), herda o tema. */
  overlayTop?: React.ReactNode;
}

const nextFrame = () => new Promise<void>((r) => requestAnimationFrame(() => r()));

/** Índice da primeira etapa da "página" que contém a etapa `i`. */
export function pageStart(steps: Step[], i: number) {
  for (let k = i; k > 0; k--) if (steps[k]?.newPage) return k;
  return 0;
}

export const Board = forwardRef<BoardHandle, Props>(function Board(props, ref) {
  const { steps, current, entry, buildKey, format, settings, imageUrl, fontSize, rate, onTimeline, padding, overlayTop } = props;
  const onTimelineRef = useRef(onTimeline);
  onTimelineRef.current = onTimeline;
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
  const tlRef = useRef<Timeline | null>(null);
  const rateRef = useRef(rate);
  rateRef.current = rate;
  const start = pageStart(steps, current);
  const visible = steps.slice(start, current + 1);
  const step = steps[current];

  useImperativeHandle(ref, () => ({ get timeline() { return tlRef.current; } }), []);

  const scrollToElement = useCallback((el: Element, smooth = true) => {
    const sc = scrollRef.current;
    if (!sc) return;
    const r = el.getBoundingClientRect();
    const s = sc.getBoundingClientRect();
    const margin = s.height * 0.14;
    let delta = 0;
    if (r.bottom > s.bottom - margin) delta = Math.min(r.bottom - (s.bottom - margin), r.top - s.top - margin * 0.4);
    else if (r.top < s.top) delta = r.top - s.top - margin * 0.4;
    if (Math.abs(delta) > 2) sc.scrollTo({ top: sc.scrollTop + delta, behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Página nova: volta ao topo.
  useLayoutEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [start]);

  const ctx = useMemo(() => ({ format, imageUrl, contentRef, overlay }), [format, imageUrl, overlay]);

  // Constrói a linha do tempo da etapa atual.
  useEffect(() => {
    const content = contentRef.current;
    if (!content || !step) return;
    const root = content.querySelector<HTMLElement>(`[data-step="${CSS.escape(step.id)}"]`);
    if (!root) return;
    let cancelled = false;
    let tl: Timeline | null = null;
    root.style.visibility = "hidden";
    (async () => {
      try {
        await document.fonts?.ready;
      } catch {
        /* ignora */
      }
      await nextFrame();
      await nextFrame();
      if (cancelled) return;
      const groups = writingOrder(step);
      const lookup = (id: string) => {
        const nodes: Element[] = [];
        const a = root.querySelector(`[data-el="${CSS.escape(id)}"]`);
        if (a) nodes.push(a);
        const b = content.querySelector(`[data-owner="${CSS.escape(id)}"]`);
        if (b) nodes.push(b);
        return nodes;
      };
      tl = new Timeline(root, groups, lookup, rateRef.current);
      tl.onElement = (slot: ElementSlot) => scrollToElement(slot.el);
      tlRef.current = tl;
      root.style.visibility = "";
      if (entry === "revealed") {
        tl.finish();
        scrollToElement(root.lastElementChild ?? root, false);
      }
      onTimelineRef.current(tl);
    })();
    return () => {
      cancelled = true;
      root.style.visibility = "";
      tl?.destroy();
      if (tlRef.current === tl) tlRef.current = null;
      onTimelineRef.current(null);
    };
    // A etapa é reconstruída quando muda, quando o layout muda ou ao repetir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, buildKey, format, settings.math, settings.font]);

  useEffect(() => {
    tlRef.current?.setRate(rate);
  }, [rate]);

  return (
    <BoardContext.Provider value={ctx}>
      <div
        className="qi-board relative h-full w-full overflow-hidden"
        data-theme={settings.theme}
        data-math={settings.math}
        data-font={settings.font}
        style={{ fontSize }}
      >
        <div ref={scrollRef} className={`h-full w-full overflow-y-auto overflow-x-hidden ${settings.theme === "whiteboard" ? "qi-paper-grid" : ""}`} style={{ scrollbarWidth: "thin" }}>
          <div ref={contentRef} className="relative min-h-full" style={{ padding: padding ?? "1.1em 1.6em 3em 2.2em" }}>
            {visible.map((s, i) => {
              const index = start + i;
              return (
                <section key={s.id} data-step={s.id} className="relative [&+&]:mt-[1.1em]">
                  {settings.showStepNumbers && (
                    <span className="ink-gray absolute -left-[2.3em] top-[0.35em] flex h-[1.5em] w-[1.5em] items-center justify-center rounded-full border border-current text-[0.62em] opacity-75">
                      {index + 1}
                    </span>
                  )}
                  {s.board.map((el) => (
                    <BoardElement key={el.id} el={el} />
                  ))}
                </section>
              );
            })}
            <div ref={setOverlay} className="pointer-events-none absolute inset-0" />
          </div>
        </div>
        {overlayTop}
      </div>
    </BoardContext.Provider>
  );
});
