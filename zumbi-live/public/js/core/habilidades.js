// ============================================================================
//  HABILIDADES (estilo Vampire Survivors) — a cada nível, o chat escolhe 1 de 3 cartas (A, B ou C).
//
//  O herói tem 5 SLOTS de habilidade (esquerda do núcleo) e 5 de PASSIVA (direita). Cheios, só dá pra
//  aprimorar o que já tem. Pra liberar vaga, precisa fazer uma HABILIDADE SUPREMA:
//    habilidade no nível 5 + a passiva par dela no nível 3 = carta SUPREMA (16 níveis de escolha no total:
//    5 da habilidade, 3 da passiva e os outros que o chat gasta no caminho). A suprema tira as duas dos
//    slots (o bônus da passiva fica) e vai pro NÚCLEO. Com 6 supremas no núcleo, vem a escolha NÍVEL DEUS.
//
//  O que existe (cada personagem tem as gerais + as únicas dele):
//    hab-ativas.js    12 habilidades gerais + 2 únicas de cada personagem (ofensivas, defensivas, de controle)
//    hab-passivas.js  12 passivas gerais + 2 únicas de cada personagem (mexem nos atributos do gráfico do G)
//    hab-supremas.js  12 supremas gerais + 2 de cada personagem, 3 poderes nível deus gerais + 1 de cada personagem
//    hab-base.js      as peças (explosões, ondas, projéteis, minas, torretas...)
//
//  Tipos de carta:
//    ativa    habilidade nova ou nível a mais (até 5)          passiva  passiva nova ou nível a mais (até 3)
//    suprema  junta habilidade 5 + passiva 3 (sempre a carta A quando dá)
//    deus     a escolha especial depois da 6ª suprema (as 3 cartas são poderes nível deus)
//    treino   +1 de perícia no ataque principal                arma     escopeta ou taco de vez
//    extra    quando não tem mais nada pra oferecer: kit de cura, fúria ou barricada
//  As 3 cartas tentam ser: A = aprimorar (ou a suprema pronta), B = habilidade nova, C = passiva nova.
// ============================================================================
import { ARMAS, CORPO, CLASSES } from './dados.js';
import { aplicarPericias, PERICIAS } from './dano.js';
import { multRunaDano } from './recompensas.js';
import { girarAngulo, atualizarObjetos, posDrone, FORCA } from './hab-base.js';
import { ATIVAS } from './hab-ativas.js';
import { PASSIVAS, MAX_NIVEL_PASSIVA } from './hab-passivas.js';
import { SUPREMAS, DEUSES, AVIAO } from './hab-supremas.js';

export { ATIVAS, PASSIVAS, SUPREMAS, DEUSES, AVIAO, posDrone, FORCA, MAX_NIVEL_PASSIVA };

export const MAX_ATIVAS = 5;     // slots de habilidade (esquerda do núcleo)
export const MAX_PASSIVAS = 5;   // slots de passiva (direita do núcleo)
export const MAX_SUPREMAS = 6;   // cabem no núcleo; com 6, vem o nível deus
export const NIVEL_SUPREMA_ATIVA = 5, NIVEL_SUPREMA_PASSIVA = 3;   // a receita
// Cada suprema a mais deixa TODAS mais fortes (+12% cada), e o nível deus dá mais +50%
export const NUCLEO = { porSuprema: 0.12, deus: 0.5 };
// SINERGIA: a habilidade já fica mais forte com a passiva par dela (+15% de dano por nível da passiva, até +45%),
// antes mesmo de virar suprema. Ensina a receita e segura o meio do jogo.
export const SINERGIA = 0.15;
export const sinergia = (h, id) => 1 + SINERGIA * Math.min(NIVEL_SUPREMA_PASSIVA, h.passivas?.[ATIVAS[id].par] || 0);
export const TREINO_MAX = 5;

// Nível do herói em que a Anti-explosão vira prioridade (um antes dos inchados instáveis, ameaca.js → EXPLOSAO)
export const SALVA_DESDE = 19;
const salva = (h, id) => id === 'explosao' && h.nivel >= SALVA_DESDE;

