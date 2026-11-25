/**
 * Geração de traços "à mão" com rough.js. Cada função devolve uma lista de
 * caminhos SVG; o componente decide se é traço (animado como escrita) ou
 * preenchimento. As coordenadas já estão no espaço do SVG (y para baixo).
 */
import rough from "roughjs";
import type { Options } from "roughjs/bin/core";

const gen = rough.generator();

export interface PathSpec {
  d: string;
  kind: "stroke" | "fill";
  /** Comprimento aproximado em unidades do SVG (para o tempo de animação). */
  len: number;
}

export function seedFrom(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return (Math.abs(h) % 2_000_000) + 1;
}

const BASE: Options = { roughness: 0.55, bowing: 0.7, disableMultiStroke: true, preserveVertices: true };

function toSpecs(drawable: ReturnType<typeof gen.line>, len: number): PathSpec[] {
  return gen.toPaths(drawable).map((p) => ({
    d: p.d,
    kind: p.fill && p.fill !== "none" && (!p.stroke || p.stroke === "none") ? "fill" : "stroke",
    len,
  }));
}

const dist = (a: number[], b: number[]) => Math.hypot(b[0] - a[0], b[1] - a[1]);

export function line(a: number[], b: number[], seed: number, opts: Options = {}): PathSpec[] {
  return toSpecs(gen.line(a[0], a[1], b[0], b[1], { ...BASE, seed, ...opts }), dist(a, b));
}

/** Linha tracejada desenhada como pequenos traços independentes. */
export function dashedLine(a: number[], b: number[], seed: number, dash: number): PathSpec[] {
  const L = dist(a, b);
  if (L === 0) return [];
  const n = Math.max(1, Math.floor(L / (dash * 1.8)));
  const out: PathSpec[] = [];
  for (let i = 0; i < n; i++) {
    const t0 = (i * L) / n / L;
    const t1 = Math.min(1, t0 + dash / L);
    const p = [a[0] + (b[0] - a[0]) * t0, a[1] + (b[1] - a[1]) * t0];
    const q = [a[0] + (b[0] - a[0]) * t1, a[1] + (b[1] - a[1]) * t1];
    out.push({ d: `M${p[0].toFixed(2)},${p[1].toFixed(2)}L${q[0].toFixed(2)},${q[1].toFixed(2)}`, kind: "stroke", len: dash });
  }
  return out;
}

/** Ponta de seta em "V" na posição tip, apontando na direção (dx, dy). */
export function arrowHead(tip: number[], dir: number[], size: number, seed: number): PathSpec[] {
  const L = Math.hypot(dir[0], dir[1]) || 1;
  const ux = dir[0] / L, uy = dir[1] / L;
  const ang = 0.45;
  const back = (s: number) => [
    tip[0] - size * (ux * Math.cos(ang) - s * uy * Math.sin(ang)),
    tip[1] - size * (uy * Math.cos(ang) + s * ux * Math.sin(ang)),
  ];
  const p1 = back(1), p2 = back(-1);
  return [
    { d: `M${p1[0].toFixed(2)},${p1[1].toFixed(2)}L${tip[0].toFixed(2)},${tip[1].toFixed(2)}L${p2[0].toFixed(2)},${p2[1].toFixed(2)}`, kind: "stroke", len: size * 2 },
  ];
  void seed;
}

export function polyline(points: number[][], closed: boolean, seed: number, opts: Options = {}): PathSpec[] {
  const pts = points.map((p) => [p[0], p[1]] as [number, number]);
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
  if (closed && pts.length > 2) len += dist(pts[pts.length - 1], pts[0]);
  const d = closed ? gen.polygon(pts, { ...BASE, seed, ...opts }) : gen.linearPath(pts, { ...BASE, seed, ...opts });
  return toSpecs(d, len);
}

export function curve(points: number[][], seed: number, opts: Options = {}): PathSpec[] {
  const pts = points.map((p) => [p[0], p[1]] as [number, number]);
  let len = 0;
  for (let i = 1; i < pts.length; i++) len += dist(pts[i - 1], pts[i]);
  return toSpecs(gen.curve(pts, { ...BASE, seed, ...opts }), len);
}

export function ellipse(cx: number, cy: number, w: number, h: number, seed: number, opts: Options = {}): PathSpec[] {
  return toSpecs(gen.ellipse(cx, cy, w, h, { ...BASE, seed, ...opts }), (Math.PI * (w + h)) / 2);
}

export function rect(x: number, y: number, w: number, h: number, seed: number, opts: Options = {}): PathSpec[] {
  return toSpecs(gen.rectangle(x, y, w, h, { ...BASE, seed, ...opts }), 2 * (w + h));
}

/** Arco (ângulos em radianos, sentido do SVG). */
export function arc(cx: number, cy: number, r: number, a0: number, a1: number, seed: number, opts: Options = {}): PathSpec[] {
  const start = Math.min(a0, a1), stop = Math.max(a0, a1);
  return toSpecs(gen.arc(cx, cy, r * 2, r * 2, start, stop, false, { ...BASE, seed, ...opts }), r * (stop - start));
}

/** Mola em zigue-zague entre a e b. */
export function spring(a: number[], b: number[], coils: number, amp: number, seed: number): PathSpec[] {
  const L = dist(a, b);
  const ux = (b[0] - a[0]) / L, uy = (b[1] - a[1]) / L;
  const nx = -uy, ny = ux;
  const lead = Math.min(L * 0.12, amp * 1.5);
  const pts: number[][] = [a, [a[0] + ux * lead, a[1] + uy * lead]];
  const n = Math.max(2, Math.round(coils)) * 2;
  for (let i = 1; i <= n; i++) {
    const t = lead + ((L - 2 * lead) * (i - 0.5)) / n;
    const s = i % 2 ? 1 : -1;
    pts.push([a[0] + ux * t + nx * amp * s, a[1] + uy * t + ny * amp * s]);
  }
  pts.push([b[0] - ux * lead, b[1] - uy * lead], b);
  return polyline(pts, false, seed, { roughness: 0.3 });
}

/** Superfície hachurada (teto, chão, parede). */
export function support(a: number[], b: number[], side: "above" | "below" | "left" | "right", size: number, seed: number): PathSpec[] {
  const out = line(a, b, seed, { roughness: 0.4 });
  const L = dist(a, b);
  const n = Math.max(3, Math.round(L / (size * 0.9)));
  const dir = { above: [0.6, -1], below: [-0.6, 1], left: [-1, -0.6], right: [1, 0.6] }[side];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const p = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
    const q = [p[0] + dir[0] * size * 0.7, p[1] + dir[1] * size * 0.7];
    out.push({ d: `M${p[0].toFixed(2)},${p[1].toFixed(2)}L${q[0].toFixed(2)},${q[1].toFixed(2)}`, kind: "stroke", len: size });
  }
  return out;
}

export function solidCircle(cx: number, cy: number, r: number, seed: number): PathSpec[] {
  return toSpecs(gen.circle(cx, cy, r * 2, { ...BASE, seed, fill: "currentColor", fillStyle: "solid", roughness: 0.4 }), Math.PI * 2 * r);
}

export function filledPolygon(points: number[][], seed: number, hachure: boolean): PathSpec[] {
  const pts = points.map((p) => [p[0], p[1]] as [number, number]);
  return toSpecs(gen.polygon(pts, { ...BASE, seed, fill: "currentColor", fillStyle: hachure ? "hachure" : "solid", stroke: "none", hachureGap: 12 }), 0)
    .map((s) => ({ ...s, kind: hachure ? ("stroke" as const) : ("fill" as const) }));
}
