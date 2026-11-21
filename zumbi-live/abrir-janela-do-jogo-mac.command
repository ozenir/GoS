#!/bin/bash
# Mac: abre a janela em pé só com o jogo, que não congela quando fica atrás de outra janela.
cd "$(dirname "$0")"
URL="http://localhost:8081/#live"
for APP in "Google Chrome" "Microsoft Edge" "Brave Browser"; do
  if [ -d "/Applications/$APP.app" ] || [ -d "$HOME/Applications/$APP.app" ]; then
    open -na "$APP" --args --app="$URL" --window-size=540,990 \
      --user-data-dir="$PWD/.janela-do-jogo" --no-first-run \
      --disable-backgrounding-occluded-windows --disable-renderer-backgrounding \
      --disable-background-timer-throttling --autoplay-policy=no-user-gesture-required
    exit 0
  fi
done
echo "Não achei o Chrome. Instale o Google Chrome (recomendado) ou abra no navegador: $URL"
open "$URL"
