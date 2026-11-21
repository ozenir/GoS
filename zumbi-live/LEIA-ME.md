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

**O herói.** Anda sozinho pelo meio da rua, luta, pega os itens que caem e foge do que é perigoso demais. A cada zumbi derrotado ganha experiência; ao subir de nível ganha uma melhoria (dano, cadência, vida ou velocidade) e as **perícias** dele sobem. Ele só muda quando morre. Cada novo sobrevivente é sorteado entre 5 personagens, cada um com o seu jeito de lutar:

| Personagem | Ataque | Perícia que sobe com o nível | Ponto forte | Ponto fraco |
|---|---|---|---|---|
| 👮 Policial | 🔫 pistola (à distância) | armas de fogo | colete; tiro crítico **marca** o zumbi (+25% de dano nele) | pouca coisa de perto |
| 🩺 Enfermeira | 🔪 facas (de perto) | facas e agilidade | **cada golpe que acerta cura 1 de vida** (cura mais com a perícia); resiste a infecção | **armadura baixa** (toma mais dano) |
| 🧑‍🚒 Bombeira | 🪓 machado (de perto, pega vários) | machados e pancada | **muito resistente**, aguenta fogo e explosão; **instinto de sobrevivência** com pouca vida (defesa e cura) | lenta |
| 🛵 Entregador | 🔫 pistola (à distância) | agilidade | rápido e **desvia de ataques** (a esquiva sobe com a agilidade) | pouca vida extra |
| 🔧 Mecânico | 💥 escopeta + 🔧 chave inglesa | pancada e explosivos | a chave **atordoa** e **quebra a armadura** dos zumbis; aguenta explosões | munição curta |

Quem luta de perto vai pra cima dos zumbis que estão à frente, não ataca os explosivos (recua deles) e só foge de chefe quando a vida está baixa. Se pegar uma arma de fogo num baú, usa, mas com pouca perícia ela rende menos. Para quem luta de perto, o baú médio vira **arma afiada** (fúria + foco).

**O nome do herói.** O herói novo recebe o nome de alguém da live: entre **quem mais ajudou** e **quem mais atrapalhou** na rodada anterior, ganha **quem doou primeiro**. Se só um dos lados doou, é ele. Se ninguém doou, o herói fica sem nome. O nome aparece em cima do herói, no painel, no relatório, no Hall dos heróis e no ex-herói que volta zumbi ("ana.lu zumbi").

**Dano, fraquezas e resistências.** Cada ataque tem um tipo: 🔫 perfuração, 🔪 corte, 🔨 impacto, 🔥 fogo, 💥 explosão, 🦷 mordida, 🩸 sangramento. Cada zumbi é fraco contra uns e resiste a outros, e a tela mostra **SUPER EFETIVO!** ou **resistiu**:

| Zumbi | Fraco contra | Resiste a |
|---|---|---|
| Comum | – | – |
| Gordo | corte, fogo | impacto, tiro |
| Corredor | impacto, tiro, corte | – |
| Explosivo | **fogo (dobro)**, tiro | corte, impacto |
| Chefão | corte, explosão, fogo | tiro, impacto |
| Rei Zumbi | fogo, corte | tiro, explosão, impacto |

O herói também tem resistências por tipo (a bombeira aguenta fogo; o mecânico, explosão). Sangramento e infecção vêm "de dentro": atravessam armadura, colete e resistência.

**Status (efeitos que duram um tempo).** Valem para o herói e para os zumbis e aparecem em cima de cada um:

| Negativos | O que fazem | Positivos | O que fazem |
|---|---|---|---|
| 🩸 Sangrando | dano por segundo, acumula até 5× | ⚡ Tiro rápido | atira 2× mais rápido |
| 🔥 Queimando | dano de fogo por segundo | 💚 Regenerando | cura por segundo |
| 💫 Atordoado | não anda nem ataca | 😤 Fúria | +30% de dano, +10% de velocidade |
| 🐌 Lento | metade da velocidade | 🧡 Instinto | +25% de defesa e cura |
| 🎯 Marcado | leva +25% de dano | 👁️ Foco | +15% de crítico |
| 💔 Armadura quebrada | perde resistência | 🛡️ Blindado | +40% de defesa |
| 🦠 Infectado | dano por segundo e cura pela metade | | |

