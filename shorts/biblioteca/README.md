# Biblioteca de mídia por campeão

Tudo o que um vídeo precisa de um campeão fica em `campeoes/<Id>/` (Id do Data Dragon: `JarvanIV`,
`KSante`, `Chogath`…). É baixado uma vez e reaproveitado em todos os vídeos.

| Arquivo                | O que é                                                                 |
|------------------------|-------------------------------------------------------------------------|
| `dados.json`           | nome, chave, versão do Data Dragon, habilidades (recarga, custo, alcance) e lista de vídeos com duração |
| `arte.jpg`, `icone.png`| arte de carregamento (fotos do quadro) e ícone quadrado (centro do círculo de alcance) |
| `habilidades/<X>.png`  | ícones da passiva (`P`) e de `Q`, `W`, `E`, `R`                          |
| `videos/<X>.mp4`       | vídeo oficial da habilidade (páginas de campeão da Riot), sem som; `Q2.mp4`… quando há mais de um |
| `quadros/<X>.jpg`      | um quadro do começo do vídeo: o chão do jogo, fundo da prova de alcance  |
| `interacoes/`          | clipes de interações e jogadas (gravados pelo usuário ou montados depois) |

```bash
.venv/bin/python scripts/biblioteca.py campeao Xerath "Jarvan IV"   # baixa só o que falta
.venv/bin/python scripts/biblioteca.py listar
```

Ao usar um arquivo num vídeo, envie-o ao Estúdio (`Artifact publish asset:true`) uma vez e registre
`caminho -> assetId` em `dados/assets.json`: da próxima vez, reaproveite o mesmo asset.
