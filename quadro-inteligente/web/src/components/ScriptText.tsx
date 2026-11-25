import { Fragment, memo } from "react";
import { renderLatex } from "../board/Math";
import { splitInline } from "../board/Rich";

/** Texto do roteiro com fórmulas inline (tipografia normal, não manuscrita). */
export const ScriptText = memo(function ScriptText({ text }: { text: string }) {
  return (
    <>
      {splitInline(text).map((p, i) => {
        if (!p.math) return <Fragment key={i}>{p.value}</Fragment>;
        const r = renderLatex(p.value, false);
        return r.error ? <code key={i}>{p.value}</code> : <span key={i} dangerouslySetInnerHTML={{ __html: r.html }} />;
      })}
    </>
  );
});
