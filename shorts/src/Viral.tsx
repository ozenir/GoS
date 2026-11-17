// Estilo "viral (tela cheia)": o que os Shorts de LoL que mais crescem fazem (análise em docs/virais.md).
// Imagem real o tempo todo, em tela cheia, trocando a cada ~2,4 s (vídeos das habilidades do campeão em
// destaque, splash art com zoom lento e o gameplay do usuário), corte com tranco de zoom, e as provas viram
// "figurinhas" compactas no topo na hora da palavra-gatilho. A legenda grande vem do LolShort (estilo).
import { useMemo } from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  Loop,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { ProvaT, VideoFundoT } from "./Quadro";

export type MidiaViral = {
  campeao?: string;
  splash?: string | null; // arte horizontal (Data Dragon splash), com zoom lento
  videos?: { url: string; dur: number; foco?: [number, number]; w?: number; h?: number; letra: string; nome?: string }[];
} | null;

type CenaV = {
  inicio: number;
  fim: number;
  palavras: { texto: string; inicio: number; fim: number }[];
  provas?: ProvaT[];
  videoFundo?: VideoFundoT;
  clipeInicio?: number | null;
};

type Trecho = { de: number; ate: number; tipo: "video" | "splash" | "gameplay"; url: string; dur?: number; foco?: [number, number]; w?: number; h?: number; ini: number; k: number; fundo?: string | null };

export const SEG_VIRAL = 2.4; // segundos por corte (os virais cortam a cada 2–3 s)

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

// qual habilidade a cena cita: a letra sozinha ("o E", "W em seguida") ou o nome da habilidade
function habilidadeCitada(cena: CenaV, videos: NonNullable<MidiaViral>["videos"]): string | null {
  const txt = cena.palavras.map((w) => w.texto).join(" ");
  for (const v of videos || []) {
    if (v.nome && norm(txt).includes(norm(v.nome))) return v.letra;
  }
  const m = txt.match(/(?:^|\s)(Q|W|E|R)(?=[\s,.!?]|$)/);
  if (m && (videos || []).some((v) => v.letra === m[1])) return m[1];
  if (/\b(ult|ultimate)\b/i.test(txt) && (videos || []).some((v) => v.letra === "R")) return "R";
  if (/\bpassiva\b/i.test(txt) && (videos || []).some((v) => v.letra === "P")) return "P";
  return null;
}

// monta a trilha de imagens: um trecho a cada SEG_VIRAL, escolhido pela cena (determinístico)
export function montarTrilhaViral(cenas: CenaV[], duracao: number, midia: MidiaViral, gameplay: { url: string; inicio?: number } | null): Trecho[] {
  const videos = midia?.videos || [];
  const fundo = midia?.splash || null;
  const out: Trecho[] = [];
  let rodizio = 0;
  let seguidos = 0; // trechos de vídeo em sequência: a cada 3, a splash entra para variar
  const variar = (t: Omit<Trecho, "de" | "ate" | "k" | "fundo">) => {
    if (t.tipo === "video" && seguidos >= 3 && fundo) { seguidos = 0; return { tipo: "splash" as const, url: fundo, ini: 0 }; }
    seguidos = t.tipo === "video" ? seguidos + 1 : 0;
    return t;
  };
  for (let t = 0, k = 0; t < duracao; t += SEG_VIRAL, k++) {
    const meio = t + SEG_VIRAL / 2;
    const cena = cenas.find((c, i) => meio >= c.inicio && (meio < (cenas[i + 1]?.inicio ?? 1e9))) || cenas[cenas.length - 1];
    const ate = Math.min(duracao, t + SEG_VIRAL);
    const base = { de: t, ate, k, fundo };
    if (cena?.videoFundo?.url) {
      const vf = cena.videoFundo;
      out.push({ ...base, tipo: "video", url: vf.url, dur: vf.dur || 4, foco: vf.foco, w: vf.w, h: vf.h, ini: ((k * 1.7) % Math.max(0.1, (vf.dur || 4) - SEG_VIRAL)) });
      continue;
    }
    const letra = cena ? habilidadeCitada(cena, videos) : null;
    const citado = letra ? videos.find((v) => v.letra === letra) : null;
    if (citado) {
      out.push({ ...base, ...variar({ tipo: "video", url: citado.url, dur: citado.dur, foco: citado.foco, w: citado.w, h: citado.h, ini: (k * 1.7) % Math.max(0.1, citado.dur - SEG_VIRAL) }) });
      continue;
    }
    // sem habilidade citada: gameplay do usuário (se houver), splash e vídeos em rodízio
    const opcoes: Omit<Trecho, "de" | "ate" | "k">[] = [];
    // sem campeão em destaque (ex.: notícia), as fotos da própria cena viram o fundo; com campeão, o foco é
    // sempre ele: fotos de outros campeões ficam só na figurinha
    const fotos = videos.length || midia?.splash ? [] : (cena?.provas || []).filter((pr) => pr.tipo === "foto" && pr.img).map((pr) => pr.img as string);
    if (fotos.length) {
      out.push({ ...base, tipo: "splash", url: fotos[k % fotos.length], ini: 0 });
      continue;
    }
    if (gameplay) opcoes.push({ tipo: "gameplay", url: gameplay.url, ini: (cena?.clipeInicio ?? (gameplay.inicio || 0) + t) });
    if (midia?.splash) opcoes.push({ tipo: "splash", url: midia.splash, ini: 0 });
    for (const v of videos) opcoes.push({ tipo: "video", url: v.url, dur: v.dur, foco: v.foco, w: v.w, h: v.h, ini: (k * 1.3) % Math.max(0.1, v.dur - SEG_VIRAL) });
    if (opcoes.length) {
      out.push({ ...base, ...variar(opcoes[rodizio % opcoes.length]) });
      rodizio++;
    }
  }
  return out;
}

