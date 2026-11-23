// ============================================================================
//  EFEITOS DOS ZUMBIS DA TELA (core/tela.js) — a arte, em pixel art na resolução do jogo (216 x 384).
//
//  Duas camadas:
//    cima   o "vidro da câmera" (o mesmo canvas da sujeira de tomate, por cima de tudo): ovo, tinta, chiclete,
//           torta, baba, mão batendo, cara encostada, canto dobrado, grafite, lama, mão gigante, selfie, fã
//    baixo  um canvas entre o jogo e o painel (a imagem do jogo muda, o painel continua legível): chiado de TV,
//           fumaça, apagão (só os olhos dos zumbis brilhando) e o tonto (a imagem gira)
//  Alguns também mexem no próprio jogo por CSS: tremer a tela, girar, embaçar, piscar.
//  Cada efeito dura o "dura" do catálogo (2 a 4 s) e some. A soma do quanto cada um cobre não passa de
//  TELA.coberturaMax: com a tela cheia, o mais antigo sai antes.
//  LIMPADOR: a palheta do para-brisa passa e limpa tudo (menos a trinca: vidro trincado não sai com água).
// ============================================================================
import { W, H } from './render.js';
import { TELA, ZUMBIS_TELA } from '../core/tela.js';

const rnd = (a, b) => a + Math.random() * (b - a);
const escolher = l => l[Math.floor(Math.random() * l.length)];
const novaTela = (w = W, h = H) => { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };
const facil = k => (k <= 0 ? 0 : k >= 1 ? 1 : 1 - (1 - k) ** 3);   // ease-out
// ponto de pixel com alpha
const P = (x, X, Y, cor, a = 1) => { x.globalAlpha = a; x.fillStyle = cor; x.fillRect(Math.round(X), Math.round(Y), 1, 1); };
const RET = (x, X, Y, w, h, cor, a = 1) => { x.globalAlpha = a; x.fillStyle = cor; x.fillRect(Math.round(X), Math.round(Y), Math.round(w), Math.round(h)); };
// mancha de contorno irregular (raio R no ângulo a), pixel a pixel
function mancha(x, cx, cy, R, cor, a = 1, fase = [rnd(0, 6), rnd(0, 6), rnd(0, 6)], achata = 1, irreg = 1) {
  const raio = ang => R * (1 + irreg * (0.18 * Math.sin(ang * 3 + fase[0]) + 0.12 * Math.sin(ang * 5 + fase[1]) + 0.07 * Math.sin(ang * 9 + fase[2])));
  for (let y = -R * 1.5; y <= R * 1.5; y++) for (let X = -R * 1.5; X <= R * 1.5; X++) {
    const d = Math.hypot(X, y / achata);
    if (d < raio(Math.atan2(y / achata, X))) P(x, cx + X, cy + y, cor, a);
  }
}
const bola = (x, cx, cy, r, cor, a = 1) => { for (let y = -r; y <= r; y++) for (let X = -r; X <= r; X++) if (X * X + y * y <= r * r + 0.5) P(x, cx + X, cy + y, cor, a); };
// respingos em volta de um ponto
function respingos(x, cx, cy, R, cor, n, a = 1, achata = 1) {
  for (let i = 0; i < n; i++) {
    const ang = rnd(0, Math.PI * 2), d = R * (1.05 + Math.abs(rnd(-1, 1) + rnd(-1, 1)) * 0.9), r = rnd(0.6, 3);
    bola(x, cx + Math.cos(ang) * d, cy + Math.sin(ang) * d * achata, r, cor, a);
  }
}
// texto em pixel art (fonte desenhada em baixa resolução, sem suavizar)
function textoPixel(x, txt, cx, cy, tam, cor, maxW = W - 16, borda = null) {
  let t = tam;
  x.font = `bold ${t}px Impact, "Arial Black", sans-serif`;
  while (x.measureText(txt).width > maxW && t > 7) { t--; x.font = `bold ${t}px Impact, "Arial Black", sans-serif`; }
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.globalAlpha = 1;
  if (borda) { x.fillStyle = borda; for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1]]) x.fillText(txt, Math.round(cx + dx), Math.round(cy + dy)); }
  x.fillStyle = cor; x.fillText(txt, Math.round(cx), Math.round(cy));
  return t;
}

/* ---------------- Peças de zumbi em close (pele, mãos, cara) ---------------- */
const PELE = { base: '#8fa47a', clara: '#b4c69c', escura: '#5f7350', contorno: '#2e3a26', ferida: '#8a2a2a', unha: '#d8d0a8' };

// Mão de zumbi aberta (palma pra câmera) ou fechada (punho), virada pra cima. k = tamanho.
// Cada dedo é uma cápsula (segmento com raio); a palma é uma elipse com o pulso embaixo.
function desenharMao(k = 1, fechada = false) {
  const S = Math.ceil(150 * k), [c, x] = novaTela(S, Math.ceil(S * 1.0)), ox = S * 0.56, oy = S * 0.66;
  // cápsula: de (ax, ay) na direção do ângulo a (0 = pra cima), comprimento len, raio r
  const capsula = (ax, ay, a, len, r) => {
    const dx = Math.sin(a), dy = -Math.cos(a);
    return (X, Y) => { const u = Math.max(0, Math.min(len, (X - ax) * dx + (Y - ay) * dy)); return (X - ax - dx * u) ** 2 + (Y - ay - dy * u) ** 2 < r * r; };
  };
  const dedosA = [[-22, -22, -0.26, 36, 7.5], [-8, -26, -0.08, 45, 7.8], [7, -26, 0.08, 43, 7.8], [21, -22, 0.24, 32, 7]];
  const dedos = fechada
    ? [[-24, -26, 1.45, 10, 9], [-8, -30, 1.5, 10, 9.5], [8, -30, 1.55, 10, 9.5], [23, -26, 1.6, 9, 8.5]].map(([bx, by, a, len, r]) => capsula(bx * k, by * k, a, len * k, r * k))
    : dedosA.map(([bx, by, a, len, r]) => capsula(bx * k, by * k, a, len * k, r * k));
  const polegar = fechada ? capsula(-30 * k, -6 * k, 0.9, 30 * k, 9 * k) : capsula(-28 * k, 2 * k, -1.05, 34 * k, 8.5 * k);
  const palma = (X, Y) => (X / (33 * k)) ** 2 + ((Y + 6 * k) / (30 * k)) ** 2 < 1 || (Math.abs(X) < 23 * k && Y > -6 * k && Y < 42 * k);
  const dentro = (X, Y) => palma(X, Y) || polegar(X, Y) || dedos.some(f => f(X, Y));
  const den = [];
  for (let y = 0; y < c.height; y++) for (let X = 0; X < S; X++) if (dentro(X - ox, y - oy)) den.push([X, y]);
  const tem = new Set(den.map(([X, y]) => X + ',' + y));
  for (const [X, y] of den) {
    const borda = !tem.has((X + 1) + ',' + y) || !tem.has((X - 1) + ',' + y) || !tem.has(X + ',' + (y + 1)) || !tem.has(X + ',' + (y - 1));
    // sombra: escurece perto da borda de baixo/direita (luz vindo de cima à esquerda), com pontilhado na transição
    const sombra = !tem.has((X + 3) + ',' + (y + 3)), luz = !tem.has((X - 3) + ',' + (y - 3));
    const cor = borda ? PELE.contorno : sombra ? ((X + y) % 2 ? PELE.escura : PELE.base) : luz ? PELE.clara : PELE.base;
    P(x, X, y, cor);
  }
  if (!fechada) for (const [bx, by, a, len, r] of dedosA) {   // unhas amareladas na ponta dos dedos
    const tx = ox + (bx + Math.sin(a) * (len - 3)) * k, ty = oy + (by - Math.cos(a) * (len - 3)) * k;
    bola(x, tx, ty, r * k * 0.55, PELE.unha); P(x, tx - 1, ty - 1, '#ffffff', 0.7);
  } else for (let i = 0; i < 4; i++) { const kx = ox + (-24 + i * 16) * k, ky = oy - 27 * k; for (let d = -4; d <= 4; d++) P(x, kx + d * k, ky + 6 * k, PELE.escura, 0.8); }   // dobras dos dedos
  for (let i = 0; i < 3; i++) { const yy = oy + (-2 + i * 8) * k; for (let X = -16 * k; X < 14 * k; X++) if (Math.random() < 0.85) P(x, ox + X, yy + Math.sin(X * 0.15 + i) * 2.5 * k, PELE.escura, 0.6); }   // linhas da mão
  mancha(x, ox + 10 * k, oy + 22 * k, 5 * k, PELE.ferida, 0.9);
  for (let i = 0; i < 4; i++) RET(x, ox + 4 * k + i * 4 * k, oy + 16 * k + i * 2, 1, 4 * k, '#1a1a1a');   // pontos de sutura
  return { c, ox, oy };
}

