/**
 * Normalização das imagens enviadas: valida o conteúdo real (não apenas a
 * extensão), corrige a orientação EXIF de fotos de celular, aplica a
 * rotação pedida pelo professor e reduz a resolução para um tamanho adequado
 * à leitura pela IA.
 */
import sharp from "sharp";
import { config } from "./config.ts";

export class ImageError extends Error {}

const ACCEPTED = new Set(["jpeg", "png", "webp"]);

export async function normalizeImage(input: Buffer, rotate: number): Promise<Buffer> {
  let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    meta = await sharp(input).metadata();
  } catch {
    throw new ImageError("Não foi possível ler a imagem. Envie um arquivo JPG, PNG ou WEBP válido.");
  }
  if (!meta.format || !ACCEPTED.has(meta.format)) {
    throw new ImageError("Formato não suportado. Envie uma imagem JPG, JPEG, PNG ou WEBP.");
  }
  if ((meta.width ?? 0) < 120 || (meta.height ?? 0) < 120) {
    throw new ImageError("A imagem é pequena demais para ser lida com segurança. Envie uma foto com mais resolução.");
  }
  const angle = [0, 90, 180, 270].includes(rotate) ? rotate : 0;
  return sharp(input)
    .rotate() // orientação EXIF
    .rotate(angle)
    .flatten({ background: "#ffffff" })
    .resize({ width: config.upload.maxEdge, height: config.upload.maxEdge, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
