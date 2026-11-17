import { useEffect, useMemo, useState } from "react";
import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  continueRender,
  delayRender,
  interpolate,
  random,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { pesoDaFonte } from "./fontes";
import { ProvaT, Quadro, VideoFundoT } from "./Quadro";
import { Figurinhas, FundoViral, MidiaViral } from "./Viral";

// ---------- Tipos (o painel e o servidor produzem exatamente isto) ----------

export type PalavraT = { texto: string; inicio: number; fim: number; destaque?: boolean };
export type CenaT = {
  inicio: number;
  fim: number;
  textoTela?: string;
  clipeInicio?: number | null;
  palavras: PalavraT[];
  provas?: ProvaT[]; // quadro de investigação
  videoFundo?: VideoFundoT; // vídeo da habilidade atrás do quadro
};
export type Trilha = { duracao: number; cenas: CenaT[] };

export type LolShortProps = {
  trilha: Trilha;
  audio?: string | null; // narração (URL)
  fundo: {
    tipo: "gradiente" | "video";
    url?: string | null;
    inicio?: number; // segundo do vídeo de fundo onde começa
    cortesPorCena?: boolean; // usa clipeInicio de cada cena
    volume?: number; // som original do gameplay (0 = mudo)
  };
  musica?: { url?: string | null; volume: number };
  estilo: {
    fonte: string;
    tamanho: number; // px da legenda
    corTexto: string;
    corFalada: string; // palavra sendo falada
    corEnfase: string; // palavras de destaque do roteiro
    corContorno: string;
    posicaoY: number; // 0 (topo) a 1 (base) — centro da legenda
    palavrasPorBloco: number;
    caixaAlta: boolean;
  };
  efeitos: {
    hook: boolean;
    barraProgresso: boolean;
    flash: boolean;
    zoomPunch: boolean;
    patch?: boolean;
    quadro?: boolean; // quadro de investigação no lugar do fundo
  };
  tema: { cor1: string; cor2: string; corDestaque: string };
  hook: { texto: string; duracao?: number };
  cta: { texto: string; ativo: boolean };
  patch?: string; // ex.: "Patch 16.22" (selo no canto, o vídeo inteiro)
  // "quadro" = quadro de investigação (padrão); "viral" = imagem real em tela cheia com cortes rápidos
  layout?: "quadro" | "viral";
  midia?: MidiaViral; // vídeos das habilidades e splash do campeão em destaque (estilo viral)
};

export const FPS_LOL = 30;
export const duracaoEmFrames = (p: LolShortProps) =>
  Math.max(30, Math.ceil((p.trilha.duracao + 0.5) * FPS_LOL));

// ---------- Fundo ----------

