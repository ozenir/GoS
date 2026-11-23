// Testes das habilidades (estilo Vampire Survivors): cartas do chat, slots, receitas, supremas, núcleo e nível deus.
// Rodar:  node teste/habilidades.test.mjs
import assert from 'node:assert/strict';
import { Jogo, ESCUDO_SEGURA } from '../public/js/core/jogo.js';
import {
  ATIVAS, PASSIVAS, SUPREMAS, DEUSES, FORCA, MAX_ATIVAS, MAX_PASSIVAS, MAX_SUPREMAS, NIVEL_SUPREMA_ATIVA, NIVEL_SUPREMA_PASSIVA,
  sortearCartas, aplicarCarta, atualizarHabilidades, escolhaDaIA, SALVA_DESDE, slotsDoHeroi, vagasOcupadas, vagasPassivas,
  supremasProntas, cartasDeus, deusPendente, multSuprema, receitas, recargasDoHeroi, NIVEL_PRESENTE, SUPREMAS_PRESENTE, cartasPresente
} from '../public/js/core/habilidades.js';
import { FORCA_PASSIVA } from '../public/js/core/hab-base.js';
import { CLASSES, xpParaNivel, NIVEL_MAXIMO } from '../public/js/core/dados.js';
import { EXPLOSAO } from '../public/js/core/ameaca.js';
import { lerEscolha, lerVoto } from '../public/js/core/votacao.js';
import { makeRng } from '../public/js/core/util.js';

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
const CLASSES_IDS = Object.keys(CLASSES);
// só as habilidades e passivas, sem o resto do jogo (zumbis parados, agendados rodando)
const rodar = (j, seg) => {
  for (let i = 0; i < seg / DT; i++) {
    atualizarHabilidades(j, DT); j.t += DT;
    for (let k = j.agendados.length - 1; k >= 0; k--) { const a = j.agendados[k]; if ((a.t -= DT) <= 0) { j.agendados.splice(k, 1); a.fn(); } }
    j.atualizarZonas(DT); j.atualizarZumbis(DT);
  }
};
// monta a receita (habilidade 5 + passiva 3) e faz a suprema
const fazerSuprema = (j, id) => { const S = SUPREMAS[id]; aplicarCarta(j, carta('ativa', S.ativa, NIVEL_SUPREMA_ATIVA)); aplicarCarta(j, carta('passiva', S.passiva, NIVEL_SUPREMA_PASSIVA)); aplicarCarta(j, { tipo: 'suprema', id }); };
const ouvir = j => { const ev = []; const e0 = j.emit.bind(j); j.emit = (t, d) => { ev.push({ t, ...d }); return e0(t, d); }; return ev; };

/* ---------------- O que existe ---------------- */
teste('12 habilidades e 12 passivas gerais + 2 únicas de cada personagem; 22 supremas e 8 poderes deus', () => {
  const gerais = o => Object.values(o).filter(x => !x.classe).length;
  assert.equal(gerais(ATIVAS), 12); assert.equal(gerais(PASSIVAS), 12); assert.equal(gerais(SUPREMAS), 12); assert.equal(gerais(DEUSES), 3);
  for (const c of CLASSES_IDS) {
    const de = o => Object.values(o).filter(x => x.classe === c).length;
    assert.equal(de(ATIVAS), 2, `${c}: 2 habilidades únicas`); assert.equal(de(PASSIVAS), 2, `${c}: 2 passivas únicas`);
    assert.equal(de(SUPREMAS), 2, `${c}: 2 supremas únicas`); assert.equal(de(DEUSES), 1, `${c}: 1 deus único`);
    assert.equal(receitas(c).length, 14);
  }
});

teste('cada habilidade tem a passiva par (e vice-versa), e a suprema delas usa as duas', () => {
  for (const [id, S] of Object.entries(SUPREMAS)) {
    const A = ATIVAS[S.ativa], P = PASSIVAS[S.passiva];
    assert.ok(A && P, id);
    assert.equal(A.par, S.passiva, `${id}: habilidade aponta pra passiva`);
    assert.equal(P.par, S.ativa, `${id}: passiva aponta pra habilidade`);
    assert.equal(A.classe || null, S.classe || null); assert.equal(P.classe || null, S.classe || null);
  }
  assert.equal(Object.keys(SUPREMAS).length, Object.keys(ATIVAS).length, 'uma suprema por habilidade');
});

teste('tem ofensivas, defensivas e de controle (habilidades, passivas, supremas e deus)', () => {
  for (const o of [ATIVAS, PASSIVAS, SUPREMAS, DEUSES]) {
    const cats = new Set(Object.values(o).map(x => x.cat));
    for (const c of ['ofensiva', 'defensiva', 'controle']) assert.ok(cats.has(c), c);
  }
});

teste('toda habilidade, passiva, suprema e deus tem nome, emoji e descrição em todos os níveis', () => {
  for (const A of Object.values(ATIVAS)) for (let n = 1; n <= A.max; n++) assert.ok(A.nome && A.emoji && A.desc(n));
  for (const P of Object.values(PASSIVAS)) for (let n = 1; n <= P.max; n++) assert.ok(P.nome && P.emoji && P.desc(n) && P.mods(n).length);
  for (const S of [...Object.values(SUPREMAS), ...Object.values(DEUSES)]) assert.ok(S.nome && S.emoji && S.desc() && S.poder > 0);
  assert.equal(Object.values(ATIVAS).every(A => A.max === NIVEL_SUPREMA_ATIVA), true);
  assert.equal(Object.values(PASSIVAS).every(P => P.max === NIVEL_SUPREMA_PASSIVA), true);
});

