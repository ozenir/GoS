import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import type { BoardFormat } from "./context";

/** Proporções e zonas seguras do Reels (referência 1080×1920). */
export const REELS = {
  w: 1080,
  h: 1920,
  safeTop: 220 / 1920,
  safeBottom: 380 / 1920,
  safeSide: 64 / 1080,
  safeRight: 150 / 1080,
};

interface StageProps {
  format: BoardFormat;
  children: (size: { width: number; height: number; fontSize: number }) => ReactNode;
  guides?: boolean;
  className?: string;
}

/**
 * Palco da apresentação. Em "wide" o quadro ocupa toda a área disponível;
 * em "reels" é um quadro 9:16 centralizado, com tamanho de fonte
 * proporcional para que a gravação de tela fique idêntica em qualquer monitor.
 */
export function Stage({ format, children, guides, className = "" }: StageProps) {
  const outer = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  useLayoutEffect(() => {
    const el = outer.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    ro.observe(el);
    setBox({ w: el.clientWidth, h: el.clientHeight });
    return () => ro.disconnect();
  }, []);

  let width = box.w;
  let height = box.h;
  let fontSize = Math.max(13, Math.min(34, width / 50));
  if (format === "reels") {
    height = box.h;
    width = (height * 9) / 16;
    if (width > box.w) {
      width = box.w;
      height = (width * 16) / 9;
    }
    fontSize = width / 23;
  }
  width = Math.floor(width);
  height = Math.floor(height);

  return (
    <div ref={outer} className={`relative flex h-full w-full items-center justify-center ${className}`}>
      {box.w > 0 && (
        <div
          className={`relative overflow-hidden ${format === "reels" ? "rounded-[1.2%] shadow-2xl ring-1 ring-black/20" : "rounded-xl shadow-xl ring-1 ring-black/10"}`}
          style={{ width, height }}
          data-stage={format}
        >
          {children({ width, height, fontSize })}
          {format === "reels" && guides && <SafeAreaGuides />}
        </div>
      )}
    </div>
  );
}

function SafeAreaGuides() {
  const zone = "absolute bg-rose-500/15 border-rose-500/50 pointer-events-none";
  return (
    <div className="pointer-events-none absolute inset-0 z-20 font-sans text-[10px] font-medium text-rose-700">
      <div className={`${zone} inset-x-0 top-0 border-b border-dashed`} style={{ height: `${REELS.safeTop * 100}%` }}>
        <span className="absolute bottom-1 left-2">Área do cabeçalho do Instagram</span>
      </div>
      <div className={`${zone} inset-x-0 bottom-0 border-t border-dashed`} style={{ height: `${REELS.safeBottom * 100}%` }}>
        <span className="absolute left-2 top-1">Legenda, áudio e perfil</span>
      </div>
      <div className={`${zone} right-0 border-l border-dashed`} style={{ top: "45%", bottom: `${REELS.safeBottom * 100}%`, width: `${REELS.safeRight * 100}%` }} />
    </div>
  );
}
