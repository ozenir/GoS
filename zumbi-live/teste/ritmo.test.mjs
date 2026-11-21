// Testes do ritmo do jogo: começo calmo, hordas por nível, chefes, inimigos do nível 20, XP e fúria sem ajuda.
// Rodar:  node teste/ritmo.test.mjs
import assert from 'node:assert/strict';
import { Jogo } from '../public/js/core/jogo.js';
import { AMEACA, multInicio, tamanhoHordaNivel, pesosTipos, NIVEL_INIMIGOS_NOVOS } from '../public/js/core/ameaca.js';
import { sortearCaminho } from '../public/js/core/caminhos.js';
import { statsZumbi } from '../public/js/core/dano.js';
import { ZUMBIS, xpParaNivel } from '../public/js/core/dados.js';
import { makeRng, turnLeft } from '../public/js/core/util.js';
import { PRAIA } from '../public/js/core/praia.js';
import { City } from '../public/js/core/city.js';

let ok = 0;
const teste = (nome, fn) => { fn(); ok++; console.log('  ✔', nome); };
const DT = 1 / 30;
const passar = (j, seg, cada) => { for (let i = 0; i < Math.round(seg / DT); i++) { j.update(DT); if (cada) cada(j.drainEvents()); } };
const jogo = (nivel = 1, classe = 'policial') => {
  const j = new Jogo({ seed: 21, classe });
  j.hero.nivel = nivel; j.protecao = 0; j.hero.invT = 9999;
  return j;
};

teste('começo calmo: menos zumbis até o nível 5, um pouco menos até o 10, tudo a partir do 10', () => {
  assert.ok(multInicio(1) < multInicio(5));
  assert.ok(multInicio(5) < multInicio(10));
  assert.equal(multInicio(10), 1);
  assert.equal(multInicio(30), 1);
});

teste('XP: cada nível pede mais que o anterior', () => {
  for (let n = 1; n < 40; n++) assert.ok(xpParaNivel(n + 1) > xpParaNivel(n));
});

teste('horda do nível: a do 10 é bem maior que a do 5', () => {
  assert.ok(tamanhoHordaNivel(10) > tamanhoHordaNivel(5) * 1.8);
  assert.ok(tamanhoHordaNivel(15) > tamanhoHordaNivel(10));
});

teste('antes do nível 10 não tem horda periódica; do 10 em diante tem (depois da habilidade suprema)', () => {
  for (const [nivel, espera, suprema] of [[4, false], [10, false], [10, true, 'imortal']]) {
    const j = jogo(nivel);
    if (suprema) j.hero.suprema = suprema;
    let hordas = 0;
    passar(j, AMEACA.hordaCadaSegundos + 5, ev => { for (const e of ev) if (e.type === 'horda') hordas++; j.hero.vida = j.hero.vidaMax; });
    assert.equal(hordas > 0, espera, `nível ${nivel}${suprema ? ' com suprema' : ' sem suprema'}: ${hordas} hordas`);
  }
});

teste('subir pro nível 5 traz a horda do nível', () => {
  const j = jogo(4);
  j.hero.xp = 0;
  j.ganharXp(xpParaNivel(4));
  let veio = null;
  passar(j, 6, ev => { for (const e of ev) if (e.type === 'horda_nivel') veio = e; });
  assert.ok(veio && veio.nivel === 5 && !veio.grande);
});

teste('chefe de rua só a partir do nível 10', () => {
  const rng = makeRng(3);
  for (let k = 0; k < 3000; k++) assert.notEqual(sortearCaminho(rng, undefined, true, 9).perigo, 'chefe');
  let viu = false;
  for (let k = 0; k < 3000 && !viu; k++) viu = sortearCaminho(rng, undefined, true, 10).perigo === 'chefe';
  assert.ok(viu);
});

teste('antes do nível 10 o ex-herói não aparece na rua: ele vira o chefe da próxima arena', () => {
  const j = jogo(3);
  j.ultimoHeroi = { n: 1, classe: 'bombeiro', arma: null, viewer: { nick: 'ana' } };
  j.exHeroiT = 0.5;
  passar(j, 15, () => { j.hero.vida = j.hero.vidaMax; });
  assert.ok(!j.zumbis.some(z => z.tipo === 'exheroi' && !z.morto), 'ex-herói apareceu na rua');
  let praca = null;
  for (let i = -6; i <= 6 && !praca; i++) for (let jj = -6; jj <= 6 && !praca; jj++) praca = j.city.pracaAt(i, jj);
  assert.ok(praca, 'achou uma praça');
  j.iniciarArena(praca);
  assert.equal(j.arena.chefe.tipo, 'exheroi');
  assert.equal(j.arena.chefe.nome, 'ana zumbi');
});

