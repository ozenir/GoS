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

Ele baixa o jogo para a pasta `zumbi-live` na Área de Trabalho (ou, se o jogo já estiver em outra pasta da Área de Trabalho, atualiza lá mesmo) e instala o Node.js se faltar. Também cria o atalho **Zumbi LIVE** na Área de Trabalho e já liga tudo: o programa da live, a janela do jogo e o TikTok LIVE Studio. Rodar de novo atualiza o jogo. O `config.json` volta ao padrão, mas a `chave_euler` é mantida.

Nas próximas lives, basta dar dois cliques em **Zumbi LIVE** (ou em `ligar-tudo.bat`). No LIVE Studio, só na primeira vez, configure a tela em retrato e a **Captura de janela** da janela **"Herói contra Hordas"**. Depois é só clicar em **Entrar ao vivo**.

## Testar sem estar ao vivo

Dê dois cliques em **`1-testar-sem-live.bat`**. O jogo abre no navegador com um público de mentira: chegam votos, comentários, presentes, curtidas e seguidores sozinhos. Embaixo do jogo ficam botões para testar cada presente, cada voto e os outros eventos.

## No dia da live (sem o atalho)

1. Dois cliques em **`2-iniciar-na-live.bat`**. Deixe a janela preta aberta a live toda.
2. Dois cliques em **`3-abrir-janela-do-jogo.bat`**. Abre a janela em pé, só com o jogo.
3. No **TikTok LIVE Studio**: tela em **retrato**, fonte **Captura de janela** com a janela **Herói contra Hordas**, esticada na tela toda. Deixe o **áudio do sistema** ligado para o som ir junto.
4. **Entrar ao vivo.** Em até 1 minuto a janela preta mostra `✅ Ligado na live de @...`. Daí em diante, cada comentário aparece na janela preta (e se virou voto).

**Primeiro teste de verdade:** peça para um amigo comentar `2` num cruzamento e mandar uma Rosa. Na janela preta aparece o presente, e no jogo aparece o aviso com o nome dele e o herói se cura.

**OBS:** fonte **Navegador** com `http://localhost:8081/#live`, largura `1080` e altura `1920`. Marque "Controlar áudio pelo OBS".

---

## Como o jogo funciona

**O herói.** Anda sozinho pelo meio da rua, luta, pega os itens que caem e foge do que é perigoso demais. A cada zumbi derrotado ganha experiência; ao subir de nível as **perícias** dele sobem e **o chat escolhe uma habilidade nova** (veja "Habilidades", logo abaixo). Ele só muda quando morre. Cada novo sobrevivente é sorteado entre 5 personagens, cada um com o seu jeito de lutar:

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
| 🐺 Lobo zumbi (nível 20+) | fogo, impacto | tiro |
| 🦾 Braço longo (nível 20+) | corte, explosão | impacto |
| 🍅 Zumbi do tomate (nível 3+) | – | – |

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

**O ex-herói volta.** O herói anterior volta como **zumbi chefão**, com a roupa dele. Antes do nível 10 ele espera e aparece como **o chefe da próxima arena** (praça); do nível 10 em diante ele pode aparecer na rua. Derrotar ele solta a arma que ele usava (ou um baú, se era só a pistola).

**Limpar a área antes de seguir.** O herói não sai correndo pela cidade: em cada quarteirão nasce um número fixo de zumbis (a **cota da quadra**, que cresce com a ameaça), chegando em bandos **de todos os lados**. Quando ele chega no cruzamento com a decisão do chat, **só atravessa depois de matar todos os zumbis em volta**. O painel da votação mostra **🧟 LIMPE A ÁREA · faltam N**. Enquanto isso não nasce mais zumbi da rua, os que estão longe vêm correndo e o herói vai atrás dos que faltam, sem se afastar do cruzamento. Zumbi preso atrás de barricada ou parede, que nunca chega, some depois de uns segundos sem abate. Por segurança, depois de 90 s esperando ele atravessa de qualquer jeito. Zumbis mandados por presente também contam.

**Horda gigante a cada 5 quarteirões** (estilo Vampire Survivors). É rara e anunciada (**☠️ HORDA GIGANTE!**): chega de frente e por trás, em ondas de até 30 (8 s entre uma e outra), e precisa ser limpa pra seguir. A primeira (quarteirão 5) tem uns 25 zumbis. Depois do nível 10 elas crescem até 110. Não existe mais horda por tempo nem horda por nível.

**O ritmo da run (do nível 1 ao 30+).** Até o nível 10 é difícil de verdade (o herói fica com a vida baixa, mas quase nunca morre). No 10 ele ganha a suprema e passa a aguentar as hordas gigantes. A ameaça continua subindo e uma hora vence:

| Nível do herói | O que muda |
|---|---|
| 1 a 4 | **começo**: 20% a mais de zumbis na rua, 50% mais fortes (vida e dano). Chefe só na arena |
| 5 a 9 | **a parte mais difícil**: 30% a mais de zumbis, **2× mais fortes**. As habilidades ainda estão no começo. 💢 **Segundo fôlego** (até o nível 9): quando a vida cai abaixo de 20%, o herói solta um grito, **empurra e atordoa** os zumbis em volta, fica **3 s invencível** e recupera 20% da vida. Recarrega em 50 s, então dá pra morrer se apertar de novo |
| 10 | 🔥 **habilidade suprema** (escolha especial do chat). Enquanto o chat escolhe, os zumbis continuam como no nível 9. Com a suprema eles voltam ao normal (quantidade e força), e o herói fica forte o bastante pra encarar as hordas gigantes, que dali em diante crescem bem. A partir daqui: chefe de rua e ex-herói na rua |
| 19 | 🧯 a carta **Anti-explosão** passa a aparecer sempre (carta C) até o herói ter |
| 20 | 🐺 **novos inimigos**: **lobo zumbi** (corre e **salta** no herói: o salto **paralisa** e tem **50% de deixar sangrando**), **braço longo** (estica o braço e acerta **de longe**, até ~3 casas, com **30% de chance**) e 💣 **inchados instáveis** (muitos explosivos, estouro forte que atordoa e estoura os vizinhos em cadeia; a 🧯 Anti-explosão salva) |
| 30 | 🏖️ **a praia**: cada cruzamento tem **25%** de chance de dar na praia. Lá, uma horda maior **sai de dentro do mar** e o herói precisa **sobreviver 1 minuto**; depois vem um baú, um kit e a votação de **por onde sair** (esquerda, frente ou direita), e ele volta pra cidade em outro ponto |

