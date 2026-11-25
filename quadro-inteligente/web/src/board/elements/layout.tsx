import type { BoardEl, ConnectorEl, LeafEl, RowEl } from "@qi/shared";
import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useBoard } from "../context";
import { arrowHead, curve, polyline, seedFrom, type PathSpec } from "../rough";
import { emPx, Paths } from "../util";
import { DividerBlock, ListBlock, NoteBlock, ResultBlock, SourceImageBlock, TextBlock } from "./basic";
import { DerivationBlock, EquationBlock, MatrixBlock } from "./math";
import { TableBlock } from "./table";
import { GraphBlock } from "./graph";
import { DiagramBlock } from "./diagram";

function Leaf({ el }: { el: LeafEl | ConnectorEl }) {
  switch (el.type) {
    case "text": return <TextBlock el={el} />;
    case "equation": return <EquationBlock el={el} />;
    case "derivation": return <DerivationBlock el={el} />;
    case "list": return <ListBlock el={el} />;
    case "matrix": return <MatrixBlock el={el} />;
    case "table": return <TableBlock el={el} />;
    case "graph": return <GraphBlock el={el} />;
    case "diagram": return <DiagramBlock el={el} />;
    case "result": return <ResultBlock el={el} />;
    case "note": return <NoteBlock el={el} />;
    case "divider": return <DividerBlock el={el} />;
    case "source_image": return <SourceImageBlock el={el} />;
    case "connector": return <ConnectorBlock el={el} />;
    default: return null;
  }
}

/** Contêiner de um elemento: ponto de ancoragem para animação e rolagem. */
function ElementFrame({ el }: { el: LeafEl | ConnectorEl }) {
  if (el.type === "connector") return <div data-el={el.id} className="h-0"><Leaf el={el} /></div>;
  return (
    <div data-el={el.id} data-type={el.type} className="qi-el min-w-0 [&+&]:mt-[0.75em]">
      <Leaf el={el} />
    </div>
  );
}

function RowBlock({ el }: { el: RowEl }) {
  const { format } = useBoard();
  const stacked = format === "reels";
  return (
    <div className={stacked ? "flex flex-col gap-[0.75em]" : "flex items-start gap-[1.8em]"}>
      {el.columns.map((c, i) => (
        <div key={i} className="min-w-0" style={stacked ? undefined : { flex: `${Math.max(0.2, c.weight || 1)} 1 0%` }}>
          {c.elements.map((leaf) => (
            <ElementFrame key={leaf.id} el={leaf} />
          ))}
        </div>
      ))}
    </div>
  );
}

export function BoardElement({ el }: { el: BoardEl }) {
  if (el.type === "row") {
    return (
      <div data-row={el.id} className="qi-el [&+&]:mt-[0.75em]">
        <RowBlock el={el} />
      </div>
    );
  }
  return <ElementFrame el={el} />;
}

/** Seta ou colchete à mão ligando dois elementos do quadro (camada de sobreposição). */
function ConnectorBlock({ el }: { el: ConnectorEl }) {
  const { contentRef, overlay } = useBoard();
  const [geo, setGeo] = useState<{ specs: PathSpec[]; key: string } | null>(null);
  useLayoutEffect(() => {
    const content = contentRef.current;
    if (!content) return;
    const measure = () => {
      const a = content.querySelector(`[data-el="${CSS.escape(el.from)}"]`);
      const b = content.querySelector(`[data-el="${CSS.escape(el.to)}"]`);
      if (!a || !b) return setGeo((g) => (g === null ? g : null));
      const base = content.getBoundingClientRect();
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      const em = emPx(content);
      const A = { l: ra.left - base.left, t: ra.top - base.top, b: ra.bottom - base.top, w: ra.width };
      const B = { l: rb.left - base.left, t: rb.top - base.top, b: rb.bottom - base.top, w: rb.width };
      const seed = seedFrom(el.id);
      let specs: PathSpec[];
      if (el.style === "bracket") {
        const x = Math.max(em * 0.25, Math.min(A.l, B.l) - em * 0.8);
        const ya = A.t + Math.min(em * 0.9, (A.b - A.t) / 2);
        const yb = B.t + Math.min(em * 0.9, (B.b - B.t) / 2);
        specs = [...polyline([[A.l - em * 0.2, ya], [x, ya], [x, yb], [B.l - em * 0.25, yb]], false, seed, { roughness: 0.4 }), ...arrowHead([B.l - em * 0.25, yb], [1, 0], em * 0.4, seed)];
      } else {
        const p = [A.l + A.w * 0.3, A.b + em * 0.1];
        const q = [B.l + Math.min(B.w * 0.3, em * 3), B.t - em * 0.1];
        const mid = [Math.min(p[0], q[0]) - em * 1.2, (p[1] + q[1]) / 2];
        specs = [...curve([p, mid, q], seed, { roughness: 0.3 }), ...arrowHead(q, [q[0] - mid[0], q[1] - mid[1]], em * 0.4, seed)];
      }
      const key = specs.map((s) => s.d).join("|");
      setGeo((g) => (g && g.key === key ? g : { specs, key }));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(content);
    return () => ro.disconnect();
  }, [contentRef, el.from, el.to, el.id, el.style]);
  if (!overlay || !geo) return null;
  return createPortal(
    <svg data-owner={el.id} className={`qi-svg ink-${el.ink} pointer-events-none absolute inset-0 h-full w-full`}>
      <Paths specs={geo.specs} />
    </svg>,
    overlay,
  );
}
