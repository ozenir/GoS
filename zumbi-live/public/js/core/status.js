// ============================================================================
//  STATUS — efeitos positivos e negativos que ficam um tempo no herói ou nos zumbis.
//
//  Cada status tem:
//    lado        'negativo' ou 'positivo'
//    duracao     segundos (aplicar de novo renova o tempo)
//    maxPilhas   quantas vezes acumula (ex.: sangramento até 5 pilhas = 5× o dano)
//    porSegundo  { dano, cura } por pilha, a cada segundo
//    tipoDano    tipo do dano por segundo (ver dano.js → TIPOS_DANO)
//    mods        modificadores de atributo enquanto durar (só no herói; ver dano.js)
//                { attr, mult } ou { attr, soma }
//    parado      true = não anda nem ataca (atordoado)
//    lentidao    multiplica a velocidade (zumbis e herói)
//    danoRecebido multiplica o dano que quem está com o status recebe
//    resistencia soma na resistência do zumbi (negativo = fica mais frágil)
//    so          'heroi' ou 'zumbi' quando só faz sentido num dos dois
//
//  Para criar um status novo: acrescente aqui e use g.aplicarStatus(alvo, 'id').
// ============================================================================

export const STATUS = {
  /* ------------- negativos ------------- */
  sangramento: { nome: 'Sangrando', emoji: '🩸', lado: 'negativo', duracao: 4, maxPilhas: 5, porSegundo: { dano: 3 }, tipoDano: 'sangramento' },
  queimando:   { nome: 'Queimando', emoji: '🔥', lado: 'negativo', duracao: 3, maxPilhas: 1, porSegundo: { dano: 10 }, tipoDano: 'fogo' },
  atordoado:   { nome: 'Atordoado', emoji: '💫', lado: 'negativo', duracao: 0.9, maxPilhas: 1, parado: true },
  lento:       { nome: 'Lento', emoji: '🐌', lado: 'negativo', duracao: 3, maxPilhas: 1, lentidao: 0.5 },
  marcado:     { nome: 'Marcado', emoji: '🎯', lado: 'negativo', duracao: 5, maxPilhas: 1, danoRecebido: 1.25, so: 'zumbi' },
  quebrado:    { nome: 'Armadura quebrada', emoji: '💔', lado: 'negativo', duracao: 5, maxPilhas: 1, resistencia: -0.2, so: 'zumbi' },
  infectado:   { nome: 'Infectado', emoji: '🦠', lado: 'negativo', duracao: 8, maxPilhas: 3, porSegundo: { dano: 1 }, tipoDano: 'infeccao', mods: [{ attr: 'cura', mult: 0.6 }], so: 'heroi' },

  /* ------------- positivos ------------- */
  acelerado:   { nome: 'Tiro rápido', emoji: '⚡', lado: 'positivo', duracao: 10, maxPilhas: 1, mods: [{ attr: 'cadencia', mult: 2 }], so: 'heroi' },
  regenerando: { nome: 'Regenerando', emoji: '💚', lado: 'positivo', duracao: 5, maxPilhas: 3, porSegundo: { cura: 3 }, so: 'heroi' },
  furia:       { nome: 'Fúria', emoji: '😤', lado: 'positivo', duracao: 6, maxPilhas: 1, mods: [{ attr: 'dano', mult: 1.3 }, { attr: 'velocidade', mult: 1.1 }], so: 'heroi' },
  instinto:    { nome: 'Instinto de sobrevivência', emoji: '🧡', lado: 'positivo', duracao: 6, maxPilhas: 1, porSegundo: { cura: 2.5 }, mods: [{ attr: 'defesa', soma: 0.25 }], so: 'heroi' },
  foco:        { nome: 'Foco', emoji: '👁️', lado: 'positivo', duracao: 6, maxPilhas: 1, mods: [{ attr: 'critChance', soma: 0.15 }], so: 'heroi' },
  blindado:    { nome: 'Blindado', emoji: '🛡️', lado: 'positivo', duracao: 4, maxPilhas: 1, mods: [{ attr: 'defesa', soma: 0.4 }], so: 'heroi' }
};

