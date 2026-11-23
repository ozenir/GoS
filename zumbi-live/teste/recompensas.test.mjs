// Recompensas de presente (recompensas.js): drops de paraquedas, inspiração, colosso da doação e runas.
// Rodar:  node teste/recompensas.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { RECOMPENSA, DROPS, CONVERSIVEL, PARAQUEDISTA, ZUMBI_FA } from '../public/js/core/recompensas.js';
import { STATUS } from '../public/js/core/status.js';
import { aplicarCarta, atualizarHabilidades } from '../public/js/core/habilidades.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;
const passar = (j, seg, cada) => { for (let i = 0; i < Math.round(seg / DT); i++) { j.update(DT); cada?.(); } };
const jogo = () => {
  const j = new Jogo({ sobrevivencia: false, seed: 5, classe: 'policial' });
  j.zumbis = []; j.spawnT = 999; j.cotaRua = 0; j.protecao = 0; j.hero.folegoCd = 1e9;
  return j;
};
const presente = (j, moedas, count = 1, efeito = 'cura') => j.handle({ type: 'presente', id: 'a', nick: 'Ana', giftName: 'x', count, coins: moedas, regra: { efeito, valor: 1, qtd: 1 } });
const eventos = j => j.drainEvents();
// pega todos os drops que estão no chão
const pegarDrops = j => { for (const it of j.itens) if (it.kind === 'drop') { it.z = 0; j.pegar(it); it.pego = true; } j.itens = j.itens.filter(i => !i.pego); };

teste('todo bônus de drop existe, dura quarteirões e acumula', () => {
  for (const d of DROPS) { const S = STATUS[d.id]; assert.ok(S && S.maxPilhas >= 5 && S.texto, d.id); }
});

teste('presente de 1 moeda: cai um drop de paraquedas por unidade (até 5), devagar', () => {
  const j = jogo();
  presente(j, 1, 3);
  passar(j, 1.6);
  const drops = j.itens.filter(it => it.kind === 'drop');
  assert.equal(drops.length, 3);
  assert.ok(drops.every(it => it.paraquedas && it.z > 3), 'ainda descendo');
  passar(j, 5);
  assert.ok(j.itens.filter(it => it.kind === 'drop').every(it => it.z === 0) || j.hero.estados.ativos().some(s => s.id.startsWith('d_')), 'pousou (ou já foi pego)');
  const k = jogo(); presente(k, 1, 9); passar(k, 3);
  assert.equal(k.itens.filter(it => it.kind === 'drop').length, RECOMPENSA.dropsPorPresente);
  assert.ok(!eventos(k).some(e => e.type === 'inspiracao'), '1 moeda não é doação');
});

teste('drop: bônus por 5 quarteirões; o mesmo de novo soma pilha (mais forte) e renova o tempo', () => {
  const j = jogo(), h = j.hero;
  const dano0 = h.attr.get('dano');
  j.pegar({ kind: 'drop', data: { buff: 'd_forca' }, quem: null, x: h.x, y: h.y });
  const d1 = h.attr.get('dano');
  j.andouQuarteirao(3);
  j.pegar({ kind: 'drop', data: { buff: 'd_forca' }, quem: null, x: h.x, y: h.y });
  const d2 = h.attr.get('dano');
  assert.ok(d1 > dano0 && d2 > d1, `${dano0} → ${d1} → ${d2}`);
  assert.equal(h.estados.pilhas('d_forca'), 2);
  assert.equal(h.estados.lista.get('d_forca').q, RECOMPENSA.dropQuarteiroes, 'tempo voltou pros 5 quarteirões');
  j.andouQuarteirao(RECOMPENSA.dropQuarteiroes);
  assert.ok(!h.estados.tem('d_forca'));
  assert.ok(Math.abs(h.attr.get('dano') - dano0) < 1e-9, 'acabou e o dano voltou');
});

teste('doação: inspiração (20% do dano, pulsos em volta), um drop e o colosso no próximo quarteirão', () => {
  const j = jogo(), h = j.hero;
  presente(j, 5);
  assert.ok(h.estados.tem('inspirado'));
  const ev = eventos(j).map(e => e.type);
  assert.ok(ev.includes('inspiracao') && ev.includes('colosso_vem'));
  h.invT = 0; h.attr.addMod({ id: 'sem-esquiva', attr: 'esquiva', mult: 0 });
  const v = h.vida; j.ferirHeroi(50, null, 'teste', 'sangramento');
  assert.ok(Math.abs((v - h.vida) - 50 * RECOMPENSA.inspiracao.danoRecebido) < 1e-6, 'toma 20%');
  const z = j.criarZumbi('comum', h.x + 1.5, h.y, null, { nascendo: 0 });
  const vz = z.vida;
  passar(j, 1);
  assert.ok(z.morto || z.vida < vz, 'pulso machucou o zumbi perto');
  passar(j, 0.5);
  assert.ok(j.itens.some(it => it.kind === 'drop'), 'drop');
  assert.ok(!j.zumbis.some(z => z.tipo === 'colosso'), 'colosso ainda não');
  j.andouQuarteirao(1);
  passar(j, 3);
  const c = j.zumbis.find(z => z.tipo === 'colosso');
  assert.ok(c && c.vida >= RECOMPENSA.chefe.vida, 'colosso apareceu com 10 mil de vida');
  // segunda doação com colosso vivo: só inspiração e drop
  presente(j, 5); j.andouQuarteirao(1); passar(j, 3);
  assert.equal(j.zumbis.filter(z => z.tipo === 'colosso' && !z.morto).length, 1, 'um colosso por vez');
});

