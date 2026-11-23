// ============================================================================
//  CENÁRIO VIVO — a cidade em volta do herói, que fica mais caótica quanto mais longe ele vai (city.js → CAOS).
//
//  - Veículos de emergência PASSANDO com a sirene ligada (viatura, ambulância, caminhão de bombeiros): cruzam a rua
//    do lado num cruzamento perto (nunca a do herói), atropelando os zumbis que estiverem no caminho. Quanto mais
//    caos, mais seguido.
//  - Pessoas nas JANELAS dos prédios: aparecem, acenam e falam com o herói ("Socorro!", "O que tá acontecendo?!",
//    "Cuidado, atrás de você!"...). Com zumbi perto do herói, avisam; de noite, perguntam se tem alguém aí.
//  (Os veículos parados com as luzes piscando, as lixeiras pegando fogo e as ruas interditadas pela polícia
//  já vêm na rua: city.js → CAOS.)
// ============================================================================
import { DIRS, dist, turnLeft } from './util.js';
import { VEICULOS_EMERGENCIA } from './city.js';
import { ruaLivre } from './mapa.js';
import { ZUMBIS } from './dados.js';

export const CENARIO = {
  viatura: { cada: [24, 50], primeira: [14, 26], vel: 8.5, distancia: 26, longeDoHeroi: 7, empurra: 7, dano: 25 },
  janela: { cada: [6, 13], primeira: [5, 10], dur: 6.5, perto: 4, longe: 13, max: 3 },
  falas: {
    socorro: ['Socorro!', 'Me tira daqui!', 'Ajuda, por favor!', 'Tem gente presa aqui!', 'Meu filho tá doente!'],
    pergunta: ['O que tá acontecendo?!', 'Cadê a polícia?!', 'É o fim do mundo?', 'Ei! Tá vindo o resgate?', 'Liga pra alguém!'],
    aviso: ['Cuidado!', 'Atrás de você!', 'Eles tão vindo!', 'Corre!', 'Não para!'],
    noite: ['Tem alguém aí?', 'Apaga essa luz!', 'Shhh... eles ouvem!', 'Não consigo dormir...'],
    torcida: ['Vai, herói!', 'Você consegue!', 'Acaba com eles!', 'Leva a gente junto!']
  }
};

export function atualizarCenario(g, dt) {
  // veículos andando (também durante a cena, que só não ganha novos)
  if (g.viaturas?.length) moverViaturas(g, dt);
  if (g.janelas?.length) g.janelas = g.janelas.filter(j => (j.t += dt) < j.dur);
  if (g.room || g.arena || g.fase !== 'jogo' || g.caido || (g.cena && g.cena.fase !== 'fim')) return;
  const caos = g.city.caos(g.rota.i, g.rota.j), V = CENARIO.viatura, J = CENARIO.janela;
  g.viaturaT = (g.viaturaT ?? g.rng.range(...V.primeira)) - dt;
  if (g.viaturaT <= 0) { g.viaturaT = g.rng.range(...V.cada) / (0.45 + caos); passarViatura(g); }
  g.janelaT = (g.janelaT ?? g.rng.range(...J.primeira)) - dt;
  if (g.janelaT <= 0) { g.janelaT = g.rng.range(...J.cada) / (0.6 + caos * 0.8); aparecerNaJanela(g); }
}

