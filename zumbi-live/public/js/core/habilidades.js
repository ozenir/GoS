// ============================================================================
//  HABILIDADES (estilo roguelike) — a cada nível, o chat escolhe 1 de 3 cartas.
//
//  Tipos de carta:
//    ativa    habilidade que dispara sozinha de tempos em tempos (granada, raio...)
//    passiva  melhora um atributo do herói (vida, defesa, velocidade...)
//    treino   +1 de perícia no ataque principal (mais dano, cadência e crítico)
//    arma     troca a arma (escopeta) ou o golpe de perto (taco) de vez
//    suprema  só no nível 10 (quando a horda aperta): as 3 cartas são habilidades
//             SUPREMAS, bem mais fortes, pra dar conta das hordas que começam ali
//
//  As 3 cartas tentam ser sempre: A = aprimorar algo que o herói já tem,
//  B = algo novo (habilidade ou arma), C = uma passiva nova.
//  Chat vota com A, B ou C (números ficam para a direção).
//
//  Para criar uma habilidade nova: acrescente em ATIVAS (com usar ou atualizar) ou em PASSIVAS.
//  Os números de cada nível são funções de n (nível da habilidade, de 1 a max).
// ============================================================================
import { ZUMBIS, ARMAS, CORPO, CLASSES } from './dados.js';
import { danoNoZumbi, aplicarPericias, PERICIAS } from './dano.js';
import { dist, dist2 } from './util.js';

export const MAX_ATIVAS = 3;     // quantas habilidades ativas o herói pode ter ao mesmo tempo

// Zumbis que dá pra acertar (vivos e já de pé)
const alvos = g => g.zumbis.filter(z => !z.morto && !(z.nascendo > 0));

// Dano de habilidade: escala com o atributo "dano" do herói; afinidade e resistência do zumbi contam
const ferir = (g, z, base, tipo) => g.ferirZumbi(z, danoNoZumbi(z, base * g.hero.attr.get('dano'), tipo), null, false);

// Explosão das habilidades: só machuca zumbi (nunca o herói) e não deixa fogo
function explosaoAmiga(g, x, y, raio, dano, tipo = 'explosao', empurra = 4) {
  g.emit('explosao', { x, y, raio, amiga: true });
  for (const z of alvos(g)) {
    const d = dist(x, y, z.x, z.y);
    if (d > raio + ZUMBIS[z.tipo].raio) continue;
    ferir(g, z, dano * (1 - Math.min(1, d / raio) * 0.4), tipo);
    if (!z.morto && d > 0.01 && !ZUMBIS[z.tipo].chefe) { z.kx += (z.x - x) / d * empurra; z.ky += (z.y - y) / d * empurra; }
  }
}

// Onde tem mais zumbi junto (dentro do alcance): devolve o zumbi do centro do grupo
function maiorGrupo(g, h, alcance, raio) {
  const lista = alvos(g).filter(z => dist2(z.x, z.y, h.x, h.y) < alcance * alcance);
  let melhor = null, mq = 0;
  for (const z of lista) {
    let q = 0;
    for (const o of lista) if (dist2(z.x, z.y, o.x, o.y) < raio * raio) q++;
    if (ZUMBIS[z.tipo].chefe) q += 2;
    if (q > mq) { mq = q; melhor = z; }
  }
  return melhor;
}

function maisPerto(g, x, y, alcance, ignorar = null, precisaLinha = false) {
  let best = null, bd = alcance * alcance;
  for (const z of alvos(g)) {
    if (ignorar && ignorar.has(z)) continue;
    const d = dist2(x, y, z.x, z.y);
    if (d < bd && (!precisaLinha || g.linhaLivre(x, y, z.x, z.y))) { bd = d; best = z; }
  }
  return best;
}

