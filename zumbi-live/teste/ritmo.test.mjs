// Testes do ritmo do jogo: começo puxado, limpar a área, horda a cada 5 quarteirões, chefes, inimigos do nível 20, XP e fúria sem ajuda.
// Rodar:  node teste/ritmo.test.mjs
import assert from 'node:assert/strict';
import { Jogo, FOLEGO } from '../public/js/core/jogo.js';
import { AMEACA, multInicio, forcaInicio, cotaQuadra, tamanhoHordaQuadra, pesosTipos, NIVEL_INIMIGOS_NOVOS, TOMATEIRO } from '../public/js/core/ameaca.js';
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
  const j = new Jogo({ sobrevivencia: false, seed: 21, classe });
  j.hero.nivel = nivel; j.protecao = 0; j.hero.invT = 9999;
  return j;
};

teste('começo puxado: até o nível 10 vêm mais zumbis e mais fortes; do 10 em diante, o normal', () => {
  for (const n of [1, 4, 5, 9]) { assert.ok(multInicio(n) > 1, `quantidade no nível ${n}`); assert.ok(forcaInicio(n) > 1, `força no nível ${n}`); }
  assert.ok(forcaInicio(5) > forcaInicio(4), 'do 5 ao 9 é o mais difícil');
  for (const n of [10, 30]) { assert.equal(multInicio(n), 1); assert.equal(forcaInicio(n), 1); }
  const j = jogo(7), forte = j.criarZumbi('comum', j.hero.x + 5, j.hero.y).vida;
  j.hero.nivel = 10;
  assert.ok(j.criarZumbi('comum', j.hero.x + 5, j.hero.y).vida < forte);
});

teste('XP: cada nível pede mais que o anterior', () => {
  for (let n = 1; n < 40; n++) assert.ok(xpParaNivel(n + 1) > xpParaNivel(n));
});

teste('cota da quadra e horda gigante crescem com a ameaça (com limite)', () => {
  for (let n = 1; n < 60; n++) { assert.ok(cotaQuadra(n + 1) >= cotaQuadra(n)); assert.ok(tamanhoHordaQuadra(n + 1) >= tamanhoHordaQuadra(n)); }
  assert.ok(tamanhoHordaQuadra(20) > tamanhoHordaQuadra(5) * 2.5, 'depois do nível 10 a horda fica gigante');
  assert.equal(cotaQuadra(99), AMEACA.cotaMax);
  assert.equal(tamanhoHordaQuadra(99), AMEACA.hordaQuadraMax);
});

teste('cota da quadra: acabou, não nasce mais zumbi da rua até o próximo quarteirão', () => {
  const j = jogo(3);
  j.cotaRua = 4; j.spawnT = 0;
  passar(j, 20, () => { j.hero.vida = j.hero.vidaMax; });
  assert.equal(j.cotaRua, 0);
  assert.ok(j.stats.abates + j.zumbis.filter(z => !z.morto).length <= 4 + 0, 'nasceram só os 4 da cota');
  j.andouQuarteirao(1);
  assert.equal(j.cotaRua, null, 'quarteirão novo, cota nova');
});

teste('sem horda por tempo: em 2 minutos parado sem andar, nenhuma horda chega sozinha', () => {
  const j = jogo(15);
  let hordas = 0;
  passar(j, 120, ev => { for (const e of ev) if (e.type === 'horda' || e.type === 'horda_quadra') hordas++; j.hero.vida = j.hero.vidaMax; });
  assert.equal(hordas, 0);
});

teste(`horda gigante a cada ${AMEACA.hordaCadaQuarteiroes} quarteirões`, () => {
  const j = jogo(12);
  const vistas = [];
  for (let q = 1; q <= 15; q++) {
    j.andouQuarteirao(1);
    passar(j, 3, ev => { for (const e of ev) if (e.type === 'horda_quadra') vistas.push(j.stats.quarteiroes); j.hero.vida = j.hero.vidaMax; });
  }
  assert.deepEqual(vistas, [5, 10, 15]);
});

