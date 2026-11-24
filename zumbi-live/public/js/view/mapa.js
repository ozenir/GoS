// O mapa da viagem (core/mapa.js), no estilo de um mapa de cidade de verdade (como um GPS): visto de cima, com
// a direção do herói sempre pra cima, papel claro, ruas brancas com nome, avenidas amarelas mais largas, prédios
// desenhados (as lojas na cor delas), parques com árvores e lago, praças com fonte, ruas fechadas com cavalete,
// a rota de cada lugar e um PINO em cada lugar (com o número da votação e o emoji). O herói é o ponto azul com o
// cone pra onde ele olha ("você está aqui"). Bússola e escala nos cantos. Depois que a votação fecha, só a rota
// escolhida. Fica pequeno, num canto: o jogo continua aparecendo (e os lugares também aparecem no próprio jogo:
// render.js → marcadoresViagem).
import { P, BAND, MID, SHOPS } from '../core/city.js';
import { DIRS } from '../core/util.js';

export const CORES_OPCAO = ['#f59e0b', '#2563eb', '#db2777', '#16a34a'];
const PAPEL = '#f1ead9', RUA = '#fdfbf6', BORDA_RUA = '#d8cfbb', AVENIDA = '#fbe7a1';
const QUARTEIRAO = { predios: '#e4dccb', verde: '#cfe6bd', praca: '#dceac8' };