/* ---------------- Receitas ---------------- */
// Suprema de cada habilidade (e de cada passiva)
export const SUPREMA_DA_ATIVA = Object.fromEntries(Object.entries(SUPREMAS).map(([id, S]) => [S.ativa, id]));
export const SUPREMA_DA_PASSIVA = Object.fromEntries(Object.entries(SUPREMAS).map(([id, S]) => [S.passiva, id]));
// Disponível pra esse personagem? (gerais pra todos; únicas só pro dono)
export const daClasse = (X, classe) => !X.classe || X.classe === classe;
// Todas as receitas desse personagem: [{ id, S }], as gerais primeiro
export const receitas = classe => Object.entries(SUPREMAS).filter(([, S]) => daClasse(S, classe)).map(([id, S]) => ({ id, S }));

/* ---------------- Estado do herói ---------------- */
const lista = h => h.supremas || [];
export const passivasFundidas = h => new Set(lista(h).map(id => SUPREMAS[id].passiva));
export const ativasFundidas = h => new Set(lista(h).map(id => SUPREMAS[id].ativa));
export const ativasLivres = h => Object.keys(h.habs || {});                                   // as dos slots da esquerda
export const passivasLivres = h => { const f = passivasFundidas(h); return Object.keys(h.passivas || {}).filter(id => !f.has(id)); };
export const vagasOcupadas = h => ativasLivres(h).length;
export const vagasPassivas = h => passivasLivres(h).length;
export const multSuprema = h => 1 + NUCLEO.porSuprema * Math.max(0, lista(h).length - 1) + (h.deus ? NUCLEO.deus : 0);
export const deusPendente = h => lista(h).length >= MAX_SUPREMAS && !h.deus;

// Supremas que o herói já pode fazer: habilidade no nível 5 e a passiva par no nível 3 (núcleo com vaga)
export function supremasProntas(h) {
  if (lista(h).length >= MAX_SUPREMAS) return [];
  return Object.entries(SUPREMAS).filter(([id, S]) => daClasse(S, h.classe) && !lista(h).includes(id)
    && (h.habs?.[S.ativa] || 0) >= NIVEL_SUPREMA_ATIVA && (h.passivas?.[S.passiva] || 0) >= NIVEL_SUPREMA_PASSIVA).map(([id]) => id);
}

/* ---------------- Cartas ---------------- */
const parDa = id => ATIVAS[id] ? PASSIVAS[ATIVAS[id].par] : ATIVAS[PASSIVAS[id].par];
function cartaAtiva(id, n) {
  const A = ATIVAS[id], P = PASSIVAS[A.par];
  return { tipo: 'ativa', id, nivel: n, nome: A.nome, emoji: A.emoji, desc: A.desc(n), papel: A.cat, unica: !!A.classe, par: `${P.emoji} ${P.nome}` };
}
function cartaPassiva(id, n) {
  const P = PASSIVAS[id], A = ATIVAS[P.par];
  return { tipo: 'passiva', id, nivel: n, nome: P.nome, emoji: P.emoji, desc: P.desc(n), papel: P.cat, unica: !!P.classe, par: `${A.emoji} ${A.nome}`, sinergia: Math.round(SINERGIA * Math.min(NIVEL_SUPREMA_PASSIVA, n) * 100) };
}
function cartaSuprema(id) {
  const S = SUPREMAS[id], A = ATIVAS[S.ativa], P = PASSIVAS[S.passiva];
  return { tipo: 'suprema', id, nivel: 1, nome: S.nome, emoji: S.emoji, de: `${A.emoji}+${P.emoji}`, desc: S.desc(), receita: `${A.nome} + ${P.nome}`, papel: S.cat, unica: !!S.classe, cat: 'suprema' };
}
function cartaDeus(id) {
  const D = DEUSES[id];
  return { tipo: 'deus', id, nivel: 1, nome: D.nome, emoji: D.emoji, desc: D.desc(), papel: D.cat, unica: !!D.classe, cat: 'deus' };
}
const EXTRAS = {
  kit: { nome: 'Kit de primeiros socorros', emoji: '🍗', desc: 'cura 35% da vida agora' },
  adrenalina: { nome: 'Fúria do sobrevivente', emoji: '🔥', desc: 'fúria e foco pelos próximos 2 quarteirões' },
  barricada: { nome: 'Barricada', emoji: '🧱', desc: 'blindado (+40% de defesa) pelos próximos 2 quarteirões' }
};
const cartaExtra = id => ({ tipo: 'extra', id, nivel: 1, nome: EXTRAS[id].nome, emoji: EXTRAS[id].emoji, desc: EXTRAS[id].desc, cat: 'aprimorar' });

