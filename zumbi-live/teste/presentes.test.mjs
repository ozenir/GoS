// Presentes baratos: tabela, sorteio do mesmo preço, parcelas e poder forte recarregando.
// Rodar:  node teste/presentes.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { acharRegra, regraAleatoria, planoDoPresente, PARCELA } from '../presentes.js';
import { Jogo } from '../public/js/core/jogo.js';
import { FORTES } from '../public/js/core/recompensas.js';
import { EFEITOS } from '../public/js/core/efeitos.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const config = JSON.parse(fs.readFileSync(new URL('../config.json', import.meta.url), 'utf8'));
const T = config.presentes.por_nome;

teste('só presentes de 1 e 5 moedas na tabela, e todos os poderes do jogo continuam lá', () => {
  for (const r of Object.values(T)) assert.ok(r.moedas === 1 || r.moedas === 5, `${r.nome}: ${r.moedas}`);
  const efeitos = new Set(Object.values(T).map(r => r.efeito + (r.raridade || '')));
  for (const e of ['cura', 'colete', 'municao', 'kit', 'cachorro', 'zumbis', 'vidro', 'alarme', 'explosivo', 'baumedio', 'helicoptero', 'baulendario', 'horda', 'trem', 'chefao', 'rei']) assert.ok(efeitos.has(e), e);
  for (const r of Object.values(T)) assert.ok(EFEITOS[r.efeito], r.efeito);
});

teste('acha o presente pelo nome em inglês, em português ou pelos apelidos (sem ligar pra acento e maiúscula)', () => {
  assert.equal(acharRegra(T, 'Rose').nome, 'Rosa');
  assert.equal(acharRegra(T, 'rosa branca').efeito, 'colete');
  assert.equal(acharRegra(T, 'BOM JOGO').efeito, 'vidro');
  assert.equal(acharRegra(T, 'Reacao exagerada').efeito, 'horda');
  assert.equal(acharRegra(T, 'Mini dino'), null);
});

teste('presente de 1 ou 5 moedas fora da tabela: efeito sorteado do mesmo preço', () => {
  const vistos1 = new Set(), vistos5 = new Set();
  for (let i = 0; i < 200; i++) {
    const [a] = planoDoPresente(T, 'Estilo livre', 1, 1); assert.equal(a.regra.moedas, 1); assert.ok(a.sorteado); vistos1.add(a.regra.nome);
    const [b] = planoDoPresente(T, 'Bola de futebol giratória', 5, 1); assert.equal(b.regra.moedas, 5); vistos5.add(b.regra.nome);
  }
  assert.ok(vistos1.size >= 6 && vistos5.size >= 5, 'sorteia vários diferentes');
  const combo = planoDoPresente(T, 'Estilo livre', 1, 10);
  assert.equal(combo.reduce((a, p) => a + p.count, 0), 10, '10 unidades, 10 efeitos');
  assert.ok(combo.every(p => p.atraso === 0));
});

teste(`presente caro vira parcelas de ${PARCELA.moedas} moedas, uma a cada ${PARCELA.intervalo} s (50 moedas = 10 parcelas)`, () => {
  const p = planoDoPresente(T, 'Rosquinha', 50, 1);
  assert.equal(p.length, 10);
  p.forEach((x, k) => { assert.equal(x.coins, 5); assert.equal(x.atraso, k * 30); assert.equal(x.regra.moedas, 5); assert.equal(x.parcela, `${k + 1}/10`); });
  const q = planoDoPresente(T, 'Chapéu', 99, 1);   // 19 de 5 + 4 que sobram numa parcela de 1 moeda
  assert.equal(q.length, 20); assert.equal(q[19].coins, 4); assert.equal(q[19].regra.moedas, 1);
  assert.equal(planoDoPresente(T, 'Universo', 34999, 1).length, PARCELA.max, 'no máximo 1 hora de parcelas');
  assert.equal(planoDoPresente(T, 'Mini dino', 10, 3).length, 6, '3 x 10 moedas = 6 parcelas');
});

teste('poder forte em presente barato: uma vez a cada tanto tempo; recarregando, vira a versão menor', () => {
  const j = new Jogo({ seed: 3, classe: 'policial' }); j.hero.invT = 1e9;
  const ev = []; const e0 = j.emit.bind(j); j.emit = (t, d) => { ev.push({ t, ...d }); return e0(t, d); };
  const helico = acharRegra(T, 'Bebida de coco');
  const mandar = () => j.handle({ type: 'presente', id: 'p' + Math.random(), nick: 'ana', avatar: '', giftName: 'Coconut Drink', count: 1, coins: 5, regra: helico });
  mandar();
  const a = ev.filter(e => e.t === 'presente').pop();
  assert.ok(!/recarrega/.test(a.texto));
  mandar();
  const b = ev.filter(e => e.t === 'presente').pop();
  assert.ok(/recarrega/.test(b.texto), b.texto);
  j.t += FORTES.helicoptero.segundos + 1;
  mandar();
  assert.ok(!/recarrega/.test(ev.filter(e => e.t === 'presente').pop().texto), 'depois do tempo, vale de novo');
});

console.log(`\n${ok} testes passaram.`);