teste('cada nível fortalece muito: habilidade nível 2 triplica o 1 (o 5 é 12,5×); passiva nível 3 = 4× o 1', () => {
  assert.equal(FORCA(2), 3 * FORCA(1)); assert.equal(FORCA(5), 12.5);
  assert.equal(ATIVAS.granada.dano(2), ATIVAS.granada.dano(1) * 3);
  assert.equal(FORCA_PASSIVA(3), 4);
});

/* ---------------- Cartas ---------------- */
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
  assert.equal(sortearCartas(jogo().hero, makeRng(3)).length, 3);
});

teste('as únicas só aparecem pro personagem dono delas', () => {
  for (const c of CLASSES_IDS) {
    const j = jogo(c), vistas = new Set();
    for (let s = 1; s < 300; s++) for (const x of sortearCartas(j.hero, makeRng(s))) vistas.add(x.id);
    for (const [id, A] of Object.entries(ATIVAS)) if (A.classe) assert.equal(vistas.has(id), A.classe === c, `${c} / ${id}`);
    for (const [id, P] of Object.entries(PASSIVAS)) if (P.classe) assert.equal(vistas.has(id), P.classe === c, `${c} / ${id}`);
  }
});

teste('a carta de habilidade e a de passiva mostram com quem combinam (o resultado a live descobre)', () => {
  const j = jogo();
  const c = sortearCartas(j.hero, makeRng(4)).find(x => x.tipo === 'passiva' || x.tipo === 'ativa');
  assert.ok(c.par && c.papel, 'par e papel (ofensiva/defensiva/controle)');
});

teste(`no máximo ${MAX_ATIVAS} habilidades e ${MAX_PASSIVAS} passivas: cheio, só aprimora`, () => {
  const j = jogo();
  const ats = Object.keys(ATIVAS).filter(id => !ATIVAS[id].classe).slice(0, MAX_ATIVAS);
  for (const id of ats) aplicarCarta(j, carta('ativa', id));
  for (const id of ats.map(id => ATIVAS[id].par)) aplicarCarta(j, carta('passiva', id));
  assert.equal(vagasOcupadas(j.hero), MAX_ATIVAS); assert.equal(vagasPassivas(j.hero), MAX_PASSIVAS);
  for (let s = 1; s < 60; s++) for (const c of sortearCartas(j.hero, makeRng(s))) {
    assert.ok(!(c.tipo === 'ativa' && c.cat === 'nova'), 'nenhuma habilidade nova');
    assert.ok(!(c.tipo === 'passiva' && !j.hero.passivas[c.id]), 'nenhuma passiva nova');
  }
});

teste('habilidade no nível máximo não aparece pra aprimorar', () => {
  const j = jogo();
  aplicarCarta(j, carta('ativa', 'granada', ATIVAS.granada.max));
  for (let s = 1; s < 30; s++) for (const c of sortearCartas(j.hero, makeRng(s))) assert.ok(c.id !== 'granada');
});

teste('passivas cheias e uma habilidade sem o par: o par entra no lugar de uma passiva que não combina com nada', () => {
  const j = jogo(), h = j.hero;
  aplicarCarta(j, carta('ativa', 'granada', 2));   // par: Força (não tem)
  for (const id of ['mira', 'vampiro', 'regen', 'maos', 'couro']) aplicarCarta(j, carta('passiva', id, id === 'couro' ? 1 : 2));
  let troca = null;
  for (let s = 1; s < 80 && !troca; s++) troca = sortearCartas(h, makeRng(s)).find(c => c.id === 'forca' && c.troca);
  assert.ok(troca, 'a Força aparece pra trocar');
  assert.equal(troca.troca, 'couro', 'sai a de menor nível');
  const def = h.attr.get('defesa');
  aplicarCarta(j, troca);
  assert.ok(h.passivas.forca && !h.passivas.couro);
  assert.ok(h.attr.get('defesa') < def, 'o bônus da que saiu vai junto');
});

teste('nada pra oferecer (tudo no máximo, sem vaga): kit de cura e fúria', () => {
  const j = jogo(), h = j.hero;
  const ats = Object.keys(ATIVAS).filter(id => !ATIVAS[id].classe).slice(0, 5);
  for (const id of ats) aplicarCarta(j, carta('ativa', id, 5));
  for (const id of ats.map(id => ATIVAS[id].par)) aplicarCarta(j, carta('passiva', id, 3));
  h.treino = 5; h.armaFixa = 'escopeta'; h.corpoFixo = 'taco';
  h.supremas = ['zero', 'coracao', 'bombardeio', 'furacao', 'santuario', 'rugido'];   // núcleo cheio: não dá mais suprema
  h.deus = 'furia';
  const c = sortearCartas(h, makeRng(1));
  assert.equal(c.length, 3);
  assert.ok(c.some(x => x.tipo === 'extra'));
  h.vida = 10;
  aplicarCarta(j, c.find(x => x.id === 'kit') || { tipo: 'extra', id: 'kit' });
  assert.ok(h.vida > 10);
});

