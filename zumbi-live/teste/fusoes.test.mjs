// Tabela de supremas (T) e o avião do Ataque aéreo.   Rodar:  node teste/fusoes.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { pedeTabela, tabelaFusoes, poderFusao } from '../public/js/core/fusoes.js';
import { aplicarCarta, SUPREMAS, AVIAO } from '../public/js/core/habilidades.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;
const ouvir = j => { const ev = []; const e0 = j.emit.bind(j); j.emit = (t, d) => { ev.push({ t, em: j.t, ...d }); return e0(t, d); }; return ev; };

teste('o chat pede a tabela com T (ou tabela, fusões, combos, supremas)', () => {
  for (const t of ['t', 'T', 'tt', 'tabela', 'fusão', 'fusoes', 'combos', 'supremas', 'T!', '🧬']) assert.ok(pedeTabela(t), t);
  for (const t of ['tomate', 'g', '3', 'te amo']) assert.ok(!pedeTabela(t), t);
});

teste('receitas do herói (12 gerais + 2 dele) sempre aparecem; o resultado e o poder só depois da suprema ser feita nesta live', () => {
  const j = new Jogo({ seed: 2, classe: 'policial' });
  const ev = ouvir(j);
  let l = tabelaFusoes(j.fusoesDaLive, 'policial');
  assert.equal(l.length, 14);
  assert.equal(l.filter(x => x.unica).length, 2, 'as 2 do policial');
  assert.ok(!l.some(x => x.id === 'cirurgia'), 'a da enfermeira não aparece pro policial');
  assert.ok(l.every(x => x.ativa.emoji && x.passiva.emoji && x.fusao === null), 'tudo "?"');
  j.handle({ type: 'chat', id: 'a', nick: 'ana', texto: 'T' });
  assert.ok(ev.some(e => e.t === 'tabela'));
  const [id, S] = Object.entries(SUPREMAS)[0];
  aplicarCarta(j, { tipo: 'ativa', id: S.ativa, nivel: 5 }); aplicarCarta(j, { tipo: 'passiva', id: S.passiva, nivel: 3 });
  aplicarCarta(j, { tipo: 'suprema', id });
  l = tabelaFusoes(j.fusoesDaLive, 'policial', j.hero.supremas);
  const linha = l.find(x => x.id === id);
  assert.equal(linha.fusao.poder, poderFusao(id)); assert.equal(linha.fusao.emoji, S.emoji);
  assert.ok(linha.feita, 'o herói tem');
  assert.ok(ev.some(e => e.t === 'fusao_descoberta' && e.id === id));
  // herói novo na mesma live: continua descoberta
  j.novoHeroi();
  assert.ok(tabelaFusoes(j.fusoesDaLive, j.hero.classe).find(x => x.id === id).fusao, 'vale pra live toda');
});

teste('Ataque aéreo: o avião passa por cima e as bombas caem na ordem, explodindo quando batem no chão', () => {
  const j = new Jogo({ seed: 4, classe: 'policial' });
  j.zumbis = []; j.spawnT = 999; j.hero.invT = 1e9;
  const h = j.hero;
  for (let a = 0; a < 30; a++) j.criarZumbi('comum', h.x + (a % 6) * 0.9 - 2, h.y + Math.floor(a / 6) * 0.9 - 2, null, { nascendo: 0 });
  const ev = ouvir(j);
  assert.ok(SUPREMAS.bombardeio.usar(j, h, 1));
  const av = ev.find(e => e.t === 'aviao');
  assert.ok(av && av.bombas.length >= 4);
  for (let k = 1; k < av.bombas.length; k++) assert.ok(av.bombas[k].t >= av.bombas[k - 1].t, 'na ordem do voo');
  assert.ok(av.bombas.every(b => b.t >= 0 && b.t <= AVIAO.voo + 0.01), 'soltas enquanto o avião passa');
  for (let i = 0; i < (AVIAO.voo + AVIAO.queda + 0.5) / DT; i++) j.update(DT);
  const caindo = ev.filter(e => e.t === 'bomba_caindo'), exp = ev.filter(e => e.t === 'explosao');
  assert.equal(caindo.length, av.bombas.length);
  assert.ok(exp.length >= av.bombas.length);
  assert.ok(exp[0].em - caindo[0].em >= AVIAO.queda - 0.05, 'explode depois de cair');
});

console.log(`\n${ok} testes passaram.`);
