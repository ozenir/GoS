# Herói contra Hordas: passo a passo para ligar na sua live

Um sobrevivente controlado pela IA anda por uma cidade cheia de zumbis. **O chat escolhe o caminho** em cada cruzamento, e **os presentes decidem o destino dele**: uns mandam cura e armas, outros mandam hordas e chefões. Quando o herói cai, aparece o relatório da rodada e um novo sobrevivente começa.

São duas peças que trabalham juntas, igual à Cobrinha:

- **O programa** (`servidor.js`) fica numa janela preta aberta durante a live. Ele lê comentários, presentes, curtidas, quem segue e quem compartilha, e manda tudo para o jogo.
- **O jogo** abre no navegador. É ele que você captura e mostra na live.

> Dá pra ter a Cobrinha e este jogo instalados no mesmo computador. Este usa a porta **8081** (a Cobrinha usa a 8080), então um não atrapalha o outro.

---

## Jeito mais fácil (Windows): um comando só

1. Aperte **Windows + R**, digite `powershell` e aperte Enter.
2. Cole isto e aperte Enter:

   ```
   irm https://raw.githubusercontent.com/ozenir/GoS/claude/kind-bohr-lyn3jc/zumbi-live/instalar.ps1 | iex
   ```

Ele baixa o jogo para a pasta `zumbi-live` na Área de Trabalho e instala o Node.js se faltar. Também cria o atalho **Zumbi LIVE** na Área de Trabalho e já liga tudo: o programa da live, a janela do jogo e o TikTok LIVE Studio. Rodar de novo atualiza o jogo. O `config.json` volta ao padrão, mas a `chave_euler` é mantida.

Nas próximas lives, basta dar dois cliques em **Zumbi LIVE** (ou em `ligar-tudo.bat`). No LIVE Studio, só na primeira vez, configure a tela em retrato e a **Captura de janela** da janela **"Herói contra Hordas"**. Depois é só clicar em **Entrar ao vivo**.

## Testar sem estar ao vivo

Dê dois cliques em **`1-testar-sem-live.bat`**. O jogo abre no navegador com um público de mentira: chegam votos, comentários, presentes, curtidas e seguidores sozinhos. Embaixo do jogo ficam botões para testar cada presente, cada voto e os outros eventos.

## No dia da live (sem o atalho)

1. Dois cliques em **`2-iniciar-na-live.bat`**. Deixe a janela preta aberta a live toda.
2. Dois cliques em **`3-abrir-janela-do-jogo.bat`**. Abre a janela em pé, só com o jogo.
3. No **TikTok LIVE Studio**: tela em **retrato**, fonte **Captura de janela** com a janela **Herói contra Hordas**, esticada na tela toda. Deixe o **áudio do sistema** ligado para o som ir junto.
4. **Entrar ao vivo.** Em até 1 minuto a janela preta mostra `✅ Ligado na live de @...`.

**Primeiro teste de verdade:** peça para um amigo comentar `2` num cruzamento e mandar uma Rosa. Na janela preta aparece o presente, e no jogo aparece o aviso com o nome dele e o herói se cura.

**OBS:** fonte **Navegador** com `http://localhost:8081/#live`, largura `1080` e altura `1920`. Marque "Controlar áudio pelo OBS".

---

## Como o jogo funciona

**O herói.** Anda sozinho pelo meio da rua, atira no zumbi mais perigoso, empurra quem encosta, desvia de explosivos, pega os itens que caem e foge de chefões. A cada zumbi derrotado ganha experiência e, ao subir de nível, ganha uma melhoria (dano, cadência, vida ou velocidade). Ele só muda quando morre. Cada novo sobrevivente é sorteado entre 5 tipos:

| Sobrevivente | Diferença |
|---|---|
| 👮 Policial | atira mais rápido |
| 🧑‍🚒 Bombeira | mais vida e começa com taco com pregos |
| 🛵 Entregador | corre mais |
| 🩺 Enfermeira | se cura sozinha aos poucos |
| 🔧 Mecânico | começa com escopeta |

**O ex-herói volta.** Uns 45 segundos depois de um novo sobrevivente começar, o anterior aparece como **zumbi chefão**, com a roupa dele. Derrotar ele solta a arma que ele usava (ou um baú, se era só a pistola).

**A câmera gira com o herói.** Ele sempre anda para cima e para a direita (↗). Por isso, na votação, **1 é sempre ↖ esquerda, 2 é ↗ frente e 3 é ↘ direita**. As mesmas setas aparecem desenhadas no chão do cruzamento.

**A votação.** Quando o herói sai de um cruzamento, abre a votação do próximo (12 segundos, dá tempo mesmo com o atraso da live). O chat comenta o número ou a palavra (`1`, `2`, `3`, `4`, `esquerda`, `frente`, `direita`, `entrar`, `e`, `f`, `d`...). Vale o primeiro voto de cada pessoa. Se ninguém votar, a IA escolhe. Se o herói chegar antes da votação acabar, ele espera lutando.

