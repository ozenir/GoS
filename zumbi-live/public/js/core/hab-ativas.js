// ============================================================================
//  HABILIDADES ATIVAS — disparam sozinhas de tempos em tempos (ou ficam ligadas, "continua").
//
//  Cada uma tem:
//    nome, emoji, max (nível máximo: 5), cat ('ofensiva' | 'defensiva' | 'controle')
//    par     a passiva que, junto com ela, vira a HABILIDADE SUPREMA (hab-supremas.js)
//    classe  só aparece pra esse personagem (habilidade ÚNICA); sem classe = geral, todo mundo pega
//    cd(n)   segundos entre usos no nível n (a passiva Mente afiada e cia. encurtam: atributo "recarga")
//    desc(n) o que faz no nível n (aparece na carta)
//    usar(g, h, n)        dispara; devolve false se não tinha alvo (tenta de novo logo)
//    ou continua + atualizar(g, h, n, dt)   roda todo quadro (lâminas, rastro de brasa...)
//    sempre(g, h, n, dt)  (opcional) roda todo quadro além do usar
//  Os números crescem com FORCA(n): o nível 2 triplica o 1; o 5 é 10×.
// ============================================================================
import { ZUMBIS } from './dados.js';
import { dist, dist2 } from './util.js';
import {
  FORCA, f1, pct, alvos, ehChefe, ferir, area, empurrar, puxar, explosaoAmiga, onda, maiorGrupo, maisPerto, maisFortes,
  girarLaminas, jogarMolotov, tiroDeDrone, cadeiaEletrica, criarObj
} from './hab-base.js';

const cdTxt = v => f1(v) + 's';

// Joga um projétil do herói na direção (ang) com velocidade vel
function lancar(g, h, ang, o) {
  return criarObj(g, { tipo: 'projetil', x: h.x, y: h.y, vx: Math.cos(ang) * o.vel, vy: Math.sin(ang) * o.vel, ...o });
}
const anguloPara = (h, z) => Math.atan2(z.y - h.y, z.x - h.x);

