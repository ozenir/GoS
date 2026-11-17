#!/usr/bin/env bash
# Monta um Short no Remotion a partir de um vídeo já processado.
# Uso: scripts/montar.sh brutos/video_semsilencio.mp4 saida/nome.mp4 [musicas/trilha.mp3]
# Espera encontrar <video>.json (gerado por scripts/legendas.py) ao lado do vídeo.
set -euo pipefail
cd "$(dirname "$0")/.."
VIDEO="$1"; SAIDA="$2"; MUSICA="${3:-}"
JSON="${VIDEO%.*}.json"
[ -f "$JSON" ] || { echo "Falta $JSON — rode scripts/legendas.py antes."; exit 1; }

rm -rf public/atual && mkdir -p public/atual
cp "$VIDEO" public/atual/video.mp4
DUR=$(ffprobe -v error -show_entries format=duration -of default=nw=1:nk=1 "$VIDEO")
MUS=null
if [ -n "$MUSICA" ]; then
  cp "$MUSICA" "public/atual/musica.${MUSICA##*.}"
  MUS="\"atual/musica.${MUSICA##*.}\""
fi
node -e '
const fs=require("fs");
const [dur,json,mus]=process.argv.slice(1);
fs.writeFileSync("public/atual/props.json", JSON.stringify({
  video:"atual/video.mp4", duracao:Number(dur),
  legendas:JSON.parse(fs.readFileSync(json,"utf8")), musica:JSON.parse(mus)??undefined
}));' "$DUR" "$JSON" "$MUS"
npx remotion render Short "$SAIDA" --props=public/atual/props.json
echo "Pronto: $SAIDA"
