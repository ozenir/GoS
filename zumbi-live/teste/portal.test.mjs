// Portal dos 500 (core/portal.js).   Rodar:  node teste/portal.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { PORTAL, RELIQUIAS, sortearRodadas, forcaGuardiao, aplicarEfeito, rotulo, poderComPresente, darReliquia, atualizarReliquia } from '../public/js/core/portal.js';
const await_import = { darReliquia, atualizarReliquia };
import { makeRng } from '../public/js/core/util.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;
const jogo = (seed = 3) => { const j = new Jogo({ seed, classe: 'policial' }); j.hero.invT = 1e9; for (let i = 0; i < 30; i++) j.update(DT); return j; };
const ouvir = j => { const ev = []; const e0 = j.emit.bind(j); j.emit = (t, d) => { ev.push({ t, ...d }); return e0(t, d); }; return ev; };
const rodarPortal = (j, votar = null) => { let t = 0; while (j.portal && t < 300) { if (votar && j.portal.voto?.aberta && !j.portal.votou) { votar(j); j.portal.votou = true; } if (j.portal && j.portal.fase !== 'votando' && j.portal.fase !== 'premio') j.portal.votou = false; j.update(DT); t += DT; } return t; };

teste('portais: rótulos e efeitos (+40, ×2, −30, ÷2)', () => {
  assert.equal(rotulo({ tipo: 'soma', v: 40 }), '+40'); assert.equal(rotulo({ tipo: 'mult', v: 2 }), '×2');
  assert.equal(rotulo({ tipo: 'soma', v: -30 }), '−30'); assert.equal(rotulo({ tipo: 'mult', v: 0.5 }), '÷2');
  assert.equal(aplicarEfeito(100, { tipo: 'mult', v: 1.5 }), 150); assert.equal(aplicarEfeito(20, { tipo: 'soma', v: -50 }), 1, 'nunca abaixo de 1');
});

teste('cada rodada tem 3 portais com pelo menos um ruim e um bom; o guardião fica entre o acaso e o melhor caminho', () => {
  for (let s = 1; s < 30; s++) {
    const rng = makeRng(s), rod = sortearRodadas(rng);
    assert.equal(rod.length, PORTAL.rodadas);
    for (const ops of rod) { assert.equal(ops.length, 3); assert.ok(ops.some(o => o.lado === 'ruim') && ops.some(o => o.lado === 'bom')); }
    const g = forcaGuardiao(rod);
    assert.ok(g > PORTAL.poder, `guardião ${g}`);
  }
});

teste('o portal pausa a rua: zumbis e tempo param; 1 2 3 do chat votam no portal', () => {
  const j = jogo();
  const z = j.criarZumbi('comum', j.hero.x + 3, j.hero.y, null, { nascendo: 0 });
  const t0 = j.t, x0 = z.x;
  j.abrirPortal(true);
  for (let i = 0; i < 4 / DT; i++) j.update(DT);
  assert.equal(j.t, t0, 'o tempo da rua não andou'); assert.equal(z.x, x0, 'o zumbi não andou');
  assert.equal(j.portal.fase, 'votando');
  j.handle({ type: 'chat', id: 'a', nick: 'ana', texto: '3' });
  assert.equal(j.portal.voto.opcoes[2].votos, 1);
});

teste('o chat escolhe o portal: o poder muda pelo efeito do escolhido', () => {
  const j = jogo(5), ev = ouvir(j);
  j.abrirPortal(true);
  rodarPortal(j, j => { j.handle({ type: 'chat', id: 'x' + Math.random(), nick: 'x', texto: '1' }); });
  const passou = ev.filter(e => e.t === 'portal_passou');
  assert.equal(passou.length, PORTAL.rodadas);
  assert.ok(passou.every(e => e.k === 0), 'todo mundo votou 1');
  assert.ok(ev.some(e => e.t === 'portal_duelo'));
  assert.ok(ev.some(e => e.t === 'portal_fechou'));
  assert.ok(!j.portal);
});