Tudo anda mais devagar que antes (herói e zumbis), então tem menos decisão por minuto e mais tempo de ver a luta. Cada nível pede mais experiência que o anterior, e zumbi mais forte (ameaça maior) dá mais experiência.

**O som.** Todo som é gerado pelo jogo. O que acontece na rua (tiros, explosões, zumbis) passa por uma **acústica de verdade**: a câmera fica no alto, como num helicóptero, então tudo já chega um pouco mais grave. E quanto mais longe do herói, mais baixo, mais abafado (o ar absorve primeiro os agudos) e um tiquinho atrasado (a velocidade do som). A **pistola** é um estampido grave, curto e seco. A **explosão** é um estrondo fundo, que vai sumindo devagar e ecoa nos prédios. Jogar a granada faz só o "fffu" do braço. Com zumbi na tela, de vez em quando um deles **geme, rosna ou engasga** (3 vozes, nunca a mesma duas vezes seguidas; gordo e chefe têm a voz mais grossa, corredor e lobo mais fina). Zumbi morrendo solta o **último suspiro** (3 jeitos: gemido que termina num sopro, engasgo, estertor). Os **avisos da tela** (presente, voto, nível, baú, chefão...) seguem a mesma ideia, como um videogame de 16 bits ouvido de longe: poucos instrumentos (sino, marimba, metal grave e tambor), entrada suave, sem o brilho dos agudos e um eco curto. Coisa boa soa em sino, subindo; coisa ruim é grave, em metal e tambor. Tudo uma oitava abaixo, pra não ficar agudo. **Quando não tem nenhum zumbi na tela**, depois de 1,5 s o herói ouve só ele mesmo: **passos baixinhos** (no ritmo da caminhada, um pé de cada vez; asfalto na cidade, grama no parque e na praia, piso com eco dentro dos prédios) e a **respiração** lenta, que fica mais pesada e rápida com a vida baixa. A música abaixa pra 30% nessa hora e volta quando aparece zumbi: a solidão é o melhor momento.

**🍅 Zumbi do tomate.** Do nível 3 em diante, a cada quarteirão novo tem 35% de chance de aparecer um (é **um por vez**). É um feirante de camisa vermelha e boné verde com um tomate na mão. Ele fica de longe (recua se o herói chega perto) e **joga um tomate a cada 8 segundos**: dá pra ver o tomate voando em arco, e ele **sempre acerta** (vai atrás do herói). Dano pequeno (no máximo 5% da vida), mas **a tela da live fica suja de tomate**, como um vidro na frente da câmera:
- o tomatão esmagado **gruda no vidro num ponto sorteado** (qualquer lugar da tela, cada vez num), com casca, polpa, sementes e o cabinho, e respingos em volta;
- fica grudado 1,5 a 3 s e depois **escorrega devagar até cair pela borda de baixo**, deixando um **rastro esfregado** (listras vermelhas translúcidas, com uma semente ou um pedaço de casca aqui e ali), enquanto filetes de caldo escorrem na frente;
- a velocidade segue a **física de verdade** (`public/js/core/tomate.js`): polpa de tomate é um fluido de Bingham (só escorre quando o peso vence a "tensão de escoamento"), então `v = (m·g/A − τy) · h / η`, com tomate de 100 g (60% gruda), mancha de 10 cm, τy = 20 Pa, η = 1,5 Pa·s e camada de 1,5 mm. Ele começa a uns **5,5 cm/s**, vai perdendo massa no rastro e desacelerando, e o vidro não é uniforme, então escorrega aos trancos. A tela é um vidro de 36 x 64 cm: o tomate leva uns **13 s** pra descer. Os filetes de caldo (quase água) seguem a fórmula de filme escorrendo num vidro (Nusselt), entre 2 e 9 cm/s, e param quando o caldo acaba;
- depois que o tomate cai, o rastro seca e some em uns 12 s. O jogo continua por trás o tempo todo. Ele conta pra limpar a área.

**A cidade vai sendo destruída.** Quanto mais tempo a run dura, mais destruídas vêm as ruas e prédios novos: começa depois de 1 minuto e chega no máximo com 10 minutos.
- 🕳️ **buracos no asfalto** (machucam e deixam lento)
- 🚗 **carros batidos fechando a rua** (engavetamento)
- 🔥 **carros pegando fogo** (fogo no chão em volta)
- 🏢 **prédios pegando fogo**, com fumaça
- 🧍 **pessoas fugindo** gritando, ou **sendo devoradas** por zumbis e **pedindo socorro**. É só cenário: ninguém interage com elas

**A câmera gira com o herói.** Ele sempre anda para cima e para a direita (↗). Por isso, na votação, **1 é sempre ↖ esquerda, 2 é ↗ frente, 3 é ↘ direita e 5 é ↙ voltar**. As mesmas setas aparecem desenhadas no chão do cruzamento.