// Cara de zumbi grudada no vidro (achatada): olhos, nariz amassado, boca esmagada, bochechas brancas onde encosta
function desenharCara() {
  const S = 170, [c, x] = novaTela(S, 130), ox = S / 2, oy = 70;
  for (let y = -66; y <= 60; y++) for (let X = -84; X <= 84; X++) {
    const d = (X / 82) ** 2 + (y / 62) ** 2;
    if (d >= 1) continue;
    const prensado = d < 0.55 && Math.abs(X) > 20 && y > -10;   // bochechas achatadas no vidro: claras
    P(x, ox + X, oy + y, d > 0.93 ? PELE.contorno : prensado ? '#c8d8b0' : y < -30 ? PELE.escura : PELE.base);
  }
  // cabelo ralo
  for (let i = 0; i < 60; i++) { const X = rnd(-70, 70), y0 = -60 + Math.abs(X) * 0.15; for (let k = 0; k < rnd(4, 14); k++) P(x, ox + X + Math.sin(k * 0.6) * 1.5, oy + y0 - k, '#2a2018', 0.9); }
  // olhos: brancos com veias (as pupilas são desenhadas a cada quadro, olhando pro público)
  for (const s of [-1, 1]) {
    mancha(x, ox + s * 34, oy - 14, 15, '#f0ead8', 1, [1, 2, 3], 0.75, 0.3);
    for (let v = 0; v < 6; v++) { const a = rnd(0, Math.PI * 2); for (let k = 6; k < 14; k++) P(x, ox + s * 34 + Math.cos(a) * k, oy - 14 + Math.sin(a) * k * 0.7, '#c83a3a', 0.6); }
    for (let X = -16; X <= 16; X++) P(x, ox + s * 34 + X, oy - 26 - Math.abs(X) * 0.2 + (s * X > 0 ? 2 : 0), '#2a2018');   // sobrancelha
  }
  // nariz amassado no vidro (círculo claro com as narinas)
  mancha(x, ox, oy + 6, 14, '#d4e2bc', 1, [0, 1, 2], 0.8, 0.2);
  bola(x, ox - 5, oy + 8, 2.5, '#3a2a20'); bola(x, ox + 5, oy + 8, 2.5, '#3a2a20');
  // boca esmagada: larga, dentes tortos, gengiva
  for (let X = -40; X <= 40; X++) {
    const h = 9 * Math.cos(X / 40 * Math.PI / 2);
    for (let y = -h; y <= h; y++) P(x, ox + X, oy + 34 + y, Math.abs(y) > h - 2 ? '#5a1a1a' : '#2a0a0a');
    if (X % 6 < 4 && Math.abs(X) < 36) { RET(x, ox + X, oy + 34 - h + 1, 1, 4 + (X % 3), '#e8e0b0'); RET(x, ox + X, oy + 34 + h - 4, 1, 3, '#d8d0a0'); }
  }
  respingos(x, ox, oy + 40, 30, '#9ab890', 10, 0.5);   // baba
  return { c, ox, oy };
}

