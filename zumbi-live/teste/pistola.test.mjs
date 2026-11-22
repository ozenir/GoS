// Pistola com pente: 14 tiros seguidos, depois 3 s recarregando.   Rodar:  node teste/pistola.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { ARMAS } from '../public/js/core/dados.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 60;

teste(`pistola: ${ARMAS.pistola.pente} tiros e ${ARMAS.pistola.recarga} s recarregando`, () => {
  const j = new Jogo({ seed: 2, classe: 'policial' });
  j.zumbis = []; j.spawnT = 1e9; j.hero.invT = 1e9; j.trocarArma('pistola', null);
  const h = j.hero;
  const z = j.criarZumbi('gordo', h.x + 3, h.y, null, { nascendo: 0 }); z.vida = z.vidaMax = 1e9; z.vel = 0;
  const tiros = [], ev = [];
  const e0 = j.emit.bind(j); j.emit = (t, d) => { if (t === 'tiro' && d.heroi) tiros.push(j.t); ev.push(t); return e0(t, d); };
  for (let i = 0; i < 14 / DT; i++) { z.x = h.x + 3; z.y = h.y; j.atualizarHeroi(DT); j.t += DT; }
  assert.ok(ev.includes('recarregando') && ev.includes('recarregou'));
  const gaps = tiros.slice(1).map((t, k) => t - tiros[k]);
  const grandes = gaps.map((g, k) => [g, k]).filter(([g]) => g > 2);
  assert.ok(grandes.length >= 1, 'teve pausa de recarga');
  const [g, k] = grandes[0];
  assert.equal(k + 1, ARMAS.pistola.pente, `${k + 1} tiros antes da primeira recarga`);
  assert.ok(g >= ARMAS.pistola.recarga, `pausa de ${g.toFixed(2)} s`);
});

console.log(`\n${ok} testes passaram.`);
