// ============================================================================
//  O BARGANHA — o comerciante. Compra, vende e troca.
//
//  Ele SEMPRE fica numa RUA SEM SAÍDA, dentro de um GALPÃO fechado que só tem um JANELÃO aberto, com uma TOCHA
//  AZUL tremeluzindo na parede, que ilumina a rua sem saída.
//
//  Como acontece:
//    1. A cada quarteirão novo que o herói começa, 10% de chance (MASCATE.chance) de o Barganha estar numa rua
//       do lado do próximo cruzamento. Essa rua vira sem saída: o galpão fecha ela no meio (city.js → galpoes).
//    2. O herói chega no cruzamento (com a área limpa) e PARA: o chat vota se vai até o Barganha
//         1 IR NA BANCA   ou   2 SEGUIR   (ninguém votou: a IA vai se tiver grana ou alguma coisa pra vender)
//       Seguir: o janelão fecha e a tocha apaga. Ir: ele entra na rua sem saída e para na frente do janelão.
//    3. Abre a BANCA (view/banca.js): a rua fica pausada e aparece o balcão do Barganha, como uma banca de
//       revista, com os itens na prateleira (itens.js). O chat vota de 1 a 9:
//         1 a 6  COMPRAR o item daquela prateleira (armas em cima, tônicos embaixo)
//         7      VENDER   o que ele oferece pelo pertence mais valioso do herói (metade do preço)
//         8      TROCAR   um pertence do herói por um item da prateleira (o pertence vale o preço cheio)
//         9      SAIR
//       Fechou negócio, ele oferece de novo (até MASCATE.rodadas). Ninguém votou: a IA decide e a banca fecha.
//    4. O herói volta pro cruzamento e segue. O janelão fecha e a tocha apaga atrás dele.
// ============================================================================
import { Votacao, lerNumero } from './votacao.js';
import { dist, turnLeft, turnRight } from './util.js';
import { RESULTADO_SEG } from './jogo.js';
import { CLASSES } from './dados.js';
import { ITENS, ARMAS_LOJA, fazSentido, pertences, tirarPertence, entregarItem, sortearTonico } from './itens.js';

export const MASCATE = {
  nome: 'O Barganha', emoji: '🧥',
  chance: 0.1,            // a cada quarteirão novo
  desdeQuarteirao: 2,     // (o 1º quarteirão tem a cena da chegada: sobrevivencia.js)
  rodadas: 3,             // negócios por visita, no máximo
  granaInicial: 10,
  segAbrindo: 1.4, segResultado: 3.2, segFechando: 1.4,
  votoMin: 14,            // a banca tem mais coisa pra ler: a votação dura pelo menos isso (+ o atraso da live)
  // grana: cai de zumbi (chance, valor), chefe dá mais; e tem nos prédios
  dropZumbi: { chance: 0.06, min: 1, max: 4 }, dropChefe: { min: 12, max: 25 }, predio: { chance: 0.6, min: 4, max: 10 },
  // tônico fora da loja: chefe às vezes deixa um; às vezes tem um escondido num prédio
  tonicoChefe: 0.35, tonicoPredio: 0.15,
  falas: {
    chega: ['Ô, parceiro! Chega mais, que a banca tá aberta.', 'Hehehe... Compro, vendo e troco. Que que vai levar?', 'Psiu! Aqui, debaixo da tocha.', 'Tenho coisa boa hoje, parceiro. Hehehe.'],
    compra: ['Hehehe... boa escolha!', 'Negócio fechado, parceiro!', 'Isso vai te manter vivo... por enquanto.'],
    vende: ['Isso aí eu pago bem!', 'Hmm... serve. Toma a grana.'],
    troca: ['Troca justa, hehehe.', 'Tá trocado! Não tem devolução.'],
    semGrana: ['Sem grana, sem negócio... hehe.', 'Volta quando tiver dinheiro, parceiro.'],
    deNovo: ['Mais alguma coisa?', 'E aí, vai mais o quê?', 'Aproveita, que amanhã eu não sei onde eu tô.'],
    tchau: ['Volte sempre... se continuar vivo!', 'Até a próxima, parceiro!', 'Hehehe... cuidado lá fora.']
  }
};

