// ============================================================================
//  PASSIVAS — melhoram os atributos do herói (os do gráfico do G: força, crítico, ataque, velocidade, defesa,
//  esquiva, vida, regeneração) e outros (área, recarga, experiência...). Vão até o nível 3.
//
//  Cada uma tem:
//    nome, emoji, cat ('ofensiva' | 'defensiva' | 'controle')
//    par     a habilidade que, junto com ela, vira a HABILIDADE SUPREMA (hab-supremas.js)
//    classe  só aparece pra esse personagem (passiva ÚNICA)
//    mods    [{ attr, tipo: 'mult' | 'soma', base }]: no nível n vale base × FORCA_PASSIVA(n)
//            (mult: 1 + base × força; soma: base × força). Nível 1 = 1×, 2 = 2,2×, 3 = 4×.
//  Quando vira suprema, a passiva sai do slot mas o bônus FICA (a suprema leva ele junto).
// ============================================================================
import { FORCA_PASSIVA, f1, pct } from './hab-base.js';

export const MAX_NIVEL_PASSIVA = 3;

// texto: (v1, v2...) → frase, com os valores de cada mod no nível n
function passiva(nome, emoji, cat, par, mods, texto, extra = {}) {
  return {
    nome, emoji, cat, par, max: MAX_NIVEL_PASSIVA, ...extra,
    mods: n => mods.map(m => (m.tipo === 'mult' ? { attr: m.attr, mult: 1 + m.base * FORCA_PASSIVA(n) } : { attr: m.attr, soma: m.base * FORCA_PASSIVA(n) })),
    valores: n => mods.map(m => m.base * FORCA_PASSIVA(n)),
    desc(n) { return texto(...this.valores(n)); }
  };
}
const M = (attr, base) => ({ attr, tipo: 'mult', base });
const S = (attr, base) => ({ attr, tipo: 'soma', base });

export const PASSIVAS = {
  /* =================== GERAIS =================== */
  forca:      passiva('Força', '💪', 'ofensiva', 'granada', [M('dano', 0.12)], v => `+${pct(v)} de dano em tudo`),
  mira:       passiva('Olho de águia', '🎯', 'ofensiva', 'raio', [S('critChance', 0.06)], v => `+${pct(v)} de chance de crítico`),
  vampiro:    passiva('Vampirismo', '🦇', 'defensiva', 'laminas', [S('curaPorAcerto', 0.6)], v => `cada golpe de perto cura ${f1(v)}`),
  regen:      passiva('Regeneração', '💚', 'defensiva', 'molotov', [S('regen', 0.6)], v => `recupera ${f1(v)} de vida por segundo`),
  maos:       passiva('Mãos rápidas', '🔁', 'ofensiva', 'drone', [M('cadencia', 0.12)], v => `ataca ${pct(v)} mais rápido`),
  couro:      passiva('Couro grosso', '🛡️', 'defensiva', 'onda', [S('defesa', 0.05)], v => `+${pct(v)} de defesa`),
  reflexos:   passiva('Reflexos', '💨', 'defensiva', 'gelo', [S('esquiva', 0.04)], v => `${pct(v)} de chance de desviar`),
  vitalidade: passiva('Vitalidade', '❤️', 'defensiva', 'escudo', [M('vidaMax', 0.2)], v => `+${pct(v)} de vida máxima`),
  // Anti-explosão: a que salva do nível 20 em diante, quando chegam os inchados instáveis (ameaca.js → EXPLOSAO).
  // Por isso, a partir do nível SALVA_DESDE ela é sempre a carta C (até o herói ter), aparece mais pra
  // aprimorar e a IA prefere ela. Antes disso é rara. (resistência a explosão tem teto de 80%: o nível 3 chega lá)
  explosao:   passiva('Anti-explosão', '🧯', 'defensiva', 'minas', [S('resExplosao', 0.2)], v => `${pct(v)} menos dano de explosão (salva dos inchados do nível 20)`),
  pernas:     passiva('Pernas rápidas', '👟', 'controle', 'bumerangue', [M('velocidade', 0.06)], v => `+${pct(v)} de velocidade`),
  sabedoria:  passiva('Estudioso', '📚', 'controle', 'pulso', [M('xpGanho', 0.12)], v => `+${pct(v)} de experiência`),
  recarga:    passiva('Mente afiada', '⏱️', 'controle', 'grito', [M('recarga', -0.06)], v => `as habilidades recarregam ${pct(-v)} mais rápido`),

  /* =================== ÚNICAS DE CADA PERSONAGEM =================== */
  municao:       passiva('Munição perfurante', '🧨', 'ofensiva', 'rajada', [S('critMult', 0.25), S('critChance', 0.02)], (a, b) => `crítico +${pct(a)} mais forte e +${pct(b)} de chance`, { classe: 'policial' }),
  colete_tatico: passiva('Colete tático', '🦺', 'defensiva', 'algemas', [S('defesa', 0.04), S('resMordida', 0.05)], (a, b) => `+${pct(a)} de defesa e ${pct(b)} menos dano de mordida`, { classe: 'policial' }),
  anatomia:      passiva('Anatomia', '🧠', 'ofensiva', 'bisturi', [S('critChance', 0.04), S('chanceStatus', 0.05)], (a, b) => `+${pct(a)} de crítico e +${pct(b)} de chance de sangrar e atordoar`, { classe: 'enfermeira' }),
  plantao:       passiva('Plantão', '🩹', 'defensiva', 'seringa', [M('cura', 0.15), S('regen', 0.3)], (a, b) => `curas ${pct(a)} mais fortes e ${f1(b)} de vida por segundo`, { classe: 'enfermeira' }),
  epi:           passiva('Equipamento de proteção', '🥽', 'defensiva', 'brasa', [S('resFogo', 0.1), S('resExplosao', 0.08), S('defesa', 0.03)], (a, b, c) => `${pct(a)} menos fogo, ${pct(b)} menos explosão e +${pct(c)} de defesa`, { classe: 'bombeiro' }),
  musculos:      passiva('Músculos de aço', '💢', 'ofensiva', 'mangueira', [M('corpo', 0.15), M('vidaMax', 0.08)], (a, b) => `golpe de perto ${pct(a)} mais forte e +${pct(b)} de vida`, { classe: 'bombeiro' }),
  gorjeta:       passiva('Gorjeta', '💰', 'controle', 'pacote', [M('xpGanho', 0.1), M('ima', 0.25)], (a, b) => `+${pct(a)} de experiência e pega itens ${pct(b)} mais longe`, { classe: 'entregador' }),
  aerodinamica:  passiva('Aerodinâmica', '🪽', 'defensiva', 'turbo', [M('velocidade', 0.05), S('esquiva', 0.03)], (a, b) => `+${pct(a)} de velocidade e +${pct(b)} de esquiva`, { classe: 'entregador' }),
  engenharia:    passiva('Engenharia', '⚙️', 'controle', 'torreta', [M('area', 0.08), M('recarga', -0.03)], (a, b) => `habilidades com ${pct(a)} mais área e recarga ${pct(-b)} mais rápida`, { classe: 'mecanico' }),
  blindagem:     passiva('Blindagem', '🔩', 'defensiva', 'eletroima', [S('defesa', 0.04), M('vidaMax', 0.1)], (a, b) => `+${pct(a)} de defesa e +${pct(b)} de vida`, { classe: 'mecanico' })
};
