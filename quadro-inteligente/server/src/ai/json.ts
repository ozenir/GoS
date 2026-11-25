/** Extrai um objeto JSON de um texto (tolerante a cercas ```json e texto ao redor). */
export function extractJson(text: string): unknown {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* continua */
  }
  const fence = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  if (fence) {
    try {
      return JSON.parse(fence[1]);
    } catch {
      /* continua */
    }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return JSON.parse(trimmed.slice(start, end + 1));
  throw new SyntaxError("Nenhum JSON encontrado na resposta.");
}

/** Formata erros do Zod de forma compacta para pedir correção à IA. */
export function formatZodIssues(issues: { path: PropertyKey[]; message: string }[], max = 40): string {
  return issues
    .slice(0, max)
    .map((i) => `- ${i.path.map(String).join(".") || "(raiz)"}: ${i.message}`)
    .join("\n");
}
