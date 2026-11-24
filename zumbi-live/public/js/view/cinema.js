// ============================================================================
//  CINEMA — as cenas de filme da história (historia/HISTORIA.md, seção 5: identidade visual).
//  Pixel art feita em código, 320 x 200, ampliada sem suavizar; só legenda e som ambiente.
//  O jogo é em pé: a cena aparece como uma faixa de cinema no meio da tela (index.html → .cinema).
//  Capítulos (CAPS): a abertura do entregador ("A tarifa 5×") e a queda da moto ("A poça") já tocam no
//  jogo; os outros (Vó primeiro, farmácia, corrida, condomínio, o fim da linha) estão prontos para entrar.
//  Protótipo original (com o roteiro): historia/prototipos/moto22.html
//  Quem manda no tempo é o jogo (core/prologo.js → g.prologo.t); aqui só se desenha o quadro daquele tempo.
// ============================================================================
import { retrato } from './retratos.js';

/* =========================================================================
   Pixel art feita em código: 320 x 200 px, ampliada sem suavizar.
   ========================================================================= */
const W = 320, H = 200;
let ctx = null;   // o canvas do cinema (Cinema, no fim do arquivo)
const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return [c, c.getContext('2d')]; };
const rnd = seed => { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const th = (x, y) => (BAY[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
const P = (x, col, X, Y) => { x.fillStyle = col; x.fillRect(X | 0, Y | 0, 1, 1); };
const R = (x, col, X, Y, w, h) => { x.fillStyle = col; x.fillRect(Math.round(X), Math.round(Y), Math.round(w), Math.round(h)); };
// degradê com pontilhado (dithering ordenado): f(X, Y) devolve 0..1 ao longo das cores
function G(x, X0, Y0, w, h, cores, f) {
  const n = cores.length - 1;
  for (let Y = Y0; Y < Y0 + h; Y++) for (let X = X0; X < X0 + w; X++) {
    const v = Math.max(0, Math.min(0.9999, f(X, Y))) * n;
    let i = Math.floor(v); if (v - i > th(X, Y)) i++;
    x.fillStyle = cores[Math.min(n, i)]; x.fillRect(X, Y, 1, 1);
  }
}
// luz pontilhada: quanto mais perto do centro, mais pontos acesos
function brilho(x, cx, cy, r, cor, dens = 1, sy = 1) {
  x.fillStyle = cor;
  for (let Y = Math.floor(cy - r * sy); Y <= cy + r * sy; Y++) for (let X = Math.floor(cx - r); X <= cx + r; X++) {
    const dx = (X - cx) / r, dy = (Y - cy) / (r * sy), d = Math.sqrt(dx * dx + dy * dy);
    if (d >= 1) continue;
    if ((1 - d) * (1 - d) * dens > th(X, Y)) x.fillRect(X, Y, 1, 1);
  }
}
function disco(x, cx, cy, r, cor) { x.fillStyle = cor; for (let Y = -r; Y <= r; Y++) { const w = Math.floor(Math.sqrt(r * r - Y * Y)); x.fillRect(Math.round(cx - w), Math.round(cy + Y), w * 2 + 1, 1); } }
function linha(x, cor, x0, y0, x1, y1) {
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy;
  x.fillStyle = cor;
  for (;;) { x.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } }
}
function fio(x, cor, x0, y0, x1, y1, barriga) { let px = x0, py = y0; for (let i = 1; i <= 30; i++) { const t = i / 30, X = x0 + (x1 - x0) * t, Y = y0 + (y1 - y0) * t + barriga * 4 * t * (1 - t); linha(x, cor, px, py, X, Y); px = X; py = Y; } }

// fonte 3x5 (a mesma do jogo, com números e sinais)
const FONTE = {
  A: ['010', '101', '111', '101', '101'], B: ['110', '101', '110', '101', '110'], C: ['011', '100', '100', '100', '011'], D: ['110', '101', '101', '101', '110'],
  E: ['111', '100', '110', '100', '111'], F: ['111', '100', '110', '100', '100'], G: ['011', '100', '101', '101', '011'], H: ['101', '101', '111', '101', '101'],
  I: ['111', '010', '010', '010', '111'], J: ['001', '001', '001', '101', '010'], K: ['101', '101', '110', '101', '101'], L: ['100', '100', '100', '100', '111'],
  M: ['101', '111', '111', '101', '101'], N: ['110', '101', '101', '101', '101'], O: ['010', '101', '101', '101', '010'], P: ['110', '101', '110', '100', '100'],
  Q: ['010', '101', '101', '110', '011'], R: ['110', '101', '110', '101', '101'], S: ['011', '100', '010', '001', '110'], T: ['111', '010', '010', '010', '010'],
  U: ['101', '101', '101', '101', '111'], V: ['101', '101', '101', '101', '010'], W: ['101', '101', '111', '111', '101'], X: ['101', '101', '010', '101', '101'],
  Y: ['101', '101', '010', '010', '010'], Z: ['111', '001', '010', '100', '111'], ' ': ['000', '000', '000', '000', '000'],
  0: ['111', '101', '101', '101', '111'], 1: ['010', '110', '010', '010', '111'], 2: ['111', '001', '111', '100', '111'], 3: ['111', '001', '011', '001', '111'],
  4: ['101', '101', '111', '001', '001'], 5: ['111', '100', '111', '001', '111'], 6: ['111', '100', '111', '101', '111'], 7: ['111', '001', '010', '010', '010'],
  8: ['111', '101', '111', '101', '111'], 9: ['111', '101', '111', '001', '111'], $: ['011', '110', '010', '011', '110'], ',': ['000', '000', '000', '010', '100'],
  '.': ['000', '000', '000', '000', '010'], ':': ['000', '010', '000', '010', '000'], '!': ['010', '010', '010', '000', '010'], '-': ['000', '000', '111', '000', '000'],
  '%': ['101', '001', '010', '100', '101'], '/': ['001', '001', '010', '100', '100'], '?': ['111', '001', '011', '000', '010']
};
function texto(x, s, X, Y, cor, esc = 1) {
  x.fillStyle = cor; let cx = 0;
  for (const ch of s.toUpperCase()) {
    const base = ch.normalize('NFD').replace(/[̀-ͯ]/g, '');
    const gl = FONTE[base] || FONTE[' '];
    const p = (c, r) => x.fillRect(X + (cx + c) * esc, Y + r * esc, esc, esc);
    gl.forEach((ln, r) => { for (let c = 0; c < 3; c++) if (ln[c] === '1') p(c, r); });
    if (/[ÁÉÍÓÚ]/.test(ch)) p(2, -1); else if (/[ÃÕ]/.test(ch)) { p(0, -1); p(1, -2); p(2, -1); } else if (/[ÂÊÔ]/.test(ch)) { p(0, -1); p(2, -1); p(1, -2); } else if (ch === 'Ç') p(1, 5);
    cx += 4;
  }
}
const largura = s => s.length * 4 - 1;

/* ------------------------------ peças ------------------------------ */
const PAREDES = [
  { w: '#4a2620', l: '#5e3226', d: '#341a16', m: '#2a1612' },   // tijolo
  { w: '#55302a', l: '#6b3c2e', d: '#3a1f1a', m: '#2c1814' },
  { w: '#34343e', l: '#42424e', d: '#24242c', m: '#2a2a32' },   // bloco sem reboco
  { w: '#4a3040', l: '#5a3a4c', d: '#33212c', m: '#3a2632' },   // pintada de rosa
  { w: '#2b4446', l: '#365458', d: '#1e3032', m: '#243a3c' },   // verde-água
  { w: '#584a2a', l: '#6a5a34', d: '#3c321c', m: '#463a20' }    // amarelo queimado
];
// uma casa da comunidade: parede (tijolo, bloco ou pintada), lateral, laje, caixa d'água, vergalhão, janela acesa ou não
function casa(x, r, X, Y, w, h, nevoa, janelas) {
  const p = PAREDES[Math.floor(r() * PAREDES.length)];
  R(x, p.w, X, Y, w, h);
  if (p === PAREDES[0] || p === PAREDES[1] || p === PAREDES[2]) for (let yy = Y + 2; yy < Y + h; yy += 3) for (let xx = X + ((yy / 3 | 0) % 2) * 2; xx < X + w; xx++) if ((xx - X) % 4 !== 3 || r() < 0.5) P(x, p.m, xx, yy);
  for (let i = 0; i < w * h / 7; i++) P(x, r() < 0.5 ? p.d : p.l, X + Math.floor(r() * w), Y + Math.floor(r() * h));
  R(x, p.d, X + w, Y + 1, 3, h - 1); R(x, '#141018', X + w + 2, Y + 1, 1, h - 1);
  R(x, '#3d3a44', X - 1, Y - 2, w + 4, 2); R(x, '#57535f', X - 1, Y - 2, w + 4, 1);
  if (r() < 0.45) { const cx = X + 2 + Math.floor(r() * Math.max(1, w - 8)); R(x, '#1d3f5e', cx, Y - 7, 6, 5); R(x, '#2c5a82', cx, Y - 7, 6, 1); R(x, '#16304a', cx + 5, Y - 6, 1, 4); }
  if (r() < 0.4) for (let k = 0; k < 3; k++) R(x, '#2a2624', X + 1 + k * 2 + Math.floor(r() * 3), Y - 4 - Math.floor(r() * 2), 1, 3);
  if (r() < 0.3) { R(x, '#24222a', X + 2, Y - 9, 1, 7); R(x, '#24222a', X, Y - 9, 5, 1); }   // antena
  const nj = Math.max(1, Math.floor(w / 8));
  for (let jy = Y + 3; jy === Y + 3 || jy + 5 < Y + h - 7; jy += 12) for (let k = 0; k < nj; k++) {
    const jx = X + 2 + k * Math.floor(w / nj);
    if (jx + 4 > X + w) break;
    const acesa = r() < (janelas ?? 0.35), grande = h > 24;
    const jw = grande ? 6 : 4, jh = grande ? 5 : 3;
    R(x, '#121018', jx - 1, jy - 1, jw + 2, jh + 2);
    if (acesa) { R(x, r() < 0.2 ? '#6fb6c8' : '#d59646', jx, jy, jw, jh); P(x, '#ffd890', jx + 1, jy + 1); if (grande) { R(x, '#8a3a2a', jx, jy, 2, jh); R(x, '#3a2418', jx + 3, jy + 2, 2, jh - 2); } }
    else { R(x, '#1a1a24', jx, jy, jw, jh); if (grande) R(x, '#2a2a36', jx, jy, jw, 1); }
    if (grande) R(x, '#2e2c34', jx - 2, jy + jh + 1, jw + 4, 1);   // peitoril
    if (acesa) (x._luzes ||= []).push([jx + jw / 2, jy + 1]);
  }
  if (r() < 0.5) R(x, '#100e14', X + w - 5, Y + h - 6, 3, 6);
  if (nevoa > 0) R(x, `rgba(10,10,26,${nevoa})`, X - 1, Y - 10, w + 4, h + 10);
}
// moto de lado (virada pra direita) com o entregador olhando o celular; my = chão
function motoLado(x, mx, my, o = {}) {
  for (const wx of [mx - 20, mx + 22]) {
    disco(x, wx, my - 8, 8, '#0a0a0e'); disco(x, wx, my - 8, 6, '#1c1c24'); disco(x, wx, my - 8, 4, '#0e0e12'); disco(x, wx, my - 8, 2, '#4a4a56'); P(x, '#9a9aa8', wx, my - 8);
    for (let k = 3.5; k < 5.3; k += 0.12) P(x, '#3a3a48', wx + Math.cos(k) * 7, my - 8 + Math.sin(k) * 7);
    for (let k = 0; k < 6; k++) { const q = k * Math.PI / 3; P(x, '#26262e', wx + Math.cos(q) * 3, my - 8 + Math.sin(q) * 3); }
  }
  linha(x, '#3a3a44', mx - 20, my - 8, mx - 6, my - 14); linha(x, '#2a2a34', mx - 20, my - 9, mx - 6, my - 15);   // balança
  R(x, '#24242c', mx - 30, my - 15, 16, 3); R(x, '#5a5a66', mx - 30, my - 15, 16, 1); R(x, '#14141a', mx - 31, my - 14, 1, 2);   // escapamento
  R(x, '#1e1e26', mx - 8, my - 19, 15, 10); R(x, '#2e2e38', mx - 7, my - 18, 4, 3); R(x, '#3a3a46', mx - 2, my - 17, 1, 6); R(x, '#14141a', mx - 8, my - 10, 15, 1);   // motor
  linha(x, '#5a5a66', mx + 22, my - 8, mx + 15, my - 30); linha(x, '#33333d', mx + 21, my - 8, mx + 14, my - 30);   // garfo
  R(x, '#4a1612', mx - 16, my - 23, 30, 5); R(x, '#6a2620', mx - 14, my - 26, 26, 4); R(x, '#8a3226', mx - 1, my - 29, 15, 4); R(x, '#c8583a', mx + 1, my - 29, 11, 1); R(x, '#2a0c0a', mx - 16, my - 18, 30, 1);
  R(x, '#121216', mx - 19, my - 28, 19, 3); R(x, '#26262c', mx - 19, my - 28, 19, 1);   // banco
  R(x, '#6a2620', mx + 16, my - 33, 8, 6); R(x, '#8a3226', mx + 16, my - 33, 8, 1); R(x, '#e8d9a0', mx + 22, my - 31, 3, 3); P(x, '#fff6d8', mx + 23, my - 30);   // farol
  R(x, '#2a2a32', mx + 9, my - 37, 9, 2); R(x, '#18181e', mx + 16, my - 38, 3, 2);   // guidão
  R(x, '#2a2a30', mx - 30, my - 29, 14, 2);   // bagageiro
  const bx = mx - 34, by = my - 52;   // o baú de entrega
  R(x, '#9a4a1e', bx, by, 21, 23); R(x, '#c8642a', bx, by, 19, 22); R(x, '#e0884a', bx, by, 19, 1); R(x, '#e0884a', bx, by, 1, 22); R(x, '#7a3a16', bx + 19, by + 1, 2, 22); R(x, '#5a2a10', bx + 1, by + 21, 18, 1);
  R(x, '#f4e0c0', bx + 5, by + 7, 9, 1); R(x, '#f4e0c0', bx + 7, by + 9, 5, 5); R(x, '#c8642a', bx + 9, by + 11, 1, 2); R(x, '#d8d0b8', bx + 2, by + 18, 15, 1);
  if (o.bau === 'aberto') { R(x, '#3a1a08', bx + 1, by + 1, 17, 3); R(x, '#c8642a', bx - 3, by - 7, 22, 3); R(x, '#e0884a', bx - 3, by - 7, 22, 1); }
  if (o.piloto === false) return;
  R(x, '#161a26', mx - 13, my - 32, 17, 6); R(x, '#222a3c', mx - 13, my - 32, 17, 1); R(x, '#161a26', mx + 1, my - 28, 5, 13);   // perna
  R(x, '#0e0e14', mx + 1, my - 16, 9, 3); R(x, '#30303a', mx + 1, my - 14, 9, 1);   // tênis
  R(x, '#1e2a42', mx - 15, my - 52, 14, 22); R(x, '#2c3c5c', mx - 15, my - 52, 3, 21); R(x, '#141c2e', mx - 3, my - 50, 2, 20); R(x, '#8a96a8', mx - 15, my - 42, 14, 2);   // jaqueta com faixa refletiva
  R(x, '#1e2a42', mx - 4, my - 42, 11, 3); R(x, '#1e2a42', mx + 6, my - 41, 5, 3); R(x, '#8d5a3b', mx + 11, my - 40, 3, 3);   // braço no guidão
  if (o.fone !== false) {
  R(x, '#1e2a42', mx - 5, my - 52, 4, 8); R(x, '#1e2a42', mx - 2, my - 56, 4, 6); R(x, '#8d5a3b', mx + 1, my - 59, 3, 3);   // braço erguido
  R(x, '#0e1418', mx + 3, my - 63, 3, 6); R(x, '#bff6ff', mx + 3, my - 62, 1, 4);   // celular
  } else { R(x, '#141c2e', mx - 6, my - 45, 14, 3); R(x, '#6a4230', mx + 8, my - 44, 3, 3); }   // as duas mãos no guidão
  disco(x, mx - 8, my - 60, 8, '#121218'); disco(x, mx - 9, my - 61, 6, '#1a1a22'); R(x, '#30303c', mx - 14, my - 66, 5, 2); P(x, '#4a4a58', mx - 13, my - 66);
  if (o.fone !== false) { R(x, '#1a6a78', mx - 3, my - 63, 5, 5); R(x, '#2ad4e6', mx - 2, my - 62, 4, 3); R(x, '#a8f4ff', mx - 1, my - 62, 2, 1); }   // viseira refletindo o celular
  else { R(x, '#1a2a3a', mx - 3, my - 63, 5, 5); R(x, '#5a7a9a', mx - 1, my - 62, 2, 1); }
  R(x, '#121218', mx - 11, my - 53, 7, 2);
}
// moto vista de trás, de perto (cena da bifurcação, por cima do ombro); by = chão
function motoCostas(x, cx, by) {
  R(x, '#0a0a0e', cx - 5, by - 22, 10, 22); R(x, '#1c1c24', cx - 4, by - 21, 2, 21); R(x, '#24242c', cx + 2, by - 21, 1, 21);   // pneu
  R(x, '#3a120e', cx - 8, by - 31, 16, 8); R(x, '#5a1e1a', cx - 8, by - 32, 16, 2);   // para-lama
  R(x, '#8a8a7a', cx - 7, by - 25, 14, 7); R(x, '#5a5a4e', cx - 7, by - 19, 14, 1); texto(x, 'KAU', cx - 5, by - 24, '#2a2a24');   // placa
  R(x, '#5a0e0e', cx - 6, by - 35, 12, 3);   // lanterna (acende no quadro)
  R(x, '#2a2a30', cx - 13, by - 39, 26, 5); R(x, '#3a3a44', cx - 13, by - 39, 26, 1);
  R(x, '#24242c', cx + 10, by - 31, 6, 10); R(x, '#4a4a56', cx + 10, by - 31, 1, 10);   // escapamento
  R(x, '#161a26', cx - 20, by - 46, 7, 23); R(x, '#222a3c', cx - 20, by - 46, 1, 23); R(x, '#161a26', cx + 13, by - 46, 7, 23); R(x, '#10131c', cx + 19, by - 46, 1, 23);   // pernas
  R(x, '#0e0e14', cx - 22, by - 24, 9, 4); R(x, '#30303a', cx - 22, by - 21, 9, 1); R(x, '#0e0e14', cx + 13, by - 24, 9, 4); R(x, '#30303a', cx + 13, by - 21, 9, 1);
  const bx = cx - 16, bt = by - 72;   // o baú
  R(x, '#9a4a1e', bx, bt, 32, 31); R(x, '#c8642a', bx, bt, 30, 29); R(x, '#e0884a', bx, bt, 30, 1); R(x, '#e0884a', bx, bt, 1, 29); R(x, '#7a3a16', bx + 30, bt + 1, 2, 30); R(x, '#5a2a10', bx, bt + 29, 32, 2);
  R(x, '#f4e0c0', bx + 9, bt + 9, 14, 2); R(x, '#f4e0c0', bx + 12, bt + 12, 8, 7); R(x, '#c8642a', bx + 15, bt + 14, 2, 3); R(x, '#d8d0b8', bx + 2, bt + 25, 27, 1);
  for (let k = 0; k < 18; k++) P(x, '#a8501e', bx + 2 + Math.floor(Math.random() * 27), bt + 2 + Math.floor(Math.random() * 22));   // desgaste
  R(x, '#1e2a42', cx - 18, by - 89, 36, 18); R(x, '#2c3c5c', cx - 18, by - 89, 36, 2); R(x, '#141c2e', cx + 14, by - 87, 4, 16); R(x, '#8a96a8', cx - 18, by - 80, 36, 2);   // ombros e a faixa refletiva
  R(x, '#1e2a42', cx - 22, by - 85, 5, 24); R(x, '#141c2e', cx + 17, by - 85, 5, 24); R(x, '#8d5a3b', cx - 22, by - 62, 4, 3); R(x, '#6a4230', cx + 18, by - 62, 4, 3);   // braços
  R(x, '#2a2a32', cx - 28, by - 61, 7, 2); R(x, '#2a2a32', cx + 21, by - 61, 7, 2); R(x, '#1a1a22', cx - 28, by - 74, 2, 13); R(x, '#1a1a22', cx + 26, by - 74, 2, 13);   // guidão e retrovisores
  R(x, '#3a4a5a', cx - 31, by - 77, 6, 3); R(x, '#5a7088', cx - 31, by - 77, 6, 1); R(x, '#3a4a5a', cx + 25, by - 77, 6, 3); R(x, '#5a7088', cx + 25, by - 77, 6, 1);
  R(x, '#141c2e', cx - 5, by - 93, 10, 5);
  disco(x, cx, by - 103, 11, '#121218'); disco(x, cx - 1, by - 104, 9, '#1a1a22'); R(x, '#30303c', cx - 7, by - 111, 7, 2); R(x, '#30303c', cx - 8, by - 109, 2, 2); R(x, '#8a3226', cx - 11, by - 101, 22, 2);
}

/* ------------------------------ cena 1: a comunidade vendo a cidade queimar ------------------------------ */
const FOGOS1 = [[196, 112], [236, 106], [281, 116]];
const TORRE = [300, 60];
function cena1() {
  const [c, x] = mk(), r = rnd(22);
  G(x, 0, 0, W, 134, ['#05060c', '#090a15', '#0e0f20', '#15132a', '#1f162c', '#30182a', '#46202c', '#622a26'], (X, Y) => {
    let v = Y / 160; for (const [fx, fy] of FOGOS1) { const d = Math.hypot((X - fx) / 74, (Y - fy) / 44); v += 0.48 * Math.max(0, 1 - d); } return v;
  });
  for (let i = 0; i < 70; i++) P(x, r() < 0.3 ? '#6a6f8a' : '#34374e', r() * W, r() * 58);
  disco(x, 262, 26, 8, '#b9b29c'); disco(x, 263, 25, 7, '#d2cab2'); P(x, '#a39c86', 260, 24); P(x, '#a39c86', 265, 28); P(x, '#a39c86', 266, 23); R(x, '#b9b29c', 258, 29, 3, 1);
  x.globalCompositeOperation = 'lighter'; brilho(x, 262, 26, 24, 'rgba(110,110,150,0.16)'); x.globalCompositeOperation = 'source-over';
  // morro do fundo com a Torre de Rádio
  for (let X = 262; X < W; X++) { const top = Math.round(88 + Math.pow((X - 302) / 14, 2)); R(x, '#0c0c18', X, top, 1, 134 - top); }
  linha(x, '#1c1c2c', TORRE[0], TORRE[1], TORRE[0] - 5, 90); linha(x, '#1c1c2c', TORRE[0], TORRE[1], TORRE[0] + 5, 90);
  for (let y = 64; y < 90; y += 5) { const k = (y - TORRE[1]) / 30 * 5; linha(x, '#1c1c2c', TORRE[0] - k, y, TORRE[0] + k, y + 4); }
  // a cidade: duas camadas de prédios
  for (const [base, cores, alt, vao] of [[126, ['#17162e', '#1a1934'], [18, 52], 0.04], [132, ['#101024', '#13132a'], [10, 36], 0.07]]) {
    for (let X = 146; X < W;) {
      const w = 6 + Math.floor(r() * 13), h = alt[0] + Math.floor(r() * (alt[1] - alt[0])), col = cores[r() < 0.5 ? 0 : 1];
      R(x, col, X, base - h, w, h); R(x, '#0c0c1e', X + w - 2, base - h, 2, h);
      if (r() < 0.25) R(x, col, X + 2, base - h - 4, 2, 4);
      for (let yy = base - h + 3; yy < base - 2; yy += 3) for (let xx = X + 1; xx < X + w - 2; xx += 2) { const q = r(); if (q < vao) P(x, '#d8963e', xx, yy); else if (q < vao + 0.02) P(x, '#4ab8c8', xx, yy); else if (q < 0.3) P(x, '#1f1e3a', xx, yy); }
      X += w + (r() < 0.25 ? 1 : 0);
    }
  }
  // o vale: chão escuro, ruas com poste e o viaduto com o engarrafamento de quem tenta fugir
  G(x, 0, 132, W, 40, ['#0e0d1a', '#0b0b16', '#090912'], (X, Y) => (Y - 132) / 40);
  for (let i = 0; i < 60; i++) P(x, r() < 0.7 ? '#a8783a' : '#5a8a96', 200 + r() * 120, 136 + r() * 32);
  R(x, '#1a1a28', 196, 146, 124, 2); R(x, '#101018', 196, 148, 124, 1);
  for (let X = 200; X < W; X += 3 + Math.floor(r() * 3)) { P(x, '#fff2c8', X, 145); if (r() < 0.6) P(x, '#d8342a', X + 1, 145); }
  for (let X = 204; X < W; X += 22) R(x, '#15151f', X, 148, 2, 12);
  // brilho do fogo por cima dos prédios
  x.globalCompositeOperation = 'lighter';
  for (const [fx, fy] of FOGOS1) { brilho(x, fx, fy + 4, 38, 'rgba(255,100,40,0.20)'); brilho(x, fx, fy + 2, 16, 'rgba(255,170,80,0.32)'); }
  x.globalCompositeOperation = 'source-over';
  // a comunidade, no morro da esquerda: de cima (longe, com névoa) pra baixo (perto)
  for (let X = 0; X < 214; X++) { const top = Math.round(86 + X * 0.235); R(x, '#0b0a12', X, top, 1, H - top); }
  x._luzes = [];
  for (let row = 0; row < 6; row++) {
    const Y = 96 + row * 15, xmax = Math.min((Y - 90) / 0.235, 208);
    let X = -6 + (row % 2) * 7;
    while (X < xmax - 8) {
      const w = 13 + Math.floor(r() * 14), h = 10 + Math.floor(r() * 6);
      casa(x, r, X, Y - h, w, h, Math.max(0, 0.5 - row * 0.1), 0.28);
      X += w + 3 + Math.floor(r() * 3);
    }
  }
  casa(x, r, -4, 120, 58, 51, 0, 0.5);   // a casa grande do primeiro plano
  R(x, '#2a2830', 4, 128, 9, 6); R(x, '#3a3842', 4, 128, 9, 1); R(x, '#1a1a20', 6, 134, 1, 3);   // ar-condicionado velho
  const luzes = x._luzes; x._luzes = null;
  x.globalCompositeOperation = 'lighter';
  for (const [lx, ly] of luzes) brilho(x, lx, ly, 6, 'rgba(255,170,80,0.12)');
  x.globalCompositeOperation = 'source-over';
  // fios emaranhados
  fio(x, '#16141c', 92, 112, -4, 96, 9); fio(x, '#16141c', 92, 114, 190, 104, 14); fio(x, '#16141c', 92, 115, 214, 134, 18); fio(x, '#1a1820', 20, 104, 140, 108, 10); fio(x, '#16141c', 92, 113, 60, 86, 6); fio(x, '#1a1820', 54, 118, 92, 116, 3);
  // a rua molhada
  G(x, 0, 172, W, 28, ['#15151e', '#101018', '#0b0b12', '#08080d'], (X, Y) => (Y - 172) / 28);
  R(x, '#2a2832', 0, 171, W, 1); R(x, '#38343f', 0, 170, W, 1);
  for (let i = 0; i < 90; i++) { const X = r() * W | 0, Y = 174 + r() * 26 | 0; R(x, '#1c1c28', X, Y, 2 + r() * 4, 1); }
  // poste
  R(x, '#18171f', 92, 110, 2, 62); R(x, '#18171f', 92, 110, 12, 2); R(x, '#2a2930', 100, 111, 5, 2); P(x, '#ffd890', 102, 113);
  x.globalCompositeOperation = 'lighter';
  brilho(x, 102, 142, 32, 'rgba(255,160,70,0.09)', 1, 1.25); brilho(x, 102, 178, 34, 'rgba(255,150,60,0.22)', 1, 0.28);
  for (let Y = 176; Y < 198; Y += 2) if (Y % 4) R(x, 'rgba(255,160,70,0.25)', 100 + Math.round(Math.sin(Y) * 1.5), Y, 4, 1);   // reflexo na poça
  x.globalCompositeOperation = 'source-over';
  motoLado(x, 160, 194);
  x.globalCompositeOperation = 'lighter';
  brilho(x, 204, 192, 40, 'rgba(255,230,170,0.10)', 1, 0.22);   // o farol no chão molhado
  for (let Y = 186; Y < 199; Y += 2) R(x, 'rgba(120,230,255,0.16)', 162, Y, 2, 1);
  x.globalCompositeOperation = 'source-over';
  return c;
}

/* ------------------------------ cena 2: o celular na chuva ------------------------------ */
const FONE = { x: 112, y: 14, w: 96, tx: 118, ty: 24, tw: 84 };
function cena2() {
  const [c, x] = mk(), r = rnd(5);
  G(x, 0, 0, W, H, ['#05050a', '#08080f', '#0c0b16', '#120e1c'], (X, Y) => Y / H * 0.8 + 0.1);
  // bokeh: as luzes da cidade fora de foco
  x.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 26; i++) {
    const X = r() * W, Y = 10 + r() * 170, rr = 5 + r() * 12, q = r();
    const cor = q < 0.5 ? 'rgba(230,130,60,0.16)' : q < 0.75 ? 'rgba(80,200,230,0.14)' : q < 0.9 ? 'rgba(220,50,50,0.15)' : 'rgba(240,220,170,0.14)';
    brilho(x, X, Y, rr, cor, 1.6);
  }
  x.globalCompositeOperation = 'source-over';
  // mão esquerda segurando por baixo
  const pele = '#4e3224', sombra = '#2e1c14', luz = '#3f7a86';   // mão no escuro, com a borda iluminada pela tela
  R(x, sombra, 90, 146, 32, 60); R(x, pele, 92, 146, 28, 60); R(x, luz, 92, 146, 3, 60);
  for (let k = 0; k < 4; k++) {   // dedos dobrados por cima da borda
    const fy = 104 + k * 12;
    R(x, sombra, 100, fy, 16, 10); R(x, pele, 101, fy, 14, 8); R(x, luz, 101, fy, 12, 1);
    disco(x, 115, fy + 4, 4, pele); R(x, sombra, 101, fy + 9, 14, 1); P(x, '#7aa8b0', 117, fy + 2); P(x, '#5a8a94', 118, fy + 3);
  }
  // o celular
  const f = FONE;
  R(x, '#0a0a0e', f.x, f.y, f.w, H - f.y); R(x, '#24242e', f.x, f.y, f.w, 1); R(x, '#24242e', f.x, f.y, 1, H - f.y); R(x, '#1a1a22', f.x + f.w - 1, f.y, 1, H - f.y);
  P(x, '#000', f.x, f.y); P(x, '#000', f.x + f.w - 1, f.y);
  R(x, '#0b1620', f.tx, f.ty, f.tw, H - f.ty);
  R(x, '#16161c', 152, 18, 16, 2);   // alto-falante
  R(x, '#36363e', f.x + f.w, 60, 2, 14); R(x, '#36363e', f.x - 2, 50, 2, 10);   // botões
  // polegar direito subindo pela tela
  R(x, sombra, 192, 180, 34, 30); R(x, pele, 194, 176, 30, 34); R(x, luz, 194, 176, 30, 1);
  disco(x, 192, 174, 6, sombra); disco(x, 193, 173, 5, pele); R(x, '#6a5048', 189, 170, 4, 3); R(x, '#8ab8c0', 189, 170, 3, 1);   // polegar e unha
  return c;
}
// o que aparece na tela do celular (muda com o tempo da cena)
function telaCelular(x, t) {
  const f = FONE, X = f.tx + 3;
  R(x, '#0b1620', f.tx, f.ty, f.tw, 150);
  texto(x, '23:47', X, 27, '#8aa2b4'); texto(x, '12%', f.tx + f.tw - 15, 27, '#e05a4a'); R(x, '#e05a4a', f.tx + f.tw - 19, 27, 2, 5);
  R(x, '#c8642a', f.tx, 35, f.tw, 11); texto(x, 'RAPIDÃO', X + 1, 38, '#2a120a'); texto(x, 'ENTREGAS', X + 33, 38, '#5a2a10');
  if (t < 1) { texto(x, 'PROCURANDO' + '...'.slice(0, 1 + Math.floor(t * 6) % 3), X, 54, '#5a7484'); return; }
  // tarifa dinâmica
  R(x, '#132230', X - 1, 50, 80, 36); R(x, '#1d3446', X - 1, 50, 80, 1);
  texto(x, 'TARIFA DINÂMICA', X + 2, 53, '#f0a050');
  const pisca = Math.floor(t * 3) % 2 ? '#ffd27a' : '#ff8a3a';
  texto(x, '5X', X + 20, 62, pisca, 4);
  texto(x, 'NA SUA', X + 50, 64, '#6a8494'); texto(x, 'REGIÃO', X + 50, 72, '#6a8494');
  if (t < 3.5) return;
  // nova entrega
  R(x, '#102018', X - 1, 90, 80, 72); R(x, '#1c3a2a', X - 1, 90, 80, 1);
  texto(x, 'NOVA ENTREGA', X + 2, 93, '#8af0ff');
  texto(x, 'INSULINA - 2 CX', X + 2, 102, '#e8eef2');
  texto(x, 'COND. JARDINS', X + 2, 110, '#b8c4cc'); texto(x, 'DO MIRANTE', X + 2, 117, '#b8c4cc');
  texto(x, '3,2 KM', X + 2, 125, '#6a8494');
  texto(x, 'R$ 87,50', X + 2, 133, '#7ee08a', 2);
  const seg = Math.max(0, 15 - Math.floor(t - 3.5));
  R(x, '#2f9a5a', X - 1, 148, 80, 12); R(x, '#4ac47a', X - 1, 148, 80, 1);
  texto(x, 'ACEITAR', X + 14, 152, '#06200f'); texto(x, '0:' + String(seg).padStart(2, '0'), X + 48, 152, '#06200f');
  if (t < 7.5) return;
  // a mensagem da avó desce por cima
  const k = Math.min(1, (t - 7.5) / 0.35), y0 = 24 + Math.round((k - 1) * 64);
  R(x, '#0f1d16', f.tx + 1, y0, f.tw - 2, 64); R(x, '#25d366', f.tx + 1, y0, 2, 64); R(x, '#1b3326', f.tx + 1, y0 + 63, f.tw - 2, 1);
  texto(x, 'RESPONDER', X + 2, y0 + 53, '#4a8a62');
  texto(x, 'VÓ DITA', X + 2, y0 + 4, '#7ee08a'); texto(x, 'AGORA', f.tx + f.tw - 24, y0 + 4, '#4a6a58');
  const ls = ['MEU FILHO, ACABOU', 'A INSULINA. NÃO', 'PRECISA VIR NÃO.', 'SE CUIDA. TE AMO'];
  ls.forEach((l, i) => texto(x, l, X + 2, y0 + 13 + i * 8, '#e8eef2'));
}

/* ------------------------------ cena 3: a bifurcação ------------------------------ */
const FOGOS3 = [[54, 104], [96, 110], [24, 112]];
const CASA_VO = [254, 58];
function cena3() {
  const [c, x] = mk(), r = rnd(91);
  // céu: laranja do lado da cidade (esquerda), azul frio do lado do morro (direita)
  G(x, 0, 0, W, 126, ['#05060c', '#0a0b17', '#111127', '#1b1630', '#2f1a2c', '#4c2028', '#6e2c22'], (X, Y) => {
    let v = Y / 170 + Math.max(0, 1 - X / 190) * 0.32 * (Y / 126); for (const [fx, fy] of FOGOS3) { const d = Math.hypot((X - fx) / 70, (Y - fy) / 40); v += 0.4 * Math.max(0, 1 - d); } return v;
  });
  for (let i = 0; i < 50; i++) P(x, r() < 0.3 ? '#6a6f8a' : '#34374e', 150 + r() * 170, r() * 40);
  disco(x, 292, 20, 6, '#cfc7ae'); P(x, '#a39c86', 290, 19);
  x.globalCompositeOperation = 'lighter'; brilho(x, 292, 20, 18, 'rgba(110,120,160,0.16)'); x.globalCompositeOperation = 'source-over';
  // a cidade lá embaixo, à esquerda
  for (let X = 0; X < 170;) {
    const w = 5 + Math.floor(r() * 10), h = 8 + Math.floor(r() * 30), col = r() < 0.5 ? '#13122a' : '#17162e';
    R(x, col, X, 122 - h, w, h);
    for (let yy = 122 - h + 2; yy < 120; yy += 3) for (let xx = X + 1; xx < X + w - 1; xx += 2) { const q = r(); if (q < 0.05) P(x, '#d8963e', xx, yy); else if (q < 0.25) P(x, '#1f1e3a', xx, yy); }
    X += w + 1;
  }
  x.globalCompositeOperation = 'lighter';
  for (const [fx, fy] of FOGOS3) { brilho(x, fx, fy + 6, 34, 'rgba(255,100,40,0.2)'); brilho(x, fx, fy + 3, 14, 'rgba(255,170,80,0.3)'); }
  x.globalCompositeOperation = 'source-over';
  // o morro da direita subindo até a casa da avó
  for (let X = 140; X < W; X++) { const top = Math.round(200 - (X - 140) * 0.8); R(x, '#0b0a12', X, Math.max(52, top), 1, H); }
  for (let row = 0; row < 8; row++) {
    const Y = 70 + row * 14, x0 = 140 + (200 - Y) / 0.8 + 6;
    let X = Math.max(x0, 150) + (row % 2) * 5;
    while (X < W + 4) {
      const w = 11 + Math.floor(r() * 10), h = 8 + Math.floor(r() * 5);
      if (!(Math.abs(X - CASA_VO[0]) < 24 && Y < 80)) casa(x, r, X, Y - h, w, h, Math.max(0, 0.45 - (7 - row) * 0.0), 0.22);
      X += w + 3 + Math.floor(r() * 3);
    }
  }
  // a casa da Vó Dita, lá em cima, com a janela acesa (e ela na janela)
  const [vx, vy] = CASA_VO;
  R(x, '#4a3040', vx - 10, vy, 22, 13); R(x, '#5a3a4c', vx - 10, vy, 22, 1); R(x, '#33212c', vx + 12, vy + 1, 3, 12); R(x, '#3d3a44', vx - 11, vy - 2, 27, 2);
  R(x, '#1d3f5e', vx + 4, vy - 7, 6, 5); R(x, '#2c5a82', vx + 4, vy - 7, 6, 1);
  R(x, '#121018', vx - 7, vy + 3, 8, 6); R(x, '#e0a050', vx - 6, vy + 4, 6, 4); P(x, '#ffd890', vx - 5, vy + 5);
  R(x, '#2a1a14', vx - 4, vy + 5, 2, 3); P(x, '#2a1a14', vx - 4, vy + 4); P(x, '#c8c0b0', vx - 4, vy + 4);   // a silhueta da avó (cabelo branco)
  R(x, '#100e14', vx + 4, vy + 6, 4, 7);
  // a escadaria até lá, com um poste no meio
  let sx = 178, sy = 196;
  while (sy > vy + 16) { R(x, '#3a3842', sx, sy, 10, 1); R(x, '#24222a', sx, sy + 1, 10, 2); sx += 2.6; sy -= 3.2; }
  R(x, '#18171f', 214, 120, 2, 26); R(x, '#2a2930', 214, 119, 5, 2); P(x, '#bfe8ff', 217, 121);
  x.globalCompositeOperation = 'lighter';
  brilho(x, vx - 3, vy + 6, 22, 'rgba(255,170,80,0.18)'); brilho(x, 217, 130, 22, 'rgba(160,210,255,0.12)', 1, 1.2);
  x.globalCompositeOperation = 'source-over';
  // a rua na bifurcação: uma desce pra esquerda (a cidade), a outra vira escada (o morro)
  G(x, 0, 126, 200, 74, ['#14131c', '#101018', '#0c0c13', '#09090e'], (X, Y) => (Y - 126) / 74);
  for (let Y = 126; Y < H; Y++) { const borda = Math.round(176 + (H - Y) * -0.1); R(x, '#26242e', borda, Y, 2, 1); }
  for (let i = 0; i < 14; i++) { const t = i / 14, X = 150 - t * 140, Y = 196 - t * 66; R(x, '#4a4636', X, Y, 5 - t * 3, 1); }   // faixa no chão descendo pra cidade
  x.globalCompositeOperation = 'lighter';
  for (let Y = 140; Y < H; Y += 2) R(x, 'rgba(255,130,60,0.10)', 40 + (Y - 140) * 0.9, Y, 18, 1);   // a cidade refletindo no asfalto
  x.globalCompositeOperation = 'source-over';
  // placa
  R(x, '#1c1b22', 30, 150, 2, 30); R(x, '#2a4a7a', 14, 144, 34, 9); R(x, '#3a5e94', 14, 144, 34, 1);
  texto(x, '‹ CENTRO', 17, 146, '#e8eef2');
  // carro largado no caminho da cidade
  R(x, '#1a1a24', 86, 150, 30, 9); R(x, '#22222e', 92, 145, 18, 6); R(x, '#3a4a5a', 94, 146, 6, 4); R(x, '#3a4a5a', 102, 146, 6, 4); disco(x, 92, 159, 3, '#0a0a0e'); disco(x, 110, 159, 3, '#0a0a0e');
  motoCostas(x, 152, 206);
  return c;
}

/* ------------------------------ partículas e luz que mexem ------------------------------ */
const chuva = Array.from({ length: 260 }, () => ({ x: Math.random() * (W + 60), y: Math.random() * H, v: 160 + Math.random() * 90 }));
const respingos = [];
function desenharChuva(dt, forte = 1) {
  ctx.fillStyle = 'rgba(150,170,215,0.38)';
  for (const g of chuva) {
    g.y += g.v * dt; g.x -= g.v * dt * 0.28;
    if (g.y > H) { if (Math.random() < 0.25 * forte) respingos.push({ x: g.x, y: 172 + Math.random() * 26, t: 0 }); g.y = -6; g.x = Math.random() * (W + 60); }
    ctx.fillRect(g.x | 0, g.y | 0, 1, 1); ctx.fillRect((g.x - 1) | 0, (g.y + 2) | 0, 1, 2);
  }
  ctx.fillStyle = 'rgba(170,190,230,0.5)';
  for (let i = respingos.length - 1; i >= 0; i--) { const s = respingos[i]; s.t += dt; if (s.t > 0.18) { respingos.splice(i, 1); continue; } ctx.fillRect((s.x - 1) | 0, s.y | 0, 1, 1); ctx.fillRect((s.x + 1) | 0, s.y | 0, 1, 1); if (s.t < 0.08) ctx.fillRect(s.x | 0, (s.y - 1) | 0, 1, 1); }
}
const fumaca = [];
function semearFumaca(fogos) { fumaca.length = 0; for (const [fx, fy] of fogos) for (let k = 0; k < 9; k++) fumaca.push({ fx, fy, x: fx, y: fy - k * 9, r: 3 + k * 1.3, idade: k * 0.9 }); }
function desenharFumaca(dt) {
  for (const p of fumaca) {
    p.idade += dt; p.y -= dt * 5; p.x -= dt * 4.5; p.r += dt * 0.9;
    if (p.idade > 9) { p.idade = 0; p.x = p.fx; p.y = p.fy; p.r = 3; }
    const a = Math.min(1, p.idade) * Math.max(0, 1 - p.idade / 9);
    for (let Y = Math.floor(p.y - p.r); Y <= p.y + p.r; Y++) for (let X = Math.floor(p.x - p.r); X <= p.x + p.r; X++) {
      const d = Math.hypot(X - p.x, Y - p.y) / p.r; if (d > 1) continue;
      if ((1 - d) * 1.6 * a > th(X, Y)) { ctx.fillStyle = '#1b1620'; ctx.fillRect(X, Y, 1, 1); }
    }
  }
}
function chamas(fogos, t) {
  for (const [fx, fy] of fogos) {
    for (let k = 0; k < 7; k++) {
      const X = fx - 4 + Math.floor(Math.random() * 9), alt = 2 + Math.floor(Math.random() * 6);
      ctx.fillStyle = Math.random() < 0.5 ? '#e8662a' : '#ffb04a'; ctx.fillRect(X, fy - alt, 1, alt);
      if (Math.random() < 0.3) { ctx.fillStyle = '#ffe2a0'; ctx.fillRect(X, fy - 1, 1, 1); }
    }
  }
  ctx.globalCompositeOperation = 'lighter';
  for (const [fx, fy] of fogos) { const a = 0.12 + 0.06 * Math.sin(t * 9 + fx); ctx.fillStyle = `rgba(255,120,40,${a})`; ctx.fillRect(fx - 8, fy - 9, 17, 10); }
  ctx.globalCompositeOperation = 'source-over';
}

/* =========================================================================
   Gente: um quadro de 32 x 64 (pé em 16, 62), virado pra direita; espelha pra esquerda
   ========================================================================= */
const KAUA = { pele: '#7a4a30', peleLuz: '#8d5a3b', cabelo: '#141010', camisa: '#1e2a42', camisaLuz: '#2c3c5c', camisaSombra: '#141c2e', calca: '#161a26', calcaLuz: '#222a3c', sapato: '#0e0e14', bone: '#c8642a', faixa: true };
const POLICIAL = { pele: '#5a3a28', peleLuz: '#6e4834', cabelo: '#101010', camisa: '#2a3446', camisaLuz: '#3a465c', camisaSombra: '#1c2432', calca: '#1e2430', calcaLuz: '#2a3240', sapato: '#0a0a0e', quepe: true, colete: true };
function pessoa(o, passo = 0) {
  const [c, x] = (() => { const k = document.createElement('canvas'); k.width = 32; k.height = 64; return [k, k.getContext('2d')]; })();
  const cx = 16, b = 62, s = Math.sin(passo * Math.PI * 2), d = Math.round(s * 2.5);
  // perna de trás e de frente (andando, elas se cruzam)
  R(x, o.calca, cx - 3 - d, b - 24, 3, 21); R(x, o.sapato, cx - 4 - d, b - 3, 6, 3);
  R(x, o.calca, cx + d, b - 24, 4, 21); R(x, o.calcaLuz, cx + 3 + d, b - 23, 1, 19); R(x, o.sapato, cx + d, b - 3, 7, 3); R(x, '#2a2a34', cx + d, b - 1, 7, 1);
  // tronco
  R(x, o.camisa, cx - 4, b - 43, 9, 20); R(x, o.camisaSombra, cx - 4, b - 42, 2, 18); R(x, o.camisaLuz, cx + 4, b - 42, 1, 17);
  if (o.faixa) R(x, '#8a96a8', cx - 4, b - 34, 9, 2);
  if (o.colete) { R(x, '#121418', cx - 4, b - 41, 9, 13); R(x, '#2a2c34', cx + 3, b - 40, 1, 11); P(x, '#c8a84a', cx + 2, b - 38); }
  R(x, o.pele, cx - 1, b - 45, 3, 2);
  // cabeça
  disco(x, cx + 1, b - 49, 4, o.pele); R(x, o.peleLuz, cx + 3, b - 51, 2, 4); P(x, '#0a0808', cx + 3, b - 50); R(x, o.cabelo, cx - 3, b - 53, 5, 5);
  if (o.bone) { R(x, o.bone, cx - 3, b - 54, 8, 3); R(x, '#e0884a', cx - 3, b - 54, 8, 1); R(x, o.bone, cx + 4, b - 52, 4, 1); }
  if (o.quepe) { R(x, '#161a24', cx - 3, b - 55, 8, 4); R(x, '#2a3040', cx - 3, b - 55, 8, 1); R(x, '#0a0a0e', cx + 3, b - 52, 4, 1); P(x, '#e8c84a', cx + 1, b - 54); }
  if (o.cabeloLongo) { R(x, o.cabelo, cx - 4, b - 53, 4, 14); }
  // braço da frente
  if (o.braco === 'frente') { R(x, o.camisa, cx + 1, b - 41, 3, 7); R(x, o.camisa, cx + 3, b - 36, 7, 3); R(x, o.pele, cx + 9, b - 36, 3, 3); if (o.item) o.item(x, cx + 10, b - 38); }
  else if (o.braco === 'lanterna') { R(x, o.camisa, cx + 1, b - 41, 3, 8); R(x, o.camisa, cx + 3, b - 34, 6, 3); R(x, o.pele, cx + 8, b - 34, 3, 3); R(x, '#3a3a42', cx + 10, b - 33, 5, 2); P(x, '#fff6d8', cx + 14, b - 33); }
  else { R(x, o.camisa, cx, b - 41 + 0, 3, 13); R(x, o.camisaSombra, cx, b - 41, 1, 13); R(x, o.pele, cx, b - 28, 3, 3); if (o.item) o.item(x, cx + 1, b - 26); }
  return c;
}
const espelhado = c => { const [k, x] = (() => { const q = document.createElement('canvas'); q.width = c.width; q.height = c.height; return [q, q.getContext('2d')]; })(); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0); return k; };
const ponha = (x, spr, px, py) => x.drawImage(spr, Math.round(px - 16), Math.round(py - 62));
const caixaInsulina = (x, X, Y) => { R(x, '#e8eef2', X, Y, 5, 4); R(x, '#b8c4cc', X, Y + 3, 5, 1); P(x, '#2a6ad8', X + 2, Y + 1); P(x, '#2a6ad8', X + 1, Y + 2); P(x, '#2a6ad8', X + 3, Y + 2); P(x, '#2a6ad8', X + 2, Y + 2); };
const sacola = (x, X, Y) => { R(x, '#d8d0c0', X, Y, 6, 7); R(x, '#b8b0a0', X + 5, Y, 1, 7); R(x, '#8a8478', X + 1, Y - 2, 1, 2); R(x, '#8a8478', X + 4, Y - 2, 1, 2); P(x, '#c83a3a', X + 2, Y + 3); P(x, '#c83a3a', X + 3, Y + 3); P(x, '#c83a3a', X + 2, Y + 2); P(x, '#c83a3a', X + 2, Y + 4); };
// zumbi (virado pra esquerda, braços pra frente); claro = iluminado pelo farol
function spriteZumbi(claro = false) {
  const k = document.createElement('canvas'); k.width = 16; k.height = 30; const x = k.getContext('2d');
  const corpo = claro ? '#4e5a40' : '#22281e', sombra = claro ? '#3a4430' : '#161a14', pele = claro ? '#8a9070' : '#3a4034';
  R(x, sombra, 8, 18, 2, 11); R(x, corpo, 5, 18, 3, 11); R(x, '#0e0e0e', 4, 28, 4, 2); R(x, '#0e0e0e', 8, 28, 3, 2);
  R(x, corpo, 4, 7, 7, 12); R(x, sombra, 9, 8, 2, 10); P(x, '#3a1010', 6, 11); P(x, '#3a1010', 7, 14);
  R(x, corpo, 0, 9, 6, 2); R(x, pele, 0, 9, 2, 2); R(x, corpo, 1, 12, 5, 2); R(x, pele, 0, 12, 2, 2);
  disco(x, 7, 4, 3, pele); P(x, '#c83a2a', 5, 4); R(x, sombra, 8, 1, 3, 3);
  return k;
}

