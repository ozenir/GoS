// Tabelas do jogo: tipos de zumbi, classes de herói, armas e melhorias de nível.
// Mexa aqui pra mudar números (vida, dano, velocidade...). Velocidade em casas por segundo.
// (o herói anda 1,1 por padrão: config.json → velocidade_do_heroi)

// ataque: tipo de dano do golpe do zumbi (dano.js → TIPOS_DANO) e efeitos que ele pode causar no herói (status.js)
// Fraquezas e resistências de cada zumbi a cada tipo de dano: dano.js → AFINIDADES
export const ZUMBIS = {
  comum:     { nome: 'Zumbi',        vida: 30,   vel: 0.56, dano: 6,  cd: 1.0, raio: 0.32, xp: 1,  alcance: 0.62, ataque: { tipo: 'mordida', status: [{ id: 'infectado', chance: 0.06 }] } },
  gordo:     { nome: 'Zumbi gordo',  vida: 55,   vel: 0.44, dano: 8,  cd: 1.2, raio: 0.4,  xp: 2,  alcance: 0.66, ataque: { tipo: 'mordida', status: [{ id: 'infectado', chance: 0.1 }] } },
  corredor:  { nome: 'Corredor',     vida: 20,   vel: 1.4,  dano: 4,  cd: 0.7, raio: 0.28, xp: 1,  alcance: 0.6,  ataque: { tipo: 'mordida', status: [{ id: 'sangramento', chance: 0.15 }] } },
  explosivo: { nome: 'Explosivo',    vida: 40,   vel: 0.54, dano: 0,  cd: 1.0, raio: 0.42, xp: 3,  alcance: 0.9,  ataque: { tipo: 'explosao' } },
  chefao:    { nome: 'Chefão',       vida: 480,  vel: 0.55, dano: 11, cd: 1.3, raio: 0.6,  xp: 25, alcance: 1.05, chefe: true, ataque: { tipo: 'impacto', status: [{ id: 'atordoado', chance: 0.2, duracao: 0.6 }] } },
  rei:       { nome: 'Rei Zumbi',    vida: 1400, vel: 0.48, dano: 16, cd: 1.5, raio: 0.85, xp: 60, alcance: 1.35, chefe: true, ataque: { tipo: 'impacto', status: [{ id: 'atordoado', chance: 0.2, duracao: 0.7 }, { id: 'lento', chance: 0.3 }] } },
  // Colosso: o chefão que aparece depois de uma doação (recompensas.js). A vida vem de lá (uns 10 mil).
  colosso:   { nome: 'Colosso',      vida: 10000, vel: 0.5,  dano: 30, cd: 1.4, raio: 0.8,  xp: 120, alcance: 1.3, chefe: true, ataque: { tipo: 'impacto' } },   // não atordoa nem deixa o herói lento
  exheroi:   { nome: 'Ex-herói',     vida: 300,  vel: 0.78,  dano: 9,  cd: 1.0, raio: 0.45, xp: 15, alcance: 0.8,  chefe: true, ataque: { tipo: 'mordida', status: [{ id: 'sangramento', chance: 0.25 }, { id: 'infectado', chance: 0.1 }] } },
  // A partir do nível 20 do herói:
  //   lobo: corre, e de 1,3 a 3,4 casas de distância SALTA no herói (a cada 4 s). O salto paralisa (atordoa)
  //         e tem 50% de chance de deixar sangrando (saltoStatus). A mordida normal é mais fraca.
  //   esticado: estica o braço e acerta de longe (até 2,8 casas), com 30% de chance de acertar (braco).
  lobo:      { nome: 'Lobo zumbi',   vida: 34,   vel: 1.25, dano: 7,  cd: 1.3, raio: 0.3,  xp: 3,  alcance: 0.6,  desdeNivel: 20,
               salto: { min: 1.3, max: 3.4, recarga: 4, duracao: 0.42, dano: 1.5 },
               saltoStatus: [{ id: 'atordoado', chance: 1, duracao: 1.1 }, { id: 'sangramento', chance: 0.5 }],
               ataque: { tipo: 'mordida', status: [{ id: 'sangramento', chance: 0.2 }] } },
  esticado:  { nome: 'Braço longo',  vida: 46,   vel: 0.46, dano: 8,  cd: 1.6, raio: 0.34, xp: 3,  alcance: 0.62, desdeNivel: 20,
               braco: { alcance: 2.8, chance: 0.3, recarga: 2.2 },
               ataque: { tipo: 'impacto', status: [{ id: 'lento', chance: 0.2 }] } }
};

