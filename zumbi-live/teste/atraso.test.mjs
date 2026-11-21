// Testes do atraso da live: votos atrasados, herói caído e presentes inteligentes.
// Rodar:  node teste/atraso.test.mjs
import assert from 'node:assert/strict';
import { Votacao } from '../public/js/core/votacao.js';
import { Jogo } from '../public/js/core/jogo.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;
const passar = (j, seg) => { for (let i = 0; i < Math.round(seg / DT); i++) j.update(DT); };
const presente = (j, efeito, nick = 'Ana', extra = {}) => j.handle({ type: 'presente', regra: { efeito, ...extra }, count: 1, id: 'id_' + nick, nick, coins: 1 });
// Jogo sem zumbis por perto e sem proteção, pra testar só o que importa
const jogo = (classe = 'policial', cfg = {}) => {
  const j = new Jogo({ seed: 7, classe });
  j.configurar(cfg);
  j.zumbis = []; j.spawnT = 999; j.hordaT = 999; j.protecao = 0;
  return j;
};
const eventos = j => j.drainEvents().map(e => e.type);

teste('votação: contagem na tela acaba antes, mas os votos atrasados ainda valem', () => {
  const v = new Votacao([{ id: 'frente' }, { id: 'direita' }], 10, 6);
  v.update(10);
  assert.equal(v.restanteNaTela, 0);
  assert.ok(v.aberta && v.contandoAtrasados);
  assert.ok(v.votar('a', 'direita'), 'voto que chegou depois do 0 na tela conta');
  v.update(5.9);
  assert.ok(v.contandoAtrasados);
  v.update(0.2);
  assert.ok(v.t <= 0 && !v.contandoAtrasados);
  assert.equal(v.fechar(() => 'frente', { next: () => 0 }).id, 'direita');
});

teste('votação sem atraso funciona como antes', () => {
  const v = new Votacao([{ id: 'frente' }], 10, 0);
  assert.equal(v.restanteNaTela, 10);
  v.update(9);
  assert.ok(!v.contandoAtrasados);
});

teste('o jogo abre a votação com o atraso do config', () => {
  const j = jogo('policial', { segundos_de_votacao: 8, atraso_da_live_segundos: 5 });
  passar(j, 2);
  assert.ok(j.voto, 'votação abriu');
  assert.equal(j.voto.duracao, 8);
  assert.equal(j.voto.atraso, 5);
});

teste('vida zerou: herói fica CAÍDO (não morre na hora) e zumbi não machuca', () => {
  const j = jogo();
  j.ferirHeroi(9999, { nick: 'Zé' }, 'teste');
  assert.ok(j.caido, 'caído');
  assert.equal(j.fase, 'jogo');
  assert.ok(eventos(j).includes('caiu'));
  assert.equal(j.ferirHeroi(50, null, 'teste'), false);
  passar(j, 5);
  assert.equal(j.fase, 'jogo');
});

teste('caído sem presente: morre depois do tempo de caído', () => {
  const j = jogo('policial', { segundos_caido: 4 });
  j.ferirHeroi(9999, null, 'teste');
  passar(j, 3.5);
  assert.equal(j.fase, 'jogo');
  passar(j, 1);
  assert.equal(j.fase, 'morto');
});

teste('segundos_caido 0: morre na hora (como antes)', () => {
  const j = jogo('policial', { segundos_caido: 0 });
  j.ferirHeroi(9999, null, 'teste');
  assert.equal(j.fase, 'morto');
});

teste('caído + presente de ajuda: levanta com vida, invencível e o presente vale', () => {
  const j = jogo();
  j.zumbis = [];
  j.criarZumbi('comum', j.hero.x + 1, j.hero.y);
  j.ferirHeroi(9999, null, 'teste');
  presente(j, 'cura', 'Ana', { valor: 10 });
  assert.equal(j.caido, null);
  assert.ok(j.hero.vida >= j.hero.vidaMax * 0.5, `vida ${j.hero.vida}`);
  assert.ok(j.hero.invT >= 3);
  assert.ok(j.zumbis[0].estados.tem('atordoado'), 'zumbi perto ficou tonto');
  assert.ok(eventos(j).includes('levantou'));
  // a segunda vez volta com menos vida
  j.hero.invT = 0;
  j.ferirHeroi(9999, null, 'teste');
  presente(j, 'colete', 'Ana', { golpes: 3 });
  assert.ok(Math.abs(j.hero.vida - j.hero.vidaMax * 0.4) < 1);
});

teste('caído + presente de atrapalhar: golpe final em 2,5 s e quem mandou leva o crédito', () => {
  const j = jogo();
  j.ferirHeroi(9999, { nick: 'Zé' }, 'teste');
  presente(j, 'zumbis', 'Troll', { qtd: 3 });
  assert.ok(j.caido.t <= 2.5);
  passar(j, 2.6);
  assert.equal(j.fase, 'morto');
  assert.equal(j.relatorio.matador.nick, 'Troll');
});

teste('golpe final ainda pode ser salvo por presente de ajuda', () => {
  const j = jogo();
  j.ferirHeroi(9999, null, 'teste');
  presente(j, 'zumbis', 'Troll', { qtd: 3 });
  passar(j, 1);
  presente(j, 'cura', 'Ana', { valor: 10 });
  passar(j, 3);
  assert.equal(j.fase, 'jogo');
  assert.ok(j.hero.vida > 0);
});