teste('colosso: cada golpe tira 10% da vida e atravessa armadura; com o herói em 30% cansa, fica lento e frágil', () => {
  const j = jogo(), h = j.hero;
  presente(j, 5); h.estados.remover('inspirado');
  j.andouQuarteirao(1); passar(j, 3);
  const c = j.zumbis.find(z => z.tipo === 'colosso');
  c.nascendo = 0; c.x = h.x + 1; c.y = h.y; c.atkCd = 0;
  h.invT = 0; h.attr.addMod({ id: 'sem-esquiva', attr: 'esquiva', mult: 0 }); h.colete = 0;
  const antes = h.vida;
  j.atualizarZumbis(DT);
  h.colete = 3; h.attr.addMod({ id: 'muita-defesa', attr: 'defesa', soma: 0.5 });
  c.atkCd = 0; j.atualizarZumbis(DT);
  assert.ok(Math.abs((antes - h.vida) - 2 * h.vidaMax * RECOMPENSA.chefe.golpe) < 1e-6, 'dois golpes de 10%, mesmo com colete e defesa');
  assert.equal(h.colete, 3, 'colete não segura');
  assert.ok(!c.doacao.cansado);
  // o golpe que leva o herói a 30% cansa o colosso na hora, mesmo que a mochila cure logo depois
  h.mochila = [{ valor: 35 }];
  h.vida = h.vidaMax * 0.33; c.atkCd = 0;
  j.atualizarZumbis(DT);
  assert.ok(c.doacao.cansado, 'cansou');
  assert.ok(c.estados.tem('cansado') && c.estados.lentidao() < 0.5, 'o colosso fica lento');
  assert.ok(!h.estados.tem('lento') && !h.estados.tem('atordoado'), 'o herói não');
  const v0 = c.vida; j.ferirZumbi(c, 100, null, true);
  assert.equal(v0 - c.vida, 100 * RECOMPENSA.chefe.cansadoDanoRecebido, 'toma 3x');
  j.matarZumbi(c, null);
  assert.ok(j.itens.some(it => it.kind === 'runa'), 'deixou a runa');
  assert.equal(j.colossoPendente, null, 'o próximo já pode vir');
});

teste('colosso cansa sozinho se a luta demorar demais', () => {
  const j = jogo();
  presente(j, 5); j.andouQuarteirao(1); passar(j, 3);
  const c = j.zumbis.find(z => z.tipo === 'colosso');
  c.nascendo = 0; c.doacao.t = RECOMPENSA.chefe.cansaSegundos;
  j.hero.vida = j.hero.vidaMax;
  passar(j, 0.2);
  assert.ok(c.doacao.cansado);
});

teste('runa de dano: a habilidade bate mais forte e cresce com o nível dela', () => {
  const dano = (nivel, runa) => {
    const j = jogo(), h = j.hero; h.invT = 999;
    aplicarCarta(j, { tipo: 'ativa', id: 'raio', nivel });
    if (runa) { h.runas = { raio: { dano: 1 } }; j.aplicarRunas(); }
    const z = j.criarZumbi('gordo', h.x + 2, h.y, null, { nascendo: 0 });
    z.vida = z.vidaMax = 1e9; z.vel = 0;
    h.habT.raio = 0;
    atualizarHabilidades(j, DT);
    return 1e9 - z.vida;
  };
  const s1 = dano(1, false), r1 = dano(1, true), s3 = dano(3, false), r3 = dano(3, true);
  assert.ok(Math.abs(r1 / s1 - (1 + RECOMPENSA.runa.dano)) < 0.01, `nível 1: ${r1 / s1}`);
  assert.ok(Math.abs(r3 / s3 - (1 + RECOMPENSA.runa.dano * 3)) < 0.01, `nível 3: ${r3 / s3}`);
});

