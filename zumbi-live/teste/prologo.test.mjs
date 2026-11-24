// Testes da história no começo da partida (core/prologo.js): a escolha do herói pelo chat, a introdução,
// a votação do caminho do entregador, a moto e a queda. Rodar:  node teste/prologo.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { PROLOGO, lerNumero } from '../public/js/core/prologo.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;
const chat = (j, texto, n, pre = 'u') => { for (let k = 0; k < n; k++) j.handle({ type: 'chat', id: pre + texto + k, nick: pre + k, texto }); };
const ate = (j, cond, max = 400) => { let t = 0; while (!cond() && t < max) { j.update(DT); t += DT; } return t; };
const novo = (seed = 1) => new Jogo({ seed, historia: 1 });

teste('lê o número do chat: "4", "44", "4️⃣", "#4", "número 4"; ignora o resto', () => {
  for (const t of ['4', '44', '4️⃣', '#4', 'número 4', 'vai 4']) assert.equal(lerNumero(t, 6), 4, t);
  for (const t of ['7', 'quatro mil', 'oi', '', '0']) assert.equal(lerNumero(t, 6), null, t);
  assert.equal(lerNumero('3', 2), null, 'na votação do caminho só vale 1 ou 2');
});

teste('sem a história ligada (testes antigos), nada muda: o jogo começa direto', () => {
  const j = new Jogo({ seed: 1 });
  assert.equal(j.fase, 'jogo'); assert.equal(j.prologo, null);
});

teste('com a história: abre a escolha, a rua fica parada e o chat vota pelo número', () => {
  const j = novo();
  assert.equal(j.fase, 'prologo'); assert.equal(j.prologo.etapa, 'escolha');
  const ids = j.prologo.voto.opcoes.map(o => o.id);
  assert.deepEqual(ids, ['enfermeira', 'policial', 'bombeiro', 'entregador', 'mecanico'], 'o Valadares fica trancado');
  const h0 = { x: j.hero.x, y: j.hero.y }, t0 = j.t;
  chat(j, '2', 3); chat(j, '5', 1);
  j.update(1);
  assert.equal(j.t, t0, 'o tempo da rua não corre');
  assert.deepEqual({ x: j.hero.x, y: j.hero.y }, h0);
  assert.equal(j.prologo.voto.opcoes.find(o => o.id === 'policial').votos, 3);
  chat(j, '2', 1, 'u');   // quem já votou não vota de novo
  assert.equal(j.prologo.voto.opcoes.find(o => o.id === 'policial').votos, 3);
});

teste('o mais votado vira o herói; quem não tem filme ganha o cartão e a partida começa', () => {
  const j = novo(2);
  chat(j, '2', 4);
  ate(j, () => j.prologo?.etapa === 'filme');
  assert.equal(j.hero.classe, 'policial');
  assert.equal(j.prologo.cap, 'cartao');
  const n = j.hero.n;
  ate(j, () => !j.prologo);
  assert.equal(j.fase, 'jogo');
  assert.equal(j.hero.n, n, 'o número do sobrevivente não pula');
});

teste('ninguém votou: a IA escolhe um herói (diferente do anterior, se der)', () => {
  const j = novo(3);
  ate(j, () => j.prologo?.etapa === 'filme');
  assert.ok(PROLOGO.herois.some(h => h.classe === j.hero.classe));
});

teste('entregador: o filme da abertura e depois a votação do caminho (1 ou 2)', () => {
  const j = novo(4);
  chat(j, '4', 5);
  ate(j, () => j.prologo?.etapa === 'filme');
  assert.equal(j.hero.classe, 'entregador'); assert.equal(j.prologo.cap, 'abertura'); assert.equal(j.prologo.dur, PROLOGO.filmes.entregador.dur);
  ate(j, () => j.prologo?.etapa === 'caminho');
  assert.deepEqual(j.prologo.voto.opcoes.map(o => o.id), ['vo', 'entregas']);
});

teste('caminho 1 (Vó primeiro): sem arma, só as mãos, mais esquiva e mais velocidade', () => {
  const j = novo(5);
  chat(j, '4', 5);
  ate(j, () => j.prologo?.etapa === 'caminho');
  const esq = j.hero.attr.get('esquiva'), vel = j.hero.attr.get('velocidade');
  chat(j, '1', 3, 'v');
  ate(j, () => !j.prologo);
  const h = j.hero;
  assert.equal(h.caminho, 'vo'); assert.equal(h.arma, null); assert.equal(h.corpo, 'empurrao');
  assert.ok(h.attr.get('esquiva') > esq + 0.2); assert.ok(h.attr.get('velocidade') > vel * 1.2);
  assert.equal(h.moto, undefined);
});

