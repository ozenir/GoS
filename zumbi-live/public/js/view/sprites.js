// Sprites em pixel art gerados por código: pessoas, zumbis, cachorro, chão, itens, carros e prédios.
// Cada personagem tem 4 quadros de caminhada, de frente e de costas; o lado esquerdo é o direito espelhado.
import { ZUMBIS_TELA, idTela } from '../core/tela.js';
import { canvas, fillPoly, line, disc, contorno, espelhar, tom } from './pixel.js';
import { hash2 } from '../core/util.js';

export const SPR_W = 18, SPR_H = 28;     // tamanho do quadro do personagem
export const PE_X = 8, PE_Y = 24;        // onde fica o pé dentro do quadro
const OX = 1, OY = 3;

/* ===================== Pessoas e zumbis ===================== */
const ROUPAS = {
  policial: { camisa: '#2f4f9e', calca: '#1d2a4a', bota: '#151820', chapeu: { tipo: 'bone', cor: '#1d2a4a' }, detalhe: '#f2c94c', cabelo: '#3a2a1e', pele: '#e0ac7e' },
  bombeiro: { camisa: '#d64a2b', calca: '#3b3330', bota: '#1b1716', chapeu: { tipo: 'capacete', cor: '#f2c230' }, faixas: '#f5f0a0', cabelo: '#6b3a1e', pele: '#c98a5e' },
  entregador: { camisa: '#f2c230', calca: '#30405a', bota: '#22252e', chapeu: { tipo: 'bone', cor: '#d33b2c' }, mochila: '#d33b2c', cabelo: '#1e1a18', pele: '#8d5a3b' },
  enfermeira: { camisa: '#5fc4b8', calca: '#4aa89d', bota: '#e8e8e8', chapeu: { tipo: 'touca', cor: '#eef6f5' }, cabelo: '#2a1c14', pele: '#f0c39b' },
  mecanico: { camisa: '#3b6e8f', calca: '#3b6e8f', bota: '#2a2420', chapeu: { tipo: 'bone', cor: '#8f3b3b' }, detalhe: '#e8e8e8', cabelo: '#5a4030', pele: '#d29a6e' },
  sobrevivente: { camisa: '#6f8f4f', calca: '#4b4b5b', bota: '#2a2420', chapeu: { tipo: 'bandana', cor: '#c0392b' }, cabelo: '#2a1c14', pele: '#c98a5e' }
};
const Z_PELE = ['#8fae74', '#7d9c6a', '#9bb07c', '#86a07e', '#a3b38a', '#7a9a80'];
const Z_CAMISA = ['#6b5b4b', '#4b5b6b', '#7b4b4b', '#5b6b4b', '#6b6b7b', '#8b7b5b'];
const Z_CALCA = ['#3b3b4b', '#4b3b2b', '#2b3b4b', '#3b4b3b', '#4b4b4b', '#2b2b3b'];

function desenharPessoa(x, o, frame, costas) {
  const r = (px, py, w, h, cor) => { x.fillStyle = cor; x.fillRect(OX + px, OY + py, w, h); };
  const bob = frame === 1 || frame === 3 ? -1 : 0;
  const larg = o.largura || 0;             // 1 = gordo, -1 = magro, 2 = inchado
  const inclina = o.inclina || 0;          // corredor anda curvado pra frente
  const camisa2 = tom(o.camisa, -0.25);
  // Pernas
  const pernaE = { x: 4, h: 5 }, pernaD = { x: 7, h: 5 };
  if (frame === 1) { pernaE.x = 3; pernaD.h = 4; }
  if (frame === 3) { pernaD.x = 8; pernaE.h = 4; }
  for (const p of [pernaE, pernaD]) {
    r(p.x, 14, 3, p.h, p === pernaE ? tom(o.calca, -0.15) : o.calca);
    r(p.x, 14 + p.h, 3, 2, o.bota);
    if (!costas) r(p.x + 2, 15 + p.h, 1, 1, o.bota);
  }
  if (o.rasgado) r(pernaD.x + 1, 16, 1, 1, o.pele);
  // Tronco
  const t0 = larg === 1 ? 2 : larg === -1 ? 4 : larg === 2 ? 1 : 3;
  const tw = larg === 1 ? 10 : larg === -1 ? 6 : larg === 2 ? 12 : 8;
  const th = larg >= 1 ? 7 : 6;
  r(t0 + inclina, 8 + bob, tw, th, o.camisa);
  r(t0 + inclina, 8 + bob, 1, th, camisa2);
  if (larg === 2) { // inchado: bolhas
    r(t0 + 2, 9 + bob, 2, 2, '#c9d86a'); r(t0 + 7, 11 + bob, 2, 2, '#e0a040'); r(t0 + 4, 13 + bob, 2, 1, '#c9d86a'); r(t0 + 9, 9 + bob, 1, 1, '#e0a040');
  }
  if (o.faixas) { r(t0 + inclina, 11 + bob, tw, 1, o.faixas); }
  if (o.detalhe && !costas) r(t0 + tw - 3 + inclina, 9 + bob, 2, 2, o.detalhe);
  if (o.mochila && costas) r(t0 + 1 + inclina, 8 + bob, tw - 2, 5, o.mochila);
  if (o.rasgado) { r(t0 + 2 + inclina, 12 + bob, 2, 1, tom(o.pele, -0.2)); r(t0 + tw - 2 + inclina, 9 + bob, 1, 2, tom(o.pele, -0.2)); }
  if (o.capa) { r(t0 - 1 + inclina, 8 + bob, 1, 9, o.capa); if (costas) r(t0 + inclina, 8 + bob, tw, 8, o.capa); }
  // Braços
  const bx0 = t0 - 1 + inclina, bx1 = t0 + tw + inclina;
  if (o.zumbi) {
    // braços esticados pra frente
    r(bx1 - 1, 9 + bob, 4, 2, o.camisa); r(bx1 + 3, 9 + bob, 1, 2, o.pele);
    r(bx0 + 2, 10 + bob, 3, 2, camisa2); r(bx0 + 5, 10 + bob, 1, 2, o.pele);
    if (larg !== 2) r(bx0, 8 + bob, 1, 4, camisa2);
  } else {
    const sw = frame === 1 ? 1 : frame === 3 ? -1 : 0;
    r(bx0, 8 + bob, 1, 5, camisa2); r(bx0, 13 + bob + sw, 1, 1, o.pele);
    r(bx1, 8 + bob, 1, 5, o.camisa); r(bx1, 13 + bob - sw, 1, 1, o.pele);
  }
  // Cabeça
  const hx = 4 + inclina + (o.cabecaX || 0), hy = 1 + bob;
  r(hx, hy, 6, 7, o.pele);
  if (costas) {
    r(hx, hy, 6, 6, o.cabelo);
  } else {
    r(hx, hy, 6, 2, o.cabelo); r(hx, hy + 2, 1, 3, o.cabelo);
    if (o.zumbi) { r(hx + 3, hy + 3, 1, 1, '#f0e060'); r(hx + 5, hy + 3, 1, 1, '#f0e060'); r(hx + 3, hy + 5, 3, 1, '#5a1e1e'); }
    else { r(hx + 3, hy + 3, 1, 2, '#1a1420'); r(hx + 5, hy + 3, 1, 2, '#1a1420'); }
  }
  if (o.zumbi) { r(hx + 1, hy + 1, 1, 1, tom(o.pele, -0.3)); }
  const ch = o.chapeu;
  if (ch) {
    if (ch.tipo === 'bone') { r(hx, hy - 1, 6, 2, ch.cor); if (!costas) r(hx + 5, hy + 1, 2, 1, ch.cor); }
    else if (ch.tipo === 'capacete') { r(hx - 1, hy - 1, 8, 2, ch.cor); r(hx, hy - 2, 6, 1, ch.cor); r(hx - 1, hy + 1, 1, 1, ch.cor); r(hx + 6, hy + 1, 1, 1, ch.cor); }
    else if (ch.tipo === 'touca') { r(hx, hy - 1, 6, 2, ch.cor); if (!costas) r(hx + 3, hy - 1, 1, 1, '#d33b2c'); }
    else if (ch.tipo === 'bandana') { r(hx, hy, 6, 1, ch.cor); if (costas) r(hx - 1, hy + 1, 1, 2, ch.cor); }
    else if (ch.tipo === 'coroa') { r(hx - 1, hy - 2, 8, 2, '#f2c94c'); r(hx - 1, hy - 4, 1, 2, '#f2c94c'); r(hx + 2, hy - 4, 2, 2, '#f2c94c'); r(hx + 6, hy - 4, 1, 2, '#f2c94c'); r(hx + 2, hy - 2, 2, 1, '#d33b2c'); }
  }
}

function setDePessoa(o) {
  const quadros = costas => [0, 1, 2, 3].map(f => {
    const [c, x] = canvas(SPR_W, SPR_H);
    desenharPessoa(x, o, f, costas);
    return contorno(c);
  });
  const frente = quadros(false), costas = quadros(true);
  return { frente, costas, frenteE: frente.map(espelhar), costasE: costas.map(espelhar) };
}

const cache = new Map();
// O Barganha (mascate.js): capuz e casaco compridos verde-oliva, rosto na sombra, mochila enorme (os olhos que
// brilham, o lenço e as bugigangas penduradas são desenhados por cima, no render)
export function spriteMascate() {
  if (!cache.has('mascate')) cache.set('mascate', setDePessoa({ camisa: '#3e4a2c', calca: '#2a2420', bota: '#17120e', chapeu: { tipo: 'touca', cor: '#2e3820' }, capa: '#2e3820', mochila: '#6a4a2a', cabelo: '#16140f', pele: '#3a302a' }));
  return cache.get('mascate');
}

export function spriteHeroi(roupa, zumbi = false) {
  const k = 'h' + roupa + zumbi;
  if (!cache.has(k)) {
    const base = ROUPAS[roupa] || ROUPAS.sobrevivente;
    cache.set(k, setDePessoa(zumbi ? { ...base, pele: '#8fae74', zumbi: true, rasgado: true, camisa: tom(base.camisa, -0.3), calca: tom(base.calca, -0.2) } : base));
  }
  return cache.get(k);
}

