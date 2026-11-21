// ============================================================================
//  PERIGOS DO AMBIENTE — coisas no chão que machucam ou atrasam quem passa.
//
//  Valem para o herói E para os zumbis (zumbi que passa pelo fogo também queima).
//  Cada perigo é uma "zona" (retângulo no mapa): { tipo, x0, y0, x1, y1 }.
//  As zonas vêm da cidade (city.js: trechos de rua e áreas verdes, conforme o bairro),
//  dos prédios (room.js) e de coisas que acontecem no jogo (explosão deixa fogo, presente de vidro...).
//
//  Campos de cada perigo:
//    golpe       dano ao entrar e de novo a cada "intervalo" segundos enquanto estiver dentro
//    dps         dano contínuo por segundo enquanto estiver dentro
//    tipoDano    tipo do dano (dano.js → TIPOS_DANO)
//    status      efeitos que o golpe pode causar: [{ id (status.js), chance, duracao?, pilhas? }]
//    lentidao    multiplica a velocidade de quem está dentro (1 = normal)
//    piscando    só machuca parte do tempo (fios elétricos: liga e desliga)
//    apagaFogo   tira o status "queimando" de quem entra
//    luz         ilumina à noite
//    noHeroi     multiplica o dano no HERÓI (golpe, dps e o sangramento que o perigo causa). Zumbi leva o dano cheio.
//                vidro: 1/6 · fogo: 1/4 (o "queimando" no herói já é 4× menor: status.js → multNoHeroi)
// ============================================================================

export const AMBIENTE = {
  vidro:   { nome: 'Cacos de vidro', emoji: '🔸', golpe: 3, intervalo: 1.2, tipoDano: 'corte', status: [{ id: 'sangramento', chance: 0.7 }], lentidao: 0.75, noHeroi: 1 / 6 },
  arame:   { nome: 'Arame farpado', emoji: '➰', golpe: 5, intervalo: 1.0, tipoDano: 'corte', status: [{ id: 'sangramento', chance: 0.9 }], lentidao: 0.45 },
  fogo:    { nome: 'Fogo', emoji: '🔥', dps: 6, tipoDano: 'fogo', status: [{ id: 'queimando', chance: 1 }], lentidao: 0.9, luz: true, noHeroi: 0.25 },
  acido:   { nome: 'Ácido', emoji: '🧪', dps: 4, tipoDano: 'quimico', status: [{ id: 'infectado', chance: 0.25 }, { id: 'quebrado', chance: 0.5 }], lentidao: 0.7, intervalo: 1 },
  lama:    { nome: 'Lama', emoji: '🟫', lentidao: 0.5 },
  agua:    { nome: 'Água', emoji: '💧', lentidao: 0.4, apagaFogo: true },
  fios:    { nome: 'Fios elétricos', emoji: '⚡', golpe: 9, intervalo: 1.5, tipoDano: 'eletrico', status: [{ id: 'atordoado', chance: 0.6, duracao: 0.6 }], lentidao: 0.85, piscando: true, luz: true },
  entulho: { nome: 'Entulho', emoji: '🧱', lentidao: 0.6 },
  buraco:  { nome: 'Buraco', emoji: '🕳️', golpe: 4, intervalo: 1.6, tipoDano: 'impacto', status: [{ id: 'lento', chance: 0.5 }], lentidao: 0.55 }
};

// Perigos que machucam (o herói tenta desviar deles primeiro)
export const machuca = tipo => { const A = AMBIENTE[tipo]; return !!(A && (A.golpe || A.dps)); };

// Fios elétricos ligam e desligam: ligado 60% do tempo, em ciclos de 2,5 s (cada zona no seu ritmo)
export const ligado = (z, t) => !AMBIENTE[z.tipo].piscando || ((t + (z.semente || 0) % 7) % 2.5) < 1.5;

export const dentro = (z, x, y, margem = 0) => x >= z.x0 - margem && x <= z.x1 + margem && y >= z.y0 - margem && y <= z.y1 + margem;

// O que as zonas fazem com uma entidade (herói ou zumbi) neste pedaço de tempo.
//   e   entidade com x, y (o módulo guarda em e.zt o tempo até o próximo golpe de cada zona)
//   t   tempo do jogo (pra saber se os fios estão ligados)
// Devolve { lentidao, danos: [{ valor, tipo, zona }], status: [{ id, duracao, pilhas, zona }], apagaFogo, entrou: [zonas] }
export function efeitoDoAmbiente(e, zonas, dt, t, rng) {
  const r = { lentidao: 1, danos: [], status: [], apagaFogo: false, entrou: [] };
  if (!zonas.length) return r;
  if (!e.zt) e.zt = new Map();
  for (const z of zonas) {
    const A = AMBIENTE[z.tipo];
    if (!A) continue;
    if (!dentro(z, e.x, e.y)) { if (e.zt.size) e.zt.delete(z); continue; }
    if (A.lentidao && A.lentidao < r.lentidao) r.lentidao = A.lentidao;
    if (A.apagaFogo) r.apagaFogo = true;
    if (!ligado(z, t)) continue;
    if (A.dps) r.danos.push({ valor: A.dps * dt * (z.mult || 1), tipo: A.tipoDano, zona: z });   // mult: fogo do molotov fica mais forte por nível
    const primeiraVez = !e.zt.has(z);
    let prox = primeiraVez ? 0 : e.zt.get(z) - dt;
    if (primeiraVez) r.entrou.push(z);
    if (prox <= 0 && (A.golpe || A.status)) {
      if (A.golpe) r.danos.push({ valor: A.golpe, tipo: A.tipoDano, zona: z, golpe: true });
      for (const s of A.status || []) if (!rng || rng.next() < s.chance) r.status.push({ id: s.id, duracao: s.duracao, pilhas: s.pilhas, zona: z });
      prox = A.intervalo || 1;
    }
    e.zt.set(z, prox);
  }
  return r;
}

// Faixa da rua pra desviar de perigos: dado o meio da rua e a direção, testa deslocamentos pro lado
// e devolve o primeiro que não passa por nenhum perigo nos próximos "olhar" metros (ou 0 se não tem saída).
export function faixaLivre(x, y, dx, dy, zonas, olhar = 3.5, opcoes = [0, -1.4, 1.4, -2, 2]) {
  const perigosas = zonas.filter(z => machuca(z.tipo) || AMBIENTE[z.tipo].lentidao < 0.7);
  if (!perigosas.length) return 0;
  const px = -dy, py = dx;
  for (const lado of opcoes) {
    let livre = true;
    for (let a = 0; a <= olhar && livre; a += 0.5) {
      const qx = x + dx * a + px * lado, qy = y + dy * a + py * lado;
      for (const z of perigosas) if (dentro(z, qx, qy, 0.3)) { livre = false; break; }
    }
    if (livre) return lado;
  }
  return 0;
}
