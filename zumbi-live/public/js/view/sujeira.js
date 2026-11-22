// ============================================================================
//  TELA SUJA DE TOMATE — o tomate do zumbi do tomate bate no "vidro" da câmera.
//
//  É uma camada por cima de tudo (até do painel), em pixel art na mesma resolução do jogo (216 x 384).
//  Cada tomatada tem três partes:
//    fundo    respingos, véu de caldo e a borda da mancha: ficam onde caíram
//    massa    o tomate esmagado (casca rasgada, polpa, sementes, o cabinho): fica grudado um pouco e depois
//             ESCORREGA pelo vidro até cair pela borda de baixo, com a física de core/tomate.js (peso contra
//             o atrito da polpa; vai perdendo massa e desacelerando; o vidro não é uniforme, então vai aos trancos)
//    rastro   o que a massa deixa pra trás enquanto escorrega: listras vermelhas translúcidas, como tomate
//             esfregado no vidro, com uma semente ou um pedacinho de casca aqui e ali
//  E os filetes de caldo escorrendo na frente (também com a física de core/tomate.js).
//  Onde o tomate bate e gruda é sorteado a cada vez (qualquer ponto da tela, com espaço pra escorregar).
//  Depois que a massa cai, o resto seca: some em SECA + SOME segundos. Tudo é sorteado: cada tomatada é diferente.
//
//  PEDRA NO VIDRO (zumbi da pedra): a pedra trinca o vidro da câmera. A forma da trinca vem de core/pedra.js
//  (estrela de trincas radiais, anéis de teia e o miolo esmigalhado, pela energia do impacto); aqui ela é
//  desenhada em pixel art: linha escura de 1 px com um fio de brilho do lado (a borda do vidro pegando luz),
//  mais grossa perto do impacto e afinando na ponta. Espalha em PEDRA.propaga segundos, fica PEDRA.dura e some.
//  A trinca fica no vidro, por baixo do tomate (o tomate está na frente do vidro).
// ============================================================================
import { W, H } from './render.js';
import { FISICA, CALDO, velocidadeTomate, perdaPorMetro, velocidadeFilete, alcanceFilete, comprimentoFilete } from '../core/tomate.js';
import { PEDRA, gerarTrinca } from '../core/pedra.js';

const SECA = 8, SOME = 4, MAX = 4;
const COR = {
  caldo: [208, 46, 26], caldoClaro: [236, 88, 52], casca: '#e0301e', cascaEscura: '#9a1a10', brilho: '#ff8a64',
  semente: '#f3d27a', sementeClara: '#fff0b8', cabo: '#3f7f2c', caboEscuro: '#24501a', polpa: '#f08a4a'
};
const sorteio = (a, b) => a + Math.random() * (b - a);

export class Sujeira {
  constructor(canvas) {
    this.c = canvas; this.x = canvas.getContext('2d');
    this.x.imageSmoothingEnabled = false;   // a massa encolhendo continua pixel art
    this.manchas = [];
    this.trincas = [];
  }

  // pedra nova: trinca num ponto sorteado da tela
  pedrada() {
    const t = gerarTrinca(Math.random, W, H);
    t.t = 0; t.img = this.desenharTrinca(t);
    this.trincas.push(t);
    if (this.trincas.length > PEDRA.max) this.trincas.shift();
  }

