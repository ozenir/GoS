# Quadro Inteligente — Especificação revisada

> Versão revisada do prompt original do projeto. Mantém todos os requisitos pedidos, remove ambiguidades, acrescenta critérios de aceitação verificáveis e inclui o novo requisito de **formato de apresentação (tela completa ou Reels 9:16)**.

---

## 1. Visão do produto

**Quadro Inteligente** é uma aplicação web para professores particulares **prepararem e apresentarem aulas** a partir da foto de uma questão (qualquer disciplina, com ênfase em Matemática e Física).

Uma IA multimodal lê a questão, resolve, verifica a resolução e a transforma em uma **aula progressiva**, apresentada em duas áreas sincronizadas:

| Área | Conteúdo |
|---|---|
| **Quadro de apresentação** (esquerda) | O que o professor escreve e desenha: equações, gráficos, tabelas, figuras, vetores, setas, destaques — construídos na tela como escrita à mão. |
| **Roteiro do professor** (direita) | O que o professor fala, em linguagem natural, exatamente sincronizado com o que está sendo escrito no quadro. |

**Princípio central:** a IA pensa como um professor, organiza como um planejador de aulas e apresenta como um professor escrevendo no quadro.

---

## 2. Fluxo de uso

### 2.1 Envio da questão
- Arrastar e soltar, selecionar arquivo, **colar da área de transferência** ou **tirar foto** pelo celular (câmera traseira).
- Formatos: JPG, JPEG, PNG, WEBP; até 15 MB. O conteúdo real do arquivo é validado no servidor (não apenas a extensão).
- Pré-visualização com **rotação** (fotos de celular costumam vir giradas); a orientação EXIF é corrigida automaticamente.
- Campos opcionais: disciplina, ano/nível do aluno, **profundidade** (básica, intermediária, avançada) e observações para a IA.
- Botão **Analisar questão**.

A IA deve interpretar enunciados, fórmulas, gráficos, tabelas, figuras geométricas, diagramas, alternativas de múltipla escolha e anotações manuscritas.

### 2.2 Fase A — Análise, resolução e verificação
A IA produz, antes de qualquer aula:
1. Transcrição fiel (enunciado, alternativas, descrição das figuras, anotações manuscritas).
2. Disciplina, conteúdo principal e conteúdos secundários.
3. Objetivo de aprendizagem e conhecimentos prévios.
4. Conceitos e definições a apresentar.
5. Fórmulas utilizadas com **origem**, **por que se aplicam** (hipóteses) e significado/unidade de cada variável.
6. Dados e incógnitas.
7. Estratégia de resolução e resolução completa, passo a passo.
8. Verificação explícita: interpretação, cálculos, unidades, resposta ao que foi pedido, nível de confiança.
9. Resposta final (e alternativa correta, quando houver).
10. Quantidade recomendada de etapas.
11. **Incertezas**: tudo que estiver ilegível ou ambíguo, com a suposição adotada e uma pergunta objetiva ao professor. A IA **nunca inventa dados**.

### 2.3 Revisão pelo professor (obrigatória quando houver incerteza)
- Tela de revisão com a imagem, a transcrição **editável**, dados, plano pedagógico, fórmulas com origem, resolução verificada e resposta.
- Incertezas que afetam a resposta bloqueiam a geração até o professor responder ou aceitar explicitamente as suposições da IA.
- Correções disparam uma nova análise (as correções do professor têm prioridade sobre a leitura da imagem).

### 2.4 Fase B — Organização da aula
A resolução é convertida em blocos pedagógicos (quantidade dinâmica, de 3 a 12). Modelo de referência:

`Apresentação → Interpretação → Conceitos → Definições → Desenvolvimento → Resolução → Verificação → Conclusão`

Cada etapa contém: título, objetivo, elementos visuais do quadro (na ordem de escrita), roteiro de fala dividido em **segmentos vinculados aos elementos**, observações pedagógicas e dúvidas prováveis do aluno com resposta.

