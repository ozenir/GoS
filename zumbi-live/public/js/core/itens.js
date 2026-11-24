// ============================================================================
//  ITENS — o que se compra, vende e troca com o Barganha (mascate.js).
//
//  Dois tipos de item na prateleira:
//    ARMAS    entram na mão do herói na hora (pistola, escopeta, taco com pregos, metralhadora, lança-chamas)
//             e a munição pra arma que ele já tem.
//    TÔNICOS  garrafinhas com um efeito bom que dura alguns quarteirões (status.js → t_*). Vão pra BOLSA do
//             herói (até BOLSA_MAX) e ele bebe sozinho na hora certa: chefe por perto, horda em cima, vida baixa.
//
//  O que o herói carrega e pode vender ou trocar (pertences): os tônicos da bolsa, os kits e curas da mochila,
//  a arma de fogo achada (não a do personagem) e o taco com pregos.
//    vender  → o Barganha paga a METADE do preço dele
//    trocar  → o pertence vale o preço CHEIO: dá pra levar qualquer coisa da prateleira que custe até isso
//
//  Tônicos também aparecem fora da loja: às vezes um chefe deixa um e às vezes tem um escondido nos prédios.
// ============================================================================
import { ARMAS, CORPO, CLASSES, ZUMBIS } from './dados.js';
import { STATUS } from './status.js';

export const BOLSA_MAX = 4;

// preco em R$. q = quarteirões que o tônico dura. cor = a cor do líquido (desenho da garrafa)
export const ITENS = {
  /* ---------------- armas ---------------- */
  pistola:      { tipo: 'arma', nome: 'Pistola', emoji: '🔫', preco: 40, arma: 'pistola', municao: 36, desc: '36 balas', so: h => !h.arma },
  escopeta:     { tipo: 'arma', nome: 'Escopeta', emoji: '💥', preco: 55, arma: 'escopeta', municao: 24, desc: '24 balas', so: h => h.arma !== 'escopeta' && !ARMAS[h.arma]?.lendaria },
  taco:         { tipo: 'arma', nome: 'Taco com pregos', emoji: '🏏', preco: 30, corpo: 'taco', desc: '60 golpes', so: h => h.corpo !== 'taco' },
  municao:      { tipo: 'arma', nome: 'Munição', emoji: '📦', preco: 15, desc: 'mais balas', so: h => !!h.arma && h.municao != null },
  metralhadora: { tipo: 'arma', nome: 'Metralhadora', emoji: '🔥', preco: 90, arma: 'metralhadora', desc: '3 quarteirões', so: h => h.arma !== 'metralhadora' },
  lanca:        { tipo: 'arma', nome: 'Lança-chamas', emoji: '🔥', preco: 95, arma: 'lanca', desc: '3 quarteirões', so: h => h.arma !== 'lanca' },
  /* ---------------- tônicos (status.js → t_*) ---------------- */
  t_furia:   { tipo: 'tonico', nome: 'Tônico da Fúria', preco: 30, q: 2, cor: '#d8382a', claro: '#ff8a6a' },
  t_ferro:   { tipo: 'tonico', nome: 'Tônico de Ferro', preco: 30, q: 2, cor: '#8a9098', claro: '#d8dde4' },
  t_vento:   { tipo: 'tonico', nome: 'Tônico do Vento', preco: 25, q: 2, cor: '#2fb89a', claro: '#9af0d8' },
  t_sangue:  { tipo: 'tonico', nome: 'Tônico do Sangue', preco: 35, q: 2, cor: '#8a1a3a', claro: '#e0607a' },
  t_olho:    { tipo: 'tonico', nome: 'Olho de Gato', preco: 25, q: 3, cor: '#d8b020', claro: '#fff08a' },
  t_gatilho: { tipo: 'tonico', nome: 'Tônico do Gatilho', preco: 30, q: 2, cor: '#e8782a', claro: '#ffc080' },
  t_azul:    { tipo: 'tonico', nome: 'Tônico Azul', preco: 70, q: 3, cor: '#2a6aff', claro: '#9ad8ff', raro: true }   // a especialidade da casa
};
for (const [id, it] of Object.entries(ITENS)) {
  it.id = id;
  if (it.tipo === 'tonico') { it.status = id; it.emoji = STATUS[id].emoji; it.desc = STATUS[id].texto; }
}
export const TONICOS = Object.keys(ITENS).filter(id => ITENS[id].tipo === 'tonico');
export const ARMAS_LOJA = Object.keys(ITENS).filter(id => ITENS[id].tipo === 'arma');

// O herói pode usar isso agora? (não vende escopeta pra quem já tem escopeta, munição pra quem não tem arma...)
export const fazSentido = (h, id) => { const it = ITENS[id]; return !!it && (!it.so || it.so(h)); };

// Quanto cada coisa da mochila vale (preço cheio; o Barganha paga a metade)
const VALOR_MOCHILA = { kit: 24, cura: 16 };

/* ---------------- a bolsa de tônicos ---------------- */
// Guarda um tônico. Bolsa cheia: bebe na hora (não se perde).
export function guardarTonico(g, id, quem = null) {
  const h = g.hero;
  if (!ITENS[id] || ITENS[id].tipo !== 'tonico') return false;
  h.bolsa = h.bolsa || [];
  if (h.bolsa.length >= BOLSA_MAX) { beberTonico(g, id, quem); return true; }
  h.bolsa.push({ id, quem });
  const it = ITENS[id];
  g.emit('tonico', { fase: 'guardou', id, nome: it.nome, emoji: it.emoji, cor: it.cor, texto: it.desc, qtd: h.bolsa.length, x: h.x, y: h.y });
  return true;
}

