// Camada de dados do painel: cada vídeo é uma pasta em projetos/<id>/
//   briefing.json   o que o usuário mandou (roteiro + orientações)
//   otimizado.json  roteiro otimizado pelo Claude (e editado no painel)
//   config.json     opções visuais/voz
//   status.json     etapa atual + linha do tempo da criação
//   trilha.json     tempos reais da narração (gerado por scripts/narrar.py)
//   narracao.m4a    narração
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

export const RAIZ = resolve(new URL("..", import.meta.url).pathname);
export const PROJETOS = join(RAIZ, "projetos");
mkdirSync(PROJETOS, { recursive: true });

export const ETAPAS = [
  ["briefing", "Briefing"],
  ["aguardando_claude", "Aguardando o Claude"],
  ["otimizado", "Roteiro otimizado"],
  ["narrando", "Gerando narração"],
  ["narrado", "Narração pronta"],
  ["renderizando", "Renderizando"],
  ["pronto", "Vídeo pronto"],
  ["erro", "Erro"],
];

export const VOZES = [
  { id: "pt-BR-AntonioNeural", nome: "Antonio (masculina)" },
  { id: "pt-BR-FranciscaNeural", nome: "Francisca (feminina)" },
  { id: "pt-BR-ThalitaMultilingualNeural", nome: "Thalita (feminina, multilíngue)" },
];

export const configPadrao = () => ({
  voz: "pt-BR-AntonioNeural",
  velocidade: 10,
  fundo: { tipo: "gradiente", arquivo: null, inicio: 0, cortesPorCena: true, volume: 0 },
  musica: { arquivo: null, volume: 0.12 },
  estilo: {
    fonte: "Montserrat",
    tamanho: 92,
    corTexto: "#FFFFFF",
    corFalada: "#FFE600",
    corEnfase: "#0AC8B9",
    corContorno: "#000000",
    posicaoY: 0.66,
    palavrasPorBloco: 3,
    caixaAlta: true,
  },
  efeitos: { hook: true, barraProgresso: true, flash: true, zoomPunch: true, patch: true, quadro: true },
  tema: { cor1: "#010A13", cor2: "#0A323C", corDestaque: "#C8AA6E" },
  hookDuracao: 2.4,
  ctaAtivo: true,
});

const ler = (arq, padrao = null) => {
  try {
    return JSON.parse(readFileSync(arq, "utf8"));
  } catch {
    return padrao;
  }
};
const gravar = (arq, obj) => writeFileSync(arq, JSON.stringify(obj, null, 2));

export const dir = (id) => {
  if (!/^[a-z0-9-]+$/.test(id)) throw new Error("id inválido");
  const d = join(PROJETOS, id);
  if (!existsSync(d)) throw new Error("projeto não encontrado");
  return d;
};

const slug = (s) =>
  (s || "video")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "video";

export function registrar(id, msg, tipo = "info", etapa) {
  const arq = join(dir(id), "status.json");
  const st = ler(arq, { etapa: "briefing", log: [] });
  if (etapa) st.etapa = etapa;
  st.log.push({ t: new Date().toISOString(), msg, tipo });
  st.atualizado = new Date().toISOString();
  gravar(arq, st);
  return st;
}

export function setProgresso(id, progresso, texto) {
  const arq = join(dir(id), "status.json");
  const st = ler(arq, { etapa: "briefing", log: [] });
  st.progresso = progresso;
  st.progressoTexto = texto;
  gravar(arq, st);
}

export function criar(briefing) {
  const base = slug(briefing.titulo);
  let id = base;
  for (let n = 2; existsSync(join(PROJETOS, id)); n++) id = `${base}-${n}`;
  const d = join(PROJETOS, id);
  mkdirSync(d);
  gravar(join(d, "briefing.json"), { ...briefing, criadoEm: new Date().toISOString() });
  gravar(join(d, "config.json"), configPadrao());
  gravar(join(d, "status.json"), { etapa: "briefing", log: [] });
  registrar(id, "Briefing recebido", "ok");
  return id;
}

export function listar() {
  return readdirSync(PROJETOS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => {
      const d = join(PROJETOS, e.name);
      const b = ler(join(d, "briefing.json"), {});
      const s = ler(join(d, "status.json"), {});
      return { id: e.name, titulo: b.titulo, tipo: b.tipo, etapa: s.etapa, atualizado: s.atualizado };
    })
    .sort((a, b) => String(b.atualizado).localeCompare(String(a.atualizado)));
}

// Cenas atuais: as do roteiro otimizado, ou (antes da otimização) o roteiro
// original quebrado em frases — assim já dá para pré-visualizar.
export function cenasAtuais(id) {
  const d = dir(id);
  const ot = ler(join(d, "otimizado.json"));
  if (ot?.cenas?.length) return ot.cenas;
  const b = ler(join(d, "briefing.json"), {});
  return (b.roteiro || "")
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?…])\s+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((narracao) => ({ narracao, destaque: [] }));
}

export const hashNarracao = (cenas, cfg) =>
  createHash("sha1")
    .update(JSON.stringify([cenas.map((c) => (c.narracao || "").trim()), cfg.voz, cfg.velocidade]))
    .digest("hex")
    .slice(0, 12);

