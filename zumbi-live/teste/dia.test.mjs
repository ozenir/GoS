// Testes do ciclo do dia: manhã → tarde → noite → madrugada, 2:30 cada.   Rodar:  node teste/dia.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const jogo = () => { const j = new Jogo({ seed: 5 }); j.hero.folegoCd = 1e9; return j; };
// só o relógio do dia (sem rodar o jogo todo)
const em = (j, seg) => { j.cicloT = seg; j.atualizarPeriodo(); return j.periodoDoDia(); };

teste('cada período dura 2:30 e o dia inteiro 10 min', () => {
  const j = jogo();
  assert.equal(j.cfg.periodoDia, 150);
  assert.equal(em(j, 0).id, 'manha');
  assert.equal(em(j, 149).id, 'manha');
  assert.equal(em(j, 150).id, 'tarde');
  assert.equal(em(j, 300).id, 'noite');
  assert.equal(em(j, 450).id, 'madrugada');
  assert.equal(em(j, 600).id, 'manha', 'volta pra manhã');
  assert.equal(Math.round(em(j, 160).resta), 140);
});

teste('o relógio anda com o jogo e avisa quando muda o período', () => {
  const j = jogo();
  assert.equal(j.periodoDoDia().id, 'manha');
  j.cicloT = 149.9;
  for (let i = 0; i < 6; i++) { j.hero.invT = 99; j.update(1 / 30); }
  assert.equal(j.periodoDoDia().id, 'tarde');
  assert.ok(j.drainEvents().some(e => e.type === 'periodo' && e.id === 'tarde'));
});

teste('luz: manhã clara, tarde escurece no fim, noite escura, madrugada clareia no fim', () => {
  const j = jogo();
  em(j, 60); assert.equal(j.luzDoDia().noite, 0);
  em(j, 160); assert.ok(j.luzDoDia().noite < 0.05, 'começo da tarde claro');
  em(j, 295); assert.ok(j.luzDoDia().noite > 0.9, 'fim da tarde quase escuro');
  em(j, 375); assert.equal(j.luzDoDia().noite, 1);
  em(j, 460); assert.equal(j.luzDoDia().noite, 1, 'começo da madrugada ainda escuro');
  em(j, 598); assert.ok(j.luzDoDia().noite < 0.05, 'fim da madrugada claro');
});

teste('zumbis de noite: só no período noite (tarde e madrugada escuras são só visuais)', () => {
  const j = jogo();
  em(j, 295); assert.equal(j.ehNoite(), false);
  em(j, 301); assert.equal(j.ehNoite(), true);
  em(j, 460); assert.equal(j.ehNoite(), false);
});

teste('noite extra do Rei Zumbi vale de manhã também', () => {
  const j = jogo();
  em(j, 30);
  j.noite(60);
  j.t += 10; j.noiteT -= 10;
  assert.equal(j.ehNoite(), true);
  assert.equal(j.luzDoDia().noite, 1);
});

teste('periodo_do_dia_segundos no config muda a duração (0 = sempre manhã)', () => {
  const j = jogo();
  j.configurar({ periodo_do_dia_segundos: 60 });
  assert.equal(em(j, 61).id, 'tarde');
  j.configurar({ periodo_do_dia_segundos: 0 });
  assert.equal(em(j, 400).id, 'manha');
  assert.equal(j.luzDoDia().noite, 0);
});

teste('herói novo começa de manhã', () => {
  const j = jogo();
  em(j, 320);
  j.novoHeroi();
  assert.equal(j.periodoDoDia().id, 'manha');
});

console.log(`\n${ok} testes passaram.`);
