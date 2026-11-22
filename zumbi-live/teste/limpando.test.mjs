// Herói que nunca morria: preso no "limpar a área" do cruzamento com presentes mandando zumbi sem parar.
// Ele caçava zumbi longe do cruzamento, o relógio da limpeza (limpandoMax) só andava com ele em cima do
// cruzamento, então nunca atravessava; e a invencibilidade do helicóptero (que só acabava andando quarteirão)
// não acabava nunca. Estes testes garantem que a rodada não trava pra sempre.
// Rodar:  node teste/limpando.test.mjs
import assert from 'node:assert/strict';
import { Jogo, HELI } from '../public/js/core/jogo.js';
import { AMEACA } from '../public/js/core/ameaca.js';
import { DIRS } from '../public/js/core/util.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;

// Herói forte, invencível, parado num cruzamento com a decisão do chat já tomada, mas a 5 casas do cruzamento
// (numa das ruas que saem dele), como quando sai caçando os zumbis que faltam.
function preso() {
  const j = new Jogo({ seed: 7, classe: 'policial' });
  j.hero.nivel = 30; j.hero.suprema = 'imortal'; j.protecao = 0; j.hero.invT = 1e9; j.hero.arma = null;
  j.cotaRua = 0; j.zumbis = []; j.spawnT = 1e9;
  const r = j.rota, no = j.city.nodePos(r.alvo.i, r.alvo.j);
  const d = [r.dir, (r.dir + 1) % 4, (r.dir + 3) % 4].find(d => {
    const t = j.city.trecho(r.alvo.i, r.alvo.j, d);
    return !t.s.bloqueio && j.city.walkable(no.x + DIRS[d][0] * 5, no.y + DIRS[d][1] * 5);
  });
  assert.ok(d != null, 'achou uma rua saindo do cruzamento');
  j.hero.x = no.x + DIRS[d][0] * 5; j.hero.y = no.y + DIRS[d][1] * 5;
  j.decisao = { id: 'frente', dir: r.dir };
  return { j, no, fora: DIRS[d] };
}

// "Presente" mandando zumbi sem parar: sempre tem um zumbi imortal colado no herói (do lado de fora do cruzamento),
// e a cada 2 s um morre e chega outro (tem abate, então o sumiço por falta de abate não resolve).
function zumbiSemFim(j, fora) {
  let z = null, t = 0;
  return () => {
    t -= DT;
    if (z && !z.morto && t > 0) return;
    if (z && !z.morto) j.matarZumbi(z, null);
    t = 2;
    z = j.criarZumbi('comum', j.hero.x + fora[0] * 0.7, j.hero.y + fora[1] * 0.7, null, { nascendo: 0 });
    z.vida = z.vidaMax = 1e9; z.vel = 0;
  };
}

teste('limpar a área: com zumbi chegando sem parar e o herói longe do cruzamento, o tempo acaba e ele atravessa', () => {
  const { j, no, fora } = preso();
  const mandar = zumbiSemFim(j, fora);
  const q0 = j.stats.quarteiroes;
  let atravessou = null, longe = 0;
  for (let i = 0; i < Math.round((AMEACA.limpandoMax + 60) / DT) && atravessou == null; i++) {
    mandar();
    j.update(DT);
    j.drainEvents();
    j.hero.vida = j.hero.vidaMax;
    if (j.stats.quarteiroes > q0) atravessou = j.t;
    else if (Math.hypot(j.hero.x - no.x, j.hero.y - no.y) > 1.4) longe += DT;
  }
  assert.ok(atravessou != null, `não atravessou em ${AMEACA.limpandoMax + 60} s (limpando: ${JSON.stringify(j.limpando)})`);
  assert.ok(atravessou >= AMEACA.limpandoMax * 0.9, `atravessou cedo demais (${atravessou.toFixed(1)} s), a área nunca ficou limpa`);
  assert.ok(longe > AMEACA.limpandoMax * 0.5, 'o herói passou a espera longe do cruzamento (é o caso que travava)');
  assert.equal(j.limpando, null, 'atravessou: acabou o limpar a área');
});

teste('limpar a área: zumbi preso parado, herói longe do cruzamento: some por falta de abate e ele atravessa', () => {
  const { j, fora } = preso();
  const z = j.criarZumbi('comum', j.hero.x + fora[0] * 0.7, j.hero.y + fora[1] * 0.7, null, { nascendo: 0 });
  z.vida = z.vidaMax = 1e9; z.vel = 0;
  const q0 = j.stats.quarteiroes;
  for (let i = 0; i < Math.round((AMEACA.limpandoSemAbate * 2 + 15) / DT); i++) { j.update(DT); j.drainEvents(); j.hero.vida = j.hero.vidaMax; }
  assert.ok(z.morto && z.sumiu, 'o zumbi imortal sumiu');
  assert.ok(j.stats.quarteiroes > q0, 'atravessou');
});

teste(`helicóptero: invencível por quarteirão, mas no máximo ${HELI.segPorQuarteirao} s por quarteirão`, () => {
  const j = new Jogo({ seed: 3, classe: 'policial' });
  const h = j.hero;
  h.attr.addMod({ id: 'sem-esquiva', attr: 'esquiva', mult: 0 });
  j.helicoptero(1, null);
  assert.equal(h.invQ, 1);
  assert.equal(j.ferirHeroi(10, null, 'teste'), false, 'invencível logo depois do helicóptero');
  // parado sem andar nenhum quarteirão (preso no cruzamento): o tempo acaba
  const x0 = h.x, y0 = h.y, q0 = j.stats.quarteiroes;
  for (let i = 0; i < Math.round((HELI.segPorQuarteirao + 1) / DT); i++) { j.atualizarHeroi(DT); h.vida = h.vidaMax; h.x = x0; h.y = y0; }
  assert.equal(j.stats.quarteiroes, q0, 'não andou nenhum quarteirão');
  assert.equal(h.invQ, 0, 'a invencibilidade acabou pelo tempo');
  const antes = h.vida;
  assert.equal(j.ferirHeroi(10, null, 'teste'), true);
  assert.ok(h.vida < antes, 'volta a tomar dano');
  // andando, continua valendo por quarteirão
  j.helicoptero(2, null);
  j.andouQuarteirao(1);
  assert.equal(h.invQ, 1);
  assert.ok(h.invQT <= HELI.segPorQuarteirao + 1e-9, 'o teto acompanha os quarteirões que faltam');
  j.andouQuarteirao(1);
  assert.equal(h.invQ, 0);
});

console.log(`\n${ok} testes de limpar a área passaram.`);
