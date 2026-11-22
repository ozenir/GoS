// Testes do nome do herói (quem dá nome ao próximo).   Rodar:  node teste/nome.test.mjs
import { Jogo } from '../public/js/core/jogo.js';
import assert from 'node:assert/strict';
const presente = (j, id, nick, coins, efeito) => j.handle({ type: 'presente', id, nick, giftName: 'x', count: 1, coins, regra: { efeito, valor: 10, qtd: 1 } });
const passar = (j, s) => { for (let i = 0; i < s * 30; i++) j.update(1 / 30); };
// derruba o herói (sem o segundo fôlego do começo)
const derrubar = j => { j.hero.mochila = []; j.hero.folegoCd = 1e9;   // sem curas guardadas segurando ele
  j.hero.invT = 0; j.ferirHeroi(1e6, null, 'teste', 'sangramento'); };   // sangramento: sem esquiva nem colete
// caso 1: quem atrapalhou doou primeiro, mesmo doando menos que o ajudante
let j = new Jogo({ seed: 1 }); passar(j, 2);
presente(j, 't', 'trollzinho', 1, 'zumbis'); passar(j, 1);
presente(j, 'a', 'anjinho', 30, 'cura'); presente(j, 'a', 'anjinho', 30, 'cura');
derrubar(j); passar(j, j.cfg.caidoDur + j.cfg.relNum + j.cfg.relDest + 1);
assert.equal(j.hero.viewer.nick, 'trollzinho'); assert.equal(j.hero.viewer.lado, 'atrapalha');
// caso 2: só ajudante
j.handle({ type: 'presente', id: 'b', nick: 'bia', giftName: 'x', count: 1, coins: 5, regra: { efeito: 'cura', valor: 10 } });
derrubar(j); passar(j, j.cfg.caidoDur + j.cfg.relNum + j.cfg.relDest + 1);
assert.equal(j.hero.viewer.nick, 'bia');
// caso 3: ninguém doou → sem nome
derrubar(j); passar(j, j.cfg.caidoDur + j.cfg.relNum + j.cfg.relDest + 1);
assert.equal(j.hero.viewer, null);
// caso 4: dentro do mesmo lado, vence quem doou mais; entre lados, quem doou primeiro
j = new Jogo({ seed: 2 }); passar(j, 2);
presente(j, 'a1', 'ajuda1', 1, 'cura'); presente(j, 'a2', 'ajuda2', 100, 'cura'); passar(j, 1);
presente(j, 't1', 'troll1', 500, 'zumbis');
derrubar(j); passar(j, j.cfg.caidoDur + j.cfg.relNum + j.cfg.relDest + 1);
assert.equal(j.hero.viewer.nick, 'ajuda2');
console.log('nome do herói: 4 casos ok');
