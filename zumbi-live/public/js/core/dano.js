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
  defesa:     { base: 0,    min: -0.5, max: 0.75, nome: 'defesa' },    // fração do dano recebido que é ignorada (negativo = toma mais dano)
  regen:      { base: 0,    min: 0,    nome: 'regeneração' },          // vida por segundo
  critChance: { base: 0.05, min: 0, max: 1, nome: 'chance de crítico' },
  critMult:   { base: 1.8,  min: 1,    nome: 'dano crítico' },
  alcance:    { base: 1,    min: 0.5, max: 2, nome: 'alcance' },       // multiplica o alcance das armas
  cura:       { base: 1,    min: 0,    nome: 'cura recebida' },        // multiplica toda cura
  esquiva:    { base: 0,    min: 0, max: 0.6, nome: 'esquiva' },        // chance de desviar de um ataque
  curaPorAcerto: { base: 0, min: 0,    nome: 'cura por acerto' },      // vida que volta a cada golpe corpo a corpo que acerta
  chanceStatus:  { base: 0, min: 0, max: 1, nome: 'chance de efeito' }, // soma na chance de causar sangramento, atordoar...
  // Resistência do herói por tipo de dano (fração ignorada)
  resMordida:   { base: 0, min: -0.5, max: 0.8, nome: 'resistência a mordida' },
  resImpacto:   { base: 0, min: -0.5, max: 0.8, nome: 'resistência a impacto' },
  resCorte:     { base: 0, min: -0.5, max: 0.8, nome: 'resistência a corte' },
  resFogo:      { base: 0, min: -0.5, max: 0.8, nome: 'resistência a fogo' },
  resExplosao:  { base: 0, min: -0.5, max: 0.8, nome: 'resistência a explosão' },
  resInfeccao:  { base: 0, min: 0, max: 1, nome: 'resistência a infecção' }   // chance de não pegar infecção
};

/* ---------------- Tipos de dano ---------------- */
export const TIPOS_DANO = {
  perfuracao:  { nome: 'perfuração', emoji: '🔫' },   // tiros
  corte:       { nome: 'corte', emoji: '🔪' },        // facas, machados, vidro
  impacto:     { nome: 'impacto', emoji: '🔨' },      // empurrão, taco, chave inglesa, pancada de chefão
  fogo:        { nome: 'fogo', emoji: '🔥' },
  explosao:    { nome: 'explosão', emoji: '💥' },
  mordida:     { nome: 'mordida', emoji: '🦷' },      // ataque dos zumbis
  sangramento: { nome: 'sangramento', emoji: '🩸' },  // ignora armadura e resistência
  infeccao:    { nome: 'infecção', emoji: '🦠' }      // ignora armadura e resistência
};
// Tipos que atravessam defesa e resistências (dano "por dentro")
const IGNORA_ARMADURA = new Set(['sangramento', 'infeccao']);
const RES_DO_HEROI = { mordida: 'resMordida', impacto: 'resImpacto', corte: 'resCorte', fogo: 'resFogo', explosao: 'resExplosao' };

// Afinidade de cada zumbi com cada tipo de dano: 1 = normal, maior = fraco contra (super efetivo), menor = resiste.
export const AFINIDADES = {
  comum:     {},
  gordo:     { impacto: 0.6, corte: 1.4, perfuracao: 0.85, fogo: 1.15 },
  corredor:  { impacto: 1.4, perfuracao: 1.15, corte: 1.1 },
  explosivo: { fogo: 2.0, perfuracao: 1.3, corte: 0.75, impacto: 0.8 },
  chefao:    { perfuracao: 0.7, impacto: 0.8, corte: 1.3, fogo: 1.2, explosao: 1.25 },
  rei:       { perfuracao: 0.75, explosao: 0.7, impacto: 0.7, corte: 1.25, fogo: 1.35 },
  exheroi:   { perfuracao: 0.9, corte: 1.1 }
};
export const SUPER_EFETIVO = 1.25, POUCO_EFETIVO = 0.8;
export const afinidade = (tipoZumbi, tipoDano) => (AFINIDADES[tipoZumbi] && AFINIDADES[tipoZumbi][tipoDano]) ?? 1;
export function efetividade(m) { return m >= SUPER_EFETIVO ? 'super' : m <= POUCO_EFETIVO ? 'fraco' : null; }

