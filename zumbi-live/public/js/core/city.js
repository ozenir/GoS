// A cidade: gerada na hora, em quarteirões, a partir de uma semente.
// Tudo é calculado pela posição, então um quarteirão que sai da tela e volta aparece igualzinho.
//
// Medidas (em "casas"; o herói anda pelo meio das ruas):
//   - a cada P = 20 casas existe uma rua em cada direção;
//   - a rua ocupa 5 casas: calçada (0), asfalto (1, 2, 3), calçada (4). O meio da rua fica em 2,5;
//   - o resto (15 casas) é o quarteirão: 4 prédios de 7x7 com um beco no meio, uma área verde ou uma praça.
//
// A cidade é dividida em BAIRROS (regiões de 3x3 quarteirões), cada um com cara, prédios, lojas
// e perigos próprios. Cada trecho de rua pode estar BLOQUEADO, ser SEM SAÍDA ou ter PERIGOS no chão
// (os perigos em si ficam em ambiente.js).
import { hash2, hash3, mod } from './util.js';

export const P = 20;
export const BAND = 5;
export const MID = 2.5;
export const BSIZE = 7;

export const T = { BLOCK: 0, ROAD: 1, SIDEWALK: 2, ALLEY: 3, GRAMA: 4, PRACA: 5, FLOOR: 10, WALL: 11, OUT: 12, AREIA: 13, MAR: 14 };

export const SHOPS = {
  farmacia:  { nome: 'Farmácia', emoji: '💊', risco: 1, cor: '#3fbf7f', placa: '#1f7a4f' },
  mercado:   { nome: 'Mercado', emoji: '🛒', risco: 1, cor: '#f2a541', placa: '#a8641a' },
  casa:      { nome: 'Casa', emoji: '🏠', risco: 1, cor: '#c98a5e', placa: '#7a4a28' },
  posto:     { nome: 'Posto', emoji: '🔧', risco: 2, cor: '#e85d4a', placa: '#8c2f22' },
  fabrica:   { nome: 'Fábrica', emoji: '🏭', risco: 3, cor: '#8a8a92', placa: '#3a3a42' },
  delegacia: { nome: 'Delegacia', emoji: '🚓', risco: 3, cor: '#4a7bd8', placa: '#203f80' },
  hospital:  { nome: 'Hospital', emoji: '🏥', risco: 4, cor: '#e8e8f0', placa: '#b3262e' }
};

// Bairros. peso = quanto aparece. lojas = [tipo, peso]. perigos = [tipo (ambiente.js), peso] e chance por trecho de rua.
export const BAIRROS = {
  centro: {
    nome: 'Centro', emoji: '🏙️', peso: 34, chancePraca: 0.08,
    lojas: [['farmacia', 26], ['mercado', 20], ['delegacia', 22], ['hospital', 16]],
    perigos: [['vidro', 3], ['fios', 2], ['entulho', 2]], chancePerigo: 0.35
  },
  residencial: {
    nome: 'Bairro residencial', emoji: '🏘️', peso: 30, chancePraca: 0.05,
    lojas: [['farmacia', 25], ['mercado', 30], ['casa', 45]],
    perigos: [['entulho', 3], ['lama', 2], ['vidro', 1]], chancePerigo: 0.3
  },
  industrial: {
    nome: 'Zona industrial', emoji: '🏭', peso: 22, chancePraca: 0,
    lojas: [['posto', 50], ['fabrica', 50]],
    perigos: [['arame', 3], ['fogo', 2], ['acido', 2], ['fios', 1]], chancePerigo: 0.5
  },
  parque: {
    nome: 'Parque', emoji: '🌳', peso: 14, chancePraca: 0.25,
    lojas: [],
    perigos: [['lama', 3], ['arame', 1], ['entulho', 1]], chancePerigo: 0.3
  }
};

// Chance de um trecho de rua estar bloqueado (não dá pra passar) ou ser sem saída (tem baú no fim)
export const CHANCE_BLOQUEIO = 0.08;
const PESOS_BAIRRO = Object.entries(BAIRROS).map(([k, b]) => [k, b.peso]);
export const CHANCE_SEM_SAIDA = 0.07;

