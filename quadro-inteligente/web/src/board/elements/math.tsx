import type { DerivationEl, EquationEl, MatrixEl } from "@qi/shared";
import { useRef } from "react";
import { MathView } from "../Math";
import { HandText, Rich } from "../Rich";
import { arrowHead, curve, ellipse, line, rect, seedFrom, type PathSpec } from "../rough";
import { emPx, Paths, relRect, SIZE_EM, useMeasured } from "../util";
import { useBoard } from "../context";

interface MarkGeom { id: string; specs: PathSpec[]; noteLeft: number }

/** Equação em destaque, com marcas desenhadas à mão (\qimark) e anotações. */
export function EquationBlock({ el }: { el: EquationEl }) {
  const ref = useRef<HTMLDivElement>(null);
  const marks = useMeasured<MarkGeom[]>(
    ref,
    (wrap) => {
      const em = emPx(wrap);
      return el.marks.map((m) => {
        const target = wrap.querySelector(`.qimark-${CSS.escape(m.id)}`);
        if (!target) return { id: m.id, specs: [], noteLeft: 0 };
        const r = relRect(target, wrap);
        const seed = seedFrom(el.id + m.id);
        const pad = em * 0.28;
        let specs: PathSpec[] = [];
        const cx = r.x + r.w / 2;
        const cy = r.y + r.h / 2;
        const ew = Math.max(r.w + pad * 1.8, r.h * 0.95);
        const eh = r.h + pad * 0.9;
        if (m.shape === "circle") specs = ellipse(cx, cy, ew, eh, seed, { roughness: 0.7 });
        else if (m.shape === "underline") specs = line([r.x - pad * 0.3, r.y + r.h + pad * 0.3], [r.x + r.w + pad * 0.3, r.y + r.h + pad * 0.2], seed);
        else specs = rect(r.x - pad, r.y - pad * 0.5, r.w + pad * 2, r.h + pad, seed);
        const noteLeft = Math.max(0, Math.min(cx + em * 0.6, wrap.clientWidth - em * 9));
        const note = wrap.querySelector(`[data-note="${CSS.escape(m.id)}"]`);
        if (m.note && note) {
          const nr = relRect(note, wrap);
          const bottom = m.shape === "circle" ? cy + eh / 2 : r.y + r.h + pad * 0.5;
          const start = [cx, bottom + 2];
          const end = [nr.x - em * 0.15, nr.y + em * 0.38];
          if (end[1] > start[1] + em * 0.2 && end[0] > cx + em * 0.15) {
            specs = [
              ...specs,
              ...curve([start, [cx - em * 0.02, end[1] - em * 0.3], [cx + em * 0.15, end[1] - em * 0.02], end], seed + 1, { roughness: 0.2 }),
              ...arrowHead(end, [1, 0], em * 0.3, seed),
            ];
          }
        }
        return { id: m.id, specs, noteLeft };
      });
    },
    [],
  );
  return (
    <div ref={ref} className={`ink-${el.ink} relative`} style={{ fontSize: SIZE_EM[el.size] }}>
      <div className="flex items-center gap-[1em]" style={{ justifyContent: el.align === "center" ? "center" : el.align === "right" ? "flex-end" : "flex-start" }}>
        <MathView latex={el.latex} display className="min-w-0" />
        {el.label && (
          <span className="shrink-0 text-[0.85em]">
            <HandText text={el.label} />
          </span>
        )}
      </div>
      {marks.length > 0 && (
        <svg className="qi-svg pointer-events-none absolute inset-0 h-full w-full">
          {marks.map((m) => {
            const ink = el.marks.find((x) => x.id === m.id)?.ink ?? "red";
            return (
              <g key={m.id} className={`ink-${ink}`}>
                <Paths specs={m.specs} />
              </g>
            );
          })}
        </svg>
      )}
      {el.marks
        .filter((m) => m.note)
        .map((m) => (
          <div
            key={m.id}
            data-note={m.id}
            className={`ink-${m.ink} mt-[0.9em] max-w-[18em] text-[0.74em] leading-snug`}
            style={{ marginLeft: (marks.find((g) => g.id === m.id)?.noteLeft ?? 0) + "px" }}
          >
            <Rich text={m.note} />
          </div>
        ))}
    </div>
  );
}

const CONNECTOR: Record<string, string> = { implies: "\\Rightarrow", equals: "=", therefore: "\\therefore", equivalent: "\\Leftrightarrow" };

export function DerivationBlock({ el }: { el: DerivationEl }) {
  const { format } = useBoard();
  if (el.layout === "horizontal") {
    return (
      <div className="flex flex-wrap items-center gap-x-[0.7em] gap-y-[0.4em]" style={{ fontSize: SIZE_EM[el.size] }}>
        {el.lines.map((l, i) => (
          <div key={i} className="flex items-center gap-x-[0.7em]">
            {l.connector !== "none" && (
              <span className="ink-red relative isolate px-[0.15em]">
                <MathView latex={CONNECTOR[l.connector]} />
                <span className="qi-hl-marker opacity-60" data-u="marker" />
              </span>
            )}
            <span className={`ink-${l.ink}`}>
              <MathView latex={l.latex} display />
            </span>
            {l.annotation && (
              <span className="ink-red text-[0.7em]">
                <Rich text={l.annotation} />
              </span>
            )}
          </div>
        ))}
      </div>
    );
  }
  const narrow = format === "reels";
  return (
    <div
      className="grid items-center gap-x-[0.55em] gap-y-[0.35em]"
      style={{ fontSize: SIZE_EM[el.size], gridTemplateColumns: narrow ? "auto minmax(0,1fr)" : "auto auto minmax(0,1fr)" }}
    >
      {el.lines.map((l, i) => (
        <div key={i} className="contents">
          <span className="ink-red justify-self-end">{l.connector !== "none" ? <MathView latex={CONNECTOR[l.connector]} /> : null}</span>
          <span className={`ink-${l.ink} min-w-0`}>
            <MathView latex={l.latex} display />
          </span>
          {l.annotation ? (
            <span className={`ink-red text-[0.68em] leading-snug ${narrow ? "col-start-2 -mt-[0.3em]" : "pl-[0.6em]"}`}>
              <span className="qi-g" data-u="g">←</span> <Rich text={l.annotation} />
            </span>
          ) : narrow ? null : (
            <span />
          )}
        </div>
      ))}
    </div>
  );
}

const ENV: Record<MatrixEl["brackets"], string> = { parentheses: "pmatrix", brackets: "bmatrix", bars: "vmatrix" };

export function MatrixBlock({ el }: { el: MatrixEl }) {
  const env = ENV[el.brackets];
  const body = el.rows.map((r) => r.join(" & ")).join(" \\\\ ");
  const latex = `${el.prefix ? el.prefix + " " : ""}\\begin{${env}} ${body} \\end{${env}}`;
  return (
    <div className={`ink-${el.ink}`} style={{ fontSize: SIZE_EM[el.size] }}>
      <MathView latex={latex} display />
    </div>
  );
}