**Os prédios.** Alguns cruzamentos têm uma loja na esquina (aparece a placa no telhado e a opção **4 🚪 ENTRAR**). Dentro tem zumbis e coisas para pegar. Depois de um tempo dispara o alarme, e ele sai pelos fundos, do outro lado do quarteirão (conta como atalho).

| Loja | Risco | O que tem |
|---|---|---|
| 💊 Farmácia | baixo | kits médicos |
| 🛒 Mercado | baixo | munição e comida |
| 🔧 Posto | médio | colete e munição |
| 🚓 Delegacia | alto | baú com arma, colete e munição |
| 🏥 Hospital | muito alto | kits, baú com arma e chance de baú lendário |

**A dificuldade sobe com o tempo.** Mais zumbis e mais fortes a cada quarteirão e a cada minuto, e de tempos em tempos vem uma **noite** (escuro, mais zumbis). Sem presentes, um herói dura uns 7 a 8 minutos. Quando a vida está muito baixa, o jogo alivia um pouco os zumbis naturais (os mandados pelo público nunca são aliviados).

## Presentes

Tudo que **ajuda** acontece na hora. Tudo que **atrapalha** entra numa fila: sai um a cada meio segundo e **nada sai nos primeiros 15 segundos de um herói novo** (proteção de nascimento). Presentes caros furam a fila. Os efeitos aparecem sempre **na rua logo à frente do herói**, então quem mandou vê o resultado em poucos segundos.

| Presente | Moedas | Lado | O que acontece |
|---|---|---|---|
| 🌹 Rosa | 1 | ajuda | cura +10% na hora |
| 🍦 Sorvete | 1 | atrapalha | cacos de vidro na rua: herói fica lento |
| 🎵 TikTok | 1 | atrapalha | 3 zumbis com o nome de quem mandou |
| 🫰 Coração com dedos | 5 | ajuda | munição + tiro rápido por 10 s |
| 🧴 Perfume | 20 | atrapalha | horda de 8 zumbis |
| 🍩 Rosquinha | 30 | ajuda | kit médico (+25%) cai de paraquedas |
| 🎩 Chapéu e Bigode | 99 | atrapalha | zumbi que explode |
| 🫶 Mãos de coração | 100 | ajuda | colete que segura 3 golpes |
| 🐶 Corgi | 299 | ajuda | cachorro ajudante por 60 s, com o nome de quem mandou |
| 🔫 Arma de Dinheiro | 500 | ajuda | baú com escopeta ou taco com pregos |
| 🦢 Cisne | 699 | atrapalha | carro com alarme: horda chegando por 20 s |
| 🚂 Trem | 899 | atrapalha | 15 corredores e rua bloqueada atrás |
| 🌌 Galáxia | 1.000 | ajuda | **baú lendário**: metralhadora ou lança-chamas por 45 s |
| 🎆 Fogos | 1.088 | atrapalha | **chefão** com o nome de quem mandou |
| 🦁 Leão | 29.999 | atrapalha | **Rei Zumbi** gigante + noite por 60 s |
| 🪐 Universo | 34.999 | ajuda | **helicóptero de resgate**: limpa a tela, cura tudo e 15 s invencível |
| Outros presentes | – | ajuda | pelo valor: 1 = cura, 5 = munição, 20 = kit, 100 = colete, 299 = cachorro, 500 = baú, 1.000 = baú lendário, 20.000 = helicóptero |

**De graça:**

| Ação | O que acontece |
|---|---|
| 💬 Comentar | vota no cruzamento. O nome de quem comenta ou entra na live pode aparecer num zumbi |
| ➕ Seguir | um sobrevivente com o nome da pessoa ajuda por 20 s |
| 🔁 Compartilhar | cai uma caixa de munição |
| ❤️ Curtidas | a cada 300 curtidas cai um suprimento de avião (cura ou munição) |

**Combos:** quem manda várias Rosas seguidas recebe um aviso só, que vai somando ("x5"), e cada Rosa cura de novo. Cada TikTok seguido manda mais 3 zumbis.

**Presentes com o herói morto:** os que ajudam ficam guardados para o próximo herói. Os que atrapalham esperam a proteção dele acabar.

**Os nomes em inglês** (`Rose`, `Donut`, `Lion`...) são os que o TikTok manda. Se um presente da tabela não existir mais ou tiver outro nome, ele aparece na janela preta quando alguém manda; é só trocar no `config.json`.

## O que aparece na tela

- **Em cima:** barra de vida, sobrevivente e número, arma (com munição ou tempo), nível, quarteirões, recorde, zumbis derrotados, tempo vivo e a barrinha de curtidas. Embaixo disso, os efeitos ativos (proteção, noite, prédio, cachorro...).
- **A votação**, com o tempo correndo, os votos de cada opção e quem está na frente em amarelo. Depois, o resultado.
- **Os avisos de presente**, com a foto de quem mandou: verdes para quem ajuda, vermelhos para quem atrapalha.
- **Avisos grandes** no meio: chefão chegando, baú lendário, nível, noite, alarme, vida baixa, novo recorde.
- **Embaixo:** a legenda de presentes (muda a cada 5 segundos) e os dois rankings da live: **🛡️ quem mais ajudou** e **😈 quem mais atrapalhou**.
- **No fim da rodada:** primeiro os números (quarteirões, zumbis, tempo, nível, prédios, recorde), depois os destaques (quem mais ajudou, quem mais atrapalhou, quem derrubou o herói) e o **Hall dos heróis** com os 3 que mais andaram.