teste('passiva: o nível novo substitui o anterior (não acumula duas vezes)', () => {
  const j = jogo();
  const base = j.hero.attr.get('defesa');
  aplicarCarta(j, carta('passiva', 'couro', 1));
  aplicarCarta(j, carta('passiva', 'couro', 2));
  assert.ok(Math.abs(j.hero.attr.get('defesa') - (base + 0.05 * FORCA_PASSIVA(2))) < 1e-9);
});

teste('passivas mexem nos atributos do gráfico e nos novos (área, recarga, experiência, ímã)', () => {
  const j = jogo('mecanico'), h = j.hero;
  const antes = { vida: h.vidaMax, area: h.attr.get('area'), rec: h.attr.get('recarga'), xp: h.attr.get('xpGanho') };
  aplicarCarta(j, carta('passiva', 'vitalidade', 1));
  aplicarCarta(j, carta('passiva', 'engenharia', 3));
  aplicarCarta(j, carta('passiva', 'sabedoria', 2));
  assert.ok(h.vidaMax > antes.vida && h.vida > 0);
  assert.ok(h.attr.get('area') > antes.area && h.attr.get('recarga') < antes.rec && h.attr.get('xpGanho') > antes.xp);
  const x0 = h.xp; j.ganharXp(1); assert.ok(h.xp - x0 > 1.2, 'Estudioso: mais experiência');
});

teste('treino sobe a perícia do ataque principal; escopeta nova fica de vez', () => {
  const e = jogo('enfermeira'); const antes = e.hero.pericias.facas;
  aplicarCarta(e, { tipo: 'treino', id: 'facas', nivel: 1 });
  assert.equal(e.hero.pericias.facas, antes + 1);
  const j = jogo('policial');
  aplicarCarta(j, carta('arma', 'escopeta'));
  j.trocarArma(j.armaPadrao(), null);
  assert.equal(j.hero.arma, 'escopeta');
});

/* ---------------- Habilidades ---------------- */
teste('cada habilidade faz o que promete (dano, congelar, medo, algemas, escudo, adrenalina, turbo...)', () => {
  for (const [id, A] of Object.entries(ATIVAS)) {
    const j = jogo(A.classe || 'policial'), h = j.hero;
    h.arma = null; h.corpo = 'empurrao'; h.corpoCd = 1e9;   // sem ataque normal, pra medir só a habilidade
    const zs = [zumbi(j, 1.2, 0), zumbi(j, 1.4, 0.4), zumbi(j, 1.1, -0.4), zumbi(j, 0.6, 0.9), zumbi(j, -1, 0.5, 'gordo')];
    for (const z of zs) { z.vel = 0; z.atkCd = 99; }
    h.vida = h.vidaMax * 0.5;
    aplicarCarta(j, carta('ativa', id, 3));
    if (id === 'minas' || id === 'pacote') zs[0].vel = 0.8;   // alguém pisa na mina
    if (id === 'brasa') { h.andando = true; zs[0].x = h.x + 0.2; zs[0].y = h.y; }   // a brasa sai andando, no pé do herói
    const vida0 = zs.reduce((a, z) => a + z.vida, 0);
    let viu = { medo: false, atordoado: false, congelado: false };
    for (let i = 0; i < 6 / DT; i++) { rodar(j, DT); for (const z of zs) for (const s of Object.keys(viu)) if (z.estados.tem(s)) viu[s] = true; if (id === 'turbo' && h.estados.tem('turbo')) zs[0].x = h.x + 0.4; }
    const vida1 = zs.reduce((a, z) => a + Math.max(0, z.vida), 0);
    const efeito = { grito: viu.medo, algemas: viu.atordoado, gelo: viu.congelado, escudo: h.escudo > 0, seringa: h.vida > h.vidaMax * 0.5, pulso: h.vida > h.vidaMax * 0.5 }[id];
    assert.ok(efeito ?? vida1 < vida0, `${id} não fez efeito`);
  }
});

teste('fogo do molotov e o rastro de brasa não queimam o herói', () => {
  const j = jogo();
  j.hero.invT = 0;
  j.zonas.push({ tipo: 'fogo', x0: j.hero.x - 1, y0: j.hero.y - 1, x1: j.hero.x + 1, y1: j.hero.y + 1, t: 5, doHeroi: true });
  const v = j.hero.vida;
  j.atualizarZonas(DT);
  for (let i = 0; i < 30; i++) j.ambienteNoHeroi(DT);
  assert.equal(j.hero.vida, v);
  assert.ok(!j.hero.estados.tem('queimando'));
});

teste('escudo de energia: cada carga segura um golpe (até 20% da vida máxima) e, quando quebra, empurra a horda', () => {
  const j = jogo(), h = j.hero;
  h.invT = 0; h.colete = 0; h.attr.addMod({ id: 'sem-esquiva', attr: 'esquiva', mult: 0 });
  aplicarCarta(j, carta('ativa', 'escudo', 3));
  rodar(j, 0.6);
  assert.equal(h.escudo, ATIVAS.escudo.cargas(3));
  const z = zumbi(j, 1.2, 0, 'gordo'); z.vel = 0;
  const v = h.vida, segura = h.vidaMax * ESCUDO_SEGURA;
  j.ferirHeroi(segura * 0.9, null, 'teste');
  assert.equal(h.vida, v, 'golpe menor que o limite: bloqueou inteiro');
  j.ferirHeroi(segura + 10, null, 'teste');
  assert.ok(h.vida < v && h.vida > v - 20, 'golpe maior: o escudo segura o limite e passa só o resto');
  assert.equal(h.escudo, 0);
  assert.ok(z.kx > 0 || z.vida < z.vidaMax, 'a quebra empurrou/feriu');
  j.ferirHeroi(50, null, 'teste');
  assert.ok(h.vida < v, 'sem escudo, toma o golpe');
});

