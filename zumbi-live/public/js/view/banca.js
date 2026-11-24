// ============================================================================
//  A BANCA DO BARGANHA (core/mascate.js): a tela que abre quando o herói para no janelão do galpão.
//  Como uma banca de revista vista de fora, de noite: a parede de bloco sem reboco, o letreiro pintado à mão,
//  a TOCHA AZUL tremeluzindo do lado do janelão, revistas penduradas no varal, as prateleiras com os itens
//  (armas em cima, tônicos embaixo, cada um com o número e o preço), o balcão, e o Barganha atrás dele, de
//  capuz, com os olhos amarelos brilhando. Embaixo, a votação do chat (1 a 9) em HTML (index.html → #loja).
//  Pixel art feita em código, 216 x 176 px, ampliada sem suavizar (historia/HISTORIA.md, seção 5).
// ============================================================================
import { PIXEL } from './cinema.js';
import { ITENS } from '../core/itens.js';

const { R, P, G, brilho, texto, largura, disco, linha, th } = PIXEL;
const W = 216, H = 176;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

// onde fica cada coisa
const JAN = { x0: 26, y0: 30, x1: 202, y1: 150 };      // o janelão
const TOCHA = { x: 13, y: 46 };                          // a chama
const SLOTS = [[48, 76], [84, 76], [120, 76], [48, 108], [84, 108], [120, 108]];   // [meio, chão da prateleira]
const BALCAO = 128;

const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; return [c, x]; };

/* ------------------------------ o fundo (fica pronto uma vez) ------------------------------ */
function fundo() {
  const [c, x] = mk();
  // parede de bloco de concreto sem reboco, mais clara perto da tocha
  G(x, 0, 0, W, H, ['#0c0e14', '#151925', '#1d2231', '#262c3e'], (X, Y) => 0.95 - Math.hypot(X - TOCHA.x, (Y - TOCHA.y) * 1.2) / 170);
  for (let y = 0; y < H; y += 6) {
    const off = (y / 6) % 2 ? 0 : 7;
    for (let X = -off; X < W; X += 14) { R(x, 'rgba(0,0,0,.35)', X, y, 1, 6); }
    R(x, 'rgba(0,0,0,.4)', 0, y, W, 1);
  }
  // o letreiro pintado à mão, com a tinta escorrendo
  const nome = 'O BARGANHA', lx = Math.round((W - (largura(nome) * 2)) / 2);
  texto(x, nome, lx + 1, 10, '#0a0c12', 2);
  texto(x, nome, lx, 9, '#cfe6ff', 2);
  for (const [dx, h] of [[6, 3], [21, 5], [38, 2], [55, 4], [70, 3]]) R(x, '#9cc4ee', lx + dx, 19, 1, h);
  R(x, '#cfe6ff', lx - 10, 13, 6, 1); R(x, '#cfe6ff', lx + largura(nome) * 2 + 4, 13, 6, 1);
  // o janelão: moldura de ferro, rebites
  R(x, '#07080c', JAN.x0 - 3, JAN.y0 - 3, JAN.x1 - JAN.x0 + 6, JAN.y1 - JAN.y0 + 6);
  R(x, '#2a303e', JAN.x0 - 2, JAN.y0 - 2, JAN.x1 - JAN.x0 + 4, 1);
  for (let X = JAN.x0; X < JAN.x1; X += 12) { P(x, '#4a5468', X, JAN.y0 - 2); P(x, '#4a5468', X, JAN.y1 + 1); }
  // dentro: escuro, com a luz azul entrando pela esquerda
  G(x, JAN.x0, JAN.y0, JAN.x1 - JAN.x0, JAN.y1 - JAN.y0, ['#05060c', '#0a0e1c', '#101a32', '#18284a'], (X, Y) => 0.85 - (X - JAN.x0) / 200 - Math.abs(Y - 90) / 400);
  // tábuas do fundo da banca
  for (let X = JAN.x0 + 9; X < JAN.x1; X += 18) R(x, 'rgba(0,0,0,.35)', X, JAN.y0, 1, BALCAO - JAN.y0);
  // as prateleiras (tábua com a luz azul batendo na quina)
  for (const y of [77, 109]) {
    R(x, '#3a2618', JAN.x0 + 2, y, 122, 4); R(x, '#5a3c24', JAN.x0 + 2, y, 122, 1); R(x, '#6ab0ff', JAN.x0 + 2, y, 40, 1);
    R(x, '#1a1008', JAN.x0 + 2, y + 4, 122, 1);
    for (const sx of [JAN.x0 + 6, JAN.x0 + 116]) R(x, '#24160c', sx, y + 4, 2, 4);   // mão-francesa
  }
  // o varal de revistas no alto do janelão
  linha(x, '#6a6a72', JAN.x0 + 2, 36, JAN.x1 - 2, 36);
  return c;
}

