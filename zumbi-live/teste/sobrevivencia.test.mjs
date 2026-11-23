// Testes do ritmo de sobrevivência (core/sobrevivencia.js): armas iniciais, a cena do 1º quarteirão, o duelo,
// o tropeço, o passo cuidadoso, a rua enchendo aos poucos e o alarme de carro das explosões.
// Rodar:  node teste/sobrevivencia.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { CLASSES, CORPO } from '../public/js/core/dados.js';
import { SOBREVIVENCIA, rampa, tropecar } from '../public/js/core/sobrevivencia.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;
const ouvir = j => { const ev = []; const e0 = j.emit.bind(j); j.emit = (t, d) => { ev.push({ t, ...d }); return e0(t, d); }; return ev; };

teste('cada personagem começa com a sua arma: pistola + lanterna, faca, machado, pé de cabra, taco de beisebol', () => {
  assert.equal(CLASSES.policial.arma, 'pistola'); assert.equal(CLASSES.policial.corpo, 'lanterna');
  assert.equal(CLASSES.enfermeira.corpo, 'faca');
  assert.equal(CLASSES.bombeiro.corpo, 'machado');
  assert.equal(CLASSES.mecanico.corpo, 'pe_de_cabra'); assert.equal(CLASSES.mecanico.arma, null);
  assert.equal(CLASSES.entregador.corpo, 'beisebol'); assert.equal(CLASSES.entregador.arma, null);
  assert.ok(CORPO.lanterna.luz, 'a lanterna ilumina a noite');
  for (const c of Object.keys(CLASSES)) { const j = new Jogo({ seed: 1, classe: c }); assert.equal(j.hero.corpo, CLASSES[c].corpo); }
});

teste('a rua começa vazia e enche aos poucos (rampa)', () => {
  const S = SOBREVIVENCIA;
  assert.equal(rampa(0), 0, 'quarteirão da cena: nenhum zumbi da rua');
  assert.equal(rampa(1), S.rampaInicio);
  assert.equal(rampa(S.quarteiroesAteCheio), 1);
  for (let q = 1; q < S.quarteiroesAteCheio; q++) assert.ok(rampa(q + 1) > rampa(q));
});

teste('1º quarteirão: um zumbi agachado devorando uma pessoa que pede socorro; nenhum outro zumbi; sem votação ainda', () => {
  const j = new Jogo({ seed: 11, classe: 'bombeiro' }), ev = ouvir(j);
  assert.ok(j.cena && j.cena.fase === 'chegando');
  const z = j.cena.zumbi, v = j.cena.vitima;
  assert.ok(z.devorando === v && v.tipo === 'vitima');
  assert.equal(j.zumbis.filter(q => !q.morto).length, 1);
  for (let i = 0; i < 6 / DT; i++) j.update(DT);
  assert.ok(ev.some(e => e.t === 'socorro'), 'a pessoa grita por socorro');
  assert.ok(ev.some(e => e.t === 'devorando'), 'o zumbi mastiga');
  assert.equal(j.zumbis.filter(q => !q.morto).length, 1, 'só o zumbi da cena');
  assert.equal(j.voto, null, 'a votação espera a luta');
});

teste('o zumbi levanta quando o herói chega perto; morto, a pessoa agradece, dá um curativo e a votação abre', () => {
  const j = new Jogo({ seed: 11, classe: 'bombeiro' }), ev = ouvir(j);
  let votou = false;
  for (let i = 0; i < 90 / DT && !votou; i++) { j.update(DT); votou = !!j.voto; }
  assert.ok(ev.some(e => e.t === 'zumbi_notou'), 'levantou');
  assert.ok(ev.some(e => e.t === 'vitima_salva'), 'salvou');
  assert.ok(j.cena.vitima.salva);
  assert.ok(votou, 'a votação abriu depois');
  assert.ok(ev.some(e => e.t === 'pegou' && e.kind === 'kit') || j.itens.some(it => it.kind === 'kit') || j.hero.mochila.length, 'o curativo');
});

teste('policial: com o zumbi em cima da pessoa não atira (pode acertar ela)', () => {
  const j = new Jogo({ seed: 11, classe: 'policial' }), ev = ouvir(j);
  let semTiro = false;
  for (let i = 0; i < 20 / DT && !j.cena.zumbi.morto; i++) {
    j.update(DT);
    if (j.hero.semTiro) semTiro = true;
    const tiro = ev.find(e => e.t === 'tiro' && e.heroi);
    if (tiro) {
      const z = j.cena.zumbi, v = j.cena.vitima;
      assert.ok(Math.hypot(z.x - v.x, z.y - v.y) >= 1.4 || v.salva, 'só atira com o zumbi longe da pessoa');
      ev.length = 0;
    }
  }
  assert.ok(semTiro, 'avisou que não dá pra atirar');
});