/* ---------------- Perícias ---------------- */
// Cada arma pertence a uma perícia. Quanto mais perícia, mais dano, mais rápido e mais chance de causar efeitos.
// O valor de cada perícia vem do personagem e sobe com o nível (dados.js → CLASSES).
export const PERICIAS = {
  armas_fogo: { nome: 'Armas de fogo', emoji: '🔫' },
  facas:      { nome: 'Facas', emoji: '🔪' },
  machados:   { nome: 'Machados', emoji: '🪓' },
  impacto:    { nome: 'Pancada', emoji: '🔨' },
  explosivos: { nome: 'Fogo e explosivos', emoji: '💥' },
  agilidade:  { nome: 'Agilidade', emoji: '💨' }
};
export const PERICIA_PADRAO = 2;   // quem não tem a perícia definida usa isto (2 = sem bônus nem penalidade)
export const EFEITO_PERICIA = {
  dano: 0.07,          // +7% de dano por ponto (perícia 0 = -14%, perícia 2 = normal, perícia 10 = +56%)
  cadencia: 0.03,      // +3% de velocidade de ataque por ponto acima de 2
  chanceStatus: 0.03,  // +3% de chance de causar o efeito da arma por ponto acima de 2
  critico: 0.01        // +1% de crítico por ponto acima de 2
};
export const periciaDe = (h, cat) => (h.pericias && h.pericias[cat] != null ? h.pericias[cat] : PERICIA_PADRAO);
export const multPericia = p => 1 + (p - PERICIA_PADRAO) * EFEITO_PERICIA.dano;
export const cadenciaPericia = p => Math.max(0.5, 1 + (p - PERICIA_PADRAO) * EFEITO_PERICIA.cadencia);

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
//   ataque: a arma ou golpe (dados.js → ARMAS / CORPO), com { dano, tipo, categoria, corpo }
//   opts.base: troca o dano da arma (ex.: dano por segundo × dt do lança-chamas)
//   opts.continuo: true = dano contínuo, sem crítico
// Conta, nesta ordem: atributo "dano" × "corpo" (se for corpo a corpo) × perícia × crítico
//   × afinidade do zumbi com o tipo de dano × (1 - resistência) × status de quem apanha (ex.: marcado)
// Devolve { dano, critico, mult (afinidade), efetividade: 'super' | 'fraco' | null }
export function danoDoHeroi(h, ataque, alvo, rng, opts = {}) {
  const base = opts.base ?? ataque.dano;
  const p = periciaDe(h, ataque.categoria);
  let d = base * h.attr.get('dano') * multPericia(p);
  if (ataque.corpo) d *= h.attr.get('corpo');
  let critico = false;
  const chanceCrit = h.attr.get('critChance') + Math.max(0, p - PERICIA_PADRAO) * EFEITO_PERICIA.critico;
  if (!opts.continuo && rng && rng.next() < chanceCrit) { d *= h.attr.get('critMult'); critico = true; }
  const m = alvo ? afinidade(alvo.tipo, ataque.tipo) : 1;
  d *= m * (1 - resistenciaDe(alvo)) * (alvo?.estados ? alvo.estados.danoRecebido() : 1);
  return { dano: Math.max(0, d), critico, mult: m, efetividade: efetividade(m) };
}

// Dano em zumbi que não vem do herói (explosões, fogo, aliados, status): afinidade, resistência e status contam.
export function danoNoZumbi(z, base, tipo) {
  if (IGNORA_ARMADURA.has(tipo)) return base;
  return Math.max(0, base * afinidade(z.tipo, tipo) * (1 - resistenciaDe(z)) * (z.estados ? z.estados.danoRecebido() : 1));
}