// a mochila e as bugigangas atrás do Barganha (lado direito do janelão)
function cantoDireito(x) {
  R(x, '#4a3420', 150, 82, 46, 46); R(x, '#5e4228', 152, 84, 42, 3); R(x, '#2e2014', 150, 124, 46, 4);   // a mochila enorme
  // panela, lanterna e uma corda pendurados
  disco(x, 158, 94, 4, '#3a3e48'); R(x, '#5a606c', 155, 91, 3, 1);
  R(x, '#6a5a2a', 190, 88, 4, 7); R(x, '#d8b040', 191, 90, 2, 3);
  for (let k = 0; k < 6; k++) P(x, '#8a7a5a', 186 + (k % 2), 100 + k * 3);
}

/* ------------------------------ os itens da prateleira ------------------------------ */
function arma(x, id, cx, by) {
  const aço = '#3a3e48', luz = '#8ab8ff', mad = '#6a4228';
  if (id === 'pistola') { R(x, aço, cx - 7, by - 9, 13, 4); R(x, '#24272e', cx + 2, by - 5, 4, 5); R(x, luz, cx - 7, by - 9, 13, 1); P(x, '#24272e', cx - 2, by - 5); }
  else if (id === 'escopeta') { R(x, aço, cx - 13, by - 6, 18, 3); R(x, mad, cx + 4, by - 6, 10, 4); R(x, mad, cx - 4, by - 3, 5, 2); R(x, luz, cx - 13, by - 6, 18, 1); }
  else if (id === 'metralhadora') { R(x, '#1e2026', cx - 12, by - 9, 22, 5); R(x, '#1e2026', cx - 2, by - 4, 4, 4); R(x, '#1e2026', cx + 6, by - 6, 5, 6); R(x, luz, cx - 12, by - 9, 22, 1); R(x, '#ffb030', cx - 12, by - 8, 2, 1); }
  else if (id === 'lanca') { R(x, '#a83020', cx - 2, by - 12, 7, 12); R(x, '#d84a30', cx - 2, by - 12, 2, 12); R(x, aço, cx - 12, by - 8, 11, 2); R(x, '#ffb030', cx - 13, by - 8, 1, 2); R(x, luz, cx - 2, by - 12, 7, 1); }
  else if (id === 'taco') { linha(x, '#8a5a30', cx - 10, by - 1, cx + 9, by - 12); linha(x, '#a86a38', cx - 10, by - 2, cx + 9, by - 13); for (const k of [4, 7, 10]) P(x, '#c8ccd4', cx - 10 + k * 1.6 + 6, by - 4 - k); }
  else if (id === 'municao') { R(x, '#4a5a2a', cx - 7, by - 7, 14, 7); R(x, '#5e7034', cx - 7, by - 7, 14, 1); for (let k = 0; k < 4; k++) { R(x, '#e8c060', cx - 5 + k * 3, by - 11, 2, 4); P(x, '#b88a30', cx - 5 + k * 3, by - 11); } }
}
function garrafa(x, id, cx, by, t) {
  const it = ITENS[id];
  R(x, '#1c2230', cx - 4, by - 13, 9, 13);                 // vidro
  R(x, it.cor, cx - 3, by - 9, 7, 8);                      // o tônico
  R(x, it.claro, cx - 3, by - 9, 7, 1);
  R(x, '#e8dcc0', cx - 3, by - 6, 7, 3); R(x, it.cor, cx - 1, by - 5, 3, 1);   // o rótulo
  R(x, '#1c2230', cx - 1, by - 17, 3, 4); R(x, '#8a5a30', cx - 1, by - 18, 3, 2);   // gargalo e rolha
  P(x, '#cfe6ff', cx - 3, by - 12); P(x, '#cfe6ff', cx - 3, by - 11);              // brilho da tocha no vidro
  if (it.raro) { const k = 0.5 + 0.5 * Math.sin(t * 4); x.globalAlpha = 0.35 + 0.3 * k; brilho(x, cx, by - 6, 9, it.claro, 0.8); x.globalAlpha = 1; }
}
function vendido(x, cx, by) {
  R(x, '#d8ccb0', cx - 15, by - 9, 31, 8); R(x, '#a89878', cx - 15, by - 2, 31, 1);
  texto(x, 'VENDIDO', cx - 13, by - 8, '#8a2a20');
}