// cv = canvas; g = jogo; ops = opções da votação (com .lugar); ini = cruzamento de onde sai a viagem;
// escolhida = id da opção escolhida (resultado) ou null; memo = objeto guardado junto com a votação
export function desenharMapa(cv, g, ops, ini, escolhida = null, t = 0, memo = {}) {
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  if (!g.city || !ini) return;
  const city = g.city, dir = g.rota.dir, f = DIRS[dir], d = DIRS[(dir + 1) % 4];   // frente e direita
  const lista = escolhida ? ops.filter(o => o.id === escolhida) : ops;
  // o que precisa caber: o herói e todos os lugares (com uma folga)
  const h = g.hero, no = p => ({ x: p.i * P + MID, y: p.j * P + MID });
  const uv = (x, y) => [(x - h.x) * d[0] + (y - h.y) * d[1], -((x - h.x) * f[0] + (y - h.y) * f[1])];
  let u0 = -P * 0.8, u1 = P * 0.8, v0 = -P * 0.6, v1 = P * 0.6;
  for (const o of lista) for (const p of o.lugar?.pts || []) { const [u, v] = uv(no(p).x, no(p).y); u0 = Math.min(u0, u); u1 = Math.max(u1, u); v0 = Math.min(v0, v); v1 = Math.max(v1, v); }
  const folga = P * 0.55;
  u0 -= folga; u1 += folga; v0 -= folga * 1.25; v1 += folga * 0.8;
  const k = Math.min(W / (u1 - u0), H / (v1 - v0), 2.4), cu = (u0 + u1) / 2, cv0 = (v0 + v1) / 2;
  const proj = (x, y) => { const [u, v] = uv(x, y); return [W / 2 + (u - cu) * k, H / 2 + (v - cv0) * k]; };
  const ret = (x0, y0, x1, y1, cor, borda) => {
    const [a, b] = proj(x0, y0), [c, e] = proj(x1, y1);
    const X = Math.min(a, c), Y = Math.min(b, e), Wd = Math.abs(c - a), Hd = Math.abs(e - b);
    ctx.fillStyle = cor; ctx.fillRect(X, Y, Wd, Hd);
    if (borda) { ctx.strokeStyle = borda; ctx.lineWidth = 0.8; ctx.strokeRect(X + 0.4, Y + 0.4, Wd - 0.8, Hd - 0.8); }
  };
  // o pedaço do mundo que aparece
  const cantos = [[0, 0], [W, 0], [0, H], [W, H]].map(([sx, sy]) => {
    const u = (sx - W / 2) / k + cu, v = (sy - H / 2) / k + cv0;   // volta: u = dx·d, v = -(dx·f)
    return [h.x + u * d[0] - v * f[0], h.y + u * d[1] - v * f[1]];
  });
  const xs = cantos.map(c => c[0]), ys = cantos.map(c => c[1]);
  const bi0 = Math.floor(Math.min(...xs) / P) - 1, bi1 = Math.floor(Math.max(...xs) / P) + 1;
  const bj0 = Math.floor(Math.min(...ys) / P) - 1, bj1 = Math.floor(Math.max(...ys) / P) + 1;

  // papel e ruas
  ctx.fillStyle = RUA; ctx.fillRect(0, 0, W, H);
  // avenidas (mais largas e amarelas)
  for (let j = bj0; j <= bj1; j++) if (city.avenida('h', j)) ret(bi0 * P, j * P - 0.6, (bi1 + 1) * P, j * P + BAND + 0.6, AVENIDA);
  for (let i = bi0; i <= bi1; i++) if (city.avenida('v', i)) ret(i * P - 0.6, bj0 * P, i * P + BAND + 0.6, (bj1 + 1) * P, AVENIDA);
  // quarteirões
  for (let bi = bi0; bi <= bi1; bi++) for (let bj = bj0; bj <= bj1; bj++) {
    const x0 = bi * P + BAND, y0 = bj * P + BAND, x1 = (bi + 1) * P, y1 = (bj + 1) * P;
    const tipo = city.tipoQuarteirao(bi, bj);
    ret(x0, y0, x1, y1, QUARTEIRAO[tipo] || PAPEL, BORDA_RUA);
    if (tipo === 'predios') {
      for (let sx = 0; sx < 2; sx++) for (let sy = 0; sy < 2; sy++) {
        const b = city.building(bi, bj, sx, sy);
        if (!b) continue;
        const cor = b.shop ? (SHOPS[b.shop.tipo]?.cor || '#c9bfae') : b.casa ? '#e8cdb8' : b.ruina ? '#c2b8a6' : '#d0c6b2';
        if (b.casa) { ret(b.x0 + 0.6, b.y0 + 0.6, b.x1 - 0.6, b.y1 - 0.6, '#d9ecc9'); ret(b.x0 + 1.6, b.y0 + 1.6, b.x1 - 1.6, b.y1 - 1.8, cor, '#b8987e'); }
        else ret(b.x0 + 0.4, b.y0 + 0.4, b.x1 - 0.4, b.y1 - 0.4, cor, '#b5aa94');
      }
    } else {
      const q = city.quarteirao(bi, bj);
      for (const z of q.zonas) if (z.tipo === 'agua') ret(z.x0, z.y0, z.x1, z.y1, '#a9d4ef');
      for (const p of q.props) {
        const [a, b] = proj(p.x + 0.5, p.y + 0.5);
        if (p.tipo === 'arvore') { ctx.fillStyle = '#93c97f'; ctx.beginPath(); ctx.arc(a, b, Math.max(1.6, 0.9 * k), 0, Math.PI * 2); ctx.fill(); }
        else if (p.tipo === 'fonte') { const [c, e] = proj(p.x + 1.5, p.y + 1.5); ctx.fillStyle = '#9fd0f0'; ctx.beginPath(); ctx.arc(c, e, 1.6 * k, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#7fb3d6'; ctx.stroke(); }
      }
    }
  }
  // ruas fechadas (bloqueio ou sem saída): cavalete vermelho e branco atravessado (calculado uma vez)
  if (!memo.fechadas) {
    memo.fechadas = [];
    for (let i = Math.max(bi0, ini.i - 5); i <= Math.min(bi1, ini.i + 5); i++) for (let j = Math.max(bj0, ini.j - 5); j <= Math.min(bj1, ini.j + 5); j++) for (const dd of [1, 2]) {
      const s = city.trecho(i, j, dd).s;
      if (s.bloqueio || s.semSaida) memo.fechadas.push({ x: i * P + MID + (dd === 1 ? P / 2 : 0), y: j * P + MID + (dd === 2 ? P / 2 : 0), dd });
    }
  }
  for (const c of memo.fechadas) {
    const [a, b] = proj(c.x, c.y), atravessado = (c.dd === 1) === (dir === 0 || dir === 2);
    ctx.save(); ctx.translate(a, b); if (!atravessado) ctx.rotate(Math.PI / 2);
    ctx.fillStyle = '#e53935'; ctx.fillRect(-5, -1.6, 10, 3.2); ctx.fillStyle = '#fff'; ctx.fillRect(-2.5, -1.6, 1.6, 3.2); ctx.fillRect(1, -1.6, 1.6, 3.2);
    ctx.restore();
  }
  // nomes das ruas (a do herói e as das rotas), espalhados ao longo da rua, sem um cobrir o outro nem o herói
  ctx.font = '600 8px "Fredoka", system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const [hx0, hy0] = proj(h.x, h.y), caixas = [[hx0 - 16, hy0 - 18, 32, 32]];   // o herói (e o cone)
  for (const o of lista) { const L = o.lugar; if (L) { const [a, b] = proj(no(L).x, no(L).y); caixas.push([a - 12, b - 26, 28, 28]); } }
  const bate = (x, y, w, hh) => caixas.some(([X, Y, Wd, Hd]) => x < X + Wd && x + w > X && y < Y + Hd && y + hh > Y);
  const escrito = new Set();
  const nomear = (axis, idx) => {
    const key = axis + idx; if (escrito.has(key) || escrito.size >= 4) return;
    escrito.add(key);
    const nome = city.nomeRua(axis, idx), tw = ctx.measureText(nome).width + 6;
    // dois pontos da rua pra saber se ela fica deitada ou em pé no mapa
    const A = axis === 'h' ? [h.x - P, idx * P + MID] : [idx * P + MID, h.y - P], B = axis === 'h' ? [h.x + P, idx * P + MID] : [idx * P + MID, h.y + P];
    const [ax, ay] = proj(...A), [bx, by] = proj(...B), deitada = Math.abs(bx - ax) > Math.abs(by - ay);
    for (const fr of [0.24, 0.76, 0.5, 0.12, 0.88]) {
      const x = deitada ? W * fr : ax, y = deitada ? ay : H * fr;
      const box = deitada ? [x - tw / 2, y - 5, tw, 10] : [x - 5, y - tw / 2, 10, tw];
      if (x < 0 || x > W || y < 0 || y > H || bate(...box)) continue;
      caixas.push(box);
      ctx.save(); ctx.translate(x, y); if (!deitada) ctx.rotate(-Math.PI / 2);
      ctx.lineWidth = 2.6; ctx.strokeStyle = 'rgba(253,251,246,0.95)'; ctx.strokeText(nome, 0, 0);
      ctx.fillStyle = city.avenida(axis, idx) ? '#8a6a1c' : '#7a6d55'; ctx.fillText(nome, 0, 0);
      ctx.restore();
      return;
    }
  };
  nomear(dir === 1 || dir === 3 ? 'h' : 'v', dir === 1 || dir === 3 ? ini.j : ini.i);
  nomear(dir === 1 || dir === 3 ? 'v' : 'h', dir === 1 || dir === 3 ? ini.i : ini.j);
  for (const o of lista) for (const p of (o.lugar?.pts || []).slice(1, 3)) { const a = o.lugar.pts[0]; nomear(p.j === a.j ? 'h' : 'v', p.j === a.j ? p.j : p.i); }
  // as rotas (a escolhida, ou a que está ganhando, por cima e mais grossa), como num GPS
  const max = Math.max(1, ...ops.map(o => o.votos || 0));
  const ordem = [...lista].sort((a, b) => (a.votos || 0) - (b.votos || 0));
  for (const o of ordem) {
    const pts = [{ x: h.x, y: h.y }, ...(o.lugar?.pts || []).map(no)];
    if (pts.length < 2) continue;
    const cor = CORES_OPCAO[(o.n - 1) % 4], lider = !!escolhida || (o.votos > 0 && o.votos === max);
    const caminho = () => { ctx.beginPath(); pts.forEach((p, n) => { const [a, b] = proj(p.x, p.y); if (n) ctx.lineTo(a, b); else ctx.moveTo(a, b); }); };
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    caminho(); ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = lider ? 7 : 4.6; ctx.setLineDash([]); ctx.stroke();
    caminho(); ctx.strokeStyle = cor; ctx.lineWidth = lider ? 4.2 : 2.4; ctx.setLineDash(lider ? [] : [5, 3]); ctx.lineDashOffset = -t * 14; ctx.stroke();
  }
  ctx.setLineDash([]);
  // o herói: ponto azul com o cone da direção (sempre pra cima)
  const [hx, hy] = proj(h.x, h.y), pul = Math.sin(t * 4) * 0.5 + 0.5;
  ctx.fillStyle = 'rgba(26,115,232,0.18)'; ctx.beginPath(); ctx.moveTo(hx, hy); ctx.arc(hx, hy, 15, -Math.PI / 2 - 0.5, -Math.PI / 2 + 0.5); ctx.closePath(); ctx.fill();
  ctx.fillStyle = `rgba(26,115,232,${0.15 + 0.15 * pul})`; ctx.beginPath(); ctx.arc(hx, hy, 6 + pul * 3, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hx, hy, 4.4, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1a73e8'; ctx.beginPath(); ctx.arc(hx, hy, 3.2, 0, Math.PI * 2); ctx.fill();
  // os pinos dos lugares
  for (const o of lista) {
    const L = o.lugar; if (!L) continue;
    const [a, b] = proj(no(L).x, no(L).y), cor = CORES_OPCAO[(o.n - 1) % 4];
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(a, b + 1, 3.2, 1.3, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(a, b - 13, 8.5, Math.PI * 0.8, Math.PI * 0.2); ctx.lineTo(a, b); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(a, b - 13, 6, 0, Math.PI * 2); ctx.fill();
    ctx.font = '8px sans-serif'; ctx.fillText(L.emoji, a, b - 12.6);
    ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(a + 8, b - 20, 4.6, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#fff'; ctx.font = '700 7px "Fredoka", system-ui, sans-serif'; ctx.fillText(String(o.n), a + 8, b - 19.6);
  }
  // o nome de cada lugar, ao lado do pino (na cor escura do trajeto, com contorno branco), sem cobrir nada
  ctx.font = '700 10.5px "Fredoka", system-ui, sans-serif'; ctx.textBaseline = 'middle';
  const ESCURA = ['#a14a05', '#1d4ed8', '#b0175a', '#137a3a'];
  for (const o of lista) {
    const L = o.lugar; if (!L) continue;
    const [a, b] = proj(no(L).x, no(L).y), nome = L.nome.charAt(0).toUpperCase() + L.nome.slice(1);
    const tw = ctx.measureText(nome).width, hh = 12;
    const lugares = [[a + 17, b - 13, 'left'], [a - 15, b - 13, 'right'], [a, b + 8, 'center'], [a, b - 33, 'center'], [a + 17, b + 2, 'left'], [a - 15, b + 2, 'right']];
    let pos = lugares.find(([x, y, al]) => { const x0 = al === 'left' ? x : al === 'right' ? x - tw : x - tw / 2; return x0 > 2 && x0 + tw < W - 2 && y - hh / 2 > 2 && y + hh / 2 < H - 2 && !bate(x0 - 2, y - hh / 2, tw + 4, hh); }) || lugares[0];
    const [x, y, al] = pos, x0 = al === 'left' ? x : al === 'right' ? x - tw : x - tw / 2;
    caixas.push([x0 - 2, y - hh / 2, tw + 4, hh]);
    ctx.textAlign = al;
    ctx.lineJoin = 'round'; ctx.lineWidth = 3.4; ctx.strokeStyle = 'rgba(253,251,246,0.97)'; ctx.strokeText(nome, x, y);
    ctx.fillStyle = ESCURA[(o.n - 1) % 4]; ctx.fillText(nome, x, y);
  }
  ctx.textAlign = 'center';
  // bússola (o norte gira, porque a frente do herói fica sempre pra cima) e escala
  const nu = -d[1], nv = f[1];   // o norte (0, -1) do mundo, na tela do mapa
  ctx.save(); ctx.translate(W - 12, 12);
  ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#b5aa94'; ctx.lineWidth = 0.8; ctx.stroke();
  ctx.rotate(Math.atan2(nv, nu) + Math.PI / 2);
  ctx.fillStyle = '#e53935'; ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(2.4, 0); ctx.lineTo(-2.4, 0); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#8a8070'; ctx.beginPath(); ctx.moveTo(0, 6); ctx.lineTo(2.4, 0); ctx.lineTo(-2.4, 0); ctx.closePath(); ctx.fill();
  ctx.restore();
  const esc = P * k;
  ctx.strokeStyle = '#6b604c'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(6, H - 7); ctx.lineTo(6 + esc, H - 7); ctx.moveTo(6, H - 10); ctx.lineTo(6, H - 4); ctx.moveTo(6 + esc, H - 10); ctx.lineTo(6 + esc, H - 4); ctx.stroke();
  ctx.fillStyle = '#6b604c'; ctx.font = '600 7px "Fredoka", system-ui, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('1 quarteirão', 9 + esc, H - 7);
  ctx.textAlign = 'center';
}