// Desgaste da cidade (0 a 1): sobe com o tempo da run (jogo.js → city.desgaste). As ruas e prédios
// que aparecem depois já vêm mais destruídos. Números = chance quando o desgaste está no máximo.
export const DESGASTE = {
  bloqueioCarros: 0.1,   // rua fechada por carros batidos (além dos bloqueios normais)
  carroFogo: 0.35,       // carro abandonado pegando fogo (fogo no chão em volta)
  buracos: 0.6,          // buracos no asfalto (machucam e deixam lento)
  prediosFogo: 0.25      // prédio pegando fogo (só visual)
};

const escolher = (lista, r) => {
  let tot = 0; for (const [, w] of lista) tot += w;
  let acc = r * tot;
  for (const [k, w] of lista) { acc -= w; if (acc <= 0) return k; }
  return lista[lista.length - 1][0];
};

// direção (0 norte, 1 leste, 2 sul, 3 oeste) -> trecho de rua que sai do cruzamento i,j nessa direção
export function trechoDaDirecao(i, j, d) {
  if (d === 1) return { axis: 'h', i, j, inicio: true };
  if (d === 3) return { axis: 'h', i: i - 1, j, inicio: false };
  if (d === 2) return { axis: 'v', i, j, inicio: true };
  return { axis: 'v', i, j: j - 1, inicio: false };
}

export class City {
  constructor(seed) {
    this.kind = 'city';
    this.seed = seed | 0;
    this.segCache = new Map();
    this.blockCache = new Map();
    this.tqCache = new Map();          // tipo de quarteirão por quarteirão (consultado milhares de vezes por quadro)
    this.bairroCache = new Map();
    this.dyn = new Map();        // obstáculos que aparecem no meio do jogo (barricadas, carro com alarme): "x,y" -> objeto
  }

  // Nó (cruzamento) i,j fica no meio das duas ruas
  nodePos(i, j) { return { x: i * P + MID, y: j * P + MID }; }

  /* ---------- Bairros e quarteirões ---------- */
  bairro(bi, bj) {
    const rx = Math.floor(bi / 3), ry = Math.floor(bj / 3);
    if ((rx === 0 || rx === -1) && (ry === 0 || ry === -1)) return 'centro';   // o herói sempre começa no centro
    const k = rx * 65536 + ry;
    let b = this.bairroCache.get(k);
    if (b === undefined) {
      if (this.bairroCache.size > 2000) this.bairroCache.clear();
      b = escolher(PESOS_BAIRRO, hash2(rx, ry, this.seed + 77));
      this.bairroCache.set(k, b);
    }
    return b;
  }
  bairroNaPosicao(x, y) { return this.bairro(Math.floor((x - MID) / P), Math.floor((y - MID) / P)); }

  // 'predios' | 'verde' | 'praca'
  tipoQuarteirao(bi, bj) {
    const k = bi * 65536 + bj;
    let t = this.tqCache.get(k);
    if (t !== undefined) return t;
    if (this.tqCache.size > 4000) this.tqCache.clear();
    if ((bi === 0 || bi === -1) && (bj === 0 || bj === -1)) t = 'predios';
    else {
      const b = this.bairro(bi, bj), r = hash3(bi, bj, 301, this.seed);
      t = r < BAIRROS[b].chancePraca ? 'praca' : b === 'parque' ? 'verde' : 'predios';
    }
    this.tqCache.set(k, t);
    return t;
  }

  // Árvores, bancos, fonte, lago (áreas verdes e praças), com cache
  quarteirao(bi, bj) {
    const k = bi + ',' + bj;
    let q = this.blockCache.get(k);
    if (q) return q;
    if (this.blockCache.size > 400) this.blockCache.clear();
    q = this.montarQuarteirao(bi, bj);
    this.blockCache.set(k, q);
    return q;
  }