teste('runa de resistência: defesa cresce quando a habilidade sobe de nível', () => {
  const j = jogo(), h = j.hero;
  aplicarCarta(j, { tipo: 'ativa', id: 'granada', nivel: 1 });
  const d0 = h.attr.get('defesa');
  h.runas = { granada: { resistencia: 1 } }; j.aplicarRunas();
  const d1 = h.attr.get('defesa');
  aplicarCarta(j, { tipo: 'ativa', id: 'granada', nivel: 3 });
  const d3 = h.attr.get('defesa');
  assert.ok(Math.abs(d1 - d0 - RECOMPENSA.runa.defesa) < 1e-9 && Math.abs(d3 - d0 - RECOMPENSA.runa.defesa * 3) < 1e-9, `${d0} ${d1} ${d3}`);
});

teste('pegar a runa: gruda numa habilidade que o herói tem e avisa', () => {
  const j = jogo(), h = j.hero;
  aplicarCarta(j, { tipo: 'ativa', id: 'granada', nivel: 2 });
  j.pegar({ kind: 'runa', data: {}, quem: null, x: h.x, y: h.y });
  const r = h.runas.granada;
  assert.ok(r && (r.dano === 1 || r.resistencia === 1));
  assert.ok(eventos(j).some(e => e.type === 'runa' && e.hab === 'granada'));
  const k = jogo();
  k.pegar({ kind: 'runa', data: {}, quem: null, x: k.hero.x, y: k.hero.y });
  assert.ok(k.hero.runas.principal, 'sem habilidade: vai pro ataque principal');
});

/* ---------------- atrapalhar com 1 moeda ---------------- */
teste('presente de atrapalhar de 1 moeda: não dá drop; vem o conversível ou o zumbi paraquedista', () => {
  const visto = { conversivel: 0, paraquedista: 0 };
  for (let s = 0; s < 30; s++) {
    const j = new Jogo({ sobrevivencia: false, seed: 100 + s, classe: 'policial' });
    j.zumbis = []; j.spawnT = 999; j.cotaRua = 0; j.protecao = 0;
    presente(j, 1, 1, 'zumbis');
    passar(j, 2);
    for (const e of eventos(j)) if (e.type in visto) visto[e.type]++;
    assert.ok(!j.itens.some(it => it.kind === 'drop'), 'sem drop');
  }
  assert.ok(visto.conversivel > 5 && visto.paraquedista > 5, JSON.stringify(visto));
});

teste('conversível: tira metade da vida ATUAL de quem pegar (herói e zumbis, inclusive chefe) e passa', () => {
  const j = jogo(), h = j.hero;
  h.invT = 0;
  const z = j.criarZumbi('comum', h.x, h.y, null, { nascendo: 0 });
  const chefe = j.criarZumbi('chefao', h.x, h.y, null, { nascendo: 0 });
  z.x = h.x + 0.01; z.y = h.y; chefe.x = h.x - 0.01; chefe.y = h.y;
  const vh = h.vida, vz = z.vida, vc = chefe.vida;
  j.conversivel(null);
  const c = j.carros[0];
  c.desvia = false;
  // anda até passar do herói (sem rodar a IA, pra ninguém sair do lugar)
  for (let i = 0; i < 60 && j.carros.length; i++) j.atualizarCarros(DT);
  assert.ok(Math.abs(h.vida - vh * (1 - CONVERSIVEL.dano)) < 1e-6, `herói ${vh} → ${h.vida}`);
  assert.ok(Math.abs(z.vida - vz * 0.5) < 1e-6 && Math.abs(chefe.vida - vc * 0.5) < 1e-6, 'zumbi e chefe pela metade');
  assert.ok(!z.morto, 'metade nunca mata');
  for (let i = 0; i < 200 && j.carros.length; i++) j.atualizarCarros(DT);
  assert.equal(j.carros.length, 0, 'foi embora');
  const fim = eventos(j).find(e => e.type === 'conversivel_fim');
  assert.ok(fim && fim.heroi && fim.zumbis === 2);
});

teste('conversível: quando o herói percebe, pula pro lado e escapa', () => {
  let escapou = 0;
  for (let s = 0; s < 6; s++) {
    const j = new Jogo({ sobrevivencia: false, seed: 300 + s, classe: 'policial' });
    j.zumbis = []; j.spawnT = 999; j.cotaRua = 0; j.protecao = 0; j.hero.invT = 0;
    j.conversivel(null);
    j.carros[0].desvia = true;
    const v = j.hero.vida;
    passar(j, 4);
    if (j.hero.vida >= v) escapou++;
  }
  assert.ok(escapou >= 4, `escapou ${escapou} de 6`);
});