/* ---------------- Os efeitos ---------------- */
// Cada um: { id, t, dura, cobre, camada, iniciar(), desenhar(x, ef, dt, ctx) , css?(ef) }
const EFEITOS = {
  // 🥚 o ovo bate, a clara espirra e a gema escorre devagar deixando um rastro amarelo
  ovo(ef) {
    const cx = rnd(50, W - 50), cy = rnd(H * 0.22, H * 0.5);
    const [f, fx] = novaTela();
    mancha(fx, cx, cy, 40, '#f4f0d8', 0.42, undefined, 0.9); mancha(fx, cx, cy, 28, '#fffbe8', 0.32);
    respingos(fx, cx, cy, 36, '#f4f0d8', 34, 0.55);
    for (let i = 0; i < 9; i++) { const a = rnd(0, 6.28), d = rnd(6, 26); RET(fx, cx + Math.cos(a) * d, cy + Math.sin(a) * d, rnd(2, 5), rnd(2, 4), escolher(['#f8f4e8', '#e8dcc0', '#c8b890']), 1); }   // casca
    const [g, gx] = novaTela(28, 28);
    mancha(gx, 14, 14, 11, '#e8960a', 1, undefined, 0.9, 0.5); mancha(gx, 14, 13, 8, '#ffc22a', 1, undefined, 1, 0.4); bola(gx, 10, 9, 2, '#fff6c8', 1);
    const [r] = novaTela();
    Object.assign(ef, { cx, cy, f, g, rastro: r, desce: 0 });
  },
  // 🎨 balde de tinta cobre um canto inteiro, cada vez de uma cor, com tinta escorrendo
  pintor(ef, ctx) {
    const cores = [['#e83a5a', '#ff8aa0', '#9a1a34'], ['#3a8aff', '#9fd0ff', '#1a4a9a'], ['#ffd23f', '#fff09a', '#b08a10'], ['#3ac47a', '#9dffb0', '#1a7a44'], ['#b06bff', '#e0c0ff', '#5a2a9a'], ['#ff8a2a', '#ffc080', '#a84a10']];
    let cor; do cor = escolher(cores); while (cor === ctx.ultimaCor && cores.length > 1);
    ctx.ultimaCor = cor;
    const canto = escolher([[0, 0], [W, 0], [0, H], [W, H]]), cx = canto[0] ? W + 14 : -14, cy = canto[1] ? H + 14 : -14;
    const R = rnd(105, 130), [c, x] = novaTela();
    mancha(x, cx, cy, R, cor[0], 0.96, undefined, 1.1, 1.3);
    for (let i = 0; i < 14; i++) mancha(x, cx + rnd(-R, R) * 0.7, cy + rnd(-R, R) * 0.7, rnd(6, 18), escolher([cor[1], cor[2]]), 0.45, undefined, 1, 0.8);
    respingos(x, cx, cy, R, cor[0], 40, 0.95, 1.1);
    const gotas = Array.from({ length: 9 }, () => { const a = (canto[0] ? Math.PI : 0) + (canto[1] ? -1 : 1) * rnd(0.15, 1.4) * (canto[0] ? -1 : 1); return { x: cx + Math.cos(a) * R * 0.95, y: cy + Math.sin(a) * R * 0.95, max: rnd(18, 60), w: rnd(2, 5) }; });
    Object.assign(ef, { c, cor, gotas, canto, cx, cy });
  },
  // 🍬 chiclete gruda e estica (os fios esticam quando o vidro mexe: tremida da tela)
  chiclete(ef) {
    const cx = rnd(50, W - 50), cy = rnd(60, H - 90), [c, x] = novaTela(44, 40);
    mancha(x, 22, 20, 14, '#ff6ab4', 1, undefined, 0.9, 0.7); mancha(x, 20, 18, 9, '#ff9ad0', 1, undefined, 1, 0.6);
    for (let i = 0; i < 5; i++) bola(x, rnd(12, 32), rnd(12, 28), 1.2, '#e04a98', 0.8);
    for (let i = 0; i < 4; i++) RET(x, 15 + i * 4, 26, 2, 3, '#c83a80', 0.8);   // marca de dente
    bola(x, 16, 13, 2, '#ffffff', 0.8);
    const fios = Array.from({ length: 4 + Math.floor(rnd(0, 2)) }, () => { const a = rnd(0, Math.PI * 2), d = rnd(22, 48); return { ax: cx + Math.cos(a) * d, ay: cy + Math.sin(a) * d, a, fase: rnd(0, 6) }; });
    Object.assign(ef, { c, cx, cy, fios });
  },
  // 🥧 torta na cara: chantilly no meio da tela por 2 s, com cereja, e depois escorrega
  torta(ef) {
    const cx = W / 2 + rnd(-14, 14), cy = H * 0.45 + rnd(-20, 20), [c, x] = novaTela(190, 170), o = 95, oy = 85;
    mancha(x, o, oy, 74, '#d8a050', 1, undefined, 0.85, 0.9);                    // massa
    mancha(x, o, oy, 66, '#fff8ee', 1, undefined, 0.85, 1.1);                     // chantilly
    for (let i = 0; i < 12; i++) mancha(x, o + rnd(-50, 50), oy + rnd(-40, 40), rnd(8, 16), escolher(['#ffffff', '#f0e8dc']), 1, undefined, 0.8, 0.8);
    for (let i = 0; i < 10; i++) mancha(x, o + rnd(-20, 50), oy + rnd(0, 50), rnd(5, 12), '#e0d4c4', 0.6);   // sombra do chantilly
    for (let i = 0; i < 30; i++) { const a = rnd(0, 6.28), d = rnd(62, 82); RET(x, o + Math.cos(a) * d, oy + Math.sin(a) * d * 0.85, rnd(3, 8), rnd(2, 5), escolher(['#d8a050', '#b07a30', '#e8b868']), 1); }   // farelo da massa
    respingos(x, o, oy, 70, '#fff8ee', 20, 1, 0.85);
    bola(x, o + 4, oy - 30, 8, '#c8102a'); bola(x, o + 1, oy - 33, 2, '#ff8a9a');   // cereja
    for (let k = 0; k < 10; k++) P(x, o + 6 + k * 0.6, oy - 38 - k, '#3f7f2c');
    Object.assign(ef, { c, cx, cy });
  },
  // 👅 a língua passa por dentro do vidro e deixa um rastro de baba
  lambedor(ef) {
    const deEsq = Math.random() < 0.5, y0 = rnd(H * 0.3, H * 0.65), cur = rnd(-40, 40);
    const [r] = novaTela();
    Object.assign(ef, { deEsq, y0, cur, rastro: r, ult: null });
  },
  // ✋ a mão bate no vidro 3 vezes (tela treme) e na terceira o vidro trinca
  bate(ef) {
    const mao = desenharMao(0.85);
    const [m, mx] = novaTela();
    Object.assign(ef, { mao, marcas: m, mx, x0: rnd(70, W - 70), y0: rnd(H * 0.45, H * 0.72), batidas: [0.3, 0.95, 1.6], feitas: 0 });
  },
  // 😶 a cara grudada no vidro, achatada, olhando pro público; depois escorrega e deixa a marca
  encostado(ef) {
    const cara = desenharCara(), [s] = novaTela();
    Object.assign(ef, { cara, mancha: s, x0: W / 2 + rnd(-20, 20), y0: H * rnd(0.55, 0.66), olha: rnd(0, 6) });
  },
  // 📄 agarra a borda e dobra o canto da tela como uma página
  puxa(ef) { Object.assign(ef, { canto: escolher(['bd', 'be', 'cd']), dedos: desenharMao(0.35, true) }); },
  // 🖌️ picha uma palavra (ou o nome de quem mandou) em spray, com respingo e tinta escorrendo
  grafite(ef) {
    const cor = escolher(['#ff3a8a', '#3aff9a', '#ffe83a', '#3ad8ff', '#ff6a2a']);
    const cy = rnd(H * 0.3, H * 0.62), giro = rnd(-0.18, 0.12), [m, mx] = novaTela(), [c, x] = novaTela();
    // palavra longa com espaço: 2 linhas (letras maiores)
    const txt = ef.palavra || 'SOCORRO', meio = txt.indexOf(' ', Math.floor(txt.length / 2) - 2);
    const linhas = txt.length > 9 && txt.includes(' ') ? [txt.slice(0, meio > 0 ? meio : txt.lastIndexOf(' ')), txt.slice((meio > 0 ? meio : txt.lastIndexOf(' ')) + 1)] : [txt];
    mx.save(); mx.translate(W / 2, cy); mx.rotate(giro);
    linhas.forEach((l, i) => textoPixel(mx, l, 0, (i - (linhas.length - 1) / 2) * 38, 42, '#ffffff', W - 14));
    mx.restore();
    const dados = mx.getImageData(0, 0, W, H).data, fundo = new Map(), letra = (X, y) => X >= 0 && X < W && y >= 0 && y < H && dados[(y * W + X) * 4 + 3] > 110;
    // contorno escuro em volta das letras (lê em cima de qualquer coisa)
    for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) if (!letra(X, y) && (letra(X + 1, y) || letra(X - 1, y) || letra(X, y + 1) || letra(X, y - 1) || letra(X + 1, y + 1))) P(x, X, y, '#120a18', 0.9);
    for (let y = 0; y < H; y++) for (let X = 0; X < W; X++) if (letra(X, y)) {
      P(x, X, y, cor, 0.85 + Math.random() * 0.15);
      if (Math.random() < 0.1) P(x, X + rnd(-4, 4), y + rnd(-4, 4), cor, 0.5);   // névoa do spray
      fundo.set(X, Math.max(fundo.get(X) ?? 0, y));
    }
    for (const [X, y] of fundo) if (Math.random() < 0.09) { const len = rnd(4, 22); for (let k = 0; k < len; k++) P(x, X, y + k, cor, 0.9 - k / len * 0.4); bola(x, X, y + len, 1, cor, 0.9); }   // escorrido
    const xs = [...fundo.keys()];
    Object.assign(ef, { c, cor, x1: Math.min(...xs), x2: Math.max(...xs), cy });
  },
  // ⚡ chiado de TV antiga, a imagem pisca e treme
  eletricista(ef) { ef.camada = 'baixo'; },
  // 💨 nuvem de fumaça embaça tudo e vai sumindo
  fumaca(ef) {
    ef.camada = 'baixo';
    const [p, x] = novaTela(64, 64);
    for (let y = 0; y < 64; y++) for (let X = 0; X < 64; X++) { const d = Math.hypot(X - 32, y - 32) / 32; if (d < 1 && Math.random() < (1 - d) * 1.4) P(x, X, y, d < 0.5 ? '#e8e8ec' : '#b8b8c0', 0.55 * (1 - d * 0.6)); }
    ef.puff = p;
    ef.nuvens = Array.from({ length: 22 }, (_, i) => ({ x: rnd(-20, W + 20), y: rnd(H * 0.25, H + 30), vy: rnd(14, 40), s: rnd(1.6, 3.4), atraso: i * 0.04 }));
  },
  // 🔦 apagão: tudo escuro, só os olhos dos zumbis brilhando
  apagao(ef) { ef.camada = 'baixo'; },
  // 😵‍💫 a imagem do jogo gira e fica de cabeça pra baixo
  tonto(ef) { ef.camada = 'baixo'; ef.sentido = Math.random() < 0.5 ? 1 : -1; },
  // 🟫 lama respingando de baixo pra cima, como se um carro tivesse passado
  lama(ef) {
    const [c, x] = novaTela(), cores = ['#6a4a2a', '#5a3a1a', '#8a6a3a'];
    for (let i = 0; i < 26; i++) mancha(x, rnd(-10, W + 10), H + rnd(-30, 20), rnd(14, 34), escolher(cores), 0.95, undefined, 0.7, 1.2);
    for (let i = 0; i < 70; i++) {   // gotas espirradas pra cima, com cauda
      const X = rnd(0, W), y = H - Math.abs(rnd(0, 1) ** 1.8) * H * 0.75, r = rnd(1, 4), cor = escolher(cores);
      bola(x, X, y, r, cor, 0.95);
      for (let k = 1; k < r * 4; k++) P(x, X + rnd(-0.5, 0.5), y + k, cor, 0.8 - k / (r * 5));
      if (r > 2) P(x, X - 1, y - 1, '#b89a6a', 0.8);
    }
    ef.c = c;
  },
  // 🖐️ a mão gigante entra pelo lado, tenta pegar a live e arrasta
  gigante(ef) { Object.assign(ef, { lado: Math.random() < 0.5 ? -1 : 1, aberta: desenharMao(1.6), fechada: desenharMao(1.6, true), y0: H * rnd(0.42, 0.56) }); },
  // 🤳 tira uma selfie: flash branco e a imagem congela numa foto
  selfie(ef) { Object.assign(ef, { mao: desenharMao(0.45, true), foto: null, giro: rnd(-0.12, 0.12) }); },
  // 🪧 o fã dança na frente com a plaquinha com o nome de quem mandou
  fa(ef) { ef.coracoes = []; }
};

