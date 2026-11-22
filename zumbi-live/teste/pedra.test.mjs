// Zumbi da pedra e a trinca no vidro (core/pedra.js).   Rodar:  node teste/pedra.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { PEDRA, energiaPedra, numRadiais, comprimentoRadial, gerarTrinca } from '../public/js/core/pedra.js';
import { ZUMBIS } from '../public/js/core/dados.js';
import { makeRng } from '../public/js/core/util.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;

teste('energia do impacto de uma pedra de 200 g a 12–18 m/s: uns 15 a 32 J', () => {
  const a = energiaPedra(PEDRA.massa, PEDRA.vel[0]), b = energiaPedra(PEDRA.massa, PEDRA.vel[1]);
  assert.ok(a > 13 && a < 16 && b > 30 && b < 34, `${a.toFixed(1)} a ${b.toFixed(1)} J`);
});

teste('mais energia: mais trincas radiais (√E) e mais compridas (∛E)', () => {
  assert.ok(numRadiais(30) > numRadiais(15));
  assert.ok(numRadiais(1) >= PEDRA.radiais[0] && numRadiais(1000) <= PEDRA.radiais[1]);
  assert.ok(Math.abs(comprimentoRadial(PEDRA.E0 * 8) / comprimentoRadial(PEDRA.E0) - 2) < 1e-9, 'oito vezes a energia, o dobro do comprimento');
});

teste('a trinca é uma estrela com anéis, dentro da tela, e cada pedrada é diferente', () => {
  const rng = makeRng(7), r = () => rng.next();
  const vistos = new Set();
  for (let i = 0; i < 40; i++) {
    const t = gerarTrinca(r, 216, 384);
    assert.ok(t.cx > 0 && t.cx < 216 && t.cy > 0 && t.cy < 384);
    assert.ok(t.radiais.length >= numRadiais(t.E), 'radiais (e os galhos)');
    assert.ok(t.aneis.length >= 1, 'pelo menos um pedaço de anel');
    for (const pts of t.radiais) for (let k = 1; k < pts.length; k++) assert.ok(Math.hypot(pts[k][0] - pts[k - 1][0], pts[k][1] - pts[k - 1][1]) < 2.01, 'passos de 2 px');
    vistos.add(Math.round(t.cx) + ',' + Math.round(t.cy));
  }
  assert.ok(vistos.size > 35, 'lugar sorteado');
});

teste('o zumbi da pedra fica de longe, joga pedra (sempre acerta), machuca até 7% e trinca a tela', () => {
  const j = new Jogo({ seed: 4, classe: 'bombeira' });
  j.zumbis = []; j.spawnT = 999; j.hordaT = 999; j.protecao = 0;
  const h = j.hero;
  const ev = []; const e0 = j.emit.bind(j); j.emit = (t, d) => { ev.push(t); return e0(t, d); };
  const z = j.criarZumbi('pedreiro', h.x + 7, h.y, null, { nascendo: 0 });
  z.tomateCd = 0.1;
  const v0 = h.vida;
  for (let i = 0; i < 2 / DT; i++) { j.atualizarZumbis(DT); j.atualizarTomates(DT); }
  assert.ok(ev.includes('pedra_lancada') && ev.includes('pedrada'));
  assert.ok(!ev.includes('tomatada'), 'pedra não é tomate');
  const perdeu = v0 - h.vida;
  assert.ok(perdeu > 0 && perdeu <= h.vidaMax * ZUMBIS.pedreiro.pedra.danoMax + 1e-9, `perdeu ${perdeu.toFixed(1)}`);
});

teste('um zumbi da pedra por vez, só do nível 6 em diante', () => {
  const j = new Jogo({ seed: 9, classe: 'policial' });
  j.hero.invT = 1e9;
  let max = 0;
  for (let q = 0; q < 20; q++) { j.hero.nivel = 3; j.andouQuarteirao(1); for (let i = 0; i < 6 / DT; i++) j.update(DT); }
  assert.equal(j.zumbis.filter(z => z.tipo === 'pedreiro').length, 0, 'antes do nível 6 não vem');
  for (let q = 0; q < 30; q++) { j.hero.nivel = 8; j.andouQuarteirao(1); for (let i = 0; i < 6 / DT; i++) { j.update(DT); j.hero.vida = j.hero.vidaMax; } max = Math.max(max, j.zumbis.filter(z => !z.morto && z.tipo === 'pedreiro').length); }
  assert.equal(max, 1);
});

console.log(`\n${ok} testes passaram.`);
