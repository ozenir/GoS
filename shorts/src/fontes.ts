// Fontes gratuitas (Fontsource / SIL OFL), empacotadas junto com o projeto.
import "@fontsource/anton";
import "@fontsource/bebas-neue";
import "@fontsource/montserrat/900.css";
import "@fontsource/bangers";
import "@fontsource/luckiest-guy";

export const FONTES = [
  { id: "Montserrat", nome: "Montserrat Black", peso: 900 },
  { id: "Anton", nome: "Anton", peso: 400 },
  { id: "Bebas Neue", nome: "Bebas Neue", peso: 400 },
  { id: "Bangers", nome: "Bangers (quadrinho)", peso: 400 },
  { id: "Luckiest Guy", nome: "Luckiest Guy (divertida)", peso: 400 },
] as const;

export const pesoDaFonte = (id: string) =>
  FONTES.find((f) => f.id === id)?.peso ?? 900;
