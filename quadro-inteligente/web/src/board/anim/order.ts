import type { Step } from "@qi/shared";

/** Lista os ids dos elementos do quadro de uma etapa (linhas são expandidas). */
export function boardIds(step: Step): string[] {
  const ids: string[] = [];
  for (const el of step.board) {
    if (el.type === "row") el.columns.forEach((c) => c.elements.forEach((l) => ids.push(l.id)));
    else ids.push(el.id);
  }
  return ids;
}

/**
 * Agrupa os elementos pela fala do professor: o grupo i contém os ids
 * escritos durante o segmento i do roteiro, na ordem em que aparecem no
 * quadro. Um elemento que nenhum segmento cita entra no grupo do elemento
 * que o antecede no quadro. Sem roteiro, há um único grupo.
 */
export function writingOrder(step: Step): string[][] {
  const board = boardIds(step);
  if (step.script.length === 0) return [board];
  const seen = new Set<string>();
  const groups = step.script.map((s) =>
    board.filter((id) => {
      if (!s.elements.includes(id) || seen.has(id)) return false;
      seen.add(id);
      return true;
    }),
  );
  board.forEach((id, i) => {
    if (seen.has(id)) return;
    const prev = board.slice(0, i).reverse().find((p) => seen.has(p));
    seen.add(id);
    if (!prev) {
      groups[0].unshift(id);
      return;
    }
    const g = groups.find((gr) => gr.includes(prev))!;
    g.splice(g.indexOf(prev) + 1, 0, id);
  });
  return groups;
}