/* ------------------------------ o Barganha ------------------------------ */
function barganha(x, t, falando) {
  const bob = Math.round(Math.sin(t * 1.6) * 0.6), cx = 172, top = 86 + bob;
  // ombros e casaco
  x.fillStyle = '#2e3820';
  for (let y = top + 18; y < BALCAO; y++) { const w = Math.min(34, 14 + (y - top - 18) * 2); x.fillRect(cx - w / 2, y, w, 1); }
  R(x, '#3e4a2c', cx - 15, top + 24, 3, BALCAO - top - 24);                 // luz azul batendo no ombro
  R(x, '#59b0ff', cx - 16, top + 26, 1, BALCAO - top - 30);
  R(x, '#4a3420', cx - 9, top + 20, 2, BALCAO - top - 20); R(x, '#4a3420', cx + 8, top + 20, 2, BALCAO - top - 20);   // alças da mochila
  // capuz
  disco(x, cx, top + 9, 10, '#2e3820');
  R(x, '#3e4a2c', cx - 10, top + 2, 4, 12); R(x, '#59b0ff', cx - 11, top + 4, 1, 9);
  // o rosto na sombra, o lenço vermelho e os olhos amarelos (pisca de vez em quando)
  disco(x, cx + 1, top + 11, 6, '#07080a');
  R(x, '#b83a2a', cx - 5, top + 14, 12, 4); R(x, '#d8503a', cx - 5, top + 14, 12, 1);
  if (falando) R(x, '#8a2a20', cx - 1, top + 16, 4, 1);
  const pisca = Math.floor(t * 1.3) % 7 === 0 && (t * 1.3) % 1 < 0.25;
  if (!pisca) { R(x, '#ffe14a', cx - 3, top + 9, 2, 1); R(x, '#ffe14a', cx + 3, top + 9, 2, 1); P(x, '#fff8c0', cx - 3, top + 9); P(x, '#fff8c0', cx + 3, top + 9); }
  // a mão em cima do balcão, com uma moeda
  R(x, '#3a302a', cx - 20, BALCAO - 3, 7, 3); P(x, '#ffd23f', cx - 18, BALCAO - 4);
}

/* ------------------------------ o balcão e o que tem nele ------------------------------ */
function balcao(x) {
  R(x, '#2a1a10', JAN.x0 - 4, BALCAO, JAN.x1 - JAN.x0 + 8, 24);
  for (let X = JAN.x0; X < JAN.x1; X += 22) R(x, '#1e120a', X, BALCAO + 2, 1, 22);
  R(x, '#5a3c24', JAN.x0 - 4, BALCAO, JAN.x1 - JAN.x0 + 8, 2); R(x, '#8ac8ff', JAN.x0 - 4, BALCAO, 60, 1);
  const frase = 'COMPRO  VENDO  TROCO';
  texto(x, frase, Math.round((W - largura(frase)) / 2), BALCAO + 9, '#c8b48a');
  // pilha de jornal, caixa de dinheiro, sininho
  R(x, '#b8b4a8', JAN.x0 + 4, BALCAO - 5, 18, 5); R(x, '#8a8478', JAN.x0 + 4, BALCAO - 3, 18, 1); R(x, '#8a8478', JAN.x0 + 4, BALCAO - 1, 18, 1);
  R(x, '#3a4a5a', 132, BALCAO - 6, 12, 6); R(x, '#5a6a7a', 132, BALCAO - 6, 12, 1); R(x, '#d8b040', 137, BALCAO - 4, 2, 2);
  R(x, '#c8a040', 112, BALCAO - 3, 5, 3); P(x, '#ffe080', 114, BALCAO - 4);
}

