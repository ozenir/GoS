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
| `src/`         | composições Remotion (`Teste`, `Short`, `LolShort`)             |
| `artifact/`    | Estúdio Shorts publicado no claude.ai (página + player)         |
| `painel/`      | servidor local, render, ponte com o Artifact, CLI               |
| `projetos/`    | um diretório por vídeo do painel (briefing, roteiro, config)    |
| `docs/`        | `viral-lol.md`: guia de otimização de roteiros de LoL           |
| `dados/`       | dados oficiais do Data Dragon (`scripts/ddragon.py`), por vídeo e `ddragon/resumo.json` |
| `roteiros/`    | roteiros em Markdown: fala + `[o que aparece na tela]`         |
| `publicacao/`  | título, descrição (com patch e aviso da Riot) e hashtags       |
| `clipes/`      | gameplay gravado pelo usuário (Ferramenta de Treino)           |
| `scripts/`     | automações (instalar, cortar silêncios, legendas, montar)       |
| `public/atual/`| área temporária que o `montar.sh` preenche para o Remotion       |

Mídia (`referencias/`, `brutos/`, `musicas/`, `saida/`) está no `.gitignore`:
vídeos não vão para o git.

## Estúdio Shorts no claude.ai (Artifact) — fluxo principal

O usuário usa o estúdio dentro do Claude: **https://claude.ai/artifact/DVKauETTpSPB5qkWRwYavF**
(fonte: `artifact/estudio.html` + `artifact/player.js`, gerado por `node painel/build.mjs`;
republicar com a ferramenta Artifact no mesmo `file_path`, `files: {"player.js": "artifact/player.js"}`).
Capacidades: `db` (dados), `assets` (vídeos), `sample` (otimização feita pela própria página
com a conta do usuário), `downloads`.

Banco da página (ferramenta `ArtifactData`, `url` acima):
- `projetos/<id>`: `{titulo, briefing, otimizado, config, etapa, pedido, criadoEm, atualizado}`.
  `config.fundo.asset` / `config.musica.asset` = `{id, nome}` de assets enviados.
- `projetos/<id>/eventos/<auto>`: `{t, msg, tipo: info|ok|claude|erro}` — linha do tempo.
- `projetos/<id>/producao/estado`: escrito pelo Claude Code —
  `{etapa, progresso, texto, hash, trilha, audio: {id}, renders: [{id, nome, qualidade, bytes, data}]}`.
- `midias/<auto>`: `{id, nome, tipo: gameplay|musica, bytes, criadoEm}`.

Etapas (`projetos/<id>.etapa`): briefing → otimizando → otimizado (ou aguardando_claude
quando o usuário pede a otimização no chat) → aguardando_producao → produzindo → pronto | erro.

**"otimiza o roteiro" (no chat):** leia o projeto (`ArtifactData get`), otimize seguindo
`docs/viral-lol.md` e grave `otimizado` + `etapa: "otimizado"` (update com `if_version`) e um evento.

**"produz o vídeo …" (no chat):**
1. `npm run painel` em segundo plano, se o servidor local (porta 3333) não estiver no ar.
2. `ArtifactData get` do projeto com `out_dir` → `node painel/ponte.mjs importar <arquivo.json> <id>`.
   Se avisar que falta mídia, baixe o asset com `Artifact read` (`path` = id do asset,
   `out_dir` = `brutos/` ou `musicas/`), garanta o nome `<assetId>.mp4` e importe de novo.
3. Marque `etapa: "produzindo"` no projeto e `producao/estado` com `etapa/texto/progresso`.
4. `node painel/ponte.mjs produzir <id> <final|previa>` (narração edge-tts + render Remotion).
5. Envie `projetos/<id>/narracao.mp4` e o MP4 de `saida/<id>/` com `Artifact publish asset:true`
   (só tipos de vídeo/imagem; áudio vai como MP4; limite 15 MB por arquivo).
6. `node painel/ponte.mjs estado <id> --audio <assetId> --render "<assetId>|<nome>|<qualidade>|<bytes>"`
   → grave `projetos/<id>/producao.json` em `producao/estado` (`file_path`), `etapa: "pronto"` no
   projeto e um evento. A página mostra o vídeo e passa a usar a narração real no player.
7. Música em MP3 mandada no chat: converta com `ffmpeg -i x.mp3 -c:a aac -vn x.mp4`, envie como
   asset e adicione um documento em `midias` (`tipo: "musica"`).

O `hash` liga narração e roteiro: `sha1(JSON.stringify([narrações das cenas com texto, voz, velocidade]))`
(12 primeiros hex) — igual em `painel/projetos.mjs` e na página.

## Dados do jogo (Data Dragon) — nunca use números de memória

```bash
.venv/bin/python scripts/ddragon.py campeao Taliyah --outros Jhin,Rakan --pasta dados/<video>
.venv/bin/python scripts/ddragon.py resumo --pasta dados/ddragon   # todos os campeões, itens e runas
```

O resumo vai para o Artifact como asset JSON, apontado por `config/ddragon` (`{versao, patch, assetId}`):
ao sair patch novo, rode `resumo`, envie o arquivo (`Artifact publish asset:true`) e atualize esse doc.
Nomes em pt_BR são os do Data Dragon (ex.: BF Sword = "Espada G. p. C.").

