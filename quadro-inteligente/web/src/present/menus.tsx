import { ASSIST_ACTIONS, ASSIST_LABELS, type AssistAction } from "@qi/shared";
import { BookOpenCheck, GitCompareArrows, Lightbulb, ListChecks, RefreshCw, Settings2, Sigma, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import type { BoardSettings } from "../board/Board";
import { IconButton, Popover, Segmented } from "../components/ui";

export interface PresentPrefs extends BoardSettings {
  showScript: boolean;
  guides: boolean;
  signature: string;
  reelsHeader: boolean;
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3 py-2">
      <span className="text-[13px] text-slate-600">{label}</span>
      {children}
    </div>
  );
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      aria-label={label}
      onClick={() => onChange(!value)}
      className={`relative h-5 w-9 rounded-full transition-colors ${value ? "bg-indigo-600" : "bg-slate-300"}`}
    >
      <span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform ${value ? "translate-x-4" : "translate-x-0.5"}`} />
    </button>
  );
}

export function SettingsMenu({ prefs, onChange, reels }: { prefs: PresentPrefs; onChange: (p: PresentPrefs) => void; reels: boolean }) {
  const set = <K extends keyof PresentPrefs>(k: K, v: PresentPrefs[K]) => onChange({ ...prefs, [k]: v });
  return (
    <Popover
      trigger={(open, toggle) => (
        <IconButton dark label="Aparência do quadro" active={open} onClick={toggle}>
          <Settings2 className="size-5" />
        </IconButton>
      )}
    >
      {() => (
        <div className="w-80 py-1">
          <p className="px-3 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Quadro</p>
          <Row label="Fundo">
            <Segmented
              value={prefs.theme}
              onChange={(v) => set("theme", v)}
              options={[
                { value: "paper", label: "Papel" },
                { value: "whiteboard", label: "Branco" },
                { value: "chalkboard", label: "Lousa" },
              ]}
            />
          </Row>
          <Row label="Fórmulas">
            <Segmented
              value={prefs.math}
              onChange={(v) => set("math", v)}
              options={[
                { value: "hand", label: "Manuscritas" },
                { value: "classic", label: "Tipográficas" },
              ]}
            />
          </Row>
          <Row label="Letra">
            <Segmented
              value={prefs.font}
              onChange={(v) => set("font", v)}
              options={[
                { value: "patrick", label: "Arredondada" },
                { value: "kalam", label: "Cursiva" },
              ]}
            />
          </Row>
          <Row label="Numerar etapas no quadro">
            <Toggle label="Numerar etapas" value={prefs.showStepNumbers} onChange={(v) => set("showStepNumbers", v)} />
          </Row>
          <Row label="Mostrar roteiro (S)">
            <Toggle label="Mostrar roteiro" value={prefs.showScript} onChange={(v) => set("showScript", v)} />
          </Row>
          <div className={reels ? "" : "pointer-events-none opacity-40"}>
            <p className="px-3 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Formato Reels</p>
            <Row label="Guias de área segura">
              <Toggle label="Guias de área segura" value={prefs.guides} onChange={(v) => set("guides", v)} />
            </Row>
            <Row label="Cabeçalho da etapa">
              <Toggle label="Cabeçalho da etapa" value={prefs.reelsHeader} onChange={(v) => set("reelsHeader", v)} />
            </Row>
            <div className="px-3 py-2">
              <input
                value={prefs.signature}
                maxLength={40}
                onChange={(e) => set("signature", e.target.value)}
                placeholder="Assinatura (ex.: @prof.ana)"
                className="h-9 w-full rounded-lg border-0 px-3 text-[13px] ring-1 ring-slate-300 focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>
      )}
    </Popover>
  );
}

const ASSIST_ICONS: Record<AssistAction, ReactNode> = {
  explain_differently: <RefreshCw className="size-4" />,
  formula_origin: <Sigma className="size-4" />,
  analogy: <Lightbulb className="size-4" />,
  alternative_solution: <GitCompareArrows className="size-4" />,
  extra_example: <BookOpenCheck className="size-4" />,
  similar_exercises: <ListChecks className="size-4" />,
};

const ASSIST_HINT: Record<AssistAction, string> = {
  explain_differently: "Nova abordagem para a etapa atual",
  formula_origin: "Dedução da fórmula usada nesta etapa",
  analogy: "Comparação com o cotidiano",
  alternative_solution: "Outro método e conferência do resultado",
  extra_example: "Um exemplo resolvido parecido",
  similar_exercises: "Três exercícios para praticar",
};

export function AssistMenu({ disabled, reason, onPick }: { disabled: boolean; reason?: string; onPick: (a: AssistAction) => void }) {
  return (
    <Popover
      trigger={(open, toggle) => (
        <button
          onClick={toggle}
          title={disabled ? reason : "Recursos pedagógicos da IA"}
          className={`inline-flex h-9 items-center gap-2 rounded-lg px-3 text-[13px] font-medium transition-colors ${open ? "bg-white text-slate-900" : "bg-white/10 text-white hover:bg-white/15"}`}
        >
          <Sparkles className="size-4 text-amber-300" />
          Recursos da IA
        </button>
      )}
    >
      {(close) => (
        <div className="w-80">
          <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Inserir após a etapa atual</p>
          {disabled && <p className="mx-3 my-1 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-800">{reason}</p>}
          {ASSIST_ACTIONS.map((a) => (
            <button
              key={a}
              disabled={disabled}
              onClick={() => {
                close();
                onPick(a);
              }}
              className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="mt-0.5 text-indigo-600">{ASSIST_ICONS[a]}</span>
              <span>
                <span className="block text-sm font-medium text-slate-800">{ASSIST_LABELS[a]}</span>
                <span className="block text-xs text-slate-500">{ASSIST_HINT[a]}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </Popover>
  );
}