// Desenho de cada efeito a cada quadro. k = quanto do efeito já passou (0 a 1); some = alpha do fim
const DESENHO = {
  ovo(x, e, dt, some) {
    x.globalAlpha = some; x.drawImage(e.f, 0, 0);
    if (e.t > 0.4) {   // a gema escorrega devagar, deixando o rastro amarelo
      const antes = e.desce;
      e.desce += (5 + e.t * 7) * dt;
      const rx = e.rastro.getContext('2d');
      for (let y = Math.floor(e.cy + antes); y < Math.floor(e.cy + e.desce); y++) for (let X = -7; X <= 7; X++) if (Math.random() < 0.8) P(rx, e.cx + X + Math.sin(y * 0.1) * 1.5, y, X * X < 6 ? '#ffd23f' : '#f2c230', 0.35);
      rx.globalAlpha = 1;
    }
    x.globalAlpha = some; x.drawImage(e.rastro, 0, 0);
    x.drawImage(e.g, Math.round(e.cx - 14 + Math.sin((e.cy + e.desce) * 0.1) * 1.5), Math.round(e.cy + e.desce - 14));
  },
  pintor(x, e, dt, some) {
    const k = facil(e.t / 0.15), s = 0.35 + 0.65 * k, [cx, cy] = e.canto;
    x.globalAlpha = some;
    x.save(); x.translate(cx, cy); x.scale(s, s); x.translate(-cx, -cy); x.drawImage(e.c, 0, 0); x.restore();
    for (const g of e.gotas) {   // a tinta escorre pra baixo
      const len = Math.min(g.max, Math.max(0, e.t - 0.2) * 22);
      RET(x, g.x - g.w / 2, g.y, g.w, len, e.cor[0], some); RET(x, g.x - g.w / 2 - 1, g.y + len - 1, g.w + 2, 3, e.cor[0], some); RET(x, g.x - g.w / 2, g.y, 1, len, e.cor[1], some * 0.6);
    }
  },
  chiclete(x, e, dt, some, ctx) {
    const balanca = Math.min(1, ctx.tremor / 6);   // o vidro mexendo estica o chiclete
    x.globalAlpha = some; x.lineCap = 'round';
    for (const f of e.fios) {
      const est = 1 + balanca * 0.9 + 0.12 * Math.sin(e.t * 3 + f.fase);
      const ax = e.cx + (f.ax - e.cx) * est, ay = e.cy + (f.ay - e.cy) * est;
      const sag = 4 + est * 7;
      x.strokeStyle = '#ff7ac0'; x.lineWidth = est > 1.6 ? 1 : 2;
      x.beginPath(); x.moveTo(e.cx, e.cy); x.quadraticCurveTo((e.cx + ax) / 2, (e.cy + ay) / 2 + sag, ax, ay); x.stroke();
      bola(x, ax, ay, 2.5, '#ff6ab4', some);
    }
    const pulo = Math.round(Math.sin(e.t * 9) * balanca * 2);
    x.globalAlpha = some; x.drawImage(e.c, Math.round(e.cx - 22), Math.round(e.cy - 20 + pulo));
  },
  torta(x, e, dt, some) {
    const imp = e.t < 0.1 ? 1.25 - e.t * 2.5 : 1, cai = e.t > e.dura - 0.6 ? (e.t - (e.dura - 0.6)) ** 2 * 520 : e.t * 3;
    x.globalAlpha = some;
    x.save(); x.translate(e.cx, e.cy + cai); x.scale(imp, imp); x.drawImage(e.c, -95, -85); x.restore();
  },
  lambedor(x, e, dt, some) {
    const p = Math.min(1, e.t / 0.9), volta = e.t > 0.9 ? Math.min(1, (e.t - 0.9) / 0.35) : 0;
    const X = e.deEsq ? -30 + p * (W + 60) : W + 30 - p * (W + 60);
    const Y = e.y0 + Math.sin(p * Math.PI) * e.cur;
    if (p < 1) {   // pinta a baba onde a língua passou
      const rx = e.rastro.getContext('2d');
      if (e.ult) {
        const n = Math.ceil(Math.hypot(X - e.ult[0], Y - e.ult[1]));
        for (let i = 0; i < n; i++) {
          const qx = e.ult[0] + (X - e.ult[0]) * i / n, qy = e.ult[1] + (Y - e.ult[1]) * i / n;
          for (let v = -10; v <= 10; v++) if (Math.random() < 0.7) P(rx, qx, qy + v, Math.abs(v) < 2 ? '#ffffff' : '#d8f0c8', Math.abs(v) < 2 ? 0.55 : 0.28);
          if (Math.random() < 0.08) { const bx = qx, by = qy + rnd(-8, 8); P(rx, bx, by, '#ffffff', 0.9); P(rx, bx + 1, by, '#ffffff', 0.5); }   // bolhinhas
        }
      }
      e.ult = [X, Y];
    }
    x.globalAlpha = some; x.drawImage(e.rastro, 0, 0);
    // gotas de baba escorrendo do rastro
    if (e.t > 0.9 && Math.random() < 0.3 && e.ult) { const rx = e.rastro.getContext('2d'); const gx = rnd(0, W), gy = e.y0 + rnd(-6, 6) + Math.sin((gx / W) * Math.PI) * e.cur; for (let k = 0; k < rnd(3, 10); k++) P(rx, gx, gy + 8 + k, '#d8f0c8', 0.3); }
    if (volta >= 1) return;
    // a língua: vem da borda, grossa, rosa, com o sulco no meio
    const base = e.deEsq ? [-40, Y + 30] : [W + 40, Y + 30], ponta = volta ? [base[0] + (X - base[0]) * (1 - volta), base[1] + (Y - base[1]) * (1 - volta)] : [X, Y];
    x.globalAlpha = 1; x.lineCap = 'round';
    x.strokeStyle = '#a83a5a'; x.lineWidth = 24; x.beginPath(); x.moveTo(...base); x.lineTo(...ponta); x.stroke();
    x.strokeStyle = '#ff7a9a'; x.lineWidth = 20; x.beginPath(); x.moveTo(...base); x.lineTo(...ponta); x.stroke();
    x.strokeStyle = '#d84a70'; x.lineWidth = 2; x.beginPath(); x.moveTo(...base); x.lineTo(...ponta); x.stroke();
    x.strokeStyle = '#ffc0d0'; x.lineWidth = 3; x.beginPath(); x.moveTo(base[0], base[1] - 6); x.lineTo(ponta[0], ponta[1] - 6); x.stroke();
  },
  bate(x, e, dt, some, ctx) {
    // marca da mão a cada batida, o vidro trinca na terceira
    let bateu = -1;
    for (let i = 0; i < e.batidas.length; i++) if (e.t >= e.batidas[i] && e.feitas <= i) { e.feitas = i + 1; bateu = i; }
    if (bateu >= 0) {
      ctx.tremer(bateu === 2 ? 9 : 6); ctx.som?.('bate');
      const mx = e.mx; mx.globalAlpha = 0.18; mx.drawImage(e.mao.c, Math.round(e.x0 - e.mao.ox + rnd(-6, 6)), Math.round(e.y0 - e.mao.oy + rnd(-6, 6)));
      if (bateu === 2) ctx.trincar();
    }
    x.globalAlpha = some * 0.9; x.drawImage(e.marcas, 0, 0);
    if (e.t > 2.3) return;
    // a mão: chega perto (maior), bate (achata), afasta
    let perto = 0;
    for (const b of e.batidas) { const d = e.t - b; if (d > -0.25 && d < 0.2) perto = Math.max(perto, d < 0 ? 1 + d * 4 : 1 - d * 5); }
    const sai = e.t > 1.8 ? (e.t - 1.8) * 500 : 0, k = 0.82 + perto * 0.22;
    x.globalAlpha = 1;
    x.save(); x.translate(e.x0, e.y0 + sai); x.scale(k, k); x.drawImage(e.mao.c, -e.mao.ox, -e.mao.oy); x.restore();
    if (perto > 0.95) { x.globalAlpha = 0.5; x.strokeStyle = '#ffffff'; x.lineWidth = 1; x.beginPath(); x.arc(e.x0, e.y0 - 20, 40 + (1 - perto) * 200, 0, 7); x.stroke(); }
  },
  encostado(x, e, dt, some, ctx) {
    const entra = Math.min(1, e.t / 0.22), desce = e.t > e.dura - 0.8 ? (e.t - (e.dura - 0.8)) ** 1.6 * 260 : 0;
    if (e.t < 0.05 && !e.bateu) { e.bateu = true; ctx.tremer(5); }
    const k = 0.7 + 0.3 * entra, cx = e.x0, cy = e.y0 + desce, C = e.cara;
    if (desce > 0) { const sx = e.mancha.getContext('2d'); for (let X = -60; X <= 60; X += 2) if (Math.random() < 0.5) P(sx, cx + X, cy - 30, '#c8d8b0', 0.12); }   // a marca de gordura ao escorregar
    x.globalAlpha = some; x.drawImage(e.mancha, 0, 0);
    x.globalAlpha = some;
    x.save(); x.translate(cx, cy); x.scale(k * (1 + 0.04 * Math.sin(e.t * 2)), k); x.drawImage(C.c, -C.ox, -C.oy);
    // pupilas olhando em volta e depois fixas no público; uma piscada
    const olhar = e.t < 1.2 ? Math.sin(e.t * 4 + e.olha) * 6 : 0, pisca = Math.abs(e.t - 1.9) < 0.08;
    for (const s of [-1, 1]) {
      if (pisca) { RET(x, s * 34 - 14, -16, 28, 4, PELE.escura, some); continue; }
      bola(x, s * 34 + olhar, -13, 5, '#1a1410', some); bola(x, s * 34 + olhar - 2, -15, 1.4, '#ffffff', some);
    }
    // bafo embaçando o vidro
    const bafo = 0.18 + 0.12 * Math.sin(e.t * 5);
    x.globalAlpha = bafo * some; x.fillStyle = '#ffffff'; x.beginPath(); x.ellipse(0, 44, 46, 14, 0, 0, 7); x.fill();
    x.restore();
  },
  puxa(x, e, dt, some) {
    const ent = facil(e.t / 0.5), sai = e.t > e.dura - 0.35 ? 1 - (e.t - (e.dura - 0.35)) / 0.35 : 1, f = ent * sai;
    const s = f * W * 0.55;
    if (s < 2) return;
    // canto (C), as duas pontas da dobra (A, B) e onde o canto foi parar (D)
    const cfg = { bd: [W, H, -1, -1], be: [0, H, 1, -1], cd: [W, 0, -1, 1] }[e.canto];
    const [Cx, Cy, sx, sy] = cfg, A = [Cx + sx * s, Cy], B = [Cx, Cy + sy * s], D = [Cx + sx * s, Cy + sy * s];
    x.globalAlpha = 1;
    // atrás da tela: escuro, com dois olhos brilhando lá no fundo
    x.fillStyle = '#05040a'; x.beginPath(); x.moveTo(Cx, Cy); x.lineTo(...A); x.lineTo(...B); x.closePath(); x.fill();
    if (s > 40) { const ox = Cx + sx * s * 0.28, oy = Cy + sy * s * 0.28; RET(x, ox - 3, oy, 2, 2, '#ff3a2a'); RET(x, ox + 2, oy, 2, 2, '#ff3a2a'); }
    // sombra da aba
    x.globalAlpha = 0.35; x.fillStyle = '#000000'; x.beginPath(); x.moveTo(A[0], A[1]); x.lineTo(B[0], B[1]); x.lineTo(D[0] - sx * 6, D[1] - sy * 6); x.closePath(); x.fill();
    // a aba dobrada (o verso da tela): cinza claro, com degradê
    const gr = x.createLinearGradient(...A, ...D); gr.addColorStop(0, '#f2f2f6'); gr.addColorStop(1, '#a8a8b8');
    x.globalAlpha = 1; x.fillStyle = gr; x.beginPath(); x.moveTo(...A); x.lineTo(...B); x.lineTo(...D); x.closePath(); x.fill();
    x.strokeStyle = '#ffffff'; x.lineWidth = 1; x.beginPath(); x.moveTo(...A); x.lineTo(...B); x.stroke();
    // os dedos do zumbi segurando a ponta
    const M = e.dedos;
    x.save(); x.translate(D[0], D[1]); x.rotate(Math.atan2(sy, sx) + Math.PI / 4); x.drawImage(M.c, -M.ox, -M.oy * 0.6); x.restore();
  },
  grafite(x, e, dt, some) {
    const p = Math.min(1, e.t / 1.1), corte = e.x1 + (e.x2 - e.x1 + 8) * p;
    x.globalAlpha = some;
    x.save(); x.beginPath(); x.rect(0, 0, corte, H); x.clip(); x.drawImage(e.c, 0, 0); x.restore();
    if (p < 1) {   // a lata de spray passando
      const lx = corte, ly = e.cy - 14 + Math.sin(e.t * 30) * 4;
      RET(x, lx, ly, 5, 10, '#e83a5a'); RET(x, lx, ly - 2, 5, 2, '#d8dde6'); RET(x, lx + 1, ly + 2, 1, 6, '#ff9ab0');
      for (let i = 0; i < 10; i++) P(x, lx - rnd(0, 10), ly + rnd(-2, 14), e.cor, 0.5);
    }
  },
  gigante(x, e, dt, some, ctx) {
    const ent = facil(e.t / 0.9), sai = e.t > e.dura - 0.8 ? facil((e.t - (e.dura - 0.8)) / 0.8) : 0;
    const fechada = e.t > 1.15;
    if (e.t > 1.4 && !e.bateu) { e.bateu = true; ctx.tremer(12); ctx.piscar('#ff2a2a', 0.35); }
    if (fechada && e.t < 2.6) ctx.tremer(2);
    const M = fechada ? e.fechada : e.aberta;
    const borda = e.lado < 0 ? -M.c.width * 0.6 : W + M.c.width * 0.6, alvo = W / 2 + e.lado * 10;
    const cx = borda + (alvo - borda) * ent * (1 - sai), cy = e.y0 + Math.sin(e.t * 3) * 4;
    // escurece em volta (a mão faz sombra na tela)
    x.globalAlpha = 0.3 * ent * (1 - sai); x.fillStyle = '#000000'; x.fillRect(0, 0, W, H);
    x.globalAlpha = 1;
    x.save(); x.translate(cx, cy); x.rotate(e.lado < 0 ? Math.PI / 2 : -Math.PI / 2); x.drawImage(M.c, -M.ox, -M.oy); x.restore();
  },
  selfie(x, e, dt, some, ctx) {
    // 0 a 0,7 s: a mão com o celular sobe pela borda; 0,7 s: FLASH; depois a foto congelada aparece e voa embora
    if (e.t < 0.75) {
      const sobe = facil(e.t / 0.4), M = e.mao, bx = W * 0.72, by = H + 30 - sobe * 110;
      x.globalAlpha = 1; x.drawImage(M.c, Math.round(bx - M.ox), Math.round(by - M.oy * 0.4));
      RET(x, bx - 16, by - 46, 32, 54, '#16161e'); RET(x, bx - 13, by - 42, 26, 44, '#3a5a8a');
      RET(x, bx - 6, by - 30, 12, 12, PELE.base); RET(x, bx - 4, by - 27, 2, 2, '#ffffff'); RET(x, bx + 2, by - 27, 2, 2, '#ffffff'); RET(x, bx - 3, by - 22, 6, 2, '#2a0a0a');
      if (e.t > 0.55 && Math.floor(e.t * 20) % 2) bola(x, bx + 10, by - 40, 2, '#ffffff', 1);
      return;
    }
    if (!e.foto) { e.foto = ctx.fotografar(); ctx.som?.('flash'); }
    const fl = Math.max(0, 1 - (e.t - 0.75) / 0.35);
    if (fl > 0) { x.globalAlpha = fl; x.fillStyle = '#ffffff'; x.fillRect(0, 0, W, H); }
    if (!e.foto) return;
    const voa = e.t > e.dura - 0.5 ? facil((e.t - (e.dura - 0.5)) / 0.5) : 0, cai = facil(Math.min(1, (e.t - 0.75) / 0.25));
    const pw = 150, ph = 176;
    x.globalAlpha = 1 - voa * 0.8;
    x.save(); x.translate(W / 2, H * 0.44 - (1 - cai) * 30 - voa * 260); x.rotate(e.giro + voa * 0.6);
    RET(x, -pw / 2 + 3, -ph / 2 + 4, pw, ph, '#000000', 0.35);
    RET(x, -pw / 2, -ph / 2, pw, ph, '#f8f6f0');
    x.globalAlpha = 1 - voa * 0.8; x.drawImage(e.foto, -pw / 2 + 8, -ph / 2 + 8, pw - 16, ph - 40);
    textoPixel(x, e.nick ? '@' + e.nick : '#ZUMBISELFIE', 0, ph / 2 - 16, 12, '#2a2a3a', pw - 16);
    x.restore();
  },
  fa(x, e, dt, some, ctx) {
    const entra = facil(e.t / 0.4), sai = e.t > e.dura - 0.45 ? facil((e.t - (e.dura - 0.45)) / 0.45) : 0;
    const dx = Math.sin(e.t * 5) * 14, pulo = Math.abs(Math.sin(e.t * 10)) * 5;
    const bx = W / 2 + dx, by = H + 20 - (entra * (1 - sai)) * 150 - pulo;
    x.globalAlpha = 1;
    // corpo e cabeça em close (camiseta com as cores do TikTok)
    for (let y = 0; y < 90; y++) for (let X = -46; X <= 46; X++) if ((X / 46) ** 2 + ((y - 90) / 70) ** 2 < 1) P(x, bx + X, by + y, Math.abs(X) < 8 && y < 30 ? '#ffffff' : X < 0 ? '#fe2c55' : '#25f4ee');
    mancha(x, bx, by - 14, 24, PELE.base, 1, [1, 2, 3], 1.05, 0.25);
    bola(x, bx - 9, by - 18, 3, '#f0ead8'); bola(x, bx + 9, by - 18, 3, '#f0ead8'); P(x, bx - 9, by - 18, '#1a1410'); P(x, bx + 9, by - 18, '#1a1410');
    for (let X = -10; X <= 10; X++) P(x, bx + X, by - 4 + Math.abs(X) * -0.25, '#2a0a0a');   // sorriso
    // braços levantados (alternando) segurando a plaquinha
    const ba = Math.sin(e.t * 10) * 4;
    x.strokeStyle = PELE.base; x.lineWidth = 7; x.lineCap = 'round';
    x.beginPath(); x.moveTo(bx - 34, by + 26); x.lineTo(bx - 40, by - 34 + ba); x.stroke();
    x.beginPath(); x.moveTo(bx + 34, by + 26); x.lineTo(bx + 40, by - 34 - ba); x.stroke();
    // a plaquinha com o nome
    const pw = 150, ph = 46, py = by - 84 + ba * 0.5;
    RET(x, bx - pw / 2 - 2, py - 2, pw + 4, ph + 4, '#1a1420'); RET(x, bx - pw / 2, py, pw, ph, '#ffffff');
    RET(x, bx - pw / 2, py, pw, 4, '#fe2c55'); RET(x, bx - pw / 2, py + ph - 4, pw, 4, '#25f4ee');
    textoPixel(x, e.palavra || 'VOCÊ', bx, py + ph / 2 + 1, 22, '#1a1420', pw - 14);
    // coraçõezinhos subindo
    if (Math.random() < 0.15) e.coracoes.push({ x: bx + rnd(-60, 60), y: by - 40, t: 0 });
    for (const c of e.coracoes) { c.t += dt; c.y -= 30 * dt; const hx = c.x + Math.sin(c.t * 4) * 4; RET(x, hx - 2, c.y, 2, 2, '#ff3a6a', 1 - c.t); RET(x, hx + 1, c.y, 2, 2, '#ff3a6a', 1 - c.t); RET(x, hx - 2, c.y + 2, 5, 2, '#ff3a6a', 1 - c.t); RET(x, hx - 1, c.y + 4, 3, 1, '#ff3a6a', 1 - c.t); }
    e.coracoes = e.coracoes.filter(c => c.t < 1);
  },
  lama(x, e, dt, some) {
    const k = facil(e.t / 0.18);
    x.globalAlpha = some; x.save(); x.beginPath(); x.rect(0, H - k * H, W, H); x.clip(); x.drawImage(e.c, 0, Math.min(6, e.t * 2)); x.restore();
  },
  // --- camada de baixo (a imagem do jogo; o painel continua por cima) ---
  eletricista(x, e, dt, some) {
    const I = Math.max(0.15, 1 - e.t / e.dura) * (0.7 + 0.3 * Math.random());
    for (let i = 0; i < 5000 * I; i++) P(x, Math.random() * W, Math.random() * H, Math.random() < 0.5 ? '#ffffff' : '#101018', 0.6 * I);
    for (let y = Math.floor(e.t * 90) % 3; y < H; y += 3) RET(x, 0, y, W, 1, '#000000', 0.18 * I);   // linhas de varredura
    for (let b = 0; b < 3; b++) if (Math.random() < 0.6) RET(x, 0, Math.random() * H, W, rnd(2, 10), '#ffffff', 0.22 * I);
    for (let i = 0; i < 6; i++) if (Math.random() < 0.3) P(x, rnd(0, W), rnd(0, 20), '#ffe83a', 1);
  },
  fumaca(x, e, dt, some) {
    for (const n of e.nuvens) {
      if (e.t < n.atraso) continue;
      n.y -= n.vy * dt; n.vy *= Math.pow(0.55, dt); n.s += dt * 0.5;
      const s = 64 * n.s;
      x.globalAlpha = some * Math.min(1, (e.t - n.atraso) * 4); x.drawImage(e.puff, n.x - s / 2, n.y - s / 2, s, s);
    }
  },
  apagao(x, e, dt, some, ctx) {
    // as luzes piscam e caem; no fim, piscam de volta
    const t = e.t, pisc = t < 0.55 ? (Math.floor(t * 14) % 3 === 0 ? 0 : 1) : t > e.dura - 0.5 ? (Math.floor(t * 14) % 2) : 1;
    if (!pisc) return;
    x.globalAlpha = 0.94; x.fillStyle = '#020104'; x.fillRect(0, 0, W, H);
    // a lanterninha do herói (bem pequena)
    const [hx, hy] = ctx.naTela(ctx.g.hero.x, ctx.g.hero.y, 8);
    const gr = x.createRadialGradient(hx, hy, 0, hx, hy, 20); gr.addColorStop(0, 'rgba(255,240,200,0.35)'); gr.addColorStop(1, 'rgba(255,240,200,0)');
    x.globalAlpha = 1; x.fillStyle = gr; x.fillRect(hx - 20, hy - 20, 40, 40);
    // os olhos dos zumbis brilhando (piscam de vez em quando)
    for (const z of ctx.g.zumbis) {
      if (z.morto || ((z.id * 7 + Math.floor(t * 3)) % 11 === 0)) continue;
      const [sx, sy] = ctx.naTela(z.x, z.y, 13);
      if (sx < -4 || sx > W + 4 || sy < -4 || sy > H + 4) continue;
      RET(x, sx - 3, sy - 1, 7, 3, '#ff2a1a', 0.18);
      RET(x, sx - 2, sy, 1, 1, '#ff4a2a', 1); RET(x, sx + 1, sy, 1, 1, '#ff4a2a', 1);
    }
  },
  tonto(x, e, dt, some) {
    // estrelinhas girando no meio da tela
    for (let i = 0; i < 4; i++) { const a = e.t * 4 + i * Math.PI / 2, X = W / 2 + Math.cos(a) * 34, Y = H * 0.32 + Math.sin(a) * 10; RET(x, X - 1, Y, 3, 1, '#ffe83a', some); RET(x, X, Y - 1, 1, 3, '#ffe83a', some); }
  }
};

