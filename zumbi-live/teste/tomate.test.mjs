// Física do tomate escorrendo no vidro (core/tomate.js).   Rodar:  node teste/tomate.test.mjs
import assert from 'node:assert/strict';
import { FISICA, CALDO, velocidadeTomate, perdaPorMetro, velocidadeFilete, alcanceFilete, comprimentoFilete, simularEscorrego } from '../public/js/core/tomate.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const F = FISICA, m0 = F.massa * F.ficaNoVidro;

teste('tomate grudado escorrega devagar, na faixa de um tomate de verdade (1 a 10 cm/s)', () => {
  const v = velocidadeTomate(m0);
  assert.ok(v > 0.01 && v < 0.1, `${(v * 100).toFixed(1)} cm/s`);
  console.log(`      começa a ${(v * 100).toFixed(1)} cm/s`);
});

teste('abaixo da tensão de escoamento ele não escorrega (Bingham); mais pesado, mais rápido', () => {
  const limite = F.tensaoEscoamento * Math.PI * (F.diametro / 2) ** 2 / F.g;   // massa em que τ = τy
  assert.equal(velocidadeTomate(limite * 0.99), 0);
  assert.ok(velocidadeTomate(limite * 1.5) > 0);
  for (let m = 0.02; m < 0.1; m += 0.01) assert.ok(velocidadeTomate(m + 0.01) >= velocidadeTomate(m));
  assert.ok(velocidadeTomate(m0, F, 1.25) < velocidadeTomate(m0, F, 1), 'ponto do vidro com mais atrito: mais devagar');
});

teste('escorregando ele perde massa no rastro e desacelera; desce a tela toda em um tempo de verdade', () => {
  const altura = 384 / F.pxPorMetro;   // a tela é um vidro de 64 cm
  const r = simularEscorrego(altura);
  assert.ok(r.tempo > 6 && r.tempo < 30, `${r.tempo.toFixed(1)} s`);
  assert.ok(r.massaFinal < m0 && velocidadeTomate(r.massaFinal) < velocidadeTomate(m0));
  assert.ok(Math.abs((m0 - r.massaFinal) - perdaPorMetro() * altura) < 1e-4, 'perdeu o rastro (densidade × largura × espessura)');
  console.log(`      desce os 64 cm em ${r.tempo.toFixed(1)} s, de ${(m0 * 1000).toFixed(0)} g pra ${(r.massaFinal * 1000).toFixed(0)} g`);
});

teste('filetes de caldo: velocidade de filme (Nusselt) e param quando o volume vira filme', () => {
  const [h0, h1] = CALDO.espessura;
  const u0 = velocidadeFilete(h0), u1 = velocidadeFilete(h1);
  assert.ok(u0 > 0.005 && u1 < 0.15 && u1 > u0, `${(u0 * 100).toFixed(1)} a ${(u1 * 100).toFixed(1)} cm/s`);
  const Lmax = alcanceFilete(CALDO.volume[0], 0.005);
  assert.ok(comprimentoFilete(1, u1, Lmax) < comprimentoFilete(2, u1, Lmax));
  assert.ok(comprimentoFilete(1e4, u1, Lmax) <= Lmax + 1e-9, 'não passa do alcance');
  console.log(`      filetes a ${(u0 * 100).toFixed(1)}–${(u1 * 100).toFixed(1)} cm/s`);
});

console.log(`\n${ok} testes passaram.`);