// as revistas penduradas no varal (balançam com o vento)
const REVISTAS = [['#c83a3a', '#f2d34c'], ['#2a7a5a', '#e8e8e8'], ['#e8e0d0', '#2a2a2a'], ['#d87a2a', '#1a1a1a'], ['#5a3a8a', '#f2c94c'], ['#e8e0d0', '#2a2a2a'], ['#2a5aa8', '#ffffff'], ['#a82a6a', '#ffe0f0']];
function varal(x, t) {
  REVISTAS.forEach(([capa, tit], k) => {
    const X = JAN.x0 + 8 + k * 21, bal = Math.round(Math.sin(t * 1.4 + k) * 0.7);
    R(x, '#8a7a5a', X + 4, 34, 2, 4);                               // prendedor
    R(x, capa, X + bal, 37, 12, 15);
    R(x, tit, X + 1 + bal, 39, 10, 2);
    if (capa === '#e8e0d0') { for (let l = 0; l < 4; l++) R(x, '#8a8a8a', X + 1 + bal, 43 + l * 2, 10, 1); }   // jornal
    else { disco(x, X + 6 + bal, 47, 3, tit); R(x, 'rgba(0,0,0,.25)', X + 8 + bal, 37, 4, 15); }
  });
}

/* ------------------------------ a tocha azul ------------------------------ */
function tocha(x, t) {
  // suporte de ferro e o cabo
  R(x, '#2a2e36', TOCHA.x - 1, TOCHA.y + 18, 7, 2); R(x, '#2a2e36', TOCHA.x - 3, TOCHA.y + 12, 2, 8);
  R(x, '#5a3a22', TOCHA.x + 1, TOCHA.y + 4, 3, 18); R(x, '#3a2414', TOCHA.x + 3, TOCHA.y + 4, 1, 18);
  R(x, '#3a3e48', TOCHA.x - 1, TOCHA.y + 2, 7, 3);
  // a chama tremeluzindo
  const f = Math.sin(t * 17) + Math.sin(t * 7.3 + 1) * 0.7, alt = 9 + Math.round(f * 1.6), lado = Math.round(Math.sin(t * 5.1) * 1.2);
  for (let k = 0; k < alt; k++) {
    const w = Math.max(1, Math.round((alt - k) * 0.55 + (k < 2 ? 1 : 0)));
    const cor = k > alt - 3 ? '#9ad8ff' : k > alt * 0.45 ? '#3a8aff' : '#1a4ad8';
    x.fillStyle = cor; x.fillRect(TOCHA.x + 2 - Math.floor(w / 2) + Math.round(lado * k / alt), TOCHA.y + 1 - k, w, 1);
  }
  R(x, '#e8f8ff', TOCHA.x + 1 + Math.round(lado / 2), TOCHA.y - 3, 2, 3);   // o miolo branco
  // faíscas subindo
  for (let k = 0; k < 4; k++) {
    const v = (t * 0.9 + k * 0.27) % 1;
    P(x, v < 0.5 ? '#bfe8ff' : '#3a8aff', TOCHA.x + 2 + Math.round(Math.sin((t + k) * 3) * 3), TOCHA.y - 6 - Math.round(v * 22));
  }
  return f;
}

// o brilho azul por cima de tudo (pontilhado), mais forte perto da tocha
function luzAzul(x, f) {
  x.globalAlpha = 0.5;
  brilho(x, TOCHA.x + 2, TOCHA.y - 2, 26 + f * 2, '#3a8aff', 0.55);
  x.globalAlpha = 0.25;
  brilho(x, TOCHA.x + 2, TOCHA.y + 6, 70 + f * 4, '#2a5ad8', 0.5, 0.9);
  x.globalAlpha = 1;
}

