import type { TableEl } from "@qi/shared";
import { useRef } from "react";
import { Rich } from "../Rich";
import { line, seedFrom, type PathSpec } from "../rough";
import { Paths, useMeasured } from "../util";

interface Grid { w: number; h: number; rows: number[]; cols: number[]; hl: { y: number; h: number } | null }

/** Tabela com linhas desenhadas à mão e preenchimento célula a célula. */
export function TableBlock({ el }: { el: TableEl }) {
  const ref = useRef<HTMLDivElement>(null);
  const grid = useMeasured<Grid>(
    ref,
    (wrap) => {
      const table = wrap.querySelector("table");
      if (!table) return { w: 0, h: 0, rows: [], cols: [], hl: null };
      const trs = Array.from(table.querySelectorAll("tr"));
      const rows = trs.map((tr) => Math.round(tr.offsetTop));
      const first = trs[0];
      const cols = first ? Array.from(first.children).map((c) => Math.round((c as HTMLElement).offsetLeft)) : [];
      const hlRow = el.highlightRow >= 0 ? trs[el.highlightRow + (el.headers.length ? 1 : 0)] : undefined;
      return {
        w: Math.round(table.offsetWidth),
        h: Math.round(table.offsetHeight),
        rows,
        cols,
        hl: hlRow ? { y: Math.round(hlRow.offsetTop), h: Math.round(hlRow.offsetHeight) } : null,
      };
    },
    { w: 0, h: 0, rows: [], cols: [], hl: null },
  );
  const seed = seedFrom(el.id);
  const specs: PathSpec[] = [];
  if (grid.w > 0) {
    const ys = [...grid.rows.slice(1), grid.h];
    // linha sob o cabeçalho mais marcada; demais linhas horizontais
    ys.forEach((y, i) => specs.push(...line([0, y], [grid.w, y + (i % 2 ? 1 : -1)], seed + i, { roughness: 0.35 })));
    grid.cols.slice(1).forEach((x, i) => specs.push(...line([x, 2], [x + (i % 2 ? 1 : -1), grid.h], seed + 50 + i, { roughness: 0.35 })));
  }
  const hasHeader = el.headers.length > 0;
  return (
    <div className={`ink-${el.ink} inline-block max-w-full`}>
      <div ref={ref} className="relative">
        {grid.w > 0 && (
          <svg className="qi-svg pointer-events-none absolute left-0 top-0" width={grid.w} height={grid.h}>
            <Paths specs={specs} className="thin" />
          </svg>
        )}
        <table className="relative z-[1] border-collapse text-[0.95em]">
          {hasHeader && (
            <thead>
              <tr>
                {el.headers.map((h, i) => (
                  <th key={i} className="px-[0.75em] pb-[0.25em] pt-[0.1em] text-center font-normal">
                    <Rich text={h} />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {el.rows.map((r, i) => (
              <tr key={i}>
                {r.map((c, j) => (
                  <td key={j} className="px-[0.75em] py-[0.2em] text-center">
                    <Rich text={c} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {grid.hl && (
          <div className="pointer-events-none absolute inset-x-0 z-0" style={{ top: grid.hl.y, height: grid.hl.h }}>
            <div className="qi-hl-marker opacity-70" data-u="marker" style={{ zIndex: 0, inset: "0.1em -0.2em" }} />
          </div>
        )}
      </div>
      {el.caption && (
        <div className="ink-gray mt-[0.2em] text-[0.78em]">
          <Rich text={el.caption} />
        </div>
      )}
    </div>
  );
}

