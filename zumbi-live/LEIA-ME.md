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

### 🎬 A história: o chat escolhe o herói (versão 2.3)

A partida começa com a história (a história inteira está em `historia/HISTORIA.md`):

1. **Escolha do herói.** A tela mostra os heróis com o rosto de cada um, em pixel art, com o cenário dele atrás:
   - **1 Daiane**, a enfermeira;
   - **2 Sargento Edson**, o policial;
   - **3 Tati**, a bombeira;
   - **4 Kauã**, o entregador;
   - **5 Seu Ademir**, o mecânico;
   - **6 ???**, trancado: o Valadares, liberado depois que algum herói chegar a um final.

   **O chat vota digitando o número** ("4", "44", "4️⃣" e "#4" valem). São 20 segundos de votação. Ninguém votou: a IA escolhe. O mais votado fica em destaque: "O CHAT ESCOLHEU: KAUÃ", e, se tiver padrinho, "vivido por @nick".
2. **A introdução do escolhido.** É uma cena de filme em pixel art, numa faixa de cinema no meio da tela, só com legenda e som ambiente. O **entregador** tem o filme inteiro, "A tarifa 5×": a comunidade vendo a cidade queimar, o celular com a tarifa dinâmica e a mensagem da avó, e a bifurcação. Os outros, por enquanto, têm um cartão com o rosto e quem é. Na legenda, o nome original vira o nome de quem dá nome ao herói.
3. **A escolha do caminho** (entregador). O chat vota **1 🏠 Subir até a Vó Dita** ou **2 📦 Aceitar as entregas (5×)**. Ninguém votou: a IA vai pela avó.
   - **Vó primeiro:** a pé e **sem arma nenhuma** (só as mãos), com **+22% de esquiva** e **+25% de velocidade**.
   - **Entregas:** ele vai **montado na moto**, bem mais rápido. **Atropela todo zumbi que encosta** (menos chefe) e ganha **R$ 4–12 por atropelado**. De moto ele **só atropela e segue pelos quarteirões**:
     - não atira, não bate e não usa habilidade;
     - não ganha experiência e não pega item nem bônus (só a grana dos atropelos);
     - não para pra limpar a área e não entra em prédio;
     - o chat vota a **direção** (esquerda, reto, direita), não o destino no mapa.

     **A luta começa depois que ele cai da moto.** Depois de **4 quarteirões**, ele cai: o filme **"A poça"**. Dali em diante vai a pé, com o pagamento das entregas no bolso (R$ 180, cinco vezes a tarifa) pra gastar com o Barganha. O mapa volta.
4. A partida segue como sempre. Quando o herói morre, a próxima partida abre a escolha de novo.

Enquanto a história está na tela, **a rua fica pausada** (como no portal dos 500), e o som da rua dá lugar ao som da cena. Presente de ajuda que chega nessa hora vale assim que a partida começa. Os números ficam em `public/js/core/prologo.js` (`PROLOGO`).

### 🧟 Sobrevivência (versão 2.0)

O jogo deixou de ser arcade: é mais lento, pra quem assiste **contemplar a cidade e as lutas**. Os números ficam em `public/js/core/sobrevivencia.js`, `mapa.js` e `encontros.js`.

**O 1º quarteirão.** O herói sai andando devagar, pisando com cuidado. Mais à frente, **um zumbi agachado está devorando uma pessoa** que grita "SOCORRO!", "ME AJUDA!". Ele só levanta quando o herói chega perto (ou leva um golpe/tiro) e aguenta mais que um zumbi comum: é **a única luta da quadra**. Nenhum outro zumbi aparece, e o que o público manda pra atrapalhar espera a luta acabar (o aviso do presente aparece na hora). O policial **não atira enquanto o zumbi está em cima da pessoa** (poderia acertá-la): vai de lanterna até o zumbi se afastar. Morto o zumbi, a pessoa agradece ("Obrigada... leva isso") e deixa um curativo. Aí abre a primeira votação. Liga e desliga no `config.json` → `cena_do_primeiro_quarteirao`.

**O duelo.** Com **até 2 zumbis perto** (e nenhum chefe), a luta é de verdade. O zumbi **prepara o bote**: fica parado, inclinado pra trás, com o olho vermelho piscando e um rosnado subindo (uns 0,5 s), e então **avança 1 casa**. O herói de perto **espera a brecha** a uns 1,6 passos (dentro do alcance do bote: o perigo é real): entra, bate e **recua pra fora do alcance**. Se ele **lê o bote** a tempo (55% de chance, mais com agilidade), desvia pro lado; se não, leva a mordida. Quem atira mantém uns 3 a 4 passos de distância. **Recuando, ele pode tropeçar**: cai, fica 1 s no chão e se machuca um pouco (4% da vida; tropeço nunca mata). Com 3 ou mais zumbis, volta a briga de horda de sempre.

**Passo cuidadoso.** Sem zumbi acordado a menos de 7 casas, o herói anda a 60% da velocidade, olhando em volta. Em cima de um perigo no chão (vidro, fogo...), sai rápido.

