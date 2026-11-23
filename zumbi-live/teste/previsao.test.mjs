// Testes da previsão do destino (o resultado da votação conta o que tem lá).
// Rodar:  node teste/previsao.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { preverDestino } from '../public/js/core/previsao.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;

teste('a previsão bate com o que acontece na rua (o caminho é sorteado quando a votação fecha)', () => {
  let conferidos = 0;
  for (let seed = 1; seed <= 6; seed++) {
    const j = new Jogo({ seed, classe: 'bombeira' });
    j.hero.invT = 1e9;
    const ev = []; const e0 = j.emit.bind(j); j.emit = (t, d) => { ev.push({ t, ...d }); return e0(t, d); };
    let prev = null;
    const meta = conferidos + 3;
    for (let i = 0; i < 300 / DT && conferidos < meta; i++) {
      j.update(DT);
      for (const e of ev.splice(0)) {
        if (e.t === 'decisao') prev = { prep: { caminho: e.caminho }, op: e.id, previsao: e.previsao };   // (o caminho sorteado na hora da decisão)
        if (e.t === 'caminho' && prev?.prep?.caminho) {
          assert.equal(e.tipo, prev.prep.caminho.tipo, `seed ${seed}: tipo`);
          if (e.tipo === 'perigoso') {
            assert.equal(e.perigo, prev.prep.caminho.perigo, `seed ${seed}: perigo`);
            assert.ok(prev.previsao.itens.some(t => t.toLowerCase().includes(e.nome.toLowerCase())), `a previsão fala do ${e.nome}`);
            assert.notEqual(prev.previsao.risco, 'tranquilo');
          }
          conferidos++; prev = null;
        }
      }
    }
  }
  assert.ok(conferidos >= 8, `conferidos: ${conferidos}`);
});

const falso = (vida, extra = {}) => ({ hero: { vida, vidaMax: 100 }, stats: { quarteiroes: 1 }, proxHordaQ: 5, A: { hordaCadaQuarteiroes: 5 }, cfg: { likesPor: 300 }, likes: 0, ...extra });

teste('rua livre: tranquilo; com pouca vida avisa que dá pra respirar', () => {
  const p = preverDestino(falso(90), { id: 'frente' }, { praia: false, caminho: { tipo: 'livre' } });
  assert.equal(p.risco, 'tranquilo');
  assert.ok(preverDestino(falso(30), { id: 'frente' }, { praia: false, caminho: { tipo: 'livre' } }).itens.some(t => t.includes('respirar')));
});

teste('perigo com pouca vida: risco de morte', () => {
  const op = { id: 'frente' }, prep = { praia: false, caminho: { tipo: 'perigoso', perigo: 'corredores' } };
  assert.equal(preverDestino(falso(80), op, prep).risco, 'perigoso');
  assert.equal(preverDestino(falso(20), op, prep).risco, 'morte');
  assert.equal(preverDestino(falso(40), op, { praia: false, caminho: { tipo: 'perigoso', perigo: 'chefe' } }).risco, 'morte');
});

teste('horda gigante no próximo quarteirão e suprimentos quase caindo aparecem', () => {
  const p = preverDestino(falso(90, { stats: { quarteiroes: 4 }, likes: 280 }), { id: 'esquerda' }, { praia: false, caminho: { tipo: 'livre' } });
  assert.ok(p.itens.some(t => t.includes('horda gigante')));
  assert.ok(p.itens.some(t => t.includes('suprimentos')));
  assert.equal(p.risco, 'perigoso');
});

teste('loja: conta os zumbis e o que tem lá dentro; rua sem saída: baú e emboscada', () => {
  const p = preverDestino(falso(90), { id: 'entrar', shop: { tipo: 'farmacia', nome: 'Farmácia', emoji: '💊', risco: 1 } });
  assert.ok(p.itens.some(t => t.includes('zumbis lá dentro')) && p.itens.some(t => t.includes('pode ter') && t.includes('remédios')));
  const b = preverDestino(falso(90), { id: 'direita', semSaida: true });
  assert.ok(b.itens.some(t => t.includes('baú')) && b.itens.some(t => t.includes('emboscada')));
});

console.log(`\n${ok} testes passaram.`);
