// ============================================================================
//  CENA DO PORTAL (core/portal.js) — muda tudo: a câmera vai pra trás do herói e a rua vira um CORREDOR APERTADO
//  (de hospital ou de delegacia, sorteado), em perspectiva: paredes dos dois lados com portas, placas e corrimão,
//  luz fluorescente no teto (às vezes piscando), piso de ladrilho e um vórtice roxo no fim do corredor.
//  Os 3 portais vêm pela estrada (1 esquerda, 2 meio, 3 direita) chegando junto com o relógio da votação;
//  fechou, o herói muda de pista e atravessa o escolhido (clarão azul = bom, vermelho = ruim).
//  No fim, o guardião: os dois poderes se drenam até sobrar o mais forte. Ganhou: 3 portais dourados com as
//  relíquias. Tudo em pixel art no canvas do jogo (216 x 384); os números e textos no canvas de texto.
// ============================================================================
import * as S from './sprites.js';
import { CLASSES } from '../core/dados.js';
import { PORTAL, RELIQUIAS } from '../core/portal.js';
import { clamp } from '../core/util.js';

const Y0 = 150;                 // horizonte
const FUNDO = 384 + 30;         // onde fica a distância 1 (um pouco abaixo da tela)
const LARG = 200;               // meia-largura da estrada na distância 1
const D_HEROI = 2.3;            // distância do herói até a câmera
const TETO = 0.85;              // altura do teto (em relação à distância do chão)
const FIM = 24;                 // onde o corredor acaba (o vórtice)
const NEVOA = [14, 10, 22];
// cores dos corredores: [r,g,b]
const TEMAS = {
  hospital: { pisoA: [176, 190, 182], pisoB: [140, 156, 150], teto: [150, 156, 160], luz: [255, 250, 225], alto: [184, 196, 188], baixo: [78, 140, 120],
    corrimao: [215, 220, 220], rodape: [50, 60, 58], porta: [96, 120, 140], batente: [40, 50, 60], vidro: [40, 70, 100], placa: [200, 40, 40], placa2: [240, 240, 240] },
  delegacia: { pisoA: [92, 96, 108], pisoB: [70, 74, 86], teto: [110, 114, 124], luz: [230, 240, 255], alto: [126, 136, 156], baixo: [52, 66, 100],
    corrimao: [160, 160, 170], rodape: [30, 32, 40], porta: [110, 76, 48], batente: [50, 36, 24], vidro: [36, 52, 70], placa: [30, 60, 140], placa2: [230, 190, 60] }
};
const COR = { bom: '#3fa9ff', ruim: '#ff4a4a', misterio: '#b06bff', ouro: '#ffd23f' };
const yDe = d => Y0 + (FUNDO - Y0) / d;
const meia = d => LARG / d;
const pista = (d, k) => 108 + (k - 1) * 0.6 * meia(d);
const ease = x => 1 - Math.pow(1 - clamp(x, 0, 1), 2);

export class CenaPortal {
  constructor() {
    this.tema = TEMAS[Math.random() < 0.5 ? 'hospital' : 'delegacia'];
    this.anda = 0; this.apagao = 0;
  }