// Personagens. Todos usam o mesmo corpo, muda roupa, armas e o jeito de lutar.
//   arma         arma de fogo inicial (ARMAS) ou null = luta só de perto
//   corpo        golpe de perto (CORPO)
//   estilo       'distancia' (atira e recua) ou 'perto' (vai pra cima)
//   pericias     perícia inicial em cada categoria (dano.js → PERICIAS; 2 = normal)
//   crescimento  quanto cada perícia sobe a cada nível do herói
//   attr         atributos iniciais (dano.js → ATRIBUTOS), ex.: defesa negativa = armadura baixa
//   porPericia   atributos que crescem junto com uma perícia: { pericia, attr, soma|mult (por ponto), desde }
//   passiva      habilidade especial (o jogo trata pelo id; texto aparece na tela)
export const CLASSES = {
  policial: {
    nome: 'Policial', emoji: '👮', roupa: 'policial', vida: 100, vel: 1.0,
    arma: 'pistola', corpo: 'empurrao', estilo: 'distancia',
    pericias: { armas_fogo: 4, impacto: 2, facas: 1, machados: 1, explosivos: 2, agilidade: 2 },
    crescimento: { armas_fogo: 1 },
    attr: { defesa: 0.05 },
    passiva: { id: 'tiro_certeiro', texto: 'tiro crítico marca o zumbi (+25% de dano nele)' },
    descricao: 'perito em armas de fogo · colete da polícia'
  },
  enfermeira: {
    nome: 'Enfermeira', emoji: '🩺', roupa: 'enfermeira', vida: 115, vel: 1.05,
    arma: null, corpo: 'faca', estilo: 'perto',
    pericias: { facas: 4, armas_fogo: 1, impacto: 1, machados: 1, explosivos: 1, agilidade: 3 },
    crescimento: { facas: 1, agilidade: 0.5 },
    attr: { defesa: -0.1, curaPorAcerto: 1, resInfeccao: 0.6 },
    porPericia: [{ pericia: 'facas', attr: 'curaPorAcerto', soma: 0.1, desde: 4 }],
    passiva: { id: 'cura_por_golpe', texto: 'cada golpe que acerta cura 1 de vida (sobe com a perícia)' },
    descricao: 'perita em facas · armadura baixa · resiste a infecção'
  },
  bombeiro: {
    nome: 'Bombeira', emoji: '🧑‍🚒', roupa: 'bombeiro', vida: 160, vel: 0.95,
    arma: null, corpo: 'machado', estilo: 'perto',
    pericias: { machados: 4, impacto: 3, armas_fogo: 1, facas: 1, explosivos: 2, agilidade: 1 },
    crescimento: { machados: 0.7, impacto: 0.5 },
    attr: { defesa: 0.1, resFogo: 0.5, resExplosao: 0.3 },
    passiva: { id: 'instinto', texto: 'com pouca vida, ativa o instinto de sobrevivência', limite: 0.3, recarga: 35 },
    descricao: 'perita em machado · muito resistente · aguenta fogo'
  },
  entregador: {
    nome: 'Entregador', emoji: '🛵', roupa: 'entregador', vida: 105, vel: 1.22,
    arma: 'pistola', corpo: 'empurrao', estilo: 'distancia',
    pericias: { agilidade: 4, armas_fogo: 2, impacto: 2, facas: 2, machados: 1, explosivos: 1 },
    crescimento: { agilidade: 1, armas_fogo: 0.5 },
    attr: { esquiva: 0.16 },
    passiva: { id: 'esquiva', texto: 'desvia de ataques (a esquiva sobe com a agilidade)' },
    descricao: 'perito em agilidade · rápido e escorregadio'
  },
  mecanico: {
    nome: 'Mecânico', emoji: '🔧', roupa: 'mecanico', vida: 100, vel: 0.98,
    arma: 'escopeta', municao: 8, corpo: 'chave', estilo: 'distancia',
    pericias: { impacto: 4, explosivos: 3, armas_fogo: 2, facas: 1, machados: 2, agilidade: 1 },
    crescimento: { impacto: 0.6, explosivos: 0.5 },
    attr: { defesa: 0, resExplosao: 0.5 },
    passiva: { id: 'pancada', texto: 'a chave inglesa atordoa e quebra a armadura dos zumbis' },
    descricao: 'perito em pancada e explosivos · aguenta explosões'
  }
};

