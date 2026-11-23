// Testes dos zumbis da tela (core/tela.js): catálogo, escala com o presente, como aparecem e o limpador.
// Rodar:  node teste/tela.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { ZUMBIS } from '../public/js/core/dados.js';
import { TELA, ZUMBIS_TELA, GRUPOS_TELA, tipoTela, niveisPorMoedas, sortearTela, sortearNaRua } from '../public/js/core/tela.js';
import { EFEITOS } from '../public/js/core/efeitos.js';
import { makeRng } from '../public/js/core/util.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;
// herói sem atacar (senão ele mata o zumbi antes do efeito)
const jogo = (seed = 3) => { const j = new Jogo({ sobrevivencia: false, seed }); j.zumbis = []; j.spawnT = 999; j.protecao = 0; j.hero.invT = 999; j.hero.folegoCd = 1e9; j.hero.arma = null; return j; };
const ouvir = j => { const ev = []; const e0 = j.emit.bind(j); j.emit = (t, d) => { ev.push({ t, ...d }); return e0(t, d); }; return ev; };
// herói parado no lugar e sem atacar (como esperando no cruzamento), pra medir só o zumbi da tela
const passar = (j, seg, cada) => { const p = { x: j.hero.x, y: j.hero.y }; for (let i = 0; i < seg / DT; i++) { j.hero.vida = j.hero.vidaMax; j.hero.corpoCd = 9; j.hero.tiroCd = 9; j.update(DT); j.hero.x = p.x; j.hero.y = p.y; cada?.(); } };

teste('17 zumbis da tela em 4 grupos, todos com os números do balanceamento', () => {
  assert.equal(Object.keys(ZUMBIS_TELA).length, 17);
  assert.deepEqual(Object.keys(GRUPOS_TELA), ['suja', 'quarta', 'imagem', 'marcante']);
  for (const [id, Zt] of Object.entries(ZUMBIS_TELA)) {
    assert.ok(Zt.nome && Zt.emoji && Zt.frase, id);
    assert.ok(GRUPOS_TELA[Zt.grupo], `${id}: grupo`);
    assert.ok(Zt.dura >= 2 && Zt.dura <= 4, `${id}: dura de 2 a 4 s`);
    assert.ok(Zt.cobre > 0 && Zt.cobre <= 0.6, `${id}: cobre`);
    assert.ok([1, 2, 3, 4].includes(Zt.nivel), `${id}: nível`);
    assert.ok(['longe', 'perto', 'direto'].includes(Zt.jeito), `${id}: jeito`);
    const T = ZUMBIS[tipoTela(id)];
    assert.ok(T && T.tela === id, `${id}: zumbi na rua`);
    assert.equal(!!T.arremesso, Zt.jeito === 'longe', `${id}: quem joga de longe tem arremesso`);
  }
});

teste('escala com o presente: barato manda nível 1, caro manda a mão gigante', () => {
  assert.deepEqual(niveisPorMoedas(1), [1]);
  assert.deepEqual(niveisPorMoedas(5), [1, 2]);
  assert.deepEqual(niveisPorMoedas(99), [2, 3]);
  assert.ok(niveisPorMoedas(5000).includes(4));
  const rng = makeRng(1), vistos = new Set();
  for (let i = 0; i < 300; i++) vistos.add(sortearTela(rng, niveisPorMoedas(1)));
  assert.ok([...vistos].every(id => ZUMBIS_TELA[id].nivel === 1), 'presente barato: só nível 1');
  assert.ok(!vistos.has('gigante'));
  assert.equal(sortearTela(makeRng(2), [4]), 'gigante');
});

teste('sozinho na rua: só depois do nível de cada um (e nunca a mão gigante nem o fã)', () => {
  const rng = makeRng(4);
  assert.equal(sortearNaRua(rng, 1), null, 'nível 1: nenhum');
  const vistos = new Set();
  for (let i = 0; i < 500; i++) { const id = sortearNaRua(rng, 30); if (id) vistos.add(id); }
  assert.ok(!vistos.has('gigante') && !vistos.has('fa'));
  for (const id of vistos) assert.ok(ZUMBIS_TELA[id].desdeNivel <= 30);
  for (let i = 0; i < 200; i++) { const id = sortearNaRua(rng, 5); if (id) assert.ok(ZUMBIS_TELA[id].desdeNivel <= 5, id); }
});

teste('zumbi que joga de longe (ovo): para longe, joga, acerta e o efeito vai pra tela com o nome de quem mandou', () => {
  const j = jogo(), ev = ouvir(j);
  assert.ok(j.surgirTela('ovo', { id: 'a', nick: 'ana.lu' }));
  const z = j.zumbis.find(q => q.tipo === tipoTela('ovo'));
  assert.ok(z && z.dono?.nick === 'ana.lu');
  passar(j, 8);
  const e = ev.find(q => q.t === 'tela' && q.id === 'ovo');
  assert.ok(e, 'jogou e acertou');
  assert.equal(e.nick, 'ana.lu');
  assert.ok(ev.some(q => q.t === 'tomate_lancado' && q.tela === 'ovo'));
});

