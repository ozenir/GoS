// ============================================================================
//  PRAIA — cenário especial a partir do nível 30 do herói.
//
//  Ao virar num cruzamento, tem PRAIA.chance (25%) de a rua dar na praia.
//  Lá, uma horda maior sai de dentro do mar e o herói precisa sobreviver
//  PRAIA.duracao segundos (1 minuto). Depois abre a votação de pra onde ir
//  (esquerda, frente ou direita) e ele volta pra cidade em outro ponto.
//
//  O mapa da praia funciona como o de um prédio (mesmos métodos do Room),
//  então presentes, aliados e o caminho do herói funcionam igual.
//  A areia fica embaixo e o mar em cima (linhas 0 a mar-1); a água deixa lento.
// ============================================================================
import { makeRng } from './util.js';
import { T } from './city.js';

export const PRAIA = {
  desdeNivel: 30,       // nível do herói
  chance: 0.25,         // chance a cada cruzamento (a partir do nível acima)
  intervalo: 4,         // cruzamentos no mínimo entre uma praia e outra
  duracao: 60,          // segundos pra sobreviver
  ondaCada: 6,          // segundos entre as ondas de zumbis do mar
  hordaInicial: 1.4,    // a primeira horda: tamanho da horda normal × isto
  w: 24, h: 18, mar: 6
};

export class Praia {
  constructor(semente) {
    this.kind = 'room';
    this.praia = true;
    this.tipo = 'praia';
    this.w = PRAIA.w; this.h = PRAIA.h; this.mar = PRAIA.mar;
    this.shop = { tipo: 'praia', nome: 'Praia', emoji: '🏖️', semente };
    this.info = { chao: 'areia', zumbis: 0, loot: [] };
    const rng = makeRng(semente || 1);
    this.solid = new Set();
    this.props = [];
    // água: todo mundo anda devagar dentro do mar (os zumbis saem dele bem devagar)
    this.zonas = [{ tipo: 'agua', x0: 0, y0: 0, x1: this.w, y1: this.mar - 0.2, semente: 3, oculta: true }];
    this.entrada = { x: this.w / 2, y: this.h - 2.5 };
    this.saida = { x: this.w / 2, y: this.h - 1 };
    this.centro = { x: this.w / 2, y: (this.mar + this.h) / 2 + 0.5 };
    // coqueiros, guarda-sóis, cadeiras, pedras e o posto do salva-vidas, longe do meio da areia
    const lugares = [];
    for (let y = this.mar + 1; y < this.h - 1; y++) for (let x = 1; x < this.w - 1; x++) {
      if (Math.abs(x - this.centro.x) < 5 && Math.abs(y - this.centro.y) < 3.5) continue;
      lugares.push({ x, y });
    }
    const pegar = () => lugares.splice(rng.int(0, lugares.length - 1), 1)[0];
    const por = (tipo, n, solido) => { for (let k = 0; k < n && lugares.length; k++) { const p = pegar(); this.props.push({ tipo, x: p.x, y: p.y }); if (solido) this.solid.add(p.x + ',' + p.y); } };
    por('coqueiro', 6, true);
    por('guarda_sol', 5, false);
    por('cadeira_praia', 4, false);
    por('pedra', 4, true);
    por('salva_vidas', 1, true);
    this.livres = [];
    for (let y = this.mar + 1; y < this.h - 1; y++) for (let x = 1; x < this.w - 1; x++) if (this.tileWalk(x, y)) this.livres.push({ x: x + 0.5, y: y + 0.5 });
  }

  tile(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) return T.OUT;
    return ty < this.mar ? T.MAR : T.AREIA;
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

  // Ponto dentro do mar (de onde a horda sai)
  pontoNoMar(rng) {
    return { x: rng.range(1, this.w - 1), y: rng.range(0.6, this.mar - 1.2) };
  }
}
