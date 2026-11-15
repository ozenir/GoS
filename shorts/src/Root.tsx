import { Composition } from "remotion";
import { Teste } from "./Teste";
import { Short, ShortProps } from "./Short";
import { LolShort, LolShortProps, duracaoEmFrames, exemploLol } from "./LolShort";

// Padrão do projeto: vertical 1080x1920 a 30fps (Shorts / TikTok / Reels)
export const LARGURA = 1080;
export const ALTURA = 1920;
export const FPS = 30;

const padraoShort: ShortProps = {
  video: "atual/video.mp4",
  duracao: 5,
  legendas: [],
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="Teste"
        component={Teste}
        durationInFrames={5 * FPS}
        fps={FPS}
        width={LARGURA}
        height={ALTURA}
        defaultProps={{ texto: "Teste" }}
      />
      <Composition
        id="Short"
        component={Short}
        fps={FPS}
        width={LARGURA}
        height={ALTURA}
        durationInFrames={5 * FPS}
        defaultProps={padraoShort}
        // a duração vem das props (segundos do vídeo já sem silêncios)
        calculateMetadata={({ props }) => ({
          durationInFrames: Math.max(1, Math.ceil(props.duracao * FPS)),
        })}
      />
      <Composition
        id="LolShort"
        component={LolShort}
        fps={FPS}
        width={LARGURA}
        height={ALTURA}
        durationInFrames={150}
        defaultProps={exemploLol}
        // duração = narração (trilha) + meio segundo
        calculateMetadata={({ props }: { props: LolShortProps }) => ({
          durationInFrames: duracaoEmFrames(props),
        })}
      />
    </>
  );
};