/* ---------------- Habilidades ativas ---------------- */
export const ATIVAS = {
  granada: {
    nome: 'Granada', emoji: '💣', max: 5,
    cd: n => 7.5 - n * 0.6, dano: n => 26 + n * 12, raio: n => 1.5 + n * 0.15,
    desc: n => `joga no maior grupo a cada ${(7.5 - n * 0.6).toFixed(1)}s · ${26 + n * 12} de dano`,
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
    nome: 'Raio em cadeia', emoji: '⚡', max: 5,
    cd: n => 4.6 - n * 0.3, dano: n => 14 + n * 6, saltos: n => 2 + n,
    desc: n => `pula em ${3 + n} zumbis a cada ${(4.6 - n * 0.3).toFixed(1)}s · ${14 + n * 6} de dano, atordoa`,
    usar(g, h, n) {
      let z = maisPerto(g, h.x, h.y, 5.5, null, true);
      if (!z) return false;
      const ja = new Set(), pts = [[h.x, h.y]];
      for (let k = 0; k <= this.saltos(n) && z; k++) {
        ja.add(z); pts.push([z.x, z.y]);
        ferir(g, z, this.dano(n), 'eletrico');
        if (!z.morto && g.rng.next() < 0.35) g.aplicarStatus(z, 'atordoado', { duracao: 0.6 });
        z = maisPerto(g, z.x, z.y, 2.6, ja);
      }
      g.emit('raio', { pts });
      return true;
    }
  },
  laminas: {
    nome: 'Lâminas giratórias', emoji: '🌀', max: 5, continua: true,
    qtd: n => 1 + Math.ceil(n / 2), dano: n => 7 + n * 3, raio: 1.25,
    desc: n => `${1 + Math.ceil(n / 2)} lâminas girando em volta · ${7 + n * 3} de dano, fazem sangrar`,
    atualizar(g, h, n, dt) {
      h.laminaAng = ((h.laminaAng || 0) + dt * 3.4) % (Math.PI * 2);
      const q = this.qtd(n);
      for (let k = 0; k < q; k++) {
        const a = h.laminaAng + k * Math.PI * 2 / q;
        const bx = h.x + Math.cos(a) * this.raio, by = h.y + Math.sin(a) * this.raio;
        for (const z of alvos(g)) {
          const r = ZUMBIS[z.tipo].raio + 0.3;
          if (dist2(bx, by, z.x, z.y) > r * r || (z.laminaT || 0) > g.t) continue;
          z.laminaT = g.t + 0.45;
          ferir(g, z, this.dano(n), 'corte');
          if (!z.morto && g.rng.next() < 0.2) g.aplicarStatus(z, 'sangramento');
        }
      }
    }
  },
  molotov: {
    nome: 'Coquetel molotov', emoji: '🍾', max: 5,
    cd: n => 8 - n * 0.6, dur: n => 3 + n * 0.6, tam: n => 1.3 + n * 0.2,
    desc: n => `fogo no chão por ${(3 + n * 0.6).toFixed(1)}s a cada ${(8 - n * 0.6).toFixed(1)}s (não queima o herói)`,
    usar(g, h, n) {
      const z = maiorGrupo(g, h, 6, 1.4);
      if (!z) return false;
      const x = z.x, y = z.y, m = this.tam(n) / 2;
      g.emit('arremesso', { tipo: 'molotov', x0: h.x, y0: h.y, x1: x, y1: y, t: 0.55 });
      g.agendar(0.55, () => {
        explosaoAmiga(g, x, y, m + 0.3, 8 + n * 3, 'fogo', 1.5);
        if (g.zonas.length < 16) g.zonas.push({ tipo: 'fogo', x0: x - m, y0: y - m, x1: x + m, y1: y + m, t: this.dur(n), doHeroi: true, semente: g.rng.int(1, 1e6) });
      });
      return true;
    }
  },
  drone: {
    nome: 'Drone atirador', emoji: '🛸', max: 5,
    cd: n => 0.95 - n * 0.08, dano: n => 5 + n * 3,
    desc: n => `um drone atira sozinho a cada ${(0.95 - n * 0.08).toFixed(2)}s · ${5 + n * 3} de dano`,
    usar(g, h, n) {
      const a = g.t * 1.6, dx = h.x + Math.cos(a) * 0.8, dy = h.y + Math.sin(a) * 0.8;
      const z = maisPerto(g, dx, dy, 5.5, null, true);
      if (!z) return false;
      ferir(g, z, this.dano(n), 'perfuracao');
      g.emit('tiro', { x: dx, y: dy, tx: z.x, ty: z.y, arma: 'drone', acertou: true, drone: true });
      return true;
    }
  },
  onda: {
    nome: 'Onda de choque', emoji: '💫', max: 5,
    cd: n => 9.5 - n * 0.8, dano: n => 12 + n * 8, raio: n => 2.2 + n * 0.2,
    desc: n => `empurra e atordoa tudo em volta a cada ${(9.5 - n * 0.8).toFixed(1)}s · ${12 + n * 8} de dano`,
    usar(g, h, n) {
      const r = this.raio(n);
      const perto = alvos(g).filter(z => dist2(z.x, z.y, h.x, h.y) < r * r);
      if (perto.length < 3 && !perto.some(z => dist2(z.x, z.y, h.x, h.y) < 1.2)) return false;
      g.emit('onda', { x: h.x, y: h.y, raio: r });
      for (const z of perto) {
        const d = dist(z.x, z.y, h.x, h.y) || 0.01;
        ferir(g, z, this.dano(n), 'impacto');
        if (z.morto) continue;
        g.aplicarStatus(z, 'atordoado', { duracao: 1 });
        if (!ZUMBIS[z.tipo].chefe) { z.kx += (z.x - h.x) / d * 8; z.ky += (z.y - h.y) / d * 8; }
      }
      return true;
    }
  }
};