Facas e cacos de vidro fazem sangrar, a chave e o taco atordoam, o machado quebra armadura, o lança-chamas queima. As mordidas podem infectar o herói, e os chefes podem atordoá-lo.

**O ex-herói volta.** Uns 45 segundos depois de um novo sobrevivente começar, o anterior aparece como **zumbi chefão**, com a roupa dele. Derrotar ele solta a arma que ele usava (ou um baú, se era só a pistola).

**A câmera gira com o herói.** Ele sempre anda para cima e para a direita (↗). Por isso, na votação, **1 é sempre ↖ esquerda, 2 é ↗ frente, 3 é ↘ direita e 5 é ↙ voltar**. As mesmas setas aparecem desenhadas no chão do cruzamento.

**A votação.** Quando o herói sai de um cruzamento, abre a votação do próximo. O chat comenta o número ou a palavra (`1`, `2`, `3`, `4`, `5`, `esquerda`, `frente`, `direita`, `entrar`, `voltar`, `e`, `f`, `d`, `v`...). Vale o primeiro voto de cada pessoa. Se ninguém votar, a IA escolhe (ela quase nunca volta). Rua bloqueada aparece **riscada** e não dá pra votar nela. Rua sem saída aparece com 📦.

**A cidade.** Não tem fim: dá pra ir em qualquer direção, e cada pedaço da cidade é um **bairro** com cara, lojas e perigos próprios. Quando o herói muda de bairro, aparece o nome dele na tela.

| Bairro | Como é | Lojas | Perigos no chão |
|---|---|---|---|
| 🏙️ Centro | prédios altos | farmácia, mercado, delegacia, hospital | vidro, fios elétricos, entulho |
| 🏘️ Residencial | casas com chaminé | casa, mercado, farmácia | entulho, lama, vidro |
| 🏭 Industrial | galpões, contêineres | posto, fábrica | arame farpado, fogo, ácido, fios |
| 🌳 Parque | grama, árvores, lagos, muitas praças | – | lama, arame, entulho |

**Bloqueios e ruas sem saída.** Algumas ruas têm **barricada** 🚧: não entram na votação. Outras são **sem saída**: o herói vai até o fim, pega um **baú** 📦 que está lá e volta, mas na volta a horda costuma fechar a saída (**emboscada**).

**Perigos no chão.** Valem para o herói **e para os zumbis** (zumbi que passa no fogo também queima). O herói tenta desviar pela outra faixa da rua, mas nem sempre dá:

| Perigo | O que faz |
|---|---|
| 🔸 Cacos de vidro | corta (sangramento) e deixa lento |
| ➰ Arame farpado | corta muito (sangramento) e deixa **bem** lento |
| 🔥 Fogo | queima e ilumina a noite. Explosões deixam fogo no chão por uns segundos |
| 🧪 Ácido | dano químico, pode infectar e quebra a armadura dos zumbis |
| ⚡ Fios elétricos | choque que **atordoa**; liga e desliga, piscando |
| 🟫 Lama | metade da velocidade |
| 💧 Água (lagos do parque) | bem lento, mas **apaga o fogo** de quem está queimando |
| 🧱 Entulho | deixa lento |

**As praças: arena de chefe.** Algumas esquinas têm uma praça com chafariz. Na votação aparece **4 ⚔️ ARENA**. Lá dentro vem um **chefe** e ondas de zumbis por todos os lados, por até 100 segundos. Quem vence ganha recompensa: um baú (às vezes lendário) e um kit médico.