// Mexe na imagem do jogo por CSS (girar, embaçar, piscar). Devolve { transform, filter } do jogo
function cssDoEfeito(e) {
  const k = e.t / e.dura;
  if (e.id === 'tonto') {
    const giro = e.t < 1 ? Math.sin(e.t * 6) * 18 : e.t < 2.1 ? 180 * facil((e.t - 1) / 0.6) : 180 * (1 - facil((e.t - 2.1) / 0.6));
    return { transform: `rotate(${(giro * e.sentido).toFixed(1)}deg) scale(1.18)` };
  }
  if (e.id === 'fumaca') return { filter: `blur(${(2.6 * (1 - k)).toFixed(2)}px)` };
  if (e.id === 'eletricista') return { filter: `brightness(${(0.7 + Math.random() * 0.8).toFixed(2)}) contrast(1.3) saturate(${(0.4 + Math.random() * 0.6).toFixed(2)})`, transform: Math.random() < 0.25 ? `translateX(${Math.round(rnd(-6, 6))}px)` : '' };
  return null;
}

export { desenharMao, desenharCara };   // (pra conferir a arte em teste)

export class TelaFX {
  // cima/baixo: canvas das camadas; jogo: os canvas que giram/embaçam; frame: o que treme
  constructor({ cima, baixo, jogo = [], frame = null, sujeira = null, render = null, som = null }) {
    this.cima = cima.getContext('2d'); this.baixo = baixo.getContext('2d');
    this.cima.imageSmoothingEnabled = false; this.baixo.imageSmoothingEnabled = false;
    this.cvBaixo = baixo; this.jogo = jogo; this.frame = frame; this.sujeira = sujeira; this.render = render; this.som = som;
    this.ativos = []; this.limpador = null; this.tremor = 0; this.ultimaCor = null; this.cssAplicado = false;
  }