  montarQuarteirao(bi, bj) {
    const tipo = this.tipoQuarteirao(bi, bj);
    const q = { tipo, bi, bj, props: [], solid: new Set(), zonas: [] };
    if (tipo === 'predios') return q;
    const x0 = bi * P + BAND, y0 = bj * P + BAND, n = P - BAND;   // 15x15
    const solido = (x, y) => q.solid.add(x + ',' + y);
    if (tipo === 'praca') {
      // fonte 3x3 no meio, bancos e árvores nos cantos, postes
      const cx = x0 + 6, cy = y0 + 6;
      q.props.push({ tipo: 'fonte', x: cx, y: cy, w: 3, h: 3 });
      for (let dx = 0; dx < 3; dx++) for (let dy = 0; dy < 3; dy++) solido(cx + dx, cy + dy);
      for (const [ax, ay] of [[1, 1], [n - 2, 1], [1, n - 2], [n - 2, n - 2]]) { q.props.push({ tipo: 'arvore', x: x0 + ax, y: y0 + ay }); solido(x0 + ax, y0 + ay); }
      for (const [ax, ay] of [[4, 2], [10, 2], [2, 10], [12, 10]]) q.props.push({ tipo: 'banco', x: x0 + ax, y: y0 + ay });
      for (const [ax, ay] of [[3, 7], [11, 7]]) q.props.push({ tipo: 'poste', x: x0 + ax, y: y0 + ay, aceso: true });
      q.centro = { x: cx + 1.5, y: cy + 1.5 };
      return q;
    }
    // área verde: árvores espalhadas e, às vezes, um lago
    const temLago = hash3(bi, bj, 310, this.seed) < 0.4;
    const lago = temLago ? { x0: x0 + 4 + Math.floor(hash3(bi, bj, 311, this.seed) * 4), y0: y0 + 4 + Math.floor(hash3(bi, bj, 312, this.seed) * 4), w: 4, h: 3 } : null;
    if (lago) q.zonas.push({ tipo: 'agua', x0: lago.x0, y0: lago.y0, x1: lago.x0 + lago.w, y1: lago.y0 + lago.h, fixo: true });
    const nArv = 7 + Math.floor(hash3(bi, bj, 313, this.seed) * 6);
    for (let t = 0; t < nArv; t++) {
      const ax = x0 + Math.floor(hash3(bi, bj, 320 + t, this.seed) * n), ay = y0 + Math.floor(hash3(bi, bj, 340 + t, this.seed) * n);
      if (lago && ax >= lago.x0 - 1 && ax <= lago.x0 + lago.w && ay >= lago.y0 - 1 && ay <= lago.y0 + lago.h) continue;
      q.props.push({ tipo: 'arvore', x: ax, y: ay, v: t % 3 }); solido(ax, ay);
    }
    for (let t = 0; t < 3; t++) q.props.push({ tipo: 'banco', x: x0 + 1 + Math.floor(hash3(bi, bj, 360 + t, this.seed) * (n - 2)), y: y0 + 1 + Math.floor(hash3(bi, bj, 365 + t, this.seed) * (n - 2)) });
    return q;
  }

  tile(tx, ty) {
    const lx = mod(tx, P), ly = mod(ty, P);
    const inX = lx < BAND, inY = ly < BAND;
    if (inX || inY) {
      const a = inX && inY ? Math.min(lx, ly, BAND - 1 - lx, BAND - 1 - ly) : (inX ? Math.min(lx, BAND - 1 - lx) : Math.min(ly, BAND - 1 - ly));
      if (inX && inY) return T.ROAD; // cruzamento: tudo asfalto
      return a === 0 ? T.SIDEWALK : T.ROAD;
    }
    const tq = this.tipoQuarteirao(Math.floor(tx / P), Math.floor(ty / P));
    if (tq === 'verde') return T.GRAMA;
    if (tq === 'praca') return T.PRACA;
    if (lx === 12 || ly === 12) return T.ALLEY;
    return T.BLOCK;
  }

  // Casa aberta (tiro passa): rua, calçada, beco, verde, praça
  tileOpen(tx, ty) { return this.tile(tx, ty) !== T.BLOCK; }

  // Casa onde dá pra andar: rua, calçada, grama e praça, sem carro, barricada, árvore nem fonte
  tileWalk(tx, ty) {
    const t = this.tile(tx, ty);
    if (t === T.GRAMA || t === T.PRACA) {
      if (this.dyn.size && this.dyn.has(tx + ',' + ty)) return false;
      return !this.quarteirao(Math.floor(tx / P), Math.floor(ty / P)).solid.has(tx + ',' + ty);
    }
    if (t !== T.ROAD && t !== T.SIDEWALK) return false;
    if (this.dyn.size && this.dyn.has(tx + ',' + ty)) return false;
    return !this.solidProp(tx, ty);
  }

