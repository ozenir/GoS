// ============================================================================
//  HABILIDADES SUPREMAS e NÍVEL DEUS
//
//  SUPREMA = uma habilidade no nível 5 + a passiva par dela no nível 3 (a receita: ativa.par / passiva.par).
//  Quando o chat escolhe a carta SUPREMA, a habilidade e a passiva saem dos slots (libera 1 vaga de cada,
//  pra pegar coisa nova) e viram uma habilidade bem mais forte. O bônus da passiva fica.
//  Cada personagem tem as 12 supremas gerais e 2 só dele (das habilidades e passivas únicas).
//  As supremas ficam no NÚCLEO (o círculo do painel): cabem 6. Cada suprema a mais deixa todas mais fortes
//  (multSuprema). Com 6 supremas, o chat escolhe o poder NÍVEL DEUS: 3 gerais (ofensivo, defensivo, controle)
//  e 1 de cada personagem (aparece se o herói fez pelo menos uma suprema única dele).
//
//  Cada suprema/deus tem: nome, emoji, cat, desc(), poder (número da tabela do T) e um destes:
//    cd + usar(g, h, m)            dispara de tempos em tempos (false = sem alvo, tenta logo)
//    continua + atualizar(g, h, m, dt)
//    sempre(g, h, m, dt)           roda todo quadro (além do resto)
//    salvar(g, h, m)               segura o herói quando a vida fica baixa ou o golpe ia derrubar (true = salvou)
//    aoMatar(g, h, z, m)           chamado quando um zumbi morre
//    mods                          bônus fixos de atributo [{ attr, mult | soma }]
//  m = multSuprema(h): a força de todas as supremas (cresce com cada suprema feita e com o nível deus)
// ============================================================================
import { ZUMBIS } from './dados.js';
import { dist2 } from './util.js';
import {
  alvos, ehChefe, ferir, area, empurrar, puxar, explosaoAmiga, onda, maiorGrupo,
  girarLaminas, jogarMolotov, tiroDeDrone, cadeiaEletrica, criarObj, OBJETOS, f1
} from './hab-base.js';

// Avião do Ataque aéreo: passa em linha reta por cima dos alvos (meio = metade do caminho, em casas) em voo segundos;
// cada bomba demora queda segundos pra cair (a sombra do avião e as bombas aparecem na tela: view/render.js)
export const AVIAO = { meio: 18, voo: 3.4, queda: 0.6 };

// Até n pontos de grupos de zumbis diferentes (centros dos maiores grupos, sem repetir o mesmo grupo)
function grupos(g, h, n, alcance = 7, raio = 1.9) {
  const ja = [];
  for (let k = 0; k < n; k++) {
    const z = maiorGrupo(g, h, alcance, raio, ja);
    if (!z) break;
    ja.push([z.x, z.y]);
  }
  return ja;
}
// Bombas/meteoros/pacotes caindo do céu nos pontos: a sombra aparece, depois explode
function chuvaDoCeu(g, pts, raio, dano, { queda = 0.6, espaco = 0.12, tipo = 'explosao', visual = 'bomba' } = {}) {
  pts.forEach((p, k) => {
    g.agendar(k * espaco, () => g.emit('bomba_caindo', { x: p[0], y: p[1], queda, visual }));
    g.agendar(k * espaco + queda, () => explosaoAmiga(g, p[0], p[1], raio, dano, tipo, 5));
  });
}
// Lança projéteis em volta do herói (360°)
function leque(g, h, q, giro, o) {
  for (let k = 0; k < q; k++) {
    const a = giro + k / q * Math.PI * 2;
    criarObj(g, { tipo: 'projetil', x: h.x, y: h.y, vx: Math.cos(a) * o.vel, vy: Math.sin(a) * o.vel, ...o });
  }
}