**A rua enche aos poucos.** O 1º quarteirão só tem a cena. No 2º, aparecem 20% dos zumbis de antes, e o número sobe até o normal no 8º quarteirão (`quarteiroes_ate_a_rua_cheia`). A primeira horda gigante só vem quando a rua já está cheia. Enquanto a rua está calma, o tempo pesa menos na ameaça (70%) e **cada zumbi vale mais experiência** (até 2,5× no começo), pra o herói não ficar pra trás nos níveis.

**🗺️ A viagem pelo mapa.** Em vez de votar esquerda/direita em cada cruzamento, **o chat escolhe pra onde ir**. A votação só abre quando o herói **chega no cruzamento**, e ele **fica parado ali** enquanto o chat escolhe, com um mapa de papel nas mãos (se um zumbi chegar, ele luta, mas não sai do lugar). O mapa é um **cartão pequeno no canto da tela**, no estilo de um **mapa de cidade de verdade** (como um GPS): visto de cima, com a direção do herói sempre pra cima, papel claro, **ruas com nome** (R. das Flores, Av. Paulista...), avenidas amarelas mais largas, prédios e casas desenhados (as lojas na cor delas), parques com árvores e lago, praças com fonte, **cavaletes** nas ruas fechadas, a **rota** até cada lugar (a que está ganhando fica azul, grossa) e um **pino** em cada lugar com o número e o emoji; o herói é o ponto azul com o cone da direção. Bússola e escala nos cantos (`public/js/view/mapa.js`). E os lugares aparecem **no próprio jogo**: setas no chão mostram por onde cada rota começa; lugar que aparece na tela ganha um pino em cima ("1 · 🏥 2q"); lugar fora da tela, uma **seta na borda da tela** apontando pra ele. Viajando, só o destino fica marcado, em azul. O painel também mostra o nome da rua onde o herói está (🪧). As opções são **o lugar mais perto de cada necessidade**, a pelo menos 2 quarteirões (é uma viagem):

| Necessidade | Lugares | O que pode ter lá dentro (nem sempre tem tudo: é preciso ir conferir) |
|---|---|---|
| 🛒 comida | mercado, casa | 🥫 **comida** (+15% de vida), 🥤 **energético** (+25% de velocidade por 2 quarteirões), 🍊 **vitaminas** (+15% de resistência por 3 quarteirões) |
| 💊 cura | hospital, farmácia | 💊 **remédio** (cura a infecção e regenera 0,6 de vida por segundo por 2 quarteirões), 🩹 curativos, 💚 kits |
| 🔫 armas | delegacia, posto, fábrica | 🔫 **arma** (pistola ou escopeta), munição, 🦺 colete, baú |
| ⚔️ arena | praça (se tiver uma a até 4 quarteirões) | chefe, ondas de zumbis e baú |

Votos de **1 a 4** (o número de cada lugar). Se não tiver um lugar de alguma necessidade por perto, um aparece a 2-5 quarteirões. O lugar visitado há pouco não aparece de novo. Ninguém votou: a IA vai **no que o herói precisa** (vida baixa: remédio ou comida; sem arma: delegacia), preferindo o mais perto. Depois o herói **segue a rota sozinho**, quarteirão por quarteirão: cada rua ainda tem o seu caminho (perigoso, livre, história), ele **limpa a área** antes de atravessar e, chegando, **entra no lugar**. Saindo, o chat vota o próximo destino. O painel mostra **🧭 🛒 Mercado · 3 quarteirões**. Rua da rota que fechou no caminho (carros batidos): a rota é recalculada. Liga e desliga no `config.json` → `viagem_pelo_mapa` (0 = a votação de direção de antes, com o lugar do fim de cada rua).

**🏙️ A cidade cada vez mais caótica.** Quanto **mais longe do começo** o herói vai (e quanto mais tempo de run), mais a cidade desmorona (o **caos**, `public/js/core/city.js` → `CAOS`):
- **mais ruas interditadas**, inclusive pela polícia (cavaletes e uma viatura atravessada, com o giroflex ligado);
- **viaturas, ambulâncias e caminhões de bombeiro parados** na rua, com as luzes piscando (de noite, pintam a rua de vermelho e azul);
- **veículos de emergência passando com a sirene ligada** na rua do lado de um cruzamento perto (nunca na rua do herói), atropelando os zumbis do caminho; quanto mais caos, mais seguido;
- **lixeiras pegando fogo** e **fogo nas janelas dos prédios** (o crepitar aparece quando o herói passa perto);
- **gente nas janelas**: alguém aparece, acena e fala com o herói: "Socorro!", "O que tá acontecendo?!", "Cadê a polícia?!", "Cuidado, atrás de você!" (com zumbi perto), "Tem alguém aí?" e "Shhh... eles ouvem!" (de noite), "Vai, herói!" (`public/js/core/cenario.js`).

**🏘️ Bairro residencial de casas.** No bairro residencial, uns 7 de cada 10 lotes são **casas**: quintal de grama, cerca branca de madeira, caminho de pedra até a porta, parede em cor pastel, telhado de telha de duas águas, janelas que acendem de noite, às vezes chaminé e árvore no quintal. O resto são prédios de apartamento. As ruas do bairro têm **árvores na calçada**. No mapa, as casas aparecem com o quintal verde.