export function beberTonico(g, id, quem = null) {
  const h = g.hero, it = ITENS[id];
  g.aplicarStatus(h, it.status, { quarteiroes: it.q, acumula: true, maxQuarteiroes: it.q * 3, fonte: quem });
  h.bolsaCd = 4;
  g.emit('tonico', { fase: 'bebeu', id, nome: it.nome, emoji: it.emoji, cor: it.cor, claro: it.claro, texto: `${it.desc} por ${it.q} quarteirões`, x: h.x, y: h.y });
}

// A IA do herói bebe o tônico certo na hora certa (um a cada 4 s, no máximo)
export function atualizarBolsa(g, dt) {
  const h = g.hero;
  if (!h.bolsa?.length || g.fase !== 'jogo' || g.caido) return;
  if ((h.bolsaCd = (h.bolsaCd || 0) - dt) > 0) return;
  const vida = h.vida / h.vidaMax;
  let perto = 0, chefe = false;
  for (const z of g.zumbis) {
    if (z.morto || z.nascendo > 0 || z.dormindo || z.devorando) continue;
    const d2 = (z.x - h.x) ** 2 + (z.y - h.y) ** 2;
    if (d2 < 25) perto++;
    if (d2 < 81 && ZUMBIS[z.tipo]?.chefe) chefe = true;
  }
  const perigo = chefe || perto >= 7;
  const quer = {
    t_sangue: vida < 0.45,
    t_azul: chefe || vida < 0.3,
    t_ferro: (chefe || perto >= 5) && vida < 0.7,
    t_vento: vida < 0.35 && perto >= 3,
    t_furia: perigo, t_gatilho: perigo, t_olho: perigo
  };
  const k = h.bolsa.findIndex(b => quer[b.id] && !h.estados.tem(ITENS[b.id].status));
  if (k < 0) return;
  const b = h.bolsa.splice(k, 1)[0];
  beberTonico(g, b.id, b.quem);
}

/* ---------------- o que o herói carrega (pra vender ou trocar) ---------------- */
// Cada pertence: { ref, id, nome, emoji, valor (preço cheio), venda (o que o Barganha paga) }
export function pertences(g) {
  const h = g.hero, out = [];
  const add = (ref, id, nome, emoji, valor) => out.push({ ref, id, nome, emoji, valor: Math.max(2, Math.round(valor)), venda: Math.max(1, Math.round(valor / 2)) });
  for (const b of h.bolsa || []) { const it = ITENS[b.id]; add({ onde: 'bolsa', b }, b.id, it.nome, it.emoji, it.preco); }
  for (const m of h.mochila || []) add({ onde: 'mochila', m }, m.tipo === 'kit' ? 'kit' : 'cura', m.tipo === 'kit' ? 'Kit médico' : 'Curativo', '💚', VALOR_MOCHILA[m.tipo === 'kit' ? 'kit' : 'cura']);
  // a arma de fogo achada (a do personagem não sai da mão dele)
  if (h.arma && h.arma !== CLASSES[h.classe].arma && h.arma !== h.armaFixa && ITENS[h.arma]) {
    const a = ARMAS[h.arma], it = ITENS[h.arma];
    const resto = a.lendaria ? Math.max(0.34, (h.armaQ || 0) / a.quarteiroes) : a.municao || it.municao ? Math.min(1, Math.max(0.3, (h.municao ?? it.municao) / (it.municao || a.municao))) : 1;
    add({ onde: 'arma' }, h.arma, it.nome, it.emoji, it.preco * resto);
  }
  if (h.corpo === 'taco') add({ onde: 'corpo' }, 'taco', ITENS.taco.nome, ITENS.taco.emoji, ITENS.taco.preco * Math.max(0.3, (h.golpes || 0) / CORPO.taco.golpes));
  return out;
}

// Tira o pertence do herói (vendeu ou trocou)
export function tirarPertence(g, p) {
  const h = g.hero, r = p.ref;
  if (r.onde === 'bolsa') { const k = h.bolsa.indexOf(r.b); if (k < 0) return false; h.bolsa.splice(k, 1); return true; }
  if (r.onde === 'mochila') { const k = h.mochila.indexOf(r.m); if (k < 0) return false; h.mochila.splice(k, 1); return true; }
  if (r.onde === 'arma') { if (!h.arma) return false; g.trocarArma(g.armaPadrao(), null); return true; }
  if (r.onde === 'corpo') { if (h.corpo !== 'taco') return false; h.corpo = g.corpoPadrao(); h.golpes = CORPO[h.corpo]?.golpes || 0; g.emit('arma', { id: h.corpo, nome: CORPO[h.corpo].nome, emoji: CORPO[h.corpo].emoji, quem: null }); return true; }
  return false;
}

// O item comprado (ou trocado) chega no herói
export function entregarItem(g, id) {
  const h = g.hero, it = ITENS[id];
  if (!it) return;
  if (it.tipo === 'tonico') { guardarTonico(g, id); return; }
  if (id === 'municao') { g.darMunicao(1, null, true); return; }
  if (id === 'taco') { h.corpo = 'taco'; h.golpes = CORPO.taco.golpes; g.emit('arma', { id: 'taco', nome: CORPO.taco.nome, emoji: CORPO.taco.emoji, quem: null, loja: true }); return; }
  if (it.municao) { g.pegar({ kind: 'arma', data: { arma: it.arma, municao: it.municao }, quem: null, x: h.x, y: h.y }); return; }
  g.trocarArma(it.arma, null);
}

// Um tônico sorteado (o Tônico Azul é raro) — pra prateleira, pro chefe e pros prédios
export function sortearTonico(rng, semAzul = false) {
  const lista = TONICOS.filter(id => !(semAzul && ITENS[id].raro)).map(id => [id, ITENS[id].raro ? 0.25 : 1]);
  return rng.weighted(lista);
}
