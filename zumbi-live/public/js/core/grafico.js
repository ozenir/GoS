// ============================================================================
//  GRÁFICO DE ATRIBUTOS — quando alguém comenta "G" (ou "gráfico", "status"...), abre um painel do lado
//  com os atributos do herói em 5 BLOQUINHOS cada.
//
//  Os 5 bloquinhos são uma régua: o máximo de cada atributo é dividido em 5 partes e o herói ganha um bloco
//  por parte cheia, SEMPRE ARREDONDANDO PRA BAIXO (4,8 de 5 = 4 blocos).
//
//  O MÁXIMO de cada atributo é calculado pra cada personagem, somando tudo que o jogo oferece:
//    - a base da classe (vida, velocidade, defesa, esquiva...) e as perícias no nível de referência
//      (NIVEL_REFERENCIA, com o treino no máximo)
//    - as passivas no nível 5 (Força, Couro grosso, Reflexos...)
//    - os drops de paraquedas com 5 pilhas
//    - os bônus de status que valem juntos (fúria, foco, blindado, tiro rápido, instinto)
//    - a torcida cheia, a adrenalina (vida baixa), a melhor habilidade suprema e uma runa de resistência
//  e respeitando os limites do jogo (dano.js → ATRIBUTOS: velocidade até 2,2x, defesa até 60%...).
//  É um "herói perfeito" daquele personagem; ninguém chega lá numa partida normal.
// ============================================================================
import { ATRIBUTOS, TORCIDA, PERICIA_ATRIBUTOS, PERICIA_PADRAO, multPericia } from './dano.js';
import { CLASSES, ARMAS, CORPO, multVidaNivel } from './dados.js';
import { PASSIVAS, SUPREMAS, TREINO_MAX } from './habilidades.js';
import { STATUS } from './status.js';
import { RECOMPENSA } from './recompensas.js';

export const BLOCOS = 5;
export const NIVEL_REFERENCIA = 40;   // nível do "herói perfeito" (perícias e vida máxima crescem até aqui)
export const GRAFICO_SEGUNDOS = 15;   // quanto tempo o painel fica aberto depois de um "G"

// O que aparece no gráfico (na ordem). attr = atributo (dano.js → ATRIBUTOS); forca = dano × perícia da arma.
export const LINHAS = [
  { id: 'forca', nome: 'Força', emoji: '💪', cor: '#ff6a4a', fmt: v => `x${v.toFixed(1)}` },
  { id: 'critChance', nome: 'Crítico', emoji: '🎯', cor: '#ffd23f', fmt: v => `${Math.round(v * 100)}%` },
  { id: 'cadencia', nome: 'Ataque', emoji: '⚡', cor: '#ffb02a', fmt: v => `x${v.toFixed(1)}` },
  { id: 'velocidade', nome: 'Velocidade', emoji: '👟', cor: '#9fd0ff', fmt: v => `x${v.toFixed(2)}` },
  { id: 'defesa', nome: 'Defesa', emoji: '🛡️', cor: '#8b9bff', fmt: v => `${Math.round(v * 100)}%` },
  { id: 'esquiva', nome: 'Esquiva', emoji: '💨', cor: '#c8a8ff', fmt: v => `${Math.round(v * 100)}%` },
  { id: 'vidaMax', nome: 'Vida', emoji: '❤️', cor: '#ff5a7a', fmt: v => `${Math.round(v)}` },
  { id: 'regen', nome: 'Regeneração', emoji: '💚', cor: '#39c47a', fmt: v => `${v.toFixed(1)}/s` }
];

// Blocos cheios: valor dividido pelo máximo, em 5 partes, arredondado pra baixo (entre 0 e 5)
export const blocos = (valor, max) => (max > 0 ? Math.max(0, Math.min(BLOCOS, Math.floor(valor / max * BLOCOS + 1e-9))) : 0);

// Perícia (categoria) do ataque principal de uma classe ou de um herói
const categoriaDe = (arma, corpo) => (arma && ARMAS[arma] ? ARMAS[arma].categoria : CORPO[corpo]?.categoria || 'impacto');

