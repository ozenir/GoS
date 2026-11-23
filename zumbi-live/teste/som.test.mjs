// Testes da acústica do som (som.js): de longe é mais baixo, mais grave e chega um pouco depois.
// Rodar:  node teste/som.test.mjs
import assert from 'node:assert/strict';
import { acustica } from '../public/js/view/som.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };

teste('do lado do herói: volume cheio e sem atraso', () => {
  const a = acustica(0);
  assert.equal(a.vol, 1);
  assert.equal(a.atraso, 0);
});

teste('quanto mais longe, mais baixo, mais grave (o ar come os agudos primeiro) e mais atrasado', () => {
  let antes = acustica(0);
  for (let d = 1; d <= 40; d++) {
    const a = acustica(d);
    assert.ok(a.vol < antes.vol && a.corte < antes.corte && a.atraso > antes.atraso, `distância ${d}`);
    antes = a;
  }
  assert.ok(acustica(25).corte < 1000, 'de longe só sobra o grave');
  assert.ok(acustica(25).atraso < 0.2, 'o atraso é pequeno (não desencontra da imagem)');
});

teste('eco da cidade: perto quase só o som direto; longe, cada vez mais eco (é o que faz o ouvido sentir "longe")', () => {
  let antes = acustica(0).eco;
  assert.ok(antes < 0.2, 'do lado do herói: pouco eco');
  for (let d = 2; d <= 40; d += 2) { const e = acustica(d).eco; assert.ok(e >= antes, `distância ${d}`); antes = e; }
  assert.ok(acustica(30).eco > 0.5 && acustica(60).eco <= 0.85, 'longe: muito eco, sem passar do limite');
});

console.log(`\n${ok} testes passaram.`);
