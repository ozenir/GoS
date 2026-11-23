// ============================================================================
//  SOBREVIVÊNCIA — o jogo mais lento e de sobrevivência (menos arcade).
//
//  - Ritmo: o 1º quarteirão tem uma luta só (a cena abaixo). Depois a rua vai enchendo aos poucos,
//    quarteirão a quarteirão, até o número normal de zumbis (rampa). O tempo também pesa menos na
//    ameaça enquanto a rua está calma.
//  - Passo cuidadoso: sem zumbi por perto, o herói anda devagar, olhando em volta (o som dos passos
//    acompanha: view/som.js).
//  - A cena do 1º quarteirão: um zumbi agachado devorando uma pessoa que pede socorro. Ele só levanta
//    quando o herói chega perto (ou leva um golpe/tiro). Morto o zumbi, a pessoa agradece e dá um curativo.
//  - Duelo: com poucos zumbis por perto (até duelo.max), a luta é de verdade. O zumbi PREPARA o bote
//    (fica parado, inclinado, uns 0,5 s) e avança. O herói de perto espera a brecha: entra, bate e recua
//    pra fora do alcance; vendo o bote a tempo, desvia. Quem atira mantém distância. Recuando, ele pode
//    TROPEÇAR (cai, se machuca um pouco e fica 1 s no chão). Com mais zumbis, volta a briga de horda.
// ============================================================================
import { clamp, dist, DIRS } from './util.js';
import { ZUMBIS, CORPO } from './dados.js';
import { MORDIDA } from './dano.js';

export const SOBREVIVENCIA = {
  // quantos zumbis da rua aparecem (fração do normal): 0 no 1º quarteirão (a cena), rampaInicio no 2º,
  // subindo até 1 (o normal) no quarteirão quarteiroesAteCheio
  rampaInicio: 0.2, quarteiroesAteCheio: 8,
  // o tempo conta pra ameaça só nesta fração enquanto a rua ainda está calma (no mínimo tempoMin)
  tempoMin: 0.7,
  // com poucos zumbis, cada um vale mais experiência: × (1 + (1 - rampa) × xpRampa)
  xpRampa: 1.5,
  // destinos: cada direção da votação leva a um lugar (mercado, hospital, delegacia...). Sem loja de verdade no
  // cruzamento do fim da rua, uma aparece com esta chance (jogo.js → destinoDaDirecao)
  destinoChance: 0.65,
  // passo cuidadoso: sem zumbi acordado a menos de calmaRaio casas, anda a calmaVel da velocidade
  calmaVel: 0.6, calmaRaio: 7,
  duelo: {
    max: 2, raio: 6,       // até `max` zumbis acordados a menos de `raio` casas (e nenhum chefe): duelo
    guarda: 1.6,           // distância que o herói de perto espera depois de bater (dentro do alcance do bote)
    distancia: 3.4,        // distância que quem atira tenta manter
    bote: 0.5,             // segundos que o zumbi se prepara antes de avançar (dá pra ver)
    investida: 1,          // quanto ele avança no bote (casas): da guarda, chega no herói se ele não desviar
    alcanceBote: 1,        // o zumbi arma o bote a até (alcance dele + 0,12 + isto) do herói
    reacao: 0.55,          // chance do herói ler o bote e desviar (+reacaoPorAgilidade por ponto de agilidade acima de 2)
    reacaoPorAgilidade: 0.08,
    recuo: 0.85            // velocidade recuando (fração)
  },
  // tropeço recuando no duelo: chance por segundo recuando, dano (fração da vida máxima), tempo no chão
  tropeco: { chancePorSegundo: 0.07, menosPorAgilidade: 0.012, dano: 0.04, dur: 1.1, recarga: 7 },
  // cena do 1º quarteirão
  cena: {
    distancia: 11,         // casas do cruzamento de saída até a cena, na rua do caminho
    lado: 1.1,             // um pouco pro lado do meio da rua
    acorda: 4.5,           // herói a menos disso: o zumbi levanta
    vidaZumbi: 3,          // a única luta da quadra: o zumbi aguenta mais
    grito: 2.4,            // segundos entre um pedido de socorro e outro
    mastigar: 1.1          // segundos entre um som de mastigar e outro
  }
};

