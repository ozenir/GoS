// Desenha o mundo na tela em visão isométrica. A câmera gira junto com o herói: ele sempre anda
// "pra cima e pra direita" (↗), então esquerda é sempre ↖ e direita é sempre ↘ — igual à votação.
import { mod, hash2, DIRS, clamp, dist } from '../core/util.js';
import { P, T as TT } from '../core/city.js';
import { ZUMBIS, CLASSES } from '../core/dados.js';
import { STATUS } from '../core/status.js';
import { fillPoly, line, disc, canvas as novoCanvas } from './pixel.js';
import * as S from './sprites.js';

export const W = 216, H = 384;
const AX = 114, AY = 214;           // onde fica o ponto da câmera na tela
const ROT = [(x, y) => [x, y], (x, y) => [y, -x], (x, y) => [-x, -y], (x, y) => [-y, x]];
const ROTI = [(u, v) => [u, v], (u, v) => [-v, u], (u, v) => [-u, -v], (u, v) => [v, -u]];

const CORES_SANGUE = ['#4f7a2e', '#3c5e22', '#6b8f3a', '#5a2a22'];

export class Render {
  constructor(cv, texto) {
    this.cv = cv; this.ctx = cv.getContext('2d'); this.ctx.imageSmoothingEnabled = false;
    this.tc = texto; this.tx = texto.getContext('2d');
    this.r = 0; this.cam = { x: 0, y: 0 }; this.camAlvo = null;
    this.fade = 0; this.shake = 0; this.flash = null; this.t = 0;
    this.parts = []; this.decals = []; this.tracers = []; this.explosoes = []; this.textos = []; this.raios = [];
    [this.escuro, this.ex] = novoCanvas(W, H);
    this.brancos = new WeakMap();
    this.vistos = new Set();
    this.heli = null;
  }

  /* ---------- transformações ---------- */
  view(x, y) { return ROT[this.r](x, y); }
  tela(x, y, z = 0) {
    const [u, v] = ROT[this.r](x, y), [cu, cv] = ROT[this.r](this.cam.x, this.cam.y);
    const du = u - cu, dv = v - cv;
    return [Math.round((du - dv) * 12 + AX + this.sx), Math.round((du + dv) * 6 + AY + this.sy - z)];
  }
  mundo(sx, sy) {
    const [cu, cv] = ROT[this.r](this.cam.x, this.cam.y);
    const a = (sx - AX) / 12, b = (sy - AY) / 6;
    return ROTI[this.r](cu + (a + b) / 2, cv + (b - a) / 2);
  }
  // vetor do mundo -> direção na tela
  dirTela(fx, fy) { const [u, v] = ROT[this.r](fx, fy); return [u - v, (u + v) / 2]; }

