import {
  AbsoluteFill,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const Teste: React.FC<{ texto: string }> = ({ texto }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Entrada com mola, leve "respiração" e saída em fade no último segundo
  const entrada = spring({ frame, fps, config: { damping: 12 } });
  const pulso = 1 + 0.04 * Math.sin((frame / fps) * Math.PI * 2);
  const saida = interpolate(
    frame,
    [durationInFrames - fps, durationInFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  const giro = interpolate(entrada, [0, 1], [-12, 0]);

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(160deg, #1b1f3b 0%, #6a1b9a 55%, #ff5e62 100%)",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <div
        style={{
          fontFamily: "Arial Black, Arial, Helvetica, sans-serif",
          fontWeight: 900,
          fontSize: 220,
          color: "white",
          textShadow: "0 12px 40px rgba(0,0,0,0.45)",
          transform: `scale(${entrada * pulso}) rotate(${giro}deg)`,
          opacity: saida,
        }}
      >
        {texto}
      </div>
    </AbsoluteFill>
  );
};