teste('duelo: com 1 zumbi perto, ele prepara o bote antes de morder (dá pra ver e desviar)', () => {
  const j = new Jogo({ seed: 5, classe: 'enfermeira', cena: 0 }), ev = ouvir(j), h = j.hero;
  j.zumbis = []; j.spawnT = 1e9;
  const z = j.criarZumbi('comum', h.x + 2, h.y, null, { nascendo: 0 }); z.atkCd = 0;
  for (let i = 0; i < 6 / DT; i++) { h.corpoCd = 9; j.update(DT); }
  assert.ok(z.duelo, 'está em duelo');
  const iPrep = ev.findIndex(e => e.t === 'bote_preparo'), iMord = ev.findIndex(e => e.t === 'mordida');
  assert.ok(iPrep >= 0, 'preparou o bote');
  if (iMord >= 0) assert.ok(iPrep < iMord, 'o bote vem antes da mordida');
});

teste('com muitos zumbis perto, volta a briga de horda (sem duelo)', () => {
  const j = new Jogo({ seed: 5, classe: 'bombeiro', cena: 0 }), h = j.hero;
  j.zumbis = []; j.spawnT = 1e9;
  for (let k = 0; k < 5; k++) j.criarZumbi('comum', h.x + 2 + k * 0.4, h.y + 1, null, { nascendo: 0 });
  j.update(DT);
  assert.equal(j.dueloAtivo, null);
  assert.ok(j.zumbis.every(z => !z.duelo));
});

teste('tropeço: cai, fica um instante no chão, se machuca um pouco e nunca morre disso', () => {
  const j = new Jogo({ seed: 3, classe: 'mecanico', cena: 0 }), ev = ouvir(j), h = j.hero;
  j.rng.next = () => 0;   // sempre tropeça
  h.tropecoCd = 0; h.vida = 2;
  assert.ok(tropecar(j, h, 1));
  assert.ok(h.estados.tem('atordoado') && h.tropecou > 0);
  assert.ok(h.vida >= 1, 'não morre de tropeço');
  assert.ok(ev.some(e => e.t === 'tropecou'));
  assert.equal(tropecar(j, h, 1), false, 'recarga: não tropeça de novo na hora');
});

teste('passo cuidadoso: sem zumbi por perto ele anda devagar, olhando em volta', () => {
  const j = new Jogo({ seed: 8, classe: 'bombeiro', cena: 0 }), h = j.hero;
  j.zumbis = []; j.spawnT = 1e9; j.votoAbreT = 1e9;
  const andar = () => { const x0 = h.x, y0 = h.y; for (let i = 0; i < 1 / DT; i++) j.update(DT); return Math.hypot(h.x - x0, h.y - y0); };
  andar();
  const calmo = andar();
  assert.ok(h.cauteloso, 'cauteloso');
  assert.ok(calmo < j.cfg.velHeroi * 0.75, `devagar (${calmo.toFixed(2)} casas/s)`);
});

teste('explosão perto de um carro parado: o alarme dispara (e desliga depois)', () => {
  const j = new Jogo({ seed: 4, classe: 'bombeiro', cena: 0 }), ev = ouvir(j), h = j.hero;
  let carro = null;
  for (let r = 4; r < 60 && !carro; r += 4) carro = j.city.objectsIn(h.x - r, h.y - r, h.x + r, h.y + r).find(o => o.kind === 'prop' && o.p.tipo === 'carro');
  assert.ok(carro, 'achou um carro');
  const p = carro.p, cx = p.x + (p.w || 1) / 2, cy = p.y + (p.h || 1) / 2;
  j.explodir(cx + 0.5, cy, 1.8, 0, 0, null, 'teste');
  assert.ok(ev.some(e => e.t === 'alarme_carro'), 'disparou');
  assert.ok(p.alarme);
  j.explodir(cx + 0.5, cy, 1.8, 0, 0, null, 'teste');
  assert.equal(ev.filter(e => e.t === 'alarme_carro').length, 1, 'um por vez');
  j.t += 10; j.atualizarAlarmesCarro();
  assert.ok(!p.alarme, 'desligou');
});

console.log(`\n${ok} testes passaram.`);
