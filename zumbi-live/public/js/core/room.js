// Interior de um prédio: uma sala só, montada na hora conforme o tipo de loja.
// O herói entra pela frente, pega o que achar e sai pela porta dos fundos.
import { makeRng } from './util.js';
import { T } from './city.js';

export const ROOM_W = 12, ROOM_H = 10;

// O que cada loja tem e quantos zumbis costumam estar lá dentro
export const LOJAS = {
  farmacia: { zumbis: 3, loot: [['kit', 2], ['cura_pequena', 1]], chao: 'azulejo', moveis: 'prateleira' },
  mercado: { zumbis: 4, loot: [['municao', 2], ['cura_pequena', 2]], chao: 'piso', moveis: 'prateleira' },
  posto: { zumbis: 5, loot: [['colete', 1], ['municao', 2]], chao: 'concreto', moveis: 'bancada' },
  delegacia: { zumbis: 7, loot: [['bau_medio', 1], ['municao', 2], ['colete', 1]], chao: 'piso', moveis: 'mesa' },
  hospital: { zumbis: 10, loot: [['kit', 2], ['bau_medio', 1], ['bau_lendario_chance', 1]], chao: 'azulejo', moveis: 'maca' }
};

export class Room {
  constructor(shop) {
    this.kind = 'room';
    this.shop = shop;
    this.tipo = shop.tipo;
    this.w = ROOM_W; this.h = ROOM_H;
    this.info = LOJAS[shop.tipo] || LOJAS.mercado;
    const rng = makeRng(shop.semente || 1);
    this.solid = new Set();
    this.props = [];
    this.entrada = { x: ROOM_W / 2, y: ROOM_H - 1.2 };
    this.saida = { x: ROOM_W - 2.5, y: 0.7 };       // porta dos fundos, na parede de cima
    const moveis = this.info.moveis;
    // Duas ou três fileiras de móveis, com passagem nas pontas
    const fileiras = moveis === 'maca' ? [2, 5] : [3, 6];
    for (const fy of fileiras) {
      const x0 = 2 + rng.int(0, 1), x1 = ROOM_W - 3 - rng.int(0, 1);
      if (moveis === 'maca') {
        for (let x = x0; x <= x1; x += 3) this.addProp({ tipo: 'maca', x, y: fy, w: 2, h: 1 });
      } else {
        // abre um buraco no meio da fileira pra não ficar labirinto
        const buraco = rng.int(x0 + 2, x1 - 2);
        for (let x = x0; x <= x1; x++) if (x !== buraco) this.addProp({ tipo: moveis, x, y: fy, w: 1, h: 1, v: rng.int(0, 3) });
      }
    }
    // Balcão perto da entrada
    this.addProp({ tipo: 'balcao', x: 1, y: ROOM_H - 3, w: 2, h: 1 });
    // Pontos onde o loot aparece (casas livres, longe da entrada)
    this.livres = [];
    for (let y = 1; y < ROOM_H - 2; y++) for (let x = 1; x < ROOM_W - 1; x++) if (this.tileWalk(x, y)) this.livres.push({ x: x + 0.5, y: y + 0.5 });
    this.rng = rng;
  }

  addProp(p) {
    this.props.push(p);
    for (let dx = 0; dx < (p.w || 1); dx++) for (let dy = 0; dy < (p.h || 1); dy++) this.solid.add((p.x + dx) + ',' + (p.y + dy));
  }

  tile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= ROOM_W || ty >= ROOM_H) return (tx === -1 || ty === -1) && tx < ROOM_W && ty < ROOM_H ? T.WALL : T.OUT;
    return T.FLOOR;
  }
  tileOpen(tx, ty) { return tx >= 0 && ty >= 0 && tx < ROOM_W && ty < ROOM_H; }
  tileWalk(tx, ty) { return this.tileOpen(tx, ty) && !this.solid.has(tx + ',' + ty); }
  walkable(x, y) { return this.tileWalk(Math.floor(x), Math.floor(y)); }

  objectsIn() { return this.props.map(p => ({ kind: 'prop', p })); }

  pontoLivre(rng, longeDe, minDist = 3) {
    for (let n = 0; n < 30; n++) {
      const p = rng.pick(this.livres);
      if (!longeDe || Math.hypot(p.x - longeDe.x, p.y - longeDe.y) >= minDist) return { x: p.x + rng.range(-0.2, 0.2), y: p.y + rng.range(-0.2, 0.2) };
    }
    return { ...this.livres[0] };
  }
}
