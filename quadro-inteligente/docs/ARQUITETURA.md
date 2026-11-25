# Arquitetura

```
┌──────────────────────────── Navegador (React + TypeScript) ────────────────────────────┐
│  Páginas: Nova aula → Revisão (Fase A) → Apresentação → Biblioteca / PDF              │
│                                                                                        │
│  Apresentação                                                                          │
│   ├─ Stage (16:9 ou Reels 9:16, fonte proporcional, guias de área segura)              │
│   │   └─ Board ── renderizadores de elementos (KaTeX + SVG/rough.js)                   │
│   │        └─ Timeline (Web Animations API): unidades → glifos, traços, preenchimentos │
│   ├─ ScriptPanel (roteiro, segmento ativo, apoio pedagógico)                           │
│   └─ ControlBar (anterior/próxima, repetir, pausar, revelar, velocidade, tela cheia)   │
└──────────────────────────────────────────▲─────────────────────────────────────────────┘
                                           │ REST + Server-Sent Events (progresso)
┌──────────────────────────────────────────┴───────────── Servidor (Node + Express) ─────┐
│  routes.ts  upload (multer) → images.ts (sharp: valida, EXIF, redimensiona)            │
│  pedagogy/engine.ts                                                                    │
│    FASE A analyze()  → AIProvider → Analysis (Zod) → validação LaTeX → correção        │
│    FASE B generate() → AIProvider → LessonContent (Zod) → validação semântica          │
│                                      → correção automática → saneamento → SQLite       │
│    assist()          → etapa complementar inserida após a atual                        │
│  ai/  AIProvider (interface) ← AnthropicProvider (Claude, streaming, saída estruturada)│
│  db.ts  SQLite (node:sqlite) + imagens em disco                                        │
└────────────────────────────────────────────────────────────────────────────────────────┘
                     ▲
        shared/ (usado pelos dois lados): esquema Zod da aula, validação semântica,
        avaliador seguro de expressões, conversão para JSON Schema, configuração KaTeX
```

## Pastas

```
quadro-inteligente/
├─ shared/src/
│  ├─ schema.ts        Contrato IA ↔ frontend (Analysis, LessonContent, Step, elementos, formas)
│  ├─ validate.ts      Validação semântica + saneamento
│  ├─ mathExpr.ts      Parser de expressões para gráficos (sem eval)
│  ├─ jsonSchema.ts    Zod → JSON Schema compatível com saída estruturada
│  └─ katexConfig.ts   Macro \qimark e política de confiança do KaTeX
├─ server/src/
│  ├─ index.ts         Express, cabeçalhos de segurança, limite de requisições, estáticos
│  ├─ routes.ts        API REST + SSE
│  ├─ ai/              provider.ts (interface), anthropic.ts, json.ts, index.ts (fábrica)
│  ├─ pedagogy/        engine.ts (fases), prompts.ts, latex.ts
│  ├─ samples/         Aula de exemplo (pêndulo simples)
│  ├─ db.ts, images.ts, sse.ts, config.ts
└─ web/src/
   ├─ board/           Board, Stage, Math (KaTeX), Rich (texto manuscrito), rough.ts
   │  ├─ anim/         units.ts (coleta), timeline.ts (relógio único), order.ts (ordem da fala)
   │  └─ elements/     basic, math, table, graph, diagram, layout (linhas e conectores)
   ├─ present/         ScriptPanel, ControlBar, menus (aparência, recursos da IA)
   ├─ pages/           HomePage, PrepPage, PresentPage, LibraryPage, PrintPage
   ├─ components/      UI e progresso de tarefas
   └─ lib/             cliente da API (SSE), preferências locais
```

## Decisões principais

**Contrato de dados em vez de código.** A IA produz JSON validado por Zod. Todos os campos são obrigatórios (ausência = `""`), o que mantém o esquema compatível com *constrained decoding*. Se o provedor recusar o esquema, o servidor cai automaticamente para JSON livre + validação, sem intervenção.

**Duas fases de IA.** A Fase A concentra o rigor (resolver, conferir, levantar incertezas) e é revisada pelo professor; a Fase B só redige a aula a partir de uma resolução já verificada. Isso separa “acertar a matemática” de “ensinar bem” e permite pedir confirmação antes de gastar a geração da aula.

**Sincronização por segmento.** Cada segmento do roteiro lista os ids dos elementos escritos durante ele. A linha do tempo agrupa as animações por segmento, então o destaque do roteiro, a pausa “por fala” e a rolagem automática usam o mesmo relógio.

**Animação sobre o DOM real.** Os elementos são renderizados normalmente (KaTeX, SVG); depois a linha do tempo coleta as “unidades” (cada glifo, cada traço) e cria animações com a Web Animations API. Pausar, repetir, revelar e mudar a velocidade são operações sobre um único relógio. Etapas anteriores ficam estáticas (sem custo de animação). Nas fórmulas, a ordem dos glifos segue a posição visual (numerador antes do denominador).

**Traço à mão.** rough.js gera caminhos levemente irregulares com semente determinística (o desenho não “treme” ao re-renderizar); `pathLength=1` + `stroke-dashoffset` desenha cada traço.

**Formatos de tela.** O `Stage` calcula a área do quadro e o tamanho da fonte base; todos os elementos usam `em`, então o mesmo conteúdo se adapta a 16:9 ou 9:16. No Reels, as margens seguem as zonas seguras do Instagram e as linhas com colunas são empilhadas.

**Extensibilidade.** Novos recursos pedagógicos são novas ações de `assist()` que reutilizam o esquema `Step`. Novos provedores de IA implementam `AIProvider`. O repositório `lessons` isola o banco (SQLite hoje; Postgres amanhã).

## API

| Método | Rota | Descrição |
|---|---|---|
| GET | `/api/health` | Estado do servidor e da IA |
| GET | `/api/lessons` | Lista de aulas |
| POST | `/api/lessons` | Upload (multipart: `image`, `subject`, `level`, `depth`, `teacherNotes`, `rotate`) |
| GET | `/api/lessons/:id` | Aula completa |
| GET | `/api/lessons/:id/image` | Imagem normalizada da questão |
| PATCH | `/api/lessons/:id` | Atualiza título, nível, profundidade |
| DELETE | `/api/lessons/:id` | Exclui |
| POST | `/api/lessons/:id/analyze` | Fase A (SSE); corpo `{ corrections }` |
| POST | `/api/lessons/:id/generate` | Fase B (SSE) |
| POST | `/api/lessons/:id/assist` | Etapa complementar (SSE); corpo `{ stepId, action }` |

Eventos SSE: `status`, `thinking` (resumo do raciocínio), `progress` (etapas escritas), `warning`, `done` (aula atualizada), `error`.