  // efeito novo (evento "tela" do jogo): { id, nick, palavra }
  disparar(e) {
    const Zt = ZUMBIS_TELA[e.id];
    if (!Zt || !EFEITOS[e.id]) return;
    // tela cheia demais: o mais antigo sai antes (começa a sumir)
    let soma = Zt.cobre;
    for (const a of [...this.ativos].reverse()) { if (a.saindo) continue; if (soma + a.cobre > TELA.coberturaMax) { a.t = Math.max(a.t, a.dura - 0.4); a.saindo = true; } else soma += a.cobre; }
    const ef = { id: e.id, t: 0, dura: Zt.dura, cobre: Zt.cobre, camada: 'cima', nick: e.nick, palavra: e.palavra };
    EFEITOS[e.id](ef, this);
    this.ativos.push(ef);
  }

  // passa o limpador de para-brisa (se tiver o que limpar). Devolve true se limpou.
  limpar() {
    const sujo = this.ativos.some(a => a.camada === 'cima' && !a.saindo) || (this.sujeira?.manchas.length > 0);
    if (!sujo || this.limpador) return false;
    this.limpador = { t: 0, dura: TELA.limpador.dura, limpou: false };
    return true;
  }
  get sujo() { return this.ativos.length > 0 || (this.sujeira?.manchas.length > 0); }

