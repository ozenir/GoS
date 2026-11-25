/**
 * Camada de abstração do provedor de IA. O motor pedagógico depende apenas
 * desta interface, de modo que é possível trocar o modelo/fornecedor sem
 * reescrever o restante da aplicação.
 */
import type { z } from "zod";

export type Effort = "low" | "medium" | "high" | "xhigh" | "max";

export type ContentPart =
  | { type: "text"; text: string }
  | { type: "image"; mediaType: "image/jpeg" | "image/png" | "image/webp"; base64: string };

export interface StructuredRequest<T> {
  /** Instruções estáveis (cacheáveis) do sistema. */
  system: string;
  /** Conteúdo da mensagem do usuário (texto e imagens). */
  content: ContentPart[];
  schema: z.ZodType<T>;
  schemaName: string;
  maxTokens: number;
  effort: Effort;
  signal?: AbortSignal;
  onThinking?: (delta: string) => void;
  onText?: (delta: string, snapshot: string) => void;
}

export interface StructuredResult<T> {
  data: T;
  usage: { inputTokens: number; outputTokens: number };
  model: string;
}

export interface AIProvider {
  readonly name: string;
  readonly model: string;
  isConfigured(): boolean;
  generateStructured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>>;
}

/** Erro normalizado do provedor, com mensagem em português para o professor. */
export class AIError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "not_configured"
      | "auth"
      | "rate_limit"
      | "overloaded"
      | "network"
      | "refusal"
      | "truncated"
      | "invalid_output"
      | "bad_request"
      | "aborted"
      | "unknown",
    public readonly retryable: boolean,
    public readonly details?: string,
  ) {
    super(message);
  }
}
