// Quem entra na live vira um zumbi com o nome dela.   Rodar:  node teste/entrada.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;
const jogo = () => { const j = new Jogo({ seed: 5, classe: 'policial' }); j.hero.invT = 1e9; j.zumbis = []; j.spawnT = 1e9; return j; };
const comNome = (j, n) => j.zumbis.filter(z => z.nome === n);

teste('entrou na live: surge um zumbi com o nome dela', () => {
  const j = jogo();
  j.handle({ type: 'entrou', id: 'a1', nick: 'ana.lu' });
  for (let i = 0; i < 1 / DT; i++) j.update(DT);
  assert.equal(comNome(j, 'ana.lu').length, 1);
  const z = comNome(j, 'ana.lu')[0];
  assert.ok(!z.dono && z.entrou, 'zumbi comum de quem entrou (nome branco)');
  // sem bônus: só a escala da ameaça, mesmo com fúria e cabo de guerra a favor de quem atrapalha
  j.definirRanking({ ajuda: [], atrapalha: [{ nick: 'x', coins: 999 }] }); j.ultimaAjudaT = -1e9;
  j.handle({ type: 'entrou', id: 'a2', nick: 'bia' });
  for (let i = 0; i < 3 / DT; i++) j.update(DT);
  const b = comNome(j, 'bia')[0], forte = j.criarZumbi('comum', j.hero.x + 20, j.hero.y, null, {});
  assert.ok(b.vidaMax <= forte.vidaMax && b.dano <= forte.dano, `bia ${b.vidaMax}/${b.dano} x normal ${forte.vidaMax}/${forte.dano}`);
});

teste('uma vez por pessoa; um a cada 2 s; fila de no máximo 20', () => {
  const j = jogo();
  j.handle({ type: 'entrou', id: 'b', nick: 'beto' }); j.handle({ type: 'entrou', id: 'b', nick: 'beto' });
  for (let k = 0; k < 40; k++) j.handle({ type: 'entrou', id: 'p' + k, nick: 'pessoa' + k });
  assert.equal(j.filaEntradas.length, Jogo.ENTRADA.fila);
  for (let i = 0; i < 5 / DT; i++) j.update(DT);
  assert.equal(comNome(j, 'beto').length, 1, 'beto só uma vez');
  const n = j.zumbis.filter(z => z.nome && /^pessoa|^beto/.test(z.nome)).length;
  assert.ok(n >= 3 && n <= 4, `em 5 s: ${n}`);
});

teste('dentro de loja ou com o herói caído, a fila espera', () => {
  const j = jogo(); j.caido = { t: 99 };
  j.handle({ type: 'entrou', id: 'c', nick: 'carla' });
  j.zumbisDeQuemEntrou(3);
  assert.equal(comNome(j, 'carla').length, 0);
  j.caido = null; j.zumbisDeQuemEntrou(0.1);
  assert.equal(comNome(j, 'carla').length, 1);
});

console.log(`\n${ok} testes passaram.`);