const fala = (g, tipo) => g.rng.pick(MASCATE.falas[tipo]);
const FASES_ATIVAS = new Set(['entrando', 'loja', 'saindo']);
// O herói está no cruzamento do Barganha esperando (ou o chat votando se vai): ainda não atravessa
export const mascateSegura = g => !!g.mascate && (g.mascate.fase === 'esperando' || g.mascate.fase === 'perguntando');
// O herói está indo, está na banca ou voltando dela (a rota normal espera)
export const mascateAtivo = g => !!g.mascate && FASES_ATIVAS.has(g.mascate.fase);
// A câmera olha pra dentro da rua sem saída enquanto ele entra e negocia (o janelão fica de frente)
export const direcaoDaCamera = g => (g.mascate && (g.mascate.fase === 'entrando' || g.mascate.fase === 'loja') ? g.mascate.dirBeco : g.rota.dir);

/* =================== Onde ele aparece =================== */
// Quarteirão novo: 10% de chance de o Barganha estar numa rua do lado do próximo cruzamento
export function talvezMascate(g) {
  const M = MASCATE;
  if (!g.S.mascate || g.mascate || g.encontro || g.hero.moto || g.room || g.arena || g.rota.beco || g.destino || g.indoPorta || g.indoPraca) return false;
  if (g.stats.quarteiroes < M.desdeQuarteirao || !g.rng.chance(M.chance)) return false;
  return !!aparecerMascate(g);
}

// Escolhe a rua do lado (esquerda ou direita) do cruzamento da frente que não é o caminho do herói nem está
// bloqueada, e põe o galpão nela: a rua vira sem saída, com o janelão virado pro cruzamento.
export function aparecerMascate(g) {
  const r = g.rota, N = r.alvo;
  const lados = [turnLeft(r.dir), turnRight(r.dir)];
  if (g.rng.next() < 0.5) lados.reverse();
  for (const d of lados) {
    if (g.decisao && g.decisao.dir === d) continue;            // é por ali que ele vai seguir
    const t = g.city.trecho(N.i, N.j, d);
    if (t.s.bloqueio) continue;
    const gp = g.city.abrirGalpao(t.axis, t.i, t.j, t.inicio ? -1 : 1);
    const entrada = g.city.nodePos(N.i, N.j);
    g.mascate = { gp, no: { i: N.i, j: N.j }, entrada, dirBeco: d, fase: 'esperando', t: 0, fala: fala(g, 'chega'), falaT: 0, x: gp.janela.x, y: gp.janela.y };
    g.mascateUltimo = g.t;
    g.emit('mascate', { fase: 'chegou', x: gp.janela.x, y: gp.janela.y });
    return g.mascate;
  }
  return null;
}

/* =================== O herói indo até o janelão e voltando =================== */
// Ponto pra onde o herói vai por causa do Barganha (ou null: segue a rota normal)
export function objetivoMascate(g, dt) {
  const m = g.mascate, h = g.hero;
  if (!m) return null;
  if (m.fase === 'esperando') {
    // chegou no cruzamento com a área limpa (como pra atravessar) e sem outra votação na tela: pergunta pro chat
    const livre = !g.voto?.aberta && g.t - (g.decididoEm ?? -1e9) >= RESULTADO_SEG;
    if (dist(h.x, h.y, m.entrada.x, m.entrada.y) < 1.4 && livre && g.liberarArea(0)) perguntarBarganha(g);
    else return null;
  }
  // (a votação, a do Barganha ou uma de direção que já estava aberta, continua correndo)
  if (g.voto?.aberta) { g.voto.update(dt); if (g.voto.t <= 0) g.fecharVotacao(); }
  if (!g.mascate) return null;
  if (m.fase === 'perguntando') return { x: m.entrada.x, y: m.entrada.y, esperando: true };
  if (m.fase === 'entrando') {
    const p = m.gp.ponto;
    if (dist(h.x, h.y, p.x, p.y) < 0.45) { abrirLoja(g); return { x: p.x, y: p.y, esperando: true }; }
    return { x: p.x, y: p.y, ritmo: 1 };
  }
  if (m.fase === 'loja') return { x: h.x, y: h.y, esperando: true };
  if (m.fase === 'saindo') {
    if (dist(h.x, h.y, m.entrada.x, m.entrada.y) < 1.2) { m.gp.aberto = false; g.mascate = null; g.areaLiberada = false; if (g.voto?.mascate) g.voto = null; g.emit('mascate', { fase: 'fechou', x: m.x, y: m.y }); return null; }
    return { x: m.entrada.x, y: m.entrada.y };
  }
  return null;
}