// Todas as fontes de bônus que existem no jogo pra um atributo, no máximo: [{ mult } | { soma }]
function fontes(attr, C) {
  const l = [];
  for (const P of Object.values(PASSIVAS)) { const m = P.mod(P.max); if (m.attr === attr) l.push(m); }
  for (const S of Object.values(STATUS)) {
    if (S.lado !== 'positivo' || !S.mods || S.so === 'zumbi') continue;
    const k = S.porPilha ? S.maxPilhas : 1;
    for (const m of S.mods) if (m.attr === attr) l.push(m.mult != null ? { mult: 1 + (m.mult - 1) * k } : { soma: m.soma * k });
    if (attr === 'regen' && S.porSegundo?.cura && S.id !== 'regenerando') l.push({ soma: S.porSegundo.cura * (S.maxPilhas || 1) });   // drop Fôlego, instinto
  }
  if (attr === 'regen') l.push({ soma: STATUS.regenerando.porSegundo.cura * STATUS.regenerando.maxPilhas });
  if (attr === 'dano') l.push({ mult: 1 + TORCIDA.danoPorPessoa * TORCIDA.maxPessoas }, { mult: 1.25 });   // torcida cheia, adrenalina
  if (attr === 'regen') l.push({ soma: TORCIDA.regenPorPessoa * TORCIDA.maxPessoas });
  if (attr === 'defesa') l.push({ soma: RECOMPENSA.runa.defesa * 5 });   // uma runa de resistência numa habilidade nível 5
  // a melhor suprema pra esse atributo (o herói só tem uma)
  let sup = null;
  for (const S of Object.values(SUPREMAS)) for (const m of (S.mods ? S.mods() : [])) if (m.attr === attr && (!sup || (m.soma ?? m.mult) > (sup.soma ?? sup.mult))) sup = m;
  if (sup) l.push(sup);
  // perícias no nível de referência (agilidade dá esquiva e velocidade)
  for (const [cat, lista] of Object.entries(PERICIA_ATRIBUTOS)) {
    const p = periciaReferencia(C, cat);
    for (const e of lista) if (e.attr === attr) { const n = Math.max(0, p - PERICIA_PADRAO); l.push(e.soma ? { soma: e.soma * n } : { mult: 1 + e.mult * n }); }
  }
  return l;
}

// Perícia de uma classe no nível de referência (com o treino no máximo na perícia do ataque principal)
function periciaReferencia(C, cat) {
  const p = (C.pericias?.[cat] ?? PERICIA_PADRAO) + (C.crescimento?.[cat] || 0) * (NIVEL_REFERENCIA - 1);
  return p + (cat === categoriaDe(C.arma, C.corpo) ? TREINO_MAX : 0);
}

const cache = new Map();
// Máximo de um atributo (ou "forca") pra uma classe
export function maximo(classe, id) {
  const k = classe + ':' + id;
  if (cache.has(k)) return cache.get(k);
  const C = CLASSES[classe];
  const attr = id === 'forca' ? 'dano' : id;
  const A = ATRIBUTOS[attr];
  let base = attr === 'vidaMax' ? C.vida : attr === 'velocidade' ? (C.vel || 1) : (C.attr?.[attr] ?? A.base);
  let soma = 0, mult = 1;
  for (const f of fontes(attr, C)) { if (f.soma != null) soma += f.soma; if (f.mult != null) mult *= f.mult; }
  if (attr === 'vidaMax') mult *= multVidaNivel(NIVEL_REFERENCIA);
  let v = (base + soma) * mult;
  if (A.max != null) v = Math.min(A.max, v);
  if (id === 'forca') v *= multPericia(periciaReferencia(C, categoriaDe(C.arma, C.corpo)));
  cache.set(k, v);
  return v;
}

// Valor atual do herói pra uma linha do gráfico
export function valorAtual(h, id) {
  if (id === 'forca') return h.attr.get('dano') * multPericia(h.pericias?.[categoriaDe(h.arma, h.corpo)] ?? PERICIA_PADRAO);
  return h.attr.get(id);
}

// As linhas prontas pro painel: { ...linha, valor, max, blocos, texto }
export function graficoDoHeroi(h) {
  return LINHAS.map(L => {
    const valor = valorAtual(h, L.id), max = maximo(h.classe, L.id);
    return { ...L, valor, max, blocos: blocos(valor, max), texto: L.fmt(valor) };
  });
}

// O comentário pede o gráfico? ("g", "G", "gráfico", "grafico", "status", "atributos", "📊")
export const pedeGrafico = texto => /^\s*(g+|gr[aá]f(ico)?s?|status|atributos?|stats|📊)\s*[!?.]*\s*$/i.test(String(texto || ''));
