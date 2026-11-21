// Testes do módulo de dano e atributos.   Rodar:  node teste/dano.test.mjs
import assert from 'node:assert/strict';
import {
  Atributos, atributosDaClasse, danoDoHeroi, danoNoHeroi, intervaloTiro, intervaloCorpo, alcanceArma,
  velocidadeHeroi, valorCura, statsZumbi, danoExplosao, danoAliado, ESCALA_AMEACA
} from '../public/js/core/dano.js';
import { CLASSES, ARMAS, CORPO, ZUMBIS } from '../public/js/core/dados.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const perto = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const rngFixo = v => ({ next: () => v });
const heroi = (classe = 'policial') => { const h = { vida: 0, vidaMax: 0, colete: 0, invT: 0 }; h.attr = atributosDaClasse(CLASSES[classe], h); h.vidaMax = h.attr.get('vidaMax'); h.vida = h.vidaMax; return h; };

console.log('Atributos');
teste('base vem da tabela quando não informado', () => {
  const a = new Atributos({ vidaMax: 120 });
  assert.equal(a.get('vidaMax'), 120);
  assert.equal(a.get('dano'), 1);
  assert.equal(a.get('defesa'), 0);
});
teste('soma entra antes do multiplicador', () => {
  const a = new Atributos({ vidaMax: 100 });
  a.addMod({ attr: 'vidaMax', soma: 20 });
  a.addMod({ attr: 'vidaMax', mult: 1.5 });
  assert.equal(a.get('vidaMax'), 180);
});
teste('vários multiplicadores se multiplicam', () => {
  const a = new Atributos();
  a.addMod({ attr: 'dano', mult: 1.15 }); a.addMod({ attr: 'dano', mult: 1.15 });
  perto(a.get('dano'), 1.15 * 1.15);
});
teste('limites mínimo e máximo', () => {
  const a = new Atributos();
  a.addMod({ attr: 'defesa', soma: 5 });
  assert.equal(a.get('defesa'), 0.75);
  a.addMod({ attr: 'velocidade', mult: 0.01 });
  assert.equal(a.get('velocidade'), 0.2);
});
teste('modificador temporário acaba e avisa', () => {
  const a = new Atributos();
  a.addMod({ id: 'furia', attr: 'dano', mult: 2, segundos: 1 });
  assert.equal(a.get('dano'), 2);
  assert.equal(a.update(0.5).length, 0);
  perto(a.restante('furia'), 0.5);
  const fim = a.update(0.6);
  assert.equal(fim.length, 1); assert.equal(fim[0].id, 'furia');
  assert.equal(a.get('dano'), 1);
  assert.equal(a.tem('furia'), false);
});
teste('mesmo id substitui (não empilha)', () => {
  const a = new Atributos();
  a.addMod({ id: 'x', attr: 'dano', mult: 2 }); a.addMod({ id: 'x', attr: 'dano', mult: 3 });
  assert.equal(a.get('dano'), 3);
});
teste('acumula soma o tempo, até o máximo', () => {
  const a = new Atributos();
  a.addMod({ id: 'tr', attr: 'cadencia', mult: 2, segundos: 30, acumula: true, maxSegundos: 40 });
  a.addMod({ id: 'tr', attr: 'cadencia', mult: 2, segundos: 30, acumula: true, maxSegundos: 40 });
  assert.equal(a.restante('tr'), 40);
  assert.equal(a.get('cadencia'), 2);
});
teste('condição liga e desliga o modificador', () => {
  const ctx = { ligado: false };
  const a = new Atributos({}, ctx);
  a.addMod({ attr: 'dano', mult: 2, cond: c => c.ligado });
  assert.equal(a.get('dano'), 1);
  ctx.ligado = true;
  assert.equal(a.get('dano'), 2);
});
teste('atributo desconhecido dá erro (evita erro de digitação silencioso)', () => {
  assert.throws(() => new Atributos().addMod({ attr: 'danu', mult: 2 }));
});