**Os prédios.** Alguns cruzamentos têm uma loja na esquina (aparece a placa no telhado e a opção **4 🚪 ENTRAR**). Cada tipo tem tamanho, móveis e arrumação próprios (fileiras, ilhas ou corredor), zumbis, coisas para pegar e **perigos no chão** também. Depois de um tempo dispara o alarme, e ele sai pelos fundos, do outro lado do quarteirão (conta como atalho).

| Loja | Risco | O que tem | Perigo dentro |
|---|---|---|---|
| 💊 Farmácia | baixo | kits médicos | vidro |
| 🛒 Mercado | baixo | munição e comida | vidro |
| 🏠 Casa | baixo | comida e munição | entulho |
| 🔧 Posto | médio | colete e munição | fogo, lama |
| 🏭 Fábrica | alto | baú com arma, colete e munição (muitos zumbis) | ácido, fogo, arame |
| 🚓 Delegacia | alto | baú com arma, colete e munição | arame |
| 🏥 Hospital | muito alto | kits, baú com arma e chance de baú lendário | vidro, ácido |

**Os caminhos.** Toda vez que o herói vira num cruzamento (pelo voto ou pela IA), o jogo sorteia o que tem nessa rua:

| Caminho | Chance | O que acontece |
|---|---|---|
| ☠️ Perigoso | 80% | aparece um perigo e a ameaça sobe um pouco: ⚠️ emboscada (zumbis dos dois lados), 🧟 rua lotada, 🏃 corredores, 💣 explosivos, 🌑 rua escura ou 👹 chefe de rua |
| 🍃 Livre | 18% | nenhum zumbi novo até o próximo cruzamento: hora de respirar |
| 📜 História | 2% | rua livre com um papel brilhando no chão: um fragmento da história |

**A história.** São 12 fragmentos em 3 capítulos ("Os Diários de Porto Sereno"), encontrados um por vez, na ordem. O progresso continua de um herói para o outro e de uma live para a outra. Para escrever ou mudar a história, mexa só no arquivo `public/js/core/historia.js` (as instruções estão no começo dele).

**O nível de ameaça (☠️).** Começa em 1 e sobe com o tempo vivo, com os quarteirões andados, com cada caminho perigoso e com o nível do herói. Assim, quanto mais forte o herói fica, mais fortes os zumbis ficam. A cada nível os zumbis nascem com mais vida, dano, velocidade e **resistência** (ignoram parte do dano; ver também as fraquezas de cada zumbi acima), aparecem mais zumbis na rua e as **hordas ficam maiores**: a horda que chega sozinha de tempos em tempos e também as mandadas por presentes. De tempos em tempos vem uma **noite** (escuro, mais zumbis). Quando a vida está muito baixa, o jogo alivia um pouco os zumbis normais (os mandados pelo público nunca são aliviados).

**A torcida (📣).** Comentar também ajuda: cada pessoa diferente que comentou nos últimos 30 segundos dá +3% de dano e um pouco de regeneração ao herói (até 10 pessoas).

**O atraso da live (e por que nada se perde).** Quem assiste pelo TikTok vê a tela uns segundos **atrasada** (`atraso_da_live_segundos`, 6 por padrão). O jogo foi feito pensando nisso:

- **Votação:** a contagem na tela termina 6 segundos antes da votação fechar de verdade. Aí aparece **⏳ CONTANDO VOTOS DA LIVE...** e os votos de quem viu a contagem atrasada **ainda valem**. Para quem assiste, o 0 da contagem chega bem na hora em que a votação fecha. O herói **anda no ritmo da votação**: vai mais devagar pra chegar no cruzamento junto com o resultado, em vez de ficar parado esperando.
- **Herói caído:** quando a vida zera, o herói **não morre na hora**. Ele fica **CAÍDO** por 12 segundos (`segundos_caido`), com um painel grande contando o tempo. **Qualquer presente que ajuda (ou seguir) levanta o herói**: volta com vida (50%, depois 40%, 30%... no mínimo 20%), fica 3 s invencível e solta uma onda que empurra e atordoa os zumbis em volta. **Um presente que atrapalha dá o golpe final:** ele morre em 2,5 s, a não ser que alguém salve nesse tempo, e quem mandou leva o crédito de quem derrubou o herói. Compartilhar e curtidas não levantam (são de graça e sem limite).
- **Presentes inteligentes:** o presente sempre serve pra alguma coisa, chegue na hora que chegar:

| Presente chega quando... | Vira |
|---|---|
| cura com a vida cheia | o que sobra vira 🛡️ **blindado** (menos dano por uns segundos) |
| kit com a vida baixa (menos de 60%) | cura **na hora**, direto no herói |
| kit com a vida alta | vai pra 💼 **mochila** (até 3). Ele usa sozinho quando a vida cai pra menos de 35%, e o kit da mochila **segura o herói de pé** quando a vida zera |
| munição pra quem luta de perto (sem arma de fogo) | 😤 **fúria** |
| colete com o colete cheio | 🛡️ **blindado** |

- **Resposta na hora:** todo presente mostra o emoji e o nome de quem mandou **em cima do herói** no instante em que chega, mesmo os que entram na fila.

**Quanto dura.** Sem ninguém interagindo, o herói cai em uns **2 minutos** (mais os 12 segundos caído). Com chat e presentes que ajudam, dura bem mais. Esse é o estímulo pra live participar. (Números medidos no simulador estão em "Equilíbrio", mais abaixo.)

## Presentes

Tudo que **ajuda** acontece na hora (e se adapta à situação, veja "O atraso da live" acima). Tudo que **atrapalha** entra numa fila: sai um a cada meio segundo e **nada sai nos primeiros 15 segundos de um herói novo** (proteção de nascimento). Presentes caros furam a fila. Os efeitos aparecem sempre **na rua logo à frente do herói**, então quem mandou vê o resultado em poucos segundos.

| Presente | Moedas | Lado | O que acontece |
|---|---|---|---|
| 🌹 Rosa | 1 | ajuda | cura +10% na hora |
| 🍦 Sorvete | 1 | atrapalha | cacos de vidro na rua: herói fica lento |
| 🎵 TikTok | 1 | atrapalha | 3 zumbis com o nome de quem mandou |
| 🫰 Coração com dedos | 5 | ajuda | munição + tiro rápido por 10 s |
| 🧴 Perfume | 20 | atrapalha | horda de 8 zumbis |
| 🍩 Rosquinha | 30 | ajuda | kit médico (+25%): cura na hora ou vai pra mochila |
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

**Presentes com o herói caído:** os que ajudam levantam ele; os que atrapalham dão o golpe final.

**Presentes com o herói morto** (depois do tempo caído): os que ajudam ficam guardados para o próximo herói. Os que atrapalham esperam a proteção dele acabar.

**Os nomes em inglês** (`Rose`, `Donut`, `Lion`...) são os que o TikTok manda. Se um presente da tabela não existir mais ou tiver outro nome, ele aparece na janela preta quando alguém manda; é só trocar no `config.json`.

## O que aparece na tela

- **Em cima:** barra de vida, sobrevivente e número, arma (com munição ou tempo), nível, quarteirões, recorde, zumbis derrotados, tempo vivo e a barrinha de curtidas. Embaixo disso, os efeitos ativos (proteção, noite, prédio, cachorro...).
- **A votação**, com o tempo correndo, os votos de cada opção e quem está na frente em amarelo; ruas bloqueadas riscadas. No fim, "contando votos da live" e depois o resultado.
- **Herói caído:** painel grande com a contagem e o presente que levanta ele (fica roxo no golpe final).
- **Os avisos de presente**, com a foto de quem mandou: verdes para quem ajuda, vermelhos para quem atrapalha.
- **Avisos grandes** no meio: chefão chegando, baú lendário, nível, noite, alarme, vida baixa, novo recorde.
- **Embaixo:** a legenda de presentes (muda a cada 5 segundos) e os dois rankings da live: **🛡️ quem mais ajudou** e **😈 quem mais atrapalhou**.
- **No fim da rodada:** primeiro os números (quarteirões, zumbis, tempo, nível, prédios, recorde), depois os destaques (quem mais ajudou, quem mais atrapalhou, quem derrubou o herói) e o **Hall dos heróis** com os 3 que mais andaram.