/* ---------------- Passivas ---------------- */
// mod(n): modificador de atributo (dano.js) no nível n. Cada nível substitui o anterior (id fixo).
export const PASSIVAS = {
  vitalidade: { nome: 'Vitalidade', emoji: '❤️', max: 5, mod: n => ({ attr: 'vidaMax', mult: 1 + 0.12 * n }), desc: n => `+${12 * n}% de vida máxima` },
  couro:      { nome: 'Couro grosso', emoji: '🛡️', max: 5, mod: n => ({ attr: 'defesa', soma: 0.05 * n }), desc: n => `+${5 * n}% de defesa` },
  pernas:     { nome: 'Pernas rápidas', emoji: '👟', max: 5, mod: n => ({ attr: 'velocidade', mult: 1 + 0.07 * n }), desc: n => `+${7 * n}% de velocidade` },
  mira:       { nome: 'Olho de águia', emoji: '🎯', max: 5, mod: n => ({ attr: 'critChance', soma: 0.06 * n }), desc: n => `+${6 * n}% de chance de crítico` },
  maos:       { nome: 'Mãos rápidas', emoji: '🔁', max: 5, mod: n => ({ attr: 'cadencia', mult: 1 + 0.1 * n }), desc: n => `ataca ${10 * n}% mais rápido` },
  forca:      { nome: 'Força', emoji: '💪', max: 5, mod: n => ({ attr: 'dano', mult: 1 + 0.1 * n }), desc: n => `+${10 * n}% de dano em tudo` },
  regen:      { nome: 'Regeneração', emoji: '💚', max: 5, mod: n => ({ attr: 'regen', soma: 0.45 * n }), desc: n => `recupera ${(0.45 * n).toFixed(1)} de vida por segundo` },
  vampiro:    { nome: 'Vampirismo', emoji: '🦇', max: 5, mod: n => ({ attr: 'curaPorAcerto', soma: 0.35 * n }), desc: n => `cada golpe de perto cura ${(0.35 * n).toFixed(1)}` },
  reflexos:   { nome: 'Reflexos', emoji: '💨', max: 5, mod: n => ({ attr: 'esquiva', soma: 0.04 * n }), desc: n => `${4 * n}% de chance de desviar` }
};

/* ---------------- Armas que viram de vez ---------------- */
export const ARMAS_NOVAS = {
  escopeta: { nome: 'Escopeta', emoji: '💥', desc: () => 'troca a pistola pela escopeta de vez (recarrega sozinha)', pode: h => h.arma === 'pistola' && !h.armaFixa },
  taco: { nome: 'Taco com pregos', emoji: '🏏', desc: () => 'golpe de perto forte que não quebra mais', pode: h => h.corpo === 'empurrao' && !h.corpoFixo }
};