// Pessoas comuns (figurantes: fugindo ou sendo devoradas)
const CIVIL_CAMISA = ['#c84a4a', '#4a8ac8', '#e8c84a', '#8a5ac8', '#4ab87a', '#e88a4a'];
export const CIVIL_PELE = ['#e0ac7e', '#c98a5e', '#8d5a3b', '#f0c39b', '#a86e48', '#d29a6e'];
export function spriteCivil(k) {
  const key = 'civil' + k;
  if (cache.has(key)) return cache.get(key);
  const s = setDePessoa({ camisa: CIVIL_CAMISA[k % 6], calca: ['#30405a', '#3b3b3b', '#5a4a3a'][k % 3], bota: '#2a2420', cabelo: ['#2a1c14', '#6b3a1e', '#1e1a18', '#c8a040'][k % 4], pele: CIVIL_PELE[(k * 5) % 6] });
  cache.set(key, s);
  return s;
}

export function spriteZumbi(tipo, roupa) {
  const k = 'z' + tipo + roupa;
  if (cache.has(k)) return cache.get(k);
  const pele = Z_PELE[roupa % 6];
  let o = { pele, cabelo: tom(pele, -0.45), camisa: Z_CAMISA[roupa % 6], calca: Z_CALCA[roupa % 6], bota: '#2a2420', zumbi: true, rasgado: true };
  if (tipo === 'gordo') o = { ...o, largura: 1 };
  if (tipo === 'corredor') o = { ...o, largura: -1, inclina: 1, camisa: '#8b3b3b', pele: '#a8b890' };
  if (tipo === 'explosivo') o = { ...o, largura: 2, pele: '#b8c860', camisa: '#7a8a3a', cabelo: '#6a7a30' };
  if (tipo === 'chefao') o = { ...o, largura: 1, pele: '#8a6a6a', camisa: '#4a2a2a', calca: '#2a1a1a', cabelo: '#2a1010' };
  if (tipo === 'rei') o = { ...o, largura: 1, pele: '#7a8aa0', camisa: '#5a2a7a', calca: '#2a1a3a', capa: '#8a1e3a', chapeu: { tipo: 'coroa' } };
  if (tipo === 'pedreiro') o = { ...o, camisa: '#e8742a', calca: '#3a5a8a', cabelo: '#2a2018', chapeu: { tipo: 'capacete', cor: '#f2c230' } };   // peão de obra: colete laranja, jeans, capacete amarelo
  if (tipo === 'tomateiro') o = { ...o, camisa: '#c83a2a', calca: '#3a4a2a', cabelo: '#4a3a20', chapeu: { tipo: 'bone', cor: '#3f7f2c' } };   // feirante: camisa vermelha, boné verde
  // zumbis da tela (core/tela.js): cada um com a roupa dele (pintor de branco, fã com as cores do TikTok...)
  const Zt = ZUMBIS_TELA[idTela(tipo)];
  if (Zt?.roupa) o = { ...o, ...Zt.roupa };
  if (tipo === 'colosso') o = { ...o, largura: 2, pele: '#7a6a5a', camisa: '#2e2a4a', calca: '#1a1826', cabelo: '#2a2018', capa: '#c8a030' };
  if (tipo === 'esticado') o = { ...o, largura: -1, pele: '#9aa07a', camisa: '#3a4656', calca: '#262a32', cabelo: '#3a3a2a' };
  const s = setDePessoa(o);
  cache.set(k, s);
  return s;
}

export function spriteCachorro() {
  if (cache.has('dog')) return cache.get('dog');
  const quadros = [0, 1].map(f => {
    const [c, x] = canvas(18, 14);
    const r = (px, py, w, h, cor) => { x.fillStyle = cor; x.fillRect(px, py, w, h); };
    r(3, 5, 10, 4, '#e08a3a'); r(5, 7, 6, 2, '#f5e6d0');           // corpo
    r(11, 2, 5, 4, '#e08a3a'); r(14, 4, 2, 2, '#f5e6d0'); r(15, 4, 1, 1, '#1a1420'); r(13, 3, 1, 1, '#1a1420'); // cabeça
    r(11, 0, 1, 2, '#c06a2a'); r(14, 0, 1, 2, '#c06a2a');           // orelhas
    r(1, 4, 2, 1, '#e08a3a');                                       // rabo
    const p = f ? [[4, 9], [7, 10], [10, 9], [12, 10]] : [[4, 10], [7, 9], [10, 10], [12, 9]];
    for (const [px, py] of p) r(px, 9, 1, py - 8, '#c06a2a');
    return contorno(c);
  });
  const s = { quadros, quadrosE: quadros.map(espelhar) };
  cache.set('dog', s);
  return s;
}

// Lobo zumbi (a partir do nível 20): magro, pelo cinza-esverdeado, costelas e olho vermelho
export function spriteLobo() {
  if (cache.has('lobo')) return cache.get('lobo');
  const quadros = [0, 1].map(f => {
    const [c, x] = canvas(20, 14);
    const r = (px, py, w, h, cor) => { x.fillStyle = cor; x.fillRect(px, py, w, h); };
    r(3, 5, 11, 4, '#5f6b52'); r(4, 8, 9, 1, '#4a5440');            // corpo
    r(6, 6, 1, 2, '#c8c4a8'); r(8, 6, 1, 2, '#c8c4a8'); r(10, 6, 1, 2, '#c8c4a8');   // costelas
    r(13, 2, 6, 4, '#5f6b52'); r(17, 4, 2, 2, '#7a3a32');           // cabeça e focinho
    r(17, 5, 1, 1, '#e8e0c8'); r(15, 3, 1, 1, '#ff3a2a');           // dente e olho
    r(13, 0, 1, 2, '#4a5440'); r(15, 0, 1, 2, '#4a5440');           // orelhas
    r(0, 4, 3, 1, '#4a5440'); r(1, 3, 1, 1, '#4a5440');             // rabo
    r(9, 5, 2, 1, '#7a2a22');                                       // ferida
    const p = f ? [[4, 10], [7, 11], [11, 10], [13, 11]] : [[4, 11], [7, 10], [11, 11], [13, 10]];
    for (const [px, py] of p) r(px, 9, 1, py - 8, '#3a4232');
    return contorno(c);
  });
  const s = { quadros, quadrosE: quadros.map(espelhar) };
  cache.set('lobo', s);
  return s;
}

// Corpo caído (o sprite em pé, deitado)
export function deitado(spr) {
  const [c, x] = canvas(SPR_H, SPR_W);
  x.translate(SPR_H / 2, SPR_W / 2); x.rotate(Math.PI / 2); x.drawImage(spr, -SPR_W / 2, -SPR_H / 2);
  return c;
}

export function sombra(larg = 10) {
  const k = 'sombra' + larg;
  if (!cache.has(k)) {
    const [c, x] = canvas(larg + 2, Math.ceil(larg / 2.5) + 2);
    disc(x, (larg + 2) / 2, (Math.ceil(larg / 2.5) + 2) / 2, larg / 2, 'rgba(0,0,0,0.35)', 0.4);
    cache.set(k, c);
  }
  return cache.get(k);
}

/* ===================== Chão ===================== */
export const TW = 24, TH = 12;
function losango(x, cor) {
  for (let y = 0; y < TH; y++) {
    const hw = y < TH / 2 ? (y + 1) * 2 : (TH - y) * 2;
    x.fillStyle = cor; x.fillRect(TW / 2 - hw, y, hw * 2, 1);
  }
}
function dentroLosango(px, py) {
  const hw = py < TH / 2 ? (py + 1) * 2 : (TH - py) * 2;
  return py >= 0 && py < TH && px >= TW / 2 - hw && px < TW / 2 + hw;
}
function salpicar(x, cores, n, semente) {
  for (let i = 0; i < n; i++) {
    const px = Math.floor(hash2(i, semente, 1) * TW), py = Math.floor(hash2(i, semente, 2) * TH);
    if (!dentroLosango(px, py)) continue;
    x.fillStyle = cores[i % cores.length]; x.fillRect(px, py, 1, 1);
  }
}