teste(`lobos e braços longos só a partir do nível ${NIVEL_INIMIGOS_NOVOS} do herói`, () => {
  const peso = (n, nh, t) => pesosTipos(n, nh).find(x => x[0] === t)[1];
  assert.equal(peso(30, NIVEL_INIMIGOS_NOVOS - 1, 'lobo'), 0);
  assert.equal(peso(30, NIVEL_INIMIGOS_NOVOS - 1, 'esticado'), 0);
  assert.ok(peso(5, NIVEL_INIMIGOS_NOVOS, 'lobo') > 0);
  assert.ok(peso(5, NIVEL_INIMIGOS_NOVOS, 'esticado') > 0);
});

teste('lobo zumbi salta no herói e paralisa', () => {
  let paralisou = false, saltos = 0;
  for (let s = 0; s < 6 && !paralisou; s++) {
    const j = new Jogo({ seed: 40 + s, classe: 'policial' });
    j.hero.nivel = 20; j.protecao = 0; j.hero.arma = null; j.hero.corpoCd = 999;
    j.zumbis = []; j.spawnT = 999; j.hordaT = 999;
    const z = j.criarZumbi('lobo', j.hero.x + 2.4, j.hero.y, null, { nascendo: 0 });
    z.saltoCd = 0;
    for (let i = 0; i < 4 / DT && !paralisou; i++) {
      j.atualizarZumbis(DT); j.t += DT;
      for (const e of j.drainEvents()) if (e.type === 'lobo_pulou') saltos++;
      if (j.hero.estados.tem('atordoado')) paralisou = true;
      j.hero.vida = j.hero.vidaMax;
    }
  }
  assert.ok(saltos > 0, 'saltou');
  assert.ok(paralisou, 'paralisou o herói');
});

teste('braço longo acerta de longe, com uns 30% de chance', () => {
  const j = jogo(20);
  j.hero.invT = 0; j.hero.attr.base.esquiva = 0;
  j.zumbis = []; j.spawnT = 999; j.hordaT = 999;
  const z = j.criarZumbi('esticado', j.hero.x + 2, j.hero.y, null, { nascendo: 0 });
  let tentativas = 0, acertos = 0;
  for (let k = 0; k < 400; k++) {
    z.x = j.hero.x + 2; z.y = j.hero.y; z.bracoCd = 0; z.vel = 0;
    j.atualizarZumbis(DT);
    for (const e of j.drainEvents()) if (e.type === 'braco') { tentativas++; if (e.acertou) acertos++; }
    j.hero.vida = j.hero.vidaMax;
  }
  assert.ok(tentativas > 300, `${tentativas} tentativas`);
  const taxa = acertos / tentativas;
  assert.ok(taxa > 0.2 && taxa < 0.4, `acertou ${(taxa * 100).toFixed(0)}%`);
});

teste('fúria da horda só conta o tempo SEM presente de ajuda (não é tempo limite)', () => {
  const j = jogo(5);
  j.stats.inicio = j.t - 15 * 60;            // 15 minutos de run
  const normal = statsZumbi(ZUMBIS.comum, j.ameaca()).dano;
  j.ultimaAjudaT = j.t;                       // acabou de ganhar ajuda da live
  const comAjuda = j.criarZumbi('comum', j.hero.x + 5, j.hero.y);
  assert.ok(Math.abs(comAjuda.dano - normal) < 1e-9, 'com ajuda recente: sem fúria');
  j.ultimaAjudaT = j.t - 10 * 60;             // 10 minutos sem ajuda
  const semAjuda = j.criarZumbi('comum', j.hero.x + 5, j.hero.y);
  assert.ok(semAjuda.dano > normal * 1.5, 'sem ajuda há muito tempo: fúria');
});

teste('presente de ajuda (com moedas) renova a contagem da fúria', () => {
  const j = jogo(5);
  j.ultimaAjudaT = -999;
  j.handle({ type: 'presente', regra: { efeito: 'cura', valor: 10 }, count: 1, id: 'a', nick: 'Ana', coins: 1 });
  assert.equal(j.ultimaAjudaT, j.t);
});

