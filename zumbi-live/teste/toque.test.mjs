// Dano por toque: cada zumbi encostado tira 2/s (0,5/s com o herói em 30% ou menos), crescendo com a ameaça.
// Rodar:  node teste/toque.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { TOQUE, MORDIDA } from '../public/js/core/dano.js';
import { ZUMBIS } from '../public/js/core/dados.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;
const jogo = () => { const j = new Jogo({ sobrevivencia: false, seed: 6, classe: 'policial' }); j.zumbis = []; j.spawnT = 1e9; j.protecao = 0; j.hero.invT = 0; j.hero.nivel = 12; return j; };
const encostado = (j, dx = 0.3) => { const z = j.criarZumbi('comum', j.hero.x + dx, j.hero.y, null, { nascendo: 0 }); z.atkCd = 1e9; return z; };   // atkCd alto: só o toque, sem mordida

teste('cada zumbi encostado tira 2 por segundo (vezes a força dele, menos a defesa)', () => {
  const j = jogo(), h = j.hero; h.vida = h.vidaMax;
  const zs = [encostado(j, 0.3), encostado(j, -0.3)];
  const mult = zs.reduce((a, z) => a + Math.max(1, z.dano / ZUMBIS.comum.dano), 0);
  const v0 = h.vida;
  for (let i = 0; i < 1 / DT; i++) j.danoPorToque(DT);
  const esperado = TOQUE.porSegundo * mult * (1 - h.attr.get('defesa'));
  assert.ok(Math.abs((v0 - h.vida) - esperado) < 0.05, `perdeu ${(v0 - h.vida).toFixed(2)}, esperado ${esperado.toFixed(2)}`);
});

teste('com a vida em 30% ou menos, cai pra 0,5 por segundo', () => {
  const j = jogo(), h = j.hero; h.vida = h.vidaMax * 0.25;
  const z = encostado(j);
  const mult = Math.max(1, z.dano / ZUMBIS.comum.dano), v0 = h.vida;
  for (let i = 0; i < 1 / DT; i++) j.danoPorToque(DT);
  assert.ok(Math.abs((v0 - h.vida) - TOQUE.porSegundoBaixa * mult * (1 - h.attr.get('defesa'))) < 0.05);
});

teste('zumbi longe, invencível ou zumbi nascendo não tira nada', () => {
  const j = jogo(), h = j.hero;
  j.criarZumbi('comum', h.x + 3, h.y, null, { nascendo: 0 });
  const v0 = h.vida; for (let i = 0; i < 30; i++) j.danoPorToque(DT);
  assert.equal(h.vida, v0, 'longe');
  encostado(j); h.invT = 5;
  for (let i = 0; i < 30; i++) j.danoPorToque(DT);
  assert.equal(h.vida, v0, 'invencível');
});

teste('cresce com a ameaça: zumbi mais forte tira mais por toque', () => {
  const j = jogo(), h = j.hero; h.vida = h.vidaMax;
  const fraco = encostado(j); fraco.dano = ZUMBIS.comum.dano;
  let v0 = h.vida; for (let i = 0; i < 1 / DT; i++) j.danoPorToque(DT); const d1 = v0 - h.vida;
  fraco.dano = ZUMBIS.comum.dano * 3; h.vida = h.vidaMax; v0 = h.vida;
  for (let i = 0; i < 1 / DT; i++) j.danoPorToque(DT); const d3 = v0 - h.vida;
  assert.ok(Math.abs(d3 / d1 - 3) < 0.01, `${d1.toFixed(2)} → ${d3.toFixed(2)}`);
});

teste('mordida: pega quem está encostado na tela (além do colado) e a primeira sai logo ao chegar', () => {
  const j = jogo(), h = j.hero, ev = [];
  const e0 = j.emit.bind(j); j.emit = (t, d) => { ev.push(t); return e0(t, d); };
  const T = ZUMBIS.comum, z = j.criarZumbi('comum', h.x + T.alcance + MORDIDA.folga - 0.03, h.y, null, { nascendo: 0 });
  z.vel = 0; z.atkCd = 5;   // parado logo fora do alcance antigo (alcance + 0,12)
  const p = { x: h.x, y: h.y };
  for (let i = 0; i < (MORDIDA.chegada + 0.1) / DT; i++) { h.corpoCd = 9; h.tiroCd = 9; h.invT = 0; j.update(DT); h.x = p.x; h.y = p.y; }
  assert.ok(ev.includes('mordida'), 'mordeu em até ' + MORDIDA.chegada + ' s');
});

console.log(`\n${ok} testes passaram.`);