// Um veículo de emergência cruzando a rua do lado num cruzamento perto (o da frente ou o de trás), longe do herói
export function passarViatura(g, tipo = null) {
  const r = g.rota, h = g.hero, V = CENARIO.viatura;
  const nos = [r.alvo, { i: r.i, j: r.j }].map(no => ({ no, p: g.city.nodePos(no.i, no.j) })).sort((a, b) => dist(h.x, h.y, a.p.x, a.p.y) - dist(h.x, h.y, b.p.x, b.p.y));
  for (const { no, p } of nos) {   // o cruzamento mais perto (pra aparecer na tela), mas não em cima do herói
    if (dist(h.x, h.y, p.x, p.y) < V.longeDoHeroi) continue;
    const lado = turnLeft(r.dir);
    if (!ruaLivre(g.city, no.i, no.j, lado) || !ruaLivre(g.city, no.i, no.j, (lado + 2) % 4)) continue;
    const s = g.rng.chance(0.5) ? 1 : -1, [dx, dy] = DIRS[lado];
    const t = tipo || g.rng.pick(VEICULOS_EMERGENCIA);
    const v = { tipo: t, x: p.x - dx * s * V.distancia, y: p.y - dy * s * V.distancia, dx: dx * s, dy: dy * s, vel: V.vel, t: 0, dur: (2 * V.distancia) / V.vel, atingidos: new Set() };
    (g.viaturas ||= []).push(v);
    g.emit('viatura_passando', { tipo: t, x0: v.x, y0: v.y, dx: v.dx, dy: v.dy, vel: v.vel, dur: v.dur });
    return v;
  }
  return null;
}

function moverViaturas(g, dt) {
  const V = CENARIO.viatura;
  for (const v of g.viaturas) {
    v.t += dt; v.x += v.dx * v.vel * dt; v.y += v.dy * v.vel * dt;
    // zumbi no caminho: atropelado (empurrado pro lado, com dano)
    for (const z of g.zumbis) {
      if (z.morto || v.atingidos.has(z) || ZUMBIS[z.tipo].chefe) continue;
      const qx = z.x - v.x, qy = z.y - v.y, ao = qx * v.dx + qy * v.dy, lat = qx * -v.dy + qy * v.dx;
      if (Math.abs(ao) > 1.1 || Math.abs(lat) > 0.8) continue;
      v.atingidos.add(z);
      const s = lat >= 0 ? 1 : -1;
      z.kx += (-v.dy * s * 0.7 + v.dx * 0.5) * V.empurra; z.ky += (v.dx * s * 0.7 + v.dy * 0.5) * V.empurra;
      g.ferirZumbi(z, V.dano, null);
      g.emit('atropelou', { x: z.x, y: z.y, heroi: false });
    }
  }
  g.viaturas = g.viaturas.filter(v => v.t < v.dur);
}

// Alguém aparece na janela de um prédio perto (4 a 13 casas do herói), acena e fala
export function aparecerNaJanela(g) {
  const h = g.hero, J = CENARIO.janela, F = CENARIO.falas;
  if ((g.janelas ||= []).length >= J.max) return null;
  const perto = g.city.objectsIn(h.x - J.longe, h.y - J.longe, h.x + J.longe, h.y + J.longe)
    .filter(o => o.kind === 'building' && !o.b.shop && !o.b.ruina && !g.janelas.some(j => j.b.id === o.b.id))
    .filter(o => { const d = dist(h.x, h.y, (o.b.x0 + o.b.x1) / 2, (o.b.y0 + o.b.y1) / 2); return d > J.perto && d < J.longe; });
  if (!perto.length) return null;
  const b = g.rng.pick(perto).b;
  const zumbiPerto = g.zumbis.some(z => !z.morto && !z.devorando && dist(z.x, z.y, h.x, h.y) < 4);
  const lista = zumbiPerto && g.rng.chance(0.7) ? F.aviso : g.ehNoite() && g.rng.chance(0.5) ? F.noite
    : g.rng.weighted([[F.socorro, 3], [F.pergunta, 3], [F.torcida, 1.5]]);
  const texto = g.rng.pick(lista);
  const j = { b, lado: g.rng.int(0, 1), a: g.rng.range(0.25, 0.75), alt: b.casa ? 0.55 : g.rng.range(0.35, 0.8), texto, t: 0, dur: J.dur, roupa: g.rng.int(0, 5), acena: g.rng.chance(0.7) };
  g.janelas.push(j);
  g.emit('janela', { x: (b.x0 + b.x1) / 2, y: (b.y0 + b.y1) / 2, texto, socorro: F.socorro.includes(texto) });
  return j;
}
