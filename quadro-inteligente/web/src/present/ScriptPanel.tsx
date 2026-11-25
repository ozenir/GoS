import type { Step } from "@qi/shared";
import { ChevronDown, Lightbulb, MessageCircleQuestion, Minus, Plus, Target } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { ScriptText } from "../components/ScriptText";
import { IconButton } from "../components/ui";

const KIND_LABEL: Record<Step["kind"], string> = {
  introduction: "Apresentação",
  interpretation: "Interpretação",
  concepts: "Conceitos",
  definitions: "Definições",
  development: "Desenvolvimento",
  solution: "Resolução",
  verification: "Verificação",
  conclusion: "Conclusão",
  supplement: "Complemento",
};

interface Props {
  step: Step;
  index: number;
  total: number;
  activeSegment: number;
  onSegmentClick: (i: number) => void;
  fontScale: number;
  onFontScale: (v: number) => void;
}

/** Roteiro do professor: o que falar enquanto o quadro é construído. */
export function ScriptPanel({ step, index, total, activeSegment, onSegmentClick, fontScale, onFontScale }: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const [openNotes, setOpenNotes] = useState(true);
  useEffect(() => {
    // Rola apenas a lista do roteiro (nunca a página), mantendo a fala ativa visível.
    const list = listRef.current;
    const el = list?.querySelector<HTMLElement>(`[data-seg="${activeSegment}"]`);
    if (!list || !el || list.scrollHeight <= list.clientHeight) return;
    const top = el.offsetTop;
    const bottom = top + el.offsetHeight;
    if (top < list.scrollTop || bottom > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: Math.max(0, top - list.clientHeight * 0.2), behavior: "smooth" });
    }
  }, [activeSegment, step.id]);

  return (
    <aside className="flex min-h-0 flex-col bg-white lg:h-full">
      <header className="border-b border-slate-200 px-5 pb-4 pt-4">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-600">Roteiro do professor</span>
          <div className="ml-auto flex items-center">
            <IconButton label="Diminuir texto" onClick={() => onFontScale(Math.max(0.8, +(fontScale - 0.1).toFixed(2)))} className="size-8">
              <Minus className="size-4" />
            </IconButton>
            <IconButton label="Aumentar texto" onClick={() => onFontScale(Math.min(1.8, +(fontScale + 0.1).toFixed(2)))} className="size-8">
              <Plus className="size-4" />
            </IconButton>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold tabular-nums text-slate-700">
            Etapa {String(index + 1).padStart(2, "0")} de {String(total).padStart(2, "0")}
          </span>
          <span>·</span>
          <span className={step.kind === "supplement" ? "font-medium text-amber-700" : ""}>{KIND_LABEL[step.kind]}</span>
        </div>
        <h2 className="mt-1 text-lg font-semibold leading-snug text-slate-900">{step.title}</h2>
        {step.goal && (
          <p className="mt-1.5 flex gap-1.5 text-[13px] leading-snug text-slate-500">
            <Target className="mt-0.5 size-3.5 shrink-0" />
            {step.goal}
          </p>
        )}
      </header>

      <div ref={listRef} className="relative min-h-0 flex-1 overflow-y-auto px-3 py-3" style={{ fontSize: `${fontScale}rem` }}>
        <ol className="space-y-1.5">
          {step.script.map((seg, i) => {
            const state = i === activeSegment ? "active" : i < activeSegment ? "past" : "future";
            return (
              <li key={i} data-seg={i}>
                <button
                  onClick={() => onSegmentClick(i)}
                  className={`group w-full rounded-xl border-l-4 px-3.5 py-2.5 text-left leading-relaxed transition-colors ${
                    state === "active"
                      ? "border-amber-400 bg-amber-50 text-slate-900"
                      : state === "past"
                        ? "border-transparent text-slate-400 hover:bg-slate-50"
                        : "border-transparent text-slate-600 hover:bg-slate-50"
                  }`}
                  title="Ir para este trecho"
                >
                  <ScriptText text={seg.text} />
                </button>
              </li>
            );
          })}
        </ol>

        {(step.teacherNotes || step.studentQuestions.length > 0) && (
          <div className="mt-4 rounded-xl bg-slate-50 text-[0.82em] ring-1 ring-slate-200">
            <button className="flex w-full items-center gap-2 px-3.5 py-2.5 font-medium text-slate-700" onClick={() => setOpenNotes((o) => !o)}>
              <Lightbulb className="size-4 text-amber-500" />
              Apoio pedagógico
              <ChevronDown className={`ml-auto size-4 transition-transform ${openNotes ? "rotate-180" : ""}`} />
            </button>
            {openNotes && (
              <div className="space-y-3 px-3.5 pb-3.5">
                {step.teacherNotes && <p className="leading-relaxed text-slate-600"><ScriptText text={step.teacherNotes} /></p>}
                {step.studentQuestions.map((q, i) => (
                  <div key={i} className="leading-relaxed">
                    <p className="flex gap-1.5 font-medium text-slate-800">
                      <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-indigo-500" />
                      <ScriptText text={q.question} />
                    </p>
                    <p className="ml-5.5 text-slate-600"><ScriptText text={q.answer} /></p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