teste('zumbi que vem até a câmera (lambedor): chega perto do herói e faz o efeito', () => {
  const j = jogo(), ev = ouvir(j);
  j.surgirTela('lambedor', { id: 'b', nick: 'bia' });
  passar(j, 12);
  assert.ok(ev.some(q => q.t === 'tela' && q.id === 'lambedor' && q.nick === 'bia'));
});

teste('mão gigante: sem zumbi na rua, vem direto e bate no herói (12% da vida)', () => {
  const j = jogo(), ev = ouvir(j), h = j.hero;
  h.invT = 0; h.attr.addMod({ id: 'sem-esquiva', attr: 'esquiva', mult: 0 }); h.colete = 0;
  const vidaMax = h.vidaMax;
  j.surgirTela('gigante', { id: 'c', nick: 'rico' });
  assert.ok(!j.zumbis.some(z => z.tipo === tipoTela('gigante')), 'sem zumbi na rua');
  for (let i = 0; i < 3 / DT; i++) j.update(DT);
  assert.ok(ev.some(q => q.t === 'tela' && q.id === 'gigante' && q.nick === 'rico'));
  assert.ok(h.vida < vidaMax * 0.95, 'a mão bateu');
});

teste('grafite picha o nome de quem mandou (ou uma palavra); o fã segura a plaquinha com o nome', () => {
  const j = jogo(), ev = ouvir(j);
  for (let i = 0; i < 20; i++) j.efeitoTela('grafite', { nick: 'duda' });
  const palavras = ev.filter(q => q.id === 'grafite').map(q => q.palavra);
  assert.ok(palavras.includes('@duda') && palavras.some(p => ZUMBIS_TELA.grafite.palavras.includes(p)));
  j.efeitoTela('fa', { nick: 'tia.cida' });
  assert.equal(ev.find(q => q.id === 'fa').palavra, 'tia.cida');
});

teste('presente de atrapalhar às vezes manda um zumbi da tela do nível do valor, com intervalo mínimo', () => {
  const j = jogo();
  j.configurar({ tela_chance_por_presente: 1, tela_recarga_segundos: 6 });
  assert.ok(j.telaDePresente({ id: 'a', nick: 'x' }, 1), 'mandou');
  assert.equal(j.telaDePresente({ id: 'a', nick: 'x' }, 1), null, 'no intervalo: não manda');
  j.t += 7;
  const id = j.telaDePresente({ id: 'a', nick: 'x' }, 1);
  assert.ok(id && ZUMBIS_TELA[id].nivel === 1);
  j.configurar({ zumbis_da_tela: 0 }); j.t += 7;
  assert.equal(j.telaDePresente({ id: 'a', nick: 'x' }, 1), null, 'desligado no config: não manda');
});

teste('o presente da fila (TikTok, GG...) dispara o zumbi da tela junto', () => {
  const j = jogo(), ev = ouvir(j);
  j.configurar({ tela_chance_por_presente: 1 });
  j.handle({ type: 'presente', id: 'p', nick: 'troll', giftName: 'GG', count: 1, coins: 1, regra: { efeito: 'vidro', segundos: 5, moedas: 1 } });
  passar(j, 2);
  assert.ok(ev.some(q => q.t === 'tela_vem' && q.nick === 'troll'));
});

teste('efeito "tela" do config.json: um zumbi da tela de propósito; "limpador": limpa a tela', () => {
  assert.equal(EFEITOS.tela.lado, 'atrapalha'); assert.equal(EFEITOS.limpador.lado, 'ajuda');
  const j = jogo(), ev = ouvir(j);
  EFEITOS.tela.aplicar(j, { efeito: 'tela', zumbi: 'torta' }, 1, { id: 'a', nick: 'x' });
  assert.ok(j.zumbis.some(z => z.tipo === tipoTela('torta')));
  EFEITOS.limpador.aplicar(j, {}, 1, { id: 'b', nick: 'limpinho' });
  assert.ok(ev.some(q => q.t === 'limpar_tela' && q.nick === 'limpinho'));
});

teste('disputa: todo presente de ajuda passa o limpador de para-brisa', () => {
  const j = jogo(), ev = ouvir(j);
  j.handle({ type: 'presente', id: 'p', nick: 'anjinho', giftName: 'Rose', count: 1, coins: 1, regra: { efeito: 'cura', valor: 14 } });
  assert.ok(ev.some(q => q.t === 'limpar_tela' && q.nick === 'anjinho' && q.auto));
});

teste('cobertura máxima da tela e duração curta estão no catálogo', () => {
  assert.ok(TELA.coberturaMax > 0 && TELA.coberturaMax <= 1);
  assert.ok(TELA.limpador.dura > 0.5 && TELA.limpador.dura < 2);
  assert.ok(Object.values(ZUMBIS_TELA).every(Zt => Zt.dura <= 4), 'nada fica mais de 4 s');
});

console.log(`\n${ok} testes passaram.`);