export const ATIVAS = {
  /* =================== GERAIS =================== */
  granada: {
    nome: 'Granada', emoji: '💣', max: 5, cat: 'ofensiva', par: 'forca',
    cd: n => 7 - n * 0.5, dano: n => 45 * FORCA(n), raio: n => 1.6 + n * 0.2,
    desc(n) { return `joga no maior grupo a cada ${cdTxt(this.cd(n))} · ${Math.round(this.dano(n))} de dano em área`; },
    usar(g, h, n) {
      const z = maiorGrupo(g, h, 6, this.raio(n));
      if (!z) return false;
      const x = z.x, y = z.y;
      g.emit('arremesso', { tipo: 'granada', x0: h.x, y0: h.y, x1: x, y1: y, t: 0.5 });
      g.agendar(0.5, () => explosaoAmiga(g, x, y, this.raio(n), this.dano(n)));
      return true;
    }
  },
  raio: {
    nome: 'Raio em cadeia', emoji: '⚡', max: 5, cat: 'controle', par: 'mira',
    cd: n => 4.4 - n * 0.3, dano: n => 18 * FORCA(n), saltos: n => 2 + n, atordoa: n => 0.3 + n * 0.08,
    desc(n) { return `pula em ${this.saltos(n) + 1} zumbis a cada ${cdTxt(this.cd(n))} · ${Math.round(this.dano(n))} de dano, atordoa`; },
    usar(g, h, n) { return cadeiaEletrica(g, h.x, h.y, this.saltos(n), this.dano(n), { atordoa: this.atordoa(n) }); }
  },
  laminas: {
    nome: 'Lâminas giratórias', emoji: '🌀', max: 5, cat: 'ofensiva', par: 'vampiro', continua: true,
    qtd: n => 1 + Math.ceil(n / 2), dano: n => 9 * FORCA(n), raio: () => 1.25,
    desc(n) { return `${this.qtd(n)} lâminas girando em volta · ${Math.round(this.dano(n))} de dano, fazem sangrar`; },
    atualizar(g, h, n) { girarLaminas(g, h, this.qtd(n), this.raio(n) * area(g), this.dano(n), 0.2, 0); }
  },
  molotov: {
    nome: 'Coquetel molotov', emoji: '🍾', max: 5, cat: 'ofensiva', par: 'regen',
    cd: n => 7.5 - n * 0.5, dur: n => 3 + n * 0.6, tam: n => 1.3 + n * 0.2, dano: n => 12 * FORCA(n), fogo: n => FORCA(n),
    desc(n) { return `fogo no chão por ${cdTxt(this.dur(n))} a cada ${cdTxt(this.cd(n))} · fogo ${f1(this.fogo(n))}× mais forte (não queima o herói)`; },
    usar(g, h, n) {
      const z = maiorGrupo(g, h, 6, 1.4);
      if (!z) return false;
      jogarMolotov(g, h, z.x, z.y, this.tam(n), this.dur(n), this.dano(n), this.fogo(n));
      return true;
    }
  },
  drone: {
    nome: 'Drone atirador', emoji: '🛸', max: 5, cat: 'ofensiva', par: 'maos',
    cd: n => 0.9 - n * 0.08, dano: n => 6 * FORCA(n),
    desc(n) { return `um drone atira sozinho a cada ${this.cd(n).toFixed(2).replace('.', ',')}s · ${Math.round(this.dano(n))} de dano`; },
    usar(g, h, n) { return tiroDeDrone(g, h, 0, this.dano(n)); }
  },
  onda: {
    nome: 'Onda de choque', emoji: '💫', max: 5, cat: 'controle', par: 'couro',
    cd: n => 9 - n * 0.8, dano: n => 16 * FORCA(n), raio: n => 2.2 + n * 0.25,
    desc(n) { return `empurra e atordoa tudo em volta a cada ${cdTxt(this.cd(n))} · ${Math.round(this.dano(n))} de dano`; },
    usar(g, h, n) { return !!onda(g, h.x, h.y, this.raio(n), this.dano(n), { atordoa: 1, empurra: 8, minimo: 3 }); }
  },
  gelo: {
    nome: 'Granada de gelo', emoji: '❄️', max: 5, cat: 'controle', par: 'reflexos',
    cd: n => 8 - n * 0.6, dano: n => 14 * FORCA(n), raio: n => 1.6 + n * 0.15, congela: n => 1 + n * 0.25,
    desc(n) { return `congela o maior grupo por ${cdTxt(this.congela(n))} a cada ${cdTxt(this.cd(n))} · ${Math.round(this.dano(n))} de dano (congelado toma +15%)`; },
    usar(g, h, n) {
      const z = maiorGrupo(g, h, 6, this.raio(n));
      if (!z) return false;
      const x = z.x, y = z.y, r = this.raio(n) * area(g);
      g.emit('arremesso', { tipo: 'gelo', x0: h.x, y0: h.y, x1: x, y1: y, t: 0.45 });
      g.agendar(0.45, () => {
        g.emit('gelo', { x, y, raio: r });
        for (const o of alvos(g)) {
          if (dist2(o.x, o.y, x, y) > (r + ZUMBIS[o.tipo].raio) ** 2) continue;
          ferir(g, o, this.dano(n), 'impacto');
          if (!o.morto) g.aplicarStatus(o, 'congelado', { duracao: this.congela(n) * (ehChefe(o) ? 0.5 : 1) });
        }
      });
      return true;
    }
  },
  escudo: {
    nome: 'Escudo de energia', emoji: '🔰', max: 5, cat: 'defensiva', par: 'vitalidade',
    cd: n => 14 - n * 1.2, cargas: n => [0, 1, 2, 2, 3, 3][n], estouro: n => 10 * FORCA(n),
    desc(n) { return `a cada ${cdTxt(this.cd(n))} recarrega um escudo que bloqueia ${this.cargas(n)} ${this.cargas(n) > 1 ? 'golpes' : 'golpe'}; quando quebra, empurra os zumbis (${Math.round(this.estouro(n))} de dano)`; },
    usar(g, h, n) {
      if ((h.escudo || 0) >= this.cargas(n)) return false;
      h.escudo = this.cargas(n); h.escudoMax = Math.max(h.escudoMax || 0, h.escudo); h.escudoEstouro = this.estouro(n);
      g.emit('escudo', { x: h.x, y: h.y, cargas: h.escudo });
      return true;
    }
  },
  minas: {
    nome: 'Minas terrestres', emoji: '🧨', max: 5, cat: 'controle', par: 'explosao',
    cd: n => 4.5 - n * 0.3, dano: n => 30 * FORCA(n), raio: n => 1.3 + n * 0.1, maxMinas: n => 3 + n,
    desc(n) { return `planta uma mina a cada ${cdTxt(this.cd(n))} (até ${this.maxMinas(n)}) · explode quando um zumbi pisa: ${Math.round(this.dano(n))} de dano`; },
    usar(g, h, n) {
      const minhas = (g.objHab || []).filter(o => o.tipo === 'mina' && o.de === 'minas');
      if (minhas.length >= this.maxMinas(n)) return false;
      if (minhas.some(o => dist2(o.x, o.y, h.x, h.y) < 1)) return false;   // espera andar um pouco
      criarObj(g, { tipo: 'mina', de: 'minas', x: h.x, y: h.y, dano: this.dano(n), raio: this.raio(n), vida: 40 });
      return true;
    }
  },
  bumerangue: {
    nome: 'Bumerangue', emoji: '🪃', max: 5, cat: 'ofensiva', par: 'pernas',
    cd: n => 3.2 - n * 0.25, qtd: n => 1 + Math.floor(n / 3), dano: n => 12 * FORCA(n),
    desc(n) { return `joga ${this.qtd(n)} ${this.qtd(n) > 1 ? 'bumerangues' : 'bumerangue'} a cada ${cdTxt(this.cd(n))}: atravessa a fila na ida e na volta · ${Math.round(this.dano(n))} de dano`; },
    usar(g, h, n) {
      const z = maisPerto(g, h.x, h.y, 6);
      if (!z) return false;
      const a0 = anguloPara(h, z);
      for (let k = 0; k < this.qtd(n); k++) {
        const a = a0 + (k - (this.qtd(n) - 1) / 2) * 0.5;
        criarObj(g, { tipo: 'bumerangue', x: h.x, y: h.y, vel: 7, vx: Math.cos(a) * 7, vy: Math.sin(a) * 7, ida: 0.65 * area(g), dano: this.dano(n), raio: 0.45, tipoDano: 'corte', empurra: 1.5 });
      }
      return true;
    }
  },
  pulso: {
    nome: 'Pulso vital', emoji: '💗', max: 5, cat: 'defensiva', par: 'sabedoria',
    cd: n => 12 - n, cura: n => 4 + n * 1.5, dano: n => 6 * FORCA(n),
    desc(n) { return `a cada ${cdTxt(this.cd(n))} cura ${f1(this.cura(n))}% da vida e empurra quem está colado (${Math.round(this.dano(n))} de dano)`; },
    usar(g, h, n) {
      if (h.vida >= h.vidaMax * 0.97 && !alvos(g).some(z => dist2(z.x, z.y, h.x, h.y) < 2.5)) return false;
      g.curar(this.cura(n), null, true);
      onda(g, h.x, h.y, 1.8, this.dano(n), { empurra: 6, minimo: 0, cor: '#ff8ac8' });
      return true;
    }
  },
  grito: {
    nome: 'Grito de guerra', emoji: '📣', max: 5, cat: 'controle', par: 'recarga',
    cd: n => 11 - n * 0.8, raio: n => 3 + n * 0.3, medo: n => 1.5 + n * 0.3, furia: n => 2 + n * 0.4,
    desc(n) { return `a cada ${cdTxt(this.cd(n))}: os zumbis em volta fogem com medo por ${cdTxt(this.medo(n))} e o herói fica com fúria por ${cdTxt(this.furia(n))}`; },
    usar(g, h, n) {
      const z = onda(g, h.x, h.y, this.raio(n), 0, { minimo: 3, cor: '#ffb347', status: { id: 'medo', duracao: this.medo(n) } });
      if (!z) return false;
      g.aplicarStatus(h, 'furia', { duracao: this.furia(n) });
      g.emit('grito', { x: h.x, y: h.y, heroi: true });
      return true;
    }
  },

  /* =================== ÚNICAS DE CADA PERSONAGEM =================== */
  // 👮 Policial
  rajada: {
    nome: 'Rajada', emoji: '🔫', max: 5, cat: 'ofensiva', par: 'municao', classe: 'policial',
    cd: n => 2.6 - n * 0.2, balas: n => 3 + n, dano: n => 14 * FORCA(n),
    desc(n) { return `a cada ${cdTxt(this.cd(n))}: ${this.balas(n)} balas em leque que atravessam 2 zumbis · ${Math.round(this.dano(n))} de dano, podem dar crítico`; },
    usar(g, h, n) {
      const z = maiorGrupo(g, h, 6.5, 1.5);
      if (!z) return false;
      const a0 = anguloPara(h, z), q = this.balas(n);
      for (let k = 0; k < q; k++) lancar(g, h, a0 + (k - (q - 1) / 2) * 0.13, { vel: 14, vida: 0.55, dano: this.dano(n), raio: 0.2, tipoDano: 'perfuracao', furos: 2, crit: true, visual: 'bala' });
      g.emit('rajada', { x: h.x, y: h.y });
      return true;
    }
  },
  algemas: {
    nome: 'Algemas', emoji: '⛓️', max: 5, cat: 'controle', par: 'colete_tatico', classe: 'policial',
    cd: n => 7 - n * 0.5, qtd: n => [0, 1, 2, 2, 3, 3][n], prende: n => 2 + n * 0.4,
    desc(n) { return `a cada ${cdTxt(this.cd(n))} algema ${this.qtd(n)} ${this.qtd(n) > 1 ? 'zumbis mais fortes' : 'zumbi mais forte'} por ${cdTxt(this.prende(n))} (preso e marcado: +25% de dano nele)`; },
    usar(g, h, n) {
      const lista = maisFortes(g, h, 6, this.qtd(n)).filter(z => !z.estados.tem('atordoado'));
      if (!lista.length) return false;
      for (const z of lista) {
        g.aplicarStatus(z, 'atordoado', { duracao: this.prende(n) * (ehChefe(z) ? 0.4 : 1) });
        g.aplicarStatus(z, 'marcado', { duracao: this.prende(n) + 2 });
        g.emit('algemas', { pts: [[h.x, h.y], [z.x, z.y]], x: z.x, y: z.y });
      }
      return true;
    }
  },
  // 🩺 Enfermeira
  bisturi: {
    nome: 'Bisturis', emoji: '🔪', max: 5, cat: 'ofensiva', par: 'anatomia', classe: 'enfermeira',
    cd: n => 1.8 - n * 0.12, qtd: n => 2 + Math.floor(n / 2), dano: n => 10 * FORCA(n),
    desc(n) { return `a cada ${cdTxt(this.cd(n))} joga ${this.qtd(n)} bisturis que atravessam 3 zumbis · ${Math.round(this.dano(n))} de dano, fazem sangrar`; },
    usar(g, h, n) {
      const z = maisPerto(g, h.x, h.y, 6);
      if (!z) return false;
      const a0 = anguloPara(h, z), q = this.qtd(n);
      for (let k = 0; k < q; k++) lancar(g, h, a0 + (k - (q - 1) / 2) * 0.22, { vel: 9, vida: 0.75, dano: this.dano(n), raio: 0.25, tipoDano: 'corte', furos: 3, crit: true, visual: 'bisturi', status: [{ id: 'sangramento', chance: 0.5 }] });
      return true;
    }
  },
  seringa: {
    nome: 'Injeção de adrenalina', emoji: '💉', max: 5, cat: 'defensiva', par: 'plantao', classe: 'enfermeira',
    cd: n => 15 - n * 1.2, cura: n => 5 + n * 2, dur: n => 3 + n * 0.5,
    desc(n) { return `a cada ${cdTxt(this.cd(n))}: cura ${f1(this.cura(n))}%, tira os efeitos ruins e dá adrenalina por ${cdTxt(this.dur(n))} (ataca 50% mais rápido)`; },
    usar(g, h, n) {
      if (h.vida >= h.vidaMax * 0.9 && !alvos(g).some(z => dist2(z.x, z.y, h.x, h.y) < 9)) return false;
      g.curar(this.cura(n), null, true);
      h.estados.limpar('negativo');
      g.aplicarStatus(h, 'adrenalina', { duracao: this.dur(n) });
      g.emit('seringa', { x: h.x, y: h.y });
      return true;
    }
  },
  // 🧑‍🚒 Bombeira
  mangueira: {
    nome: "Jato d'água", emoji: '🚿', max: 5, cat: 'controle', par: 'musculos', classe: 'bombeiro',
    cd: n => 6 - n * 0.4, raio: n => 2.4 + n * 0.2, dano: n => 8 * FORCA(n),
    desc(n) { return `a cada ${cdTxt(this.cd(n))} um jato em volta joga os zumbis longe e deixa lentos · ${Math.round(this.dano(n))} de dano (e apaga o fogo do herói)`; },
    usar(g, h, n) {
      const z = onda(g, h.x, h.y, this.raio(n), this.dano(n), { empurra: 10, minimo: 2, cor: '#6ac8ff', status: { id: 'lento', duracao: 2.5 } });
      if (!z) return false;
      h.estados.remover('queimando');
      return true;
    }
  },
  brasa: {
    nome: 'Rastro de brasa', emoji: '♨️', max: 5, cat: 'ofensiva', par: 'epi', classe: 'bombeiro', continua: true,
    dur: n => 2 + n * 0.4, fogo: n => 0.8 * FORCA(n),
    desc(n) { return `por onde anda deixa brasa no chão por ${cdTxt(this.dur(n))} · fogo ${f1(this.fogo(n))}× mais forte (não queima o herói)`; },
    atualizar(g, h, n, dt) {
      h.brasaT = (h.brasaT ?? 0) - dt;
      if (h.brasaT > 0 || !h.andando || g.room) return;
      h.brasaT = 0.45;
      const minhas = g.zonas.filter(z => z.brasa);
      if (minhas.length >= 7 || g.zonas.length >= 24) { const v = minhas[0]; if (v) v.t = 0; else return; }
      const m = 0.55 * area(g);
      g.zonas.push({ tipo: 'fogo', brasa: true, x0: h.x - m, y0: h.y - m, x1: h.x + m, y1: h.y + m, t: this.dur(n), doHeroi: true, mult: this.fogo(n), semente: g.rng.int(1, 1e6) });
    }
  },
  // 🛵 Entregador
  pacote: {
    nome: 'Pacote-bomba', emoji: '📦', max: 5, cat: 'ofensiva', par: 'gorjeta', classe: 'entregador',
    cd: n => 2.8 - n * 0.2, dano: n => 26 * FORCA(n), raio: n => 1.5 + n * 0.12,
    desc(n) { return `a cada ${cdTxt(this.cd(n))} larga um pacote que explode logo depois · ${Math.round(this.dano(n))} de dano em quem vem atrás`; },
    usar(g, h, n) {
      if (!alvos(g).some(z => dist2(z.x, z.y, h.x, h.y) < 36)) return false;
      criarObj(g, { tipo: 'mina', de: 'pacote', visual: 'pacote', x: h.x, y: h.y, pavio: 1.2, dano: this.dano(n), raio: this.raio(n) });
      return true;
    }
  },
  turbo: {
    nome: 'Turbo', emoji: '🏍️', max: 5, cat: 'defensiva', par: 'aerodinamica', classe: 'entregador',
    cd: n => 12 - n, dur: n => 2.5 + n * 0.5, dano: n => 10 * FORCA(n),
    desc(n) { return `a cada ${cdTxt(this.cd(n))}: turbo por ${cdTxt(this.dur(n))} (+45% de velocidade e +20% de esquiva) e atropela quem estiver no caminho (${Math.round(this.dano(n))} de dano)`; },
    usar(g, h, n) {
      if (!alvos(g).some(z => dist2(z.x, z.y, h.x, h.y) < 16)) return false;
      g.aplicarStatus(h, 'turbo', { duracao: this.dur(n) });
      return true;
    },
    sempre(g, h, n) {
      if (!h.estados.tem('turbo')) return;
      for (const z of alvos(g)) {
        if (dist2(z.x, z.y, h.x, h.y) > (0.75 + ZUMBIS[z.tipo].raio) ** 2 || (z.turboT || 0) > g.t) continue;
        z.turboT = g.t + 0.5;
        ferir(g, z, this.dano(n), 'impacto');
        empurrar(z, h.x, h.y, 6);
      }
    }
  },
  // 🔧 Mecânico
  torreta: {
    nome: 'Torreta', emoji: '📡', max: 5, cat: 'ofensiva', par: 'engenharia', classe: 'mecanico',
    cd: n => 10 - n * 0.6, dur: n => 6 + n, dano: n => 7 * FORCA(n), maxT: n => n >= 5 ? 3 : 2,
    desc(n) { return `a cada ${cdTxt(this.cd(n))} monta uma torreta que atira por ${cdTxt(this.dur(n))} (até ${this.maxT(n)}) · ${Math.round(this.dano(n))} de dano por tiro`; },
    usar(g, h, n) {
      const minhas = (g.objHab || []).filter(o => o.tipo === 'torreta' && o.de === 'torreta');
      if (minhas.length >= this.maxT(n) || !alvos(g).some(z => dist2(z.x, z.y, h.x, h.y) < 49)) return false;
      criarObj(g, { tipo: 'torreta', de: 'torreta', x: h.x, y: h.y, cd: 0.35, dano: this.dano(n), vida: this.dur(n), alcance: 6 });
      return true;
    }
  },
  eletroima: {
    nome: 'Eletroímã', emoji: '🧲', max: 5, cat: 'controle', par: 'blindagem', classe: 'mecanico',
    cd: n => 7 - n * 0.5, raio: n => 4 + n * 0.3, dano: n => 18 * FORCA(n),
    desc(n) { return `a cada ${cdTxt(this.cd(n))} puxa os zumbis pra um ponto e dá um choque · ${Math.round(this.dano(n))} de dano, atordoa`; },
    usar(g, h, n) {
      const c = maiorGrupo(g, h, 5, 2.5);
      if (!c) return false;
      const x = c.x, y = c.y, r = this.raio(n) * area(g);
      const pegos = alvos(g).filter(z => dist2(z.x, z.y, x, y) < r * r);
      for (const z of pegos) puxar(z, x, y, 6);
      g.emit('ima', { x, y, raio: r });
      g.agendar(0.5, () => {
        const pts = [[x, y]];
        for (const z of alvos(g)) {
          if (dist2(z.x, z.y, x, y) > 2.2 * 2.2) continue;
          ferir(g, z, this.dano(n), 'eletrico');
          if (!z.morto) g.aplicarStatus(z, 'atordoado', { duracao: 0.8 });
          if (pts.length < 7) pts.push([z.x, z.y]);
        }
        if (pts.length > 1) g.emit('raio', { pts, cor: '#c58bff' });
      });
      return true;
    }
  }
};
