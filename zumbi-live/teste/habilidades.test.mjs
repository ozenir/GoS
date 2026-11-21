// Testes das habilidades (roguelike) e da escolha do chat ao subir de nível.
// Rodar:  node teste/habilidades.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { ATIVAS, PASSIVAS, SUPREMAS, NIVEL_SUPREMA, MAX_ATIVAS, sortearCartas, aplicarCarta, atualizarHabilidades, escolhaDaIA } from '../public/js/core/habilidades.js';
import { lerEscolha, lerVoto } from '../public/js/core/votacao.js';
import { makeRng } from '../public/js/core/util.js';
import { xpParaNivel } from '../public/js/core/dados.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;
const passar = (j, seg) => { for (let i = 0; i < Math.round(seg / DT); i++) j.update(DT); };
const jogo = (classe = 'policial') => {
  const j = new Jogo({ seed: 11, classe });
  j.zumbis = []; j.spawnT = 999; j.hordaT = 999; j.protecao = 0; j.hero.invT = 999;
  return j;
};
const zumbi = (j, dx, dy, tipo = 'comum') => j.criarZumbi(tipo, j.hero.x + dx, j.hero.y + dy, null, { nascendo: 0 });
const carta = (tipo, id, nivel = 1) => ({ tipo, id, nivel });

teste('3 cartas: aprimorar, nova e passiva, com letras A B C', () => {
  const j = jogo();
  aplicarCarta(j, carta('ativa', 'granada'));
  for (let s = 1; s < 40; s++) {
    const c = sortearCartas(j.hero, makeRng(s));
    assert.equal(c.length, 3);
    assert.deepEqual(c.map(x => x.letra), ['A', 'B', 'C']);
    assert.deepEqual(c.map(x => x.cat), ['aprimorar', 'nova', 'passiva']);
    assert.equal(new Set(c.map(x => x.tipo + x.id)).size, 3, 'sem carta repetida');
  }
});

teste('herói novo (nada pra aprimorar): ainda tem 3 cartas (treino conta como aprimorar)', () => {
  const c = sortearCartas(jogo().hero, makeRng(3));
  assert.equal(c.length, 3);
});

teste(`no máximo ${MAX_ATIVAS} habilidades ativas`, () => {
  const j = jogo();
  for (const id of ['granada', 'raio', 'drone']) aplicarCarta(j, carta('ativa', id));
  for (let s = 1; s < 30; s++) for (const c of sortearCartas(j.hero, makeRng(s))) assert.ok(!(c.tipo === 'ativa' && c.cat === 'nova'));
});

teste('habilidade no nível máximo não aparece pra aprimorar', () => {
  const j = jogo();
  aplicarCarta(j, carta('ativa', 'granada', ATIVAS.granada.max));
  for (let s = 1; s < 30; s++) for (const c of sortearCartas(j.hero, makeRng(s))) assert.ok(!(c.id === 'granada'));
});

teste('passiva: o nível novo substitui o anterior (não acumula duas vezes)', () => {
  const j = jogo();
  const base = j.hero.attr.get('defesa');
  aplicarCarta(j, carta('passiva', 'couro', 1));
  aplicarCarta(j, carta('passiva', 'couro', 2));
  assert.ok(Math.abs(j.hero.attr.get('defesa') - (base + 0.1)) < 1e-9);
});

teste('vitalidade aumenta a vida máxima e cura o que aumentou', () => {
  const j = jogo();
  const antes = j.hero.vidaMax, vida = j.hero.vida;
  aplicarCarta(j, carta('passiva', 'vitalidade', 1));
  assert.ok(j.hero.vidaMax > antes);
  assert.ok(j.hero.vida > vida - 0.01);
});

teste('treino sobe a perícia do ataque principal', () => {
  const j = jogo('enfermeira');
  const antes = j.hero.pericias.facas;
  aplicarCarta(j, { tipo: 'treino', id: 'facas', nivel: 1 });
  assert.equal(j.hero.pericias.facas, antes + 1);
});

teste('escopeta nova fica de vez (recarrega quando acaba a munição)', () => {
  const j = jogo('policial');
  aplicarCarta(j, carta('arma', 'escopeta'));
  assert.equal(j.hero.arma, 'escopeta');
  j.trocarArma(j.armaPadrao(), null);
  assert.equal(j.hero.arma, 'escopeta');
});

