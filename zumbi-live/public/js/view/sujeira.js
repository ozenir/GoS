// ============================================================================
//  TELA SUJA DE TOMATE — o tomate do zumbi do tomate bate no "vidro" da câmera.
//
//  É uma camada por cima de tudo (até do painel), em pixel art na mesma resolução do jogo (216 x 384):
//    - o tomate esmagado grudado no vidro: casca rasgada, polpa, sementes, o cabinho verde e respingos
//      em volta (o primeiro sempre no canto de cima, à direita; os seguintes em outros pontos de cima)
//    - o caldo vermelho, meio transparente, escorrendo em filetes irregulares (cada um com sua velocidade,
//      alguns até o fim da tela), com uma gota mais grossa na ponta
//  O jogo continua por trás. Depois de SECA segundos começa a sumir (some em SOME segundos). No máximo MAX juntos.
//  Tudo é sorteado na hora: cada tomatada é diferente.
// ============================================================================
import { W, H } from './render.js';

const SECA = 9, SOME = 4, MAX = 4;
const COR = {
  caldo: [208, 46, 26], caldoClaro: [236, 88, 52], casca: '#e0301e', cascaEscura: '#9a1a10', brilho: '#ff8a64',
  semente: '#f3d27a', sementeClara: '#fff0b8', cabo: '#3f7f2c', caboEscuro: '#24501a'
};

export class Sujeira {
  constructor(canvas) {
    this.c = canvas; this.x = canvas.getContext('2d');
    this.manchas = [];
    this.n = 0;
  }

  // nova tomatada: o primeiro no canto de cima à direita, os outros em pontos aleatórios da metade de cima
  tomatada() {
    const r = Math.random;
    const cx = this.n++ === 0 || !this.manchas.length ? W - 34 + (r() - 0.5) * 10 : 34 + r() * (W - 68);
    const cy = this.n === 1 ? 38 + (r() - 0.5) * 10 : 34 + r() * H * 0.35;
    const m = { cx, cy, t: 0, R: 27 + r() * 8, fase: [r() * 6, r() * 6, r() * 6] };
    m.fixa = this.desenharFixa(m);
    m.filetes = this.filetes(m);
    this.manchas.push(m);
    if (this.manchas.length > MAX) this.manchas.shift();
  }

  // raio do contorno irregular da mancha no ângulo a
  raio(m, a, k = 1) {
    return m.R * k * (1 + 0.22 * Math.sin(a * 3 + m.fase[0]) + 0.14 * Math.sin(a * 5 + m.fase[1]) + 0.1 * Math.sin(a * 9 + m.fase[2]));
  }