// tipos: asfalto, faixa_u, faixa_v, zebra_u, zebra_v, calcada, beco, piso_*, terra
export function tile(tipo, variante = 0) {
  const k = 't' + tipo + variante;
  if (cache.has(k)) return cache.get(k);
  const [c, x] = canvas(TW, TH);
  const v = variante;
  if (tipo.startsWith('asfalto') || tipo.startsWith('faixa') || tipo.startsWith('zebra')) {
    losango(x, '#3b3e46');
    salpicar(x, ['#34373e', '#44474f', '#30333a'], 18, 10 + v);
    if (v === 3) { x.fillStyle = '#2c2e34'; for (let i = 0; i < 6; i++) x.fillRect(6 + i * 2, 4 + (i % 2), 2, 1); } // rachadura
    if (tipo === 'faixa_u') for (let i = 0; i < 3; i++) { x.fillStyle = '#d8c25a'; x.fillRect(8 + i * 2, 4 + i, 2, 1); }
    if (tipo === 'faixa_v') for (let i = 0; i < 3; i++) { x.fillStyle = '#d8c25a'; x.fillRect(14 - i * 2, 4 + i, 2, 1); }
    if (tipo === 'zebra_u') for (let k2 = 0; k2 < 3; k2++) for (let i = 0; i < 4; i++) { const px = 4 + k2 * 6 + i * 2 - 4, py = 2 + k2 * 2 + i - 1; if (dentroLosango(px + 1, py)) { x.fillStyle = '#c9c9c4'; x.fillRect(px, py + 2, 2, 1); } }
    if (tipo === 'zebra_v') for (let k2 = 0; k2 < 3; k2++) for (let i = 0; i < 4; i++) { const px = 18 - k2 * 6 - i * 2 + 2, py = 2 + k2 * 2 + i - 1; if (dentroLosango(px, py)) { x.fillStyle = '#c9c9c4'; x.fillRect(px - 1, py + 2, 2, 1); } }
  } else if (tipo === 'calcada') {
    losango(x, '#8d8b85');
    salpicar(x, ['#827f79', '#97958f'], 12, 30 + v);
    x.fillStyle = '#76746e';
    for (let i = 0; i < 6; i++) x.fillRect(12 + i * 2, i, 1, 1);
    for (let i = 0; i < 6; i++) x.fillRect(11 - i * 2, i + 6, 1, 1);
    if (v === 2) { x.fillStyle = '#4f6b38'; x.fillRect(10, 5, 2, 1); x.fillRect(11, 4, 1, 1); } // matinho
  } else if (tipo === 'beco') {
    losango(x, '#4a463f');
    salpicar(x, ['#3f3b35', '#58534a', '#6a5a3a'], 16, 50 + v);
  } else if (tipo === 'grama') {
    losango(x, v % 2 ? '#4f7a3a' : '#4a7436');
    salpicar(x, ['#5f8f44', '#3f6430', '#6a9a4a'], 20, 80 + v);
    if (v === 3) { x.fillStyle = '#e8d060'; x.fillRect(9, 5, 1, 1); x.fillStyle = '#e86a8a'; x.fillRect(14, 7, 1, 1); }
  } else if (tipo === 'praca') {
    losango(x, (v % 2) ? '#a8a49a' : '#9c988e');
    x.fillStyle = '#8a867c';
    for (let i = 0; i < 6; i++) { x.fillRect(12 + i * 2, i, 1, 1); x.fillRect(11 - i * 2, i + 6, 1, 1); }
    salpicar(x, ['#b4b0a6', '#908c82'], 6, 90 + v);
  } else if (tipo === 'areia') {
    losango(x, (v % 2) ? '#e2c98e' : '#dcc286');
    salpicar(x, ['#ead6a2', '#cfb377', '#c8a86a'], 14, 120 + v);
    if (v === 3) { x.fillStyle = '#f4ece0'; x.fillRect(10, 6, 2, 1); }   // conchinha
  } else if (tipo === 'mar') {
    // 3 quadros de onda (v = 0, 1, 2)
    losango(x, '#2f7fa8');
    salpicar(x, ['#3a8fb8', '#2a6f98'], 10, 140);
    x.fillStyle = '#5ab0d0';
    for (let i = 0; i < 4; i++) x.fillRect(4 + ((i * 5 + v * 3) % 14), 3 + (i * 2 + v) % 6, 3, 1);
  } else if (tipo === 'espuma') {
    losango(x, '#c8b47a');
    x.fillStyle = 'rgba(240,250,255,0.85)';
    for (let i = 0; i < 6; i++) x.fillRect(2 + ((i * 4 + v * 5) % 18), 4 + (i + v) % 4, 3, 1);
  } else if (tipo === 'terra') {
    losango(x, '#2a2620');
  } else if (tipo.startsWith('piso_')) {
    const estilo = tipo.slice(5);
    if (estilo === 'azulejo') { losango(x, (v % 2) ? '#cfd8dc' : '#b8c6cc'); salpicar(x, ['#a9b8be'], 4, 60 + v); }
    else if (estilo === 'concreto') { losango(x, '#7a7a78'); salpicar(x, ['#6e6e6c', '#868684', '#5a4a30'], 14, 70 + v); }
    else { losango(x, (v % 2) ? '#a0805a' : '#94744f'); x.fillStyle = '#86683f'; for (let i = 0; i < 6; i++) x.fillRect(12 - i * 2, 6 + i, 2, 1); }
  }
  cache.set(k, c);
  return c;
}

/* ===================== Itens ===================== */
function caixaIso(x, cx, base, w, h, alt, topo, esq, dir) {
  // caixinha isométrica pequena: w e h em pixels de "meia largura"
  const T = [cx, base - h - alt], R = [cx + w, base - alt - h / 2 + 0], B = [cx, base - alt], L = [cx - w, base - alt - h / 2];
  fillPoly(x, [[L[0], L[1]], [B[0], B[1]], [B[0], B[1] + alt], [L[0], L[1] + alt]], esq);
  fillPoly(x, [[B[0], B[1]], [R[0], R[1]], [R[0], R[1] + alt], [B[0], B[1] + alt]], dir);
  fillPoly(x, [T, R, B, L], topo);
}

// Tônico do Barganha (itens.js): garrafinha de vidro com o líquido colorido, rótulo e rolha
export function spriteTonico(cor, claro) {
  const k = 'ton' + cor;
  if (cache.has(k)) return cache.get(k);
  const [c, x] = canvas(20, 20);
  const r = (px, py, w, h, c2) => { x.fillStyle = c2; x.fillRect(px, py, w, h); };
  r(7, 8, 7, 9, '#1c2230'); r(8, 10, 5, 6, cor); r(8, 10, 5, 1, claro); r(8, 12, 5, 2, '#e8dcc0');
  r(9, 5, 3, 3, '#1c2230'); r(9, 4, 3, 2, '#8a5a30'); r(8, 9, 1, 2, '#cfe6ff');
  cache.set(k, c);
  return c;
}

export function spriteItem(kind) {
  const k = 'i' + kind;
  if (cache.has(k)) return cache.get(k);
  const [c, x] = canvas(20, 20);
  const r = (px, py, w, h, cor) => { x.fillStyle = cor; x.fillRect(px, py, w, h); };
  if (kind === 'kit' || kind === 'cura_pequena') {
    caixaIso(x, 10, 17, 7, 6, 6, '#f2f2f2', '#d8d8d8', '#bdbdbd');
    r(9, 8, 3, 1, '#d33b2c'); r(10, 7, 1, 3, '#d33b2c'); r(4, 14, 2, 1, '#d33b2c'); r(15, 14, 2, 1, '#d33b2c');
  } else if (kind === 'municao') {
    caixaIso(x, 10, 17, 7, 6, 5, '#6b7a3a', '#55622d', '#434e22');
    r(6, 6, 1, 3, '#e8c060'); r(8, 5, 1, 3, '#e8c060'); r(10, 6, 1, 3, '#e8c060'); r(12, 5, 1, 3, '#e8c060');
  } else if (kind === 'colete') {
    r(5, 6, 10, 10, '#2f4f6e'); r(8, 6, 4, 3, 'rgba(0,0,0,0)'); x.clearRect(8, 6, 4, 3); r(6, 9, 8, 1, '#5a7a9a'); r(6, 12, 8, 1, '#5a7a9a');
  } else if (kind === 'suprimento') {
    caixaIso(x, 10, 17, 8, 7, 6, '#a0784a', '#86623a', '#6e4f2e');
    r(6, 9, 9, 1, '#5a3f22'); r(10, 6, 1, 8, '#5a3f22');
  } else if (kind === 'bau_medio') {
    caixaIso(x, 10, 18, 8, 7, 7, '#5a7ab8', '#3f5a96', '#2f4678');
    r(9, 9, 3, 3, '#f2c94c'); r(4, 13, 1, 3, '#2a3550'); r(16, 13, 1, 3, '#2a3550');
  } else if (kind === 'bau_lendario') {
    caixaIso(x, 10, 18, 8, 7, 7, '#f2c94c', '#d8a830', '#b8861e');
    r(9, 9, 3, 3, '#d33b2c'); r(10, 10, 1, 1, '#ffffff'); r(4, 13, 1, 3, '#8a5a10'); r(16, 13, 1, 3, '#8a5a10');
  } else if (kind === 'historia') {
    // folha de papel dobrada
    fillPoly(x, [[4, 9], [11, 5], [17, 9], [10, 13]], '#f3e6cc');
    fillPoly(x, [[4, 9], [10, 13], [10, 15], [4, 11]], '#d8c8a8');
    fillPoly(x, [[10, 13], [17, 9], [17, 11], [10, 15]], '#c0ae8a');
    r(8, 8, 4, 1, '#8a7a5a'); r(9, 9, 4, 1, '#8a7a5a'); r(11, 10, 3, 1, '#8a7a5a');
  } else if (kind === 'drop') {
    // caixa de presente do paraquedas: roxa com fita dourada
    caixaIso(x, 10, 17, 7, 6, 6, '#8b6bff', '#6a4fd0', '#5238a8');
    r(10, 5, 1, 9, '#ffd23f'); r(5, 10, 10, 1, '#ffd23f'); r(8, 4, 2, 2, '#ffd23f'); r(11, 4, 2, 2, '#ffd23f');
  } else if (kind === 'runa') {
    // pedra da runa: cristal roxo
    fillPoly(x, [[10, 2], [15, 9], [10, 18], [5, 9]], '#9b6bff');
    fillPoly(x, [[10, 2], [15, 9], [10, 10]], '#c8a8ff');
    fillPoly(x, [[10, 10], [15, 9], [10, 18]], '#6a3fd0');
    r(9, 7, 2, 4, '#fff3d0');
  } else if (kind === 'comida') {
    // lata de comida: cilindro com rótulo vermelho
    r(6, 7, 8, 9, '#b8bcc4'); r(6, 9, 8, 5, '#c8342a'); r(7, 10, 6, 2, '#f2d34c'); r(6, 6, 8, 1, '#e0e4ea'); r(6, 16, 8, 1, '#8a8e96');
  } else if (kind === 'energetico') {
    // latinha de energético: verde-limão com raio
    r(7, 5, 6, 11, '#2a3a2a'); r(7, 7, 6, 7, '#7ef04a'); r(9, 8, 2, 2, '#1a1a1a'); r(10, 10, 2, 2, '#1a1a1a'); r(7, 4, 6, 1, '#c8ccd2');
  } else if (kind === 'vitamina') {
    // frasco de vitaminas: laranja com tampa branca
    r(7, 8, 7, 8, '#f08a24'); r(8, 10, 5, 3, '#fff3d0'); r(8, 5, 5, 3, '#f4f4f4'); r(7, 15, 7, 1, '#b8641a');
  } else if (kind === 'remedio') {
    // caixinha de remédio: branca com faixa azul e cruz
    caixaIso(x, 10, 17, 6, 5, 5, '#f4f6fa', '#d8dde6', '#bcc4d0');
    r(5, 11, 4, 2, '#3a7bd8'); r(12, 11, 4, 2, '#3a7bd8'); r(9, 7, 3, 1, '#3a7bd8'); r(10, 6, 1, 3, '#3a7bd8');
  } else if (kind === 'grana') {
    // um bolinho de notas com elástico (e uma moeda)
    r(4, 9, 11, 5, '#3f8a4a'); r(5, 8, 11, 5, '#5aa864'); r(6, 9, 9, 3, '#7cc886'); r(9, 8, 2, 5, '#d8c060');
    r(13, 13, 3, 3, '#f2c94c'); r(14, 14, 1, 1, '#b8861e');
  } else if (kind === 'arma') {
    r(3, 9, 13, 3, '#3a3a40'); r(12, 12, 3, 4, '#5a3a22'); r(15, 9, 2, 2, '#3a3a40'); r(4, 10, 8, 1, '#6a6a70');
  }
  contorno(c);
  cache.set(k, c);
  return c;
}

