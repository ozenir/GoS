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

**🔫 A pistola tem pente:** dá **14 tiros seguidos** (um a cada 0,5 s) e depois fica **3 segundos recarregando** (o pente vazio cai fazendo barulho e o cartão do herói mostra "🔄 recarregando"; fora isso, mostra quantas balas faltam, ex.: "9/14"). Pra compensar o tiro mais lento e a recarga, cada tiro bate mais forte (22). Fica em `public/js/core/dados.js` → `ARMAS.pistola` (`pente`, `recarga`).

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
| 🪨 Zumbi da pedra (nível 6+) | – | – |

O herói também tem resistências por tipo (a bombeira aguenta fogo; o mecânico, explosão). **Explosões em sequência não somam:** se várias explosões pegam o herói em até **2 s** (cadeia de inchados, horda de explosivos), só a primeira machuca (e atordoa); as outras só afetam os zumbis. E a explosão que pega o herói **arremessa ele pra longe** (umas 3 casas, deslizando nas paredes), pra fora do alcance das próximas (`public/js/core/ameaca.js` → `EXPLOSAO.janela` e `EXPLOSAO.arremesso`). Sangramento e infecção vêm "de dentro": atravessam armadura, colete e resistência.

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

**Limpar a área antes de seguir.** O herói não sai correndo pela cidade: em cada quarteirão nasce um número fixo de zumbis (a **cota da quadra**, que cresce com a ameaça), chegando em bandos **de todos os lados**. Quando ele chega no cruzamento com a decisão do chat, **só atravessa depois de matar todos os zumbis em volta**. O painel da votação mostra **🧟 LIMPE A ÁREA · faltam N**. Enquanto isso não nasce mais zumbi da rua, os que estão longe vêm correndo e o herói vai atrás dos que faltam (até 9 casas do cruzamento, pra qualquer lado, inclusive pela rua de onde veio). **Faltando 8 ou menos, ele vai caçar os últimos bem mais longe** (até 17 casas; quem atira caça até os explosivos de longe; a linha de efeitos mostra **🎯 caçando os últimos N**), pra acabar logo: com 4 zumbis lentos espalhados pela rua de trás, ele atravessa em ~13 s (antes, ~33 s). Zumbi preso atrás de barricada ou parede, que nunca chega, some depois de uns segundos sem abate. Por segurança, depois de 90 s esperando ele atravessa de qualquer jeito (mesmo se estiver longe do cruzamento, caçando ou empurrado pela horda: no fim de jogo, com hordas de presente sem parar, ele não fica mais preso no mesmo quarteirão). Zumbis mandados por presente também contam (`ameaca.js` → `cacarPoucos`, `cacarLonge`).

**Habilidades escolhidas antes de seguir.** Se o herói subiu de nível no quarteirão e ainda tem escolha de habilidade pro chat fazer (aberta ou na fila, ou a do nível deus), ele **espera no cruzamento** (com a área limpa) até o chat escolher todas as que estavam pendentes quando a área ficou limpa; a linha de efeitos mostra **⏳ escolham as N habilidades pra seguir**. Os níveis que ele ganha enquanto espera (zumbis de presente morrendo, por exemplo) ficam pro próximo quarteirão, senão a fila nunca acabava. Com 2 ou mais na fila a votação já fica mais curta.

**Horda gigante a cada 5 quarteirões** (estilo Vampire Survivors). É rara e anunciada (**☠️ HORDA GIGANTE!**): chega de frente e por trás, em ondas de até 30 (8 s entre uma e outra), e precisa ser limpa pra seguir. A primeira (quarteirão 5) tem uns 25 zumbis. Depois do nível 10 elas crescem até 110. Não existe mais horda por tempo nem horda por nível.

**O ritmo da run (do nível 1 ao 30+).** Até o nível 10 é difícil de verdade (o herói fica com a vida baixa, mas quase nunca morre). Depois as habilidades sobem, a primeira **suprema** sai por volta dos 6 minutos numa live com presentes e o **nível deus** por volta dos 20. A ameaça continua subindo e uma hora vence:

| Nível do herói | O que muda |
|---|---|
| 1 a 4 | **começo**: 20% a mais de zumbis na rua, 50% mais fortes (vida e dano). Chefe só na arena |
| 5 a 9 | **a parte mais difícil**: 30% a mais de zumbis, **2× mais fortes**. As habilidades ainda estão no começo. 💢 **Segundo fôlego** (até o nível 9): quando a vida cai abaixo de 20%, o herói solta um grito, **empurra e atordoa** os zumbis em volta, fica **3 s invencível** e recupera 20% da vida. Recarrega em 50 s, então dá pra morrer se apertar de novo |
| 10 | os zumbis voltam ao normal (quantidade e força) e as hordas gigantes passam a crescer bem. A partir daqui: chefe de rua e ex-herói na rua |
| 19 | 🧯 a carta **Anti-explosão** passa a aparecer sempre (carta C) até o herói ter |
| 20 | 🐺 **novos inimigos**: **lobo zumbi** (corre e **salta** no herói: o salto **paralisa** e tem **50% de deixar sangrando**), **braço longo** (estica o braço e acerta **de longe**, até ~3 casas, com **30% de chance**) e 💣 **inchados instáveis** (muitos explosivos, estouro forte que atordoa e estoura os vizinhos em cadeia; a 🧯 Anti-explosão salva) |
| 30 | 🏖️ **a praia**: cada cruzamento tem **25%** de chance de dar na praia. Lá, uma horda maior **sai de dentro do mar** e o herói precisa **sobreviver 1 minuto**; depois vem um baú, um kit e a votação de **por onde sair** (esquerda, frente ou direita), e ele volta pra cidade em outro ponto |

Tudo anda mais devagar que antes (herói e zumbis), então tem menos decisão por minuto e mais tempo de ver a luta. Cada nível pede mais experiência que o anterior, e zumbi mais forte (ameaça maior) dá mais experiência.

**O som.** Todo som é gerado pelo jogo. O que acontece na rua (tiros, explosões, zumbis) passa por uma **acústica de verdade**: a câmera fica no alto, como num helicóptero, então tudo já chega um pouco mais grave. E quanto mais longe do herói, mais baixo, mais abafado (o ar absorve primeiro os agudos) e um tiquinho atrasado (a velocidade do som). A **pistola** é um estampido grave, curto e seco. A **explosão** é um estrondo que vai sumindo devagar e ecoa nos prédios (uma oitava acima do grave de antes e 10% mais alta, pra aparecer bem na live). Jogar a granada faz só o "fffu" do braço. Com zumbi na tela, de vez em quando um deles **geme, rosna ou engasga** (3 vozes, nunca a mesma duas vezes seguidas; gordo e chefe têm a voz mais grossa, corredor e lobo mais fina). Zumbi morrendo solta o **último suspiro** (3 jeitos: gemido que termina num sopro, engasgo, estertor). Os **avisos da tela** (presente, voto, nível, baú, chefão...) seguem a mesma ideia, como um videogame de 16 bits ouvido de longe: poucos instrumentos (sino, marimba, metal grave e tambor), entrada suave, sem o brilho dos agudos e um eco curto. Coisa boa soa em sino, subindo; coisa ruim é grave, em metal e tambor. Tudo uma oitava abaixo, pra não ficar agudo. **Quando não tem nenhum zumbi na tela**, depois de 1,5 s o herói ouve só ele mesmo: **passos baixinhos** (no ritmo da caminhada, um pé de cada vez; asfalto na cidade, grama no parque e na praia, piso com eco dentro dos prédios) e a **respiração** lenta, que fica mais pesada e rápida com a vida baixa. A música abaixa pra 30% nessa hora e volta quando aparece zumbi: a solidão é o melhor momento.

**🤚 Dano por toque.** Além da mordida ou do golpe de sempre, **cada zumbi encostado no herói tira 2 de vida por segundo**, e isso cresce junto com a força dos zumbis (a ameaça). Quando a vida do herói chega em **30% ou menos**, o toque cai pra **0,5 por segundo**, pra dar tempo da live salvar. A defesa diminui esse dano; esquiva e colete não (é encostar, não golpe); invencível não toma e inspirado toma só um pouco. Fica em `public/js/core/dano.js` → `TOQUE`.

