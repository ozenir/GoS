// ============================================================================
//  NÍVEL DE AMEAÇA — quando os monstros ficam mais fortes e quantos vêm.
//
//  A ameaça começa em 1 e sobe com:
//    - o tempo que o herói está vivo,
//    - os quarteirões andados,
//    - o nível do herói (quanto mais forte o herói, mais fortes os zumbis).
//
//  Quanto cada zumbi fica mais forte por nível (vida, dano, velocidade,
//  resistência) fica em dano.js → ESCALA_AMEACA.
//  Aqui fica: a conta do nível, o tamanho das hordas e o ritmo de aparecimento.
// ============================================================================

export const AMEACA = {
  // Pontos de ameaça. O nível é 1 + pontos (arredondado pra baixo).
  porMinuto: 1.2,
  porQuarteirao: 0.12,
  porNivelHeroi: 0.18,
  maximo: 30,

  // Zumbis normais na rua ao mesmo tempo (o diretor vai repondo)
  naturaisBase: 14,
  naturaisPorNivel: 2.5,
  // Segundos entre um aparecimento e outro
  intervaloBase: 1.6,
  intervaloMin: 0.3,
  // Quantos aparecem juntos em cada aparecimento: 1 + nível × isto (arredondado pra baixo)
  grupoPorNivel: 0.35,
  grupoMax: 6,

  // Hordas que chegam sozinhas de tempos em tempos
  hordaCadaSegundos: 24,
  hordaBase: 10,
  hordaPorNivel: 2,
  hordaMax: 30,

  // Hordas mandadas pelo público (presentes TikTok, Perfume, Trem) crescem com a ameaça
  presentePorNivel: 0.12,

  // Zumbis dentro dos prédios: quantidade da loja × (base + nível × isto)
  predioBase: 0.8,
  predioPorNivel: 0.12
};

// extra = pontos ganhos de outros jeitos (ex.: caminhos perigosos, ver caminhos.js)
export function pontosAmeaca(minutos, quarteiroes, nivelHeroi, A = AMEACA, extra = 0) {
  return minutos * A.porMinuto + quarteiroes * A.porQuarteirao + Math.max(0, nivelHeroi - 1) * A.porNivelHeroi + extra;
}

export function nivelAmeaca(minutos, quarteiroes, nivelHeroi, A = AMEACA, extra = 0) {
  return Math.min(A.maximo, 1 + Math.floor(pontosAmeaca(minutos, quarteiroes, nivelHeroi, A, extra)));
}

// Quanto falta (0 a 1) para o próximo nível — usado na barrinha do painel
export function progressoAmeaca(minutos, quarteiroes, nivelHeroi, A = AMEACA, extra = 0) {
  const p = pontosAmeaca(minutos, quarteiroes, nivelHeroi, A, extra);
  return p - Math.floor(p);
}

const acima = n => Math.max(0, n - 1);
export const alvoNaturais = (n, A = AMEACA) => A.naturaisBase + acima(n) * A.naturaisPorNivel;
export const intervaloAparecer = (n, A = AMEACA) => Math.max(A.intervaloMin, A.intervaloBase / (1 + acima(n) * 0.25));
export const tamanhoGrupo = (n, A = AMEACA) => Math.min(A.grupoMax, 1 + Math.floor(acima(n) * A.grupoPorNivel));
export const tamanhoHorda = (n, A = AMEACA) => Math.min(A.hordaMax, Math.round(A.hordaBase + acima(n) * A.hordaPorNivel));
export const multPresente = (n, A = AMEACA) => 1 + acima(n) * A.presentePorNivel;
export const multPredio = (n, A = AMEACA) => A.predioBase + n * A.predioPorNivel;

// Que tipos aparecem na rua em cada nível (pesos)
export function pesosTipos(n) {
  return [
    ['comum', 10],
    ['gordo', 2 + acima(n) * 0.3],
    ['corredor', n >= 2 ? Math.min(4, (n - 1) * 0.8) : 0],
    ['explosivo', n >= 3 ? Math.min(1.5, (n - 2) * 0.3) : 0]
  ];
}