// Chance de a arma causar o efeito dela (sangramento, atordoar...): base da arma + perícia + atributo
export const chanceDoStatus = (h, ataque, base) =>
  Math.min(1, base + Math.max(0, periciaDe(h, ataque.categoria) - PERICIA_PADRAO) * EFEITO_PERICIA.chanceStatus + h.attr.get('chanceStatus'));

// Tempo entre um tiro e outro
export const intervaloTiro = (h, arma) => arma.cd / (h.attr.get('cadencia') * cadenciaPericia(periciaDe(h, arma.categoria)));
// Tempo entre golpes de corpo a corpo (a cadência ajuda pela metade; a perícia ajuda inteira)
export const intervaloCorpo = (h, corpo) => corpo.cd / ((1 + (h.attr.get('cadencia') - 1) * 0.5) * cadenciaPericia(periciaDe(h, corpo.categoria)));
// Alcance da arma
export const alcanceArma = (h, arma) => arma.alcance * h.attr.get('alcance');

// Velocidade de andar do herói (casas por segundo)
export function velocidadeHeroi(h, base, { lutando = false, noVidro = false } = {}) {
  return base * h.attr.get('velocidade') * (lutando ? 0.8 : 1) * (noVidro ? 0.6 : 1);
}

// Dano que o herói recebe.
// Ordem: invencível → esquiva (sorteio) → colete (segura o golpe inteiro) → defesa → resistência ao tipo.
// Sangramento e infecção vêm de dentro: ignoram esquiva, colete, defesa e resistência.
// Devolve { bloqueado: 'invencivel' | 'esquiva' | 'colete' | null, dano }
export function danoNoHeroi(h, bruto, tipo = 'mordida', rng = null) {
  if (h.invT > 0) return { bloqueado: 'invencivel', dano: 0 };
  if (IGNORA_ARMADURA.has(tipo)) return { bloqueado: null, dano: bruto };
  if (rng && rng.next() < h.attr.get('esquiva')) return { bloqueado: 'esquiva', dano: 0 };
  if (h.colete > 0) return { bloqueado: 'colete', dano: 0 };
  const res = RES_DO_HEROI[tipo] ? h.attr.get(RES_DO_HEROI[tipo]) : 0;
  return { bloqueado: null, dano: Math.max(0, bruto * (1 - h.attr.get('defesa')) * (1 - res)) };
}

// Quanto uma cura (em % da vida máxima) devolve de vida
export const valorCura = (h, pct) => h.attr.get('vidaMax') * pct / 100 * h.attr.get('cura');

// Torcida: cada pessoa diferente que comentou nos últimos segundos dá um pouco de força ao herói.
// É o jeito de o chat de graça ajudar (e de a live sem ninguém comentando ser mais curta).
export const TORCIDA = {
  janelaSegundos: 30,     // conta quem comentou nesse tempo
  maxPessoas: 10,         // acima disso não aumenta mais
  danoPorPessoa: 0.03,    // +3% de dano por pessoa (até +30%)
  regenPorPessoa: 0.12    // +0,12 de vida por segundo por pessoa (até +1,2/s)
};
export function aplicarTorcida(h, pessoas, T = TORCIDA) {
  const k = Math.min(T.maxPessoas, Math.max(0, pessoas));
  if (k === 0) { h.attr.removeMod('torcida_dano'); h.attr.removeMod('torcida_regen'); return 0; }
  h.attr.addMod({ id: 'torcida_dano', attr: 'dano', mult: 1 + k * T.danoPorPessoa, fonte: 'torcida' });
  h.attr.addMod({ id: 'torcida_regen', attr: 'regen', soma: k * T.regenPorPessoa, fonte: 'torcida' });
  return k;
}

/* ---------------- Zumbis ---------------- */
// Resistência = fração do dano recebido que o zumbi ignora (0 a 0,6).
// Status como "armadura quebrada" diminuem a resistência.
export const resistenciaDe = z => (z ? Math.max(0, Math.min(0.9, (z.resistencia || 0) + (z.estados ? z.estados.resistencia() : 0))) : 0);

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
