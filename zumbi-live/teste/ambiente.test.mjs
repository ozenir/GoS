// Testes dos perigos do ambiente.   Rodar:  node teste/ambiente.test.mjs
import assert from 'node:assert/strict';
import { AMBIENTE, efeitoDoAmbiente, faixaLivre, ligado, machuca } from '../public/js/core/ambiente.js';
import { STATUS } from '../public/js/core/status.js';
import { TIPOS_DANO } from '../public/js/core/dano.js';
import { City, BAIRROS } from '../public/js/core/city.js';

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
console.log(`\n${ok} testes passaram.`);