## Ajustes no `config.json`

**Em `jogo`:**

| Campo | Para que serve | Padrão |
|---|---|---|
| `segundos_de_votacao` | tempo da contagem de cada votação | 10 |
| `atraso_da_live_segundos` | atraso da tela do TikTok para quem assiste: a votação fica aberta esse tempo a mais e a contagem do herói caído desconta ele. Se o seu atraso for maior, aumente. 0 desliga | 6 |
| `segundos_caido` | quanto tempo o herói fica caído esperando um presente antes de morrer. Deixe pelo menos o atraso + 5. 0 = morre na hora | 12 |
| `segundos_do_relatorio` / `segundos_dos_destaques` | tempo de cada parte do relatório | 10 / 12 |
| `protecao_ao_nascer_segundos` | segundos sem nada que atrapalhe no começo de cada herói | 15 |
| `curtidas_por_suprimento` | curtidas para cair um suprimento (0 desliga) | 300 |
| `maximo_zumbis` | limite de zumbis ao mesmo tempo (os do público passam um pouco disso) | 90 |
| `velocidade_do_heroi` | casas por segundo | 1.5 |
| `ameaca_por_minuto` / `ameaca_por_quarteirao` / `ameaca_por_caminho_perigoso` / `ameaca_por_nivel_do_heroi` | quanto cada coisa faz a ameaça subir (1 = um nível inteiro). Maior = heróis morrem mais rápido | ver config |
| `zumbis_na_rua_base` / `zumbis_na_rua_por_nivel` | zumbis normais na rua ao mesmo tempo, no nível 1 e a mais por nível | ver config |
| `horda_a_cada_segundos` / `horda_base` / `horda_por_nivel` | a horda que chega sozinha: de quanto em quanto tempo, tamanho no nível 1 e a mais por nível | ver config |
| `caminho_perigoso_porcento` / `caminho_livre_porcento` / `caminho_historia_porcento` | chance de cada tipo de caminho | 80 / 18 / 2 |
| `torcida_maximo_pessoas` | quantas pessoas da torcida contam no máximo (0 desliga a torcida) | 10 |
| `noite_a_cada_segundos` / `noite_dura_segundos` | ciclo da noite (0 desliga) | 150 / 35 |
| `segundos_dentro_do_predio` | quanto tempo até o alarme mandar ele sair | 70 |

**Presentes:** em `presentes` → `por_nome`, cada presente tem `efeito` e os números do efeito. Os efeitos que existem:

| Efeito | Números | Lado |
|---|---|---|
| `cura` | `valor` (% da vida) | ajuda |
| `kit` | `valor` (% da vida; cura na hora ou vai pra mochila) | ajuda |
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

## Equilíbrio (medido no simulador)

| Cenário | Quanto o herói dura em média |
|---|---|
| Sem nenhuma interação | **2 min 15 s**, contando os 12 s caído (cada personagem entre 2 min e 2 min 33 s) |
| Só chat (6 pessoas comentando e votando, curtidas) | 3 min 39 s |
| Chat + presentes misturados (8 por minuto) | 2 min 40 s (a maioria cai no **golpe final** de quem atrapalha) |
| Chat + só presentes que ajudam (4 por minuto) | **5 min 42 s** |
| Chat + só presentes que atrapalham (4 por minuto) | 1 min 35 s |

