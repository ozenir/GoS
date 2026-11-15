# Guia de otimização — Shorts virais de League of Legends

Este é o guia que o Claude segue ao otimizar um roteiro vindo do painel
(`projetos/<id>/briefing.json` → `projetos/<id>/otimizado.json`).

## 1. O que faz um Short de LoL viralizar

O algoritmo de Shorts/TikTok mede principalmente **retenção nos primeiros 3s**,
**% assistido** (passar de 100% = replay) e **interação** (comentário > compartilhar > like).
Tudo no roteiro serve a essas três métricas.

### Regras de ouro

1. **Gancho em até 1,5s.** A primeira frase carrega o vídeo. Nada de "Fala galera",
   "Hoje eu vou mostrar", apresentação de canal ou contexto.
2. **Uma ideia por vídeo.** Se o roteiro tem 3 dicas, ou vira 3 vídeos ou vira
   "3 dicas" com contador na tela.
3. **Lacuna de curiosidade.** Prometa algo no começo e só entregue no final
   ("…e o último é o que mais gente erra").
4. **Frases curtas, faladas.** 6 a 12 palavras por frase. Corte advérbios, "tipo",
   "basicamente", "na verdade". Ritmo de 2,6–3,2 palavras/segundo.
5. **Algo muda a cada 2–3s.** Corte, zoom, texto na tela, número, efeito. Cada
   cena do roteiro = uma mudança visual.
6. **Números concretos.** "+38% de dano", "3 segundos", "1v5", "Diamante em 40 jogos".
7. **Termos do jogo que o público usa:** outplay, flash, ult, combo, snowball,
   gank, smurf, elo, OTP, meta, patch, buff/nerf, build, runa, mid/top/jg/adc/sup.
   Nome de campeão e item escrito certo.
8. **Final que gera comentário ou loop.** Pergunta polêmica ("Qual campeão é mais
   quebrado que esse?"), desafio ("Testa e me conta"), ou última frase que encaixa
   na primeira (loop → replay).
9. **Duração:** 20–40s é o ponto ideal. 45–60s só se cada segundo prende.

### Fórmulas de gancho que funcionam em LoL

| Tipo | Exemplos |
|---|---|
| Segredo / proibido | "A Riot vai nerfar isso semana que vem." · "Ninguém no seu elo sabe disso." |
| Erro do espectador | "Você está buildando o Yasuo errado." · "Pare de dar flash assim." |
| Número + resultado | "Essa build me levou de Prata a Platina em 30 jogos." |
| Desafio | "Um Teemo consegue 1v5? Vamos testar." |
| Reação / absurdo | "Esse é o outplay mais injusto que eu já vi." |
| Comparação | "Mid ou ADC: qual sobe mais rápido em 2026?" |
| Pergunta direta | "Por que o seu Lee Sin nunca acerta o insec?" |
| Notícia | "O patch novo quebrou esse campeão." |

## 2. Estruturas por tipo de vídeo

**Outplay / Jogada** — Gancho na reação ("Ele achou que tinha ganho…") → contexto
mínimo (1 frase: vida, situação) → a jogada (deixar o gameplay falar, texto curto)
→ replay/explicação do truque → pergunta final.

**Dica / Tutorial** — Erro comum como gancho → o porquê em 1 frase → a dica em
passos numerados (texto na tela "1", "2", "3") → prova (resultado, número) → CTA.

**Build / Guia de campeão** — Promessa de resultado ("essa build deleta tanque")
→ itens na ordem, um por cena, com o motivo em 1 frase → runa-chave → power spike
→ "salva pra não esquecer".

**Curiosidade / Lore** — Fato chocante primeiro → construção com detalhes
concretos → virada/revelação no fim → pergunta.

**Notícia de patch** — "Mudou tudo" + campeão/item → o que mudou (números) → quem
ganha/quem perde → opinião forte → "concorda?".

**Tier list / Ranking** — Começar do 3º/5º lugar, guardar o 1º para o final;
contador na tela.

**Humor / Fail** — Gancho que antecipa a desgraça ("Ele só precisava não fazer
nada.") → setup → fail → comentário curto e engraçado → loop.

**Polêmica / Opinião** — Opinião forte em 1 frase → 2–3 argumentos rápidos →
reconhecer o outro lado em meia frase → "comenta se discorda".

## 3. Texto na tela (diferente da narração)

- Gancho na tela nos primeiros 2–3s: 2 a 5 palavras, maiúsculas ("ISSO É ILEGAL?",
  "BUILD QUEBRADA", "+40% DANO").
- Por cena: opcional, curtinho, reforça o número ou a palavra-chave.
- Palavras de destaque (`destaque`) mudam de cor na legenda: nomes de campeão,
  números, verbos de impacto. 1–2 por cena, no máximo.

## 4. Título, descrição e hashtags

- Título (até ~60 caracteres): o gancho reescrito + emoji opcional. Evite
  clickbait que o vídeo não entrega (derruba a retenção).
- Descrição: 1 frase + pergunta + hashtags.
- Hashtags: 3–5. Sempre `#leagueoflegends #lol` + campeão + tipo
  (`#dicaslol`, `#outplay`, `#lolbrasil`).

## 5. Cuidados

- Não usar logo/arte oficial da Riot como marca do canal; gameplay próprio é ok
  (política "Legal Jibber Jabber" da Riot permite conteúdo de fã com gameplay).
- Não prometer exploits/bugs nem incentivar hack/script.
- Música: só trilhas livres de direitos (Biblioteca de Áudio do YouTube, Pixabay).

## 6. Procedimento do Claude ao otimizar

1. Ler `projetos/<id>/briefing.json` (roteiro, orientações, tipo, campeão, duração alvo, tom, público).
2. Respeitar as orientações do usuário acima deste guia quando conflitarem.
3. Dar nota 0–10 ao roteiro original (gancho, ritmo, clareza, final) e à versão otimizada.
4. Escrever `projetos/<id>/otimizado.json` no formato abaixo e mudar
   `status.json` para `etapa: "otimizado"` com uma entrada no `log`
   (o servidor faz isso via `POST /api/projetos/<id>/otimizado`, ou
   `node painel/cli.mjs otimizado <id> arquivo.json`).
5. Explicar cada mudança em `mudancas` (o que mudou e por quê) — aparece no painel.

### Formato de `otimizado.json`

```json
{
  "notaOriginal": 5,
  "notaOtimizada": 8.5,
  "resumo": "Uma frase sobre a estratégia do vídeo.",
  "titulos": ["Título 1", "Título 2", "Título 3"],
  "hook": { "textoTela": "BUILD PROIBIDA" },
  "cenas": [
    {
      "narracao": "Frase falada nesta cena.",
      "textoTela": "texto curto opcional",
      "destaque": ["palavra", "40%"],
      "visual": "sugestão do que mostrar (para o usuário escolher o trecho)",
      "clipeInicio": null
    }
  ],
  "cta": { "texto": "COMENTA AQUI 👇" },
  "descricao": "Descrição pronta para colar.",
  "hashtags": ["#leagueoflegends", "#lol"],
  "mudancas": [
    { "antes": "trecho original", "depois": "trecho novo", "porque": "motivo" }
  ]
}
```
