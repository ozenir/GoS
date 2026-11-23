// Testes da cidade viva (core/cenario.js e city.js → CAOS): o caos crescendo com a distância, veículos de
// emergência passando com sirene, gente nas janelas, casas no bairro residencial e os nomes das ruas.
// Rodar:  node teste/cenario.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { City, CAOS, CASAS_NO_RESIDENCIAL } from '../public/js/core/city.js';
import { passarViatura, aparecerNaJanela, CENARIO } from '../public/js/core/cenario.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;
const ouvir = j => { const ev = []; const e0 = j.emit.bind(j); j.emit = (t, d) => { ev.push({ t, ...d }); return e0(t, d); }; return ev; };

teste('o caos cresce com a distância do começo (e com o desgaste)', () => {
  const c = new City(5);
  assert.ok(c.caos(0, 0) < c.caos(3, 2) && c.caos(3, 2) < c.caos(8, 6));
  const antes = c.caos(2, 2); c.desgaste = 1; assert.ok(c.caos(2, 2) > antes);
  assert.ok(c.caos(50, 50) <= 1);
});

teste('longe do começo aparecem viaturas, ambulâncias e bombeiros parados, lixeiras pegando fogo e ruas interditadas', () => {
  const c = new City(9); c.desgaste = 1;
  let emerg = 0, lixFogo = 0, policia = 0, tipos = new Set();
  for (let i = 4; i < 14; i++) for (let j = 4; j < 14; j++) for (const ax of ['h', 'v']) {
    const s = c.segment(ax, i, j);
    for (const p of s.props) { if (p.emergencia) { emerg++; tipos.add(p.emergencia); } if (p.tipo === 'lixeira' && p.fogo) lixFogo++; }
    if (s.bloqueio?.policia) policia++;
  }
  assert.ok(emerg > 20 && tipos.size === 3, `veículos parados: ${emerg} (${[...tipos]})`);
  assert.ok(lixFogo > 20, `lixeiras pegando fogo: ${lixFogo}`);
  assert.ok(policia > 0, 'alguma interdição da polícia');
  // perto do começo, calmo (sem veículo de emergência nem lixeira pegando fogo; carro em chamas é do desgaste, não do caos)
  for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) for (const ax of ['h', 'v']) assert.ok(!c.segment(ax, i, j).props.some(p => p.emergencia || (p.tipo === 'lixeira' && p.fogo)));
});

teste('veículo de emergência passa com a sirene na rua do lado, longe do herói, e atropela zumbi no caminho', () => {
  const j = new Jogo({ seed: 4, classe: 'bombeiro', cena: 0 }), ev = ouvir(j), h = j.hero;
  j.zumbis = []; j.spawnT = 1e9;
  const v = passarViatura(j, 'ambulancia');
  assert.ok(v && ev.some(e => e.t === 'viatura_passando' && e.tipo === 'ambulancia'));
  // a rota do veículo é perpendicular à do herói e o cruza longe dele
  const [hx, hy] = [h.x, h.y];
  let menor = Infinity;
  for (let t = 0; t <= v.dur; t += 0.1) menor = Math.min(menor, Math.hypot(v.x + v.dx * v.vel * t - hx, v.y + v.dy * v.vel * t - hy));
  assert.ok(menor >= CENARIO.viatura.longeDoHeroi - 0.5, `passa a ${menor.toFixed(1)} casas do herói`);
  // um zumbi no meio do caminho é atropelado
  const z = j.criarZumbi('comum', v.x + v.dx * 6, v.y + v.dy * 6, null, { nascendo: 0 }); z.vel = 0;
  for (let i = 0; i < (v.dur + 0.5) / DT; i++) j.update(DT);
  assert.ok(ev.some(e => e.t === 'atropelou'), 'atropelou');
  assert.equal(j.viaturas.length, 0, 'foi embora');
});

teste('gente nas janelas: aparece num prédio perto, fala e some; com zumbi perto do herói, avisa', () => {
  const j = new Jogo({ seed: 6, classe: 'policial', cena: 0 }), ev = ouvir(j), h = j.hero;
  let jn = null;
  for (let k = 0; k < 10 && !jn; k++) jn = aparecerNaJanela(j);
  assert.ok(jn && !jn.b.shop, 'apareceu');
  assert.ok(ev.some(e => e.t === 'janela' && e.texto === jn.texto));
  for (let i = 0; i < (CENARIO.janela.dur + 0.2) / DT; i++) j.update(DT);
  assert.ok(!j.janelas.includes(jn), 'sumiu');
  j.janelas = []; j.zumbis = [];
  j.criarZumbi('comum', h.x + 1.5, h.y, null, { nascendo: 0 });
  let avisos = 0;
  for (let k = 0; k < 20; k++) { j.janelas = []; const x = aparecerNaJanela(j); if (x && CENARIO.falas.aviso.includes(x.texto)) avisos++; }
  assert.ok(avisos >= 8, `avisos: ${avisos}/20`);
});

teste('bairro residencial: a maioria dos lotes é casa; os outros bairros, prédios', () => {
  const c = new City(12);
  let casas = 0, lotes = 0, casasFora = 0;
  for (let i = -15; i < 15; i++) for (let j = -15; j < 15; j++) for (let sx = 0; sx < 2; sx++) for (let sy = 0; sy < 2; sy++) {
    const b = c.building(i, j, sx, sy); if (!b || b.shop) continue;
    if (b.bairro === 'residencial') { lotes++; if (b.casa) casas++; } else if (b.casa) casasFora++;
  }
  assert.ok(lotes > 0 && Math.abs(casas / lotes - CASAS_NO_RESIDENCIAL) < 0.12, `${casas}/${lotes}`);
  assert.equal(casasFora, 0);
});

teste('as ruas têm nome (uma a cada 4 é avenida) e o nome não muda', () => {
  const c = new City(3);
  const n = c.nomeRua('h', 5);
  assert.ok(/^(R\.|Av\.) /.test(n) && c.nomeRua('h', 5) === n);
  let av = 0; for (let k = 0; k < 40; k++) if (c.avenida('v', k)) av++;
  assert.equal(av, 10);
  assert.equal(c.ruaDoTrecho(2, 3, 1), c.nomeRua('h', 3));
  assert.equal(c.ruaDoTrecho(2, 3, 0), c.nomeRua('v', 2));
  void CAOS;
});

console.log(`\n${ok} testes passaram.`);