**🌙 O dia e a noite.** O jogo tem um ciclo de dia com 4 períodos de **2:30 cada** (10 min o dia inteiro): ☀️ **manhã** (claro) → 🌇 **tarde** (a luz vai ficando alaranjada e, na segunda metade, escurece aos poucos, com postes e janelas acendendo) → 🌙 **noite** (escuro) → 🌌 **madrugada** (continua escuro e, dos 40% em diante, clareia aos poucos, azulada) → manhã de novo. A linha de efeitos mostra o período e quanto falta pro próximo ("☀️ manhã 1:15"). Todo herói novo começa de manhã; o relógio anda na rua e dentro dos prédios e para com o herói caído e no portal. **Os zumbis da noite** (mais zumbis e mais depressa) valem só no período **noite**: o escuro da tarde e da madrugada é só visual. A **rua escura** e o **Rei Zumbi** trazem uma **noite extra** a qualquer hora, que chega e vai embora com uns 8 s escurecendo e clareando ("🌇 escurecendo", "🌅 clareando"). Duração no `config.json` → `periodo_do_dia_segundos` (0 = sempre manhã); a luz fica em `public/js/core/jogo.js` → `periodoDoDia`, `luzDoDia` e `Jogo.CICLO`. De noite **a visão fica reduzida**: a tela escurece bem e a luz em volta do herói é menor, então os zumbis aparecem do escuro. Os **postes acesos** iluminam a rua em **cone**, da lâmpada até uma poça de luz amarelada no chão (o cone é forte em cima, uns 70% na lâmpada, e vai ficando transparente até perto do chão) (alguns postes com defeito ficam piscando); a luz respeita a profundidade: um prédio na frente do poste tapa a luz dele, menos o prédio que fica **transparente** (na frente do herói): esse não tapa, a luz do poste fica por cima dele. Nos **prédios**, umas 3 em cada 10 janelas ficam **acesas** (amarelas, e umas com luz azulada de TV) e as vitrines das lojas brilham; o prédio da frente tapa as janelas do de trás. Fogo, raios, baús e alarmes também iluminam, e as **explosões clareiam bem mais longe** (com um clarão laranja). O avião do Ataque aéreo de noite não aparece: só se ouve o motor e as bombas, e as explosões iluminam a cidade.

**🍅 Zumbi do tomate.** Do nível 3 em diante, a cada quarteirão novo tem 35% de chance de aparecer um (é **um por vez**). É um feirante de camisa vermelha e boné verde com um tomate na mão. Ele fica de longe (recua se o herói chega perto) e **joga um tomate a cada 8 segundos**: dá pra ver o tomate voando em arco, e ele **sempre acerta** (vai atrás do herói). Dano pequeno (no máximo 5% da vida), mas **a tela da live fica suja de tomate**, como um vidro na frente da câmera:

**🪨 Zumbi da pedra.** Mesmo esquema do tomate, mais tarde: do nível 6 em diante, a cada quarteirão novo tem 28% de chance de aparecer um (também **um por vez**, e pode vir junto com o do tomate). É um peão de obra de colete laranja e capacete amarelo, com uma pedra na mão. Fica de longe e **joga uma pedra a cada 11 segundos**: a pedra voa em arco, girando, e **sempre acerta**. Machuca um pouco mais que o tomate (no máximo 7% da vida máxima) e **trinca a tela da live**: a pedra bate no "vidro" da câmera e a trinca se espalha do ponto do impacto (sorteado), em estrela, com os anéis de teia de aranha e o miolo esmigalhado, em pixel art. A forma vem da física do impacto (`public/js/core/pedra.js`): pedra de 200 g a 12–18 m/s (15 a 32 J); mais energia, mais trincas radiais (crescem com a raiz da energia) e mais compridas (com a raiz cúbica), às vezes uma trinca se divide no caminho. A trinca fica uns 26 s e some (no máximo 3 ao mesmo tempo); o tomate, que fica na frente do vidro, aparece por cima dela. Na hora: estalo do vidro, pancada e estalinhos da trinca correndo.

**🌀 Portal dos 500.** Quando o herói derruba **500 zumbis** (uma vez por herói, no primeiro momento calmo: fora de loja, arena, praia e beco, sem votação de rua aberta, sem limpar área e sem roleta de habilidade), abre um portal e **a rua pausa** (zumbis, ameaça e tempo param). A cena muda toda: a câmera vai pra **trás do herói**, que corre por um **corredor apertado** de hospital ou de delegacia (sorteado), com portas, placas e corrimão nas paredes, luz fluorescente no teto (às vezes piscando), piso de ladrilho e um vórtice roxo no fim. Em cada uma das **4 rodadas** vêm **3 portais** pela estrada, chegando junto com o relógio da votação: **1 na esquerda, 2 no meio, 3 na direita**, cada um com um efeito no **poder ⚡** do herói (começa em 100): azul é bom (+40, +60, +90, ×1,5, ×2, às vezes ×3), vermelho é ruim (−30, −50, ÷2...) e roxo é **?** (mistério: pode ser ×3 ou ÷2). O chat vota com **1, 2 ou 3** no mesmo quadro de votação da rua; fechou, o herói muda de pista e atravessa (clarão azul ou vermelho, o número sobe ou cai). No fim do corredor está o **guardião 👹**, com a força mostrada desde o começo: os dois poderes se drenam e fica o mais forte. **Venceu:** vêm 3 portais dourados com **relíquias raras** e o chat escolhe uma, que o herói leva pra rua até o fim (selo brilhando no avatar):
- 🔨 **Martelo do Trovão:** a cada 3,5 s, raios nos 6 zumbis mais fortes em volta (dano enorme) e atordoam.
- 🌑 **Olho do Eclipse:** a cada 6 s, um feixe do vazio desintegra os zumbis no caminho (chefes perdem 15%).
- 🪶 **Pena da Fênix:** quando o herói ia cair, renasce em chamas com 60% da vida e queima tudo em volta (a cada 75 s).
- 🌪️ **Botas do Vendaval:** +35% de velocidade, +40% de velocidade de ataque e +20% de esquiva.

**Perdeu:** volta pra rua sem nada (e sem castigo). Os efeitos dos portais valem só lá dentro. **Presentes contam:** ajuda sobe o poder (+4% por moeda), atrapalhar desce. Dentro do portal não tem roleta de habilidade (a que estava aberta espera ele voltar). Se ninguém votar, a IA escolhe (quase sempre o melhor, às vezes no chute: sozinha ela vence uns 50%). Leva uns 1:30. **Pra testar sem esperar os 500 zumbis:** botão **🌀 Portal** (ou tecla **P**) na página de teste. Regras em `public/js/core/portal.js`, cena em `public/js/view/portal.js`.
- o tomatão esmagado **gruda no vidro num ponto sorteado** (qualquer lugar da tela, cada vez num), com casca, polpa, sementes e o cabinho, e respingos em volta;
- fica grudado 1,5 a 3 s e depois **escorrega devagar até cair pela borda de baixo**, deixando um **rastro esfregado** (listras vermelhas translúcidas, com uma semente ou um pedaço de casca aqui e ali), enquanto filetes de caldo escorrem na frente;
- a velocidade segue a **física de verdade** (`public/js/core/tomate.js`): polpa de tomate é um fluido de Bingham (só escorre quando o peso vence a "tensão de escoamento"), então `v = (m·g/A − τy) · h / η`, com tomate de 100 g (60% gruda), mancha de 10 cm, τy = 20 Pa, η = 1,5 Pa·s e camada de 1,5 mm. Ele começa a uns **5,5 cm/s**, vai perdendo massa no rastro e desacelerando, e o vidro não é uniforme, então escorrega aos trancos. A tela é um vidro de 36 x 64 cm: o tomate leva uns **13 s** pra descer. Os filetes de caldo (quase água) seguem a fórmula de filme escorrendo num vidro (Nusselt), entre 2 e 9 cm/s, e param quando o caldo acaba;
- depois que o tomate cai, o rastro seca e some em uns 12 s. O jogo continua por trás o tempo todo. Ele conta pra limpar a área.

**📺 Zumbis da tela (quem suja × quem limpa).** 17 zumbis que mexem com a **tela da live**. Cada um é um zumbi de verdade na rua, com roupa e item na mão: os que **jogam de longe** param a uns metros e arremessam (ovo, tinta, chiclete, torta, lama), sempre acertando, e os que **vêm até a câmera** fazem o efeito quando chegam no herói (o **mão gigante** não tem zumbi: vem direto). O efeito aparece na tela por **2 a 4 s** e some, com **som exagerado** em cada impacto e o **nome de quem causou** no canto ("🥚 @fulano jogou um ovo podre!"). A soma do quanto os efeitos cobrem não passa de 90% da tela: com a tela cheia, o mais antigo sai antes. Os que **sujam o vidro** ficam por cima de tudo (como o tomate); os que **mexem na imagem** (chiado, fumaça, apagão, tonto) ficam por baixo do painel, que continua legível.

