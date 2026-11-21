// Testes dos bônus por quarteirões (tiro rápido, fúria, blindado, arma lendária, aliados, helicóptero).
// Rodar:  node teste/bonus.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { EFEITOS } from '../public/js/core/efeitos.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;
const jogo = (classe = 'policial') => {
  const j = new Jogo({ seed: 31, classe });
  j.zumbis = []; j.spawnT = 999; j.hordaT = 999; j.protecao = 0; j.hero.invT = 0;
  return j;
};
const presente = (j, efeito, extra = {}, count = 1) => j.handle({ type: 'presente', regra: { efeito, ...extra }, count, id: 'p', nick: 'Ana', coins: 5 });
// passa o tempo SEM andar quarteirão nenhum (o herói fica parado fora da rota)
const esperar = (j, seg) => { for (let i = 0; i < seg / DT; i++) { j.hero.estados.update(DT); j.hero.attr.update(DT); j.t += DT; } };

teste('tiro rápido do presente dura 3 quarteirões, não segundos', () => {
  const j = jogo();
  presente(j, 'municao', { quarteiroes: 3 });
  const s = j.hero.estados.lista.get('acelerado');
  assert.equal(s.q, 3);
  esperar(j, 120);
  assert.ok(j.hero.estados.tem('acelerado'), 'dois minutos parado: o bônus continua');
  j.andouQuarteirao(2);
  assert.equal(j.hero.estados.lista.get('acelerado').q, 1);
  assert.ok(j.hero.attr.get('cadencia') > 1.5, 'cadência dobrada enquanto dura');
  j.andouQuarteirao(1);
  assert.ok(!j.hero.estados.tem('acelerado'), 'acabou no 3º quarteirão');
  assert.ok(j.hero.attr.get('cadencia') < 1.5, 'cadência voltou ao normal');
});

teste('combo soma quarteirões (até 8)', () => {
  const j = jogo();
  presente(j, 'municao', { quarteiroes: 3 }, 3);
  assert.equal(j.hero.estados.lista.get('acelerado').q, 5);
  presente(j, 'municao', { quarteiroes: 3 }, 5);
  assert.equal(j.hero.estados.lista.get('acelerado').q, 8);
});

teste('config antigo com "segundos" ainda funciona (vira quarteirões)', () => {
  const j = jogo();
  presente(j, 'municao', { segundos: 45 });
  assert.equal(j.hero.estados.lista.get('acelerado').q, 3);
});

teste('munição pra quem luta de perto: fúria pelos mesmos quarteirões', () => {
  const j = jogo('enfermeira');
  presente(j, 'municao', { quarteiroes: 3 });
  assert.equal(j.hero.estados.lista.get('furia').q, 3);
});

teste('blindado do presente adaptado conta quarteirões', () => {
  const j = jogo();
  presente(j, 'cura', { valor: 60 });
  assert.ok(j.hero.estados.lista.get('blindado').q >= 1);
});

teste('arma lendária dura 3 quarteirões e depois volta a arma de sempre', () => {
  const j = jogo();
  j.trocarArma('metralhadora', null);
  assert.equal(j.hero.armaQ, 3);
  j.hero.estados.aplicar('atordoado', { duracao: 999 });   // parado: 1 minuto sem andar quarteirão
  for (let i = 0; i < 30 * 60; i++) j.atualizarHeroi(DT);
  assert.equal(j.hero.arma, 'metralhadora');
  j.andouQuarteirao(3);
  assert.equal(j.hero.arma, 'pistola');
});

teste('cachorro ajudante acompanha 4 quarteirões', () => {
  const j = jogo();
  presente(j, 'cachorro', { quarteiroes: 4 });
  assert.equal(j.aliados.length, 1);
  for (let i = 0; i < 30 * 90; i++) j.atualizarAliados(DT);
  assert.equal(j.aliados.length, 1, 'continua depois de 90 s');
  j.andouQuarteirao(3);
  assert.equal(j.aliados.length, 1);
  j.andouQuarteirao(1);
  assert.equal(j.aliados.length, 0);
});

teste('seguir: sobrevivente ajuda 1 quarteirão', () => {
  const j = jogo();
  j.handle({ type: 'seguiu', id: 's', nick: 'Bia', regra: { efeito: 'aliado', quarteiroes: 1 } });
  assert.equal(j.aliados[0].q, 1);
  j.andouQuarteirao(1);
  assert.equal(j.aliados.length, 0);
});

teste('helicóptero: invencível até o fim do quarteirão', () => {
  const j = jogo();
  j.helicoptero(1, null);
  assert.equal(j.hero.invQ, 1);
  j.hero.estados.aplicar('atordoado', { duracao: 999 });
  for (let i = 0; i < 30 * 60; i++) j.atualizarHeroi(DT);
  assert.equal(j.stats.quarteiroes, 0);
  j.hero.estados.remover('atordoado');
  assert.equal(j.ferirHeroi(50, null, 'teste'), false, 'continua invencível');
  j.andouQuarteirao(1);
  assert.equal(j.hero.invQ, 0);
  assert.equal(j.ferirHeroi(5, null, 'teste'), true);
});

teste('status de combate (sangrando, atordoado) continuam em segundos', () => {
  const j = jogo();
  j.aplicarStatus(j.hero, 'sangramento');
  esperar(j, 10);
  assert.ok(!j.hero.estados.tem('sangramento'));
});

teste('cruzamento, prédio, arena e praia contam quarteirões pros bônus', () => {
  const j = jogo();
  presente(j, 'municao', { quarteiroes: 8 });
  const q0 = j.stats.quarteiroes;
  j.andouQuarteirao(2);
  assert.equal(j.stats.quarteiroes, q0 + 2);
  assert.equal(j.hero.estados.lista.get('acelerado').q, 6);
});

teste('textos dos presentes falam em quarteirões', () => {
  assert.match(EFEITOS.municao.texto({ quarteiroes: 3 }), /3 quarteirões/);
  assert.match(EFEITOS.cachorro.texto({ quarteiroes: 4 }), /4 quarteirões/);
  assert.match(EFEITOS.aliado.texto({ quarteiroes: 1 }), /1 quarteirão/);
});

console.log(`\n${ok} testes passaram.`);
