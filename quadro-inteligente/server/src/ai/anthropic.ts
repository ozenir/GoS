/**
 * Implementação do provedor de IA com Claude (Anthropic).
 *
 * - Streaming (respostas longas sem estourar timeouts HTTP).
 * - Raciocínio adaptativo com resumo do pensamento (exibido ao professor
 *   como "a IA está pensando...").
 * - Saída estruturada por JSON Schema; se o esquema for recusado pela API,
 *   cai para JSON livre com o esquema descrito no prompt.
 * - Validação com Zod e uma rodada de correção automática.
 * - Fallback de recusa no servidor (fallbacks: "default").
 */
import Anthropic from "@anthropic-ai/sdk";
import type { z } from "zod";
import { toProviderJsonSchema } from "@qi/shared";
import { config } from "../config.ts";
import { AIError, type AIProvider, type ContentPart, type StructuredRequest, type StructuredResult } from "./provider.ts";
import { extractJson, formatZodIssues } from "./json.ts";

type Params = Anthropic.Beta.Messages.MessageCreateParamsStreaming;
type Block = Anthropic.Beta.Messages.BetaContentBlockParam;

const schemaCache = new Map<string, Record<string, unknown>>();
let structuredSupported = config.ai.structuredOutputs !== "off";

function toBlocks(parts: ContentPart[]): Block[] {
  return parts.map((p) =>
    p.type === "text"
      ? { type: "text", text: p.text }
      : { type: "image", source: { type: "base64", media_type: p.mediaType, data: p.base64 } },
  );
}

function mapError(err: unknown): AIError {
  if (err instanceof AIError) return err;
  if (err instanceof Anthropic.APIUserAbortError) return new AIError("Operação cancelada.", "aborted", false);
  if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError)
    return new AIError("A chave da API de IA é inválida ou não tem permissão. Verifique ANTHROPIC_API_KEY no servidor.", "auth", false);
  if (err instanceof Anthropic.RateLimitError)
    return new AIError("Limite de uso da IA atingido. Aguarde alguns instantes e tente novamente.", "rate_limit", true);
  if (err instanceof Anthropic.BadRequestError)
    return new AIError("A solicitação foi recusada pela API de IA.", "bad_request", false, err.message);
  if (err instanceof Anthropic.APIConnectionError)
    return new AIError("Falha de conexão com o serviço de IA. Verifique a internet do servidor e tente novamente.", "network", true);
  if (err instanceof Anthropic.InternalServerError || (err instanceof Anthropic.APIError && (err.status ?? 0) >= 500))
    return new AIError("O serviço de IA está temporariamente sobrecarregado. Tente novamente em instantes.", "overloaded", true);
  if (err instanceof Anthropic.APIError)
    return new AIError(`Erro da API de IA (${err.status}).`, "unknown", true, err.message);
  return new AIError("Erro inesperado ao consultar a IA.", "unknown", true, (err as Error)?.message);
}

function looksLikeSchemaRejection(err: unknown): boolean {
  return err instanceof Anthropic.BadRequestError && /schema|output_config|format|grammar|too complex/i.test(err.message);
}

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";
  readonly model = config.ai.model;
  private client: Anthropic | null = null;

  isConfigured() {
    return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
  }

  private getClient() {
    if (!this.isConfigured())
      throw new AIError(
        "A IA não está configurada. Defina ANTHROPIC_API_KEY no arquivo server/.env e reinicie o servidor.",
        "not_configured",
        false,
      );
    this.client ??= new Anthropic({ maxRetries: 3, timeout: 15 * 60 * 1000 });
    return this.client;
  }

  private jsonSchema(name: string, schema: z.ZodType) {
    let s = schemaCache.get(name);
    if (!s) {
      s = toProviderJsonSchema(schema);
      schemaCache.set(name, s);
    }
    return s;
  }

  private async run<T>(req: StructuredRequest<T>, messages: Anthropic.Beta.Messages.BetaMessageParam[], useSchema: boolean) {
    const client = this.getClient();
    const system = useSchema
      ? req.system
      : `${req.system}\n\n# Formato de saída\nResponda APENAS com um objeto JSON válido (sem texto antes ou depois, sem cercas de código) que siga exatamente este JSON Schema:\n${JSON.stringify(this.jsonSchema(req.schemaName, req.schema))}`;
    const params: Params = {
      model: this.model,
      max_tokens: req.maxTokens,
      stream: true,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
      thinking: { type: "adaptive", display: "summarized" },
      output_config: {
        effort: req.effort,
        ...(useSchema ? { format: { type: "json_schema", schema: this.jsonSchema(req.schemaName, req.schema) } } : {}),
      },
      messages,
      ...(config.ai.serverFallback ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    };
    const stream = client.beta.messages.stream(params, { signal: req.signal });
    if (req.onThinking) stream.on("thinking", (d) => req.onThinking!(d));
    if (req.onText) stream.on("text", (d, snap) => req.onText!(d, snap));
    const msg = await stream.finalMessage();
    if (msg.stop_reason === "refusal") {
      throw new AIError("A IA se recusou a processar esta questão. Revise o conteúdo da imagem e tente novamente.", "refusal", false);
    }
    if (msg.stop_reason === "max_tokens") {
      throw new AIError("A resposta da IA ficou longa demais e foi interrompida.", "truncated", true);
    }
    const text = msg.content
      .filter((b): b is Anthropic.Beta.Messages.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    return { text, msg };
  }

  async generateStructured<T>(req: StructuredRequest<T>): Promise<StructuredResult<T>> {
    const userTurn: Anthropic.Beta.Messages.BetaMessageParam = { role: "user", content: toBlocks(req.content) };
    let messages: Anthropic.Beta.Messages.BetaMessageParam[] = [userTurn];
    let maxTokens = req.maxTokens;
    const usage = { inputTokens: 0, outputTokens: 0 };

    for (let attempt = 0; attempt < 3; attempt++) {
      let result: { text: string; msg: Anthropic.Beta.Messages.BetaMessage };
      try {
        result = await this.run({ ...req, maxTokens }, messages, structuredSupported);
      } catch (err) {
        if (structuredSupported && config.ai.structuredOutputs === "auto" && looksLikeSchemaRejection(err)) {
          console.warn("[ai] Esquema recusado para saída estruturada; usando JSON livre + validação.", (err as Error).message);
          structuredSupported = false;
          attempt--;
          continue;
        }
        const mapped = mapError(err);
        if (mapped.code === "truncated" && attempt < 2) {
          maxTokens = Math.min(Math.round(maxTokens * 1.6), 128000);
          continue;
        }
        throw mapped;
      }
      usage.inputTokens += result.msg.usage.input_tokens;
      usage.outputTokens += result.msg.usage.output_tokens;

      let parsed: unknown;
      try {
        parsed = extractJson(result.text);
      } catch {
        messages = [
          userTurn,
          { role: "assistant", content: result.text || "(vazio)" },
          { role: "user", content: "Sua resposta não era um JSON válido. Envie novamente o objeto JSON completo, sem nenhum texto adicional." },
        ];
        continue;
      }
      const check = req.schema.safeParse(parsed);
      if (check.success) return { data: check.data, usage, model: result.msg.model };
      messages = [
        userTurn,
        { role: "assistant", content: result.text },
        {
          role: "user",
          content: `O JSON não segue o esquema exigido. Corrija os problemas abaixo e envie o objeto JSON completo novamente:\n${formatZodIssues(check.error.issues)}`,
        },
      ];
    }
    throw new AIError("A IA retornou dados em formato inválido após várias tentativas. Tente novamente.", "invalid_output", true);
  }
}
