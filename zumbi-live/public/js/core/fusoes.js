// ============================================================================
//  TABELA DE SUPREMAS — quando alguém comenta "T" (ou "tabela", "fusões", "combos", "receitas"), abre um painel
//  do lado, no mesmo estilo do gráfico do G, com as receitas: HABILIDADE (nível 5) + PASSIVA (nível 3) = SUPREMA.
//  Mostra as 14 receitas do herói em jogo: as 12 gerais e as 2 únicas do personagem dele.
//  As receitas aparecem sempre; o resultado (a suprema e o PODER dela) só aparece se ela já foi feita NESTA LIVE
//  (por qualquer herói). Senão fica "?": a live tem que descobrir.
// ============================================================================
import { SUPREMAS, ATIVAS, PASSIVAS, receitas } from './habilidades.js';

export const TABELA_SEGUNDOS = 15;   // quanto tempo o painel fica aberto depois de um "T"

// O comentário pede a tabela? ("t", "T", "tabela", "fusão", "fusões", "combo", "combos", "receitas", "🧬")
export const pedeTabela = texto => /^\s*(t+|tabela|fus[aã]o|fus[oõ]es|combos?|receitas?|supremas?|🧬)\s*[!?.]*\s*$/i.test(String(texto || ''));

export const poderFusao = id => Math.round(SUPREMAS[id].poder);

// As linhas do painel: { id, ativa, passiva, unica, feita, fusao: { emoji, nome, poder } | null (ainda não descoberta) }
// classe = personagem do herói em jogo; feitas = supremas que ele já tem (destacadas)
export function tabelaFusoes(vistas = new Set(), classe = null, feitas = []) {
  return receitas(classe).map(({ id, S }) => ({
    id, unica: !!S.classe, feita: feitas.includes(id),
    ativa: { emoji: ATIVAS[S.ativa].emoji, nome: ATIVAS[S.ativa].nome },
    passiva: { emoji: PASSIVAS[S.passiva].emoji, nome: PASSIVAS[S.passiva].nome },
    fusao: vistas.has(id) ? { emoji: S.emoji, nome: S.nome, poder: poderFusao(id) } : null
  }));
}
