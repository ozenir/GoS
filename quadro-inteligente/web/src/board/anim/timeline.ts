/**
 * Linha do tempo de uma etapa: agenda as unidades de animação dos
 * elementos na ordem da fala do professor e controla tudo com um único
 * relógio (Web Animations API): tocar, pausar, avançar, voltar, revelar e
 * alterar a velocidade.
 */
import { collectUnits, unitKeyframes, unitTiming } from "./units";

export interface ElementSlot { id: string; start: number; end: number; el: Element }
export interface SegmentSlot { start: number; end: number }

const GAP = 280;
const EMPTY_SEGMENT = 1600;

interface Item { anim: Animation; end: number }

export class Timeline {
  readonly items: Item[] = [];
  readonly elements: ElementSlot[] = [];
  readonly segments: SegmentSlot[] = [];
  readonly total: number;
  private master: Animation;
  private clockEl: HTMLSpanElement;
  private playing = false;
  private raf = 0;
  private stopAt: number | null = null;
  private lastElement = "";
  onTick?: (t: number) => void;
  onElement?: (slot: ElementSlot) => void;
  onStateChange?: (playing: boolean, ended: boolean) => void;

  /**
   * @param root   contêiner da etapa
   * @param groups ids dos elementos escritos em cada segmento da fala, em ordem
   * @param lookup localiza os nós de um elemento (inclui camadas de sobreposição)
   */
  constructor(root: HTMLElement, groups: string[][], lookup: (id: string) => Element[], rate: number) {
    let cursor = 120;
    for (const ids of groups) {
      const segStart = cursor;
      let segEnd = cursor;
      for (const id of ids) {
        const nodes = lookup(id);
        if (!nodes.length) continue;
        const units = nodes.flatMap((n) => collectUnits(n));
        let t = cursor;
        let end = cursor;
        for (const u of units) {
          const { duration, advance } = unitTiming(u);
          const anim = u.el.animate(unitKeyframes(u), { duration, delay: t, fill: "both", easing: "ease-out" });
          anim.pause();
          anim.currentTime = 0;
          this.items.push({ anim, end: t + duration });
          end = Math.max(end, t + duration);
          t += advance;
        }
        this.elements.push({ id, start: cursor, end, el: nodes[0] });
        segEnd = end;
        cursor = end + GAP;
      }
      if (segEnd === segStart) {
        // fala sem escrita: uma pausa breve para a explicação oral
        segEnd = segStart + EMPTY_SEGMENT;
        cursor = segEnd + GAP;
      }
      this.segments.push({ start: segStart, end: segEnd });
    }
    this.total = Math.max(cursor - GAP, 400);
    this.clockEl = document.createElement("span");
    this.clockEl.style.display = "none";
    root.appendChild(this.clockEl);
    this.master = this.clockEl.animate([{ opacity: 0 }, { opacity: 0 }], { duration: this.total, fill: "forwards" });
    this.master.pause();
    this.master.currentTime = 0;
    this.setRate(rate);
  }

  get time(): number {
    return Number(this.master.currentTime ?? 0);
  }
  get isPlaying() {
    return this.playing;
  }
  get ended() {
    return this.time >= this.total - 1;
  }

  /** Índice do segmento ativo no tempo atual. */
  segmentAt(t = this.time): number {
    let idx = 0;
    this.segments.forEach((s, i) => {
      if (s.start <= t + 1) idx = i;
    });
    return idx;
  }

  play(stopAt: number | null = null) {
    if (this.ended) return;
    this.stopAt = stopAt;
    const t = this.time;
    for (const it of this.items) if (t < it.end) it.anim.play();
    this.master.play();
    this.playing = true;
    this.onStateChange?.(true, false);
    this.loop();
  }

  pause() {
    for (const it of this.items) it.anim.pause();
    this.master.pause();
    this.playing = false;
    cancelAnimationFrame(this.raf);
    this.onStateChange?.(false, this.ended);
  }

  seek(t: number) {
    const clamped = Math.max(0, Math.min(this.total, t));
    for (const it of this.items) {
      it.anim.currentTime = clamped;
      if (this.playing && clamped < it.end) it.anim.play();
    }
    this.master.currentTime = clamped;
    this.onTick?.(clamped);
    this.trackElement(clamped);
  }

  /** Revela tudo imediatamente. */
  finish() {
    this.pause();
    this.seek(this.total);
    this.onStateChange?.(false, true);
  }

  /** Reinicia a etapa do começo. */
  restart(stopAt: number | null = null) {
    this.pause();
    this.lastElement = "";
    this.seek(0);
    this.play(stopAt);
  }

  setRate(rate: number) {
    for (const it of this.items) it.anim.updatePlaybackRate(rate);
    this.master.updatePlaybackRate(rate);
  }

  destroy() {
    cancelAnimationFrame(this.raf);
    for (const it of this.items) it.anim.cancel();
    this.master.cancel();
    this.clockEl.remove();
  }

  private trackElement(t: number) {
    const cur = [...this.elements].reverse().find((e) => e.start <= t + 1);
    if (cur && cur.id !== this.lastElement) {
      this.lastElement = cur.id;
      this.onElement?.(cur);
    }
  }

  private loop = () => {
    const t = this.time;
    if (this.stopAt != null && t >= this.stopAt) {
      const at = this.stopAt;
      this.pause();
      this.seek(at);
      this.onStateChange?.(false, this.ended);
      return;
    }
    this.onTick?.(t);
    this.trackElement(t);
    if (t >= this.total) {
      this.playing = false;
      this.onStateChange?.(false, true);
      return;
    }
    this.raf = requestAnimationFrame(this.loop);
  };
}
