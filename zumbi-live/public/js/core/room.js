// Interior de um prédio: uma sala só, montada na hora conforme o tipo de loja.
// O herói entra pela frente, pega o que achar e sai pela porta dos fundos.
//
// Cada tipo tem tamanho, móveis, plantas possíveis (fileiras, ilhas ou corredor), zumbis, loot
// e perigos no chão (ambiente.js). A sala sempre garante caminho da entrada até a saída e até o loot.
import { makeRng } from './util.js';
import { T } from './city.js';

// O que cada lugar tem por dentro
//   tamanho  [largura, fundo] em casas     plantas  quais arrumações de móveis podem sair
//   loot     [[item, quantos, chance de cada um (padrão 1)]] — nem sempre tem tudo: é preciso ir conferir
//   oque     o que dá pra achar lá (aparece na votação: cada direção leva a um lugar)
//   perigos  [[tipo (ambiente.js), quantos]]
// Itens com propósito (jogo.js → pegar): 🥫 comida (cura), 🥤 energético (mais rápido), 🍊 vitaminas (resistência),
// 💊 remédio (regeneração e cura a infecção), 🔫 arma (pistola ou escopeta, com munição contada)
export const LOJAS = {
  farmacia:  { zumbis: 3,  tamanho: [12, 10], chao: 'azulejo',  moveis: 'prateleira', plantas: ['fileiras', 'ilhas'], oque: 'remédios, curativos',
               loot: [['remedio', 2, 0.75], ['cura_pequena', 2], ['kit', 1, 0.5]], perigos: [['vidro', 1]] },
  mercado:   { zumbis: 4,  tamanho: [13, 10], chao: 'piso',     moveis: 'prateleira', plantas: ['fileiras', 'corredor'], oque: 'comida, energético, vitaminas',
               loot: [['comida', 2], ['comida', 1, 0.5], ['energetico', 1, 0.8], ['vitamina', 1, 0.7]], perigos: [['vidro', 1]] },
  casa:      { zumbis: 3,  tamanho: [10, 8],  chao: 'piso',     moveis: 'sofa',       plantas: ['ilhas', 'corredor'], oque: 'comida, curativos',
               loot: [['comida', 1], ['cura_pequena', 1], ['municao', 1, 0.5]], perigos: [['entulho', 1]] },
  posto:     { zumbis: 5,  tamanho: [12, 10], chao: 'concreto', moveis: 'bancada',    plantas: ['ilhas', 'fileiras'], oque: 'colete, munição, energético',
               loot: [['colete', 1], ['municao', 2], ['energetico', 1, 0.6]], perigos: [['fogo', 1], ['lama', 1]] },
  fabrica:   { zumbis: 8,  tamanho: [14, 11], chao: 'concreto', moveis: 'maquina',    plantas: ['corredor', 'ilhas'], oque: 'baú, colete, munição',
               loot: [['bau_medio', 1], ['colete', 1], ['municao', 2]], perigos: [['acido', 2], ['fogo', 1], ['arame', 1]] },
  delegacia: { zumbis: 7,  tamanho: [12, 10], chao: 'piso',     moveis: 'mesa',       plantas: ['fileiras', 'corredor'], oque: 'armas, munição, colete',
               loot: [['arma', 1], ['municao', 2], ['colete', 1], ['bau_medio', 1, 0.35]], perigos: [['arame', 1]] },
  hospital:  { zumbis: 10, tamanho: [14, 10], chao: 'azulejo',  moveis: 'maca',       plantas: ['fileiras'], oque: 'remédios, kits de cura',
               loot: [['remedio', 2], ['kit', 2], ['bau_medio', 1, 0.5], ['bau_lendario_chance', 1]], perigos: [['vidro', 1], ['acido', 1]] }
};

export class Room {
  constructor(shop) {
    this.kind = 'room';
    this.shop = shop;
    this.tipo = shop.tipo;
    this.info = LOJAS[shop.tipo] || LOJAS.mercado;
    const [W, H] = this.info.tamanho;
    this.w = W; this.h = H;
    const rng = makeRng(shop.semente || 1);
    this.rng = rng;
    this.solid = new Set();
    this.props = [];
    this.zonas = [];
    this.entrada = { x: W / 2, y: H - 1.2 };
    this.saida = { x: W - 2.5, y: 0.7 };       // porta dos fundos, na parede de cima
    this.planta = rng.pick(this.info.plantas);
    this.mobiliar(rng);
    this.addProp({ tipo: 'balcao', x: 1, y: H - 3, w: 2, h: 1 });   // balcão perto da entrada
    this.garantirCaminho();
    // casas livres e alcançáveis (pra loot, zumbis e perigos)
    const alcanca = this.alcancaveis();
    this.livres = [];
    for (let y = 1; y < H - 2; y++) for (let x = 1; x < W - 1; x++) if (this.tileWalk(x, y) && alcanca.has(x + ',' + y)) this.livres.push({ x: x + 0.5, y: y + 0.5 });
    if (!this.livres.length) this.livres.push({ ...this.entrada });
    // perigos no chão, longe da entrada e da saída
    for (const [tipo, n] of this.info.perigos || []) for (let k = 0; k < n; k++) {
      const p = this.pontoLivre(rng, this.entrada, 3.5);
      if (Math.hypot(p.x - this.saida.x, p.y - this.saida.y) < 2) continue;
      const lw = rng.range(1.2, 2.2), lh = rng.range(1.2, 2);
      this.zonas.push({ tipo, x0: p.x - lw / 2, y0: p.y - lh / 2, x1: p.x + lw / 2, y1: p.y + lh / 2, semente: rng.int(1, 1e6) });
    }
  }

