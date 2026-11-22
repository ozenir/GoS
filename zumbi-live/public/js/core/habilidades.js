// ============================================================================
//  HABILIDADES (estilo roguelike) — a cada nível, o chat escolhe 1 de 3 cartas.
//
//  Tipos de carta:
//    ativa    habilidade que dispara sozinha de tempos em tempos (granada, raio...)
//    passiva  melhora um atributo do herói (vida, defesa, velocidade...)
//    treino   +1 de perícia no ataque principal (mais dano, cadência e crítico)
//    arma     troca a arma (escopeta) ou o golpe de perto (taco) de vez
//    combo    habilidade (nível 3+) + a passiva que combina com ela = habilidade evoluída (COMBOS)
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
import { ZUMBIS, ARMAS, CORPO, CLASSES, NIVEL_MAXIMO } from './dados.js';
import { danoNoZumbi, aplicarPericias, PERICIAS } from './dano.js';
import { dist, dist2 } from './util.js';
import { multRunaDano } from './recompensas.js';

export const MAX_ATIVAS = 5;     // slots de habilidade (esquerda do núcleo) — fusão solta ainda gasta a vaga
export const MAX_PASSIVAS = 5;   // slots de passiva (direita do núcleo) — idem

// Zumbis que dá pra acertar (vivos e já de pé)
// (zumbi do fã com escudo fica de fora: ainda não pode morrer)
const alvos = g => g.zumbis.filter(z => !z.morto && !(z.nascendo > 0) && !(z.fa?.escudo > 0));

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

/* ---------------- Quanto cada nível fortalece ---------------- */
// Cada nível de habilidade ou passiva multiplica a força dela (dano, bônus) por FORCA(n):
//   nível 1 = 1×, nível 2 = 3× (triplica), nível 3 = 5×, nível 4 = 7,5×, nível 5 = 10×.
export const FORCA_NIVEL = [0, 1, 3, 5, 7.5, 10];
export const FORCA = n => FORCA_NIVEL[Math.max(0, Math.min(FORCA_NIVEL.length - 1, n))];
const f1 = v => (Math.round(v * 10) / 10).toLocaleString('pt-BR');
const pct = v => `${Math.round(v * 100)}%`;

/* ---------------- Habilidades ativas ---------------- */
export const ATIVAS = {
  granada: {
    nome: 'Granada', emoji: '💣', max: 5,
    cd: n => 7 - n * 0.5, dano: n => 45 * FORCA(n), raio: n => 1.6 + n * 0.2,
    desc(n) { return `joga no maior grupo a cada ${f1(this.cd(n))}s · ${Math.round(this.dano(n))} de dano`; },
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
    cd: n => 4.4 - n * 0.3, dano: n => 18 * FORCA(n), saltos: n => 2 + n, atordoa: n => 0.3 + n * 0.08,
    desc(n) { return `pula em ${this.saltos(n) + 1} zumbis a cada ${f1(this.cd(n))}s · ${Math.round(this.dano(n))} de dano, atordoa`; },
    usar(g, h, n) {
      let z = maisPerto(g, h.x, h.y, 5.5, null, true);
      if (!z) return false;
      const ja = new Set(), pts = [[h.x, h.y]];
      for (let k = 0; k <= this.saltos(n) && z; k++) {
        ja.add(z); pts.push([z.x, z.y]);
        ferir(g, z, this.dano(n), 'eletrico');
        if (!z.morto && g.rng.next() < this.atordoa(n)) g.aplicarStatus(z, 'atordoado', { duracao: 0.6 });
        z = maisPerto(g, z.x, z.y, 2.6, ja);
      }
      g.emit('raio', { pts });
      return true;
    }
  },
  laminas: {
    nome: 'Lâminas giratórias', emoji: '🌀', max: 5, continua: true,
    qtd: n => 1 + Math.ceil(n / 2), dano: n => 9 * FORCA(n), raio: () => 1.25,
    desc(n) { return `${this.qtd(n)} lâminas girando em volta · ${Math.round(this.dano(n))} de dano, fazem sangrar`; },
    atualizar(g, h, n, dt) { girarLaminas(g, h, this.qtd(n), this.raio(n), this.dano(n), 0.2, 0); }
  },
  molotov: {
    nome: 'Coquetel molotov', emoji: '🍾', max: 5,
    cd: n => 7.5 - n * 0.5, dur: n => 3 + n * 0.6, tam: n => 1.3 + n * 0.2, dano: n => 12 * FORCA(n), fogo: n => FORCA(n),
    desc(n) { return `fogo no chão por ${f1(this.dur(n))}s a cada ${f1(this.cd(n))}s · fogo ${f1(this.fogo(n))}× mais forte (não queima o herói)`; },
    usar(g, h, n) {
      const z = maiorGrupo(g, h, 6, 1.4);
      if (!z) return false;
      jogarMolotov(g, h, z.x, z.y, this.tam(n), this.dur(n), this.dano(n), this.fogo(n));
      return true;
    }
  },
  drone: {
    nome: 'Drone atirador', emoji: '🛸', max: 5,
    cd: n => 0.9 - n * 0.08, dano: n => 6 * FORCA(n),
    desc(n) { return `um drone atira sozinho a cada ${this.cd(n).toFixed(2).replace('.', ',')}s · ${Math.round(this.dano(n))} de dano`; },
    usar(g, h, n) { return tiroDeDrone(g, h, 0, this.dano(n)); }
  },
  onda: {
    nome: 'Onda de choque', emoji: '💫', max: 5,
    cd: n => 9 - n * 0.8, dano: n => 16 * FORCA(n), raio: n => 2.2 + n * 0.25,
    desc(n) { return `empurra e atordoa tudo em volta a cada ${f1(this.cd(n))}s · ${Math.round(this.dano(n))} de dano`; },
    usar(g, h, n) { return ondaDeChoque(g, h, this.raio(n), this.dano(n), 1, 8, 3); }
  }
};

