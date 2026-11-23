// ============================================================================
//  ZUMBIS DA TELA — zumbis que mexem com a tela da live: sujam, quebram a "quarta parede", bagunçam a imagem
//  ou fazem um momento marcante. Cada um é um zumbi de verdade na rua: chega perto da câmera (ou joga de longe)
//  e aí o efeito acontece na tela (view/tela.js), com o nome de quem mandou ("@fulano jogou um ovo!").
//
//  DISPUTA: quem ATRAPALHA suja a tela; quem AJUDA limpa. Todo presente de ajuda passa o LIMPADOR de para-brisa
//  (se a tela estiver suja), e o efeito "limpador" do config.json faz isso de propósito.
//
//  Cada zumbi tem:
//    nome, emoji, grupo ('suja' | 'quarta' | 'imagem' | 'marcante'), frase (o que aparece com o nome de quem mandou)
//    nivel     1 a 4: força do efeito. O presente escolhe pelo valor (TELA.porMoedas): barato = nível 1, caro = 4
//    dura      segundos que o efeito fica na tela (2 a 4: tela coberta por muito tempo faz o público sair)
//    cobre     quanto da tela ele cobre (0 a 1): soma na COBERTURA (TELA.coberturaMax) pra tela nunca sumir toda
//    jeito     'longe' (para a uns metros e ARREMESSA, como o zumbi do tomate) | 'perto' (vem até a câmera e faz
//              ali, como quem bate no vidro) | 'direto' (só o efeito, sem zumbi na rua: a mão gigante)
//    recarga   segundos entre um efeito e outro do mesmo zumbi (ele repete até morrer)
//    desdeNivel   nível do herói em que ele começa a aparecer sozinho na rua (sem presente). null = só por presente
//    peso      chance relativa de ser sorteado (na rua e no presente)
//    roupa     cores do zumbi na rua (view/sprites.js) e item = o que ele leva na mão (view/render.js)
//    zumbi     números do zumbi na rua (vida, velocidade...; como em dados.js → ZUMBIS)
// ============================================================================

export const TELA = {
  // valor do presente (moedas de UMA unidade) → níveis de zumbi da tela que podem vir
  porMoedas: [
    { ate: 1, niveis: [1] },
    { ate: 9, niveis: [1, 2] },
    { ate: 99, niveis: [2, 3] },
    { ate: 999, niveis: [3] },
    { ate: Infinity, niveis: [4, 3] }
  ],
  chancePresente: 0.6,     // chance de um presente de ATRAPALHAR também mandar um zumbi da tela (além do efeito dele)
  recargaPresente: 6,      // segundos entre um zumbi da tela de presente e outro (pra não virar bagunça)
  naRua: { chance: 0.3, max: 1 },   // a cada quarteirão: chance de aparecer um sozinho (no máximo `max` vivos)
  coberturaMax: 0.9,       // soma do "cobre" dos efeitos na tela ao mesmo tempo; passou, o mais antigo sai antes
  limpador: { dura: 1.1 }  // o limpador de para-brisa: quanto tempo leva a passada
};

const Z = (vida, vel, extra = {}) => ({ vida, vel, dano: 6, cd: 1.1, raio: 0.32, xp: 4, alcance: 0.62, ataque: { tipo: 'mordida' }, ...extra });

