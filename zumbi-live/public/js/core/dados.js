// Tabelas do jogo: tipos de zumbi, classes de herói, armas e melhorias de nível.
// Mexa aqui pra mudar números (vida, dano, velocidade...). Velocidade em casas por segundo.

export const ZUMBIS = {
  comum:     { nome: 'Zumbi',        vida: 30,   vel: 0.75, dano: 6,  cd: 1.0, raio: 0.32, xp: 1,  alcance: 0.62 },
  gordo:     { nome: 'Zumbi gordo',  vida: 55,   vel: 0.58, dano: 8,  cd: 1.2, raio: 0.4,  xp: 2,  alcance: 0.66 },
  corredor:  { nome: 'Corredor',     vida: 20,   vel: 1.9,  dano: 4,  cd: 0.7, raio: 0.28, xp: 1,  alcance: 0.6 },
  explosivo: { nome: 'Explosivo',    vida: 40,   vel: 0.72, dano: 0,  cd: 1.0, raio: 0.42, xp: 3,  alcance: 0.9 },
  chefao:    { nome: 'Chefão',       vida: 480,  vel: 0.72, dano: 11, cd: 1.3, raio: 0.6,  xp: 25, alcance: 1.05, chefe: true },
  rei:       { nome: 'Rei Zumbi',    vida: 1400, vel: 0.62, dano: 16, cd: 1.5, raio: 0.85, xp: 60, alcance: 1.35, chefe: true },
  exheroi:   { nome: 'Ex-herói',     vida: 300,  vel: 1.0,  dano: 9,  cd: 1.0, raio: 0.45, xp: 15, alcance: 0.8, chefe: true }
};

// Classes de herói. Todas usam o mesmo corpo, muda roupa e o jeito de jogar.
export const CLASSES = {
  policial:   { nome: 'Policial',   emoji: '👮', vida: 100, vel: 1.0,  arma: 'pistola', cdArma: 0.75, regen: 0,   roupa: 'policial' },
  bombeiro:   { nome: 'Bombeira',   emoji: '🧑‍🚒', vida: 130, vel: 0.95, arma: 'pistola', corpo: 'taco', roupa: 'bombeiro' },
  entregador: { nome: 'Entregador', emoji: '🛵', vida: 95,  vel: 1.22, arma: 'pistola', roupa: 'entregador' },
  enfermeira: { nome: 'Enfermeira', emoji: '🩺', vida: 100, vel: 1.0,  arma: 'pistola', regen: 0.7, roupa: 'enfermeira' },
  mecanico:   { nome: 'Mecânico',   emoji: '🔧', vida: 110, vel: 0.98, arma: 'escopeta', municao: 14, roupa: 'mecanico' }
};

// Armas de fogo. cd = segundos entre tiros. alcance em casas.
export const ARMAS = {
  pistola:     { nome: 'Pistola',       emoji: '🔫', dano: 14, cd: 0.42, alcance: 6.5, balas: 1, espalha: 0.05 },
  escopeta:    { nome: 'Escopeta',      emoji: '💥', dano: 10, cd: 0.8,  alcance: 4.6, balas: 6, espalha: 0.45, municao: 30 },
  metralhadora:{ nome: 'Metralhadora',  emoji: '🔥', dano: 11, cd: 0.085, alcance: 7, balas: 1, espalha: 0.09, tempo: 45, lendaria: true },
  lanca:       { nome: 'Lança-chamas',  emoji: '🔥', dps: 75,  alcance: 3.3, cone: 0.5, tempo: 45, lendaria: true, chama: true }
};

// Ataque de perto (automático quando um zumbi encosta)
export const CORPO = {
  empurrao: { nome: 'Empurrão', dano: 8,  cd: 0.7,  empurra: 0.7 },
  taco:     { nome: 'Taco com pregos', emoji: '🏏', dano: 40, cd: 0.55, empurra: 0.9, golpes: 60 }
};

// Melhorias ao subir de nível. "mod" é um modificador de atributo (ver dano.js); "cura" devolve vida na hora.
export const MELHORIAS = [
  { id: 'dano', texto: '+15% de dano', mod: { attr: 'dano', mult: 1.15 } },
  { id: 'cadencia', texto: 'atira 10% mais rápido', mod: { attr: 'cadencia', mult: 1.1 } },
  { id: 'vida', texto: '+15 de vida máxima', mod: { attr: 'vidaMax', soma: 15 }, cura: 15 },
  { id: 'vel', texto: '+8% de velocidade', mod: { attr: 'velocidade', mult: 1.08 } }
];

// XP para passar do nível n para o n+1
export const xpParaNivel = n => 8 + n * 6;
