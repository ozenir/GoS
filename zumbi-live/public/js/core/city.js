// A cidade: gerada na hora, em quarteirões, a partir de uma semente.
// Tudo é calculado pela posição, então um quarteirão que sai da tela e volta aparece igualzinho.
//
// Medidas (em "casas"; o herói anda pelo meio das ruas):
//   - a cada P = 20 casas existe uma rua em cada direção;
//   - a rua ocupa 5 casas: calçada (0), asfalto (1, 2, 3), calçada (4). O meio da rua fica em 2,5;
//   - o resto (15 casas) é o quarteirão, com 4 prédios de 7x7 e um beco de 1 casa no meio.
import { hash2, hash3, mod } from './util.js';

export const P = 20;
export const BAND = 5;
export const MID = 2.5;
export const BSIZE = 7;

export const T = { BLOCK: 0, ROAD: 1, SIDEWALK: 2, ALLEY: 3, FLOOR: 10, WALL: 11, OUT: 12 };

export const SHOPS = {
  farmacia: { nome: 'Farmácia', emoji: '💊', risco: 1, cor: '#3fbf7f', placa: '#1f7a4f' },
  mercado: { nome: 'Mercado', emoji: '🛒', risco: 1, cor: '#f2a541', placa: '#a8641a' },
  posto: { nome: 'Posto', emoji: '🔧', risco: 2, cor: '#e85d4a', placa: '#8c2f22' },
  delegacia: { nome: 'Delegacia', emoji: '🚓', risco: 3, cor: '#4a7bd8', placa: '#203f80' },
  hospital: { nome: 'Hospital', emoji: '🏥', risco: 4, cor: '#e8e8f0', placa: '#b3262e' }
};
const SHOP_PESOS = [['farmacia', 26], ['mercado', 26], ['posto', 18], ['delegacia', 17], ['hospital', 13]];

export class City {
  constructor(seed) {
    this.kind = 'city';
    this.seed = seed | 0;
    this.segCache = new Map();
    this.dyn = new Map();        // obstáculos que aparecem no meio do jogo (barricadas, carro com alarme): "x,y" -> objeto
  }

  // Nó (cruzamento) i,j fica no meio das duas ruas
  nodePos(i, j) { return { x: i * P + MID, y: j * P + MID }; }

  tile(tx, ty) {
    const lx = mod(tx, P), ly = mod(ty, P);
    const inX = lx < BAND, inY = ly < BAND;
    if (inX || inY) {
      const a = inX && inY ? Math.min(lx, ly, BAND - 1 - lx, BAND - 1 - ly) : (inX ? Math.min(lx, BAND - 1 - lx) : Math.min(ly, BAND - 1 - ly));
      if (inX && inY) return T.ROAD; // cruzamento: tudo asfalto
      return a === 0 ? T.SIDEWALK : T.ROAD;
    }
    if (lx === 12 || ly === 12) return T.ALLEY;
    return T.BLOCK;
  }

  // Casa aberta (tiro passa): rua, calçada, beco
  tileOpen(tx, ty) { return this.tile(tx, ty) !== T.BLOCK; }

  // Casa onde dá pra andar: rua e calçada, sem carro nem barricada
  tileWalk(tx, ty) {
    const t = this.tile(tx, ty);
    if (t !== T.ROAD && t !== T.SIDEWALK) return false;
    if (this.dyn.size && this.dyn.has(tx + ',' + ty)) return false;
    return !this.solidProp(tx, ty);
  }

  walkable(x, y) { return this.tileWalk(Math.floor(x), Math.floor(y)); }

  /* ---------- Prédios ---------- */
  // Prédio (sx, sy) do quarteirão (bi, bj). sx/sy = 0 ou 1.
  building(bi, bj, sx, sy) {
    const x0 = bi * P + BAND + sx * (BSIZE + 1), y0 = bj * P + BAND + sy * (BSIZE + 1);
    const h = hash3(bi * 2 + sx, bj * 2 + sy, 1, this.seed);
    const node = { i: bi + sx, j: bj + sy };
    const shop = this.shopAt(node.i, node.j);
    const isShop = shop && shop.bi === bi && shop.bj === bj && shop.sx === sx && shop.sy === sy;
    return {
      id: `${bi},${bj},${sx},${sy}`, bi, bj, sx, sy, x0, y0, x1: x0 + BSIZE, y1: y0 + BSIZE,
      altura: isShop ? 30 : 30 + Math.floor(h * 5) * 12,
      paleta: Math.floor(hash3(bi * 2 + sx, bj * 2 + sy, 2, this.seed) * 6),
      janelas: Math.floor(hash3(bi * 2 + sx, bj * 2 + sy, 3, this.seed) * 3),
      ruina: hash3(bi * 2 + sx, bj * 2 + sy, 4, this.seed) < 0.18,
      shop: isShop ? shop : null
    };
  }

