import path from "node:path";

type Effort = "low" | "medium" | "high" | "xhigh" | "max";
const effort = (v: string | undefined, d: Effort): Effort =>
  (["low", "medium", "high", "xhigh", "max"] as const).includes(v as Effort) ? (v as Effort) : d;

export const config = {
  port: Number(process.env.PORT ?? 8787),
  host: process.env.HOST ?? "127.0.0.1",
  dataDir: path.resolve(process.env.DATA_DIR ?? "data"),
  ai: {
    provider: process.env.AI_PROVIDER ?? "anthropic",
    model: process.env.AI_MODEL ?? "claude-opus-5-5",
    effortAnalysis: effort(process.env.AI_EFFORT_ANALYSIS, "high"),
    effortLesson: effort(process.env.AI_EFFORT_LESSON, "high"),
    effortAssist: effort(process.env.AI_EFFORT_ASSIST, "medium"),
    /** auto: tenta saída estruturada e cai para JSON livre + validação se o provedor recusar o esquema. */
    structuredOutputs: (process.env.AI_STRUCTURED_OUTPUTS ?? "auto") as "auto" | "on" | "off",
    /** Fallback de recusa no servidor (Claude). Desative com AI_SERVER_FALLBACK=off. */
    serverFallback: process.env.AI_SERVER_FALLBACK !== "off",
  },
  upload: {
    maxBytes: 15 * 1024 * 1024,
    maxEdge: 2000,
  },
  staticDir: process.env.STATIC_DIR ? path.resolve(process.env.STATIC_DIR) : path.resolve("../web/dist"),
};