teste(`praia só a partir do nível ${PRAIA.desdeNivel}, com uns 25% de chance por cruzamento`, () => {
  const j = jogo(PRAIA.desdeNivel - 1);
  for (let k = 0; k < 500; k++) { j.stats.cruzamentos += PRAIA.intervalo; assert.equal(j.podePraia(), false); }
  j.hero.nivel = PRAIA.desdeNivel;
  let sim = 0;
  for (let k = 0; k < 2000; k++) { j.stats.cruzamentos += PRAIA.intervalo; if (j.podePraia()) sim++; }
  assert.ok(sim / 2000 > 0.2 && sim / 2000 < 0.3, `${(sim / 20).toFixed(0)}%`);
});

teste('praia: a horda sai do mar, sobrevive 1 minuto, votação de pra onde ir e volta pra cidade', () => {
  const j = jogo(PRAIA.desdeNivel);
  const dir0 = j.rota.dir;
  j.entrarPraia();
  assert.ok(j.room?.praia);
  assert.ok(j.zumbis.length > 5 && j.zumbis.every(z => z.y < j.room.mar), 'todos nascem dentro do mar');
  passar(j, PRAIA.duracao - 1, () => { j.hero.vida = j.hero.vidaMax; });
  assert.ok(j.room?.praia && !j.voto, 'ainda sobrevivendo');
  passar(j, 2, () => { j.hero.vida = j.hero.vidaMax; });
  assert.ok(j.voto?.aberta, 'votação abriu');
  assert.deepEqual(j.voto.opcoes.map(o => o.id), ['esquerda', 'frente', 'direita']);
  j.handle({ type: 'chat', id: 'a', nick: 'A', texto: '1' });
  passar(j, j.cfg.votoDur + j.cfg.atraso + 3, () => { j.hero.vida = j.hero.vidaMax; });
  assert.equal(j.room, null, 'voltou pra cidade');
  assert.equal(j.map, j.city);
  assert.ok([turnLeft(dir0), turnLeft(turnLeft(dir0)), (turnLeft(dir0) + 2) % 4, dir0].includes(j.rota.dir));
});

teste('cidade sem desgaste: nada de buraco, carro em chamas, engavetamento nem prédio pegando fogo', () => {
  const c = new City(77);
  for (let i = 2; i < 12; i++) for (let jj = 2; jj < 12; jj++) for (const ax of ['h', 'v']) {
    const s = c.segment(ax, i, jj);
    assert.ok(!s.zonas.some(z => z.tipo === 'buraco' || z.carro), 'buraco/carro em chamas');
    assert.ok(!s.bloqueio?.carros);
    assert.ok(!s.props.some(p => p.fogo));
  }
  for (let i = 2; i < 12; i++) for (let jj = 2; jj < 12; jj++) { const b = c.building(i, jj, 0, 0); if (b) assert.ok(!b.fogo); }
});

teste('cidade com desgaste máximo: buracos, carros em chamas, engavetamentos e prédios pegando fogo', () => {
  const c = new City(77);
  c.desgaste = 1;
  let buracos = 0, carroFogo = 0, engav = 0, predioFogo = 0;
  for (let i = 2; i < 12; i++) for (let jj = 2; jj < 12; jj++) {
    for (const ax of ['h', 'v']) {
      const s = c.segment(ax, i, jj);
      buracos += s.zonas.filter(z => z.tipo === 'buraco').length;
      carroFogo += s.zonas.filter(z => z.carro).length;
      if (s.bloqueio?.carros) engav++;
    }
    for (const sx of [0, 1]) for (const sy of [0, 1]) if (c.building(i, jj, sx, sy)?.fogo) predioFogo++;
  }
  assert.ok(buracos > 20 && carroFogo > 10 && engav > 3 && predioFogo > 10, `buracos ${buracos} carros ${carroFogo} engavetamentos ${engav} prédios ${predioFogo}`);
});

teste('desgaste sobe com o tempo da run (0 no começo, máximo com 10 minutos)', () => {
  const j = jogo(1);
  passar(j, 1);
  assert.equal(j.city.desgaste, 0);
  j.stats.inicio = j.t - 10 * 60;
  passar(j, 0.1);
  assert.equal(j.city.desgaste, 1);
});

teste('figurantes aparecem com o desgaste e são só cenário (não viram zumbi nem alvo)', () => {
  const j = jogo(5);
  j.stats.inicio = j.t - 10 * 60;
  let viu = 0;
  passar(j, 60, () => { viu = Math.max(viu, j.figurantes.length); j.hero.vida = j.hero.vidaMax; });
  assert.ok(viu > 0, 'apareceu figurante');
  for (const f of j.figurantes) assert.ok(!j.zumbis.includes(f));
});

console.log(`\n${ok} testes passaram.`);
