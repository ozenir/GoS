// Escopeta: 2 tiros e 0,75 s recarregando; leque com dano em área, 4x de perto e empurrão de 3 casas.
// Rodar:  node teste/escopeta.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { ARMAS, ZUMBIS } from '../public/js/core/dados.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const E = ARMAS.escopeta;
// herói com escopeta parado, sem crítico, olhando pra +x; zumbis que não andam nem atacam
const arena = (seed = 3) => {
  const j = new Jogo({ seed, classe: 'policial', cena: 0 });
  j.zumbis = []; j.spawnT = 1e9; j.hero.invT = 1e9; j.trocarArma('escopeta', null); j.hero.municao = 999;
  j.hero.attr.addMod({ id: 'teste:semcrit', attr: 'critChance', soma: -5 });
  return j;
};
const zumbi = (j, dx, dy, tipo = 'gordo') => { const z = j.criarZumbi(tipo, j.hero.x + dx, j.hero.y + dy, null, { nascendo: 0 }); z.vida = z.vidaMax = 1e9; z.vel = 0; return z; };
const atirar = (j, base = 0) => { j.hero.tiroCd = 0; j.tiroEmArea(j.hero, E, base, E.alcance); };

teste('2 tiros seguidos e 0,75 s recarregando', () => {
  assert.equal(E.pente, 2); assert.equal(E.recarga, 0.75);
  const j = arena(), h = j.hero, DT = 1 / 60;
  const z = zumbi(j, 3, 0);
  const tiros = [], ev = [];
  const e0 = j.emit.bind(j); j.emit = (t, d) => { if (t === 'tiro' && d.heroi && tiros.at(-1) !== j.t) tiros.push(j.t); ev.push(t); return e0(t, d); };
  for (let i = 0; i < 4 / DT; i++) { z.x = h.x + 3; z.y = h.y; z.kx = z.ky = 0; j.atualizarHeroi(DT); j.t += DT; }
  assert.ok(ev.includes('recarregando') && ev.includes('recarregou'));
  const gaps = tiros.slice(1).map((t, k) => t - tiros[k]);
  // o padrão é: tiro, tiro rápido, recarga, tiro, tiro rápido, recarga...
  for (let k = 0; k + 1 < gaps.length; k += 2) {
    assert.ok(gaps[k] < 0.5, `2º tiro logo depois (${gaps[k].toFixed(2)} s)`);
    assert.ok(gaps[k + 1] >= E.recarga - 0.02, `recarga de ${gaps[k + 1].toFixed(2)} s`);
  }
  assert.ok(gaps.length >= 4);
});

teste('dano em área: acerta todos os zumbis do leque (e não os de fora)', () => {
  const j = arena();
  const dentro = [zumbi(j, 2.5, 0), zumbi(j, 3.5, 0.9), zumbi(j, 3, -0.9)], fora = [zumbi(j, 0, 3), zumbi(j, -3, 0)];
  atirar(j);
  for (const z of dentro) assert.ok(z.vida < z.vidaMax, 'acertou');
  for (const z of fora) assert.equal(z.vida, z.vidaMax, 'fora do leque');
});

teste('muito perto: 4x o dano', () => {
  const j = arena();
  const perto = zumbi(j, 1.0, 0), longe = zumbi(j, 3.8, 0.3);
  atirar(j);
  const dp = perto.vidaMax - perto.vida, dl = longe.vidaMax - longe.vida;
  assert.ok(Math.abs(dp / dl - E.area.multPerto) < 0.01, `perto ${dp.toFixed(1)} / longe ${dl.toFixed(1)}`);
});

teste('à queima-roupa empurra o zumbi 3 casas pra trás (chefe só um terço); o de longe não é empurrado', () => {
  const j = arena(5), h = j.hero;
  const z = zumbi(j, 1.5, 0), c = zumbi(j, 1.5, 0.6, 'chefao');
  const x0 = z.x, cx0 = c.x;
  atirar(j);
  for (let i = 0; i < 180; i++) { for (const q of [z, c]) { j.mover(q, q.kx / 60, q.ky / 60, 0.2); q.kx *= Math.pow(0.02, 1 / 60); q.ky *= Math.pow(0.02, 1 / 60); } }
  assert.ok(Math.abs(z.x - x0 - E.area.empurra) < 0.35, `andou ${(z.x - x0).toFixed(2)}`);
  assert.ok(Math.abs(c.x - cx0 - E.area.empurra / 3) < 0.3, `chefe andou ${(c.x - cx0).toFixed(2)}`);
  assert.ok(ZUMBIS.chefao.chefe);
  const k = arena(6), longe = zumbi(k, 3.6, 0);
  atirar(k);
  assert.equal(longe.kx || 0, 0, 'longe: só o dano, sem empurrão');
  assert.ok(longe.vida < longe.vidaMax);
});

teste('parede no meio: não acerta', () => {
  const j = arena();
  const z = zumbi(j, 2, 0);
  j.linhaLivre = () => false;
  atirar(j);
  assert.equal(z.vida, z.vidaMax);
});

console.log(`\n${ok} testes passaram.`);