**A disputa:** quem **atrapalha** suja, quem **ajuda** limpa. **Todo presente de ajuda passa o 🧽 limpador de para-brisa** se a tela estiver suja (a palheta varre a tela inteira e tira tudo, menos a trinca: vidro trincado não sai com água), com o aviso "🧽 @fulano limpou a tela!".

**Como eles aparecem** (`public/js/core/tela.js` → `TELA` e o catálogo `ZUMBIS_TELA`):
- **Presente de atrapalhar:** além do efeito dele, tem **60%** de chance de mandar um zumbi da tela, no máximo **um a cada 6 s**, do **nível do valor do presente** (escala com o presente): 1 moeda → nível 1 · 2 a 9 → níveis 1 e 2 · 10 a 99 → 2 e 3 · 100 a 999 → 3 · 1.000 ou mais → **4 (mão gigante)** ou 3. Ele nasce perto, então o efeito acontece em poucos segundos.
- **Sozinho na rua:** a cada quarteirão, **30%** de chance de aparecer um (no máximo 1 vivo), só dos que já liberaram pelo nível do herói (coluna "na rua desde").
- **De propósito, por presente:** no `config.json`, `"efeito": "tela", "zumbi": "torta"` manda sempre aquele (sem `"zumbi"`, sorteia um do nível do valor); `"efeito": "limpador"` limpa a tela.
- **Na página de teste:** um botão pra cada (o zumbi aparece perto e faz o efeito; com **Shift**, só o efeito, na hora) e o **🧽 Limpar**.

| Zumbi | Grupo | Nível | Como faz | Dura | Cobre | Repete a cada | Na rua desde |
|---|---|---|---|---|---|---|---|
| 🥚 Ovo podre: o ovo bate, a clara espirra e a gema **escorre devagar** deixando um **rastro amarelo** | suja | 1 | joga de longe | 4 s | 15% | 9 s | nível 3 |
| 🎨 Pintor: **balde de tinta cobre um canto inteiro**, cada vez de uma cor, com tinta escorrendo | suja | 2 | joga de longe | 4 s | 30% | 12 s | nível 8 |
| 🍬 Chiclete: gruda com fios que **esticam quando a tela treme** | suja | 1 | joga de longe | 4 s | 12% | 9 s | nível 4 |
| 🥧 Torta: **torta na cara** no meio da tela (com cereja), depois escorrega | suja | 2 | joga de longe | 2,5 s | 45% | 11 s | nível 6 |
| 👅 Lambedor: a **língua passa por dentro do vidro** e deixa marca de baba, com bolhinhas | suja | 1 | vem até a câmera | 3,5 s | 15% | 10 s | nível 5 |
| ✋ Bate no vidro: a mão **bate 3 vezes** (a tela treme) e na terceira o **vidro trinca** | quarta parede | 2 | vem até a câmera | 3 s | 20% | 12 s | nível 9 |
| 😶 Encostado: a **cara achatada no vidro**, olhando pro público, piscando e embaçando; depois escorrega | quarta parede | 2 | vem até a câmera | 3,5 s | 35% | 14 s | nível 10 |
| 📄 Puxa a tela: **dobra o canto da tela como uma página** (atrás, escuro, com dois olhos) | quarta parede | 3 | vem até a câmera | 3 s | 25% | 15 s | nível 14 |
| 🖌️ Grafite: **picha em spray** o nome de quem mandou ou "SOCORRO", "SEGUE AÍ", "MIOLOS"... | quarta parede | 2 | vem até a câmera | 3,5 s | 20% | 13 s | nível 7 |
| ⚡ Eletricista: **chiado de TV antiga**, a imagem pisca e treme | imagem | 3 | vem até a câmera | 3 s | 20% | 14 s | nível 12 |
| 💨 Fumaça: uma **nuvem embaça** tudo e vai sumindo | imagem | 1 | vem até a câmera | 4 s | 30% | 12 s | nível 6 |
| 🔦 Apagão: **as luzes caem**, só os **olhos dos zumbis** brilham (e a lanterninha do herói) | imagem | 3 | vem até a câmera | 3,5 s | 35% | 18 s | nível 16 |
| 😵‍💫 Tonto: a imagem **gira e fica de cabeça pra baixo** | imagem | 2 | vem até a câmera | 3 s | 10% | 14 s | nível 11 |
| 🟫 Lama: **lama respingando de baixo pra cima**, como se um carro tivesse passado | imagem | 1 | joga de longe | 3,5 s | 25% | 10 s | nível 4 |
| 🖐️ Gigante: a **mão enorme entra pelo lado** e tenta pegar a live (tira 12% da vida do herói e arrasta ele) | marcante | 4 | direto (presente caro) | 3,5 s | 50% | – | só por presente |
| 🤳 Selfie: celular, **FLASH branco** e a imagem **congela numa foto** polaroid com o nome de quem mandou | marcante | 3 | vem até a câmera | 2,5 s | 60% | 16 s | nível 13 |
| 🪧 Fã: **dança na frente com a plaquinha com o nome** de quem mandou, soltando coraçõezinhos | marcante | 3 | vem até a câmera | 4 s | 25% | 16 s | só por presente |

Os números de cada um (nível, duração, cobertura, recarga, nível na rua, chance relativa, roupa, vida e velocidade) ficam no catálogo `ZUMBIS_TELA`; a arte e a animação de cada efeito, em `public/js/view/tela.js`; os sons, em `public/js/view/som.js` → `telaSom`. No `config.json`: `zumbis_da_tela` (1 liga, 0 desliga), `tela_chance_por_presente` (0.6), `tela_recarga_segundos` (6) e `tela_na_rua_chance` (0.3).

**A cidade vai sendo destruída.** Quanto mais tempo a run dura, mais destruídas vêm as ruas e prédios novos: começa depois de 1 minuto e chega no máximo com 10 minutos.
- 🕳️ **buracos no asfalto** (machucam e deixam lento)
- 🚗 **carros batidos fechando a rua** (engavetamento)
- 🔥 **carros pegando fogo** (fogo no chão em volta)
- 🏢 **prédios pegando fogo**, com fumaça
- 🧍 **pessoas fugindo** gritando, ou **sendo devoradas** por zumbis e **pedindo socorro**. É só cenário: ninguém interage com elas

**A câmera gira com o herói.** Ele sempre anda para cima e para a direita (↗). Por isso, na votação, **1 é sempre ↖ esquerda, 2 é ↗ frente, 3 é ↘ direita e 5 é ↙ voltar**. As mesmas setas aparecem desenhadas no chão do cruzamento, **discretas** (finas e meio transparentes; a mais votada um pouco mais forte, em amarelo), porque o quadro da votação já mostra as opções.

**📊 Gráfico de atributos (comente G).** No canto direito, logo abaixo do painel de cima (da votação / cabo de guerra), alinhado com a margem dele, fica um botãozinho **"📊 Digite G · 🧬 T"**. Quando alguém comenta **G** (ou "gráfico", "status", "atributos"), abre por 15 s, no terço da direita, no lugar do botão (logo abaixo do painel de cima, sem fundo nem moldura, por cima de tudo na tela, menos do tomate no vidro), os atributos do herói: **FOR** (força), **CRI** (crítico), **ATQ** (velocidade de ataque), **VEL** (velocidade), **DEF** (defesa), **ESQ** (esquiva), **VID** (vida) e **REG** (regeneração), cada um com a sigla em cima e **5 bloquinhos** em paralelogramo embaixo. Os bloquinhos são uma régua: o **máximo** de cada atributo daquele personagem é dividido em 5 partes, e o herói ganha um bloco por parte cheia, **sempre arredondando pra baixo** (4,8 de 5 = 4 blocos). O máximo é o "herói perfeito" de cada personagem, somando tudo que o jogo oferece: base da classe, perícias no nível 40 com treino no máximo, as passivas que ele pode pegar no nível máximo (as gerais e as únicas dele), drops com 5 pilhas, fúria, foco, blindado, tiro rápido, instinto, torcida cheia, adrenalina, as supremas dele, o melhor poder deus dele e uma runa, respeitando os limites do jogo (velocidade até 2,2x, defesa até 60%, esquiva até 45%, ataque até 6x). Por isso a Força máxima do policial (x31, perícia de armas cresce rápido) é maior que a do mecânico (x10), e a vida máxima da bombeira (1.400) é a maior. O cálculo fica em `public/js/core/grafico.js`.