// Habilidades e passivas que esse personagem pode pegar agora (não tem e não fundiu)
const ativasNovas = h => Object.keys(ATIVAS).filter(id => daClasse(ATIVAS[id], h.classe) && !h.habs?.[id] && !ativasFundidas(h).has(id));
const passivasNovas = h => Object.keys(PASSIVAS).filter(id => daClasse(PASSIVAS[id], h.classe) && !h.passivas?.[id]);

// Passiva que sai quando outra precisa entrar e os slots estão cheios: a que não combina com nenhuma habilidade
// que o herói tem (e, entre essas, a de menor nível). Se todas combinam, nenhuma sai.
function passivaPraTrocar(h, protegida = null) {
  const util = new Set(Object.keys(h.habs || {}).map(id => ATIVAS[id].par));
  const lista = passivasLivres(h).filter(id => id !== protegida && !util.has(id) && !salva(h, id));
  return lista.sort((a, b) => h.passivas[a] - h.passivas[b])[0] || null;
}

// Quanto falta pra receita da habilidade (ou da passiva) virar suprema: 0 = nada feito, 1 = pronta.
// A carta A puxa mais a receita mais adiantada, pra primeira suprema não demorar (todas sobem juntas senão).
export function progressoReceita(h, id) {
  const A = ATIVAS[id] ? id : PASSIVAS[id]?.par, P = ATIVAS[id] ? ATIVAS[id].par : id;
  if (!A || !daClasse(SUPREMAS[SUPREMA_DA_ATIVA[A]], h.classe)) return 0;
  return (Math.min(NIVEL_SUPREMA_ATIVA, h.habs?.[A] || 0) + Math.min(NIVEL_SUPREMA_PASSIVA, h.passivas?.[P] || 0)) / (NIVEL_SUPREMA_ATIVA + NIVEL_SUPREMA_PASSIVA);
}

