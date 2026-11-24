// ============================================================================
//  A TELA DA HISTÓRIA (core/prologo.js): a escolha do herói pelo chat, o cinema da introdução,
//  a votação do caminho e a queda da moto. Fica por cima do jogo (index.html → #pro) e some quando
//  a partida começa. Os rostos vêm de view/retratos.js; os filmes, de view/cinema.js.
// ============================================================================
import { PROLOGO } from '../core/prologo.js';
import { retrato, INFO_HEROI } from './retratos.js';
import { Cinema } from './cinema.js';

const $ = id => document.getElementById(id);

export class TelaHistoria {
  constructor() {
    this.raiz = $('pro'); this.escolha = $('pro-escolha'); this.cine = $('pro-cinema'); this.frame = $('frame');
    this.cinema = new Cinema($('cine'), $('cine-leg'));
    this.cards = [];
    for (const h of PROLOGO.herois) {
      const el = document.createElement('div'); el.className = 'pe-card';
      const cv = document.createElement('canvas'); cv.width = 92; cv.height = 56;
      el.innerHTML = '<span class="pe-num"></span><span class="pe-nome"></span><span class="pe-quem"></span><span class="pe-voto"><span class="pe-barra"><i></i></span><span class="pe-qtd">0</span></span>';
      el.prepend(cv);
      el.querySelector('.pe-num').textContent = h.n;
      $('pe-grade').append(el);
      this.cards.push({ h, el, cv, x: cv.getContext('2d'), barra: el.querySelector('.pe-barra i'), qtd: el.querySelector('.pe-qtd') });
    }
    this.etapa = null;
  }
  usarAudio(ac, saida) { this.cinema.usarAudio(ac, saida); }

  update(g, dt) {
    const p = g.prologo;
    this.frame.classList.toggle('em-prologo', !!p);
    if (!p) { if (this.etapa) { this.raiz.hidden = true; this.cinema.parar(); this.etapa = null; } return; }
    this.raiz.hidden = false;
    const naEscolha = p.etapa === 'escolha' || p.etapa === 'escolhido';
    this.escolha.hidden = !naEscolha; this.cine.hidden = naEscolha;
    if (p.etapa !== this.etapa) this.mudou(g, p);
    this.etapa = p.etapa;
    if (naEscolha) this.desenharEscolha(g, p);
    else this.desenharCinema(g, p, dt);
  }

  mudou(g, p) {
    if (p.etapa === 'escolha') {
      $('pe-res').hidden = true;
      for (const c of this.cards) {
        const trancado = !p.voto.opcoes.some(o => o.id === c.h.classe);
        const info = INFO_HEROI(c.h.classe);
        c.trancado = trancado;
        c.el.classList.toggle('trancado', trancado); c.el.classList.remove('venceu', 'perdeu');
        c.el.querySelector('.pe-nome').textContent = trancado ? '???' : c.h.nome;
        c.el.querySelector('.pe-quem').textContent = trancado ? '🔒 Chegue a um final com qualquer herói para liberar.' : info?.quem || '';
      }
    } else if (p.etapa === 'escolhido') {
      for (const c of this.cards) { c.el.classList.toggle('venceu', c.h.classe === p.classe); c.el.classList.toggle('perdeu', c.h.classe !== p.classe); }
      const h = PROLOGO.herois.find(x => x.classe === p.classe), info = INFO_HEROI(p.classe);
      $('pe-venc').textContent = (h?.nome || '').toUpperCase();
      const quem = g.proximoNome?.nick;
      $('pe-venc2').textContent = quem ? `vivido por ${quem}` : (info?.quem || '');
      $('pe-res').hidden = false;
    }
    if (p.etapa === 'caminho') this.montarVoto(p);
    if (p.etapa !== 'caminho' && p.etapa !== 'caminho_res') $('cine-voto').hidden = true;
    // o nome de quem vive o herói entra nas legendas no lugar do nome original
    const h = PROLOGO.herois.find(x => x.classe === (p.classe || g.hero.classe));
    const nick = g.hero?.viewer?.nick;
    this.cinema.trocas = h && nick ? [[h.nome, nick]] : [];
    $('cine-quem').textContent = h ? (nick ? `${nick} · ${h.nome}` : h.nome).toUpperCase() : '';
  }