// --- pedaços usados pelas habilidades normais e pelos combos ---
function girarLaminas(g, h, q, raio, dano, chanceSangra, cura, intervalo = 0.45) {
  h.laminaAng = h.laminaAng || 0;
  for (let k = 0; k < q; k++) {
    const a = h.laminaAng + k * Math.PI * 2 / q;
    const bx = h.x + Math.cos(a) * raio, by = h.y + Math.sin(a) * raio;
    for (const z of alvos(g)) {
      const r = ZUMBIS[z.tipo].raio + 0.3;
      if (dist2(bx, by, z.x, z.y) > r * r || (z.laminaT || 0) > g.t) continue;
      z.laminaT = g.t + intervalo;
      ferir(g, z, dano, 'corte');
      if (cura) h.vida = Math.min(h.vidaMax, h.vida + cura);
      if (!z.morto && g.rng.next() < chanceSangra) g.aplicarStatus(z, 'sangramento', { pilhas: chanceSangra >= 1 ? 2 : 1 });
    }
  }
}
// o ângulo das lâminas gira uma vez por quadro (fora de girarLaminas, pra normal e combo girarem igual)
function girarAngulo(h, dt) { h.laminaAng = ((h.laminaAng || 0) + dt * 3.4) % (Math.PI * 2); }

function jogarMolotov(g, h, x, y, tam, dur, dano, fogo, extra = {}) {
  const m = tam / 2;
  g.emit('arremesso', { tipo: 'molotov', x0: h.x, y0: h.y, x1: x, y1: y, t: 0.55 });
  g.agendar(0.55, () => {
    explosaoAmiga(g, x, y, m + 0.3, dano, 'fogo', 1.5);
    if (g.zonas.length < 20) g.zonas.push({ tipo: 'fogo', x0: x - m, y0: y - m, x1: x + m, y1: y + m, t: dur, doHeroi: true, mult: fogo, semente: g.rng.int(1, 1e6), ...extra });
  });
}

// k = qual drone (0, 1, 2...): cada um gira em volta do herói num ângulo diferente
export const posDrone = (g, h, k, total = 1) => { const a = g.t * 1.6 + k * Math.PI * 2 / total; return [h.x + Math.cos(a) * 0.8, h.y + Math.sin(a) * 0.8]; };
function tiroDeDrone(g, h, k, dano, total = 1, ignorar = null) {
  const [dx, dy] = posDrone(g, h, k, total);
  const z = maisPerto(g, dx, dy, 5.5, ignorar, true);
  if (!z) return false;
  ferir(g, z, dano, 'perfuracao');
  g.emit('tiro', { x: dx, y: dy, tx: z.x, ty: z.y, arma: 'drone', acertou: true, drone: true });
  return z;
}

function ondaDeChoque(g, h, r, dano, atordoa, empurra, minimo) {
  const perto = alvos(g).filter(z => dist2(z.x, z.y, h.x, h.y) < r * r);
  if (perto.length < minimo && !perto.some(z => dist2(z.x, z.y, h.x, h.y) < 1.2)) return false;
  g.emit('onda', { x: h.x, y: h.y, raio: r });
  for (const z of perto) {
    const d = dist(z.x, z.y, h.x, h.y) || 0.01;
    ferir(g, z, dano, 'impacto');
    if (z.morto) continue;
    g.aplicarStatus(z, 'atordoado', { duracao: atordoa });
    if (!ZUMBIS[z.tipo].chefe) { z.kx += (z.x - h.x) / d * empurra; z.ky += (z.y - h.y) / d * empurra; }
  }
  return true;
}

/* ---------------- Passivas ---------------- */
// mod(n): modificador de atributo (dano.js) no nível n. Cada nível substitui o anterior (id fixo).
// O bônus é o do nível 1 × FORCA(n): o nível 2 triplica.
const passiva = (nome, emoji, attr, tipo, base, texto) => ({
  nome, emoji, max: 5, base,
  mod: n => (tipo === 'mult' ? { attr, mult: 1 + base * FORCA(n) } : { attr, soma: base * FORCA(n) }),
  desc: n => texto(base * FORCA(n))
});
export const PASSIVAS = {
  vitalidade: passiva('Vitalidade', '❤️', 'vidaMax', 'mult', 0.15, v => `+${pct(v)} de vida máxima`),
  couro:      passiva('Couro grosso', '🛡️', 'defesa', 'soma', 0.04, v => `+${pct(v)} de defesa`),
  pernas:     passiva('Pernas rápidas', '👟', 'velocidade', 'mult', 0.05, v => `+${pct(v)} de velocidade`),
  mira:       passiva('Olho de águia', '🎯', 'critChance', 'soma', 0.05, v => `+${pct(v)} de chance de crítico`),
  maos:       passiva('Mãos rápidas', '🔁', 'cadencia', 'mult', 0.1, v => `ataca ${pct(v)} mais rápido`),
  forca:      passiva('Força', '💪', 'dano', 'mult', 0.1, v => `+${pct(v)} de dano em tudo`),
  regen:      passiva('Regeneração', '💚', 'regen', 'soma', 0.5, v => `recupera ${f1(v)} de vida por segundo`),
  vampiro:    passiva('Vampirismo', '🦇', 'curaPorAcerto', 'soma', 0.5, v => `cada golpe de perto cura ${f1(v)}`),
  reflexos:   passiva('Reflexos', '💨', 'esquiva', 'soma', 0.03, v => `${pct(v)} de chance de desviar`),
  // Anti-explosão: a que salva do nível 20 em diante, quando chegam os inchados instáveis (ameaca.js → EXPLOSAO).
  // Por isso, a partir do nível SALVA_DESDE ela é sempre a carta C (até o herói ter), aparece mais pra
  // aprimorar e a IA prefere ela. Antes disso é rara.
  // (resistência a explosão tem teto de 80%: nível 5 já chega lá)
  explosao:   passiva('Anti-explosão', '🧯', 'resExplosao', 'soma', 0.08, v => `${pct(v)} menos dano de explosão (salva dos inchados do nível 20)`)
};
// Nível do herói em que a Anti-explosão vira prioridade (um antes dos inchados instáveis)
export const SALVA_DESDE = 19;
const salva = (h, id) => id === 'explosao' && h.nivel >= SALVA_DESDE;

