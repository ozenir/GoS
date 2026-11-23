// ============================================================================
//  ENCONTROS — pessoas pedindo ajuda no caminho da viagem (mapa.js).
//
//  No meio da viagem, às vezes alguém está encurralado por zumbis numa rua do lado. O chat vota:
//    1 🤝 AJUDAR  o herói desvia, enfrenta os zumbis e salva a pessoa. Ela agradece com uma ajuda de verdade:
//                 vira um sobrevivente que acompanha o herói por uns quarteirões, ou dá um item que tinha.
//    2 🚶 SEGUIR  a viagem continua. A pessoa fica pra trás... e uns quarteirões depois aparece de novo,
//                 como zumbi, com o nome dela.
//  Ninguém votou: a IA ajuda quando o herói está com a vida boa.
//  Os zumbis do encontro ficam em cima da pessoa (como na cena do 1º quarteirão): não vêm atrás do herói
//  e não contam pra "limpar a área" do cruzamento, a não ser que ele chegue perto.
// ============================================================================
import { DIRS, dist } from './util.js';
import { Votacao } from './votacao.js';

export const ENCONTROS = {
  chance: 0.45,           // por quarteirão da viagem (nem no primeiro da viagem nem chegando no lugar)
  desdeQuarteirao: 2,     // nada de encontro antes do 2º quarteirão da partida
  lado: 6,                // casas pra dentro da rua do lado, a partir do cruzamento da frente
  zumbis: [2, 4],         // quantos zumbis em cima da pessoa (sobe com a ameaça, até o máximo)
  viraZumbi: 2,           // ignorada, ela volta como zumbi tantos quarteirões depois
  desisteEm: 60,          // ajudando há tanto tempo sem conseguir: desiste
  xp: 6,                  // experiência por salvar (× ameaça)
  aliadoQuarteiroes: 4,   // quanto tempo quem foi salvo acompanha o herói (como sobrevivente ajudante)
  nomes: ['Dona Cida', 'Seu Jorge', 'Marina', 'Tião', 'Rafaela', 'Seu Bené', 'Júlia', 'Carlos', 'Dona Lurdes', 'Neide', 'Roberto', 'Paula'],
  situacoes: ['encurralada', 'caída no chão', 'presa no beco', 'cercada'],
  // o que quem foi salvo dá: [tipo, peso]
  recompensas: [['aliado', 4], ['kit', 2], ['municao', 1.5], ['energetico', 1], ['remedio', 1]]
};

// Tenta criar um encontro na rua do lado do cruzamento da frente (r.alvo). null se não deu.
export function criarEncontro(g) {
  const E = ENCONTROS, r = g.rota, h = g.hero;
  const no = g.city.nodePos(r.alvo.i, r.alvo.j);
  const proximo = g.viagem?.dirs?.[0];
  const lados = [0, 1, 2, 3].filter(d => d !== r.dir && d !== (r.dir + 2) % 4 && d !== proximo);
  for (const d of lados.sort(() => g.rng.next() - 0.5)) {
    const base = { x: no.x + DIRS[d][0] * E.lado, y: no.y + DIRS[d][1] * E.lado };
    const p = g.livre(base.x, base.y) ? base : g.pontoPerto(base, 1.5);
    if (!p || dist(p.x, p.y, h.x, h.y) < 6) continue;
    const nome = g.rng.pick(E.nomes), situacao = g.rng.pick(E.situacoes);
    const pessoa = { tipo: 'vitima', x: p.x, y: p.y, t: 0, vida: 1e9, roupa: g.rng.int(0, 5), nome, grito: 'SOCORRO!', gritoT: 0.4, encontro: true };
    g.figurantes.push(pessoa);
    const n = Math.min(E.zumbis[1], E.zumbis[0] + Math.floor(g.nivelAmeaca / 6));
    const zumbis = [];
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + g.rng.next() * 0.6, zx = p.x + Math.cos(a) * 0.65, zy = p.y + Math.sin(a) * 0.65;
      const q = g.livre(zx, zy) ? { x: zx, y: zy } : g.pontoPerto(p, 1.2) || p;
      const z = g.criarZumbi(g.rng.chance(0.2) ? 'gordo' : 'comum', q.x, q.y, null, { nascendo: 0 });
      z.devorando = pessoa; z.encontro = true;
      const m = Math.hypot(p.x - z.x, p.y - z.y) || 1; z.fx = (p.x - z.x) / m; z.fy = (p.y - z.y) / m;
      zumbis.push(z);
    }
    const voto = new Votacao([
      { id: 'esquerda', n: 1, nome: 'AJUDAR', seta: '🤝' },
      { id: 'frente', n: 2, nome: 'SEGUIR', seta: '🚶' }
    ], g.cfg.votoDur, g.cfg.atraso);
    voto.encontro = { nome, situacao, zumbis: n };
    g.encontro = { fase: 'votando', pessoa, zumbis, nome, t: 0 };
    g.voto = voto;
    g.emit('encontro', { nome, situacao, x: p.x, y: p.y, zumbis: n });
    g.emit('votacao_abriu', { opcoes: ['esquerda', 'frente'], encontro: true });
    return g.encontro;
  }
  return null;
}

