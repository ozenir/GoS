import {
  AbsoluteFill,
  Audio,
  OffthreadVideo,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export type Palavra = { texto: string; inicio: number; fim: number };

export type ShortProps = {
  video: string; // arquivo dentro de public/ (ex.: "atual/video.mp4")
  duracao: number; // segundos (pegue com ffprobe)
  legendas: Palavra[]; // JSON gerado por scripts/legendas.py
  musica?: string; // arquivo dentro de public/ (opcional)
  volumeMusica?: number; // 0 a 1 (padrão 0.12, fica embaixo da voz)
  palavrasPorBloco?: number; // quantas palavras aparecem juntas (padrão 3)
};

// Agrupa palavras em blocos curtos, estilo legenda de Shorts/TikTok
const blocos = (pal: Palavra[], n: number) => {
  const out: Palavra[][] = [];
  for (let i = 0; i < pal.length; i += n) out.push(pal.slice(i, i + n));
  return out;
};

const Bloco: React.FC<{ palavras: Palavra[]; inicioBloco: number }> = ({
  palavras,
  inicioBloco,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = inicioBloco + frame / fps;
  const pop = spring({ frame, fps, config: { damping: 14, mass: 0.6 } });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 420, // fora da área de botões do YouTube/TikTok
        width: "100%",
        padding: "0 80px",
        textAlign: "center",
        transform: `scale(${interpolate(pop, [0, 1], [0.8, 1])})`,
        fontFamily: "Arial Black, Arial, Helvetica, sans-serif",
        fontWeight: 900,
        fontSize: 86,
        lineHeight: 1.15,
        textTransform: "uppercase",
        WebkitTextStroke: "10px black",
        paintOrder: "stroke fill",
      }}
    >
      {palavras.map((p, i) => {
        const falando = t >= p.inicio && t < p.fim;
        return (
          <span key={i} style={{ color: falando ? "#FFE600" : "white" }}>
            {p.texto}{" "}
          </span>
        );
      })}
    </div>
  );
};

export const Short: React.FC<ShortProps> = ({
  video,
  legendas,
  musica,
  volumeMusica = 0.12,
  palavrasPorBloco = 3,
}) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <OffthreadVideo
        src={staticFile(video)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      {musica ? <Audio src={staticFile(musica)} volume={volumeMusica} loop /> : null}
      {blocos(legendas, palavrasPorBloco).map((b, i, todos) => {
        const ini = b[0].inicio;
        const prox = todos[i + 1]?.[0].inicio ?? b[b.length - 1].fim + 0.3;
        const from = Math.round(ini * fps);
        const dur = Math.max(1, Math.round(prox * fps) - from);
        return (
          <Sequence key={i} from={from} durationInFrames={dur} layout="none">
            <Bloco palavras={b} inicioBloco={ini} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