// As 3 cartas do nível. [A aprimorar ou suprema, B habilidade nova, C passiva nova]; falta uma categoria, completa.
export function sortearCartas(h, rng) {
  const habs = h.habs || {}, pas = h.passivas || {}, fund = passivasFundidas(h);
  const aprimorar = [], nova = [], passiva = [];
  const foco = id => 1 + 3 * progressoReceita(h, id) ** 2;   // receita adiantada aparece bem mais
  for (const [id, n] of Object.entries(habs)) if (n < ATIVAS[id].max) {
    const temPar = (pas[ATIVAS[id].par] || 0) > 0;
    aprimorar.push({ ...cartaAtiva(id, n + 1), cat: 'aprimorar', peso: (temPar ? 1.6 : 1.2) * foco(id) });
  }
  for (const [id, n] of Object.entries(pas)) if (!fund.has(id) && n < PASSIVAS[id].max) {
    const temPar = !!habs[PASSIVAS[id].par];
    aprimorar.push({ ...cartaPassiva(id, n + 1), cat: 'aprimorar', peso: salva(h, id) ? 2.5 : temPar ? 1.4 * foco(id) : 0.7 });
  }
  if ((h.treino || 0) < TREINO_MAX) {
    const cat = categoriaPrincipal(h), P = PERICIAS[cat];
    aprimorar.push({ tipo: 'treino', id: cat, nivel: (h.treino || 0) + 1, nome: `Treino: ${P.nome}`, emoji: P.emoji, desc: '+1 de perícia no ataque principal (dano, cadência, crítico)', cat: 'aprimorar', peso: 0.7 });
  }
  if (vagasOcupadas(h) < MAX_ATIVAS) for (const id of ativasNovas(h)) {
    const temPar = (pas[ATIVAS[id].par] || 0) > 0 && !fund.has(ATIVAS[id].par);
    nova.push({ ...cartaAtiva(id, 1), cat: 'nova', peso: (ATIVAS[id].classe ? 1.5 : 1) * (temPar ? 2 : 1) });
  }
  for (const [id, A] of Object.entries(ARMAS_NOVAS)) if (A.pode(h)) nova.push({ tipo: 'arma', id, nivel: 1, nome: A.nome, emoji: A.emoji, desc: A.desc(), cat: 'nova', peso: 0.6 });
  if (vagasPassivas(h) < MAX_PASSIVAS) {
    for (const id of passivasNovas(h)) {
      const temPar = !!habs[PASSIVAS[id].par];
      passiva.push({ ...cartaPassiva(id, 1), cat: 'passiva', peso: id === 'explosao' && !salva(h, id) ? 0.5 : (PASSIVAS[id].classe ? 1.3 : 1) * (temPar ? 2.2 : 1) });
    }
  } else {
    // slots de passiva cheios: a passiva que falta pra uma habilidade virar suprema (ou a Anti-explosão, que salva)
    // entra no lugar de uma que não combina com nada
    const faltam = Object.entries(habs).filter(([id, n]) => n >= 2 && !pas[ATIVAS[id].par]).map(([id]) => ATIVAS[id].par).filter(id => passivasNovas(h).includes(id));
    if (!pas.explosao && salva(h, 'explosao')) faltam.unshift('explosao');
    for (const id of [...new Set(faltam)]) {
      const troca = passivaPraTrocar(h, id);
      if (troca) passiva.push({ ...cartaPassiva(id, 1), troca, desc: `${cartaPassiva(id, 1).desc} (sai ${PASSIVAS[troca].emoji} ${PASSIVAS[troca].nome})`, cat: 'passiva', peso: id === 'explosao' ? 3 : 1.5 });
    }
  }

  const tirar = l => {
    if (!l.length) return null;
    const i = rng.weighted(l.map((c, k) => [k, c.peso]));
    return l.splice(i, 1)[0];
  };
  // suprema pronta: sempre aparece, no lugar da carta A
  const prontas = supremasProntas(h);
  // do nível SALVA_DESDE em diante, a Anti-explosão é sempre a carta C até o herói ter ela
  const kSalva = passiva.findIndex(c => salva(h, c.id));
  const cartaC = kSalva >= 0 ? passiva.splice(kSalva, 1)[0] : tirar(passiva);
  const cartas = [prontas.length ? cartaSuprema(prontas[Math.floor(rng.next() * prontas.length)]) : tirar(aprimorar), tirar(nova), cartaC];
  const resto = [...aprimorar, ...nova, ...passiva];
  for (let k = 0; k < 3; k++) if (!cartas[k]) cartas[k] = tirar(resto);
  // não sobrou nada pra oferecer (tudo no máximo e sem vaga): kit de cura e fúria
  const extras = ['kit', 'adrenalina', 'barricada'];
  for (let k = 0; k < 3; k++) if (!cartas[k] && extras.length) cartas[k] = cartaExtra(extras.shift());
  return cartas.filter(Boolean).map((c, k) => ({ ...c, letra: 'ABC'[k] }));
}

// A escolha especial depois da 6ª suprema: 3 poderes nível deus. O do personagem aparece se ele fez pelo menos
// uma suprema única dele; senão, os 3 gerais.
export function cartasDeus(h, rng) {
  const gerais = Object.keys(DEUSES).filter(id => !DEUSES[id].classe);
  const proprio = Object.keys(DEUSES).find(id => DEUSES[id].classe === h.classe);
  const fezUnica = lista(h).some(id => SUPREMAS[id].classe === h.classe);
  let ids = gerais.slice();
  if (proprio && fezUnica) { ids.splice(Math.floor(rng.next() * ids.length), 1); ids.unshift(proprio); }
  return ids.slice(0, 3).map((id, k) => ({ ...cartaDeus(id), letra: 'ABC'[k] }));
}