/* =========================================================================
   Morro com escadaria (caminho 1 e o final)
   ========================================================================= */
function escadaria(x, ax, ay, bx, by, cor = ['#3a3842', '#24222a', '#4a4652']) {
  const n = Math.round(Math.hypot(bx - ax, by - ay) / 4.6);
  for (let i = 0; i <= n; i++) { const t = i / n, sx = ax + (bx - ax) * t, sy = ay + (by - ay) * t; R(x, cor[0], sx, sy, 16, 1); R(x, cor[1], sx, sy + 1, 16, 3); if (i % 4 === 0) R(x, cor[2], sx + 15, sy - 7, 1, 7); }
  linha(x, cor[2], ax + 15, ay - 7, bx + 15, by - 7);
}
// casas do morro dos dois lados da escadaria (sem cobrir a escada)
function morro(x, r, ax, ay, bx, by, nevoa, janelas, linhas = 9) {
  const dx = bx - ax, dy = by - ay, L = Math.hypot(dx, dy);
  const dist = (X, Y) => ((X - ax) * dy - (Y - ay) * dx) / L;
  for (let X = 0; X < W; X++) { const top = Math.round(ay + (X - ax) * dy / dx - 26); if (top < H) R(x, '#0b0a12', X, Math.max(by - 20, top), 1, H); }
  for (let row = 0; row < linhas; row++) {
    const Y = by + 10 + row * 15;
    let X = 60 + (row % 2) * 6;
    while (X < W + 4) {
      const w = 12 + Math.floor(r() * 12), h = 9 + Math.floor(r() * 5), cxm = X + w / 2, cym = Y - h / 2;
      const top = ay + (cxm - ax) * dy / dx - 24;
      if (cym > top && Math.abs(dist(cxm, cym) - 4) > 16) casa(x, r, X, Y - h, w, h, Math.max(0, nevoa - row * 0.06), janelas);
      X += w + 3 + Math.floor(r() * 3);
    }
  }
}
function casaDaVo(x, vx, vy) {
  R(x, '#4a3040', vx - 10, vy, 22, 13); R(x, '#5a3a4c', vx - 10, vy, 22, 1); R(x, '#33212c', vx + 12, vy + 1, 3, 12); R(x, '#3d3a44', vx - 11, vy - 2, 27, 2);
  R(x, '#1d3f5e', vx + 4, vy - 7, 6, 5); R(x, '#2c5a82', vx + 4, vy - 7, 6, 1);
  R(x, '#121018', vx - 7, vy + 3, 8, 6); R(x, '#e0a050', vx - 6, vy + 4, 6, 4); P(x, '#ffd890', vx - 5, vy + 5);
  R(x, '#100e14', vx + 4, vy + 6, 4, 7);
}

