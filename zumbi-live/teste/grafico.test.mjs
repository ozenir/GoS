// Gráfico de atributos (core/grafico.js).   Rodar:  node teste/grafico.test.mjs
import assert from 'node:assert/strict';
import { blocos, maximo, graficoDoHeroi, pedeGrafico, LINHAS, BLOCOS } from '../public/js/core/grafico.js';
import { CLASSES } from '../public/js/core/dados.js';
import { Jogo } from '../public/js/core/jogo.js';
import { aplicarCarta } from '../public/js/core/habilidades.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };

teste('5 bloquinhos, sempre arredondando pra baixo (4,8 de 5 = 4)', () => {
  assert.equal(blocos(4.8, 5), 4);
  assert.equal(blocos(800, 800), 5);
  assert.equal(blocos(799, 800), 4);
  assert.equal(blocos(159, 800), 0);
  assert.equal(blocos(160, 800), 1);
  assert.equal(blocos(5000, 800), BLOCOS, 'nunca passa de 5');
  assert.equal(blocos(-1, 800), 0);
});

teste('cada personagem tem um máximo pra cada atributo, e os limites do jogo valem', () => {
  for (const c of Object.keys(CLASSES)) for (const L of LINHAS) assert.ok(maximo(c, L.id) > 0, `${c} ${L.id}`);
  assert.ok(maximo('bombeiro', 'vidaMax') > maximo('policial', 'vidaMax'), 'bombeira tem mais vida');
  for (const c of Object.keys(CLASSES)) {
    assert.ok(maximo(c, 'velocidade') <= 2.2 && maximo(c, 'defesa') <= 0.6 && maximo(c, 'esquiva') <= 0.45 && maximo(c, 'cadencia') <= 6);
  }
});

teste('herói novo tem poucos blocos; ficando forte, os blocos sobem e nunca passam do máximo', () => {
  const j = new Jogo({ seed: 3, classe: 'policial' });
  const antes = graficoDoHeroi(j.hero);
  for (const l of antes) assert.ok(l.valor <= l.max + 1e-9, `${l.id} ${l.valor} > ${l.max}`);
  const forca0 = antes.find(l => l.id === 'forca').blocos;
  aplicarCarta(j, { tipo: 'passiva', id: 'forca', nivel: 5 });
  aplicarCarta(j, { tipo: 'passiva', id: 'couro', nivel: 5 });
  const depois = graficoDoHeroi(j.hero);
  assert.ok(depois.find(l => l.id === 'forca').valor > antes.find(l => l.id === 'forca').valor);
  assert.ok(depois.find(l => l.id === 'defesa').blocos > antes.find(l => l.id === 'defesa').blocos);
  assert.ok(depois.find(l => l.id === 'forca').blocos >= forca0);
});

teste('comentar G (ou gráfico, status...) abre o gráfico; outras palavras não', () => {
  for (const t of ['g', 'G', 'gg', 'gráfico', 'grafico', 'Gráfico!', 'status', 'atributos', '📊']) assert.ok(pedeGrafico(t), t);
  for (const t of ['gabi', 'oi g', 'ganhou', '1', 'a']) assert.ok(!pedeGrafico(t), t);
  const j = new Jogo({ seed: 3 });
  j.handle({ type: 'chat', id: 'x', nick: 'ana.lu', texto: 'G' });
  assert.ok(j.drainEvents().some(e => e.type === 'grafico' && e.nick === 'ana.lu'));
});

console.log(`\n${ok} testes passaram.`);