// Fração dos zumbis da rua no quarteirão q (0 = o primeiro, da cena)
export function rampa(q, S = SOBREVIVENCIA) {
  if (q <= 0) return 0;
  const n = Math.max(1, S.quarteiroesAteCheio - 1);
  return Math.min(1, S.rampaInicio + (1 - S.rampaInicio) * (q - 1) / n);
}

/* ------------------------------ destinos ------------------------------ */
// Que lugar sortear pro fim de uma rua, pelo que o herói precisa agora. usados = tipos já nessa votação.
export function pesosDestino(h, usados = new Set()) {
  const vida = h.vida / h.vidaMax, semArma = !h.arma, poucaBala = h.municao != null && h.municao < 10;
  const p = {
    mercado: 3, farmacia: 2, hospital: 1.5, delegacia: 1.5, posto: 1, casa: 0.8,
  };
  if (vida < 0.5) { p.hospital *= 2.5; p.farmacia *= 2; p.mercado *= 1.6; }
  if (semArma) p.delegacia *= 2;
  if (poucaBala) { p.delegacia *= 1.5; p.posto *= 1.3; }
  for (const t of usados) p[t] *= 0.15;
  return Object.entries(p);
}

// Quanto a IA quer ir pra esse lugar (votação sem votos)
export function vontadeDestino(h, tipo) {
  const vida = h.vida / h.vidaMax;
  // com a vida baixa: remédio (hospital, farmácia) ou comida (mercado, casa); o resto fica pra depois
  if (vida < 0.5) return tipo === 'hospital' || tipo === 'farmacia' ? 3.5 : tipo === 'mercado' || tipo === 'casa' ? 2.8 : 0.4;
  if (!h.arma && tipo === 'delegacia') return 2.2;
  if (h.municao != null && h.municao < 10 && (tipo === 'delegacia' || tipo === 'posto')) return 2;
  return 1.3;
}

/* ------------------------------ a cena do 1º quarteirão ------------------------------ */
// Monta a cena na rua do caminho: a pessoa caída e o zumbi agachado em cima dela.
export function montarCena(g) {
  const S = g.S.cena, h = g.hero, [dx, dy] = DIRS[g.rota.dir];
  const base = { x: h.x + dx * S.distancia - dy * S.lado, y: h.y + dy * S.distancia + dx * S.lado };
  const p = g.livre(base.x, base.y) ? base : g.pontoPerto(base, 1.2);
  if (!p) return null;
  const vitima = { tipo: 'vitima', x: p.x, y: p.y, t: 0, vida: 1e9, roupa: g.rng.int(0, 5), grito: 'SOCORRO!', gritoT: 0.6 };
  g.figurantes.push(vitima);
  // o zumbi fica do lado dela, virado pra ela
  const zx = p.x - dx * 0.55 + dy * 0.2, zy = p.y - dy * 0.55 - dx * 0.2;
  const z = g.criarZumbi('comum', zx, zy, null, { nascendo: 0, vidaMult: S.vidaZumbi });
  z.devorando = vitima; z.cena = true; z.fx = p.x - zx; z.fy = p.y - zy;
  const m = Math.hypot(z.fx, z.fy) || 1; z.fx /= m; z.fy /= m;
  g.cena = { fase: 'chegando', vitima, zumbi: z, t: 0, mastigarT: 0.3 };
  g.emit('cena', { fase: 'inicio', x: p.x, y: p.y });
  return g.cena;
}

export const cenaAtiva = g => !!g.cena && g.cena.fase !== 'fim';