teste('zumbi paraquedista: cai em cima, agarra a perna (lento até o próximo cruzamento), depois solta e vira zumbi', () => {
  const j = jogo(), h = j.hero;
  const vel0 = h.estados.lentidao();
  j.paraquedista(null);
  assert.equal(j.paraquedistas.length, 1);
  passar(j, PARAQUEDISTA.altura / PARAQUEDISTA.queda + 0.5);
  assert.equal(j.paraquedistas.length, 0);
  assert.ok(h.estados.tem('agarrado') && h.estados.lentidao() < vel0, 'lento');
  j.paraquedista(null); passar(j, PARAQUEDISTA.altura / PARAQUEDISTA.queda + 0.5);
  assert.equal(h.estados.pilhas('agarrado'), 2);
  assert.ok(h.estados.lentidao() < 0.6 * vel0, 'dois pendurados: mais lento');
  j.zumbis = [];
  assert.equal(PARAQUEDISTA.quarteiroes, 1);
  j.andouQuarteirao(1);   // atravessou o primeiro cruzamento
  assert.ok(!h.estados.tem('agarrado'), 'soltou no primeiro cruzamento');
  assert.equal(j.zumbis.filter(z => !z.morto).length, 2, 'viraram zumbis no chão');
  assert.ok(eventos(j).some(e => e.type === 'soltou_perna'));
});

teste('zumbi paraquedista: herói invencível, ele quica e cai do lado', () => {
  const j = jogo(), h = j.hero;
  h.invT = 99;
  j.paraquedista(null); passar(j, PARAQUEDISTA.altura / PARAQUEDISTA.queda + 0.5);
  assert.ok(!h.estados.tem('agarrado'));
  assert.ok(j.zumbis.some(z => !z.morto && z.tipo === 'comum'));
});

/* ---------------- zumbis do fã (presente TikTok) ---------------- */
teste('TikTok: 3 zumbis com nome e foto de quem mandou, mais fortes e mais rápidos', () => {
  const j = jogo();
  j.hero.nivel = 12;   // sem o reforço do começo, pra comparar com o zumbi comum
  j.handle({ type: 'presente', id: 'f', nick: 'gabi.oliveira', avatar: 'https://exemplo.com/foto.jpg', giftName: 'TikTok', count: 1, coins: 1, regra: { efeito: 'zumbis', qtd: 3 } });
  passar(j, 0.5);
  const fas = j.zumbis.filter(z => z.fa);
  assert.equal(fas.length, 3);
  const normal = j.criarZumbi('comum', j.hero.x + 9, j.hero.y);
  for (const z of fas) {
    assert.ok(z.nome.startsWith('gabi.olivei'), z.nome);   // nome cortado em 12 letras na tela
    assert.equal(z.fa.avatar, 'https://exemplo.com/foto.jpg');
    assert.ok(Math.abs(z.vidaMax / normal.vidaMax - ZUMBI_FA.vida) < 1e-9 && z.dano > normal.dano && z.vel > normal.vel * 1.5);
  }
});

teste('zumbi do fã: não morre antes de acertar o herói; acertou, perde o escudo e morre normal', () => {
  const j = jogo(), h = j.hero;
  h.invT = 0; h.attr.addMod({ id: 'sem-esquiva', attr: 'esquiva', mult: 0 });
  const z = j.criarZumbi('comum', h.x + 0.5, h.y, { id: 'f', nick: 'fa' }, { nascendo: 0, fa: true });
  j.ferirZumbi(z, 1e6, null);
  assert.ok(!z.morto && z.fa.escudo > 0, 'escudo segurou');
  z.atkCd = 0;
  const v = h.vida;
  for (let i = 0; i < 30 && z.fa.escudo > 0; i++) j.atualizarZumbis(DT);
  assert.ok(h.vida < v, 'acertou o herói');
  assert.equal(z.fa.escudo, 0);
  j.ferirZumbi(z, 1e6, null);
  assert.ok(z.morto, 'agora morre');
});

teste('zumbi do fã: bater no colete também conta; e o escudo some sozinho com o tempo', () => {
  const j = jogo(), h = j.hero;
  h.invT = 0; h.colete = 2; h.attr.addMod({ id: 'sem-esquiva', attr: 'esquiva', mult: 0 });
  const z = j.criarZumbi('comum', h.x + 0.5, h.y, null, { nascendo: 0, fa: true });
  z.atkCd = 0;
  for (let i = 0; i < 30 && z.fa.escudo > 0; i++) j.atualizarZumbis(DT);
  assert.equal(z.fa.escudo, 0, 'colete conta como acerto');
  const k = jogo();
  const w = k.criarZumbi('comum', k.hero.x + 15, k.hero.y, null, { nascendo: 0, fa: true });
  w.fa.escudo = 0.5;
  for (let i = 0; i < 30; i++) k.atualizarZumbis(DT);
  assert.equal(w.fa.escudo, 0, 'sumiu com o tempo');
});

console.log(`\n${ok} testes passaram.`);
