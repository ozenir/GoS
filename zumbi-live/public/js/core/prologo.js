// ============================================================================
//  PRÓLOGO — a história antes (e no meio) da partida. Ver historia/HISTORIA.md.
//
//  1. ESCOLHA   o jogo abre com os heróis (o rosto de cada um) e o chat vota pelo número (1 a 6).
//               O Valadares (6) só é liberado depois que algum herói chega a um final.
//  2. FILME     a introdução do escolhido. O entregador tem o filme inteiro (view/cinema.js: a
//               abertura "A tarifa 5×"); os outros, por enquanto, um cartão com o rosto e quem é.
//  3. CAMINHO   se o filme termina numa escolha (o entregador: 1 Vó primeiro / 2 entregas 5×),
//               o chat vota e o caminho muda a partida (CAMINHOS, abaixo).
//  4. A partida começa. No caminho das entregas, o herói anda de MOTO (atropela zumbi e ganha
//     grana; o chat vota a direção nos cruzamentos) e, depois de uns quarteirões, CAI:
//     o filme "A poça" e o resto a pé, com o bolso cheio.
//
//  Enquanto o prólogo está aberto (g.prologo), a rua fica PAUSADA, como no portal dos 500.
//  As decisões valem só dentro da partida (a próxima começa do zero).
// ============================================================================
import { Votacao } from './votacao.js';
import { normalizar } from './util.js';
import { CORPO } from './dados.js';

export const PROLOGO = {
  escolha: { duracao: 20, resultado: 3.5 },   // segundos de votação e de "O CHAT ESCOLHEU"
  caminho: { duracao: 15, resultado: 3 },
  cartao: 9,                                   // a introdução de quem ainda não tem filme
  // filmes prontos (duração igual à da cena em view/cinema.js)
  filmes: { entregador: { cap: 'abertura', dur: 40, escolha: 'entregador' } },
  acidente: { cap: 'acidente', dur: 17 },
  // os heróis na ordem da tela de escolha (o número é o voto)
  herois: [
    { n: 1, classe: 'enfermeira', nome: 'Daiane' },
    { n: 2, classe: 'policial', nome: 'Sargento Edson' },
    { n: 3, classe: 'bombeiro', nome: 'Tati' },
    { n: 4, classe: 'entregador', nome: 'Kauã' },
    { n: 5, classe: 'mecanico', nome: 'Seu Ademir' },
    { n: 6, classe: 'valadares', nome: 'Augusto Valadares', trancado: true }   // ainda sem partida própria
  ],
  // as escolhas dos filmes
  escolhas: {
    entregador: [
      { n: 1, id: 'vo', nome: 'Subir até a Vó Dita', emoji: '🏠', txt: 'Sem arma nenhuma: muita esquiva e velocidade.' },
      { n: 2, id: 'entregas', nome: 'Aceitar as entregas (5×)', emoji: '📦', txt: 'De moto, atropelando zumbi e juntando grana... até a moto não aguentar.' }
    ]
  },
  // o que cada caminho muda
  vo: { esquiva: 0.22, velocidade: 1.25 },
  moto: { quarteiroes: 4, velocidade: 1.75, defesa: 0.35, raio: 0.85, granaMin: 4, granaMax: 12, entregaPorQuarteirao: 45 }
};

