// ============================================================================
//  PEDRA NO VIDRO — o zumbi da pedra joga uma pedra que bate no "vidro" da câmera e trinca a tela.
//
//  Física (aproximada, com números de verdade):
//    - a pedra tem massa de ~200 g e chega a 12–18 m/s (um arremesso forte de braço)
//    - a energia do impacto é E = ½·m·v² (uns 15 a 32 J)
//    - vidro trinca em ESTRELA: trincas radiais saindo do ponto do impacto. Quanto mais energia, mais trincas
//      radiais (cresce com a raiz da energia, como nos experimentos de placas de vidro furadas por projéteis)
//      e mais compridas (a energia vira superfície de trinca: comprimento ~ E^(1/3) na escala da tela)
//    - entre as radiais, ANÉIS concêntricos (a placa dobra e trinca em círculos, a "teia de aranha")
//    - no ponto do impacto, uma zona ESMIGALHADA (pó de vidro branco)
//    - a trinca anda a ~1.500 m/s no vidro: na tela ela aparece quase na hora (uns 0,12 s, pra dar pra ver)
//  A tela é um vidro de 64 cm (mesma escala do tomate: core/tomate.js → FISICA.pxPorMetro).
//  Tudo aqui é geometria pura (sem desenhar): a parte visual fica em view/sujeira.js.
// ============================================================================
export const PEDRA = {
  massa: 0.2,             // kg
  vel: [12, 18],          // m/s na hora do impacto
  E0: 22,                 // J: energia "de referência" (≈ 200 g a 15 m/s)
  radiais: [5, 12],       // quantas trincas radiais (mínimo, máximo)
  porRaiz: 7,             // trincas radiais na energia de referência (cresce com √(E/E0))
  comprimento: 46,        // px: comprimento médio das radiais na energia de referência (cresce com (E/E0)^(1/3))
  galho: 0.4,             // chance de uma radial se dividir em duas no caminho
  aneis: [0.28, 0.5, 0.74],   // onde ficam os anéis (fração do comprimento médio); mais energia, mais anéis
  anelFalha: 0.25,        // chance de faltar um pedaço de anel entre duas radiais
  miolo: 3,               // px: raio da zona esmigalhada na energia de referência
  propaga: 0.12,          // s: tempo pra trinca se espalhar na tela
  dura: 26,               // s: a trinca fica na tela (depois o "vidro é trocado")
  some: 3,                // s: sumindo
  max: 3                  // no máximo tantas trincas ao mesmo tempo
};

export const energiaPedra = (massa, v) => 0.5 * massa * v * v;
export const numRadiais = (E, P = PEDRA) => Math.max(P.radiais[0], Math.min(P.radiais[1], Math.round(P.porRaiz * Math.sqrt(E / P.E0))));
export const comprimentoRadial = (E, P = PEDRA) => P.comprimento * Math.cbrt(E / P.E0);
export const quantosAneis = (E, P = PEDRA) => Math.max(1, Math.min(P.aneis.length, Math.round(1 + (E - 12) / 9)));

// Trinca nova: r() devolve um número de 0 a 1 (Math.random ou um rng de teste); w, h = tamanho da tela em px.
// Devolve { cx, cy, E, raio, miolo, radiais: [[x,y]...][], aneis: [[x,y]...][] } com as linhas já em px.
export function gerarTrinca(r, w, h, P = PEDRA) {
  const v = P.vel[0] + r() * (P.vel[1] - P.vel[0]);
  const E = energiaPedra(P.massa, v);
  const L = comprimentoRadial(E, P);
  const cx = L * 0.3 + r() * (w - L * 0.6), cy = L * 0.3 + r() * (h - L * 0.6);
  const n = numRadiais(E, P);
  const angulos = [];
  const a0 = r() * Math.PI * 2;
  for (let i = 0; i < n; i++) angulos.push(a0 + (i + 0.5 * (r() - 0.5)) / n * Math.PI * 2);
  const radiais = [], pontas = [];
  // cada radial anda em passos de 2 px, mudando um pouco de direção (trinca de verdade não é reta)
  const caminhar = (x, y, a, comp) => {
    const pts = [[x, y]];
    for (let d = 0; d < comp; d += 2) {
      a += (r() - 0.5) * 0.22;
      x += Math.cos(a) * 2; y += Math.sin(a) * 2;
      pts.push([x, y]);
    }
    return pts;
  };
  for (const a of angulos) {
    const comp = L * (0.65 + r() * 0.7);
    const pts = caminhar(cx, cy, a, comp);
    radiais.push(pts);
    pontas.push({ a, comp, pts });
    // galho: a trinca se divide no caminho (bifurcação), saindo num ângulo de 15° a 35°
    if (r() < P.galho) {
      const k = Math.floor(pts.length * (0.35 + r() * 0.35)), [gx, gy] = pts[k];
      const lado = r() < 0.5 ? -1 : 1;
      radiais.push(caminhar(gx, gy, a + lado * (0.26 + r() * 0.35), (comp - k * 2) * (0.5 + r() * 0.4)));
    }
  }
  // anéis: ligam radiais vizinhas na mesma distância do centro (a teia), com um pouco de tremido
  const aneis = [];
  const nA = quantosAneis(E, P);
  for (let k = 0; k < nA; k++) {
    const R = L * P.aneis[k] * (0.9 + r() * 0.2);
    for (let i = 0; i < pontas.length; i++) {
      if (r() < P.anelFalha) continue;
      const A = pontas[i], B = pontas[(i + 1) % pontas.length];
      if (A.comp < R || B.comp < R) continue;   // a radial não chega até ali
      const pa = A.pts[Math.min(A.pts.length - 1, Math.round(R / 2))], pb = B.pts[Math.min(B.pts.length - 1, Math.round(R / 2))];
      // arco curvado pra fora (um pouco) entre os dois pontos
      const mx = (pa[0] + pb[0]) / 2, my = (pa[1] + pb[1]) / 2, dx = mx - cx, dy = my - cy, dd = Math.hypot(dx, dy) || 1;
      const curva = R * 0.08 * (0.5 + r());
      const meio = [mx + dx / dd * curva + (r() - 0.5) * 1.5, my + dy / dd * curva + (r() - 0.5) * 1.5];
      aneis.push([pa, meio, pb]);
    }
  }
  return { cx, cy, E, v, raio: L * 1.35, miolo: P.miolo * Math.sqrt(E / P.E0), radiais, aneis };
}
