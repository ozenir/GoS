// ============================================================================
//  PREVISÃO DO DESTINO — quando a votação fecha, o resultado conta o que tem no lugar escolhido:
//  se é tranquilo, perigoso ou se tem risco de morte, e se tem suprimentos.
//
//  Não é chute: o que acontece na rua é sorteado no momento em que a votação fecha (jogo.js →
//  prepararDestino) e é exatamente isso que acontece quando o herói chega lá.
//  O "risco de morte" leva em conta a vida do herói agora.
// ============================================================================
import { PERIGOS } from './caminhos.js';
import { LOJAS } from './room.js';

export const RISCOS = {
  tranquilo: { rotulo: 'TRANQUILO', emoji: '🟢' },
  perigoso: { rotulo: 'PERIGOSO', emoji: '🟠' },
  morte: { rotulo: 'RISCO DE MORTE', emoji: '💀' }
};

// O que tem em cada loja, do jeito que aparece no resultado
const LOOT = {
  kit: '💚 kits de cura', cura_pequena: '🩹 curativos', municao: '🔫 munição', colete: '🦺 colete',
  bau_medio: '📦 baú', bau_lendario_chance: '✨ chance de baú lendário',
  comida: '🥫 comida', energetico: '🥤 energético', vitamina: '🍊 vitaminas', remedio: '💊 remédios', arma: '🔫 arma'
};

// prep = { praia, caminho } sorteado pra essa opção (só ruas comuns); g = jogo
export function preverDestino(g, op, prep = null) {
  const h = g.hero, vida = h.vida / h.vidaMax;
  const itens = [];
  let perigo = 0;   // 0 tranquilo · 1 perigoso · 2 muito perigoso
  const L = op.lugar;   // viagem pelo mapa (mapa.js): o lugar escolhido
  const rua = L ? L.dist > 0 : op.id !== 'entrar';
  if (L) {
    const longe = L.dist ? `a ${L.dist} quarteirã${L.dist === 1 ? 'o' : 'os'}` : 'aqui mesmo';
    itens.push(L.praca ? `⚔️ praça ${longe}: chefe, ondas de zumbis e baú` : `${L.emoji} ${L.nome} ${longe}: pode ter ${L.oque}`);
    if (L.praca) perigo = 2;
    else if (L.risco >= 4) perigo = Math.max(perigo, 1);
  }

  if (op.id === 'entrar' && op.praca) {
    itens.push('⚔️ arena: chefe da praça e ondas de zumbis', '📦 baú no fim (pode ser lendário)');
    perigo = 2;
  } else if (op.id === 'entrar' && op.shop) {
    const L = LOJAS[op.shop.tipo] || LOJAS.mercado;
    itens.push(`${op.shop.emoji} ${op.shop.nome}: ${L.zumbis} zumbis lá dentro`);
    itens.push(L.oque ? `pode ter: ${L.oque}` : L.loot.map(([k]) => LOOT[k]).filter(Boolean).join(', '));
    perigo = op.shop.risco >= 4 ? 2 : op.shop.risco >= 3 ? 1 : 0;
  }
  // a direção leva a um lugar: ele entra lá no fim da rua (o que tem lá dentro é sorteado: nem sempre tem tudo)
  if (rua && op.destino) itens.push(`${op.destino.emoji} ${op.destino.nome} no fim da rua: ${op.destino.oque}`);
  if (L ? !L.dist : op.id === 'entrar') {
    // (já contado acima)
  } else if (op.semSaida) {
    itens.push('🚧 rua sem saída', '📦 baú no fim', '⚠️ emboscada na volta');
    perigo = 1;
  } else if (prep?.praia) {
    itens.push('🏖️ praia: uma horda sai do mar, sobreviva 1 minuto');
    perigo = 2;
  } else if (prep?.caminho?.tipo === 'perigoso') {
    const P = PERIGOS[prep.caminho.perigo];
    itens.push(`${P.emoji} ${P.nome.toLowerCase()}: ${P.texto}`);
    perigo = prep.caminho.perigo === 'chefe' || prep.caminho.perigo === 'emboscada' ? 2 : 1;
  } else if (prep?.caminho?.tipo === 'historia') {
    itens.push('🍃 rua tranquila', '📜 uma pista da história no chão');
  } else {
    itens.push('🍃 rua tranquila: nenhum zumbi novo');
  }

  // o que vem junto com o quarteirão novo (entrar numa loja não anda quarteirão)
  if (rua) {
    if (g.A?.hordaCadaQuarteiroes > 0 && g.stats.quarteiroes + 1 >= g.proxHordaQ) { itens.push('🧟 horda gigante chegando'); perigo = Math.max(perigo, 2); }
    if (g.colossoPendente?.estado === 'esperando') { itens.push('🗿 o colosso vem aí'); perigo = Math.max(perigo, 2); }
  }
  // suprimento das curtidas quase caindo
  if (g.cfg?.likesPor > 0 && g.likes / g.cfg.likesPor >= 0.75) itens.push('🪂 caixa de suprimentos quase chegando');

  // risco de morte: depende da vida do herói agora
  const risco = (perigo >= 2 && vida < 0.5) || (perigo >= 1 && vida < 0.3) ? 'morte' : perigo > 0 ? 'perigoso' : 'tranquilo';
  if (risco === 'tranquilo' && vida < 0.5) itens.push('💚 dá pra respirar');
  return { risco, ...RISCOS[risco], itens };
}