// Armas de fogo. cd = segundos entre tiros. alcance em casas. quarteiroes = quantos quarteirões a arma lendária dura.
// tipo = tipo de dano (dano.js → TIPOS_DANO). categoria = perícia que melhora a arma (dano.js → PERICIAS).
// status = efeitos que o tiro pode causar: { id (status.js), chance, duracao?, pilhas? }
export const ARMAS = {
  pistola:     { nome: 'Pistola',       emoji: '🔫', dano: 14, cd: 0.42, alcance: 6.5, balas: 1, espalha: 0.05, tipo: 'perfuracao', categoria: 'armas_fogo' },
  escopeta:    { nome: 'Escopeta',      emoji: '💥', dano: 10, cd: 0.8,  alcance: 4.6, balas: 6, espalha: 0.45, municao: 30, tipo: 'perfuracao', categoria: 'armas_fogo', status: [{ id: 'atordoado', chance: 0.08, duracao: 0.5 }] },
  metralhadora:{ nome: 'Metralhadora',  emoji: '🔥', dano: 11, cd: 0.085, alcance: 7, balas: 1, espalha: 0.09, quarteiroes: 3, lendaria: true, tipo: 'perfuracao', categoria: 'armas_fogo' },
  lanca:       { nome: 'Lança-chamas',  emoji: '🔥', dps: 75,  alcance: 3.3, cone: 0.5, quarteiroes: 3, lendaria: true, chama: true, tipo: 'fogo', categoria: 'explosivos', status: [{ id: 'queimando', chance: 1 }] }
};

// Ataques de perto. alcance = distância do golpe (casas). arco = abertura do golpe (radianos; maior pega mais zumbis).
// golpes = quantos golpes até quebrar (só armas achadas).
export const CORPO = {
  empurrao: { nome: 'Empurrão',        emoji: '✋', dano: 8,  cd: 0.7,  empurra: 0.7, alcance: 1.05, arco: 1.1, tipo: 'impacto', categoria: 'impacto', status: [{ id: 'atordoado', chance: 0.1, duracao: 0.5 }] },
  taco:     { nome: 'Taco com pregos', emoji: '🏏', dano: 40, cd: 0.55, empurra: 0.9, alcance: 1.1,  arco: 1.2, tipo: 'impacto', categoria: 'impacto', golpes: 60, status: [{ id: 'atordoado', chance: 0.25, duracao: 0.6 }, { id: 'sangramento', chance: 0.15 }] },
  faca:     { nome: 'Facas',           emoji: '🔪', dano: 15, cd: 0.32, empurra: 0.3, alcance: 1.05, arco: 1.1, tipo: 'corte',   categoria: 'facas', status: [{ id: 'sangramento', chance: 0.45 }] },
  machado:  { nome: 'Machado',         emoji: '🪓', dano: 32, cd: 0.85, empurra: 1.0, alcance: 1.3,  arco: 1.35, tipo: 'corte',   categoria: 'machados', status: [{ id: 'quebrado', chance: 0.35 }, { id: 'sangramento', chance: 0.25 }] },
  chave:    { nome: 'Chave inglesa',   emoji: '🔧', dano: 14, cd: 0.7, empurra: 0.8, alcance: 1.05, arco: 1.1, tipo: 'impacto', categoria: 'impacto', status: [{ id: 'atordoado', chance: 0.14, duracao: 0.5 }, { id: 'quebrado', chance: 0.2 }] }
};
for (const c of Object.values(CORPO)) c.corpo = true;

// O que o herói ganha ao subir de nível é escolhido pelo chat: ver habilidades.js

// XP para passar do nível n para o n+1: cada nível pede mais que o anterior
// (nível 1→2: 8 · 5→6: 31 · 10→11: 80 · 20→21: 245 · 30→31: 500). Zumbi dá mais XP quanto maior a ameaça.
// Vida máxima por nível do herói: +10% da vida do personagem a cada nível até o 20 (nível 10 = +90%,
// nível 20 = +190%) e +3% por nível depois. Subir de nível não cura (a vida atual fica como estava).
export const VIDA_POR_NIVEL = 0.1, VIDA_POR_NIVEL_DEPOIS_DO_20 = 0.03;
export const multVidaNivel = n => 1 + VIDA_POR_NIVEL * Math.min(n - 1, 19) + VIDA_POR_NIVEL_DEPOIS_DO_20 * Math.max(0, n - 20);

export const xpParaNivel = n => Math.round(5 + n * 3 + n * n * 0.45);
