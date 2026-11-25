/**
 * Coleta das "unidades de animação" de um elemento do quadro, na ordem em
 * que um professor as escreveria:
 *  - g:      caractere de texto manuscrito
 *  - kg:     glifo de fórmula (KaTeX), em ordem visual (numerador antes do denominador)
 *  - stroke: traço SVG desenhado progressivamente
 *  - fill:   preenchimento (aparece após o contorno)
 *  - wipe:   revelação da esquerda para a direita (traços de fração, radicais, curvas tracejadas)
 *  - fade:   surgimento suave (imagens, fundos)
 *  - marker: marca-texto passando por trás de um resultado
 */
export type UnitKind = "g" | "kg" | "stroke" | "fill" | "wipe" | "fade" | "marker";

export interface Unit {
  el: Element;
  kind: UnitKind;
  /** Tamanho em px (comprimento do traço ou largura), usado para o tempo. */
  size: number;
}

const ZW = /[​\s]/;

/** Envolve cada caractere do HTML do KaTeX em <span class="qi-g">. Idempotente. */
function splitKatexGlyphs(container: Element) {
  if ((container as HTMLElement).dataset.split) return;
  (container as HTMLElement).dataset.split = "1";
  const html = container.querySelector(".katex-html") ?? container;
  const walker = document.createTreeWalker(html, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  for (let n = walker.nextNode(); n; n = walker.nextNode()) nodes.push(n as Text);
  for (const t of nodes) {
    const value = t.nodeValue ?? "";
    if (!value || [...value].every((c) => ZW.test(c))) continue;
    const frag = document.createDocumentFragment();
    for (const c of Array.from(value)) {
      if (ZW.test(c)) {
        frag.appendChild(document.createTextNode(c));
      } else {
        const s = document.createElement("span");
        s.className = "qi-g";
        s.textContent = c;
        frag.appendChild(s);
      }
    }
    t.parentNode?.replaceChild(frag, t);
  }
}

const LINE_SEL = ".frac-line, .rule, .overline-line, .underline-line, .hline, .hdashline";

function katexUnits(container: Element, out: Unit[]) {
  splitKatexGlyphs(container);
  const root = container.querySelector(".katex-html") ?? container;
  const walk = (node: Element) => {
    if (node.classList.contains("qi-g")) {
      out.push({ el: node, kind: "kg", size: 0 });
      return;
    }
    if (node.tagName.toLowerCase() === "svg") {
      out.push({ el: node, kind: "wipe", size: node.getBoundingClientRect().width });
      return;
    }
    if (node.matches(LINE_SEL)) {
      out.push({ el: node, kind: "wipe", size: node.getBoundingClientRect().width });
      return;
    }
    let children = Array.from(node.children);
    if (node.classList.contains("vlist")) {
      const tops = new Map(children.map((c) => [c, c.getBoundingClientRect().top]));
      children = children.sort((a, b) => tops.get(a)! - tops.get(b)!);
    }
    children.forEach(walk);
  };
  walk(root);
}

function pxLength(el: Element): number {
  if (el instanceof SVGGeometryElement) {
    try {
      const ctm = el.getScreenCTM();
      const scale = ctm ? Math.hypot(ctm.a, ctm.b) : 1;
      return el.getTotalLength() * scale;
    } catch {
      return 100;
    }
  }
  return el.getBoundingClientRect().width;
}

export function collectUnits(root: Element, out: Unit[] = []): Unit[] {
  const visit = (node: Element) => {
    const kind = (node as HTMLElement).dataset?.u as UnitKind | undefined;
    if (kind) {
      out.push({ el: node, kind, size: kind === "stroke" || kind === "wipe" ? pxLength(node) : 0 });
      return;
    }
    if (node.hasAttribute("data-katex")) {
      katexUnits(node, out);
      return;
    }
    Array.from(node.children).forEach(visit);
  };
  visit(root);
  return out;
}

/** Tempos (ms, velocidade 1x): duração da animação e intervalo até a próxima unidade. */
export function unitTiming(u: Unit): { duration: number; advance: number } {
  switch (u.kind) {
    case "g": return { duration: 120, advance: 40 };
    case "kg": return { duration: 150, advance: 72 };
    case "stroke": {
      const d = Math.min(1100, Math.max(130, u.size * 1.7));
      return { duration: d, advance: d * 0.9 };
    }
    case "wipe": {
      const d = Math.min(800, Math.max(110, u.size * 2.2));
      return { duration: d, advance: d * 0.9 };
    }
    case "fill": return { duration: 280, advance: 130 };
    case "fade": return { duration: 420, advance: 260 };
    case "marker": return { duration: 520, advance: 380 };
  }
}

export function unitKeyframes(u: Unit): Keyframe[] {
  switch (u.kind) {
    case "g":
    case "kg":
      return [
        { opacity: 0, clipPath: "inset(-30% 100% -30% -10%)", offset: 0 },
        { opacity: 1, offset: 0.12 },
        { opacity: 1, clipPath: "inset(-30% -10% -30% -10%)", offset: 1 },
      ];
    case "stroke":
      return [
        { strokeDasharray: "1 2", strokeDashoffset: 1, opacity: 0, offset: 0 },
        { opacity: 1, offset: 0.04 },
        { strokeDasharray: "1 2", strokeDashoffset: 0, opacity: 1, offset: 1 },
      ];
    case "wipe":
      return [
        { opacity: 0, clipPath: "inset(-20% 100% -20% -2%)", offset: 0 },
        { opacity: 1, offset: 0.08 },
        { opacity: 1, clipPath: "inset(-20% -2% -20% -2%)", offset: 1 },
      ];
    case "fill":
      return [{ opacity: 0 }, { opacity: 1 }];
    case "fade":
      return [
        { opacity: 0, transform: "translateY(0.2em)" },
        { opacity: 1, transform: "translateY(0)" },
      ];
    case "marker":
      return [
        { transform: "scaleX(0)", transformOrigin: "left center", opacity: 0.6 },
        { transform: "scaleX(1)", transformOrigin: "left center", opacity: 1 },
      ];
  }
}