export const ZUMBIS_TELA = {
  /* ---------- sujam ou cobrem a tela ---------- */
  ovo: {
    nome: 'Zumbi do ovo podre', emoji: '🥚', grupo: 'suja', nivel: 1, dura: 4, cobre: 0.15, jeito: 'longe', recarga: 9, desdeNivel: 3, peso: 1.2,
    frase: 'jogou um ovo podre', roupa: { camisa: '#e8e0c0', calca: '#5a4a2a', chapeu: { tipo: 'bone', cor: '#f2c230' } }, item: 'ovo', zumbi: Z(40, 0.5)
  },
  pintor: {
    nome: 'Zumbi pintor', emoji: '🎨', grupo: 'suja', nivel: 2, dura: 4, cobre: 0.3, jeito: 'longe', recarga: 12, desdeNivel: 8, peso: 1,
    frase: 'jogou um balde de tinta', roupa: { camisa: '#f4f4f0', calca: '#f4f4f0', chapeu: { tipo: 'bone', cor: '#f4f4f0' } }, item: 'balde', zumbi: Z(55, 0.48)
  },
  chiclete: {
    nome: 'Zumbi do chiclete', emoji: '🍬', grupo: 'suja', nivel: 1, dura: 4, cobre: 0.12, jeito: 'longe', recarga: 9, desdeNivel: 4, peso: 1,
    frase: 'cuspiu um chiclete', roupa: { camisa: '#ff7ac0', calca: '#3a3a5a', chapeu: { tipo: 'bone', cor: '#ff9ad0' } }, item: 'chiclete', zumbi: Z(38, 0.55)
  },
  torta: {
    nome: 'Zumbi da torta', emoji: '🥧', grupo: 'suja', nivel: 2, dura: 2.5, cobre: 0.45, jeito: 'longe', recarga: 11, desdeNivel: 6, peso: 1.1,
    frase: 'acertou uma torta na cara da live', roupa: { camisa: '#ffffff', calca: '#2a2a3a', chapeu: { tipo: 'bone', cor: '#ffffff' } }, item: 'torta', zumbi: Z(45, 0.5)
  },
  lambedor: {
    nome: 'Zumbi lambedor', emoji: '👅', grupo: 'suja', nivel: 1, dura: 3.5, cobre: 0.15, jeito: 'perto', recarga: 10, desdeNivel: 5, peso: 1,
    frase: 'lambeu a tela', roupa: { camisa: '#6a8a5a', calca: '#3a3a2a' }, zumbi: Z(42, 0.6)
  },
  /* ---------- quebram a "quarta parede" ---------- */
  bate: {
    nome: 'Zumbi que bate no vidro', emoji: '✋', grupo: 'quarta', nivel: 2, dura: 3, cobre: 0.2, jeito: 'perto', recarga: 12, desdeNivel: 9, peso: 1,
    frase: 'bateu no vidro', roupa: { camisa: '#5a6a8a', calca: '#2a2a3a' }, zumbi: Z(60, 0.55, { dano: 8 })
  },
  encostado: {
    nome: 'Zumbi encostado', emoji: '😶', grupo: 'quarta', nivel: 2, dura: 3.5, cobre: 0.35, jeito: 'perto', recarga: 14, desdeNivel: 10, peso: 0.9,
    frase: 'grudou a cara na tela', roupa: { camisa: '#8a5a7a', calca: '#3a2a3a' }, zumbi: Z(55, 0.55)
  },
  puxa: {
    nome: 'Zumbi que puxa a tela', emoji: '📄', grupo: 'quarta', nivel: 3, dura: 3, cobre: 0.25, jeito: 'perto', recarga: 15, desdeNivel: 14, peso: 0.8,
    frase: 'dobrou o canto da tela', roupa: { camisa: '#c8a86a', calca: '#4a3a2a' }, zumbi: Z(70, 0.55)
  },
  grafite: {
    nome: 'Zumbi do grafite', emoji: '🖌️', grupo: 'quarta', nivel: 2, dura: 3.5, cobre: 0.2, jeito: 'perto', recarga: 13, desdeNivel: 7, peso: 1,
    frase: 'pichou a tela', roupa: { camisa: '#2a2a2a', calca: '#3a4a6a', chapeu: { tipo: 'bone', cor: '#e83a5a' } }, item: 'spray', zumbi: Z(48, 0.6),
    palavras: ['SOCORRO', 'SEGUE AÍ', 'CORRE!', 'TÔ COM FOME', 'MIOLOS', 'BRAAAINS']
  },
  /* ---------- bagunçam a imagem ---------- */
  eletricista: {
    nome: 'Zumbi eletricista', emoji: '⚡', grupo: 'imagem', nivel: 3, dura: 3, cobre: 0.2, jeito: 'perto', recarga: 14, desdeNivel: 12, peso: 0.9,
    frase: 'mordeu o cabo da câmera', roupa: { camisa: '#3a6aaa', calca: '#2a3a5a', chapeu: { tipo: 'capacete', cor: '#f2c230' } }, item: 'alicate', zumbi: Z(60, 0.55, { ataque: { tipo: 'mordida', status: [{ id: 'atordoado', chance: 0.15, duracao: 0.4 }] } })
  },
  fumaca: {
    nome: 'Zumbi da fumaça', emoji: '💨', grupo: 'imagem', nivel: 1, dura: 4, cobre: 0.3, jeito: 'perto', recarga: 12, desdeNivel: 6, peso: 1,
    frase: 'soltou uma nuvem de fumaça', roupa: { camisa: '#6a6a6a', calca: '#3a3a3a' }, item: 'cigarro', zumbi: Z(45, 0.5)
  },
  apagao: {
    nome: 'Zumbi do apagão', emoji: '🔦', grupo: 'imagem', nivel: 3, dura: 3.5, cobre: 0.35, jeito: 'perto', recarga: 18, desdeNivel: 16, peso: 0.7,
    frase: 'desligou as luzes', roupa: { camisa: '#1a1a24', calca: '#1a1a24' }, zumbi: Z(65, 0.6)
  },
  tonto: {
    nome: 'Zumbi tonto', emoji: '😵‍💫', grupo: 'imagem', nivel: 2, dura: 3, cobre: 0.1, jeito: 'perto', recarga: 14, desdeNivel: 11, peso: 0.8,
    frase: 'deixou a live tonta', roupa: { camisa: '#c87aff', calca: '#4a2a5a' }, item: 'garrafa', zumbi: Z(50, 0.45)
  },
  lama: {
    nome: 'Zumbi da lama', emoji: '🟫', grupo: 'imagem', nivel: 1, dura: 3.5, cobre: 0.25, jeito: 'longe', recarga: 10, desdeNivel: 4, peso: 1,
    frase: 'espirrou lama', roupa: { camisa: '#6a4a2a', calca: '#4a3a1a' }, item: 'lama', zumbi: Z(50, 0.5)
  },
  /* ---------- pra ficar marcante ---------- */
  gigante: {
    nome: 'Zumbi gigante', emoji: '🖐️', grupo: 'marcante', nivel: 4, dura: 3.5, cobre: 0.5, jeito: 'direto', recarga: 0, desdeNivel: null, peso: 1,
    frase: 'mandou a MÃO GIGANTE', golpe: 0.12, zumbi: Z(9999, 0)   // tira 12% da vida do herói quando a mão bate
  },
  selfie: {
    nome: 'Zumbi selfie', emoji: '🤳', grupo: 'marcante', nivel: 3, dura: 2.5, cobre: 0.6, jeito: 'perto', recarga: 16, desdeNivel: 13, peso: 0.9,
    frase: 'tirou uma selfie com a live', roupa: { camisa: '#ff5a8a', calca: '#3a3a5a' }, item: 'celular', zumbi: Z(50, 0.6)
  },
  fa: {
    nome: 'Zumbi fã', emoji: '🪧', grupo: 'marcante', nivel: 3, dura: 4, cobre: 0.25, jeito: 'perto', recarga: 16, desdeNivel: null, peso: 1,
    frase: 'mandou um fã com plaquinha', roupa: { camisa: '#fe2c55', calca: '#25f4ee' }, item: 'placa', zumbi: Z(55, 0.6)
  }
};

