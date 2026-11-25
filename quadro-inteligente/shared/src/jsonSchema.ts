/**
 * Converte esquemas Zod em JSON Schema compatível com saídas estruturadas
 * (constrained decoding): todos os objetos com additionalProperties=false,
 * todas as propriedades obrigatórias e sem restrições numéricas/de tamanho
 * (essas continuam sendo validadas pelo Zod após a resposta).
 */
import { z } from "zod";

const UNSUPPORTED = new Set([
  "minLength", "maxLength", "minItems", "maxItems", "minimum", "maximum",
  "exclusiveMinimum", "exclusiveMaximum", "multipleOf", "pattern", "format", "$schema",
]);

function clean(node: unknown): unknown {
  if (Array.isArray(node)) return node.map(clean);
  if (!node || typeof node !== "object") return node;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(node as Record<string, unknown>)) {
    if (UNSUPPORTED.has(k)) continue;
    out[k] = clean(v);
  }
  // oneOf (gerado por discriminatedUnion) → anyOf, que é suportado.
  if (out.oneOf && !out.anyOf) { out.anyOf = out.oneOf; delete out.oneOf; }
  if (out.type === "object" && out.properties) {
    out.additionalProperties = false;
    out.required = Object.keys(out.properties as object);
  }
  return out;
}

export function toProviderJsonSchema(schema: z.ZodType): Record<string, unknown> {
  const raw = z.toJSONSchema(schema, { target: "draft-2020-12", reused: "ref", io: "output" });
  return clean(raw) as Record<string, unknown>;
}