// A cada quadro: some se o herói entrou num prédio/arena; por segurança, se ele não chega, é levado
export function atualizarMascate(g, dt) {
  const m = g.mascate;
  if (!m) return;
  m.t += dt; m.falaT += dt;
  if (g.room || g.arena || g.fase !== 'jogo') { m.gp.aberto = false; g.mascate = null; return; }
  const h = g.hero;
  if (m.fase === 'entrando' && m.t > 30 && !g.caido) { h.x = m.gp.ponto.x; h.y = m.gp.ponto.y; h.ultimaPos = { x: h.x, y: h.y }; }
  if (m.fase === 'saindo' && m.t > 30 && !g.caido) { h.x = m.entrada.x; h.y = m.entrada.y; h.ultimaPos = { x: h.x, y: h.y }; }
  // ficou pra trás (o herói nunca chegou no cruzamento: foi por outro caminho)
  if (m.fase === 'esperando' && m.t > 150) { m.gp.aberto = false; g.mascate = null; }
}

/* =================== O chat decide: ir na banca ou seguir =================== */
export function perguntarBarganha(g) {
  const m = g.mascate;
  m.fase = 'perguntando'; m.t = 0;
  const voto = new Votacao([
    { id: 'esquerda', n: 1, nome: 'IR NA BANCA', seta: '🔵' },
    { id: 'frente', n: 2, nome: 'SEGUIR', seta: '🚶' }
  ], g.cfg.votoDur, g.cfg.atraso);
  voto.mascate = { fala: m.fala, grana: g.hero.grana || 0 };
  g.voto = voto;
  g.emit('votacao_abriu', { opcoes: ['esquerda', 'frente'], mascate: true });
  return voto;
}

// Ninguém votou: vai se tiver grana pra alguma coisa ou alguma coisa pra vender
export function escolhaBarganhaIA(g) {
  return (g.hero.grana || 0) >= 25 || pertences(g).length ? 'esquerda' : 'frente';
}

export function decidirBarganha(g, id, res) {
  const m = g.mascate;
  if (!m) return;
  const ir = id === 'esquerda';
  const voto = g.voto;
  const previsao = ir
    ? { risco: 'tranquilo', rotulo: 'VAI NA BANCA', emoji: '🔵', itens: ['🧥 compra, vende e troca', `💰 R$ ${g.hero.grana || 0} no bolso`] }
    : { risco: 'tranquilo', rotulo: 'SEGUE A VIAGEM', emoji: '🚶', itens: ['🔒 o janelão fecha', '🧥 até a próxima...'] };
  g.decididoEm = g.t;
  g.emit('decisao', { id, n: ir ? 1 : 2, nome: ir ? 'IR NA BANCA' : 'SEGUIR', seta: ir ? '🔵' : '🚶', votos: res.votos, total: voto?.total ?? 0, auto: res.auto, empate: !!res.empate, quem: [], previsao, mascate: true });
  if (ir) { m.fase = 'entrando'; m.t = 0; g.emit('mascate', { fase: 'entrando', x: m.x, y: m.y }); return; }
  // seguiu: a porta de enrolar desce e a tocha apaga
  m.gp.aberto = false; m.fala = fala(g, 'tchau'); g.mascate = null;
  g.emit('mascate', { fase: 'tchau', x: m.x, y: m.y });
  g.agendar(RESULTADO_SEG, () => { if (g.voto === voto) g.voto = null; }, true);
}

/* =================== A banca =================== */
// A prateleira da visita: em cima as armas (o que faz sentido pro herói), embaixo os tônicos. 6 lugares.
export function montarPrateleira(g) {
  const h = g.hero, rng = g.rng, perto = CLASSES[h.classe].estilo === 'perto';
  const peso = id => ({ pistola: !h.arma ? 5 : 1, municao: h.municao != null && h.municao < 12 ? 4 : 1.5, escopeta: 2, taco: perto ? 2.5 : 1, metralhadora: 1.2, lanca: 1 })[id] ?? 1;
  const armas = ARMAS_LOJA.filter(id => fazSentido(h, id)).map(id => [id, peso(id) * (0.5 + rng.next())]).sort((a, b) => b[1] - a[1]).slice(0, 3).map(a => a[0]);
  const tonicos = [];
  for (let k = 0; tonicos.length < 6 - armas.length && k < 300; k++) { const id = sortearTonico(rng); if (!tonicos.includes(id)) tonicos.push(id); }
  return [...armas, ...tonicos].map((id, k) => ({ n: k + 1, id, preco: ITENS[id].preco, vendido: false }));
}