## Ajustes no `config.json`

**Em `jogo`:**

| Campo | Para que serve | Padrão |
|---|---|---|
| `segundos_de_votacao` | tempo de cada votação | 12 |
| `segundos_do_relatorio` / `segundos_dos_destaques` | tempo de cada parte do relatório | 10 / 12 |
| `protecao_ao_nascer_segundos` | segundos sem nada que atrapalhe no começo de cada herói | 15 |
| `curtidas_por_suprimento` | curtidas para cair um suprimento (0 desliga) | 300 |
| `maximo_zumbis` | limite de zumbis ao mesmo tempo (os do público passam um pouco disso) | 90 |
| `velocidade_do_heroi` | casas por segundo | 1.5 |
| `dificuldade_por_quarteirao` / `dificuldade_por_minuto` | quanto o jogo fica mais difícil. Maior = heróis morrem mais rápido | 0.1 / 0.17 |
| `noite_a_cada_segundos` / `noite_dura_segundos` | ciclo da noite (0 desliga) | 150 / 35 |
| `segundos_dentro_do_predio` | quanto tempo até o alarme mandar ele sair | 70 |

**Presentes:** em `presentes` → `por_nome`, cada presente tem `efeito` e os números do efeito. Os efeitos que existem:

| Efeito | Números | Lado |
|---|---|---|
| `cura` | `valor` (% da vida) | ajuda |
| `kit` | `valor` (% da vida, cai de paraquedas) | ajuda |
| `municao` | `segundos` de tiro rápido | ajuda |
| `colete` | `golpes` | ajuda |
| `cachorro` | `segundos` | ajuda |
| `aliado` | `segundos` | ajuda |
| `bau` | `raridade`: `"medio"` ou `"lendario"` | ajuda |
| `caixa_municao`, `suprimento` | – | ajuda |
| `helicoptero` | `segundos` invencível | ajuda |
| `zumbis` | `qtd` | atrapalha |
| `vidro` | `segundos` lento | atrapalha |
| `horda` | `qtd` | atrapalha |
| `explosivo` | `qtd` | atrapalha |
| `alarme` | `segundos` | atrapalha |
| `trem` | `qtd` de corredores | atrapalha |
| `chefao` | – | atrapalha |
| `rei` | `segundos` de noite | atrapalha |

`emoji`, `nome` e `moedas` servem para a legenda e para os botões de teste. `seguir` e `compartilhar` usam os mesmos efeitos. Depois de mudar o `config.json`, feche a janela preta e abra de novo.

**Para testar o equilíbrio sem live:** `node teste/simular.mjs` roda dezenas de partidas em segundos e mostra quanto tempo cada herói durou, com e sem público.

---

## Problemas comuns

**"ainda não está ao vivo" e eu já estou ao vivo**
Espere até 1 minuto. Se continuar, confira se o usuário no `config.json` está igual ao do seu perfil.

**"Não consegui conectar" várias vezes, ou erro de limite**
Crie uma conta grátis em **https://www.eulerstream.com**, copie a **API key** e cole em `"chave_euler"` no `config.json`. (Se você já usa uma chave na Cobrinha, pode usar a mesma.)

**O jogo congela quando a janela fica atrás de outra**
Abra sempre pelo `3-abrir-janela-do-jogo.bat`.

**"A porta 8081 já está em uso"**
O programa já está aberto em outra janela preta. Feche as duas e abra só uma.

**Aparece "🔇 Clique na tela para ativar o som"**
Clique uma vez na janela do jogo. Pela janela do atalho 3 o som já começa sozinho.

**Os comentários ou presentes pararam de chegar depois de uma atualização do TikTok**
Abra o Prompt de Comando dentro da pasta e rode `npm install tiktok-live-connector@latest`.

## No Mac

| Windows | Mac |
|---|---|
| `1-testar-sem-live.bat` | `testar-sem-live-mac.command` |
| `2-iniciar-na-live.bat` | `iniciar-mac.command` |
| `3-abrir-janela-do-jogo.bat` | `abrir-janela-do-jogo-mac.command` |

Se o Mac bloquear na primeira vez: botão direito > **Abrir** > **Abrir**.

## Créditos e aviso

Toda a arte (pixel art) e todo o som são gerados pelo próprio jogo, sem arquivos de terceiros.

A leitura da live usa a biblioteca não oficial **TikTok-Live-Connector**. Ela não é do TikTok e pode parar de funcionar se o TikTok mudar algo. O jogo só **lê** a live: não entra na sua conta e não precisa da sua senha.