// o chão molhado embaixo, com o reflexo azul da tocha
function chao(x, t) {
  G(x, 0, 152, W, H - 152, ['#06070a', '#0c0e14', '#121622'], (X, Y) => 0.7 - (Y - 152) / 40);
  for (let k = 0; k < 6; k++) { const w = 6 - k + Math.round(Math.sin(t * 3 + k) * 1.5); R(x, k % 2 ? '#1a4ad8' : '#3a8aff', TOCHA.x + 2 - w / 2, 156 + k * 3, w, 1); }
}

/* ------------------------------ a tela ------------------------------ */
export class Banca {
  constructor() {
    this.raiz = $('loja'); this.cv = $('lj-cv'); this.x = this.cv.getContext('2d'); this.x.imageSmoothingEnabled = false;
    this.base = null; this.t = 0; this.chave = ''; this.flutua = [];
  }

  update(g, dt) {
    const L = g.loja;
    if (!L) {
      if (!this.raiz.hidden) { this.raiz.classList.remove('on'); this.saiT = (this.saiT ?? 0.5) - dt; if (this.saiT <= 0) { this.raiz.hidden = true; this.saiT = null; } }
      return;
    }
    this.saiT = null;
    if (this.raiz.hidden) { this.raiz.hidden = false; this.chave = ''; this.flutua = []; this.ultimoVisto = null; void this.raiz.offsetWidth; }
    this.raiz.classList.toggle('on', L.fase !== 'fechando');
    this.t += dt;
    this.desenhar(g, L, dt);
    this.painel(g, L);
  }

  desenhar(g, L, dt) {
    const x = this.x, t = this.t;
    if (!this.base) this.base = fundo();
    x.drawImage(this.base, 0, 0);
    varal(x, t);
    cantoDireito(x);
    // os itens (o que tem mais voto pisca o número)
    const ops = L.ofertas || [], voto = L.voto, lider = voto && L.fase === 'votando' ? Math.max(...voto.opcoes.map(o => o.votos)) : 0;
    L.prateleira.forEach((s, k) => {
      const [cx, by] = SLOTS[k], it = ITENS[s.id];
      if (s.vendido) vendido(x, cx, by);
      else if (it.tipo === 'tonico') garrafa(x, s.id, cx, by, t);
      else arma(x, s.id, cx, by);
      // a etiqueta: o número (amarelo) e o preço
      const o = voto?.opcoes.find(v => v.n === s.n), destaque = lider > 0 && o?.votos === lider;
      const escolhido = L.fase === 'resultado' && L.ultimo?.n === s.n && Math.floor(t * 6) % 2;
      R(x, escolhido ? '#ffffff' : destaque && Math.floor(t * 4) % 2 ? '#fff3a0' : s.vendido ? '#5a5648' : '#e8c84a', cx - 12, by + 6, 7, 7);
      texto(x, String(s.n), cx - 10, by + 7, '#1a1405');
      const preco = 'R$' + s.preco, caro = !s.vendido && s.preco > (g.hero.grana || 0);
      R(x, s.vendido ? '#3a3830' : '#d8ccb0', cx - 4, by + 6, largura(preco) + 2, 7);
      texto(x, preco, cx - 3, by + 7, caro ? '#b8261e' : '#2a2014');
      if (caro) R(x, '#b8261e', cx - 4, by + 9, largura(preco) + 2, 1);
    });
    balcao(x);
    barganha(x, t, (L.fase === 'resultado' || L.fase === 'abrindo') && Math.floor(t * 7) % 2 === 0);
    const f = tocha(x, t);
    luzAzul(x, f);
    chao(x, t);
    // moedas que sobem quando fecha negócio
    if (L.fase === 'resultado' && L.ultimo !== this.ultimoVisto) {
      this.ultimoVisto = L.ultimo;
      const o = ops.find(v => v.n === L.ultimo.n);
      if (L.ultimo.fez && o?.preco) this.flutua.push({ txt: '-R$' + o.preco, cor: '#ff8a6a', x: 150, y: BALCAO - 10, t: 0 });
      if (L.ultimo.fez && o?.ganho) this.flutua.push({ txt: '+R$' + o.ganho, cor: '#7ee08a', x: 150, y: BALCAO - 10, t: 0 });
    }
    for (const p of this.flutua) { p.t += dt; texto(x, p.txt, p.x + 1, Math.round(p.y - p.t * 14) + 1, '#000'); texto(x, p.txt, p.x, Math.round(p.y - p.t * 14), p.cor); }
    this.flutua = this.flutua.filter(p => p.t < 1.6);
  }