**🧬 Tabela de supremas (comente T).** Quem comenta **T** (ou "tabela", "fusões", "combos", "receitas", "supremas") abre por 15 s, no mesmo lugar e estilo do gráfico do G (o último pedido fica na tela), as **14 receitas do herói em jogo** (as 12 gerais e as 2 únicas dele, marcadas com ◆), em 2 colunas: **habilidade + passiva = suprema**. A receita aparece sempre; o **resultado** (o emoji da suprema; o nome e o poder aparecem passando o mouse) só aparece se alguém já fez aquela suprema **nesta live** (vale pra todos os heróis da live, roxo); senão fica **?**, pra live descobrir. As que o herói em jogo já fez ficam douradas. Na página de teste: botão **🧬 Fusões** (ou tecla **T**). Fica em `public/js/core/fusoes.js`.

**A votação.** Quando o herói sai de um cruzamento, abre a votação do próximo. O chat comenta o número ou a palavra (`1`, `2`, `3`, `4`, `5`, `esquerda`, `frente`, `direita`, `entrar`, `voltar`, `e`, `f`, `d`, `v`...). Vale o primeiro voto de cada pessoa. Se ninguém votar, a IA escolhe (ela quase nunca volta). Rua bloqueada não aparece (não dá pra votar nela). Rua sem saída aparece com 📦. No mapa, os números das direções em cima de cada rua são pequenos e meio transparentes (discretos: quem manda é o quadro da votação).

Na tela, a votação é um quadro só com o aviso **"Escolha a direção com 1 ↖ esquerda · 3 ↘ direita · 5 ↙ voltar"** (só as opções que existem naquele cruzamento) e o **relógio**: uma barra dourada que vai sumindo das pontas pro meio (fica vermelha no fim). O tempo da votação não mudou. Quando chegam os primeiros votos, o aviso vira **bolinhas**, uma por opção, com os votos embaixo; a que está na frente fica dourada e maior, e cada voto faz a bolinha pular. Com o relógio zerado, enquanto chegam os votos de quem assiste atrasado, aparece "⏳ contando os votos da live". Fechou: o quadro some, o relógio sobe pro lugar dele e aparece o **resultado**: o número, pra onde vai e com quantos votos, e **o que tem lá**: 🟢 **TRANQUILO**, 🟠 **PERIGOSO** ou 💀 **RISCO DE MORTE** (conta a vida do herói agora), com o que espera por ele (o perigo da rua, horda gigante chegando, colosso, praia, rua sem saída com baú e emboscada, os zumbis e o que tem pra pegar dentro da loja, caixa de suprimentos das curtidas quase caindo). Não é chute: o que acontece na rua é sorteado na hora que a votação fecha, e é isso que acontece quando o herói chega (`public/js/core/previsao.js`). O resultado fica **10 s** na tela e some; a próxima votação **só abre depois disso** (se o herói ainda precisa limpar a área, aparece o aviso "🧟 limpe a área · faltam N" na linha de efeitos). Medido no simulador, isso não deixa a partida mais lenta: o tempo de limpar a área já cobre esses 10 s.

**⚔️ Cabo de guerra: top ajudante x top atrapalhante.** Fora da votação, a linha amarela vira um **cabo de guerra** mais grosso, logo abaixo da linha de efeitos: na ponta esquerda a foto do **top ajudante** (quem mais deu moedas em presentes que ajudam na live), na direita a do **top atrapalhante**, cada uma com uma **👑 coroa de lado**, como cartola, e o ícone do lado (🛡️ ajuda, 😈 atrapalha) no canto de fora, só o ícone, sem moldura (pra não tampar a foto); logo abaixo da barra, alinhado com a ponta dela (ajudante na esquerda, atrapalhante na direita), o nome e as moedas do top 1, em letra maior. Embaixo de cada foto, na beirada da tela, vêm o **2º** (🥈 prata) e o **3º** (🥉 bronze) do mesmo lado: dos ajudantes com a medalha à esquerda, dos atrapalhantes com a medalha à direita. (O ranking que ficava embaixo da tela saiu.) A barra fica dividida pela parte de cada um (verde pra ajuda, roxa como o 😈 pra atrapalhar, com o nó dourado no meio da disputa e a porcentagem em cada ponta). Quem está na frente **muda o jogo** (`public/js/core/cabo.js`):
- **😈 atrapalhante na frente:** nascem um pouco mais de zumbis na rua (até +15%) e eles ficam um pouco mais fortes (até +12% de vida e dano).
- **🛡️ ajudante na frente:** o herói fica com **sorte**: às vezes o cadáver de um zumbi deixa um suprimento (curativo, munição ou kit de cura; até 6% dos zumbis), que vem até ele.

O efeito cresce com a vantagem: perto do empate (até 55% x 45%) não faz nada, e uma moeda sozinha puxa só um pouquinho. Quando um lado passa à frente aparece um aviso, e o efeito fica na linha de efeitos (🍀 sorte ou 😈 zumbis mais fortes). Na votação o cabo some e a linha volta a ser o relógio.

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

**Os prédios.** Alguns cruzamentos têm uma loja na esquina (aparece a placa no telhado, em perspectiva isométrica, inclinada junto com a fachada, e a opção **4 🚪 ENTRAR**). Cada tipo tem tamanho, móveis e arrumação próprios (fileiras, ilhas ou corredor), zumbis, coisas para pegar e **perigos no chão** também. Depois de um tempo dispara o alarme, e ele sai pelos fundos, do outro lado do quarteirão (conta como atalho).

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

**Habilidades (a cada nível, o chat escolhe), no estilo Vampire Survivors.** Quando o herói sobe de nível, aparece embaixo da tela uma escolha com 3 cartas. O chat vota comentando só a letra: **A**, **B** ou **C** (os números continuam sendo da direção, então as duas votações podem rolar ao mesmo tempo). A contagem tem a mesma janela de votos atrasados da live. Se ninguém votar, a IA escolhe. Se subir vários níveis de uma vez, as escolhas vêm uma depois da outra e, **com 2 ou mais na fila, a votação fica mais curta** (60% do tempo, no mínimo 7 s, e só 1,5 s entre uma e outra: `jogo.js` → `ESCOLHA_RAPIDA`).

- **A = aprimorar** algo que o herói já tem (sobe o nível de uma habilidade ou passiva, ou um **treino** de +1 de perícia no ataque principal). Quando dá pra fazer uma **suprema**, ela é sempre a carta A.
- **B = algo novo**: uma habilidade nova (ou uma arma nova)
- **C = uma passiva nova**

Cada carta mostra o **papel** (etiqueta ATAQUE, DEFESA ou CONTROLE), se é **ÚNICA** do personagem e, embaixo, **🧬 + o emoji da peça que combina com ela** pra virar suprema (e quanto a passiva já fortalece a habilidade par, a sinergia). Quando falta alguma categoria, a carta é completada com outra; quando não tem mais nada pra oferecer, vêm cartas **extras** (🍗 cura de 35%, 🔥 fúria e foco ou 🧱 blindado por 2 quarteirões). A IA puxa a receita mais adiantada, pra suprema não demorar.

**5 slots de cada lado.** O herói tem **5 slots de habilidade** e **5 de passiva**. Cheios, só dá pra aprimorar o que já tem. Pra liberar vaga, precisa fazer uma **suprema**. Com os slots de passiva cheios, a passiva que falta pra uma habilidade (do nível 2 em diante) virar suprema aparece **trocando** uma passiva que não combina com nada (a carta diz qual sai); a 🧯 Anti-explosão do nível 19 em diante também.

**Níveis e força.** Habilidade vai até o **nível 5** e passiva até o **nível 3**. Cada nível fortalece muito: a habilidade multiplica a força do nível 1 por **1× · 3× · 6× · 9× · 12,5×** (o nível 2 triplica) e a passiva por **1× · 2,2× · 4×**. **Sinergia:** ter a passiva par já deixa a habilidade **+15% mais forte por nível da passiva** (até +45%), antes mesmo da suprema. As passivas mexem nos atributos do gráfico do G (força, crítico, ataque, velocidade, defesa, esquiva, vida, regeneração) e em outros novos: **área** das habilidades, **recarga** (as habilidades voltam mais rápido), **experiência** e **ímã** (pega itens de mais longe).

**🧬 HABILIDADE SUPREMA = habilidade no nível 5 + a passiva par no nível 3.** São 8 cartas certas no meio das outras (na prática, uns 15 níveis). Escolhendo a carta SUPREMA, a habilidade e a passiva **saem dos slots** (libera 1 vaga de cada, pra pegar coisa nova) e viram uma habilidade muito mais forte. **O bônus da passiva fica.** As supremas vão pro **núcleo** (o círculo no meio do painel): o anel tem **6 pedaços**, um por suprema, com o emoji de cada uma em volta e, no meio, quantas tem (**3/6**). Cada suprema a mais deixa **todas** mais fortes (+12% cada). Quando tem suprema pronta pra fazer, o meio do núcleo pisca.

