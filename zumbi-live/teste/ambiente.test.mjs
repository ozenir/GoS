// Testes dos perigos do ambiente.   Rodar:  node teste/ambiente.test.mjs
import assert from 'node:assert/strict';
import { AMBIENTE, efeitoDoAmbiente, faixaLivre, ligado, machuca } from '../public/js/core/ambiente.js';
import { STATUS } from '../public/js/core/status.js';
import { TIPOS_DANO } from '../public/js/core/dano.js';
import { City, BAIRROS } from '../public/js/core/city.js';
import { Jogo } from '../public/js/core/jogo.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const semSorte = { next: () => 0 };          // todo sorteio dá certo
const zona = (tipo, extra = {}) => ({ tipo, x0: 0, y0: 0, x1: 2, y1: 2, ...extra });

teste('todo perigo tem nome e emoji; tipos de dano e status existem', () => {
  for (const [id, A] of Object.entries(AMBIENTE)) {
    assert.ok(A.nome && A.emoji, id);
    if (A.tipoDano) assert.ok(TIPOS_DANO[A.tipoDano], `${id}: tipo de dano ${A.tipoDano}`);
    for (const s of A.status || []) assert.ok(STATUS[s.id], `${id}: status ${s.id}`);
  }
  for (const B of Object.values(BAIRROS)) for (const [t] of B.perigos) assert.ok(AMBIENTE[t], t);
});
teste('fora da zona não acontece nada', () => {
  const r = efeitoDoAmbiente({ x: 5, y: 5 }, [zona('arame')], 0.1, 0, semSorte);
  assert.equal(r.lentidao, 1); assert.equal(r.danos.length, 0);
});
teste('arame: golpe ao entrar, sangramento e lentidão', () => {
  const e = { x: 1, y: 1 };
  const r = efeitoDoAmbiente(e, [zona('arame')], 0.1, 0, semSorte);
  assert.equal(r.danos[0].valor, AMBIENTE.arame.golpe); assert.equal(r.danos[0].golpe, true);
  assert.equal(r.status[0].id, 'sangramento');
  assert.equal(r.lentidao, AMBIENTE.arame.lentidao);
  assert.equal(r.entrou.length, 1);
});
teste('golpe se repete só depois do intervalo', () => {
  const e = { x: 1, y: 1 }, zs = [zona('vidro')];
  efeitoDoAmbiente(e, zs, 0.1, 0, semSorte);
  assert.equal(efeitoDoAmbiente(e, zs, 0.5, 0, semSorte).danos.length, 0);
  assert.equal(efeitoDoAmbiente(e, zs, 1.0, 0, semSorte).danos.length, 1);
});
teste('fogo: dano contínuo por segundo e queimadura', () => {
  const r = efeitoDoAmbiente({ x: 1, y: 1 }, [zona('fogo')], 0.5, 0, semSorte);
  assert.ok(Math.abs(r.danos[0].valor - AMBIENTE.fogo.dps * 0.5) < 1e-9);
  assert.ok(r.status.some(s => s.id === 'queimando'));
});
teste('água deixa lento e apaga fogo; lama e entulho só atrasam', () => {
  const r = efeitoDoAmbiente({ x: 1, y: 1 }, [zona('agua')], 0.1, 0, semSorte);
  assert.equal(r.apagaFogo, true); assert.equal(r.danos.length, 0);
  assert.equal(machuca('lama'), false); assert.equal(machuca('entulho'), false); assert.equal(machuca('fogo'), true);
});
teste('dois perigos juntos: vale a maior lentidão', () => {
  const r = efeitoDoAmbiente({ x: 1, y: 1 }, [zona('lama'), zona('arame')], 0.1, 0, semSorte);
  assert.equal(r.lentidao, Math.min(AMBIENTE.lama.lentidao, AMBIENTE.arame.lentidao));
});
teste('fios piscam: ficam desligados parte do tempo e aí não machucam', () => {
  const z = zona('fios', { semente: 0 });
  let liga = 0, desliga = 0;
  for (let t = 0; t < 10; t += 0.1) (ligado(z, t) ? liga++ : desliga++);
  assert.ok(liga > 0 && desliga > 0);
  let t = 0; while (ligado(z, t)) t += 0.1;
  assert.equal(efeitoDoAmbiente({ x: 1, y: 1 }, [z], 0.1, t, semSorte).danos.length, 0);
});
teste('desvio: acha a faixa livre da rua; sem saída, atravessa (0)', () => {
  // rua indo pra +x no meio (y = 2.5); perigo cobrindo o meio da rua
  const meio = [{ tipo: 'arame', x0: 3, y0: 1.5, x1: 5, y1: 3.5 }];
  const lado = faixaLivre(0, 2.5, 1, 0, meio);
  assert.notEqual(lado, 0);
  const todaRua = [{ tipo: 'arame', x0: 3, y0: 0, x1: 5, y1: 5 }];
  assert.equal(faixaLivre(0, 2.5, 1, 0, todaRua), 0);
  assert.equal(faixaLivre(0, 2.5, 1, 0, []), 0);
});
teste('a cidade coloca perigos nos trechos de rua conforme o bairro', () => {
  const c = new City(7); let n = 0;
  for (let i = -8; i < 8; i++) for (let j = -8; j < 8; j++) for (const z of c.segment('h', i, j).zonas) {
    n++; assert.ok(BAIRROS[c.bairro(i, j)].perigos.some(([t]) => t === z.tipo));
    assert.ok(z.x1 > z.x0 && z.y1 > z.y0);
  }
  assert.ok(n > 10);
});
// Herói parado dentro de um perigo por "seg" segundos: quanto de vida perde (sem esquiva, colete nem invencível)
function danoNoHeroiEm(tipo, seg, extra = {}) {
  const j = new Jogo({ seed: 9, classe: 'policial' });
  const h = j.hero;
  j.zumbis = []; h.invT = 0; h.attr.base.esquiva = 0;
  j.zonas = [{ tipo, x0: h.x - 1, y0: h.y - 1, x1: h.x + 1, y1: h.y + 1, t: 99, semente: 1, ...extra }];
  j.atualizarZonas(0);
  const v0 = h.vida, DT = 1 / 30;
  for (let i = 0; i < seg / DT; i++) {
    j.ambienteNoHeroi(DT);
    const st = h.estados.update(DT);
    for (const d of st.danos) j.ferirHeroi(d.valor, null, 'teste', d.tipo, true);
    h.vida = Math.max(h.vida, 1); h.colete = 0;
  }
  return v0 - h.vida;
}

