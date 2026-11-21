// Testes dos status (efeitos positivos e negativos).   Rodar:  node teste/status.test.mjs
import assert from 'node:assert/strict';
import { STATUS, Estados, sincronizarAtributos } from '../public/js/core/status.js';
import { Atributos } from '../public/js/core/dano.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const perto = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);

teste('todo status tem nome, emoji, lado e duração', () => {
  for (const [id, S] of Object.entries(STATUS)) {
    assert.ok(S.nome && S.emoji && (S.lado === 'positivo' || S.lado === 'negativo') && S.duracao > 0, id);
  }
});
teste('aplicar de novo renova o tempo e soma pilhas até o máximo', () => {
  const e = new Estados();
  assert.equal(e.aplicar('sangramento'), true);
  e.update(2);
  assert.equal(e.aplicar('sangramento'), false);
  perto(e.restante('sangramento'), STATUS.sangramento.duracao);
  for (let i = 0; i < 10; i++) e.aplicar('sangramento');
  assert.equal(e.pilhas('sangramento'), STATUS.sangramento.maxPilhas);
});
teste('dano por segundo multiplica pelas pilhas', () => {
  const e = new Estados();
  e.aplicar('sangramento', { pilhas: 3 });
  const r = e.update(1);
  perto(r.danos[0].valor, STATUS.sangramento.porSegundo.dano * 3);
  assert.equal(r.danos[0].tipo, 'sangramento');
});
teste('o último pedaço de tempo não passa da duração', () => {
  const e = new Estados();
  e.aplicar('queimando', { duracao: 0.5 });
  const r = e.update(2);
  perto(r.danos[0].valor, STATUS.queimando.porSegundo.dano * 0.5);
  assert.deepEqual(r.acabaram, ['queimando']);
  assert.equal(e.tem('queimando'), false);
});
teste('acumulaTempo soma o tempo até o máximo', () => {
  const e = new Estados();
  e.aplicar('acelerado', { duracao: 30, acumulaTempo: true, maxDuracao: 40 });
  e.aplicar('acelerado', { duracao: 30, acumulaTempo: true, maxDuracao: 40 });
  assert.equal(e.restante('acelerado'), 40);
});
teste('atordoado para; lento e marcado multiplicam', () => {
  const e = new Estados();
  assert.equal(e.parado(), false);
  e.aplicar('atordoado'); e.aplicar('lento'); e.aplicar('marcado');
  assert.equal(e.parado(), true);
  assert.equal(e.lentidao(), STATUS.lento.lentidao);
  assert.equal(e.danoRecebido(), STATUS.marcado.danoRecebido);
});
teste('cura por segundo (regenerando, instinto)', () => {
  const e = new Estados();
  e.aplicar('regenerando'); e.aplicar('instinto');
  perto(e.update(1).cura, STATUS.regenerando.porSegundo.cura + STATUS.instinto.porSegundo.cura);
});
teste('status com modificadores mexem nos atributos e saem quando acabam', () => {
  const e = new Estados(), a = new Atributos();
  e.aplicar('furia', { duracao: 1 });
  sincronizarAtributos(e, a);
  perto(a.get('dano'), 1.3); perto(a.get('velocidade'), 1.1);
  e.aplicar('instinto');
  sincronizarAtributos(e, a);
  perto(a.get('defesa'), 0.25);
  e.update(1.5);
  sincronizarAtributos(e, a);
  perto(a.get('dano'), 1);
});
teste('limpar só os negativos', () => {
  const e = new Estados();
  e.aplicar('sangramento'); e.aplicar('furia');
  e.limpar('negativo');
  assert.equal(e.tem('sangramento'), false); assert.equal(e.tem('furia'), true);
});
teste('status desconhecido dá erro', () => assert.throws(() => new Estados().aplicar('xyz')));
console.log(`\n${ok} testes passaram.`);