  walkable(x, y) { return this.tileWalk(Math.floor(x), Math.floor(y)); }

  /* ---------- Prédios ---------- */
  // Prédio (sx, sy) do quarteirão (bi, bj). sx/sy = 0 ou 1. null se o quarteirão não tem prédios.
  building(bi, bj, sx, sy) {
    if (this.tipoQuarteirao(bi, bj) !== 'predios') return null;
    const x0 = bi * P + BAND + sx * (BSIZE + 1), y0 = bj * P + BAND + sy * (BSIZE + 1);
    const h = hash3(bi * 2 + sx, bj * 2 + sy, 1, this.seed);
    const node = { i: bi + sx, j: bj + sy };
    const shop = this.shopAt(node.i, node.j);
    const isShop = shop && shop.bi === bi && shop.bj === bj && shop.sx === sx && shop.sy === sy;
    const bairro = this.bairro(bi, bj);
    const altura = isShop ? (bairro === 'residencial' ? 22 : 30)
      : bairro === 'residencial' ? 16 + Math.floor(h * 3) * 6
      : bairro === 'industrial' ? 24 + Math.floor(h * 3) * 8
      : 30 + Math.floor(h * 5) * 12;
    return {
      id: `${bi},${bj},${sx},${sy}`, bi, bj, sx, sy, x0, y0, x1: x0 + BSIZE, y1: y0 + BSIZE, bairro, altura,
      paleta: Math.floor(hash3(bi * 2 + sx, bj * 2 + sy, 2, this.seed) * 6),
      janelas: Math.floor(hash3(bi * 2 + sx, bj * 2 + sy, 3, this.seed) * 3),
      ruina: hash3(bi * 2 + sx, bj * 2 + sy, 4, this.seed) < 0.18,
      // desgaste da run: com o tempo, alguns prédios começam a pegar fogo (só visual)
      fogo: !isShop && hash3(bi * 2 + sx, bj * 2 + sy, 5, this.seed) < (this.desgaste || 0) * DESGASTE.prediosFogo,
      shop: isShop ? shop : null
    };
  }

  // Loja no cruzamento i,j (ou null). Fica num dos 4 prédios da esquina, com a porta virada pra rua horizontal.
  shopAt(i, j) {
    if (i === 0 && j === 0) return null; // o primeiro cruzamento nunca tem loja: o herói ainda está se ajeitando
    if (hash3(i, j, 10, this.seed) > 0.5) return null;
    if (this.pracaAt(i, j)) return null;  // cruzamento com praça: a praça é o destaque
    const c = Math.floor(hash3(i, j, 11, this.seed) * 4);
    // c: 0 = sudeste do cruzamento, 1 = sudoeste, 2 = nordeste, 3 = noroeste
    const bi = c === 0 || c === 2 ? i : i - 1;
    const bj = c === 0 || c === 1 ? j : j - 1;
    if (this.tipoQuarteirao(bi, bj) !== 'predios') return null;
    const lojas = BAIRROS[this.bairro(bi, bj)].lojas;
    if (!lojas.length) return null;
    const tipo = escolher(lojas, hash3(i, j, 12, this.seed));
    const sx = c === 0 || c === 2 ? 0 : 1;
    const sy = c === 0 || c === 1 ? 0 : 1;
    const x0 = bi * P + BAND + sx * (BSIZE + 1), y0 = bj * P + BAND + sy * (BSIZE + 1);
    const leste = c === 0 || c === 2, sul = c === 0 || c === 1;
    const door = {
      x: leste ? x0 + 1.5 : x0 + BSIZE - 1.5,
      y: sul ? y0 - 0.5 : y0 + BSIZE + 0.5,
      face: sul ? 'n' : 's'           // lado do prédio em que a porta está
    };
    // Saída pelos fundos: cruzamento do lado oposto do quarteirão
    const saida = { i: bi + (1 - sx), j: bj + (1 - sy) };
    return { tipo, ...SHOPS[tipo], i, j, bi, bj, sx, sy, door, saida, semente: Math.floor(hash3(i, j, 13, this.seed) * 1e9) };
  }