  /* ---------- efeitos (chamados pelos eventos do jogo) ---------- */
  particula(o) { if (this.parts.length < 700) this.parts.push({ z: 0, vx: 0, vy: 0, vz: 0, age: 0, life: 0.6, g: 9, tam: 1, ...o }); }
  sangue(x, y, n = 6, cores = CORES_SANGUE) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, s = 0.5 + Math.random() * 1.6;
      this.particula({ x, y, z: 0.5 + Math.random() * 0.4, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 1 + Math.random() * 2.5, life: 0.4 + Math.random() * 0.4, cor: cores[i % cores.length], tam: Math.random() < 0.3 ? 2 : 1 });
    }
  }
  decal(o) { this.decals.push({ age: 0, life: 14, ...o }); if (this.decals.length > 90) this.decals.shift(); }
  // textos que nascem juntos no mesmo lugar sobem empilhados, sem ficar um em cima do outro
  texto(x, y, txt, cor = '#fff', tam = 1) {
    let pilha = 0;
    for (const t of this.textos) if (t.age < 0.5 && Math.abs(t.x - x) < 1.5 && Math.abs(t.y - y) < 1.5) pilha++;
    this.textos.push({ x, y, txt, cor, tam, age: 0, life: 1.3, dz: pilha * 9 });
    if (this.textos.length > 30) this.textos.shift();
  }
  tremer(v) { this.shake = Math.max(this.shake, v); }
  piscar(cor, a = 0.5) { this.flash = { cor, a }; }

  evento(e, g) {
    switch (e.type) {
      case 'tiro': {
        this.tracers.push({ x0: e.x, y0: e.y, x1: e.tx, y1: e.ty, age: 0, life: e.arma === 'metralhadora' ? 0.05 : 0.07, heroi: e.heroi });
        if (e.heroi) this.raios.push({ x: e.x, y: e.y, age: 0, life: 0.06, r: 26 });
        if (e.acertou) this.sangue(e.tx, e.ty, 3);
        break;
      }
      case 'chama': {
        for (let i = 0; i < 5; i++) {
          const a = e.ang + (Math.random() - 0.5) * 0.9, s = 2.5 + Math.random() * 3;
          this.particula({ x: e.x + Math.cos(e.ang) * 0.4, y: e.y + Math.sin(e.ang) * 0.4, z: 0.8, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 0.4, g: -1, life: 0.35 + Math.random() * 0.25, cor: ['#ffd23f', '#ff8a2a', '#e8442a', '#fff3a0'][i % 4], tam: 2, fogo: true });
        }
        this.raios.push({ x: e.x, y: e.y, age: 0, life: 0.08, r: 40 });
        break;
      }
      case 'acerto': {
        this.sangue(e.x, e.y, 3);
        // textos de super efetivo / resistiu / crítico (com limite pra não poluir a tela)
        if (e.efetividade === 'super' && this.t - (this.ultSuper || -9) > 0.7) { this.ultSuper = this.t; this.texto(e.x, e.y, 'SUPER EFETIVO!', '#ffb02a', 0.95); }
        else if (e.efetividade === 'fraco' && this.t - (this.ultFraco || -9) > 1.2) { this.ultFraco = this.t; this.texto(e.x, e.y, 'resistiu', '#a0a8b8', 0.8); }
        else if (e.critico && this.t - (this.ultCrit || -9) > 0.5) { this.ultCrit = this.t; this.texto(e.x, e.y, 'CRÍTICO', '#ffe27a', 0.85); }
        break;
      }
      case 'esquiva': this.texto(e.x, e.y, '💨 desviou!', '#9fe8ff', 0.95); break;
      case 'status': { const S = STATUS[e.id]; this.texto(e.x, e.y, `${S.emoji} ${S.nome.toLowerCase()}`, S.lado === 'positivo' ? '#9dffb0' : '#ff9a90', 0.9); break; }
      case 'morte_zumbi': {
        this.sangue(e.x, e.y, e.chefe ? 30 : 10);
        this.decal({ tipo: 'sangue', x: e.x, y: e.y, s: Math.random(), r: e.chefe ? 1.4 : 0.6 });
        this.decal({ tipo: 'corpo', x: e.x, y: e.y, ztipo: e.tipo, roupa: e.roupa, flip: Math.random() < 0.5, life: e.chefe ? 25 : 10 });
        if (e.chefe) { this.tremer(8); this.piscar('#ffffff', 0.5); this.texto(e.x, e.y, '💀 DERROTADO!', '#ffd23f', 1.6); }
        break;
      }
      case 'explosao': {
        this.explosoes.push({ x: e.x, y: e.y, r: e.raio, age: 0, life: 0.55 });
        this.decal({ tipo: 'queimado', x: e.x, y: e.y, r: e.raio * 0.8, s: Math.random(), life: 20 });
        for (let i = 0; i < 14; i++) {
          const a = Math.random() * 6.28, s = 1 + Math.random() * 3;
          this.particula({ x: e.x, y: e.y, z: 0.3, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 2 + Math.random() * 3, life: 0.5 + Math.random() * 0.6, cor: ['#ffd23f', '#ff8a2a', '#3a3a3a', '#5a5a5a'][i % 4], tam: 2 });
        }
        for (let i = 0; i < 8; i++) this.particula({ x: e.x + (Math.random() - 0.5), y: e.y + (Math.random() - 0.5), z: 0.5, vz: 0.8 + Math.random(), g: -0.5, life: 1.2 + Math.random(), cor: 'rgba(60,60,60,0.6)', tam: 4, fumaca: true });
        this.raios.push({ x: e.x, y: e.y, age: 0, life: 0.5, r: 90 });
        this.tremer(e.aereo ? 3 : 6);
        break;
      }
      case 'dano_heroi': this.sangue(e.x, e.y, 4, ['#a8282a', '#7a1a1c']); this.tremer(2); this.piscar('#ff2a2a', 0.18); break;
      case 'colete': this.texto(e.x, e.y, '🛡️ bloqueou', '#9fd0ff'); break;
      case 'cura': this.texto(e.x, e.y, `+${Math.round(e.valor)}% ❤️`, '#7dff9a', 1.2); for (let i = 0; i < 10; i++) this.particula({ x: e.x + (Math.random() - 0.5), y: e.y + (Math.random() - 0.5), z: 0.3, vz: 1.5 + Math.random(), g: -0.5, life: 0.9, cor: i % 2 ? '#7dff9a' : '#ffffff', tam: 2 }); break;
      case 'bau': {
        const lend = e.raridade === 'lendario';
        for (let i = 0; i < (lend ? 40 : 18); i++) {
          const a = Math.random() * 6.28, s = 1 + Math.random() * 2.5;
          this.particula({ x: e.x, y: e.y, z: 0.4, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 3 + Math.random() * 3, life: 1, cor: lend ? ['#ffd23f', '#fff3a0', '#ff8a2a', '#ffffff'][i % 4] : ['#9fd0ff', '#ffffff', '#5a7ab8'][i % 3], tam: 2 });
        }
        if (lend) { this.piscar('#ffd23f', 0.45); this.raios.push({ x: e.x, y: e.y, age: 0, life: 1.2, r: 120 }); }
        break;
      }
      case 'item_pousou': for (let i = 0; i < 6; i++) this.particula({ x: e.x, y: e.y, z: 0.1, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: 1, life: 0.4, cor: '#8a8070', tam: 1 }); break;
      case 'chefe': this.tremer(e.tipo === 'rei' ? 14 : 9); this.piscar('#ff2a2a', 0.35); break;
      case 'helicoptero': this.heli = { t: 0 }; break;
      case 'virou': this.fade = 1; break;
      case 'entrou_predio': case 'saiu_predio': this.fade = 1.4; this.decals = []; this.parts = []; break;
      case 'novo_heroi': this.fade = 1.6; this.decals = []; this.parts = []; this.camAlvo = null; break;
      case 'vidro_pisou': for (let i = 0; i < 8; i++) this.particula({ x: e.x, y: e.y, z: 0.2, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: 2, life: 0.5, cor: '#d8f4ff', tam: 1 }); break;
      case 'golpe': {
        this.raios.push({ x: e.x, y: e.y, age: 0, life: 0.05, r: 14 });
        this.golpeT = 0.15;
        // rastro do golpe (arco branco na frente do herói)
        if (e.acertos) for (let i = -2; i <= 2; i++) {
          const a = e.ang + i * 0.35;
          this.particula({ x: e.x + Math.cos(a) * 0.8, y: e.y + Math.sin(a) * 0.8, z: 0.8, life: 0.12, g: 0, cor: e.arma === 'machado' ? '#ffe0c0' : '#ffffff', tam: 2 });
        }
        break;
      }
      case 'pavio': this.texto(e.x, e.y, '💣', '#fff'); break;
    }
  }

  /* ---------- desenho ---------- */
  draw(g, dt) {
    this.t += dt;
    const ctx = this.ctx, h = g.hero;
    // rotação e câmera
    let rAlvo = g.room ? 0 : g.rota.dir;
    if (rAlvo !== this.r) { this.r = rAlvo; }
    let alvo;
    if (g.room) alvo = { x: g.room.w / 2 + (h.x - g.room.w / 2) * 0.25, y: g.room.h / 2 + 0.6 + (h.y - g.room.h / 2) * 0.25 };
    else { const [dx, dy] = DIRS[g.rota.dir]; alvo = { x: h.x + dx * 2.5, y: h.y + dy * 2.5 }; }
    if (!this.camAlvo || this.fade > 0.9) { this.cam.x = alvo.x; this.cam.y = alvo.y; }
    const k = 1 - Math.pow(0.02, dt);
    this.cam.x += (alvo.x - this.cam.x) * k; this.cam.y += (alvo.y - this.cam.y) * k;
    this.camAlvo = alvo;
    this.shake = Math.max(0, this.shake - dt * 18);
    this.golpeT = Math.max(0, (this.golpeT || 0) - dt);
    this.sx = this.shake ? Math.round((Math.random() - 0.5) * this.shake) : 0;
    this.sy = this.shake ? Math.round((Math.random() - 0.5) * this.shake) : 0;

    ctx.fillStyle = g.room ? '#0c0a10' : '#1a1820';
    ctx.fillRect(0, 0, W, H);
    this.atualizarEfeitos(dt, g);
    if (g.room) this.chaoSala(g); else this.chaoCidade(g);
    this.desenharDecals(g);
    this.desenharArmadilhas(g);
    this.setasVotacao(g);
    this.objetos(g);
    this.fantasmaHeroi(g);
    this.desenharParticulas();
    this.desenharTracers();
    this.luz(g);
    this.desenharHeli(g, dt);
    // transição (virar a esquina, entrar e sair de prédio)
    if (this.fade > 0) { ctx.fillStyle = `rgba(8,6,12,${clamp(this.fade, 0, 1) * 0.85})`; ctx.fillRect(0, 0, W, H); this.fade = Math.max(0, this.fade - dt * 3.2); }
    if (this.flash) { ctx.fillStyle = this.flash.cor; ctx.globalAlpha = this.flash.a; ctx.fillRect(0, 0, W, H); ctx.globalAlpha = 1; this.flash.a -= dt * 2.2; if (this.flash.a <= 0) this.flash = null; }
    this.desenharTextos(g);
  }

  limites(margemBaixo = 0) {
    const cs = [[-30, -30], [W + 30, -30], [-30, H + 30 + margemBaixo], [W + 30, H + 30 + margemBaixo]].map(([a, b]) => this.mundo(a, b));
    return {
      x0: Math.floor(Math.min(...cs.map(c => c[0]))), x1: Math.ceil(Math.max(...cs.map(c => c[0]))),
      y0: Math.floor(Math.min(...cs.map(c => c[1]))), y1: Math.ceil(Math.max(...cs.map(c => c[1])))
    };
  }

  // canto de cima do losango de uma casa do mundo
  topoCasa(tx, ty) {
    const [u, v] = ROT[this.r](tx + 0.5, ty + 0.5);
    const [cu, cv] = ROT[this.r](this.cam.x, this.cam.y);
    const du = u - 0.5 - cu, dv = v - 0.5 - cv;
    return [Math.round((du - dv) * 12 + AX + this.sx), Math.round((du + dv) * 6 + AY + this.sy)];
  }

  chaoCidade(g) {
    const ctx = this.ctx, city = g.city, L = this.limites();
    const eixoX = this.r % 2 === 0 ? 'u' : 'v', eixoY = this.r % 2 === 0 ? 'v' : 'u';
    for (let ty = L.y0; ty <= L.y1; ty++) for (let tx = L.x0; tx <= L.x1; tx++) {
      const [sx, sy] = this.topoCasa(tx, ty);
      if (sx < -14 || sx > W + 14 || sy < -14 || sy > H + 2) continue;
      const t = city.tile(tx, ty);
      if (t === TT.BLOCK) continue;
      let nome, vr = Math.floor(hash2(tx, ty, city.seed) * 4);
      if (t === TT.ROAD) {
        const lx = mod(tx, P), ly = mod(ty, P), inX = lx < 5, inY = ly < 5;
        if (inX && inY) nome = 'asfalto';
        else {
          const along = inY ? lx : ly, across = inY ? ly : lx, ax = inY ? eixoX : eixoY;
          if (along === 5 || along === P - 1) nome = 'zebra_' + ax;
          else if (across === 2 && along % 2 === 0) nome = 'faixa_' + ax;
          else nome = 'asfalto';
        }
      } else if (t === TT.SIDEWALK) nome = 'calcada';
      else if (t === TT.GRAMA) nome = 'grama';
      else if (t === TT.PRACA) nome = 'praca';
      else nome = 'beco';
      ctx.drawImage(S.tile(nome, vr), sx - 12, sy);
    }
  }

  chaoSala(g) {
    const ctx = this.ctx, room = g.room, estilo = room.info.chao;
    for (let ty = 0; ty < room.h; ty++) for (let tx = 0; tx < room.w; tx++) {
      const [sx, sy] = this.topoCasa(tx, ty);
      ctx.drawImage(S.tile('piso_' + estilo, (tx + ty) % 2), sx - 12, sy);
    }
    const p = S.spriteParedeSala(room.w, room.h, estilo, room.saida.x);
    const [sx, sy] = this.topoCasa(0, 0);
    ctx.drawImage(p.c, sx - p.ox, sy - p.oy);
  }

  desenharDecals(g) {
    const ctx = this.ctx;
    for (const d of this.decals) {
      const [sx, sy] = this.tela(d.x, d.y);
      if (sx < -40 || sx > W + 40 || sy < -40 || sy > H + 40) continue;
      const a = clamp((d.life - d.age) / 3, 0, 1);
      ctx.globalAlpha = a;
      if (d.tipo === 'sangue') { disc(ctx, sx, sy, 5 + d.r * 6, '#3a5a22', 0.5); disc(ctx, sx + 3, sy + 1, 3 + d.r * 3, '#2e4a1a', 0.5); }
      else if (d.tipo === 'queimado') { disc(ctx, sx, sy, 8 + d.r * 10, 'rgba(15,12,10,0.6)', 0.5); }
      else if (d.tipo === 'corpo') {
        const spr = S.spriteZumbi(d.ztipo === 'exheroi' ? 'chefao' : d.ztipo, d.roupa || 0);
        const k = 'deitado';
        spr[k] = spr[k] || S.deitado(spr.frente[0]);
        const esc = d.ztipo === 'rei' ? 3 : d.ztipo === 'chefao' || d.ztipo === 'exheroi' ? 2 : 1;
        ctx.drawImage(spr[k], sx - 14 * esc, sy - 9 * esc, 28 * esc, 18 * esc);
      }
      ctx.globalAlpha = 1;
    }
    // manchas fixas da cidade
    if (!g.room) {
      const L = this.limites();
      for (const o of g.city.objectsIn(L.x0, L.y0, L.x1, L.y1)) {
        if (o.kind !== 'prop' || o.p.tipo !== 'mancha') continue;
        const [sx, sy] = this.tela(o.p.x, o.p.y);
        disc(ctx, sx, sy, 5 + o.p.s * 6, 'rgba(40,30,25,0.45)', 0.5);
      }
    }
  }

  desenharArmadilhas(g) {
    const ctx = this.ctx;
    for (const a of g.armadilhas) {
      if (a.tipo !== 'vidro') continue;
      for (let i = 0; i < 70; i++) {
        const x = a.x0 + hash2(i, a.semente, 1) * (a.x1 - a.x0), y = a.y0 + hash2(i, a.semente, 2) * (a.y1 - a.y0);
        const [sx, sy] = this.tela(x, y);
        const brilho = Math.sin(this.t * 6 + i) > 0.6;
        ctx.fillStyle = brilho ? '#ffffff' : i % 3 ? '#9fd8e8' : '#5a8a9a';
        ctx.fillRect(sx, sy, brilho ? 2 : 1, 1);
      }
    }
  }

  // Setas no chão do próximo cruzamento, com os números da votação
  setasVotacao(g) {
    if (g.room || g.fase !== 'jogo') return;
    const v = g.voto;
    if (!v) return;
    const ctx = this.ctx;
    const n = g.city.nodePos(g.rota.alvo.i, g.rota.alvo.j);
    const max = Math.max(...v.opcoes.map(o => o.votos));
    const pulso = 0.5 + 0.5 * Math.sin(this.t * 6);
    this.marcadores = [];
    // rua bloqueada: X vermelho no chão
    for (const o of v.bloqueadas || []) {
      const [dx, dy] = DIRS[o.dir], px = -dy, py = dx;
      const c = { x: n.x + dx * 2.6, y: n.y + dy * 2.6 };
      const pt = (a, l) => this.tela(c.x + dx * a + px * l, c.y + dy * a + py * l);
      for (const [a0, l0, a1, l1] of [[-0.6, -0.6, 0.6, 0.6], [-0.6, 0.6, 0.6, -0.6]]) {
        const [x0, y0] = pt(a0, l0), [x1, y1] = pt(a1, l1);
        line(ctx, x0, y0, x1, y1, '#ff4a3a', 2);
      }
    }
    for (const o of v.opcoes) {
      const escolhida = v.resultado ? v.resultado.id === o.id : false;
      if (v.resultado && !escolhida) continue;
      const lider = !v.resultado && max > 0 && o.votos === max;
      const cor = escolhida ? '#7dff9a' : lider ? '#ffd23f' : 'rgba(255,255,255,0.75)';
      if (o.id === 'entrar') {
        const d = o.shop.door;
        const [sx, sy] = this.tela(d.x, d.y);
        ctx.globalAlpha = 0.6 + 0.4 * pulso;
        disc(ctx, sx, sy, 9, cor, 0.5);
        ctx.globalAlpha = 1;
        disc(ctx, sx, sy, 6, '#1a1420', 0.5);
        this.marcadores.push({ x: d.x, y: d.y, txt: '4', cor, z: 14 });
        continue;
      }
      const [dx, dy] = DIRS[o.dir], px = -dy, py = dx;
      const a0 = 1.3, a1 = 3.0, a2 = 4.0, w = 0.32, wh = 0.75;
      const pt = (a, l) => this.tela(n.x + dx * a + px * l, n.y + dy * a + py * l);
      fillPoly(ctx, [pt(a0, -w), pt(a1, -w), pt(a1, w), pt(a0, w)], cor);
      fillPoly(ctx, [pt(a1, -wh), pt(a2, 0), pt(a1, wh)], cor);
      const m = { x: n.x + dx * 2.2, y: n.y + dy * 2.2 };
      this.marcadores.push({ ...m, txt: String(o.n), cor, z: 10 });
    }
  }

  objetos(g) {
    const ctx = this.ctx, h = g.hero;
    const lista = [];
    const L = this.limites(120);
    const [hu, hv] = this.view(h.x, h.y);
    const heroiKey = hu + hv;
    const [hsx, hsy] = this.tela(h.x, h.y);
    // prédios e coisas da rua (ou móveis da sala)
    const objs = g.room ? g.room.objectsIn() : g.city.objectsIn(L.x0, L.y0, L.x1, L.y1);
    for (const o of objs) {
      if (o.kind === 'building') {
        const b = o.b;
        const cs = [[b.x0, b.y0], [b.x1, b.y0], [b.x0, b.y1], [b.x1, b.y1]].map(([x, y]) => this.view(x, y));
        const u0 = Math.min(...cs.map(c => c[0])), v0 = Math.min(...cs.map(c => c[1]));
        const u1 = Math.max(...cs.map(c => c[0])), v1 = Math.max(...cs.map(c => c[1]));
        let porta = null;
        if (b.shop) {
          const [nu, nv] = this.view(0, b.shop.door.face === 'n' ? -1 : 1);
          const [du, dv] = this.view(b.shop.door.x, b.shop.door.y);
          if (nv === 1) porta = { face: 'v', a: Math.round((du - u0) * 4) / 4 };
          else if (nu === 1) porta = { face: 'u', a: Math.round((dv - v0) * 4) / 4 };
        }
        lista.push({ key: u0 + v1, tipo: 'predio', b, u0, v0, u1, v1, porta });
      } else {
        const p = o.p;
        if (p.tipo === 'mancha') continue;
        if (p.tipo === 'fonte') {
          const cs = [[p.x, p.y], [p.x + 3, p.y], [p.x, p.y + 3], [p.x + 3, p.y + 3]].map(([x, y]) => this.view(x, y));
          const u0 = Math.min(...cs.map(c => c[0])), v0 = Math.min(...cs.map(c => c[1]));
          lista.push({ key: u0 + v0 + 3, tipo: 'fonte', u0, v0 });
        } else if (p.tipo === 'carro' || g.room) {
          const w = p.w || 1, hh = p.h || 1;
          const cs = [[p.x, p.y], [p.x + w, p.y], [p.x, p.y + hh], [p.x + w, p.y + hh]].map(([x, y]) => this.view(x, y));
          const u0 = Math.min(...cs.map(c => c[0])), v0 = Math.min(...cs.map(c => c[1]));
          const u1 = Math.max(...cs.map(c => c[0])), v1 = Math.max(...cs.map(c => c[1]));
          lista.push({ key: (u0 + u1 + v0 + v1) / 2, tipo: g.room ? 'movel' : 'carro', p, u0, v0, u1, v1 });
        } else if (p.tipo === 'barricada') {
          // barricada do Trem (várias casas) ou de rua bloqueada (uma casa)
          const casas = p.tiles || [{ x: p.x, y: p.y }];
          for (const t of casas) { const [u, v] = this.view(t.x + 0.5, t.y + 0.5); lista.push({ key: u + v, tipo: 'prop', p: { tipo: 'barricada', x: t.x, y: t.y } }); }
        } else {
          const [u, v] = this.view(p.x + 0.5, p.y + 0.5);
          lista.push({ key: u + v, tipo: 'prop', p });
        }
      }
    }
    for (const it of g.itens) { const [u, v] = this.view(it.x, it.y); lista.push({ key: u + v, tipo: 'item', it }); }
    for (const z of g.zumbis) { if (z.morto) continue; const [u, v] = this.view(z.x, z.y); lista.push({ key: u + v, tipo: 'zumbi', z }); }
    for (const a of g.aliados) { const [u, v] = this.view(a.x, a.y); lista.push({ key: u + v, tipo: 'aliado', a }); }
    if (g.fase === 'jogo' || this.t % 1 < 0.5) lista.push({ key: heroiKey, tipo: 'heroi' });
    lista.sort((a, b) => a.key - b.key);
    this.nomes = [];
    for (const o of lista) {
      if (o.tipo === 'predio') {
        const s = S.spritePredio(o.b, o.u1 - o.u0, o.v1 - o.v0, o.porta, this.r);
        const [sx, sy] = this.topoVista(o.u0, o.v0);
        const x0 = sx - s.ox, y0 = sy - s.oy;
        // fica transparente se estiver na frente do herói
        const tampa = o.key > heroiKey && hsx > x0 + 4 && hsx < x0 + s.c.width - 4 && hsy - 12 > y0 && hsy - 20 < y0 + s.c.height;
        if (tampa) ctx.globalAlpha = 0.35;
        ctx.drawImage(s.c, x0, y0);
        ctx.globalAlpha = 1;
        if (s.placa && o.b.shop) this.nomes.push({ placa: true, x: x0 + s.placa[0], y: y0 + s.placa[1] - 16, shop: o.b.shop, tampa });
      } else if (o.tipo === 'fonte') {
        const s = S.spriteFonte();
        const [sx, sy] = this.topoVista(o.u0, o.v0);
        ctx.drawImage(s.c, sx - s.ox, sy - s.oy);
      } else if (o.tipo === 'carro' || o.tipo === 'movel') {
        const p = o.p;
        const s = o.tipo === 'carro' ? S.spriteCarro(p.cor, o.u1 - o.u0 > o.v1 - o.v0 ? 'u' : 'v', p.virado) : S.spriteMovel(p.tipo, Math.round(o.u1 - o.u0), Math.round(o.v1 - o.v0), p.v || 0);
        const [sx, sy] = this.topoVista(o.u0, o.v0);
        ctx.drawImage(s.c, sx - s.ox, sy - s.oy);
        if (p.alarme && Math.floor(this.t * 4) % 2) {
          const [cx, cy] = this.tela(p.x + (p.w || 1) / 2, p.y + (p.h || 1) / 2, 10);
          ctx.fillStyle = '#ffb02a'; ctx.fillRect(cx - 10, cy, 3, 2); ctx.fillRect(cx + 8, cy, 3, 2);
        }
      } else if (o.tipo === 'prop') {
        const s = S.spriteProp(o.p.tipo);
        if (!s.c) continue;
        const [sx, sy] = this.tela(o.p.x + 0.5, o.p.y + 0.5);
        ctx.drawImage(s.c, sx - s.ox, sy - s.oy);
      } else if (o.tipo === 'item') this.desenharItem(o.it);
      else if (o.tipo === 'zumbi') this.desenharZumbi(o.z, g);
      else if (o.tipo === 'aliado') this.desenharAliado(o.a);
      else if (o.tipo === 'heroi') this.desenharHeroi(g);
    }
  }

  topoVista(u, v) {
    const [cu, cv] = ROT[this.r](this.cam.x, this.cam.y);
    const du = u - cu, dv = v - cv;
    return [Math.round((du - dv) * 12 + AX + this.sx), Math.round((du + dv) * 6 + AY + this.sy)];
  }

  quadro(set, fx, fy, animT, andando) {
    const [dx, dy] = this.dirTela(fx, fy);
    const frente = dy >= 0;
    const esq = dx < 0;
    const f = andando ? Math.floor(animT * 2.6) % 4 : 0;
    const arr = frente ? (esq ? set.frenteE : set.frente) : (esq ? set.costasE : set.costas);
    return arr[f];
  }

  branco(c) {
    let b = this.brancos.get(c);
    if (!b) {
      const [o, x] = novoCanvas(c.width, c.height);
      x.drawImage(c, 0, 0); x.globalCompositeOperation = 'source-in'; x.fillStyle = '#ffffff'; x.fillRect(0, 0, c.width, c.height);
      this.brancos.set(c, b = o);
    }
    return b;
  }

  pessoa(spr, x, y, esc = 1, alpha = 1, clipChao = 1) {
    const ctx = this.ctx;
    const [sx, sy] = this.tela(x, y);
    const sh = S.sombra(Math.round(10 * esc));
    ctx.drawImage(sh, sx - Math.floor(sh.width / 2), sy - Math.floor(sh.height / 2));
    const w = S.SPR_W * esc, hh = S.SPR_H * esc;
    ctx.globalAlpha = alpha;
    if (clipChao < 1) {
      ctx.save();
      ctx.beginPath(); ctx.rect(sx - w, sy - hh - 10, w * 2, hh + 10 - 0); ctx.clip();
      ctx.drawImage(spr, sx - S.PE_X * esc, sy - S.PE_Y * esc + Math.round((1 - clipChao) * hh * 0.9), w, hh);
      ctx.restore();
    } else ctx.drawImage(spr, sx - S.PE_X * esc, sy - S.PE_Y * esc, w, hh);
    ctx.globalAlpha = 1;
    return [sx, sy];
  }

  desenharZumbi(z, g) {
    const T = ZUMBIS[z.tipo];
    const set = z.tipo === 'exheroi' ? S.spriteHeroi(CLASSES[z.extra?.classe]?.roupa || 'sobrevivente', true) : S.spriteZumbi(z.tipo, z.roupa);
    const esc = z.tipo === 'rei' ? 3 : z.tipo === 'chefao' || z.tipo === 'exheroi' ? 2 : 1;
    const spr = this.quadro(set, z.fx, z.fy, z.animT * (z.tipo === 'corredor' ? 1.4 : 1), !z.dormindo);
    const nasc = z.nascendo > 0 ? 1 - z.nascendo / 0.8 : 1;
    if (z.nascendo > 0 && !this.vistos.has(z.id)) {
      this.vistos.add(z.id); if (this.vistos.size > 2000) this.vistos.clear();
      for (let i = 0; i < 6 * esc; i++) this.particula({ x: z.x + (Math.random() - 0.5) * 0.6 * esc, y: z.y + (Math.random() - 0.5) * 0.6 * esc, z: 0.1, vz: 1 + Math.random() * 2, life: 0.5, cor: i % 2 ? '#5a4a3a' : '#3a3028', tam: 2 });
    }
    const [sx, sy] = this.pessoa(spr, z.x, z.y, esc, 1, Math.max(0.05, nasc));
    if (z.flash > 0.04) { this.ctx.globalAlpha = 0.6; this.ctx.drawImage(this.branco(spr), sx - S.PE_X * esc, sy - S.PE_Y * esc, S.SPR_W * esc, S.SPR_H * esc); this.ctx.globalAlpha = 1; }
    if (z.tipo === 'explosivo') {
      const rapido = z.pavio >= 0;
      if (Math.floor(this.t * (rapido ? 12 : 3)) % 2) { this.ctx.fillStyle = '#ff3a2a'; this.ctx.fillRect(sx - 1, sy - 18, 3, 2); }
    }
    if (z.estados.tem('queimando') && Math.random() < 0.5) this.particula({ x: z.x + (Math.random() - 0.5) * 0.4, y: z.y + (Math.random() - 0.5) * 0.4, z: 0.6, vz: 1.5, g: -1, life: 0.4, cor: Math.random() < 0.5 ? '#ff8a2a' : '#ffd23f', tam: 2, fogo: true });
    if (T.chefe && nasc >= 1) {
      const bw = 14 * esc, frac = clamp(z.vida / z.vidaMax, 0, 1);
      const by = sy - S.PE_Y * esc - 4;
      this.ctx.fillStyle = '#1a1420'; this.ctx.fillRect(sx - bw / 2 - 1, by - 1, bw + 2, 4);
      this.ctx.fillStyle = z.tipo === 'exheroi' ? '#9fd0ff' : '#e8442a'; this.ctx.fillRect(sx - bw / 2, by, Math.round(bw * frac), 2);
    }
    // ícones dos status do zumbi (sangrando, atordoado, queimando...)
    if (z.estados.lista.size && nasc >= 1) {
      let ic = '';
      for (const s of z.estados.lista.values()) { ic += STATUS[s.id].emoji; if (ic.length > 6) break; }
      this.nomes.push({ x: sx, y: sy - S.PE_Y * esc - (z.nome ? (T.chefe ? 16 : 9) : (T.chefe ? 8 : 1)), txt: ic, cor: '#fff', tam: 4.5 });
    }
    if (z.nome && nasc >= 1) this.nomes.push({ x: sx, y: sy - S.PE_Y * esc - (T.chefe ? 8 : 2), txt: z.nome, chefe: T.chefe, cor: z.tipo === 'exheroi' ? '#9fd0ff' : T.chefe ? '#ff6a4a' : '#ffd8a8' });
  }

  desenharHeroi(g) {
    const h = g.hero, ctx = this.ctx;
    const set = S.spriteHeroi(CLASSES[h.classe].roupa);
    const spr = this.quadro(set, h.fx, h.fy, h.animT, h.andando);
    // anel no chão pra achar o herói fácil
    const [ax, ay] = this.tela(h.x, h.y);
    const pul = Math.sin(this.t * 4) * 0.5 + 0.5;
    ctx.globalAlpha = 0.55 + 0.3 * pul;
    disc(ctx, ax, ay, 8 + pul, '#ffd23f', 0.45);
    disc(ctx, ax, ay, 6, 'rgba(26,20,32,0.9)', 0.45);
    ctx.globalAlpha = 1;
    const [sx, sy] = this.pessoa(spr, h.x, h.y, 1, g.fase === 'jogo' ? 1 : 0.6);
    this.heroiSpr = [sx, sy, spr];
    if (h.invT > 0 && Math.floor(this.t * 10) % 2) { ctx.globalAlpha = 0.55; ctx.drawImage(this.branco(spr), sx - S.PE_X, sy - S.PE_Y); ctx.globalAlpha = 1; }
    // arma
    const [dx, dy] = this.dirTela(h.fx, h.fy);
    const m = Math.hypot(dx, dy) || 1, ux = dx / m, uy = dy / m;
    const hx = sx + Math.round(ux * 3), hy = sy - 11;
    if (h.arma) {
      const armas = { pistola: [5, '#2a2a30'], escopeta: [8, '#5a3a22'], metralhadora: [9, '#1a1a1e'], lanca: [8, '#b83a2a'] };
      const [len, cor] = armas[h.arma] || armas.pistola;
      line(ctx, hx, hy, hx + ux * len, hy + uy * len, cor, h.arma === 'pistola' ? 1 : 2);
      if (h.corpo !== 'empurrao') line(ctx, sx - 4, sy - 16, sx - 2, sy - 6, h.corpo === 'chave' ? '#8a8a92' : '#8a5a32', 1);
    } else {
      // arma de perto na mão; balança logo depois de um golpe
      const giro = this.golpeT > 0 ? (1 - this.golpeT / 0.15) * 1.6 - 0.8 : 0;
      const a0 = Math.atan2(uy, ux) + giro, cx = Math.cos(a0), cy = Math.sin(a0);
      if (h.corpo === 'faca') line(ctx, hx, hy, hx + cx * 4, hy + cy * 4, '#d8dde6', 1);
      else if (h.corpo === 'machado') { line(ctx, hx, hy, hx + cx * 7, hy + cy * 7, '#7a4a28', 1); ctx.fillStyle = '#b8bec8'; ctx.fillRect(Math.round(hx + cx * 6) - 1, Math.round(hy + cy * 6) - 2, 3, 4); }
      else if (h.corpo === 'chave') line(ctx, hx, hy, hx + cx * 6, hy + cy * 6, '#8a8a92', 2);
      else if (h.corpo === 'taco') line(ctx, hx, hy, hx + cx * 7, hy + cy * 7, '#8a5a32', 2);
    }
    if (h.colete > 0) { ctx.fillStyle = '#5a9ad8'; for (let i = 0; i < Math.min(h.colete, 6); i++) ctx.fillRect(sx - 6 + i * 2, sy - 29, 1, 2); }
    if (h.estados.tem('lento') && Math.random() < 0.3) this.particula({ x: h.x, y: h.y, z: 0.1, vz: 0.5, life: 0.3, cor: '#d8f4ff', tam: 1 });
    this.heroiTela = [sx, sy];
    if (h.viewer && g.fase === 'jogo') this.nomes.push({ x: sx, y: sy - 30, txt: h.viewer.nick, cor: '#ffd23f' });
  }

  // O herói aparece por cima de prédios e zumbis, meio transparente, pra nunca sumir da tela
  fantasmaHeroi(g) {
    if (g.fase !== 'jogo' || !this.heroiSpr) return;
    const [sx, sy, spr] = this.heroiSpr;
    this.ctx.globalAlpha = 0.32;
    this.ctx.drawImage(spr, sx - S.PE_X, sy - S.PE_Y);
    this.ctx.globalAlpha = 1;
  }

  desenharAliado(a) {
    const ctx = this.ctx;
    if (a.tipo === 'cachorro') {
      const s = S.spriteCachorro();
      const [dx] = this.dirTela(a.fx, a.fy);
      const q = (dx < 0 ? s.quadrosE : s.quadros)[a.andando ? Math.floor(a.animT * 4) % 2 : 0];
      const [sx, sy] = this.tela(a.x, a.y);
      const sh = S.sombra(10); ctx.drawImage(sh, sx - 6, sy - 3);
      ctx.drawImage(q, sx - 9, sy - 12);
      this.nomes.push({ x: sx, y: sy - 13, txt: '🐶 ' + a.nome, cor: '#9dffb0' });
    } else {
      const set = S.spriteHeroi('sobrevivente');
      const [sx, sy] = this.pessoa(this.quadro(set, a.fx, a.fy, a.animT, a.andando), a.x, a.y);
      const [dx, dy] = this.dirTela(a.fx, a.fy); const m = Math.hypot(dx, dy) || 1;
      line(ctx, sx, sy - 11, sx + dx / m * 5, sy - 11 + dy / m * 5, '#2a2a30');
      this.nomes.push({ x: sx, y: sy - 26, txt: a.nome, cor: '#9dffb0' });
    }
  }

  desenharItem(it) {
    const ctx = this.ctx;
    const [sx, sy] = this.tela(it.x, it.y);
    const s = S.spriteItem(it.kind);
    const z = Math.round(it.z * 14);
    const sh = S.sombra(Math.max(4, 12 - z / 6));
    ctx.drawImage(sh, sx - Math.floor(sh.width / 2), sy - 2);
    const brilha = it.kind === 'bau_lendario' || it.kind === 'arma' || it.kind === 'bau_medio' || it.kind === 'historia';
    if (brilha && z === 0) {
      const p = 0.5 + 0.5 * Math.sin(this.t * 5 + it.id);
      ctx.globalAlpha = 0.25 + 0.25 * p; disc(ctx, sx, sy - 6, 10 + p * 3, it.kind === 'bau_lendario' ? '#ffd23f' : it.kind === 'historia' ? '#fff3d0' : '#9fd0ff', 0.7); ctx.globalAlpha = 1;
      if (Math.random() < 0.08) this.particula({ x: it.x + (Math.random() - 0.5) * 0.6, y: it.y + (Math.random() - 0.5) * 0.6, z: 0.5, vz: 1.2, g: -0.3, life: 0.8, cor: it.kind === 'bau_lendario' ? '#fff3a0' : '#d8f0ff', tam: 1 });
    }
    if (z > 0) { // paraquedas
      ctx.fillStyle = it.kind === 'suprimento' ? '#e8e8e8' : '#d84a3a';
      fillPoly(ctx, [[sx - 10, sy - z - 22], [sx + 10, sy - z - 22], [sx + 7, sy - z - 27], [sx - 7, sy - z - 27]], ctx.fillStyle);
      line(ctx, sx - 9, sy - z - 22, sx - 3, sy - z - 10, '#c0c0c0'); line(ctx, sx + 9, sy - z - 22, sx + 3, sy - z - 10, '#c0c0c0');
    }
    if (it.vida < 6 && it.vida < 900 && Math.floor(this.t * 8) % 2) ctx.globalAlpha = 0.4;
    ctx.drawImage(s, sx - 10, sy - 18 - z);
    ctx.globalAlpha = 1;
  }

  atualizarEfeitos(dt, g) {
    for (const p of this.parts) {
      p.age += dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vz -= p.g * dt; p.z += p.vz * dt;
      if (p.z < 0) { p.z = 0; p.vz = 0; p.vx *= 0.5; p.vy *= 0.5; }
      if (!p.fumaca) { p.vx *= Math.pow(0.3, dt); p.vy *= Math.pow(0.3, dt); }
    }
    this.parts = this.parts.filter(p => p.age < p.life);
    for (const d of this.decals) d.age += dt;
    this.decals = this.decals.filter(d => d.age < d.life);
    for (const t of this.tracers) t.age += dt;
    this.tracers = this.tracers.filter(t => t.age < t.life);
    for (const e of this.explosoes) e.age += dt;
    this.explosoes = this.explosoes.filter(e => e.age < e.life);
    for (const r of this.raios) r.age += dt;
    this.raios = this.raios.filter(r => r.age < r.life);
    for (const t of this.textos) t.age += dt;
    this.textos = this.textos.filter(t => t.age < t.life);
  }

  desenharParticulas() {
    const ctx = this.ctx;
    for (const e of this.explosoes) {
      const [sx, sy] = this.tela(e.x, e.y);
      const k = e.age / e.life;
      const r = (8 + e.r * 18) * (0.4 + k);
      ctx.globalAlpha = 1 - k;
      disc(ctx, sx, sy - 6, r, k < 0.3 ? '#fff3a0' : '#ff8a2a', 0.75);
      disc(ctx, sx, sy - 6, r * 0.6, k < 0.2 ? '#ffffff' : '#ffd23f', 0.75);
      ctx.globalAlpha = 1;
    }
    for (const p of this.parts) {
      const [sx, sy] = this.tela(p.x, p.y, p.z * 12);
      if (sx < -8 || sx > W + 8 || sy < -8 || sy > H + 8) continue;
      const a = 1 - p.age / p.life;
      if (p.fumaca) { ctx.globalAlpha = a * 0.6; disc(ctx, sx, sy, p.tam + p.age * 4, '#4a4a4a', 1); ctx.globalAlpha = 1; continue; }
      if (p.fogo) ctx.globalAlpha = Math.max(0.2, a);
      ctx.fillStyle = p.cor; ctx.fillRect(sx, sy, p.tam, p.tam);
      ctx.globalAlpha = 1;
    }
  }

  desenharTracers() {
    const ctx = this.ctx;
    for (const t of this.tracers) {
      const [x0, y0] = this.tela(t.x0, t.y0, 11), [x1, y1] = this.tela(t.x1, t.y1, 9);
      line(ctx, x0, y0, x1, y1, t.heroi ? '#fff3a0' : '#ffe0a0');
      if (t.age < 0.03) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x0 - 1, y0 - 1, 3, 3); }
    }
  }

  luz(g) {
    const ctx = this.ctx, ex = this.ex;
    const noite = g.noiteT > 0 ? clamp(Math.min(g.noiteT, 3) / 3, 0, 1) : 0;
    const base = g.room ? 0.2 : 0.12;
    const a = base + noite * 0.62;
    ex.globalCompositeOperation = 'source-over';
    ex.clearRect(0, 0, W, H);
    ex.fillStyle = `rgba(6,6,22,${a})`;
    ex.fillRect(0, 0, W, H);
    ex.globalCompositeOperation = 'destination-out';
    const buraco = (x, y, r, forca = 1) => {
      const gr = ex.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(0,0,0,${forca})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      ex.fillStyle = gr; ex.fillRect(x - r, y - r, r * 2, r * 2);
    };
    const [hx, hy] = this.tela(g.hero.x, g.hero.y, 10);
    buraco(hx, hy, noite ? 78 : 120, 0.95);
    for (const r of this.raios) { const [sx, sy] = this.tela(r.x, r.y, 8); buraco(sx, sy, r.r * (1 - r.age / r.life * 0.5), 0.9); }
    for (const p of this.parts) if (p.fogo && Math.random() < 0.3) { const [sx, sy] = this.tela(p.x, p.y, p.z * 12); buraco(sx, sy, 16, 0.5); }
    if (noite > 0 && !g.room) {
      const L = this.limites();
      for (const o of g.city.objectsIn(L.x0, L.y0, L.x1, L.y1)) {
        if (o.kind === 'prop' && o.p.tipo === 'poste' && o.p.aceso) { const [sx, sy] = this.tela(o.p.x + 0.5, o.p.y + 0.5); buraco(sx, sy - 6, 44, 0.75); }
        if (o.kind === 'prop' && o.p.alarme && Math.floor(this.t * 4) % 2) { const [sx, sy] = this.tela(o.p.x + 1, o.p.y + 0.5); buraco(sx, sy, 50, 0.8); }
      }
      for (const it of g.itens) if (it.kind.startsWith('bau')) { const [sx, sy] = this.tela(it.x, it.y); buraco(sx, sy, 26, 0.7); }
    }
    ex.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.escuro, 0, 0);
    // vinheta vermelha de vida baixa
    const pct = g.hero.vida / g.hero.vidaMax;
    if (g.fase === 'jogo' && pct < 0.3) {
      const p = 0.5 + 0.5 * Math.sin(this.t * (pct < 0.15 ? 9 : 5));
      const gr = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.62);
      gr.addColorStop(0, 'rgba(200,0,0,0)'); gr.addColorStop(1, `rgba(200,0,0,${0.25 + 0.25 * p})`);
      ctx.fillStyle = gr; ctx.fillRect(0, 0, W, H);
    }
  }

  desenharHeli(g, dt) {
    if (!this.heli) return;
    const ctx = this.ctx;
    this.heli.t += dt;
    const t = this.heli.t;
    if (t > 4.5) { this.heli = null; return; }
    const x = -60 + t * 95, y = 360 - t * 85;
    // holofote
    ctx.globalAlpha = 0.18; disc(ctx, x + 10, y + 70, 40, '#fff8d0', 0.5); ctx.globalAlpha = 1;
    ctx.fillStyle = '#2a3a2a'; ctx.fillRect(x - 14, y - 4, 28, 10); ctx.fillRect(x + 10, y - 2, 22, 4); ctx.fillRect(x + 28, y - 6, 3, 8);
    ctx.fillStyle = '#9fd0ff'; ctx.fillRect(x - 12, y - 2, 7, 5);
    ctx.fillStyle = '#1a1a1a'; ctx.fillRect(x - 10, y + 7, 22, 1);
    const p = Math.floor(t * 30) % 2;
    ctx.fillStyle = 'rgba(30,30,30,0.7)'; ctx.fillRect(x - 26 + p * 4, y - 8, 52 - p * 8, 2);
  }

  // Textos nítidos (nomes, placas, números) num canvas de alta resolução por cima do jogo
  desenharTextos(g) {
    const tc = this.tc, tx = this.tx;
    const k = tc.width / W;
    tx.clearRect(0, 0, tc.width, tc.height);
    tx.textAlign = 'center'; tx.textBaseline = 'bottom'; tx.lineJoin = 'round';
    const escrever = (txt, x, y, tam, cor, borda = 'rgba(10,8,16,0.9)') => {
      tx.font = `700 ${Math.round(tam * k)}px "Fredoka", system-ui, sans-serif`;
      tx.lineWidth = Math.max(2, tam * k * 0.28); tx.strokeStyle = borda; tx.strokeText(txt, x * k, y * k);
      tx.fillStyle = cor; tx.fillText(txt, x * k, y * k);
    };
    for (const n of this.nomes || []) {
      if (n.placa) {
        const s = n.shop;
        tx.globalAlpha = n.tampa ? 0.4 : 1;
        tx.font = `700 ${Math.round(7 * k)}px "Fredoka", system-ui, sans-serif`;
        const txt = `${s.emoji} ${s.nome.toUpperCase()}`;
        const w = tx.measureText(txt).width / k + 8;
        tx.fillStyle = s.placa; tx.fillRect((n.x - w / 2) * k, (n.y - 9) * k, w * k, 11 * k);
        tx.fillStyle = 'rgba(255,255,255,0.25)'; tx.fillRect((n.x - w / 2) * k, (n.y - 9) * k, w * k, 1.2 * k);
        tx.fillStyle = '#ffffff'; tx.fillText(txt, n.x * k, (n.y + 1) * k);
        tx.globalAlpha = 1;
        continue;
      }
      escrever(n.txt, n.x, n.y, n.tam || (n.chefe ? 8 : 5.5), n.cor);
    }
    for (const m of this.marcadores || []) {
      if (g.room || !g.voto) continue;
      const [sx, sy] = this.tela(m.x, m.y, m.z);
      tx.beginPath(); tx.arc(sx * k, (sy - 5) * k, 7 * k, 0, Math.PI * 2);
      tx.fillStyle = 'rgba(10,8,16,0.85)'; tx.fill(); tx.lineWidth = 1.4 * k; tx.strokeStyle = m.cor; tx.stroke();
      tx.textBaseline = 'middle'; escrever(m.txt, sx, sy - 5, 9, m.cor, 'rgba(0,0,0,0)'); tx.textBaseline = 'bottom';
    }
    for (const t of this.textos) {
      const [sx, sy] = this.tela(t.x, t.y, 26 + t.age * 18 + (t.dz || 0));
      tx.globalAlpha = clamp((t.life - t.age) / 0.4, 0, 1);
      escrever(t.txt, sx, sy, 7 * t.tam, t.cor);
      tx.globalAlpha = 1;
    }
  }
}