/* ------------------------------ caminho 1: a moto fica, ele sobe a pé ------------------------------ */
const ESC1 = [128, 192, 292, 52], CASA_VO1 = [300, 40];
function cenaVo() {
  const [c, x] = mk(), r = rnd(41);
  G(x, 0, 0, W, 150, ['#05060c', '#090a15', '#0e0f20', '#14132a', '#1c1830', '#2a1c30'], (X, Y) => Y / 170 + Math.max(0, 1 - X / 140) * 0.15);
  for (let i = 0; i < 60; i++) P(x, r() < 0.3 ? '#6a6f8a' : '#34374e', r() * W, r() * 70);
  disco(x, 44, 30, 7, '#cfc7ae'); P(x, '#a39c86', 42, 28); P(x, '#a39c86', 46, 32);
  x.globalCompositeOperation = 'lighter'; brilho(x, 44, 30, 22, 'rgba(110,120,160,0.16)'); x.globalCompositeOperation = 'source-over';
  // fundo: o morro em frente, longe
  for (let X = 0; X < 140; X++) { const top = Math.round(118 - Math.sin(X / 40) * 10); R(x, '#0d0c18', X, top, 1, 60); }
  for (let i = 0; i < 40; i++) P(x, r() < 0.7 ? '#a8783a' : '#5a8a96', r() * 130, 112 + r() * 40);
  const [ax, ay, bx, by] = ESC1;
  morro(x, r, ax, ay, bx, by, 0.4, 0.3);
  escadaria(x, ax, ay, bx, by);
  casaDaVo(x, CASA_VO1[0], CASA_VO1[1]);
  R(x, '#2a1a14', CASA_VO1[0] - 4, CASA_VO1[1] + 5, 2, 3); P(x, '#c8c0b0', CASA_VO1[0] - 4, CASA_VO1[1] + 4);
  // a rua de baixo
  G(x, 0, 172, W, 28, ['#15151e', '#101018', '#0b0b12', '#08080d'], (X, Y) => (Y - 172) / 28);
  R(x, '#2a2832', 0, 171, W, 1); R(x, '#38343f', 0, 170, 130, 1);
  for (let i = 0; i < 70; i++) R(x, '#1c1c28', r() * W, 174 + r() * 26, 2 + r() * 4, 1);
  // poste
  R(x, '#18171f', 74, 110, 2, 62); R(x, '#18171f', 74, 110, 12, 2); R(x, '#2a2930', 82, 111, 5, 2); P(x, '#ffd890', 84, 113);
  x.globalCompositeOperation = 'lighter';
  brilho(x, 84, 146, 30, 'rgba(255,160,70,0.09)', 1, 1.25); brilho(x, 70, 182, 40, 'rgba(255,150,60,0.22)', 1, 0.28);
  x.globalCompositeOperation = 'source-over';
  motoLado(x, 46, 194, { piloto: false, bau: 'aberto' });
  ponha(x, pessoa({ ...KAUA, braco: 'frente', item: caixaInsulina }), 112, 188);
  // dois zumbis na metade da escada, no escuro
  const z = spriteZumbi(); x.drawImage(z, 208, 92); x.drawImage(z, 222, 82);
  x.globalCompositeOperation = 'lighter'; brilho(x, CASA_VO1[0] - 3, CASA_VO1[1] + 6, 18, 'rgba(255,170,80,0.2)'); x.globalCompositeOperation = 'source-over';
  return c;
}
// a notificação do app (por cima da cena)
function notificacao(x, lt, ini, linhas, cor = '#c8642a') {
  if (lt < ini) return;
  const k = Math.min(1, (lt - ini) / 0.3), y0 = Math.round(6 - (1 - k) * 34), w = 4 + Math.max(...linhas.map(largura)) + 14;
  const x0 = Math.round((W - w) / 2);
  R(x, 'rgba(10,12,18,0.94)', x0, y0, w, 10 + linhas.length * 7); R(x, '#2a2e3a', x0, y0, w, 1);
  R(x, cor, x0 + 3, y0 + 3, 7, 7); R(x, '#f4e0c0', x0 + 5, y0 + 5, 3, 3);
  linhas.forEach((l, i) => texto(x, l, x0 + 13, y0 + 4 + i * 7, i ? '#9aa4b0' : '#e8eef2'));
}