**👑 NÍVEL DEUS = 6 supremas.** Com o núcleo cheio, vem uma escolha especial (não gasta nível e passa na frente da fila): as 3 cartas são **poderes nível deus**. Os 3 gerais (ofensivo, defensivo e de controle) aparecem sempre; o **do personagem** entra no lugar de um deles se o herói fez pelo menos uma suprema **única** dele. O poder deus também deixa as supremas +50% mais fortes.

**🧯 Anti-explosão: a passiva que salva do nível 20 em diante.** Antes do 19 ela é rara nas cartas e quase não faz falta. Do **nível 19** em diante ela é **sempre a carta C** até o herói ter, aparece bem mais pra aprimorar e, se ninguém votar, a IA escolhe ela. É que no nível 20 chegam os 💣 **inchados instáveis**: o explosivo passa a aparecer muito mais (na rua e em 30% das hordas), o estouro cresce com a ameaça (2,2× mais forte e maior), **atordoa o herói** por 1 s e **estoura os explosivos em volta** (reação em cadeia). Sem a passiva, os inchados viram a maior causa de dano depois do nível 20 (38% a 48%); com ela, caem pra 25% a 33%. No simulador com presentes, o herói dura em média **~18 min com a Anti-explosão e ~14 min e meio sem ela**. O mecânico (50%) e a bombeira (30%) já nascem resistentes a explosão. Ela vai até o nível 3: 20% · 44% (e o estouro do inchado não atordoa mais) · 80% menos dano de explosão; é a passiva par das 🧨 Minas terrestres (suprema: ✈️ Ataque aéreo).

**O que tem:** 12 habilidades e 12 passivas **gerais** (todo mundo pega), 2 habilidades e 2 passivas **únicas de cada personagem**, 12 supremas gerais + 2 de cada personagem (14 receitas por personagem) e 3 poderes deus gerais + 1 de cada personagem. No painel, as únicas têm borda roxa e o nível fica laranja quando a habilidade chega no máximo.

| Habilidade geral (até o nível 5) | Papel | O que faz | + passiva par (até o 3) | = SUPREMA |
|---|---|---|---|---|
| 💣 Granada | ataque | joga no maior grupo e explode | 💪 Força (dano) | ☄️ **Bomba de fragmentação**: bomba de 1.200 a cada 3 s que solta 6 explosões em volta |
| ⚡ Raio em cadeia | controle | pula de zumbi em zumbi e atordoa | 🎯 Olho de águia (crítico) | 🌩️ **Tempestade elétrica**: 3 raios que pulam em 8 zumbis, sempre atordoam e dão crítico |
| 🌀 Lâminas giratórias | ataque | lâminas em volta que fazem sangrar | 🦇 Vampirismo (cura por golpe) | 🩸 **Lâminas vampíricas**: 6 lâminas de sangue que curam o herói |
| 🍾 Coquetel molotov | ataque | fogo no chão onde tem mais zumbi | 💚 Regeneração | 🐦‍🔥 **Fogo da fênix**: 3 molotovs e o fogo **cura** o herói |
| 🛸 Drone atirador | ataque | um drone atira sozinho | 🔁 Mãos rápidas (ataque) | 🛰️ **Esquadrilha**: 3 drones atirando sem parar |
| 💫 Onda de choque | controle | empurra e atordoa em volta | 🛡️ Couro grosso (defesa) | 🏰 **Fortaleza**: onda gigante que atordoa e blinda o herói |
| ❄️ Granada de gelo | controle | **congela** o maior grupo (congelado toma +15%) | 💨 Reflexos (esquiva) | 🧊 **Zero absoluto**: nevasca que congela tudo em volta · +10% de esquiva |
| 🔰 Escudo de energia | defesa | escudo que **bloqueia golpes inteiros**; quebrando, empurra a horda | ❤️ Vitalidade (vida) | ❤️‍🔥 **Coração de ferro**: escudo de 3 golpes, defesa, regeneração e **levanta o herói** quando ia cair (a cada 40 s) |
| 🧨 Minas terrestres | controle | planta minas que explodem quando um zumbi pisa | 🧯 Anti-explosão | ✈️ **Ataque aéreo**: um avião solta 8 bombas nos maiores grupos |
| 🪃 Bumerangue | ataque | atravessa a fila na ida e na volta | 👟 Pernas rápidas (velocidade) | 🌪️ **Furacão**: 4 bumerangues gigantes girando em espiral · +10% de velocidade |
| 💗 Pulso vital | defesa | cura e empurra quem está colado | 📚 Estudioso (+experiência) | ✨ **Santuário**: círculo sagrado que cura o herói e queima os zumbis dentro |
| 📣 Grito de guerra | controle | os zumbis em volta **fogem com medo** e o herói fica com fúria | ⏱️ Mente afiada (recarga) | 🦁 **Rugido do titã**: rugido que dá dano e faz todo mundo fugir · fúria e foco |

| Personagem | Habilidades únicas (+ passiva par) | Supremas únicas | Poder deus único |
|---|---|---|---|
| 👮 Policial | 🔫 **Rajada** (balas em leque que atravessam) + 🧨 Munição perfurante (crítico mais forte) · ⛓️ **Algemas** (prende os mais fortes e marca) + 🦺 Colete tático (defesa, mordida) | 🎆 **Chuva de balas** (20 balas em todas as direções) · 🚨 **Lei marcial** (sirene: todo mundo preso e marcado, herói blindado) | ⚖️ **Justiça divina**: tiro crítico do céu em cada zumbi em volta |
| 🩺 Enfermeira | 🔪 **Bisturis** (atravessam e fazem sangrar) + 🧠 Anatomia (crítico, sangrar) · 💉 **Injeção de adrenalina** (cura, tira efeitos ruins, ataca mais rápido) + 🩹 Plantão (curas mais fortes) | ⚕️ **Cirurgia relâmpago** (10 bisturis em espiral) · 🫀 **Transfusão** (cada zumbi morrendo perto cura) | 👼 **Anjo da guarda**: pulso sagrado que cura e machuca; levanta o herói com a vida cheia |
| 🧑‍🚒 Bombeira | 🚿 **Jato d'água** (joga longe, deixa lento) + 💢 Músculos de aço (golpe de perto, vida) · ♨️ **Rastro de brasa** (fogo por onde anda) + 🥽 Equipamento de proteção (fogo, explosão, defesa) | 🌊 **Tsunami** (onda gigante que joga todo mundo longe) · ☀️ **Aura de fogo** (queima quem chega perto) | 🔥 **Inferno sagrado**: aura de fogo enorme, quase imune a fogo e explosão |
| 🛵 Entregador | 📦 **Pacote-bomba** (larga pacotes que explodem em quem vem atrás) + 💰 Gorjeta (experiência, ímã) · 🏍️ **Turbo** (mais velocidade e esquiva, atropela) + 🪽 Aerodinâmica (velocidade, esquiva) | 🚚 **Frete explosivo** (pacotes caindo do céu) · 🌠 **Velocidade da luz** (quem chega perto leva choque) | 🌑 **Chuva de meteoros**: 10 meteoros nos grupos da tela |
| 🔧 Mecânico | 📡 **Torreta** (monta torretas que atiram) + ⚙️ Engenharia (área, recarga) · 🧲 **Eletroímã** (puxa os zumbis pra um ponto e dá choque) + 🔩 Blindagem (defesa, vida) | 🏭 **Bateria de torretas** (3 torretas com mísseis) · ⚛️ **Campo magnético** (puxa e eletrocuta em volta) | 🤖 **Mecha**: vira um robô gigante (defesa, golpe 2×, ataque 1,5×) que solta mísseis |

| Poder deus geral | Papel | O que faz |
|---|---|---|
| 👑 Fúria divina | ataque | a cada 12 s uma luz do céu derruba todos os zumbis em volta (chefes perdem 25%), cura 20% e deixa invencível por 2 s |
| 🛡️ Égide divina | defesa | +25% de defesa, +50% de vida, +5 de vida por segundo, +10% de esquiva; quase caindo, cura tudo e fica 3 s invencível (a cada 30 s) |
| ⏳ Tempo parado | controle | a cada 14 s todos os zumbis em volta ficam congelados por 4 s e marcados |

