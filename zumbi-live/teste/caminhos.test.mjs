// Testes dos caminhos e da história.   Rodar:  node teste/caminhos.test.mjs
import assert from 'node:assert/strict';
import { sortearCaminho, PERIGOS, CHANCES_PADRAO } from '../public/js/core/caminhos.js';
import { Historia, HISTORIA } from '../public/js/core/historia.js';
import { makeRng } from '../public/js/core/util.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };

teste('chances padrão: 80% perigoso, 18% livre, 2% história', () => {
  const rng = makeRng(42), N = 200000, c = { perigoso: 0, livre: 0, historia: 0 };
  for (let i = 0; i < N; i++) c[sortearCaminho(rng, CHANCES_PADRAO, true).tipo]++;
  const pct = k => c[k] / N * 100;
  assert.ok(Math.abs(pct('perigoso') - 80) < 0.5, `perigoso ${pct('perigoso')}`);
  assert.ok(Math.abs(pct('livre') - 18) < 0.5, `livre ${pct('livre')}`);
  assert.ok(Math.abs(pct('historia') - 2) < 0.2, `historia ${pct('historia')}`);
  console.log(`      (${pct('perigoso').toFixed(2)}% / ${pct('livre').toFixed(2)}% / ${pct('historia').toFixed(2)}%)`);
});
teste('sem fragmento sobrando, história vira caminho livre', () => {
  const rng = makeRng(7);
  for (let i = 0; i < 20000; i++) assert.notEqual(sortearCaminho(rng, CHANCES_PADRAO, false).tipo, 'historia');
});
teste('chances do config são respeitadas (ex.: 50/50/0)', () => {
  const rng = makeRng(9), c = { perigoso: 0, livre: 0, historia: 0 };
  for (let i = 0; i < 50000; i++) c[sortearCaminho(rng, { perigoso: 50, livre: 50, historia: 0 }, true).tipo]++;
  assert.equal(c.historia, 0);
  assert.ok(Math.abs(c.perigoso / 50000 - 0.5) < 0.01);
});
teste('caminho perigoso sempre traz um perigo que existe', () => {
  const rng = makeRng(3);
  for (let i = 0; i < 5000; i++) { const s = sortearCaminho(rng); if (s.tipo === 'perigoso') assert.ok(PERIGOS[s.perigo]); }
});
teste('fragmentos da história: ids únicos e campos preenchidos', () => {
  const ids = new Set();
  for (const f of HISTORIA.fragmentos) {
    assert.ok(f.id && !ids.has(f.id), `id repetido ou vazio: ${f.id}`); ids.add(f.id);
    assert.ok(f.titulo && f.texto && HISTORIA.capitulos[f.capitulo], `fragmento incompleto: ${f.id}`);
  }
});
teste('a história avança na ordem e lembra o que já foi lido', () => {
  const h = new Historia();
  assert.equal(h.proximo().id, HISTORIA.fragmentos[0].id);
  h.marcar(HISTORIA.fragmentos[0].id);
  assert.equal(h.proximo().id, HISTORIA.fragmentos[1].id);
  const salvo = h.lista();
  const h2 = new Historia(salvo);
  assert.equal(h2.lidos, 1);
  assert.equal(h2.proximo().id, HISTORIA.fragmentos[1].id);
});
teste('progresso salvo com id que não existe mais é ignorado', () => {
  const h = new Historia(['nao-existe', HISTORIA.fragmentos[0].id]);
  assert.equal(h.lidos, 1);
});
teste('quando acaba, proximo() é null', () => {
  const h = new Historia(HISTORIA.fragmentos.map(f => f.id));
  assert.equal(h.proximo(), null);
});
console.log(`\n${ok} testes passaram.`);