**📊 Gráfico de atributos (comente G).** No lado direito da tela fica um botãozinho **"📊 Digite G"**. Quando alguém comenta **G** (ou "gráfico", "status", "atributos"), abre por 15 s um painel translúcido no terço da direita com os atributos do herói: 💪 Força, 🎯 Crítico, ⚡ Ataque (velocidade de ataque), 👟 Velocidade, 🛡️ Defesa, 💨 Esquiva, ❤️ Vida e 💚 Regeneração, cada um com o valor e **5 bloquinhos**. Os bloquinhos são uma régua: o **máximo** de cada atributo daquele personagem é dividido em 5 partes, e o herói ganha um bloco por parte cheia, **sempre arredondando pra baixo** (4,8 de 5 = 4 blocos). O máximo é o "herói perfeito" de cada personagem, somando tudo que o jogo oferece: base da classe, perícias no nível 40 com treino no máximo, passivas no nível 5, drops com 5 pilhas, fúria, foco, blindado, tiro rápido, instinto, torcida cheia, adrenalina, a melhor suprema e uma runa, respeitando os limites do jogo (velocidade até 2,2x, defesa até 60%, esquiva até 45%, ataque até 6x). Por isso a Força máxima do policial (x31, perícia de armas cresce rápido) é maior que a do mecânico (x10), e a vida máxima da bombeira (1.400) é a maior. O cálculo fica em `public/js/core/grafico.js`.

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
| 🔸 Cacos de vidro | corta (sangramento) e deixa lento. No herói o corte e o sangramento são **6× mais fracos** que nos zumbis. **Pisando no vidro o herói não se cura**: regeneração, cura por golpe e cura de status param, e a mochila espera. Cura de presente ou de item (Rosa, kit, suprimento) fica **guardada** e sai assim que ele pisa fora. Só se a vida zerar a mochila salva mesmo no vidro. **Com 30% de vida ou menos, o herói não pisa em vidro**: desvia pro lado, não vai buscar item em cima de vidro e, se estiver em cima quando chegar nos 30%, **sai na hora** rumo ao objetivo. Se a rua estiver tomada de vidro de lado a lado, espera 4 s e atravessa (pra não travar) |
| ➰ Arame farpado | corta muito (sangramento) e deixa **bem** lento |
| 🔥 Fogo | queima e ilumina a noite. Explosões deixam fogo no chão por uns segundos. No herói o fogo e o "queimando" são **4× mais fracos** (zumbi queima com força total) |
| 🧪 Ácido | dano químico, pode infectar e quebra a armadura dos zumbis |
| ⚡ Fios elétricos | choque que **atordoa**; liga e desliga, piscando |
| 🟫 Lama | metade da velocidade |
| 💧 Água (lagos do parque) | bem lento, mas **apaga o fogo** de quem está queimando |
| 🧱 Entulho | deixa lento |
| 🕳️ Buraco (cidade destruída) | machuca, pode deixar lento |

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
| ☠️ Perigoso | 80% | aparece um perigo e a ameaça sobe um pouco: ⚠️ emboscada (zumbis dos dois lados), 🧟 rua lotada, 🏃 corredores, 💣 explosivos, 🌑 rua escura ou 👹 chefe de rua (só a partir do nível 10). Antes do nível 10, as hordas dos caminhos são maiores |
| 🍃 Livre | 18% | nenhum zumbi novo até o próximo cruzamento: hora de respirar |
| 📜 História | 2% | rua livre com um papel brilhando no chão: um fragmento da história |

**A história.** São 12 fragmentos em 3 capítulos ("Os Diários de Porto Sereno"), encontrados um por vez, na ordem. O progresso continua de um herói para o outro e de uma live para a outra. Para escrever ou mudar a história, mexa só no arquivo `public/js/core/historia.js` (as instruções estão no começo dele).

**O nível de ameaça (☠️).** Começa em 1 e sobe com o tempo vivo, com os quarteirões andados, com cada caminho perigoso e com o nível do herói. Assim, quanto mais forte o herói fica, mais fortes os zumbis ficam. A cada nível os zumbis nascem com mais vida, dano, velocidade e **resistência** (ignoram parte do dano; ver também as fraquezas de cada zumbi acima), aparecem mais zumbis em cada quarteirão e as **hordas ficam maiores**: a horda gigante a cada 5 quarteirões e também as mandadas por presentes. De tempos em tempos vem uma **noite** (escuro, mais zumbis). Quando a vida está muito baixa, o jogo alivia um pouco os zumbis normais (os mandados pelo público nunca são aliviados).

**Habilidades (a cada nível, o chat escolhe).** Quando o herói sobe de nível, aparece embaixo da tela uma escolha com 3 cartas. O chat vota comentando só a letra: **A**, **B** ou **C** (os números continuam sendo da direção, então as duas votações podem rolar ao mesmo tempo). A contagem tem a mesma janela de votos atrasados da live. Se ninguém votar, a IA escolhe. Se subir vários níveis de uma vez, as escolhas vêm uma depois da outra.

- **A = aprimorar** algo que o herói já tem (sobe o nível de uma habilidade ou passiva, ou um **treino** de +1 de perícia no ataque principal)
- **B = algo novo**: uma habilidade ativa nova (no máximo 3 ao mesmo tempo) ou uma arma nova
- **C = uma passiva nova**

Quando falta alguma categoria, a carta é completada com outra. Cada habilidade e passiva vai até o nível 5, e **cada nível fortalece muito**: a força (dano, bônus) é a do nível 1 multiplicada por **1× · 3× · 5× · 7,5× · 10×** (do nível 1 ao 5). Ou seja, **o nível 2 triplica** o nível 1. Habilidades que disparam também ficam mais rápidas a cada nível.

| Habilidade ativa | O que faz (dispara sozinha) | Nível 1 | Nível 2 | Nível 5 |
|---|---|---|---|---|
| 💣 Granada | joga no maior grupo de zumbis, explode (não machuca o herói) | 45 de dano a cada 6,5 s | 135 a cada 6 s | 450 a cada 4,5 s |
| ⚡ Raio em cadeia | pula de zumbi em zumbi e pode atordoar | 18 de dano, 4 zumbis | 54, 5 zumbis | 180, 8 zumbis |
| 🌀 Lâminas giratórias | lâminas girando em volta do herói, fazem sangrar | 2 lâminas, 9 de dano | 2 lâminas, 27 | 4 lâminas, 90 |
| 🍾 Coquetel molotov | fogo no chão onde tem mais zumbi (o fogo dele não queima o herói) | fogo normal | fogo 3× | fogo 10× |
| 🛸 Drone atirador | um drone voando em volta atira sozinho | 6 de dano | 18 | 60 |
| 💫 Onda de choque | quando fica cercado, empurra e atordoa todo mundo em volta | 16 de dano | 48 | 160 |

| Passiva | Nível 1 | Nível 2 | Nível 3 | Nível 4 | Nível 5 |
|---|---|---|---|---|---|
| ❤️ Vitalidade (vida máxima) | +15% | +45% | +75% | +113% | +150% |
| 🛡️ Couro grosso (defesa) | +4% | +12% | +20% | +30% | +40% |
| 👟 Pernas rápidas (velocidade) | +5% | +15% | +25% | +38% | +50% |
| 🎯 Olho de águia (crítico) | +5% | +15% | +25% | +38% | +50% |
| 🔁 Mãos rápidas (velocidade de ataque) | +10% | +30% | +50% | +75% | +100% |
| 💪 Força (dano em tudo, habilidades também) | +10% | +30% | +50% | +75% | +100% |
| 💚 Regeneração (vida por segundo) | 0,5 | 1,5 | 2,5 | 3,8 | 5 |
| 🦇 Vampirismo (cura por golpe de perto) | 0,5 | 1,5 | 2,5 | 3,8 | 5 |
| 💨 Reflexos (chance de desviar) | 3% | 9% | 15% | 22% | 30% |
| 🧯 **Anti-explosão** (menos dano de explosão) | 8% | 24% (e o estouro do inchado não atordoa mais) | 40% | 60% | 80% |