**🆘 Encontros no caminho.** No meio da viagem (do 2º quarteirão dela em diante, 45% de chance por quarteirão), **alguém pede ajuda** numa rua do lado: "Dona Cida, encurralada, 3 zumbis". O chat vota **1 🤝 AJUDAR** ou **2 🚶 SEGUIR** (o herói espera no cruzamento enquanto isso). Os zumbis do encontro ficam em cima da pessoa: não vêm atrás do herói, não contam pra limpar a área e quem atira não mira neles, a não ser que decidam ajudar.
- **Ajudar:** o herói desvia, enfrenta os zumbis e salva a pessoa. Ela agradece e **vai junto** (atira nos zumbis, devagar, porque está fraca), às vezes ainda dá um item que tinha (kit, munição, energético, remédio, grana), e o herói ganha experiência. **Mas ela foi mordida** (o cartão mostra "🩸 Dona Cida · mordido"):
  - depois do **1º quarteirão**, **40% de chance de virar zumbi** ali do lado do herói e atacar ("🧟 Dona Cida virou zumbi e está atacando!"), com o nome e a roupa dela e mais vida que um zumbi comum;
  - depois do **2º quarteirão**, **60% de chance**;
  - se não virou, **não resiste no 3º quarteirão**, ou ao chegar no lugar da viagem, o que vier primeiro (fica o corpo no chão: "💀 Dona Cida não resistiu à mordida..."). Os números ficam em `encontros.js` → `ENCONTROS.infeccao`.
- **Seguir:** a viagem continua... e **2 quarteirões depois a pessoa volta como zumbi, com o nome dela** ("🧟 Dona Cida virou zumbi...").
- Ninguém votou: a IA ajuda quando a vida está acima de 50%.

**🧥 O Barganha, o comerciante ambulante.** De vez em quando (do 2º quarteirão em diante, metade das vezes por quarteirão da viagem, no máximo uma visita a cada ~2 minutos), um mascate encapuzado, de lenço no rosto e olhos brilhando, com uma mochila cheia de bugigangas, está **na esquina do próximo cruzamento, do lado de um barril pegando fogo**: "Ô, parceiro! Que que vai levar?" (voz grave e rouca e a risadinha "hehehe"). O herói vai até ele, e o chat vota **1 a 4**:
- **COMPRAR** (duas ofertas, a do que o herói mais precisa primeiro) com a **💰 grana** que o herói junta: começa com R$ 10, **cai de zumbi** às vezes (R$ 1–4; chefe sempre deixa R$ 12–25), está **escondida nos prédios** (R$ 4–10) e às vezes vem de quem ele salva. Preços: 💚 kit R$ 25, 💊 remédio R$ 18, 🥤 energético R$ 14, 🍊 vitaminas R$ 14, 🦺 colete R$ 28, 🔫 munição R$ 15, 🔫 pistola (36 balas) R$ 40, 💥 escopeta (24 balas) R$ 55, 🔥 **metralhadora lendária** R$ 90. O que não dá pra pagar aparece riscado em vermelho;
- **VENDER** uma cura da mochila (kit R$ 12, curativo R$ 8) ou a arma de fogo achada (R$ 20);
- **TROCAR** 1 cura da mochila por 🥤 energético + 🍊 vitaminas;
- **SEGUIR**: "Volte sempre... se continuar vivo!"

Fechou negócio, ele oferece de novo (até 2 rodadas por visita), com o "plim-plim" da caixa registradora. Ninguém votou: a IA compra o que o herói precisa (vida baixa: kit ou remédio; sem arma: pistola; pouca munição: munição) se tiver grana, vende se estiver duro, e senão segue. A grana aparece no cartão do herói (💰 R$). Tudo fica em `public/js/core/mascate.js` (`MASCATE`: chance, preços, quanto ele paga, as falas).

**O herói.** Anda sozinho pelo meio da rua, luta, pega os itens que caem e foge do que é perigoso demais. A cada zumbi derrotado ganha experiência; ao subir de nível as **perícias** dele sobem e **o chat escolhe uma habilidade nova** (veja "Habilidades", logo abaixo). Ele só muda quando morre. Cada novo sobrevivente é sorteado entre 5 personagens, cada um com o seu jeito de lutar:

| Personagem | Arma inicial | Perícia que sobe com o nível | Ponto forte | Ponto fraco |
|---|---|---|---|---|
| 👮 Policial | 🔫 pistola + 🔦 lanterna (a lanterna bate de perto e, **de noite, ilumina um cone** na frente dele; a luz respeita os prédios: um prédio na frente corta a luz, e o prédio que fica transparente na frente do herói deixa ela passar) | armas de fogo | tiro crítico **marca** o zumbi (+25% de dano nele) | pouca coisa de perto |
| 🩺 Enfermeira | 🔪 facas (de perto) | facas e agilidade | **cada golpe que acerta cura 1 de vida** (cura mais com a perícia); resiste a infecção | **armadura baixa** (toma mais dano) |
| 🧑‍🚒 Bombeira | 🪓 machado (de perto, pega vários) | machados e pancada | **muito resistente**, aguenta fogo e explosão; **instinto de sobrevivência** com pouca vida (defesa e cura) | lenta |
| 🛵 Entregador | 🏏 taco de beisebol (de perto, empurra longe) | agilidade e pancada | rápido e **desvia de ataques** (a esquiva sobe com a agilidade) | pouca vida extra |
| 🔧 Mecânico | 🪝 pé de cabra (de perto) | pancada e explosivos | o pé de cabra **atordoa** e **quebra a armadura** dos zumbis; aguenta explosões | sem arma de fogo no começo |

Só o policial começa com arma de fogo. As outras se acham na **🚓 delegacia** (veja "A viagem pelo mapa"): quem não tem arma acha uma **pistola com 36 balas contadas**; quem já tem pistola acha uma **escopeta**. Acabou a munição, volta pra arma dele. Tudo em `public/js/core/dados.js` → `CLASSES`, `CORPO`.

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

**A escolha de habilidade não segura o herói.** Enquanto o chat vota (A, B ou C, com o mesmo tempo de sempre), o herói continua andando e atravessa os cruzamentos normalmente; a habilidade entra quando a votação fecha. Com 2 ou mais na fila, a votação fica mais curta.

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

**O som (design de som da versão 2.0): uma cidade perigosa que soa calma.** Todo som é gerado pelo jogo, sem arquivos (`public/js/view/som.js`). Quem assiste está lá no alto, longe do chão, e o som foi feito pra essa distância:
- **Acústica de verdade:** a câmera fica no alto, como num helicóptero, então tudo chega um pouco mais grave. Quanto mais longe do herói, mais baixo, mais abafado (o ar come os agudos primeiro) e um tiquinho atrasado. E, o que mais faz o ouvido sentir "longe", **mais eco da cidade**: perto, quase só o som direto; longe, o eco dos prédios (dentro de um prédio, o eco é curto, de sala). **Estéreo:** cada som vem do lado da tela onde aconteceu.
- **O ambiente (relaxante, mas perigoso):** vento com rajadas lentas e a cidade respirando lá longe. De manhã, pássaros; de tarde, um sino de igreja distante; de noite e de madrugada, grilos e coruja; um cachorro latindo longe. De vez em quando, **um perigo bem longe**: um grito, tiros ecoando nos prédios, uma sirene, vidro quebrando, metal caindo, um coro de zumbis. Dentro dos prédios: o zumbido da lâmpada e uma goteira. Na praia, o mar.
- **A música:** um tapete calmo de acordes longos em lá menor (Am9, Fmaj7, Cmaj7, G6), com eco largo e uma **caixinha de música** tocando de vez em quando. Quando o perigo chega perto, entra um pulso grave e suave e um zumbido dissonante bem baixinho; com a vida baixa, cordas nervosas (sem estridência). A música abaixa um pouco quando o herói está sozinho.
- **💥 Explosão grave ("buuum"):** um seno bem grave caindo (40 a 80 Hz, a onda de pressão), o estrondo rolando, um estalo só quando é perto, a cauda ecoando nos prédios e destroços caindo. Como o celular não toca grave de verdade, uma cópia **saturada** cria harmônicos de 100 a 300 Hz que o celular toca e que fazem o ouvido "completar" o grave. A explosão abaixa a música e o ambiente por um instante (o soco).
- **🚗 Alarme de carro:** explosão perto de um carro parado estoura os vidros e dispara o **alarme de verdade** (uiu-uiu, bipes, uô-uô), com o pisca-alerta, por uns 9 s (um por vez). O som **fica no carro**: se o herói se afasta, o alarme vai baixando, ficando abafado e mudando de lado até sumir.
- **🚓 Sirenes passando:** viatura ("uiôôô" subindo e descendo), ambulância (o "iu-iu-iu" rápido) e bombeiros (mais grave, com a buzina), com o **Doppler** (mais aguda chegando, mais grave indo embora) e o lado e o volume acompanhando o veículo.
- **🪟 Gente nas janelas:** a voz de quem grita lá de cima, com o eco da rua (pergunta sobe no fim). **🔥 Fogo por perto:** o crepitar de lixeira, carro ou prédio pegando fogo, mais forte quanto mais perto.
- **🍾 Vidro quebrando:** o estalo, o corpo estilhaçando e os cacos (pares de frequências que não formam nota, caindo cada vez mais espaçados). Molotov estoura a garrafa e o fogo pega ("vuf"); pisar em cacos faz o crec-crec.
- **Passos sempre:** andando com cuidado, a pisada é macia (calcanhar e depois a ponta do pé rolando); correndo e lutando, mais forte. Chão: asfalto, grama, piso, azulejo, concreto, vidro e lama.
- **Respiração e coração:** sozinho e bem, a respiração é lenta e calma. Com a vida abaixo de 40%, **pesada e rápida, sempre** (até lutando), com um gemido junto. Abaixo de 30%, o coração (tum-tum grave).
- **Armas:** pistola (estampido, corpo, eco nos prédios e a cápsula tilintando no chão), escopeta (com o "tchk-tchk" do pump). Golpes de perto: o vento da arma passando e, acertando, **o impacto de cada arma**: faca (corte molhado), machado (talho pesado), taco (madeira "tók"), pé de cabra (ferro "blém"), lanterna (pancada abafada e as pilhas chacoalhando), chave (metal "tlim").
- **Habilidades:** granada quica no chão antes de explodir, gelo trinca em cristais, raio estala com um trovão baixinho, escudo brilha, ímã zune, algemas fazem o catraca, sirene, injeção e o **grito de guerra** na voz do herói.
- **Zumbis:** gemidos e rosnados (3 vozes), o pé arrastando quando estão perto, **mastigando** em cima de alguém, o **rosnado alto** quando notam o herói, o **chiado subindo** quando preparam o bote (dá pra ouvir que ele vai pular) e o último suspiro com o corpo caindo.
- **Gente:** a pessoa gritando **"SOCORRO!"** (voz humana nas sílabas da frase, com o choro tremendo; cada pessoa com a sua altura de voz) e o suspiro de alívio quando é salva. O herói **geme de dor** na mordida e no tombo (cada personagem com a sua voz).
- Os **avisos da tela** (presente, voto, nível, baú, chefão...) continuam como um videogame de 16 bits ouvido de longe; o mapa abrindo é um papel desdobrando, e o encontro, duas notas que "perguntam".
- No fim, tudo passa por um **compressor** que cola a mixagem e segura os picos.

