// ============================================================================
//  CABO DE GUERRA — o top ajudante contra o top atrapalhante (quem mais deu moedas de cada lado na live).
//  A barra fica dividida pela parte de cada um; quem está na frente muda o jogo:
//    - atrapalhante na frente: nascem um pouco mais de zumbis na rua e eles ficam um pouco mais fortes
//    - ajudante na frente: o herói fica com sorte e acha suprimentos nos cadáveres dos zumbis
//  O efeito cresce com a vantagem: perto do empate não faz nada; com um lado bem na frente, vale tudo.
// ============================================================================
export const CABO = {
  suave: 5,          // moedas "de mentira" somadas dos dois lados: 1 moeda sozinha não vira 100% (puxa devagar)
  empate: 0.1,       // vantagem abaixo disso (55% x 45%) não faz nada
  spawnMax: 0.15,    // atrapalhante bem na frente: até +15% de zumbis na rua
  forcaMax: 0.12,    // ... e até +12% de vida e dano nos zumbis
  sorteMax: 0.06,    // ajudante bem na frente: até 6% de chance de um zumbi deixar um suprimento
  suprimentos: [['cura_pequena', 4], ['municao', 3.5], ['kit', 2.5]]   // o que sai do cadáver (peso)
};

// rank = { ajuda: [{ nick, avatar, coins }, ...], atrapalha: [...] } (o primeiro de cada lista é o top)
export function caboDeGuerra(rank) {
  const a = rank?.ajuda?.[0] || null, b = rank?.atrapalha?.[0] || null;
  const ca = a?.coins || 0, cb = b?.coins || 0;
  const pct = (ca + CABO.suave) / (ca + cb + 2 * CABO.suave);   // parte do ajudante (0 a 1)
  const vant = Math.abs(pct - 0.5) * 2;
  const forca = Math.max(0, Math.min(1, (vant - CABO.empate) / (1 - CABO.empate)));
  const lado = forca > 0 ? (pct > 0.5 ? 'ajuda' : 'atrapalha') : null;
  // segundo e terceiro de cada lado (aparecem embaixo do top, com medalha de prata e de bronze)
  const resto = l => (l || []).slice(1, 3);
  return { ajuda: a, atrapalha: b, pct, lado, forca, ajudaResto: resto(rank?.ajuda), atrapalhaResto: resto(rank?.atrapalha) };
}

// Multiplicadores que o jogo usa (1 = sem efeito)
export const multSpawnCabo = c => (c?.lado === 'atrapalha' ? 1 + CABO.spawnMax * c.forca : 1);
export const multForcaCabo = c => (c?.lado === 'atrapalha' ? 1 + CABO.forcaMax * c.forca : 1);
export const sorteCabo = c => (c?.lado === 'ajuda' ? CABO.sorteMax * c.forca : 0);
