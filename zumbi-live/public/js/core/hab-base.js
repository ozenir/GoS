// ============================================================================
//  PEÇAS DAS HABILIDADES — o que as habilidades, passivas, supremas e nível deus usam por dentro:
//  achar alvos, ferir, explosões e ondas do herói, projéteis e objetos no chão (minas, torretas...).
//  Quem cria habilidade nova monta com estas peças (hab-ativas.js, hab-supremas.js).
// ============================================================================
import { ZUMBIS } from './dados.js';
import { danoNoZumbi } from './dano.js';
import { dist, dist2 } from './util.js';

/* ---------------- Força por nível ---------------- */
// Cada nível de HABILIDADE multiplica a força dela (dano, bônus) por FORCA(n):
//   nível 1 = 1×, nível 2 = 3× (triplica), nível 3 = 6×, nível 4 = 9×, nível 5 = 12,5×.
export const FORCA_NIVEL = [0, 1, 3, 6, 9, 12.5];
export const FORCA = n => FORCA_NIVEL[Math.max(0, Math.min(FORCA_NIVEL.length - 1, n))];
// PASSIVA vai até o nível 3: nível 1 = 1×, nível 2 = 2,2×, nível 3 = 4×
export const FORCA_PASSIVA_NIVEL = [0, 1, 2.2, 4];
export const FORCA_PASSIVA = n => FORCA_PASSIVA_NIVEL[Math.max(0, Math.min(FORCA_PASSIVA_NIVEL.length - 1, n))];

export const f1 = v => (Math.round(v * 10) / 10).toLocaleString('pt-BR');
export const pct = v => `${Math.round(v * 100)}%`;
export const clamp01 = x => Math.min(1, Math.max(0, x));

/* ---------------- Alvos ---------------- */
// Zumbis que dá pra acertar (vivos e já de pé). Zumbi do fã com escudo fica de fora: ainda não pode morrer.
export const alvos = g => g.zumbis.filter(z => !z.morto && !(z.nascendo > 0) && !(z.fa?.escudo > 0));
export const ehChefe = z => !!ZUMBIS[z.tipo].chefe;

// Dano de habilidade: escala com o atributo "dano" do herói; afinidade e resistência do zumbi contam.
// crit = pode dar crítico (chance e dano crítico do herói)
export function ferir(g, z, base, tipo, crit = false) {
  const h = g.hero;
  let d = base * h.attr.get('dano');
  if (crit && g.rng.next() < h.attr.get('critChance')) d *= h.attr.get('critMult');
  g.ferirZumbi(z, danoNoZumbi(z, d, tipo), null, false);
}

// Área das habilidades (passivas Engenharia, Alcance...): multiplica o raio das explosões e ondas
export const area = g => g.hero.attr.get('area');

// Empurra o zumbi pra longe do ponto (chefe não sai do lugar)
export function empurrar(z, x, y, forca) {
  if (z.morto || ehChefe(z)) return;
  const d = dist(z.x, z.y, x, y) || 0.01;
  z.kx += (z.x - x) / d * forca; z.ky += (z.y - y) / d * forca;
}
// Puxa o zumbi pra perto do ponto
export function puxar(z, x, y, forca) {
  if (z.morto || ehChefe(z)) return;
  const d = dist(z.x, z.y, x, y);
  if (d < 0.4) return;
  z.kx += (x - z.x) / d * forca; z.ky += (y - z.y) / d * forca;
}

// Explosão do herói: só machuca zumbi (nunca o herói) e não deixa fogo. O raio cresce com a área.
export function explosaoAmiga(g, x, y, raio, dano, tipo = 'explosao', empurra = 4, extra = null) {
  const r = raio * area(g);
  g.emit('explosao', { x, y, raio: r, amiga: true });
  for (const z of alvos(g)) {
    const d = dist(x, y, z.x, z.y);
    if (d > r + ZUMBIS[z.tipo].raio) continue;
    ferir(g, z, dano * (1 - Math.min(1, d / r) * 0.4), tipo);
    if (!z.morto) { empurrar(z, x, y, empurra); if (extra) extra(z); }
  }
}

// Onda em volta do herói (ou de um ponto): dano, atordoa e empurra. minimo = quantos zumbis precisam estar perto
// (ou um bem colado). cor = cor do anel na tela. Devolve os zumbis atingidos (ou null se não disparou).
export function onda(g, x, y, raio, dano, { atordoa = 0, empurra = 0, minimo = 1, tipo = 'impacto', cor = null, status = null } = {}) {
  const r = raio * area(g);
  const perto = alvos(g).filter(z => dist2(z.x, z.y, x, y) < (r + ZUMBIS[z.tipo].raio) ** 2);
  if (perto.length < minimo && !perto.some(z => dist2(z.x, z.y, x, y) < 1.44)) return null;
  g.emit('onda', { x, y, raio: r, cor });
  for (const z of perto) {
    if (dano > 0) ferir(g, z, dano, tipo);
    if (z.morto) continue;
    if (atordoa > 0) g.aplicarStatus(z, 'atordoado', { duracao: atordoa });
    if (status) g.aplicarStatus(z, status.id, { duracao: status.duracao });
    if (empurra) empurrar(z, x, y, empurra);
  }
  return perto;
}

