// ============================================================================
//  RECOMPENSAS DE PRESENTE — pensadas pra live de quem tem pouca moeda.
//
//  Todo presente continua com o efeito dele (config.json → presentes). Além disso:
//
//  🪂 DROP (presente de até dropAteMoedas, padrão 1 moeda: Rosa, TikTok, Sorvete...)
//     Cai uma caixa de paraquedas perto do herói, devagar (dá tempo de todo mundo ver). Quando ele pega,
//     ganha um BÔNUS sorteado (DROPS) que dura dropQuarteiroes quarteirões. Os bônus ACUMULAM: pegar o mesmo
//     de novo soma uma pilha (mais forte, até dropMaxPilhas) e o tempo volta pros 5 quarteirões; bônus
//     diferentes valem juntos. Presente repetido (Rosa x5) solta uma caixa por unidade (até dropsPorPresente).
//
//  ✨ DOAÇÃO (presente a partir de doacaoAPartirDe moedas, padrão 2)
//     - INSPIRAÇÃO: por inspiracao.segundos o herói toma só 20% do dano e solta pulsos de luz que machucam
//       todos os zumbis em volta
//     - ganha um DROP também
//     - no PRÓXIMO QUARTEIRÃO aparece o COLOSSO (o chefão da doação, com o nome de quem doou): vida enorme
//       (chefe.vida, uns 10 mil, crescendo com o nível do herói), começa batendo muito forte (o golpe atravessa a
//       armadura). É condicional: quando a vida do herói chega
//       em 30% (ou a luta passa de chefe.cansaSegundos), o colosso CANSA: fica lento, toma 3x mais dano e
//       bate bem mais fraco, pra o herói conseguir vencer. Só um colosso por vez.
//     - vencendo, o colosso solta uma RUNA
//
//  🔮 RUNA: habilidade única de DANO ou de RESISTÊNCIA que gruda numa habilidade que o herói já tem e cresce
//     junto com ela (a cada nível da habilidade, a runa fica mais forte):
//       dano         a habilidade causa +runa.dano (25%) a mais por nível dela
//       resistencia  o herói ganha +runa.defesa (4%) de defesa por nível da habilidade
//     Sem habilidade ativa, a runa vai pro ataque principal (cresce com o Treino).
//
//  Os números de quem decide (moedas, segundos, vida do colosso) ficam no config.json → jogo.
// ============================================================================

export const RECOMPENSA = {
  dropAteMoedas: 1,
  dropsPorPresente: 5,
  dropQuarteiroes: 5,
  dropMaxPilhas: 5,
  dropAltura: 7, dropQueda: 1.4,     // casas de altura e de queda por segundo (cai em ~5 s)
  doacaoAPartirDe: 2,
  inspiracao: { segundos: 10, danoRecebido: 0.2, raio: 3, pulso: 0.5, dano: 30 },
  chefe: {
    vida: 10000, vidaPorNivel: 0.25,    // vida = 10 mil × (1 + 25% por nível do herói acima de 1): acompanha a força dele
    golpe: 0.1,                           // cada golpe tira 10% da vida máxima do herói e ATRAVESSA armadura, colete e esquiva
                                          // (bate forte, mas não mata num golpe; a inspiração ainda corta pra 20%)
    cansaVida: 0.3, cansaSegundos: 75,
    cansadoDanoRecebido: 3, cansadoDano: 0.25   // cansado: toma 3x, bate 25%; a lentidão (35% da velocidade) é o status "cansado" (status.js)
  },
  runa: { dano: 0.25, defesa: 0.04, principal: 0.1 }
};

// Bônus dos drops (status.js → STATUS, os que começam com "d_"). peso = chance relativa.
export const DROPS = [
  { id: 'd_forca', peso: 3 },
  { id: 'd_cadencia', peso: 3 },
  { id: 'd_casca', peso: 2 },
  { id: 'd_folego', peso: 2 },
  { id: 'd_mira', peso: 2 },
  { id: 'd_pernas', peso: 1.5 },
  { id: 'd_sorte', peso: 1.5 }
];

// Quanto vale cada pilha de cada bônus (mostrado na tela e usado no status)
export const XP_POR_PILHA_SORTE = 0.25;

// Multiplicador de dano de uma habilidade pela runa de dano: 1 + 25% × nível × quantas runas de dano ela tem
export const multRunaDano = (runa, nivel, R = RECOMPENSA) => 1 + (runa?.dano || 0) * R.runa.dano * nivel;
// Defesa que as runas de resistência dão: 4% × nível da habilidade × quantas runas
export const defesaRuna = (runa, nivel, R = RECOMPENSA) => (runa?.resistencia || 0) * R.runa.defesa * nivel;