/* ------------------------------ caminho 1: a farmácia da Rua 9 ------------------------------ */
function cenaFarmacia() {
  const [c, x] = mk(), r = rnd(9);
  // parede de azulejo
  G(x, 0, 0, W, 150, ['#0e1414', '#141c1c', '#1a2424', '#1e2a2a'], (X, Y) => 0.2 + Y / 300 + Math.max(0, 1 - Math.abs(X - 240) / 120) * 0.3);
  for (let Y = 4; Y < 140; Y += 8) R(x, '#0c1212', 0, Y, W, 1);
  for (let X = 0; X < W; X += 8) R(x, '#0c1212', X, 0, 1, 140);
  for (let i = 0; i < 40; i++) R(x, '#0a0e0e', r() * W, r() * 130, 2 + r() * 3, 1 + r() * 2);   // azulejo quebrado
  // prateleiras saqueadas
  for (const [sx, sw] of [[80, 70], [160, 60]]) {
    R(x, '#1e2224', sx, 40, sw, 100); for (let Y = 52; Y < 140; Y += 22) { R(x, '#3a4044', sx, Y, sw, 2); R(x, '#12161a', sx, Y + 2, sw, 1); }
    for (let i = 0; i < 14; i++) { const Y = 52 + Math.floor(r() * 4) * 22 - 5; const cor = ['#5a3a6a', '#2a5a7a', '#7a5a2a', '#6a2a2a', '#3a6a4a'][Math.floor(r() * 5)]; R(x, cor, sx + 2 + r() * (sw - 8), Y, 4, 5); }
  }
  R(x, '#1e2224', 130, 60, 26, 80); linha(x, '#3a4044', 130, 60, 156, 140);   // uma prateleira tombada
  // a porta de vidro quebrada, à esquerda, e a rua lá fora
  R(x, '#06080c', 10, 54, 56, 118); G(x, 12, 56, 52, 114, ['#0a1418', '#0e1c22', '#12242a'], (X, Y) => Y / 400 + 0.2);
  R(x, '#2a3034', 8, 52, 60, 3); R(x, '#2a3034', 8, 52, 3, 120); R(x, '#2a3034', 65, 52, 3, 120); R(x, '#2a3034', 37, 52, 2, 120);
  linha(x, '#6a8a94', 14, 60, 30, 92); linha(x, '#6a8a94', 30, 92, 22, 130); linha(x, '#6a8a94', 42, 70, 60, 104); linha(x, '#4a6a74', 50, 110, 62, 150);
  // chão
  G(x, 0, 140, W, 60, ['#1a1c1c', '#141616', '#0e1010'], (X, Y) => (Y - 140) / 60);
  for (let Y = 142; Y < H; Y += 6) for (let X = (Y / 6 | 0) % 2 * 6; X < W; X += 12) R(x, '#202424', X, Y, 6, 3);
  for (let i = 0; i < 40; i++) P(x, '#d8dcd8', 80 + r() * 200, 150 + r() * 46);   // comprimidos no chão
  for (let i = 0; i < 9; i++) { const cor = ['#5a3a6a', '#2a5a7a', '#7a5a2a', '#e8eef2'][Math.floor(r() * 4)]; R(x, cor, 90 + r() * 120, 160 + r() * 30, 4, 3); }
  for (let i = 0; i < 30; i++) R(x, '#3a0e10', 150 + i * 2 + r() * 3, 178 + Math.sin(i / 3) * 3, 3, 2);   // rastro de sangue
  // balcão
  R(x, '#2a2420', 190, 120, 130, 40); R(x, '#3a322c', 190, 120, 130, 3); R(x, '#1a1614', 190, 158, 130, 2);
  R(x, '#14161a', 286, 104, 20, 16); R(x, '#2a4a3a', 289, 107, 12, 6);   // caixa registradora
  texto(x, 'FARMÁCIA', 214, 132, '#5a7a6a');
  // a mãe ajoelhada com o menino no colo, virada pra porta
  const pele = '#a86e48', ps = '#8d5a3b';
  R(x, '#2a2430', 222, 166, 20, 6); R(x, '#1a1620', 240, 168, 5, 4);   // pernas dobradas
  R(x, '#5a3a4a', 228, 144, 10, 23); R(x, '#4a2e3c', 236, 145, 2, 21); R(x, '#6a4a5a', 228, 145, 1, 20);
  disco(x, 231, 139, 4, pele); R(x, ps, 228, 138, 2, 3); P(x, '#100a08', 229, 139); R(x, '#1a1210', 232, 134, 6, 16); R(x, '#1a1210', 231, 134, 4, 3);
  R(x, '#5a3a4a', 222, 150, 8, 3); R(x, pele, 219, 150, 3, 3);   // braço estendido (pedindo)
  R(x, '#5a3a4a', 228, 156, 4, 7);
  // o menino deitado no colo
  R(x, '#3a5a7a', 212, 160, 16, 5); R(x, '#2a4a6a', 212, 164, 16, 1); R(x, '#1e2430', 228, 162, 12, 4); disco(x, 209, 160, 3, '#8d5a3b'); R(x, '#100a08', 207, 157, 5, 2);
  // Kauã na porta, contra a luz da rua
  ponha(x, pessoa({ pele: '#1e1414', peleLuz: '#2e2420', cabelo: '#0a0808', camisa: '#0e1218', camisaLuz: '#3a8a6a', camisaSombra: '#0a0c10', calca: '#0a0c10', calcaLuz: '#2a6a5a', sapato: '#050505', bone: '#2a1a10', faixa: true, item: sacola }), 40, 170);
  return c;
}