teste('cada habilidade ativa machuca zumbi', () => {
  for (const id of Object.keys(ATIVAS)) {
    const j = jogo();
    j.hero.arma = null;   // sem tiro, pra medir só a habilidade
    const zs = [zumbi(j, 1.2, 0), zumbi(j, 1.4, 0.4), zumbi(j, 1.1, -0.4), zumbi(j, 0.6, 0.9)];
    for (const z of zs) { z.vel = 0; z.atkCd = 99; }
    aplicarCarta(j, carta('ativa', id, 3));
    const vida0 = zs.reduce((a, z) => a + z.vida, 0);
    for (let i = 0; i < 4 / DT; i++) { atualizarHabilidades(j, DT); j.t += DT; for (let k = j.agendados.length - 1; k >= 0; k--) { const a = j.agendados[k]; if ((a.t -= DT) <= 0) { j.agendados.splice(k, 1); a.fn(); } } j.atualizarZonas(DT); j.atualizarZumbis(DT); }
    const vida1 = zs.reduce((a, z) => a + Math.max(0, z.vida), 0);
    assert.ok(vida1 < vida0, `${id} não causou dano`);
  }
});

teste('fogo do molotov não queima o herói', () => {
  const j = jogo();
  j.hero.invT = 0;
  j.zonas.push({ tipo: 'fogo', x0: j.hero.x - 1, y0: j.hero.y - 1, x1: j.hero.x + 1, y1: j.hero.y + 1, t: 5, doHeroi: true });
  const v = j.hero.vida;
  j.atualizarZonas(DT);
  for (let i = 0; i < 30; i++) j.ambienteNoHeroi(DT);
  assert.equal(j.hero.vida, v);
  assert.ok(!j.hero.estados.tem('queimando'));
});

teste('chat: só a letra sozinha vota (A, B, C); números continuam sendo direção', () => {
  assert.equal(lerEscolha('a'), 'a');
  assert.equal(lerEscolha('B!'), 'b');
  assert.equal(lerEscolha('C'), 'c');
  assert.equal(lerEscolha('a gente vai'), null);
  assert.equal(lerEscolha('2'), null);
  assert.equal(lerVoto('b'), null, 'letra B não vira voto de direção');
});

teste('subir de nível abre a escolha; voto do chat decide', () => {
  const j = jogo();
  j.configurar({ segundos_escolha_habilidade: 5, atraso_da_live_segundos: 2 });
  j.ganharXp(xpParaNivel(1));
  passar(j, 1);
  assert.ok(j.escolha, 'escolha abriu');
  const b = j.escolha.cartas[1];
  j.handle({ type: 'chat', id: 'x', nick: 'X', texto: 'b' });
  j.handle({ type: 'chat', id: 'y', nick: 'Y', texto: 'B' });
  j.handle({ type: 'chat', id: 'z', nick: 'Z', texto: 'a' });
  passar(j, 4.5);
  assert.ok(j.escolha, 'ainda aberta: contagem 5 + atraso 2');
  passar(j, 2.5);
  assert.equal(j.escolha, null);
  assert.equal(j.escolhaRes.carta.letra, 'B');
  assert.equal(j.escolhaRes.votos, 2);
  const tem = b.tipo === 'ativa' ? j.hero.habs[b.id] : b.tipo === 'passiva' ? j.hero.passivas[b.id] : b.tipo === 'treino' ? j.hero.treino : j.hero.armaFixa || j.hero.corpoFixo;
  assert.ok(tem, 'carta B aplicada');
});

teste('ninguém votou: a IA escolhe', () => {
  const j = jogo();
  j.ganharXp(xpParaNivel(1));
  passar(j, j.cfg.escolhaDur + j.cfg.atraso + 1.5);
  assert.ok(j.escolhaRes && j.escolhaRes.auto);
});

teste('vários níveis de uma vez viram escolhas uma depois da outra', () => {
  const j = jogo();
  j.ganharXp(xpParaNivel(1) + xpParaNivel(2) + xpParaNivel(3));
  assert.equal(j.hero.nivel, 4);
  let feitas = 0;
  for (let i = 0; i < 90 / DT && feitas < 3; i++) { j.update(DT); for (const e of j.drainEvents()) if (e.type === 'habilidade') feitas++; j.zumbis = []; }
  assert.equal(feitas, 3);
});

teste('escolha da IA sempre é uma das cartas', () => {
  const j = jogo();
  for (let s = 1; s < 20; s++) {
    const c = sortearCartas(j.hero, makeRng(s));
    assert.ok(c.some(x => x.letra === escolhaDaIA(j.hero, c, makeRng(s + 100))));
  }
});