/* ===================== Coisas da rua ===================== */
const CORES_CARRO = ['#8a3b3b', '#3b5a8a', '#c9c0b0', '#3b6e4f', '#8a7a3b', '#4b4b55'];

// Carro: comp = tamanho em casas ao longo de u (2) ou v (2). eixo 'u' ou 'v' na vista.
// emergencia: 'policia' (branca com faixa azul e giroflex), 'ambulancia' (van branca com faixa e cruz vermelhas)
// ou 'bombeiros' (caminhão vermelho com faixa branca e escada). As luzes que piscam são desenhadas no render.
export function spriteCarro(cor, eixo, virado, emergencia = null) {
  if (emergencia) return spriteViatura(emergencia, eixo);
  const k = 'car' + cor + eixo + virado;
  if (cache.has(k)) return cache.get(k);
  const du = eixo === 'u' ? 2 : 1, dv = eixo === 'u' ? 1 : 2;
  const W = (du + dv) * 12 + 2, Hh = (du + dv) * 6 + 22;
  const [c, x] = canvas(W, Hh);
  const T = [dv * 12 + 1, 20];
  const P = (u, v, z) => [T[0] + (u - v) * 12, T[1] + (u + v) * 6 - z];
  const box = (u0, v0, u1, v1, z0, z1, top, l, r) => {
    fillPoly(x, [P(u0, v1, z0), P(u1, v1, z0), P(u1, v1, z1), P(u0, v1, z1)], l);
    fillPoly(x, [P(u1, v1, z0), P(u1, v0, z0), P(u1, v0, z1), P(u1, v1, z1)], r);
    fillPoly(x, [P(u0, v0, z1), P(u1, v0, z1), P(u1, v1, z1), P(u0, v1, z1)], top);
  };
  const base = virado ? '#3a3632' : CORES_CARRO[cor % 6];
  const m = 0.12;
  box(m, m, du - m, dv - m, 1, 8, tom(base, 0.15), tom(base, -0.05), tom(base, -0.3));
  const iu = eixo === 'u' ? 0.5 : 0.2, iv = eixo === 'u' ? 0.2 : 0.5;
  box(m + iu, m + iv, du - m - (eixo === 'u' ? 0.35 : 0.2), dv - m - (eixo === 'u' ? 0.2 : 0.35), 8, 13, tom(base, 0.05), '#2a3440', '#1e2630');
  // rodas
  x.fillStyle = '#151515';
  const rodas = eixo === 'u' ? [[0.45, dv - m], [du - 0.45, dv - m]] : [[du - m, 0.45], [du - m, dv - 0.45]];
  for (const [u, v] of rodas) { const p = P(u, v, 1); x.fillRect(Math.round(p[0]) - 2, Math.round(p[1]) - 2, 4, 3); }
  if (virado) { x.fillStyle = '#1e1a16'; for (let i = 0; i < 8; i++) x.fillRect(Math.floor(hash2(i, cor, 5) * W), 12 + Math.floor(hash2(i, cor, 6) * 14), 2, 1); }
  contorno(c);
  const s = { c, ox: T[0], oy: T[1] };
  cache.set(k, s);
  return s;
}

export function spriteViatura(tipo, eixo) {
  const k = 'vtr' + tipo + eixo;
  if (cache.has(k)) return cache.get(k);
  const du = eixo === 'u' ? 2 : 1, dv = eixo === 'u' ? 1 : 2;
  const W = (du + dv) * 12 + 2, Hh = (du + dv) * 6 + 26;
  const [c, x] = canvas(W, Hh);
  const T = [dv * 12 + 1, 24];
  const P = (u, v, z) => [T[0] + (u - v) * 12, T[1] + (u + v) * 6 - z];
  const box = (u0, v0, u1, v1, z0, z1, top, l, r) => {
    fillPoly(x, [P(u0, v1, z0), P(u1, v1, z0), P(u1, v1, z1), P(u0, v1, z1)], l);
    fillPoly(x, [P(u1, v1, z0), P(u1, v0, z0), P(u1, v0, z1), P(u1, v1, z1)], r);
    fillPoly(x, [P(u0, v0, z1), P(u1, v0, z1), P(u1, v1, z1), P(u0, v1, z1)], top);
  };
  // faixa pintada na lateral (as duas faces que aparecem)
  const faixa = (u0, v0, u1, v1, z0, z1, cor) => {
    fillPoly(x, [P(u0, v1, z0), P(u1, v1, z0), P(u1, v1, z1), P(u0, v1, z1)], cor);
    fillPoly(x, [P(u1, v1, z0), P(u1, v0, z0), P(u1, v0, z1), P(u1, v1, z1)], tom(cor, -0.2));
  };
  const m = 0.1, U = du - m, V = dv - m;
  if (tipo === 'policia') {
    box(m, m, U, V, 1, 8, '#f2f4f8', '#e2e5ec', '#b8bcc6');
    faixa(m, m, U, V, 3, 5, '#2a5bd7');
    const iu = eixo === 'u' ? 0.5 : 0.2, iv = eixo === 'u' ? 0.2 : 0.5;
    box(m + iu, m + iv, U - (eixo === 'u' ? 0.35 : 0.2), V - (eixo === 'u' ? 0.2 : 0.35), 8, 13, '#e8eaef', '#2a3440', '#1e2630');
    const cu = du / 2, cv = dv / 2;
    box(cu - 0.25, cv - 0.15, cu + 0.25, cv + 0.15, 13, 15, '#3a3c44', '#2a2c32', '#22242a');   // giroflex
  } else if (tipo === 'ambulancia') {
    box(m, m, U, V, 1, 14, '#f6f6f6', '#e6e6e6', '#c2c2c6');
    faixa(m, m, U, V, 5, 7, '#d32f2f');
    // cruz na lateral
    const cz = 10, a = eixo === 'u' ? [du * 0.6, V] : [U, dv * 0.6];
    const pc = P(a[0], a[1], cz); x.fillStyle = '#d32f2f'; x.fillRect(Math.round(pc[0]) - 1, Math.round(pc[1]) - 3, 2, 6); x.fillRect(Math.round(pc[0]) - 3, Math.round(pc[1]) - 1, 6, 2);
    const cu = eixo === 'u' ? 0.4 : du / 2, cv = eixo === 'u' ? dv / 2 : 0.4;
    box(cu - 0.2, cv - 0.15, cu + 0.2, cv + 0.15, 14, 16, '#3a3c44', '#2a2c32', '#22242a');
  } else {
    box(m, m, U, V, 1, 12, '#c62828', '#b02020', '#8a1818');
    faixa(m, m, U, V, 4, 5, '#f0f0f0');
    // escada em cima
    const a0 = eixo === 'u' ? [0.4, dv / 2] : [du / 2, 0.4], a1 = eixo === 'u' ? [du - 0.3, dv / 2] : [du / 2, dv - 0.3];
    const p0 = P(a0[0], a0[1], 13), p1 = P(a1[0], a1[1], 13);
    line(x, p0[0], p0[1], p1[0], p1[1], '#c8ccd4', 2);
    const cu = eixo === 'u' ? 0.35 : du / 2, cv = eixo === 'u' ? dv / 2 : 0.35;
    box(cu - 0.2, cv - 0.15, cu + 0.2, cv + 0.15, 12, 14, '#3a3c44', '#2a2c32', '#22242a');
  }
  x.fillStyle = '#151515';
  const rodas = eixo === 'u' ? [[0.45, dv - m], [du - 0.45, dv - m]] : [[du - m, 0.45], [du - m, dv - 0.45]];
  for (const [u, v] of rodas) { const p = P(u, v, 1); x.fillRect(Math.round(p[0]) - 2, Math.round(p[1]) - 2, 4, 3); }
  contorno(c);
  const s = { c, ox: T[0], oy: T[1] };
  cache.set(k, s);
  return s;
}
// Cores das luzes de cada veículo de emergência (piscam alternando)
export const LUZES_EMERGENCIA = { policia: ['#ff2a2a', '#2a6aff'], ambulancia: ['#ff2a2a', '#ffffff'], bombeiros: ['#ff2a2a', '#ffb02a'] };

// Conversível dos zumbis: carro vermelho sem capota (os zumbis em pé são desenhados por cima, no render)
export function spriteConversivel(eixo) {
  const k = 'conv' + eixo;
  if (cache.has(k)) return cache.get(k);
  const du = eixo === 'u' ? 2 : 1, dv = eixo === 'u' ? 1 : 2;
  const W = (du + dv) * 12 + 2, Hh = (du + dv) * 6 + 22;
  const [c, x] = canvas(W, Hh);
  const T = [dv * 12 + 1, 20];
  const P = (u, v, z) => [T[0] + (u - v) * 12, T[1] + (u + v) * 6 - z];
  const box = (u0, v0, u1, v1, z0, z1, top, l, r) => {
    fillPoly(x, [P(u0, v1, z0), P(u1, v1, z0), P(u1, v1, z1), P(u0, v1, z1)], l);
    fillPoly(x, [P(u1, v1, z0), P(u1, v0, z0), P(u1, v0, z1), P(u1, v1, z1)], r);
    fillPoly(x, [P(u0, v0, z1), P(u1, v0, z1), P(u1, v1, z1), P(u0, v1, z1)], top);
  };
  const m = 0.1, base = '#c8302a';
  box(m, m, du - m, dv - m, 1, 7, tom(base, 0.18), tom(base, -0.05), tom(base, -0.3));
  // por dentro: bancos escuros (sem capota)
  const i = 0.22;
  fillPoly(x, [P(m + i, m + i, 7), P(du - m - i, m + i, 7), P(du - m - i, dv - m - i, 7), P(m + i, dv - m - i, 7)], '#3a1414');
  // para-brisa baixinho
  if (eixo === 'u') box(du - 0.62, m + 0.1, du - 0.5, dv - m - 0.1, 7, 11, '#9fd0ff', '#6a9ac8', '#4a7aa8');
  else box(m + 0.1, dv - 0.62, du - m - 0.1, dv - 0.5, 7, 11, '#9fd0ff', '#6a9ac8', '#4a7aa8');
  x.fillStyle = '#151515';
  const rodas = eixo === 'u' ? [[0.45, dv - m], [du - 0.45, dv - m]] : [[du - m, 0.45], [du - m, dv - 0.45]];
  for (const [u, v] of rodas) { const p = P(u, v, 1); x.fillRect(Math.round(p[0]) - 2, Math.round(p[1]) - 2, 4, 3); }
  contorno(c);
  const s = { c, ox: T[0], oy: T[1] };
  cache.set(k, s);
  return s;
}