/* =================== SUPREMAS =================== */
export const SUPREMAS = {
  /* ----- gerais ----- */
  fragmentacao: {
    ativa: 'granada', passiva: 'forca', nome: 'Bomba de fragmentação', emoji: '☄️', cat: 'ofensiva', poder: 1200,
    cd: 3, dano: 1200, raio: 3, cacos: 6,
    desc() { return `a cada ${this.cd}s: bomba de ${this.dano} de dano que solta ${this.cacos} explosões menores em volta`; },
    usar(g, h, m) {
      const z = maiorGrupo(g, h, 7, this.raio);
      if (!z) return false;
      const x = z.x, y = z.y, d = this.dano * m;
      g.emit('arremesso', { tipo: 'granada', x0: h.x, y0: h.y, x1: x, y1: y, t: 0.45 });
      g.agendar(0.45, () => {
        explosaoAmiga(g, x, y, this.raio, d, 'explosao', 6);
        for (let k = 0; k < this.cacos; k++) {
          const a = k / this.cacos * Math.PI * 2 + g.rng.next(), dd = 1.6 + g.rng.next() * 0.8;
          g.agendar(0.2 + k * 0.08, () => explosaoAmiga(g, x + Math.cos(a) * dd, y + Math.sin(a) * dd, 1.5, d * 0.45, 'explosao', 3));
        }
      });
      return true;
    }
  },
  tempestade: {
    ativa: 'raio', passiva: 'mira', nome: 'Tempestade elétrica', emoji: '🌩️', cat: 'controle', poder: 570,
    cd: 1.8, dano: 570, cadeias: 3, saltos: 8,
    desc() { return `a cada ${this.cd}s: ${this.cadeias} raios que pulam em ${this.saltos} zumbis · ${this.dano} de dano, sempre atordoa e pode dar crítico`; },
    usar(g, h, m) {
      const ja = new Set();
      let algum = false;
      for (let c = 0; c < this.cadeias; c++) if (cadeiaEletrica(g, h.x, h.y, this.saltos - 1, this.dano * m, { alcance: 6.5, pulo: 3, atordoa: 1, ignorar: ja, crit: true })) algum = true;
      return algum;
    }
  },
  vampiricas: {
    ativa: 'laminas', passiva: 'vampiro', nome: 'Lâminas vampíricas', emoji: '🩸', cat: 'ofensiva', poder: 300, continua: true,
    qtd: 6, raio: 1.55, dano: 300, cura: 4,
    desc() { return `${this.qtd} lâminas de sangue · ${this.dano} de dano, sempre fazem sangrar e cada corte cura ${this.cura}`; },
    atualizar(g, h, m) { girarLaminas(g, h, this.qtd, this.raio * area(g), this.dano * m, 1, this.cura, 0.3); }
  },
  fenix: {
    ativa: 'molotov', passiva: 'regen', nome: 'Fogo da fênix', emoji: '🐦‍🔥', cat: 'defensiva', poder: 180,
    cd: 4, garrafas: 3, dano: 180, fogo: 21, cura: 10,
    desc() { return `a cada ${this.cd}s joga ${this.garrafas} molotovs · fogo ${this.fogo}× mais forte e o fogo CURA o herói (${this.cura}/s)`; },
    usar(g, h, m) {
      const ja = grupos(g, h, this.garrafas, 6, 1.5);
      if (!ja.length) return false;
      if (ja.length < this.garrafas) ja.push([h.x, h.y]);   // um dos fogos sempre cai em volta do herói (é o que cura ele)
      for (const [x, y] of ja) jogarMolotov(g, h, x, y, 2.6, 5, this.dano * m, this.fogo * m, { fenix: true });
      return true;
    },
    sempre(g, h, m, dt) {
      if (g.zonas.some(z => z.fenix && h.x >= z.x0 && h.x <= z.x1 && h.y >= z.y0 && h.y <= z.y1)) h.vida = Math.min(h.vidaMax, h.vida + this.cura * dt);
    }
  },
  esquadrilha: {
    ativa: 'drone', passiva: 'maos', nome: 'Esquadrilha de drones', emoji: '🛰️', cat: 'ofensiva', poder: 90,
    cd: 0.3, drones: 3, dano: 90,
    desc() { return `${this.drones} drones atirando a cada ${f1(this.cd)}s · ${this.dano} de dano cada tiro`; },
    usar(g, h, m) {
      const ja = new Set();
      for (let k = 0; k < this.drones; k++) { const z = tiroDeDrone(g, h, k, this.dano * m, this.drones, ja); if (z) ja.add(z); }
      return ja.size > 0;
    }
  },
  fortaleza: {
    ativa: 'onda', passiva: 'couro', nome: 'Fortaleza', emoji: '🏰', cat: 'defensiva', poder: 900,
    cd: 4, dano: 900, raio: 3.6,
    desc() { return `a cada ${this.cd}s: onda gigante de ${this.dano} de dano que atordoa e deixa o herói blindado (+40% de defesa)`; },
    usar(g, h, m) {
      if (!onda(g, h.x, h.y, this.raio, this.dano * m, { atordoa: 1.6, empurra: 12, minimo: 2 })) return false;
      g.aplicarStatus(h, 'blindado', { duracao: 4 });
      return true;
    }
  },
  zero: {
    ativa: 'gelo', passiva: 'reflexos', nome: 'Zero absoluto', emoji: '🧊', cat: 'controle', poder: 450,
    cd: 6, dano: 450, raio: 4.5, congela: 2.5, mods: [{ attr: 'esquiva', soma: 0.1 }],
    desc() { return `a cada ${this.cd}s: nevasca em volta congela tudo por ${this.congela}s (${this.dano} de dano) · +10% de esquiva`; },
    usar(g, h, m) {
      const r = this.raio * area(g);
      const perto = alvos(g).filter(z => dist2(z.x, z.y, h.x, h.y) < r * r);
      if (perto.length < 2) return false;
      g.emit('gelo', { x: h.x, y: h.y, raio: r, grande: true });
      for (const z of perto) {
        ferir(g, z, this.dano * m, 'impacto');
        if (!z.morto) g.aplicarStatus(z, 'congelado', { duracao: this.congela * (ehChefe(z) ? 0.4 : 1) });
      }
      return true;
    }
  },
  coracao: {
    ativa: 'escudo', passiva: 'vitalidade', nome: 'Coração de ferro', emoji: '❤️‍🔥', cat: 'defensiva', poder: 300,
    cd: 45, cura: 45, raio: 3, cargas: 2, recargaEscudo: 12, mods: [{ attr: 'defesa', soma: 0.15 }, { attr: 'regen', soma: 1.2 }],
    desc() { return `+15% de defesa, regenera e tem escudo de ${this.cargas} golpes; quase caindo, explode uma onda, cura ${this.cura}% e fica 3s invencível (a cada ${this.cd}s)`; },
    sempre(g, h, m, dt) {
      h.coracaoEsc = (h.coracaoEsc ?? 0) - dt;
      if (h.coracaoEsc <= 0 && (h.escudo || 0) < this.cargas) { h.coracaoEsc = this.recargaEscudo; h.escudo = this.cargas; h.escudoMax = this.cargas; h.escudoEstouro = 0; g.emit('escudo', { x: h.x, y: h.y, cargas: h.escudo }); }   // (o escudo do Coração não estoura: segurar a horda longe deixava o herói imortal)
    },
    salvar(g, h, m) {
      if ((h.supT?.coracao ?? 0) > 0) return false;
      h.supT.coracao = this.cd;
      h.vida = Math.max(h.vida, 1);
      h.invT = Math.max(h.invT, 3);
      onda(g, h.x, h.y, this.raio, 300 * m, { atordoa: 1.2, empurra: 9, minimo: 0 });
      g.curar(this.cura, null, true, true);
      g.emit('aviso', { texto: `❤️‍🔥 ${this.nome.toUpperCase()}! O herói se levantou na marra!`, tipo: 'bom' });
      return true;
    }
  },
  bombardeio: {
    ativa: 'minas', passiva: 'explosao', nome: 'Ataque aéreo', emoji: '✈️', cat: 'ofensiva', poder: 450,
    cd: 9, bombas: 8, dano: 450, raio: 1.9,
    desc() { return `a cada ${this.cd}s um avião solta ${this.bombas} bombas nos maiores grupos de zumbis (${this.dano} de dano cada)`; },
    usar(g, h, m) {
      const vivos = alvos(g).filter(z => dist2(z.x, z.y, h.x, h.y) < 49);
      if (vivos.length < 4) return false;
      const ja = grupos(g, h, this.bombas, 7, this.raio);
      if (!ja.length) return false;
      g.emit('aviso', { texto: `✈️ ${this.nome.toUpperCase()}!`, tipo: 'bom' });
      // o avião passa por cima dos alvos (reta pelo meio deles) e solta as bombas na ordem em que sobrevoa;
      // cada bomba cai em AVIAO.queda segundos e explode quando bate no chão
      const A = AVIAO, mx = ja.reduce((a, p) => a + p[0], 0) / ja.length, my = ja.reduce((a, p) => a + p[1], 0) / ja.length;
      let dx = ja.length > 1 ? ja[ja.length - 1][0] - ja[0][0] : 1, dy = ja.length > 1 ? ja[ja.length - 1][1] - ja[0][1] : 0.4;
      const dl = Math.hypot(dx, dy) || 1; dx /= dl; dy /= dl;
      const proj = p => (p[0] - mx) * dx + (p[1] - my) * dy;
      const x0 = mx - dx * A.meio, y0 = my - dy * A.meio, vel = A.meio * 2 / A.voo;
      const bombas = ja.map(p => ({ x: p[0], y: p[1], t: Math.max(0.05, (proj(p) + A.meio) / vel) })).sort((a, b) => a.t - b.t);
      g.emit('aviao', { x0, y0, x1: mx + dx * A.meio, y1: my + dy * A.meio, voo: A.voo, queda: A.queda, bombas });
      for (const b of bombas) {
        g.agendar(b.t, () => g.emit('bomba_caindo', { x: b.x, y: b.y, queda: A.queda }));
        g.agendar(b.t + A.queda, () => explosaoAmiga(g, b.x, b.y, this.raio, this.dano * m, 'explosao', 5));
      }
      return true;
    }
  },
  furacao: {
    ativa: 'bumerangue', passiva: 'pernas', nome: 'Furacão', emoji: '🌪️', cat: 'ofensiva', poder: 260, continua: true,
    qtd: 4, dano: 260, mods: [{ attr: 'velocidade', mult: 1.1 }],
    desc() { return `${this.qtd} bumerangues gigantes giram em espiral em volta, indo e voltando · ${this.dano} de dano e empurram · +10% de velocidade`; },
    atualizar(g, h, m, dt) {
      h.furacaoAng = ((h.furacaoAng || 0) + dt * 4.2) % (Math.PI * 2);
      const r = (1.4 + 1.8 * (0.5 + 0.5 * Math.sin(g.t * 1.4))) * area(g);
      h.furacaoPos = [];
      for (let k = 0; k < this.qtd; k++) {
        const a = h.furacaoAng + k * Math.PI * 2 / this.qtd, bx = h.x + Math.cos(a) * r, by = h.y + Math.sin(a) * r;
        h.furacaoPos.push([bx, by]);
        for (const z of alvos(g)) {
          if (dist2(bx, by, z.x, z.y) > (0.55 + ZUMBIS[z.tipo].raio) ** 2 || (z.furacaoT || 0) > g.t) continue;
          z.furacaoT = g.t + 0.35;
          ferir(g, z, this.dano * m, 'corte');
          empurrar(z, h.x, h.y, 3);
        }
      }
    }
  },
  santuario: {
    ativa: 'pulso', passiva: 'sabedoria', nome: 'Santuário', emoji: '✨', cat: 'defensiva', poder: 160,
    cd: 9, dur: 4.5, raio: 3, dano: 160, cura: 0.8,
    desc() { return `a cada ${this.cd}s um círculo sagrado em volta por ${this.dur}s: o herói cura ${this.cura}% a cada meio segundo e os zumbis dentro tomam ${this.dano} e ficam lentos`; },
    usar(g, h, m) {
      if ((g.objHab || []).some(o => o.tipo === 'santuario')) return false;
      criarObj(g, { tipo: 'santuario', x: h.x, y: h.y, vida: this.dur, raio: this.raio * area(g), dano: this.dano * m, cura: this.cura });
      return true;
    }
  },
  rugido: {
    ativa: 'grito', passiva: 'recarga', nome: 'Rugido do titã', emoji: '🦁', cat: 'controle', poder: 350,
    cd: 7, raio: 6, dano: 350, medo: 3,
    desc() { return `a cada ${this.cd}s: rugido que dá ${this.dano} de dano e faz todo zumbi em volta fugir por ${this.medo}s · o herói fica com fúria e foco`; },
    usar(g, h, m) {
      if (!onda(g, h.x, h.y, this.raio, this.dano * m, { minimo: 2, cor: '#ffb347', status: { id: 'medo', duracao: this.medo } })) return false;
      g.aplicarStatus(h, 'furia', { duracao: 4 }); g.aplicarStatus(h, 'foco', { duracao: 4 });
      g.emit('grito', { x: h.x, y: h.y, grande: true, heroi: true });
      return true;
    }
  },

  /* ----- únicas de cada personagem ----- */
  chuva_balas: {
    ativa: 'rajada', passiva: 'municao', classe: 'policial', nome: 'Chuva de balas', emoji: '🎆', cat: 'ofensiva', poder: 220,
    cd: 2.5, balas: 20, dano: 220,
    desc() { return `a cada ${this.cd}s: ${this.balas} balas em todas as direções que atravessam 3 zumbis · ${this.dano} de dano, podem dar crítico`; },
    usar(g, h, m) {
      if (!alvos(g).some(z => dist2(z.x, z.y, h.x, h.y) < 42)) return false;
      leque(g, h, this.balas, g.rng.next(), { vel: 14, vida: 0.55, dano: this.dano * m, raio: 0.22, tipoDano: 'perfuracao', furos: 3, crit: true, visual: 'bala' });
      g.emit('rajada', { x: h.x, y: h.y, grande: true });
      return true;
    }
  },
  lei_marcial: {
    ativa: 'algemas', passiva: 'colete_tatico', classe: 'policial', nome: 'Lei marcial', emoji: '🚨', cat: 'controle', poder: 200,
    cd: 10, raio: 7, prende: 2, dano: 200,
    desc() { return `a cada ${this.cd}s a sirene toca: todo zumbi em volta fica preso ${this.prende}s e marcado (+25% de dano nele) e o herói fica blindado`; },
    usar(g, h, m) {
      const perto = onda(g, h.x, h.y, this.raio, this.dano * m, { minimo: 3, cor: '#ff4a4a' });
      if (!perto) return false;
      for (const z of perto) if (!z.morto) { g.aplicarStatus(z, 'atordoado', { duracao: this.prende * (ehChefe(z) ? 0.4 : 1) }); g.aplicarStatus(z, 'marcado', { duracao: 6 }); }
      g.aplicarStatus(h, 'blindado', { duracao: 4 });
      g.emit('sirene', { x: h.x, y: h.y, raio: this.raio });
      return true;
    }
  },
  cirurgia: {
    ativa: 'bisturi', passiva: 'anatomia', classe: 'enfermeira', nome: 'Cirurgia relâmpago', emoji: '⚕️', cat: 'ofensiva', poder: 200,
    cd: 1.6, qtd: 10, dano: 200,
    desc() { return `a cada ${this.cd}s: ${this.qtd} bisturis em espiral que atravessam 4 zumbis · ${this.dano} de dano, sempre fazem sangrar e podem dar crítico`; },
    usar(g, h, m) {
      if (!alvos(g).some(z => dist2(z.x, z.y, h.x, h.y) < 36)) return false;
      h.cirurgiaGiro = (h.cirurgiaGiro || 0) + 0.35;
      leque(g, h, this.qtd, h.cirurgiaGiro, { vel: 9, vida: 0.8, dano: this.dano * m, raio: 0.28, tipoDano: 'corte', furos: 4, crit: true, visual: 'bisturi', status: [{ id: 'sangramento', chance: 1, pilhas: 2 }] });
      return true;
    }
  },
  transfusao: {
    ativa: 'seringa', passiva: 'plantao', classe: 'enfermeira', nome: 'Transfusão', emoji: '🫀', cat: 'defensiva', poder: 15,
    cd: 10, cura: 15, porMorte: 0.6,
    desc() { return `cada zumbi que morre perto cura ${f1(this.porMorte)}% da vida; a cada ${this.cd}s cura ${this.cura}%, tira os efeitos ruins e dá adrenalina`; },
    usar(g, h) {
      g.curar(this.cura, null, true);
      h.estados.limpar('negativo');
      g.aplicarStatus(h, 'adrenalina', { duracao: 4 });
      g.emit('seringa', { x: h.x, y: h.y, grande: true });
      return true;
    },
    aoMatar(g, h, z) {
      if (dist2(z.x, z.y, h.x, h.y) > 16) return;
      // no máximo 4% por segundo, senão a horda inteira morrendo enche a vida de uma vez
      if (g.t - (h.transfT ?? -9) > 1) { h.transfT = g.t; h.transfSoma = 0; }
      if (h.transfSoma >= 4) return;
      h.transfSoma += this.porMorte;
      h.vida = Math.min(h.vidaMax, h.vida + h.vidaMax * this.porMorte / 100 * h.attr.get('cura'));
    }
  },
  aura: {
    ativa: 'brasa', passiva: 'epi', classe: 'bombeiro', nome: 'Aura de fogo', emoji: '☀️', cat: 'ofensiva', poder: 180, continua: true,
    raio: 2.6, dano: 90, intervalo: 0.5, mods: [{ attr: 'resFogo', soma: 0.3 }],
    desc() { return `queima tudo que chega perto: ${this.dano * 2} de dano por segundo em volta do herói e deixa os zumbis lentos`; },
    atualizar(g, h, m, dt) {
      h.auraT = (h.auraT ?? 0) - dt;
      if (h.auraT > 0) return;
      h.auraT = this.intervalo;
      const raio = this.raio * area(g);
      for (const z of alvos(g)) {
        if (dist2(z.x, z.y, h.x, h.y) > (raio + ZUMBIS[z.tipo].raio) ** 2) continue;
        ferir(g, z, this.dano * m, 'fogo');
        if (!z.morto) g.aplicarStatus(z, 'lento', { duracao: 1 });
      }
    }
  },
  tsunami: {
    ativa: 'mangueira', passiva: 'musculos', classe: 'bombeiro', nome: 'Tsunami', emoji: '🌊', cat: 'controle', poder: 600,
    cd: 7, raio: 5, dano: 600,
    desc() { return `a cada ${this.cd}s uma onda gigante de água: ${this.dano} de dano, joga todo mundo longe, atordoa e deixa lento`; },
    usar(g, h, m) {
      return !!onda(g, h.x, h.y, this.raio, this.dano * m, { atordoa: 2, empurra: 14, minimo: 3, cor: '#3aa0ff', status: { id: 'lento', duracao: 3 } });
    }
  },
  frete: {
    ativa: 'pacote', passiva: 'gorjeta', classe: 'entregador', nome: 'Frete explosivo', emoji: '🚚', cat: 'ofensiva', poder: 420,
    cd: 5, pacotes: 8, dano: 420, raio: 1.9,
    desc() { return `a cada ${this.cd}s caem ${this.pacotes} pacotes-bomba do céu nos maiores grupos · ${this.dano} de dano cada`; },
    usar(g, h, m) {
      const pts = grupos(g, h, this.pacotes, 7, this.raio);
      if (pts.length < 2) return false;
      chuvaDoCeu(g, pts, this.raio, this.dano * m, { visual: 'pacote' });
      return true;
    }
  },
  luz: {
    ativa: 'turbo', passiva: 'aerodinamica', classe: 'entregador', nome: 'Velocidade da luz', emoji: '🌠', cat: 'controle', poder: 140, continua: true,
    dano: 140, raio: 1.4, mods: [{ attr: 'velocidade', mult: 1.15 }, { attr: 'esquiva', soma: 0.1 }],
    desc() { return `o herói vira um raio: quem chega perto leva ${this.dano} de dano elétrico e fica atordoado · +15% de velocidade e +10% de esquiva`; },
    atualizar(g, h, m, dt) {
      h.luzT = (h.luzT ?? 0) - dt;
      if (h.luzT > 0) return;
      h.luzT = 0.3;
      const pts = [[h.x, h.y]];
      for (const z of alvos(g)) {
        if (dist2(z.x, z.y, h.x, h.y) > (this.raio * area(g) + ZUMBIS[z.tipo].raio) ** 2) continue;
        ferir(g, z, this.dano * m, 'eletrico');
        if (!z.morto) g.aplicarStatus(z, 'atordoado', { duracao: 0.4 });
        if (pts.length < 5) pts.push([z.x, z.y]);
      }
      if (pts.length > 1) g.emit('raio', { pts });
    }
  },
  bateria: {
    ativa: 'torreta', passiva: 'engenharia', classe: 'mecanico', nome: 'Bateria de torretas', emoji: '🏭', cat: 'ofensiva', poder: 110,
    cd: 12, torretas: 3, dano: 110,
    desc() { return `a cada ${this.cd}s monta ${this.torretas} torretas em volta que atiram sem parar (${this.dano} de dano) e soltam um míssil a cada 5 tiros`; },
    usar(g, h, m) {
      for (const o of g.objHab || []) if (o.de === 'bateria') o.vida = 0;
      for (let k = 0; k < this.torretas; k++) {
        const a = k / this.torretas * Math.PI * 2;
        criarObj(g, { tipo: 'torreta', de: 'bateria', grande: true, x: h.x + Math.cos(a) * 1.3, y: h.y + Math.sin(a) * 1.3, cd: 0.22, dano: this.dano * m, vida: this.cd + 0.5, alcance: 7, missil: 5 });
      }
      return true;
    }
  },
  campo: {
    ativa: 'eletroima', passiva: 'blindagem', classe: 'mecanico', nome: 'Campo magnético', emoji: '⚛️', cat: 'controle', poder: 220, continua: true,
    raio: 3.5, dano: 110, mods: [{ attr: 'defesa', soma: 0.1 }],
    desc() { return `campo em volta do herói: puxa os zumbis, dá ${this.dano * 2} de dano elétrico por segundo e deixa lentos · +10% de defesa`; },
    atualizar(g, h, m, dt) {
      h.campoT = (h.campoT ?? 0) - dt;
      if (h.campoT > 0) return;
      h.campoT = 0.5;
      const r = this.raio * area(g);
      let algum = false;
      for (const z of alvos(g)) {
        if (dist2(z.x, z.y, h.x, h.y) > r * r) continue;
        algum = true;
        puxar(z, h.x, h.y, 1.2);
        ferir(g, z, this.dano * m, 'eletrico');
        if (!z.morto) g.aplicarStatus(z, 'lento', { duracao: 1 });
      }
      if (algum && (h.campoVis = (h.campoVis || 0) + 1) % 2 === 0) g.emit('ima', { x: h.x, y: h.y, raio: r });
    }
  }
};

