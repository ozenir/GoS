import { existsSync } from "node:fs";
import { Config } from "@remotion/cli/config";

Config.setEntryPoint("src/index.ts");
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
Config.setCodec("h264");
Config.setPixelFormat("yuv420p"); // compatível com YouTube/TikTok/celulares

// Na nuvem do Claude Code o download do Chrome do Remotion é bloqueado;
// usamos o Chrome Headless Shell que já vem instalado lá. Em outra máquina,
// se o caminho não existir, o Remotion baixa o dele normalmente.
const chromeLocal =
  process.env.REMOTION_CHROME ??
  "/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell";
if (existsSync(chromeLocal)) {
  Config.setBrowserExecutable(chromeLocal);
}