export function spriteProp(tipo) {
  const k = 'p' + tipo;
  if (cache.has(k)) return cache.get(k);
  let c, x, ox, oy;
  if (tipo === 'poste') {
    [c, x] = canvas(10, 40); ox = 4; oy = 38;
    x.fillStyle = '#3a3c42'; x.fillRect(4, 6, 2, 33); x.fillRect(4, 5, 5, 2); x.fillStyle = '#c9c070'; x.fillRect(7, 7, 2, 1);
  } else if (tipo === 'barril') {
    [c, x] = canvas(12, 14); ox = 6; oy = 12;
    x.fillStyle = '#7a3a22'; x.fillRect(2, 2, 8, 10); x.fillStyle = '#5a2a18'; x.fillRect(2, 5, 8, 1); x.fillRect(2, 9, 8, 1); x.fillStyle = '#e8902a'; x.fillRect(3, 1, 6, 1);
  } else if (tipo === 'lixo') {
    [c, x] = canvas(14, 10); ox = 7; oy = 8;
    disc(x, 5, 6, 4, '#262a2a', 0.7); disc(x, 9, 6, 3, '#1e2222', 0.8); x.fillStyle = '#3a4040'; x.fillRect(4, 3, 2, 1);
  } else if (tipo === 'caixas') {
    [c, x] = canvas(16, 16); ox = 8; oy = 13;
    caixaIso(x, 8, 14, 6, 5, 5, '#a08050', '#86683f', '#6e5432'); caixaIso(x, 9, 9, 4, 3, 4, '#b08a58', '#94744a', '#7a5f3a');
  } else if (tipo === 'barricada') {
    [c, x] = canvas(16, 16); ox = 8; oy = 13;
    caixaIso(x, 8, 14, 7, 6, 7, '#a08050', '#d84a3a', '#b83a2a');
    x.fillStyle = '#f0f0f0'; x.fillRect(3, 9, 2, 2); x.fillRect(7, 11, 2, 2); x.fillRect(11, 9, 2, 2);
  } else if (tipo === 'barricada_placa') {
    [c, x] = canvas(18, 30); ox = 9; oy = 27;
    caixaIso(x, 9, 28, 7, 6, 7, '#a08050', '#d84a3a', '#b83a2a');
    x.fillStyle = '#3a3a3a'; x.fillRect(8, 6, 2, 16);
    x.fillStyle = '#f2c230'; x.fillRect(2, 2, 14, 7); x.fillStyle = '#1a1a1a';
    for (let i = 0; i < 4; i++) x.fillRect(3 + i * 4, 3, 2, 5);
  } else if (tipo === 'arvore') {
    [c, x] = canvas(22, 38); ox = 11; oy = 35;
    x.fillStyle = '#5a3a22'; x.fillRect(10, 22, 3, 14);
    disc(x, 11, 16, 9, '#2f5a2a', 0.9); disc(x, 9, 13, 6, '#3f7a34', 0.9); disc(x, 14, 11, 4, '#4f8a3e', 0.9);
    x.fillStyle = '#6aa04a'; x.fillRect(8, 9, 2, 1); x.fillRect(13, 8, 1, 1);
  } else if (tipo === 'banco') {
    [c, x] = canvas(16, 12); ox = 8; oy = 10;
    caixaIso(x, 8, 10, 6, 4, 3, '#a07a4a', '#86623a', '#6e4f2e');
    x.fillStyle = '#3a3a3a'; x.fillRect(3, 9, 1, 2); x.fillRect(12, 9, 1, 2);
  } else if (tipo === 'coqueiro') {
    [c, x] = canvas(26, 44); ox = 13; oy = 41;
    x.fillStyle = '#8a6a3a'; for (let i = 0; i < 26; i++) x.fillRect(12 + Math.round(Math.sin(i / 9) * 2), 16 + i, 3, 1);
    x.fillStyle = '#6a4e2a'; for (let i = 0; i < 26; i += 4) x.fillRect(12 + Math.round(Math.sin(i / 9) * 2), 16 + i, 3, 1);
    const folha = (dx, dy) => { for (let k = 0; k < 9; k++) { x.fillStyle = k % 2 ? '#3f8a3a' : '#2f7030'; x.fillRect(13 + Math.round(dx * k), 14 + Math.round(dy * k + k * k * 0.06), 2, 2); } };
    folha(1.3, -0.6); folha(-1.3, -0.6); folha(1.1, 0.3); folha(-1.1, 0.3); folha(0.2, -1);
    x.fillStyle = '#6a4a2a'; x.fillRect(12, 16, 2, 2); x.fillRect(14, 17, 2, 2);   // cocos
  } else if (tipo === 'guarda_sol') {
    [c, x] = canvas(22, 26); ox = 11; oy = 24;
    x.fillStyle = '#5a5a5a'; x.fillRect(10, 8, 1, 17);
    for (let i = 0; i < 7; i++) { x.fillStyle = i % 2 ? '#f0f0f0' : '#d8443a'; x.fillRect(2 + i * 2.6, 6 - Math.abs(3 - i) * 0.6, 3, 3); }
    x.fillStyle = '#c8b47a'; x.fillRect(7, 23, 8, 2);
  } else if (tipo === 'cadeira_praia') {
    [c, x] = canvas(14, 10); ox = 7; oy = 8;
    x.fillStyle = '#3a7ab8'; x.fillRect(2, 4, 10, 2); x.fillRect(9, 1, 3, 4);
    x.fillStyle = '#f0f0f0'; x.fillRect(3, 4, 2, 2); x.fillRect(7, 4, 2, 2);
    x.fillStyle = '#7a6a5a'; x.fillRect(2, 6, 1, 3); x.fillRect(11, 6, 1, 3);
  } else if (tipo === 'pedra') {
    [c, x] = canvas(16, 12); ox = 8; oy = 10;
    disc(x, 8, 7, 5, '#7a7470', 0.6); disc(x, 7, 6, 3, '#8a847e', 0.6); x.fillStyle = '#9a948e'; x.fillRect(6, 4, 2, 1);
  } else if (tipo === 'salva_vidas') {
    [c, x] = canvas(20, 38); ox = 10; oy = 35;
    x.fillStyle = '#e8e0d0'; x.fillRect(4, 16, 1, 20); x.fillRect(15, 16, 1, 20); x.fillRect(4, 26, 12, 1);
    caixaIso(x, 10, 18, 7, 5, 7, '#d84a3a', '#b83a2a', '#9a2e22');
    x.fillStyle = '#f0f0f0'; x.fillRect(6, 3, 8, 2); x.fillStyle = '#d84a3a'; x.fillRect(9, 3, 2, 2);
  } else if (tipo === 'lixeira') {
    // lixeira de rua (contêiner pequeno verde com tampa)
    [c, x] = canvas(14, 16); ox = 7; oy = 13;
    caixaIso(x, 7, 15, 5, 4, 8, '#3f7a45', '#2f6035', '#244a29');
    x.fillStyle = '#1e3a22'; x.fillRect(3, 5, 8, 1); x.fillStyle = '#5a9a60'; x.fillRect(4, 3, 6, 1);
  } else if (tipo === 'conteiner') {
    [c, x] = canvas(20, 24); ox = 10; oy = 21;
    caixaIso(x, 10, 22, 9, 8, 12, '#3a7a8a', '#2e6270', '#224a56');
    x.fillStyle = 'rgba(0,0,0,0.18)'; for (let i = 0; i < 5; i++) x.fillRect(2 + i * 2, 9 + i, 1, 11);
  }
  contorno(c);
  const s = { c, ox, oy };
  cache.set(k, s);
  return s;
}