teste('venceu o guardião: o chat escolhe uma relíquia e o herói leva pra rua; perdeu: volta sem nada', () => {
  let ganhou = 0, perdeu = 0;
  for (let s = 1; s <= 12; s++) {
    const j = jogo(s), ev = ouvir(j);
    j.abrirPortal(true);
    rodarPortal(j);
    const v = ev.find(e => e.t === 'portal_venceu'), r = ev.find(e => e.t === 'portal_reliquia');
    if (v) { ganhou++; assert.ok(r && RELIQUIAS[j.hero.reliquia], 'ganhou a relíquia'); }
    else { perdeu++; assert.ok(!j.hero.reliquia); }
    assert.ok(j.hero.invT >= 2, 'volta com folga');
  }
  assert.ok(ganhou > 0 && perdeu > 0, `ganhou ${ganhou}, perdeu ${perdeu}`);
});

teste('presente no portal: ajuda sobe o poder, atrapalha desce', () => {
  assert.ok(poderComPresente(100, 'ajuda', 5) > 100 && poderComPresente(100, 'atrapalha', 5) < 100);
  assert.ok(poderComPresente(100, 'ajuda', 10000) <= 100 * (1 + PORTAL.presenteMax));
  const j = jogo(); j.abrirPortal(true);
  const antes = j.portal.poder;
  j.handle({ type: 'presente', id: 'p', nick: 'ana', avatar: '', giftName: 'Rosa', count: 1, coins: 5, regra: { efeito: 'cura', valor: 10, emoji: '🌹', nome: 'Rosa' } });
  assert.ok(j.portal.poder > antes);
});

teste(`abre sozinho nos ${PORTAL.abates} zumbis, uma vez por herói`, () => {
  const j = jogo(7);
  j.zumbis = []; j.spawnT = 1e9; j.cotaRua = 0;   // ninguém morre sem querer no meio do teste
  j.stats.abates = PORTAL.abates - 1;
  for (let i = 0; i < 60; i++) { j.update(DT); if (j.portal) break; }
  assert.ok(!j.portal, 'ainda não');
  j.stats.abates = PORTAL.abates;
  // abre no primeiro momento calmo (sem votação de rua aberta, sem limpar área, sem escolha de habilidade)
  for (let i = 0; i < 120 / DT && !j.portal; i++) j.update(DT);
  assert.ok(j.portal, 'abriu');
  assert.ok(!j.voto?.aberta && !j.limpando && !j.escolha, 'num momento calmo');
  rodarPortal(j);
  for (let i = 0; i < 120 / DT && !j.portal; i++) j.update(DT);
  assert.ok(!j.portal, 'não abre de novo pro mesmo herói');
});

teste('relíquias: Martelo do Trovão derruba os mais fortes, Pena da Fênix salva da queda, Vendaval acelera', () => {
  const j = jogo(9), h = j.hero; j.zumbis = []; j.spawnT = 999;
  const zs = Array.from({ length: 8 }, (_, i) => j.criarZumbi('comum', h.x + 2 + i * 0.3, h.y + 1, null, { nascendo: 0 }));
  j.portal = null;
  const { darReliquia, atualizarReliquia } = await_import;
  darReliquia(j, 'trovao'); h.reliquiaT = 0;
  atualizarReliquia(j, DT);
  assert.ok(zs.filter(z => z.morto || z.vida < z.vidaMax).length >= 6);
  const k = jogo(10); darReliquia(k, 'fenix'); k.hero.reliquiaT = 0; k.hero.invT = 0; k.protecao = 0;
  k.hero.nivel = 12; k.hero.folegoCd = 99; k.hero.vida = 1; k.ferirHeroi(500, null, 'teste', 'impacto');
  assert.ok(!k.caido && k.hero.vida > k.hero.vidaMax * 0.5, 'renasceu');
  const v = jogo(11), vel0 = v.hero.attr.get('velocidade'); darReliquia(v, 'vendaval');
  assert.ok(v.hero.attr.get('velocidade') > vel0 * 1.3);
});

teste('no portal não tem roleta de habilidade: a escolha aberta espera e as letras não votam', () => {
  const j = jogo(12);
  j.ganharXp(40);
  for (let i = 0; i < 3 / DT && !j.escolha; i++) j.update(DT);
  assert.ok(j.escolha, 'roleta aberta');
  const t0 = j.escolha.voto.t;
  j.abrirPortal(true);
  for (let i = 0; i < 5 / DT; i++) j.update(DT);
  j.handle({ type: 'chat', id: 'z', nick: 'z', texto: 'a' });
  assert.equal(j.escolha.voto.t, t0, 'o tempo da roleta parou');
  assert.equal(j.escolha.voto.total, 0, 'letra no portal não vota');
});

console.log(`\n${ok} testes passaram.`);
