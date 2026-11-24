// Testes do Barganha (core/mascate.js: a rua sem saída com o galpão, a banca, comprar, vender, trocar, a IA e a
// grana), dos itens (core/itens.js: armas, tônicos e a bolsa) e da infecção de quem é salvo num encontro
// (core/encontros.js: 40% / 60% / morre no 3º quarteirão ou na chegada). Rodar:  node teste/mascate.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { MASCATE, aparecerMascate, talvezMascate, perguntarBarganha, decidirBarganha, escolhaBarganhaIA, abrirLoja, montarOfertas, montarPrateleira, decidirLoja, escolhaLojaIA, votoLoja, atualizarLoja, mascateAtivo, direcaoDaCamera } from '../public/js/core/mascate.js';
import { ITENS, BOLSA_MAX, guardarTonico, atualizarBolsa, pertences, fazSentido } from '../public/js/core/itens.js';
import { lerNumero } from '../public/js/core/votacao.js';
import { ruaLivre } from '../public/js/core/mapa.js';
import { STATUS } from '../public/js/core/status.js';
import { ENCONTROS, quarteiraoDosSalvos, salvosChegaram } from '../public/js/core/encontros.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;
const ouvir = j => { const ev = []; const e0 = j.emit.bind(j); j.emit = (t, d) => { ev.push({ t, ...d }); return e0(t, d); }; return ev; };
const novo = (seed = 1, classe = 'bombeiro') => new Jogo({ seed, classe, cena: 0 });
// abre a banca (com o Barganha já na rua sem saída) e a 1ª rodada
const banca = j => {
  if (!j.mascate) assert.ok(aparecerMascate(j), 'achou uma rua do lado');
  abrirLoja(j);
  atualizarLoja(j, MASCATE.segAbrindo + 0.01);
  assert.equal(j.loja.fase, 'votando');
  return j.loja;
};
const op = (j, n) => j.loja.voto.opcoes.find(o => o.n === n);
const escolher = (j, n) => { const o = op(j, n); assert.ok(o, `opção ${n} aberta`); decidirLoja(j, o.id, { votos: 3, auto: false }); return o.oferta; };

console.log('O Barganha');

teste('começa com a grana inicial; no modo antigo (sem sobrevivência) não tem Barganha nem grana', () => {
  assert.equal(novo().hero.grana, MASCATE.granaInicial);
  const v = new Jogo({ seed: 1, classe: 'bombeiro', sobrevivencia: false });
  assert.equal(v.hero.grana, 0);
  v.stats.quarteiroes = 9; v.rng.chance = () => true; v.mascatePendente = true;
  assert.equal(talvezMascate(v), false);
});

teste('40% de chance depois de derrotar um chefe (zumbi comum nunca; sem chefe ele não aparece por quarteirão)', () => {
  assert.equal(MASCATE.chanceChefe, 0.4);
  const N = 1200;
  let viu = 0;
  for (let s = 0; s < N; s++) {
    const j = novo(500 + s);
    const z = j.criarZumbi('chefao', j.hero.x + 3, j.hero.y, null, { nascendo: 0 });
    j.matarZumbi(z, null);
    if (j.mascate) viu++;
  }
  assert.ok(Math.abs(viu / N - 0.4) < 0.04, `apareceu ${viu}/${N}`);
  for (const tipo of ['rei', 'exheroi', 'colosso']) {
    const j = novo(7); j.rng.chance = () => true;
    j.matarZumbi(j.criarZumbi(tipo, j.hero.x + 3, j.hero.y, null, { nascendo: 0 }), null);
    assert.ok(j.mascate, `${tipo} conta como chefe`);
  }
  const c = novo(8); c.rng.chance = () => true;
  for (let k = 0; k < 30; k++) c.matarZumbi(c.criarZumbi('comum', c.hero.x + 3, c.hero.y, null, { nascendo: 0 }), null);
  assert.equal(c.mascate, null, 'zumbi comum não chama o Barganha');
  c.stats.quarteiroes = 9;
  assert.equal(talvezMascate(c), false, 'quarteirão novo sozinho não chama mais');
});

