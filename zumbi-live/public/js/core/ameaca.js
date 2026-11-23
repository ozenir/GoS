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
  porNivelHeroi: 0.45,
  maximo: 99,   // bem alto de propósito: com o tempo a ameaça sempre vence, por mais forte que o herói fique

  // Zumbis normais na rua ao mesmo tempo (o diretor vai repondo, até acabar a cota do quarteirão)
  naturaisBase: 14,
  naturaisPorNivel: 2.5,
  // Segundos entre um aparecimento e outro
  intervaloBase: 1.6,
  intervaloMin: 0.3,
  // Quantos aparecem juntos em cada aparecimento: 1 + nível × isto (arredondado pra baixo)
  grupoPorNivel: 0.35,
  grupoMax: 6,
  // Na rua os zumbis chegam em bandos, de todos os lados: grupo + grupoRuaExtra, intervalo × intervaloRuaMult
  grupoRuaExtra: 3, intervaloRuaMult: 1.5,

  // Cota da quadra: cada quarteirão tem um número fixo de zumbis da rua. Acabou a cota, não nasce mais
  // ninguém na rua. O herói só atravessa o cruzamento depois de limpar a área (jogo.js → areaLimpa).
  // cota = (base + (ameaça - 1) × porNivel) × multiplicador do começo (abaixo), até o máximo.
  cotaBase: 24, cotaPorNivel: 2, cotaMax: 80,
  // Área que precisa estar limpa pra atravessar (casas em volta do herói)
  areaRaio: 18,
  // Zumbi preso longe que não chega no herói: depois de tantos segundos sem abate, os que estão longe somem.
  // E, por segurança, depois de limpandoMax segundos esperando, o herói atravessa de qualquer jeito.
  limpandoSemAbate: 10, limpandoLonge: 7, limpandoMax: 90,
  // Faltando poucos (cacarPoucos ou menos), o herói vai atrás deles pra acabar logo: até cacarLonge casas do
  // cruzamento (com mais zumbis, só até 9: os outros vêm até ele)
  cacarPoucos: 8, cacarLonge: 17,

  // Começo puxado: antes do nível 10 o herói ainda não tem as habilidades no máximo, mas elas crescem muito
  // rápido (cada nível de habilidade triplica). Pra ele sofrer de verdade até o 10 (vida baixa, sem morrer),
  // os zumbis vêm em maior número (calmoMult/medioMult) e mais fortes (calmoForca/medioForca: vida e dano).
  // Do nível 10 em diante volta a 1: com a habilidade suprema o herói vira a mesa e passa a aguentar as hordas.
  // Quantidade vale pros zumbis da rua, grupos, cota da quadra, hordas dos caminhos perigosos, prédios e
  // ondas da arena (os mandados por presente e a horda gigante não passam de 1).
  calmoAteNivel: 5, calmoMult: 1.2, calmoForca: 1.5,
  medioAteNivel: 10, medioMult: 1.3, medioForca: 2,

  // Horda gigante da quadra (estilo Vampire Survivors): a cada 5 quarteirões andados chega uma horda
  // enorme, anunciada, de frente e por trás, em ondas. É rara e precisa ser limpa pra seguir em frente.
  // tamanho = base + (ameaça - 1) × porNivel, até o máximo. A primeira (quarteirão 5) é pequena; depois do
  // nível 10, com as habilidades montadas, elas ficam gigantes.
  hordaCadaQuarteiroes: 5,
  hordaQuadraBase: 12, hordaQuadraPorNivel: 2.8, hordaQuadraMax: 110,
  hordaQuadraOndaCada: 30,   // a cada tantos zumbis a horda chega numa onda a mais (8 s entre ondas)

  // Hordas que chegam sozinhas por TEMPO (desligado: agora a horda grande vem por quarteirão, acima).
  // Dá pra religar no config.json → horda_a_cada_segundos (só a partir do nível 10 do herói).
  hordaDesdeNivel: 10,
  hordaCadaSegundos: 0,
  hordaBase: 10,
  hordaPorNivel: 2,
  hordaMax: 40,

  // Hordas mandadas pelo público (presentes TikTok, Perfume, Trem) crescem com a ameaça
  presentePorNivel: 0.12,

  // Zumbis dentro dos prédios: quantidade da loja × (base + nível × isto)
  predioBase: 0.8,
  predioPorNivel: 0.12,

  // Trava contra herói imortal SEM a live ajudar: não é tempo limite da run.
  // Conta só os minutos desde o último presente de ajuda (ou seguir). Passou de furiaDepoisDe,
  // os zumbis que nascem batem cada vez mais forte. Com a live ajudando, a run pode durar o quanto aguentar.
  furiaDepoisDe: 4,
  furiaPorMinuto: 0.6,
  furiaVida: 1,   // a fúria também dá vida aos zumbis (1 = o mesmo tanto que o dano)
  // e velocidade: +furiaVel por ponto de fúria, até furiaVelMax (senão um herói que deixa os zumbis lentos
  // e empurra todo mundo, como aura de fogo + onda de choque, segura a horda longe pra sempre)
  furiaVel: 0.05, furiaVelMax: 0.5
};

