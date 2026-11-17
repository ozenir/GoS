// Empacota o player (React + Remotion Player + composição) para o navegador.
import { build } from "esbuild";

await build({
  entryPoints: ["painel/player-entry.tsx"],
  bundle: true,
  outdir: "painel/dist",
  format: "iife",
  jsx: "automatic",
  minify: true,
  loader: { ".woff": "file", ".woff2": "file" },
  publicPath: "/dist",
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});
console.log("player empacotado em painel/dist/");

// Versão para o Artifact (claude.ai): sem arquivos de fonte (vêm do Google Fonts)
await build({
  entryPoints: { player: "painel/player-entry-artifact.tsx" },
  bundle: true,
  outdir: "artifact",
  format: "iife",
  jsx: "automatic",
  minify: true,
  define: { "process.env.NODE_ENV": '"production"' },
  logLevel: "warning",
});
console.log("player do Artifact em artifact/player.js");