**🦷 A mordida pega quem está encostado.** O zumbi morde quando está **encostado no herói na tela** (até 0,2 casa além do alcance dele), não só quando está colado. Antes o empurrão automático do herói jogava o zumbi pra trás antes de ele chegar no alcance da mordida, então ele chegava perto e quase nunca mordia. E a **primeira mordida sai logo** (em até 0,35 s depois de encostar). O dano base subiu um pouco: zumbi **7** (era 6), gordo **9** (era 8), corredor **5** (era 4). O **💣 explosivo tira metade** do que tirava (estouro de 9, era 18; o inchado instável do nível 20 também cai pela metade) e, pra o fim de jogo não ficar fácil, o dano da horda acelera um pouco mais depois da ameaça 18 (+7% por nível, era +6%). No simulador: sem interação o herói dura uns 4 min (era ~5), só com chat ~8 min (igual) e com presentes ~25 min (era ~30). Fica em `public/js/core/dano.js` → `MORDIDA`, `ESCALA_AMEACA`; `ameaca.js` → `EXPLOSAO`; `dados.js` → `ZUMBIS`.

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

**Os prédios.** Alguns cruzamentos têm uma loja na esquina (com a opção **4 🚪 ENTRAR**). A placa é em **letras de pixel com o ícone da loja**, desenhada dentro do próprio prédio, então segue a perspectiva e a ordem das camadas (o prédio da frente tapa a placa; o prédio transparente deixa a placa transparente junto): metade das lojas tem um **letreiro no telhado** sobre dois postes, e a outra metade a **placa na fachada, em cima da porta**, inclinada na direção da parede. De noite, as placas acendem. A **caixa d'água / ar-condicionado** (e a chaminé) em cima dos prédios **some por completo** quando o prédio fica transparente na frente do herói, e volta quando ele fica opaco de novo. Cada tipo tem tamanho, móveis e arrumação próprios (fileiras, ilhas ou corredor), zumbis, coisas para pegar e **perigos no chão** também. Depois de um tempo dispara o alarme, e ele sai pelos fundos, do outro lado do quarteirão (conta como atalho).

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

**🧬 HABILIDADE SUPREMA = habilidade no nível 5 + a passiva par no nível 3.** São 8 cartas certas no meio das outras (na prática, uns 15 níveis). Escolhendo a carta SUPREMA, a habilidade e a passiva **saem dos slots** (libera 1 vaga de cada, pra pegar coisa nova) e viram uma habilidade muito mais forte. **O bônus da passiva fica.** As supremas vão pro **núcleo** (o círculo no meio do painel): o anel tem **6 pedaços**, um por suprema, com o emoji de cada uma em volta (sem número no meio: os 6 pedaços já mostram quanto falta). Cada suprema a mais deixa **todas** mais fortes (+12% cada). Quando tem suprema pronta pra fazer, o meio do núcleo pisca. Com as 6, aparece no meio uma **runa dourada piscando** (o poder deus está pra ser escolhido) e, escolhido o poder, ela vira a **runa única daquele poder deus** (`public/js/view/hud.js` → `RUNAS`). **Anel de recarga:** em volta de cada habilidade (e de cada suprema e do poder deus) tem um anel que **esvazia quando ela é usada e vai se completando em sentido horário**; cheio e dourado = pronta (as que ficam sempre ligadas, como as lâminas, ficam sempre cheias).

