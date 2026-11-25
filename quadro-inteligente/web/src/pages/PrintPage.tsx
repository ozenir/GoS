import type { LessonRecord, Step } from "@qi/shared";
import { Printer } from "lucide-react";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { BoardContext } from "../board/context";
import { BoardElement } from "../board/elements/layout";
import { ScriptText } from "../components/ScriptText";
import { Button, Spinner } from "../components/ui";
import { api } from "../lib/api";
import { useRef } from "react";

/** Versão para impressão / PDF: quadro completo de cada etapa e o roteiro. */
export function PrintPage() {
  const { id = "" } = useParams();
  const [lesson, setLesson] = useState<LessonRecord | null>(null);
  useEffect(() => {
    api.get(id).then(setLesson).catch(() => {});
  }, [id]);
  useEffect(() => {
    if (!lesson) return;
    document.title = `${lesson.content?.plan.title ?? "Aula"} — Quadro Inteligente`;
    const t = setTimeout(() => document.fonts.ready.then(() => window.print()), 900);
    return () => clearTimeout(t);
  }, [lesson]);
  if (!lesson?.content) return <div className="flex justify-center p-16 text-slate-400"><Spinner /></div>;
  const { plan, steps } = lesson.content;
  return (
    <div className="mx-auto max-w-[190mm] bg-white px-2 py-6 text-slate-900">
      <div className="no-print mb-6 flex justify-end">
        <Button variant="primary" icon={<Printer className="size-4" />} onClick={() => window.print()}>Imprimir / salvar PDF</Button>
      </div>
      <header className="mb-6 border-b border-slate-200 pb-4">
        <p className="text-xs uppercase tracking-wider text-slate-500">{plan.subject} · {plan.level}</p>
        <h1 className="mt-1 text-2xl font-semibold">{plan.title}</h1>
        <p className="mt-2 text-sm text-slate-600"><b>Objetivo:</b> {plan.learningObjective}</p>
        {plan.prerequisites.length > 0 && <p className="mt-1 text-sm text-slate-600"><b>Pré-requisitos:</b> {plan.prerequisites.join(", ")}</p>}
        <p className="mt-1 text-sm text-slate-600"><b>Resposta:</b> <ScriptText text={plan.finalAnswer} /></p>
      </header>
      {steps.map((s, i) => <PrintStep key={s.id} step={s} index={i} imageUrl={lesson.hasImage ? api.imageUrl(lesson.id) : null} />)}
    </div>
  );
}

function PrintStep({ step, index, imageUrl }: { step: Step; index: number; imageUrl: string | null }) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [overlay, setOverlay] = useState<HTMLDivElement | null>(null);
  return (
    <section className="print-step mb-8">
      <h2 className="mb-2 text-base font-semibold">{index + 1}. {step.title}</h2>
      <BoardContext.Provider value={{ format: "wide", imageUrl, contentRef, overlay }}>
        <div className="qi-board rounded-lg ring-1 ring-slate-300" data-theme="paper" data-math="hand" style={{ fontSize: 15 }}>
          <div ref={contentRef} className="relative px-6 py-4">
            {step.board.map((el) => <BoardElement key={el.id} el={el} />)}
            <div ref={setOverlay} className="pointer-events-none absolute inset-0" />
          </div>
        </div>
      </BoardContext.Provider>
      <div className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-slate-700">
        {step.script.map((seg, k) => <p key={k}><ScriptText text={seg.text} /></p>)}
      </div>
    </section>
  );
}
