// ============================================================================
//  PRESENTES BARATOS — o jogo é feito pra presentes de 1 e 5 moedas (config.json → presentes.por_nome).
//
//  - Presente da tabela: faz o efeito dele (pelo nome, em inglês ou português, ou um dos "aliases").
//  - Presente de 1 a 5 moedas que NÃO está na tabela: faz um efeito SORTEADO entre os da tabela com o mesmo
//    preço (1 moeda → um dos de 1 moeda; 5 moedas → um dos de 5; de 2 a 4 conta como 1).
//  - Presente mais caro: vira PARCELAS de 5 moedas, uma a cada PARCELA.intervalo segundos (50 moedas = 10
//    parcelas, a cada 30 s). Cada parcela é um efeito sorteado de 5 moedas (ou o efeito do presente, se ele
//    estiver na tabela). O que sobra (menos de 5) vira uma parcela de 1 moeda no fim.
// ============================================================================
export const PARCELA = { moedas: 5, intervalo: 30, max: 120 };   // max: no máximo 120 parcelas (1 hora)

// nome sem acento, minúsculo e sem espaço sobrando (acha "Rosa branca", "rosa  BRANCA", "White Rose"...)
export const semAcento = t => String(t || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

// A regra do presente na tabela (pelo nome exato, pelo "nome" em português ou pelos "aliases"), ou null
export function acharRegra(porNome = {}, nome) {
  if (nome && porNome[nome]) return porNome[nome];
  const n = semAcento(nome);
  if (!n) return null;
  for (const [k, r] of Object.entries(porNome)) {
    if (semAcento(k) === n || semAcento(r.nome) === n || (r.aliases || []).some(a => semAcento(a) === n)) return r;
  }
  return null;
}

// Uma regra sorteada da tabela com esse preço (1 ou 5); se não tiver nenhuma, a mais barata
export function regraAleatoria(porNome = {}, moedas, rnd = Math.random) {
  const faixa = moedas >= PARCELA.moedas ? PARCELA.moedas : 1;
  let lista = Object.values(porNome).filter(r => Number(r.moedas) === faixa);
  if (!lista.length) lista = Object.values(porNome);
  return lista.length ? lista[Math.floor(rnd() * lista.length)] : null;
}

// O que fazer com um presente que chegou: lista de envios { regra, coins, count, atraso (s), parcela? }
export function planoDoPresente(porNome, nome, moedas, qtd = 1, rnd = Math.random) {
  const conhecida = acharRegra(porNome, nome);
  moedas = Math.max(0, Number(moedas) || 0); qtd = Math.max(1, Number(qtd) || 1);
  if (moedas <= PARCELA.moedas) {
    if (conhecida) return [{ regra: conhecida, coins: moedas, count: qtd, atraso: 0, sorteado: false }];
    // fora da tabela: cada unidade sorteia um efeito do mesmo preço (iguais são juntados)
    const porRegra = new Map();
    for (let i = 0; i < qtd; i++) { const r = regraAleatoria(porNome, moedas, rnd); if (r) porRegra.set(r, (porRegra.get(r) || 0) + 1); }
    return [...porRegra].map(([regra, count]) => ({ regra, coins: moedas, count, atraso: 0, sorteado: true }));
  }
  // caro: parcelas de 5 moedas, uma a cada PARCELA.intervalo segundos
  const total = moedas * qtd;
  let n = Math.floor(total / PARCELA.moedas), resto = total % PARCELA.moedas;
  if (n > PARCELA.max) { n = PARCELA.max; resto = 0; }
  const partes = n + (resto > 0 ? 1 : 0), lista = [];
  for (let k = 0; k < n; k++) {
    lista.push({ regra: conhecida || regraAleatoria(porNome, PARCELA.moedas, rnd), coins: PARCELA.moedas, count: 1, atraso: k * PARCELA.intervalo, sorteado: !conhecida, parcela: `${k + 1}/${partes}` });
  }
  if (resto > 0) lista.push({ regra: regraAleatoria(porNome, 1, rnd), coins: resto, count: 1, atraso: n * PARCELA.intervalo, sorteado: true, parcela: `${partes}/${partes}` });
  return lista;
}

// Moedas de um presente quando o TikTok não manda o valor (vem 0): o preço da tabela, ou 1 se não estiver nela.
// Devolve { moedas, completou } (completou = true se teve que adivinhar)
export function moedasDoPresente(porNome, nome, moedas) {
  const m = Number(moedas) || 0;
  if (m > 0) return { moedas: m, completou: false };
  const r = acharRegra(porNome, nome);
  return { moedas: Number(r?.moedas) || 1, completou: true };
}
