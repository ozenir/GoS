// Ferramentas pequenas usadas no jogo todo. Nada aqui mexe na tela.

export const TAU = Math.PI * 2;
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;
export const dist2 = (ax, ay, bx, by) => (ax - bx) * (ax - bx) + (ay - by) * (ay - by);
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export const mod = (a, n) => ((a % n) + n) % n;

// Sorteio com semente (mesma semente = mesmos números). Usado na cidade, pra que um quarteirão
// que some e volta apareça igualzinho.
export function hash2(x, y, seed = 0) {
  let h = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(seed | 0, 2246822519)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}
export function hash3(x, y, z, seed = 0) { return hash2(x, (y | 0) * 7919 + (z | 0), seed); }

// Sorteio comum (com semente, pra simulações repetíveis)
export function makeRng(seed = Date.now()) {
  let s = (seed >>> 0) || 1;
  const next = () => {
    s |= 0; s = (s + 0x6D2B79F5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    range: (a, b) => a + next() * (b - a),
    int: (a, b) => a + Math.floor(next() * (b - a + 1)),
    pick: arr => arr[Math.floor(next() * arr.length)],
    chance: p => next() < p,
    weighted(entries) { // [[valor, peso], ...]
      let tot = 0; for (const e of entries) tot += e[1];
      let r = next() * tot;
      for (const e of entries) { r -= e[1]; if (r <= 0) return e[0]; }
      return entries[entries.length - 1][0];
    }
  };
}

// Direções do mundo: 0 = norte (y-), 1 = leste (x+), 2 = sul (y+), 3 = oeste (x-)
export const DIRS = [[0, -1], [1, 0], [0, 1], [-1, 0]];
export const turnLeft = d => (d + 3) % 4;
export const turnRight = d => (d + 1) % 4;

// Tira acentos e deixa minúsculo, pra ler os comentários do chat
export function normalizar(s) {
  return String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

// Nomes que vão na tela: corta tamanho e esconde palavrões comuns.
const PALAVROES = ['porra', 'caralho', 'buceta', 'puta', 'fdp', 'viado', 'arrombad', 'cuzao', 'merda', 'pau no', 'piroca', 'xoxota', 'vagabund', 'macaco', 'nigg', 'fuck', 'bitch', 'nazi', 'hitler'];
export function nomeSeguro(s, max = 14) {
  let n = String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim();
  const baixo = normalizar(n).replace(/[^a-z]/g, '');
  if (PALAVROES.some(p => baixo.includes(p.replace(/[^a-z]/g, '')))) n = 'anônimo';
  if (!n) n = 'alguém';
  return n.length > max ? n.slice(0, max - 1) + '…' : n;
}

export function fmtTempo(seg) {
  seg = Math.max(0, Math.floor(seg));
  const m = Math.floor(seg / 60), s = seg % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
}