// Escolha da IA quando ninguém vota: suprema sempre; monta as receitas (a passiva par da habilidade que tem,
// a habilidade que sobe pro 5); com pouca vida, prefere vida, defesa e regeneração.
export function escolhaDaIA(h, cartas, rng) {
  const vidaPct = h.vida / h.vidaMax;
  const nAtivas = vagasOcupadas(h);
  return rng.weighted(cartas.map(c => {
    let p = 1;
    if (c.tipo === 'suprema') p = 10;
    if (c.tipo === 'deus') p = c.unica ? 3 : c.papel === 'defensiva' && vidaPct < 0.5 ? 2 : 1;
    // aprimorar a receita mais adiantada vale mais (fecha a suprema antes)
    if (c.tipo === 'ativa') p = c.cat === 'nova' ? (nAtivas < 2 ? 2.2 : 1.1) : ((h.passivas?.[ATIVAS[c.id].par] || 0) > 0 ? 2.4 : 1.5) * (1 + 2 * progressoReceita(h, c.id));
    if (c.tipo === 'passiva') p = h.habs?.[PASSIVAS[c.id].par] ? 2.4 * (1 + 2 * progressoReceita(h, c.id)) : 1;
    if (c.tipo === 'arma') p = 1.3;
    if (c.tipo === 'treino') p = 0.9;
    if (c.tipo === 'extra') p = c.id === 'kit' && vidaPct < 0.6 ? 2 : 1;
    if (c.tipo === 'passiva' && vidaPct < 0.5 && PASSIVAS[c.id].cat === 'defensiva') p *= 1.5;
    if (c.tipo === 'passiva' && salva(h, c.id) && c.nivel <= 2) p = 4;   // do nível 19 em diante, a Anti-explosão salva
    return [c.letra, p];
  }));
}

/* ---------------- Aplicar a carta escolhida ---------------- */
// Bônus de atributo de uma passiva (fica mesmo depois de virar suprema)
function aplicarModsPassiva(g, id) {
  const h = g.hero, P = PASSIVAS[id], n = h.passivas[id];
  P.mods(n).forEach((m, k) => h.attr.addMod({ ...m, id: `pas:${id}:${k}`, fonte: P.nome }));
}
function removerModsPassiva(h, id) {
  for (let k = 0; k < 4; k++) h.attr.removeMod(`pas:${id}:${k}`);
}
// Bônus fixos das supremas e do nível deus
function aplicarModsFixos(g) {
  const h = g.hero;
  for (const id of lista(h)) for (const [k, m] of (SUPREMAS[id].mods || []).entries()) h.attr.addMod({ ...m, id: `sup:${id}:${k}`, fonte: SUPREMAS[id].nome });
  if (h.deus) for (const [k, m] of (DEUSES[h.deus].mods || []).entries()) h.attr.addMod({ ...m, id: `deus:${k}`, fonte: DEUSES[h.deus].nome });
}

