// Testes do nível de ameaça.   Rodar:  node teste/ameaca.test.mjs
import assert from 'node:assert/strict';
import { AMEACA, furiaDaHorda, nivelAmeaca, alvoNaturais, intervaloAparecer, tamanhoGrupo, tamanhoHorda, multPresente, multPredio, pesosTipos } from '../public/js/core/ameaca.js';
import { statsZumbi, ESCALA_AMEACA } from '../public/js/core/dano.js';
import { ZUMBIS } from '../public/js/core/dados.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };

teste('começa no nível 1', () => assert.equal(nivelAmeaca(0, 0, 1), 1));
teste('sobe com tempo, quarteirões e nível do herói', () => {
  assert.ok(nivelAmeaca(3, 0, 1) > 1);
  assert.ok(nivelAmeaca(0, 12, 1) > 1);
  assert.ok(nivelAmeaca(0, 0, 9) > 1);
  assert.ok(nivelAmeaca(2, 6, 5) >= nivelAmeaca(2, 6, 1));
});
teste('nunca passa do máximo', () => assert.equal(nivelAmeaca(1e6, 1e6, 999), AMEACA.maximo));
teste('quanto maior a ameaça, mais zumbis e mais rápido', () => {
  for (let n = 1; n < 20; n++) {
    assert.ok(alvoNaturais(n + 1) > alvoNaturais(n));
    assert.ok(intervaloAparecer(n + 1) <= intervaloAparecer(n));
    assert.ok(tamanhoGrupo(n + 1) >= tamanhoGrupo(n));
    assert.ok(tamanhoHorda(n + 1) >= tamanhoHorda(n));
    assert.ok(multPresente(n + 1) > multPresente(n));
    assert.ok(multPredio(n + 1) > multPredio(n));
  }
  assert.ok(intervaloAparecer(30) >= AMEACA.intervaloMin);
  assert.ok(tamanhoHorda(30) <= AMEACA.hordaMax);
});
teste('zumbis ficam mais resistentes a cada nível', () => {
  for (const tipo of Object.keys(ZUMBIS)) for (let n = 1; n < 20; n++) {
    const a = statsZumbi(ZUMBIS[tipo], n), b = statsZumbi(ZUMBIS[tipo], n + 1);
    assert.ok(b.vida > a.vida && b.dano >= a.dano && (a.dano === 0 || b.dano > a.dano) && b.resistencia >= a.resistencia && b.vel >= a.vel);
    assert.ok(b.resistencia <= ESCALA_AMEACA.resistenciaMax);
  }
});
teste('corredor só a partir do nível 2, explosivo a partir do 3', () => {
  const peso = (n, t) => pesosTipos(n).find(x => x[0] === t)[1];
  assert.equal(peso(1, 'corredor'), 0); assert.ok(peso(2, 'corredor') > 0);
  assert.equal(peso(2, 'explosivo'), 0); assert.ok(peso(3, 'explosivo') > 0);
});
teste('trava contra herói imortal: dano dos zumbis cresce sem parar depois de alguns minutos', () => {
  assert.equal(furiaDaHorda(0), 1);
  assert.equal(furiaDaHorda(AMEACA.furiaDepoisDe), 1);
  assert.ok(furiaDaHorda(AMEACA.furiaDepoisDe + 5) > furiaDaHorda(AMEACA.furiaDepoisDe + 1));
  assert.ok(furiaDaHorda(60) > 10);
});
console.log(`\n${ok} testes passaram.`);