  tremer(v) { this.tremor = Math.max(this.tremor, v); this.render?.tremer(v); }

  // a foto da selfie: o quadro do jogo agora
  fotografar() {
    const fonte = this.jogo[0];
    if (!fonte) return null;
    // o meio da imagem do jogo (onde fica o herói), num quadro quase quadrado
    const fw = fonte.width, fh = fw * 0.95, [c, x] = novaTela(W, Math.round(W * 0.95));
    x.drawImage(fonte, 0, (fonte.height - fh) / 2, fw, fh, 0, 0, W, Math.round(W * 0.95));
    x.globalAlpha = 0.15; x.fillStyle = '#ffd8a0'; x.fillRect(0, 0, W, H);   // cor de foto
    return c;
  }

  desenhar(dt, g) {
    const cima = this.cima, baixo = this.baixo;
    this.g = g;
    baixo.clearRect(0, 0, W, H);
    this.tremor = Math.max(0, this.tremor - dt * 14);
    const ctx = {
      tremor: this.tremor, g, tremer: v => this.tremer(v), piscar: (c, a) => this.render?.piscar(c, a),
      trincar: () => this.sujeira?.pedrada(), fotografar: () => this.fotografar(), som: this.som,
      naTela: (x, y, z) => this.render ? this.render.tela(x, y, z) : [W / 2, H / 2]
    };
    let css = null;
    for (const e of this.ativos) {
      e.t += dt;
      const some = e.t > e.dura - 0.5 ? Math.max(0, (e.dura - e.t) / 0.5) : 1;
      const x = e.camada === 'baixo' ? baixo : cima;
      x.save();
      DESENHO[e.id](x, e, dt, some, ctx);
      x.restore(); x.globalAlpha = 1;
      const c = cssDoEfeito(e);
      if (c) css = { ...(css || {}), ...c };
    }
    this.ativos = this.ativos.filter(e => e.t < e.dura);
    this.aplicarCss(css);
    if (this.limpador) this.desenharLimpador(dt);
  }