  mobiliar(rng) {
    const W = this.w, H = this.h, m = this.info.moveis;
    const v = () => rng.int(0, 3);
    if (m === 'maca') {   // hospital: fileiras de macas
      for (const fy of [2, 5]) for (let x = 2 + rng.int(0, 1); x <= W - 4; x += 3) this.addProp({ tipo: 'maca', x, y: fy, w: 2, h: 1 });
      return;
    }
    if (this.planta === 'fileiras') {
      // duas fileiras com um buraco no meio de cada uma
      for (const fy of [3, Math.min(H - 4, 6)]) {
        const x0 = 2 + rng.int(0, 1), x1 = W - 3 - rng.int(0, 1), buraco = rng.int(x0 + 2, x1 - 2);
        for (let x = x0; x <= x1; x++) if (x !== buraco) this.addProp({ tipo: m, x, y: fy, w: 1, h: 1, v: v() });
      }
    } else if (this.planta === 'ilhas') {
      // blocos 2x2 espalhados
      const n = Math.floor((W * H) / 30);
      for (let k = 0; k < n; k++) {
        const x = rng.int(2, W - 4), y = rng.int(2, H - 5);
        if ([...this.solid].some(s => { const [sx, sy] = s.split(',').map(Number); return Math.abs(sx - x) < 3 && Math.abs(sy - y) < 3; })) continue;
        this.addProp({ tipo: m, x, y, w: 2, h: 1, v: v() });
        this.addProp({ tipo: m, x, y: y + 1, w: 2, h: 1, v: v() });
      }
    } else {
      // corredor em L: uma parede de móveis comprida e outra atravessada
      const fy = rng.int(3, Math.max(3, H - 5)), fx = rng.int(3, W - 4);
      for (let x = 1; x < W - 3; x++) this.addProp({ tipo: m, x, y: fy, w: 1, h: 1, v: v() });
      for (let y = 1; y < fy; y++) if (y !== 1) this.addProp({ tipo: m, x: fx, y, w: 1, h: 1, v: v() });
    }
  }

  addProp(p) {
    this.props.push(p);
    for (let dx = 0; dx < (p.w || 1); dx++) for (let dy = 0; dy < (p.h || 1); dy++) this.solid.add((p.x + dx) + ',' + (p.y + dy));
  }

  removerProp(p) {
    this.props = this.props.filter(q => q !== p);
    for (let dx = 0; dx < (p.w || 1); dx++) for (let dy = 0; dy < (p.h || 1); dy++) this.solid.delete((p.x + dx) + ',' + (p.y + dy));
  }

  // Casas alcançáveis a partir da entrada
  alcancaveis() {
    const ok = new Set(), fila = [[Math.floor(this.entrada.x), Math.floor(this.entrada.y)]];
    ok.add(fila[0].join(','));
    while (fila.length) {
      const [x, y] = fila.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (!ok.has(k) && this.tileWalk(nx, ny)) { ok.add(k); fila.push([nx, ny]); }
      }
    }
    return ok;
  }

  // Se algum móvel fechou o caminho até a saída, tira móveis (do mais perto da saída) até abrir
  garantirCaminho() {
    const alvo = Math.floor(this.saida.x) + ',' + Math.floor(this.saida.y);
    for (let tent = 0; tent < 40 && !this.alcancaveis().has(alvo); tent++) {
      const p = [...this.props].filter(q => q.tipo !== 'balcao').sort((a, b) => Math.hypot(a.x - this.saida.x, a.y - this.saida.y) - Math.hypot(b.x - this.saida.x, b.y - this.saida.y))[0];
      if (!p) break;
      this.removerProp(p);
    }
  }

  tile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return (tx === -1 || ty === -1) && tx < this.w && ty < this.h ? T.WALL : T.OUT;
    return T.FLOOR;
  }
  tileOpen(tx, ty) { return tx >= 0 && ty >= 0 && tx < this.w && ty < this.h; }
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
