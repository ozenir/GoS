#!/bin/bash
# Mac/Linux: liga o programa. Use "./iniciar-mac.command --demo" para o modo teste.
cd "$(dirname "$0")"
if ! command -v node >/dev/null 2>&1; then
  echo "Instale o Node.js (versão LTS) em https://nodejs.org e abra de novo."; read -r; exit 1
fi
[ -d node_modules/tiktok-live-connector ] || npm install --omit=dev --no-audit --no-fund || { read -r; exit 1; }
node servidor.js "$@"
