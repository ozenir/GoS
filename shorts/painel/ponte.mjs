// Ponte entre o Estúdio Shorts publicado no claude.ai (Artifact) e esta máquina.
// O Claude usa assim (detalhes no CLAUDE.md):
//   node painel/ponte.mjs importar <doc.json>            projeto do Artifact -> projetos/<id>/
//   node painel/ponte.mjs produzir <id> [final|previa]   narração + render (servidor local precisa estar no ar)
//   node painel/ponte.mjs estado <id> --audio <assetId> [--render <assetId>|<nome>|<qualidade>|<bytes>]... [--pedido <em>] [--passo k=v]
//                                                        -> projetos/<id>/producao.json (para gravar no Artifact)
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import * as P from "./projetos.mjs";

const SERVIDOR = `http://127.0.0.1:${process.env.PORTA || 3333}`;
const [cmd, ...args] = process.argv.slice(2);
const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(metodo, caminho, corpo) {
  const r = await fetch(SERVIDOR + caminho, {
    method: metodo,
    headers: { "content-type": "application/json" },
    body: corpo ? JSON.stringify(corpo) : undefined,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.erro || r.statusText);
  return j;
}

async function aguardar(id, etapaRodando) {
  for (;;) {
    await espera(2000);
    const s = await api("GET", `/api/projetos/${id}/status`);
    if (s.status.progressoTexto) console.log(`  ${s.status.progressoTexto}`);
    if (!s.ocupado && s.status.etapa !== etapaRodando) return s.status;
  }
}

if (cmd === "importar") {
  // aceita o JSON salvo pelo ArtifactData (com ou sem envelope {data: ...})
  const bruto = JSON.parse(readFileSync(args[0], "utf8"));
  const doc = bruto.data ?? bruto.fields ?? bruto;
  const id = args[1] || bruto.doc_id || bruto.id || args[0].split("/").pop().replace(/\.json$/, "");
  const d = join(P.PROJETOS, id);
  mkdirSync(d, { recursive: true });
  const cfg = { ...P.configPadrao(), ...(doc.config || {}) };
  // mídias do Artifact: o Claude baixa o asset para brutos/<assetId>.mp4 ou musicas/<assetId>.mp4
  const avisos = [];
  const fundoId = doc.config?.fundo?.asset?.id;
  cfg.fundo = { ...cfg.fundo, arquivo: null };
  if (cfg.fundo.tipo === "video" && fundoId) {
    const arq = readdirSync(join(P.RAIZ, "brutos")).find((f) => f.startsWith(fundoId));
    if (arq) cfg.fundo.arquivo = `brutos/${arq}`;
    else avisos.push(`baixe o gameplay: asset ${fundoId} -> brutos/`);
  }
  const musId = doc.config?.musica?.asset?.id;
  cfg.musica = { ...cfg.musica, arquivo: null };
  if (musId) {
    const arq = readdirSync(join(P.RAIZ, "musicas")).find((f) => f.startsWith(musId));
    if (arq) cfg.musica.arquivo = `musicas/${arq}`;
    else avisos.push(`baixe a música: asset ${musId} -> musicas/`);
  }
  writeFileSync(join(d, "briefing.json"), JSON.stringify(doc.briefing || {}, null, 2));
  writeFileSync(join(d, "config.json"), JSON.stringify(cfg, null, 2));
  if (doc.otimizado) {
    // imagens das provas: asset do Artifact -> arquivo local (mapa em dados/assets.json)
    const mapa = existsSync(join(P.RAIZ, "dados/assets.json")) ? JSON.parse(readFileSync(join(P.RAIZ, "dados/assets.json"), "utf8")) : {};
    const porId = Object.fromEntries(Object.entries(mapa).map(([arq, id]) => [id, arq]));
    for (const c of doc.otimizado.cenas || []) for (const pr of c.provas || []) {
      if (pr.imgAsset && porId[pr.imgAsset]) pr.imgArquivo = porId[pr.imgAsset];
      else if (pr.imgAsset) avisos.push(`baixe a imagem da prova "${pr.rotulo}": asset ${pr.imgAsset} -> dados/, e registre em dados/assets.json`);
    }
    writeFileSync(join(d, "otimizado.json"), JSON.stringify(doc.otimizado, null, 2));
  }
  else writeFileSync(join(d, "otimizado.json"), JSON.stringify({ cenas: P.cenasAtuais(id) }, null, 2));
  if (!existsSync(join(d, "status.json"))) writeFileSync(join(d, "status.json"), JSON.stringify({ etapa: "otimizado", log: [] }));
  const { hash } = P.trilha(id);
  console.log(JSON.stringify({ id, hash, pedido: doc.pedido || null, avisos }, null, 2));
} else if (cmd === "produzir") {
  const [id, qualidade = "final"] = args;
  const { narracaoAtual } = P.trilha(id);
  if (!narracaoAtual) {
    console.log("Gerando narração…");
    await api("POST", `/api/projetos/${id}/narrar`);
    const st = await aguardar(id, "narrando");
    if (st.etapa === "erro") throw new Error(st.log.at(-1)?.msg);
  } else console.log("Narração já está em dia.");
  // o Artifact não aceita áudio: a narração vai como MP4 só com áudio
  const d = P.dir(id);
  spawnSync("ffmpeg", ["-v", "error", "-y", "-i", join(d, "narracao.m4a"), "-c", "copy", "-f", "mp4", join(d, "narracao.mp4")], { stdio: "inherit" });
  console.log("Renderizando…");
  const antes = new Set(P.renders(id).map((r) => r.arquivo));
  await api("POST", `/api/projetos/${id}/render`, { qualidade });
  const st = await aguardar(id, "renderizando");
  if (st.etapa === "erro") throw new Error(st.log.at(-1)?.msg);
  const novo = P.renders(id).find((r) => !antes.has(r.arquivo));
  const mb = novo.bytes / 1048576;
  console.log(JSON.stringify({ narracao: `projetos/${id}/narracao.mp4`, video: novo.arquivo, nome: novo.nome, bytes: novo.bytes, qualidade, cabeNoArtifact: mb <= 15 }, null, 2));
} else if (cmd === "estado") {
  const id = args[0];
  const audio = args[args.indexOf("--audio") + 1];
  const renders = [];
  args.forEach((a, i) => {
    if (a === "--render") {
      const [rid, nome, qualidade, bytes] = args[i + 1].split("|");
      renders.push({ id: rid, nome, qualidade, bytes: Number(bytes), data: Date.now() });
    }
  });
  // botão "Criar vídeo": --pedido <em> liga este estado ao pedido; --passo k=v ajusta um passo (ok|pulado|erro)
  const pedidoEm = args.includes("--pedido") ? Number(args[args.indexOf("--pedido") + 1]) : null;
  const passos = { roteiro: "pulado", provas: "ok", narracao: "ok", render: "ok", envio: "ok" };
  args.forEach((a, i) => { if (a === "--passo") { const [k, v] = args[i + 1].split("="); passos[k] = v; } });
  const real = JSON.parse(readFileSync(join(P.dir(id), "trilha.json"), "utf8"));
  const anterior = existsSync(join(P.dir(id), "producao.json")) ? JSON.parse(readFileSync(join(P.dir(id), "producao.json"), "utf8")) : {};
  const estado = {
    etapa: "pronto",
    progresso: null,
    texto: "Vídeo pronto",
    hash: real.hash,
    trilha: { duracao: real.duracao, cenas: real.cenas },
    audio: { id: audio },
    renders: [...(anterior.renders || []), ...renders],
    ...(pedidoEm ? { pedidoEm, passos } : {}),
    atualizado: Date.now(),
  };
  writeFileSync(join(P.dir(id), "producao.json"), JSON.stringify(estado));
  console.log(`ok: projetos/${id}/producao.json (${(statSync(join(P.dir(id), "producao.json")).size / 1024).toFixed(1)} KB)`);
} else {
  console.log("uso: importar <doc.json> [id] | produzir <id> [final|previa] | estado <id> --audio <id> --render <id|nome|qualidade|bytes> [--pedido <em>] [--passo k=v]");
}
