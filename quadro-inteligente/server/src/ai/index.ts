import { config } from "../config.ts";
import { AnthropicProvider } from "./anthropic.ts";
import type { AIProvider } from "./provider.ts";

/**
 * Fábrica do provedor de IA. Para adicionar outro fornecedor, implemente a
 * interface AIProvider (ver provider.ts) e registre-o aqui.
 */
function createProvider(): AIProvider {
  switch (config.ai.provider) {
    case "anthropic":
      return new AnthropicProvider();
    default:
      throw new Error(`Provedor de IA desconhecido: ${config.ai.provider}`);
  }
}

let current: AIProvider = createProvider();

export function getAI(): AIProvider {
  return current;
}

/** Substitui o provedor (usado em testes e para integrações futuras). */
export function setAIProvider(provider: AIProvider) {
  current = provider;
}

export * from "./provider.ts";
