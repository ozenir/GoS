// O mapa da viagem (core/mapa.js): aparece na votação de destino, com o bairro em volta, o herói, os lugares
// (número + emoji) e a rota até cada um. Desenhado na mesma perspectiva isométrica e na mesma rotação da câmera
// do jogo, pra bater com o que se vê na tela. Depois que a votação fecha, mostra só a rota escolhida.
import { P, BAND, MID } from '../core/city.js';

const ROT = [(x, y) => [x, y], (x, y) => [y, -x], (x, y) => [-x, -y], (x, y) => [-y, x]];
export const CORES_OPCAO = ['#ffd23f', '#5ad1ff', '#ff7ad9', '#8dff7a'];
const CORES_QUARTEIRAO = { predios: '#2a2433', verde: '#24452a', praca: '#5b5236' };

// cv = canvas; g = jogo; ops = opções da votação (com .lugar); escolhida = id da opção escolhida (resultado) ou null
// memo = objeto guardado junto com a votação (as ruas fechadas são calculadas uma vez só)
export function desenharMapa(cv, g, ops, ini, escolhida = null, t = 0, memo = {}) {
  const ctx = cv.getContext('2d'), W = cv.width, H = cv.height;
  ctx.clearRect(0, 0, W, H);
  if (!g.city || !ini) return;
  // o quanto mostrar: até o lugar mais longe (no mínimo 3 quarteirões, no máximo 6)
  let R = 3;
  for (const o of ops) for (const p of o.lugar?.pts || []) R = Math.max(R, Math.abs(p.i - ini.i) + 1, Math.abs(p.j - ini.j) + 1);
  R = Math.min(6, R);
  const cx = ini.i * P + MID, cy = ini.j * P + MID, rot = ROT[g.rota.dir] || ROT[0];
  const ext = R * P + 4, k = Math.min(W / (4 * ext), H / (2 * ext)) * 0.98;
  const proj = (x, y) => { const [u, v] = rot(x - cx, y - cy); return [W / 2 + (u - v) * k, H / 2 + (u + v) / 2 * k]; };
  const poli = (pts, cor) => { ctx.beginPath(); pts.forEach(([x, y], n) => { const [a, b] = proj(x, y); if (n) ctx.lineTo(a, b); else ctx.moveTo(a, b); }); ctx.closePath(); ctx.fillStyle = cor; ctx.fill(); };
  // o chão (ruas) e os quarteirões
  poli([[cx - ext, cy - ext], [cx + ext, cy - ext], [cx + ext, cy + ext], [cx - ext, cy + ext]], 'rgba(150,142,160,0.8)');
  for (let bi = ini.i - R; bi < ini.i + R; bi++) for (let bj = ini.j - R; bj < ini.j + R; bj++) {
    const x0 = bi * P + BAND, y0 = bj * P + BAND, x1 = (bi + 1) * P, y1 = (bj + 1) * P;
    poli([[x0, y0], [x1, y0], [x1, y1], [x0, y1]], CORES_QUARTEIRAO[g.city.tipoQuarteirao(bi, bj)] || '#2a2433');
  }
  // ruas fechadas (bloqueio ou sem saída): um X vermelho no meio
  if (!memo.fechadas) {
    memo.fechadas = [];
    const Rf = Math.min(R, 4);
    for (let i = ini.i - Rf; i < ini.i + Rf; i++) for (let j = ini.j - Rf; j <= ini.j + Rf; j++) for (const d of [0, 1]) {   // 0: leste (rua horizontal), 1: sul (vertical)
      const s = g.city.trecho(i, j, d).s;
      if (s.bloqueio || s.semSaida) memo.fechadas.push([i * P + MID + (d === 0 ? P / 2 : 0), j * P + MID + (d === 1 ? P / 2 : 0)]);
    }
  }
  ctx.strokeStyle = '#ff4a3a'; ctx.lineWidth = 1.4;
  for (const [mx, my] of memo.fechadas) {
    const [a, b] = proj(mx, my);
    ctx.beginPath(); ctx.moveTo(a - 2.5, b - 2.5); ctx.lineTo(a + 2.5, b + 2.5); ctx.moveTo(a + 2.5, b - 2.5); ctx.lineTo(a - 2.5, b + 2.5); ctx.stroke();
  }
  const no = p => proj(p.i * P + MID, p.j * P + MID);
  // as rotas (a escolhida por cima, mais grossa)
  const lista = escolhida ? ops.filter(o => o.id === escolhida) : ops;
  const max = Math.max(1, ...ops.map(o => o.votos || 0));
  for (const o of [...lista].sort((a, b) => (a.votos || 0) - (b.votos || 0))) {
    const pts = o.lugar?.pts || [];
    if (pts.length < 2) continue;
    const cor = CORES_OPCAO[(o.n - 1) % 4], lider = escolhida || (o.votos > 0 && o.votos === max);
    ctx.strokeStyle = cor; ctx.lineWidth = lider ? 3 : 1.6; ctx.setLineDash(lider ? [] : [3, 2]);
    ctx.lineDashOffset = -t * 12;
    ctx.beginPath(); pts.forEach((p, n) => { const [a, b] = no(p); if (n) ctx.lineTo(a, b); else ctx.moveTo(a, b); }); ctx.stroke();
  }
  ctx.setLineDash([]);
  // o herói
  const [hx, hy] = proj(g.hero.x, g.hero.y), pul = 2.5 + Math.sin(t * 6) * 0.8;
  ctx.fillStyle = 'rgba(255,210,63,0.35)'; ctx.beginPath(); ctx.arc(hx, hy, pul + 2.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#ffd23f'; ctx.beginPath(); ctx.arc(hx, hy, 2.6, 0, Math.PI * 2); ctx.fill();
  // os lugares: o emoji e o número na cor da opção
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (const o of lista) {
    const L = o.lugar; if (!L) continue;
    const [a, b] = no(L), cor = CORES_OPCAO[(o.n - 1) % 4];
    ctx.font = '13px sans-serif'; ctx.fillText(L.emoji, a, b - 7);
    ctx.fillStyle = cor; ctx.beginPath(); ctx.arc(a + 7, b + 3, 4.6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1a1420'; ctx.font = 'bold 7px sans-serif'; ctx.fillText(String(o.n), a + 7, b + 3.4);
  }
}