  // A votação embaixo: 3 x 3 (armas, tônicos, vender/trocar/sair), a fala, a grana e a bolsa
  painel(g, L) {
    const h = g.hero, ops = L.ofertas || [];
    const chave = L.fase + '|' + L.rodada + '|' + ops.map(o => o.n + (o.ok ? 'k' : '') + (o.vendido ? 'v' : '')).join(',');
    if (chave !== this.chave) {
      this.chave = chave;
      $('lj-ops').innerHTML = ops.map(o => {
        const cls = ['lj-op', o.tipo, !o.ok ? 'off' : '', o.caro && o.ok ? 'caro' : ''].join(' ');
        const preco = o.tipo === 'comprar' ? (o.vendido ? 'vendido' : `R$ ${o.preco}`) : '';
        return `<div class="${cls}" data-n="${o.n}"><b><span class="n">${o.n}</span><span class="ic">${esc(o.emoji)}</span><span class="nm">${esc(o.tipo === 'comprar' ? o.nome : o.nome.split(' ')[0])}</span></b>`
          + `<span class="ds">${preco ? `<em>${preco}</em> · ` : ''}${esc(o.desc || '')}</span><span class="pe-voto"><span class="pe-barra"><i></i></span><span class="pe-qtd">0</span></span></div>`;
      }).join('');
      this.els = [...$('lj-ops').children];
    }
    // votos
    const V = L.voto, max = V ? Math.max(1, ...V.opcoes.map(o => o.votos)) : 1;
    for (const el of this.els || []) {
      const n = +el.dataset.n, o = V?.opcoes.find(v => v.n === n);
      el.querySelector('.pe-barra i').style.width = ((o?.votos || 0) / max * 100).toFixed(0) + '%';
      el.querySelector('.pe-qtd').textContent = o?.votos || 0;
      const res = L.fase === 'resultado' && L.ultimo;
      el.classList.toggle('venceu', !!res && L.ultimo.n === n);
      el.classList.toggle('perdeu', !!res && L.ultimo.n !== n);
    }
    // fala do Barganha (travessão e itálico, como fala de personagem)
    $('lj-fala').textContent = '— ' + (L.fala || '');
    $('lj-grana').textContent = `💰 R$ ${h.grana ?? 0}`;
    $('lj-rod').textContent = `negócio ${Math.min(L.rodada + (L.fase === 'resultado' ? 0 : 1), 3)} de 3`;
    const bolsa = (h.bolsa || []).map(b => ITENS[b.id]?.emoji).join(' ');
    const kits = (h.mochila || []).length;
    $('lj-bolsa').textContent = `🎒 ${bolsa || 'bolsa vazia'}${kits ? ` · 💼 ${kits} cura${kits > 1 ? 's' : ''}` : ''}`;
    // relógio
    const votando = L.fase === 'votando' && V;
    const resta = votando ? V.restanteNaTela : 0;
    $('lj-seg').textContent = !votando ? '' : V.contandoAtrasados ? '⏳' : Math.ceil(resta) + 's';
    $('lj-barra').style.width = (votando ? resta / V.duracao * 100 : 0).toFixed(1) + '%';
    $('lj-dica').textContent = votando ? 'digite o número no chat' : L.fase === 'abrindo' ? 'a banca está abrindo...' : L.fase === 'fechando' ? 'o janelão vai fechar...' : '';
    // o resultado da rodada
    const r = L.fase === 'resultado' ? L.ultimo : null;
    $('lj-res').hidden = !r;
    if (r && this.resVisto !== r) {
      this.resVisto = r;
      $('lj-res').innerHTML = `<div class="t1">${r.fez ? '🤝 NEGÓCIO FECHADO' : r.tipo === 'sair' ? '🚶 ATÉ A PRÓXIMA' : '✋ SEM NEGÓCIO'}</div><div class="t2">${esc(r.texto)}</div>${r.auto ? '<div class="t3">ninguém votou: o herói decidiu sozinho</div>' : r.empate ? '<div class="t3">deu empate: sorteado</div>' : ''}`;
    }
  }
}