teste('grito de guerra: os zumbis fogem com medo e não atacam', () => {
  const j = jogo(), h = j.hero;
  h.invT = 0;
  const zs = [zumbi(j, 1, 0), zumbi(j, -1, 0.3), zumbi(j, 0.3, 1)];
  aplicarCarta(j, carta('ativa', 'grito', 3));
  const v = h.vida, d0 = zs.map(z => Math.hypot(z.x - h.x, z.y - h.y));
  for (let i = 0; i < 1.2 / DT; i++) { atualizarHabilidades(j, DT); j.atualizarZumbis(DT); }
  const d1 = zs.map(z => Math.hypot(z.x - h.x, z.y - h.y));
  assert.ok(zs.every(z => z.estados.tem('medo')));
  assert.ok(d1.every((d, k) => d > d0[k]), 'se afastaram');
  assert.ok(h.vida >= v, 'ninguém mordeu');
});

teste('controle não prende pra sempre: depois de atordoado/congelado/com medo, o zumbi fica um tempo imune', () => {
  const j = jogo();
  const z = zumbi(j, 2, 0);
  assert.ok(j.aplicarStatus(z, 'atordoado', { duracao: 0.5 }));
  assert.ok(!j.aplicarStatus(z, 'congelado', { duracao: 2 }), 'não empilha controle em cima');
  j.t += 0.6; z.estados.update(0.6);
  assert.ok(!j.aplicarStatus(z, 'atordoado', { duracao: 0.5 }), 'logo depois: imune');
  j.t += 1.3;
  assert.ok(j.aplicarStatus(z, 'medo', { duracao: 1 }), 'passou a imunidade');
});

teste('anel de recarga: zera quando a habilidade é usada e vai enchendo até ficar pronta', () => {
  const j = jogo(), h = j.hero;
  aplicarCarta(j, carta('ativa', 'granada', 2));
  aplicarCarta(j, carta('ativa', 'laminas', 1));
  const zs = [zumbi(j, 2, 0, 'gordo'), zumbi(j, 2.3, 0.3, 'gordo'), zumbi(j, 1.8, -0.3, 'gordo')];
  for (const z of zs) { z.vel = 0; z.atkCd = 99; z.vida = z.vidaMax = 1e6; }
  rodar(j, 0.6);   // a granada sai logo
  const r1 = recargasDoHeroi(h)['hab:granada'];
  assert.ok(r1 < 0.2, `logo depois de usar: ${r1}`);
  rodar(j, 2);
  const r2 = recargasDoHeroi(h)['hab:granada'];
  assert.ok(r2 > r1 && r2 < 1, `enchendo: ${r2}`);
  assert.equal(recargasDoHeroi(h)['hab:laminas'], 1, 'sempre ligada: cheia');
  j.zumbis = [];
  rodar(j, ATIVAS.granada.cd(2) + 1);
  assert.equal(recargasDoHeroi(h)['hab:granada'], 1, 'sem alvo: fica pronta (cheia)');
});

/* ---------------- Supremas ---------------- */
teste('a carta SUPREMA aparece (sempre como A) só com a habilidade no 5 e a passiva par no 3', () => {
  const j = jogo(), h = j.hero;
  aplicarCarta(j, carta('ativa', 'granada', 5));
  aplicarCarta(j, carta('passiva', 'forca', 2));
  assert.deepEqual(supremasProntas(h), []);
  for (let s = 1; s < 20; s++) assert.ok(!sortearCartas(h, makeRng(s)).some(c => c.tipo === 'suprema'));
  aplicarCarta(j, carta('passiva', 'forca', 3));
  assert.deepEqual(supremasProntas(h), ['fragmentacao']);
  for (let s = 1; s < 20; s++) { const c = sortearCartas(h, makeRng(s)); assert.equal(c[0].tipo, 'suprema'); assert.equal(c[0].id, 'fragmentacao'); }
  assert.equal(escolhaDaIA(h, sortearCartas(h, makeRng(2)), makeRng(3)), 'A', 'a IA quase sempre faz a suprema');
});

teste('suprema: a habilidade e a passiva saem dos slots (libera vaga), o bônus da passiva fica', () => {
  const j = jogo(), h = j.hero, ev = ouvir(j);
  const ats = ['granada', 'raio', 'laminas', 'molotov', 'drone'];
  for (const id of ats) aplicarCarta(j, carta('ativa', id, 5));
  for (const id of ats.map(id => ATIVAS[id].par)) aplicarCarta(j, carta('passiva', id, 3));
  const dano = h.attr.get('dano');
  aplicarCarta(j, { tipo: 'suprema', id: 'fragmentacao' });
  assert.ok(!h.habs.granada, 'a granada saiu');
  assert.equal(vagasOcupadas(h), 4); assert.equal(vagasPassivas(h), 4);
  assert.equal(h.attr.get('dano'), dano, 'a Força continua valendo');
  assert.deepEqual(h.supremas, ['fragmentacao']);
  assert.ok(ev.some(e => e.t === 'suprema' && e.total === 1));
  // com vaga, volta a aparecer habilidade nova (mas nunca a que virou suprema)
  let nova = false;
  for (let s = 1; s < 40; s++) for (const c of sortearCartas(h, makeRng(s))) { if (c.tipo === 'ativa' && c.cat === 'nova') nova = true; assert.ok(c.id !== 'granada' && c.id !== 'forca'); }
  assert.ok(nova);
  const S = slotsDoHeroi(h);
  assert.equal(S.supremas.length, 1); assert.equal(S.nucleo.feitas, 1); assert.equal(S.ativas.length, 4);
});