// vídeo horizontal numa faixa alta no meio da tela, centrado no campeão (mostra ~2/3 da largura do vídeo:
// a ação inteira aparece mesmo quando o foco não foi medido); o resto da tela é o mesmo vídeo desfocado
export const FAIXA = 1150;
function enquadrarFaixa(t: Trecho, larg: number, zoom: number): React.CSSProperties {
  const vw = t.w || 1056;
  const vh = t.h || 720;
  const [fx] = t.foco || [0.55, 0.62];
  const k = (FAIXA / vh) * zoom;
  const W = vw * k;
  const H = vh * k;
  const left = Math.min(0, Math.max(larg - W, larg / 2 - fx * W));
  return { position: "absolute", left, top: (FAIXA - H) / 2, width: W, height: H };
}

const TrechoViral: React.FC<{ t: Trecho }> = ({ t }) => {
  const frame = useCurrentFrame();
  const { fps, width, height, durationInFrames } = useVideoConfig();
  // tranco de zoom no corte + empurrão lento até o próximo
  const tranco = interpolate(spring({ frame, fps, config: { damping: 16, mass: 0.6 } }), [0, 1], [1.14, 1]);
  const empurra = interpolate(frame, [0, durationInFrames], [1, 1.07]);
  const z = tranco * empurra;
  if (t.tipo === "splash") {
    return (
      <AbsoluteFill style={{ overflow: "hidden", background: "#000" }}>
        <Img src={t.url} style={{ position: "absolute", height: "100%", left: "50%", top: 0, transform: `translateX(-${50 + (t.k % 2 ? 6 : -6) * (frame / Math.max(1, durationInFrames))}%) scale(${z})`, transformOrigin: "50% 40%" }} />
      </AbsoluteFill>
    );
  }
  if (t.tipo === "gameplay") {
    return (
      <AbsoluteFill style={{ overflow: "hidden", background: "#000", transform: `scale(${z})` }}>
        <OffthreadVideo src={t.url} muted startFrom={Math.round(t.ini * fps)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </AbsoluteFill>
    );
  }
  return (
    <AbsoluteFill style={{ background: "#000", overflow: "hidden" }}>
      {/* o próprio vídeo, ampliado e desfocado, preenche em cima e embaixo (como os Shorts de gameplay) */}
      <Loop durationInFrames={Math.max(15, Math.round((t.dur || 4) * fps) - 2)}>
        <OffthreadVideo
          src={t.url}
          muted
          startFrom={Math.round(t.ini * fps)}
          style={{ position: "absolute", left: -120, top: -120, width: width + 240, height: height + 240, objectFit: "cover", filter: "blur(30px) brightness(.8) saturate(1.35)" }}
        />
      </Loop>
      <div
        style={{
          position: "absolute", left: 0, width, top: (height - FAIXA) / 2 - 40, height: FAIXA, overflow: "hidden",
          boxShadow: "0 0 60px rgba(0,0,0,.7)", borderTop: "4px solid rgba(255,255,255,.12)", borderBottom: "4px solid rgba(255,255,255,.12)",
        }}
      >
        <Loop durationInFrames={Math.max(15, Math.round((t.dur || 4) * fps) - 2)}>
          <OffthreadVideo
            src={t.url}
            muted
            startFrom={Math.round(t.ini * fps)}
            style={{ ...enquadrarFaixa(t, width, z), filter: "brightness(1.12) contrast(1.06) saturate(1.15)" }}
          />
        </Loop>
      </div>
    </AbsoluteFill>
  );
};

export const FundoViral: React.FC<{ cenas: CenaV[]; duracao: number; midia: MidiaViral; gameplay: { url: string; inicio?: number } | null }> = ({ cenas, duracao, midia, gameplay }) => {
  const { fps } = useVideoConfig();
  const trilha = useMemo(() => montarTrilhaViral(cenas, duracao, midia, gameplay), [cenas, duracao, midia, gameplay]);
  return (
    <AbsoluteFill style={{ background: "#05070c" }}>
      {trilha.map((t) => (
        <Sequence key={t.k} from={Math.round(t.de * fps)} durationInFrames={Math.max(1, Math.round((t.ate - t.de) * fps))}>
          <TrechoViral t={t} />
        </Sequence>
      ))}
      {/* leitura da legenda e das figurinhas: escurece só as bordas de cima e de baixo */}
      <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,0) 26%, rgba(0,0,0,0) 58%, rgba(0,0,0,.55) 100%)" }} />
    </AbsoluteFill>
  );
};

