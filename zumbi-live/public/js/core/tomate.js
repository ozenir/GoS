// ============================================================================
//  FÍSICA DO TOMATE NO VIDRO — usada pela tela suja (view/sujeira.js).
//
//  O tomate esmagado é polpa: um fluido de BINGHAM (não escorre até a força passar de um limite, a
//  "tensão de escoamento"; depois escorre como um fluido viscoso). Grudado num vidro vertical, quem puxa é
//  o próprio peso e quem segura é esse "atrito" da camada de polpa contra o vidro:
//
//    tensão na parede     τ = m · g / A                (peso dividido pela área de contato)
//    se τ ≤ τy            fica parado                  (τy = tensão de escoamento)
//    senão                v = (τ − τy) · h / η         (h = espessura da camada, η = viscosidade plástica)
//
//  A inércia é desprezível: o tempo pra chegar nessa velocidade é m·h/(η·A) ≈ 0,004 s, então a velocidade
//  acompanha a massa na hora. Enquanto escorrega, deixa um RASTRO fino no vidro (perde massa), fica mais
//  leve e vai mais devagar. O vidro não é uniforme (sujeiraVidro): em alguns pontos segura mais, e ele
//  escorrega aos trancos.
//
//  Os FILETES de caldo (suco, quase água) escorrem como um filme num plano vertical (Nusselt):
//    u = ρ · g · h² / (3 · μ)
//  e vão perdendo volume no caminho (deixam um filme), até parar.
//
//  Valores de medidas reais (referências de reologia de purê/polpa de tomate e de suco):
//    tensão de escoamento do purê 10–30 Pa · viscosidade plástica 1–5 Pa·s · suco 0,02–0,05 Pa·s · densidade ≈ água
// ============================================================================

export const FISICA = {
  g: 9.81,                 // m/s²
  massa: 0.10,             // kg: tomate médio (~100 g)
  ficaNoVidro: 0.6,        // 60% da massa gruda; o resto cai na hora (pedaços e respingos)
  diametro: 0.10,          // m: diâmetro da parte grudada (~10 cm)
  tensaoEscoamento: 20,    // Pa: τy da polpa
  viscosidade: 1.5,        // Pa·s: η da polpa
  camada: 0.0015,          // m: espessura da camada que escorrega (~1,5 mm)
  rastro: 0.00015,         // m: espessura do rastro que fica no vidro (~0,15 mm)
  densidade: 1000,         // kg/m³
  grudado: [1.5, 3],       // s: tempo grudado antes de começar a escorregar (o caldo ainda está molhando o vidro)
  sujeiraVidro: 0.25,      // ±25% no τy conforme o ponto do vidro (escorrega aos trancos)
  pxPorMetro: 600          // escala da tela: os 216 x 384 pixels do jogo são um vidro de 36 x 64 cm
};

// Caldo (suco) dos filetes
export const CALDO = {
  viscosidade: 0.03,             // Pa·s: suco de tomate
  espessura: [0.0004, 0.0009],   // m: espessura do filete na frente (0,4 a 0,9 mm)
  volume: [5e-8, 5e-7],          // m³: volume de cada filete (0,05 a 0,5 mL)
  filme: 0.00005                 // m: filme que o filete deixa pra trás (0,05 mm)
};

export const areaTomate = (F = FISICA) => Math.PI * (F.diametro / 2) ** 2;

// Velocidade (m/s) com que o tomate escorrega com essa massa (kg). atrito multiplica o τy (ponto do vidro).
export function velocidadeTomate(massa, F = FISICA, atrito = 1) {
  const tau = massa * F.g / areaTomate(F), ty = F.tensaoEscoamento * atrito;
  return tau <= ty ? 0 : (tau - ty) * F.camada / F.viscosidade;
}

// Massa (kg) que fica no vidro por metro escorregado: densidade × largura × espessura do rastro
export const perdaPorMetro = (F = FISICA) => F.densidade * F.diametro * F.rastro;

// Velocidade (m/s) da frente de um filete com espessura h (m)
export const velocidadeFilete = (h, F = FISICA, C = CALDO) => F.densidade * F.g * h * h / (3 * C.viscosidade);

// Até onde (m) um filete de volume V (m³) e largura w (m) consegue descer antes de virar só filme
export const alcanceFilete = (V, w, C = CALDO) => V / (w * C.filme);

// Comprimento (m) do filete depois de t segundos. A frente vai afinando enquanto deixa filme
// (h cai com a raiz do que falta), então u = u0 · (1 − L/Lmax) e L(t) = Lmax · (1 − e^(−u0·t/Lmax)).
export const comprimentoFilete = (t, u0, Lmax) => Lmax * (1 - Math.exp(-u0 * t / Lmax));

// Simula o tomate escorregando (pra teste e pra ter uma ideia do tempo): devolve { tempo, massaFinal }
// pra descer `altura` metros, com passo dt. atritoEm(y) dá o multiplicador do τy em cada altura.
export function simularEscorrego(altura, F = FISICA, dt = 1 / 60, atritoEm = () => 1) {
  let m = F.massa * F.ficaNoVidro, y = 0, t = 0;
  while (y < altura && t < 600) {
    const v = velocidadeTomate(m, F, atritoEm(y));
    if (v === 0) return { tempo: Infinity, massaFinal: m, parou: y };
    y += v * dt; m -= perdaPorMetro(F) * v * dt; t += dt;
  }
  return { tempo: t, massaFinal: m };
}