teste('toda suprema e todo poder deus funcionam (machucam, congelam, curam, salvam...)', () => {
  for (const [id, S] of [...Object.entries(SUPREMAS).map(([id, S]) => [id, S, 'suprema']), ...Object.entries(DEUSES).map(([id, S]) => [id, S, 'deus'])].map(([id, S, tipo]) => [id, { ...S, tipo }])) {
    const j = jogo(S.classe || 'policial'), h = j.hero;
    h.arma = null; h.corpo = 'empurrao'; h.corpoCd = 1e9;
    const def0 = h.attr.get('defesa');
    if (S.tipo === 'suprema') fazerSuprema(j, id); else aplicarCarta(j, { tipo: 'deus', id });
    const zs = [];
    for (let k = 0; k < 8; k++) { const z = zumbi(j, 1 + (k % 4) * 0.5, -0.8 + Math.floor(k / 4) * 1.4, 'gordo'); z.vel = 0; z.atkCd = 99; zs.push(z); }
    h.vida = h.vidaMax * 0.5;
    const vida0 = zs.reduce((a, z) => a + z.vida, 0);
    let congelou = false;
    for (let i = 0; i < 6 / DT; i++) { rodar(j, DT); if (zs.some(z => z.estados.tem('congelado'))) congelou = true; }
    const vida1 = zs.reduce((a, z) => a + Math.max(0, z.vida), 0);
    const efeito = vida1 < vida0 || congelou || zs.some(z => z.morto) || h.vida > h.vidaMax * 0.5 || h.escudo > 0 || h.attr.get('defesa') > def0;
    assert.ok(efeito, `${S.tipo} ${id} não fez efeito`);
  }
});

teste('Coração de ferro segura o golpe que ia derrubar (uma vez a cada 40 s)', () => {
  const j = jogo(), h = j.hero;
  fazerSuprema(j, 'coracao');
  h.invT = 0; h.colete = 0; h.escudo = 0; h.supT.coracao = 0; h.attr.addMod({ id: 'sem-esquiva', attr: 'esquiva', mult: 0 });
  h.vida = 5;
  j.ferirHeroi(500, null, 'teste', 'sangramento');
  assert.ok(!j.caido && h.vida > h.vidaMax * 0.3, 'levantou com vida');
  assert.ok(h.invT > 0);
  h.invT = 0; h.vida = 5; h.escudo = 0;
  j.ferirHeroi(500, null, 'teste', 'sangramento');
  assert.ok(j.caido, 'a segunda vez logo em seguida derruba');
});

teste('Lâminas vampíricas, Fogo da fênix e Transfusão curam o herói', () => {
  for (const [id, classe] of [['vampiricas', 'policial'], ['fenix', 'policial'], ['transfusao', 'enfermeira']]) {
    const j = jogo(classe), h = j.hero;
    fazerSuprema(j, id);
    h.attr.addMod({ id: 'sem-regen', attr: 'regen', mult: 0 });
    for (let k = 0; k < 6; k++) { const z = zumbi(j, 1.3 + k * 0.2, 0.4, 'gordo'); z.vel = 0; z.atkCd = 99; if (id !== 'transfusao') z.vida = z.vidaMax = 1e6; }
    h.vida = 10;
    rodar(j, 5);
    assert.ok(h.vida > 25, `${id}: vida ${h.vida.toFixed(1)}`);
  }
});

teste('Transfusão: zumbi morrendo perto cura um pouco (até 4% por segundo)', () => {
  const j = jogo('enfermeira'), h = j.hero;
  fazerSuprema(j, 'transfusao');
  h.vida = h.vidaMax * 0.2;
  const v = h.vida;
  for (let k = 0; k < 20; k++) j.matarZumbi(zumbi(j, 1, 0.2 * k), null);
  assert.ok(h.vida > v);
  assert.ok(h.vida <= v + h.vidaMax * 0.0401 * h.attr.get('cura'), 'no máximo 4% no mesmo segundo');
});

teste('sinergia: a passiva par já deixa a habilidade mais forte (+15% por nível), antes da suprema', () => {
  const dano = (comPar) => {
    const j = jogo(), h = j.hero;
    h.arma = null; h.corpo = 'empurrao'; h.corpoCd = 1e9;
    aplicarCarta(j, carta('ativa', 'granada', 2));
    if (comPar) aplicarCarta(j, carta('passiva', 'forca', 3));
    h.attr.addMod({ id: 'sem-forca', attr: 'dano', mult: comPar ? 1 / h.attr.get('dano') : 1 });   // mede só a sinergia (tira o bônus de dano da Força)
    const zs = [zumbi(j, 2, 0, 'gordo'), zumbi(j, 2.2, 0.3, 'gordo'), zumbi(j, 1.8, -0.3, 'gordo')];
    for (const z of zs) { z.vel = 0; z.atkCd = 99; z.vida = z.vidaMax = 1e6; }
    rodar(j, 1.5);
    return zs.reduce((a, z) => a + (1e6 - z.vida), 0);
  };
  const sem = dano(false), com = dano(true);
  assert.ok(Math.abs(com / sem - 1.45) < 0.05, `${sem.toFixed(0)} → ${com.toFixed(0)}`);
});