**🎁 NÍVEL 10 = SUPREMA DE PRESENTE.** No nível 10 o chat escolhe 1 entre as 3 supremas clássicas, de graça (sem receita): ✈️ **Ataque aéreo** (o avião que solta bombas nos maiores grupos), ☀️ **Aura de fogo** e ❤️‍🔥 **Coração de ferro**. Ela ocupa 1 dos 6 pedaços do núcleo e ainda cura 30% da vida; as outras 5 saem pelas receitas. Só vem uma vez por herói (`habilidades.js` → `NIVEL_PRESENTE`, `SUPREMAS_PRESENTE`).

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
| 🔰 Escudo de energia | defesa | escudo que **segura golpes** (cada carga segura até 20% da vida; o que passar disso entra); quebrando, empurra a horda | ❤️ Vitalidade (vida) | ❤️‍🔥 **Coração de ferro**: escudo de 2 golpes (volta a cada 12 s), defesa, regeneração e **levanta o herói** quando ia cair (a cada 45 s) |
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

- **Em cima:** o cartão do herói (personagem, nível, nome, arma, barra de vida com colete, barra de experiência do mesmo tamanho da de vida e, embaixo, os slots: 5 slots de habilidade à esquerda, o **núcleo** no centro com as 6 supremas em volta e 5 slots de passiva à direita). Embaixo, uma linha com quarteirões, recorde, zumbis derrotados, ameaça, tempo vivo e curtidas; depois os efeitos ativos (proteção, noite, prédio, cachorro...). Se o que uma dessas duas linhas tem pra mostrar não cabe na largura (números muito grandes, muitos efeitos ao mesmo tempo), ela vira um **letreiro de jornal**: escorrega devagar da direita pra esquerda, emendando a volta, e para sozinha quando voltar a caber (`public/js/view/letreiro.js`). Por último, **a votação**: na viagem pelo mapa, **pra onde ir** (com o **mapa do bairro** logo abaixo: os lugares numerados, a rota de cada um e o que tem lá, `public/js/view/mapa.js`); no caminho, **ajudar ou seguir** quando alguém pede ajuda. O aviso com as opções e o relógio; com votos, as bolinhas; no fim, o resultado com o que tem no destino (e o mapa só com a rota escolhida). Fora da votação, no mesmo lugar, o **cabo de guerra** entre o top ajudante e o top atrapalhante. Com o herói caído, o painel de **herói caído** aparece no lugar da votação. Logo abaixo, no canto direito, o botão **"📊 Digite G · 🧬 T"** (ou o gráfico/tabela aberto) e, no canto esquerdo, o **status que um presente deu ao herói**: quando um presente vira um bônus (tiro rápido, fúria, blindado, inspirado, drop do paraquedas...) ou um castigo (zumbi na perna), aparece um aviso com o emoji, o nome, por quanto tempo e de quem foi (verde bônus, vermelho castigo), que fica **4 s** e some (`public/js/view/hud.js` → `STATUS_PRESENTE_SEG`). O mesmo status de novo enquanto o aviso está na tela só atualiza ele. Curtidas não avisam (não são doação).
- **No meio:** só o jogo. Sem narração no meio da tela: os avisos grandes (chefão, horda, nível, limpe a área, ameaça...) estão desligados pra não poluir (`public/js/view/hud.js` → `AVISOS_NO_MEIO`, `true` liga de novo). O que importa fica nas linhas de cima (efeitos) e os sons continuam avisando.
- **Embaixo:** os avisos de presente, **alinhados à direita**: a foto de quem mandou na ponta direita, o nome à esquerda dela e, embaixo do nome, o presente e o que ele fez (verde ajuda, vermelho atrapalha), e a legenda de presentes como **letreiro de jornal**: escorre sem parar da direita pra esquerda com o que cada presente faz ("🌹 Rosa 1🪙: cura ...", verde ajuda, vermelho atrapalha), entre as notificações (em cima) e a escolha de habilidade (embaixo, quando aparece). Quem mais ajudou e quem mais atrapalhou ficam em cima, no **cabo de guerra**. Quando o herói sobe de nível, a **escolha de habilidade** (A, B, C) aparece embaixo do letreiro até o resultado, com o mesmo **relógio da votação da direção**: um bastão dourado embaixo do título que some das pontas pro meio e fica vermelho nos últimos segundos.
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
| `cena_do_primeiro_quarteirao` | a cena do 1º quarteirão (o zumbi devorando uma pessoa). 0 desliga | 1 |
| `viagem_pelo_mapa` | o chat escolhe pra onde ir no mapa (1) ou a direção em cada cruzamento (0) | 1 |
| `quarteiroes_ate_a_rua_cheia` | em que quarteirão a rua chega no número normal de zumbis (a rua começa vazia) | 8 |
| `zumbis_no_segundo_quarteirao` | fração dos zumbis normais no 2º quarteirão (sobe até 1 no quarteirão acima) | 0.2 |
| `passo_cuidadoso` | velocidade sem zumbi por perto (fração da normal) | 0.6 |
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
| Sem nenhuma interação | **~6 min e meio** (o mais longo ~10 min; o começo calmo e a viagem deixam a partida mais longa) | 14 | quase ninguém cai antes do 10, que chega por volta dos 4 min |
| Só chat (6 pessoas comentando e votando, curtidas) | **~8 min** (sem presente, depois de 3 min e meio a horda fica furiosa; o mais longo ~11 min) | 19 | ninguém cai; o nível 10 chega por volta dos 4 min |
| Chat + presentes misturados (8 por minuto) | **~32 min** (a maioria cai no **golpe final** de quem atrapalha). **1ª suprema ~1 min e meio, 3ª ~9 min, 6ª e nível deus ~15 min** | 100+ | ninguém cai |
| Chat + só presentes que ajudam (4 por minuto) | ~32 min (o mais longo 40 min) | 70+ | ninguém cai |
| Chat + só presentes que atrapalham (4 por minuto) | ~6 min e meio (o que é mandado na cena do 1º quarteirão espera e chega tudo junto depois dela) | 25+ | uns 3 de cada 20 caem antes do 10 |