## Guia de matchup (tipo "Matchup: até o 1º item")

No briefing o usuário escolhe rota, seu campeão e os dois times por posição. A página manda ao
Claude (`sample`, nível "complex") os dados dos 10 campeões, a tabela de itens com custo e as runas,
e grava `projetos/<id>.matchup` (`resumo, dificuldade, runas, inicio, fases, contraCada, recall,
primeiroItem, erros`) + o roteiro do Short em `otimizado`. Itens fora do Data Dragon são marcados
"confira". Se o usuário pedir no chat, faça a mesma análise e grave no mesmo formato.

## Vídeos em duas fases (roteiro primeiro, narração gravada depois)

Fase 1: `roteiros/<slug>.md`, lista de clipes para a Ferramenta de Treino, `publicacao/<slug>.txt`,
dados em `dados/<slug>/`; espelhe o projeto no Artifact (`projetos/<slug>`, etapa "otimizado") e PARE.
Fase 2 (quando a narração estiver em `brutos/`): transcrição (faster-whisper), corte de silêncios e
repetições, legendas palavra a palavra, animações, mostrar cortes e cenas ANTES de renderizar,
exportar `saida/<slug>_v1.mp4`.

## Quadro de investigação (provas animadas)

`src/Quadro.tsx`, ligado por `config.efeitos.quadro`. Cada cena tem `provas`:
`{tipo: foto|icone|nota|etiqueta|placar, rotulo, detalhe, imgAsset (Artifact) / imgArquivo (local),
gatilho (palavra da fala que faz aparecer), carimbo, cor (ouro|verde|vermelho|azul|amarelo), riscar,
liga (índice da prova ligada pelo fio, dentro da cena; null = sem fio), pos [dx, dy]}`.
As provas caem presas por alfinete/fita, o fio vermelho liga uma à outra, a câmera chega perto da
prova nova e depois recua para o grupo; carimbos dão tranco na câmera; fotos "revelam" como polaroid.

Imagens: o Claude baixa sozinho as oficiais do jogo do Data Dragon (arte de carregamento
`cdn/img/champion/loading/<Id>_0.jpg` para fotos, ícones de habilidade e de item), envia ao Artifact
(`Artifact publish asset:true`, até 25 por chamada) e registra `caminho local -> assetId` em
`dados/assets.json` (o importador usa esse mapa). O que não é do Data Dragon (gameplay, prints,
logos) o usuário envia pela prova (🖼) na aba Roteiro, que lista as imagens que faltam.
Não usar fotos de pessoas reais (jogadores) sem direito de uso: prefira arte do campeão ou nota.

## Estúdio Shorts local (painel em http://localhost:3333) — alternativa

```bash
npm run painel        # empacota o player e sobe http://localhost:3333
```

Na nuvem, depois de subir, avise o app com `report_preview_port` (porta 3333)
para o usuário abrir o painel. Etapas do painel:

1. **Briefing** — usuário manda título, tipo de vídeo, campeão, duração, tom,
   público, roteiro e orientações → `projetos/<id>/briefing.json`.
2. **Otimização** — botão "enviar para o Claude" grava `etapa: aguardando_claude`
   e uma linha em `painel/pedidos.log`. **Quando isso acontecer (ou o usuário
   pedir no chat), otimize o roteiro seguindo `docs/viral-lol.md`**:
   leia com `node painel/cli.mjs ver <id>`, escreva o JSON no formato do guia e
   grave com `node painel/cli.mjs otimizado <id> arquivo.json`. O painel
   atualiza sozinho e mostra notas, mudanças e o porquê de cada uma.
   Para ver pedidos pendentes: `node painel/cli.mjs listar` (etapa
   "aguardando_claude") ou `tail painel/pedidos.log`.
3. **Roteiro** — usuário ajusta cenas (narração, texto na tela, destaques,
   segundo do gameplay), gancho e CTA.
4. **Visual & voz** — voz edge-tts (Antonio/Francisca/Thalita) e velocidade,
   fundo (animado ou gameplay de `brutos/`, upload pelo painel), música,
   fonte/tamanho/cores/posição da legenda, temas prontos e efeitos.
   "Gerar narração" roda `scripts/narrar.py` → `narracao.m4a` + `trilha.json`
   (tempo de cada palavra vem do TTS; a legenda sai sincronizada).
5. **Exportar** — prévia 540x960 ou final 1080x1920 → `saida/<id>/<id>-vN.mp4`,
   mais kit de publicação (títulos, descrição, hashtags).

Peças: `src/LolShort.tsx` (composição, mesma no player e no render),
`painel/server.mjs` (API + render), `painel/projetos.mjs` (dados),
`painel/app.js` (interface), `painel/player-entry.tsx` (player ao vivo).
O edge-tts precisa do proxy da nuvem (`HTTPS_PROXY`), já tratado no script.

## Preparar a máquina

```bash
scripts/instalar.sh
```

Cria `.venv/` (yt-dlp, faster-whisper, edge-tts) e instala o Remotion (`node_modules/`).
Requer Node.js LTS, Python 3 e FFmpeg já no sistema. Ferramentas Python sempre
via `.venv/bin/...`.

## Fluxo manual (vídeo com a voz do próprio usuário)

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
