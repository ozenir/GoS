# Estilo viral — análise dos Shorts de LoL que mais crescem

Coleta de 17/11/2026: `scripts/virais.py` mediu 478 Shorts e TikToks de LoL dos últimos 10 dias
(`dados/virais/2026-11-17.json`). Métrica principal: **velocidade** = visualizações por hora desde a publicação.

- **TikTok**: perfis grandes de LoL (`CONTAS_TIKTOK`), porque a busca e as hashtags do TikTok bloqueiam robôs.
- **YouTube Shorts**: buscas com os filtros “Shorts de hoje” e “Shorts desta semana”. O YouTube não entrega a data
  exata a robôs, então a idade é o limite do filtro e a velocidade é um mínimo. Os vídeos do YouTube não são baixados
  (o YouTube bloqueia o download para robôs; não contornamos isso). Os quadros analisados são as miniaturas e prévias
  que a própria busca entrega.

O resumo que aparece no Estúdio (painel **⚡ Estilo viral**) fica em `dados/virais/atual.json`, gravado também no
banco em `virais/atual`.

## O que os modelos fazem

| Modelo | Velocidade | Formato |
|---|---|---|
| Ilha das Lendas: “🚨 LOL 2 com Morgana curando…” (TikTok, 68 s) | ~6,6 mil views/h | Tela dividida: rosto em cima, imagem oficial embaixo. Manchete nos 2 primeiros segundos, legenda amarela de uma linha, imagem trocando a cada ~3 s |
| Ilha das Lendas: “🚨 Não vai ter runas no LoL 2” (TikTok, 55 s) | ~5,1 mil/h | Polêmica numa frase, imagem do anúncio, opinião e pergunta no fim |
| Skill Capped: “The Most BROKEN Change Nobody Noticed” (YouTube) | ≥4,2 mil/h | Splash e gameplay em tela cheia, legenda de 1 palavra, corte a cada 2–3 s |
| LoocaLoL: “The secret to beating ANY ranged top” (YouTube) | ≥3,2 mil/h | Câmera do criador em cima, partida embaixo, uma dica só |
| Shorts de build (Pyke tank, 60% de vitória) | ≥1,3 mil/h | Gameplay numa faixa vertical no meio e as laterais desfocadas; número no gancho |

Os vídeos de esporte eletrônico (lolesports) são os mais rápidos de todos, mas vivem de clipes oficiais de partidas
que só a Riot pode publicar; não servem de modelo para o canal.

## O que mudou no Estúdio

| | Os virais | Antes | Agora (estilo viral) |
|---|---|---|---|
| Fundo | Gameplay ou imagem oficial o vídeo todo | Quadro de investigação cobrindo a tela | Vídeos das habilidades e splash do campeão em destaque |
| Ritmo | Corte a cada 2–3 s | Troca por cena (5–8 s) | Corte a cada 2,4 s com tranco de zoom |
| Números | Texto curto por cima do jogo | Cartões grandes no quadro | Figurinhas compactas no topo, uma por vez, na palavra-gatilho |
| Legenda | 1–2 palavras grandes, amarelo | 3 palavras | 2 palavras, tamanho 108 |
| Habilidade citada | Aparece no momento da fala | Só com vídeo marcado na cena | Automático: a fala cita Q/W/E/R, “ult”, “passiva” ou o nome e o vídeo entra |
| Rosto do criador | Tela dividida com câmera | Não tem | Ainda não: precisa de gravação do criador |

## Como funciona (código)

- `src/Viral.tsx`: `montarTrilhaViral` escolhe a imagem de cada trecho de 2,4 s (vídeo marcado na cena → habilidade
  citada → rodízio de gameplay do usuário, splash e vídeos). Sem campeão em destaque, as fotos das provas da cena viram
  o fundo; com campeão, fotos de outros campeões ficam só na figurinha (o foco é sempre o campeão do vídeo).
  Os vídeos horizontais das habilidades ficam numa faixa de 1150 px no meio, centrados no `foco` medido do campeão,
  com a splash desfocada em volta. `Figurinhas` mostra as provas no topo depois do gancho.
- `src/LolShort.tsx`: `layout: "viral"` troca o quadro pelo `FundoViral` + `Figurinhas`.
- `painel/projetos.mjs`: `layout` no config (padrão `"quadro"`) e `midia` montada de `biblioteca/campeoes/<Id>/`.
- Página: `config/biblioteca` (assets de splash e vídeos por campeão) alimenta o player; painel ⚡ Estilo viral com
  Aplicar / Gerar prévia / Aprovar e produzir final; seletor “Estilo do vídeo” na aba Visual & voz.

## Campeão novo no estilo viral

```bash
.venv/bin/python scripts/biblioteca.py campeao "Nome"
python3 scripts/biblioteca_estudio.py Nome        # lista o que falta enviar
```

Envie os arquivos listados como assets do Artifact, anote os ids em `dados/assets.json`, rode
`scripts/biblioteca_estudio.py` com todos os campeões já enviados e grave `dados/biblioteca-estudio.json` em
`config/biblioteca`. O render local não depende disso (lê a biblioteca do disco); é só para o player da página.