/* ------------------------------ caminho 2: corrida aceita (moto atropelando) ------------------------------ */
function faixaCidade(seed, base, alt, cores, vao, grande) {
  const k = document.createElement('canvas'); k.width = 640; k.height = H; const x = k.getContext('2d'), r = rnd(seed);
  for (let X = 0; X < 640;) {
    const w = (grande ? 18 : 7) + Math.floor(r() * (grande ? 26 : 12)), h = alt[0] + Math.floor(r() * (alt[1] - alt[0])), col = cores[Math.floor(r() * cores.length)];
    R(x, col, X, base - h, w, h); R(x, '#0a0a18', X + w - 2, base - h, 2, h);
    for (let yy = base - h + 3; yy < base - 2; yy += grande ? 6 : 3) for (let xx = X + 2; xx < X + w - 3; xx += grande ? 5 : 2) { const q = r(); if (q < vao) R(x, '#d8963e', xx, yy, grande ? 3 : 1, grande ? 2 : 1); else if (q < vao + 0.02) P(x, '#4ab8c8', xx, yy); else if (q < 0.25 && grande) R(x, '#16162a', xx, yy, 3, 2); }
    X += w + (grande ? 4 + Math.floor(r() * 10) : 1);
  }
  return k;
}
function cenaCorridaCeu() {
  const [c, x] = mk();
  G(x, 0, 0, W, 170, ['#05060c', '#0a0b17', '#111127', '#1c1630', '#33192c', '#55222a', '#782e24'], (X, Y) => Y / 190 + Math.max(0, 1 - Math.hypot((X - 220) / 160, (Y - 120) / 60)) * 0.35);
  return c;
}
function cenaFarol() {   // o cone do farol, pronto (desenhado com 'lighter')
  const [c, x] = mk();
  for (let X = 156; X < W; X++) { const meia = (X - 156) * 0.2 + 1; for (let Y = Math.floor(164 - meia); Y < 164 + meia * 1.4; Y++) { const k = 1 - (X - 156) / 170; if (k * 0.9 > th(X, Y)) P(x, 'rgba(255,236,190,0.13)', X, Y); } }
  return c;
}
const ZC = { normal: null, claro: null };
const zumbisCorrida = [], sangue = [], ganhos = [];
let proxZumbi = 0, granaCorrida = 87;
function dynCorrida(c, t, lt, dt) {
  c.drawImage(C.ceuCorrida, 0, 0);
  const v = 230, o1 = (lt * 18) % 640, o2 = (lt * 90) % 640;
  c.drawImage(C.longe, -o1, 0); c.drawImage(C.longe, 640 - o1, 0);
  c.globalCompositeOperation = 'lighter'; brilho(c, 230, 120, 60, 'rgba(255,100,40,0.10)'); c.globalCompositeOperation = 'source-over';
  c.drawImage(C.perto, -o2, 0); c.drawImage(C.perto, 640 - o2, 0);
  // rua
  R(c, '#2a2832', 0, 164, W, 1); G(c, 0, 165, W, 35, ['#14141c', '#101018', '#0b0b12'], (X, Y) => (Y - 165) / 35);
  const of = (lt * v) % 40; for (let X = -of; X < W; X += 40) R(c, '#5a5440', X, 184, 18, 1);
  const op = (lt * v) % 170;
  for (let X = -op; X < W + 40; X += 170) { R(c, '#18171f', X + 150, 92, 3, 72); R(c, '#18171f', X + 138, 92, 14, 2); P(c, '#ffd890', X + 140, 94); c.globalCompositeOperation = 'lighter'; brilho(c, X + 140, 172, 26, 'rgba(255,150,60,0.18)', 1, 0.3); c.globalCompositeOperation = 'source-over'; }
  // zumbis vindo
  proxZumbi -= dt;
  if (proxZumbi <= 0) { zumbisCorrida.push({ x: 330, y: 194, voa: false, vx: 0, vy: 0, rot: 0, f: Math.random() * 6 }); proxZumbi = 0.5 + Math.random() * 0.9; }
  const bob = Math.round(Math.sin(lt * 18) * 0.6);
  for (let i = zumbisCorrida.length - 1; i >= 0; i--) {
    const z = zumbisCorrida[i];
    if (!z.voa) {
      z.x -= v * dt * 0.8;
      if (z.x < 186) {   // atropelou
        z.voa = true; z.vx = 70 + Math.random() * 50; z.vy = -110 - Math.random() * 40; z.rs = 6 + Math.random() * 6;
        for (let k = 0; k < 14; k++) sangue.push({ x: z.x + 6, y: z.y - 14, vx: (Math.random() - 0.3) * 120, vy: -Math.random() * 120, t: 0 });
        const g = 6 + Math.floor(Math.random() * 10); granaCorrida += g; ganhos.push({ x: z.x, y: z.y - 40, v: g, t: 0 });
        somBatida();
      }
      const spr = z.x > 158 && z.x < 300 ? ZC.claro : ZC.normal;
      c.drawImage(spr, Math.round(z.x), Math.round(z.y - 30 + Math.abs(Math.sin(lt * 3 + z.f))));
    } else {
      z.vy += 260 * dt; z.x += z.vx * dt - v * dt * 0.6; z.y += z.vy * dt; z.rot += z.rs * dt;
      c.save(); c.translate(Math.round(z.x + 8), Math.round(z.y - 15)); c.rotate(z.rot); c.drawImage(ZC.normal, -8, -15); c.restore();
      if (z.y > 260 || z.x < -40) zumbisCorrida.splice(i, 1);
    }
  }
  for (let i = sangue.length - 1; i >= 0; i--) { const s = sangue[i]; s.t += dt; s.vy += 300 * dt; s.x += (s.vx - v * 0.5) * dt; s.y += s.vy * dt; if (s.t > 0.8 || s.y > 198) { sangue.splice(i, 1); continue; } P(c, '#8a1a1a', s.x, s.y); }
  motoLado(c, 132, 194 + bob, { fone: false });
  c.globalCompositeOperation = 'lighter'; c.drawImage(C.farol, 0, bob); c.globalCompositeOperation = 'source-over';
  for (let i = ganhos.length - 1; i >= 0; i--) { const g = ganhos[i]; g.t += dt; if (g.t > 1.1) { ganhos.splice(i, 1); continue; } texto(c, '+R$' + g.v, Math.round(g.x - 8 - g.t * 30), Math.round(g.y - g.t * 22), g.t < 0.8 ? '#7ee08a' : '#3a7a4a'); }
  // a grana no canto
  R(c, 'rgba(8,10,14,0.85)', 248, 6, 66, 11); texto(c, 'R$ ' + granaCorrida, 252, 9, '#7ee08a'); R(c, '#c8642a', 300, 8, 7, 7); R(c, '#f4e0c0', 302, 10, 3, 3);
  // vento e chuva de lado
  c.fillStyle = 'rgba(150,170,215,0.35)';
  for (const g of chuva) { g.x -= g.v * dt * 1.6; g.y += g.v * dt * 0.5; if (g.x < -4 || g.y > H) { g.x = W + Math.random() * 40; g.y = Math.random() * H; } c.fillRect(g.x | 0, g.y | 0, 3, 1); }
}

/* ------------------------------ caminho 2: o condomínio ------------------------------ */
function palmeira(x, X, Y, h) { for (let k = 0; k < h; k++) R(x, '#0c0e10', X + Math.round(Math.sin(k / 9) * 2), Y - k, 2, 1); const tx = X + Math.round(Math.sin(h / 9) * 2), ty = Y - h; for (const [dx, dy] of [[-10, 4], [10, 4], [-7, -3], [7, -3], [0, -6], [-12, 8], [12, 8]]) linha(x, '#0c0e10', tx, ty, tx + dx, ty + dy); }
function cenaMirante() {
  const [c, x] = mk(), r = rnd(12);
  G(x, 0, 0, W, 120, ['#05060c', '#0a0b17', '#111127', '#1c1a34', '#2a2a44'], (X, Y) => Y / 140 + Math.max(0, 1 - Math.hypot((X - 180) / 140, (Y - 90) / 50)) * 0.3);
  // as torres, todas acesas (o gerador)
  for (const [tx, tw, th2] of [[96, 46, 92], [152, 54, 104], [214, 46, 86]]) {
    R(x, '#1a1c28', tx, 100 - th2, tw, th2 + 20); R(x, '#12141e', tx + tw - 5, 100 - th2, 5, th2 + 20); R(x, '#2a2c3a', tx, 100 - th2, tw, 2);
    for (let yy = 104 - th2; yy < 112; yy += 6) for (let xx = tx + 3; xx < tx + tw - 7; xx += 6) { const q = r(); R(x, q < 0.75 ? '#e8c27a' : q < 0.9 ? '#cfe4f0' : '#2a2c3a', xx, yy, 4, 3); }
    R(x, '#3a8aa8', tx + 4, 98 - th2, tw - 10, 2);   // piscina na cobertura
  }
  x.globalCompositeOperation = 'lighter'; brilho(x, 176, 60, 100, 'rgba(255,220,150,0.08)', 1, 0.7); x.globalCompositeOperation = 'source-over';
  palmeira(x, 60, 100, 34); palmeira(x, 270, 100, 30); palmeira(x, 300, 100, 38);
  // o muro com cerca elétrica
  G(x, 0, 92, W, 84, ['#4a4640', '#403c36', '#36332e'], (X, Y) => (Y - 92) / 84);
  for (let X = 0; X < W; X += 32) R(x, '#2e2b26', X, 92, 1, 84);
  R(x, '#5a5650', 0, 92, W, 2);
  for (let X = 4; X < W; X += 24) R(x, '#2a2a2e', X, 78, 1, 14);
  for (const yy of [80, 84, 88]) R(x, '#3a3a40', 0, yy, W, 1);
  R(x, '#c8a82a', 18, 100, 22, 8); texto(x, 'PERIGO', 18, 102, '#1a1408');
  // a câmera
  for (const cx of [40, 296]) { R(x, '#1a1a20', cx, 96, 2, 10); R(x, '#2a2a32', cx - 6, 94, 9, 4); }
  // o portão
  R(x, '#16161a', 140, 104, 92, 72); for (let X = 142; X < 230; X += 4) R(x, '#2a2a30', X, 106, 2, 70); R(x, '#3a3a42', 140, 104, 92, 2); R(x, '#3a3a42', 140, 138, 92, 2);
  R(x, '#14120e', 146, 96, 80, 9); R(x, '#c8a84a', 147, 97, 78, 7); texto(x, 'JARDINS DO MIRANTE', 150, 98, '#2a1e08');
  // portaria de vidro escuro, vazia
  R(x, '#202430', 238, 110, 60, 66); R(x, '#2a3040', 240, 112, 56, 34); linha(x, '#4a5468', 244, 140, 270, 114); linha(x, '#3a4458', 252, 144, 278, 118); texto(x, 'PORTARIA', 252, 150, '#8a94a8');
  // o interfone
  R(x, '#2a2a30', 126, 136, 9, 16); R(x, '#4a4a54', 127, 137, 7, 4); R(x, '#14141a', 128, 143, 5, 6); for (let k = 0; k < 3; k++) R(x, '#3a3a44', 128, 144 + k * 2, 5, 1);
  // calçada e rua
  R(x, '#3a3842', 0, 176, W, 10); R(x, '#4a4652', 0, 176, W, 1); G(x, 0, 186, W, 14, ['#15151e', '#0b0b12'], (X, Y) => (Y - 186) / 14);
  motoLado(x, 52, 198, { piloto: false });
  ponha(x, pessoa({ ...KAUA, braco: 'frente', item: sacola }), 112, 186);
  return c;
}
// estrela 5x5 do app
function estrela(x, X, Y, cor) { R(x, cor, X + 2, Y, 1, 1); R(x, cor, X, Y + 1, 5, 1); R(x, cor, X + 1, Y + 2, 3, 1); R(x, cor, X + 1, Y + 3, 1, 1); R(x, cor, X + 3, Y + 3, 1, 1); }

/* ------------------------------ caminho 2: o acidente ------------------------------ */
function cenaAcidente() {
  const [c, x] = mk(), r = rnd(66);
  G(x, 0, 0, W, 120, ['#05060c', '#090a15', '#0f0f20', '#181428', '#241628'], (X, Y) => Y / 140);
  for (let X = 0; X < W;) { const w = 14 + Math.floor(r() * 24), h = 30 + Math.floor(r() * 60); R(x, r() < 0.5 ? '#0e0e1c' : '#121222', X, 124 - h, w, h); for (let yy = 128 - h; yy < 120; yy += 5) for (let xx = X + 2; xx < X + w - 3; xx += 4) if (r() < 0.06) R(x, '#c8863a', xx, yy, 2, 2); X += w + 2; }
  // rua molhada e o rastro da derrapagem
  G(x, 0, 120, W, 80, ['#16161f', '#121219', '#0e0e14', '#0a0a0f'], (X, Y) => (Y - 120) / 80);
  R(x, '#26242e', 0, 120, W, 1);
  for (let k = 0; k < 120; k++) { const t = k / 120, X = 30 + t * 210, Y = 186 - Math.sin(t * 3) * 10 - t * 8; R(x, '#08080a', X, Y, 3, 2); }
  // a poça de sangue
  for (let Y = 176; Y < 196; Y++) { const w = Math.round(Math.sqrt(1 - Math.pow((Y - 186) / 10, 2)) * 34); R(x, '#2a0a0e', 56 - w, Y, w * 2, 1); }
  for (let k = 0; k < 20; k++) P(x, '#5a1a1e', 30 + r() * 52, 178 + r() * 16);
  // a moto caída, com o baú aberto e as encomendas espalhadas
  R(x, '#0a0a0e', 222, 176, 18, 5); R(x, '#0a0a0e', 262, 176, 18, 5); R(x, '#1c1c24', 224, 177, 14, 2); R(x, '#1c1c24', 264, 177, 14, 2);
  R(x, '#4a1612', 232, 168, 40, 10); R(x, '#6a2620', 236, 166, 30, 3); R(x, '#1e1e26', 244, 174, 14, 6); R(x, '#24242c', 214, 172, 14, 3);
  R(x, '#9a4a1e', 196, 170, 20, 14); R(x, '#c8642a', 196, 170, 18, 12); R(x, '#3a1a08', 198, 172, 14, 3); R(x, '#c8642a', 190, 160, 18, 3);
  for (const [px, py, cor] of [[178, 182, '#8a6a4a'], [168, 188, '#d8d0c0'], [186, 190, '#8a6a4a'], [208, 190, '#5a7a9a']]) { R(x, cor, px, py, 6, 4); R(x, 'rgba(0,0,0,0.3)', px, py + 3, 6, 1); }
  // o celular trincado no chão
  R(x, '#0a0a0e', 150, 190, 6, 4); R(x, '#4ab8d8', 151, 191, 4, 2); P(x, '#e8f8ff', 152, 191); P(x, '#0a0a0e', 153, 192);
  // Kauã no chão, se levantando
  const cam = '#1e2a42', cal = '#161a26';
  R(x, cal, 92, 182, 18, 4); R(x, cal, 86, 184, 8, 3); R(x, '#0e0e14', 82, 183, 4, 4);   // pernas
  R(x, cam, 108, 176, 18, 8); R(x, '#2c3c5c', 108, 176, 18, 1); R(x, '#8a96a8', 114, 176, 2, 8);   // tronco
  R(x, cam, 124, 178, 3, 8); R(x, '#7a4a30', 124, 185, 4, 2);   // braço apoiado
  disco(x, 130, 172, 6, '#121218'); R(x, '#1a6a78', 133, 170, 4, 4); linha(x, '#a8f4ff', 133, 170, 136, 173); linha(x, '#a8f4ff', 135, 169, 134, 174);   // capacete com a viseira trincada
  // poste piscando (dinâmico) e os zumbis chegando (dinâmico)
  R(x, '#18171f', 30, 70, 3, 52); R(x, '#18171f', 30, 70, 14, 2); R(x, '#2a2930', 40, 71, 5, 2);
  return c;
}