// A votação do encontro fechou: ajudar ou seguir
export function decidirEncontro(g, id, res) {
  const e = g.encontro;
  if (!e) return;
  const ajudar = id === 'esquerda';
  e.fase = ajudar ? 'ajudando' : 'ignorada';
  e.t = 0;
  const previsao = ajudar
    ? { risco: 'perigoso', rotulo: 'PERIGOSO', emoji: '🟠', itens: [`🤝 vai salvar ${e.nome}`, `🧟 ${e.zumbis.length} zumbis em volta`, '🎁 quem é salvo agradece'] }
    : { risco: 'tranquilo', rotulo: 'SEGUE A VIAGEM', emoji: '🚶', itens: [`😔 ${e.nome} fica pra trás`, '🧟 pode voltar... diferente'] };
  g.decididoEm = g.t;   // (a próxima votação espera o resultado sair da tela)
  g.emit('decisao', { id, n: ajudar ? 1 : 2, nome: ajudar ? 'AJUDAR' : 'SEGUIR', seta: ajudar ? '🤝' : '🚶', votos: res.votos, total: g.voto?.total ?? 0, auto: res.auto, empate: !!res.empate, quem: [], previsao, encontro: true });
  if (!ajudar) {
    e.pessoa.vida = e.pessoa.t + 9;   // ainda grita um pouco, depois fica só o corpo
    g.perdidos = [...(g.perdidos || []), { nome: e.nome, roupa: e.pessoa.roupa, quarteirao: g.stats.quarteiroes + ENCONTROS.viraZumbi }];
  }
  g.voto = null;
}

// A IA (ninguém votou): ajuda se a vida está boa
export const escolhaEncontroIA = g => (g.hero.vida / g.hero.vidaMax > 0.5 ? 'esquerda' : 'frente');

// Gritos da pessoa (encontro e cena do 1º quarteirão) — muda o texto em cima dela
export function gritar(g, v, dt, intervalo = 2.4) {
  if (v.salva) return;
  if ((v.gritoT -= dt) <= 0) {
    v.gritoT = intervalo * (0.85 + g.rng.next() * 0.3);
    v.grito = g.rng.pick(['SOCORRO!', 'ME AJUDA!', 'POR FAVOR!', 'SOCORRO!', 'AAAH!']);
    v.gritoDesde = v.t;
    g.emit('socorro', { x: v.x, y: v.y, texto: v.grito });
  }
}

export function atualizarEncontro(g, dt) {
  const e = g.encontro;
  if (!e) return;
  e.t += dt;
  const p = e.pessoa;
  if (e.fase === 'votando' || e.fase === 'ajudando') gritar(g, p, dt);
  if (e.fase === 'ajudando') {
    const vivos = e.zumbis.filter(z => !z.morto);
    if (!vivos.length && dist(g.hero.x, g.hero.y, p.x, p.y) < 1.8) salvar(g, e);
    else if (e.t > ENCONTROS.desisteEm || g.room || g.arena) { e.fase = 'fim'; g.encontro = null; }
  } else if (e.fase === 'ignorada') {
    if (p.t >= p.vida - 0.1 || e.t > 12) g.encontro = null;
  }
}

function salvar(g, e) {
  const E = ENCONTROS, p = e.pessoa;
  e.fase = 'fim';
  p.salva = true; p.gritoDesde = p.t; p.vida = p.t + 6;
  const tipo = g.rng.weighted(E.recompensas);
  g.ganharXp(E.xp * g.nivelAmeaca);
  if (tipo === 'aliado') {
    p.grito = 'Obrigado! Vou com você.'; p.vida = p.t + 1.5;
    g.addAliado('sobrevivente', E.aliadoQuarteiroes, { nick: e.nome, aliado: true });
  } else {
    p.grito = 'Obrigado! Fica com isso.';
    g.agendar(0.8, () => { if (g.fase === 'jogo' && !g.room) g.soltarItemEm(tipo, tipo === 'kit' ? { valor: 30 } : {}, null, p.x + 0.3, p.y); });
  }
  g.emit('encontro_salvo', { nome: e.nome, x: p.x, y: p.y, recompensa: tipo });
  g.emit('aviso', { texto: `🤝 ${e.nome} está a salvo!${tipo === 'aliado' ? ' E vai junto' : ''}`, tipo: 'bom' });
  g.encontro = null;
}

// Quarteirão novo: quem ficou pra trás pode voltar como zumbi (com o nome)
export function voltaramComoZumbi(g) {
  if (!g.perdidos?.length) return;
  const agora = g.perdidos.filter(x => x.quarteirao <= g.stats.quarteiroes);
  if (!agora.length) return;
  g.perdidos = g.perdidos.filter(x => x.quarteirao > g.stats.quarteiroes);
  for (const x of agora) g.agendar(5, () => {
    if (g.fase !== 'jogo' || g.room) return;
    const q = g.pontoNaRua(g.hero, 6, 9, 1);
    if (!q) return;
    const z = g.criarZumbi('comum', q.x, q.y, null, { nome: x.nome, vidaMult: 1.6, nascendo: 0.8 });
    z.roupa = x.roupa; z.ex = true;
    g.emit('aviso', { texto: `🧟 ${x.nome} virou zumbi...`, tipo: 'perigo' });
    g.emit('voltou_zumbi', { nome: x.nome, x: q.x, y: q.y });
  });
}