**Regra fundamental:** não basta apresentar uma fórmula e substituir números. É obrigatório explicar de onde vem cada definição, por que a fórmula vale naquele caso, o significado de cada variável e como cada transformação matemática acontece. São proibidos saltos de raciocínio e expressões como “é evidente” ou “basta observar” sem demonstração.

---

## 3. Interface de apresentação

### 3.1 Formatos de visualização (novo)
O quadro pode ser exibido em dois formatos, alternáveis a qualquer momento sem perder o progresso:

| Formato | Uso | Comportamento |
|---|---|---|
| **Tela completa (16:9)** | Aula ao vivo, monitor, projetor, tablet na horizontal | O quadro ocupa toda a área disponível; elementos lado a lado (ex.: diagrama + equações). |
| **Reels (9:16, 1080×1920)** | Gravar vídeos curtos para Instagram/TikTok/Shorts | Quadro vertical centralizado com tamanho de fonte proporcional à largura (gravação idêntica em qualquer monitor); colunas empilhadas automaticamente; cabeçalho com número e título da etapa; assinatura opcional (ex.: `@prof.ana`); **margens de área segura** (topo ≈ 220 px, base ≈ 380 px em 1080×1920) e **guias visuais** opcionais das zonas cobertas pela interface do Instagram. O roteiro fica fora do quadro, servindo de teleprompter. |

Estilo visual de referência: caderno/quadro do professor — fundo de papel creme, letra manuscrita, tinta preta para o desenvolvimento, **vermelho** para anotações, forças e sinais, **laranja** para resumos de fórmulas, **azul** para corpos e dados, **marca-texto salmão** para resultados e setas de implicação, círculos e setas desenhados à mão sobre partes de equações.

Temas adicionais: quadro branco e lousa verde. Fórmulas manuscritas ou tipográficas, à escolha.

### 3.2 Quadro de apresentação
- Construção **progressiva e cumulativa**: as etapas anteriores permanecem visíveis (como em um quadro real); quando a etapa indica “nova página”, o quadro é virado.
- **Efeito de escrita à mão** (nunca uma imagem pronta):
  - texto e equações surgem símbolo a símbolo, na ordem natural de escrita (numerador antes do denominador);
  - linhas, setas, vetores, figuras e gráficos são traçados;
  - tabelas têm as linhas desenhadas e são preenchidas célula a célula;
  - resultados recebem marca-texto após o desenvolvimento.
- Equações em LaTeX (KaTeX) preservando a qualidade tipográfica; a animação não compromete a legibilidade.
- O quadro rola automaticamente para acompanhar o que está sendo escrito.

### 3.3 Roteiro do professor
- Texto falável, natural, detalhado, sem saltos, explicando termos técnicos e justificando cada operação; antecipa dúvidas.
- Dividido em segmentos; o segmento correspondente ao que está sendo escrito fica destacado (sincronização fina).
- Clique em um segmento para voltar àquele trecho.
- Ajuste de tamanho de fonte (uso como teleprompter); apoio pedagógico e dúvidas do aluno recolhíveis.

### 3.4 Navegação

| Controle | Atalho | Ação |
|---|---|---|
| Anterior | ← / PageUp | Volta à etapa anterior, já totalmente revelada, sem perder conteúdo. |
| Próxima | → / PageDown / Enter | Avança. No modo **Por etapa**, vai para a próxima etapa; no modo **Por fala**, revela o trecho da próxima fala (ideal para aula ao vivo). |
| Repetir | R | Reproduz novamente as animações da etapa. |
| Pausar/continuar | Espaço | Pausa ou retoma a escrita. |
| Revelar tudo | A | Mostra imediatamente todos os elementos da etapa. |
| Tela cheia | F | Coloca a apresentação em tela cheia. |
| Roteiro | S | Mostra/oculta o roteiro. |