/* ---------------- Supremas (escolha especial do nível 10) ---------------- */
// No nível 10 o jogo aperta (zumbis na quantidade cheia, hordas a cada 35 s e a horda grande do nível).
// Nesse nível, em vez das cartas normais, o chat escolhe 1 destas 3. O herói só tem uma suprema.
export const NIVEL_SUPREMA = 10;
export const SUPREMAS = {
  bombardeio: {
    nome: 'Ataque aéreo', emoji: '✈️', cd: 11, bombas: 6, dano: 75, raio: 1.9,
    desc: () => 'a cada 11s caem 6 bombas nos maiores grupos de zumbis (75 de dano cada)',
    usar(g, h) {
      const vivos = alvos(g).filter(z => dist2(z.x, z.y, h.x, h.y) < 49);
      if (vivos.length < 4) return false;
      const ja = [];
      for (let k = 0; k < this.bombas; k++) {
        // centro do maior grupo que ainda não levou bomba (longe das bombas já marcadas)
        let melhor = null, mq = 0;
        for (const z of vivos) {
          if (ja.some(p => dist2(p[0], p[1], z.x, z.y) < 1.6 * 1.6)) continue;
          let q = 0;
          for (const o of vivos) if (dist2(z.x, z.y, o.x, o.y) < this.raio * this.raio) q++;
          if (ZUMBIS[z.tipo].chefe) q += 3;
          if (q > mq) { mq = q; melhor = z; }
        }
        if (!melhor) break;
        ja.push([melhor.x, melhor.y]);
      }
      g.emit('aviso', { texto: '✈️ ATAQUE AÉREO!', tipo: 'bom' });
      ja.forEach(([x, y], k) => g.agendar(0.35 + k * 0.14, () => explosaoAmiga(g, x, y, this.raio, this.dano, 'explosao', 5)));
      return true;
    }
  },
  aura: {
    nome: 'Aura de fogo', emoji: '☀️', continua: true, raio: 2.3, dano: 13, intervalo: 0.5,
    desc: () => 'queima tudo que chega perto: 26 de dano por segundo em volta do herói e deixa os zumbis lentos',
    atualizar(g, h, dt) {
      h.auraT = (h.auraT ?? 0) - dt;
      if (h.auraT > 0) return;
      h.auraT = this.intervalo;
      for (const z of alvos(g)) {
        const r = this.raio + ZUMBIS[z.tipo].raio;
        if (dist2(z.x, z.y, h.x, h.y) > r * r) continue;
        ferir(g, z, this.dano, 'fogo');
        if (!z.morto) g.aplicarStatus(z, 'lento', { duracao: 1 });
      }
    }
  },
  imortal: {
    nome: 'Coração de ferro', emoji: '❤️‍🔥', cd: 40, defesa: 0.15, regen: 1.2, cura: 45, raio: 3,
    desc: () => '+15% de defesa e regenera; quase caindo, explode uma onda, cura 45% e fica 3s invencível (a cada 40s)',
    mods: () => [{ attr: 'defesa', soma: 0.15 }, { attr: 'regen', soma: 1.2 }],
    // chamado quando a vida fica baixa (ou o golpe ia derrubar). Devolve true se salvou.
    salvar(g, h) {
      if ((h.supremaT ?? 0) > 0) return false;
      h.supremaT = this.cd;
      h.vida = Math.max(h.vida, 1);
      h.invT = Math.max(h.invT, 3);
      g.emit('onda', { x: h.x, y: h.y, raio: this.raio });
      for (const z of alvos(g)) {
        const d = dist(z.x, z.y, h.x, h.y) || 0.01;
        if (d > this.raio) continue;
        ferir(g, z, 40, 'impacto');
        if (z.morto) continue;
        g.aplicarStatus(z, 'atordoado', { duracao: 1.2 });
        if (!ZUMBIS[z.tipo].chefe) { z.kx += (z.x - h.x) / d * 9; z.ky += (z.y - h.y) / d * 9; }
      }
      h.vida = Math.min(h.vidaMax, h.vida + h.vidaMax * this.cura / 100);
      g.emit('cura', { valor: this.cura, x: h.x, y: h.y, salvou: false, item: false });
      g.emit('aviso', { texto: '❤️‍🔥 CORAÇÃO DE FERRO! O herói se levantou na marra!', tipo: 'bom' });
      return true;
    }
  }
};
function cartaSuprema(id) {
  const S = SUPREMAS[id];
  return { tipo: 'suprema', id, nivel: 1, nome: S.nome, emoji: S.emoji, desc: S.desc(), cat: 'suprema' };
}
// As 3 cartas do nível 10
export function cartasSupremas() {
  return Object.keys(SUPREMAS).map((id, k) => ({ ...cartaSuprema(id), letra: 'ABC'[k] }));
}