// ------------------------------------------------------------ figurinhas (provas compactas no topo)

const CORES: Record<string, string> = { ouro: "#C8AA6E", verde: "#2ECC71", vermelho: "#E53935", azul: "#3FA9F5", amarelo: "#FFD54F" };

function momentos(cenas: CenaV[], depoisDe: number) {
  const out: { p: ProvaT; t: number; ate: number }[] = [];
  cenas.forEach((c, ci) => {
    let cursor = c.inicio;
    const provas = c.provas || [];
    provas.forEach((p, k) => {
      let t = c.inicio + ((k + 0.25) / Math.max(1, provas.length)) * Math.max(0.5, c.fim - c.inicio) * 0.9;
      if (p.gatilho) {
        const g = norm(p.gatilho).replace(/[^\w%+/]/g, "");
        const w = c.palavras.find((x) => x.inicio >= cursor - 0.05 && norm(x.texto).replace(/[^\w%+/]/g, "").startsWith(g));
        if (w) t = Math.max(c.inicio, w.inicio - 0.1);
      }
      t = Math.max(t, cursor, depoisDe); // não briga com o gancho do começo
      cursor = t + 0.25;
      out.push({ p, t, ate: Math.min(t + 2.6, (cenas[ci + 1]?.inicio ?? c.fim + 0.6)) });
    });
  });
  // uma figurinha por vez: a próxima encerra a anterior
  out.forEach((m, i) => { if (out[i + 1] && out[i + 1].t < m.ate) m.ate = out[i + 1].t; });
  return out.filter((m) => m.ate - m.t > 0.3);
}

const Figurinha: React.FC<{ p: ProvaT }> = ({ p }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 11, mass: 0.7 } });
  const sai = interpolate(frame, [durationInFrames - 6, durationInFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cor = CORES[p.cor || "ouro"] || CORES.ouro;
  const alc = p.tipo === "alcance" ? p.alcances || [] : [];
  const detalhe = alc.length ? alc.map((a) => `${a.rotulo}: ${a.valor}`).join("\n") : p.detalhe || "";
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: 250,
        transform: `translateX(-50%) scale(${interpolate(entra, [0, 1], [0.6, 1]) * sai}) rotate(${interpolate(entra, [0, 1], [-6, -1.5])}deg)`,
        opacity: sai,
        display: "flex",
        alignItems: "center",
        gap: 22,
        padding: "18px 30px 18px 18px",
        maxWidth: 940,
        background: "rgba(8,12,20,.9)",
        border: `6px solid ${cor}`,
        borderRadius: 26,
        boxShadow: `0 18px 40px rgba(0,0,0,.55), 0 0 30px ${cor}55`,
      }}
    >
      {p.img ? <Img src={p.img} style={{ width: 150, height: 150, borderRadius: 18, objectFit: "cover", objectPosition: "50% 20%", border: `4px solid ${cor}`, flex: "none" }} /> : null}
      <div style={{ minWidth: 0 }}>
        <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 54, lineHeight: 1.02, color: "white", textTransform: "uppercase" }}>{p.rotulo}</div>
        {detalhe ? (
          <div style={{ fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 36, lineHeight: 1.15, color: cor, whiteSpace: "pre-line", marginTop: 6 }}>{detalhe}</div>
        ) : null}
      </div>
      {p.carimbo ? (
        <div style={{ position: "absolute", right: -18, top: -30, background: "#D32F2F", color: "white", fontFamily: "Montserrat, sans-serif", fontWeight: 900, fontSize: 30, padding: "6px 16px", borderRadius: 10, transform: "rotate(8deg)" }}>
          {p.carimbo}
        </div>
      ) : null}
    </div>
  );
};

export const Figurinhas: React.FC<{ cenas: CenaV[]; depoisDe?: number }> = ({ cenas, depoisDe = 0 }) => {
  const { fps } = useVideoConfig();
  const lista = useMemo(() => momentos(cenas, depoisDe), [cenas, depoisDe]);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {lista.map((m, i) => (
        <Sequence key={i} from={Math.round(m.t * fps)} durationInFrames={Math.max(1, Math.round((m.ate - m.t) * fps))} layout="none">
          <Figurinha p={m.p} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};

export const _easing = Easing; // (mantém o import estável para o bundler)