/* ===================== Letreiros (fonte de pixel) ===================== */
// Fonte 3x5 pras placas das lojas: desenhadas DENTRO do sprite do prédio, então obedecem a perspectiva (inclinadas
// na direção da face) e a ordem das camadas (prédio da frente tapa; prédio transparente deixa a placa transparente).
const FONTE = {
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'],
  D: ['110', '101', '101', '101', '110'], E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'],
  G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'], I: ['111', '010', '010', '010', '111'],
  J: ['001', '001', '001', '101', '010'], K: ['101', '101', '110', '101', '101'], L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'], N: ['110', '101', '101', '101', '101'], O: ['010', '101', '101', '101', '010'],
  P: ['110', '101', '110', '100', '100'], Q: ['010', '101', '101', '110', '011'], R: ['110', '101', '110', '101', '101'],
  S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'], U: ['101', '101', '101', '101', '111'],
  V: ['101', '101', '101', '101', '010'], W: ['101', '101', '111', '111', '101'], X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'], Z: ['111', '001', '010', '100', '111'], ' ': ['000', '000', '000', '000', '000']
};
// ícone 5x5 de cada loja (no lugar do emoji)
const ICONES = {
  farmacia: { cor: '#2fbf6a', px: ['00100', '00100', '11111', '00100', '00100'] },
  hospital: { cor: '#e53935', px: ['00100', '00100', '11111', '00100', '00100'] },
  mercado: { cor: '#f2a541', px: ['10000', '11111', '01110', '01110', '01010'] },
  delegacia: { cor: '#f2c94c', px: ['00100', '11111', '01110', '01010', '10001'] },
  posto: { cor: '#e85d4a', px: ['11100', '10110', '11101', '11101', '11100'] },
  fabrica: { cor: '#c8ccd4', px: ['10000', '11010', '11111', '11111', '11111'] },
  casa: { cor: '#c98a5e', px: ['00100', '01110', '11111', '01010', '01110'] }
};
const largTexto = txt => txt.length * 4 - 1;
// escreve txt com a fonte 3x5 a partir de (x, y), inclinado: cada coluna desce `inclina` px por px andado (0,5 =
// face da esquerda, -0,5 = face da direita, como a perspectiva isométrica)
function escreverPixel(ctx, txt, x, y, cor, inclina = 0) {
  ctx.fillStyle = cor;
  let cx = 0;
  for (const ch of txt) {
    const base = ch.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const gl = FONTE[base] || FONTE[' '];
    const ponto = (c, r) => ctx.fillRect(x + cx + c, y + r + Math.floor((cx + c) * inclina), 1, 1);
    gl.forEach((linha, r) => { for (let c = 0; c < 3; c++) if (linha[c] === '1') ponto(c, r); });
    if (/[ÁÉÍÓÚ]/.test(ch)) ponto(2, -1); else if (/[ÃÕ]/.test(ch)) { ponto(0, -1); ponto(2, -2); } else if (/[ÂÊÔ]/.test(ch)) { ponto(0, -1); ponto(2, -1); ponto(1, -2); } else if (ch === 'Ç') ponto(1, 5);
    cx += 4;
  }
}
// placa inteira (fundo na cor da loja, brilho em cima, ícone e o nome), inclinada; devolve a largura em px
function placaPixel(ctx, shop, x, y, inclina, comBorda = true) {
  const nome = shop.nome.toUpperCase(), ic = ICONES[shop.tipo], w = largTexto(nome) + (ic ? 8 : 0) + 6, hh = 9;
  for (let i = 0; i < w; i++) {
    const yy = y + Math.floor(i * inclina);
    ctx.fillStyle = shop.placa; ctx.fillRect(x + i, yy, 1, hh);
    ctx.fillStyle = tom(shop.placa, 0.25); ctx.fillRect(x + i, yy, 1, 1);
    if (comBorda) { ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(x + i, yy + hh, 1, 1); }
  }
  let tx = x + 3;
  if (ic) {
    ic.px.forEach((linha, r) => { for (let c = 0; c < 5; c++) if (linha[c] === '1') { ctx.fillStyle = ic.cor; ctx.fillRect(tx + c, y + 2 + r + Math.floor((tx - x + c) * inclina), 1, 1); } });
    tx += 8;
  }
  // o texto, com a inclinação contada desde o começo da placa
  const dy = Math.floor((tx - x) * inclina);
  escreverPixel(ctx, nome, tx, y + 2 + dy - Math.floor(0 * inclina), '#ffffff', inclina);
  return w;
}

/* ===================== Casas (bairro residencial) ===================== */
// O lote inteiro (7x7): quintal de grama com cerca branca de madeira, caminho de pedra até a porta, a casa no meio
// (parede em cor pastel, telhado de telha com duas águas, porta e janelas que acendem de noite), às vezes uma
// chaminé e uma árvore no quintal. As medidas da casa ficam em CASA (a gente na janela usa: render.js).
export const CASA = { u0: 1.4, u1: 5.6, v0: 1.3, v1: 5.3, parede: 12, cumeeira: 9 };
const PAREDES_CASA = ['#ecdcbc', '#c8e0ea', '#f2cdb4', '#d6e8c2', '#ecccdc', '#d8d6e4', '#f4e4a8'];
const TELHAS = ['#b8442e', '#9a3a2a', '#7a5a4a', '#5a6a7a', '#a8562e'];
export function spriteCasa(b, du, dv, rot) {
  const k = 'casa' + b.id + '|' + rot;
  if (cache.has(k)) return cache.get(k);
  if (cache.size > 900) cache.clear();
  const alt = b.altura;
  const W = (du + dv) * 12 + 4, H = (du + dv) * 6 + alt + 8;
  const [c, x] = canvas(W, H), [lc, lx] = canvas(W, H);
  const T = [dv * 12 + 2, alt + 4];
  const P = (u, v, z) => [T[0] + (u - v) * 12, T[1] + (u + v) * 6 - z];
  const h1 = hash2(b.bi * 7 + b.sx, b.bj * 7 + b.sy, 501), h2 = hash2(b.bi * 3 + b.sy, b.bj * 5 + b.sx, 502);
  const grama = ['#5f8f4c', '#6a9a52', '#58864a'][Math.floor(h2 * 3)];
  // quintal
  fillPoly(x, [P(0, 0, 0), P(du, 0, 0), P(du, dv, 0), P(0, dv, 0)], grama);
  for (let i = 0; i < 26; i++) { const p = P(hash2(i, 1, b.bi * 9 + b.sx) * du, hash2(i, 2, b.bj * 9 + b.sy) * dv, 0); x.fillStyle = tom(grama, i % 2 ? -0.12 : 0.1); x.fillRect(Math.round(p[0]), Math.round(p[1]), 1, 1); }
  // caminho de pedra até a porta (no meio da face da frente)
  const C = CASA, um = (C.u0 + C.u1) / 2;
  for (let v = C.v1; v < dv - 0.1; v += 0.4) { const p = P(um, v, 0); x.fillStyle = (v * 10) % 2 < 1 ? '#c8b898' : '#b0a080'; x.fillRect(Math.round(p[0]) - 3, Math.round(p[1]) - 1, 6, 2); }
  // cerca dos fundos (atrás da casa)
  const cerca = (ua, va, ub, vb) => {
    const n = Math.max(2, Math.round(Math.hypot(ub - ua, vb - va) * 2.5));
    for (let i = 0; i <= n; i++) { const t = i / n, p = P(ua + (ub - ua) * t, va + (vb - va) * t, 0); x.fillStyle = '#f2efe6'; x.fillRect(Math.round(p[0]), Math.round(p[1]) - 5, 1, 5); }
    const a = P(ua, va, 4), z = P(ub, vb, 4); line(x, a[0], a[1], z[0], z[1], '#d8d2c4');
  };
  cerca(0.1, 0.1, du - 0.1, 0.1); cerca(0.1, 0.1, 0.1, dv - 0.1);
  // a casa: paredes
  const parede = PAREDES_CASA[Math.floor(h1 * PAREDES_CASA.length)], telha = TELHAS[Math.floor(h2 * TELHAS.length)];
  const hb = C.parede, hr = C.parede + C.cumeeira, vm = (C.v0 + C.v1) / 2;
  fillPoly(x, [P(C.u0, C.v1, 0), P(C.u1, C.v1, 0), P(C.u1, C.v1, hb), P(C.u0, C.v1, hb)], parede);                       // frente
  fillPoly(x, [P(C.u1, C.v1, 0), P(C.u1, C.v0, 0), P(C.u1, C.v0, hb), P(C.u1, vm, hr), P(C.u1, C.v1, hb)], tom(parede, -0.22));   // lateral com o oitão
  // telhado: água de trás (aparece um pouco) e água da frente
  fillPoly(x, [P(C.u0 - 0.25, vm, hr), P(C.u1 + 0.25, vm, hr), P(C.u1 + 0.25, C.v0 - 0.3, hb - 1), P(C.u0 - 0.25, C.v0 - 0.3, hb - 1)], tom(telha, -0.25));
  fillPoly(x, [P(C.u0 - 0.25, C.v1 + 0.3, hb - 1), P(C.u1 + 0.25, C.v1 + 0.3, hb - 1), P(C.u1 + 0.25, vm, hr), P(C.u0 - 0.25, vm, hr)], telha);
  for (let u = C.u0; u < C.u1; u += 0.5) { const a = P(u, C.v1 + 0.3, hb - 1), z = P(u, vm, hr); line(x, a[0], a[1], z[0], z[1], tom(telha, -0.12)); }   // fileiras de telha
  { const a = P(C.u0 - 0.25, vm, hr), z = P(C.u1 + 0.25, vm, hr); line(x, a[0], a[1], z[0], z[1], tom(telha, 0.2)); }   // a cumeeira
  if (h1 < 0.45) {   // chaminé
    const cu = C.u0 + 0.8;
    fillPoly(x, [P(cu, vm + 0.6, hr - 4), P(cu + 0.6, vm + 0.6, hr - 4), P(cu + 0.6, vm + 0.6, hr + 4), P(cu, vm + 0.6, hr + 4)], '#8a4a3a');
    fillPoly(x, [P(cu + 0.6, vm + 0.6, hr - 4), P(cu + 0.6, vm, hr - 4), P(cu + 0.6, vm, hr + 4), P(cu + 0.6, vm + 0.6, hr + 4)], '#6a3a2a');
  }
  // porta e janelas (acendem de noite)
  let temLuz = false;
  const janela = (face, a, z, larg, cor, ctx = x) => {
    for (let i = 0; i < larg; i++) { const p = face === 'v' ? P(a + i / 12, C.v1, z) : P(C.u1, a - i / 12, z); ctx.fillStyle = cor; ctx.fillRect(Math.round(p[0]), Math.round(p[1]) - 5, 1, 5); }
  };
  { for (let i = -2; i < 3; i++) { const p = P(um + i / 12, C.v1, 0); x.fillStyle = i === -2 || i === 2 ? '#3a2416' : '#6a3a22'; x.fillRect(Math.round(p[0]), Math.round(p[1]) - 8, 1, 8); } }
  for (const [face, a] of [['v', C.u0 + 0.5], ['v', C.u1 - 1.1], ['u', C.v1 - 1]]) {
    janela(face, a, 4, 6, '#3a4a5a');
    const r = hash2(Math.floor(a * 10), b.bi * 13 + b.bj * 7 + b.sx + b.sy * 3, 503);
    if (r < 0.55) { temLuz = true; lx.globalAlpha = 0.3; janela(face, a - 1 / 12, 5, 8, '#ffd98a', lx); lx.globalAlpha = 1; janela(face, a, 4, 6, '#ffd98a', lx); }
  }
  // cerca da frente (por cima do quintal da frente) e uma árvore no canto
  cerca(du - 0.1, 0.1, du - 0.1, dv - 0.1); cerca(0.1, dv - 0.1, um - 0.45, dv - 0.1); cerca(um + 0.45, dv - 0.1, du - 0.1, dv - 0.1);
  if (h2 < 0.7) {
    const [tu, tv] = h1 < 0.5 ? [0.9, dv - 1] : [du - 1, 0.9], t0 = P(tu, tv, 0), t1 = P(tu, tv, 10);
    line(x, t0[0], t0[1], t1[0], t1[1], '#5a3a22', 2);
    disc(x, t1[0], t1[1] - 3, 6, '#3f7a3a', 0.9); disc(x, t1[0] - 2, t1[1] - 5, 4, '#56954a', 0.9);
  }
  contorno(c);
  const s = { c, ox: T[0], oy: T[1], placa: null, luzes: temLuz ? lc : null };
  cache.set(k, s);
  return s;
}