teste('limpar a área: com a decisão tomada, o herói só atravessa o cruzamento quando os zumbis em volta morrem', () => {
  const j = jogo(12);
  j.cotaRua = 0; j.zumbis = [];
  const no = j.city.nodePos(j.rota.alvo.i, j.rota.alvo.j);
  j.hero.x = no.x; j.hero.y = no.y;
  j.decisao = { id: 'frente', dir: j.rota.dir };
  const z = j.criarZumbi('comum', no.x + 3, no.y + 3, null, { nascendo: 0 });
  z.vel = 0; z.vida = z.vidaMax = 1e9;
  const q0 = j.stats.quarteiroes;
  let pediu = false;
  passar(j, 4, ev => { for (const e of ev) if (e.type === 'limpar_area') pediu = true; j.hero.vida = j.hero.vidaMax; });
  assert.equal(j.stats.quarteiroes, q0, 'não atravessou');
  assert.ok(pediu && j.limpando?.restam === 1, 'avisou quantos faltam');
  j.matarZumbi(z, null);
  passar(j, 1, () => { j.hero.vida = j.hero.vidaMax; });
  assert.equal(j.stats.quarteiroes, q0 + 1, 'atravessou depois de limpar');
});

teste('limpar a área: zumbi preso que nunca chega some depois de um tempo sem abate', () => {
  const j = jogo(12);
  j.cotaRua = 0; j.zumbis = [];
  const no = j.city.nodePos(j.rota.alvo.i, j.rota.alvo.j);
  j.hero.x = no.x; j.hero.y = no.y; j.hero.arma = null;
  j.decisao = { id: 'frente', dir: j.rota.dir };
  const longe = AMEACA.cacarLonge + 0.5;   // longe demais pra ir caçar, mas ainda dentro da área
  const z = j.criarZumbi('comum', no.x + longe, no.y, null, { nascendo: 0 });
  z.vel = 0;
  const q0 = j.stats.quarteiroes;
  passar(j, AMEACA.limpandoSemAbate * 2 + 4, () => { j.hero.vida = j.hero.vidaMax; z.x = no.x + longe; z.y = no.y; });
  assert.ok(z.morto && z.sumiu, 'sumiu');
  assert.ok(j.stats.quarteiroes > q0, 'atravessou');
});

teste(`limpar a área: faltando ${AMEACA.cacarPoucos} ou menos, o herói vai atrás dos últimos zumbis (bem mais longe)`, () => {
  const j = jogo(12);
  j.cotaRua = 0; j.zumbis = [];
  const no = j.city.nodePos(j.rota.alvo.i, j.rota.alvo.j);
  j.hero.x = no.x; j.hero.y = no.y;
  j.decisao = { id: 'frente', dir: j.rota.dir };
  // um zumbi parado a 12 casas, na rua da frente (antes, ele só ia até 9 e ficava esperando)
  const [dx, dy] = [no.x - j.city.nodePos(j.rota.i, j.rota.j).x, no.y - j.city.nodePos(j.rota.i, j.rota.j).y];
  const dl = Math.hypot(dx, dy) || 1;
  const z = j.criarZumbi('comum', no.x - dx / dl * 12, no.y - dy / dl * 12, null, { nascendo: 0 });
  z.vel = 0; z.atkCd = 99;
  let cacou = false;
  passar(j, 4, () => { j.hero.vida = j.hero.vidaMax; if (j.poucosPraLimpar() && Math.hypot(j.hero.x - no.x, j.hero.y - no.y) > 3) cacou = true; });
  assert.ok(cacou, 'saiu do cruzamento atrás do zumbi');
  passar(j, AMEACA.limpandoSemAbate - 1, () => { j.hero.vida = j.hero.vidaMax; });
  assert.ok(z.morto && !z.sumiu, 'matou (não precisou sumir)');
});

teste('escolha de habilidade aberta não segura o herói: ele atravessa e a habilidade entra quando a votação fecha', () => {
  const j = jogo(12);
  j.cotaRua = 0; j.zumbis = [];
  const no = j.city.nodePos(j.rota.alvo.i, j.rota.alvo.j);
  j.hero.x = no.x; j.hero.y = no.y;
  j.decisao = { id: 'frente', dir: j.rota.dir };
  j.niveisPendentes = 1; j.filaNiveis = [j.hero.nivel]; j.escolhaEspera = 0;   // subiu de nível: abre a escolha (A, B, C)
  const q0 = j.stats.quarteiroes;
  passar(j, 2, () => { j.hero.vida = j.hero.vidaMax; j.zumbis = []; });
  assert.ok(j.escolha, 'a escolha continua aberta (o tempo do chat é o mesmo)');
  assert.ok(j.stats.quarteiroes > q0, 'e ele já atravessou, sem esperar');
  passar(j, j.cfg.escolhaDur + j.cfg.atraso + 2, () => { j.hero.vida = j.hero.vidaMax; j.zumbis = []; });
  assert.ok(j.escolhaRes, 'a habilidade entrou quando a votação fechou');
});