/* ---------------- Combos: habilidade + passiva = habilidade evoluída ---------------- */
// Quando o herói tem uma habilidade no nível COMBO_NIVEL (ou mais) e a passiva que combina com ela,
// aparece a carta COMBO. Escolhendo, a habilidade vira a versão evoluída (bem mais forte, com a força
// da passiva junto). A passiva continua com o herói e, se subir de nível, deixa o combo mais forte.
//   p = nível da passiva do combo (1 a 5)
export const COMBO_NIVEL = 3;
const forcaPassiva = p => 1 + 0.25 * (p - 1);   // passiva nível 1 = 1×, nível 5 = 2×
export const COMBOS = {
  fragmentacao: {
    ativa: 'granada', passiva: 'forca', nome: 'Bomba de fragmentação', emoji: '☄️',
    cd: () => 3, dano: p => 800 * forcaPassiva(p), raio: () => 3, cacos: 6,
    desc(p) { return `a cada ${f1(this.cd(p))}s: bomba de ${Math.round(this.dano(p))} de dano que solta ${this.cacos} explosões menores em volta`; },
    usar(g, h, p) {
      const z = maiorGrupo(g, h, 7, this.raio(p));
      if (!z) return false;
      const x = z.x, y = z.y, r = this.raio(p), d = this.dano(p);
      g.emit('arremesso', { tipo: 'granada', x0: h.x, y0: h.y, x1: x, y1: y, t: 0.45 });
      g.agendar(0.45, () => {
        explosaoAmiga(g, x, y, r, d, 'explosao', 6);
        for (let k = 0; k < this.cacos; k++) {
          const a = k / this.cacos * Math.PI * 2 + g.rng.next(), dd = 1.6 + g.rng.next() * 0.8;
          g.agendar(0.2 + k * 0.08, () => explosaoAmiga(g, x + Math.cos(a) * dd, y + Math.sin(a) * dd, 1.5, d * 0.45, 'explosao', 3));
        }
      });
      return true;
    }
  },
  tempestade: {
    ativa: 'raio', passiva: 'mira', nome: 'Tempestade elétrica', emoji: '🌩️',
    cd: () => 1.8, dano: p => 380 * forcaPassiva(p), cadeias: 3, saltos: 8,
    desc(p) { return `a cada ${f1(this.cd(p))}s: ${this.cadeias} raios que pulam em ${this.saltos} zumbis · ${Math.round(this.dano(p))} de dano, sempre atordoa e pode dar crítico`; },
    usar(g, h, p) {
      const ja = new Set();
      let algum = false;
      for (let c = 0; c < this.cadeias; c++) {
        let z = maisPerto(g, h.x, h.y, 6.5, ja, true);
        if (!z) break;
        algum = true;
        const pts = [[h.x, h.y]];
        for (let k = 0; k < this.saltos && z; k++) {
          ja.add(z); pts.push([z.x, z.y]);
          const crit = g.rng.next() < h.attr.get('critChance');
          ferir(g, z, this.dano(p) * (crit ? h.attr.get('critMult') : 1), 'eletrico');
          if (!z.morto) g.aplicarStatus(z, 'atordoado', { duracao: 0.8 });
          z = maisPerto(g, z.x, z.y, 3, ja);
        }
        g.emit('raio', { pts });
      }
      return algum;
    }
  },
  vampiricas: {
    ativa: 'laminas', passiva: 'vampiro', nome: 'Lâminas vampíricas', emoji: '🩸', continua: true,
    qtd: () => 6, raio: () => 1.55, dano: p => 200 * forcaPassiva(p), cura: p => 1 + p,
    desc(p) { return `${this.qtd(p)} lâminas de sangue · ${Math.round(this.dano(p))} de dano, sempre fazem sangrar e cada corte cura ${this.cura(p)}`; },
    atualizar(g, h, p, dt) { girarLaminas(g, h, this.qtd(p), this.raio(p), this.dano(p), 1, this.cura(p), 0.3); }
  },
  fenix: {
    ativa: 'molotov', passiva: 'regen', nome: 'Fogo da fênix', emoji: '🐦‍🔥',
    cd: () => 4, garrafas: 3, dano: p => 120 * forcaPassiva(p), fogo: p => 14 * forcaPassiva(p), cura: p => 4 + p * 2,
    desc(p) { return `a cada ${f1(this.cd(p))}s joga ${this.garrafas} molotovs · fogo ${Math.round(this.fogo(p))}× mais forte e o fogo CURA o herói (${this.cura(p)}/s)`; },
    usar(g, h, p) {
      const ja = [];
      for (let k = 0; k < this.garrafas; k++) {
        const z = alvos(g).filter(o => dist2(o.x, o.y, h.x, h.y) < 36 && !ja.some(q => dist2(q[0], q[1], o.x, o.y) < 2.2)).sort((a, b) => dist2(a.x, a.y, h.x, h.y) - dist2(b.x, b.y, h.x, h.y))[0];
        if (!z) break;
        ja.push([z.x, z.y]);
      }
      if (!ja.length) return false;
      // um dos fogos sempre cai em volta do herói (é o que cura ele)
      if (ja.length < this.garrafas) ja.push([h.x, h.y]);
      for (const [x, y] of ja) jogarMolotov(g, h, x, y, 2.6, 5, this.dano(p), this.fogo(p), { fenix: true });
      return true;
    },
    // herói pisando no fogo da fênix se cura
    sempre(g, h, p, dt) {
      if (g.zonas.some(z => z.fenix && h.x >= z.x0 && h.x <= z.x1 && h.y >= z.y0 && h.y <= z.y1)) h.vida = Math.min(h.vidaMax, h.vida + this.cura(p) * dt);
    }
  },
  esquadrilha: {
    ativa: 'drone', passiva: 'maos', nome: 'Esquadrilha de drones', emoji: '🛰️',
    cd: () => 0.3, drones: 3, dano: p => 60 * forcaPassiva(p),
    desc(p) { return `${this.drones} drones atirando a cada ${f1(this.cd(p))}s · ${Math.round(this.dano(p))} de dano cada tiro`; },
    usar(g, h, p) {
      const ja = new Set();
      for (let k = 0; k < this.drones; k++) { const z = tiroDeDrone(g, h, k, this.dano(p), this.drones, ja); if (z) ja.add(z); }
      return ja.size > 0;
    }
  },
  fortaleza: {
    ativa: 'onda', passiva: 'couro', nome: 'Fortaleza', emoji: '🏰',
    cd: () => 4, dano: p => 600 * forcaPassiva(p), raio: () => 3.6,
    desc(p) { return `a cada ${f1(this.cd(p))}s: onda gigante de ${Math.round(this.dano(p))} de dano que atordoa e deixa o herói blindado (+40% de defesa)`; },
    usar(g, h, p) {
      if (!ondaDeChoque(g, h, this.raio(p), this.dano(p), 1.6, 12, 2)) return false;
      g.aplicarStatus(h, 'blindado', { duracao: 4 });
      return true;
    }
  }
};
export const comboDaAtiva = id => Object.entries(COMBOS).find(([, C]) => C.ativa === id)?.[0] || null;

