// Testes do módulo de dano e atributos.   Rodar:  node teste/dano.test.mjs
import assert from 'node:assert/strict';
import { ATRIBUTOS,
  Atributos, atributosDaClasse, danoDoHeroi, danoNoHeroi, intervaloTiro, intervaloCorpo, alcanceArma,
  velocidadeHeroi, valorCura, statsZumbi, danoExplosao, danoAliado, ESCALA_AMEACA, TORCIDA, aplicarTorcida,
  danoNoZumbi, afinidade, efetividade, chanceDoStatus, multPericia, PERICIA_PADRAO, EFEITO_PERICIA, aplicarPericias
} from '../public/js/core/dano.js';
import { Estados } from '../public/js/core/status.js';
import { CLASSES, ARMAS, CORPO, ZUMBIS } from '../public/js/core/dados.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const perto = (a, b, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} ≠ ${b}`);
const rngFixo = v => ({ next: () => v });
const zumbi = (tipo = 'comum', extra = {}) => ({ tipo, resistencia: 0, estados: new Estados(), ...extra });
const heroi = (classe = 'policial') => { const h = { vida: 0, vidaMax: 0, colete: 0, invT: 0, pericias: {} }; h.attr = atributosDaClasse(CLASSES[classe], h); h.vidaMax = h.attr.get('vidaMax'); h.vida = h.vidaMax; return h; };

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
  assert.equal(a.get('defesa'), ATRIBUTOS.defesa.max);
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
teste('personagens: vida, velocidade e atributos do kit', () => {
  // os números vêm da própria tabela (dados.js), então o teste não quebra quando o equilíbrio muda
  for (const [id, C] of Object.entries(CLASSES)) {
    const h = heroi(id);
    assert.equal(h.attr.get('vidaMax'), C.vida, id);
    perto(h.attr.get('velocidade'), C.vel);
    for (const [k, v] of Object.entries(C.attr || {})) perto(h.attr.get(k), v);
  }
  assert.ok(CLASSES.enfermeira.attr.defesa < 0, 'enfermeira tem armadura baixa');
  assert.ok(CLASSES.bombeiro.attr.defesa > 0 && CLASSES.bombeiro.attr.resFogo > 0, 'bombeira é resistente');
  assert.equal(CLASSES.enfermeira.attr.curaPorAcerto, 1, 'enfermeira cura 1 por ataque');
});
teste('perícias mexem nos atributos: agilidade dá esquiva e velocidade; facas dão cura por golpe', () => {
  const e = heroi('entregador');
  e.pericias = { agilidade: 6 };
  aplicarPericias(e, CLASSES.entregador);
  perto(e.attr.get('esquiva'), CLASSES.entregador.attr.esquiva + 4 * 0.015);
  perto(e.attr.get('velocidade'), 1.22 * (1 + 4 * 0.02));
  const n = heroi('enfermeira');
  n.pericias = { facas: 8, agilidade: 2 };
  aplicarPericias(n, CLASSES.enfermeira);
  perto(n.attr.get('curaPorAcerto'), 1 + 4 * CLASSES.enfermeira.porPericia[0].soma);
});
teste('adrenalina: +25% de dano só abaixo de 25% de vida', () => {
  const h = heroi('mecanico');
  assert.equal(h.attr.get('dano'), 1);
  h.vida = h.vidaMax * 0.2;
  assert.equal(h.attr.get('dano'), 1.25);
});
teste('dano de tiro sem crítico', () => {
  const h = heroi();
  const r = danoDoHeroi(h, ARMAS.pistola, zumbi(), rngFixo(0.99));
  assert.equal(r.dano, ARMAS.pistola.dano); assert.equal(r.critico, false); assert.equal(r.efetividade, null);
});
teste('crítico multiplica pelo dano crítico', () => {
  const r = danoDoHeroi(heroi(), ARMAS.pistola, null, rngFixo(0), { base: 10 });
  assert.equal(r.critico, true); perto(r.dano, 18);
});
teste('dano contínuo (lança-chamas) nunca dá crítico', () => {
  assert.equal(danoDoHeroi(heroi(), ARMAS.lanca, null, rngFixo(0), { base: 10, continuo: true }).critico, false);
});
teste('corpo a corpo usa "dano" e "corpo"; tiro só "dano"', () => {
  const h = heroi();
  h.attr.addMod({ attr: 'dano', mult: 2 }); h.attr.addMod({ attr: 'corpo', mult: 1.5 });
  perto(danoDoHeroi(h, CORPO.taco, null, rngFixo(0.99)).dano, 120);
  perto(danoDoHeroi(h, ARMAS.pistola, null, rngFixo(0.99), { base: 10 }).dano, 20);
});
teste('resistência do zumbi reduz o dano', () => {
  perto(danoDoHeroi(heroi(), ARMAS.pistola, zumbi('comum', { resistencia: 0.3 }), rngFixo(0.99), { base: 100 }).dano, 70);
});
teste('cadência maior = intervalo menor; corpo a corpo ganha metade', () => {
  const h = heroi('mecanico');
  h.attr.addMod({ attr: 'cadencia', mult: 2 });
  perto(intervaloTiro(h, ARMAS.pistola), ARMAS.pistola.cd / 2);
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
  const h = heroi('entregador');   // sem armadura inicial
  h.invT = 1; assert.equal(danoNoHeroi(h, 50).bloqueado, 'invencivel'); h.invT = 0;
  h.colete = 2; assert.equal(danoNoHeroi(h, 50).bloqueado, 'colete');
  assert.equal(danoNoHeroi(h, 50, 'sangramento').bloqueado, null, 'sangramento atravessa o colete'); h.colete = 0;
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
  assert.equal(s.vida, 30); assert.equal(s.dano, 6); assert.equal(s.vel, ZUMBIS.comum.vel); assert.equal(s.resistencia, 0);
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

console.log('Tipos de dano, afinidades, perícias');
teste('gordo resiste a impacto e é fraco contra corte', () => {
  const h = heroi();
  const g = zumbi('gordo');
  const imp = danoDoHeroi(h, CORPO.taco, g, rngFixo(0.99)), cor = danoDoHeroi(h, CORPO.faca, g, rngFixo(0.99));
  assert.equal(imp.efetividade, 'fraco'); assert.equal(cor.efetividade, 'super');
  perto(imp.dano, CORPO.taco.dano * 0.6); perto(cor.dano, CORPO.faca.dano * 1.4);
});
teste('explosivo leva o dobro de fogo', () => {
  perto(danoNoZumbi(zumbi('explosivo'), 10, 'fogo'), 20);
  assert.equal(efetividade(afinidade('explosivo', 'fogo')), 'super');
});
teste('chefe resiste a tiro', () => assert.equal(efetividade(afinidade('chefao', 'perfuracao')), 'fraco'));
teste('sangramento ignora afinidade e resistência', () => {
  assert.equal(danoNoZumbi(zumbi('rei', { resistencia: 0.4 }), 10, 'sangramento'), 10);
});
teste('status do zumbi: marcado leva mais dano; armadura quebrada perde resistência', () => {
  const z = zumbi('comum', { resistencia: 0.3 });
  const antes = danoNoZumbi(z, 100, 'perfuracao');
  z.estados.aplicar('quebrado');
  assert.ok(danoNoZumbi(z, 100, 'perfuracao') > antes);
  z.estados.aplicar('marcado');
  perto(danoNoZumbi(z, 100, 'perfuracao'), 100 * (1 - 0.1) * 1.25);
});
teste('perícia: 2 = normal, mais = mais dano, menos = menos', () => {
  assert.equal(multPericia(PERICIA_PADRAO), 1);
  const h = heroi();
  h.pericias = { armas_fogo: 6 };
  perto(danoDoHeroi(h, ARMAS.pistola, null, rngFixo(0.99)).dano, ARMAS.pistola.dano * (1 + 4 * EFEITO_PERICIA.dano));
  h.pericias = { armas_fogo: 0 };
  assert.ok(danoDoHeroi(h, ARMAS.pistola, null, rngFixo(0.99)).dano < ARMAS.pistola.dano);
});
teste('perícia aumenta cadência e chance de efeito', () => {
  const h = heroi();
  h.pericias = { facas: 8 };
  assert.ok(intervaloCorpo(h, CORPO.faca) < CORPO.faca.cd);
  assert.ok(chanceDoStatus(h, CORPO.faca, 0.45) > 0.45);
  h.pericias = { facas: 2 };
  perto(chanceDoStatus(h, CORPO.faca, 0.45), 0.45);
});
teste('herói: esquiva, resistência a explosão e defesa negativa', () => {
  const h = heroi();
  h.attr.addMod({ attr: 'esquiva', soma: 1 });
  assert.equal(danoNoHeroi(h, 10, 'mordida', rngFixo(0.1)).bloqueado, 'esquiva');
  const h2 = heroi('entregador');   // sem armadura inicial
  h2.attr.addMod({ attr: 'resExplosao', soma: 0.5 });
  perto(danoNoHeroi(h2, 20, 'explosao').dano, 10);
  perto(danoNoHeroi(h2, 20, 'mordida').dano, 20);
  h2.attr.addMod({ attr: 'defesa', soma: -0.2 });
  perto(danoNoHeroi(h2, 20, 'mordida').dano, 24);
});

console.log('Torcida');
teste('cada pessoa dá dano e regeneração, até o limite', () => {
  const h = heroi('policial');
  assert.equal(aplicarTorcida(h, 4), 4);
  perto(h.attr.get('dano'), 1 + 4 * TORCIDA.danoPorPessoa);
  perto(h.attr.get('regen'), 4 * TORCIDA.regenPorPessoa);
  assert.equal(aplicarTorcida(h, 50), TORCIDA.maxPessoas);
  perto(h.attr.get('dano'), 1 + TORCIDA.maxPessoas * TORCIDA.danoPorPessoa);
});
teste('sem ninguém comentando, a torcida some', () => {
  const h = heroi('policial');
  aplicarTorcida(h, 5); aplicarTorcida(h, 0);
  assert.equal(h.attr.get('dano'), 1); assert.equal(h.attr.get('regen'), 0);
});

console.log(`\n${ok} testes passaram.`);