/* ------------------------------ o final: o pé do morro, de madrugada ------------------------------ */
function cenaFimBase(comKaua, policialOlhando) {
  const [c, x] = mk(), r = rnd(77);
  G(x, 0, 0, W, 150, ['#0a0c1e', '#121834', '#1c2246', '#2c2c52', '#463a5c', '#6a4a5e', '#9a6260'], (X, Y) => Y / 150 + 0.05);
  for (let i = 0; i < 40; i++) P(x, '#4a4e6a', r() * W, r() * 40);
  // a rua lá atrás, ainda no escuro
  G(x, 0, 132, W, 46, ['#2a2236', '#201c2e', '#1a1726', '#141220'], (X, Y) => (Y - 132) / 46);
  for (let X = 0; X < W;) { const w = 10 + Math.floor(r() * 16), h = 10 + Math.floor(r() * 18); R(x, '#16141f', X, 150 - h, w, h + 26); if (r() < 0.4) R(x, '#e0a050', X + 3, 152 - h, 2, 2); X += w + 2; }
  // morro e escada (subindo pra direita), com as casas acordando
  const ax = 150, ay = 190, bx = 300, by = 54;
  morro(x, r, ax, ay, bx, by, 0.25, 0.18);
  escadaria(x, ax, ay, bx, by, ['#4a4652', '#2e2c36', '#5a5664']);
  // muro à esquerda (onde ele senta)
  R(x, '#3a3440', 0, 104, 118, 74); for (let Y = 106; Y < 176; Y += 3) for (let X = (Y / 3 | 0) % 2 * 3; X < 118; X += 6) P(x, '#2e2834', X, Y);
  R(x, '#4a4450', 0, 104, 118, 2); texto(x, 'MORRO DO FAROL', 8, 120, '#7a6a5a');   // grafite no muro
  R(x, '#c84a5a', 8, 128, 54, 1);
  // chão com poças refletindo o céu
  G(x, 0, 176, W, 24, ['#1c1a26', '#16141e', '#100e16'], (X, Y) => (Y - 176) / 24);
  for (const [px, pw] of [[40, 30], [150, 40], [240, 24]]) { R(x, '#3a3456', px, 186, pw, 2); R(x, '#5a4a62', px + 4, 186, pw - 10, 1); }
  if (comKaua) {
    // sentado contra o muro, com o braço mordido enrolado
    R(x, '#1e2a42', 98, 150, 9, 21); R(x, '#141c2e', 98, 151, 2, 19); R(x, '#8a96a8', 98, 158, 9, 2);
    disco(x, 104, 145, 4, '#7a4a30'); R(x, '#c8642a', 100, 140, 8, 3); R(x, '#c8642a', 107, 142, 3, 1); P(x, '#0a0808', 106, 147);
    R(x, '#161a26', 105, 165, 10, 5); R(x, '#161a26', 113, 165, 4, 11); R(x, '#0e0e14', 113, 174, 7, 3);   // joelho dobrado
    R(x, '#1e2a42', 100, 158, 4, 7); R(x, '#c8c0b0', 100, 163, 5, 4); R(x, '#7a1a1a', 101, 164, 3, 2);   // o pano com sangue
    R(x, '#1e2a42', 106, 155, 11, 3); R(x, '#7a4a30', 117, 154, 3, 3);   // braço estendido
    R(x, '#e6dfcf', 120, 150, 6, 7); R(x, '#6a8ab0', 121, 151, 4, 4);   // a foto
    caixaInsulina(x, 114, 160);
    disco(x, 88, 172, 5, '#121218'); R(x, '#1a6a78', 90, 170, 3, 3);   // o capacete no chão
  }
  const pol = pessoa({ ...POLICIAL, braco: 'lanterna' });
  ponha(x, policialOlhando ? pol : espelhado(pol), comKaua ? 180 : 156, 188);
  return c;
}
function cenaPolaroid() {
  const [c, x] = mk(), r = rnd(70);
  G(x, 0, 0, W, H, ['#0a0c1e', '#141a34', '#22244a', '#3a3050', '#5a4058'], (X, Y) => Y / H * 0.9 + 0.05);
  x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 14; i++) brilho(x, r() * W, r() * H, 6 + r() * 10, 'rgba(200,150,140,0.06)', 1.6); x.globalCompositeOperation = 'source-over';
  // a polaroide
  R(x, 'rgba(0,0,0,0.4)', 100, 26, 128, 156); R(x, '#e6dfcf', 96, 22, 128, 156); R(x, '#d6cfbf', 96, 176, 128, 2);
  const fx = 104, fy = 30, fw = 112, fh = 104;
  G(x, fx, fy, fw, 50, ['#cfe6f2', '#a8d0e8', '#8ec4e8'], (X, Y) => 1 - (Y - fy) / 50);
  // o morro de dia, colorido
  for (let X = fx; X < fx + fw;) { const w = 8 + Math.floor(r() * 10), h = 8 + Math.floor(r() * 12), cor = ['#c86a5a', '#e8c86a', '#6aa8a0', '#d88a9a', '#a8a2b0', '#8a5a4a'][Math.floor(r() * 6)]; R(x, cor, X, fy + 64 - h, w, h + 10); R(x, '#4a4a5a', X + 2, fy + 66 - h, 2, 2); X += w + 1; }
  R(x, '#2a6a9a', fx + 70, fy + 40, 6, 5);
  R(x, '#a8a29a', fx, fy + 74, fw, 30); R(x, '#8a847c', fx, fy + 74, fw, 1);   // a laje
  // varal
  fio(x, '#6a6a6a', fx, fy + 16, fx + fw - 1, fy + 22, 4);
  for (const [k, cor] of [[8, '#c83a3a'], [22, '#e8c84a'], [40, '#3a6ac8'], [86, '#f0f0f0'], [98, '#c86aa8']]) R(x, cor, fx + k, fy + 19 + k * 0.05, 7, 9);
  // a Vó Dita (de frente): cabelo branco em coque, óculos, blusa roxa
  const vx = fx + 40, vy = fy + 52;
  R(x, '#7a4a8a', vx - 11, vy + 9, 22, 44); R(x, '#8a5a9a', vx - 11, vy + 9, 22, 2); R(x, '#5a3a6a', vx + 8, vy + 11, 3, 40);
  disco(x, vx, vy, 8, '#8d5a3b'); disco(x, vx, vy - 9, 5, '#ece8e0'); R(x, '#ece8e0', vx - 8, vy - 6, 16, 4); R(x, '#ece8e0', vx - 9, vy - 3, 2, 6); R(x, '#ece8e0', vx + 7, vy - 3, 2, 6);
  R(x, '#2a2a2a', vx - 6, vy - 1, 5, 4); R(x, '#2a2a2a', vx + 1, vy - 1, 5, 4); R(x, '#cfe6f2', vx - 5, vy, 3, 2); R(x, '#cfe6f2', vx + 2, vy, 3, 2); R(x, '#2a2a2a', vx - 1, vy, 2, 1);
  R(x, '#5a2a1a', vx - 3, vy + 4, 6, 1); P(x, '#5a2a1a', vx - 4, vy + 3); P(x, '#5a2a1a', vx + 3, vy + 3);   // o sorriso
  // Kauã (de frente): boné laranja, camiseta azul, o braço por cima do ombro dela
  const kx = fx + 74, ky = fy + 48;
  R(x, '#2c3c5c', kx - 13, ky + 10, 26, 46); R(x, '#3a4c70', kx - 13, ky + 10, 26, 2);
  disco(x, kx, ky, 8, '#7a4a30'); R(x, '#c8642a', kx - 8, ky - 9, 16, 5); R(x, '#e0884a', kx - 8, ky - 9, 16, 1); R(x, '#c8642a', kx - 12, ky - 5, 8, 2);
  R(x, '#1a0e08', kx - 4, ky - 1, 2, 2); R(x, '#1a0e08', kx + 3, ky - 1, 2, 2); R(x, '#f0e8e0', kx - 3, ky + 4, 7, 2); R(x, '#3a1a10', kx - 3, ky + 3, 7, 1);
  R(x, '#2c3c5c', vx + 2, ky + 12, kx - vx - 8, 4); R(x, '#7a4a30', vx + 6, ky + 12, 4, 4);
  // o bolo de 70 anos
  R(x, '#6a4a30', fx + 44, fy + 92, 40, 12); R(x, '#f0ece0', fx + 50, fy + 82, 28, 10); R(x, '#e07090', fx + 50, fy + 82, 28, 2); R(x, '#e07090', fx + 50, fy + 90, 28, 1);
  texto(x, '70', fx + 59, fy + 75, '#e8c84a'); P(x, '#ff8a3a', fx + 60, fy + 73); P(x, '#ff8a3a', fx + 64, fy + 73);
  // foto envelhecida: um calor amarelado e grão
  R(x, 'rgba(255,190,110,0.10)', fx, fy, fw, fh); for (let i = 0; i < 260; i++) P(x, r() < 0.5 ? 'rgba(255,255,255,0.10)' : 'rgba(0,0,0,0.10)', fx + r() * fw, fy + r() * fh);
  texto(x, 'VÓ DITA 70 ANOS', 112, 148, '#2a4a8a'); R(x, '#c83a5a', 176, 149, 2, 2); R(x, '#c83a5a', 179, 149, 2, 2); R(x, '#c83a5a', 176, 150, 5, 2); R(x, '#c83a5a', 177, 152, 3, 1); P(x, '#c83a5a', 178, 153);
  texto(x, '12/03', 112, 158, '#5a6a8a');
  for (let k = 0; k < 9; k++) P(x, '#6a1414', 210 + r() * 12, 166 + r() * 10);   // a marca de sangue no canto
  // os dedos segurando
  R(x, '#3a2418', 82, 120, 18, 60); R(x, '#5a3a28', 84, 118, 16, 58); R(x, '#6e4834', 84, 118, 16, 2); disco(x, 100, 126, 5, '#5a3a28'); R(x, '#8a7064', 98, 122, 4, 3);
  R(x, '#3a2418', 212, 150, 30, 50); R(x, '#5a3a28', 214, 148, 28, 52); disco(x, 214, 156, 5, '#5a3a28'); R(x, '#8a7064', 210, 152, 4, 3);
  R(x, '#c8c0b0', 222, 172, 22, 12); R(x, '#7a1a1a', 226, 175, 9, 5); R(x, '#5a0e0e', 228, 177, 4, 2);   // o curativo improvisado
  return c;
}
/* =========================================================================
   Som: chuva, a cidade ao longe, sirene, motor, fogo, pássaros, celular (Web Audio)
   ========================================================================= */