teste('segundo fôlego: antes do nível 10, com a vida quase no fim, empurra a horda e salva o herói (com recarga)', () => {
  const j = jogo(6);
  j.hero.invT = 0;
  j.hero.attr.addMod({ id: 'sem-esquiva', attr: 'esquiva', mult: 0 });
  const z = j.criarZumbi('comum', j.hero.x + 1, j.hero.y, null, { nascendo: 0 });
  j.ferirHeroi(j.hero.vida + 50, null, 'teste', 'sangramento');
  assert.ok(!j.caido && j.hero.vida > 0, 'não caiu');
  assert.ok(j.hero.invT > 0 && z.estados.tem('atordoado'), 'invencível e zumbi atordoado');
  assert.ok(j.drainEvents().some(e => e.type === 'segundo_folego'));
  j.hero.invT = 0;
  j.ferirHeroi(j.hero.vida + 50, null, 'teste', 'sangramento');
  assert.ok(j.caido, 'logo em seguida (recarga) derruba');
  const k = jogo(FOLEGO.ateNivel);
  k.hero.invT = 0; k.hero.attr.addMod({ id: 'sem-esquiva', attr: 'esquiva', mult: 0 });
  k.ferirHeroi(k.hero.vida + 50, null, 'teste', 'sangramento');
  assert.ok(k.caido, `no nível ${FOLEGO.ateNivel} não tem mais`);
});

teste(`zumbi do tomate: só a partir do nível ${TOMATEIRO.desdeNivel} e um por vez`, () => {
  const conta = nivel => {
    const j = jogo(nivel); j.cotaRua = 0; j.spawnT = 999;
    let max = 0;
    // (o nível é fixado a cada quarteirão: matando zumbi ele subiria)
    for (let q = 0; q < 30; q++) { j.hero.nivel = nivel; j.andouQuarteirao(1); passar(j, 3.5, () => { j.hero.vida = j.hero.vidaMax; }); max = Math.max(max, j.zumbis.filter(z => !z.morto && z.tipo === 'tomateiro').length); }
    return max;
  };
  assert.equal(conta(TOMATEIRO.desdeNivel - 1), 0, 'antes do nível: nenhum');
  assert.equal(conta(TOMATEIRO.desdeNivel), 1, 'depois: aparece, mas só um por vez');
});

teste('zumbi do tomate: fica de longe e o tomate sempre acerta (dano e tela suja)', () => {
  const j = jogo(5);
  j.hero.invT = 0; j.cotaRua = 0; j.spawnT = 999; j.zumbis = [];
  const z = j.criarZumbi('tomateiro', j.hero.x + 2, j.hero.y, null, { nascendo: 0 });
  z.tomateCd = 0;
  let tomatadas = 0;
  const v = j.hero.vida;
  passar(j, 4, ev => { for (const e of ev) if (e.type === 'tomatada') tomatadas++; });
  assert.ok(tomatadas >= 1, 'acertou');
  assert.ok(j.hero.vida < v, 'machucou');
  const d = Math.hypot(z.x - j.hero.x, z.y - j.hero.y);
  assert.ok(z.morto || d > 3, `recuou (${d.toFixed(1)} casas)`);
  // o herói andando não escapa: o tomate vai atrás
  const k = jogo(5); k.hero.invT = 0; k.zumbis = []; k.spawnT = 999; k.cotaRua = 0;
  const w = k.criarZumbi('tomateiro', k.hero.x + 6, k.hero.y, null, { nascendo: 0 });
  k.lancarTomate(w);
  let acertou = false;
  for (let i = 0; i < 40; i++) { k.hero.x += 0.05; k.atualizarCarros(DT); for (const e of k.drainEvents()) if (e.type === 'tomatada') acertou = true; }
  assert.ok(acertou);
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
    const j = new Jogo({ sobrevivencia: false, seed: 40 + s, classe: 'policial' });
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
  const j = jogo(12);
  j.hero.nivel = 10;   // (do nível 10 em diante, sem o começo puxado)
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