  // Praça (arena de chefe) encostada no cruzamento i,j, ou null
  pracaAt(i, j) {
    if (Math.abs(i) + Math.abs(j) <= 1) return null;
    for (const [bi, bj] of [[i, j], [i - 1, j], [i, j - 1], [i - 1, j - 1]]) {
      if (this.tipoQuarteirao(bi, bj) !== 'praca') continue;
      const q = this.quarteirao(bi, bj);
      // entrada: o canto da praça mais perto do cruzamento
      const cx = bi === i ? bi * P + BAND + 0.8 : bi * P + P - 0.8;
      const cy = bj === j ? bj * P + BAND + 0.8 : bj * P + P - 0.8;
      return {
        bi, bj, i, j, centro: q.centro, entrada: { x: cx, y: cy },
        saida: { i: 2 * bi + 1 - i, j: 2 * bj + 1 - j },   // cruzamento do canto oposto
        bairro: this.bairro(bi, bj), nome: 'Praça', emoji: '⚔️'
      };
    }
    return null;
  }

  /* ---------- Trechos de rua: carros, postes, lixo, bloqueios, perigos ---------- */
  // Trecho de rua entre dois cruzamentos. axis 'h': de (i,j) a (i+1,j). axis 'v': de (i,j) a (i,j+1).
  segment(axis, i, j) {
    const k = `${axis}${i},${j}`;
    let s = this.segCache.get(k);
    if (s) return s;
    if (this.segCache.size > 500) this.segCache.clear(); // apaga o que ficou pra trás
    s = this.makeSegment(axis, i, j);
    this.segCache.set(k, s);
    return s;
  }

  // Trecho que sai do cruzamento i,j na direção d
  trecho(i, j, d) { const t = trechoDaDirecao(i, j, d); return { ...t, s: this.segment(t.axis, t.i, t.j) }; }