teste('caminho 2 (entregas): de moto, atropela zumbi e ganha grana, vota direção (não o mapa)', () => {
  const j = novo(6);
  chat(j, '4', 5);
  ate(j, () => j.prologo?.etapa === 'caminho');
  chat(j, '2', 4, 'e');
  ate(j, () => !j.prologo);
  const h = j.hero, g0 = h.grana;
  assert.ok(h.moto); assert.equal(j.S.mapa, 0);
  const z = j.criarZumbi('comum', h.x + 0.4, h.y, null, { nascendo: 0 });
  j.update(DT);
  assert.ok(z.morto, 'passou por cima');
  assert.ok(h.grana > g0, 'ganhou grana');
  assert.ok(!j.limpando, 'de moto não para pra limpar a área');
});

teste('depois de uns quarteirões de moto, ele cai (o filme "A poça") e segue a pé com o pagamento das entregas', () => {
  const j = novo(7);
  chat(j, '4', 5);
  ate(j, () => j.prologo?.etapa === 'caminho');
  chat(j, '2', 4, 'e');
  ate(j, () => !j.prologo);
  j.hero.invT = 1e9;
  ate(j, () => j.prologo?.etapa === 'acidente', 600);
  assert.equal(j.prologo?.etapa, 'acidente');
  assert.ok(j.stats.quarteiroes >= PROLOGO.moto.quarteiroes);
  const g0 = j.hero.grana;
  ate(j, () => !j.prologo);
  assert.equal(j.fase, 'jogo'); assert.equal(j.hero.moto, null); assert.equal(j.S.mapa, 1);
  assert.equal(j.hero.grana, g0 + PROLOGO.moto.entregaPorQuarteirao * PROLOGO.moto.quarteiroes);
});

teste('de moto ele só atropela: não atira, não bate, não ganha experiência nem pega item, não entra em prédio', () => {
  const j = novo(10);
  chat(j, '4', 5);
  ate(j, () => j.prologo?.etapa === 'caminho');
  chat(j, '2', 4, 'e');
  ate(j, () => !j.prologo);
  const conta = { tiro: 0, golpe: 0, nivel: 0, entrar: 0 };
  const e0 = j.emit.bind(j); j.emit = (t, d) => { if (j.hero.moto) { if (t === 'tiro' && d.heroi) conta.tiro++; if (t === 'golpe') conta.golpe++; if (t === 'nivel') conta.nivel++; if (t === 'votacao_abriu' && j.voto?.opcoes.some(o => o.id === 'entrar')) conta.entrar++; } return e0(t, d); };
  const h = j.hero, xp0 = h.xp, moch0 = h.mochila.length;
  j.soltarItemEm('kit', { valor: 30 }, null, h.x + 0.3, h.y);
  ate(j, () => j.prologo?.etapa === 'acidente' || j.fase === 'morto', 300);
  assert.deepEqual(conta, { tiro: 0, golpe: 0, nivel: 0, entrar: 0 });
  assert.equal(h.xp, xp0); assert.equal(h.mochila.length, moch0, 'o kit ficou no chão');
});

teste('presente de ajuda que chega durante a escolha ou o filme vale quando a partida começa', () => {
  const j = novo(8);
  j.handle({ type: 'presente', id: 'p1', nick: 'ana', avatar: '', giftName: 'Rose', count: 1, coins: 1, regra: { efeito: 'cura', valor: 20, emoji: '🌹', moedas: 1 } });
  assert.ok(j.pendentesAjuda.length >= 1);
  chat(j, '1', 3);
  ate(j, () => !j.prologo);
  assert.equal(j.pendentesAjuda.length, 0, 'foi pra fila de agendados da partida');
});

teste('quando o herói morre, a próxima partida abre a escolha de novo', () => {
  const j = novo(9);
  chat(j, '3', 3);
  ate(j, () => !j.prologo);
  j.morrer();
  ate(j, () => j.fase !== 'morto', 120);
  assert.equal(j.prologo?.etapa, 'escolha');
});

console.log(`\n${ok} testes passaram.`);
