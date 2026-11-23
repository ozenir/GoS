// Testes da viagem pelo mapa (core/mapa.js), dos itens com propósito dos prédios (room.js) e dos encontros no
// caminho (core/encontros.js). Rodar:  node teste/viagem.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { MAPA, CATEGORIAS, lugaresDaViagem, rotas, ruaLivre } from '../public/js/core/mapa.js';
import { ENCONTROS, criarEncontro, decidirEncontro } from '../public/js/core/encontros.js';
import { LOJAS } from '../public/js/core/room.js';
import { DIRS } from '../public/js/core/util.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;
const ouvir = j => { const ev = []; const e0 = j.emit.bind(j); j.emit = (t, d) => { ev.push({ t, ...d }); return e0(t, d); }; return ev; };
const semCena = (seed, classe = 'bombeiro') => new Jogo({ seed, classe, cena: 0 });

teste('o mapa oferece o lugar mais perto de cada necessidade (comida, cura, armas), a 2+ quarteirões, com rota livre', () => {
  for (let seed = 1; seed <= 12; seed++) {
    const j = semCena(seed), N = j.rota.alvo;
    const lugares = lugaresDaViagem(j.city, N, j.rng);
    assert.ok(lugares.length >= 3, `seed ${seed}: ${lugares.length} lugares`);
    for (const cat of Object.keys(CATEGORIAS)) assert.ok(lugares.some(l => l.categoria === cat), `seed ${seed}: falta ${cat}`);
    for (const l of lugares) {
      assert.ok(l.dist >= MAPA.distMin && l.dist <= MAPA.raio, `distância ${l.dist}`);
      // a rota passa só por ruas livres e termina no lugar
      let i = N.i, k = N.j;
      for (const d of l.dirs) { assert.ok(ruaLivre(j.city, i, k, d)); i += DIRS[d][0]; k += DIRS[d][1]; }
      assert.deepEqual([i, k], [l.i, l.j]);
      if (!l.praca) assert.equal(j.city.shopAt(l.i, l.j)?.tipo, l.tipo, 'a loja está lá');
    }
  }
});

teste('lugar visitado há pouco não aparece de novo no mapa', () => {
  const j = semCena(3), N = j.rota.alvo;
  const l = lugaresDaViagem(j.city, N, j.rng)[0];
  const depois = lugaresDaViagem(j.city, N, j.rng, MAPA, [l.i + ',' + l.j]);
  assert.ok(!depois.some(x => x.i === l.i && x.j === l.j));
});

teste('a votação de destino abre com o mapa; ninguém votou: a IA vai pro que o herói precisa', () => {
  let curaComVidaBaixa = 0, total = 0, arena = 0;
  for (let seed = 1; seed <= 16; seed++) {
    const j = semCena(seed);
    j.votoAbreT = 0;
    j.update(DT);
    assert.ok(j.voto?.mapa, 'votação do mapa');
    assert.ok(j.voto.opcoes.every(o => o.lugar && o.n >= 1 && o.n <= 4));
    j.hero.vida = j.hero.vidaMax * 0.2;
    const id = j.escolhaIA(j.voto.opcoes), o = j.voto.opcoes.find(x => x.id === id);
    total++; if (o.lugar.categoria === 'cura' || o.lugar.categoria === 'suprimentos') curaComVidaBaixa++;
    if (o.lugar.praca) arena++;
  }
  assert.ok(curaComVidaBaixa / total >= 0.75, `com a vida baixa vai buscar remédio ou comida (${curaComVidaBaixa}/${total})`);
  assert.ok(arena <= 1, 'e quase nunca pra arena');
});

teste('a viagem: o herói segue a rota sozinho e entra no lugar escolhido', () => {
  let chegou = 0;
  for (const seed of [2, 5, 9]) {
    const j = semCena(seed), ev = ouvir(j);
    j.hero.invT = 1e9;
    let escolhido = null, entrou = null;
    for (let i = 0; i < 400 / DT && !entrou; i++) {
      j.update(DT);
      for (const e of ev.splice(0)) {
        if (e.t === 'decisao' && e.lugar && !escolhido) escolhido = e.lugar;
        if (e.t === 'entrou_predio' && escolhido) entrou = e;
        if (e.t === 'arena' || (e.t === 'destino' && e.tipo === 'praca')) entrou = { tipo: 'praca' };
      }
    }
    assert.ok(escolhido, `seed ${seed}: escolheu`);
    assert.ok(entrou, `seed ${seed}: chegou`);
    if (entrou.tipo !== 'praca') assert.equal(entrou.nome, escolhido.nome);
    chegou++;
  }
  assert.equal(chegou, 3);
});