/* ===================== Prédios ===================== */
// Cores de prédio por bairro
const PALETAS_BAIRRO = {
  residencial: [
    { parede: '#c9a27a', topo: '#9a3a2a', janela: '#3a4a5a' },
    { parede: '#b8c0a0', topo: '#7a3a2a', janela: '#33404c' },
    { parede: '#d8c8a8', topo: '#5a4a6a', janela: '#3a4048' },
    { parede: '#a8b8c8', topo: '#8a4a3a', janela: '#2e3a46' }
  ],
  industrial: [
    { parede: '#7a7a7a', topo: '#4a4a4a', janela: '#2a3038', listras: true },
    { parede: '#8a6a4a', topo: '#5a4a3a', janela: '#2a2a2a', listras: true },
    { parede: '#5a6a72', topo: '#3a4a52', janela: '#1e2428', listras: true }
  ]
};
const PALETAS = [
  { parede: '#8a6a5a', topo: '#5a4a44', janela: '#2a3040' },
  { parede: '#6a7a8a', topo: '#4a5560', janela: '#1e2632' },
  { parede: '#a08a6a', topo: '#6a5a48', janela: '#2a2c34' },
  { parede: '#7a5a6a', topo: '#4e3a46', janela: '#22202a' },
  { parede: '#5a6a5a', topo: '#3e4a40', janela: '#1e2420' },
  { parede: '#9a9a90', topo: '#66665e', janela: '#2a2e36' }
];

// Prédio visto de cima de lado. du, dv = tamanho na vista (casas). alt = altura em pixels.
// porta: { face: 'u' | 'v', a: posição ao longo da face (casas) } ou null.
export function spritePredio(b, du, dv, porta, rot) {
  if (b.casa) return spriteCasa(b, du, dv, rot);
  const k = 'b' + b.id + '|' + rot + '|' + (porta ? porta.face + porta.a : '') + (b.shop ? b.shop.tipo : '');
  if (cache.has(k)) return cache.get(k);
  if (cache.size > 900) cache.clear();
  const alt = b.altura;
  // loja: metade tem o letreiro no telhado (sobre dois postes), metade a placa na fachada da porta
  const letreiroAlto = b.shop && hash2(b.bi * 5 + b.sx, b.bj * 5 + b.sy, 611) < 0.5;
  const topo = letreiroAlto ? 24 : 0;
  const W = (du + dv) * 12 + 4, H = (du + dv) * 6 + alt + 8 + topo;
  const [c, x] = canvas(W, H);
  const T = [dv * 12 + 2, alt + 4 + topo];
  const P = (u, v, z) => [T[0] + (u - v) * 12, T[1] + (u + v) * 6 - z];
  const lista = PALETAS_BAIRRO[b.bairro] || PALETAS;
  const pal = lista[b.paleta % lista.length];
  const shop = b.shop;
  const parede = shop ? tom(shop.cor, -0.35) : pal.parede;
  const esq = parede, dir = tom(parede, -0.28);
  // faces
  fillPoly(x, [P(0, dv, 0), P(du, dv, 0), P(du, dv, alt), P(0, dv, alt)], esq);
  fillPoly(x, [P(du, dv, 0), P(du, 0, 0), P(du, 0, alt), P(du, dv, alt)], dir);
  // telhado com mureta
  fillPoly(x, [P(0, 0, alt), P(du, 0, alt), P(du, dv, alt), P(0, dv, alt)], tom(pal.topo, b.ruina ? -0.2 : 0));
  fillPoly(x, [P(0.35, 0.35, alt), P(du - 0.35, 0.35, alt), P(du - 0.35, dv - 0.35, alt), P(0.35, dv - 0.35, alt)], tom(pal.topo, -0.18));
  // caixa d'água / ar-condicionado e chaminé: numa camada à parte (teto), que o render só desenha quando o prédio
  // está opaco; com o prédio transparente (na frente do herói) elas somem por completo
  const hh = hash2(b.bi * 7 + b.sx, b.bj * 7 + b.sy, 77);
  const temTeto = !shop;
  const [tc, tx] = temTeto ? canvas(W, H) : [null, null];
  if (!shop) {
    const u0 = 1.5 + hh * 2, v0 = 1.5 + (1 - hh) * 2;
    fillPoly(tx, [P(u0, v0 + 1.2, alt), P(u0 + 1.2, v0 + 1.2, alt), P(u0 + 1.2, v0 + 1.2, alt + 6), P(u0, v0 + 1.2, alt + 6)], '#7a7a80');
    fillPoly(tx, [P(u0 + 1.2, v0 + 1.2, alt), P(u0 + 1.2, v0, alt), P(u0 + 1.2, v0, alt + 6), P(u0 + 1.2, v0 + 1.2, alt + 6)], '#5a5a60');
    fillPoly(tx, [P(u0, v0, alt + 6), P(u0 + 1.2, v0, alt + 6), P(u0 + 1.2, v0 + 1.2, alt + 6), P(u0, v0 + 1.2, alt + 6)], '#9a9aa0');
  }
  if (pal.listras) { // galpão: chapa ondulada
    for (let a2 = 0.25; a2 < du; a2 += 0.25) { const p0 = P(a2, dv, 0), p1 = P(a2, dv, alt); line(x, p0[0], p0[1], p1[0], p1[1], tom(esq, -0.12)); }
    for (let a2 = 0.25; a2 < dv; a2 += 0.25) { const p0 = P(du, a2, 0), p1 = P(du, a2, alt); line(x, p0[0], p0[1], p1[0], p1[1], tom(dir, -0.12)); }
  }
  if (b.bairro === 'residencial' && !shop) { // chaminé
    const u0 = 1 + hh * 3, v0 = 1;
    fillPoly(tx, [P(u0, v0 + 0.8, alt), P(u0 + 0.8, v0 + 0.8, alt), P(u0 + 0.8, v0 + 0.8, alt + 9), P(u0, v0 + 0.8, alt + 9)], '#8a4a3a');
    fillPoly(tx, [P(u0 + 0.8, v0 + 0.8, alt), P(u0 + 0.8, v0, alt), P(u0 + 0.8, v0, alt + 9), P(u0 + 0.8, v0 + 0.8, alt + 9)], '#6a3a2a');
  }
  // janelas
  // luzes: só as janelas acesas de noite (camada que brilha por cima do escuro: render.js → luz)
  const [lc, lx] = canvas(W, H);
  let temLuz = false;
  const janela = (face, a, z, cor, ctx = x) => {
    for (let i = 0; i < 4; i++) {
      const p = face === 'v' ? P(a + i / 12, dv, z) : P(du, a - i / 12 + 0.33, z);
      ctx.fillStyle = cor; ctx.fillRect(Math.round(p[0]) + (face === 'v' ? 0 : 0), Math.round(p[1]) - 6, 1, 6);
    }
  };
  const acesa = (face, a, z, cor) => {
    temLuz = true;
    lx.globalAlpha = 0.28; janela(face, a - 1 / 12, z + 1, cor, lx); janela(face, a + 1 / 12, z + 1, cor, lx);   // brilho em volta
    lx.globalAlpha = 1; janela(face, a, z, cor, lx);
  };
  const andarTerreo = 16;
  for (const face of ['v', 'u']) {
    const comp = face === 'v' ? du : dv;
    for (let z = andarTerreo + 4; z < alt - 6; z += 12) {
      for (let a = 0.7; a < comp - 0.5; a += 1.25) {
        const r = hash2(Math.floor(a * 10) + z * 3, b.bi * 31 + b.bj * 17 + b.sx * 5 + b.sy + (face === 'u' ? 999 : 0), 91);
        const cor = b.ruina && r < 0.4 ? '#141414' : r < 0.12 ? '#e8c86a' : r < 0.2 ? '#3a4a5a' : pal.janela;
        janela(face, a, z, cor);
        // de noite, umas 3 em cada 10 janelas ficam acesas (as amarelas de dia, sempre); prédio em ruína fica apagado
        const r2 = hash2(Math.floor(a * 10) + z * 7, b.bi * 13 + b.bj * 29 + b.sx * 3 + b.sy + (face === 'u' ? 555 : 0), 93);
        if (!b.ruina && (r < 0.12 || r2 < 0.24)) acesa(face, a, z, r2 < 0.05 ? '#bfe0ff' : '#ffd98a');   // umas com luz de TV (azulada)
      }
    }
  }
  // térreo: lojas têm vitrine e toldo; prédios comuns, portinhas
  for (const face of ['v', 'u']) {
    const comp = face === 'v' ? du : dv;
    if (shop) {
      for (let a = 0.5; a < comp - 0.5; a += 0.5) { janela(face, a, 4, a % 1 ? '#bfe0e8' : '#8fb8c8'); if (!b.ruina) acesa(face, a, 4, '#e8f8ff'); }   // vitrine acesa de noite
      // toldo listrado
      for (let a = 0; a < comp; a += 0.5) {
        const p0 = face === 'v' ? P(a, dv, 15) : P(du, a, 15), p1 = face === 'v' ? P(a + 0.5, dv, 15) : P(du, a + 0.5, 15);
        fillPoly(x, [p0, p1, [p1[0] + (face === 'v' ? -3 : 3), p1[1] + 4], [p0[0] + (face === 'v' ? -3 : 3), p0[1] + 4]], (a * 2) % 2 ? '#f2f2f2' : shop.cor);
      }
    } else {
      const a = 1 + hh * (comp - 3);
      janela(face, a, 4, '#3a2a20'); janela(face, a + 0.35, 4, '#3a2a20');
    }
  }
  if (porta) {
    const a = porta.a;
    for (let i = -6; i < 6; i++) {
      const p = porta.face === 'v' ? P(a + i / 12, dv, 0) : P(du, a - i / 12, 0);
      x.fillStyle = i === -6 || i === 5 ? '#1a1410' : '#3a2416'; x.fillRect(Math.round(p[0]), Math.round(p[1]) - 13, 1, 13);
    }
  }
  if (b.ruina) { // rachaduras e fuligem
    x.fillStyle = 'rgba(10,10,10,0.5)';
    for (let i = 0; i < 18; i++) { const p = P(hash2(i, 3, b.bi) * du, dv, hash2(i, 4, b.bj) * alt); x.fillRect(Math.round(p[0]), Math.round(p[1]), 2, 1); }
  }
  // placa: no telhado (letreiro sobre dois postes, paralelo à face da esquerda) ou na fachada, em cima da porta,
  // inclinada na direção da face. Acende de noite (camada de luzes).
  if (shop) {
    const nome = shop.nome.toUpperCase(), w = largTexto(nome) + 14;
    if (letreiroAlto) {
      const meio = P(du * 0.5, dv * 0.5, alt), x0 = Math.round(meio[0] - w / 2), y0 = Math.round(meio[1] - 20 - w / 4);
      x.fillStyle = '#2a2a2a';
      for (const k of [0.2, 0.8]) { const px = Math.round(x0 + w * k), py = y0 + Math.floor(w * k * 0.5) + 9; x.fillRect(px, py, 2, Math.round(meio[1]) - py + Math.round(Math.abs(k - 0.5) * 6)); }
      placaPixel(x, shop, x0, y0, 0.5);
      lx.globalAlpha = 0.85; placaPixel(lx, shop, x0, y0, 0.5, false); lx.globalAlpha = 1; temLuz = true;
    } else {
      const face = porta?.face || 'v', comp = face === 'v' ? du : dv;
      const z = Math.min(alt - 3, 26), meioA = porta ? porta.a : comp / 2;
      if (face === 'v') { const p0 = P(Math.max(0.1, meioA - w / 24), dv, z); placaPixel(x, shop, Math.round(p0[0]), Math.round(p0[1]), 0.5); lx.globalAlpha = 0.85; placaPixel(lx, shop, Math.round(p0[0]), Math.round(p0[1]), 0.5, false); }
      else { const p0 = P(du, Math.min(dv - 0.1, meioA + w / 24), z); placaPixel(x, shop, Math.round(p0[0]), Math.round(p0[1]), -0.5); lx.globalAlpha = 0.85; placaPixel(lx, shop, Math.round(p0[0]), Math.round(p0[1]), -0.5, false); }
      lx.globalAlpha = 1; temLuz = true;
    }
  }
  // arestas
  line(x, ...P(0, dv, 0), ...P(0, dv, alt), tom(esq, 0.12));
  line(x, ...P(du, dv, 0), ...P(du, dv, alt), tom(esq, 0.2));
  const s = { c, teto: tc, ox: T[0], oy: T[1], placa: null, luzes: temLuz ? lc : null };
  cache.set(k, s);
  return s;
}

