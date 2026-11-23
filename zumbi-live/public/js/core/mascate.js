// ============================================================================
//  O BARGANHA — o comerciante ambulante.
//
//  Um mascate encapuzado, de lenço no rosto e olhos brilhando, com uma mochila cheia de bugigangas, que aparece
//  na esquina de um cruzamento da viagem, do lado de um barril pegando fogo. "Ô, parceiro! Que que vai levar?"
//  O herói vai até ele e o chat vota (1 a 4) o que fazer:
//    COMPRAR  com a grana (💰 R$) que o herói junta: cai de zumbi, acha nos prédios e ganha de quem salva
//    VENDER   uma cura da mochila ou a arma de fogo achada
//    TROCAR   uma cura da mochila por um energético e vitaminas
//    SEGUIR   tchau, Barganha
//  Até duas rodadas por visita (comprou algo, ele oferece de novo). Ninguém votou: a IA compra o que o herói mais
//  precisa (se tiver grana), vende se estiver duro, ou segue. Enquanto negocia, o herói não atravessa o cruzamento.
// ============================================================================
import { Votacao } from './votacao.js';
import { dist } from './util.js';
import { ARMAS, CLASSES } from './dados.js';

export const MASCATE = {
  nome: 'O Barganha', emoji: '🧥',
  chance: 0.5,            // por quarteirão da viagem (sem encontro no mesmo quarteirão)
  intervalo: 110,         // segundos, no mínimo, entre uma visita e outra
  desdeQuarteirao: 2,
  rodadas: 2,
  granaInicial: 10,
  // grana: cai de zumbi (chance, valor), chefe dá mais; e tem nos prédios
  dropZumbi: { chance: 0.06, min: 1, max: 4 }, dropChefe: { min: 12, max: 25 }, predio: { chance: 0.6, min: 4, max: 10 },
  falas: {
    chega: ['Ô, parceiro! Que que vai levar?', 'Chega mais, chega mais...', 'Hehehe... tenho coisa boa hoje!', 'Psiu! Aqui, parceiro!'],
    compra: ['Hehehe... boa escolha!', 'Negócio fechado, parceiro!', 'Isso vai te manter vivo... por enquanto.'],
    vende: ['Isso aí eu pago bem!', 'Hmm... serve. Toma a grana.'],
    troca: ['Troca justa, hehehe.', 'Tá trocado!'],
    semGrana: ['Sem grana, sem negócio... hehe.', 'Volta quando tiver dinheiro, parceiro.'],
    tchau: ['Volte sempre... se continuar vivo!', 'Até a próxima, parceiro!', 'Hehehe... cuidado lá fora.']
  },
  // o que ele vende: preço em R$; `so` = só aparece se fizer sentido pro herói
  catalogo: [
    { id: 'kit', nome: 'Kit médico', emoji: '💚', preco: 25 },
    { id: 'remedio', nome: 'Remédio', emoji: '💊', preco: 18 },
    { id: 'energetico', nome: 'Energético', emoji: '🥤', preco: 14 },
    { id: 'vitamina', nome: 'Vitaminas', emoji: '🍊', preco: 14 },
    { id: 'colete', nome: 'Colete', emoji: '🦺', preco: 28 },
    { id: 'municao', nome: 'Munição', emoji: '🔫', preco: 15, so: h => !!h.arma && h.municao != null },
    { id: 'pistola', nome: 'Pistola (36 balas)', emoji: '🔫', preco: 40, so: h => !h.arma },
    { id: 'escopeta', nome: 'Escopeta (24 balas)', emoji: '💥', preco: 55, so: h => h.arma !== 'escopeta' && !ARMAS[h.arma]?.lendaria },
    { id: 'lendaria', nome: 'Metralhadora (3 quarteirões)', emoji: '🔥', preco: 90 }
  ],
  // quanto ele paga
  compraDoHeroi: { kit: 12, cura: 8, arma: 20 }
};

const fala = (g, tipo) => g.rng.pick(MASCATE.falas[tipo]);
export const mascateAtivo = g => !!g.mascate && g.mascate.fase !== 'indo';

// Quarteirão novo da viagem: às vezes o Barganha está na esquina do próximo cruzamento
export function talvezMascate(g) {
  const M = MASCATE;
  if (!g.S.mascate || g.mascate || g.encontro || g.stats.quarteiroes < M.desdeQuarteirao) return false;
  if (g.t - (g.mascateUltimo ?? -1e9) < M.intervalo || !g.rng.chance(M.chance)) return false;
  return !!aparecerMascate(g);
}

