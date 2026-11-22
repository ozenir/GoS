// ============================================================================
//  TABELA DE FUSÕES — quando alguém comenta "T" (ou "tabela", "fusões", "combos"), abre um painel do lado,
//  no mesmo estilo do gráfico do G, com as receitas: HABILIDADE + PASSIVA = FUSÃO.
//  As receitas aparecem sempre; o resultado (a fusão e o PODER dela) só aparece se alguma fusão dessas já foi
//  feita NESTA LIVE (por qualquer herói). Senão fica "?": a live tem que descobrir.
//  Poder = dano da fusão com a passiva no nível 1 (habilidades.js → COMBOS[...].dano(1)).
// ============================================================================
import { COMBOS, ATIVAS, PASSIVAS } from './habilidades.js';

export const TABELA_SEGUNDOS = 15;   // quanto tempo o painel fica aberto depois de um "T"

// O comentário pede a tabela? ("t", "T", "tabela", "fusão", "fusões", "combo", "combos", "receitas", "🧬")
export const pedeTabela = texto => /^\s*(t+|tabela|fus[aã]o|fus[oõ]es|combos?|receitas?|🧬)\s*[!?.]*\s*$/i.test(String(texto || ''));

export const poderFusao = id => Math.round(COMBOS[id].dano(1));

// As linhas do painel: { ativa, passiva, fusao: { emoji, nome, poder } | null (ainda não descoberta) }
export function tabelaFusoes(vistas = new Set()) {
  return Object.entries(COMBOS).map(([id, C]) => ({
    id,
    ativa: { emoji: ATIVAS[C.ativa].emoji, nome: ATIVAS[C.ativa].nome },
    passiva: { emoji: PASSIVAS[C.passiva].emoji, nome: PASSIVAS[C.passiva].nome },
    fusao: vistas.has(id) ? { emoji: C.emoji, nome: C.nome, poder: poderFusao(id) } : null
  }));
}