let AC_EXT = null, SAIDA = null;
let AC = null, master, ruido, chuvaG, sireneG, motorG, motorO, fogoG, passarosV = 0;
function ligarSom() {
  if (AC) return;
  if (!AC_EXT) return;   // usa o som do jogo (view/som.js): mesmo volume e mesmo liga/desliga
  AC = AC_EXT;
  master = AC.createGain(); master.gain.value = 0.9;
  master.connect(SAIDA);
  const n = AC.sampleRate * 3, b = AC.createBuffer(1, n, AC.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
  ruido = b;
  const fonte = (tipo, f, q) => { const s = AC.createBufferSource(); s.buffer = ruido; s.loop = true; const fl = AC.createBiquadFilter(); fl.type = tipo; fl.frequency.value = f; if (q) fl.Q.value = q; s.connect(fl); s.start(0, Math.random() * 2); return fl; };
  chuvaG = AC.createGain(); chuvaG.gain.value = 0;
  const hp = fonte('highpass', 900); const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 7000; hp.connect(lp).connect(chuvaG);
  const gotas = fonte('bandpass', 3200, 0.7); const gg = AC.createGain(); gg.gain.value = 0.35; gotas.connect(gg).connect(chuvaG);
  chuvaG.connect(master);
  const ronco = fonte('lowpass', 110); const rg = AC.createGain(); rg.gain.value = 0.3; ronco.connect(rg).connect(master);
  const lfo = AC.createOscillator(); lfo.frequency.value = 0.07; const lg = AC.createGain(); lg.gain.value = 0.12; lfo.connect(lg).connect(rg.gain); lfo.start();
  // sirene bem longe, com eco
  const os = AC.createOscillator(); os.type = 'triangle'; os.frequency.value = 760;
  const wail = AC.createOscillator(); wail.frequency.value = 0.22; const wg = AC.createGain(); wg.gain.value = 190; wail.connect(wg).connect(os.frequency); wail.start();
  const sl = AC.createBiquadFilter(); sl.type = 'lowpass'; sl.frequency.value = 1100;
  sireneG = AC.createGain(); sireneG.gain.value = 0;
  const eco = AC.createDelay(1); eco.delayTime.value = 0.33; const fb = AC.createGain(); fb.gain.value = 0.42;
  os.connect(sl).connect(sireneG); sireneG.connect(master); sireneG.connect(eco); eco.connect(fb).connect(eco); eco.connect(master); os.start();
  // motor da moto (125 cc): dente de serra grave, filtrado, com tremido
  motorO = AC.createOscillator(); motorO.type = 'sawtooth'; motorO.frequency.value = 58;
  const m2 = AC.createOscillator(); m2.type = 'square'; m2.frequency.value = 29;
  const mt = AC.createOscillator(); mt.frequency.value = 23; const mtg = AC.createGain(); mtg.gain.value = 6; mt.connect(mtg).connect(motorO.frequency); mt.start();
  const mf = AC.createBiquadFilter(); mf.type = 'lowpass'; mf.frequency.value = 520; mf.Q.value = 3;
  motorG = AC.createGain(); motorG.gain.value = 0;
  const m2g = AC.createGain(); m2g.gain.value = 0.5; m2.connect(m2g).connect(mf);
  motorO.connect(mf).connect(motorG).connect(master); motorO.start(); m2.start();
  // fogo crepitando
  const fg = fonte('bandpass', 1400, 0.6); fogoG = AC.createGain(); fogoG.gain.value = 0; fg.connect(fogoG).connect(master);
  const ff = fonte('lowpass', 220); const ffg = AC.createGain(); ffg.gain.value = 0.6; ff.connect(ffg).connect(fogoG);
}
const rampa = (g, v, s = 1.2) => { if (!AC || !g) return; g.gain.cancelScheduledValues(AC.currentTime); g.gain.setTargetAtTime(v, AC.currentTime, s / 3); };
function nota(f, q, dur, vol, tipo = 'sine', f2) {
  if (!AC) return; const t0 = AC.currentTime + q, o = AC.createOscillator(), g = AC.createGain();
  o.type = tipo; o.frequency.setValueAtTime(f, t0); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  o.connect(g).connect(master); o.start(t0); o.stop(t0 + dur + 0.05);
}
function estouro(q, dur, vol, tipo, f, ataque = 0.005, f2, Q) {
  if (!AC) return; const t0 = AC.currentTime + q, s = AC.createBufferSource(), fl = AC.createBiquadFilter(), g = AC.createGain();
  s.buffer = ruido; fl.type = tipo; fl.frequency.setValueAtTime(f, t0); if (f2) fl.frequency.exponentialRampToValueAtTime(f2, t0 + dur); if (Q) fl.Q.value = Q;
  g.gain.setValueAtTime(0, t0); g.gain.linearRampToValueAtTime(vol, t0 + ataque); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  s.connect(fl).connect(g).connect(master); s.start(t0, Math.random() * 2); s.stop(t0 + dur + 0.05);
}
const SONS = {
  app: () => { nota(1318, 0, 0.18, 0.12); nota(1760, 0.09, 0.3, 0.12); },
  corrida: () => { nota(988, 0, 0.12, 0.13, 'square'); nota(1318, 0.12, 0.12, 0.11, 'square'); nota(1976, 0.24, 0.35, 0.1, 'square'); },
  mensagem: () => { nota(880, 0, 0.12, 0.1); nota(1175, 0.1, 0.25, 0.1); },
  cancelou: () => { nota(660, 0, 0.2, 0.11, 'square'); nota(440, 0.18, 0.4, 0.1, 'square'); },
  trovao: () => { estouro(0, 0.25, 0.25, 'highpass', 1800); estouro(0.05, 4.5, 0.6, 'lowpass', 160, 0.12); estouro(0.6, 3, 0.3, 'lowpass', 90, 0.4); },
  interfone: () => { nota(420, 0, 0.35, 0.06, 'square'); nota(420, 0.45, 0.35, 0.06, 'square'); },
  voz: () => { estouro(0, 0.12, 0.08, 'bandpass', 1500, 0.01, null, 4); for (let k = 0; k < 6; k++) estouro(0.1 + k * 0.11, 0.09, 0.05, 'bandpass', 900 + Math.random() * 900, 0.01, null, 6); },
  concluida: () => { nota(784, 0, 0.15, 0.1); nota(1046, 0.12, 0.15, 0.1); nota(1318, 0.24, 0.4, 0.1); },
  acelera: () => { if (motorO) { motorO.frequency.cancelScheduledValues(AC.currentTime); motorO.frequency.setValueAtTime(48, AC.currentTime); motorO.frequency.linearRampToValueAtTime(92, AC.currentTime + 1.6); } },
  freada: () => { estouro(0, 1.3, 0.22, 'bandpass', 2600, 0.05, 1500, 9); },
  batida: () => { estouro(0, 0.5, 0.7, 'lowpass', 400, 0.003); estouro(0, 1.4, 0.3, 'highpass', 2200, 0.003); for (let k = 0; k < 7; k++) nota(300 + Math.random() * 1600, 0.05 + k * 0.09, 0.3, 0.05, 'square'); estouro(0.4, 1.6, 0.2, 'bandpass', 3500, 0.01); },
  coracao: () => { nota(55, 0, 0.18, 0.4, 'sine', 40); nota(52, 0.24, 0.2, 0.3, 'sine', 38); },
  continua: () => { nota(392, 0, 1.2, 0.07); nota(523, 0.25, 1.4, 0.06); nota(659, 0.5, 2, 0.05); }
};
const somBatida = () => { if (!AC) return; estouro(0, 0.18, 0.4, 'lowpass', 260, 0.002); estouro(0, 0.08, 0.15, 'bandpass', 1200, 0.002); nota(90, 0, 0.12, 0.2, 'sine', 50); };
const tecla = () => { estouro(0, 0.035, 0.22, 'bandpass', 2400 + Math.random() * 900); nota(150 + Math.random() * 30, 0, 0.04, 0.12, 'triangle'); };
const sininho = () => { nota(2093, 0, 1.4, 0.08); nota(3136, 0.01, 1, 0.04); };
function passarinho() { const f = 2600 + Math.random() * 1400; for (let k = 0; k < 2 + Math.floor(Math.random() * 3); k++) nota(f, k * 0.11, 0.08, 0.025, 'sine', f * (0.7 + Math.random() * 0.6)); }

/* =========================================================================
   Os capítulos: cada um tem tomadas (cenas), legendas, eventos e o que vem depois
   ========================================================================= */
const C = {};
const precisa = (k, f) => C[k] || (C[k] = f());
const zumbiAnda = [];
// dinâmicas de cada tomada
function dynAbertura1(c, t, lt, dt) {
  c.drawImage(precisa('c1', cena1), 0, 0); desenharFumaca(dt); chamas(FOGOS1, t);
  if (Math.floor(t * 1.2) % 2) P(c, '#ff3a2a', TORRE[0], TORRE[1] - 1);
  const sir = Math.floor(t * 5) % 2; P(c, sir ? '#ff2a2a' : '#2a6aff', 226, 144); P(c, sir ? '#2a6aff' : '#ff2a2a', 252, 144);
  c.globalCompositeOperation = 'lighter'; const pc = 0.55 + 0.15 * Math.sin(t * 2.1);
  brilho(c, 163, 132, 20, `rgba(90,220,240,${0.2 * pc})`); brilho(c, 163, 132, 8, `rgba(150,240,255,${0.35 * pc})`); c.globalCompositeOperation = 'source-over';
  desenharChuva(dt);
}
function dynAbertura2(c, t, lt) {
  c.drawImage(precisa('c2', cena2), 0, 0); telaCelular(c, lt);
  const rr = rnd(3);
  for (let i = 0; i < 22; i++) { const X = FONE.tx + rr() * FONE.tw, Y0 = FONE.ty + rr() * 170, desce = rr() < 0.3 ? (lt * (6 + rr() * 10)) % 60 : 0; P(c, 'rgba(200,235,255,0.55)', X, Y0 + desce); P(c, 'rgba(0,0,0,0.5)', X, Y0 + desce + 1); }
  c.globalCompositeOperation = 'lighter'; brilho(c, 160, 100, 70, 'rgba(70,170,210,0.05)', 1, 1.4);
  if (lt > 1 && lt < 1.4 || lt > 3.5 && lt < 3.9 || lt > 7.5 && lt < 7.9) R(c, 'rgba(120,200,255,0.12)', FONE.tx, FONE.ty, FONE.tw, 176);
  c.globalCompositeOperation = 'source-over';
  desenharChuva(1 / 60, 0);
}
function dynAbertura3(c, t, lt, dt) {
  c.drawImage(precisa('c3', cena3), 0, 0); desenharFumaca(dt); chamas(FOGOS3, t);
  if (Math.floor(t * 1.6) % 2) { P(c, '#ffb02a', 86, 152); P(c, '#ffb02a', 115, 152); }
  for (const [zx, zy, f] of [[58, 138, 0], [70, 141, 1.3], [40, 136, 2.1]]) { const bal = Math.round(Math.sin(t * 2 + f)); R(c, '#0c0b12', zx + bal, zy - 9, 3, 6); R(c, '#0c0b12', zx + bal, zy - 11, 3, 2); R(c, '#0c0b12', zx, zy - 3, 1, 3); R(c, '#0c0b12', zx + 2, zy - 3, 1, 3); R(c, '#0c0b12', zx + 3 + bal, zy - 8, 3, 1); }
  c.globalCompositeOperation = 'lighter'; const vela = 0.8 + 0.2 * Math.sin(t * 3.3) * Math.sin(t * 1.7);
  brilho(c, CASA_VO[0] - 3, CASA_VO[1] + 6, 9, `rgba(255,190,100,${0.22 * vela})`); brilho(c, 152, 172, 24, 'rgba(255,40,40,0.16)', 1, 0.8); R(c, '#ff4a3a', 147, 171, 10, 2);
  c.globalCompositeOperation = 'source-over';
  desenharChuva(dt);
}
function dynVo(c, t, lt, dt) {
  c.drawImage(precisa('vo', cenaVo), 0, 0);
  if (Math.random() < 0.02) R(c, 'rgba(0,0,0,0.35)', 0, 100, 140, 100);   // o poste falhando
  c.globalCompositeOperation = 'lighter'; brilho(c, CASA_VO1[0] - 3, CASA_VO1[1] + 6, 8, `rgba(255,190,100,${0.2 + 0.05 * Math.sin(t * 3)})`); c.globalCompositeOperation = 'source-over';
  desenharChuva(dt);
  notificacao(c, lt, 1, ['VOCÊ CANCELOU 1 ENTREGA.', 'SUA CONTA PODE SER SUSPENSA.']);
}
function dynFarmacia(c, t, lt, dt) {
  c.drawImage(precisa('farm', cenaFarmacia), 0, 0);
  // a cruz verde lá fora piscando falhada
  const on = (Math.sin(t * 7) + Math.sin(t * 2.3)) > -0.6;
  c.globalCompositeOperation = 'lighter';
  if (on) { brilho(c, 38, 100, 40, 'rgba(60,220,120,0.10)', 1, 1.6); R(c, 'rgba(60,220,120,0.10)', 12, 56, 52, 114); }
  // a lâmpada pendurada balançando sobre a mãe
  const ang = Math.sin(t * 1.3) * 0.25, lx = 230 + Math.sin(ang) * 40, ly = 40 + Math.cos(ang) * 40;
  c.globalCompositeOperation = 'source-over'; linha(c, '#2a2a2a', 230, 0, lx, ly); R(c, '#3a3a3a', lx - 3, ly, 7, 3); P(c, '#fff2c8', lx, ly + 3);
  c.globalCompositeOperation = 'lighter'; brilho(c, lx, ly + 70, 60, 'rgba(255,220,160,0.08)', 1, 1.3); brilho(c, lx, 168, 40, 'rgba(255,220,160,0.12)', 1, 0.3);
  c.globalCompositeOperation = 'source-over';
  // chuva só na porta
  c.save(); c.beginPath(); c.rect(12, 56, 52, 114); c.clip(); desenharChuva(dt, 0); c.restore();
}
function dynCorridaT(c, t, lt, dt) { if (!C.longe) { C.ceuCorrida = cenaCorridaCeu(); C.longe = faixaCidade(3, 150, [20, 70], ['#13122a', '#17162e', '#1a1932'], 0.05, false); C.perto = faixaCidade(8, 166, [40, 110], ['#0c0c1a', '#0e0e1e'], 0.06, true); C.farol = cenaFarol(); ZC.normal = spriteZumbi(); ZC.claro = spriteZumbi(true); } dynCorrida(c, t, lt, dt); }
function dynMirante(c, t, lt, dt) {
  c.drawImage(precisa('mir', cenaMirante), 0, 0);
  if (Math.floor(t * 1.5) % 2) { P(c, '#ff2a2a', 34, 95); P(c, '#ff2a2a', 302, 95); }
  const fala = (lt > 4.2 && lt < 6.5) || (lt > 10.4 && lt < 12.4);
  P(c, fala && Math.floor(t * 8) % 2 ? '#7aff9a' : '#2a6a3a', 132, 138);
  desenharChuva(dt);
  if (lt > 14.5) {   // o celular: entrega concluída e a avaliação
    notificacao(c, lt, 14.5, ['ENTREGA CONCLUÍDA  +R$ 87,50', 'O CLIENTE AVALIOU:', '"DEMOROU."'], '#2f9a5a');
    if (lt > 15.2) { const x0 = Math.round((W - (4 + largura('ENTREGA CONCLUÍDA  +R$ 87,50') + 14)) / 2) + 13 + largura('O CLIENTE AVALIOU:') + 4; for (let k = 0; k < 5; k++) estrela(c, x0 + k * 7, 17, k < 3 ? '#e8c84a' : '#3a3a44'); }
  }
}
function dynAcidente1(c, t, lt) {
  R(c, '#000', 0, 0, W, H);
  if (lt > 1.25 && lt < 1.45) R(c, '#fff', 0, 0, W, H);
  if (lt > 1.45 && lt < 1.9) R(c, 'rgba(255,255,255,0.15)', 0, 0, W, H);
}
function dynAcidente2(c, t, lt, dt) {
  const shake = lt < 0.6 ? Math.round((Math.random() - 0.5) * 6 * (1 - lt / 0.6)) : 0;
  c.drawImage(precisa('acid', cenaAcidente), shake, shake);
  chamas([[250, 168], [256, 170]], t); desenharFumaca(dt);
  if (Math.random() < 0.85) { P(c, '#ffd890', 42, 73); c.globalCompositeOperation = 'lighter'; brilho(c, 42, 140, 40, 'rgba(255,160,70,0.08)', 1, 1.4); c.globalCompositeOperation = 'source-over'; }
  c.globalCompositeOperation = 'lighter'; brilho(c, 252, 168, 40, `rgba(255,120,40,${0.14 + 0.05 * Math.sin(t * 11)})`); brilho(c, 153, 192, 10, 'rgba(80,200,240,0.2)'); c.globalCompositeOperation = 'source-over';
  // zumbis chegando do escuro
  if (!zumbiAnda.length) for (const [x0, f] of [[-14, 0], [4, 1.4], [-30, 2.2]]) zumbiAnda.push({ x: x0, f });
  for (const z of zumbiAnda) { z.x += dt * 4; const spr = espelhadoZ(); c.drawImage(spr, Math.round(z.x), 150 + Math.round(Math.abs(Math.sin(t * 2 + z.f)))); }
  desenharChuva(dt);
}
let _zEsp = null; const espelhadoZ = () => _zEsp || (_zEsp = espelhado(spriteZumbi()));
function dynFim1(c, t, lt, dt) {
  c.drawImage(precisa('fim1', () => cenaFimBase(true, false)), 0, 0);
  c.globalCompositeOperation = 'lighter';
  const fl = 0.9 + 0.1 * Math.sin(t * 13) * Math.sin(t * 3);
  for (let X = 108; X < 165; X++) { const k = (164 - X) / 56, meia = 1 + k * 9, cy = 155 + k * 6; for (let Y = Math.floor(cy - meia); Y < cy + meia; Y++) { const borda = 1 - Math.abs(Y - cy) / meia; if (borda * (1 - k * 0.55) * 0.75 * fl > th(X, Y)) P(c, 'rgba(255,240,200,0.07)', X, Y); } }
  brilho(c, 112, 158, 16, `rgba(255,240,200,${0.09 * fl})`);
  c.globalCompositeOperation = 'source-over';
  pingos(c, dt);
}
function dynPolaroid(c, t, lt) { c.drawImage(precisa('pol', cenaPolaroid), 0, Math.round(Math.sin(lt * 1.1) * 1)); }
function dynFim3(c, t, lt, dt) {
  c.drawImage(precisa('fim3', () => cenaFimBase(false, true)), 0, 0);
  // o dia chegando
  R(c, `rgba(255,170,120,${Math.min(0.12, lt * 0.012)})`, 0, 0, W, 150);
  // Kauã indo embora, mancando, rua abaixo
  const x = 104 - lt * 9, passo = lt * 0.9;
  if (x > -20) { const spr = espelhado(pessoa({ ...KAUA }, passo)); c.drawImage(spr, Math.round(x - 16), Math.round(188 - 62 + (Math.sin(passo * Math.PI * 2) > 0 ? 1 : 0))); }
  pingos(c, dt);
}
const gotasPingo = [];
function pingos(c, dt) { if (Math.random() < 0.08) gotasPingo.push({ x: Math.random() * W, y: 100 + Math.random() * 40, v: 0 }); for (let i = gotasPingo.length - 1; i >= 0; i--) { const g = gotasPingo[i]; g.v += 300 * dt; g.y += g.v * dt; if (g.y > 196) { gotasPingo.splice(i, 1); continue; } P(c, 'rgba(180,190,230,0.6)', g.x, g.y); } }

const CAPS = [
  { id: 'abertura', etapa: 'Abertura', nome: 'A tarifa 5×', classe: '', quando: 'Começo de toda partida do entregador. Termina com a votação do caminho.',
    tomadas: [{ ini: 0, fim: 13, dyn: dynAbertura1, som: { chuva: 0.11, sirene: 0.016 }, ent: () => semearFumaca(FOGOS1) }, { ini: 13, fim: 28, dyn: dynAbertura2, som: { chuva: 0.16, sirene: 0.006 } }, { ini: 28, fim: 40, dyn: dynAbertura3, som: { chuva: 0.12, sirene: 0.012 }, ent: () => semearFumaca(FOGOS3) }],
    legendas: [[1.2, 6, 'Porto Sereno. 23h47. Terceira noite da Febre Cinza.'], [7, 12.4, 'A cidade parou. O aplicativo, não.'], [17.6, 20.4, 'Cada entrega vale cinco. A moto ainda tem 41 parcelas.'], [21.8, 27.4, 'A insulina da Vó Dita acabou ontem.'], [29, 33.6, 'Na mochila, insulina pra um condomínio. Em casa, a avó sem nenhuma.'], [34.6, 39.8, 'Kauã, 22 anos. Nota 4,8. Pra onde ele vai?']],
    eventos: [[8.6, 'raio'], [9.4, 'trovao'], [14, 'app'], [16.5, 'corrida'], [20.5, 'mensagem']],
    fim: { titulo: 'O CHAT DECIDE · digite 1 ou 2', ops: [{ n: 1, fria: true, nome: '🏠 Subir até a Vó Dita', txt: 'Larga as entregas e leva a insulina pra casa. Sem arma nenhuma, mas muita esquiva e velocidade.', vai: 'vo' }, { n: 2, nome: '📦 Aceitar as entregas (5×)', txt: 'Atropela zumbis de moto e junta muita grana... até a moto não aguentar.', vai: 'corrida' }] } },
  { id: 'vo', etapa: 'Caminho 1', nome: 'A Vó primeiro', classe: 'c1', quando: 'Se o chat votar 1. Logo depois, começa a gameplay a pé.',
    tomadas: [{ ini: 0, fim: 15, dyn: dynVo, som: { chuva: 0.12, sirene: 0.01 } }],
    legendas: [[3.2, 7, 'Pela primeira vez na vida, Kauã cancelou uma corrida.'], [7.6, 11, 'Moto não sobe escadaria. Daqui pra frente, é na perna.'], [11.4, 15, 'Sem arma. Só a insulina, o fôlego e os becos que ele conhece de cor.']],
    eventos: [[1, 'cancelou']],
    fim: { titulo: '▶ COMEÇA A GAMEPLAY A PÉ', texto: 'Sem arma nenhuma: muita esquiva e velocidade. O destino no mapa é a casa da Vó Dita, no alto do Morro do Farol. No caminho, a farmácia da Rua 9.', prox: [['farmacia', 'Farmácia da Rua 9 →']] } },
  { id: 'farmacia', etapa: 'Caminho 1', nome: 'Farmácia da Rua 9', classe: 'c1', quando: 'Encontro no meio do caminho (como os pedidos de ajuda que já existem).',
    tomadas: [{ ini: 0, fim: 18, dyn: dynFarmacia, som: { chuva: 0.05, sirene: 0.006 } }],
    legendas: [[1, 5, 'Farmácia da Rua 9. Saqueada até a última prateleira.'], [5.6, 9.4, '— Moço... ele é diabético. Tá passando mal desde ontem.', 1], [10, 12.6, '— Só uma caixa. Por favor.', 1], [13.4, 17.8, 'Duas caixas. Uma avó. Um menino.']],
    eventos: [[13.4, 'coracao'], [15, 'coracao']],
    fim: { titulo: 'O CHAT DECIDE · digite 1 ou 2', ops: [{ n: 1, fria: true, nome: '💊 Dar uma caixa', txt: 'O menino vive. A avó fica com metade da insulina, e a viagem vira uma corrida contra o tempo.', vai: 'fim', nota: 'A mãe chora. O menino aperta a mão dele. A morte, se vier, conta que ele dividiu.' }, { n: 2, nome: '🚶 Seguir', txt: 'Leva as duas caixas. A mãe grita o nome dele até a esquina.', vai: 'fim', nota: 'Ninguém fica sabendo. Só ele. A morte, se vier, conta que ele não olhou pra trás.' }] } },
  { id: 'corrida', etapa: 'Caminho 2', nome: 'Corrida aceita', classe: 'c2', quando: 'Se o chat votar 2. Logo depois, começa a gameplay de moto.',
    tomadas: [{ ini: 0, fim: 16, dyn: dynCorridaT, som: { chuva: 0.08, sirene: 0.01, motor: 0.11 } }],
    legendas: [[1.2, 5, 'Corrida aceita. 3,2 km. Tarifa 5×.'], [6, 10.4, 'Pra quem tá de moto, zumbi é quebra-molas.'], [11, 15.6, 'Cada entrega é um destino no mapa. O chat escolhe: reto, direita ou esquerda.']],
    eventos: [[0.4, 'acelera'], [0.2, 'corrida']],
    fim: { titulo: '▶ COMEÇA A GAMEPLAY DE MOTO', texto: 'Ele vai de quarteirão em quarteirão atropelando zumbis e juntando grana; o chat escolhe reto, direita ou esquerda. A primeira entrega é o condomínio Jardins do Mirante.', prox: [['mirante', 'Jardins do Mirante →']] } },
  { id: 'mirante', etapa: 'Caminho 2', nome: 'Jardins do Mirante', classe: 'c2', quando: 'Quando ele chega no destino da primeira entrega.',
    tomadas: [{ ini: 0, fim: 19, dyn: dynMirante, som: { chuva: 0.1, sirene: 0.004 } }],
    legendas: [[0.8, 4, 'Condomínio Jardins do Mirante. Gerador ligado. Luz em todas as janelas.'], [4.4, 6.6, '— Entrega pro 1204. A insulina.', 1], [7, 9, '— Deixa na portaria.', 1], [9.4, 11.6, '— Não tem ninguém na portaria, senhor.', 1], [11.8, 14, '— Então deixa no chão.', 1]],
    eventos: [[2.4, 'interfone'], [7, 'voz'], [11.8, 'voz'], [14.5, 'concluida']],
    fim: { titulo: '▶ A GAMEPLAY DE MOTO CONTINUA', texto: 'Mais entregas, mais grana (5×). Quando já tiver passado um tempo bom de moto, no começo de um quarteirão, ele cai.', prox: [['acidente', 'A poça →']] } },
  { id: 'acidente', etapa: 'Caminho 2', nome: 'A poça', classe: 'c2', quando: 'Depois de um tempo de moto, no começo de um quarteirão. Logo depois, a gameplay de sempre, a pé.',
    tomadas: [{ ini: 0, fim: 2.6, dyn: dynAcidente1, som: { chuva: 0.0, sirene: 0, motor: 0.12 }, sem: true }, { ini: 2.6, fim: 17, dyn: dynAcidente2, som: { chuva: 0.1, sirene: 0.008, motor: 0, fogo: 0.12 }, ent: () => { semearFumaca([[250, 166]]); zumbiAnda.length = 0; } }],
    legendas: [[3.6, 6.6, 'A poça era de sangue.'], [7.4, 11, '41 parcelas, pegando fogo.'], [11.8, 16.6, 'R$ 412 no bolso. Daqui pra frente, a pé.']],
    eventos: [[0.1, 'acelera'], [0.5, 'freada'], [1.3, 'batida'], [5.2, 'coracao'], [6.4, 'coracao']],
    fim: { titulo: '▶ COMEÇA A GAMEPLAY A PÉ', texto: 'Sem a moto, mas com o bolso cheio: dá pra comprar arma e suprimento do Barganha. A insulina da avó ele precisa conseguir de novo (o Barganha tem, e cobra caro).', prox: [['fim', 'O fim da linha →']] } },
  { id: 'fim', etapa: 'Final', nome: 'O fim da linha', classe: 'fim', quando: 'Quando ele chega no objetivo (os dois caminhos acabam aqui).',
    tomadas: [{ ini: 0, fim: 15, dyn: dynFim1, som: { chuva: 0, sirene: 0.003, passaros: 1 } }, { ini: 15, fim: 24, dyn: dynPolaroid, som: { chuva: 0, sirene: 0, passaros: 0.4 } }, { ini: 24, fim: 37, dyn: dynFim3, som: { chuva: 0, sirene: 0, passaros: 1 } }],
    legendas: [[1, 5.2, 'Kauã chegou ao pé do morro. A mordida, ele escondeu o caminho inteiro.'], [5.8, 9.6, '— Ela mora lá em cima. Casa rosa, caixa d’água azul.', 1], [10.2, 14.6, '— Entrega isso pra ela. Fala que eu cheguei.', 1], [16, 23.4, 'Aniversário de 70 anos da Vó Dita. Ele pagou o bolo em três vezes.'], [25, 30, 'Ele desceu de volta pra rua escura. Pra não virar perto dela.'], [31, 36.6, 'O policial olhou a escadaria. A casa rosa já tinha luz.']],
    eventos: [[33, 'continua']],
    fim: { titulo: 'CONTINUA NA HISTÓRIA DO POLICIAL', texto: 'No final dele, antes de terminar a própria história, o policial sobe a escadaria do Morro do Farol, encontra a Vó Dita em segurança e entrega a insulina e a foto.', prox: [['abertura', '↺ Voltar pro começo']] } }
];


/* =========================================================================
   O projetor do jogo: desenha o capítulo no tempo que o core manda
   ========================================================================= */
let flash = 0;
export class Cinema {
  constructor(canvas, legenda) {
    this.cv = canvas; ctx = canvas.getContext('2d'); ctx.imageSmoothingEnabled = false;
    this.leg = legenda; this.capId = null; this.t = 0; this.trocas = [];
  }
  // liga o som do cinema no som do jogo (AudioContext + o canal de efeitos)
  usarAudio(ac, saida) { if (ac && !AC_EXT) { AC_EXT = ac; SAIDA = saida; } }
  zerar(capId) {
    this.capId = capId; this.feitos = new Set(); this.tomadaAtual = -1; this.legAtual = -1; flash = 0;
    zumbisCorrida.length = 0; sangue.length = 0; ganhos.length = 0; granaCorrida = 87; proxZumbi = 1.2; zumbiAnda.length = 0;
  }
  // um quadro do capítulo capId no tempo t (segundos desde o começo dele)
  // fimPreto: escurece no fim (a queda da moto); sem isso a última cena continua por trás da votação
  quadro(capId, t, dt, fimPreto = false) {
    const cap = CAPS.find(k => k.id === capId);
    if (!cap) return false;
    if (capId !== this.capId || t < this.t - 0.5) this.zerar(capId);
    this.t = t;
    ligarSom();
    for (const [q, e] of cap.eventos) if (t >= q && !this.feitos.has(q + e)) { this.feitos.add(q + e); if (e === 'raio') flash = 1; else if (SONS[e]) SONS[e](); }
    let ti = cap.tomadas.findIndex(k => t < k.fim); if (ti < 0) ti = cap.tomadas.length - 1;
    const tom = cap.tomadas[ti];
    if (ti !== this.tomadaAtual) {
      this.tomadaAtual = ti; tom.ent?.();
      const s = tom.som || {};
      rampa(chuvaG, s.chuva ?? 0); rampa(sireneG, s.sirene ?? 0, 2); rampa(motorG, s.motor ?? 0, 0.6); rampa(fogoG, s.fogo ?? 0, 1); passarosV = s.passaros ?? 0;
    }
    if (passarosV > 0 && Math.random() < 0.012 * passarosV) passarinho();
    const lt = t - tom.ini;
    ctx.save(); tom.dyn(ctx, t, lt, dt); ctx.restore();
    ctx.globalCompositeOperation = 'source-over';
    if (flash > 0) { ctx.fillStyle = `rgba(200,210,255,${0.55 * flash})`; ctx.fillRect(0, 0, W, H); flash = Math.max(0, flash - dt * (flash > 0.6 ? 2.5 : 4)); if (cap.id === 'abertura' && t > 8.78 && t < 8.84) flash = 0.8; }
    const desde = t - tom.ini, ate = tom.fim - t, ultima = ti === cap.tomadas.length - 1;
    let preto = 0; if (!tom.sem && desde < 0.9) preto = 1 - desde / 0.9; if (!ultima && !cap.tomadas[ti + 1].sem && ate < 0.8) preto = Math.max(preto, 1 - ate / 0.8);
    if (ultima && fimPreto && ate < 0.6) preto = Math.max(preto, 1 - Math.max(0, ate) / 0.6);
    if (preto > 0) { ctx.fillStyle = `rgba(0,0,0,${preto})`; ctx.fillRect(0, 0, W, H); }
    const li = cap.legendas.findIndex(([a, b]) => t >= a && t < b);
    if (li !== this.legAtual) { this.legAtual = li; this.legenda(li >= 0 ? cap.legendas[li][2] : null, !!cap.legendas[li]?.[3]); }
    return true;
  }
  legenda(txt, fala = false) {
    if (!this.leg) return;
    if (txt) { for (const [a, b] of this.trocas || []) txt = txt.split(a).join(b); this.leg.textContent = txt; this.leg.classList.toggle('fala', fala); this.leg.classList.add('on'); } else this.leg.classList.remove('on');
  }
  // cartão de quem ainda não tem filme: o rosto grande, com a cidade queimando atrás
  cartao(classe, info, t, dt) {
    if (this.capId !== 'cartao:' + classe) { this.zerar('cartao:' + classe); ligarSom(); rampa(chuvaG, 0.1); rampa(sireneG, 0.01, 2); rampa(motorG, 0); rampa(fogoG, 0); passarosV = 0; this.legAtual = -1; }
    this.t = t;
    ctx.drawImage(precisa('c1', cena1), 0, 0); chamas(FOGOS1, t);
    ctx.fillStyle = 'rgba(4,4,10,0.62)'; ctx.fillRect(0, 0, W, H);
    const r = retrato(classe, t);
    if (r) { ctx.imageSmoothingEnabled = false; ctx.drawImage(r, Math.round((W - r.width * 2) / 2), 14, r.width * 2, r.height * 2); ctx.strokeStyle = '#2a2836'; ctx.lineWidth = 2; ctx.strokeRect(Math.round((W - r.width * 2) / 2) - 1, 13, r.width * 2 + 2, r.height * 2 + 2); }
    desenharChuva(dt);
    const dur = info.dur || 9;
    let preto = t < 0.9 ? 1 - t / 0.9 : t > dur - 0.6 ? 1 - Math.max(0, dur - t) / 0.6 : 0;
    if (preto > 0) { ctx.fillStyle = `rgba(0,0,0,${preto})`; ctx.fillRect(0, 0, W, H); }
    const li = t < 1 ? -1 : t < dur * 0.5 ? 0 : 1;
    if (li !== this.legAtual) { this.legAtual = li; this.legenda(li < 0 ? null : li === 0 ? info.linha1 : info.linha2); }
  }
  parar() {
    if (this.capId == null) return;
    this.capId = null; this.legenda(null);
    rampa(chuvaG, 0); rampa(sireneG, 0); rampa(motorG, 0); rampa(fogoG, 0); passarosV = 0;
  }
}
