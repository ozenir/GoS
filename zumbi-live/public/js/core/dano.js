// ============================================================================
//  DANO E ATRIBUTOS — todas as contas de combate do jogo ficam aqui.
//
//  Regra de ouro: nenhum outro arquivo calcula dano, vida, cadência ou
//  velocidade "na mão". Eles pedem para este módulo. Assim, quando entrar um
//  atributo novo (buff de presente, item, melhoria de nível...), basta criar
//  um MODIFICADOR e tudo no jogo passa a respeitar.
//
//  Como funciona um atributo:
//      valor final = (base + soma de todos os "soma") × produto de todos os "mult"
//      depois é limitado pelo mínimo e máximo do atributo.
//
//  Exemplo de buff de 10 segundos que dobra o dano:
//      h.attr.addMod({ id: 'furia', attr: 'dano', mult: 2, segundos: 10, fonte: 'presente' })
//  Exemplo de melhoria permanente de nível:
//      h.attr.addMod({ attr: 'vidaMax', soma: 15, fonte: 'nível 3' })
// ============================================================================

/* ---------------- Atributos do herói ---------------- */
export const ATRIBUTOS = {
  vidaMax:    { base: 100,  min: 1,    nome: 'vida máxima' },
  dano:       { base: 1,    min: 0.1,  nome: 'dano' },                 // multiplica todo dano que o herói causa
  corpo:      { base: 1,    min: 0.1,  nome: 'dano corpo a corpo' },   // multiplica só o corpo a corpo (além de "dano")
  cadencia:   { base: 1,    min: 0.2, max: 6, nome: 'cadência' },      // maior = atira mais rápido
  velocidade: { base: 1,    min: 0.2, max: 3, nome: 'velocidade' },
  defesa:     { base: 0,    min: 0, max: 0.75, nome: 'defesa' },       // fração do dano recebido que é ignorada (máx. 75%)
  regen:      { base: 0,    min: 0,    nome: 'regeneração' },          // vida por segundo
  critChance: { base: 0.05, min: 0, max: 1, nome: 'chance de crítico' },
  critMult:   { base: 1.8,  min: 1,    nome: 'dano crítico' },
  alcance:    { base: 1,    min: 0.5, max: 2, nome: 'alcance' },       // multiplica o alcance das armas
  cura:       { base: 1,    min: 0,    nome: 'cura recebida' }         // multiplica toda cura
};

let proxMod = 1;

export class Atributos {
  // base: valores iniciais (o que faltar vem de ATRIBUTOS). ctx: objeto passado às condições (o herói).
  constructor(base = {}, ctx = null) {
    this.base = {};
    for (const [k, a] of Object.entries(ATRIBUTOS)) this.base[k] = base[k] ?? a.base;
    this.mods = [];
    this.ctx = ctx;
  }

  // Adiciona um modificador. Campos:
  //   attr      atributo afetado (obrigatório)
  //   soma      valor somado à base (padrão 0)
  //   mult      multiplicador (padrão 1)
  //   segundos  duração; sem isso é permanente
  //   id        nome do modificador; outro com o mesmo id substitui este (ou soma o tempo, com acumula)
  //   acumula   true: se já existe, soma o tempo em vez de reiniciar. maxSegundos limita o total
  //   cond      função (ctx) => true/false; o modificador só vale quando der true
  //   fonte     texto livre pra saber de onde veio (nível, presente, item...)
  addMod(m) {
    if (!ATRIBUTOS[m.attr]) throw new Error(`Atributo desconhecido: ${m.attr}`);
    const mod = { soma: 0, mult: 1, segundos: null, fonte: '', ...m, id: m.id || `mod${proxMod++}` };
    const i = this.mods.findIndex(x => x.id === mod.id);
    if (i >= 0) {
      const velho = this.mods[i];
      if (mod.acumula && velho.segundos != null && mod.segundos != null) {
        mod.segundos = Math.min(mod.maxSegundos ?? Infinity, velho.segundos + mod.segundos);
      }
      this.mods[i] = mod;
    } else this.mods.push(mod);
    return mod.id;
  }

  removeMod(id) { this.mods = this.mods.filter(m => m.id !== id); }
  tem(id) { return this.mods.some(m => m.id === id); }
  restante(id) { const m = this.mods.find(x => x.id === id); return m && m.segundos != null ? Math.max(0, m.segundos) : 0; }

  get(attr) {
    const def = ATRIBUTOS[attr];
    let soma = this.base[attr], mult = 1;
    for (const m of this.mods) {
      if (m.attr !== attr) continue;
      if (m.cond && !m.cond(this.ctx)) continue;
      soma += m.soma;
      mult *= m.mult;
    }
    let v = soma * mult;
    if (def.min != null && v < def.min) v = def.min;
    if (def.max != null && v > def.max) v = def.max;
    return v;
  }

  // Passa o tempo dos modificadores temporários. Devolve os que acabaram (pra avisar na tela).
  update(dt) {
    const acabaram = [];
    for (const m of this.mods) if (m.segundos != null) { m.segundos -= dt; if (m.segundos <= 0) acabaram.push(m); }
    if (acabaram.length) this.mods = this.mods.filter(m => m.segundos == null || m.segundos > 0);
    return acabaram;
  }
}