  // parte que não mexe (respingos, mancha, casca, sementes, cabinho), pixel a pixel pra ficar com cara de pixel art
  desenharFixa(m) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const x = c.getContext('2d'), r = Math.random;
    const px = (X, Y, cor, a = 1) => { x.globalAlpha = a; x.fillStyle = cor; x.fillRect(Math.round(X), Math.round(Y), 1, 1); };
    const rgba = (c3, a) => `rgba(${c3[0]},${c3[1]},${c3[2]},${a})`;
    // véu de caldo bem fraquinho em volta
    for (let y = -m.R * 3; y <= m.R * 3; y++) for (let X = -m.R * 3; X <= m.R * 3; X++) {
      const d = Math.hypot(X, y), a = Math.atan2(y, X);
      if (d < this.raio(m, a, 2.6) && (X + y) % 2 === 0) px(m.cx + X, m.cy + y, rgba(COR.caldo, 1), 0.1);
    }
    // respingos: gotas que voaram pra longe, com um rastro apontando pro centro
    for (let i = 0; i < 45; i++) {
      const a = r() * Math.PI * 2, dist = m.R * (1.05 + Math.abs(r() + r() - 1) * 2.2), rr = 0.8 + r() * 3.2;
      const gx = m.cx + Math.cos(a) * dist, gy = m.cy + Math.sin(a) * dist * 0.85;
      for (let y = -4; y <= 4; y++) for (let X = -4; X <= 4; X++) if (Math.hypot(X, y) <= rr) px(gx + X, gy + y, rgba(COR.caldo, 1), 0.6);
      for (let k = 1; k < 4; k++) if (r() < 0.7) px(gx - Math.cos(a) * k * 1.6, gy - Math.sin(a) * k * 1.4, rgba(COR.caldo, 1), 0.4);
    }
    // mancha principal (caldo) e o miolo mais forte
    for (let y = -m.R * 1.6; y <= m.R * 1.6; y++) for (let X = -m.R * 1.6; X <= m.R * 1.6; X++) {
      const d = Math.hypot(X, y), a = Math.atan2(y, X);
      if (d < this.raio(m, a, 0.62)) px(m.cx + X, m.cy + y, rgba(COR.caldoClaro, 1), 0.86);
      else if (d < this.raio(m, a)) px(m.cx + X, m.cy + y, rgba(COR.caldo, 1), 0.7);
    }
    // pedaços de casca grudados (opacos), com borda escura e um brilho
    for (let i = 0; i < 10; i++) {
      const a = r() * Math.PI * 2, dd = m.R * (0.15 + r() * 0.65);
      const bx = m.cx + Math.cos(a) * dd, by = m.cy + Math.sin(a) * dd, w = 3 + r() * 5, h = 2 + r() * 3.5, giro = r() * Math.PI;
      for (let y = -9; y <= 9; y++) for (let X = -9; X <= 9; X++) {
        const u = X * Math.cos(giro) + y * Math.sin(giro), v = -X * Math.sin(giro) + y * Math.cos(giro);
        const q = (u / w) ** 2 + (v / h) ** 2 + 0.25 * Math.sin(u * 2 + i);
        if (q < 0.75) px(bx + X, by + y, COR.casca);
        else if (q < 1.05) px(bx + X, by + y, COR.cascaEscura);
      }
      px(bx - 1, by - 1, COR.brilho, 0.9); px(bx, by - 1, COR.brilho, 0.6);
    }
    // polpa: pedaços amarelo-alaranjados moles
    for (let i = 0; i < 7; i++) {
      const a = r() * Math.PI * 2, dd = m.R * r() * 0.55, rr = 1.5 + r() * 2;
      const bx = m.cx + Math.cos(a) * dd, by = m.cy + Math.sin(a) * dd;
      for (let y = -3; y <= 3; y++) for (let X = -3; X <= 3; X++) if (Math.hypot(X, y * 1.3) <= rr) px(bx + X, by + y, '#f08a4a', 0.85);
    }
    // sementes e polpa amarelada espalhadas no miolo
    for (let i = 0; i < 34; i++) {
      const a = r() * Math.PI * 2, dd = m.R * (0.1 + r() * 0.75);
      const sx = m.cx + Math.cos(a) * dd, sy = m.cy + Math.sin(a) * dd;
      px(sx, sy, COR.semente); if (r() < 0.5) px(sx + 1, sy, COR.sementeClara, 0.9);
    }
    // cabinho verde (estrela de 5 pontas) meio torto, perto do centro
    const kx = m.cx + (r() - 0.5) * 4, ky = m.cy - 2 + (r() - 0.5) * 3, g0 = r() * Math.PI;
    for (let p = 0; p < 5; p++) {
      const a = g0 + p / 5 * Math.PI * 2;
      for (let k = 0; k < 7; k++) { const cor = k >= 5 ? COR.caboEscuro : COR.cabo; px(kx + Math.cos(a) * k, ky + Math.sin(a) * k * 0.8, cor); px(kx + Math.cos(a) * k + 1, ky + Math.sin(a) * k * 0.8, cor); }
    }
    for (let y = -1; y <= 1; y++) for (let X = -1; X <= 1; X++) px(kx + X, ky + y, COR.caboEscuro);
    px(kx, ky - 2, COR.cabo); px(kx, ky - 3, COR.cabo);
    // reflexo do vidro: uns pixels claros no alto, à esquerda
    for (let k = 0; k < 7; k++) { px(m.cx - m.R * 0.5 + k, m.cy - m.R * 0.55 - k * 0.5, '#ffffff', 0.4); px(m.cx - m.R * 0.5 + k, m.cy - m.R * 0.55 - k * 0.5 + 1, '#ffffff', 0.18); }
    x.globalAlpha = 1;
    return c;
  }

  // filetes de caldo escorrendo pela tela: começam na borda de baixo da mancha
  filetes(m) {
    const r = Math.random, lista = [];
    const n = 8 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.08 + r() * 0.84);   // parte de baixo do contorno
      const x0 = m.cx + Math.cos(a) * this.raio(m, a) * 0.85, y0 = m.cy + Math.sin(a) * this.raio(m, a) * 0.8;
      const longo = r() < 0.45, cortina = i < 2;   // as 2 primeiras são "cortinas" largas de caldo, mais curtas
      lista.push({
        x0, y0, larg: cortina ? 6 + Math.floor(r() * 5) : 2 + Math.floor(r() * 3.5), max: cortina ? 40 + r() * 70 : longo ? H - y0 + 10 : 50 + r() * 180,
        tau: 1.6 + r() * 4.5, atraso: r() * 1.4, onda: r() * 6, alpha: cortina ? 0.38 : 0.5 + r() * 0.2
      });
    }
    return lista;
  }

  desenhar(dt) {
    const x = this.x;
    x.clearRect(0, 0, W, H);
    if (!this.manchas.length) return;
    for (const m of this.manchas) m.t += dt;
    this.manchas = this.manchas.filter(m => m.t < SECA + SOME);
    for (const m of this.manchas) {
      const some = m.t > SECA ? 1 - (m.t - SECA) / SOME : 1;
      // filetes (atrás da mancha)
      for (const f of m.filetes) {
        const t = Math.max(0, m.t - f.atraso);
        const len = f.max * (1 - Math.exp(-t / f.tau));
        if (len < 1) continue;
        for (let y = 0; y < len; y++) {
          const X = Math.round(f.x0 + Math.sin((f.y0 + y) * 0.07 + f.onda) * 1.2);
          const a = f.alpha * (0.65 + 0.35 * (y / Math.max(1, len))) * some;   // mais forte embaixo, onde junta caldo
          x.globalAlpha = a; x.fillStyle = 'rgb(200,42,24)'; x.fillRect(X, Math.round(f.y0 + y), f.larg, 1);
          if (f.larg > 1) { x.globalAlpha = a * 0.55; x.fillStyle = 'rgb(246,110,74)'; x.fillRect(X, Math.round(f.y0 + y), 1, 1); }
        }
        // gota na ponta
        const gy = Math.round(f.y0 + len), gx = Math.round(f.x0 + Math.sin((f.y0 + len) * 0.07 + f.onda) * 1.2);
        x.globalAlpha = f.alpha * 1.1 * some; x.fillStyle = 'rgb(200,42,24)';
        x.fillRect(gx - 1, gy - 1, f.larg + 2, 3); x.fillRect(gx, gy + 2, f.larg, 1);
        x.globalAlpha = 0.4 * some; x.fillStyle = '#ffb0a0'; x.fillRect(gx, gy - 1, 1, 1);
      }
      x.globalAlpha = some;
      x.drawImage(m.fixa, 0, 0);
    }
    x.globalAlpha = 1;
  }
}