teste('chefe derrotado perto do cruzamento (ou com encontro, de moto, indo pra um lugar): fica pro próximo quarteirão', () => {
  const j = novo(3); j.rng.chance = () => true;
  const no = j.city.nodePos(j.rota.alvo.i, j.rota.alvo.j);
  j.hero.x = no.x - 2; j.hero.y = no.y;
  j.matarZumbi(j.criarZumbi('chefao', j.hero.x + 1, j.hero.y, null, { nascendo: 0 }), null);
  assert.equal(j.mascate, null, 'perto demais do cruzamento: não aparece na cara dele');
  assert.equal(j.mascatePendente, true, 'fica marcado');
  j.encontro = { fase: 'votando' }; assert.equal(talvezMascate(j), false, 'encontro');
  j.encontro = null; j.hero.moto = true; assert.equal(talvezMascate(j), false, 'de moto');
  j.hero.moto = false; j.destino = { i: 0, j: 0 }; assert.equal(talvezMascate(j), false, 'indo pra um lugar');
  j.destino = null;
  assert.equal(j.mascatePendente, true, 'continua marcado');
  assert.equal(talvezMascate(j), true, 'no quarteirão seguinte ele aparece');
  assert.equal(j.mascatePendente, false);
  assert.equal(talvezMascate(j), false, 'um de cada vez');
  const k = novo(4); k.rng.chance = () => true; k.hero.moto = true;
  k.matarZumbi(k.criarZumbi('chefao', k.hero.x + 3, k.hero.y, null, { nascendo: 0 }), null);
  assert.ok(!k.mascatePendente && !k.mascate, 'de moto: sem Barganha');
});

teste('sempre numa rua sem saída do lado do próximo cruzamento, fechada pelo galpão com o janelão virado pro herói', () => {
  for (let seed = 1; seed <= 25; seed++) {
    const j = novo(seed), N = { ...j.rota.alvo }, ev = ouvir(j);
    j.decisao = { id: 'frente', dir: j.rota.dir };
    const m = aparecerMascate(j);
    assert.ok(m, `seed ${seed}`);
    assert.notEqual(m.dirBeco, j.rota.dir, 'não é o caminho dele');
    assert.notEqual(m.dirBeco, (j.rota.dir + 2) % 4, 'nem a rua de onde veio');
    const t = j.city.trecho(N.i, N.j, m.dirBeco);
    assert.ok(t.s.semSaida?.galpao === m.gp, 'a rua virou sem saída, com o galpão');
    assert.ok(!t.s.bloqueio);
    assert.equal(ruaLivre(j.city, N.i, N.j, m.dirBeco), false, 'o mapa não passa por ela');
    const gp = m.gp, no = j.city.nodePos(N.i, N.j);
    // o janelão olha pro cruzamento; o herói para no meio da rua, na frente dele, fora do galpão
    const paraNo = [no.x - gp.janela.x, no.y - gp.janela.y];
    assert.ok(paraNo[0] * gp.dir[0] + paraNo[1] * gp.dir[1] > 8, 'janelão de frente pro cruzamento');
    assert.ok(j.livre(gp.ponto.x, gp.ponto.y), 'dá pra parar na frente');
    const r = gp.rect, meio = { x: (r.x0 + r.x1) / 2, y: (r.y0 + r.y1) / 2 };
    assert.ok(!j.livre(meio.x, meio.y), 'o galpão é sólido');
    assert.ok(t.s.props.some(p => p.tipo === 'galpao' && p.gp === gp), 'desenho do galpão na rua');
    assert.equal(gp.aberto, true, 'tocha acesa');
    assert.ok(ev.some(e => e.t === 'mascate' && e.fase === 'chegou'));
  }
});

teste('a rua sem saída do galpão continua igual quando o trecho é refeito (cache limpo)', () => {
  const j = novo(4), m = aparecerMascate(j);
  j.city.segCache.clear();
  const t = j.city.trecho(m.no.i, m.no.j, m.dirBeco);
  assert.ok(t.s.semSaida?.galpao === m.gp);
});