// Onde tem mais zumbi junto (dentro do alcance): devolve o zumbi do centro do grupo
export function maiorGrupo(g, h, alcance, raio, ignorar = null) {
  const lista = alvos(g).filter(z => dist2(z.x, z.y, h.x, h.y) < alcance * alcance && !(ignorar && ignorar.some(p => dist2(p[0], p[1], z.x, z.y) < raio * raio)));
  let melhor = null, mq = 0;
  for (const z of lista) {
    let q = 0;
    for (const o of lista) if (dist2(z.x, z.y, o.x, o.y) < raio * raio) q++;
    if (ehChefe(z)) q += 2;
    if (q > mq) { mq = q; melhor = z; }
  }
  return melhor;
}

export function maisPerto(g, x, y, alcance, ignorar = null, precisaLinha = false) {
  let best = null, bd = alcance * alcance;
  for (const z of alvos(g)) {
    if (ignorar && ignorar.has(z)) continue;
    const d = dist2(x, y, z.x, z.y);
    if (d < bd && (!precisaLinha || g.linhaLivre(x, y, z.x, z.y))) { bd = d; best = z; }
  }
  return best;
}

// Os n zumbis mais fortes (mais vida) no alcance
export function maisFortes(g, h, alcance, n) {
  return alvos(g).filter(z => dist2(z.x, z.y, h.x, h.y) < alcance * alcance).sort((a, b) => b.vida - a.vida).slice(0, n);
}

/* ---------------- Peças das habilidades clássicas ---------------- */
export function girarLaminas(g, h, q, raio, dano, chanceSangra, cura, intervalo = 0.45) {
  h.laminaAng = h.laminaAng || 0;
  for (let k = 0; k < q; k++) {
    const a = h.laminaAng + k * Math.PI * 2 / q;
    const bx = h.x + Math.cos(a) * raio, by = h.y + Math.sin(a) * raio;
    for (const z of alvos(g)) {
      const r = ZUMBIS[z.tipo].raio + 0.3;
      if (dist2(bx, by, z.x, z.y) > r * r || (z.laminaT || 0) > g.t) continue;
      z.laminaT = g.t + intervalo;
      ferir(g, z, dano, 'corte');
      if (cura) h.vida = Math.min(h.vidaMax, h.vida + cura);
      if (!z.morto && g.rng.next() < chanceSangra) g.aplicarStatus(z, 'sangramento', { pilhas: chanceSangra >= 1 ? 2 : 1 });
    }
  }
}
// o ângulo das lâminas gira uma vez por quadro (fora de girarLaminas, pra normal e suprema girarem igual)
export function girarAngulo(h, dt) { h.laminaAng = ((h.laminaAng || 0) + dt * 3.4) % (Math.PI * 2); }

export function jogarMolotov(g, h, x, y, tam, dur, dano, fogo, extra = {}) {
  const m = tam * area(g) / 2;
  g.emit('arremesso', { tipo: 'molotov', x0: h.x, y0: h.y, x1: x, y1: y, t: 0.55 });
  g.agendar(0.55, () => {
    explosaoAmiga(g, x, y, (m + 0.3) / area(g), dano, 'fogo', 1.5);
    if (g.zonas.length < 24) g.zonas.push({ tipo: 'fogo', x0: x - m, y0: y - m, x1: x + m, y1: y + m, t: dur, doHeroi: true, mult: fogo, semente: g.rng.int(1, 1e6), ...extra });
  });
}

// k = qual drone (0, 1, 2...): cada um gira em volta do herói num ângulo diferente
export const posDrone = (g, h, k, total = 1) => { const a = g.t * 1.6 + k * Math.PI * 2 / total; return [h.x + Math.cos(a) * 0.8, h.y + Math.sin(a) * 0.8]; };
export function tiroDeDrone(g, h, k, dano, total = 1, ignorar = null) {
  const [dx, dy] = posDrone(g, h, k, total);
  const z = maisPerto(g, dx, dy, 5.5, ignorar, true);
  if (!z) return false;
  ferir(g, z, dano, 'perfuracao');
  g.emit('tiro', { x: dx, y: dy, tx: z.x, ty: z.y, arma: 'drone', acertou: true, drone: true });
  return z;
}

// Tiro do herói (habilidade): risco de bala na tela + dano. Pode dar crítico.
export function tiroHab(g, x, y, z, dano, arma = 'habilidade') {
  ferir(g, z, dano, 'perfuracao', true);
  g.emit('tiro', { x, y, tx: z.x, ty: z.y, arma, acertou: true, drone: true });
}

