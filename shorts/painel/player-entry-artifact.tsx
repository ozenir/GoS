// Player ao vivo do Artifact (sem fontes embutidas): o mesmo componente que o Remotion renderiza.
import { Player, PlayerRef } from "@remotion/player";
import { createRef } from "react";
import { createRoot, Root } from "react-dom/client";
import { FONTES } from "../src/fontes";
import { LolShort, LolShortProps, duracaoEmFrames, exemploLol, FPS_LOL } from "../src/LolShort";

let raiz: Root | null = null;
const ref = createRef<PlayerRef>();

function desenhar(props: LolShortProps) {
  raiz!.render(
    <Player
      ref={ref}
      component={LolShort}
      inputProps={props}
      durationInFrames={duracaoEmFrames(props)}
      fps={FPS_LOL}
      compositionWidth={1080}
      compositionHeight={1920}
      style={{ width: "100%", height: "100%" }}
      controls
      loop
      clickToPlay
      allowFullscreen
      acknowledgeRemotionLicense
    />,
  );
}

(window as any).EstudioPlayer = {
  fontes: FONTES,
  exemplo: exemploLol,
  montar(el: HTMLElement, props: LolShortProps) {
    raiz = createRoot(el);
    desenhar(props);
  },
  atualizar(props: LolShortProps) {
    if (raiz) desenhar(props);
  },
  irPara(segundos: number) {
    ref.current?.seekTo(Math.round(segundos * FPS_LOL));
  },
};