**🧯 Anti-explosão: a passiva que salva do nível 20 em diante.** Antes do 19 ela é rara nas cartas e quase não faz falta. Do **nível 19** em diante ela é **sempre a carta C** até o herói ter, aparece bem mais pra aprimorar e, se ninguém votar, a IA escolhe ela. É que no nível 20 chegam os 💣 **inchados instáveis**: o explosivo passa a aparecer muito mais (na rua e em 30% das hordas), o estouro cresce com a ameaça (2,2× mais forte e maior), **atordoa o herói** por 1 s e **estoura os explosivos em volta** (reação em cadeia). Sem a passiva, os inchados viram a maior causa de dano depois do nível 20 (38% a 48%); com ela, caem pra 25% a 33%. No simulador com presentes, o herói dura em média **~18 min com a Anti-explosão e ~14 min e meio sem ela**. O mecânico (50%) e a bombeira (30%) já nascem resistentes a explosão.

**🧬 Combos (habilidade + passiva).** Quando o herói tem uma habilidade **no nível 3 ou mais** e a **passiva que combina com ela**, a carta **A** vira um **COMBO** (carta roxa, com a receita na etiqueta). Escolhendo, a habilidade evolui para uma versão **muito mais forte**, que junta a força das duas (de 2,5× a 5× o dano da habilidade no nível máximo, medido no teste). A passiva continua com o herói, e **cada nível a mais da passiva deixa o combo mais forte** (do nível 1 ao 5 da passiva, o combo vai de 1× a 2×). A habilidade evoluída aparece no cartão do herói com ★. Se ninguém votar, a IA quase sempre escolhe o combo.

| Combo | Receita | O que faz (passiva nível 1) |
|---|---|---|
| ☄️ Bomba de fragmentação | 💣 Granada + 💪 Força | a cada 3 s, bomba de 800 de dano que solta 6 explosões menores em volta |
| 🌩️ Tempestade elétrica | ⚡ Raio em cadeia + 🎯 Olho de águia | a cada 1,8 s, 3 raios que pulam em 8 zumbis cada · 380 de dano, sempre atordoa e pode dar crítico |
| 🩸 Lâminas vampíricas | 🌀 Lâminas giratórias + 🦇 Vampirismo | 6 lâminas de sangue · 200 de dano, sempre fazem sangrar e cada corte cura o herói |
| 🐦‍🔥 Fogo da fênix | 🍾 Coquetel molotov + 💚 Regeneração | a cada 4 s, 3 molotovs com fogo 14× mais forte; pisar no fogo **cura** o herói |
| 🛰️ Esquadrilha de drones | 🛸 Drone atirador + 🔁 Mãos rápidas | 3 drones atirando a cada 0,3 s · 60 de dano cada tiro |
| 🏰 Fortaleza | 💫 Onda de choque + 🛡️ Couro grosso | a cada 4 s, onda gigante de 600 de dano que atordoa e deixa o herói blindado (+40% de defesa) |

**🔥 Habilidade SUPREMA (nível 10).** O nível 10 é a virada: até ali o herói sofre, e daí em diante as hordas gigantes crescem bem. Por isso, ao chegar no 10, a escolha é especial: as 3 cartas são **habilidades supremas**, bem mais fortes que as normais, e o herói fica com uma delas até o fim. Essa escolha **passa na frente** das escolhas de níveis anteriores que ainda estiverem na fila. Enquanto o chat escolhe, a horda gigante espera. Ao ganhar a suprema o herói também recupera 30% da vida, e os zumbis deixam de vir reforçados (o reforço é só até o nível 9).

| Suprema | O que faz |
|---|---|
| ✈️ Ataque aéreo | a cada 11 s caem 6 bombas nos maiores grupos de zumbis (75 de dano cada, não machucam o herói) |
| ☀️ Aura de fogo | anel de fogo em volta do herói: 26 de dano por segundo em quem chega perto e deixa os zumbis lentos |
| ❤️‍🔥 Coração de ferro | +15% de defesa e +1,2 de vida por segundo; quando ia cair (ou a vida fica abaixo de 25%), explode uma onda que empurra e atordoa, cura 45% e fica 3 s invencível (uma vez a cada 40 s) |

**Armas novas** (aparecem na carta B quando fazem sentido): 💥 **Escopeta** no lugar da pistola, de vez (recarrega sozinha), e 🏏 **Taco com pregos** no lugar do empurrão, sem quebrar. 

**Subir de nível não cura** (a vida atual fica como estava), mas a **vida máxima cresce com o nível**: +10% da vida do personagem a cada nível até o 20 e +3% por nível depois (o Policial vai de 100 no nível 1 para 190 no 10, 290 no 20 e 320 no 30). Isso multiplica com a Vitalidade.

**Limites dos atributos:** defesa até 60%, chance de desviar até 45% e velocidade até 2,2×, somando tudo (personagem, perícias, passivas, presentes). Sem isso, defesa + esquiva + velocidade deixavam o herói intocável.

**A torcida (📣).** Comentar também ajuda: cada pessoa diferente que comentou nos últimos 30 segundos dá +3% de dano e um pouco de regeneração ao herói (até 10 pessoas).

**O atraso da live (e por que nada se perde).** Quem assiste pelo TikTok vê a tela uns segundos **atrasada** (`atraso_da_live_segundos`, 6 por padrão). O jogo foi feito pensando nisso:

- **Votação:** a contagem na tela termina 6 segundos antes da votação fechar de verdade. Aí aparece **⏳ CONTANDO VOTOS DA LIVE...** e os votos de quem viu a contagem atrasada **ainda valem**. Para quem assiste, o 0 da contagem chega bem na hora em que a votação fecha. O herói **anda no ritmo da votação**: vai mais devagar pra chegar no cruzamento junto com o resultado, em vez de ficar parado esperando.
- **Herói caído:** quando a vida zera, o herói **não morre na hora**. Ele fica **CAÍDO** por 12 segundos (`segundos_caido`), com um painel grande contando o tempo. **Qualquer presente que ajuda (ou seguir) levanta o herói**: volta com vida (50%, depois 40%, 30%... no mínimo 20%), fica 3 s invencível e solta uma onda que empurra e atordoa os zumbis em volta. **Um presente que atrapalha dá o golpe final:** ele morre em 2,5 s, a não ser que alguém salve nesse tempo, e quem mandou leva o crédito de quem derrubou o herói. Compartilhar e curtidas não levantam (são de graça e sem limite).
- **Presentes inteligentes:** o presente sempre serve pra alguma coisa, chegue na hora que chegar:

| Presente chega quando... | Vira |
|---|---|
| cura com a vida cheia | o que sobra vira 🛡️ **blindado** (menos dano por 1 ou 2 quarteirões) |
| kit com a vida baixa (menos de 60%) | cura **na hora**, direto no herói |
| kit com a vida alta | vai pra 💼 **mochila** (até 3). Ele usa sozinho quando a vida cai pra menos de 35%, e o kit da mochila **segura o herói de pé** quando a vida zera |
| munição pra quem luta de perto (sem arma de fogo) | 😤 **fúria** |
| colete com o colete cheio | 🛡️ **blindado** |

- **Resposta na hora:** todo presente mostra o emoji e o nome de quem mandou **em cima do herói** no instante em que chega, mesmo os que entram na fila.

**Quanto dura.** Sem ninguém interagindo, o herói cai em uns **3 minutos e meio** (contando os 12 segundos caído). Com chat e presentes que ajudam, dura bem mais. Esse é o estímulo pra live participar. (Números medidos no simulador estão em "Equilíbrio", mais abaixo.)

## Presentes

### Recompensas pra quem dá presente (pensadas pra live de quem tem pouca moeda)

Todo presente continua fazendo o que faz (tabela abaixo). Além disso:

- **🪂 Presente de AJUDAR de 1 moeda (Rosa): cai um DROP de paraquedas.** Uma caixa roxa com ❓ desce devagar, balançando, perto do herói (uns 5 segundos, pra todo mundo ver). Quando ele pega, aparece o **bônus sorteado**, que dura **5 quarteirões**. Os bônus **acumulam**: pegar o mesmo de novo soma uma pilha (fica mais forte, até x5) e o tempo volta pros 5 quarteirões; bônus diferentes valem juntos. Presente repetido (Rosa x5) solta uma caixa por unidade (até 5).

  | Bônus | Por pilha |
  |---|---|
  | 💪 Força do chat | +15% de dano |
  | ⚡ Dedo nervoso | ataca 15% mais rápido |
  | 🛡️ Casca grossa | +6% de defesa |
  | 💚 Fôlego | recupera 1,5 de vida por segundo |
  | 🎯 Olho vivo | +5% de crítico |
  | 👟 Pernas leves | +6% de velocidade |
  | 🍀 Sortudo | +25% de experiência |

- **😈 Presente de ATRAPALHAR de 1 moeda (TikTok, Sorvete):** além do efeito dele, sorteia uma de duas surpresas:
  - **🚗 Conversível dos zumbis**: um conversível vermelho cheio de zumbi em pé no banco, de braços pra cima, corta a rua do herói (de frente ou por trás), buzinando. **Quem estiver na frente perde metade da vida ATUAL**: o herói, os zumbis e até chefe (até o colosso!). Todo mundo é jogado pro lado e fica tonto um instante. Metade da vida atual nunca mata. O herói às vezes percebe e pula pro lado, às vezes não. No fim aparece o placar ("🚗 atropelou 9 zumbis e o herói!"). O motor tem Doppler: mais agudo chegando, mais grave indo embora.
  - **🪂🧟 Zumbi paraquedista**: um zumbi desce de paraquedas seguindo o herói e **cai em cima dele, agarrado na perna**: o herói fica **lento só no quarteirão em que foi agarrado**, com o zumbi pendurado. Mais de um pendurado (até 3) deixa ainda mais lento. Assim que ele atravessa o próximo cruzamento (a direção que o chat escolheu), o zumbi solta e vira um zumbi normal no chão (tem que matar pra limpar a área). Se o herói estiver invencível, o zumbi quica e cai do lado.

- **🎵 Zumbis do fã (TikTok):** os 3 zumbis que o TikTok manda levam **o nome e a foto do perfil** de quem mandou numa bolinha em cima da cabeça (sem foto, a inicial), brilham em ciano e rosa e são **mais fortes** (2x a vida, 1,3x o dano) e **mais rápidos** (1,6x). **Cada um consegue acertar o herói pelo menos uma vez**: até o primeiro golpe que entra (ou que bate no colete) ele tem um escudo 🛡️ e não morre, e o herói nem perde tempo atirando nele. Depois do golpe, vira um zumbi forte normal. Pra nunca travar, o escudo some sozinho em 25 s. São sempre 3 por TikTok (não crescem com a ameaça) e eles não levam o reforço do começo do jogo.

- **✨ Doação (presente de 2 moedas ou mais):**
  - **Inspiração**: por 10 segundos o herói brilha dourado, **toma só 20% do dano** e solta pulsos de luz que machucam todos os zumbis em volta.
  - Ganha um **drop** também.
  - **👹 Vem um COLOSSO no próximo quarteirão**, com o nome de quem doou ("Colosso de ana.lu"). Tem uns **10 mil de vida** (cresce com o nível do herói) e começa batendo muito forte: cada golpe tira 10% da vida do herói e atravessa armadura, colete e esquiva. É condicional: **quando a vida do herói chega em 30%, o colosso CANSA** (😵 em cima dele): fica lento, **toma 3x mais dano** e bate bem mais fraco, pra o herói virar a luta. Se a luta passar de 75 segundos, ele cansa também. O herói não fica lento. Só um colosso por vez (outras doações enquanto ele está vivo dão inspiração e drop).
  - **🔮 Vencendo, o colosso deixa uma RUNA**: uma habilidade única de **dano** ou de **resistência** que gruda numa habilidade que o herói já tem e **cresce junto com ela**. Runa de dano: aquela habilidade causa **+25% de dano por nível dela** (granada nível 3 = +75%). Runa de resistência: **+4% de defesa por nível** da habilidade. Subiu a habilidade, a runa fica mais forte. Sem habilidade ainda, a runa vai pro ataque principal (+10% de dano por nível de treino). As runas aparecem no cartão do herói com 🔮.

Os valores ficam no `config.json` → `jogo`: `drop_ate_moedas` (1), `doacao_a_partir_de_moedas` (2), `inspiracao_segundos` (10) e `vida_do_colosso` (10000). O resto (bônus, força das runas, quando o colosso cansa) fica em `public/js/core/recompensas.js`.

Tudo que **ajuda** acontece na hora (e se adapta à situação, veja "O atraso da live" acima). Tudo que **atrapalha** entra numa fila: sai um a cada meio segundo e **nada sai nos primeiros 15 segundos de um herói novo** (proteção de nascimento). Presentes caros furam a fila. Os efeitos aparecem sempre **na rua logo à frente do herói**, então quem mandou vê o resultado em poucos segundos.