export function atualizarCena(g, dt) {
  const c = g.cena;
  if (!c || c.fase === 'fim') return;
  c.t += dt;
  const v = c.vitima, z = c.zumbi, S = g.S.cena;
  if (c.fase !== 'salva') {
    // a pessoa pede socorro (o texto em cima dela muda)
    if ((v.gritoT -= dt) <= 0) {
      v.gritoT = S.grito * (0.85 + g.rng.next() * 0.3);
      v.grito = g.rng.pick(['SOCORRO!', 'ME AJUDA!', 'POR FAVOR!', 'SOCORRO!', 'AAAH!']);
      v.gritoDesde = v.t;
      g.emit('socorro', { x: v.x, y: v.y, texto: v.grito });
    }
  }
  if (c.fase === 'chegando') {
    if ((c.mastigarT -= dt) <= 0 && z.devorando) { c.mastigarT = S.mastigar * (0.8 + g.rng.next() * 0.4); g.emit('devorando', { x: z.x, y: z.y }); }
    if (!z.devorando || z.morto) c.fase = 'luta';
  }
  if ((c.fase === 'chegando' || c.fase === 'luta') && z.morto) {
    c.fase = 'salva'; c.t = 0;
    v.salva = true; v.grito = 'Obrigada... leva isso.'; v.gritoDesde = v.t;
    g.emit('vitima_salva', { x: v.x, y: v.y });
    g.agendar(1.2, () => { if (g.fase === 'jogo' && !g.room) g.soltarItemEm('kit', { valor: 30 }, null, v.x + 0.4, v.y + 0.2); });
  }
  if (c.fase === 'salva' && c.t > 3) {
    c.fase = 'fim';
    v.vida = v.t + 40;      // fica ali, ferida (some depois)
    g.votoAbreT = Math.min(g.votoAbreT, 1);
    g.emit('cena', { fase: 'fim' });
  }
  // por segurança: o herói passou direto ou ficou muito tempo sem resolver
  if (c.t > 120 && c.fase !== 'salva') { c.fase = 'fim'; g.votoAbreT = Math.min(g.votoAbreT, 1); }
}

// Zumbi agachado devorando: fica no lugar, comendo. Levanta quando o herói chega perto ou leva dano.
// Devolve true enquanto ele ainda está comendo (o resto do update do zumbi não roda).
export function zumbiDevorando(g, z, dt) {
  if (z.levantando > 0) { z.levantando -= dt; z.atkCd = Math.max(z.atkCd, 0.4); return true; }
  if (!z.devorando) return false;
  const h = g.hero, perto = dist(z.x, z.y, h.x, h.y) < g.S.cena.acorda;
  if (perto || z.vida < z.vidaMax || g.fase !== 'jogo') {
    z.devorando = null; z.levantando = 0.9;
    const d = dist(z.x, z.y, h.x, h.y) || 1; z.fx = (h.x - z.x) / d; z.fy = (h.y - z.y) / d;
    g.emit('zumbi_notou', { x: z.x, y: z.y });
    return true;
  }
  z.animT += dt * 0.6;   // mexendo a cabeça
  return true;
}

/* ------------------------------ duelo ------------------------------ */
// Poucos zumbis perto (e nenhum chefe): marca quem está no duelo e devolve a lista (ou null).
export function calcularDuelo(g) {
  const h = g.hero, D = g.S.duelo, R2 = D.raio * D.raio;
  if (g.fase !== 'jogo' || g.caido || D.max <= 0) return null;
  const lista = [];
  for (const z of g.zumbis) {
    z.duelo = false;
    if (z.morto || z.dormindo || z.devorando || z.nascendo > 0 || z.dono?.aliado) continue;
    const dx = z.x - h.x, dy = z.y - h.y;
    if (dx * dx + dy * dy > R2) continue;
    if (ZUMBIS[z.tipo].chefe) return limpar(g);
    lista.push(z);
    if (lista.length > D.max) return limpar(g);
  }
  if (!lista.length) return null;
  for (const z of lista) z.duelo = true;
  return lista;
}
function limpar(g) { for (const z of g.zumbis) z.duelo = false; return null; }

// O bote do zumbi no duelo. Chamado no lugar da mordida direta. Devolve true se o zumbi está ocupado
// com o bote (não anda). morder() = a mordida de sempre (jogo.js).
export function boteDoZumbi(g, z, T, d, dt, morder) {
  const D = g.S.duelo, h = g.hero;
  if (z.bote) {
    const b = z.bote;
    if (b.t > 0) {   // preparando: parado, inclinado pra trás (a tela mostra), virado pro herói
      b.t -= dt;
      if (d > 0.01) { z.fx = (h.x - z.x) / d; z.fy = (h.y - z.y) / d; }
      if (b.t <= 0) {   // avança
        const ux = (h.x - z.x) / (d || 1), uy = (h.y - z.y) / (d || 1), v = D.investida * 3.9;
        z.kx += ux * v; z.ky += uy * v; b.morde = 0.2;
        g.emit('bote', { x: z.x, y: z.y });
      }
      return true;
    }
    b.morde -= dt;
    if (b.morde <= 0) {
      if (d < T.alcance + MORDIDA.folga) morder();
      z.bote = null; z.atkCd = T.cd + 0.45;
    }
    return true;
  }
  if (z.atkCd <= 0 && d < T.alcance + 0.12 + D.alcanceBote && !g.caido) {
    const agil = Math.max(0, (h.pericias?.agilidade ?? 2) - 2);
    z.bote = { t: D.bote * (0.85 + g.rng.next() * 0.3), lido: g.rng.next() < D.reacao + agil * D.reacaoPorAgilidade };
    g.emit('bote_preparo', { x: z.x, y: z.y });
    return true;
  }
  return false;
}