export function aplicarCarta(g, carta) {
  const h = g.hero;
  h.habs = h.habs || {}; h.passivas = h.passivas || {}; h.supremas = h.supremas || []; h.supT = h.supT || {};
  const vidaAntes = h.attr.get('vidaMax');
  if (carta.tipo === 'ativa') {
    h.habs[carta.id] = carta.nivel;
    h.habT = h.habT || {};
    h.habT[carta.id] = Math.min(h.habT[carta.id] ?? 0.5, 0.5);   // já dispara logo
  } else if (carta.tipo === 'passiva') {
    const P = PASSIVAS[carta.id];
    // slots de passiva cheios: a carta diz qual passiva sai pra essa entrar
    if (carta.troca && h.passivas[carta.troca] && !passivasFundidas(h).has(carta.troca)) {
      const Q = PASSIVAS[carta.troca];
      delete h.passivas[carta.troca];
      removerModsPassiva(h, carta.troca);
      g.emit('aviso', { texto: `${Q.emoji} ${Q.nome} saiu pra ${P.emoji} ${P.nome} entrar`, tipo: 'info' });
    }
    h.passivas[carta.id] = carta.nivel;
    aplicarModsPassiva(g, carta.id);
  } else if (carta.tipo === 'treino') {
    h.treino = (h.treino || 0) + 1;
    h.pericias[carta.id] = (h.pericias[carta.id] ?? 2) + 1;
    aplicarPericias(h, CLASSES[h.classe]);
  } else if (carta.tipo === 'suprema') {
    const S = SUPREMAS[carta.id];
    if (h.supremas.includes(carta.id) || h.supremas.length >= MAX_SUPREMAS) return;
    // a habilidade sai do slot (a suprema roda no lugar dela); a passiva sai do slot, mas o bônus fica
    delete h.habs[S.ativa];
    h.supremas.push(carta.id);
    h.supT[carta.id] = 0.3;   // já dispara logo
    // tabela do T (fusoes.js): a suprema fica descoberta pra live toda
    if (g.fusoesDaLive && !g.fusoesDaLive.has(carta.id)) { g.fusoesDaLive.add(carta.id); g.emit('fusao_descoberta', { id: carta.id }); }
    g.emit('aviso', { texto: `🧬 SUPREMA! ${ATIVAS[S.ativa].emoji} + ${PASSIVAS[S.passiva].emoji} = ${S.emoji} ${S.nome.toUpperCase()}`, tipo: 'bom' });
    g.emit('suprema', { id: carta.id, nome: S.nome, emoji: S.emoji, total: h.supremas.length, max: MAX_SUPREMAS });
    if (h.supremas.length >= MAX_SUPREMAS) g.emit('nucleo_cheio', {});
  } else if (carta.tipo === 'deus') {
    const D = DEUSES[carta.id];
    h.deus = carta.id; h.deusT = 1;
    g.emit('deus', { id: carta.id, nome: D.nome, emoji: D.emoji });
  } else if (carta.tipo === 'arma') {
    if (carta.id === 'escopeta') { h.armaFixa = 'escopeta'; g.trocarArma('escopeta', null); }
    if (carta.id === 'taco') { h.corpoFixo = 'taco'; h.corpo = 'taco'; h.golpes = Infinity; }
  } else if (carta.tipo === 'extra') {
    if (carta.id === 'kit') g.curar(35, null, true);
    else if (carta.id === 'barricada') g.aplicarStatus(h, 'blindado', { quarteiroes: 2, acumula: true, maxQuarteiroes: 6 });
    else { g.aplicarStatus(h, 'furia', { quarteiroes: 2, acumula: true, maxQuarteiroes: 6 }); g.aplicarStatus(h, 'foco', { quarteiroes: 2, acumula: true, maxQuarteiroes: 6 }); }
  }
  aplicarModsFixos(g);
  g.sincronizarVida();
  // a vida máxima que subiu (Vitalidade, Égide...) vem cheia
  const ganhou = h.attr.get('vidaMax') - vidaAntes;
  if (ganhou > 0) h.vida = Math.min(h.vidaMax, h.vida + ganhou);
  g.aplicarRunas?.();   // runa de resistência cresce com o nível da habilidade em que está
}

/* ---------------- Rodar as habilidades ---------------- */
// Tempo entre usos, com a recarga do herói (Mente afiada, Engenharia...)
const recarga = h => h.attr.get('recarga');