**Trava contra herói imortal:** depois de 3 minutos vivo, os zumbis que nascem batem 20% mais forte a cada minuto. Por mais forte ou curado que o herói fique, um dia ele cai e a live troca de herói. O herói também nunca fica parado: se passar do cruzamento, volta; se for empurrado pra outra rua, volta contornando os prédios; se ficar muito tempo sem avançar, abre caminho pela horda; se travar, é levado até o cruzamento.

O que mais mexe nisso é `ameaca_por_minuto` (maior = partidas mais curtas) e o tamanho/frequência das hordas. Subir a ameaça devagar e começar com mais pressão faz a ajuda do público render mais; subir rápido deixa tudo mais curto, com ou sem ajuda.

## Para quem mexe no código

Cada assunto tem o seu arquivo em `public/js/core/`:

| Arquivo | O que tem |
|---|---|
| `dano.js` | **todas as contas de combate**: tipos de dano, fraquezas e resistências dos zumbis (AFINIDADES), perícias, atributos do herói (vida, dano, cadência, velocidade, defesa, esquiva, resistências por tipo, crítico, alcance, cura, cura por golpe, regeneração), dano de armas, corpo a corpo, fogo, zumbis, explosões, aliados e torcida. Buff novo = um modificador (`h.attr.addMod(...)`); as instruções estão no começo do arquivo |
| `ameaca.js` | quando a ameaça sobe, quantos zumbis vêm (hordas, grupos, prédios) e a trava contra herói imortal |
| `caminhos.js` | as chances dos caminhos e os tipos de perigo |
| `historia.js` | a história (só texto) |
| `status.js` | os status positivos e negativos (sangrando, atordoado, fúria...) |
| `dados.js` | **personagens** (arma, golpe, perícias, crescimento por nível, atributos, passiva), zumbis (vida, dano, tipo de ataque), armas e golpes (tipo de dano, perícia, efeitos) e melhorias de nível |
| `efeitos.js` | o que cada presente faz |
| `ambiente.js` | **perigos do chão** (vidro, arame, fogo, ácido, fios, lama, água, entulho): dano, status e lentidão |
| `city.js` | a cidade: bairros, ruas, bloqueios, ruas sem saída, praças e lojas |
| `room.js` | o lado de dentro dos prédios (tamanho, móveis, loot e perigos de cada tipo) |
| `votacao.js` | as opções, as palavras do chat e a janela de votos atrasados |
| `jogo.js` | o resto: herói, zumbis, arena, herói caído, mochila e presentes inteligentes |

**Testes automáticos:** `node teste/dano.test.mjs`, `node teste/status.test.mjs`, `node teste/ameaca.test.mjs`, `node teste/caminhos.test.mjs`, `node teste/nome.test.mjs`, `node teste/ambiente.test.mjs`, `node teste/atraso.test.mjs` (votos atrasados, caído, presentes inteligentes) e `node teste/estabilidade.test.mjs` (roda meia hora de jogo com cada personagem e falha se algum herói travar ou ficar imortal). Para simular um personagem só: `CLASSE=enfermeira node teste/simular.mjs 30 nada`.

**Para testar o equilíbrio sem live:** `node teste/simular.mjs` roda dezenas de partidas em segundos em 5 cenários (sem interação, só chat, presentes misturados, só presentes que ajudam, só presentes que atrapalham) e mostra quanto cada herói durou. Para testar números sem mexer no `config.json`: `AJUSTES='{"horda_base":8}' node teste/simular.mjs 20 nada`.

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

**Os votos do chat chegam depois que a votação já fechou**
O atraso da sua live é maior que 6 segundos. Para medir: abra a sua live no celular, olhe o relógio do jogo (⏱) no computador e no celular ao mesmo tempo e veja a diferença. Coloque esse número (arredondado pra cima) em `atraso_da_live_segundos` e, se precisar, aumente `segundos_caido` para o atraso + 6.

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