// Como o herói se move no duelo. Devolve { vx, vy, vel } ou null (segue o movimento normal).
export function movimentoDuelo(g, h, alvos, dt) {
  const D = g.S.duelo;
  let m = null, md = Infinity, bote = null;
  for (const z of alvos) {
    const d = dist(z.x, z.y, h.x, h.y);
    if (d < md) { md = d; m = z; }
    if (z.bote && z.bote.t > 0 && z.bote.lido && d < D.guarda + 0.6) bote = z;
  }
  if (!m) return null;
  const d = md, ux = (m.x - h.x) / (d || 1), uy = (m.y - h.y) / (d || 1);
  const lado = m.id % 2 ? 1 : -1;
  let alvoD, lateral = Math.sin(g.t * 0.9) * 0.22;   // anda um pouco de lado, rodeando
  if (bote) {
    // viu o bote: sai da frente (pra trás e pro lado)
    alvoD = D.guarda + 0.7; lateral = 0.9 * lado;
  } else if (h.arma && !h.semTiro) {
    alvoD = D.distancia;
  } else {
    const corpo = CORPO[h.corpo], R = ZUMBIS[m.tipo].raio;
    const pronto = h.corpoCd <= 0.15 && !(m.bote && m.bote.t > 0);
    // pronto pra bater: entra até o alcance do golpe; bateu: volta pra guarda, fora do alcance do zumbi
    alvoD = pronto ? corpo.alcance - 0.38 + R : D.guarda;
  }
  const err = d - alvoD;
  const radial = clamp(err * 2.2, -1, 1);
  let vx = ux * radial - uy * lateral, vy = uy * radial + ux * lateral;
  const recuando = radial < -0.15;
  const vm = Math.hypot(vx, vy);
  if (vm > 1) { vx /= vm; vy /= vm; }
  if (Math.abs(err) < 0.08 && !bote) { vx *= 0.3; vy *= 0.3; }
  // recuando de costas pode tropeçar
  if (recuando && h.andando) tropecar(g, h, dt);
  // continua olhando pro zumbi (anda de costas)
  h.fx = ux; h.fy = uy;
  return { vx, vy, vel: recuando ? D.recuo * (bote ? 1.35 : 1) : 1, recuando };
}

export function tropecar(g, h, dt) {
  const T = g.S.tropeco;
  if ((h.tropecoCd = (h.tropecoCd ?? 2) - dt) > 0) return false;
  const agil = h.pericias?.agilidade ?? 2;
  const chance = Math.max(0.01, T.chancePorSegundo - (agil - 2) * T.menosPorAgilidade);
  if (g.rng.next() >= chance * dt) return false;
  h.tropecoCd = T.recarga;
  h.tropecou = T.dur;
  g.aplicarStatus(h, 'atordoado', { duracao: T.dur });
  const dano = Math.min(h.vida - 1, h.vidaMax * T.dano * (1 - h.attr.get('defesa')));
  if (dano > 0) { h.vida -= dano; g.emit('dano_heroi', { dano, x: h.x, y: h.y }); }
  g.emit('tropecou', { x: h.x, y: h.y });
  g.emit('aviso', { texto: '😵 Tropeçou!', tipo: 'perigo' });
  return true;
}

// Sem zumbi acordado por perto: passo cuidadoso
export function calmo(g) {
  const h = g.hero, R2 = g.S.calmaRaio * g.S.calmaRaio;
  for (const z of g.zumbis) {
    if (z.morto || z.dormindo || z.devorando || z.nascendo > 0) continue;
    const dx = z.x - h.x, dy = z.y - h.y;
    if (dx * dx + dy * dy < R2) return false;
  }
  return true;
}