**Bônus duram quarteirões, não segundos.** Tiro rápido, fúria, foco, blindado, arma lendária, cachorro e sobrevivente ajudante e o invencível do helicóptero valem pelos **próximos N quarteirões** que o herói andar (ex.: "tiro rápido nos próximos 3 quarteirões"). Cada cruzamento conta 1; sair de prédio, 1; sair da arena ou da praia, 2. Na tela, o que falta aparece com 📍 (ex.: `⚡ tiro rápido 📍2`). O que não é bônus continua em segundos: proteção de nascimento, sangramento, atordoado, queimando, e os efeitos de quem atrapalha (noite, alarme, vidro).

| Presente | Moedas | Lado | O que acontece |
|---|---|---|---|
| 🌹 Rosa | 1 | ajuda | cura +14% na hora |
| 🍦 Sorvete | 1 | atrapalha | cacos de vidro na rua: herói fica lento |
| 🎵 TikTok | 1 | atrapalha | 3 **zumbis do fã**: nome e foto de quem mandou em cima da cabeça, brilho ciano e rosa, mais fortes e rápidos, e cada um acerta o herói pelo menos uma vez (veja abaixo) |
| 🫰 Coração com dedos | 5 | ajuda | munição + **tiro rápido nos próximos 3 quarteirões** (combo soma +1 por presente, até 8). Quem luta de perto ganha fúria |
| 🧴 Perfume | 20 | atrapalha | horda de 8 zumbis |
| 🍩 Rosquinha | 30 | ajuda | kit médico (+35%): cura na hora ou vai pra mochila |
| 🎩 Chapéu e Bigode | 99 | atrapalha | zumbi que explode |
| 🫶 Mãos de coração | 100 | ajuda | colete que segura 4 golpes |
| 🐶 Corgi | 299 | ajuda | cachorro ajudante por **4 quarteirões**, com o nome de quem mandou |
| 🔫 Arma de Dinheiro | 500 | ajuda | baú com escopeta ou taco com pregos |
| 🦢 Cisne | 699 | atrapalha | carro com alarme: horda chegando por 20 s |
| 🚂 Trem | 899 | atrapalha | 15 corredores e rua bloqueada atrás |
| 🌌 Galáxia | 1.000 | ajuda | **baú lendário**: metralhadora ou lança-chamas por **3 quarteirões** |
| 🎆 Fogos | 1.088 | atrapalha | **chefão** com o nome de quem mandou |
| 🦁 Leão | 29.999 | atrapalha | **Rei Zumbi** gigante + noite por 60 s |
| 🪐 Universo | 34.999 | ajuda | **helicóptero de resgate**: limpa a tela, cura tudo e invencível até o fim do quarteirão |
| Outros presentes | – | ajuda | pelo valor: 1 = cura, 5 = munição, 20 = kit, 100 = colete, 299 = cachorro, 500 = baú, 1.000 = baú lendário, 20.000 = helicóptero |

**De graça:**

| Ação | O que acontece |
|---|---|
| 💬 Comentar | vota no cruzamento (1 a 5) e na habilidade (A, B ou C). O nome de quem comenta ou entra na live pode aparecer num zumbi |
| ➕ Seguir | um sobrevivente com o nome da pessoa ajuda por 1 quarteirão |
| 🔁 Compartilhar | cai uma caixa de munição |
| ❤️ Curtidas | a cada 300 curtidas cai um suprimento de avião (cura ou munição) |

**Combos:** quem manda várias Rosas seguidas recebe um aviso só, que vai somando ("x5"), e cada Rosa cura de novo. Cada TikTok seguido manda mais 3 zumbis.

**Presentes com o herói caído:** os que ajudam levantam ele; os que atrapalham dão o golpe final.

**Presentes com o herói morto** (depois do tempo caído): os que ajudam ficam guardados para o próximo herói. Os que atrapalham esperam a proteção dele acabar.

**Os nomes em inglês** (`Rose`, `Donut`, `Lion`...) são os que o TikTok manda. Se um presente da tabela não existir mais ou tiver outro nome, ele aparece na janela preta quando alguém manda; é só trocar no `config.json`.

## O que aparece na tela

A tela é dividida em três faixas fixas, para **nada cobrir o herói** (ele fica no meio, um pouco abaixo do centro):

- **Em cima:** o cartão do herói (personagem, nível, nome, arma, barra de vida com colete, barrinha de experiência e as **habilidades** que ele já tem, com o nível de cada uma). Embaixo, uma linha com quarteirões, recorde, zumbis derrotados, ameaça, tempo vivo e curtidas; depois os efeitos ativos (proteção, noite, prédio, cachorro...). Por último, **a votação da direção**, com o tempo correndo, os votos e quem está na frente em amarelo; ruas bloqueadas riscadas; no fim, "contando votos da live" e o resultado. Com o herói caído, o painel de **herói caído** aparece no lugar da votação.
- **No meio:** só o jogo. Os avisos (chefão, horda, nível, noite, alarme, recorde) são curtos e ficam logo abaixo da votação, acima do herói.
- **Embaixo:** os avisos de presente (com a foto de quem mandou: verde ajuda, vermelho atrapalha), a legenda de presentes (muda a cada 5 segundos) e os rankings **🛡️ quem mais ajudou** e **😈 quem mais atrapalhou**. Quando o herói sobe de nível, a **escolha de habilidade** (A, B, C) aparece no lugar da legenda e dos rankings até o resultado.
- **No fim da rodada:** primeiro os números (quarteirões, zumbis, tempo, nível, prédios, recorde), depois os destaques (quem mais ajudou, quem mais atrapalhou, quem derrubou o herói) e o **Hall dos heróis** com os 3 que mais andaram.

## Ajustes no `config.json`

**Em `jogo`:**

