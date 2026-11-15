# Shorts — edição automatizada de vídeos verticais

Projeto para editar vídeos curtos verticais (YouTube Shorts, TikTok, Reels) em
**1080x1920, 30fps**, com FFmpeg + faster-whisper + Remotion. Fale com o usuário
em **português do Brasil**.

## Pastas

| Pasta          | Conteúdo                                                        |
|----------------|-----------------------------------------------------------------|
| `referencias/` | vídeos de exemplo do estilo de edição desejado (analisar, não publicar) |
| `brutos/`      | vídeos originais do usuário, sem edição                         |
| `musicas/`     | trilhas sonoras (use só músicas livres de direitos)             |
| `saida/`       | vídeos finalizados                                              |
| `src/`         | composições Remotion (`Teste`, `Short`)                         |
| `scripts/`     | automações (instalar, cortar silêncios, legendas, montar)       |
| `public/atual/`| área temporária que o `montar.sh` preenche para o Remotion       |

Mídia (`referencias/`, `brutos/`, `musicas/`, `saida/`) está no `.gitignore`:
vídeos não vão para o git.

## Preparar a máquina

```bash
scripts/instalar.sh
```

Cria `.venv/` (yt-dlp, faster-whisper) e instala o Remotion (`node_modules/`).
Requer Node.js LTS, Python 3 e FFmpeg já no sistema. Ferramentas Python sempre
via `.venv/bin/...`.

## Fluxo de trabalho (um vídeo)

### 1. Remover silêncios (FFmpeg)

```bash
.venv/bin/python scripts/cortar_silencios.py brutos/video.mp4
# -> brutos/video_semsilencio.mp4
```

Usa `ffmpeg -af silencedetect` para achar os silêncios e corta com
`trim/atrim + concat`. Ajustes:
- `--limiar -35` (dB): suba para -30 se houver ruído de fundo; desça para -40 se cortar fala baixa.
- `--min 0.5` (s): silêncio mínimo para cortar. Ritmo mais "picotado": 0.3.
- `--margem 0.12` (s): respiro mantido em volta da fala; menos que 0.08 soa cortado.

Se o bruto for horizontal, recorte para vertical antes (ou depois) com:
`ffmpeg -i in.mp4 -vf "crop=ih*9/16:ih,scale=1080:1920" -c:a copy out.mp4`

### 2. Gerar legendas (faster-whisper)

```bash
.venv/bin/python scripts/legendas.py brutos/video_semsilencio.mp4 --modelo small
# -> brutos/video_semsilencio.srt  (legenda para subir na plataforma)
# -> brutos/video_semsilencio.json (palavras com tempo, para o Remotion)
```

Sempre gerar a legenda **depois** de cortar os silêncios (os tempos precisam
bater com o vídeo final). Revise o `.json` para corrigir nomes próprios e gírias
antes de montar. Modelos: `small` (padrão), `medium`/`large-v3` (melhor, mais lento).

### 3. Montar no Remotion

```bash
scripts/montar.sh brutos/video_semsilencio.mp4 saida/nome-do-video.mp4 [musicas/trilha.mp3]
```

Copia vídeo/música para `public/atual/`, gera `public/atual/props.json` e
renderiza a composição `Short` (`src/Short.tsx`):
- vídeo em tela cheia (`objectFit: cover`);
- legenda em blocos de 3 palavras, caixa alta, contorno preto, palavra falada em amarelo,
  posicionada a 420px do rodapé (fora dos botões do YouTube/TikTok);
- música em loop com volume 0.12 (abaixo da voz).

Para mudar o estilo da edição, edite `src/Short.tsx` (ou crie novas composições
em `src/` e registre em `src/Root.tsx`). Para pré-visualizar: `npm run studio`.

### 4. Exportar

O resultado vai para `saida/`, em H.264 + AAC, `yuv420p`, 1080x1920@30 —
pronto para YouTube Shorts e TikTok. Conferir com:
`ffprobe -v error -show_entries stream=width,height,r_frame_rate -show_entries format=duration saida/nome.mp4`

Teste rápido do ambiente: `npm run teste` → `saida/teste.mp4`.

## Referências de estilo

Para analisar um vídeo de `referencias/`: extrair quadros
(`ffmpeg -i ref.mp4 -vf fps=1,scale=360:-1 /tmp/ref_%03d.png`), olhar fonte,
cor e posição das legendas, ritmo dos cortes, zooms, efeitos sonoros, e replicar
em `src/Short.tsx`. `yt-dlp` (`.venv/bin/yt-dlp URL -o referencias/%(title)s.%(ext)s`)
baixa referências — só para estudo, não republicar conteúdo de terceiros.

## Particularidades da nuvem (Claude Code na web)

- O contêiner é temporário: ao abrir uma sessão nova, rode `scripts/instalar.sh`.
  Vídeos em `saida/` precisam ser baixados pelo usuário antes de a sessão acabar.
- O Remotion não consegue baixar o próprio Chrome lá; `remotion.config.ts` usa o
  Chrome Headless Shell em `/opt/pw-browsers/...` quando ele existe
  (ou o caminho em `REMOTION_CHROME`). Em outra máquina, o Remotion baixa o dele.
- O modelo do Whisper é baixado de `huggingface.co`, e o `yt-dlp` precisa do
  YouTube: ambos dependem da política de rede do ambiente permitir esses domínios.

## Licença do Remotion

Gratuito para pessoa física e empresas com até 3 funcionários. Acima disso exige
licença paga (remotion.dev/license).
