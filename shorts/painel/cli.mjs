// Ferramenta de linha de comando para o Claude operar o painel sem o navegador.
//   node painel/cli.mjs listar
//   node painel/cli.mjs ver <id>                    (briefing + status)
//   node painel/cli.mjs otimizado <id> <arquivo.json>  (grava o roteiro otimizado)
import { readFileSync } from "node:fs";
import * as P from "./projetos.mjs";

const [cmd, id, arq] = process.argv.slice(2);
if (cmd === "listar") {
  console.table(P.listar());
} else if (cmd === "ver") {
  const p = P.obter(id);
  console.log(JSON.stringify({ briefing: p.briefing, otimizado: p.otimizado, etapa: p.status.etapa }, null, 2));
} else if (cmd === "otimizado") {
  const o = JSON.parse(readFileSync(arq, "utf8"));
  P.salvarJson(id, "otimizado.json", o);
  P.registrar(id, `Roteiro otimizado pelo Claude (nota ${o.notaOriginal ?? "?"} → ${o.notaOtimizada ?? "?"})`, "claude", "otimizado");
  console.log(`ok: projetos/${id}/otimizado.json`);
} else {
  console.log("uso: node painel/cli.mjs listar | ver <id> | otimizado <id> <arquivo.json>");
}