  // O corredor, pixel a pixel (chão, teto e paredes em perspectiva de um ponto só)
  corredor(ctx, t, dt) {
    if (!this.img) { this.img = ctx.createImageData(216, 384); this.buf = new Uint32Array(this.img.data.buffer); }
    const T = this.tema, buf = this.buf, A = this.anda, K = FUNDO - Y0;
    // a luz fluorescente às vezes falha
    if (this.apagao > 0) this.apagao -= dt; else if (Math.random() < dt * 0.25) this.apagao = 0.08 + Math.random() * 0.15;
    const luzGeral = this.apagao > 0 ? 0.6 : 1;
    let i = 0;
    for (let y = 0; y < 384; y++) {
      for (let x = 0; x < 216; x++, i++) {
        const dx = x - 107.5, adx = Math.abs(dx);
        let d, c, brilho = 1;
        const dChao = y > Y0 ? K / (y - Y0 + 0.5) : Infinity;
        const dTeto = y < Y0 ? K * TETO / (Y0 - y + 0.5) : Infinity;
        if (dChao < FIM && adx <= LARG / dChao) {
          d = dChao; const u = d + A, X = dx / (LARG / d);
          c = ((Math.floor(u * 1.8) + Math.floor((X + 1) * 3.5)) & 1) ? T.pisoA : T.pisoB;
          if (u % 3.2 < 0.7 && Math.abs(X) < 0.35) brilho = 1.18;   // reflexo da luz do teto no piso
        } else if (dTeto < FIM && adx <= LARG / dTeto) {
          d = dTeto; const u = d + A, X = dx / (LARG / d);
          const painel = u % 3.2 < 0.55 && Math.abs(X) < 0.3;
          const falha = painel && (Math.floor(u / 3.2) % 7 === 3) && Math.sin(t * 23) > 0.2;   // uma lâmpada com defeito
          c = painel && !falha ? T.luz : T.teto;
          if (painel && !falha) brilho = 1.1;
        } else {
          d = LARG / Math.max(adx, 0.01);
          if (d >= FIM) { c = [26, 10, 42]; d = FIM; }
          else {
            const yf = Y0 + K / d, yc = Y0 - K * TETO / d, rel = (y - yc) / (yf - yc), lado = dx < 0 ? 0 : 1;
            const u = d + A, m = (u + lado * 2.3) % 6, q = (u + lado * 4.1) % 13;
            if (m < 1.2 && rel > 0.22) {                                   // porta
              c = (m < 0.12 || m > 1.08 || rel < 0.26) ? T.batente : (rel > 0.3 && rel < 0.48 && m > 0.35 && m < 0.85) ? T.vidro : T.porta;
            } else if (q > 7 && q < 8.2 && rel > 0.28 && rel < 0.46) {       // placa na parede
              c = (q > 7.4 && q < 7.8) || (rel > 0.35 && rel < 0.39) ? T.placa2 : T.placa;
            } else if (rel > 0.96) c = T.rodape;
            else if (rel > 0.6 && rel < 0.64) c = T.corrimao;
            else c = rel > 0.64 ? T.baixo : T.alto;
            if (lado === 1) brilho *= 0.88;   // um lado um pouco mais escuro
          }
        }
        // luz: cai com a distância e vira névoa no fundo
        const f = Math.min(1, Math.pow(d / FIM, 0.85)), b = brilho * luzGeral * (1 - 0.15 * f);
        const r = c[0] * b * (1 - f) + NEVOA[0] * f, g = c[1] * b * (1 - f) + NEVOA[1] * f, bl = c[2] * b * (1 - f) + NEVOA[2] * f;
        buf[i] = 0xff000000 | (Math.min(255, bl) << 16) | (Math.min(255, g) << 8) | Math.min(255, r);
      }
    }
    ctx.putImageData(this.img, 0, 0);
    // o vórtice no fim do corredor
    for (let k = 5; k >= 1; k--) {
      ctx.strokeStyle = k % 2 ? 'rgba(176,107,255,0.7)' : 'rgba(63,169,255,0.55)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(108, Y0 - 1, k * 1.6 + Math.sin(t * 3 + k) * 0.4, k * 1.4, t * (k % 2 ? 1.5 : -1.5), 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = '#fff6ff'; ctx.globalAlpha = 0.85 + 0.15 * Math.sin(t * 6); ctx.fillRect(107, Y0 - 2, 2, 2); ctx.globalAlpha = 1;
  }

  desenhar(r, g, dt) {
    const ctx = r.ctx, P = g.portal, t = r.t;
    const correndo = P.fase === 'entrando' || P.fase === 'votando' || P.fase === 'atravessando';
    this.anda += dt * (correndo ? (P.fase === 'atravessando' ? 9 : 4) : 0.6);
    this.corredor(ctx, t, dt);

    this.textos = [];
    // portais (rodada ou prêmio)
    const portais = this.quaisPortais(P);
    if (portais) {
      for (let k = 0; k < 3; k++) {
        const o = portais.ops[k];
        if (portais.passado && portais.d < 1.05) continue;
        this.portal(ctx, portais.d, k, o, portais.lider === k, t);
      }
    }
    // guardião
    if (P.fase === 'duelo' || P.fase === 'perdeu') this.guardiao(r, P, t);   // venceu: o guardião some
    // herói (de costas, correndo), na pista do portal que escolheu
    this.heroi(r, g, P, t);

    // efeito de passar pelo portal: clarão da cor
    if (P.fase === 'atravessando' && P.passou) {
      const k = clamp((P.t - 0.75) / 0.5, 0, 1), a = k > 0 && k < 1 ? Math.sin(k * Math.PI) * 0.6 : 0;
      if (a > 0) { ctx.fillStyle = P.passou.bom ? '#bfe4ff' : '#ffb0a8'; ctx.globalAlpha = a; ctx.fillRect(0, 0, 216, 384); ctx.globalAlpha = 1; }
    }
    // entrada e saída: clarão do vórtice
    if (P.fase === 'entrando') { ctx.fillStyle = '#f0e0ff'; ctx.globalAlpha = clamp(1 - P.t / PORTAL.entrar, 0, 1); ctx.fillRect(0, 0, 216, 384); ctx.globalAlpha = 1; }
    if (P.fase === 'saindo') { ctx.fillStyle = '#f0e0ff'; ctx.globalAlpha = clamp(P.t / PORTAL.sair, 0, 1); ctx.fillRect(0, 0, 216, 384); ctx.globalAlpha = 1; }
    if (r.flash) { ctx.fillStyle = r.flash.cor; ctx.globalAlpha = r.flash.a; ctx.fillRect(0, 0, 216, 384); ctx.globalAlpha = 1; r.flash.a -= dt * 2.2; if (r.flash.a <= 0) r.flash = null; }
    this.escreverTudo(r, g, P, t);
  }

  // onde estão os portais agora: chegam com o relógio da votação; depois o herói atravessa
  quaisPortais(P) {
    if (P.fase === 'votando' || P.fase === 'premio') {
      const tot = P.voto.duracao + P.voto.atraso, frac = 1 - P.voto.t / tot;
      const ops = P.fase === 'premio' ? P.premio.map(id => ({ rotulo: RELIQUIAS[id].emoji, nome: RELIQUIAS[id].nome, lado: 'ouro' })) : P.rodadas[P.rodada];
      const max = Math.max(...P.voto.opcoes.map(o => o.votos));
      const lider = max > 0 ? P.voto.opcoes.findIndex(o => o.votos === max) : -1;
      return { ops, d: 16 - 13.4 * ease(frac * 1.15), lider, votos: P.voto.opcoes.map(o => o.votos) };
    }
    if (P.fase === 'atravessando') return { ops: P.rodadas[P.rodada], d: 2.6 - 1.7 * ease(P.t / 1.3), lider: P.passou.k, passado: true };
    return null;
  }

  portal(ctx, d, k, o, lider, t) {
    const hw = meia(d), x = pista(d, k), rx = 0.27 * hw, ry = rx * 1.45, cy = yDe(d) - ry;
    if (rx < 1.5) return;
    const cor = COR[o.lado] || COR.misterio;
    // dentro: véu da cor girando
    ctx.globalAlpha = 0.28; ctx.fillStyle = cor; ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fill();
    ctx.globalAlpha = 0.5; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = Math.max(1, rx * 0.06);
    for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.ellipse(x, cy, rx * (0.3 + i * 0.22), ry * (0.3 + i * 0.22), 0, t * 2 + i * 2, t * 2 + i * 2 + 2.2); ctx.stroke(); }
    // aro
    ctx.globalAlpha = 1; ctx.strokeStyle = cor; ctx.lineWidth = Math.max(1.5, rx * (lider ? 0.24 : 0.16));
    ctx.beginPath(); ctx.ellipse(x, cy, rx, ry, 0, 0, Math.PI * 2); ctx.stroke();
    if (lider) { ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 8); ctx.lineWidth = rx * 0.45; ctx.beginPath(); ctx.ellipse(x, cy, rx * 1.12, ry * 1.1, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
    // pilares
    ctx.fillStyle = '#1a1030'; ctx.fillRect(x - rx - rx * 0.12, cy, rx * 0.16, ry); ctx.fillRect(x + rx - rx * 0.04, cy, rx * 0.16, ry);
    this.textos.push({ tipo: 'portal', x, y: cy, rx, ry, rotulo: o.rotulo, nome: o.nome, n: k + 1, cor, lider, ouro: o.lado === 'ouro' });
  }

  guardiao(r, P, t) {
    const ctx = r.ctx;
    const chega = P.fase === 'duelo' ? ease(P.t / 1) : 1;
    const d = 12 - 7.5 * chega, s = 13 / d, x = 108, y = yDe(d);
    const set = S.spriteZumbi('colosso', 3), spr = set.frente[Math.floor(t * 3) % 4];
    // aura
    ctx.globalAlpha = 0.35 + 0.15 * Math.sin(t * 5); ctx.fillStyle = '#7a1aff';
    ctx.beginPath(); ctx.ellipse(x, y - 15 * s, 13 * s, 17 * s, 0, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    ctx.drawImage(spr, Math.round(x - S.PE_X * s), Math.round(y - S.PE_Y * s), Math.round(S.SPR_W * s), Math.round(S.SPR_H * s));
    // olhos brilhando
    ctx.fillStyle = '#ff3af0'; ctx.fillRect(Math.round(x - 2 * s), Math.round(y - 21 * s), Math.max(1, Math.round(s)), Math.max(1, Math.round(s)));
    ctx.fillRect(Math.round(x + 1 * s), Math.round(y - 21 * s), Math.max(1, Math.round(s)), Math.max(1, Math.round(s)));
    this.textos.push({ tipo: 'guardiao', x, y: y - S.PE_Y * s - 4 });
    // duelo: raios entre os dois
    if (P.fase === 'duelo' && P.t > 1 && P.t < PORTAL.duelo - 0.4) {
      const hx = this.hx ?? 108, hy = yDe(D_HEROI) - 30;
      ctx.lineWidth = 2;
      for (let i = 0; i < 2; i++) {
        ctx.strokeStyle = i ? '#3fa9ff' : '#ff3af0'; ctx.globalAlpha = 0.6 + 0.4 * Math.random();
        ctx.beginPath(); ctx.moveTo(hx, hy);
        for (let k = 1; k < 6; k++) ctx.lineTo(hx + (x - hx) * k / 6 + (Math.random() - 0.5) * 10, hy + (y - 15 * s - hy) * k / 6 + (Math.random() - 0.5) * 8);
        ctx.lineTo(x, y - 15 * s); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (Math.random() < 0.3) r.tremer(2);
    }
  }

  heroi(r, g, P, t) {
    const ctx = r.ctx, h = g.hero;
    const set = S.spriteHeroi(CLASSES[h.classe].roupa);
    const correndo = P.fase !== 'duelo' && P.fase !== 'ganhou' && P.fase !== 'perdeu' && P.fase !== 'premio';
    const spr = set.costas[correndo ? Math.floor(t * 10) % 4 : 0];
    let alvo = 108;
    if (P.fase === 'atravessando' && P.passou) alvo = pista(D_HEROI, P.passou.k);
    this.hx = (this.hx ?? 108) + (alvo - (this.hx ?? 108)) * Math.min(1, r.dtUlt * 5);
    if (P.fase === 'votando' || P.fase === 'entrando' || P.fase === 'duelo') this.hx += (108 - this.hx) * Math.min(1, r.dtUlt * 3);
    const y = yDe(D_HEROI), bob = correndo ? Math.round(Math.abs(Math.sin(t * 10)) * 2) : 0, s = 2;
    const sh = S.sombra(14); ctx.globalAlpha = 0.6; ctx.drawImage(sh, this.hx - sh.width / 2, y - 3); ctx.globalAlpha = 1;
    ctx.drawImage(spr, Math.round(this.hx - S.PE_X * s), Math.round(y - S.PE_Y * s - bob), S.SPR_W * s, S.SPR_H * s);
    this.textos.push({ tipo: 'heroi', x: this.hx, y: y + 12 });   // o poder fica embaixo dos pés (não cobre os portais)
  }

  // números e textos (canvas de texto, nítido)
  escreverTudo(r, g, P, t) {
    const tc = r.tc, tx = r.tx, k = tc.width / 216;
    tx.clearRect(0, 0, tc.width, tc.height);
    tx.textAlign = 'center'; tx.textBaseline = 'middle'; tx.lineJoin = 'round';
    const escrever = (txt, x, y, tam, cor, borda = 'rgba(10,6,20,0.95)') => {
      tx.font = `700 ${Math.round(tam * k)}px "Fredoka", system-ui, sans-serif`;
      tx.lineWidth = Math.max(2, tam * k * 0.3); tx.strokeStyle = borda; tx.strokeText(txt, x * k, y * k);
      tx.fillStyle = cor; tx.fillText(txt, x * k, y * k);
    };
    // dreno do duelo
    const dreno = P.fase === 'duelo' ? Math.min(P.poder, P.guardiao) * ease((P.t - 1) / (PORTAL.duelo - 1.5)) : (P.fase === 'premio' || P.fase === 'perdeu' || P.fase === 'ganhou') ? Math.min(P.poder, P.guardiao) : 0;
    for (const o of this.textos) {
      if (o.tipo === 'portal') {
        const tam = clamp(o.rx * (o.ouro ? 0.95 : 0.8), 4, 26);
        escrever(o.rotulo, o.x, o.y, tam, '#ffffff', o.cor === COR.ruim ? '#5a0a0a' : '#0a1a3a');
        // número da pista em cima
        const ny = o.y - o.ry - clamp(o.rx * 0.35, 3, 9), nr = clamp(o.rx * 0.32, 3, 9);
        tx.beginPath(); tx.arc(o.x * k, ny * k, nr * k, 0, Math.PI * 2); tx.fillStyle = 'rgba(10,6,20,0.9)'; tx.fill();
        tx.lineWidth = Math.max(1.5, nr * k * 0.18); tx.strokeStyle = o.lider ? '#ffd23f' : o.cor; tx.stroke();
        escrever(String(o.n), o.x, ny + nr * 0.05, nr * 1.3, o.lider ? '#ffd23f' : '#ffffff');
      } else if (o.tipo === 'heroi') {
        const v = Math.max(0, Math.round((P.mostrado ?? P.poder) - dreno));
        escrever(`⚡ ${v}`, o.x, o.y, 13, '#9dfcff');
      } else if (o.tipo === 'guardiao') {
        escrever(`👹 ${Math.max(0, Math.round(P.guardiao - dreno))}`, o.x, o.y - 4, 12, '#ff9af0');
      }
    }
    // o que o portal fez (sobe em cima do herói)
    if (P.fase === 'atravessando' && P.passou && P.t > 0.8) {
      const a = clamp(1 - (P.t - 1.4) / 0.4, 0, 1), sobe = (P.t - 0.8) * 18;
      tx.globalAlpha = a; escrever(P.passou.rotulo, this.hx ?? 108, yDe(D_HEROI) - 62 - sobe, 18, P.passou.bom ? '#7dffb0' : '#ff7a6a'); tx.globalAlpha = 1;
    }
    // títulos da cena
    const meio = (txt, y, tam, cor) => escrever(txt, 108, y, tam, cor);
    if (P.fase === 'entrando' || (P.fase === 'votando' && P.rodada === 0 && P.t < 2.5)) {
      meio('🌀 PORTAL DOS 500', 190, 17, '#e8d0ff');
      meio(`passe pelos portais e vença o guardião (👹 ${P.guardiao})`, 208, 6.5, '#ffffff');
    } else if (P.fase === 'votando' || P.fase === 'atravessando') meio(`RODADA ${P.rodada + 1}/${P.rodadas.length}  ·  guardião 👹 ${P.guardiao}`, Y0 + 12, 6, '#d8c8ff');
    if (P.fase === 'duelo' && P.t < 1.2) meio('⚔️ O GUARDIÃO!', 200, 15, '#ff9af0');
    if (P.fase === 'premio') { meio('🏆 VENCEU O GUARDIÃO!', 186, 14, '#ffd23f'); meio('escolha a relíquia: 1, 2 ou 3', 202, 7, '#ffffff'); }
    if (P.fase === 'perdeu') { meio('NÃO PASSOU...', 196, 16, '#ff7a6a'); meio('o guardião era mais forte', 212, 7, '#ffffff'); }
    if (P.fase === 'ganhou' && P.reliquia) {
      const R = RELIQUIAS[P.reliquia], pulsa = 1 + 0.08 * Math.sin(t * 6);
      meio(R.emoji, 200, 34 * pulsa, '#ffffff');
      meio(R.nome.toUpperCase(), 228, 11, '#ffd23f');
      const linhas = [], palavras = R.desc.split(' ');
      for (const p of palavras) { if (!linhas.length || (linhas[linhas.length - 1] + ' ' + p).length > 40) linhas.push(p); else linhas[linhas.length - 1] += ' ' + p; }
      linhas.forEach((l, n) => meio(l, 242 + n * 8, 6, '#ffffff'));
    }
  }
}
