// Fontes gratuitas (SIL OFL). No render/painel local vêm do Fontsource
// (src/fontes-css.ts); no Artifact vêm do Google Fonts.

export const FONTES = [
  { id: "Montserrat", nome: "Montserrat Black", peso: 900 },
  { id: "Anton", nome: "Anton", peso: 400 },
  { id: "Bebas Neue", nome: "Bebas Neue", peso: 400 },
  { id: "Bangers", nome: "Bangers (quadrinho)", peso: 400 },
  { id: "Luckiest Guy", nome: "Luckiest Guy (divertida)", peso: 400 },
] as const;

export const pesoDaFonte = (id: string) =>
  FONTES.find((f) => f.id === id)?.peso ?? 900;