teste('a prateleira: 6 itens, armas que fazem sentido em cima e tônicos diferentes embaixo', () => {
  for (let seed = 1; seed <= 30; seed++) {
    const j = novo(seed, ['bombeiro', 'policial', 'enfermeira'][seed % 3]);
    const p = montarPrateleira(j);
    assert.equal(p.length, 6);
    assert.deepEqual(p.map(s => s.n), [1, 2, 3, 4, 5, 6]);
    const tipos = p.map(s => ITENS[s.id].tipo);
    assert.ok(tipos.lastIndexOf('arma') < tipos.indexOf('tonico') || !tipos.includes('arma'), 'armas antes dos tônicos');
    for (const s of p) { assert.ok(fazSentido(j.hero, s.id), s.id); assert.equal(s.preco, ITENS[s.id].preco); }
    const ton = p.filter(s => ITENS[s.id].tipo === 'tonico').map(s => s.id);
    assert.equal(new Set(ton).size, ton.length, 'sem tônico repetido');
    assert.ok(ton.length >= 3);
  }
});

teste('a banca pausa a rua: o tempo e os zumbis param enquanto o chat negocia', () => {
  const j = novo(5);
  const z = j.criarZumbi('comum', j.hero.x + 3, j.hero.y, null);
  banca(j);
  const t0 = j.t, zx = z.x;
  for (let k = 0; k < 60; k++) j.update(DT);
  assert.equal(j.t, t0);
  assert.equal(z.x, zx);
  assert.ok(j.loja.voto.t < j.loja.voto.duracao + j.loja.voto.atraso, 'a votação da banca anda');
});

