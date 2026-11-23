// Testes do cabo de guerra (top ajudante x top atrapalhante) e do resultado da votação.
// Rodar:  node teste/cabo.test.mjs
import assert from 'node:assert/strict';
import { Jogo, RESULTADO_SEG } from '../public/js/core/jogo.js';
import { caboDeGuerra, CABO, multSpawnCabo, multForcaCabo, sorteCabo } from '../public/js/core/cabo.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;
const rank = (a, b) => ({ ajuda: a ? [{ nick: 'ana', coins: a }] : [], atrapalha: b ? [{ nick: 'pedro', coins: b }] : [] });

teste('a barra divide pela parte de cada top; perto do empate não faz nada', () => {
  const vazio = caboDeGuerra(null);
  assert.equal(vazio.pct, 0.5); assert.equal(vazio.lado, null);
  assert.equal(caboDeGuerra(rank(10, 9)).lado, null, 'quase empate');
  const c = caboDeGuerra(rank(1, 0));
  assert.ok(c.pct > 0.5 && c.pct < 0.6, '1 moeda sozinha puxa só um pouco');
  const a = caboDeGuerra(rank(300, 20));
  assert.equal(a.lado, 'ajuda'); assert.ok(a.pct > 0.85 && a.forca > 0.7);
  const b = caboDeGuerra(rank(20, 300));
  assert.equal(b.lado, 'atrapalha'); assert.ok(Math.abs(b.pct - (1 - a.pct)) < 1e-9);
});

teste('atrapalhante na frente: zumbis da rua um pouco mais fortes e em maior número', () => {
  const c = caboDeGuerra(rank(0, 1000));
  assert.ok(multSpawnCabo(c) > 1 && multSpawnCabo(c) <= 1 + CABO.spawnMax);
  assert.ok(multForcaCabo(c) > 1 && multForcaCabo(c) <= 1 + CABO.forcaMax);
  assert.equal(sorteCabo(c), 0);
  const j = new Jogo({ seed: 3, classe: 'policial' }), k = new Jogo({ seed: 3, classe: 'policial' });
  k.definirRanking(rank(0, 1000));
  const z1 = j.criarZumbi('comum', 0, 0, null, { nascendo: 0 }), z2 = k.criarZumbi('comum', 0, 0, null, { nascendo: 0 });
  assert.ok(z2.vidaMax > z1.vidaMax * 1.08 && z2.dano > z1.dano * 1.08, `${z1.vidaMax} → ${z2.vidaMax}`);
});

teste('ajudante na frente: sorte, os cadáveres às vezes deixam suprimentos', () => {
  const j = new Jogo({ seed: 5, classe: 'policial' });
  j.definirRanking(rank(1000, 0));
  assert.equal(multForcaCabo(j.cabo), 1);
  const ev = []; const e0 = j.emit.bind(j); j.emit = (t, d) => { ev.push(t); return e0(t, d); };
  const antes = j.itens.length;
  for (let i = 0; i < 2000; i++) { const z = j.criarZumbi('comum', j.hero.x + 30, j.hero.y, null, { nascendo: 0 }); j.matarZumbi(z, null); }
  const n = ev.filter(t => t === 'sorte_cadaver').length;
  assert.ok(n > 2000 * sorteCabo(j.cabo) * 0.6 && n < 2000 * sorteCabo(j.cabo) * 1.4, `suprimentos: ${n}`);
  assert.ok(j.itens.length > antes);
  // sem ninguém na frente: nada
  const k = new Jogo({ seed: 5, classe: 'policial' });
  const ev2 = []; const e2 = k.emit.bind(k); k.emit = (t, d) => { ev2.push(t); return e2(t, d); };
  for (let i = 0; i < 300; i++) { const z = k.criarZumbi('comum', k.hero.x + 30, k.hero.y, null, { nascendo: 0 }); k.matarZumbi(z, null); }
  assert.ok(!ev2.includes('sorte_cadaver'));
});

teste(`a próxima votação só abre ${RESULTADO_SEG} s depois do anúncio do resultado`, () => {
  const j = new Jogo({ seed: 8, classe: 'bombeira' });
  j.hero.invT = 1e9;
  const ev = []; const e0 = j.emit.bind(j); j.emit = (t, d) => { ev.push({ t, em: j.t }); return e0(t, d); };
  // (sobrevivência: as votações são mais espaçadas — destino no mapa, encontros e o Barganha — então roda 12 min)
  for (let i = 0; i < 720 / DT; i++) j.update(DT);
  let conferidos = 0, dec = null;
  for (const e of ev) {
    if (e.t === 'decisao') dec = e.em;
    if (e.t === 'votacao_abriu' && dec != null) { assert.ok(e.em - dec >= RESULTADO_SEG - 0.05, `abriu ${(e.em - dec).toFixed(2)} s depois`); conferidos++; dec = null; }
  }
  assert.ok(conferidos >= 3, `conferidos ${conferidos}`);
});

console.log(`\n${ok} testes passaram.`);