teste('toda passiva e ativa tem nome, emoji e descrição em todos os níveis', () => {
  for (const A of Object.values(ATIVAS)) for (let n = 1; n <= A.max; n++) assert.ok(A.nome && A.emoji && A.desc(n));
  for (const P of Object.values(PASSIVAS)) for (let n = 1; n <= P.max; n++) assert.ok(P.nome && P.emoji && P.desc(n) && P.mod(n).attr);
});

/* ---------------- Habilidade suprema do nível 10 ---------------- */
// sobe o herói até o nível n de uma vez (todas as escolhas ficam na fila)
const subirAte = (j, n) => { let x = 0; for (let k = j.hero.nivel; k < n; k++) x += xpParaNivel(k); j.ganharXp(x); };

teste('nível 10: as 3 cartas são as habilidades supremas, e passam na frente da fila', () => {
  const j = jogo();
  j.configurar({ segundos_escolha_habilidade: 3, atraso_da_live_segundos: 0 });
  j.hero.nivel = 7;
  subirAte(j, NIVEL_SUPREMA);   // níveis 8, 9 e 10 de uma vez
  passar(j, 1);
  assert.ok(j.escolha && j.escolha.suprema, 'a primeira escolha já é a suprema');
  assert.equal(j.escolha.nivel, NIVEL_SUPREMA);
  assert.deepEqual(j.escolha.cartas.map(c => c.tipo), ['suprema', 'suprema', 'suprema']);
  assert.deepEqual(j.escolha.cartas.map(c => c.letra), ['A', 'B', 'C']);
  passar(j, 4.5);
  assert.ok(j.hero.suprema, 'herói ganhou a suprema');
  passar(j, 4);
  assert.ok(j.escolha && !j.escolha.suprema && j.escolha.nivel === 8, 'depois volta pras cartas normais dos níveis que faltavam');
});

teste('enquanto o chat escolhe a suprema, o jogo não aperta (sem horda periódica, zumbis como no nível 9)', () => {
  const j = jogo();
  j.hero.nivel = NIVEL_SUPREMA;
  assert.ok(j.esperandoSuprema());
  const antes = j.multInicio();
  aplicarCarta(j, { tipo: 'suprema', id: 'imortal' });
  assert.ok(!j.esperandoSuprema());
  assert.ok(j.multInicio() > antes);
});

teste('ataque aéreo derruba um grupo de zumbis', () => {
  const j = jogo();
  aplicarCarta(j, { tipo: 'suprema', id: 'bombardeio' });
  const zs = [];
  for (let k = 0; k < 6; k++) zs.push(zumbi(j, 2 + (k % 3) * 0.3, 2 + Math.floor(k / 3) * 0.3));
  passar(j, 3);
  assert.ok(zs.filter(z => z.morto).length >= 5, 'quase todo o grupo caiu');
});

teste('aura de fogo machuca quem está perto e deixa lento, e não quem está longe', () => {
  const j = jogo();
  aplicarCarta(j, { tipo: 'suprema', id: 'aura' });
  const perto = zumbi(j, 1.2, 0, 'gordo'), longe = zumbi(j, 6, 0, 'gordo');
  perto.vel = 0; longe.vel = 0;
  const vp = perto.vida, vl = longe.vida;
  for (let i = 0; i < 30; i++) atualizarHabilidades(j, DT);
  assert.ok(perto.vida < vp);
  assert.ok(perto.estados.lista.has('lento'));
  assert.equal(longe.vida, vl);
});

teste('coração de ferro segura o golpe que ia derrubar (uma vez a cada 40 s)', () => {
  const j = jogo();
  aplicarCarta(j, { tipo: 'suprema', id: 'imortal' });
  const h = j.hero;
  h.invT = 0; h.supremaT = 0; h.colete = 0; h.attr.addMod({ id: 'sem-esquiva', attr: 'esquiva', mult: 0 });
  h.vida = 5;
  j.ferirHeroi(500, null, 'teste', 'sangramento');
  assert.ok(!j.caido && h.vida > h.vidaMax * 0.3, 'levantou com vida');
  assert.ok(h.invT > 0, 'fica invencível um pouco');
  h.invT = 0; h.vida = 5;
  j.ferirHeroi(500, null, 'teste', 'sangramento');
  assert.ok(j.caido, 'a segunda vez logo em seguida derruba');
});

teste('toda suprema tem nome, emoji e descrição', () => {
  for (const S of Object.values(SUPREMAS)) assert.ok(S.nome && S.emoji && S.desc());
});

console.log(`\n${ok} testes passaram.`);
