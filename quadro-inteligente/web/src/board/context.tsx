import { createContext, useContext, type RefObject } from "react";

export type BoardFormat = "wide" | "reels";

export interface BoardCtx {
  format: BoardFormat;
  /** URL da foto original da questão (ou null). */
  imageUrl: string | null;
  /** Contêiner de conteúdo do quadro (referência para conectores). */
  contentRef: RefObject<HTMLDivElement | null>;
  /** Camada de sobreposição para desenhos entre elementos (conectores). */
  overlay: HTMLDivElement | null;
}

export const BoardContext = createContext<BoardCtx>({
  format: "wide",
  imageUrl: null,
  contentRef: { current: null },
  overlay: null,
});

export const useBoard = () => useContext(BoardContext);