teste('cada suprema a mais deixa todas mais fortes', () => {
  const j = jogo(), h = j.hero;
  fazerSuprema(j, 'fragmentacao');
  const m1 = multSuprema(h);
  fazerSuprema(j, 'tempestade');
  assert.ok(multSuprema(h) > m1);
});

teste(`nível ${NIVEL_PRESENTE}: o chat escolhe 1 das 3 supremas originais de presente (Ataque aéreo, Aura de fogo, Coração de ferro)`, () => {
  assert.deepEqual(SUPREMAS_PRESENTE, ['bombardeio', 'aura', 'coracao']);
  const j = jogo('policial'), h = j.hero;
  j.configurar({ segundos_escolha_habilidade: 3, atraso_da_live_segundos: 1 });
  let x = 0; for (let k = 1; k < NIVEL_PRESENTE; k++) x += xpParaNivel(k);
  j.ganharXp(x);   // sobe do 1 ao 10 de uma vez: a do nível 10 passa na frente da fila
  assert.equal(h.nivel, NIVEL_PRESENTE);
  passar(j, 1);
  assert.ok(j.escolha?.presente, 'a escolha especial abriu primeiro');
  assert.deepEqual(j.escolha.cartas.map(c => c.id), SUPREMAS_PRESENTE);
  assert.ok(j.escolha.cartas.every(c => c.tipo === 'suprema' && c.gratis));
  j.handle({ type: 'chat', id: 'x', nick: 'X', texto: 'a' });
  passar(j, 9);   // (com níveis na fila a votação é a rápida: no mínimo 7 s + o atraso)
  assert.deepEqual(h.supremas, ['bombardeio'], 'Ataque aéreo de presente, sem receita (a Aura também vale pro policial)');
  assert.equal(h.supremaPresente, 'bombardeio');
  assert.deepEqual(cartasPresente(h).map(c => c.id), ['aura', 'coracao']);
  // não volta a abrir nos próximos níveis
  for (let k = 0; k < 12 && (j.escolha || j.niveisPendentes); k++) { assert.ok(!j.escolha?.presente, 'não abre de novo'); passar(j, 5); }
  // e o Ataque aéreo funciona
  j.zumbis = []; h.supT.bombardeio = 0.2;
  const zs = [];
  for (let k = 0; k < 6; k++) { const z = zumbi(j, 2 + (k % 3) * 0.3, 2 + Math.floor(k / 3) * 0.3); z.vel = 0; zs.push(z); }
  rodar(j, 5);
  assert.ok(zs.filter(z => z.morto).length >= 4, 'o avião derrubou o grupo');
});

/* ---------------- Núcleo e nível deus ---------------- */
teste(`${MAX_SUPREMAS} supremas enchem o núcleo; aí o chat escolhe o poder NÍVEL DEUS (sem gastar um nível)`, () => {
  const j = jogo('policial'), h = j.hero, ev = ouvir(j);
  j.configurar({ segundos_escolha_habilidade: 3, atraso_da_live_segundos: 1 });
  const ids = ['fragmentacao', 'tempestade', 'vampiricas', 'fenix', 'esquadrilha', 'fortaleza'];
  for (const id of ids) fazerSuprema(j, id);
  assert.equal(h.supremas.length, MAX_SUPREMAS);
  assert.ok(deusPendente(h));
  assert.deepEqual(supremasProntas(h), [], 'núcleo cheio: não dá mais suprema');
  assert.ok(ev.some(e => e.t === 'nucleo_cheio'));
  const nivel = h.nivel;
  passar(j, 1);
  assert.ok(j.escolha?.deus, 'abriu a escolha do nível deus');
  assert.ok(j.escolha.cartas.every(c => c.tipo === 'deus'));
  assert.ok(!j.escolha.cartas.some(c => c.unica), 'sem suprema única: só os 3 gerais');
  j.handle({ type: 'chat', id: 'x', nick: 'X', texto: 'b' });
  passar(j, 5);
  assert.ok(h.deus, 'virou deus');
  assert.equal(h.nivel, nivel);
  assert.ok(ev.some(e => e.t === 'deus'));
  assert.ok(!deusPendente(h));
});

teste('o poder deus do personagem só aparece se ele fez uma suprema única dele', () => {
  const j = jogo('policial'), h = j.hero;
  for (const id of ['fragmentacao', 'tempestade', 'vampiricas', 'fenix', 'esquadrilha', 'chuva_balas']) fazerSuprema(j, id);
  const c = cartasDeus(h, makeRng(1));
  assert.equal(c.length, 3);
  assert.equal(c[0].id, 'justica'); assert.ok(c[0].unica);
});