  // Loja no cruzamento i,j (ou null). Fica num dos 4 prédios da esquina, com a porta virada pra rua horizontal.
  shopAt(i, j) {
    if (i === 0 && j === 0) return null; // o primeiro cruzamento nunca tem loja: o herói ainda está se ajeitando
    if (hash3(i, j, 10, this.seed) > 0.5) return null;
    const c = Math.floor(hash3(i, j, 11, this.seed) * 4);
    const r = hash3(i, j, 12, this.seed);
    let tot = 0; for (const [, w] of SHOP_PESOS) tot += w;
    let acc = r * tot, tipo = SHOP_PESOS[0][0];
    for (const [k, w] of SHOP_PESOS) { acc -= w; if (acc <= 0) { tipo = k; break; } }
    // c: 0 = sudeste do cruzamento, 1 = sudoeste, 2 = nordeste, 3 = noroeste
    const bi = c === 0 || c === 2 ? i : i - 1;
    const bj = c === 0 || c === 1 ? j : j - 1;
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

  /* ---------- Coisas na rua (carros, postes, lixo) ---------- */
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

  makeSegment(axis, i, j) {
    const props = [], solid = new Set();
    const ax = axis === 'h' ? 1 : 0;
    const bx = i * P, by = j * P;
    const at = (along, across) => ax ? { x: bx + along, y: by + across } : { x: bx + across, y: by + along };
    const sd = axis === 'h' ? 100 : 200;
    // Carros abandonados nas faixas do lado (a faixa do meio fica sempre livre)
    const nCarros = Math.floor(hash3(i, j, sd + 1, this.seed) * 3);
    const usados = [];
    for (let n = 0; n < nCarros; n++) {
      const along = 6 + Math.floor(hash3(i, j, sd + 2 + n, this.seed) * 11);
      if (usados.some(u => Math.abs(u - along) < 3)) continue;
      usados.push(along);
      const lado = hash3(i, j, sd + 7 + n, this.seed) < 0.5 ? 1 : 3;
      const p = at(along, lado);
      const p2 = at(along + 1, lado);
      props.push({ tipo: 'carro', x: p.x, y: p.y, w: ax ? 2 : 1, h: ax ? 1 : 2, cor: Math.floor(hash3(i, j, sd + 12 + n, this.seed) * 6), virado: hash3(i, j, sd + 17 + n, this.seed) < 0.2 });
      solid.add(p.x + ',' + p.y); solid.add(p2.x + ',' + p2.y);
    }
    // Postes nas calçadas
    for (let along = 7; along < P; along += 7) {
      const lado = (along / 7) % 2 ? 0 : 4;
      const p = at(along, lado);
      props.push({ tipo: 'poste', x: p.x, y: p.y, aceso: hash3(i, j, sd + 30 + along, this.seed) < 0.6 });
    }
    // Lixo, barris, manchas
    const nLixo = 1 + Math.floor(hash3(i, j, sd + 40, this.seed) * 3);
    for (let n = 0; n < nLixo; n++) {
      const along = 5 + Math.floor(hash3(i, j, sd + 41 + n, this.seed) * 14);
      const lado = hash3(i, j, sd + 45 + n, this.seed) < 0.5 ? 0 : 4;
      const p = at(along, lado);
      const r = hash3(i, j, sd + 49 + n, this.seed);
      props.push({ tipo: r < 0.25 ? 'barril' : r < 0.7 ? 'lixo' : 'caixas', x: p.x, y: p.y });
    }
    const nMancha = Math.floor(hash3(i, j, sd + 60, this.seed) * 3);
    for (let n = 0; n < nMancha; n++) {
      const along = 5 + hash3(i, j, sd + 61 + n, this.seed) * 14;
      const across = 1 + hash3(i, j, sd + 65 + n, this.seed) * 3;
      const p = at(along, across);
      props.push({ tipo: 'mancha', x: p.x, y: p.y, chao: true, s: hash3(i, j, sd + 69 + n, this.seed) });
    }
    return { props, solid };
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

  // Tudo que precisa ser desenhado num retângulo do mundo: prédios e coisas da rua
  objectsIn(x0, y0, x1, y1) {
    const out = [];
    const bi0 = Math.floor((x0 - P) / P), bi1 = Math.floor(x1 / P);
    const bj0 = Math.floor((y0 - P) / P), bj1 = Math.floor(y1 / P);
    for (let bi = bi0; bi <= bi1; bi++) for (let bj = bj0; bj <= bj1; bj++) {
      for (let sx = 0; sx < 2; sx++) for (let sy = 0; sy < 2; sy++) {
        const b = this.building(bi, bj, sx, sy);
        if (b.x1 < x0 || b.x0 > x1 || b.y1 < y0 || b.y0 > y1) continue;
        out.push({ kind: 'building', b });
      }
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