const norm = (s) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\w%+]/g, "");

// Tempo estimado (sem narração): ~15 caracteres/segundo ajustado pela velocidade
function trilhaEstimada(cenas, cfg) {
  const fator = 1 + (cfg.velocidade || 0) / 100;
  let t = 0.15;
  const out = cenas
    .filter((c) => (c.narracao || "").trim())
    .map((c) => {
      const alvo = new Set((c.destaque || []).flatMap((d) => d.split(/\s+/)).map(norm));
      const ini = t;
      const palavras = c.narracao.trim().split(/\s+/).map((w) => {
        const dur = Math.max(0.16, (w.length * 0.062 + 0.07) / fator);
        const p = { texto: w.replace(/[.,!?;:…]+$/, ""), inicio: +t.toFixed(3), fim: +(t + dur).toFixed(3), destaque: alvo.has(norm(w)) };
        t += dur;
        return p;
      });
      t += 0.25;
      return { inicio: +ini.toFixed(3), fim: +(t - 0.25).toFixed(3), palavras };
    });
  return { fonte: "estimada", duracao: +t.toFixed(3), cenas: out };
}

export function trilha(id) {
  const d = dir(id);
  const cfg = { ...configPadrao(), ...ler(join(d, "config.json"), {}) };
  const cenas = cenasAtuais(id);
  const real = ler(join(d, "trilha.json"));
  const h = hashNarracao(cenas.filter((c) => (c.narracao || "").trim()), cfg);
  const atual = real && real.hash === h && existsSync(join(d, "narracao.m4a"));
  const tr = atual ? real : trilhaEstimada(cenas, cfg);
  const comTexto = cenas.filter((c) => (c.narracao || "").trim());
  tr.cenas = tr.cenas.map((c, i) => ({
    ...c,
    textoTela: comTexto[i]?.textoTela || "",
    clipeInicio: comTexto[i]?.clipeInicio ?? null,
    provas: comTexto[i]?.provas || [],
  }));
  return { trilha: tr, narracaoAtual: !!atual, narracaoExiste: !!real, hash: h };
}

// Monta as props da composição LolShort. base = "" no navegador, ou
// "http://127.0.0.1:PORTA" quando o Remotion renderiza.
export function props(id, base = "") {
  const d = dir(id);
  const cfg = { ...configPadrao(), ...ler(join(d, "config.json"), {}) };
  const ot = ler(join(d, "otimizado.json"), {});
  const b = ler(join(d, "briefing.json"), {});
  const { trilha: tr, narracaoAtual } = trilha(id);
  const url = (rel) => (rel ? `${base}/arquivos/${rel.split("/").map(encodeURIComponent).join("/")}` : null);
  const v = narracaoAtual ? statSync(join(d, "narracao.m4a")).mtimeMs | 0 : 0;
  tr.cenas = tr.cenas.map((c) => ({
    ...c,
    provas: (c.provas || []).map((pr) => ({ ...pr, img: pr.imgArquivo ? url(pr.imgArquivo) : pr.img || null })),
  }));
  return {
    trilha: tr,
    audio: narracaoAtual ? `${url(`projetos/${id}/narracao.m4a`)}?v=${v}` : null,
    fundo: { ...cfg.fundo, url: cfg.fundo.tipo === "video" ? url(cfg.fundo.arquivo) : null },
    musica: { url: url(cfg.musica.arquivo), volume: cfg.musica.volume },
    estilo: cfg.estilo,
    efeitos: cfg.efeitos,
    tema: cfg.tema,
    hook: { texto: ot.hook?.textoTela || b.titulo || "", duracao: cfg.hookDuracao },
    cta: { texto: ot.cta?.texto || "", ativo: cfg.ctaAtivo },
    patch: patchAtual(),
  };
}

// patch do Data Dragon baixado por scripts/ddragon.py (dados/ddragon/resumo.json)
export function patchAtual() {
  const r = ler(join(RAIZ, "dados", "ddragon", "resumo.json"));
  return r?.versao ? `Patch ${r.versao.split(".").slice(0, 2).join(".")}` : "";
}

export function renders(id) {
  const d = join(RAIZ, "saida", id);
  if (!existsSync(d)) return [];
  return readdirSync(d)
    .filter((f) => f.endsWith(".mp4"))
    .map((f) => ({ arquivo: `saida/${id}/${f}`, nome: f, bytes: statSync(join(d, f)).size, data: statSync(join(d, f)).mtime }))
    .sort((a, b) => b.data - a.data);
}

export function obter(id) {
  const d = dir(id);
  const cfg = { ...configPadrao(), ...ler(join(d, "config.json"), {}) };
  return {
    id,
    briefing: ler(join(d, "briefing.json"), {}),
    otimizado: ler(join(d, "otimizado.json")),
    config: cfg,
    status: ler(join(d, "status.json"), { etapa: "briefing", log: [] }),
    cenas: cenasAtuais(id),
    ...trilha(id),
    props: props(id),
    renders: renders(id),
  };
}

export const salvarJson = (id, nome, obj) => gravar(join(dir(id), nome), obj);
export const lerJson = (id, nome) => ler(join(dir(id), nome));
