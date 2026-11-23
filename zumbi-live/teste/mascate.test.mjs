// Testes do Barganha (core/mascate.js: comprar, vender, trocar, a IA e a grana) e da infecção de quem é salvo
// num encontro (core/encontros.js: 40% / 60% / morre no 3º quarteirão ou na chegada). Rodar:  node teste/mascate.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { MASCATE, aparecerMascate, montarOfertas, abrirNegocio, decidirMascate, escolhaMascateIA, talvezMascate } from '../public/js/core/mascate.js';
import { ENCONTROS, quarteiraoDosSalvos, salvosChegaram } from '../public/js/core/encontros.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;
const ouvir = j => { const ev = []; const e0 = j.emit.bind(j); j.emit = (t, d) => { ev.push({ t, ...d }); return e0(t, d); }; return ev; };
const novo = (seed = 1, classe = 'bombeiro') => new Jogo({ seed, classe, cena: 0 });
// abre a rodada com o Barganha do lado do herói e devolve as opções da votação
const negocio = j => { if (!j.mascate) assert.ok(aparecerMascate(j), 'achou uma esquina livre'); abrirNegocio(j); return j.voto.opcoes; };
const escolher = (j, tipo, id) => { const op = j.voto.opcoes.find(o => o.oferta.tipo === tipo && (!id || o.oferta.id === id)); assert.ok(op, `tem ${tipo} ${id || ''}`); decidirMascate(j, op.id, { votos: {}, auto: false }); return op.oferta; };

console.log('O Barganha');

teste('começa com a grana inicial; no modo antigo (sem sobrevivência) não tem Barganha nem grana', () => {
  assert.equal(novo().hero.grana, MASCATE.granaInicial);
  const v = new Jogo({ seed: 1, classe: 'bombeiro', sobrevivencia: false });
  assert.equal(v.hero.grana, 0);
  v.stats.quarteiroes = 9;
  assert.equal(talvezMascate(v), false);
});

teste('aparece numa esquina livre do cruzamento da frente, com o barril, e avisa (som)', () => {
  for (let seed = 1; seed <= 10; seed++) {
    const j = novo(seed), ev = ouvir(j), m = aparecerMascate(j);
    assert.ok(m, `seed ${seed}`);
    assert.ok(j.livre(m.x, m.y));
    const no = j.city.nodePos(j.rota.alvo.i, j.rota.alvo.j);
    assert.ok(Math.abs(Math.abs(m.x - no.x) - 1.9) < 1e-9 && Math.abs(Math.abs(m.y - no.y) - 1.9) < 1e-9, 'na esquina');
    assert.ok(ev.some(e => e.t === 'mascate' && e.fase === 'chegou'));
  }
});

teste('não aparece antes do 2º quarteirão, nem com encontro, nem logo depois da última visita', () => {
  const j = novo(3);
  j.rng.chance = () => true;
  j.stats.quarteiroes = 1; assert.equal(talvezMascate(j), false);
  j.stats.quarteiroes = 3; j.encontro = { fase: 'votando' }; assert.equal(talvezMascate(j), false);
  j.encontro = null; j.mascateUltimo = j.t - 10; assert.equal(talvezMascate(j), false);
  j.mascateUltimo = j.t - MASCATE.intervalo - 1; assert.equal(talvezMascate(j), true);
});

teste('as ofertas: 2 compras + (vender ou trocar, se tiver o que) + seguir, sempre nas posições 1 a 4', () => {
  for (let seed = 1; seed <= 20; seed++) {
    const j = novo(seed);
    if (seed % 2) j.guardarNaMochila(35, null, 'kit');
    const ofs = montarOfertas(j);
    assert.ok(ofs.length >= 3 && ofs.length <= 4);
    assert.equal(ofs.filter(o => o.tipo === 'comprar').length, 2);
    assert.equal(ofs.at(-1).tipo, 'seguir');
    if (seed % 2) assert.ok(ofs.some(o => o.tipo === 'vender' || o.tipo === 'trocar'), 'com cura na mochila: vende ou troca');
    for (const o of ofs.filter(o => o.tipo === 'comprar')) { const c = MASCATE.catalogo.find(x => x.id === o.id); assert.ok(!c.so || c.so(j.hero), `${o.id} faz sentido`); }
  }
});