export const TREINO_MAX = 5;
// Categoria de perícia do ataque principal do herói
export function categoriaPrincipal(h) {
  return h.arma ? ARMAS[h.arma].categoria : CORPO[h.corpo].categoria;
}

/* ---------------- Sorteio das 3 cartas ---------------- */
function cartaAtiva(id, n) {
  const A = ATIVAS[id];
  return { tipo: 'ativa', id, nivel: n, nome: A.nome, emoji: A.emoji, desc: A.desc(n) };
}
function cartaPassiva(id, n) {
  const P = PASSIVAS[id];
  return { tipo: 'passiva', id, nivel: n, nome: P.nome, emoji: P.emoji, desc: P.desc(n) };
}

// Devolve 3 cartas: [aprimorar, nova, passiva] (quando falta uma categoria, completa com as outras)
export function sortearCartas(h, rng) {
  const habs = h.habs || {}, pas = h.passivas || {};
  const aprimorar = [], nova = [], passiva = [];
  for (const [id, n] of Object.entries(habs)) if (n < ATIVAS[id].max) aprimorar.push({ ...cartaAtiva(id, n + 1), cat: 'aprimorar', peso: 1.3 });
  for (const [id, n] of Object.entries(pas)) if (n < PASSIVAS[id].max) aprimorar.push({ ...cartaPassiva(id, n + 1), cat: 'aprimorar', peso: 0.8 });
  if ((h.treino || 0) < TREINO_MAX) {
    const cat = categoriaPrincipal(h), P = PERICIAS[cat];
    aprimorar.push({ tipo: 'treino', id: cat, nivel: (h.treino || 0) + 1, nome: `Treino: ${P.nome}`, emoji: P.emoji, desc: '+1 de perícia no ataque principal (dano, cadência, crítico)', cat: 'aprimorar', peso: 0.9 });
  }
  if (Object.keys(habs).length < MAX_ATIVAS) for (const id of Object.keys(ATIVAS)) if (!habs[id]) nova.push({ ...cartaAtiva(id, 1), cat: 'nova', peso: 1 });
  for (const [id, A] of Object.entries(ARMAS_NOVAS)) if (A.pode(h)) nova.push({ tipo: 'arma', id, nivel: 1, nome: A.nome, emoji: A.emoji, desc: A.desc(), cat: 'nova', peso: 0.8 });
  for (const id of Object.keys(PASSIVAS)) if (!pas[id]) passiva.push({ ...cartaPassiva(id, 1), cat: 'passiva', peso: 1 });

  const tirar = lista => {
    if (!lista.length) return null;
    const i = rng.weighted(lista.map((c, k) => [k, c.peso]));
    return lista.splice(i, 1)[0];
  };
  const cartas = [tirar(aprimorar), tirar(nova), tirar(passiva)];
  const resto = [...aprimorar, ...nova, ...passiva];
  for (let k = 0; k < 3; k++) if (!cartas[k]) cartas[k] = tirar(resto);
  return cartas.filter(Boolean).map((c, k) => ({ ...c, letra: 'ABC'[k] }));
}

// Escolha da IA quando ninguém vota: começa pegando habilidades novas, depois melhora o que tem.
// Com pouca vida, prefere vida, defesa e regeneração.
export function escolhaDaIA(h, cartas, rng) {
  const vidaPct = h.vida / h.vidaMax;
  const nAtivas = Object.keys(h.habs || {}).length;
  return rng.weighted(cartas.map(c => {
    let p = 1;
    if (c.tipo === 'ativa') p = c.cat === 'nova' ? (nAtivas < 2 ? 2.2 : 1.1) : 1.6;
    if (c.tipo === 'arma') p = 1.5;
    if (c.tipo === 'treino') p = 1;
    if (c.tipo === 'suprema') p = c.id === 'imortal' && vidaPct < 0.4 ? 2 : 1;
    if (c.tipo === 'passiva' && vidaPct < 0.5 && ['vitalidade', 'couro', 'regen'].includes(c.id)) p = 2;
    return [c.letra, p];
  }));
}