// Raio em cadeia saindo de (x, y): pula de zumbi em zumbi
export function cadeiaEletrica(g, x, y, saltos, dano, { alcance = 5.5, pulo = 2.6, atordoa = 0, ignorar = null, crit = false } = {}) {
  let z = maisPerto(g, x, y, alcance, ignorar, true);
  if (!z) return false;
  const ja = ignorar || new Set(), pts = [[x, y]];
  for (let k = 0; k <= saltos && z; k++) {
    ja.add(z); pts.push([z.x, z.y]);
    ferir(g, z, dano, 'eletrico', crit);
    if (!z.morto && atordoa > 0 && g.rng.next() < atordoa) g.aplicarStatus(z, 'atordoado', { duracao: 0.6 });
    z = maisPerto(g, z.x, z.y, pulo, ja);
  }
  g.emit('raio', { pts });
  return true;
}

/* ---------------- Objetos das habilidades (no chão ou voando) ---------------- */
// Minas, pacotes-bomba, torretas, bumerangues, bisturis... Ficam em g.objHab. Cada um tem um tipo; a conta de
// cada quadro fica em OBJETOS[tipo](g, o, dt) e devolve false quando o objeto acabou. A tela desenha pelo tipo
// (view/render.js → desenharObjHab).
export const OBJETOS = {};
export function criarObj(g, o) {
  g.objHab = g.objHab || [];
  if (g.objHab.length > 120) return null;   // segurança
  const obj = { t: 0, ...o };
  g.objHab.push(obj);
  return obj;
}
export function atualizarObjetos(g, dt) {
  if (!g.objHab?.length) return;
  g.objHab = g.objHab.filter(o => { o.t += dt; return OBJETOS[o.tipo] ? OBJETOS[o.tipo](g, o, dt) !== false : false; });
}

// Projétil reto que atravessa zumbis (bisturi, rajada, bumerangue na ida). Machuca cada zumbi uma vez.
OBJETOS.projetil = (g, o, dt) => {
  o.x += o.vx * dt; o.y += o.vy * dt;
  o.ja = o.ja || new Set();
  for (const z of alvos(g)) {
    if (o.ja.has(z)) continue;
    const r = ZUMBIS[z.tipo].raio + (o.raio || 0.3);
    if (dist2(o.x, o.y, z.x, z.y) > r * r) continue;
    o.ja.add(z);
    ferir(g, z, o.dano, o.tipoDano || 'corte', !!o.crit);
    if (!z.morto && o.status) for (const s of o.status) if (g.rng.next() < s.chance) g.aplicarStatus(z, s.id, { duracao: s.duracao, pilhas: s.pilhas });
    if (!z.morto && o.empurra) empurrar(z, o.x - o.vx, o.y - o.vy, o.empurra);
    if (o.furos != null && --o.furos <= 0) return false;
  }
  return o.t < o.vida;
};

// Bumerangue: vai até longe e volta pro herói; na volta pode acertar de novo
OBJETOS.bumerangue = (g, o, dt) => {
  const h = g.hero;
  if (!o.voltando && o.t >= o.ida) { o.voltando = true; o.ja = new Set(); }
  if (o.voltando) {
    const d = dist(o.x, o.y, h.x, h.y);
    if (d < 0.5 || o.t > o.ida * 3) return false;
    const v = o.vel * 1.2;
    o.vx = (h.x - o.x) / d * v; o.vy = (h.y - o.y) / d * v;
  }
  o.ang = (o.ang || 0) + dt * 18;
  o.vida = Infinity;
  return OBJETOS.projetil(g, o, dt) !== false;
};

// Mina / pacote-bomba: parada no chão; explode quando zumbi pisa perto (mina) ou depois de pavio segundos (pacote)
OBJETOS.mina = (g, o) => {
  if (o.t < (o.arma ?? 0.4)) return true;
  const pisou = o.pavio == null && alvos(g).some(z => dist2(z.x, z.y, o.x, o.y) < (o.gatilho || 0.8) ** 2);
  if (pisou || (o.pavio != null && o.t >= o.pavio)) {
    explosaoAmiga(g, o.x, o.y, o.raio, o.dano, 'explosao', 5, o.extra || null);
    return false;
  }
  return o.t < (o.vida || 30);
};

// Torreta: parada, atira no zumbi mais perto a cada cd segundos
OBJETOS.torreta = (g, o, dt) => {
  o.cdT = (o.cdT ?? 0) - dt;
  if (o.cdT <= 0) {
    const z = maisPerto(g, o.x, o.y, o.alcance || 6, null, true);
    if (z) {
      o.cdT = o.cd;
      o.mira = Math.atan2(z.y - o.y, z.x - o.x);
      if (o.missil && (o.misT = (o.misT ?? 0) + 1) % o.missil === 0) explosaoAmiga(g, z.x, z.y, 1.2, o.dano * 2.5, 'explosao', 3);
      else tiroHab(g, o.x, o.y, z, o.dano, 'torreta');
    } else o.cdT = 0.2;
  }
  return o.t < o.vida;
};