teste('poder deus: Fúria divina derruba os zumbis em volta, fere o chefe e cura; Égide dá defesa e vida', () => {
  const j = jogo(), h = j.hero;
  aplicarCarta(j, { tipo: 'deus', id: 'furia' });
  const zs = [zumbi(j, 2, 0), zumbi(j, -3, 1)], chefe = zumbi(j, 4, 0, 'chefao');
  h.vida = 10;
  rodar(j, 1.2);
  assert.ok(zs.every(z => z.morto)); assert.ok(!chefe.morto && chefe.vida < chefe.vidaMax); assert.ok(h.vida > 10);
  const e = jogo(), d = e.hero.attr.get('defesa'), v = e.hero.vidaMax;
  aplicarCarta(e, { tipo: 'deus', id: 'egide' });
  assert.ok(e.hero.attr.get('defesa') > d && e.hero.vidaMax > v * 1.4);
});

/* ---------------- Escolha do chat ---------------- */
teste('chat: só a letra sozinha vota (A, B, C); números continuam sendo direção', () => {
  assert.equal(lerEscolha('a'), 'a'); assert.equal(lerEscolha('B!'), 'b'); assert.equal(lerEscolha('C'), 'c');
  assert.equal(lerEscolha('a gente vai'), null); assert.equal(lerEscolha('2'), null);
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
  assert.equal(j.escolhaRes.carta.letra, 'B'); assert.equal(j.escolhaRes.votos, 2);
  const tem = b.tipo === 'ativa' ? j.hero.habs[b.id] : b.tipo === 'passiva' ? j.hero.passivas[b.id] : b.tipo === 'treino' ? j.hero.treino : j.hero.armaFixa || j.hero.corpoFixo;
  assert.ok(tem, 'carta B aplicada');
});

teste('ninguém votou: a IA escolhe; vários níveis de uma vez viram escolhas uma depois da outra', () => {
  const j = jogo();
  j.ganharXp(xpParaNivel(1));
  passar(j, j.cfg.escolhaDur + j.cfg.atraso + 1.5);
  assert.ok(j.escolhaRes && j.escolhaRes.auto);
  const k = jogo();
  k.ganharXp(xpParaNivel(1) + xpParaNivel(2) + xpParaNivel(3));
  assert.equal(k.hero.nivel, 4);
  let feitas = 0;
  for (let i = 0; i < 90 / DT && feitas < 3; i++) { k.update(DT); for (const e of k.drainEvents()) if (e.type === 'habilidade') feitas++; k.zumbis = []; }
  assert.equal(feitas, 3);
});

teste('escolha da IA sempre é uma das cartas, e ela monta as receitas', () => {
  const j = jogo();
  for (let s = 1; s < 20; s++) { const c = sortearCartas(j.hero, makeRng(s)); assert.ok(c.some(x => x.letra === escolhaDaIA(j.hero, c, makeRng(s + 100)))); }
  // IA jogando sozinha: em 120 níveis ela fecha supremas e chega no nível deus
  for (const c of Object.keys(CLASSES)) {
    const k = jogo(c), h = k.hero, rng = makeRng(c.length);
    for (let n = 0; n < 120 && !h.deus; n++) {
      const cartas = deusPendente(h) ? cartasDeus(h, rng) : sortearCartas(h, rng);
      const l = escolhaDaIA(h, cartas, rng);
      aplicarCarta(k, cartas.find(x => x.letra === l));
      h.nivel++;
    }
    assert.ok(h.deus, `${c}: chegou no nível deus (${h.supremas.length} supremas no nível ${h.nivel})`);
    assert.ok(h.nivel < 115, `${c}: nível deus no ${h.nivel}`);
  }
});

/* ---------------- Experiência ---------------- */
teste('experiência mais fácil que antes em todos os níveis (e cada nível pede mais que o anterior)', () => {
  const antes = n => Math.round(5 + n * 3 + n * n * 0.45);   // a curva antiga
  let a = 0, b = 0;
  for (let k = 1; k < 120; k++) {
    assert.ok(xpParaNivel(k) <= antes(k), `nível ${k}`);
    assert.ok(xpParaNivel(k + 1) > xpParaNivel(k));
    a += antes(k); b += xpParaNivel(k);
    if (k === 59) assert.ok(b < a * 0.8, `até o 60: ${b} contra ${a}`);
  }
});

teste('subir de nível aumenta a vida máxima, mas não cura', () => {
  const j = jogo(), h = j.hero, v1 = h.vidaMax;
  h.vida = 5;
  j.ganharXp(xpParaNivel(1));
  assert.equal(h.vida, 5, 'a vida atual não muda');
  assert.ok(h.vidaMax > v1 * 1.05);
  let x = 0; for (let k = 2; k < 10; k++) x += xpParaNivel(k);
  j.ganharXp(x);
  assert.equal(h.nivel, 10);
  assert.ok(Math.abs(h.vidaMax - v1 * 1.9) < 1e-6, `nível 10: ${h.vidaMax}`);
});

teste(`nível máximo ${NIVEL_MAXIMO}: a experiência para`, () => {
  const j = jogo(), h = j.hero;
  let x = 0; for (let k = 1; k < NIVEL_MAXIMO + 20; k++) x += xpParaNivel(k);
  j.ganharXp(x);
  assert.equal(h.nivel, NIVEL_MAXIMO); assert.equal(h.xp, 0);
  j.ganharXp(1e6);
  assert.equal(h.nivel, NIVEL_MAXIMO); assert.equal(h.xp, 0);
  assert.ok(Number.isFinite(h.vidaMax));
});

