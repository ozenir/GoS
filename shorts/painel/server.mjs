// Servidor do Estúdio Shorts (painel). Uso: npm run painel  → http://localhost:3333
import { spawn } from "node:child_process";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, statSync, writeFileSync, appendFileSync } from "node:fs";
import { createServer } from "node:http";
import { basename, extname, join, normalize, sep } from "node:path";
import * as P from "./projetos.mjs";

const PORTA = Number(process.env.PORTA || 3333);
const RAIZ = P.RAIZ;
const PASTAS_PUBLICAS = ["brutos", "musicas", "projetos", "saida", "referencias"];
const PEDIDOS = join(RAIZ, "painel", "pedidos.log");
const tarefas = new Map(); // id -> processo em andamento

const MIME = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css",
  ".json": "application/json", ".mp4": "video/mp4", ".mov": "video/quicktime", ".webm": "video/webm",
  ".mp3": "audio/mpeg", ".m4a": "audio/mp4", ".wav": "audio/wav", ".ogg": "audio/ogg",
  ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".woff": "font/woff",
};

const json = (res, obj, cod = 200) => {
  res.writeHead(cod, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" });
  res.end(JSON.stringify(obj));
};
const corpo = (req) =>
  new Promise((ok, falha) => {
    let s = "";
    req.on("data", (c) => (s += c));
    req.on("end", () => {
      try { ok(s ? JSON.parse(s) : {}); } catch (e) { falha(e); }
    });
  });

function servirArquivo(req, res, abs) {
  if (!existsSync(abs) || !statSync(abs).isFile()) return json(res, { erro: "não encontrado" }, 404);
  const tam = statSync(abs).size;
  const tipo = MIME[extname(abs).toLowerCase()] || "application/octet-stream";
  const range = req.headers.range;
  if (range) {
    const [a, b] = range.replace("bytes=", "").split("-");
    const ini = Number(a) || 0;
    const fim = b ? Number(b) : tam - 1;
    res.writeHead(206, {
      "content-type": tipo, "accept-ranges": "bytes",
      "content-range": `bytes ${ini}-${fim}/${tam}`, "content-length": fim - ini + 1,
    });
    createReadStream(abs, { start: ini, end: fim }).pipe(res);
  } else {
    res.writeHead(200, { "content-type": tipo, "content-length": tam, "accept-ranges": "bytes", "cache-control": "no-cache" });
    createReadStream(abs).pipe(res);
  }
}

const arquivosDe = (pasta, exts) => {
  const d = join(RAIZ, pasta);
  if (!existsSync(d)) return [];
  return readdirSync(d)
    .filter((f) => exts.includes(extname(f).toLowerCase()))
    .map((f) => ({ arquivo: `${pasta}/${f}`, nome: f, bytes: statSync(join(d, f)).size }));
};

function rodar(id, cmd, args, { aoLinha, aoFim }) {
  const p = spawn(cmd, args, { cwd: RAIZ, env: process.env });
  tarefas.set(id, p);
  let resto = "", ultimas = [];
  const linha = (buf) => {
    resto += buf.toString();
    const ls = resto.split(/\r?\n|\r/);
    resto = ls.pop();
    for (const l of ls) {
      if (!l.trim()) continue;
      ultimas = [...ultimas.slice(-15), l];
      aoLinha?.(l);
    }
  };
  p.stdout.on("data", linha);
  p.stderr.on("data", linha);
  p.on("close", (codigo) => {
    tarefas.delete(id);
    aoFim(codigo, ultimas.join("\n"));
  });
}

function narrar(id) {
  const cenas = P.cenasAtuais(id).filter((c) => (c.narracao || "").trim());
  const cfg = P.lerJson(id, "config.json") || P.configPadrao();
  if (!P.lerJson(id, "otimizado.json")) P.salvarJson(id, "otimizado.json", { cenas });
  const hash = P.hashNarracao(cenas, cfg);
  P.registrar(id, `Gerando narração (${cfg.voz}, ${cenas.length} cenas)`, "info", "narrando");
  P.setProgresso(id, 0, "Narração");
  rodar(id, join(RAIZ, ".venv/bin/python"), ["scripts/narrar.py", `projetos/${id}`, "--hash", hash], {
    aoLinha: (l) => {
      const m = l.match(/cena (\d+)\/(\d+)/);
      if (m) P.setProgresso(id, m[1] / m[2], `Narração: cena ${m[1]} de ${m[2]}`);
    },
    aoFim: (cod, log) => {
      P.setProgresso(id, null, null);
      if (cod === 0) P.registrar(id, `Narração pronta (${log.match(/ok ([\d.]+s)/)?.[1] || ""})`, "ok", "narrado");
      else P.registrar(id, `Erro na narração: ${log.split("\n").slice(-3).join(" ")}`, "erro", "erro");
    },
  });
}

function renderizar(id, qualidade) {
  const pasta = join(RAIZ, "saida", id);
  mkdirSync(pasta, { recursive: true });
  const n = readdirSync(pasta).filter((f) => f.endsWith(".mp4")).length + 1;
  const previa = qualidade === "previa";
  const nome = `${id}-v${n}${previa ? "-previa" : ""}.mp4`;
  const props = P.props(id, `http://127.0.0.1:${PORTA}`);
  const arqProps = join(P.dir(id), "props-render.json");
  writeFileSync(arqProps, JSON.stringify(props));
  P.registrar(id, `Renderizando ${previa ? "prévia 540x960" : "final 1080x1920"} → ${nome}`, "info", "renderizando");
  P.setProgresso(id, 0, "Preparando (empacotando o projeto)");
  const args = ["render", "src/index.ts", "LolShort", join(pasta, nome), `--props=${arqProps}`];
  if (previa) args.push("--scale=0.5", "--crf=28");
  rodar(id, join(RAIZ, "node_modules/.bin/remotion"), args, {
    aoLinha: (l) => {
      const r = l.match(/Rendered (\d+)\/(\d+)/);
      const e = l.match(/Encoded (\d+)\/(\d+)/);
      if (r) P.setProgresso(id, (r[1] / r[2]) * 0.85, `Desenhando quadros ${r[1]}/${r[2]}`);
      else if (e) P.setProgresso(id, 0.85 + (e[1] / e[2]) * 0.15, `Codificando ${e[1]}/${e[2]}`);
    },
    aoFim: (cod, log) => {
      P.setProgresso(id, null, null);
      if (cod === 0) P.registrar(id, `Vídeo pronto: saida/${id}/${nome}`, "ok", "pronto");
      else P.registrar(id, `Erro no render: ${log.split("\n").slice(-4).join(" ")}`, "erro", "erro");
    },
  });
}

const rotas = [
  ["GET", /^\/api\/estado$/, (req, res) =>
    json(res, {
      projetos: P.listar(),
      brutos: arquivosDe("brutos", [".mp4", ".mov", ".webm", ".mkv"]),
      musicas: arquivosDe("musicas", [".mp3", ".m4a", ".wav", ".ogg"]),
      vozes: P.VOZES,
      etapas: P.ETAPAS,
    })],
  ["POST", /^\/api\/projetos$/, async (req, res) => {
    const b = await corpo(req);
    if (!b.roteiro?.trim()) return json(res, { erro: "Mande o roteiro" }, 400);
    json(res, { id: P.criar(b) });
  }],
  ["GET", /^\/api\/projetos\/([a-z0-9-]+)$/, (req, res, id) =>
    json(res, { ...P.obter(id), ocupado: tarefas.has(id) })],
  ["GET", /^\/api\/projetos\/([a-z0-9-]+)\/status$/, (req, res, id) =>
    json(res, { status: P.lerJson(id, "status.json"), ocupado: tarefas.has(id), renders: P.renders(id) })],
  ["PUT", /^\/api\/projetos\/([a-z0-9-]+)\/briefing$/, async (req, res, id) => {
    const b = await corpo(req);
    P.salvarJson(id, "briefing.json", { ...P.lerJson(id, "briefing.json"), ...b });
    P.registrar(id, "Briefing editado");
    json(res, P.obter(id));
  }],
  ["POST", /^\/api\/projetos\/([a-z0-9-]+)\/pedir-otimizacao$/, (req, res, id) => {
    P.registrar(id, "Enviado ao Claude para otimizar o roteiro", "claude", "aguardando_claude");
    appendFileSync(PEDIDOS, `${new Date().toISOString()} otimizar ${id}\n`);
    json(res, P.obter(id));
  }],
  ["POST", /^\/api\/projetos\/([a-z0-9-]+)\/otimizado$/, async (req, res, id) => {
    const o = await corpo(req);
    P.salvarJson(id, "otimizado.json", o);
    P.registrar(id, `Roteiro otimizado pelo Claude (nota ${o.notaOriginal ?? "?"} → ${o.notaOtimizada ?? "?"})`, "claude", "otimizado");
    json(res, P.obter(id));
  }],
  ["PUT", /^\/api\/projetos\/([a-z0-9-]+)\/roteiro$/, async (req, res, id) => {
    const o = await corpo(req);
    P.salvarJson(id, "otimizado.json", { ...(P.lerJson(id, "otimizado.json") || {}), ...o });
    json(res, P.obter(id));
  }],
  ["PUT", /^\/api\/projetos\/([a-z0-9-]+)\/config$/, async (req, res, id) => {
    const c = await corpo(req);
    P.salvarJson(id, "config.json", { ...P.configPadrao(), ...c });
    json(res, P.obter(id));
  }],
  ["POST", /^\/api\/projetos\/([a-z0-9-]+)\/narrar$/, (req, res, id) => {
    if (tarefas.has(id)) return json(res, { erro: "Já tem uma tarefa rodando" }, 409);
    narrar(id);
    json(res, { ok: true });
  }],
  ["POST", /^\/api\/projetos\/([a-z0-9-]+)\/render$/, async (req, res, id) => {
    if (tarefas.has(id)) return json(res, { erro: "Já tem uma tarefa rodando" }, 409);
    const { qualidade } = await corpo(req);
    renderizar(id, qualidade);
    json(res, { ok: true });
  }],
  ["POST", /^\/api\/projetos\/([a-z0-9-]+)\/cancelar$/, (req, res, id) => {
    tarefas.get(id)?.kill("SIGTERM");
    P.registrar(id, "Tarefa cancelada", "erro");
    json(res, { ok: true });
  }],
  ["POST", /^\/api\/upload$/, (req, res) => {
    const u = new URL(req.url, "http://x");
    const pasta = u.searchParams.get("pasta");
    const nome = basename(u.searchParams.get("nome") || "").replace(/[^\w.\- ]/g, "_");
    if (!["brutos", "musicas", "referencias"].includes(pasta) || !nome) return json(res, { erro: "destino inválido" }, 400);
    const destino = join(RAIZ, pasta, nome);
    req.pipe(createWriteStream(destino)).on("finish", () => json(res, { arquivo: `${pasta}/${nome}` }));
  }],
];

createServer(async (req, res) => {
  try {
    const u = new URL(req.url, "http://x");
    const caminho = decodeURIComponent(u.pathname);
    for (const [met, re, fn] of rotas) {
      const m = caminho.match(re);
      if (m && req.method === met) return await fn(req, res, ...m.slice(1));
    }
    if (caminho.startsWith("/arquivos/")) {
      const rel = normalize(caminho.slice("/arquivos/".length));
      if (!PASTAS_PUBLICAS.includes(rel.split(sep)[0]) || rel.includes("..")) return json(res, { erro: "proibido" }, 403);
      return servirArquivo(req, res, join(RAIZ, rel));
    }
    const estatico = caminho === "/" ? "index.html" : normalize(caminho).replace(/^[/\\]+/, "");
    if (estatico.includes("..")) return json(res, { erro: "proibido" }, 403);
    return servirArquivo(req, res, join(RAIZ, "painel", estatico));
  } catch (e) {
    json(res, { erro: String(e.message || e) }, 500);
  }
}).listen(PORTA, "0.0.0.0", () => console.log(`Estúdio Shorts em http://localhost:${PORTA}`));