// Multiplicador de dano dos zumbis pela trava acima. minutos = minutos SEM AJUDA da live.
export const furiaDaHorda = (minutos, A = AMEACA) => 1 + Math.max(0, minutos - A.furiaDepoisDe) * A.furiaPorMinuto;

// Quanto dos zumbis normais aparece no nível do herói (começo)
export const multInicio = (nivelHeroi, A = AMEACA) => nivelHeroi < A.calmoAteNivel ? A.calmoMult : nivelHeroi < A.medioAteNivel ? A.medioMult : 1;
// Quanto mais fortes (vida e dano) os zumbis nascem no nível do herói (começo)
export const forcaInicio = (nivelHeroi, A = AMEACA) => nivelHeroi < A.calmoAteNivel ? A.calmoForca : nivelHeroi < A.medioAteNivel ? A.medioForca : 1;

// Cota da quadra: quantos zumbis da rua nascem no quarteirão (n = ameaça, mult = multiplicador do começo)
export const cotaQuadra = (n, mult = 1, A = AMEACA) => Math.min(A.cotaMax, Math.round((A.cotaBase + Math.max(0, n - 1) * A.cotaPorNivel) * mult));

// Horda gigante a cada hordaCadaQuarteiroes quarteirões
export const tamanhoHordaQuadra = (n, mult = 1, A = AMEACA) =>
  Math.min(A.hordaQuadraMax, Math.round((A.hordaQuadraBase + Math.max(0, n - 1) * A.hordaQuadraPorNivel) * mult));

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

// Que tipos aparecem na rua em cada nível (pesos). n = nível de ameaça; nivelHeroi libera os inimigos novos.
export const NIVEL_INIMIGOS_NOVOS = 20;

// Estouro do zumbi explosivo: até o nível 19 do herói é fixo (base). Do nível 20 em diante (desdeNivel) vêm os
// INCHADOS INSTÁVEIS: aparecem muito mais (na rua e no meio das hordas, naHorda = parte da horda), o estouro
// cresce com a ameaça como o dano dos outros zumbis, é maior e mais forte (multNovo, raioNovo) e um estouro faz
// os explosivos em volta estourarem junto (reação em cadeia). É a fase em que a passiva Anti-explosão salva.
// Zumbi do tomate (dados.js → ZUMBIS.tomateiro): do nível desdeNivel do herói em diante, a cada quarteirão
// novo tem `chance` de aparecer um, se não tiver nenhum vivo (é um por vez).
export const TOMATEIRO = { desdeNivel: 3, chance: 0.35 };
// Zumbi da pedra (dados.js → ZUMBIS.pedreiro): igual, mais tarde e um pouco mais raro. Também é um por vez.
export const PEDREIRO = { desdeNivel: 6, chance: 0.28 };

// O estouro do inchado também atordoa o herói (atordoa s), a não ser que a resistência a explosão dele seja de pelo
// menos resSemAtordoar (Anti-explosão nível 2, ou o mecânico e a bombeira, que já nascem resistentes).
export const EXPLOSAO = {
  base: 9, raio: 1.9,   // dano do estouro no herói (era 18: cortado pela metade)
  danoZumbi: 80, desdeNivel: NIVEL_INIMIGOS_NOVOS,
  multNovo: 2.2, raioNovo: 2.4, naHorda: 0.3, pesoRua: 6, cadeia: 0.18, atordoa: 1, resSemAtordoar: 0.24,
  janela: 2,      // várias explosões em até 2 s: só a primeira machuca (e atordoa) o herói
  arremesso: 12   // e ela joga o herói longe (~3 casas), pra fora do alcance das próximas
};
export function pesosTipos(n, nivelHeroi = 1) {
  const novos = nivelHeroi >= NIVEL_INIMIGOS_NOVOS;
  return [
    ['comum', 10],
    ['gordo', 2 + acima(n) * 0.3],
    ['corredor', n >= 2 ? Math.min(4, (n - 1) * 0.8) : 0],
    ['explosivo', (n >= 3 ? Math.min(1.5, (n - 2) * 0.3) : 0) + (nivelHeroi >= EXPLOSAO.desdeNivel ? EXPLOSAO.pesoRua : 0)],
    ['lobo', novos ? 2.5 : 0],
    ['esticado', novos ? 2 : 0]
  ];
}