/* ---------------- Anti-explosão e os inchados instáveis do nível 20 ---------------- */
// estouro de um explosivo bem do lado do herói; devolve quanto de vida ele perdeu
const estourarDoLado = (j, nivel) => {
  j.hero.nivel = nivel; j.hero.invT = 0; j.hero.colete = 0; j.hero.explosaoT = null;   // cada estouro do teste é separado (fora da janela de 2 s)
  j.hero.attr.addMod({ id: 'sem-esquiva', attr: 'esquiva', mult: 0 });
  j.hero.vida = j.hero.vidaMax = 1e6;
  const z = zumbi(j, 0.5, 0, 'explosivo');
  const antes = j.hero.vida;
  j.matarZumbi(z, null);
  return antes - j.hero.vida;
};

teste('Anti-explosão: cada nível tira mais dano de explosão (até 80% no nível 3)', () => {
  const sem = estourarDoLado(jogo(), 20);
  const j = jogo();
  aplicarCarta(j, carta('passiva', 'explosao', 1));
  const n1 = estourarDoLado(j, 20);
  aplicarCarta(j, carta('passiva', 'explosao', 3));
  const n3 = estourarDoLado(j, 20);
  assert.ok(n1 < sem && n3 < n1, `${sem.toFixed(0)} → ${n1.toFixed(0)} → ${n3.toFixed(0)}`);
  assert.ok(Math.abs(n3 / sem - 0.2) < 0.01, 'nível 3: 80% menos');
});

teste('inchado instável (nível 20): estoura bem mais forte, atordoa o herói e estoura os explosivos em volta', () => {
  const j = jogo();
  const antes = estourarDoLado(j, SALVA_DESDE);
  assert.ok(!j.hero.estados.tem('atordoado'), 'antes do 20 o estouro não atordoa');
  const k = jogo();
  const depois = estourarDoLado(k, EXPLOSAO.desdeNivel);
  assert.ok(depois > antes * 2, `estouro ${antes.toFixed(0)} → ${depois.toFixed(0)}`);
  assert.ok(k.hero.estados.tem('atordoado'), 'atordoa');
  const c = jogo();
  c.hero.nivel = EXPLOSAO.desdeNivel; c.hero.invT = 999;
  const a = zumbi(c, 4, 0, 'explosivo'), b = zumbi(c, 5.5, 0, 'explosivo');
  c.matarZumbi(a, null);
  for (let i = 0; i < 20; i++) c.atualizarZumbis(DT);
  assert.ok(b.morto, 'o vizinho estourou junto');
  const r = jogo();
  aplicarCarta(r, carta('passiva', 'explosao', 2));
  estourarDoLado(r, EXPLOSAO.desdeNivel);
  assert.ok(!r.hero.estados.tem('atordoado'), 'Anti-explosão segura o atordoamento');
});

teste('o estouro do inchado instável cresce com a ameaça (antes do nível 20 é fixo)', () => {
  const j = jogo();
  j.hero.nivel = 12;
  j.nivelAmeaca = 2; const a = zumbi(j, 5, 0, 'explosivo').estouro;
  j.nivelAmeaca = 15; assert.equal(zumbi(j, 5, 0, 'explosivo').estouro, a);
  j.hero.nivel = EXPLOSAO.desdeNivel;
  j.nivelAmeaca = 2; const fraco = zumbi(j, 5, 0, 'explosivo').estouro;
  j.nivelAmeaca = 15; const forte = zumbi(j, 5, 0, 'explosivo').estouro;
  assert.ok(forte > fraco * 2);
});

teste(`do nível ${SALVA_DESDE} em diante a Anti-explosão é sempre oferecida (carta C) e a IA prefere ela`, () => {
  const conta = nivel => {
    const rng = makeRng(5); let n = 0;
    for (let k = 0; k < 400; k++) { const h = jogo().hero; h.nivel = nivel; if (sortearCartas(h, rng).some(c => c.id === 'explosao')) n++; }
    return n;
  };
  const antes = conta(SALVA_DESDE - 1), depois = conta(SALVA_DESDE);
  assert.ok(antes < 80 && depois === 400, `${antes} → ${depois} de 400`);
  const h = jogo().hero; h.nivel = SALVA_DESDE;
  const cartas = [{ tipo: 'passiva', id: 'explosao', nivel: 1, letra: 'A' }, { tipo: 'passiva', id: 'forca', nivel: 1, letra: 'B' }];
  const rng = makeRng(9); let a = 0;
  for (let k = 0; k < 400; k++) if (escolhaDaIA(h, cartas, rng) === 'A') a++;
  assert.ok(a > 260, `IA escolheu Anti-explosão ${a} de 400`);
});

teste('slots cheios no nível 19+: a Anti-explosão entra no lugar de uma passiva que não combina com nada', () => {
  const j = jogo(), h = j.hero;
  h.nivel = SALVA_DESDE;
  for (const id of ['mira', 'vampiro', 'regen', 'maos', 'couro']) aplicarCarta(j, carta('passiva', id, 2));
  const c = sortearCartas(h, makeRng(1)).find(x => x.id === 'explosao');
  assert.ok(c && c.troca, 'aparece trocando');
});

console.log(`\n${ok} testes passaram.`);
