import { ChevronLeft, ChevronRight, Eye, Maximize, Minimize, Pause, Play, RotateCcw } from "lucide-react";
import { IconButton, Segmented } from "../components/ui";

export type AdvanceMode = "step" | "segment";

interface Props {
  index: number;
  total: number;
  progress: number;
  playing: boolean;
  ended: boolean;
  advance: AdvanceMode;
  rate: number;
  fullscreen: boolean;
  onPrev: () => void;
  onNext: () => void;
  onReplay: () => void;
  onToggle: () => void;
  onReveal: () => void;
  onJump: (i: number) => void;
  onAdvance: (m: AdvanceMode) => void;
  onRate: (r: number) => void;
  onFullscreen: () => void;
}

const RATES = [0.5, 0.75, 1, 1.5, 2, 3];

export function ControlBar(p: Props) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 bg-slate-900 px-4 py-2.5 text-slate-200">
      <div className="flex min-w-48 flex-1 flex-col gap-1.5">
        <div className="flex items-baseline gap-2 text-xs">
          <span className="font-semibold uppercase tracking-[0.14em] text-white tabular-nums">
            Etapa {pad(p.index + 1)} de {pad(p.total)}
          </span>
          <span className="text-slate-400">{Math.round(((p.index + (p.ended ? 1 : p.progress)) / p.total) * 100)}% da aula</span>
        </div>
        <div className="flex h-2 gap-1" role="group" aria-label="Progresso da aula">
          {Array.from({ length: p.total }, (_, i) => (
            <button
              key={i}
              onClick={() => p.onJump(i)}
              title={`Ir para a etapa ${i + 1}`}
              className="relative h-full flex-1 overflow-hidden rounded-full bg-white/15 hover:bg-white/25"
            >
              <span
                className="absolute inset-y-0 left-0 rounded-full bg-amber-400"
                style={{ width: i < p.index ? "100%" : i === p.index ? `${(p.ended ? 1 : p.progress) * 100}%` : "0%" }}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <IconButton dark label="Etapa anterior (←)" onClick={p.onPrev} disabled={p.index === 0}>
          <ChevronLeft className="size-5" />
        </IconButton>
        <IconButton dark label="Repetir animação da etapa (R)" onClick={p.onReplay}>
          <RotateCcw className="size-[18px]" />
        </IconButton>
        <IconButton dark label={p.playing ? "Pausar (espaço)" : "Continuar (espaço)"} onClick={p.onToggle}>
          {p.playing ? <Pause className="size-5" /> : <Play className="size-5" />}
        </IconButton>
        <IconButton dark label="Revelar tudo da etapa (A)" onClick={p.onReveal} disabled={p.ended}>
          <Eye className="size-5" />
        </IconButton>
        <button
          onClick={p.onNext}
          className="ml-1 inline-flex h-10 items-center gap-1.5 rounded-lg bg-amber-400 pl-4 pr-3 text-sm font-semibold text-slate-900 shadow-sm transition-colors hover:bg-amber-300 disabled:opacity-40"
          disabled={p.index >= p.total - 1 && p.ended}
          title="Avançar (→)"
        >
          {p.advance === "segment" && !p.ended ? "Próxima fala" : "Próxima"}
          <ChevronRight className="size-5" />
        </button>
      </div>

      <div className="flex flex-1 items-center justify-end gap-2">
        <Segmented
          dark
          value={p.advance}
          onChange={p.onAdvance}
          options={[
            { value: "step", label: "Por etapa", title: "Cada clique avança uma etapa inteira" },
            { value: "segment", label: "Por fala", title: "Cada clique revela o trecho correspondente à próxima fala" },
          ]}
        />
        <select
          aria-label="Velocidade da escrita"
          title="Velocidade da escrita"
          value={p.rate}
          onChange={(e) => p.onRate(Number(e.target.value))}
          className="h-8 rounded-md border-0 bg-white/10 px-2 text-[13px] text-slate-100 focus:ring-2 focus:ring-amber-400"
        >
          {RATES.map((r) => (
            <option key={r} value={r} className="text-slate-900">
              {String(r).replace(".", ",")}×
            </option>
          ))}
        </select>
        <IconButton dark label={p.fullscreen ? "Sair da tela cheia (F)" : "Tela cheia (F)"} onClick={p.onFullscreen}>
          {p.fullscreen ? <Minimize className="size-5" /> : <Maximize className="size-5" />}
        </IconButton>
      </div>
    </div>
  );
}