export const GRUPOS_TELA = { suja: 'Sujam ou cobrem a tela', quarta: 'Quebram a quarta parede', imagem: 'Bagunçam a imagem', marcante: 'Pra ficar marcante' };
export const tipoTela = id => 'tela_' + id;            // o tipo do zumbi na rua (dados.js → ZUMBIS)
export const idTela = tipo => (String(tipo).startsWith('tela_') ? tipo.slice(5) : null);

// Níveis de zumbi da tela que um presente de `moedas` pode mandar
export function niveisPorMoedas(moedas) {
  const m = Math.max(1, Number(moedas) || 1);
  return (TELA.porMoedas.find(f => m <= f.ate) || TELA.porMoedas[TELA.porMoedas.length - 1]).niveis;
}

// Sorteia um zumbi da tela entre os níveis dados (rng.next() de 0 a 1). filtro: (id, Z) → podia vir?
export function sortearTela(rng, niveis, filtro = () => true) {
  const lista = Object.entries(ZUMBIS_TELA).filter(([id, Zt]) => niveis.includes(Zt.nivel) && filtro(id, Zt));
  if (!lista.length) return null;
  let s = rng.next() * lista.reduce((a, [, Zt]) => a + Zt.peso, 0);
  for (const [id, Zt] of lista) if ((s -= Zt.peso) <= 0) return id;
  return lista[lista.length - 1][0];
}

// Zumbi da tela que aparece sozinho na rua no nível `nivelHeroi` (ou null)
export function sortearNaRua(rng, nivelHeroi) {
  return sortearTela(rng, [1, 2, 3], (id, Zt) => Zt.desdeNivel != null && nivelHeroi >= Zt.desdeNivel && Zt.jeito !== 'direto');
}
