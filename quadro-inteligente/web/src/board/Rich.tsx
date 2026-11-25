import { Fragment, memo } from "react";
import { MathView } from "./Math";

/** Separa texto com LaTeX inline ($...$) em partes. */
export function splitInline(text: string): { math: boolean; value: string }[] {
  const out: { math: boolean; value: string }[] = [];
  const re = /\$([^$]+)\$/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ math: false, value: text.slice(last, m.index) });
    out.push({ math: true, value: m[1] });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ math: false, value: text.slice(last) });
  return out;
}

/** Texto manuscrito: cada caractere é uma unidade de animação ("glifo"). */
export function HandText({ text }: { text: string }) {
  const words = text.split(/(\s+)/);
  return (
    <>
      {words.map((w, i) =>
        /^\s+$/.test(w) ? (
          <Fragment key={i}>{" "}</Fragment>
        ) : w ? (
          <span key={i} className="qi-word">
            {Array.from(w).map((c, j) => (
              <span key={j} className="qi-g" data-u="g">
                {c}
              </span>
            ))}
          </span>
        ) : null,
      )}
    </>
  );
}

/** Texto com fórmulas inline. */
export const Rich = memo(function Rich({ text }: { text: string }) {
  if (!text) return null;
  return (
    <>
      {splitInline(text).map((p, i) => (p.math ? <MathView key={i} latex={p.value} /> : <HandText key={i} text={p.value} />))}
    </>
  );
});