// "4", "44", "4️⃣", "#4", "número 4", "o 4" → 4 (até max)
export function lerNumero(texto, max = 9) {
  const t = normalizar(String(texto || '')).replace(/[️⃣]/g, '').replace(/[!?.,;:#()\[\]*"'“”]+/g, ' ').replace(/\s+/g, ' ').trim();
  let m = t.match(/^([1-9])\1*$/) || t.match(/^(?:numero|num|n|o|a|heroi|opcao|vai|bora|vote|voto)\s+([1-9])$/);
  const n = m ? Number(m[1]) : NaN;
  return n >= 1 && n <= max ? n : null;
}

const disponiveis = g => PROLOGO.herois.filter(h => !h.trancado || (h.classe === 'valadares' && g.valadaresLiberado && g.classeExiste?.('valadares')));

// 1. abre a tela de escolha (chamado por novoHeroi quando a história está ligada)
export function abrirEscolha(g) {
  const ops = disponiveis(g).map(h => ({ id: h.classe, n: h.n, nome: h.nome }));
  g.fase = 'prologo';
  g.prologo = { etapa: 'escolha', t: 0, voto: new Votacao(ops, PROLOGO.escolha.duracao, g.cfg.atraso) };
  g.emit('prologo', { etapa: 'escolha' });
}

// Um voto do chat (em g.handle). Devolve true se era voto do prólogo.
export function votoPrologo(g, m) {
  const V = g.prologo?.voto;
  if (!V?.aberta) return false;
  const n = lerNumero(m.texto, V.opcoes.length > 2 ? 6 : 2);
  const op = n && V.opcoes.find(o => o.n === n);
  if (op && V.votar(m.id, op.id)) g.emit('voto', { nick: m.nick, op: op.id, prologo: true });
  return true;
}

export function atualizarPrologo(g, dt) {
  const p = g.prologo;
  p.t += dt;
  if (p.etapa === 'escolha') {
    p.voto.update(dt);
    if (p.voto.restante <= 0) {
      const ant = g.ultimoHeroi?.classe;
      const res = p.voto.fechar(ops => { const outros = ops.filter(o => o.id !== ant); return g.rng.pick(outros.length ? outros : ops).id; }, g.rng);
      Object.assign(p, { etapa: 'escolhido', t: 0, classe: res.id, res });
      g.emit('prologo_escolhido', { classe: res.id, votos: res.votos, auto: res.auto });
    }
  } else if (p.etapa === 'escolhido') {
    if (p.t >= PROLOGO.escolha.resultado) comecarHeroi(g, p.classe);
  } else if (p.etapa === 'filme') {
    if (p.t >= p.dur) {
      const esc = PROLOGO.filmes[p.classe]?.escolha;
      if (esc) {
        const ops = PROLOGO.escolhas[esc].map(o => ({ ...o }));
        Object.assign(p, { etapa: 'caminho', t: 0, voto: new Votacao(ops, PROLOGO.caminho.duracao, g.cfg.atraso) });
        g.emit('prologo', { etapa: 'caminho' });
      } else terminar(g);
    }
  } else if (p.etapa === 'caminho') {
    p.voto.update(dt);
    if (p.voto.restante <= 0) {
      // ninguém votou: a IA vai pela avó (vida acima de tudo)
      const res = p.voto.fechar(ops => ops[0].id, g.rng);
      aplicarCaminho(g, res.id);
      Object.assign(p, { etapa: 'caminho_res', t: 0, res });
      g.emit('prologo_caminho', { id: res.id, votos: res.votos, auto: res.auto });
    }
  } else if (p.etapa === 'caminho_res') {
    if (p.t >= PROLOGO.caminho.resultado) terminar(g);
  } else if (p.etapa === 'acidente') {
    if (p.t >= p.dur) { fimDaMoto(g); terminar(g); }
  }
}

// 2. o escolhido: monta o herói daquela classe e toca a introdução dele
export function comecarHeroi(g, classe) {
  g.heroiN--;                       // (o número do sobrevivente não conta duas vezes)
  g.novoHeroi(classe);
  const f = PROLOGO.filmes[classe];
  g.fase = 'prologo';
  g.prologo = { etapa: 'filme', t: 0, classe, cap: f ? f.cap : 'cartao', dur: f ? f.dur : PROLOGO.cartao };
  g.emit('prologo', { etapa: 'filme', classe, cap: g.prologo.cap });
}

function terminar(g) {
  const etapa = g.prologo?.etapa;
  g.prologo = null;
  g.fase = 'jogo';
  g.aplicarPendentes();
  g.emit('prologo_fim', { abertura: etapa !== 'acidente', caminho: g.hero.caminho || null });
}

// 3. o caminho escolhido muda a partida
export function aplicarCaminho(g, id) {
  const h = g.hero;
  h.caminho = id;
  if (id === 'vo') {
    // a pé e sem arma nenhuma: só as mãos, muita esquiva e perna
    h.arma = null; h.municao = null; h.armaFixa = null;
    h.corpo = 'empurrao'; h.golpes = CORPO.empurrao.golpes || 0;
    h.attr.addMod({ id: 'caminho_vo_esquiva', attr: 'esquiva', soma: PROLOGO.vo.esquiva, fonte: 'a Vó primeiro' });
    h.attr.addMod({ id: 'caminho_vo_perna', attr: 'velocidade', mult: PROLOGO.vo.velocidade, fonte: 'a Vó primeiro' });
  } else if (id === 'entregas') {
    // de moto: o chat vota a direção (reto, direita, esquerda), não o destino no mapa
    h.moto = { ate: g.stats.quarteiroes + PROLOGO.moto.quarteiroes, ganho: 0, atropelados: 0 };
    g.S.mapaAntesDaMoto = g.S.mapa;
    g.S.mapa = 0;
    h.attr.addMod({ id: 'moto', attr: 'velocidade', mult: PROLOGO.moto.velocidade, fonte: 'moto' });
    h.attr.addMod({ id: 'moto_defesa', attr: 'defesa', soma: PROLOGO.moto.defesa, fonte: 'moto' });   // quem chega perto é atropelado antes
  }
}

// A cada quadro da partida, de moto: atropela quem estiver na frente; depois de uns quarteirões, cai
export function atualizarMoto(g, dt, ZUMBIS) {
  const h = g.hero, m = h.moto, M = PROLOGO.moto;
  if (!m) return;
  for (const z of g.zumbis) {
    if (z.morto || z.nascendo > 0 || ZUMBIS[z.tipo].chefe) continue;
    const d = Math.hypot(z.x - h.x, z.y - h.y);
    if (d > M.raio + (ZUMBIS[z.tipo].raio || 0.3)) continue;
    g.ferirZumbi(z, 99999, null, true);
    const valor = g.rng.int(M.granaMin, M.granaMax);
    h.grana = (h.grana || 0) + valor; m.ganho += valor; m.atropelados++;
    g.emit('atropelou', { x: z.x, y: z.y, valor });
  }
  // a queda: no começo de um quarteirão, fora de prédio e de arena
  if (g.stats.quarteiroes >= m.ate && !g.room && !g.arena && !g.caido && g.fase === 'jogo') {
    g.fase = 'prologo';
    g.prologo = { etapa: 'acidente', t: 0, classe: h.classe, cap: PROLOGO.acidente.cap, dur: PROLOGO.acidente.dur };
    g.emit('prologo', { etapa: 'acidente', cap: PROLOGO.acidente.cap });
  }
}

// Depois da queda: a pé, com o pagamento das entregas (5×) no bolso
export function fimDaMoto(g) {
  const h = g.hero, m = h.moto;
  if (!m) return;
  const pago = PROLOGO.moto.entregaPorQuarteirao * PROLOGO.moto.quarteiroes;
  h.grana = (h.grana || 0) + pago;
  h.attr.removeMod('moto'); h.attr.removeMod('moto_defesa');
  h.moto = null;
  h.caiuDaMoto = true;
  g.S.mapa = g.S.mapaAntesDaMoto ?? 1;
  g.emit('grana', { valor: pago, x: h.x, y: h.y });
  g.emit('aviso', { texto: `🛵 A moto ficou pra trás. 💰 R$ ${h.grana} no bolso.`, tipo: 'bom' });
}