// Põe o Barganha numa esquina do cruzamento da frente (na calçada, fora do caminho), com o barril pegando fogo
export function aparecerMascate(g) {
  const r = g.rota, no = g.city.nodePos(r.alvo.i, r.alvo.j);
  for (const [sx, sy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]].sort(() => g.rng.next() - 0.5)) {
    const p = { x: no.x + sx * 1.9, y: no.y + sy * 1.9 };   // na esquina, na calçada
    if (!g.livre(p.x, p.y)) continue;
    const barril = { x: p.x - sx * 0.2, y: p.y + sy * 0.6 };
    g.mascate = { x: p.x, y: p.y, barril, fase: 'esperando', rodada: 0, t: 0, fala: fala(g, 'chega'), falaT: 0, ofertas: null };
    g.mascateUltimo = g.t;
    g.emit('mascate', { fase: 'chegou', x: p.x, y: p.y });
    return g.mascate;
  }
  return null;
}

// As ofertas da rodada (até 3) + seguir. Cada uma: { tipo: 'comprar'|'vender'|'trocar'|'seguir', ... }
export function montarOfertas(g) {
  const h = g.hero, M = MASCATE, ofertas = [];
  const vida = h.vida / h.vidaMax;
  const pode = M.catalogo.filter(c => !c.so || c.so(h));
  // o que ele mais precisa primeiro, depois o resto (sorteado)
  const peso = c => (vida < 0.5 && (c.id === 'kit' || c.id === 'remedio') ? 5 : 0) + (!h.arma && c.id === 'pistola' ? 4 : 0)
    + (h.municao != null && h.municao < 12 && c.id === 'municao' ? 4 : 0) + (c.preco <= h.grana ? 2 : 0) + g.rng.next() * 2;
  for (const c of pode.sort((a, b) => peso(b) - peso(a)).slice(0, 2)) ofertas.push({ tipo: 'comprar', ...c });
  // vender / trocar
  const cura = h.mochila.findIndex(m => m.tipo === 'kit' || m.tipo === 'cura');
  const armaAchada = h.arma && h.arma !== CLASSES[h.classe].arma && !ARMAS[h.arma]?.lendaria;
  if (cura >= 0 && g.rng.chance(0.5)) ofertas.push({ tipo: 'trocar', id: 'troca', nome: 'Trocar 1 cura por 🥤 + 🍊', emoji: '🔄', preco: 0 });
  else if (cura >= 0) { const m = h.mochila[cura]; ofertas.push({ tipo: 'vender', id: 'cura', nome: `Vender 1 ${m.tipo === 'kit' ? 'kit' : 'cura'} da mochila`, emoji: '💸', ganho: m.tipo === 'kit' ? M.compraDoHeroi.kit : M.compraDoHeroi.cura }); }
  else if (armaAchada) ofertas.push({ tipo: 'vender', id: 'arma', nome: `Vender a ${ARMAS[h.arma].nome.toLowerCase()}`, emoji: '💸', ganho: M.compraDoHeroi.arma });
  ofertas.push({ tipo: 'seguir', id: 'seguir', nome: 'Seguir', emoji: '🚶' });
  return ofertas;
}

// Herói chegou perto: abre a votação da rodada
export function abrirNegocio(g) {
  const m = g.mascate, ids = ['esquerda', 'frente', 'direita', 'entrar'];
  m.ofertas = montarOfertas(g);
  const ops = m.ofertas.map((o, k) => ({ id: ids[k], n: k + 1, nome: o.nome.toUpperCase(), seta: o.emoji, oferta: o }));
  g.voto = new Votacao(ops, g.cfg.votoDur, g.cfg.atraso);
  g.voto.mascate = { fala: m.fala, grana: g.hero.grana };
  m.fase = 'negociando';
  g.emit('votacao_abriu', { opcoes: ops.map(o => o.id), mascate: true });
}

// Ninguém votou: compra o que mais precisa (se der), vende se estiver duro, senão segue
export function escolhaMascateIA(g, ops) {
  const h = g.hero, vida = h.vida / h.vidaMax;
  const preciso = o => o.tipo === 'comprar' && o.preco <= h.grana && ((vida < 0.5 && (o.id === 'kit' || o.id === 'remedio')) || (!h.arma && o.id === 'pistola') || (o.id === 'municao' && h.municao < 12) || (h.grana >= 60 && o.preco <= h.grana * 0.6));
  const c = ops.find(o => preciso(o.oferta));
  if (c) return c.id;
  const v = ops.find(o => o.oferta.tipo === 'vender' && h.grana < 15);
  if (v) return v.id;
  return ops.find(o => o.oferta.tipo === 'seguir').id;
}