Também: indicador “ETAPA 03 DE 08”, barra de progresso por etapa (clicável), percentual da aula e velocidade da escrita (0,5× a 3×). Compatível com passadores de slides (PageUp/PageDown).

---

## 4. Motor pedagógico (IA)

- Integração **exclusivamente no backend**; a chave nunca chega ao navegador.
- Camada de provedor independente (interface `AIProvider`) para trocar de modelo/fornecedor sem reescrever a aplicação.
- Fase A e Fase B separadas; cada uma com saída **JSON estruturada** e validada por esquema.
- Validação semântica adicional: ids únicos, referências do roteiro existentes, LaTeX renderizável, expressões de gráficos válidas, intervalos coerentes. Problemas geram uma rodada automática de correção pela própria IA; o que restar é saneado sem perda de conteúdo.
- Tratamento de erros: imagem ilegível, resposta incompleta/truncada, recusa, limite de uso, falha de conexão e JSON inválido — sempre com mensagem clara ao professor e opção de tentar novamente.
- Progresso em tempo real (SSE) com resumo do raciocínio da IA.

## 5. Motor de elementos visuais

A IA **descreve** o que deve ser desenhado; o frontend **constrói** e anima. Não é permitido enviar código executável: gráficos de funções usam um avaliador de expressões próprio (sem `eval`), e o LaTeX só aceita o comando de marcação controlado (`\qimark`).

Elementos suportados: texto, equação (com marcas desenhadas à mão e anotações), derivação passo a passo (vertical ou em cadeia horizontal), lista, matriz, tabela, gráfico cartesiano (funções, pontos com guias, segmentos), diagrama vetorial (ponto, segmento, vetor, polígono, círculo, arco, ângulo, retângulo, corpo, superfície hachurada, mola, curva livre, eixos, rótulo), destaque de resultado, caixa de observação, divisor, foto original da questão, conector entre elementos e linhas com colunas. Frações e matrizes são suportadas pelo LaTeX e pelo elemento matriz.

## 6. Recursos pedagógicos adicionais

Disponíveis na apresentação (“Recursos da IA”), gerando uma etapa complementar inserida após a etapa atual:
Explicar de outra forma · Mostrar de onde vem a fórmula · Criar uma analogia · Verificar outra solução · Gerar exemplo adicional · Gerar exercícios semelhantes.

Também: escolha de profundidade (básica/intermediária/avançada), **exportação em PDF** (quadro completo + roteiro por etapa) e **biblioteca** de aulas salvas.

## 7. Requisitos não funcionais

1. **Rigor matemático** — resolução verificada antes de virar aula; nenhuma conta nova sem conferência.
2. **Qualidade pedagógica** — explicar o raciocínio, não apenas o resultado.
3. **Sincronização** — cada segmento do roteiro corresponde exatamente aos elementos escritos durante ele.
4. **Qualidade visual** — quadro organizado, legível e construído progressivamente; layout responsivo (computador, tablet e celular).
5. **Fluidez** — navegação instantânea entre etapas, sem perda de conteúdo.
6. **Segurança** — validação de uploads, limites de tamanho e de requisições, cabeçalhos de segurança, nenhuma execução de código vindo da IA.

## 8. Critérios de aceitação do MVP

- [x] Enviar uma foto real e obter análise, resolução verificada e plano pedagógico pela IA real (sem respostas simuladas).
- [x] Confirmar/corrigir pontos ambíguos antes de gerar a aula.
- [x] Aula em etapas com quadro animado (escrita à mão) e roteiro sincronizado.
- [x] Próxima/anterior, repetir, pausar, revelar tudo, tela cheia, progresso.
- [x] Formatos **tela completa** e **Reels 9:16** com áreas seguras.
- [x] Aula salva e reabrível; exportação em PDF.
- [x] Aula de exemplo (pêndulo simples) para demonstrar o motor visual sem IA.