/* ---------------- Aplicar a carta escolhida ---------------- */
export function aplicarCarta(g, carta) {
  const h = g.hero;
  h.habs = h.habs || {}; h.passivas = h.passivas || {};
  if (carta.tipo === 'ativa') {
    h.habs[carta.id] = carta.nivel;
    h.habT = h.habT || {};
    h.habT[carta.id] = Math.min(h.habT[carta.id] ?? 0.5, 0.5);   // já dispara logo
  } else if (carta.tipo === 'passiva') {
    const P = PASSIVAS[carta.id];
    const antes = h.attr.get('vidaMax');
    h.passivas[carta.id] = carta.nivel;
    h.attr.addMod({ ...P.mod(carta.nivel), id: 'pas:' + carta.id, fonte: P.nome });
    g.sincronizarVida();
    const ganhou = h.attr.get('vidaMax') - antes;
    if (ganhou > 0) h.vida = Math.min(h.vidaMax, h.vida + ganhou);
  } else if (carta.tipo === 'treino') {
    h.treino = (h.treino || 0) + 1;
    h.pericias[carta.id] = (h.pericias[carta.id] ?? 2) + 1;
    aplicarPericias(h, CLASSES[h.classe]);
    g.sincronizarVida();
  } else if (carta.tipo === 'suprema') {
    const S = SUPREMAS[carta.id];
    h.suprema = carta.id;
    h.supremaT = 1;   // ataque aéreo já sai logo
    h.vida = Math.min(h.vidaMax, h.vida + h.vidaMax * 0.3);   // chega com fôlego pra horda grande
    for (const [k, m] of (S.mods ? S.mods() : []).entries()) h.attr.addMod({ ...m, id: `sup:${carta.id}:${k}`, fonte: S.nome });
    g.sincronizarVida();
  } else if (carta.tipo === 'arma') {
    if (carta.id === 'escopeta') { h.armaFixa = 'escopeta'; g.trocarArma('escopeta', null); }
    if (carta.id === 'taco') { h.corpoFixo = 'taco'; h.corpo = 'taco'; h.golpes = Infinity; }
  }
}

/* ---------------- Rodar as habilidades ativas ---------------- */
export function atualizarHabilidades(g, dt) {
  const h = g.hero;
  atualizarSuprema(g, h, dt);
  if (!h.habs) return;
  h.habT = h.habT || {};
  for (const [id, n] of Object.entries(h.habs)) {
    const A = ATIVAS[id];
    if (A.continua) { A.atualizar(g, h, n, dt); continue; }
    h.habT[id] = (h.habT[id] ?? 1) - dt;
    if (h.habT[id] > 0) continue;
    h.habT[id] = A.usar(g, h, n) ? A.cd(n) : 0.4;   // sem alvo: tenta de novo logo
  }
}

function atualizarSuprema(g, h, dt) {
  const S = h.suprema && SUPREMAS[h.suprema];
  if (!S) return;
  if (S.continua) { S.atualizar(g, h, dt); return; }
  h.supremaT = (h.supremaT ?? 0) - dt;
  if (S.usar) { if (h.supremaT <= 0) h.supremaT = S.usar(g, h) ? S.cd : 0.5; return; }
  if (S.salvar && h.vida / h.vidaMax < 0.25) S.salvar(g, h);
}

// Golpe que ia derrubar o herói: o Coração de ferro segura (se estiver pronto)
export function supremaSegura(g, h) {
  const S = h.suprema && SUPREMAS[h.suprema];
  return !!(S && S.salvar && S.salvar(g, h));
}

// Lista pra mostrar na tela: [{ emoji, nome, nivel, tipo }]
export function habilidadesDoHeroi(h) {
  const l = [];
  for (const [id, n] of Object.entries(h.habs || {})) l.push({ emoji: ATIVAS[id].emoji, nome: ATIVAS[id].nome, nivel: n, tipo: 'ativa', pronta: (h.habT?.[id] ?? 0) <= 0.2 });
  for (const [id, n] of Object.entries(h.passivas || {})) l.push({ emoji: PASSIVAS[id].emoji, nome: PASSIVAS[id].nome, nivel: n, tipo: 'passiva' });
  if (h.treino) l.push({ emoji: '🎓', nome: 'Treino', nivel: h.treino, tipo: 'passiva' });
  if (h.suprema) { const S = SUPREMAS[h.suprema]; l.unshift({ emoji: S.emoji, nome: S.nome, nivel: 1, tipo: 'suprema', pronta: S.continua || (h.supremaT ?? 0) <= 0.2 }); }
  return l;
}