export function atualizarHabilidades(g, dt) {
  const h = g.hero;
  atualizarObjetos(g, dt);
  h.habT = h.habT || {}; h.supT = h.supT || {};
  const sup = lista(h);
  if (h.habs?.laminas || sup.includes('vampiricas')) girarAngulo(h, dt);
  for (const [id, n] of Object.entries(h.habs || {})) {
    // runa de dano do colosso (recompensas.js) e sinergia com a passiva par: a habilidade bate mais forte
    const k = (h.runas?.[id]?.dano ? multRunaDano(h.runas[id], n) : 1) * sinergia(h, id);
    const A = k !== 1 ? comRuna(ATIVAS[id], k) : ATIVAS[id];
    if (A.sempre) A.sempre(g, h, n, dt);
    if (A.continua) { A.atualizar(g, h, n, dt); continue; }
    h.habT[id] = (h.habT[id] ?? 1) - dt;
    if (h.habT[id] > 0) continue;
    // usou: a recarga inteira (guardada pro anel do painel); sem alvo: tenta de novo logo (continua "pronta")
    h.habCd = h.habCd || {};
    if (A.usar(g, h, n)) h.habT[id] = h.habCd[id] = A.cd(n) * recarga(h);
    else { h.habT[id] = 0.4; h.habCd[id] = 0; }
  }
  if (!sup.length && !h.deus) return;
  const m = multSuprema(h);
  for (const id of sup) {
    const S = SUPREMAS[id];
    // runa de dano que estava na habilidade passa pra suprema dela
    const k = h.runas?.[S.ativa]?.dano ? multRunaDano(h.runas[S.ativa], 5) : 1;
    rodar(g, h, S, id, m * k, dt, h.supT);
  }
  if (h.deus) {
    const D = DEUSES[h.deus];
    h.deusSalvaT = Math.max(0, (h.deusSalvaT ?? 0) - dt);
    rodar(g, h, D, 'deus', m, dt, h.supT);
  }
}

function rodar(g, h, S, id, m, dt, timers) {
  if (S.sempre) S.sempre(g, h, m, dt);
  if (S.continua) { S.atualizar(g, h, m, dt); return; }
  if (S.usar) {
    timers[id] = (timers[id] ?? 1) - dt;
    h.supCd = h.supCd || {};
    if (timers[id] <= 0) { if (S.usar(g, h, m)) timers[id] = h.supCd[id] = S.cd * recarga(h); else { timers[id] = 0.5; h.supCd[id] = 0; } }
    return;
  }
  // só salva (Coração de ferro): o tempo de recarga corre aqui
  if (S.salvar) {
    timers[id] = Math.max(0, (timers[id] ?? 0) - dt);
    if (h.vida / h.vidaMax < 0.25) S.salvar(g, h, m);
  }
}

// A mesma habilidade, com o dano (e o fogo, o estouro do escudo) multiplicado por k
function comRuna(A, k) {
  const B = Object.create(A);
  if (A.dano) B.dano = n => A.dano(n) * k;
  if (A.fogo) B.fogo = n => A.fogo(n) * k;
  if (A.estouro) B.estouro = n => A.estouro(n) * k;
  return B;
}

// Golpe que ia derrubar o herói: suprema ou poder deus que salva (Coração de ferro, Égide, Anjo) segura
export function supremaSegura(g, h) {
  const m = multSuprema(h);
  for (const id of lista(h)) if (SUPREMAS[id].salvar?.(g, h, m)) return true;
  return !!(h.deus && DEUSES[h.deus].salvar?.(g, h, m));
}

// Um zumbi morreu: supremas que reagem (Transfusão)
export function aoMatarZumbi(g, z) {
  const h = g.hero;
  if (!h?.supremas?.length) return;
  const m = multSuprema(h);
  for (const id of h.supremas) SUPREMAS[id].aoMatar?.(g, h, z, m);
}

/* ---------------- Armas que viram de vez ---------------- */
export const ARMAS_NOVAS = {
  escopeta: { nome: 'Escopeta', emoji: '💥', desc: () => 'troca a pistola pela escopeta de vez (recarrega sozinha)', pode: h => h.arma === 'pistola' && !h.armaFixa },
  taco: { nome: 'Taco com pregos', emoji: '🏏', desc: () => 'golpe de perto forte que não quebra mais', pode: h => h.corpo === 'empurrao' && !h.corpoFixo }
};

// Categoria de perícia do ataque principal do herói
export function categoriaPrincipal(h) {
  return h.arma ? ARMAS[h.arma].categoria : CORPO[h.corpo].categoria;
}