  desenharEscolha(g, p) {
    const V = p.voto, max = Math.max(1, ...V.opcoes.map(o => o.votos));
    for (const c of this.cards) {
      const r = retrato(c.h.classe, g.t + p.t, c.trancado);
      if (r) c.x.drawImage(r, 0, 0);
      const o = V.opcoes.find(x => x.id === c.h.classe);
      if (o) { c.barra.style.width = (o.votos / max * 100).toFixed(0) + '%'; c.qtd.textContent = o.votos; }
    }
    const resta = p.etapa === 'escolha' ? V.restanteNaTela : 0;
    $('pe-seg').textContent = V.contandoAtrasados ? '⏳' : Math.ceil(resta) + 's';
    $('pe-barra').style.width = (resta / V.duracao * 100).toFixed(1) + '%';
  }

  desenharCinema(g, p, dt) {
    if (p.cap === 'cartao') {
      const h = PROLOGO.herois.find(x => x.classe === p.classe), info = INFO_HEROI(p.classe);
      this.cinema.cartao(p.classe, { dur: p.dur, linha1: 'Porto Sereno. Terceira noite da Febre Cinza.', linha2: `${g.hero?.viewer?.nick || h?.nome}. ${info?.quem || ''}` }, p.t, dt);
      return;
    }
    // depois do filme, a última cena continua mexendo por trás da votação do caminho
    const t = p.etapa === 'caminho' || p.etapa === 'caminho_res' ? PROLOGO.filmes[p.classe].dur + p.t : p.t;
    this.cinema.quadro(p.cap, t, dt, p.etapa === 'acidente');
    if (p.etapa === 'caminho' || p.etapa === 'caminho_res') this.atualizarVoto(p);
  }

  montarVoto(p) {
    const box = $('cv-ops'); box.innerHTML = '';
    this.ops = p.voto.opcoes.map(o => {
      const b = document.createElement('div'); b.className = 'cv-op' + (o.n === 1 ? ' fria' : '');
      b.innerHTML = '<b><span class="n"></span><span class="t"></span></b><span class="d"></span><span class="pe-voto"><span class="pe-barra"><i></i></span><span class="pe-qtd">0</span></span>';
      b.querySelector('.n').textContent = o.n; b.querySelector('.t').textContent = `${o.emoji} ${o.nome}`; b.querySelector('.d').textContent = o.txt;
      box.append(b);
      return { o, b, barra: b.querySelector('.pe-barra i'), qtd: b.querySelector('.pe-qtd') };
    });
    $('cine-voto').hidden = false;
  }
  atualizarVoto(p) {
    const V = p.voto, max = Math.max(1, ...V.opcoes.map(o => o.votos));
    for (const k of this.ops || []) {
      const o = V.opcoes.find(x => x.id === k.o.id);
      k.barra.style.width = (o.votos / max * 100).toFixed(0) + '%'; k.qtd.textContent = o.votos;
      if (p.etapa === 'caminho_res') { k.b.classList.toggle('venceu', o.id === p.res.id); k.b.classList.toggle('perdeu', o.id !== p.res.id); }
    }
    const resta = p.etapa === 'caminho' ? V.restanteNaTela : 0;
    $('cv-seg').textContent = p.etapa === 'caminho_res' ? '' : V.contandoAtrasados ? '⏳' : Math.ceil(resta) + 's';
    $('cv-barra').style.width = (resta / V.duracao * 100).toFixed(1) + '%';
    $('cv-tit').textContent = p.etapa === 'caminho_res' ? 'O CHAT DECIDIU' : 'O CHAT DECIDE · digite 1 ou 2';
  }
}