// Mede com a redução e sem ela (mesma semente, mesmo sorteio) e compara
function razao(tipo, seg, extra) {
  const noHeroi = AMBIENTE[tipo].noHeroi, multQ = STATUS.queimando.multNoHeroi;
  const reduzido = danoNoHeroiEm(tipo, seg, extra);
  AMBIENTE[tipo].noHeroi = 1; STATUS.queimando.multNoHeroi = undefined;
  const cheio = danoNoHeroiEm(tipo, seg, extra);
  AMBIENTE[tipo].noHeroi = noHeroi; STATUS.queimando.multNoHeroi = multQ;
  return { reduzido, cheio, r: cheio / reduzido };
}

teste('fogo machuca o herói 4× menos (chão e queimando)', () => {
  const { reduzido, cheio, r } = razao('fogo', 3);
  assert.ok(Math.abs(r - 4) < 0.3, `cheio ${cheio.toFixed(1)} · agora ${reduzido.toFixed(1)} (${r.toFixed(2)}×)`);
});

teste('cacos de vidro machucam o herói 6× menos (corte e sangramento)', () => {
  const { reduzido, cheio, r } = razao('vidro', 5);
  assert.ok(Math.abs(r - 6) < 0.4, `cheio ${cheio.toFixed(1)} · agora ${reduzido.toFixed(1)} (${r.toFixed(2)}×)`);
});

teste('armadilha de vidro do presente (sangramento duplo) também 6× menor', () => {
  const { reduzido, cheio, r } = razao('vidro', 5, { lentoAoEntrar: 5 });
  assert.ok(Math.abs(r - 6) < 0.4, `cheio ${cheio.toFixed(1)} · agora ${reduzido.toFixed(1)} (${r.toFixed(2)}×)`);
});

teste('zumbi continua levando o dano cheio de fogo (molotov e lança-chamas não ficam fracos)', () => {
  const j = new Jogo({ seed: 9, classe: 'policial' });
  const z = j.criarZumbi('comum', j.hero.x + 8, j.hero.y, null, { nascendo: 0 });
  j.aplicarStatus(z, 'queimando');
  const v0 = z.vida;
  const st = z.estados.update(1);
  assert.ok(Math.abs(st.danos[0].valor - 10) < 1e-9);
  assert.equal(v0, z.vida);
});

teste('sangramento de mordida no herói não fica fraco por causa do vidro', () => {
  const j = new Jogo({ seed: 9, classe: 'policial' });
  const h = j.hero;
  j.aplicarStatus(h, 'sangramento', { mult: 1 / 6 });
  j.aplicarStatus(h, 'sangramento');
  assert.equal(h.estados.lista.get('sangramento').mult, 1);
});

