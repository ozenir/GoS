import type { DividerEl, ListEl, NoteEl, ResultEl, SourceImageEl, TextEl } from "@qi/shared";
import { useRef } from "react";
import { MathView } from "../Math";
import { HandText, Rich } from "../Rich";
import { line, rect, seedFrom } from "../rough";
import { Paths, useMeasured } from "../util";
import { useBoard } from "../context";

const TEXT_VARIANT: Record<TextEl["variant"], string> = {
  title: "text-[1.62em] leading-[1.15]",
  subtitle: "text-[1.28em] leading-tight",
  body: "text-[1em]",
  note: "text-[0.86em] opacity-90",
  label: "text-[0.82em] uppercase tracking-wide opacity-80",
};

export function TextBlock({ el }: { el: TextEl }) {
  return (
    <div className={`ink-${el.ink} ${TEXT_VARIANT[el.variant]}`} style={{ textAlign: el.align }}>
      {el.variant === "subtitle" ? (
        <span className="relative inline-block pb-[0.18em]">
          <Rich text={el.content} />
          <svg className="qi-svg absolute bottom-0 left-0 h-[0.3em] w-full" viewBox="0 0 100 10" preserveAspectRatio="none">
            <Paths specs={line([0, 6], [100, 5], seedFrom(el.id), { roughness: 0.3 })} className="thin" />
          </svg>
        </span>
      ) : (
        <Rich text={el.content} />
      )}
    </div>
  );
}

const BULLET: Record<ListEl["style"], (i: number) => string> = {
  bullet: () => "•",
  number: (i) => `${i + 1}.`,
  check: () => "✓",
  arrow: () => "→",
};

export function ListBlock({ el }: { el: ListEl }) {
  return (
    <ul className={`ink-${el.ink} space-y-[0.35em]`}>
      {el.items.map((item, i) => (
        <li key={i} className="flex items-baseline gap-[0.45em]">
          <span className="qi-g shrink-0" data-u="g">
            {BULLET[el.style](i)}
          </span>
          <span className="min-w-0">
            <Rich text={item} />
          </span>
        </li>
      ))}
    </ul>
  );
}

export function ResultBlock({ el }: { el: ResultEl }) {
  return (
    <div className="flex flex-col items-start">
      {el.label && (
        <div className="ink-red mb-[0.15em] text-[0.8em]">
          <HandText text={el.label} />
        </div>
      )}
      <div className={`ink-${el.ink} relative isolate inline-block px-[0.6em] py-[0.25em] text-[1.18em]`}>
        {el.latex ? <MathView latex={el.latex} display /> : null}
        {el.text ? (
          <div className={el.latex ? "mt-[0.2em] text-[0.85em]" : ""}>
            <Rich text={el.text} />
          </div>
        ) : null}
        <div className="qi-hl-marker" data-u="marker" />
      </div>
    </div>
  );
}

const TONES: Record<NoteEl["tone"], { ink: string; label: string }> = {
  definition: { ink: "purple", label: "Definição" },
  tip: { ink: "green", label: "Dica" },
  warning: { ink: "red", label: "Atenção" },
  remember: { ink: "orange", label: "Lembre-se" },
  info: { ink: "blue", label: "Observação" },
};

export function NoteBlock({ el }: { el: NoteEl }) {
  const ref = useRef<HTMLDivElement>(null);
  const size = useMeasured(ref, (n) => ({ w: Math.round(n.offsetWidth), h: Math.round(n.offsetHeight) }), { w: 0, h: 0 });
  const tone = TONES[el.tone];
  return (
    <div ref={ref} className="relative inline-block max-w-full px-[0.8em] py-[0.55em]">
      {size.w > 0 && (
        <svg className={`qi-svg ink-${tone.ink} absolute inset-0 h-full w-full`}>
          <Paths specs={rect(2, 2, size.w - 4, size.h - 4, seedFrom(el.id))} className="thin" />
        </svg>
      )}
      <div className={`ink-${tone.ink} text-[0.82em] uppercase tracking-wide`}>
        <HandText text={el.title || tone.label} />
      </div>
      <div className="text-[0.95em]">
        <Rich text={el.content} />
      </div>
    </div>
  );
}

export function DividerBlock({ el }: { el: DividerEl }) {
  return (
    <svg className={`qi-svg ink-${el.ink} my-[0.2em] block h-[0.5em] w-full`} viewBox="0 0 100 10" preserveAspectRatio="none">
      <Paths specs={line([0, 5], [100, 5], seedFrom(el.id), { roughness: 0.25 })} className="thin" />
    </svg>
  );
}

export function SourceImageBlock({ el }: { el: SourceImageEl }) {
  const { imageUrl } = useBoard();
  if (!imageUrl) return null;
  return (
    <figure className="inline-block" data-u="fade">
      <div className="relative inline-block rotate-[-0.6deg] bg-white p-[0.35em] shadow-[0_0.15em_0.6em_rgba(0,0,0,0.18)]">
        <span className="absolute -top-[0.45em] left-1/2 h-[0.9em] w-[3.2em] -translate-x-1/2 rotate-[2deg] bg-amber-200/70" />
        <img src={imageUrl} alt="Questão original" className="block max-h-[13em] max-w-full object-contain" />
      </div>
      {el.caption && (
        <figcaption className="ink-gray mt-[0.3em] text-[0.8em]">
          <HandText text={el.caption} />
        </figcaption>
      )}
    </figure>
  );
}