  // a trinca em pixel art, num canvas do tamanho da tela
  desenharTrinca(t) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const px = this.pincel(c), r = Math.random;
    const ESCURO = '#12161e', BRILHO = '#eef6ff';
    // linha de pixels entre dois pontos (passos de meio pixel, sem repetir)
    const linha = (a, b, cor, alpha, grossa = false, ja = new Set()) => {
      const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2));
      for (let i = 0; i <= n; i++) {
        const X = Math.round(a[0] + (b[0] - a[0]) * i / n), Y = Math.round(a[1] + (b[1] - a[1]) * i / n), k = X + ',' + Y;
        if (ja.has(k)) continue; ja.add(k);
        px(X, Y, cor, alpha);
        if (grossa) px(X + 1, Y, cor, alpha * 0.7);
      }
    };
    // névoa do impacto: o vidro fica leitoso em volta do miolo
    const M = t.miolo;
    for (let y = -M * 4; y <= M * 4; y++) for (let X = -M * 4; X <= M * 4; X++) {
      const d = Math.hypot(X, y);
      if (d < M * 4 && (X + y) % 2 === 0) px(t.cx + X, t.cy + y, BRILHO, 0.1 * (1 - d / (M * 4)));
    }
    // radiais: escuras, com um fio de brilho do lado de cima/esquerda; grossas perto do impacto, finas na ponta
    for (const pts of t.radiais) {
      const ja = new Set(), jb = new Set();
      for (let i = 1; i < pts.length; i++) {
        const f = i / pts.length, alpha = 0.85 * (1 - 0.55 * f);
        linha(pts[i - 1], pts[i], ESCURO, alpha, f < 0.22, ja);
        if (r() < 0.8) linha([pts[i - 1][0] - 1, pts[i - 1][1] - 1], [pts[i][0] - 1, pts[i][1] - 1], BRILHO, 0.45 * (1 - f), false, jb);
      }
    }
    // anéis da teia: mais finos e claros
    for (const arco of t.aneis) {
      const ja = new Set(), jb = new Set();
      for (let i = 1; i < arco.length; i++) {
        linha(arco[i - 1], arco[i], ESCURO, 0.55, false, ja);
        linha([arco[i - 1][0], arco[i - 1][1] - 1], [arco[i][0], arco[i][1] - 1], BRILHO, 0.3, false, jb);
      }
    }
    // miolo esmigalhado: pó de vidro branco e azulado, com lasquinhas escuras
    for (let y = -M - 2; y <= M + 2; y++) for (let X = -M - 2; X <= M + 2; X++) {
      const d = Math.hypot(X, y) + (r() - 0.5) * 1.6;
      if (d > M + 1) continue;
      const q = r();
      px(t.cx + X, t.cy + y, q < 0.18 ? ESCURO : q < 0.6 ? '#ffffff' : '#bcd8f0', q < 0.18 ? 0.7 : 0.55 + r() * 0.35);
    }
    // brilhos: uns pontinhos de luz nas trincas perto do impacto
    for (let i = 0; i < 6; i++) {
      const pts = t.radiais[Math.floor(r() * t.radiais.length)], p = pts[Math.floor(r() * Math.min(pts.length, 10))];
      px(p[0], p[1] - 1, '#ffffff', 0.95); px(p[0] + 1, p[1] - 1, '#ffffff', 0.5); px(p[0], p[1] - 2, '#ffffff', 0.5);
    }
    return c;
  }

  // trincas: se espalham do ponto do impacto (recorte em círculo crescendo), ficam e somem
  desenharTrincas(dt) {
    const x = this.x;
    for (const t of this.trincas) t.t += dt;
    this.trincas = this.trincas.filter(t => t.t < PEDRA.dura + PEDRA.some);
    for (const t of this.trincas) {
      x.globalAlpha = t.t > PEDRA.dura ? 1 - (t.t - PEDRA.dura) / PEDRA.some : 1;
      const k = Math.min(1, t.t / PEDRA.propaga);
      if (k < 1) {
        x.save(); x.beginPath(); x.arc(t.cx, t.cy, t.raio * k * (2 - k), 0, Math.PI * 2); x.clip();
        x.drawImage(t.img, 0, 0); x.restore();
      } else x.drawImage(t.img, 0, 0);
    }
    x.globalAlpha = 1;
  }

  // nova tomatada: bate e gruda num ponto sorteado da tela (de um canto a outro, de cima até uns 70% da altura,
  // pra sobrar vidro pra escorregar). Pode pegar um pouco pra fora da borda, como um tomate de verdade.
  tomatada() {
    const r = Math.random, F = FISICA;
    const R = 27 + r() * 8;
    const cx = R * 0.4 + r() * (W - R * 0.8);
    const cy = R * 0.4 + r() * (H * 0.7 - R * 0.4);
    const m = {
      cx, cy, t: 0, R, fase: [r() * 6, r() * 6, r() * 6],
      massa: F.massa * F.ficaNoVidro, desce: 0, grudado: sorteio(...F.grudado), caiuEm: null,
      // pontos do vidro com mais ou menos atrito (pra escorregar aos trancos)
      vidro: [r() * 6, r() * 6, 0.02 + r() * 0.03, 0.05 + r() * 0.04]
    };
    m.fundo = this.desenharFundo(m);
    m.massaImg = this.desenharMassa(m);
    m.rastro = document.createElement('canvas'); m.rastro.width = W; m.rastro.height = H;
    m.listras = Array.from({ length: Math.ceil(m.R * 1.6) }, () => 0.1 + Math.random() * 0.3);   // força de cada listra do rastro
    m.filetes = this.filetes(m);
    this.manchas.push(m);
    if (this.manchas.length > MAX) this.manchas.shift();
  }

  // raio do contorno irregular da mancha no ângulo a
  raio(m, a, k = 1) {
    return m.R * k * (1 + 0.22 * Math.sin(a * 3 + m.fase[0]) + 0.14 * Math.sin(a * 5 + m.fase[1]) + 0.1 * Math.sin(a * 9 + m.fase[2]));
  }

  // pinta pixel a pixel (cara de pixel art)
  pincel(c) {
    const x = c.getContext('2d');
    return (X, Y, cor, a = 1) => { x.globalAlpha = a; x.fillStyle = cor; x.fillRect(Math.round(X), Math.round(Y), 1, 1); };
  }

  // o que fica onde caiu: véu de caldo, respingos e a borda da mancha
  desenharFundo(m) {
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const px = this.pincel(c), r = Math.random;
    const rgb = c3 => `rgb(${c3[0]},${c3[1]},${c3[2]})`;
    for (let y = -m.R * 3; y <= m.R * 3; y++) for (let X = -m.R * 3; X <= m.R * 3; X++) {
      const d = Math.hypot(X, y), a = Math.atan2(y, X);
      if (d < this.raio(m, a, 2.6) && (X + y) % 2 === 0) px(m.cx + X, m.cy + y, rgb(COR.caldo), 0.1);
      else if (d >= this.raio(m, a, 0.75) && d < this.raio(m, a)) px(m.cx + X, m.cy + y, rgb(COR.caldo), 0.62);
    }
    for (let i = 0; i < 45; i++) {
      const a = r() * Math.PI * 2, dist = m.R * (1.05 + Math.abs(r() + r() - 1) * 2.2), rr = 0.8 + r() * 3.2;
      const gx = m.cx + Math.cos(a) * dist, gy = m.cy + Math.sin(a) * dist * 0.85;
      for (let y = -4; y <= 4; y++) for (let X = -4; X <= 4; X++) if (Math.hypot(X, y) <= rr) px(gx + X, gy + y, rgb(COR.caldo), 0.6);
      for (let k = 1; k < 4; k++) if (r() < 0.7) px(gx - Math.cos(a) * k * 1.6, gy - Math.sin(a) * k * 1.4, rgb(COR.caldo), 0.4);
    }
    return c;
  }

  // o tomate esmagado (a parte que escorrega), desenhado em volta do ponto (0,0) num canvas próprio
  desenharMassa(m) {
    const S = Math.ceil(m.R * 2.4), c = document.createElement('canvas'); c.width = S; c.height = S;
    const px = this.pincel(c), r = Math.random, o = S / 2;
    const rgb = c3 => `rgb(${c3[0]},${c3[1]},${c3[2]})`;
    for (let y = -m.R; y <= m.R; y++) for (let X = -m.R; X <= m.R; X++) {
      const d = Math.hypot(X, y), a = Math.atan2(y, X);
      if (d < this.raio(m, a, 0.55)) px(o + X, o + y, rgb(COR.caldoClaro), 0.88);
      else if (d < this.raio(m, a, 0.75)) px(o + X, o + y, rgb(COR.caldo), 0.78);
    }
    for (let i = 0; i < 10; i++) {   // pedaços de casca (opacos), borda escura e brilho
      const a = r() * Math.PI * 2, dd = m.R * (0.1 + r() * 0.5);
      const bx = o + Math.cos(a) * dd, by = o + Math.sin(a) * dd, w = 3 + r() * 5, h = 2 + r() * 3.5, giro = r() * Math.PI;
      for (let y = -9; y <= 9; y++) for (let X = -9; X <= 9; X++) {
        const u = X * Math.cos(giro) + y * Math.sin(giro), v = -X * Math.sin(giro) + y * Math.cos(giro);
        const q = (u / w) ** 2 + (v / h) ** 2 + 0.25 * Math.sin(u * 2 + i);
        if (q < 0.75) px(bx + X, by + y, COR.casca); else if (q < 1.05) px(bx + X, by + y, COR.cascaEscura);
      }
      px(bx - 1, by - 1, COR.brilho, 0.9); px(bx, by - 1, COR.brilho, 0.6);
    }
    for (let i = 0; i < 7; i++) {   // polpa mole
      const a = r() * Math.PI * 2, dd = m.R * r() * 0.5, rr = 1.5 + r() * 2;
      const bx = o + Math.cos(a) * dd, by = o + Math.sin(a) * dd;
      for (let y = -3; y <= 3; y++) for (let X = -3; X <= 3; X++) if (Math.hypot(X, y * 1.3) <= rr) px(bx + X, by + y, COR.polpa, 0.85);
    }
    for (let i = 0; i < 34; i++) {   // sementes
      const a = r() * Math.PI * 2, dd = m.R * (0.1 + r() * 0.6);
      const sx = o + Math.cos(a) * dd, sy = o + Math.sin(a) * dd;
      px(sx, sy, COR.semente); if (r() < 0.5) px(sx + 1, sy, COR.sementeClara, 0.9);
    }
    const kx = o + (r() - 0.5) * 4, ky = o - 2 + (r() - 0.5) * 3, g0 = r() * Math.PI;   // cabinho verde
    for (let p = 0; p < 5; p++) {
      const a = g0 + p / 5 * Math.PI * 2;
      for (let k = 0; k < 7; k++) { const cor = k >= 5 ? COR.caboEscuro : COR.cabo; px(kx + Math.cos(a) * k, ky + Math.sin(a) * k * 0.8, cor); px(kx + Math.cos(a) * k + 1, ky + Math.sin(a) * k * 0.8, cor); }
    }
    for (let y = -1; y <= 1; y++) for (let X = -1; X <= 1; X++) px(kx + X, ky + y, COR.caboEscuro);
    px(kx, ky - 2, COR.cabo); px(kx, ky - 3, COR.cabo);
    for (let k = 0; k < 7; k++) { px(o - m.R * 0.45 + k, o - m.R * 0.5 - k * 0.5, '#ffffff', 0.4); px(o - m.R * 0.45 + k, o - m.R * 0.5 - k * 0.5 + 1, '#ffffff', 0.18); }   // reflexo do vidro
    return c;
  }

  // filetes de caldo: começam na borda de baixo da mancha; velocidade e alcance pela física do caldo
  filetes(m) {
    const r = Math.random, lista = [], P = FISICA.pxPorMetro;
    const n = 8 + Math.floor(r() * 5);
    for (let i = 0; i < n; i++) {
      const a = Math.PI * (0.08 + r() * 0.84);
      const x0 = m.cx + Math.cos(a) * this.raio(m, a) * 0.85, y0 = m.cy + Math.sin(a) * this.raio(m, a) * 0.8;
      const cortina = i < 2;   // as 2 primeiras são "cortinas" largas de caldo
      const larg = cortina ? 6 + Math.floor(r() * 5) : 2 + Math.floor(r() * 3.5);
      const h = sorteio(...CALDO.espessura) * (cortina ? 0.7 : 1);
      const V = sorteio(...CALDO.volume) * (cortina ? 2 : 1);
      lista.push({
        x0, y0, larg, onda: r() * 6, atraso: r() * 1.2, alpha: cortina ? 0.38 : 0.5 + r() * 0.2,
        u0: velocidadeFilete(h) * P,                                   // px/s
        max: Math.min(H - y0 + 12, alcanceFilete(V, larg / P) * P)       // px
      });
    }
    return lista;
  }

  // ponto do vidro: multiplica o atrito (τy) conforme a altura, pra ele escorregar aos trancos
  atritoVidro(m, y) {
    const v = m.vidro;
    return 1 + FISICA.sujeiraVidro * (0.6 * Math.sin(y * v[2] * 6 + v[0]) + 0.4 * Math.sin(y * v[3] * 6 + v[1]));
  }

  // física: a massa escorrega (m/s → px) e deixa o rastro nas linhas por onde passou
  escorregar(m, dt) {
    const F = FISICA, P = F.pxPorMetro;
    if (m.caiuEm != null || m.t < m.grudado) return;
    const v = velocidadeTomate(m.massa, F, this.atritoVidro(m, m.cy + m.desce));   // m/s
    if (!v) return;
    const antes = m.desce, passo = v * dt;
    m.desce += passo * P;
    m.massa -= perdaPorMetro(F) * passo;
    // rastro: as linhas entre a altura de antes e a de agora, na largura da massa, com listras
    const x = m.rastro.getContext('2d'), w = m.listras.length;
    for (let y = Math.floor(m.cy + antes); y < Math.floor(m.cy + m.desce); y++) {
      for (let k = 0; k < w; k++) {
        const borda = Math.min(k, w - 1 - k) / (w * 0.18);
        const a = m.listras[k] * Math.min(1, borda) * (0.85 + 0.3 * Math.random());
        if (a < 0.04) continue;
        x.globalAlpha = a; x.fillStyle = `rgb(${COR.caldo[0]},${COR.caldo[1]},${COR.caldo[2]})`;
        x.fillRect(Math.round(m.cx - w / 2 + k), y, 1, 1);
      }
      if (Math.random() < 0.08) { x.globalAlpha = 0.9; x.fillStyle = Math.random() < 0.7 ? COR.semente : COR.casca; x.fillRect(Math.round(m.cx - w / 2 + Math.random() * w), y, 1, 1); }
    }
    x.globalAlpha = 1;
    if (m.cy + m.desce - m.R * 0.9 > H) m.caiuEm = m.t;   // caiu pela borda de baixo
  }

  desenhar(dt) {
    const x = this.x;
    x.clearRect(0, 0, W, H);
    if (this.trincas.length) this.desenharTrincas(dt);   // a trinca fica no vidro, por baixo do tomate
    if (!this.manchas.length) return;
    for (const m of this.manchas) { m.t += dt; this.escorregar(m, dt); }
    this.manchas = this.manchas.filter(m => m.caiuEm == null || m.t - m.caiuEm < SECA + SOME);
    for (const m of this.manchas) {
      const seco = m.caiuEm == null ? 0 : m.t - m.caiuEm;
      const some = seco > SECA ? 1 - (seco - SECA) / SOME : 1;
      x.globalAlpha = some; x.drawImage(m.rastro, 0, 0); x.drawImage(m.fundo, 0, 0);
      for (const f of m.filetes) {
        const t = Math.max(0, m.t - f.atraso);
        const len = comprimentoFilete(t, f.u0, f.max);
        if (len < 1) continue;
        for (let y = 0; y < len; y++) {
          const X = Math.round(f.x0 + Math.sin((f.y0 + y) * 0.07 + f.onda) * 1.2);
          const a = f.alpha * (0.65 + 0.35 * (y / Math.max(1, len))) * some;   // mais forte embaixo, onde junta caldo
          x.globalAlpha = a; x.fillStyle = 'rgb(200,42,24)'; x.fillRect(X, Math.round(f.y0 + y), f.larg, 1);
          if (f.larg > 1) { x.globalAlpha = a * 0.55; x.fillStyle = 'rgb(246,110,74)'; x.fillRect(X, Math.round(f.y0 + y), 1, 1); }
        }
        const gy = Math.round(f.y0 + len), gx = Math.round(f.x0 + Math.sin((f.y0 + len) * 0.07 + f.onda) * 1.2);
        x.globalAlpha = f.alpha * 1.1 * some; x.fillStyle = 'rgb(200,42,24)';
        x.fillRect(gx - 1, gy - 1, f.larg + 2, 3); x.fillRect(gx, gy + 2, f.larg, 1);
        x.globalAlpha = 0.4 * some; x.fillStyle = '#ffb0a0'; x.fillRect(gx, gy - 1, 1, 1);
      }
      if (m.caiuEm == null) {   // a massa (enquanto não caiu), um pouquinho menor conforme perde massa
        const k = Math.sqrt(m.massa / (FISICA.massa * FISICA.ficaNoVidro)), S = m.massaImg.width * k;
        x.globalAlpha = 1;
        x.drawImage(m.massaImg, Math.round(m.cx - S / 2), Math.round(m.cy + m.desce - S / 2), Math.round(S), Math.round(S));
      }
    }
    x.globalAlpha = 1;
  }
}