teste('as opções: 1 a 6 da prateleira, 7 vender, 8 trocar, 9 sair (vender/trocar só se tiver o que)', () => {
  const j = novo(6), L = banca(j);
  const ofs = L.ofertas;
  assert.deepEqual(ofs.map(o => o.n), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.deepEqual(ofs.slice(6).map(o => o.tipo), ['vender', 'trocar', 'sair']);
  assert.equal(ofs[6].ok, false, 'sem nada pra vender'); assert.equal(ofs[7].ok, false);
  assert.ok(!op(j, 7) && !op(j, 8) && op(j, 9));
  j.guardarNaMochila(35, null, 'kit'); guardarTonico(j, 't_furia');
  const ofs2 = montarOfertas(j);
  assert.equal(ofs2[6].ok, true);
  assert.equal(ofs2[6].ganho, Math.round(ITENS.t_furia.preco / 2), 'vende o mais valioso pela metade');
});

teste('o chat vota pelo número (1 a 9) ou pela palavra; cada um vota uma vez', () => {
  assert.equal(lerNumero('7'), 7); assert.equal(lerNumero('777'), 7); assert.equal(lerNumero('7️⃣'), 7);
  assert.equal(lerNumero('quero o 3'), 3); assert.equal(lerNumero('vender'), 7); assert.equal(lerNumero('troca'), 8);
  assert.equal(lerNumero('tchau'), 9); assert.equal(lerNumero('oi gente'), null); assert.equal(lerNumero('0'), null);
  const j = novo(7), ev = ouvir(j);
  j.hero.grana = 500; banca(j);
  j.handle({ type: 'chat', id: 'a', nick: 'ana', texto: '2' });
  j.handle({ type: 'chat', id: 'a', nick: 'ana', texto: '3' });
  j.handle({ type: 'chat', id: 'b', nick: 'bia', texto: 'quero o 2' });
  j.handle({ type: 'chat', id: 'c', nick: 'caio', texto: '9' });
  assert.equal(op(j, 2).votos, 2); assert.equal(op(j, 9).votos, 1); assert.equal(op(j, 3).votos, 0);
  assert.equal(j.voto, null, 'não é voto de direção');
  assert.ok(ev.some(e => e.t === 'voto' && e.loja));
  for (let k = 0; k < 30 * 40 && j.loja?.fase === 'votando'; k++) j.update(DT);
  assert.equal(j.loja.ultimo.n, 2, 'o mais votado ganha');
});

teste('comprar: desconta a grana, entrega o item e o lugar da prateleira fica vazio; sem grana não leva', () => {
  const j = novo(8, 'enfermeira'), ev = ouvir(j);
  j.hero.grana = 300;
  const L = banca(j);
  L.prateleira = [{ n: 1, id: 'pistola', preco: 40 }, { n: 2, id: 'metralhadora', preco: 90 }, { n: 3, id: 'taco', preco: 30 }, { n: 4, id: 't_furia', preco: 30 }, { n: 5, id: 't_azul', preco: 70 }, { n: 6, id: 't_sangue', preco: 35 }].map(s => ({ ...s, vendido: false }));
  L.fase = 'resultado'; L.continua = true; L.t = 99; atualizarLoja(j, 0);
  escolher(j, 1);
  assert.equal(j.hero.grana, 260); assert.equal(j.hero.arma, 'pistola'); assert.equal(j.hero.municao, 36);
  assert.ok(L.prateleira[0].vendido);
  assert.ok(ev.some(e => e.t === 'mascate' && e.fase === 'comprar'));
  L.t = 99; atualizarLoja(j, 0);
  assert.ok(!op(j, 1), 'o vendido não volta na votação');
  escolher(j, 4);
  assert.deepEqual(j.hero.bolsa.map(b => b.id), ['t_furia'], 'tônico vai pra bolsa');
  L.t = 99; atualizarLoja(j, 0);
  escolher(j, 6);
  L.t = 99; atualizarLoja(j, 0);
  assert.equal(L.fase, 'fechando', 'no máximo 3 negócios por visita');
  const k = novo(9); k.hero.grana = 5; banca(k);
  const compra = k.loja.ofertas.find(o => o.tipo === 'comprar' && o.ok);
  decidirLoja(k, 'n' + compra.n, { votos: 1 });
  assert.equal(k.hero.grana, 5); assert.equal(k.loja.ultimo.fez, false);
});

teste('vender a arma achada (metade do preço, pelo que sobrou dela) e voltar pra arma do personagem', () => {
  const j = novo(10, 'bombeiro');
  j.trocarArma('escopeta', null);
  const p = pertences(j).find(x => x.ref.onde === 'arma');
  assert.equal(p.venda, Math.round(ITENS.escopeta.preco * Math.min(1, ITENS.escopeta.municao ? (j.hero.municao / ITENS.escopeta.municao) : 1) / 2));
  banca(j);
  const g0 = j.hero.grana, o = escolher(j, 7);
  assert.equal(o.pertence.ref.onde, 'arma');
  assert.equal(j.hero.arma, null, 'bombeira volta pro machado');
  assert.equal(j.hero.grana, g0 + o.ganho);
  // a pistola do policial não se vende
  const k = novo(10, 'policial');
  assert.ok(!pertences(k).some(x => x.ref.onde === 'arma'));
});

teste('trocar: o pertence vale o preço cheio e leva um item da prateleira que caiba nisso', () => {
  const j = novo(11, 'bombeiro');
  j.hero.grana = 0;
  guardarTonico(j, 't_azul');
  const L = banca(j);
  const o = L.ofertas.find(x => x.tipo === 'trocar');
  assert.ok(o.ok);
  assert.ok(ITENS[o.id].preco <= ITENS.t_azul.preco && o.id !== 't_azul');
  escolher(j, 8);
  assert.ok(!j.hero.bolsa.some(b => b.id === 't_azul'), 'o tônico azul foi');
  assert.ok(o.slot.vendido);
  assert.equal(j.hero.grana, 0, 'troca não mexe na grana');
  const veio = ITENS[o.id];
  if (veio.tipo === 'tonico') assert.ok(j.hero.bolsa.some(b => b.id === o.id));
});

teste('IA (ninguém votou): vida baixa compra o Tônico do Sangue; duro troca ou vende; senão sai — e a banca fecha', () => {
  const j = novo(12); j.hero.grana = 100; j.hero.vida = j.hero.vidaMax * 0.3;
  const L = banca(j);
  L.prateleira[5] = { n: 6, id: 't_sangue', preco: 35, vendido: false };
  L.ofertas = montarOfertas(j); L.voto.opcoes = L.ofertas.filter(o => o.ok).map(o => ({ id: 'n' + o.n, n: o.n, oferta: o, votos: 0 }));
  assert.equal(escolhaLojaIA(j, L.voto.opcoes), 'n6');
  const k = novo(13); k.hero.grana = 3; k.guardarNaMochila(35, null, 'kit');
  banca(k);
  const id = escolhaLojaIA(k, k.loja.voto.opcoes);
  assert.ok(['vender', 'trocar'].includes(op(k, +id.slice(1)).oferta.tipo));
  const s = novo(14); s.hero.grana = 20; banca(s);
  assert.equal(op(s, +escolhaLojaIA(s, s.loja.voto.opcoes).slice(1)).oferta.tipo, 'sair');
  // rodada sem voto: a IA decide e a banca fecha (ninguém está olhando)
  const t = novo(15); t.hero.grana = 300; banca(t);
  for (let q = 0; q < 30 * 60 && t.loja && t.loja.fase !== 'fechando'; q++) t.update(DT);
  assert.equal(t.loja.ultimo.auto, true); assert.equal(t.loja.fase, 'fechando');
});

teste('no jogo: aparece, o herói entra na rua sem saída, para no janelão, negocia, volta e a tocha apaga', () => {
  const j = novo(16, 'policial'), ev = ouvir(j);
  j.hero.grana = 200;
  let m = null, abriu = false, cam = false, perguntou = false;
  for (let k = 0; k < 30 * 400; k++) {
    if (!m && j.stats.quarteiroes >= 2 && !j.room && !j.arena && !j.rota.beco && !j.destino && !j.indoPorta && !j.indoPraca) m = aparecerMascate(j);
    j.update(DT);
    if (j.loja) {
      abriu = true;
      const h = j.hero;
      assert.ok(Math.hypot(h.x - m.gp.ponto.x, h.y - m.gp.ponto.y) < 0.6, 'na frente do janelão');
      if (direcaoDaCamera(j) === m.dirBeco) cam = true;
      if (j.loja.fase === 'votando' && !j.loja.voto.votantes.size) j.handle({ type: 'chat', id: 'x', nick: 'x', texto: '9' });
    }
    if (j.voto?.mascate && j.voto.aberta && !j.voto.votantes.size) { perguntou = true; j.handle({ type: 'chat', id: 'y', nick: 'y', texto: '1' }); }
    if (m && abriu && !j.mascate) break;
  }
  assert.ok(perguntou, 'o chat votou se ia na banca');
  assert.ok(m && abriu, 'abriu a banca');
  assert.ok(cam, 'a câmera olha pra dentro da rua sem saída');
  assert.equal(j.mascate, null, 'voltou pro cruzamento');
  assert.equal(m.gp.aberto, false, 'o janelão fecha e a tocha apaga');
  assert.ok(['loja', 'mascate'].every(t => ev.some(e => e.t === t)));
  assert.ok(!mascateAtivo(j));
});

teste('quando ele aparece, o chat vota: 1 ir na banca ou 2 seguir (o herói espera no cruzamento)', () => {
  const j = novo(20), ev = ouvir(j);
  j.hero.grana = 0;
  let m = null;
  for (let k = 0; k < 30 * 400 && !j.voto?.mascate; k++) {
    if (!m && j.stats.quarteiroes >= 2 && !j.room && !j.arena && !j.rota.beco && !j.destino && !j.indoPorta && !j.indoPraca) m = aparecerMascate(j);
    j.update(DT);
  }
  assert.ok(j.voto?.mascate && j.voto.aberta, 'abriu a votação do Barganha');
  assert.deepEqual(j.voto.opcoes.map(o => [o.n, o.nome]), [[1, 'IR NA BANCA'], [2, 'SEGUIR']]);
  assert.equal(m.fase, 'perguntando');
  const q0 = j.stats.quarteiroes;
  for (let k = 0; k < 30 * 5; k++) j.update(DT);
  assert.equal(j.stats.quarteiroes, q0, 'não atravessa enquanto o chat vota');
  assert.ok(Math.hypot(j.hero.x - m.entrada.x, j.hero.y - m.entrada.y) < 1.6, 'espera no cruzamento');
  j.handle({ type: 'chat', id: 'a', nick: 'ana', texto: '2' });
  for (let k = 0; k < 30 * 30 && j.voto?.aberta; k++) j.update(DT);
  assert.equal(j.mascate, null, 'seguiu');
  assert.equal(m.gp.aberto, false, 'o janelão fecha e a tocha apaga');
  assert.ok(ev.some(e => e.t === 'decisao' && e.mascate && e.nome === 'SEGUIR'));
  assert.ok(!j.loja);
  // ninguém votou: a IA vai se tiver grana ou alguma coisa pra vender
  const k2 = novo(21); k2.hero.grana = 0; aparecerMascate(k2);
  assert.equal(escolhaBarganhaIA(k2), 'frente');
  k2.hero.grana = 30; assert.equal(escolhaBarganhaIA(k2), 'esquerda');
  k2.hero.grana = 0; guardarTonico(k2, 't_vento'); assert.equal(escolhaBarganhaIA(k2), 'esquerda');
  perguntarBarganha(k2); decidirBarganha(k2, 'esquerda', { votos: 0, auto: true });
  assert.equal(k2.mascate.fase, 'entrando');
});

console.log('Os itens');

teste('tônicos: vão pra bolsa (até 4); com a bolsa cheia, bebe na hora', () => {
  const j = novo(17);
  for (let k = 0; k < BOLSA_MAX; k++) guardarTonico(j, 't_furia');
  assert.equal(j.hero.bolsa.length, BOLSA_MAX);
  guardarTonico(j, 't_ferro');
  assert.equal(j.hero.bolsa.length, BOLSA_MAX);
  assert.ok(j.hero.estados.tem('t_ferro'));
  for (const id of Object.keys(ITENS).filter(k => ITENS[k].tipo === 'tonico')) assert.ok(STATUS[id]?.lado === 'positivo' && STATUS[id].texto, id);
});

teste('o herói bebe sozinho na hora certa: sangue com vida baixa, fúria com chefe; sem perigo guarda', () => {
  const j = novo(18), h = j.hero;
  guardarTonico(j, 't_sangue'); guardarTonico(j, 't_furia');
  atualizarBolsa(j, 5);
  assert.equal(h.bolsa.length, 2, 'sem perigo não bebe');
  h.vida = h.vidaMax * 0.3; atualizarBolsa(j, 5);
  assert.ok(h.estados.tem('t_sangue')); assert.equal(h.bolsa.length, 1);
  h.vida = h.vidaMax;
  j.criarZumbi('chefao', h.x + 3, h.y, null, { nascendo: 0 });
  atualizarBolsa(j, 5);
  assert.ok(h.estados.tem('t_furia'));
  const d0 = h.attr.get('dano');
  assert.ok(d0 > 1.3, `dano ${d0}`);
  // dura quarteirões
  j.andouQuarteirao(1); assert.ok(h.estados.tem('t_furia'));
  j.andouQuarteirao(1); assert.ok(!h.estados.tem('t_furia'));
});

teste('chefe às vezes deixa um tônico; pegar do chão guarda na bolsa', () => {
  const j = novo(19);
  let caiu = 0;
  for (let k = 0; k < 120; k++) {
    const z = j.criarZumbi('chefao', j.hero.x + 3, j.hero.y, null);
    j.itens = [];
    j.matarZumbi(z, null);
    if (j.itens.some(i => i.kind === 'tonico')) caiu++;
  }
  assert.ok(caiu > 20 && caiu < 70, `caiu ${caiu}/120`);
  j.pegar({ kind: 'tonico', data: { id: 't_olho' }, quem: null, x: j.hero.x, y: j.hero.y });
  assert.ok(j.hero.bolsa.some(b => b.id === 't_olho'));
});

teste('a grana cai dos zumbis (às vezes) e o pegar soma', () => {
  const j = novo(8);
  let caiu = 0;
  for (let k = 0; k < 200; k++) {
    const z = j.criarZumbi('comum', j.hero.x + 3, j.hero.y, null);
    const n = j.itens.length;
    j.matarZumbi(z, null);
    if (j.itens.slice(n).some(i => i.kind === 'grana')) caiu++;
  }
  assert.ok(caiu > 3 && caiu < 35, `caiu ${caiu}/200`);
  const g0 = j.hero.grana;
  j.pegar({ kind: 'grana', data: { valor: 7 }, quem: null, x: j.hero.x, y: j.hero.y });
  assert.equal(j.hero.grana, g0 + 7);
});

console.log('Quem é salvo e foi mordido');

const comSalvo = (seed, nome = 'Ana') => {
  const j = novo(seed);
  j.addAliado('sobrevivente', 99, { nick: nome, aliado: true, id: 'encontro:' + nome });
  const a = j.aliados.at(-1);
  a.encontro = { nome, quarteiroes: 0, roupa: 2 };
  return [j, a];
};

teste('40% vira zumbi depois do 1º quarteirão, 60% depois do 2º; senão morre no 3º', () => {
  assert.deepEqual(ENCONTROS.infeccao.chances, [0.4, 0.6]);
  assert.equal(ENCONTROS.infeccao.morreNo, 3);
  const N = 2000, conta = { q1: 0, q2: 0, q3: 0 };
  for (let s = 0; s < N; s++) {
    const [j] = comSalvo(1000 + s);
    for (let q = 1; q <= 3; q++) {
      const z0 = j.zumbis.length;
      quarteiraoDosSalvos(j);
      if (j.zumbis.length > z0) { conta['q' + q]++; break; }
      if (!j.aliados.some(a => a.encontro)) { assert.equal(q, 3, 'só morre no 3º'); break; }
    }
  }
  const p1 = conta.q1 / N, p2 = conta.q2 / N, p3 = conta.q3 / N;
  assert.ok(Math.abs(p1 - 0.4) < 0.04, `1º: ${p1}`);
  assert.ok(Math.abs(p2 - 0.6 * 0.6) < 0.04, `2º: ${p2}`);
  assert.equal(p3, 0, 'no 3º não vira: morre');
});

teste('virou zumbi: sai dos aliados, vira zumbi com o nome, mais forte, de frente pro herói, e avisa', () => {
  const [j, a] = comSalvo(2, 'Bia'), ev = ouvir(j);
  j.rng.chance = () => true;
  quarteiraoDosSalvos(j);
  assert.ok(!j.aliados.includes(a));
  const z = j.zumbis.at(-1);
  assert.equal(z.nome, 'Bia');
  assert.equal(z.roupa, 2);
  assert.ok(ev.some(e => e.t === 'aliado_virou' && e.nome === 'Bia'));
});

teste('não virou: morre no 3º quarteirão ou ao chegar no lugar (fica o corpo)', () => {
  const [j, a] = comSalvo(3, 'Caio'), ev = ouvir(j);
  j.rng.chance = () => false;
  quarteiraoDosSalvos(j); quarteiraoDosSalvos(j);
  assert.ok(j.aliados.includes(a), 'ainda vivo no 2º');
  quarteiraoDosSalvos(j);
  assert.ok(!j.aliados.includes(a));
  assert.ok(j.figurantes.some(f => f.morto && f.nome === 'Caio'));
  assert.ok(ev.some(e => e.t === 'aliado_morreu'));
  const [k, b] = comSalvo(4, 'Duda');
  salvosChegaram(k);
  assert.ok(!k.aliados.includes(b));
  assert.ok(k.figurantes.some(f => f.morto && f.nome === 'Duda'));
});

teste('os aliados normais (de presente) não são afetados pela infecção', () => {
  const j = novo(5);
  j.addAliado('sobrevivente', 3, { nick: 'fã', id: 'x' });
  j.rng.chance = () => true;
  for (let q = 0; q < 4; q++) quarteiraoDosSalvos(j);
  salvosChegaram(j);
  assert.equal(j.aliados.length, 1);
});

console.log(`\n${ok} testes ok`);