export function abrirLoja(g) {
  const m = g.mascate;
  m.fase = 'loja'; m.t = 0;
  if (g.voto?.mascate) g.voto = null;
  g.loja = { m, prateleira: montarPrateleira(g), rodada: 0, fase: 'abrindo', t: 0, fala: m.fala, ofertas: null, voto: null, ultimo: null, historico: [] };
  g.emit('loja', { fase: 'abriu' });
  return g.loja;
}

// O que dá pra fazer nesta rodada: os 6 da prateleira, vender (7), trocar (8) e sair (9).
// Cada oferta: { n, tipo: 'comprar'|'vender'|'trocar'|'sair', ... , ok (dá pra votar) }
export function montarOfertas(g) {
  const L = g.loja, h = g.hero, ofs = [];
  for (const s of L.prateleira) {
    const it = ITENS[s.id];
    ofs.push({ n: s.n, tipo: 'comprar', slot: s, id: s.id, nome: it.nome, emoji: it.emoji, desc: it.desc, preco: s.preco, ok: !s.vendido && fazSentido(h, s.id), caro: s.preco > (h.grana || 0), vendido: s.vendido });
  }
  const meus = pertences(g);
  // vender: ele faz oferta pelo pertence mais valioso
  const v = [...meus].sort((a, b) => b.venda - a.venda)[0];
  ofs.push(v ? { n: 7, tipo: 'vender', pertence: v, nome: `Vender ${v.nome}`, emoji: '💸', desc: `${v.emoji} ${v.nome} → +R$ ${v.venda}`, ganho: v.venda, ok: true }
    : { n: 7, tipo: 'vender', nome: 'Vender', emoji: '💸', desc: 'nada pra vender', ok: false });
  // trocar: o pertence vale o preço cheio; leva o melhor da prateleira que caiba nisso
  let melhor = null;
  for (const p of meus) for (const s of L.prateleira) {
    if (s.vendido || s.id === p.id || !fazSentido(h, s.id) || s.preco > p.valor) continue;
    const nota = s.preco - p.valor * 0.15 + g.rng.next();
    if (!melhor || nota > melhor.nota) melhor = { p, s, nota };
  }
  ofs.push(melhor ? { n: 8, tipo: 'trocar', pertence: melhor.p, slot: melhor.s, id: melhor.s.id, nome: `Trocar ${melhor.p.nome}`, emoji: '🔄', desc: `${melhor.p.emoji} ${melhor.p.nome} ⇄ ${ITENS[melhor.s.id].emoji} ${ITENS[melhor.s.id].nome}`, ok: true }
    : { n: 8, tipo: 'trocar', nome: 'Trocar', emoji: '🔄', desc: meus.length ? 'nada que valha a troca' : 'nada pra trocar', ok: false });
  ofs.push({ n: 9, tipo: 'sair', nome: 'Sair', emoji: '🚶', desc: 'tchau, Barganha', ok: true });
  return ofs;
}

function novaRodada(g) {
  const L = g.loja;
  L.ofertas = montarOfertas(g);
  const ops = L.ofertas.filter(o => o.ok).map(o => ({ id: 'n' + o.n, n: o.n, nome: o.nome.toUpperCase(), seta: o.emoji, oferta: o }));
  L.voto = new Votacao(ops, Math.max(g.cfg.votoDur, MASCATE.votoMin), g.cfg.atraso);
  L.fase = 'votando'; L.t = 0;
  g.emit('loja', { fase: 'rodada', rodada: L.rodada });
}

// Voto do chat na banca (1 a 9, ou "vender", "trocar", "sair"). true = era voto da banca.
export function votoLoja(g, m) {
  const L = g.loja;
  if (!L || L.fase !== 'votando' || !L.voto?.aberta) return false;
  const n = lerNumero(m.texto, 9);
  if (n == null) return false;
  if (L.voto.votar(m.id, 'n' + n)) g.emit('voto', { nick: m.nick, op: 'n' + n, loja: true });
  return true;
}