/* =================== NÍVEL DEUS =================== */
export const DEUSES = {
  /* ----- gerais ----- */
  furia: {
    nome: 'Fúria divina', emoji: '👑', cat: 'ofensiva', poder: 9999,
    cd: 12, raio: 10, chefe: 0.25, cura: 20, invencivel: 2,
    desc() { return `a cada ${this.cd}s uma luz do céu derruba todos os zumbis em volta (chefes perdem ${Math.round(this.chefe * 100)}% da vida), cura ${this.cura}% e deixa invencível por ${this.invencivel}s`; },
    usar(g, h) {
      const perto = g.zumbis.filter(z => !z.morto && !(z.nascendo > 0) && dist2(z.x, z.y, h.x, h.y) < this.raio * this.raio);
      for (const z of perto) {
        if (z.fa) z.fa.escudo = 0;
        if (ehChefe(z)) g.ferirZumbi(z, z.vidaMax * this.chefe, null, true);
        else g.matarZumbi(z, null);
      }
      g.curar(this.cura, null, true);
      h.invT = Math.max(h.invT, this.invencivel);
      g.emit('furia_divina', { x: h.x, y: h.y, raio: this.raio, alvos: perto.length });
      return true;
    }
  },
  egide: {
    nome: 'Égide divina', emoji: '🛡️', cat: 'defensiva', poder: 100,
    cd: 30, mods: [{ attr: 'defesa', soma: 0.25 }, { attr: 'vidaMax', mult: 1.5 }, { attr: 'regen', soma: 5 }, { attr: 'esquiva', soma: 0.1 }],
    desc() { return `+25% de defesa, +50% de vida, +5 de vida por segundo e +10% de esquiva; quase caindo, cura TUDO e fica 3s invencível (a cada ${this.cd}s)`; },
    salvar(g, h, m) {
      if ((h.deusSalvaT ?? 0) > 0) return false;
      h.deusSalvaT = this.cd;
      h.vida = Math.max(h.vida, 1);
      h.invT = Math.max(h.invT, 3);
      onda(g, h.x, h.y, 4, 600 * m, { atordoa: 1.5, empurra: 12, minimo: 0, cor: '#fff3a0' });
      g.curar(100, null, true, true);
      g.emit('furia_divina', { x: h.x, y: h.y, raio: 4, alvos: 0 });
      return true;
    }
  },
  tempo: {
    nome: 'Tempo parado', emoji: '⏳', cat: 'controle', poder: 4,
    cd: 14, raio: 12, congela: 4,
    desc() { return `a cada ${this.cd}s o tempo para: todos os zumbis em volta ficam congelados por ${this.congela}s e marcados (+40% de dano neles)`; },
    usar(g, h) {
      const perto = alvos(g).filter(z => dist2(z.x, z.y, h.x, h.y) < this.raio * this.raio);
      if (perto.length < 3) return false;
      for (const z of perto) { g.aplicarStatus(z, 'congelado', { duracao: this.congela * (ehChefe(z) ? 0.5 : 1) }); g.aplicarStatus(z, 'marcado', { duracao: this.congela + 2 }); }
      g.emit('tempo_parado', { x: h.x, y: h.y, raio: this.raio, segundos: this.congela });
      return true;
    }
  },
  /* ----- de cada personagem ----- */
  justica: {
    classe: 'policial', nome: 'Justiça divina', emoji: '⚖️', cat: 'ofensiva', poder: 900,
    cd: 8, raio: 10, dano: 900, chefe: 0.1,
    desc() { return `a cada ${this.cd}s, atiradores do céu: um tiro CRÍTICO de ${this.dano} em cada zumbi em volta (chefes perdem ${Math.round(this.chefe * 100)}% da vida)`; },
    usar(g, h, m) {
      const perto = alvos(g).filter(z => dist2(z.x, z.y, h.x, h.y) < this.raio * this.raio);
      if (!perto.length) return false;
      for (const z of perto) {
        if (ehChefe(z)) g.ferirZumbi(z, z.vidaMax * this.chefe, null, true);
        else ferir(g, z, this.dano * m * h.attr.get('critMult'), 'perfuracao');
        g.emit('tiro', { x: z.x, y: z.y - 6, tx: z.x, ty: z.y, arma: 'ceu', acertou: true, drone: true });
      }
      g.emit('justica', { x: h.x, y: h.y, alvos: perto.length });
      return true;
    }
  },
  anjo: {
    classe: 'enfermeira', nome: 'Anjo da guarda', emoji: '👼', cat: 'defensiva', poder: 800,
    cd: 6, raio: 4, dano: 800, cura: 10, salva: 60,
    desc() { return `a cada ${this.cd}s um pulso sagrado cura ${this.cura}% e dá ${this.dano} de dano em volta; quando a vida acaba, o anjo levanta o herói com a vida cheia (a cada ${this.salva}s)`; },
    usar(g, h, m) {
      g.curar(this.cura, null, true);
      onda(g, h.x, h.y, this.raio, this.dano * m, { empurra: 6, minimo: 0, cor: '#fff3a0' });
      return true;
    },
    salvar(g, h) {
      if ((h.deusSalvaT ?? 0) > 0) return false;
      h.deusSalvaT = this.salva;
      h.vida = Math.max(h.vida, 1);
      h.invT = Math.max(h.invT, 4);
      g.curar(100, null, true, true);
      g.emit('furia_divina', { x: h.x, y: h.y, raio: 5, alvos: 0 });
      g.emit('aviso', { texto: '👼 O ANJO DA GUARDA LEVANTOU O HERÓI!', tipo: 'bom' });
      return true;
    }
  },
  inferno: {
    classe: 'bombeiro', nome: 'Inferno sagrado', emoji: '🔥', cat: 'ofensiva', poder: 600, continua: true,
    raio: 4.5, dano: 300, mods: [{ attr: 'resFogo', soma: 0.8 }, { attr: 'resExplosao', soma: 0.5 }, { attr: 'defesa', soma: 0.15 }],
    desc() { return `aura de fogo sagrado enorme: ${this.dano * 2} de dano por segundo em volta e queima tudo · quase imune a fogo e explosão, +15% de defesa`; },
    atualizar(g, h, m, dt) {
      h.infernoT = (h.infernoT ?? 0) - dt;
      if (h.infernoT > 0) return;
      h.infernoT = 0.5;
      const r = this.raio * area(g);
      for (const z of alvos(g)) {
        if (dist2(z.x, z.y, h.x, h.y) > (r + ZUMBIS[z.tipo].raio) ** 2) continue;
        ferir(g, z, this.dano * m, 'fogo');
        if (!z.morto) g.aplicarStatus(z, 'queimando', {});
      }
    }
  },
  meteoros: {
    classe: 'entregador', nome: 'Chuva de meteoros', emoji: '🌑', cat: 'ofensiva', poder: 1000,
    cd: 5, qtd: 10, dano: 1000, raio: 2.2,
    desc() { return `a cada ${this.cd}s caem ${this.qtd} meteoros nos grupos de zumbis da tela · ${this.dano} de dano cada`; },
    usar(g, h, m) {
      const pts = grupos(g, h, this.qtd, 10, this.raio);
      if (!pts.length) return false;
      chuvaDoCeu(g, pts, this.raio, this.dano * m, { visual: 'meteoro', queda: 0.8, espaco: 0.1, tipo: 'fogo' });
      return true;
    }
  },
  mecha: {
    classe: 'mecanico', nome: 'Mecha', emoji: '🤖', cat: 'defensiva', poder: 500,
    cd: 2, misseis: 4, dano: 500, mods: [{ attr: 'defesa', soma: 0.25 }, { attr: 'corpo', mult: 2 }, { attr: 'cadencia', mult: 1.5 }, { attr: 'dano', mult: 1.3 }],
    desc() { return `vira um robô gigante: +25% de defesa, golpe de perto 2×, ataca 50% mais rápido, +30% de dano e solta ${this.misseis} mísseis a cada ${this.cd}s (${this.dano} cada)`; },
    usar(g, h, m) {
      const pts = grupos(g, h, this.misseis, 8, 1.6);
      if (!pts.length) return false;
      for (const [k, p] of pts.entries()) {
        g.emit('arremesso', { tipo: 'missil', x0: h.x, y0: h.y, x1: p[0], y1: p[1], t: 0.4 + k * 0.05 });
        g.agendar(0.4 + k * 0.05, () => explosaoAmiga(g, p[0], p[1], 1.6, this.dano * m, 'explosao', 4));
      }
      return true;
    }
  }
};

/* ---------- objetos das supremas (hab-base.js → OBJETOS) ---------- */
// Santuário: segue o herói; a cada meio segundo cura o herói e machuca/lentifica os zumbis dentro
OBJETOS.santuario = (g, o, dt) => {
  const h = g.hero;
  o.x = h.x; o.y = h.y;
  o.pulso = (o.pulso ?? 0) - dt;
  if (o.pulso <= 0) {
    o.pulso = 0.5;
    h.vida = Math.min(h.vidaMax, h.vida + h.vidaMax * o.cura / 100 * h.attr.get('cura'));
    for (const z of alvos(g)) {
      if (dist2(z.x, z.y, o.x, o.y) > o.raio * o.raio) continue;
      ferir(g, z, o.dano, 'fogo');
      if (!z.morto) g.aplicarStatus(z, 'lento', { duracao: 1 });
    }
  }
  return o.t < o.vida;
};