  aplicarCss(css) {
    if (!css && !this.cssAplicado) return;
    for (const el of this.jogo) { el.style.transform = css?.transform || ''; el.style.filter = css?.filter || ''; }
    if (this.cvBaixo) this.cvBaixo.style.transform = css?.transform || '';
    this.cssAplicado = !!css;
  }

  // a palheta passa num arco (vai e volta); no meio da passada, a sujeira sai
  desenharLimpador(dt) {
    const L = this.limpador, x = this.cima;
    L.t += dt;
    const k = L.t / L.dura, ida = k < 0.5 ? k / 0.5 : 1 - (k - 0.5) / 0.5;
    // eixo no canto de baixo à esquerda: a palheta vai de deitada (embaixo) até em pé (na esquerda) e volta,
    // varrendo a tela inteira (a tela é estreita e alta)
    const ang = -0.04 * Math.PI - 0.5 * Math.PI * (0.5 - 0.5 * Math.cos(Math.PI * ida)), px = -6, py = H + 6, len = Math.hypot(W + 10, H + 10) * 1.02;
    if (k >= 0.5 && !L.limpou) {
      L.limpou = true;
      for (const a of this.ativos) if (a.camada === 'cima') { a.t = Math.max(a.t, a.dura - 0.15); a.saindo = true; }
      if (this.sujeira) this.sujeira.manchas = [];
    }
    // o rastro de água atrás da palheta
    // rastros de água por onde a palheta passou (arcos finos, brilhando)
    x.save(); x.lineWidth = 1; x.strokeStyle = '#e8f6ff';
    for (let i = 0; i < 9; i++) { const r = len * (0.2 + i * 0.09); x.globalAlpha = 0.16 * (1 - k) * (i % 2 ? 1 : 0.6); x.beginPath(); x.arc(px, py, r, ang, -0.04 * Math.PI); x.stroke(); }
    x.restore();
    const ex = px + Math.cos(ang) * len, ey = py + Math.sin(ang) * len, mx = px + Math.cos(ang) * len * 0.25, my = py + Math.sin(ang) * len * 0.25;
    x.save(); x.globalAlpha = 1; x.lineCap = 'round';
    x.strokeStyle = '#6a6a74'; x.lineWidth = 4; x.beginPath(); x.moveTo(px, py); x.lineTo(mx, my); x.stroke();                // braço de metal
    x.strokeStyle = '#0c0c10'; x.lineWidth = 6; x.beginPath(); x.moveTo(mx, my); x.lineTo(ex, ey); x.stroke();                 // a borracha
    x.strokeStyle = '#5a5a66'; x.lineWidth = 1; x.beginPath(); x.moveTo(mx - 2, my - 2); x.lineTo(ex - 2, ey - 2); x.stroke();  // brilho do metal
    for (let i = 1; i < 8; i++) { const q = 0.25 + i * 0.1; RET(x, px + Math.cos(ang) * len * q - 1, py + Math.sin(ang) * len * q - 1, 3, 3, '#3a3a44'); }   // as presilhas da palheta
    x.restore();
    if (L.t >= L.dura) this.limpador = null;
  }
}