const FundoGradiente: React.FC<{ tema: LolShortProps["tema"] }> = ({ tema }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const giro = frame * 0.15;
  const particulas = useMemo(
    () =>
      new Array(40).fill(0).map((_, i) => ({
        x: random(`x${i}`) * width,
        y0: random(`y${i}`) * height,
        v: 0.6 + random(`v${i}`) * 1.8,
        r: 2 + random(`r${i}`) * 5,
      })),
    [width, height],
  );
  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 50% 30%, ${tema.cor2} 0%, ${tema.cor1} 70%)`,
      }}
    >
      <svg width={width} height={height} style={{ position: "absolute", opacity: 0.18 }}>
        <g transform={`rotate(${giro} ${width / 2} ${height / 2})`}>
          {[260, 420, 600, 820].map((r) => (
            <polygon
              key={r}
              fill="none"
              stroke={tema.corDestaque}
              strokeWidth={3}
              points={new Array(6)
                .fill(0)
                .map((_, k) => {
                  const a = (Math.PI / 3) * k + Math.PI / 6;
                  return `${width / 2 + r * Math.cos(a)},${height / 2 + r * Math.sin(a)}`;
                })
                .join(" ")}
            />
          ))}
        </g>
      </svg>
      {particulas.map((p, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: p.x,
            top: (((p.y0 - frame * p.v) % height) + height) % height,
            width: p.r,
            height: p.r,
            borderRadius: "50%",
            background: tema.corDestaque,
            boxShadow: `0 0 ${p.r * 3}px ${tema.corDestaque}`,
            opacity: 0.6,
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const VideoFundo: React.FC<{ url: string; inicio: number; volume: number; zoom: boolean }> = ({
  url,
  inicio,
  volume,
  zoom,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = zoom ? interpolate(spring({ frame, fps, config: { damping: 18 } }), [0, 1], [1.12, 1]) : 1;
  return (
    <AbsoluteFill style={{ transform: `scale(${s})` }}>
      <OffthreadVideo
        src={url}
        startFrom={Math.max(0, Math.round(inicio * fps))}
        volume={volume}
        muted={volume <= 0}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
    </AbsoluteFill>
  );
};

// ---------- Textos ----------

const contorno = (cor: string, px: number): React.CSSProperties => ({
  WebkitTextStroke: `${px}px ${cor}`,
  paintOrder: "stroke fill",
});

const Hook: React.FC<{ texto: string; p: LolShortProps; dur: number }> = ({ texto, p, dur }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entra = spring({ frame, fps, config: { damping: 9, mass: 0.7 } });
  const tremor = frame < 10 ? Math.sin(frame * 2.3) * (10 - frame) * 1.6 : 0;
  const sai = interpolate(frame, [dur - 8, dur], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 250,
        width: "100%",
        padding: "0 70px",
        textAlign: "center",
        fontFamily: p.estilo.fonte,
        fontWeight: pesoDaFonte(p.estilo.fonte),
        fontSize: 118,
        lineHeight: 1.05,
        color: p.tema.corDestaque,
        textTransform: "uppercase",
        transform: `translateX(${tremor}px) scale(${entra}) rotate(${(1 - entra) * -8}deg)`,
        opacity: sai,
        textShadow: "0 10px 30px rgba(0,0,0,.6)",
        ...contorno(p.estilo.corContorno, 14),
      }}
    >
      {texto}
    </div>
  );
};

const TextoTela: React.FC<{ texto: string; p: LolShortProps }> = ({ texto, p }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 11 } });
  return (
    <div
      style={{
        position: "absolute",
        top: 330,
        width: "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background: p.tema.corDestaque,
          color: p.tema.cor1,
          fontFamily: p.estilo.fonte,
          fontWeight: pesoDaFonte(p.estilo.fonte),
          fontSize: 72,
          padding: "14px 38px",
          borderRadius: 18,
          textTransform: "uppercase",
          transform: `scale(${pop}) rotate(${interpolate(pop, [0, 1], [6, -2])}deg)`,
          boxShadow: "0 14px 40px rgba(0,0,0,.45)",
          maxWidth: 900,
          textAlign: "center",
        }}
      >
        {texto}
      </div>
    </div>
  );
};

const BlocoLegenda: React.FC<{ palavras: PalavraT[]; inicioBloco: number; p: LolShortProps }> = ({
  palavras,
  inicioBloco,
  p,
}) => {
  const frame = useCurrentFrame();
  const { fps, height } = useVideoConfig();
  const t = inicioBloco + frame / fps;
  const pop = spring({ frame, fps, config: { damping: 13, mass: 0.5 } });
  const e = p.estilo;
  return (
    <div
      style={{
        position: "absolute",
        top: e.posicaoY * height,
        width: "100%",
        padding: "0 90px",
        transform: `translateY(-50%) scale(${interpolate(pop, [0, 1], [0.75, 1])})`,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        columnGap: "0.5em",
        fontFamily: e.fonte,
        fontWeight: pesoDaFonte(e.fonte),
        fontSize: e.tamanho,
        lineHeight: 1.12,
        textTransform: e.caixaAlta ? "uppercase" : "none",
        ...contorno(e.corContorno, Math.round(e.tamanho * 0.12)),
        textShadow: "0 8px 22px rgba(0,0,0,.55)",
      }}
    >
      {palavras.map((w, i) => {
        const falando = t >= w.inicio && t < w.fim;
        const cor = falando ? e.corFalada : w.destaque ? e.corEnfase : e.corTexto;
        return (
          <span
            key={i}
            style={{
              color: cor,
              display: "inline-block",
              transform: `scale(${falando ? 1.06 : 1})`,
            }}
          >
            {w.texto}
          </span>
        );
      })}
    </div>
  );
};

const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        background: "white",
        opacity: interpolate(frame, [0, 5], [0.55, 0], { extrapolateRight: "clamp" }),
      }}
    />
  );
};

const Cta: React.FC<{ texto: string; p: LolShortProps }> = ({ texto, p }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 8 } });
  const pulso = 1 + 0.05 * Math.sin((frame / fps) * Math.PI * 4);
  return (
    <div
      style={{
        position: "absolute",
        top: 620,
        width: "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          border: `8px solid ${p.tema.corDestaque}`,
          background: "rgba(0,0,0,.72)",
          color: "white",
          fontFamily: p.estilo.fonte,
          fontWeight: pesoDaFonte(p.estilo.fonte),
          fontSize: 84,
          padding: "22px 46px",
          borderRadius: 26,
          textTransform: "uppercase",
          transform: `scale(${pop * pulso})`,
          textAlign: "center",
          maxWidth: 920,
        }}
      >
        {texto}
      </div>
    </div>
  );
};

// ---------- Composição ----------

const blocosDaCena = (c: CenaT, n: number) => {
  const out: PalavraT[][] = [];
  for (let i = 0; i < c.palavras.length; i += Math.max(1, n)) {
    out.push(c.palavras.slice(i, i + Math.max(1, n)));
  }
  return out;
};

export const LolShort: React.FC<LolShortProps> = (p) => {
  const { fps, durationInFrames } = useVideoConfig();
  const frame = useCurrentFrame();
  const f = (s: number) => Math.round(s * fps);

  // espera a fonte carregar antes de renderizar (sem isso o 1º quadro sai com fonte padrão)
  const [handle] = useState(() => delayRender("fonte"));
  useEffect(() => {
    const peso = pesoDaFonte(p.estilo.fonte);
    Promise.all([
      document.fonts.load(`${peso} 80px "${p.estilo.fonte}"`),
      document.fonts.load(`${pesoDaFonte(p.estilo.fonte)} 80px "${p.estilo.fonte}"`, "ÁÉÍÓÚÇ"),
    ])
      .catch(() => undefined)
      .finally(() => continueRender(handle));
  }, [handle, p.estilo.fonte]);

  const cenas = p.trilha.cenas;
  const hookDur = f(p.hook.duracao ?? 2.4);
  const usaVideo = p.fundo.tipo === "video" && !!p.fundo.url;
  const porCena = usaVideo && p.fundo.cortesPorCena;
  const ctaDur = f(2.2);
  const viral = p.layout === "viral";
  const temQuadro = !viral && !!p.efeitos.quadro && cenas.some((c) => (c.provas || []).length);

  return (
    <AbsoluteFill style={{ backgroundColor: p.tema.cor1 }}>
      {/* fundo */}
      {viral ? (
        <FundoViral cenas={cenas} duracao={p.trilha.duracao + 0.5} midia={p.midia || null} gameplay={usaVideo ? { url: p.fundo.url!, inicio: p.fundo.inicio } : null} />
      ) : null}
      {temQuadro ? <Quadro cenas={cenas} cor1={p.tema.cor1} cor2={p.tema.cor2} /> : null}
      {!viral && !usaVideo && !temQuadro ? <FundoGradiente tema={p.tema} /> : null}
      {!viral && usaVideo && !porCena && !temQuadro ? (
        <VideoFundo url={p.fundo.url!} inicio={p.fundo.inicio ?? 0} volume={p.fundo.volume ?? 0} zoom={false} />
      ) : null}
      {!viral && porCena && !temQuadro
        ? cenas.map((c, i) => {
            const de = i === 0 ? 0 : f(c.inicio);
            const ate = i === cenas.length - 1 ? durationInFrames : f(cenas[i + 1].inicio);
            const base = (p.fundo.inicio ?? 0) + c.inicio;
            return (
              <Sequence key={`v${i}`} from={de} durationInFrames={Math.max(1, ate - de)}>
                <VideoFundo
                  url={p.fundo.url!}
                  inicio={c.clipeInicio ?? base}
                  volume={p.fundo.volume ?? 0}
                  zoom={p.efeitos.zoomPunch}
                />
              </Sequence>
            );
          })
        : null}
      {/* escurece um pouco para a legenda ler bem */}
      {!viral && usaVideo && !temQuadro ? (
        <AbsoluteFill
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,.35) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 55%, rgba(0,0,0,.45) 100%)",
          }}
        />
      ) : null}

      {/* zoom punch no fundo gradiente também */}
      {/* textos por cena */}
      {cenas.map((c, i) => {
        const de = f(c.inicio);
        const ate = i === cenas.length - 1 ? f(c.fim) + f(0.3) : f(cenas[i + 1].inicio);
        const escondeTexto = p.efeitos.hook && i === 0 && hookDur > 0;
        return (
          <Sequence key={`c${i}`} from={de} durationInFrames={Math.max(1, ate - de)} layout="none">
            {c.textoTela && !escondeTexto && !temQuadro && !(viral && (c.provas || []).length) ? <TextoTela texto={c.textoTela} p={p} /> : null}
            {i > 0 && p.efeitos.flash ? (
              <Sequence durationInFrames={6} layout="none">
                <Flash />
              </Sequence>
            ) : null}
          </Sequence>
        );
      })}

      {/* estilo viral: provas viram figurinhas no topo, na hora da palavra-gatilho */}
      {viral ? <Figurinhas cenas={cenas} /> : null}

      {/* legendas */}
      {cenas.flatMap((c, ci) =>
        blocosDaCena(c, p.estilo.palavrasPorBloco).map((b, bi, todos) => {
          const ini = b[0].inicio;
          const prox =
            todos[bi + 1]?.[0].inicio ?? Math.min(b[b.length - 1].fim + 0.35, cenas[ci + 1]?.inicio ?? 1e9);
          const de = f(ini);
          return (
            <Sequence key={`l${ci}-${bi}`} from={de} durationInFrames={Math.max(1, f(prox) - de)} layout="none">
              <BlocoLegenda palavras={b} inicioBloco={ini} p={p} />
            </Sequence>
          );
        }),
      )}

      {/* gancho */}
      {p.efeitos.hook && p.hook.texto ? (
        <Sequence durationInFrames={hookDur} layout="none">
          <Hook texto={p.hook.texto} p={p} dur={hookDur} />
        </Sequence>
      ) : null}

      {/* CTA no final */}
      {p.cta.ativo && p.cta.texto ? (
        <Sequence from={Math.max(0, durationInFrames - ctaDur)} layout="none">
          <Cta texto={p.cta.texto} p={p} />
        </Sequence>
      ) : null}

      {/* barra de progresso */}
      {p.efeitos.barraProgresso ? (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            height: 12,
            width: `${(frame / Math.max(1, durationInFrames - 1)) * 100}%`,
            background: p.tema.corDestaque,
            boxShadow: `0 0 18px ${p.tema.corDestaque}`,
          }}
        />
      ) : null}

      {/* selo do patch */}
      {p.efeitos.patch !== false && p.patch ? (
        <div
          style={{
            position: "absolute",
            top: 150,
            right: 40,
            padding: "10px 22px",
            borderRadius: 999,
            background: "rgba(0,0,0,.6)",
            border: `3px solid ${p.tema.corDestaque}`,
            color: "white",
            fontFamily: p.estilo.fonte,
            fontWeight: pesoDaFonte(p.estilo.fonte),
            fontSize: 38,
            letterSpacing: 1,
          }}
        >
          {p.patch}
        </div>
      ) : null}

      {/* áudio */}
      {p.audio ? <Audio src={p.audio} /> : null}
      {p.musica?.url ? <Audio src={p.musica.url} volume={p.musica.volume} loop /> : null}
    </AbsoluteFill>
  );
};

// Exemplo usado como padrão no Remotion Studio
export const exemploLol: LolShortProps = {
  trilha: {
    duracao: 4,
    cenas: [
      {
        inicio: 0,
        fim: 2,
        palavras: [
          { texto: "Essa", inicio: 0, fim: 0.4 },
          { texto: "build", inicio: 0.4, fim: 0.8, destaque: true },
          { texto: "é", inicio: 0.8, fim: 1 },
          { texto: "proibida", inicio: 1, fim: 1.8, destaque: true },
        ],
      },
      {
        inicio: 2,
        fim: 4,
        textoTela: "+40% DANO",
        palavras: [
          { texto: "e", inicio: 2, fim: 2.2 },
          { texto: "ninguém", inicio: 2.2, fim: 2.7 },
          { texto: "usa", inicio: 2.7, fim: 3.1 },
        ],
      },
    ],
  },
  audio: null,
  fundo: { tipo: "gradiente", url: null, inicio: 0, cortesPorCena: false, volume: 0 },
  musica: { url: null, volume: 0.12 },
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
  efeitos: { hook: true, barraProgresso: true, flash: true, zoomPunch: true, patch: true },
  tema: { cor1: "#010A13", cor2: "#0A323C", corDestaque: "#C8AA6E" },
  patch: "Patch 16.22",
  hook: { texto: "BUILD PROIBIDA", duracao: 2.4 },
  cta: { texto: "Comenta qual campeão!", ativo: true },
};
