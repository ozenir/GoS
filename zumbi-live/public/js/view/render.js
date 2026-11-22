// Desenha o mundo na tela em visão isométrica. A câmera gira junto com o herói: ele sempre anda
// "pra cima e pra direita" (↗), então esquerda é sempre ↖ e direita é sempre ↘ — igual à votação.
import { mod, hash2, DIRS, clamp, dist } from '../core/util.js';
import { P, T as TT } from '../core/city.js';
import { ZUMBIS, CLASSES } from '../core/dados.js';
import { STATUS } from '../core/status.js';
import { AMBIENTE, ligado as ligadoZona } from '../core/ambiente.js';
import { posDrone } from '../core/habilidades.js';
import { fillPoly, line, disc, canvas as novoCanvas } from './pixel.js';
import * as S from './sprites.js';
import { CenaPortal } from './portal.js';

export const W = 216, H = 384;
const AX = 114, AY = 226;           // onde fica o ponto da câmera na tela (um pouco abaixo do centro: o HUD de cima fica livre)
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
    this.arremessos = []; this.choques = []; this.ondas = [];   // efeitos das habilidades
    this.bracos = [];   // braço esticado do zumbi de braço longo
    this.avioes = []; this.bombasCaindo = [];   // Ataque aéreo: sombra do avião e bombas caindo
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
        this.tracers.push({ x0: e.x, y0: e.y, x1: e.tx, y1: e.ty, age: 0, life: e.arma === 'metralhadora' ? 0.05 : 0.07, heroi: e.heroi, z0: e.drone ? 21 : 11, drone: e.drone });
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
        else if (e.efetividade === 'escudo' && this.t - (this.ultEscudo || -9) > 1.2) { this.ultEscudo = this.t; this.texto(e.x, e.y, '🛡️ escudo', '#25f4ee', 0.8); }
        else if (e.critico && this.t - (this.ultCrit || -9) > 0.5) { this.ultCrit = this.t; this.texto(e.x, e.y, 'CRÍTICO', '#ffe27a', 0.85); }
        break;
      }
      case 'ambiente': {
        const A = AMBIENTE[e.tipo];
        this.ultAmb = this.ultAmb || {};
        if (A && this.t - (this.ultAmb[e.tipo] || -9) > 2) { this.ultAmb[e.tipo] = this.t; this.texto(e.x, e.y, `${A.emoji} ${A.nome.toLowerCase()}!`, '#ffb08a', 0.85); }
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
        this.tremer(e.aereo || e.amiga ? 3 : 6);
        break;
      }
      case 'dano_heroi': this.sangue(e.x, e.y, 4, ['#a8282a', '#7a1a1c']); this.tremer(2); this.piscar('#ff2a2a', 0.18); break;
      case 'colete': this.texto(e.x, e.y, '🛡️ bloqueou', '#9fd0ff'); break;
      case 'braco': this.bracos.push({ ...e, age: 0, life: 0.32 }); if (e.acertou) this.sangue(e.tx, e.ty, 3); break;
      case 'lobo_pulou': this.texto(e.x, e.y, '🐺!', '#ff9a90', 0.9); break;
      case 'lobo_caiu': for (let i = 0; i < 6; i++) this.particula({ x: e.x, y: e.y, z: 0.05, vx: (Math.random() - 0.5) * 2, vy: (Math.random() - 0.5) * 2, vz: 0.8, life: 0.35, cor: '#8a8070', tam: 1 }); if (e.acertou) this.tremer(3); break;
      case 'arremesso': this.arremessos.push({ ...e, age: 0, life: e.t }); break;
      case 'raio': this.choques.push({ pts: e.pts, age: 0, life: 0.22 }); for (const p of e.pts.slice(1)) this.raios.push({ x: p[0], y: p[1], age: 0, life: 0.15, r: 22 }); break;
      case 'onda': this.ondas.push({ x: e.x, y: e.y, raio: e.raio, age: 0, life: 0.45 }); this.tremer(3); break;
      case 'saindo_vidro': this.texto(e.x, e.y, '🏃 saindo do vidro!', '#ffd23f', 0.8); break;
      case 'vidro_sem_cura': this.texto(e.x, e.y, '🚫💚 sem cura no vidro!', '#ff8a64', 0.8); break;
      case 'cura_bloqueada': if (this.t - (this.ultBloq || -9) > 1) { this.ultBloq = this.t; this.texto(e.x, e.y, `💚 ${e.guardada}% guardada (sai do vidro!)`, '#9dffb0', 0.8); } break;
      case 'cura_liberada': this.texto(e.x, e.y, `💚 cura liberada +${e.valor}%`, '#9dffb0', 1); break;
      case 'fa_acertou': this.texto(e.x, e.y, 'acertou! 🛡️💔', '#fe2c55', 0.9); break;
      case 'agarrou': this.tremer(4); for (let i = 0; i < 8; i++) this.particula({ x: e.x + (Math.random() - 0.5) * 0.6, y: e.y + (Math.random() - 0.5) * 0.6, z: 0.1, vz: 1.5, life: 0.5, cor: '#8a8070', tam: 2 }); break;
      case 'atropelou': this.tremer(e.heroi ? 6 : 2); for (let i = 0; i < (e.heroi ? 10 : 5); i++) this.particula({ x: e.x + (Math.random() - 0.5) * 0.5, y: e.y + (Math.random() - 0.5) * 0.5, z: 0.4, vz: 2 + Math.random() * 2, life: 0.5, cor: e.heroi ? '#ffd23f' : '#8a1e1e', tam: 2 }); if (e.heroi) this.piscar('#ff2a2a', 0.2); break;
      case 'furia_divina': this.piscar('#fff3a0', 0.55); this.tremer(6); this.ondas.push({ x: e.x, y: e.y, raio: e.raio, age: 0, life: 0.7, cor: '#fff3a0' }); this.raios.push({ x: e.x, y: e.y, age: 0, life: 0.6, r: 120 }); for (let i = 0; i < 20; i++) { const a = Math.random() * 6.28, s = 2 + Math.random() * 4; this.particula({ x: e.x, y: e.y, z: 0.5, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 3, life: 0.8, cor: i % 2 ? '#ffd23f' : '#fff3a0', tam: 2 }); } break;
      case 'deus': case 'nucleo': this.piscar('#ffd23f', e.tercos ? 0.25 : 0.4); break;
      case 'pedrada': this.tremer(5); this.piscar('#ffffff', 0.25); for (let i = 0; i < 6; i++) this.particula({ x: e.x + (Math.random() - 0.5) * 0.4, y: e.y + (Math.random() - 0.5) * 0.4, z: 0.8, vx: (Math.random() - 0.5) * 3, vy: (Math.random() - 0.5) * 3, vz: 2, life: 0.4, cor: Math.random() < 0.5 ? '#6a6a74' : '#a8a8b2', tam: 1 }); break;
      case 'aviao': this.avioes.push({ ...e, age: 0 }); break;
      case 'bomba_caindo': this.bombasCaindo.push({ ...e, age: 0 }); break;
      case 'eclipse': this.choques.push({ pts: [[e.x, e.y], [e.x2, e.y2]], age: 0, life: 0.35, cor: '#b06bff' }); for (let i = 0; i < 16; i++) { const k = Math.random(); this.particula({ x: e.x + (e.x2 - e.x) * k, y: e.y + (e.y2 - e.y) * k, z: 0.6, vz: 1, g: -0.5, life: 0.6, cor: Math.random() < 0.5 ? '#b06bff' : '#2a0f45', tam: 2 }); } this.tremer(3); break;
      case 'fenix': this.piscar('#ff8a2a', 0.45); this.tremer(5); for (let i = 0; i < 24; i++) { const a = Math.random() * 6.28, s = 2 + Math.random() * 3; this.particula({ x: e.x, y: e.y, z: 0.4, vx: Math.cos(a) * s, vy: Math.sin(a) * s, vz: 2.5, life: 0.7, cor: ['#ffd23f', '#ff8a2a', '#ff4a2a'][i % 3], tam: 2, fogo: true }); } break;
      case 'inspiracao_pulso': this.ondas.push({ x: e.x, y: e.y, raio: e.raio, age: 0, life: 0.35, cor: '#ffd23f' }); break;
      case 'colosso_cansou': this.tremer(4); for (let i = 0; i < 14; i++) this.particula({ x: e.x + (Math.random() - 0.5), y: e.y + (Math.random() - 0.5), z: 1.5, vz: 1, g: 1, life: 1, cor: '#9fd0ff', tam: 2 }); break;
      case 'segundo_folego': this.ondas.push({ x: e.x, y: e.y, raio: e.raio, age: 0, life: 0.6 }); this.tremer(4); break;
      case 'habilidade': {
        const c = e.carta;
        this.texto(e.x, e.y, `${c.emoji} ${c.nome}${c.tipo === 'ativa' || c.tipo === 'passiva' ? ' ' + c.nivel : ''}`, c.tipo === 'combo' ? '#c58bff' : c.tipo === 'suprema' ? '#ff8a3d' : '#ffd23f', c.tipo === 'suprema' || c.tipo === 'combo' ? 1.6 : 1.2);
        for (let i = 0; i < 18; i++) { const a = i / 18 * Math.PI * 2; this.particula({ x: e.x, y: e.y, z: 0.6, vx: Math.cos(a) * 3, vy: Math.sin(a) * 3, vz: 1.5, life: 0.6, cor: i % 2 ? '#ffd23f' : '#fff3a0', tam: 2 }); }
        break;
      }
      case 'presente_heroi': this.texto(e.x, e.y, `${e.emoji} ${e.nick}`, e.lado === 'ajuda' ? '#ffd23f' : '#ff8ae0', 1.15); break;
      case 'adaptado': this.texto(e.x, e.y, e.texto, '#9fe8ff', 1); break;
      case 'mochila': this.texto(e.x, e.y, '💼 +kit na mochila', '#9dffb0', 1); break;
      case 'caiu': this.tremer(8); this.piscar('#ff2a2a', 0.5); break;
      case 'golpe_final': this.tremer(5); this.piscar('#a020ff', 0.35); break;
      case 'levantou':
        this.piscar('#ffffff', 0.6);
        for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; this.particula({ x: e.x, y: e.y, z: 0.2, vx: Math.cos(a) * 6, vy: Math.sin(a) * 6, vz: 0.6, life: 0.5, cor: i % 2 ? '#ffd23f' : '#ffffff', tam: 2 }); }
        break;
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
      case 'entrou_predio': case 'saiu_predio': case 'entrou_praia': this.fade = 1.4; this.decals = []; this.parts = []; break;
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
    this.t += dt; this.dtUlt = dt;
    // portal dos 500: cena própria (câmera atrás do herói, view/portal.js)
    if (g.portal) {
      this.shake = Math.max(0, this.shake - dt * 18);
      (this.cenaPortal ||= new CenaPortal()).desenhar(this, g, dt);
      this.estavaNoPortal = true;
      return;
    }
    if (this.estavaNoPortal) { this.estavaNoPortal = false; this.cenaPortal = null; this.fade = 1; this.flash = { cor: '#f0e0ff', a: 0.9 }; }
    const ctx = this.ctx, h = g.hero;
    // rotação e câmera
    let rAlvo = g.room ? 0 : g.rota.dir;
    if (rAlvo !== this.r) { this.r = rAlvo; }
    let alvo;
    if (g.room?.praia) alvo = { x: h.x * 0.8 + g.room.w / 2 * 0.2, y: h.y * 0.8 + g.room.h / 2 * 0.2 - 1 };   // praia é grande: segue o herói
    else if (g.room) alvo = { x: g.room.w / 2 + (h.x - g.room.w / 2) * 0.25, y: g.room.h / 2 + 0.6 + (h.y - g.room.h / 2) * 0.25 };
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
    this.desenharZonas(g);
    this.setasVotacao(g);
    this.bordaArena(g);
    this.objetos(g);
    this.fantasmaHeroi(g);
    this.desenharParticulas();
    this.desenharHabilidades(g);
    this.desenharAvioes();
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

  // Praia: areia, a linha de espuma e o mar com ondas mexendo
  chaoPraia(g) {
    const ctx = this.ctx, room = g.room, f = Math.floor(this.t * 2.5);
    for (let ty = -14; ty < room.h + 14; ty++) for (let tx = -14; tx < room.w + 14; tx++) {
      const [sx, sy] = this.topoCasa(tx, ty);
      if (sx < -24 || sx > 240 || sy < -14 || sy > 390) continue;
      const nome = ty < room.mar - 1 ? 'mar' : ty === room.mar - 1 ? 'espuma' : 'areia';
      const v = nome === 'areia' ? (tx * 7 + ty * 3) % 4 : (f + tx + ty * 2) % 3;
      ctx.drawImage(S.tile(nome, (v + 3) % (nome === 'areia' ? 4 : 3)), sx - 12, sy);
    }
  }

  chaoSala(g) {
    if (g.room.praia) return this.chaoPraia(g);
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
        const esc = d.ztipo === 'rei' || d.ztipo === 'colosso' ? 3 : d.ztipo === 'chefao' || d.ztipo === 'exheroi' ? 2 : 1;
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

  // Perigos do chão (ambiente.js), cada um com o seu desenho
  desenharZonas(g) {
    const ctx = this.ctx;
    for (const z of g.zonasAgora || []) {
      if (z.oculta) continue;   // ex.: o mar da praia já é desenhado no chão
      const [mx, my] = this.tela((z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2);
      if (mx < -80 || mx > W + 80 || my < -80 || my > H + 80) continue;
      const cantos = [this.tela(z.x0, z.y0), this.tela(z.x1, z.y0), this.tela(z.x1, z.y1), this.tela(z.x0, z.y1)];
      const sem = z.semente || ((Math.floor(z.x0) * 73 + Math.floor(z.y0) * 31) | 0);
      const area = Math.max(1, (z.x1 - z.x0) * (z.y1 - z.y0));
      const pontos = (n, fn) => {
        for (let i = 0; i < n; i++) {
          const [px, py] = this.tela(z.x0 + hash2(i, sem, 1) * (z.x1 - z.x0), z.y0 + hash2(i, sem, 2) * (z.y1 - z.y0));
          fn(px, py, i);
        }
      };
      switch (z.tipo) {
        case 'vidro':
          pontos(Math.round(area * 7), (px, py, i) => {
            const brilho = Math.sin(this.t * 6 + i) > 0.6;
            ctx.fillStyle = brilho ? '#ffffff' : i % 3 ? '#9fd8e8' : '#5a8a9a';
            ctx.fillRect(px, py, brilho ? 2 : 1, 1);
          });
          break;
        case 'arame': {
          const pts = []; pontos(Math.round(area * 2.5) + 3, (px, py) => pts.push([px, py]));
          pts.sort((a, b) => a[0] - b[0]);
          for (let i = 1; i < pts.length; i++) line(ctx, pts[i - 1][0], pts[i - 1][1] - 3, pts[i][0], pts[i][1] - 3, '#8a8a90');
          for (const [px, py] of pts) { ctx.fillStyle = '#5a5a60'; ctx.fillRect(px, py - 6, 1, 6); ctx.fillStyle = '#c0c0c8'; ctx.fillRect(px - 1, py - 4, 3, 1); }
          break;
        }
        case 'fogo':
          ctx.globalAlpha = 0.35; fillPoly(ctx, cantos, '#ff7a20'); ctx.globalAlpha = 1;
          pontos(Math.round(area * 4) + 4, (px, py, i) => {
            const hh = 2 + ((this.t * 14 + i * 3) % 5);
            ctx.fillStyle = i % 3 ? '#ff8a2a' : '#ffd23f'; ctx.fillRect(px, py - hh, 2, hh);
            if (i % 2 === 0) { ctx.fillStyle = '#ffe9a0'; ctx.fillRect(px, py - hh, 1, 1); }
          });
          if (Math.random() < 0.3) this.particula({ x: z.x0 + Math.random() * (z.x1 - z.x0), y: z.y0 + Math.random() * (z.y1 - z.y0), z: 0.3, vz: 1.2, g: -0.5, life: 0.6, cor: 'rgba(70,60,60,0.6)', tam: 3, fumaca: true });
          break;
        case 'acido':
          ctx.globalAlpha = 0.6; fillPoly(ctx, cantos, '#6ac83a'); ctx.globalAlpha = 1;
          pontos(Math.round(area * 2) + 2, (px, py, i) => { if (Math.sin(this.t * 4 + i * 1.7) > 0.3) { ctx.fillStyle = '#c8ff8a'; ctx.fillRect(px, py, 2, 2); } });
          break;
        case 'lama':
          ctx.globalAlpha = 0.75; fillPoly(ctx, cantos, '#5a3e22'); ctx.globalAlpha = 1;
          pontos(Math.round(area * 2), (px, py) => { ctx.fillStyle = '#3e2a16'; ctx.fillRect(px, py, 3, 1); });
          break;
        case 'agua':
          fillPoly(ctx, cantos, '#2e5a86');
          pontos(Math.round(area * 1.5) + 2, (px, py, i) => { if ((this.t * 2 + i) % 3 < 1.5) { ctx.fillStyle = '#7ab4e0'; ctx.fillRect(px, py, 4, 1); } });
          break;
        case 'fios': {
          const [ax, ay] = cantos[0], [bx, by] = cantos[2];
          ctx.fillStyle = '#4a3a2a'; ctx.fillRect(ax, ay - 16, 2, 16); ctx.fillRect(bx, by - 16, 2, 16);
          const meio = [(ax + bx) / 2, (ay + by) / 2 - 4];
          line(ctx, ax, ay - 15, meio[0], meio[1], '#1a1a1a'); line(ctx, meio[0], meio[1], bx, by - 15, '#1a1a1a');
          if (ligadoZona(z, g.t)) for (let i = 0; i < 3; i++) if (Math.random() < 0.6) { ctx.fillStyle = Math.random() < 0.5 ? '#fff3a0' : '#9fe8ff'; ctx.fillRect(meio[0] + (Math.random() - 0.5) * 10, meio[1] + (Math.random() - 0.2) * 8, 2, 2); }
          break;
        }
        case 'buraco': {
          // buraco no asfalto: escuro no meio, borda quebrada
          const [cx, cy] = this.tela((z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2), rr = (z.x1 - z.x0) * 7;
          disc(ctx, cx, cy, rr + 1, '#2a2a2e', 0.55); disc(ctx, cx, cy, rr - 1, '#0e0e12', 0.55);
          ctx.fillStyle = '#4a4a50'; ctx.fillRect(cx - rr, cy - 1, 2, 1); ctx.fillRect(cx + rr - 2, cy, 2, 1); ctx.fillRect(cx - 1, cy - rr / 2 - 1, 3, 1);
          break;
        }
        case 'entulho':
          pontos(Math.round(area * 3) + 3, (px, py, i) => { ctx.fillStyle = i % 2 ? '#6a6460' : '#8a7a62'; ctx.fillRect(px - 2, py - 2, 4 + (i % 3), 2 + (i % 2)); ctx.fillStyle = '#4a4440'; ctx.fillRect(px - 2, py, 4, 1); });
          break;
      }
    }
  }

  // Borda vermelha piscando em volta da praça durante a arena
  bordaArena(g) {
    if (!g.arena || g.room) return;
    const { bi, bj } = g.arena.praca, x0 = bi * 20 + 5, y0 = bj * 20 + 5, x1 = x0 + 15, y1 = y0 + 15;
    const c = [this.tela(x0, y0), this.tela(x1, y0), this.tela(x1, y1), this.tela(x0, y1)];
    const cor = Math.floor(this.t * 3) % 2 ? '#ff3a2a' : '#ff9a3a';
    for (let i = 0; i < 4; i++) line(this.ctx, c[i][0], c[i][1], c[(i + 1) % 4][0], c[(i + 1) % 4][1], cor, 2);
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
        const d = o.praca ? o.praca.entrada : o.shop.door;
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
        } else if (p.tipo === 'carro' || (g.room && !g.room.praia)) {
          const w = p.w || 1, hh = p.h || 1;
          const cs = [[p.x, p.y], [p.x + w, p.y], [p.x, p.y + hh], [p.x + w, p.y + hh]].map(([x, y]) => this.view(x, y));
          const u0 = Math.min(...cs.map(c => c[0])), v0 = Math.min(...cs.map(c => c[1]));
          const u1 = Math.max(...cs.map(c => c[0])), v1 = Math.max(...cs.map(c => c[1]));
          lista.push({ key: (u0 + u1 + v0 + v1) / 2, tipo: g.room && !g.room.praia ? 'movel' : 'carro', p, u0, v0, u1, v1 });
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
    for (const t of g.tomates || []) { const [u, v] = this.view(t.x, t.y); lista.push({ key: u + v + 0.3, tipo: 'tomate', t }); }
    for (const p of g.paraquedistas || []) { const [u, v] = this.view(p.x, p.y); lista.push({ key: u + v + 0.5, tipo: 'paraquedista', p }); }
    for (const c of g.carros || []) {
      // retângulo do carro (2 casas no sentido em que anda, 1 de largura), igual aos carros parados
      const px = -c.dy * 0.5, py = c.dx * 0.5;
      const cs = [[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([a, b]) => this.view(c.x + c.dx * a + px * b, c.y + c.dy * a + py * b));
      const u0 = Math.min(...cs.map(q => q[0])), v0 = Math.min(...cs.map(q => q[1]));
      const u1 = Math.max(...cs.map(q => q[0])), v1 = Math.max(...cs.map(q => q[1]));
      lista.push({ key: (u0 + u1 + v0 + v1) / 2, tipo: 'conversivel', c, u0, v0, eixo: u1 - u0 > v1 - v0 ? 'u' : 'v' });
    }
    if (!g.room) for (const f of g.figurantes || []) { const [u, v] = this.view(f.x, f.y); lista.push({ key: u + v, tipo: 'figurante', f }); }
    if (g.fase === 'jogo' || this.t % 1 < 0.5) lista.push({ key: heroiKey, tipo: 'heroi' });
    lista.sort((a, b) => a.key - b.key);
    this.nomes = [];
    // de noite: janelas acesas numa camada própria, na mesma ordem dos prédios (o prédio da frente apaga as janelas
    // do de trás); depois ela brilha por cima do escuro (luz)
    const noite = g.noiteT > 0 && !g.room;
    // três camadas da noite, todas na ordem de profundidade: janelas (em), cor da luz dos postes (emL) e o buraco
    // que os postes abrem no escuro (emM). Um prédio desenhado depois (na frente) apaga o que ficou atrás dele.
    if (noite) {
      if (!this.em) { [this.emc, this.em] = novoCanvas(W, H); [this.emLc, this.emL] = novoCanvas(W, H); [this.emMc, this.emM] = novoCanvas(W, H); }
      for (const e of [this.em, this.emL, this.emM]) { e.globalCompositeOperation = 'source-over'; e.clearRect(0, 0, W, H); }
    }
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
        if (noite) {
          for (const c of [this.emL, this.emM]) { c.globalCompositeOperation = 'destination-out'; c.drawImage(s.c, x0, y0); c.globalCompositeOperation = 'source-over'; }   // tapa a luz dos postes de trás
          const e = this.em;
          e.globalCompositeOperation = 'destination-out'; e.drawImage(s.c, x0, y0);   // tapa as janelas de trás
          e.globalCompositeOperation = 'source-over';
          if (s.luzes && !o.b.fogo) { e.globalAlpha = tampa ? 0.35 : 1; e.drawImage(s.luzes, x0, y0); e.globalAlpha = 1; }
        }
        if (o.b.fogo) this.fogoPredio(o.b, x0, y0, s.c.width);
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
        if (p.fogo) this.chamas(p.x + (p.w || 1) / 2, p.y + (p.h || 1) / 2, 8, 3);
        if (p.alarme && Math.floor(this.t * 4) % 2) {
          const [cx, cy] = this.tela(p.x + (p.w || 1) / 2, p.y + (p.h || 1) / 2, 10);
          ctx.fillStyle = '#ffb02a'; ctx.fillRect(cx - 10, cy, 3, 2); ctx.fillRect(cx + 8, cy, 3, 2);
        }
      } else if (o.tipo === 'prop') {
        const s = S.spriteProp(o.p.tipo);
        if (!s.c) continue;
        const [sx, sy] = this.tela(o.p.x + 0.5, o.p.y + 0.5);
        ctx.drawImage(s.c, sx - s.ox, sy - s.oy);
        if (noite && o.p.tipo === 'poste' && o.p.aceso && this.posteLigado(o.p)) this.luzPoste(sx, sy);
      } else if (o.tipo === 'item') this.desenharItem(o.it);
      else if (o.tipo === 'zumbi') this.desenharZumbi(o.z, g);
      else if (o.tipo === 'aliado') this.desenharAliado(o.a);
      else if (o.tipo === 'conversivel') this.desenharConversivel(o);
      else if (o.tipo === 'paraquedista') this.desenharParaquedista(o.p);
      else if (o.tipo === 'tomate') (o.t.tipo === 'pedra' ? this.desenharPedra(o.t) : this.desenharTomate(o.t));
      else if (o.tipo === 'figurante') this.desenharFigurante(o.f, g);
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
    if (z.tipo === 'lobo') return this.desenharLobo(z, T);
    const set = z.tipo === 'exheroi' ? S.spriteHeroi(CLASSES[z.extra?.classe]?.roupa || 'sobrevivente', true) : S.spriteZumbi(z.tipo, z.roupa);
    const esc = z.tipo === 'rei' || z.tipo === 'colosso' ? 3 : z.tipo === 'chefao' || z.tipo === 'exheroi' ? 2 : 1;
    const spr = this.quadro(set, z.fx, z.fy, z.animT * (z.tipo === 'corredor' ? 1.4 : 1), !z.dormindo);
    const nasc = z.nascendo > 0 ? 1 - z.nascendo / 0.8 : 1;
    if (z.nascendo > 0 && !this.vistos.has(z.id)) {
      this.vistos.add(z.id); if (this.vistos.size > 2000) this.vistos.clear();
      for (let i = 0; i < 6 * esc; i++) this.particula({ x: z.x + (Math.random() - 0.5) * 0.6 * esc, y: z.y + (Math.random() - 0.5) * 0.6 * esc, z: 0.1, vz: 1 + Math.random() * 2, life: 0.5, cor: i % 2 ? '#5a4a3a' : '#3a3028', tam: 2 });
    }
    // zumbi do fã (presente TikTok): brilho ciano e rosa nos pés, faíscas e, com escudo, uma bolha em volta
    if (z.fa && nasc >= 1) {
      const [gx, gy] = this.tela(z.x, z.y), k = Math.sin(this.t * 6 + z.id) * 0.5 + 0.5;
      this.ctx.globalAlpha = 0.35 + 0.25 * k; disc(this.ctx, gx, gy, 9 + k * 2, k > 0.5 ? '#25f4ee' : '#fe2c55', 0.5); this.ctx.globalAlpha = 1;
      if (Math.random() < 0.25) this.particula({ x: z.x + (Math.random() - 0.5) * 0.5, y: z.y + (Math.random() - 0.5) * 0.5, z: 0.5, vz: 1.5, g: -0.4, life: 0.6, cor: Math.random() < 0.5 ? '#25f4ee' : '#fe2c55', tam: 1 });
    }
    const [sx, sy] = this.pessoa(spr, z.x, z.y, esc, 1, Math.max(0.05, nasc));
    if (z.fa?.escudo > 0 && nasc >= 1) { this.ctx.globalAlpha = 0.18 + 0.08 * Math.sin(this.t * 8); disc(this.ctx, sx, sy - 10, 13, '#bff8ff', 0.9); this.ctx.globalAlpha = 1; }
    if (z.flash > 0.04) { this.ctx.globalAlpha = 0.6; this.ctx.drawImage(this.branco(spr), sx - S.PE_X * esc, sy - S.PE_Y * esc, S.SPR_W * esc, S.SPR_H * esc); this.ctx.globalAlpha = 1; }
    // zumbi do tomate: um tomate na mão, balançando, pronto pra jogar
    // zumbi da pedra: uma pedra cinza na mão, pesando
    if (z.tipo === 'pedreiro' && nasc >= 1 && (z.tomateCd ?? 0) < ZUMBIS.pedreiro.pedra.recarga - 0.8) {
      const b = Math.round(Math.sin(this.t * 4 + z.id) * 0.6);
      this.ctx.fillStyle = '#4a4a52'; this.ctx.fillRect(sx + 2, sy - 13 + b, 4, 3); this.ctx.fillRect(sx + 3, sy - 14 + b, 2, 1);
      this.ctx.fillStyle = '#8a8a94'; this.ctx.fillRect(sx + 3, sy - 13 + b, 2, 1);
    }
    if (z.tipo === 'tomateiro' && nasc >= 1 && (z.tomateCd ?? 0) < ZUMBIS.tomateiro.tomate.recarga - 0.8) {
      const b = Math.round(Math.sin(this.t * 5 + z.id));
      this.ctx.fillStyle = '#d7261c'; this.ctx.fillRect(sx + 3, sy - 13 + b, 3, 3);
      this.ctx.fillStyle = '#3f7f2c'; this.ctx.fillRect(sx + 4, sy - 14 + b, 1, 1);
    }
    if (z.tipo === 'explosivo') {
      const rapido = z.pavio >= 0;
      if (Math.floor(this.t * (rapido ? 12 : 3)) % 2) { this.ctx.fillStyle = '#ff3a2a'; this.ctx.fillRect(sx - 1, sy - 18, 3, 2); }
    }
    if (z.estados.tem('queimando') && Math.random() < 0.5) this.particula({ x: z.x + (Math.random() - 0.5) * 0.4, y: z.y + (Math.random() - 0.5) * 0.4, z: 0.6, vz: 1.5, g: -1, life: 0.4, cor: Math.random() < 0.5 ? '#ff8a2a' : '#ffd23f', tam: 2, fogo: true });
    if (T.chefe && nasc >= 1) {
      const bw = 14 * esc, frac = clamp(z.vida / z.vidaMax, 0, 1);
      const by = sy - S.PE_Y * esc - 4;
      this.ctx.fillStyle = '#1a1420'; this.ctx.fillRect(sx - bw / 2 - 1, by - 1, bw + 2, 4);
      this.ctx.fillStyle = z.doacao ? (z.doacao.cansado ? '#9dffb0' : '#ffd23f') : z.tipo === 'exheroi' ? '#9fd0ff' : '#e8442a'; this.ctx.fillRect(sx - bw / 2, by, Math.round(bw * frac), 2);
    }
    // ícones dos status do zumbi (sangrando, atordoado, queimando...)
    if (z.estados.lista.size && nasc >= 1) {
      let ic = '';
      for (const s of z.estados.lista.values()) { ic += STATUS[s.id].emoji; if (ic.length > 6) break; }
      this.nomes.push({ x: sx, y: sy - S.PE_Y * esc - (z.nome ? (T.chefe ? 16 : 9) : (T.chefe ? 8 : 1)), txt: ic, cor: '#fff', tam: 4.5 });
    }
    if (z.nome && nasc >= 1) this.nomes.push({ x: sx, y: sy - S.PE_Y * esc - (T.chefe ? 8 : 2), txt: z.nome, chefe: T.chefe, cor: z.fa ? '#25f4ee' : z.tipo === 'exheroi' ? '#9fd0ff' : T.chefe ? '#ff6a4a' : '#ffd8a8' });
    // foto de quem mandou, em cima da cabeça (sem foto: a inicial do nome)
    if (z.fa && nasc >= 1) this.nomes.push({ foto: z.fa.avatar, inicial: (z.nome || '?')[0].toUpperCase(), escudo: z.fa.escudo > 0, x: sx, y: sy - S.PE_Y * esc - 22 });
  }

  // Chamas no ponto (x, y) do mundo, a z pixels de altura: retângulos piscando e fumaça subindo
  chamas(x, y, z, n) {
    const ctx = this.ctx, [sx, sy] = this.tela(x, y, z);
    for (let k = 0; k < n; k++) {
      const ox = Math.round(Math.sin(k * 2.1 + this.t * 9) * 4 + (k - n / 2) * 3), alt = 3 + ((k * 7 + Math.floor(this.t * 12)) % 4);
      ctx.fillStyle = '#e8442a'; ctx.fillRect(sx + ox - 1, sy - alt, 3, alt);
      ctx.fillStyle = '#ffd23f'; ctx.fillRect(sx + ox, sy - alt + 1, 1, alt - 1);
    }
    if (Math.random() < 0.12) this.particula({ x, y, z: z / 12 + 0.4, vz: 0.9, g: -0.4, life: 1.6, cor: 'rgba(50,50,50,0.6)', tam: 3, fumaca: true });
  }

  // Prédio pegando fogo: chamas em algumas janelas e no telhado, fumaça saindo
  fogoPredio(b, x0, y0, largura) {
    const ctx = this.ctx;
    for (let k = 0; k < 7; k++) {
      const hx = ((b.bi * 31 + b.sx * 7 + k * 13) % 17) / 17, hy = ((b.bj * 17 + b.sy * 5 + k * 11) % 13) / 13;
      const px = Math.round(x0 + largura * (0.15 + hx * 0.7)), py = Math.round(y0 + 8 + hy * b.altura * 0.8);
      const alt = 5 + ((k + Math.floor(this.t * 10)) % 4);
      ctx.globalAlpha = 0.3; disc(ctx, px, py - 3, 6, '#ff7a2a', 0.6); ctx.globalAlpha = 1;
      ctx.fillStyle = '#c8321e'; ctx.fillRect(px - 2, py - alt, 5, alt);
      ctx.fillStyle = '#ff8a2a'; ctx.fillRect(px - 1, py - alt + 1, 3, alt - 1);
      ctx.fillStyle = '#ffe27a'; ctx.fillRect(px, py - alt + 2, 1, alt - 3);
    }
    if (Math.random() < 0.08) this.particula({ x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, z: b.altura / 12 + 1, vz: 0.8, g: -0.3, life: 2.2, cor: 'rgba(40,40,40,0.6)', tam: 4, fumaca: true });
  }

  // Figurantes (só cenário): pessoa fugindo, ou pessoa caída com dois zumbis em cima pedindo socorro
  desenharFigurante(f, g) {
    const ctx = this.ctx, set = S.spriteCivil(f.roupa);
    if (f.tipo === 'fugindo') {
      const spr = this.quadro(set, f.fx || f.vx, f.fy || f.vy, f.animT * 1.6, true);
      const [sx, sy] = this.pessoa(spr, f.x, f.y);
      if (f.t < 3.5) this.nomes.push({ x: sx, y: sy - 27, txt: '😱 ' + f.grito, cor: '#ffffff' });
      return;
    }
    const corpo = S.deitado(set.frente[0]);
    const [sx, sy] = this.tela(f.x, f.y);
    ctx.drawImage(S.sombra(14), sx - 8, sy - 3);
    ctx.drawImage(corpo, sx - 14, sy - 10);
    if (f.t < 12) for (const [dx, dy, k] of [[-0.55, -0.25, 0], [0.5, 0.3, 1]]) {
      const zs = S.spriteZumbi('comum', (f.roupa + k * 3) % 6);
      const spr = this.quadro(zs, -dx, -dy, this.t * 2 + k, Math.floor(this.t * 3 + k) % 2 === 0);
      this.pessoa(spr, f.x + dx, f.y + dy, 1, 1, 0.8);
    }
    if (f.t < 7) {
      this.nomes.push({ x: sx, y: sy - 30, txt: '🆘 ' + f.grito, cor: '#ff6a5a' });
      if (Math.random() < 0.15) this.sangue(f.x, f.y, 2);
    }
  }

  // Lobo zumbi: quatro patas; no salto ele sobe (z.alt)
  desenharLobo(z, T) {
    const ctx = this.ctx, s = S.spriteLobo();
    const [dx] = this.dirTela(z.fx, z.fy);
    const q = (dx < 0 ? s.quadrosE : s.quadros)[z.salto ? 1 : Math.floor(z.animT * 5) % 2];
    const [gx, gy] = this.tela(z.x, z.y);
    const sh = S.sombra(10); ctx.drawImage(sh, gx - 6, gy - 3);
    const [sx, sy] = this.tela(z.x, z.y, (z.alt || 0) * 14);
    if (z.nascendo > 0) ctx.globalAlpha = Math.max(0.2, 1 - z.nascendo / 0.8);
    ctx.drawImage(q, sx - 10, sy - 12);
    if (z.flash > 0.04) { ctx.globalAlpha = 0.6; ctx.drawImage(this.branco(q), sx - 10, sy - 12); }
    ctx.globalAlpha = 1;
    if (z.estados.lista.size) { let ic = ''; for (const st of z.estados.lista.values()) { ic += STATUS[st.id].emoji; if (ic.length > 6) break; } this.nomes.push({ x: sx, y: sy - 14, txt: ic, cor: '#fff', tam: 4.5 }); }
    if (z.nome) this.nomes.push({ x: sx, y: sy - (z.estados.lista.size ? 21 : 14), txt: z.nome, cor: '#ffd8a8' });
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
    if (g.caido) { this.heroiCaido(g, spr, ax, ay); return; }
    // zumbi paraquedista agarrado na perna: deitado atrás do herói, puxando
    const agarrados = h.estados.pilhas('agarrado');
    for (let k = 0; k < agarrados; k++) {
      const lx = ax - 8 - k * 5 + (k % 2) * 10, ly = ay - 2 + k * 2, mexe = Math.round(Math.sin(this.t * 8 + k) * 1);
      ctx.fillStyle = ['#4a3a6a', '#3a5a3a', '#6a3a3a'][k % 3]; ctx.fillRect(lx - 5, ly - 2, 8, 3);   // corpo deitado
      ctx.fillStyle = '#7a9a5a'; ctx.fillRect(lx + 3, ly - 3 + mexe, 4, 4);                             // cabeça
      ctx.fillStyle = '#c8302a'; ctx.fillRect(lx + 5, ly - 2 + mexe, 1, 1);
      ctx.fillStyle = '#7a9a5a'; ctx.fillRect(lx + 6, ly - 6, 1, 4); ctx.fillRect(lx + 7, ly - 6, (ax - lx) - 6 > 0 ? Math.min(6, ax - lx - 6) : 1, 1);   // braço segurando a perna
    }
    // inspirado (doação): aura dourada pulsando
    if (h.estados.tem('inspirado')) {
      const k = Math.sin(this.t * 9) * 0.5 + 0.5;
      ctx.globalAlpha = 0.25 + 0.2 * k; disc(ctx, ax, ay - 8, 15 + k * 4, '#ffd23f', 0.8); ctx.globalAlpha = 1;
      if (Math.random() < 0.4) this.particula({ x: h.x + (Math.random() - 0.5) * 0.8, y: h.y + (Math.random() - 0.5) * 0.8, z: 0.3, vz: 2, g: -0.5, life: 0.7, cor: Math.random() < 0.5 ? '#fff3a0' : '#ffd23f', tam: 1 });
    }
    const [sx, sy] = this.pessoa(spr, h.x, h.y, 1, g.fase === 'jogo' ? 1 : 0.6);
    this.heroiSpr = [sx, sy, spr];
    if ((h.invT > 0 || h.invQ > 0) && Math.floor(this.t * 10) % 2) { ctx.globalAlpha = 0.55; ctx.drawImage(this.branco(spr), sx - S.PE_X, sy - S.PE_Y); ctx.globalAlpha = 1; }
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

  // Herói caído: deitado no chão, com um anel vermelho pulsando (ou roxo, no golpe final)
  heroiCaido(g, spr, sx, sy) {
    const ctx = this.ctx, final = !!g.caido.finalizador;
    const pul = Math.sin(this.t * (final ? 14 : 7)) * 0.5 + 0.5;
    ctx.globalAlpha = 0.35 + 0.35 * pul;
    disc(ctx, sx, sy, 12 + pul * 3, final ? '#c050ff' : '#ff3a2a', 0.45);
    ctx.globalAlpha = 1;
    ctx.save();
    ctx.translate(sx + 7, sy - 2);
    ctx.rotate(-Math.PI / 2);
    ctx.drawImage(spr, -S.PE_X, -S.PE_Y);
    ctx.restore();
    this.heroiSpr = null;
    this.heroiTela = [sx, sy];
    if (Math.random() < 0.08) this.particula({ x: g.hero.x + (Math.random() - 0.5) * 0.6, y: g.hero.y + (Math.random() - 0.5) * 0.6, z: 0.05, vz: 0.2, life: 0.6, cor: '#a8282a', tam: 1 });
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

  // Conversível dos zumbis: o carro e os zumbis em pé no banco, de braços pra cima, pulando
  desenharConversivel(o) {
    const ctx = this.ctx, c = o.c;
    const s = S.spriteConversivel(o.eixo);
    const [sx, sy] = this.topoVista(o.u0, o.v0);
    ctx.drawImage(s.c, sx - s.ox, sy - s.oy);
    for (let k = 0; k < c.passageiros; k++) {
      const a = 0.6 - k * 0.45, lado = k % 2 ? 0.2 : -0.2;
      const [px, py] = this.tela(c.x + c.dx * a - c.dy * lado, c.y + c.dy * a + c.dx * lado);
      const pula = Math.round(Math.abs(Math.sin(this.t * 14 + k * 1.7)) * 3);
      const y = py - 14 - pula;
      ctx.fillStyle = ['#7a9a5a', '#8aa868', '#6a8a50', '#9ab070'][k % 4]; ctx.fillRect(px - 2, y, 5, 5);   // cabeça
      ctx.fillStyle = '#c8302a'; ctx.fillRect(px - 1, y + 1, 1, 1); ctx.fillRect(px + 2, y + 1, 1, 1);    // olhos
      ctx.fillStyle = ['#4a3a6a', '#2a4a6a', '#6a3a3a', '#3a5a3a'][k % 4]; ctx.fillRect(px - 2, y + 5, 5, 4);   // camisa
      ctx.fillStyle = '#7a9a5a';
      const braco = Math.sin(this.t * 10 + k) > 0 ? 1 : 0;   // braços pra cima, balançando
      ctx.fillRect(px - 4, y - 3 + braco, 1, 6); ctx.fillRect(px + 4, y - 3 + (1 - braco), 1, 6);
    }
    // faróis piscando e poeira atrás
    if (Math.floor(this.t * 8) % 2) {
      const [fx, fy] = this.tela(c.x + c.dx * 1.05, c.y + c.dy * 1.05, 3);
      disc(ctx, fx, fy, 3, '#fff3a0', 0.6);
    }
    if (Math.random() < 0.7) this.particula({ x: c.x - c.dx * 1.1 + (Math.random() - 0.5) * 0.6, y: c.y - c.dy * 1.1 + (Math.random() - 0.5) * 0.6, z: 0.1, vz: 0.6, life: 0.5, cor: '#8a8070', tam: 2 });
  }

  // Tomate voando: sombra no chão e o tomate no alto, girando
  // Pedra voando: sombra no chão e uma pedra cinza irregular, girando
  desenharPedra(t) {
    const ctx = this.ctx;
    const [sx, sy] = this.tela(t.x, t.y);
    const z = Math.round(t.alt * 14);
    const sh = S.sombra(4);
    ctx.globalAlpha = 0.6; ctx.drawImage(sh, sx - Math.floor(sh.width / 2), sy - 2); ctx.globalAlpha = 1;
    const y = sy - 8 - z, gira = Math.floor(this.t * 10) % 4;
    ctx.fillStyle = '#2e2e34'; ctx.fillRect(sx - 2, y - 1, 5, 4); ctx.fillRect(sx - 1, y - 2, 3, 6);
    ctx.fillStyle = '#6a6a74'; ctx.fillRect(sx - 1, y - 1, 3, 3); ctx.fillRect(sx - 2, y + (gira % 2), 4, 2);
    ctx.fillStyle = '#a8a8b2'; ctx.fillRect(sx - 1 + (gira > 1 ? 1 : 0), y - 1 + (gira % 2), 1, 1);
  }

  desenharTomate(t) {
    const ctx = this.ctx;
    const [sx, sy] = this.tela(t.x, t.y);
    const z = Math.round(t.alt * 14);
    const sh = S.sombra(4);
    ctx.globalAlpha = 0.6; ctx.drawImage(sh, sx - Math.floor(sh.width / 2), sy - 2); ctx.globalAlpha = 1;
    const y = sy - 8 - z, gira = Math.floor(this.t * 12) % 4;
    ctx.fillStyle = '#8e1410'; ctx.fillRect(sx - 2, y - 1, 5, 4); ctx.fillRect(sx - 1, y - 2, 3, 6);
    ctx.fillStyle = '#d7261c'; ctx.fillRect(sx - 1, y - 1, 3, 4); ctx.fillRect(sx - 2, y, 5, 2);
    ctx.fillStyle = '#ff7a5c'; ctx.fillRect(sx - 1 + (gira % 2), y - 1, 1, 1);
    ctx.fillStyle = '#3f7f2c'; ctx.fillRect(sx - 1 + (gira > 1 ? 1 : 0), y - 2, 2, 1);
  }

  // Zumbi descendo de paraquedas: sombra no chão crescendo, o zumbi balançando e o paraquedas listrado
  desenharParaquedista(p) {
    const ctx = this.ctx;
    const [sx, sy] = this.tela(p.x, p.y);
    const z = Math.round(p.z * 14), bal = Math.round(Math.sin(this.t * 2.5 + p.id) * 2);
    const sh = S.sombra(Math.max(4, 12 - z / 8));
    ctx.drawImage(sh, sx - Math.floor(sh.width / 2), sy - 2);
    const spr = this.quadro(S.spriteZumbi('comum', p.roupa), 0, 1, this.t * 2, true);
    ctx.drawImage(spr, sx - S.PE_X + bal, sy - S.PE_Y - z);
    const topo = sy - S.PE_Y - z - 12;
    fillPoly(ctx, [[sx - 12 + bal, topo], [sx + 12 + bal, topo], [sx + 9 + bal, topo - 6], [sx - 9 + bal, topo - 6]], '#2a2a30');
    fillPoly(ctx, [[sx - 4 + bal, topo], [sx + 4 + bal, topo], [sx + 3 + bal, topo - 6], [sx - 3 + bal, topo - 6]], '#c8302a');
    line(ctx, sx - 11 + bal, topo, sx - 3 + bal, topo + 12, '#c0c0c0'); line(ctx, sx + 11 + bal, topo, sx + 3 + bal, topo + 12, '#c0c0c0');
  }

  desenharItem(it) {
    const ctx = this.ctx;
    const [sx, sy] = this.tela(it.x, it.y);
    const s = S.spriteItem(it.kind);
    const z = Math.round(it.z * 14);
    const sh = S.sombra(Math.max(4, 12 - z / 6));
    ctx.drawImage(sh, sx - Math.floor(sh.width / 2), sy - 2);
    const brilha = it.kind === 'bau_lendario' || it.kind === 'arma' || it.kind === 'bau_medio' || it.kind === 'historia' || it.kind === 'drop' || it.kind === 'runa';
    if (brilha && z === 0) {
      const p = 0.5 + 0.5 * Math.sin(this.t * 5 + it.id);
      ctx.globalAlpha = 0.25 + 0.25 * p; disc(ctx, sx, sy - 6, 10 + p * 3, it.kind === 'bau_lendario' ? '#ffd23f' : it.kind === 'historia' ? '#fff3d0' : it.kind === 'drop' || it.kind === 'runa' ? '#b89cff' : '#9fd0ff', 0.7); ctx.globalAlpha = 1;
      if (Math.random() < 0.08) this.particula({ x: it.x + (Math.random() - 0.5) * 0.6, y: it.y + (Math.random() - 0.5) * 0.6, z: 0.5, vz: 1.2, g: -0.3, life: 0.8, cor: it.kind === 'bau_lendario' ? '#fff3a0' : '#d8f0ff', tam: 1 });
    }
    if (z > 0) { // paraquedas
      const balanca = it.paraquedas ? Math.round(Math.sin(this.t * 2.2 + it.id) * 2) : 0;   // o drop balança descendo
      ctx.fillStyle = it.kind === 'suprimento' ? '#e8e8e8' : it.kind === 'drop' ? '#ffd23f' : '#d84a3a';
      fillPoly(ctx, [[sx - 10 + balanca, sy - z - 22], [sx + 10 + balanca, sy - z - 22], [sx + 7 + balanca, sy - z - 27], [sx - 7 + balanca, sy - z - 27]], ctx.fillStyle);
      if (it.kind === 'drop') { fillPoly(ctx, [[sx - 3 + balanca, sy - z - 22], [sx + 3 + balanca, sy - z - 22], [sx + 2 + balanca, sy - z - 27], [sx - 2 + balanca, sy - z - 27]], '#8b6bff'); this.nomes.push({ x: sx + balanca, y: sy - z - 31, txt: '❓', cor: '#fff', tam: 5 }); }
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
    for (const l of [this.arremessos, this.choques, this.ondas, this.bracos]) for (const a of l) a.age += dt;
    this.bracos = this.bracos.filter(a => a.age < a.life);
    this.arremessos = this.arremessos.filter(a => a.age < a.life);
    this.choques = this.choques.filter(a => a.age < a.life);
    this.ondas = this.ondas.filter(a => a.age < a.life);
    for (const r of this.raios) r.age += dt;
    this.raios = this.raios.filter(r => r.age < r.life);
    for (const a of this.avioes) a.age += dt;
    this.avioes = this.avioes.filter(a => a.age < a.voo * 1.6);
    for (const b of this.bombasCaindo) b.age += dt;
    this.bombasCaindo = this.bombasCaindo.filter(b => b.age < b.queda);
    for (const t of this.textos) t.age += dt;
    this.textos = this.textos.filter(t => t.age < t.life);
  }

  // Ataque aéreo: a sombra do avião passa pelo chão (o avião vai lá no alto, fora da câmera) e as bombas caem
  // do céu, cada uma com a sombra crescendo no chão até bater e explodir
  desenharAvioes() {
    const ctx = this.ctx;
    for (const a of this.avioes) {
      const k = (a.age / a.voo) * 1.25 - 0.12;   // começa um pouco antes e termina um pouco depois da linha das bombas
      const x = a.x0 + (a.x1 - a.x0) * k, y = a.y0 + (a.y1 - a.y0) * k;
      const [sx, sy] = this.tela(x, y), [ex, ey] = this.tela(a.x1, a.y1), [bx, by] = this.tela(a.x0, a.y0);
      const ang = Math.atan2(ey - by, ex - bx);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(ang); ctx.scale(1.9, 1.9);   // sombra grande: o avião é grande
      ctx.globalAlpha = 0.38; ctx.fillStyle = '#05040a';
      ctx.beginPath(); ctx.ellipse(0, 0, 19, 3.2, 0, 0, Math.PI * 2); ctx.fill();                    // fuselagem
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-3, -22); ctx.lineTo(-9, -22); ctx.lineTo(-5, 0); ctx.lineTo(-9, 22); ctx.lineTo(-3, 22); ctx.closePath(); ctx.fill();   // asas
      ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-19, -8); ctx.lineTo(-22, -8); ctx.lineTo(-20, 0); ctx.lineTo(-22, 8); ctx.lineTo(-19, 8); ctx.closePath(); ctx.fill();   // cauda
      ctx.restore(); ctx.globalAlpha = 1;
    }
    for (const b of this.bombasCaindo) {
      const k = b.age / b.queda, alt = (1 - k * k) * 90;   // cai acelerando
      const [gx, gy] = this.tela(b.x, b.y);
      ctx.globalAlpha = 0.25 + 0.4 * k; disc(ctx, gx, gy, 1 + k * 4, '#05040a', 0.5); ctx.globalAlpha = 1;   // sombra crescendo
      const y = gy - alt;
      ctx.fillStyle = '#2a2a30'; ctx.fillRect(gx - 1, y - 3, 3, 6);                  // bomba
      ctx.fillStyle = '#5a5a64'; ctx.fillRect(gx - 1, y - 3, 1, 4);
      ctx.fillStyle = '#c83a2a'; ctx.fillRect(gx - 2, y - 5, 5, 1); ctx.fillRect(gx, y - 6, 1, 2);   // aletas
    }
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

  // Habilidades (habilidades.js): granada e molotov voando, raio em cadeia, onda de choque, lâminas e drone
  desenharHabilidades(g) {
    const ctx = this.ctx, h = g.hero;
    for (const a of this.arremessos) {
      const k = Math.min(1, a.age / a.life);
      const [sx, sy] = this.tela(a.x0 + (a.x1 - a.x0) * k, a.y0 + (a.y1 - a.y0) * k, 10 + Math.sin(k * Math.PI) * 28);
      if (a.tipo === 'molotov') {
        ctx.fillStyle = '#3a7a3a'; ctx.fillRect(sx - 1, sy - 2, 2, 4);
        ctx.fillStyle = Math.random() < 0.5 ? '#ffd23f' : '#ff8a2a'; ctx.fillRect(sx - 1, sy - 4, 2, 2);
      } else { disc(ctx, sx, sy, 2, '#3e4a2a', 1); ctx.fillStyle = '#c8c8c8'; ctx.fillRect(sx, sy - 3, 1, 1); }
    }
    // braço longo: estica até o alvo e volta
    for (const b of this.bracos) {
      const k = b.age / b.life, ext = k < 0.4 ? k / 0.4 : 1 - (k - 0.4) / 0.6;
      const [x0, y0] = this.tela(b.x, b.y, 13), [x1, y1] = this.tela(b.x + (b.tx - b.x) * ext, b.y + (b.ty - b.y) * ext, 10);
      line(ctx, x0, y0, x1, y1, '#6a7050', 2); line(ctx, x0, y0 - 1, x1, y1 - 1, '#9aa07a', 1);
      ctx.fillStyle = '#9aa07a'; ctx.fillRect(x1 - 1, y1 - 1, 3, 3);
    }
    for (const r of this.choques) {
      ctx.globalAlpha = 1 - r.age / r.life;
      for (let i = 0; i < r.pts.length - 1; i++) {
        const [x0, y0] = this.tela(r.pts[i][0], r.pts[i][1], i ? 8 : 12), [x1, y1] = this.tela(r.pts[i + 1][0], r.pts[i + 1][1], 8);
        // raio em zigue-zague: 4 pedaços com desvio aleatório
        let px = x0, py = y0;
        for (let s = 1; s <= 4; s++) {
          const nx = x0 + (x1 - x0) * s / 4 + (s < 4 ? (Math.random() - 0.5) * 6 : 0), ny = y0 + (y1 - y0) * s / 4 + (s < 4 ? (Math.random() - 0.5) * 6 : 0);
          line(ctx, px, py, nx, ny, '#9fe8ff', 2); line(ctx, px, py, nx, ny, '#ffffff', 1);
          px = nx; py = ny;
        }
      }
      ctx.globalAlpha = 1;
    }
    for (const o of this.ondas) {
      const k = o.age / o.life, r = o.raio * (0.25 + 0.75 * k);
      ctx.globalAlpha = 1 - k;
      let ant = null;
      for (let i = 0; i <= 24; i++) {
        const a = i / 24 * Math.PI * 2, p = this.tela(o.x + Math.cos(a) * r, o.y + Math.sin(a) * r, 2);
        if (ant) line(ctx, ant[0], ant[1], p[0], p[1], o.cor || '#cfe8ff', 2);
        ant = p;
      }
      ctx.globalAlpha = 1;
    }
    if (g.fase !== 'jogo' || g.caido || !h.habs) return;
    // habilidade suprema Aura de fogo: anel quente pulsando em volta do herói
    if (h.suprema === 'aura') {
      const r = 2.3 * (0.92 + Math.sin(this.t * 5) * 0.08);
      ctx.globalAlpha = 0.45 + Math.sin(this.t * 9) * 0.15;
      let ant = null;
      for (let i = 0; i <= 28; i++) {
        const a = i / 28 * Math.PI * 2 + this.t * 0.6, p = this.tela(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, 1);
        if (ant) line(ctx, ant[0], ant[1], p[0], p[1], i % 2 ? '#ff8a3d' : '#ffd23f', 1);
        ant = p;
      }
      ctx.globalAlpha = 1;
      if (Math.random() < 0.35) { const a = Math.random() * Math.PI * 2, d = 0.6 + Math.random() * 1.6; this.particula({ x: h.x + Math.cos(a) * d, y: h.y + Math.sin(a) * d, z: 0.1, vx: 0, vy: 0, vz: 1.2, life: 0.4, cor: Math.random() < 0.5 ? '#ff8a3d' : '#ffd23f', tam: 1 }); }
    }
    const nL = h.habs.laminas, evo = h.evo || {};
    if (nL) {
      // combo Lâminas vampíricas: 6 lâminas vermelhas, mais longe
      const vamp = evo.laminas === 'vampiricas';
      const q = vamp ? 6 : 1 + Math.ceil(nL / 2), r = vamp ? 1.55 : 1.25, giro = this.t * 22, cor = vamp ? '#ff4a5a' : '#d8dde6';
      for (let k = 0; k < q; k++) {
        const a = (h.laminaAng || 0) + k * Math.PI * 2 / q;
        const [sx, sy] = this.tela(h.x + Math.cos(a) * r, h.y + Math.sin(a) * r, 7);
        const cx = Math.cos(giro) * 3, cy = Math.sin(giro) * 3;
        line(ctx, sx - cx, sy - cy, sx + cx, sy + cy, cor, 1);
        line(ctx, sx + cy, sy - cx, sx - cy, sy + cx, cor, 1);
        ctx.fillStyle = vamp ? '#8a1020' : '#6a6a72'; ctx.fillRect(sx, sy, 1, 1);
      }
    }
    // combo Esquadrilha: 3 drones em volta
    if (h.habs.drone) for (let k = 0, nd = evo.drone === 'esquadrilha' ? 3 : 1; k < nd; k++) {
      const [wx, wy] = posDrone(g, h, k, nd);
      const [gx, gy] = this.tela(wx, wy);
      ctx.globalAlpha = 0.35; disc(ctx, gx, gy, 3, '#000', 0.5); ctx.globalAlpha = 1;
      const [sx, sy] = this.tela(wx, wy, 21 + Math.sin(this.t * 6));
      ctx.fillStyle = '#2a2f38'; ctx.fillRect(sx - 3, sy - 1, 6, 3);
      ctx.fillStyle = '#5a6270'; ctx.fillRect(sx - 2, sy - 2, 4, 1);
      const pa = Math.floor(this.t * 30) % 2;
      ctx.fillStyle = '#c8d0dc'; ctx.fillRect(sx - 6 + pa, sy - 3, 3, 1); ctx.fillRect(sx + 3 + pa, sy - 3, 3, 1);
      ctx.fillStyle = Math.floor(this.t * 3) % 2 ? '#ff3a2a' : '#5a1a1a'; ctx.fillRect(sx, sy + 1, 1, 1);
    }
  }

  desenharTracers() {
    const ctx = this.ctx;
    for (const t of this.tracers) {
      const [x0, y0] = this.tela(t.x0, t.y0, t.z0 || 11), [x1, y1] = this.tela(t.x1, t.y1, 9);
      line(ctx, x0, y0, x1, y1, t.drone ? '#9fe8ff' : t.heroi ? '#fff3a0' : '#ffe0a0');
      if (t.age < 0.03) { ctx.fillStyle = '#ffffff'; ctx.fillRect(x0 - 1, y0 - 1, 3, 3); }
    }
  }

  // Luz de um poste aceso (sx, sy = pé do poste na tela): cone da lâmpada até o chão e a poça oval.
  // Vai pra emM (buraco no escuro) e emL (a cor amarelada da luz), na ordem de profundidade.
  luzPoste(sx, sy) {
    const lx = sx + 3.5, ly = sy - 31, M = this.emM, L = this.emL;
    // buraco no escuro
    M.save(); M.translate(lx, sy); M.scale(1, 0.5);
    const gr = M.createRadialGradient(0, 0, 0, 0, 0, 30);
    gr.addColorStop(0, 'rgba(0,0,0,0.95)'); gr.addColorStop(0.7, 'rgba(0,0,0,0.6)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    M.fillStyle = gr; M.fillRect(-30, -30, 60, 60); M.restore();
    const cone = M.createLinearGradient(0, ly, 0, sy);
    cone.addColorStop(0, 'rgba(0,0,0,0.55)'); cone.addColorStop(1, 'rgba(0,0,0,0.3)');
    M.fillStyle = cone; M.beginPath(); M.moveTo(lx - 1.5, ly); M.lineTo(lx + 1.5, ly); M.lineTo(lx + 24, sy); M.lineTo(lx - 24, sy); M.closePath(); M.fill();
    // cor da luz
    const c2 = L.createLinearGradient(0, ly, 0, sy);
    c2.addColorStop(0, 'rgba(255,214,140,0.22)'); c2.addColorStop(1, 'rgba(255,190,100,0.07)');
    L.fillStyle = c2; L.beginPath(); L.moveTo(lx - 1.5, ly); L.lineTo(lx + 1.5, ly); L.lineTo(lx + 24, sy); L.lineTo(lx - 24, sy); L.closePath(); L.fill();
    L.save(); L.translate(lx, sy); L.scale(1, 0.5);
    const poca = L.createRadialGradient(0, 0, 0, 0, 0, 28);
    poca.addColorStop(0, 'rgba(255,200,120,0.16)'); poca.addColorStop(1, 'rgba(255,200,120,0)');
    L.fillStyle = poca; L.fillRect(-28, -28, 56, 56); L.restore();
    L.fillStyle = 'rgba(255,240,190,0.9)'; L.fillRect(Math.round(lx) - 1, Math.round(ly), 3, 1);
  }

  // alguns postes estão com defeito e piscam (sempre os mesmos)
  posteLigado(p) {
    const h = ((p.x * 73856093) ^ (p.y * 19349663)) >>> 0;
    if (h % 9) return true;
    const f = Math.sin(this.t * 13 + h) + Math.sin(this.t * 5.3 + h * 0.7);
    return f > -0.6;
  }

  luz(g) {
    const ctx = this.ctx, ex = this.ex;
    const noite = g.noiteT > 0 ? clamp(Math.min(g.noiteT, 3) / 3, 0, 1) : 0;
    const base = g.room ? 0.2 : 0.12;
    const a = base + noite * 0.74;   // noite: bem mais escuro (a visão fica reduzida)
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
    buraco(hx, hy, noite ? 60 : 120, 0.95);
    for (const r of this.raios) { const [sx, sy] = this.tela(r.x, r.y, 8); buraco(sx, sy, r.r * (1 - r.age / r.life * 0.5), 0.9); }
    for (const p of this.parts) if (p.fogo && Math.random() < 0.3) { const [sx, sy] = this.tela(p.x, p.y, p.z * 12); buraco(sx, sy, 16, 0.5); }
    // postes: o buraco no escuro já vem na ordem de profundidade (emM, desenhado em objetos)
    if (noite > 0 && !g.room && this.emMc) ex.drawImage(this.emMc, 0, 0);
    if (noite > 0 && !g.room) {
      const L = this.limites();
      for (const o of g.city.objectsIn(L.x0, L.y0, L.x1, L.y1)) {
        if (o.kind === 'prop' && o.p.alarme && Math.floor(this.t * 4) % 2) { const [sx, sy] = this.tela(o.p.x + 1, o.p.y + 0.5); buraco(sx, sy, 50, 0.8); }
      }
      for (const it of g.itens) if (it.kind.startsWith('bau')) { const [sx, sy] = this.tela(it.x, it.y); buraco(sx, sy, 26, 0.7); }
      for (const z of g.zonasAgora || []) if (AMBIENTE[z.tipo]?.luz && ligadoZona(z, g.t)) { const [sx, sy] = this.tela((z.x0 + z.x1) / 2, (z.y0 + z.y1) / 2); buraco(sx, sy, z.tipo === 'fogo' ? 46 : 30, 0.7); }
    }
    ex.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.escuro, 0, 0);
    if (noite > 0 && !g.room) {
      // janelas acesas e vitrines brilhando no escuro
      if (this.emc) {
        const [px, py] = this.tela(g.hero.x, g.hero.y);
        this.em.clearRect(px - 9, py - 27, 18, 29);   // o herói na frente de uma janela não fica coberto pela luz
        ctx.globalAlpha = noite; ctx.drawImage(this.emc, 0, 0); ctx.globalAlpha = 1;
      }
      // a cor da luz dos postes (cone, poça e a lâmpada), também na ordem de profundidade
      if (this.emLc) { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = noite; ctx.drawImage(this.emLc, 0, 0); ctx.globalAlpha = 1; }
      ctx.globalCompositeOperation = 'source-over';
    }
    // vinheta vermelha de vida baixa
    const pct = g.hero.vida / g.hero.vidaMax;
    if (g.fase === 'jogo' && (pct < 0.3 || g.caido)) {
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

  // Foto do espectador (zumbi do fã) numa bolinha com borda piscando em ciano e rosa
  fotoNaCabeca(n, k) {
    const tx = this.tx, r = 7.5 * k, x = n.x * k, y = n.y * k;
    this.fotos = this.fotos || new Map();
    let img = null;
    if (/^https:\/\//.test(n.foto || '')) {
      img = this.fotos.get(n.foto);
      if (!img) {
        img = new Image(); img.referrerPolicy = 'no-referrer'; img.ok = false;
        img.onload = () => { img.ok = true; }; img.onerror = () => { img.erro = true; };
        img.src = n.foto; this.fotos.set(n.foto, img);
        if (this.fotos.size > 60) this.fotos.delete(this.fotos.keys().next().value);
      }
    }
    tx.save();
    tx.beginPath(); tx.arc(x, y, r, 0, Math.PI * 2); tx.closePath();
    tx.fillStyle = '#1a1420'; tx.fill();
    if (img?.ok) { tx.clip(); tx.drawImage(img, x - r, y - r, r * 2, r * 2); }
    else {
      tx.fillStyle = '#fe2c55'; tx.fill();
      tx.fillStyle = '#ffffff'; tx.font = `700 ${Math.round(9 * k)}px "Fredoka", system-ui, sans-serif`; tx.textBaseline = 'middle';
      tx.fillText(n.inicial, x, y + 0.5 * k);
    }
    tx.restore();
    tx.beginPath(); tx.arc(x, y, r, 0, Math.PI * 2);
    tx.lineWidth = 1.6 * k; tx.strokeStyle = Math.floor(this.t * 4) % 2 ? '#25f4ee' : '#fe2c55'; tx.stroke();
    if (n.escudo) { tx.font = `700 ${Math.round(6 * k)}px system-ui, sans-serif`; tx.textBaseline = 'middle'; tx.fillText('🛡️', x + r, y - r * 0.6); }
    tx.textBaseline = 'bottom';
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
      if (n.inicial) { this.fotoNaCabeca(n, k); continue; }
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
