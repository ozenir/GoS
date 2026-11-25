import type { DiagramEl, Shape } from "@qi/shared";
import { Fragment } from "react";
import { Rich } from "../Rich";
import * as R from "../rough";
import { OverlayLabel, Paths } from "../util";
import { useBoard } from "../context";

const S = 100; // unidades do SVG por unidade do diagrama
const WIDTH = { sm: 0.38, md: 0.55, lg: 0.78, full: 1 } as const;
const LABEL_SIZE = { sm: "0.8em", md: "0.95em", lg: "1.15em", xl: "1.35em" } as const;

interface Label { x: number; y: number; dir: [number, number]; text: string; ink: string; size?: string }
interface Layer { ink: string; specs: R.PathSpec[]; fillOpacity?: number; highlight?: boolean; fillInk?: string; weight?: string; labels: Label[] }

const unit = (v: number[]) => {
  const L = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / L, v[1] / L] as [number, number];
};

/** Diagrama vetorial (figuras geométricas, esquemas de física, vetores). */
export function DiagramBlock({ el }: { el: DiagramEl }) {
  const { format } = useBoard();
  const [x0, x1] = el.xRange;
  const [y0, y1] = el.yRange;
  const W = (x1 - x0) * S;
  const H = (y1 - y0) * S;
  const X = (x: number) => (x - x0) * S;
  const Y = (y: number) => (y1 - y) * S;
  const P = (p: number[]) => [X(p[0]), Y(p[1])];
  const base = Math.max(W, H) * 0.035;
  const seed0 = R.seedFrom(el.id);
  const pct = (p: number[]): [number, number] => [(p[0] / W) * 100, (p[1] / H) * 100];

  const layers: Layer[] = el.shapes.map((s: Shape, i) => {
    const seed = seed0 + i * 7;
    const L: Layer = { ink: s.ink, specs: [], labels: [] };
    const label = (at: number[], dir: [number, number], text: string, size?: string) => {
      if (text) L.labels.push({ ...(() => { const [x, y] = pct(at); return { x, y }; })(), dir, text, ink: s.ink, size });
    };
    switch (s.kind) {
      case "point": {
        const p = P(s.at);
        L.specs = R.solidCircle(p[0], p[1], base * 0.22, seed);
        label(p, [0.8, -0.8], s.label);
        break;
      }
      case "segment":
      case "vector": {
        const a = P(s.from), b = P(s.to);
        const dashed = s.kind === "segment" && s.dashed;
        L.specs = dashed ? R.dashedLine(a, b, seed, base * 0.45) : R.line(a, b, seed);
        const arrow = s.kind === "vector" ? "end" : s.arrow;
        if (arrow === "end" || arrow === "both") L.specs.push(...R.arrowHead(b, [b[0] - a[0], b[1] - a[1]], base * 0.75, seed));
        if (arrow === "start" || arrow === "both") L.specs.push(...R.arrowHead(a, [a[0] - b[0], a[1] - b[1]], base * 0.75, seed));
        if (s.kind === "segment") L.weight = s.weight === "normal" ? "" : s.weight;
        if (s.label) {
          const u = unit([b[0] - a[0], b[1] - a[1]]);
          if (s.kind === "vector") label(b, u, s.label);
          else {
            let n: [number, number] = [-u[1], u[0]];
            if (n[0] < -0.1 || (Math.abs(n[0]) <= 0.1 && n[1] > 0)) n = [-n[0], -n[1]];
            label([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], n, s.label);
          }
        }
        break;
      }
      case "polygon": {
        const pts = s.points.map(P);
        if (s.fill !== "none" && s.closed) {
          L.specs.push(...R.filledPolygon(pts, seed, false));
          L.fillOpacity = s.fill === "highlight" ? undefined : 0.18;
          L.highlight = s.fill === "highlight";
          if (!L.highlight) L.fillInk = s.fill;
        }
        if (s.dashed) for (let k = 0; k < pts.length - (s.closed ? 0 : 1); k++) L.specs.push(...R.dashedLine(pts[k], pts[(k + 1) % pts.length], seed + k, base * 0.45));
        else L.specs.push(...R.polyline(pts, s.closed, seed));
        const c = pts.reduce((acc, p) => [acc[0] + p[0] / pts.length, acc[1] + p[1] / pts.length], [0, 0]);
        label(c, [0, 0], s.label);
        break;
      }
      case "circle": {
        const c = P(s.center);
        const r = s.radius * S;
        if (s.fill !== "none") {
          L.specs.push(...R.filledPolygon(Array.from({ length: 40 }, (_, k) => [c[0] + r * Math.cos((k / 40) * 2 * Math.PI), c[1] + r * Math.sin((k / 40) * 2 * Math.PI)]), seed, false));
          L.fillOpacity = s.fill === "highlight" ? undefined : 0.18;
          L.highlight = s.fill === "highlight";
          if (!L.highlight) L.fillInk = s.fill;
        }
        if (s.dashed) {
          const n = Math.max(10, Math.round((2 * Math.PI * r) / (base * 0.9)));
          for (let k = 0; k < n; k++) {
            const a0 = (k / n) * 2 * Math.PI, a1 = a0 + (Math.PI / n) * 1.1;
            L.specs.push({ d: `M${c[0] + r * Math.cos(a0)},${c[1] + r * Math.sin(a0)}A${r},${r} 0 0 1 ${c[0] + r * Math.cos(a1)},${c[1] + r * Math.sin(a1)}`, kind: "stroke", len: r * (a1 - a0) });
          }
        } else L.specs.push(...R.ellipse(c[0], c[1], r * 2, r * 2, seed));
        label(c, [0, 0], s.label);
        break;
      }
      case "arc": {
        const c = P(s.center);
        const r = s.radius * S;
        const a0 = (-Math.max(s.startDeg, s.endDeg) * Math.PI) / 180;
        const a1 = (-Math.min(s.startDeg, s.endDeg) * Math.PI) / 180;
        if (s.dashed) {
          const n = Math.max(3, Math.round((r * (a1 - a0)) / (base * 0.9)));
          for (let k = 0; k < n; k++) {
            const b0 = a0 + ((a1 - a0) * k) / n, b1 = b0 + ((a1 - a0) / n) * 0.55;
            L.specs.push({ d: `M${c[0] + r * Math.cos(b0)},${c[1] + r * Math.sin(b0)}A${r},${r} 0 0 1 ${c[0] + r * Math.cos(b1)},${c[1] + r * Math.sin(b1)}`, kind: "stroke", len: r * (b1 - b0) });
          }
        } else L.specs.push(...R.arc(c[0], c[1], r, a0, a1, seed, { roughness: 0.35 }));
        const ccw = s.endDeg >= s.startDeg;
        const tip = (deg: number, forward: boolean) => {
          const t = (deg * Math.PI) / 180;
          const p = [c[0] + r * Math.cos(-t), c[1] + r * Math.sin(-t)];
          // tangente no sentido do movimento (anti-horário em coordenadas matemáticas)
          const d = ccw === forward ? [-Math.sin(t), -Math.cos(t)] : [Math.sin(t), Math.cos(t)];
          L.specs.push(...R.arrowHead(p, d, base * 0.7, seed));
        };
        if (s.arrow === "end" || s.arrow === "both") tip(s.endDeg, true);
        if (s.arrow === "start" || s.arrow === "both") tip(s.startDeg, false);
        const mid = (((s.startDeg + s.endDeg) / 2) * Math.PI) / 180;
        label([c[0] + r * Math.cos(-mid), c[1] + r * Math.sin(-mid)], [Math.cos(-mid), Math.sin(-mid)], s.label);
        break;
      }
      case "angle": {
        const v = P(s.vertex), f = P(s.from), t = P(s.to);
        const r = s.radius * S;
        const u1 = unit([f[0] - v[0], f[1] - v[1]]), u2 = unit([t[0] - v[0], t[1] - v[1]]);
        if (s.right) {
          const k = r * 0.6;
          L.specs = R.polyline([[v[0] + u1[0] * k, v[1] + u1[1] * k], [v[0] + (u1[0] + u2[0]) * k, v[1] + (u1[1] + u2[1]) * k], [v[0] + u2[0] * k, v[1] + u2[1] * k]], false, seed, { roughness: 0.3 });
        } else {
          const a0 = Math.atan2(u1[1], u1[0]);
          let delta = Math.atan2(u2[1], u2[0]) - a0;
          while (delta <= -Math.PI) delta += 2 * Math.PI;
          while (delta > Math.PI) delta -= 2 * Math.PI;
          const start = delta > 0 ? a0 : a0 + delta;
          L.specs = R.arc(v[0], v[1], r, start, start + Math.abs(delta), seed, { roughness: 0.3 });
          if (s.arrow) {
            const end = a0 + delta;
            const p = [v[0] + r * Math.cos(end), v[1] + r * Math.sin(end)];
            const sign = delta > 0 ? 1 : -1;
            L.specs.push(...R.arrowHead(p, [-Math.sin(end) * sign, Math.cos(end) * sign], base * 0.55, seed));
          }
        }
        const bis = unit([u1[0] + u2[0], u1[1] + u2[1]]);
        label([v[0] + bis[0] * r * 1.45, v[1] + bis[1] * r * 1.45], [0, 0], s.label);
        break;
      }
      case "rect": {
        const a = P(s.from), b = P(s.to);
        const x = Math.min(a[0], b[0]), y = Math.min(a[1], b[1]), w = Math.abs(b[0] - a[0]), h = Math.abs(b[1] - a[1]);
        const pts = [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
        if (s.fill !== "none") {
          L.specs.push(...R.filledPolygon(pts, seed, false));
          L.fillOpacity = s.fill === "highlight" ? undefined : 0.18;
          L.highlight = s.fill === "highlight";
          if (!L.highlight) L.fillInk = s.fill;
        }
        if (s.dashed) for (let k = 0; k < 4; k++) L.specs.push(...R.dashedLine(pts[k], pts[(k + 1) % 4], seed + k, base * 0.45));
        else L.specs.push(...R.rect(x, y, w, h, seed));
        label([x + w / 2, y + h / 2], [0, 0], s.label);
        break;
      }
      case "body": {
        const c = P(s.at);
        const r = s.size * S;
        if (s.shape === "ball") L.specs = R.solidCircle(c[0], c[1], r, seed);
        else {
          const pts = [[c[0] - r, c[1] - r], [c[0] + r, c[1] - r], [c[0] + r, c[1] + r], [c[0] - r, c[1] + r]];
          L.specs = [...R.filledPolygon(pts, seed, false), ...R.polyline(pts, true, seed)];
        }
        label([c[0] + r * 0.75, c[1] - r * 0.75], [1, -1], s.label);
        break;
      }
      case "support":
        L.specs = R.support(P(s.from), P(s.to), s.side, base * 0.9, seed);
        break;
      case "spring": {
        const a = P(s.from), b = P(s.to);
        L.specs = R.spring(a, b, s.coils, base * 0.55, seed);
        const u = unit([b[0] - a[0], b[1] - a[1]]);
        label([(a[0] + b[0]) / 2, (a[1] + b[1]) / 2], [u[1], -u[0]], s.label);
        break;
      }
      case "curve": {
        const pts = s.points.map(P);
        if (pts.length < 2) break;
        L.specs = s.smooth ? R.curve(pts, seed) : R.polyline(pts, false, seed);
        if (s.dashed) L.weight = "thin";
        const n = pts.length;
        if (s.arrow === "end" || s.arrow === "both") L.specs.push(...R.arrowHead(pts[n - 1], [pts[n - 1][0] - pts[n - 2][0], pts[n - 1][1] - pts[n - 2][1]], base * 0.7, seed));
        if (s.arrow === "start" || s.arrow === "both") L.specs.push(...R.arrowHead(pts[0], [pts[0][0] - pts[1][0], pts[0][1] - pts[1][1]], base * 0.7, seed));
        label(pts[n - 1], [0.8, -0.6], s.label);
        break;
      }
      case "axes": {
        const o = P(s.origin);
        const xe = [o[0] + s.xLength * S, o[1]], ye = [o[0], o[1] - s.yLength * S];
        L.specs = [...R.line(o, xe, seed, { roughness: 0.3 }), ...R.arrowHead(xe, [1, 0], base * 0.7, seed), ...R.line(o, ye, seed + 1, { roughness: 0.3 }), ...R.arrowHead(ye, [0, -1], base * 0.7, seed)];
        label(xe, [0.6, 0.9], s.xLabel);
        label(ye, [0.9, -0.4], s.yLabel);
        break;
      }
      case "label": {
        const dir: Record<string, [number, number]> = { center: [0, 0], left: [1, 0], right: [-1, 0], above: [0, -1], below: [0, 1] };
        label(P(s.at), dir[s.anchor], s.text, LABEL_SIZE[s.size]);
        break;
      }
    }
    return L;
  });

  const aspect = W / H;
  const maxH = format === "reels" ? 19 : 14;
  const width = format === "reels" ? Math.max(WIDTH[el.width], 0.8) : WIDTH[el.width];
  return (
    <figure className="max-w-full" style={{ width: `min(${width * 100}%, ${maxH * aspect}em)` }}>
      <div className="relative w-full" style={{ aspectRatio: `${W} / ${H}` }}>
        {layers.map((l, i) => (
          <Fragment key={i}>
            <svg className={`qi-svg ink-${l.ink} absolute inset-0 h-full w-full`} viewBox={`0 0 ${W} ${H}`}>
              {l.specs.filter((s) => s.kind === "stroke").map((s, k) => (
                <path key={k} d={s.d} className={`qi-stroke ${l.weight ?? ""}`} data-u="stroke" pathLength={1} />
              ))}
              <g opacity={l.fillOpacity ?? 1} className={l.fillInk ? `ink-${l.fillInk}` : undefined}>
                {l.specs.filter((s) => s.kind === "fill").map((s, k) => (
                  <path key={k} d={s.d} className={`qi-fill ${l.highlight ? "hl" : ""}`} data-u="fill" />
                ))}
              </g>
            </svg>
            {l.labels.map((lb, k) => (
              <div key={`l${k}`} className="pointer-events-none absolute inset-0" style={{ fontSize: lb.size ?? "0.95em" }}>
                <OverlayLabel x={lb.x} y={lb.y} dir={lb.dir} className={`ink-${lb.ink}`}>
                  <Rich text={lb.text} />
                </OverlayLabel>
              </div>
            ))}
          </Fragment>
        ))}
      </div>
      {el.caption && (
        <figcaption className="ink-gray mt-[0.2em] text-center text-[0.78em]">
          <Rich text={el.caption} />
        </figcaption>
      )}
    </figure>
  );
}