/* ---------------- Herói ---------------- */
// Cria os atributos de um herói novo a partir da classe (dados.js → CLASSES)
export function atributosDaClasse(C, heroi) {
  const a = new Atributos({
    vidaMax: C.vida,
    velocidade: C.vel || 1,
    cadencia: C.cdArma ? 1 / C.cdArma : 1,
    regen: C.regen || 0
  }, heroi);
  // Adrenalina: com menos de 25% de vida, +25% de dano
  a.addMod({ id: 'adrenalina', attr: 'dano', mult: 1.25, cond: h => h.vida / h.vidaMax < 0.25, fonte: 'adrenalina' });
  return a;
}

// Dano que o herói causa num zumbi.
//   tipo: 'tiro' | 'corpo' | 'chama' (contínuo, sem crítico) | 'explosao'
//   base: dano da arma (dados.js), ou dano por segundo × dt no caso da chama
export function danoDoHeroi(h, base, tipo, alvo, rng) {
  let d = base * h.attr.get('dano');
  if (tipo === 'corpo') d *= h.attr.get('corpo');
  let critico = false;
  if (tipo !== 'chama' && rng && rng.next() < h.attr.get('critChance')) { d *= h.attr.get('critMult'); critico = true; }
  d *= 1 - resistenciaDe(alvo);
  return { dano: d, critico };
}

// Tempo entre um tiro e outro
export const intervaloTiro = (h, arma) => arma.cd / h.attr.get('cadencia');
// Tempo entre golpes de corpo a corpo (a cadência ajuda pela metade)
export const intervaloCorpo = (h, corpo) => corpo.cd / (1 + (h.attr.get('cadencia') - 1) * 0.5);
// Alcance da arma
export const alcanceArma = (h, arma) => arma.alcance * h.attr.get('alcance');

// Velocidade de andar do herói (casas por segundo)
export function velocidadeHeroi(h, base, { lutando = false, noVidro = false } = {}) {
  return base * h.attr.get('velocidade') * (lutando ? 0.8 : 1) * (noVidro ? 0.6 : 1);
}

// Dano que o herói recebe. Ordem: invencível → colete (segura o golpe inteiro) → defesa.
// Devolve { bloqueado: 'invencivel' | 'colete' | null, dano }
export function danoNoHeroi(h, bruto) {
  if (h.invT > 0) return { bloqueado: 'invencivel', dano: 0 };
  if (h.colete > 0) return { bloqueado: 'colete', dano: 0 };
  return { bloqueado: null, dano: Math.max(0, bruto * (1 - h.attr.get('defesa'))) };
}

// Quanto uma cura (em % da vida máxima) devolve de vida
export const valorCura = (h, pct) => h.attr.get('vidaMax') * pct / 100 * h.attr.get('cura');

/* ---------------- Zumbis ---------------- */
// Resistência = fração do dano recebido que o zumbi ignora (0 a 0,6).
export const resistenciaDe = z => (z && z.resistencia) || 0;

// Números de um zumbi novo. T = tabela do tipo (dados.js → ZUMBIS). ameaca = nível de ameaça (1, 2, 3...).
// Quanto o zumbi fica mais forte a cada nível de ameaça (quando a ameaça sobe: ameaca.js).
export const ESCALA_AMEACA = {
  vida: 0.22,           // +22% de vida por nível acima de 1
  dano: 0.12,           // +12% de dano por nível
  vel: 0.025,           // +2,5% de velocidade por nível...
  velMax: 0.35,         // ...até no máximo +35%
  resistencia: 0.025,   // +2,5% de resistência (dano ignorado) por nível...
  resistenciaMax: 0.4   // ...até no máximo 40%
};
export function statsZumbi(T, ameaca, vidaMult = 1) {
  const n = Math.max(0, ameaca - 1);
  const E = ESCALA_AMEACA;
  const vida = T.vida * (1 + n * E.vida) * vidaMult;
  return {
    vida, vidaMax: vida,
    dano: T.dano * (1 + n * E.dano),
    vel: T.vel * (1 + Math.min(E.velMax, n * E.vel)),
    resistencia: Math.min(E.resistenciaMax, (T.resistencia || 0) + n * E.resistencia)
  };
}

// Dano do ataque de um zumbi (já vem escalado do statsZumbi)
export const danoDoZumbi = z => z.dano;

// Fogo do lança-chamas: dano por segundo enquanto o zumbi queima
export const FOGO_DPS = 10;

/* ---------------- Explosões ---------------- */
// Dano no ponto de distância d de uma explosão de raio r: cai até a metade na borda.
export const danoExplosao = (base, d, r) => (d >= r ? 0 : base * (1 - d / r * 0.5));

/* ---------------- Aliados ---------------- */
// Aliados acompanham a ameaça pela metade, pra continuarem úteis no fim da partida.
export const ALIADOS = { cachorro: { dano: 22, cd: 0.55 }, sobrevivente: { dano: 12, cd: 0.55 } };
export const danoAliado = (tipo, ameaca) => ALIADOS[tipo].dano * (1 + Math.max(0, ameaca - 1) * 0.3);