/* ---------------- Armas que viram de vez ---------------- */
export const ARMAS_NOVAS = {
  escopeta: { nome: 'Escopeta', emoji: '💥', desc: () => 'troca a pistola pela escopeta de vez (recarrega sozinha)', pode: h => h.arma === 'pistola' && !h.armaFixa },
  taco: { nome: 'Taco com pregos', emoji: '🏏', desc: () => 'golpe de perto forte que não quebra mais', pode: h => h.corpo === 'empurrao' && !h.corpoFixo }
};

/* ---------------- Supremas (escolha especial do nível 10) ---------------- */
// No nível 10 o jogo vira: daí em diante as hordas gigantes (a cada 5 quarteirões) crescem bem.
// Nesse nível, em vez das cartas normais, o chat escolhe 1 destas 3. O herói só tem uma suprema.
export const NIVEL_SUPREMA = 10;
// Avião do Ataque aéreo: passa em linha reta por cima dos alvos (meio = metade do caminho, em casas) em voo segundos;
// cada bomba demora queda segundos pra cair (a sombra do avião e as bombas aparecem na tela: view/render.js)
export const AVIAO = { meio: 18, voo: 3.4, queda: 0.6 };   // passa devagar, pra dar tempo de ver a sombra

export const SUPREMAS = {
  bombardeio: {
    nome: 'Ataque aéreo', divino: 'Ataque aéreo divino', emoji: '✈️', cd: 11, bombas: 6, dano: 75, raio: 1.9,
    desc: () => 'a cada 11s caem 6 bombas nos maiores grupos de zumbis (75 de dano cada)',
    usar(g, h) {
      const G = grauSuprema(h), raio = this.raio + 0.15 * G, dano = this.dano * multSuprema(h);
      const vivos = alvos(g).filter(z => dist2(z.x, z.y, h.x, h.y) < 49);
      if (vivos.length < 4) return false;
      const ja = [];
      for (let k = 0; k < this.bombas + 2 * G; k++) {
        // centro do maior grupo que ainda não levou bomba (longe das bombas já marcadas)
        let melhor = null, mq = 0;
        for (const z of vivos) {
          if (ja.some(p => dist2(p[0], p[1], z.x, z.y) < 1.6 * 1.6)) continue;
          let q = 0;
          for (const o of vivos) if (dist2(z.x, z.y, o.x, o.y) < raio * raio) q++;
          if (ZUMBIS[z.tipo].chefe) q += 3;
          if (q > mq) { mq = q; melhor = z; }
        }
        if (!melhor) break;
        ja.push([melhor.x, melhor.y]);
      }
      g.emit('aviso', { texto: `✈️ ${nomeSuprema(h).toUpperCase()}!`, tipo: 'bom' });
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
        g.agendar(b.t + A.queda, () => explosaoAmiga(g, b.x, b.y, raio, dano, 'explosao', 5));
      }
      return true;
    }
  },
  aura: {
    nome: 'Aura de fogo', divino: 'Aura divina', emoji: '☀️', continua: true, raio: 2.3, dano: 13, intervalo: 0.5,
    desc: () => 'queima tudo que chega perto: 26 de dano por segundo em volta do herói e deixa os zumbis lentos',
    atualizar(g, h, dt) {
      h.auraT = (h.auraT ?? 0) - dt;
      if (h.auraT > 0) return;
      h.auraT = this.intervalo;
      const raio = this.raio + 0.3 * grauSuprema(h), dano = this.dano * multSuprema(h);
      for (const z of alvos(g)) {
        const r = raio + ZUMBIS[z.tipo].raio;
        if (dist2(z.x, z.y, h.x, h.y) > r * r) continue;
        ferir(g, z, dano, 'fogo');
        if (!z.morto) g.aplicarStatus(z, 'lento', { duracao: 1 });
      }
    }
  },
  imortal: {
    nome: 'Coração de ferro', divino: 'Coração divino', emoji: '❤️‍🔥', cd: 40, defesa: 0.15, regen: 1.2, cura: 45, raio: 3,
    desc: () => '+15% de defesa e regenera; quase caindo, explode uma onda, cura 45% e fica 3s invencível (a cada 40s)',
    // G = grau da suprema (0 = como veio; cada terço do núcleo sobe 1; nível deus = 4)
    mods: (G = 0) => [{ attr: 'defesa', soma: 0.15 + 0.03 * G }, { attr: 'regen', soma: 1.2 * (1 + ELEVACAO.mult * G) }],
    // chamado quando a vida fica baixa (ou o golpe ia derrubar). Devolve true se salvou.
    salvar(g, h) {
      if ((h.supremaT ?? 0) > 0) return false;
      const G = grauSuprema(h), raio = this.raio + 0.5 * G, cura = this.cura + 5 * G;
      h.supremaT = cdSuprema(this, h);
      h.vida = Math.max(h.vida, 1);
      h.invT = Math.max(h.invT, 3 + 0.5 * G);
      g.emit('onda', { x: h.x, y: h.y, raio });
      for (const z of alvos(g)) {
        const d = dist(z.x, z.y, h.x, h.y) || 0.01;
        if (d > raio) continue;
        ferir(g, z, 40 * multSuprema(h), 'impacto');
        if (z.morto) continue;
        g.aplicarStatus(z, 'atordoado', { duracao: 1.2 });
        if (!ZUMBIS[z.tipo].chefe) { z.kx += (z.x - h.x) / d * 9; z.ky += (z.y - h.y) / d * 9; }
      }
      h.vida = Math.min(h.vidaMax, h.vida + h.vidaMax * cura / 100);
      g.emit('cura', { valor: cura, x: h.x, y: h.y, salvou: false, item: false });
      g.emit('aviso', { texto: `❤️‍🔥 ${nomeSuprema(h).toUpperCase()}! O herói se levantou na marra!`, tipo: 'bom' });
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
function cartaCombo(id, h) {
  const C = COMBOS[id], A = ATIVAS[C.ativa], P = PASSIVAS[C.passiva];
  return { tipo: 'combo', id, nivel: 1, nome: C.nome, emoji: C.emoji, de: `${A.emoji}+${P.emoji}`, desc: C.desc(h.passivas[C.passiva] || 1), receita: `${A.nome} + ${P.nome}`, cat: 'combo' };
}
// Combos que o herói já pode fazer: habilidade no nível COMBO_NIVEL+ (ainda não evoluída) e a passiva certa
export function combosDisponiveis(h) {
  return Object.keys(COMBOS).filter(id => {
    const C = COMBOS[id];
    return (h.habs?.[C.ativa] || 0) >= COMBO_NIVEL && (h.passivas?.[C.passiva] || 0) >= 1 && !h.evo?.[C.ativa];
  });
}

// Devolve 3 cartas: [aprimorar, nova, passiva] (quando falta uma categoria, completa com as outras)
export function sortearCartas(h, rng) {
  const habs = h.habs || {}, pas = h.passivas || {};
  const aprimorar = [], nova = [], passiva = [];
  for (const [id, n] of Object.entries(habs)) if (n < ATIVAS[id].max && !h.evo?.[id]) aprimorar.push({ ...cartaAtiva(id, n + 1), cat: 'aprimorar', peso: 1.3 });
  for (const [id, n] of Object.entries(pas)) if (n < PASSIVAS[id].max) aprimorar.push({ ...cartaPassiva(id, n + 1), cat: 'aprimorar', peso: salva(h, id) ? 2.5 : 0.8 });
  if ((h.treino || 0) < TREINO_MAX) {
    const cat = categoriaPrincipal(h), P = PERICIAS[cat];
    aprimorar.push({ tipo: 'treino', id: cat, nivel: (h.treino || 0) + 1, nome: `Treino: ${P.nome}`, emoji: P.emoji, desc: '+1 de perícia no ataque principal (dano, cadência, crítico)', cat: 'aprimorar', peso: 0.9 });
  }
  if (vagasOcupadas(h) < MAX_ATIVAS) for (const id of Object.keys(ATIVAS)) if (!habs[id]) nova.push({ ...cartaAtiva(id, 1), cat: 'nova', peso: 1 });
  for (const [id, A] of Object.entries(ARMAS_NOVAS)) if (A.pode(h)) nova.push({ tipo: 'arma', id, nivel: 1, nome: A.nome, emoji: A.emoji, desc: A.desc(), cat: 'nova', peso: 0.8 });
  if (vagasPassivas(h) < MAX_PASSIVAS) { for (const id of Object.keys(PASSIVAS)) if (!pas[id]) passiva.push({ ...cartaPassiva(id, 1), cat: 'passiva', peso: id === 'explosao' ? 0.5 : 1 }); }
  else if (!pas.explosao && salva(h, 'explosao')) {
    // slots cheios, mas a Anti-explosão é a que salva: entra no lugar da passiva mais fraca
    const troca = passivaMaisFraca(h);
    if (troca) passiva.push({ ...cartaPassiva('explosao', 1), troca, desc: `${cartaPassiva('explosao', 1).desc} (sai ${PASSIVAS[troca].emoji} ${PASSIVAS[troca].nome})`, cat: 'passiva', peso: 1 });
  }

  const tirar = lista => {
    if (!lista.length) return null;
    const i = rng.weighted(lista.map((c, k) => [k, c.peso]));
    return lista.splice(i, 1)[0];
  };
  // combo disponível: ele sempre aparece, no lugar da carta A
  const combos = combosDisponiveis(h);
  // do nível SALVA_DESDE em diante, a Anti-explosão é sempre a carta C até o herói ter ela
  const kSalva = passiva.findIndex(c => salva(h, c.id));
  const cartaC = kSalva >= 0 ? passiva.splice(kSalva, 1)[0] : tirar(passiva);
  const cartas = [combos.length ? cartaCombo(combos[Math.floor(rng.next() * combos.length)], h) : tirar(aprimorar), tirar(nova), cartaC];
  const resto = [...aprimorar, ...nova, ...passiva];
  for (let k = 0; k < 3; k++) if (!cartas[k]) cartas[k] = tirar(resto);
  return cartas.filter(Boolean).map((c, k) => ({ ...c, letra: 'ABC'[k] }));
}

// Escolha da IA quando ninguém vota: começa pegando habilidades novas, depois melhora o que tem.
// Com pouca vida, prefere vida, defesa e regeneração.
export function escolhaDaIA(h, cartas, rng) {
  const vidaPct = h.vida / h.vidaMax;
  const nAtivas = vagasOcupadas(h);
  return rng.weighted(cartas.map(c => {
    let p = 1;
    if (c.tipo === 'ativa') p = c.cat === 'nova' ? (nAtivas < 2 ? 2.2 : 1.1) : 1.6;
    if (c.tipo === 'arma') p = 1.5;
    if (c.tipo === 'treino') p = 1;
    if (c.tipo === 'combo') p = 5;
    if (c.tipo === 'suprema') p = c.id === 'imortal' && vidaPct < 0.4 ? 2 : 1;
    if (c.tipo === 'passiva' && vidaPct < 0.5 && ['vitalidade', 'couro', 'regen'].includes(c.id)) p = 2;
    if (c.tipo === 'passiva' && salva(h, c.id) && c.nivel <= 3) p = 3;   // do nível 19 em diante, a Anti-explosão salva
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
    // slots de passiva cheios: a carta diz qual passiva sai pra essa entrar (só a Anti-explosão faz isso)
    if (carta.troca && h.passivas[carta.troca]) {
      const Q = PASSIVAS[carta.troca];
      delete h.passivas[carta.troca];
      h.attr.removeMod('pas:' + carta.troca);
      g.emit('aviso', { texto: `${Q.emoji} ${Q.nome} saiu pra ${P.emoji} ${P.nome} entrar`, tipo: 'info' });
    }
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
  } else if (carta.tipo === 'combo') {
    const C = COMBOS[carta.id];
    h.evo = h.evo || {};
    h.evo[C.ativa] = carta.id;
    h.habT = h.habT || {};
    h.habT[C.ativa] = 0.3;   // já dispara logo
    h.fusoes = [...(h.fusoes || []), carta.id];   // vai pro slot pequeno do lado do núcleo (2 fusões = 1/3 do núcleo)
    // tabela do T (fusoes.js): a fusão fica descoberta pra live toda
    if (g.fusoesDaLive && !g.fusoesDaLive.has(carta.id)) { g.fusoesDaLive.add(carta.id); g.emit('fusao_descoberta', { id: carta.id }); }
    g.emit('aviso', { texto: `🧬 FUSÃO! ${ATIVAS[C.ativa].emoji} + ${PASSIVAS[C.passiva].emoji} = ${C.emoji} ${C.nome.toUpperCase()}`, tipo: 'bom' });
    atualizarNucleo(g);
  } else if (carta.tipo === 'suprema') {
    const S = SUPREMAS[carta.id];
    h.suprema = carta.id;
    h.supremaT = 1;   // ataque aéreo já sai logo
    h.vida = Math.min(h.vidaMax, h.vida + h.vidaMax * 0.3);   // chega com fôlego pra horda grande
    aplicarModsSuprema(g);
  } else if (carta.tipo === 'arma') {
    if (carta.id === 'escopeta') { h.armaFixa = 'escopeta'; g.trocarArma('escopeta', null); }
    if (carta.id === 'taco') { h.corpoFixo = 'taco'; h.corpo = 'taco'; h.golpes = Infinity; }
  }
  g.aplicarRunas?.();   // runa de resistência cresce com o nível da habilidade em que está
}

/* ---------------- Rodar as habilidades ativas ---------------- */
export function atualizarHabilidades(g, dt) {
  const h = g.hero;
  atualizarSuprema(g, h, dt);
  if (!h.habs) return;
  h.habT = h.habT || {};
  // nível deus sem suprema (não deveria acontecer: a suprema vem no nível 10): Fúria divina no lugar
  if (h.deus && !h.suprema && (h.deusT = (h.deusT ?? 1) - dt) <= 0) h.deusT = DEUS.usar(g, h) ? DEUS.cd : 0.5;
  if (h.habs.laminas) girarAngulo(h, dt);
  for (const [id, n0] of Object.entries(h.habs)) {
    // habilidade evoluída por combo: roda a versão do combo; o nível dela é o da passiva do combo
    const C = h.evo?.[id] ? COMBOS[h.evo[id]] : null;
    const A0 = C || ATIVAS[id], n = C ? (h.passivas[C.passiva] || 1) : n0;
    // runa de dano do colosso (recompensas.js): a habilidade bate mais forte, e cresce com o nível dela
    const A = h.runas?.[id]?.dano ? comRuna(A0, multRunaDano(h.runas[id], n0)) : A0;
    if (A.sempre) A.sempre(g, h, n, dt);
    if (A.continua) { A.atualizar(g, h, n, dt); continue; }
    h.habT[id] = (h.habT[id] ?? 1) - dt;
    if (h.habT[id] > 0) continue;
    h.habT[id] = A.usar(g, h, n) ? A.cd(n) : 0.4;   // sem alvo: tenta de novo logo
  }
}

// A mesma habilidade, com o dano (e o fogo) multiplicado por k
function comRuna(A, k) {
  const B = Object.create(A);
  if (A.dano) B.dano = n => A.dano(n) * k;
  if (A.fogo) B.fogo = n => A.fogo(n) * k;
  return B;
}

function atualizarSuprema(g, h, dt) {
  const S = h.suprema && SUPREMAS[h.suprema];
  if (!S) return;
  if (S.continua) { S.atualizar(g, h, dt); return; }
  h.supremaT = (h.supremaT ?? 0) - dt;
  if (S.usar) { if (h.supremaT <= 0) h.supremaT = S.usar(g, h) ? cdSuprema(S, h) : 0.5; return; }
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
  for (const [id, n] of Object.entries(h.habs || {})) {
    const C = h.evo?.[id] ? COMBOS[h.evo[id]] : null;
    if (C) l.push({ emoji: C.emoji, nome: C.nome, nivel: '★', tipo: 'combo', pronta: true });
    else l.push({ emoji: ATIVAS[id].emoji, nome: ATIVAS[id].nome, nivel: n, tipo: 'ativa', pronta: (h.habT?.[id] ?? 0) <= 0.2 });
  }
  for (const [id, n] of Object.entries(h.passivas || {})) l.push({ emoji: PASSIVAS[id].emoji, nome: PASSIVAS[id].nome, nivel: n, tipo: 'passiva' });
  if (h.treino) l.push({ emoji: '🎓', nome: 'Treino', nivel: h.treino, tipo: 'passiva' });
  if (h.suprema) { const S = SUPREMAS[h.suprema]; l.unshift({ emoji: S.emoji, nome: nomeSuprema(h), nivel: 1 + grauSuprema(h), tipo: h.deus ? 'deus' : 'suprema', pronta: S.continua || (h.supremaT ?? 0) <= 0.2 }); }
  else if (h.deus) l.unshift({ emoji: DEUS.emoji, nome: DEUS.nome, nivel: 1, tipo: 'deus', pronta: true });
  // runas do colosso: 🔮 + o que ela faz, no número a quantidade
  for (const [id, r] of Object.entries(h.runas || {})) {
    const hab = id === 'principal' ? 'ataque principal' : ATIVAS[id]?.nome;
    if (r.dano) l.push({ emoji: '🔮💥', nome: `Runa de dano: ${hab}`, nivel: r.dano, tipo: 'runa' });
    if (r.resistencia) l.push({ emoji: '🔮🛡️', nome: `Runa de resistência: ${hab}`, nivel: r.resistencia, tipo: 'runa' });
  }
  return l;
}

/* ---------------- Núcleo: fusões → terços → suprema elevada → nível deus ---------------- */
// Cada COMBO (habilidade nível 3+ com a passiva certa) é uma FUSÃO: no painel, a habilidade e a passiva somem das
// fileiras e a fusão ocupa um dos 2 slots pequenos do lado do NÚCLEO (o slot redondo grande), ainda gastando a
// vaga de habilidade e a de passiva. Duas fusões viram 1/3 do núcleo e liberam as vagas.
// No meio do núcleo fica a HABILIDADE SUPREMA do nível 10 (a que veio sem fusão). Cada terço se une a ela e
// ELEVA a suprema um grau (mais dano, mais alcance, recarga mais curta). As 6 fusões do jogo enchem o núcleo
// (3 terços); no nível máximo (dados.js → NIVEL_MAXIMO, 100) a suprema vira a versão NÍVEL DEUS (grau 4).
// Os terços feitos antes do nível 10 ficam guardados: a suprema já nasce elevada. As fusões continuam funcionando.
export const NUCLEO = { tercos: 3, porTerco: 2 };
export const ELEVACAO = { mult: 0.4, cd: 0.12 };   // por grau: +40% de força e -12% de recarga (nível deus: x2,6 e -48%)
export const tercosDoNucleo = h => Math.min(NUCLEO.tercos, Math.floor((h.fusoes?.length || 0) / NUCLEO.porTerco));
export const fusoesSoltas = h => (h.fusoes || []).slice(tercosDoNucleo(h) * NUCLEO.porTerco);   // as que estão nos slots pequenos
const passivasFundidas = h => new Set((h.fusoes || []).map(c => COMBOS[c].passiva));
export const ativasLivres = h => Object.keys(h.habs || {}).filter(id => !h.evo?.[id]);           // as que aparecem na fileira
export const passivasLivres = h => { const f = passivasFundidas(h); return Object.keys(h.passivas || {}).filter(id => !f.has(id)); };
export const vagasOcupadas = h => ativasLivres(h).length + fusoesSoltas(h).length;                 // fusão solta ainda gasta a vaga
export const vagasPassivas = h => passivasLivres(h).length + fusoesSoltas(h).length;
export const grauSuprema = h => tercosDoNucleo(h) + (h.deus ? 1 : 0);
export const multSuprema = h => 1 + ELEVACAO.mult * grauSuprema(h);
export const cdSuprema = (S, h) => S.cd * (1 - ELEVACAO.cd * grauSuprema(h));
export const nomeSuprema = h => { const S = SUPREMAS[h.suprema]; if (!S) return ''; const G = grauSuprema(h); return h.deus ? S.divino : G ? `${S.nome} +${G}` : S.nome; };

// Passiva que sai quando a Anti-explosão precisa entrar e os slots estão cheios: a de menor nível,
// fugindo das que ainda podem virar fusão com uma habilidade que o herói tem
function passivaMaisFraca(h) {
  const util = new Set(Object.values(COMBOS).filter(C => h.habs?.[C.ativa] && !h.evo?.[C.ativa]).map(C => C.passiva));
  return passivasLivres(h).sort((a, b) => (util.has(a) - util.has(b)) || (h.passivas[a] - h.passivas[b]))[0] || null;
}

// Bônus fixos da suprema (Coração de ferro), no grau atual
function aplicarModsSuprema(g) {
  const h = g.hero, S = h.suprema && SUPREMAS[h.suprema];
  if (!S?.mods) return;
  for (const [k, m] of S.mods(grauSuprema(h)).entries()) h.attr.addMod({ ...m, id: `sup:${h.suprema}:${k}`, fonte: nomeSuprema(h) });
  g.sincronizarVida();
}

// Se o herói chegar no nível deus sem suprema (só em teste), ganha a Fúria divina: a cada cd segundos uma luz do
// céu derruba todo zumbi em volta (chefe perde 25% da vida), cura 20% e deixa invencível por 2 s
export const DEUS = {
  nome: 'Fúria divina', emoji: '👑', cd: 12, raio: 10, chefe: 0.25, cura: 20, invencivel: 2,
  desc() { return `a cada ${this.cd}s uma luz do céu derruba todos os zumbis em volta (chefes perdem ${Math.round(this.chefe * 100)}% da vida), cura ${this.cura}% e deixa invencível por ${this.invencivel}s`; },
  usar(g, h) {
    const perto = g.zumbis.filter(z => !z.morto && !(z.nascendo > 0) && dist2(z.x, z.y, h.x, h.y) < this.raio * this.raio);
    for (const z of perto) {
      if (z.fa) z.fa.escudo = 0;
      if (ZUMBIS[z.tipo].chefe) g.ferirZumbi(z, z.vidaMax * this.chefe, null, true);
      else g.matarZumbi(z, null);
    }
    g.curar(this.cura, null, true);
    h.invT = Math.max(h.invT, this.invencivel);
    g.emit('furia_divina', { x: h.x, y: h.y, raio: this.raio, alvos: perto.length });
    return true;
  }
};

// Recalcula o grau da suprema e libera o nível deus (núcleo cheio + nível máximo). Chame depois de fusão e ao subir de nível.
export function atualizarNucleo(g) {
  const h = g.hero, t = tercosDoNucleo(h), S = h.suprema && SUPREMAS[h.suprema];
  if (t > (h.nucleoVisto || 0)) {
    h.nucleoVisto = t;
    g.emit('nucleo', { tercos: t, total: NUCLEO.tercos, bloqueado: t >= NUCLEO.tercos && h.nivel < NIVEL_MAXIMO, suprema: S ? { emoji: S.emoji, nome: nomeSuprema(h) } : null });
  }
  if (!h.deus && t >= NUCLEO.tercos && h.nivel >= NIVEL_MAXIMO) {
    h.deus = true; h.deusT = 1;
    g.emit('deus', S ? { nome: S.divino, emoji: S.emoji } : { nome: DEUS.nome, emoji: DEUS.emoji });
  }
  aplicarModsSuprema(g);
}

// O painel do herói: fileiras de habilidades (pra esquerda) e passivas (pra direita), cada uma com 5 slots
// (usados, presos por fusão solta, vazios), os 2 slots pequenos e o núcleo
export function slotsDoHeroi(h) {
  const comRuna = id => !!(h.runas?.[id]?.dano || h.runas?.[id]?.resistencia);
  const ativas = ativasLivres(h).map(id => ({ emoji: ATIVAS[id].emoji, nome: ATIVAS[id].nome, nivel: h.habs[id], runa: comRuna(id) }));
  const passivas = passivasLivres(h).map(id => ({ emoji: PASSIVAS[id].emoji, nome: PASSIVAS[id].nome, nivel: h.passivas[id] }));
  const soltas = fusoesSoltas(h);
  const mini = soltas.map(c => ({ emoji: COMBOS[c].emoji, nome: COMBOS[c].nome, nivel: h.passivas?.[COMBOS[c].passiva] || 1 }));
  const t = tercosDoNucleo(h), S = h.suprema && SUPREMAS[h.suprema];
  return {
    ativas, passivas, mini, maxAtivas: MAX_ATIVAS, maxPassivas: MAX_PASSIVAS, presas: soltas.length,
    nucleo: {
      tercos: t, total: NUCLEO.tercos, deus: !!h.deus, bloqueado: t >= NUCLEO.tercos && !h.deus, grau: grauSuprema(h),
      centro: S ? { emoji: S.emoji, nome: nomeSuprema(h) } : h.deus ? { emoji: DEUS.emoji, nome: DEUS.nome } : null
    }
  };
}