export function decidirMascate(g, id, res) {
  const m = g.mascate, h = g.hero, op = g.voto.opcoes.find(x => x.id === id), o = op?.oferta;
  g.voto = null;
  if (!m || !o) return;
  let fez = false, texto = '';
  if (o.tipo === 'comprar') {
    if (h.grana < o.preco) { m.fala = fala(g, 'semGrana'); texto = `💸 sem grana pra ${o.nome.toLowerCase()}`; }
    else { h.grana -= o.preco; entregar(g, o.id); fez = true; m.fala = fala(g, 'compra'); texto = `${o.emoji} ${o.nome} · −R$ ${o.preco}`; g.emit('grana', { valor: -o.preco, x: h.x, y: h.y }); }
  } else if (o.tipo === 'vender') {
    if (o.id === 'cura') { const k = h.mochila.findIndex(x => x.tipo === 'kit' || x.tipo === 'cura'); if (k >= 0) { h.mochila.splice(k, 1); fez = true; } }
    else if (o.id === 'arma' && h.arma) { g.trocarArma(g.armaPadrao(), null); fez = true; }
    if (fez) { h.grana += o.ganho; m.fala = fala(g, 'vende'); texto = `💸 vendeu · +R$ ${o.ganho}`; g.emit('grana', { valor: o.ganho, x: h.x, y: h.y }); }
  } else if (o.tipo === 'trocar') {
    const k = h.mochila.findIndex(x => x.tipo === 'kit' || x.tipo === 'cura');
    if (k >= 0) { h.mochila.splice(k, 1); entregar(g, 'energetico'); entregar(g, 'vitamina'); fez = true; m.fala = fala(g, 'troca'); texto = '🔄 trocou 1 cura por 🥤 + 🍊'; }
  }
  m.falaT = 0;
  const previsao = { risco: 'tranquilo', rotulo: fez ? 'NEGÓCIO FECHADO' : o.tipo === 'seguir' ? 'ATÉ A PRÓXIMA' : 'SEM NEGÓCIO', emoji: fez ? '🤝' : '🚶', itens: [texto || '🚶 segue a viagem', `💰 sobrou R$ ${h.grana}`].filter(Boolean) };
  g.decididoEm = g.t;
  g.emit('decisao', { id, n: op.n, nome: o.nome.toUpperCase(), seta: o.emoji, votos: res.votos, total: 0, auto: res.auto, empate: !!res.empate, quem: [], previsao, mascate: true });
  g.emit('mascate', { fase: fez ? o.tipo : o.tipo === 'seguir' ? 'tchau' : 'nada', x: m.x, y: m.y, valor: o.preco || o.ganho || 0 });
  m.rodada++;
  if (fez && o.tipo !== 'seguir' && m.rodada < MASCATE.rodadas) { m.fase = 'esperando'; m.proximaT = 2.5; }
  else { m.fase = 'indo'; m.t = 0; if (o.tipo === 'seguir' || !fez) m.fala = fala(g, 'tchau'); }
}

// O que foi comprado chega no herói
function entregar(g, id) {
  if (id === 'kit') { if (!g.guardarNaMochila(35, null, 'kit', true)) g.curar(35, null, true); }
  else if (id === 'remedio' || id === 'energetico' || id === 'vitamina') g.pegar({ kind: id, data: {}, quem: null });
  else if (id === 'colete') g.darColete(4, null, true);
  else if (id === 'municao') g.darMunicao(1, null, true);
  else if (id === 'pistola') g.pegar({ kind: 'arma', data: { arma: 'pistola', municao: 36 }, quem: null });
  else if (id === 'escopeta') g.pegar({ kind: 'arma', data: { arma: 'escopeta', municao: 24 }, quem: null });
  else if (id === 'lendaria') g.trocarArma('metralhadora', null);
}

// A cada quadro: o herói chega perto → abre a rodada; entre rodadas espera um pouco; indo embora, some
export function atualizarMascate(g, dt) {
  const m = g.mascate;
  if (!m) return;
  m.t += dt; m.falaT += dt;
  if (g.room || g.arena || g.fase !== 'jogo') { g.mascate = null; return; }
  const h = g.hero, d = dist(h.x, h.y, m.x, m.y);
  if (m.fase === 'esperando') {
    if (m.proximaT > 0) { m.proximaT -= dt; return; }
    if (d < 1.7 && !g.voto && !g.caido) abrirNegocio(g);
    else if (m.t > 60) { m.fase = 'indo'; m.t = 0; m.fala = fala(g, 'tchau'); }   // (por segurança)
  } else if (m.fase === 'indo' && m.t > 6) g.mascate = null;
}

// Onde o herói fica pra negociar (do lado do Barganha, virado pra ele)
export function pontoDoNegocio(g) {
  const m = g.mascate, h = g.hero, d = dist(h.x, h.y, m.x, m.y) || 1;
  return { x: m.x + (h.x - m.x) / d * 1.1, y: m.y + (h.y - m.y) / d * 1.1, negocio: true };
}