/* ---------------- cacos de vidro: o herói não se cura ---------------- */
// jogo com o herói parado em cima de uma zona de vidro (e nada mais em volta)
const noVidro = () => {
  const j = new Jogo({ seed: 9, classe: 'enfermeira' });
  j.zumbis = []; j.spawnT = 999; j.cotaRua = 0; j.protecao = 0;
  const h = j.hero;
  j.zonas = [{ tipo: 'vidro', x0: h.x - 1, y0: h.y - 1, x1: h.x + 1, y1: h.y + 1, t: 999 }];
  j.zonasHeroi = j.zonas;
  j.ambienteNoHeroi(0.01);
  return j;
};

teste('pisando nos cacos de vidro: sem regeneração nem cura de status', () => {
  const j = noVidro(), h = j.hero;
  assert.ok(h.noVidro);
  h.attr.addMod({ id: 'teste-regen', attr: 'regen', soma: 10 });
  j.aplicarStatus(h, 'regenerando', { pilhas: 3 });
  h.vida = h.vidaMax * 0.5;
  const x = h.x, y = h.y;
  for (let i = 0; i < 60; i++) { j.atualizarHeroi(1 / 30); h.x = x; h.y = y; j.ambienteNoHeroi(1 / 30); }   // fica em cima do vidro
  assert.ok(h.vida <= h.vidaMax * 0.5 + 1e-9, `curou no vidro: ${h.vida}`);
});

teste('cura de presente no vidro fica guardada e sai quando ele pisa fora', () => {
  const j = noVidro(), h = j.hero;
  h.vida = h.vidaMax * 0.4;
  j.curar(14, { nick: 'Ana' });
  assert.equal(h.vida, h.vidaMax * 0.4, 'não curou no vidro');
  assert.equal(h.curaGuardada, 14);
  j.zonasHeroi = []; j.zonas = [];
  j.ambienteNoHeroi(0.01);
  assert.ok(!h.noVidro && h.curaGuardada === 0);
  assert.ok(h.vida > h.vidaMax * 0.4, 'curou ao sair');
});

teste('no vidro a mochila espera; mas se a vida zerar, o kit da mochila salva', () => {
  const j = noVidro(), h = j.hero;
  h.mochila = [{ valor: 35, quem: null }];
  h.vida = h.vidaMax * 0.2;
  j.atualizarHeroi(1 / 30);
  assert.equal(h.mochila.length, 1, 'não usou no vidro');
  h.folegoCd = 1e9; h.invT = 0;
  j.ferirHeroi(h.vida + 5, null, 'teste', 'sangramento');
  assert.ok(!j.caido && h.vida > 0 && h.mochila.length === 0, 'a mochila salvou');
});

teste('vida em 30% ou menos em cima do vidro: sai na hora rumo ao objetivo', () => {
  const j = noVidro(), h = j.hero;
  h.vida = h.vidaMax * 0.28; h.invT = 999;
  let fora = false;
  for (let i = 0; i < 60 && !fora; i++) { j.update(1 / 30); fora = !h.noVidro; }
  assert.ok(fora, 'saiu do vidro em menos de 2 s');
});

teste('vida em 30% ou menos: desvia do vidro que está no caminho', () => {
  const pisou = vida => {
    const j = new Jogo({ seed: 9, classe: 'policial' });
    j.zumbis = []; j.spawnT = 999; j.cotaRua = 0; j.protecao = 0;
    const h = j.hero; h.invT = 999;
    const [dx, dy] = [[0, -1], [1, 0], [0, 1], [-1, 0]][j.rota.dir];
    // uma faixa de vidro de 1 casa de largura, 2 casas à frente, cobrindo o meio da rua
    const cx = h.x + dx * 2.5, cy = h.y + dy * 2.5;
    j.zonas = [{ tipo: 'vidro', x0: cx - (dx ? 0.5 : 0.6), x1: cx + (dx ? 0.5 : 0.6), y0: cy - (dy ? 0.5 : 0.6), y1: cy + (dy ? 0.5 : 0.6), t: 999 }];
    let vezes = 0;
    for (let i = 0; i < 150; i++) { h.vida = h.vidaMax * vida; j.update(1 / 30); if (h.noVidro) vezes++; }
    return vezes;
  };
  assert.equal(pisou(0.25), 0, 'com vida baixa não pisou');
});

console.log(`\n${ok} testes passaram.`);