Tudo em `public/js/core/`: `hab-ativas.js` (habilidades), `hab-passivas.js` (passivas), `hab-supremas.js` (supremas e poderes deus), `hab-base.js` (as peças: explosões, ondas, minas, torretas, projéteis) e `habilidades.js` (cartas, slots, receitas, núcleo, nível deus e a IA).

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
| cura com a vida alta (mais da metade ia sobrar) | vai pra 💼 **mochila** e fica guardada. Mochila cheia: o que sobra vira 🛡️ **blindado** (menos dano por 1 ou 2 quarteirões) |
| kit com a vida baixa (menos de 60%) | cura **na hora**, direto no herói |
| kit com a vida alta | vai pra 💼 **mochila** (até 5 curas e kits). Ele usa sozinho quando a vida cai pra menos de 35%, e o que está na mochila **segura o herói de pé** quando a vida zera |
| cura ou kit **pego do chão** com a vida alta | também vai pra 💼 **mochila** (aparece "💼 +cura guardada" em cima dele), em vez de ser gasto à toa |
| munição pra quem luta de perto (sem arma de fogo) | 😤 **fúria** |
| colete com o colete cheio | 🛡️ **blindado** |

- **Resposta na hora:** todo presente mostra o emoji e o nome de quem mandou **em cima do herói** no instante em que chega, mesmo os que entram na fila.

**Quanto dura.** Sem ninguém interagindo, o herói cai em uns **3 minutos e meio** (contando os 12 segundos caído). Com chat e presentes que ajudam, dura bem mais. Esse é o estímulo pra live participar. (Números medidos no simulador estão em "Equilíbrio", mais abaixo.)

## Presentes

### Recompensas pra quem dá presente (pensadas pra live de quem tem pouca moeda)

Todo presente continua fazendo o que faz (tabela abaixo). Além disso:

- **🪂 Presente de AJUDAR de 1 moeda (Rosa, Rosa branca, Incrível, Heart Me, Amo você): cai um DROP de paraquedas.** Uma caixa roxa com ❓ desce devagar, balançando, perto do herói (uns 5 segundos, pra todo mundo ver). Quando ele pega, aparece o **bônus sorteado**, que dura **5 quarteirões**. Os bônus **acumulam**: pegar o mesmo de novo soma uma pilha (fica mais forte, até x5) e o tempo volta pros 5 quarteirões; bônus diferentes valem juntos. Presente repetido (Rosa x5) solta uma caixa por unidade (até 5).

  | Bônus | Por pilha |
  |---|---|
  | 💪 Força do chat | +15% de dano |
  | ⚡ Dedo nervoso | ataca 15% mais rápido |
  | 🛡️ Casca grossa | +6% de defesa |
  | 💚 Fôlego | recupera 1,5 de vida por segundo |
  | 🎯 Olho vivo | +5% de crítico |
  | 👟 Pernas leves | +6% de velocidade |
  | 🍀 Sortudo | +25% de experiência |

- **😈 Presente de ATRAPALHAR de 1 moeda (TikTok, Bom jogo, Clássicas, Mantap):** além do efeito dele, sorteia uma de duas surpresas:
  - **🚗 Conversível dos zumbis**: um conversível vermelho cheio de zumbi em pé no banco, de braços pra cima, corta a rua do herói (de frente ou por trás), buzinando. **Quem estiver na frente perde metade da vida ATUAL**: o herói, os zumbis e até chefe (até o colosso!). Todo mundo é jogado pro lado e fica tonto um instante. Metade da vida atual nunca mata. O herói às vezes percebe e pula pro lado, às vezes não. No fim aparece o placar ("🚗 atropelou 9 zumbis e o herói!"). O motor tem Doppler: mais agudo chegando, mais grave indo embora; quando chega perto ele dá **três buzinadas longas: paaam, paaam, paaam**.
  - **🪂🧟 Zumbi paraquedista**: um zumbi desce de paraquedas seguindo o herói e **cai em cima dele, agarrado na perna**: o herói fica **lento só no quarteirão em que foi agarrado**, com o zumbi pendurado. Mais de um pendurado (até 3) deixa ainda mais lento. Assim que ele atravessa o próximo cruzamento (a direção que o chat escolheu), o zumbi solta e vira um zumbi normal no chão (tem que matar pra limpar a área). Se o herói estiver invencível, o zumbi quica e cai do lado.

- **🎵 Zumbis do fã (TikTok):** os 3 zumbis que o TikTok manda levam **o nome (em roxo, a cor de quem atrapalha, como em todo zumbi mandado por presente) e a foto do perfil** de quem mandou numa bolinha em cima da cabeça (sem foto, a inicial), brilham em ciano e rosa e são **mais fortes** (2x a vida, 1,3x o dano) e **mais rápidos** (1,6x). **Cada um consegue acertar o herói pelo menos uma vez**: até o primeiro golpe que entra (ou que bate no colete) ele tem um escudo 🛡️ e não morre, e o herói nem perde tempo atirando nele. Depois do golpe, vira um zumbi forte normal. Pra nunca travar, o escudo some sozinho em 25 s. São sempre 3 por TikTok (não crescem com a ameaça) e eles não levam o reforço do começo do jogo.

- **✨ Doação (presente de 2 moedas ou mais, ou seja, os de 5 moedas):** a inspiração vem sempre; o colosso vem um por vez e no máximo **um a cada 2,5 minutos** (`recompensas.js` → `colossoRecarga`), pra não virar fila com presente barato.
  - **Inspiração**: por 10 segundos o herói brilha dourado, **toma só 20% do dano** e solta pulsos de luz que machucam todos os zumbis em volta.
  - Ganha um **drop** também.
  - **👹 Vem um COLOSSO no próximo quarteirão**, com o nome de quem doou ("Colosso de ana.lu"). Tem uns **10 mil de vida** (cresce com o nível do herói) e começa batendo muito forte: cada golpe tira 10% da vida do herói e atravessa armadura, colete e esquiva. É condicional: **quando a vida do herói chega em 30%, o colosso CANSA** (😵 em cima dele): fica lento, **toma 3x mais dano** e bate bem mais fraco, pra o herói virar a luta. Se a luta passar de 75 segundos, ele cansa também. O herói não fica lento. Só um colosso por vez (outras doações enquanto ele está vivo dão inspiração e drop).
  - **🔮 Vencendo, o colosso deixa uma RUNA**: uma habilidade única de **dano** ou de **resistência** que gruda numa habilidade que o herói já tem e **cresce junto com ela**. Runa de dano: aquela habilidade causa **+25% de dano por nível dela** (granada nível 3 = +75%). Runa de resistência: **+4% de defesa por nível** da habilidade. Subiu a habilidade, a runa fica mais forte. Sem habilidade ainda, a runa vai pro ataque principal (+10% de dano por nível de treino). As runas aparecem no cartão do herói com 🔮.

Os valores ficam no `config.json` → `jogo`: `drop_ate_moedas` (1), `doacao_a_partir_de_moedas` (2), `inspiracao_segundos` (10) e `vida_do_colosso` (10000). O resto (bônus, força das runas, quando o colosso cansa) fica em `public/js/core/recompensas.js`.

Tudo que **ajuda** acontece na hora (e se adapta à situação, veja "O atraso da live" acima). Tudo que **atrapalha** entra numa fila: sai um a cada meio segundo e **nada sai nos primeiros 15 segundos de um herói novo** (proteção de nascimento). Presentes caros furam a fila. Os efeitos aparecem sempre **na rua logo à frente do herói**, então quem mandou vê o resultado em poucos segundos.

**Bônus duram quarteirões, não segundos.** Tiro rápido, fúria, foco, blindado, arma lendária, cachorro e sobrevivente ajudante e o invencível do helicóptero valem pelos **próximos N quarteirões** que o herói andar (ex.: "tiro rápido nos próximos 3 quarteirões"). Cada cruzamento conta 1; sair de prédio, 1; sair da arena ou da praia, 2. Na tela, o que falta aparece com 📍 (ex.: `⚡ tiro rápido 📍2`). O que não é bônus continua em segundos: proteção de nascimento, sangramento, atordoado, queimando, e os efeitos de quem atrapalha (noite, alarme, vidro).

**Só presentes baratos (1 e 5 moedas).** Pra ter muita interação na live, todos os poderes do jogo ficam em presentes de **1 moeda** e, os mais fortes, de **5 moedas**:

