import { compileExpression, type GraphEl } from "@qi/shared";
import { useId, useMemo } from "react";
import { Rich } from "../Rich";
import { arrowHead, dashedLine, line, seedFrom, type PathSpec } from "../rough";
import { OverlayLabel, Paths } from "../util";
import { useBoard } from "../context";

const DIMS = { wide: [600, 380], square: [600, 560], tall: [520, 680] } as const;
const WIDTH = { sm: 0.45, md: 0.62, lg: 0.82, full: 1 } as const;
const M = { l: 34, r: 26, t: 22, b: 30 };

function niceStep(span: number, target = 6) {
  const raw = span / target;
  const p = Math.pow(10, Math.floor(Math.log10(raw)));
  const n = raw / p;
  return (n < 1.5 ? 1 : n < 3 ? 2 : n < 7 ? 5 : 10) * p;
}

function fmt(v: number) {
  const r = Math.round(v * 1000) / 1000;
  return String(r).replace("-", "−").replace(".", ",");
}

/** Gráfico cartesiano: eixos, grade, funções, pontos e segmentos. */
export function GraphBlock({ el }: { el: GraphEl }) {
  const { format } = useBoard();
  const clipId = useId().replace(/:/g, "");
  const [W, H] = DIMS[el.aspect];
  const [x0, x1] = el.xRange;
  const [y0, y1] = el.yRange;
  const sx = (x: number) => M.l + ((x - x0) / (x1 - x0)) * (W - M.l - M.r);
  const sy = (y: number) => H - M.b - ((y - y0) / (y1 - y0)) * (H - M.t - M.b);
  const seed = seedFrom(el.id);

  const data = useMemo(() => {
    const xStep = niceStep(x1 - x0);
    const yStep = niceStep(y1 - y0);
    const xTicks: number[] = [];
    for (let v = Math.ceil(x0 / xStep) * xStep; v <= x1 + 1e-9; v += xStep) if (Math.abs(v) > 1e-9) xTicks.push(v);
    const yTicks: number[] = [];
    for (let v = Math.ceil(y0 / yStep) * yStep; v <= y1 + 1e-9; v += yStep) if (Math.abs(v) > 1e-9) yTicks.push(v);
    const axisY = y0 <= 0 && y1 >= 0 ? 0 : y0;
    const axisX = x0 <= 0 && x1 >= 0 ? 0 : x0;
    const fns = el.functions.map((f) => {
      let fn: ((x: number) => number) | null = null;
      try {
        fn = compileExpression(f.expr);
      } catch {
        fn = null;
      }
      const a = Math.max(x0, Math.min(f.domain[0], f.domain[1]));
      const b = Math.min(x1, Math.max(f.domain[0], f.domain[1]));
      let d = "";
      let last: [number, number] | null = null;
      let pen = false;
      const N = 260;
      const yLimit = (y1 - y0) * 4;
      for (let i = 0; fn && i <= N; i++) {
        const x = a + ((b - a) * i) / N;
        const y = fn(x);
        if (!Number.isFinite(y) || y > y1 + yLimit || y < y0 - yLimit) {
          pen = false;
          continue;
        }
        d += `${pen ? "L" : "M"}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`;
        pen = true;
        if (y >= y0 && y <= y1) last = [x, y];
      }
      return { f, d, last, ok: Boolean(fn) };
    });
    return { xTicks, yTicks, axisX, axisY, fns };
  }, [el, x0, x1, y0, y1]);

  const axes: PathSpec[] = [
    ...line([M.l - 8, sy(data.axisY)], [W - 6, sy(data.axisY)], seed, { roughness: 0.35 }),
    ...arrowHead([W - 6, sy(data.axisY)], [1, 0], 11, seed),
    ...line([sx(data.axisX), H - M.b + 8], [sx(data.axisX), 6], seed + 1, { roughness: 0.35 }),
    ...arrowHead([sx(data.axisX), 6], [0, -1], 11, seed),
  ];
  const ticks: PathSpec[] = [
    ...data.xTicks.map((v) => ({ d: `M${sx(v)},${sy(data.axisY) - 4}L${sx(v)},${sy(data.axisY) + 4}`, kind: "stroke" as const, len: 8 })),
    ...data.yTicks.map((v) => ({ d: `M${sx(data.axisX) - 4},${sy(v)}L${sx(data.axisX) + 4},${sy(v)}`, kind: "stroke" as const, len: 8 })),
  ];
  const pct = (x: number, y: number) => ({ x: (x / W) * 100, y: (y / H) * 100 });
  const width = format === "reels" ? Math.max(WIDTH[el.width], 0.9) : WIDTH[el.width];
  const maxH = format === "reels" ? 17 : 13.5;

  return (
    <figure className="max-w-full" style={{ width: `min(${width * 100}%, ${(maxH * W) / H}em)` }}>
      <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg className="qi-svg absolute inset-0 h-full w-full" viewBox={`0 0 ${W} ${H}`}>
          <defs>
            <clipPath id={clipId}>
              <rect x={M.l} y={M.t - 4} width={W - M.l - M.r + 4} height={H - M.t - M.b + 8} />
            </clipPath>
          </defs>
          {el.grid && (
            <g className="ink-gray" opacity={0.35} data-u="fade">
              {data.xTicks.map((v) => (
                <path key={`gx${v}`} d={`M${sx(v)},${M.t}L${sx(v)},${H - M.b}`} className="qi-stroke thin" />
              ))}
              {data.yTicks.map((v) => (
                <path key={`gy${v}`} d={`M${M.l},${sy(v)}L${W - M.r},${sy(v)}`} className="qi-stroke thin" />
              ))}
            </g>
          )}
          <g className="ink-ink">
            <Paths specs={axes} />
            <Paths specs={ticks} className="thin" />
          </g>
          {data.fns.map(({ f, d }, i) => (
            <g key={i} className={`ink-${f.ink}`} clipPath={`url(#${clipId})`}>
              {f.dashed ? (
                <path d={d} className="qi-stroke" style={{ strokeDasharray: "0.6em 0.45em" }} data-u="wipe" />
              ) : (
                <path d={d} className="qi-stroke" data-u="stroke" pathLength={1} />
              )}
            </g>
          ))}
          {el.segments.map((s, i) => {
            const a = [sx(s.from[0]), sy(s.from[1])];
            const b = [sx(s.to[0]), sy(s.to[1])];
            const specs = s.dashed ? dashedLine(a, b, seed + 10 + i, 10) : line(a, b, seed + 10 + i);
            if (s.arrow === "end" || s.arrow === "both") specs.push(...arrowHead(b, [b[0] - a[0], b[1] - a[1]], 12, seed));
            if (s.arrow === "start" || s.arrow === "both") specs.push(...arrowHead(a, [a[0] - b[0], a[1] - b[1]], 12, seed));
            return (
              <g key={`s${i}`} className={`ink-${s.ink}`}>
                <Paths specs={specs} />
              </g>
            );
          })}
          {el.points.map((p, i) => (
            <g key={`p${i}`} className={`ink-${p.ink}`}>
              {p.guides && (
                <>
                  <Paths specs={dashedLine([sx(p.x), sy(p.y)], [sx(p.x), sy(data.axisY)], seed + 30 + i, 8)} className="thin" />
                  <Paths specs={dashedLine([sx(p.x), sy(p.y)], [sx(data.axisX), sy(p.y)], seed + 40 + i, 8)} className="thin" />
                </>
              )}
              <circle cx={sx(p.x)} cy={sy(p.y)} r={6} className="qi-fill" data-u="fill" />
            </g>
          ))}
        </svg>
        <div className="ink-gray pointer-events-none absolute inset-0 text-[0.62em]" data-u="fade">
          {data.xTicks.map((v) => {
            const q = pct(sx(v), sy(data.axisY));
            return <OverlayLabel key={`tx${v}`} x={q.x} y={q.y} dir={[0, 1]}>{fmt(v)}</OverlayLabel>;
          })}
          {data.yTicks.map((v) => {
            const q = pct(sx(data.axisX), sy(v));
            return <OverlayLabel key={`ty${v}`} x={q.x} y={q.y} dir={[-1, 0]}>{fmt(v)}</OverlayLabel>;
          })}
        </div>
        <div className="pointer-events-none absolute inset-0 text-[0.85em]">
          {el.xLabel && (() => { const q = pct(W - 6, sy(data.axisY)); return <OverlayLabel x={q.x} y={q.y} dir={[-0.6, 1]}><Rich text={el.xLabel} /></OverlayLabel>; })()}
          {el.yLabel && (() => { const q = pct(sx(data.axisX), 6); return <OverlayLabel x={q.x} y={q.y} dir={[1, 0.3]}><Rich text={el.yLabel} /></OverlayLabel>; })()}
          {data.fns.map(({ f, last }, i) => {
            if (!f.label || !last) return null;
            const q = pct(sx(last[0]), sy(last[1]));
            return (
              <OverlayLabel key={`fl${i}`} x={q.x} y={q.y} dir={[-1, last[1] > (y0 + y1) / 2 ? 1 : -1]} className={`ink-${f.ink}`}>
                <Rich text={f.label} />
              </OverlayLabel>
            );
          })}
          {el.points.map((p, i) => {
            if (!p.label) return null;
            const q = pct(sx(p.x), sy(p.y));
            return <OverlayLabel key={`pl${i}`} x={q.x} y={q.y} dir={[0.8, -0.8]} className={`ink-${p.ink}`}><Rich text={p.label} /></OverlayLabel>;
          })}
          {el.segments.map((s, i) => {
            if (!s.label) return null;
            const q = pct((sx(s.from[0]) + sx(s.to[0])) / 2, (sy(s.from[1]) + sy(s.to[1])) / 2);
            return <OverlayLabel key={`sl${i}`} x={q.x} y={q.y} dir={[0.7, -0.7]} className={`ink-${s.ink}`}><Rich text={s.label} /></OverlayLabel>;
          })}
        </div>
      </div>
      {el.caption && (
        <figcaption className="ink-gray mt-[0.2em] text-center text-[0.78em]">
          <Rich text={el.caption} />
        </figcaption>
      )}
    </figure>
  );
}