teste('vida baixa: o kit ou o remédio vem entre as ofertas; sem arma de fogo: a pistola', () => {
  let cura = 0, pistola = 0;
  for (let seed = 1; seed <= 20; seed++) {
    const j = novo(seed); j.hero.vida = j.hero.vidaMax * 0.3; j.hero.grana = 40;
    if (montarOfertas(j).some(o => o.id === 'kit' || o.id === 'remedio')) cura++;
    const k = novo(seed, 'policial'); k.hero.arma = null; k.hero.grana = 40;
    if (montarOfertas(k).some(o => o.id === 'pistola')) pistola++;
  }
  assert.ok(cura >= 18, `cura ${cura}/20`);
  assert.ok(pistola >= 16, `pistola ${pistola}/20`);
});

teste('comprar: desconta a grana, entrega a coisa, fala e toca a caixa; sem grana não leva nada', () => {
  const j = novo(4), ev = ouvir(j);
  j.hero.vida = j.hero.vidaMax * 0.3; j.hero.grana = 100;
  negocio(j);
  const op = j.voto.opcoes.find(o => o.oferta.tipo === 'comprar' && (o.oferta.id === 'kit' || o.oferta.id === 'remedio'));
  assert.ok(op);
  const vida0 = j.hero.vida, moch0 = j.hero.mochila.length;
  decidirMascate(j, op.id, { votos: {}, auto: false });
  assert.equal(j.hero.grana, 100 - op.oferta.preco);
  assert.ok(op.oferta.id === 'kit' ? j.hero.vida > vida0 || j.hero.mochila.length > moch0 : j.hero.estados.tem('medicado'), 'recebeu');
  assert.ok(ev.some(e => e.t === 'mascate' && e.fase === 'comprar'));
  assert.ok(ev.some(e => e.t === 'grana' && e.valor === -op.oferta.preco));
  assert.ok(ev.some(e => e.t === 'decisao' && e.mascate && e.previsao.rotulo === 'NEGÓCIO FECHADO'));
  // segunda rodada: oferece de novo
  assert.equal(j.mascate.fase, 'esperando');
  // sem grana
  j.mascate.proximaT = 0; j.hero.grana = 0;
  negocio(j);
  const caro = j.voto.opcoes.find(o => o.oferta.tipo === 'comprar');
  decidirMascate(j, caro.id, { votos: {}, auto: false });
  assert.equal(j.hero.grana, 0);
  assert.ok(MASCATE.falas.tchau.includes(j.mascate.fala) || MASCATE.falas.semGrana.includes(j.mascate.fala));
  assert.equal(j.mascate.fase, 'indo', 'sem negócio: ele vai embora');
});

teste('comprar arma: a pistola chega com balas; a metralhadora vira a arma do herói', () => {
  const j = novo(5, 'policial'); j.hero.arma = null; j.hero.grana = 200;
  aparecerMascate(j);
  j.voto = null; abrirNegocio(j);
  // força as ofertas pra testar a entrega
  const pist = MASCATE.catalogo.find(c => c.id === 'pistola'), lend = MASCATE.catalogo.find(c => c.id === 'lendaria');
  j.voto.opcoes[0].oferta = { tipo: 'comprar', ...pist }; j.voto.opcoes[1].oferta = { tipo: 'comprar', ...lend };
  decidirMascate(j, j.voto.opcoes[0].id, { votos: {}, auto: false });
  for (let k = 0; k < 30; k++) j.update(DT);
  assert.equal(j.hero.arma, 'pistola');
  assert.ok(j.hero.municao > 0);
  j.mascate.proximaT = 0; abrirNegocio(j);
  j.voto.opcoes[0].oferta = { tipo: 'comprar', ...lend };
  decidirMascate(j, j.voto.opcoes[0].id, { votos: {}, auto: false });
  assert.equal(j.hero.arma, 'metralhadora');
  assert.equal(j.hero.grana, 200 - pist.preco - lend.preco);
});