| Presente | Moedas | Lado | O que acontece |
|---|---|---|---|
| 🌹 Rosa | 1 | ajuda | cura +14% na hora |
| 🤍 Rosa branca | 1 | ajuda | colete que segura 4 golpes |
| 😺 Incrível | 1 | ajuda | munição + **tiro rápido nos próximos 3 quarteirões** (combo soma +1 por presente, até 8). Quem luta de perto ganha fúria |
| 💗 Heart Me | 1 | ajuda | kit médico (+35%): cura na hora ou vai pra mochila |
| 🤗 Amo você | 1 | ajuda | cachorro ajudante por **4 quarteirões**, com o nome de quem mandou |
| 🎵 TikTok | 1 | atrapalha | 3 **zumbis do fã**: nome e foto de quem mandou em cima da cabeça, brilho ciano e rosa, mais fortes e rápidos, e cada um acerta o herói pelo menos uma vez (veja abaixo) |
| 🎮 Bom jogo | 1 | atrapalha | cacos de vidro na rua: herói fica lento |
| 📻 Clássicas | 1 | atrapalha | carro com alarme: horda chegando por 20 s |
| 🤙 Mantap | 1 | atrapalha | zumbi que explode |
| 🫰 Mãos fazendo coração | 5 | ajuda | baú com escopeta ou taco com pregos |
| 🥥 Bebida de coco | 5 | ajuda | **helicóptero de resgate**: limpa a tela, cura tudo e invencível até o fim do quarteirão ⏳ |
| 💝 Aroma de amor | 5 | ajuda | **baú lendário**: metralhadora ou lança-chamas por **3 quarteirões** ⏳ |
| 🤪 Reação exagerada | 5 | atrapalha | horda de 8 zumbis |
| 🎟️ Ingresso de bis | 5 | atrapalha | 15 corredores e rua bloqueada atrás |
| 🎆 Fogos de artifício | 5 | atrapalha | **chefão** com o nome de quem mandou ⏳ |
| 👄 Mencionar o nome | 5 | atrapalha | **Rei Zumbi** gigante + noite por 60 s ⏳ |

**⏳ Poderes fortes recarregam.** Como custam só 5 moedas, o Rei Zumbi (a cada 4 min), o chefão e o helicóptero (a cada 3 min) e o baú lendário (a cada 2,5 min) vêm no máximo uma vez nesse tempo (na live toda). Mandou antes? O presente vale do mesmo jeito (aviso, ranking, cabo de guerra, recompensas) e vira a versão menor: Rei e chefão viram horda de 8, o helicóptero vira kit médico e o baú lendário vira baú comum (o aviso mostra "⏳ o forte recarrega"). Fica em `public/js/core/recompensas.js` → `FORTES`.

**Presente que não está na tabela:**
- **De 1 a 5 moedas** (ex.: Estilo livre, Bola de futebol giratória): faz um **efeito sorteado** entre os da tabela **com o mesmo preço** (1 moeda → um dos de 1 moeda; 5 → um dos de 5).
- **Mais caro:** vira **parcelas de 5 moedas**, uma a cada **30 segundos**, cada uma com um efeito sorteado de 5 moedas. Ex.: Mini dino (10) = 2 parcelas; 50 moedas = 10 parcelas (5 minutos); o que sobra (menos de 5) vira uma parcela de 1 moeda no fim. No máximo 120 parcelas (1 hora). O aviso mostra "· parcela 3/10". Fica em `presentes.js`.

**De graça:**

| Ação | O que acontece |
|---|---|
| 💬 Comentar | vota no cruzamento (1 a 5) e na habilidade (A, B ou C). O nome de quem comenta ou entra na live pode aparecer num zumbi |
| 🚪 Entrar na live | surge um **zumbi comum com o nome da pessoa** (em branco, sem bônus nenhum). Uma vez por pessoa; um a cada 2 s, no máximo 20 esperando; só na rua (loja, arena, portal e herói caído esperam) |
| ➕ Seguir | um sobrevivente com o nome da pessoa ajuda por 1 quarteirão |
| 🔁 Compartilhar | cai uma caixa de munição |
| ❤️ Curtidas | a cada 300 curtidas cai um suprimento de avião (cura ou munição) |

**Combos:** quem manda várias Rosas seguidas recebe um aviso só, que vai somando ("x5"), e cada Rosa cura de novo. Cada TikTok seguido manda mais 3 zumbis.

**Presentes com o herói caído:** os que ajudam levantam ele; os que atrapalham dão o golpe final.

**Presentes com o herói morto** (depois do tempo caído): os que ajudam ficam guardados para o próximo herói. Os que atrapalham esperam a proteção dele acabar.

**Se o TikTok não mandar o valor do presente** (às vezes vem 0), o programa usa o preço da tabela (ou 1 moeda, se o presente não estiver nela), pra ele contar no ranking, no cabo de guerra e nos bônus, e avisa na janela preta: "⚠️ o TikTok não mandou o valor de …". Presente de sequência (Rosa, TikTok...) conta um por clique, também quando o TikTok marca a sequência só pelo campo `combo`.

**Os nomes em inglês** (`Rose`, `GG`, `Finger Heart`...) são os que o TikTok costuma mandar; cada presente também tem o nome em português e outros apelidos em `aliases` (sem ligar pra acento e maiúscula). Se um presente da tabela não existir mais ou tiver outro nome, ele aparece na janela preta quando alguém manda; é só trocar no `config.json`.

## O que aparece na tela

A tela é dividida em três faixas fixas, para **nada cobrir o herói** (ele fica no meio, um pouco abaixo do centro):

- **Em cima:** o cartão do herói (personagem, nível, nome, arma, barra de vida com colete, barra de experiência do mesmo tamanho da de vida e, embaixo, os slots: 5 slots de habilidade à esquerda, o **núcleo** no centro com as 6 supremas em volta e 5 slots de passiva à direita). Embaixo, uma linha com quarteirões, recorde, zumbis derrotados, ameaça, tempo vivo e curtidas; depois os efeitos ativos (proteção, noite, prédio, cachorro...). Se o que uma dessas duas linhas tem pra mostrar não cabe na largura (números muito grandes, muitos efeitos ao mesmo tempo), ela vira um **letreiro de jornal**: escorrega devagar da direita pra esquerda, emendando a volta, e para sozinha quando voltar a caber (`public/js/view/letreiro.js`). Por último, **a votação da direção**: o aviso com as opções e o relógio; com votos, as bolinhas; no fim, o resultado com o que tem no destino. Fora da votação, no mesmo lugar, o **cabo de guerra** entre o top ajudante e o top atrapalhante. Com o herói caído, o painel de **herói caído** aparece no lugar da votação. Logo abaixo, no canto direito, o botão **"📊 Digite G · 🧬 T"** (ou o gráfico/tabela aberto) e, no canto esquerdo, o **status que um presente deu ao herói**: quando um presente vira um bônus (tiro rápido, fúria, blindado, inspirado, drop do paraquedas...) ou um castigo (zumbi na perna), aparece um aviso com o emoji, o nome, por quanto tempo e de quem foi (verde bônus, vermelho castigo), que fica **4 s** e some (`public/js/view/hud.js` → `STATUS_PRESENTE_SEG`). O mesmo status de novo enquanto o aviso está na tela só atualiza ele. Curtidas não avisam (não são doação).
- **No meio:** só o jogo. Sem narração no meio da tela: os avisos grandes (chefão, horda, nível, limpe a área, ameaça...) estão desligados pra não poluir (`public/js/view/hud.js` → `AVISOS_NO_MEIO`, `true` liga de novo). O que importa fica nas linhas de cima (efeitos) e os sons continuam avisando.
- **Embaixo:** os avisos de presente, **alinhados à direita**: a foto de quem mandou na ponta direita, o nome à esquerda dela e, embaixo do nome, o presente e o que ele fez (verde ajuda, vermelho atrapalha), e a legenda de presentes como **letreiro de jornal**: escorre sem parar da direita pra esquerda com o que cada presente faz ("🌹 Rosa 1🪙: cura ...", verde ajuda, vermelho atrapalha), entre as notificações (em cima) e a escolha de habilidade (embaixo, quando aparece). Quem mais ajudou e quem mais atrapalhou ficam em cima, no **cabo de guerra**. Quando o herói sobe de nível, a **escolha de habilidade** (A, B, C) aparece embaixo do letreiro até o resultado.
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
| `periodo_do_dia_segundos` | quanto dura cada período do dia: manhã, tarde, noite e madrugada (0 = sempre manhã) | 150 |
| `segundos_dentro_do_predio` | quanto tempo até o alarme mandar ele sair | 70 |
| `zumbis_da_tela` / `tela_chance_por_presente` / `tela_recarga_segundos` / `tela_na_rua_chance` | zumbis da tela: liga (1) ou desliga (0); chance de um presente de atrapalhar também mandar um; segundos mínimos entre um e outro; chance por quarteirão de aparecer um sozinho na rua | 1 / 0.6 / 6 / 0.3 |
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
| `tela` | `zumbi` (ovo, pintor, chiclete, torta, lambedor, bate, encostado, puxa, grafite, eletricista, fumaca, apagao, tonto, lama, gigante, selfie, fa); sem ele, sorteia um do nível do valor | atrapalha |
| `limpador` | – (passa o limpador de para-brisa na tela) | ajuda |