// Parede do fundo de uma sala (vista r=0): face 'v' = parede de cima (y=0), face 'u' = parede da esquerda (x=0)
export function spriteParedeSala(w, h, estilo, saidaX) {
  const k = 'sala' + w + h + estilo + saidaX;
  if (cache.has(k)) return cache.get(k);
  const alt = 46;
  const W = (w + h) * 12 + 4, H = (w + h) * 6 + alt + 6;
  const [c, x] = canvas(W, H);
  const T = [h * 12 + 2, alt + 3];
  const P = (u, v, z) => [T[0] + (u - v) * 12, T[1] + (u + v) * 6 - z];
  const cor = estilo === 'azulejo' ? '#dfe8ea' : estilo === 'concreto' ? '#8a8a86' : '#c9b48a';
  // parede de cima (ao longo de u, em v=0): mostra a face que olha pra +v
  fillPoly(x, [P(0, 0, 0), P(w, 0, 0), P(w, 0, alt), P(0, 0, alt)], tom(cor, -0.1));
  // parede da esquerda (ao longo de v, em u=0)
  fillPoly(x, [P(0, h, 0), P(0, 0, 0), P(0, 0, alt), P(0, h, alt)], tom(cor, -0.3));
  // rodapé
  fillPoly(x, [P(0, 0, 0), P(w, 0, 0), P(w, 0, 3), P(0, 0, 3)], tom(cor, -0.45));
  fillPoly(x, [P(0, h, 0), P(0, 0, 0), P(0, 0, 3), P(0, h, 3)], tom(cor, -0.5));
  // janelas altas
  for (let a = 1.5; a < w - 1; a += 3) for (let i = 0; i < 18; i++) { const p = P(a + i / 12, 0, 24); x.fillStyle = '#2a3442'; x.fillRect(Math.round(p[0]), Math.round(p[1]) - 10, 1, 10); }
  // porta dos fundos (saída)
  for (let i = -8; i < 8; i++) {
    const p = P(saidaX + i / 12, 0, 0);
    x.fillStyle = i === -8 || i === 7 ? '#14100c' : '#2e5a2e'; x.fillRect(Math.round(p[0]), Math.round(p[1]) - 20, 1, 20);
  }
  const s = { c, ox: T[0], oy: T[1], alt };
  cache.set(k, s);
  return s;
}

// Fonte da praça (3x3): bacia de pedra com água e um jato no meio
export function spriteFonte() {
  if (cache.has('fonte')) return cache.get('fonte');
  const w = 3, h = 3, alt = 8;
  const W = (w + h) * 12 + 4, H = (w + h) * 6 + alt + 24;
  const [c, x] = canvas(W, H);
  const T = [h * 12 + 2, alt + 21];
  const P = (u, v, z) => [T[0] + (u - v) * 12, T[1] + (u + v) * 6 - z];
  fillPoly(x, [P(0, h, 0), P(w, h, 0), P(w, h, alt), P(0, h, alt)], '#9a968c');
  fillPoly(x, [P(w, h, 0), P(w, 0, 0), P(w, 0, alt), P(w, h, alt)], '#7a766c');
  fillPoly(x, [P(0, 0, alt), P(w, 0, alt), P(w, h, alt), P(0, h, alt)], '#b4b0a6');
  fillPoly(x, [P(0.4, 0.4, alt), P(w - 0.4, 0.4, alt), P(w - 0.4, h - 0.4, alt), P(0.4, h - 0.4, alt)], '#3a7aa8');
  fillPoly(x, [P(0.6, 0.6, alt), P(w - 0.6, 0.6, alt), P(w - 0.6, h - 0.6, alt), P(0.6, h - 0.6, alt)], '#4a8ab8');
  const [mx, my] = P(1.5, 1.5, alt);
  x.fillStyle = '#9a968c'; x.fillRect(mx - 2, my - 10, 4, 10);
  x.fillStyle = '#bfe8ff'; x.fillRect(mx - 1, my - 18, 2, 8); x.fillRect(mx - 4, my - 13, 2, 2); x.fillRect(mx + 2, my - 13, 2, 2);
  contorno(c);
  const s = { c, ox: T[0], oy: T[1] };
  cache.set('fonte', s);
  return s;
}

export function spriteMovel(tipo, w, h, v = 0) {
  const k = 'm' + tipo + w + h + v;
  if (cache.has(k)) return cache.get(k);
  const alt = { prateleira: 18, bancada: 9, mesa: 8, maca: 7, balcao: 11, sofa: 7, maquina: 16 }[tipo] || 10;
  const W = (w + h) * 12 + 4, H = (w + h) * 6 + alt + 6;
  const [c, x] = canvas(W, H);
  const T = [h * 12 + 2, alt + 3];
  const P = (u, vv, z) => [T[0] + (u - vv) * 12, T[1] + (u + vv) * 6 - z];
  const base = { prateleira: '#8a6a4a', bancada: '#6a4a2a', mesa: '#7a6a5a', maca: '#d8d8e0', balcao: '#5a5a6a', sofa: ['#7a4a5a', '#4a5a7a', '#5a6a4a', '#8a6a3a'][v % 4], maquina: '#6a6a72' }[tipo] || '#7a6a5a';
  const m = 0.08;
  fillPoly(x, [P(m, h - m, 0), P(w - m, h - m, 0), P(w - m, h - m, alt), P(m, h - m, alt)], tom(base, -0.05));
  fillPoly(x, [P(w - m, h - m, 0), P(w - m, m, 0), P(w - m, m, alt), P(w - m, h - m, alt)], tom(base, -0.3));
  fillPoly(x, [P(m, m, alt), P(w - m, m, alt), P(w - m, h - m, alt), P(m, h - m, alt)], tom(base, 0.15));
  if (tipo === 'prateleira') {
    const cores = ['#d33b2c', '#3b8ad3', '#f2c94c', '#5fc46b', '#e8e8e8', '#c96bd3'];
    for (const z of [4, 10, 16]) for (let i = 0; i < 10; i += 2) {
      const p = P(m + i / 12 + 0.05, h - m, z);
      x.fillStyle = cores[(i + z + v) % 6]; x.fillRect(Math.round(p[0]), Math.round(p[1]) - 3, 2, 3);
    }
  }
  if (tipo === 'maquina') { // faixas amarelas e preta + luz
    for (let i = 0; i < 10; i += 2) { const p = P(m + i / 12, h - m, 4); x.fillStyle = (i / 2) % 2 ? '#1a1a1a' : '#f2c230'; x.fillRect(Math.round(p[0]), Math.round(p[1]) - 3, 2, 3); }
    const q = P(w * 0.5, h * 0.5, alt); x.fillStyle = v % 2 ? '#ff4a3a' : '#6aff7a'; x.fillRect(Math.round(q[0]) - 1, Math.round(q[1]) - 2, 2, 2);
  }
  if (tipo === 'sofa') { const p = P(0.2, h - m, alt); x.fillStyle = tom(base, 0.25); x.fillRect(Math.round(p[0]), Math.round(p[1]) - 3, 10, 3); }
  if (tipo === 'maca') { const p = P(0.3, 0.3, alt); x.fillStyle = '#f5f5f8'; x.fillRect(Math.round(p[0]) - 2, Math.round(p[1]), 6, 3); }
  contorno(c);
  const s = { c, ox: T[0], oy: T[1] };
  cache.set(k, s);
  return s;
}
