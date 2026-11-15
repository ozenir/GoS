#!/usr/bin/env bash
# Instala as dependências do projeto (rode uma vez por máquina / sessão nova na nuvem).
set -euo pipefail
cd "$(dirname "$0")/.."
for c in node npm python3 ffmpeg ffprobe; do
  command -v "$c" >/dev/null || { echo "Falta '$c' no sistema — instale antes (apt/brew/winget)."; exit 1; }
done
[ -d .venv ] || python3 -m venv .venv
.venv/bin/pip install -q --upgrade pip
.venv/bin/pip install -q yt-dlp faster-whisper
npm install --no-audit --no-fund
echo "OK: node $(node -v), $(ffmpeg -version | head -1 | cut -d' ' -f1-3), yt-dlp $(.venv/bin/yt-dlp --version)"