`emoji`, `nome` e `moedas` servem para a legenda e para os botões de teste. `seguir` e `compartilhar` usam os mesmos efeitos. Depois de mudar o `config.json`, feche a janela preta e abra de novo.

## Equilíbrio (medido no simulador)

| Cenário | Quanto o herói dura em média | Nível médio | Antes do nível 10 |
|---|---|---|---|
| Sem nenhuma interação | **4 min** (o mais longo 7 min 11 s) | 10 | mais da metade cai entre o 5 e o 9 (sem curtida, torcida nem presente, ninguém ajuda) |
| Só chat (6 pessoas comentando e votando, curtidas) | **~7 min 20 s** (sem presente, depois de 4 min a horda fica furiosa; o mais longo 10 min) | 17 | ninguém cai; a vida chega a ~60% entre o 5 e o 9. A maioria cai entre o nível 15 e o 24, alguns já com a 1ª suprema |
| Chat + presentes misturados (8 por minuto) | **~26 min na mediana** (a maioria cai no **golpe final** de quem atrapalha; o mais longo 54 min). **1ª suprema ~7 min e meio, 3ª ~12 min e meio, 6ª e nível deus ~20 min e meio** (nível ~78) | 60+ | quase ninguém cai |
| Chat + só presentes que ajudam (4 por minuto) | ~30 min (o mais longo 35 min) | 40+ | ninguém cai |
| Chat + só presentes que atrapalham (4 por minuto) | 4 min 37 s (os zumbis do fã e o conversível apertam de verdade). O colosso também aperta: 3 de cada 4 cansaram | 13 | uns 4 de cada 10 caem antes do 10 |

Os primeiros níveis vêm rápido (a primeira escolha de habilidade sai no primeiro minuto) e depois cada nível pede mais. A experiência vem **mais fácil que antes** em todos os níveis (até o 60, uns 30% menos XP no total; `dados.js` → `xpParaNivel`), no ritmo que o chat consegue escolher (cada escolha leva uns 15 a 20 s). Até o nível 10: uns 220 de XP; até o 40: uns 8.500; até o 90: uns 87.000. O nível máximo é o **120**. As passivas 📚 Estudioso e 💰 Gorjeta e o drop 🍀 Sortudo dão mais experiência. O nível 10 chega por volta dos 3 minutos em lives com chat; o 20 (lobos e braços longos), em lives que ajudam; o 30 (praia), em lives muito engajadas. Cada quarteirão leva perto de 1 minuto (limpar a área inclusive), então a horda gigante vem a cada 4 ou 5 minutos.

Como as habilidades deixam o herói bem mais forte a cada nível, a ameaça também sobe com o nível do herói (`ameaca_por_nivel_do_heroi`, 0.45; conta só os níveis que o chat já escolheu, os que esperam na fila não contam): quanto mais forte ele fica, mais forte vem a horda. E, como as habilidades e combos crescem **multiplicando**, da ameaça 18 em diante os zumbis também crescem **multiplicando** (+9% de vida e +6% de dano por nível de ameaça, acumulando; `dano.js` → `ESCALA_AMEACA`, `aceleraDesde`, `vidaExp`, `danoExp`): vida ×1,8 na ameaça 25 e ×6,6 na 40. Assim o herói fica muito forte, mas a horda sempre acaba vencendo.

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
| `tela.js` | **os zumbis da tela**: o catálogo com os números de cada um (`ZUMBIS_TELA`: nível, duração, cobertura, recarga, nível na rua, chance), a escala com o valor do presente, a chance por presente e na rua (`TELA`). A arte fica em `view/tela.js` |
| `habilidades.js` | **as habilidades** (estilo Vampire Survivors): as 3 cartas, os 5 slots de cada lado, as receitas, a sinergia, o núcleo com as 6 supremas, o nível deus, armas novas, treino e o que a IA escolhe |
| `hab-ativas.js` / `hab-passivas.js` / `hab-supremas.js` | as 22 habilidades, as 22 passivas, as 22 supremas e os 8 poderes deus (gerais e únicos de cada personagem). Habilidade nova = acrescentar em `ATIVAS` (com a passiva par) e a suprema dela em `SUPREMAS` (instruções no começo de cada arquivo) |
| `hab-base.js` | as peças das habilidades: alvos, explosões e ondas do herói, raio em cadeia, projéteis, minas, torretas |
| `jogo.js` | o resto: herói, zumbis, arena, herói caído, mochila e presentes inteligentes |

**Testes automáticos:** `node teste/dano.test.mjs`, `node teste/status.test.mjs`, `node teste/ameaca.test.mjs`, `node teste/caminhos.test.mjs`, `node teste/nome.test.mjs`, `node teste/som.test.mjs` (acústica), `node teste/tomate.test.mjs` (física do tomate no vidro), `node teste/grafico.test.mjs` (gráfico de atributos), `node teste/previsao.test.mjs` (o resultado da votação conta o que tem no destino, e acerta), `node teste/cabo.test.mjs` (cabo de guerra e os 10 s do resultado), `node teste/pedra.test.mjs` (zumbi da pedra e a trinca no vidro), `node teste/portal.test.mjs` (portal dos 500, guardião e relíquias), `node teste/fusoes.test.mjs` (tabela de supremas do T e o avião do Ataque aéreo), `node teste/presentes.test.mjs` (presentes baratos, sorteio do mesmo preço, parcelas e poderes fortes recarregando), `node teste/toque.test.mjs` (dano por toque), `node teste/pistola.test.mjs` (pente da pistola), `node teste/entrada.test.mjs` (zumbi de quem entra na live), `node teste/recompensas.test.mjs` (drops, inspiração, colosso, runas, conversível, zumbi paraquedista e zumbis do fã), `node teste/catalogo.test.mjs` (a prévia sem o programa usa os mesmos números do config.json), `node teste/ambiente.test.mjs`, `node teste/atraso.test.mjs` (votos atrasados, caído, presentes inteligentes), `node teste/tela.test.mjs` (zumbis da tela: catálogo, escala com o presente, como aparecem, mão gigante, grafite e fã com o nome, limpador), `node teste/habilidades.test.mjs` (o que existe, receitas, cartas, únicas de cada personagem, slots e trocas, cada habilidade, sinergia, supremas, núcleo, nível deus, escolha do chat, a IA chegando no nível deus, experiência, nível máximo, Anti-explosão e inchados instáveis), `node teste/bonus.test.mjs` (bônus por quarteirões), `node teste/ritmo.test.mjs` (zumbi do tomate, começo puxado, cota da quadra, limpar a área, horda a cada 5 quarteirões, segundo fôlego, chefes, lobo e braço longo, praia, desgaste, figurantes, fúria sem ajuda) e `node teste/estabilidade.test.mjs` (roda meia hora de jogo com cada personagem e falha se algum herói travar ou ficar imortal). Para simular um personagem só: `CLASSE=enfermeira node teste/simular.mjs 30 nada`.

**Para testar o equilíbrio sem live:** `node teste/simular.mjs` roda dezenas de partidas em segundos em 5 cenários (sem interação, só chat, presentes misturados, só presentes que ajudam, só presentes que atrapalham) e mostra quanto cada herói durou. Para testar números sem mexer no `config.json`: `AJUSTES='{"horda_base":8}' node teste/simular.mjs 20 nada`. Também dá pra mexer em `ameaca.js` e na força dos zumbis só na simulação: `AMEACA='{"medioForca":1.5}' ESCALA='{"vida":0.3}' node teste/simular.mjs 20 chat`, e `SEED=1` roda outra sequência de partidas. O simulador mostra em que faixa de nível os heróis caem, a vida mínima em cada faixa, quando chegam no nível 10, quando saem a 1ª, a 3ª e a 6ª suprema e o nível deus (tempo e nível) e quanto tempo levam pra limpar a área.

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
Primeiro confira a versão: ao abrir, a janela preta mostra `Herói contra Hordas ligado! (versão 1.42.0)` (ou mais nova). Se mostrar versão mais velha, ou não mostrar versão nenhuma, você está com o programa antigo: rode o comando do PowerShell de novo (ele fecha o programa antigo sozinho e atualiza).

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