/* ---------------- Pra mostrar na tela ---------------- */
// Lista do relatório: [{ emoji, nome, nivel, tipo }]
export function habilidadesDoHeroi(h) {
  const l = [];
  if (h.deus) l.push({ emoji: DEUSES[h.deus].emoji, nome: DEUSES[h.deus].nome, nivel: 'DEUS', tipo: 'deus' });
  for (const id of lista(h)) l.push({ emoji: SUPREMAS[id].emoji, nome: SUPREMAS[id].nome, nivel: '★', tipo: 'suprema' });
  for (const [id, n] of Object.entries(h.habs || {})) l.push({ emoji: ATIVAS[id].emoji, nome: ATIVAS[id].nome, nivel: n, tipo: 'ativa', pronta: (h.habT?.[id] ?? 0) <= 0.2 });
  for (const id of passivasLivres(h)) l.push({ emoji: PASSIVAS[id].emoji, nome: PASSIVAS[id].nome, nivel: h.passivas[id], tipo: 'passiva' });
  if (h.treino) l.push({ emoji: '🎓', nome: 'Treino', nivel: h.treino, tipo: 'passiva' });
  // runas do colosso: 🔮 + o que ela faz, no número a quantidade
  for (const [id, r] of Object.entries(h.runas || {})) {
    const hab = id === 'principal' ? 'ataque principal' : ATIVAS[id]?.nome;
    if (r.dano) l.push({ emoji: '🔮💥', nome: `Runa de dano: ${hab}`, nivel: r.dano, tipo: 'runa' });
    if (r.resistencia) l.push({ emoji: '🔮🛡️', nome: `Runa de resistência: ${hab}`, nivel: r.resistencia, tipo: 'runa' });
  }
  return l;
}

// Quanto cada habilidade (e suprema, e o poder deus) já recarregou: 0 = acabou de usar, 1 = pronta.
// As que ficam sempre ligadas (lâminas, aura...) e as que esperam alvo contam como prontas.
// Chaves: 'hab:<id>', 'sup:<id>', 'deus' (o painel desenha um anel em volta de cada uma)
const fracao = (resta, total) => (!(total > 0) || !(resta > 0) ? 1 : Math.max(0, Math.min(1, 1 - resta / total)));
export function recargasDoHeroi(h) {
  const r = {};
  for (const id of Object.keys(h.habs || {})) r['hab:' + id] = ATIVAS[id].continua ? 1 : fracao(h.habT?.[id], h.habCd?.[id]);
  const da = (S, id) => (S.continua ? 1 : S.usar ? fracao(h.supT?.[id], h.supCd?.[id]) : S.salvar ? fracao(id === 'deus' ? h.deusSalvaT : h.supT?.[id], S.cd) : 1);
  for (const id of lista(h)) r['sup:' + id] = da(SUPREMAS[id], id);
  if (h.deus) r.deus = da(DEUSES[h.deus], 'deus');
  return r;
}

// O painel do herói: fileira de habilidades (esquerda), o NÚCLEO com as supremas em volta e a fileira de passivas
// (direita), cada fileira com 5 slots
export function slotsDoHeroi(h) {
  const comRuna = id => !!(h.runas?.[id]?.dano || h.runas?.[id]?.resistencia);
  const ativas = ativasLivres(h).map(id => ({ id, emoji: ATIVAS[id].emoji, nome: ATIVAS[id].nome, nivel: h.habs[id], runa: comRuna(id), unica: !!ATIVAS[id].classe, max: h.habs[id] >= ATIVAS[id].max }));
  const passivas = passivasLivres(h).map(id => ({ id, emoji: PASSIVAS[id].emoji, nome: PASSIVAS[id].nome, nivel: h.passivas[id], unica: !!PASSIVAS[id].classe, max: h.passivas[id] >= PASSIVAS[id].max }));
  const supremas = lista(h).map(id => ({ id, emoji: SUPREMAS[id].emoji, nome: SUPREMAS[id].nome, unica: !!SUPREMAS[id].classe }));
  return {
    ativas, passivas, supremas, maxAtivas: MAX_ATIVAS, maxPassivas: MAX_PASSIVAS,
    nucleo: { total: MAX_SUPREMAS, feitas: supremas.length, deus: h.deus ? { emoji: DEUSES[h.deus].emoji, nome: DEUSES[h.deus].nome } : null, prontas: supremasProntas(h).length }
  };
}