teste('compartilhar e curtidas não levantam (só presente ou seguir)', () => {
  const j = jogo();
  j.ferirHeroi(9999, null, 'teste');
  j.handle({ type: 'compartilhou', id: 'x', nick: 'X' });
  j.handle({ type: 'curtidas', qtd: 5000 });
  assert.ok(j.caido);
  j.handle({ type: 'seguiu', id: 'y', nick: 'Y' });
  assert.equal(j.caido, null);
});

teste('o que estava agendado espera o herói levantar', () => {
  const j = jogo();
  let rodou = false;
  j.agendar(0.5, () => { rodou = true; });
  j.ferirHeroi(9999, null, 'teste');
  passar(j, 2);
  assert.ok(!rodou);
  presente(j, 'cura', 'Ana');
  passar(j, 0.6);
  assert.ok(rodou);
});

teste('cura com vida cheia vira blindado', () => {
  const j = jogo();
  presente(j, 'cura', 'Ana', { valor: 20 });
  assert.ok(j.hero.estados.tem('blindado'));
  assert.ok(j.drainEvents().some(e => e.type === 'adaptado'));
});

teste('cura com pouca vida cura normal (sem blindado)', () => {
  const j = jogo();
  j.hero.vida = j.hero.vidaMax * 0.3;
  presente(j, 'cura', 'Ana', { valor: 10 });
  assert.ok(j.hero.vida > j.hero.vidaMax * 0.3);
  assert.ok(!j.hero.estados.tem('blindado'));
});

teste('kit com vida alta vai pra mochila e é usado sozinho quando a vida cai', () => {
  const j = jogo();
  presente(j, 'kit', 'Ana', { valor: 25 });
  assert.equal(j.hero.mochila.length, 1);
  j.hero.vida = j.hero.vidaMax * 0.3;
  passar(j, 0.1);
  assert.equal(j.hero.mochila.length, 0);
  assert.ok(j.hero.vida > j.hero.vidaMax * 0.45);
});

teste('kit com vida baixa cura na hora (não precisa ir buscar)', () => {
  const j = jogo();
  j.hero.vida = j.hero.vidaMax * 0.4;
  presente(j, 'kit', 'Ana', { valor: 25 });
  assert.equal(j.hero.mochila.length, 0);
  assert.equal(j.itens.length, 0);
  assert.ok(j.hero.vida > j.hero.vidaMax * 0.55);
});

teste('kit na mochila segura o herói quando a vida zera (nem chega a cair)', () => {
  const j = jogo();
  presente(j, 'kit', 'Ana', { valor: 25 });
  j.ferirHeroi(9999, null, 'teste');
  assert.equal(j.caido, null);
  assert.ok(j.hero.vida > 0);
  assert.equal(j.fase, 'jogo');
});

teste('mochila guarda no máximo 3 kits (o resto cura ou blinda)', () => {
  const j = jogo();
  j.handle({ type: 'presente', regra: { efeito: 'kit', valor: 25 }, count: 5, id: 'a', nick: 'Ana', coins: 1 });
  assert.equal(j.hero.mochila.length, 3);
});

teste('munição pra quem luta de perto vira fúria', () => {
  const j = jogo('enfermeira');
  presente(j, 'municao', 'Ana', { segundos: 10 });
  assert.ok(j.hero.estados.tem('furia'));
});

teste('colete cheio vira blindado', () => {
  const j = jogo();
  j.hero.colete = 12;
  presente(j, 'colete', 'Ana', { golpes: 3 });
  assert.equal(j.hero.colete, 12);
  assert.ok(j.hero.estados.tem('blindado'));
});

teste('todo presente responde na hora em cima do herói com o nome de quem mandou', () => {
  const j = jogo();
  presente(j, 'horda', 'Troll', { qtd: 8 });
  const e = j.drainEvents().find(e => e.type === 'presente_heroi');
  assert.ok(e && e.nick === 'Troll' && e.lado === 'atrapalha');
});

teste('herói anda no ritmo da votação: chega no cruzamento perto de quando ela fecha', () => {
  const j = jogo('policial', { segundos_de_votacao: 10, atraso_da_live_segundos: 6 });
  j.hero.invT = 999;
  let esperando = 0, total = 0;
  for (let i = 0; i < 90 * 30; i++) {
    j.zumbis = []; j.spawnT = 999; j.hordaT = 999;
    j.update(DT);
    if (j.room || j.arena || j.indoPorta || j.indoPraca || j.rota.beco) continue;
    total += DT;
    const a = j.city.nodePos(j.rota.alvo.i, j.rota.alvo.j);
    if (j.voto?.aberta && Math.hypot(j.hero.x - a.x, j.hero.y - a.y) < 1.4) esperando += DT;
  }
  assert.ok(total > 20, `andou pela rua ${total.toFixed(0)}s`);
  assert.ok(esperando / total < 0.2, `ficou parado esperando a votação ${(esperando / total * 100).toFixed(0)}% do tempo`);
});

console.log(`\n${ok} testes passaram.`);
