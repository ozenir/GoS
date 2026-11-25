import type { ProgressEvent } from "@qi/shared";
import { AlertTriangle, Brain, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";

export interface JobState {
  phase: string;
  message: string;
  thinking: string;
  steps: number;
  chars: number;
  warnings: string[];
  error: string | null;
  retryable: boolean;
  running: boolean;
}

export const initialJob: JobState = { phase: "", message: "", thinking: "", steps: 0, chars: 0, warnings: [], error: null, retryable: false, running: false };

export type JobAction = ProgressEvent | { type: "reset" };

export function reduceJob(s: JobState, e: JobAction): JobState {
  switch (e.type) {
    case "reset": return { ...initialJob, running: true };
    case "status": return { ...s, phase: e.phase, message: e.message };
    case "thinking": return { ...s, thinking: (s.thinking + e.text).slice(-6000) };
    case "progress": return { ...s, steps: e.steps, chars: e.chars };
    case "warning": return { ...s, warnings: [...s.warnings, e.message] };
    case "error": return { ...s, error: e.message, retryable: e.retryable, running: false };
    case "done": return { ...s, running: false };
  }
}

export function PhaseList({ phases, current, done }: { phases: { id: string; label: string }[]; current: string; done?: boolean }) {
  const idx = phases.findIndex((p) => p.id === current);
  return (
    <ol className="space-y-2.5">
      {phases.map((p, i) => {
        const state = done || i < idx ? "done" : i === idx ? "active" : "todo";
        return (
          <li key={p.id} className="flex items-center gap-3 text-sm">
            {state === "done" ? (
              <CheckCircle2 className="size-5 text-emerald-500" />
            ) : state === "active" ? (
              <Loader2 className="size-5 animate-spin text-indigo-600" />
            ) : (
              <Circle className="size-5 text-slate-300" />
            )}
            <span className={state === "todo" ? "text-slate-400" : state === "active" ? "font-medium text-slate-900" : "text-slate-600"}>{p.label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Painel com o resumo do raciocínio da IA, transmitido em tempo real. */
export function ThinkingFeed({ text, className = "" }: { text: string; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.scrollTop = ref.current.scrollHeight;
  }, [text]);
  return (
    <div className={`rounded-xl bg-slate-900 text-slate-300 ${className}`}>
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5 text-xs font-medium text-slate-400">
        <Brain className="size-4 text-indigo-300" />
        Raciocínio da IA (resumo em tempo real)
      </div>
      <div ref={ref} className="h-56 overflow-y-auto whitespace-pre-wrap px-4 py-3 text-[13px] leading-relaxed">
        {text || <span className="text-slate-500">Aguardando o início do raciocínio…</span>}
      </div>
    </div>
  );
}

export function ErrorBox({ message, children }: { message: string; children?: React.ReactNode }) {
  return (
    <div className="flex gap-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-rose-200">
      <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rose-500" />
      <div className="flex-1">
        <p>{message}</p>
        {children && <div className="mt-3 flex flex-wrap gap-2">{children}</div>}
      </div>
    </div>
  );
}