console.log('Herói');
teste('classes: vida, velocidade, cadência e regeneração', () => {
  assert.equal(heroi('bombeiro').attr.get('vidaMax'), 130);
  perto(heroi('entregador').attr.get('velocidade'), 1.22);
  perto(heroi('policial').attr.get('cadencia'), 1 / 0.75);
  perto(heroi('enfermeira').attr.get('regen'), 0.7);
});
teste('adrenalina: +25% de dano só abaixo de 25% de vida', () => {
  const h = heroi('mecanico');
  assert.equal(h.attr.get('dano'), 1);
  h.vida = h.vidaMax * 0.2;
  assert.equal(h.attr.get('dano'), 1.25);
});
teste('dano de tiro sem crítico', () => {
  const h = heroi();
  const r = danoDoHeroi(h, ARMAS.pistola.dano, 'tiro', { resistencia: 0 }, rngFixo(0.99));
  assert.equal(r.dano, 14); assert.equal(r.critico, false);
});
teste('crítico multiplica pelo dano crítico', () => {
  const h = heroi();
  const r = danoDoHeroi(h, 10, 'tiro', null, rngFixo(0));
  assert.equal(r.critico, true); perto(r.dano, 18);
});
teste('chama nunca dá crítico', () => {
  assert.equal(danoDoHeroi(heroi(), 10, 'chama', null, rngFixo(0)).critico, false);
});
teste('corpo a corpo usa "dano" e "corpo"', () => {
  const h = heroi();
  h.attr.addMod({ attr: 'dano', mult: 2 }); h.attr.addMod({ attr: 'corpo', mult: 1.5 });
  perto(danoDoHeroi(h, CORPO.taco.dano, 'corpo', null, rngFixo(0.99)).dano, 120);
  perto(danoDoHeroi(h, 10, 'tiro', null, rngFixo(0.99)).dano, 20);
});
teste('resistência do zumbi reduz o dano', () => {
  perto(danoDoHeroi(heroi(), 100, 'tiro', { resistencia: 0.3 }, rngFixo(0.99)).dano, 70);
});
teste('cadência maior = intervalo menor; corpo a corpo ganha metade', () => {
  const h = heroi('mecanico');
  h.attr.addMod({ attr: 'cadencia', mult: 2 });
  perto(intervaloTiro(h, ARMAS.pistola), 0.21);
  perto(intervaloCorpo(h, CORPO.taco), 0.55 / 1.5);
});
teste('alcance e velocidade', () => {
  const h = heroi('mecanico');
  h.attr.addMod({ attr: 'alcance', mult: 1.5 });
  perto(alcanceArma(h, ARMAS.pistola), 9.75);
  perto(velocidadeHeroi(h, 1.5, {}), 1.5 * 0.98);
  perto(velocidadeHeroi(h, 1.5, { lutando: true, noVidro: true }), 1.5 * 0.98 * 0.8 * 0.6);
});
teste('dano recebido: invencível, colete, defesa', () => {
  const h = heroi();
  h.invT = 1; assert.equal(danoNoHeroi(h, 50).bloqueado, 'invencivel'); h.invT = 0;
  h.colete = 2; assert.equal(danoNoHeroi(h, 50).bloqueado, 'colete'); h.colete = 0;
  h.attr.addMod({ attr: 'defesa', soma: 0.2 });
  perto(danoNoHeroi(h, 50).dano, 40);
});
teste('cura respeita vida máxima e bônus de cura', () => {
  const h = heroi();
  perto(valorCura(h, 25), 25);
  h.attr.addMod({ attr: 'cura', mult: 2 });
  perto(valorCura(h, 25), 50);
});

console.log('Zumbis, explosões, aliados');
teste('ameaça 1 = números da tabela', () => {
  const s = statsZumbi(ZUMBIS.comum, 1);
  assert.equal(s.vida, 30); assert.equal(s.dano, 6); assert.equal(s.vel, 0.75); assert.equal(s.resistencia, 0);
});
teste('ameaça maior = zumbi mais forte', () => {
  const s = statsZumbi(ZUMBIS.comum, 3);
  perto(s.vida, 30 * (1 + 2 * ESCALA_AMEACA.vida));
  perto(s.dano, 6 * (1 + 2 * ESCALA_AMEACA.dano));
  assert.ok(s.resistencia <= ESCALA_AMEACA.resistenciaMax);
});
teste('multiplicador extra de vida (para chefes especiais)', () => {
  assert.equal(statsZumbi(ZUMBIS.comum, 1, 2).vida, 60);
});
teste('explosão perde metade do dano na borda e zera fora', () => {
  assert.equal(danoExplosao(20, 0, 2), 20);
  perto(danoExplosao(20, 1.999, 2), 10.005, 1e-6);
  assert.equal(danoExplosao(20, 2, 2), 0);
});
teste('aliados ficam mais fortes com a ameaça', () => {
  assert.equal(danoAliado('cachorro', 1), 22);
  assert.ok(danoAliado('cachorro', 3) > 22);
});

console.log(`\n${ok} testes passaram.`);