// Ninguém votou: compra o que ele mais precisa (se der), troca ou vende se estiver duro, senão sai
export function escolhaLojaIA(g, ops) {
  const h = g.hero, vida = h.vida / h.vidaMax, grana = h.grana || 0;
  const compra = id => ops.find(o => o.oferta.tipo === 'comprar' && o.oferta.id === id && o.oferta.preco <= grana);
  const precisa = (vida < 0.5 && compra('t_sangue')) || (!h.arma && (compra('pistola') || compra('escopeta'))) || (h.municao != null && h.municao < 12 && compra('municao'));
  if (precisa) return precisa.id;
  if (grana >= 60) {
    const c = ops.filter(o => o.oferta.tipo === 'comprar' && o.oferta.preco <= grana * 0.75).sort((a, b) => b.oferta.preco - a.oferta.preco)[0];
    if (c) return c.id;
  }
  if (grana < 15) {
    const t = ops.find(o => o.oferta.tipo === 'trocar' && ITENS[o.oferta.id]?.preco >= o.oferta.pertence.valor * 0.7);
    if (t) return t.id;
    const v = ops.find(o => o.oferta.tipo === 'vender');
    if (v) return v.id;
  }
  return ops.find(o => o.oferta.tipo === 'sair').id;
}

// Fecha a votação da rodada e faz o negócio
export function decidirLoja(g, id, res) {
  const L = g.loja, h = g.hero, op = L.voto.opcoes.find(x => x.id === id), o = op?.oferta;
  L.voto.aberta = false;
  let fez = false, texto = '', som = 'nada';
  if (o?.tipo === 'comprar') {
    if ((h.grana || 0) < o.preco) { L.fala = fala(g, 'semGrana'); texto = `💸 sem grana pro ${o.nome.toLowerCase()}`; }
    else {
      h.grana -= o.preco; o.slot.vendido = true; entregarItem(g, o.id); fez = true; som = 'comprar';
      L.fala = fala(g, 'compra'); texto = `${o.emoji} ${o.nome} · −R$ ${o.preco}`;
      g.emit('grana', { valor: -o.preco, x: h.x, y: h.y });
    }
  } else if (o?.tipo === 'vender') {
    if (tirarPertence(g, o.pertence)) {
      h.grana = (h.grana || 0) + o.ganho; fez = true; som = 'vender';
      L.fala = fala(g, 'vende'); texto = `💸 vendeu ${o.pertence.nome.toLowerCase()} · +R$ ${o.ganho}`;
      g.emit('grana', { valor: o.ganho, x: h.x, y: h.y });
    }
  } else if (o?.tipo === 'trocar') {
    if (tirarPertence(g, o.pertence)) {
      o.slot.vendido = true; entregarItem(g, o.id); fez = true; som = 'trocar';
      L.fala = fala(g, 'troca'); texto = `🔄 ${o.pertence.nome} ⇄ ${ITENS[o.id].nome}`;
    }
  } else { L.fala = fala(g, 'tchau'); som = 'tchau'; texto = '🚶 segue a viagem'; }
  L.rodada++;
  L.ultimo = { n: op?.n ?? 9, tipo: o?.tipo || 'sair', fez, texto, auto: !!res.auto, votos: res.votos || 0, empate: !!res.empate };
  if (fez) L.historico.push(texto);
  L.continua = fez && L.rodada < MASCATE.rodadas && !res.auto;
  if (L.continua) L.falaDepois = fala(g, 'deNovo');
  else if (o?.tipo !== 'sair') L.falaDepois = fala(g, 'tchau');
  L.fase = 'resultado'; L.t = 0;
  g.emit('mascate', { fase: som, x: L.m.x, y: L.m.y });
  g.emit('loja', { fase: 'resultado', ...L.ultimo });
}

// A banca anda mesmo com a rua pausada (jogo.js → update)
export function atualizarLoja(g, dt) {
  const L = g.loja;
  L.t += dt;
  if (L.fase === 'abrindo' && L.t >= MASCATE.segAbrindo) novaRodada(g);
  else if (L.fase === 'votando') {
    L.voto.update(dt);
    if (L.voto.t <= 0) { const res = L.voto.fechar(ops => escolhaLojaIA(g, ops), g.rng); decidirLoja(g, res.id, res); }
  } else if (L.fase === 'resultado' && L.t >= MASCATE.segResultado) {
    if (L.falaDepois) { L.fala = L.falaDepois; L.falaDepois = null; }
    if (L.continua) novaRodada(g);
    else { L.fase = 'fechando'; L.t = 0; g.emit('loja', { fase: 'fechando' }); }
  } else if (L.fase === 'fechando' && L.t >= MASCATE.segFechando) {
    const m = L.m;
    g.loja = null;
    m.fase = 'saindo'; m.t = 0; m.fala = L.fala; m.falaT = 0;
    g.emit('loja', { fase: 'fechou' });
  }
}