// Status ativos de uma entidade (herói ou zumbi)
export class Estados {
  constructor() { this.lista = new Map(); }   // id -> { id, t, pilhas, fonte }

  // opts: duracao (segundos; padrão do status), pilhas (quantas somar), acumulaTempo (soma em vez de renovar), maxDuracao
  // Devolve true se o status é novo.
  aplicar(id, opts = {}) {
    const S = STATUS[id];
    if (!S) throw new Error(`Status desconhecido: ${id}`);
    const dur = opts.duracao ?? S.duracao;
    const atual = this.lista.get(id);
    if (atual) {
      atual.t = opts.acumulaTempo ? Math.min(opts.maxDuracao ?? Infinity, atual.t + dur) : Math.max(atual.t, dur);
      atual.pilhas = Math.min(S.maxPilhas || 1, atual.pilhas + (opts.pilhas || 1));
      if (opts.fonte) atual.fonte = opts.fonte;
      return false;
    }
    this.lista.set(id, { id, t: dur, pilhas: Math.min(S.maxPilhas || 1, opts.pilhas || 1), fonte: opts.fonte || null });
    return true;
  }

  tem(id) { return this.lista.has(id); }
  pilhas(id) { return this.lista.get(id)?.pilhas || 0; }
  restante(id) { return this.lista.get(id)?.t || 0; }
  remover(id) { this.lista.delete(id); }
  limpar(lado = null) { for (const [id] of this.lista) if (!lado || STATUS[id].lado === lado) this.lista.delete(id); }

  // Passa o tempo. Devolve o que aconteceu neste pedaço de tempo:
  //   danos: [{ tipo, valor, fonte }]   curas: total   acabaram: [ids]
  update(dt) {
    const danos = [], acabaram = [];
    let cura = 0;
    for (const s of this.lista.values()) {
      const S = STATUS[s.id];
      const passo = Math.min(dt, s.t);
      if (S.porSegundo?.dano) danos.push({ tipo: S.tipoDano || 'sangramento', valor: S.porSegundo.dano * s.pilhas * passo, fonte: s.fonte, status: s.id });
      if (S.porSegundo?.cura) cura += S.porSegundo.cura * s.pilhas * passo;
      s.t -= dt;
      if (s.t <= 0) acabaram.push(s.id);
    }
    for (const id of acabaram) this.lista.delete(id);
    return { danos, cura, acabaram };
  }

  parado() { for (const s of this.lista.values()) if (STATUS[s.id].parado) return true; return false; }
  lentidao() { let m = 1; for (const s of this.lista.values()) if (STATUS[s.id].lentidao) m *= STATUS[s.id].lentidao; return m; }
  danoRecebido() { let m = 1; for (const s of this.lista.values()) if (STATUS[s.id].danoRecebido) m *= STATUS[s.id].danoRecebido; return m; }
  resistencia() { let r = 0; for (const s of this.lista.values()) r += STATUS[s.id].resistencia || 0; return r; }

  // Lista pra mostrar na tela
  ativos() { return [...this.lista.values()].map(s => ({ ...s, ...STATUS[s.id] })); }
}

// Mantém os modificadores de atributo (herói) iguais aos status ativos.
// Cada status com "mods" vira modificadores com id "st:<status>:<n>" em attr (dano.js → Atributos).
export function sincronizarAtributos(estados, attr) {
  for (const [id, S] of Object.entries(STATUS)) {
    if (!S.mods) continue;
    const ativo = estados.tem(id);
    S.mods.forEach((m, n) => {
      const mid = `st:${id}:${n}`;
      if (ativo) { if (!attr.tem(mid)) attr.addMod({ id: mid, attr: m.attr, mult: m.mult ?? 1, soma: m.soma ?? 0, fonte: S.nome }); }
      else if (attr.tem(mid)) attr.removeMod(mid);
    });
  }
}