| Campo | Para que serve | Padrão |
|---|---|---|
| `segundos_de_votacao` | tempo da contagem de cada votação | 10 |
| `atraso_da_live_segundos` | atraso da tela do TikTok para quem assiste: a votação fica aberta esse tempo a mais e a contagem do herói caído desconta ele. Se o seu atraso for maior, aumente. 0 desliga | 6 |
| `segundos_caido` | quanto tempo o herói fica caído esperando um presente antes de morrer. Deixe pelo menos o atraso + 5. 0 = morre na hora | 12 |
| `segundos_escolha_habilidade` | tempo da contagem da escolha de habilidade (A, B, C) ao subir de nível (mais o atraso da live) | 12 |
| `segundos_do_relatorio` / `segundos_dos_destaques` | tempo de cada parte do relatório | 10 / 12 |
| `protecao_ao_nascer_segundos` | segundos sem nada que atrapalhe no começo de cada herói | 15 |
| `curtidas_por_suprimento` | curtidas para cair um suprimento (0 desliga) | 300 |
| `maximo_zumbis` | limite de zumbis ao mesmo tempo (os do público passam um pouco disso) | 90 |
| `velocidade_do_heroi` | casas por segundo | 1.1 |
| `ameaca_por_minuto` / `ameaca_por_quarteirao` / `ameaca_por_caminho_perigoso` / `ameaca_por_nivel_do_heroi` | quanto cada coisa faz a ameaça subir (1 = um nível inteiro). Maior = heróis morrem mais rápido | ver config |
| `zumbis_na_rua_base` / `zumbis_na_rua_por_nivel` | zumbis normais na rua ao mesmo tempo, no nível 1 e a mais por nível | ver config |
| `zumbis_por_quarteirao` / `zumbis_por_quarteirao_por_nivel` | **cota da quadra**: quantos zumbis da rua nascem em cada quarteirão (o herói precisa matar todos pra atravessar), no nível 1 e a mais por nível | 24 / 2 |
| `horda_a_cada_quarteiroes` | de quantos em quantos quarteirões vem a **horda gigante** (0 desliga) | 5 |
| `horda_base` / `horda_por_nivel` | tamanho das hordas dos caminhos perigosos (rua lotada, emboscada, rua escura), no nível 1 e a mais por nível | ver config |
| `horda_a_cada_segundos` | horda que chega sozinha por tempo, do nível 10 em diante (antiga; 0 = desligada, o padrão) | 0 |
| `caminho_perigoso_porcento` / `caminho_livre_porcento` / `caminho_historia_porcento` | chance de cada tipo de caminho | 80 / 18 / 2 |
| `torcida_maximo_pessoas` | quantas pessoas da torcida contam no máximo (0 desliga a torcida) | 10 |
| `noite_a_cada_segundos` / `noite_dura_segundos` | ciclo da noite (0 desliga) | 150 / 35 |
| `segundos_dentro_do_predio` | quanto tempo até o alarme mandar ele sair | 70 |
| `drop_ate_moedas` | presente de até tantas moedas: o de ajudar solta um drop; o de atrapalhar manda o conversível ou o zumbi paraquedista | 1 |
| `doacao_a_partir_de_moedas` | presente a partir de tantas moedas é doação: inspiração, drop e colosso | 2 |
| `inspiracao_segundos` | quanto dura a inspiração | 10 |
| `vida_do_colosso` | vida do colosso no nível 1 do herói (+25% por nível) | 10000 |

**Presentes:** em `presentes` → `por_nome`, cada presente tem `efeito` e os números do efeito. Os efeitos que existem:

| Efeito | Números | Lado |
|---|---|---|
| `cura` | `valor` (% da vida) | ajuda |
| `kit` | `valor` (% da vida; cura na hora ou vai pra mochila) | ajuda |
| `municao` | `quarteiroes` de tiro rápido | ajuda |
| `colete` | `golpes` | ajuda |
| `cachorro` | `quarteiroes` | ajuda |
| `aliado` | `quarteiroes` | ajuda |
| `bau` | `raridade`: `"medio"` ou `"lendario"` | ajuda |
| `caixa_municao`, `suprimento` | – | ajuda |
| `helicoptero` | `quarteiroes` invencível | ajuda |
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

| Cenário | Quanto o herói dura em média | Nível médio | Antes do nível 10 |
|---|---|---|---|
| Sem nenhuma interação | **4 min** (o mais longo 7 min 11 s) | 10 | mais da metade cai entre o 5 e o 9 (sem curtida, torcida nem presente, ninguém ajuda) |
| Só chat (6 pessoas comentando e votando, curtidas) | **8 min 23 s** | 17 | quase ninguém cai; a vida chega a ~40-60% entre o 5 e o 9. A maioria cai entre o nível 15 e o 24 |
| Chat + presentes misturados (8 por minuto) | **~28 min** (a maioria cai no **golpe final** de quem atrapalha; o mais longo 35 min). Uns 70 colossos em 6 heróis, quase todos vencidos, luta de ~45 s | 40+ | ninguém cai |
| Chat + só presentes que ajudam (4 por minuto) | ~30 min (o mais longo 35 min) | 40+ | ninguém cai |
| Chat + só presentes que atrapalham (4 por minuto) | 4 min 37 s (os zumbis do fã e o conversível apertam de verdade). O colosso também aperta: 3 de cada 4 cansaram | 13 | uns 4 de cada 10 caem antes do 10 |

Os primeiros níveis vêm rápido (a primeira escolha de habilidade sai no primeiro minuto) e depois cada nível pede mais. O nível 10 chega por volta dos 3 minutos em lives com chat; o 20 (lobos e braços longos), em lives que ajudam; o 30 (praia), em lives muito engajadas. Cada quarteirão leva perto de 1 minuto (limpar a área inclusive), então a horda gigante vem a cada 4 ou 5 minutos.

Como as habilidades deixam o herói bem mais forte a cada nível, a ameaça também sobe com o nível do herói (`ameaca_por_nivel_do_heroi`, 0.45): quanto mais forte ele fica, mais forte vem a horda. E, como as habilidades e combos crescem **multiplicando**, da ameaça 18 em diante os zumbis também crescem **multiplicando** (+9% de vida e +6% de dano por nível de ameaça, acumulando; `dano.js` → `ESCALA_AMEACA`, `aceleraDesde`, `vidaExp`, `danoExp`): vida ×1,8 na ameaça 25 e ×6,6 na 40. Assim o herói fica muito forte, mas a horda sempre acaba vencendo.

**Sem tempo limite:** a run dura o quanto a live aguentar. A única trava é contra herói imortal **sem ninguém ajudando**: se passar 4 minutos sem nenhum presente de ajuda (ou seguir), os zumbis que nascem batem **60% mais forte e aguentam 60% mais** a cada minuto, e ficam um pouco mais rápidos (+3% por minuto, até +50%; senão um herói que deixa os zumbis lentos e empurra todo mundo segura a horda longe pra sempre). Um presente de ajuda zera essa conta. O herói também nunca fica parado: se passar do cruzamento, volta; se for empurrado pra outra rua, volta contornando os prédios; se ficar muito tempo sem avançar, abre caminho pela horda; se travar, ou se passar 75 s na mesma quadra sem conseguir chegar no cruzamento (empurrado pra frente e pra trás por uma horda gigante), é levado até o cruzamento. Lá ele ainda precisa limpar a área (no máximo 90 s esperando).