  makeSegment(axis, i, j) {
    const props = [], solid = new Set(), zonas = [];
    const ax = axis === 'h' ? 1 : 0;
    const bx = i * P, by = j * P;
    const at = (along, across) => ax ? { x: bx + along, y: by + across } : { x: bx + across, y: by + along };
    const sd = axis === 'h' ? 100 : 200;
    const bairro = this.bairro(i, j);
    const B = BAIRROS[bairro];
    // perto do começo, nada de bloqueio (o herói ainda está se ajeitando)
    const pertoDoInicio = Math.abs(i) <= 1 && Math.abs(j) <= 1;
    const rb = hash3(i, j, sd + 80, this.seed);
    let bloqueio = null, semSaida = null;
    const dg = this.desgaste || 0;
    if (!pertoDoInicio && rb < CHANCE_BLOQUEIO) bloqueio = { along: 10 };
    else if (!pertoDoInicio && rb < CHANCE_BLOQUEIO + CHANCE_SEM_SAIDA) semSaida = { along: 13 };
    else if (!pertoDoInicio && hash3(i, j, sd + 100, this.seed) < dg * DESGASTE.bloqueioCarros) bloqueio = { along: 10, carros: true };
    const barreira = bloqueio || semSaida;
    if (bloqueio?.carros) {
      // engavetamento: dois carros atravessados e uma barricada fecham a rua
      for (const across of [0, 2]) {
        const p = at(10, across), p2 = at(10, across + 1);
        props.push({ tipo: 'carro', x: Math.min(p.x, p2.x), y: Math.min(p.y, p2.y), w: ax ? 1 : 2, h: ax ? 2 : 1, cor: Math.floor(hash3(i, j, sd + 101 + across, this.seed) * 6), virado: across === 2, batido: true, fogo: hash3(i, j, sd + 103 + across, this.seed) < 0.5 });
        solid.add(p.x + ',' + p.y); solid.add(p2.x + ',' + p2.y);
      }
      const p = at(10, 4); solid.add(p.x + ',' + p.y);
      props.push({ tipo: 'barricada', x: p.x, y: p.y, eixo: axis });
    } else if (barreira) {
      for (let across = 0; across < BAND; across++) {
        const p = at(barreira.along, across);
        solid.add(p.x + ',' + p.y);
        props.push({ tipo: across === 2 ? 'barricada_placa' : 'barricada', x: p.x, y: p.y, eixo: axis });
      }
    }
    // Carros abandonados nas faixas do lado (a faixa do meio fica sempre livre)
    const nCarros = Math.floor(hash3(i, j, sd + 1, this.seed) * (bairro === 'residencial' ? 4 : 3));
    const usados = barreira ? [barreira.along] : [];
    for (let n = 0; n < nCarros; n++) {
      const along = 6 + Math.floor(hash3(i, j, sd + 2 + n, this.seed) * 11);
      if (usados.some(u => Math.abs(u - along) < 3)) continue;
      usados.push(along);
      const lado = hash3(i, j, sd + 7 + n, this.seed) < 0.5 ? 1 : 3;
      const p = at(along, lado);
      const p2 = at(along + 1, lado);
      const fogo = hash3(i, j, sd + 20 + n, this.seed) < dg * DESGASTE.carroFogo;
      props.push({ tipo: 'carro', x: p.x, y: p.y, w: ax ? 2 : 1, h: ax ? 1 : 2, cor: Math.floor(hash3(i, j, sd + 12 + n, this.seed) * 6), virado: hash3(i, j, sd + 17 + n, this.seed) < 0.2, fogo });
      solid.add(p.x + ',' + p.y); solid.add(p2.x + ',' + p2.y);
      if (fogo) {
        // carro em chamas: fogo no chão em volta (machuca quem passa raspando)
        const x0 = Math.min(p.x, p2.x) - 0.35, y0 = Math.min(p.y, p2.y) - 0.35;
        zonas.push({ tipo: 'fogo', x0, y0, x1: Math.max(p.x, p2.x) + 1.35, y1: Math.max(p.y, p2.y) + 1.35, fixo: true, carro: true, semente: Math.floor(hash3(i, j, sd + 22 + n, this.seed) * 1e6) });
      }
    }
    // Postes nas calçadas
    for (let along = 7; along < P; along += 7) {
      const lado = (along / 7) % 2 ? 0 : 4;
      const p = at(along, lado);
      props.push({ tipo: 'poste', x: p.x, y: p.y, aceso: hash3(i, j, sd + 30 + along, this.seed) < 0.6 });
    }
    // Lixo, barris, caixas (contêiner na zona industrial)
    const nLixo = 1 + Math.floor(hash3(i, j, sd + 40, this.seed) * 3);
    for (let n = 0; n < nLixo; n++) {
      const along = 5 + Math.floor(hash3(i, j, sd + 41 + n, this.seed) * 14);
      const lado = hash3(i, j, sd + 45 + n, this.seed) < 0.5 ? 0 : 4;
      const p = at(along, lado);
      const r = hash3(i, j, sd + 49 + n, this.seed);
      props.push({ tipo: bairro === 'industrial' && r < 0.4 ? 'conteiner' : r < 0.25 ? 'barril' : r < 0.7 ? 'lixo' : 'caixas', x: p.x, y: p.y });
    }
    const nMancha = Math.floor(hash3(i, j, sd + 60, this.seed) * 3);
    for (let n = 0; n < nMancha; n++) {
      const along = 5 + hash3(i, j, sd + 61 + n, this.seed) * 14;
      const across = 1 + hash3(i, j, sd + 65 + n, this.seed) * 3;
      const p = at(along, across);
      props.push({ tipo: 'mancha', x: p.x, y: p.y, chao: true, s: hash3(i, j, sd + 69 + n, this.seed) });
    }
    // Perigo no chão (ambiente.js): às vezes cobre a rua toda, às vezes só uma parte
    if (!pertoDoInicio && hash3(i, j, sd + 90, this.seed) < B.chancePerigo) {
      const tipo = escolher(B.perigos, hash3(i, j, sd + 91, this.seed));
      const a0 = 6 + hash3(i, j, sd + 92, this.seed) * 6, comp = 1.5 + hash3(i, j, sd + 93, this.seed) * 1.5;
      const rl = hash3(i, j, sd + 94, this.seed);
      const [c0, c1] = rl < 0.25 ? [0, 5] : rl < 0.6 ? [1, 4] : rl < 0.8 ? [0, 2.2] : [2.8, 5];
      const p0 = at(a0, c0), p1 = at(a0 + comp, c1);
      zonas.push({ tipo, x0: Math.min(p0.x, p1.x), y0: Math.min(p0.y, p1.y), x1: Math.max(p0.x, p1.x), y1: Math.max(p0.y, p1.y), fixo: true, semente: Math.floor(hash3(i, j, sd + 95, this.seed) * 1e6) });
    }
    // Buracos no asfalto (desgaste): um ou dois por rua
    if (!pertoDoInicio && hash3(i, j, sd + 110, this.seed) < dg * DESGASTE.buracos) {
      const n = hash3(i, j, sd + 111, this.seed) < 0.5 ? 1 : 2;
      for (let k = 0; k < n; k++) {
        const along = 4 + hash3(i, j, sd + 112 + k, this.seed) * 12, across = 0.6 + hash3(i, j, sd + 115 + k, this.seed) * 3;
        if (barreira && Math.abs(along - barreira.along) < 2) continue;
        const p = at(along, across), r = 0.5 + hash3(i, j, sd + 118 + k, this.seed) * 0.3;
        zonas.push({ tipo: 'buraco', x0: p.x - r, y0: p.y - r, x1: p.x + r, y1: p.y + r, fixo: true, semente: Math.floor(hash3(i, j, sd + 121 + k, this.seed) * 1e6) });
      }
    }
    return { axis, i, j, props, solid, zonas, bairro, bloqueio, semSaida, at };
  }