teste('vender: a cura da mochila sai e a grana entra; trocar: 1 cura vira energético + vitaminas', () => {
  let vendeu = 0, trocou = 0;
  for (let seed = 1; seed <= 16 && (!vendeu || !trocou); seed++) {
    const j = novo(seed), ev = ouvir(j);
    j.guardarNaMochila(35, null, 'kit');
    negocio(j);
    const o = j.voto.opcoes.find(x => x.oferta.tipo === 'vender' || x.oferta.tipo === 'trocar').oferta;
    const g0 = j.hero.grana;
    decidirMascate(j, j.voto.opcoes.find(x => x.oferta === o).id, { votos: {}, auto: false });
    assert.equal(j.hero.mochila.length, 0, 'a cura saiu da mochila');
    if (o.tipo === 'vender') { vendeu++; assert.equal(j.hero.grana, g0 + MASCATE.compraDoHeroi.kit); assert.ok(ev.some(e => e.t === 'mascate' && e.fase === 'vender')); }
    else { trocou++; assert.equal(j.hero.grana, g0); assert.ok(ev.some(e => e.t === 'mascate' && e.fase === 'trocar')); }
  }
  assert.ok(vendeu && trocou, `vendeu ${vendeu}, trocou ${trocou}`);
});

teste('vender a arma achada: volta pra arma da classe e ganha R$ 20', () => {
  const j = novo(2, 'bombeiro');
  j.trocarArma('escopeta', null);
  const ofs = montarOfertas(j);
  const v = ofs.find(o => o.tipo === 'vender');
  assert.ok(v && v.id === 'arma');
  negocio(j);
  const g0 = j.hero.grana;
  escolher(j, 'vender', 'arma');
  assert.notEqual(j.hero.arma, 'escopeta');
  assert.equal(j.hero.grana, g0 + MASCATE.compraDoHeroi.arma);
});

teste('IA (ninguém votou): compra o que precisa se tiver grana; duro, vende; senão segue', () => {
  const j = novo(6); j.hero.vida = j.hero.vidaMax * 0.3; j.hero.grana = 100;
  negocio(j);
  const id = escolhaMascateIA(j, j.voto.opcoes), o = j.voto.opcoes.find(x => x.id === id).oferta;
  assert.ok(o.tipo === 'comprar' && (o.id === 'kit' || o.id === 'remedio'), `comprou ${o.id}`);
  const k = novo(6); k.hero.grana = 0; k.guardarNaMochila(35, null, 'kit');
  k.rng.chance = p => p !== 0.5 && Math.random() < p;   // (sem troca: força o "vender")
  negocio(k);
  const o2 = k.voto.opcoes.find(x => x.id === escolhaMascateIA(k, k.voto.opcoes)).oferta;
  assert.equal(o2.tipo, 'vender');
  const s = novo(6); s.hero.grana = 0;
  negocio(s);
  assert.equal(s.voto.opcoes.find(x => x.id === escolhaMascateIA(s, s.voto.opcoes)).oferta.tipo, 'seguir');
});

teste('no jogo: o herói vai até o Barganha, a votação abre, fecha sozinha e ele vai embora', () => {
  const j = novo(7), ev = ouvir(j);
  for (let k = 0; k < 30 * 4; k++) j.update(DT);
  if (j.voto) j.voto = null;
  aparecerMascate(j);
  let abriu = false;
  for (let k = 0; k < 30 * 150 && j.mascate; k++) {
    j.update(DT);
    if (j.voto?.mascate) abriu = true;
  }
  assert.ok(abriu, 'abriu a votação do Barganha');
  assert.ok(ev.some(e => e.t === 'decisao' && e.mascate));
  assert.equal(j.mascate, null, 'foi embora');
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