Os primeiros níveis vêm rápido (a primeira escolha de habilidade sai no primeiro minuto) e depois cada nível pede mais. A experiência vem **mais fácil que antes** em todos os níveis (até o 60, uns 30% menos XP no total; `dados.js` → `xpParaNivel`), no ritmo que o chat consegue escolher (cada escolha leva uns 15 a 20 s). Até o nível 10: uns 220 de XP; até o 40: uns 8.500; até o 90: uns 87.000. O nível máximo é o **120**. As passivas 📚 Estudioso e 💰 Gorjeta e o drop 🍀 Sortudo dão mais experiência. O nível 10 chega por volta dos 3 minutos em lives com chat; o 20 (lobos e braços longos), em lives que ajudam; o 30 (praia), em lives muito engajadas. Cada quarteirão leva perto de 1 minuto (limpar a área inclusive), então a horda gigante vem a cada 4 ou 5 minutos.

Como as habilidades deixam o herói bem mais forte a cada nível, a ameaça também sobe com o nível do herói (`ameaca_por_nivel_do_heroi`, 0.45; conta só os níveis que o chat já escolheu, os que esperam na fila não contam): quanto mais forte ele fica, mais forte vem a horda. E, como as habilidades e combos crescem **multiplicando**, da ameaça 18 em diante os zumbis também crescem **multiplicando** (+9% de vida e +6% de dano por nível de ameaça, acumulando; `dano.js` → `ESCALA_AMEACA`, `aceleraDesde`, `vidaExp`, `danoExp`): vida ×1,8 na ameaça 25 e ×6,6 na 40. Assim o herói fica muito forte, mas a horda sempre acaba vencendo.

**Sem tempo limite:** a run dura o quanto a live aguentar. A única trava é contra herói imortal **sem ninguém ajudando**: se passar 3 minutos e meio sem nenhum presente de ajuda (ou seguir), os zumbis que nascem batem **60% mais forte e aguentam 60% mais** a cada minuto, e ficam um pouco mais rápidos (+3% por minuto, até +50%; senão um herói que deixa os zumbis lentos e empurra todo mundo segura a horda longe pra sempre). Um presente de ajuda zera essa conta. O herói também nunca fica parado: se passar do cruzamento, volta; se for empurrado pra outra rua, volta contornando os prédios; se ficar muito tempo sem avançar, abre caminho pela horda; se travar, ou se passar 75 s na mesma quadra sem conseguir chegar no cruzamento (empurrado pra frente e pra trás por uma horda gigante), é levado até o cruzamento. Lá ele ainda precisa limpar a área (no máximo 90 s esperando).

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
| `sobrevivencia.js` | **o ritmo de sobrevivência**: a rua enchendo aos poucos (`rampa`), o passo cuidadoso, a **cena do 1º quarteirão**, o **duelo** (bote do zumbi, guarda, desvio), o **tropeço** e o que a IA quer em cada lugar |
| `mapa.js` | **a viagem pelo mapa**: o grafo de ruas, as rotas, os lugares de cada necessidade (comida, cura, armas) e a praça |
| `encontros.js` | **os encontros no caminho**: quem pede ajuda, a votação ajudar/seguir, as recompensas, a **infecção** de quem foi salvo (`infeccao`: 40% / 60% / não resiste) e quem volta como zumbi |
| `prologo.js` | **a história no começo da partida**: a escolha do herói pelo chat, a introdução, a votação do caminho do entregador, a moto e a queda (`PROLOGO`). Os desenhos ficam em `view/escolha.js` (a tela), `view/retratos.js` (os rostos) e `view/cinema.js` (os filmes, vindos do protótipo `historia/prototipos/moto22.html`) |
| `mascate.js` | **o Barganha**: quando aparece, o catálogo com os preços, quanto ele paga, as ofertas de cada rodada, a IA e a grana que cai |
| `cenario.js` | **a cidade viva**: veículos de emergência passando com sirene e gente nas janelas (as falas ficam em `CENARIO.falas`) |
| `jogo.js` | o resto: herói, zumbis, arena, herói caído, mochila e presentes inteligentes |