  segmentOfTile(tx, ty) {
    const lx = mod(tx, P), ly = mod(ty, P);
    const inX = lx < BAND, inY = ly < BAND;
    if (inX === inY) return null; // cruzamento ou quarteirão
    const i = Math.floor(tx / P), j = Math.floor(ty / P);
    return inY ? this.segment('h', i, j) : this.segment('v', i, j);
  }

  solidProp(tx, ty) {
    const s = this.segmentOfTile(tx, ty);
    return s ? s.solid.has(tx + ',' + ty) : false;
  }

  // Perigos do chão (fixos da cidade) num retângulo do mundo
  zonasEm(x0, y0, x1, y1) {
    const out = [];
    const bi0 = Math.floor((x0 - P) / P), bi1 = Math.floor(x1 / P);
    const bj0 = Math.floor((y0 - P) / P), bj1 = Math.floor(y1 / P);
    for (let bi = bi0; bi <= bi1; bi++) for (let bj = bj0; bj <= bj1; bj++) {
      for (const axis of ['h', 'v']) for (const z of this.segment(axis, bi, bj).zonas) if (z.x1 >= x0 && z.x0 <= x1 && z.y1 >= y0 && z.y0 <= y1) out.push(z);
      for (const z of this.quarteirao(bi, bj).zonas) if (z.x1 >= x0 && z.x0 <= x1 && z.y1 >= y0 && z.y0 <= y1) out.push(z);
    }
    return out;
  }

  // Tudo que precisa ser desenhado num retângulo do mundo: prédios e coisas da rua
  objectsIn(x0, y0, x1, y1) {
    const out = [];
    const bi0 = Math.floor((x0 - P) / P), bi1 = Math.floor(x1 / P);
    const bj0 = Math.floor((y0 - P) / P), bj1 = Math.floor(y1 / P);
    for (let bi = bi0; bi <= bi1; bi++) for (let bj = bj0; bj <= bj1; bj++) {
      for (let sx = 0; sx < 2; sx++) for (let sy = 0; sy < 2; sy++) {
        const b = this.building(bi, bj, sx, sy);
        if (!b || b.x1 < x0 || b.x0 > x1 || b.y1 < y0 || b.y0 > y1) continue;
        out.push({ kind: 'building', b });
      }
      for (const p of this.quarteirao(bi, bj).props) if (p.x >= x0 - 3 && p.x <= x1 + 3 && p.y >= y0 - 3 && p.y <= y1 + 3) out.push({ kind: 'prop', p });
      for (const axis of ['h', 'v']) {
        const s = this.segment(axis, bi, bj);
        for (const p of s.props) if (p.x >= x0 - 2 && p.x <= x1 + 2 && p.y >= y0 - 2 && p.y <= y1 + 2) out.push({ kind: 'prop', p });
      }
    }
    for (const o of this.dyn.values()) if (!o.parte) out.push({ kind: 'prop', p: o });
    return out;
  }

  addDyn(obj, tiles) {
    obj.tiles = tiles;
    tiles.forEach((t, n) => this.dyn.set(t.x + ',' + t.y, n === 0 ? obj : { parte: true, dono: obj }));
  }
  removeDyn(obj) { for (const t of obj.tiles || []) this.dyn.delete(t.x + ',' + t.y); }
}