O que mais mexe nisso é `ameaca_por_minuto` (maior = partidas mais curtas) e o tamanho/frequência das hordas. Subir a ameaça devagar e começar com mais pressão faz a ajuda do público render mais; subir rápido deixa tudo mais curto, com ou sem ajuda.

## Para quem mexe no código

Cada assunto tem o seu arquivo em `public/js/core/`:

| Arquivo | O que tem |
|---|---|
| `dano.js` | **todas as contas de combate**: tipos de dano, fraquezas e resistências dos zumbis (AFINIDADES), perícias, atributos do herói (vida, dano, cadência, velocidade, defesa, esquiva, resistências por tipo, crítico, alcance, cura, cura por golpe, regeneração), dano de armas, corpo a corpo, fogo, zumbis, explosões, aliados e torcida. Buff novo = um modificador (`h.attr.addMod(...)`); as instruções estão no começo do arquivo |
| `ameaca.js` | quando a ameaça sobe, quantos zumbis vêm (cota da quadra, hordas, grupos, prédios), **limpar a área** (raio, quanto tempo espera), o **começo puxado** (até o nível 5 e 10: `calmoMult`/`calmoForca`, `medioMult`/`medioForca`), a **horda gigante a cada 5 quarteirões**, os **inimigos do nível 20**, os **inchados instáveis** (`EXPLOSAO`) e a trava contra herói imortal sem ajuda. O **segundo fôlego** fica em `jogo.js` → `FOLEGO` |
| `caminhos.js` | as chances dos caminhos e os tipos de perigo |
| `historia.js` | a história (só texto) |
| `status.js` | os status positivos e negativos (sangrando, atordoado, fúria...) |
| `dados.js` | **personagens** (arma, golpe, perícias, crescimento por nível, atributos, passiva), zumbis (vida, dano, tipo de ataque), armas e golpes (tipo de dano, perícia, efeitos) e melhorias de nível |
| `efeitos.js` | o que cada presente faz |
| `ambiente.js` | **perigos do chão** (vidro, arame, fogo, ácido, fios, lama, água, entulho): dano, status e lentidão |
| `city.js` | a cidade: bairros, ruas, bloqueios, ruas sem saída, praças, lojas e o **desgaste** (buracos, carros batidos e em chamas, prédios pegando fogo: `DESGASTE`) |
| `praia.js` | **a praia** do nível 30: chance, tempo pra sobreviver, ondas do mar e o mapa |
| `room.js` | o lado de dentro dos prédios (tamanho, móveis, loot e perigos de cada tipo) |
| `votacao.js` | as opções, as palavras do chat e a janela de votos atrasados |
| `habilidades.js` | **as habilidades do roguelike**: ativas, passivas, armas novas, treino, como as 3 cartas são sorteadas e o que a IA escolhe. Habilidade nova = acrescentar em `ATIVAS` ou `PASSIVAS` (instruções no começo do arquivo) |
| `jogo.js` | o resto: herói, zumbis, arena, herói caído, mochila e presentes inteligentes |

**Testes automáticos:** `node teste/dano.test.mjs`, `node teste/status.test.mjs`, `node teste/ameaca.test.mjs`, `node teste/caminhos.test.mjs`, `node teste/nome.test.mjs`, `node teste/som.test.mjs` (acústica), `node teste/tomate.test.mjs` (física do tomate no vidro), `node teste/grafico.test.mjs` (gráfico de atributos), `node teste/recompensas.test.mjs` (drops, inspiração, colosso, runas, conversível, zumbi paraquedista e zumbis do fã), `node teste/catalogo.test.mjs` (a prévia sem o programa usa os mesmos números do config.json), `node teste/ambiente.test.mjs`, `node teste/atraso.test.mjs` (votos atrasados, caído, presentes inteligentes), `node teste/habilidades.test.mjs` (cartas, escolha do chat, cada habilidade, força por nível, combos, suprema, vida por nível, Anti-explosão e inchados instáveis), `node teste/bonus.test.mjs` (bônus por quarteirões), `node teste/ritmo.test.mjs` (zumbi do tomate, começo puxado, cota da quadra, limpar a área, horda a cada 5 quarteirões, segundo fôlego, chefes, lobo e braço longo, praia, desgaste, figurantes, fúria sem ajuda) e `node teste/estabilidade.test.mjs` (roda meia hora de jogo com cada personagem e falha se algum herói travar ou ficar imortal). Para simular um personagem só: `CLASSE=enfermeira node teste/simular.mjs 30 nada`.

**Para testar o equilíbrio sem live:** `node teste/simular.mjs` roda dezenas de partidas em segundos em 5 cenários (sem interação, só chat, presentes misturados, só presentes que ajudam, só presentes que atrapalham) e mostra quanto cada herói durou. Para testar números sem mexer no `config.json`: `AJUSTES='{"horda_base":8}' node teste/simular.mjs 20 nada`. Também dá pra mexer em `ameaca.js` e na força dos zumbis só na simulação: `AMEACA='{"medioForca":1.5}' ESCALA='{"vida":0.3}' node teste/simular.mjs 20 chat`, e `SEED=1` roda outra sequência de partidas. O simulador mostra em que faixa de nível os heróis caem, a vida mínima em cada faixa, quando chegam no nível 10 e quanto tempo levam pra limpar a área.

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

**Comentei e o voto não contou**
Primeiro confira a versão: ao abrir, a janela preta mostra `Herói contra Hordas ligado! (versão 1.17.0)` (ou mais nova). Se mostrar versão mais velha, ou não mostrar versão nenhuma, você está com o programa antigo: rode o comando do PowerShell de novo (ele fecha o programa antigo sozinho e atualiza).

Olhe a janela preta: cada comentário que chega aparece nela, e se virou voto aparece junto (ex.: `💬 fulano: 2  → voto 2 FRENTE` ou `💬 fulano: b  → habilidade B`). Valem também `2️⃣`, `#2`, `22`, `vai 2`, `esquerda`; e pra habilidade `A`, `a)`, `aaa`, `letra a`, `🅰️`.
- Se o comentário **não aparece** na janela preta, ele não chegou da live: confira se a janela mostra `✅ Ligado na live de @...` e tente comentar de outra conta.
- Se aparece mas não contou no jogo: o voto de direção só vale com a votação aberta (fora de prédio, arena e praia), e cada pessoa vota **uma vez por cruzamento** (vale o primeiro voto). A letra (A, B, C) só vale com a escolha de habilidade aparecendo embaixo, e tem que ser só a letra no comentário.

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