**Testes automáticos:** `node teste/dano.test.mjs`, `node teste/status.test.mjs`, `node teste/ameaca.test.mjs`, `node teste/caminhos.test.mjs`, `node teste/nome.test.mjs`, `node teste/som.test.mjs` (acústica e eco da distância), `node teste/sobrevivencia.test.mjs` (armas iniciais, rua enchendo, a cena do 1º quarteirão, o policial que não atira na pessoa, duelo e bote, tropeço, passo cuidadoso, alarme de carro), `node teste/cenario.test.mjs` (o caos crescendo com a distância, veículos de emergência parados e passando, gente nas janelas, casas do bairro residencial, nomes das ruas), `node teste/viagem.test.mjs` (lugares do mapa e rotas, votação de destino e a IA, o herói parado no cruzamento enquanto o chat escolhe, a viagem até o lugar, itens com propósito, armas da delegacia, encontros: ajudar, seguir e quem volta como zumbi), `node teste/prologo.test.mjs` (a escolha do herói pelo chat, o cartão e o filme, os dois caminhos do entregador, a moto atropelando, a queda e os presentes que chegam durante a história), `node teste/mascate.test.mjs` (o Barganha: onde aparece, ofertas, comprar, vender, trocar, a IA e a grana; a infecção de quem foi salvo: 40%, 60% e não resiste), `node teste/tomate.test.mjs` (física do tomate no vidro), `node teste/grafico.test.mjs` (gráfico de atributos), `node teste/previsao.test.mjs` (o resultado da votação conta o que tem no destino, e acerta), `node teste/cabo.test.mjs` (cabo de guerra e os 10 s do resultado), `node teste/pedra.test.mjs` (zumbi da pedra e a trinca no vidro), `node teste/portal.test.mjs` (portal dos 500, guardião e relíquias), `node teste/fusoes.test.mjs` (tabela de supremas do T e o avião do Ataque aéreo), `node teste/presentes.test.mjs` (presentes baratos, sorteio do mesmo preço, parcelas e poderes fortes recarregando), `node teste/toque.test.mjs` (dano por toque e alcance da mordida), `node teste/pistola.test.mjs` (pente da pistola), `node teste/entrada.test.mjs` (zumbi de quem entra na live), `node teste/recompensas.test.mjs` (drops, inspiração, colosso, runas, conversível, zumbi paraquedista e zumbis do fã), `node teste/catalogo.test.mjs` (a prévia sem o programa usa os mesmos números do config.json), `node teste/ambiente.test.mjs`, `node teste/atraso.test.mjs` (votos atrasados, caído, presentes inteligentes), `node teste/tela.test.mjs` (zumbis da tela: catálogo, escala com o presente, como aparecem, mão gigante, grafite e fã com o nome, limpador), `node teste/habilidades.test.mjs` (o que existe, receitas, cartas, únicas de cada personagem, slots e trocas, cada habilidade, sinergia, supremas, núcleo, nível deus, escolha do chat, a IA chegando no nível deus, experiência, nível máximo, Anti-explosão e inchados instáveis), `node teste/bonus.test.mjs` (bônus por quarteirões), `node teste/ritmo.test.mjs` (zumbi do tomate, começo puxado, cota da quadra, limpar a área, horda a cada 5 quarteirões, segundo fôlego, chefes, lobo e braço longo, praia, desgaste, figurantes, fúria sem ajuda) e `node teste/estabilidade.test.mjs` (roda meia hora de jogo com cada personagem e falha se algum herói travar ou ficar imortal). Para simular um personagem só: `CLASSE=enfermeira node teste/simular.mjs 30 nada`.

**Para testar o equilíbrio sem live:** `node teste/simular.mjs` roda dezenas de partidas em segundos em 5 cenários (sem interação, só chat, presentes misturados, só presentes que ajudam, só presentes que atrapalham) e mostra quanto cada herói durou. Para testar números sem mexer no `config.json`: `AJUSTES='{"horda_base":8}' node teste/simular.mjs 20 nada`. Também dá pra mexer em `ameaca.js` e na força dos zumbis só na simulação: `AMEACA='{"medioForca":1.5}' ESCALA='{"vida":0.3}' node teste/simular.mjs 20 chat`, `MORDIDA='{"folga":0.3}'`, `TOQUE='{"porSegundo":3}'` e `DANO_ZUMBI='{"comum":6}'` (dano base de cada zumbi), e `SEED=1` roda outra sequência de partidas. O simulador mostra em que faixa de nível os heróis caem, a vida mínima em cada faixa, quando chegam no nível 10, quando saem a 1ª, a 3ª e a 6ª suprema e o nível deus (tempo e nível) e quanto tempo levam pra limpar a área.

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
Primeiro confira a versão: ao abrir, a janela preta mostra `Herói contra Hordas ligado! (versão 2.3.1)` (ou mais nova). Se mostrar versão mais velha, ou não mostrar versão nenhuma, você está com o programa antigo: rode o comando do PowerShell de novo (ele fecha o programa antigo sozinho e atualiza).

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