teste('itens com propósito: comida cura, energético acelera, vitaminas dão resistência, remédio regenera e cura a infecção', () => {
  const j = semCena(4), h = j.hero;
  h.vida = h.vidaMax * 0.5; const v0 = h.vida;
  j.pegar({ kind: 'comida', data: {}, quem: null });
  assert.ok(h.vida > v0);
  const vel = h.attr.get('velocidade'), def = h.attr.get('defesa');
  j.pegar({ kind: 'energetico', data: {}, quem: null }); assert.ok(h.attr.get('velocidade') > vel);
  j.pegar({ kind: 'vitamina', data: {}, quem: null }); assert.ok(h.attr.get('defesa') > def);
  j.aplicarStatus(h, 'infectado');
  j.pegar({ kind: 'remedio', data: {}, quem: null });
  assert.ok(!h.estados.tem('infectado') && h.estados.tem('medicado'));
  for (const L of Object.values(LOJAS)) assert.ok(L.oque, 'cada lugar diz o que tem');
});

teste('delegacia: quem não tem arma acha uma pistola com munição contada; acabou, volta pra arma dele', () => {
  const j = semCena(4, 'entregador'), h = j.hero;
  const data = j.armaDaDelegacia();
  assert.deepEqual(data, { arma: 'pistola', municao: 36 });
  j.pegar({ kind: 'arma', data, quem: null });
  assert.equal(h.arma, 'pistola'); assert.equal(h.municao, 36);
  h.municao = 1; h.tiroCd = 0;
  j.criarZumbi('comum', h.x + 2, h.y, null, { nascendo: 0 });
  for (let i = 0; i < 30 && h.arma; i++) { h.tiroCd = 0; j.combate(DT); }
  assert.equal(h.arma, null, 'sem bala: volta pro taco');
  assert.equal(j.armaDaDelegacia().arma, 'pistola');
  const p = semCena(4, 'policial');
  assert.equal(p.armaDaDelegacia().arma, 'escopeta', 'o policial já tem pistola: acha uma escopeta');
});

teste('encontro: alguém pede ajuda numa rua do lado; os zumbis dela não contam pra limpar a área', () => {
  const j = semCena(6), ev = ouvir(j);
  j.zumbis = []; j.spawnT = 1e9;
  j.viagem = { lugar: { i: 9, j: 9 }, dirs: [] };
  const e = criarEncontro(j);
  assert.ok(e, 'criou');
  assert.ok(j.voto?.encontro && j.voto.opcoes.map(o => o.nome).join() === 'AJUDAR,SEGUIR');
  assert.ok(e.zumbis.length >= ENCONTROS.zumbis[0] && e.zumbis.every(z => z.devorando === e.pessoa));
  assert.equal(j.zumbisNaArea(), 0, 'parados em cima dela: não contam');
  assert.ok(ev.some(x => x.t === 'encontro'));
});

teste('seguir: a pessoa fica pra trás e, uns quarteirões depois, volta como zumbi com o nome dela', () => {
  const j = semCena(6), ev = ouvir(j);
  j.zumbis = []; j.spawnT = 1e9;
  j.viagem = { lugar: { i: 9, j: 9 }, dirs: [] };
  const e = criarEncontro(j), nome = e.nome;
  j.voto.fechar(() => 'frente', j.rng);
  decidirEncontro(j, 'frente', { votos: 0, auto: true });
  assert.equal(j.perdidos.length, 1);
  j.andouQuarteirao(ENCONTROS.viraZumbi);
  for (let i = 0; i < 7 / DT; i++) j.update(DT);
  assert.ok(ev.some(x => x.t === 'voltou_zumbi' && x.nome === nome), 'voltou');
  assert.ok(j.zumbis.some(z => z.nome === nome && z.ex));
});

teste('ajudar: o herói vai até a pessoa, enfrenta os zumbis e ela agradece (vira aliado ou dá um item)', () => {
  let salvos = 0;
  for (const seed of [6, 7, 8, 10]) {
    const j = semCena(seed), ev = ouvir(j), h = j.hero;
    j.zumbis = []; j.spawnT = 1e9; h.invT = 1e9;
    j.viagem = { lugar: { i: 9, j: 9 }, dirs: [] };
    const e = criarEncontro(j);
    if (!e) continue;
    j.voto.fechar(() => 'esquerda', j.rng);
    decidirEncontro(j, 'esquerda', { votos: 0, auto: true });
    for (let i = 0; i < 60 / DT && j.encontro; i++) j.update(DT);
    const s = ev.find(x => x.t === 'encontro_salvo');
    if (s) { salvos++; assert.ok(ENCONTROS.recompensas.some(([r]) => r === s.recompensa)); }
  }
  assert.ok(salvos >= 3, `salvou ${salvos}`);
});

teste('quem atira não mira nos zumbis do encontro, a não ser que decidam ajudar', () => {
  const j = semCena(6, 'policial'), h = j.hero;
  j.zumbis = []; j.spawnT = 1e9;
  j.viagem = { lugar: { i: 9, j: 9 }, dirs: [] };
  const e = criarEncontro(j);
  for (const z of e.zumbis) { z.x = h.x + 3; z.y = h.y; }
  assert.equal(j.escolherAlvo(6.5), null);
  e.fase = 'ajudando';
  assert.ok(j.escolherAlvo(6.5));
});

console.log(`\n${ok} testes passaram.`);
