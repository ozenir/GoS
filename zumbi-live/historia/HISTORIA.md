# Herói contra Hordas: a história

Este é o documento da história do jogo: o mundo, os personagens, os roteiros e a identidade visual das cenas. Não tem código aqui, só história e visual.

**Para quem continuar este trabalho (inclusive o Claude depois de limpar o contexto): leia este arquivo inteiro antes de mexer na história.** Ele é a memória do projeto.

---

## 1. Como a gente trabalha

- A conversa é sempre em **português**.
- **Nada de história entra no jogo sem o dono do projeto aprovar.** O caminho é sempre o mesmo:
  1. Escrever o roteiro ou fazer o protótipo da cena.
  2. Mandar para ele conferir: texto no chat, ou o protótipo publicado como página (artifact).
  3. Ele aprova, pede mudanças ou pede para refazer.
  4. Só depois disso a cena entra no jogo.
- Quando houver dúvida sobre a história de um personagem, **pergunte**. As decisões dele valem mais que qualquer ideia nossa.
- Ele gosta de trabalho feito com carinho e paciência: revisar, olhar as cenas de verdade (prints) e melhorar antes de entregar.
- Cada personagem tem uma seção com o **status**:
  - **Aprovado:** ele já aprovou, não mude sem pedir.
  - **Rascunho:** proposta ainda não conferida.
  - **Ideia:** só uma direção.
- **O jogo é o artifact do herói** ("Herói contra Hordas", o jogo que já existe). A história não é um jogo separado: ela vive dentro dele (seção 3).
- Ordem combinada: **primeiro o entregador inteiro** (pronto, seção 8), **depois os outros**, um de cada vez.
- Fica para conversar depois: o "portal" que já existe dentro do jogo (portal dos 500) e como ele se encaixa na história.

## 2. A essência

Ninguém aqui é herói de filme. São **pessoas comuns que já viviam no limite antes do fim do mundo**. O apocalipse não cria a desigualdade, só tira a maquiagem dela.

Cada personagem tem **um lugar para chegar e alguém para salvar**. O caminho até lá é o jogo: os quarteirões, as hordas, as escolhas do chat.

A pergunta que atravessa todas as histórias é: **até onde a minha vida vale mais que a do outro?**

Todos passam por momentos em que precisam pôr a própria vida, ou a de quem amam, na frente da vida de estranhos. Alguns têm um choque de realidade. Outros não, porque já se sacrificavam todo dia. É o caso da enfermeira, que dá um pedacinho de si pela filha toda noite.

A discussão social é sobre a sociedade de hoje:
- trabalho precário (entregador de aplicativo, técnica de enfermagem com dois empregos);
- a quem a lei protege (o policial);
- o heroísmo usado como desculpa para o descaso (a bombeira);
- o orgulho de quem não pede ajuda (o mecânico);
- o dinheiro que compra a saída (o rico).

O tom é sério, humano e às vezes com humor ácido. Por exemplo, o aplicativo que continua mandando notificação no meio do fim do mundo. Nunca é panfleto: a crítica aparece no que acontece, não em discurso.

## 3. Como a história acontece dentro do jogo (estrutura decidida)

O jogo é o **Herói contra Hordas**, o artifact do herói. A história entra nele assim.

**Já está no jogo (versão 2.3.0):**
- a escolha do herói pelo chat;
- o filme de abertura do entregador e a votação do caminho;
- a moto (atropela, ganha grana, o chat vota a direção) e a queda ("A poça");
- o cartão de introdução de quem ainda não tem filme.

A parte técnica fica em `public/js/core/prologo.js`, e os desenhos em `public/js/view/escolha.js`, `retratos.js` e `cinema.js`.

**Ainda falta no jogo:**
- os capítulos do meio da partida (a farmácia, o condomínio) como fragmentos;
- o final "O fim da linha";
- a tela de morte em máquina de escrever;
- os nomes dos personagens secundários vindos da live (hoje só o herói ganha o nome de quem doou);
- o comando !ela / !ele;
- a liberação do Valadares.

As etapas:

1. **Tela de escolha do herói.** O jogo começa com uma tela que mostra **cada personagem com o rosto dele** (retrato em pixel art), o nome e uma frase de quem ele é. **O chat vota** em quem vai jogar, digitando o número dele. *(Hoje o jogo sorteia o personagem; isso vai mudar.)*
   - Protótipo: https://claude.ai/artifact/RSz2CfCqEideXecKUURFKP (cópia em `historia/prototipos/escolha.html`).
   - A tela segue o formato do jogo: **em pé (9:16)**, como na live. Cada herói tem um card com o retrato, o número, o nome, uma frase curta e a barra de votos. Embaixo ficam o tempo da votação e os votos chegando do chat. No fim, o mais votado fica em destaque: "O CHAT ESCOLHEU: KAUÃ".
   - **O Valadares só é liberado depois que algum herói chegar a um final** (qualquer herói). Até lá, o card dele aparece trancado: a silhueta escura, "???" e "🔒 Chegue a um final com qualquer herói para liberar". Essa liberação fica guardada de uma partida para a outra.
2. **A introdução do escolhido.** Uma cena de filme própria de cada herói, como a abertura do entregador: quem ele é, o dia do caos e para onde ele precisa ir. Se a introdução tiver uma escolha (como "Vó primeiro ou entregas 5×"), o chat vota ali.
3. **A gameplay começa.** É o jogo de sempre: quarteirões, hordas, mapa, Barganha, encontros.
4. **Fragmentos da história ao longo da partida.** Pequenas cenas e momentos da história daquele herói aparecem durante a gameplay, em pontos certos (um lugar do mapa, um encontro, um quarteirão). Exemplos: a farmácia da Rua 9 e o condomínio do entregador.
5. **Os heróis se encontram.** Onde as histórias se cruzam (seção 10), um herói aparece na partida do outro, interage e às vezes segue junto por um tempo. **As decisões do chat fazem esses encontros acontecerem ou não.**
   - **As decisões valem só dentro da partida (run).** Elas mudam a sequência de acontecimentos daquela run, mas **não passam para a próxima**. Cada partida começa a história do zero; a única coisa que fica guardada é a liberação do Valadares.
6. **O fim da partida.** Se chegar no objetivo, vem o final daquele herói. Se morrer, vem a tela de morte em máquina de escrever. Depois a tela de escolha volta, e o chat escolhe o próximo herói.

**O formato das cenas no jogo:** o jogo é vertical (9:16), e as cenas de filme do entregador foram desenhadas deitadas (16:10, como cinema). No jogo, elas aparecem como **uma faixa de cinema no meio da tela em pé**, com tarjas pretas em cima e embaixo, e a legenda e a votação na tarja de baixo. Os retratos e as telas do próprio jogo (escolha, votação) são desenhados em pé.

## 4. O mundo: Porto Sereno

Tudo se passa na cidade de **Porto Sereno**, na terceira noite da **Febre Cinza**.

| Elemento | O que é |
|---|---|
| **Febre Cinza** | Febre de 41 graus e pele acinzentada. Quem morre levanta. Os infectados seguem o barulho e não sentem dor. |
| **AURORA-7** | Vacina distribuída de graça nas farmácias. O lote 7 foi liberado **antes dos testes, por lucro**. Ela não cura a febre: impede o corpo de morrer de verdade. **Importante:** o vilão é a ganância da empresa que pulou os testes, nunca a vacinação em si. A história não pode virar mensagem contra vacinas. |
| **Instituto Aurora** | A empresa da vacina. O maior acionista é **Augusto Valadares** (seção 9), **o antagonista de todas as histórias**. |
| **Augusto Valadares** | **O responsável pela crise.** Manipulou a liberação da vacina pelo lucro e, **sem querer**, transformou a população em zumbis. Ele não queria o apocalipse: queria o dinheiro. Aparece em todas as histórias como antagonista (seção 10). |
| **Dra. Lívia Prado** | Cientista do Instituto. Avisou que o lote 7 não estava pronto e foi calada. Tem um laboratório no subsolo do Hospital Central. |
| **Hospital Central** | Onde a enfermeira trabalha. A explosão do primeiro dia vem do laboratório no subsolo. |
| **Operação Farol** | Resgate de helicóptero na Torre de Rádio. **Segredo:** tem uma lista, e autoridades e quem pagou embarcam primeiro. Quem descobre é a bombeira. |
| **Rádio Resistência 98.7** | Rádio comunitária, no ar direto da Torre de Rádio. Quem fala é o **Beto**, filho do mecânico. |
| **Morro do Farol** | A comunidade onde moram o entregador (com a Vó Dita) e a mãe do policial. A Torre de Rádio fica no alto do morro. |
| **Quartel 3** | O quartel da bombeira. Na placa do quartel: "se encontrar um de nós de pé, termine o serviço". |
| **Jardins do Mirante** | Condomínio de luxo. Gerador ligado e luz em todas as janelas enquanto a cidade apaga. |
| **Farmácia da Rua 9** | Saqueada. É onde estava o cartaz "VACINE-SE! AURORA-7", com "NÃO TOMEM" escrito em batom por cima. |
| **Viatura 12** | A viatura do policial. Foi dela a transmissão no rádio: "desliguem os alarmes dos carros, eles seguem o barulho". |

O jogo já tem fragmentos de história espalhados pelos caminhos: o cartaz da vacina, o rádio da viatura 12, o diário de uma entregadora, o prontuário do paciente 0417, a gravação da Dra. Lívia, a placa do quartel, o panfleto da Operação Farol, a Rádio Resistência e o mapa rabiscado. Tudo que for escrito precisa combinar com eles.

## 5. Identidade visual das cenas (preservar sempre)

As cenas de história são contadas **como um filme: só legenda e som ambiente**. Não tem narrador nem voz falada.

A referência é a imagem `historia/referencia-visual.jpg`: pixel art escura e pictórica, com tons apagados, luzes pontuais e uma criatura enorme diante de pessoas pequenas.

**Imagem e luz**
- **Pixel art de verdade:** a cena é desenhada pequena, 320 × 200 pontos, e ampliada sem suavizar. Todos os pixels têm o mesmo tamanho; nunca misture pixel grande com pixel pequeno.
- **Escuro e apagado:** a noite é azul-marinho quase preta. A luz vem de pontos: o laranja do fogo e dos postes, o ciano do celular e das telas, o vermelho e azul das sirenes, o amarelo das janelas acesas.
- **Sombras e degradês pontilhados** (dithering em xadrez), nunca degradê liso.
- **Névoa nas coisas longe:** o que está mais longe fica mais escuro e mais azulado.

**A cidade**
- **A cidade sempre conta o caos:** fumaça subindo dos incêndios, a Torre de Rádio piscando no morro, o engarrafamento de quem tenta fugir, chuva quase sempre.
- **A comunidade tem cara de Brasil:** casas de tijolo e bloco sem reboco, algumas pintadas (rosa, verde-água, amarelo queimado), lajes, caixas d'água azuis, vergalhão aparecendo, antenas, fios emaranhados nos postes e escadarias.

**Composição e personagens**
- **Planos de cinema:** plano aberto, close no celular, por cima do ombro, close numa foto. A câmera chega perto quando a emoção pede.
- **Assinatura visual de cada personagem.** Sempre a mesma em todas as cenas:
  - **Kauã (entregador):** boné laranja, jaqueta azul-marinho com faixa refletiva cinza, calça escura, moto vermelha com o baú laranja do aplicativo.
  - **Vó Dita:** cabelo branco em coque, óculos, blusa roxa. Mora numa casa rosa com caixa d'água azul, no alto da escadaria.
  - **Policial:** farda azul-acinzentada, colete preto, quepe com distintivo amarelo, lanterna na mão.

**Texto e som**
- **Letras:** dentro da cena (celular, placas, letreiros), só a fonte de pixel 3×5 em maiúsculas. Legendas em fonte limpa, branca, com sombra. **Fala de personagem fica em itálico e começa com travessão** ("— Deixa na portaria."). A tela de morte usa fonte de máquina de escrever.
- **O celular do entregador é um personagem:** a tela do aplicativo (fictício: "RAPIDÃO ENTREGAS", na cor laranja) aparece em close, com bateria em 12% e notificações por cima da cena.
- **Som ambiente** em camadas:
  - chuva, o ronco grave da cidade ao longe, sirene distante com eco;
  - motor da moto, fogo crepitando, pássaros de madrugada no final;
  - pings do celular, interfone, freada e batida, batida de coração nos momentos de decisão.

## 6. O elenco da live

**Os nomes originais** (propostos e usados no protótipo da tela de escolha; o dono ainda pode trocar):

| # | Herói | Nome original | Quem está na história dele |
|---|---|---|---|
| 1 | Enfermeira | **Daiane**, 33 anos | Duda (a filha, 9 anos), seu Jorge (o vizinho) |
| 2 | Policial | **Sargento Edson**, 41 anos | Dona Zezé (a mãe) |
| 3 | Bombeira | **Tati** (Tatiane), 34 anos | Rafa (o parceiro) |
| 4 | Entregador | **Kauã**, 22 anos | Vó Dita (a avó) |
| 5 | Mecânico | **Seu Ademir**, 54 anos | Beto (o filho, da Rádio Resistência) |
| 6 | O rico (liberado depois) | **Augusto Valadares**, 61 anos | os 3 seguranças |


Todo mundo que está na live vira personagem da história.

- **O protagonista** recebe o nome de quem **mais doou**.
- **Os personagens secundários** recebem o nome dos próximos da lista, por **nível de interação**. Exemplos: a filha da enfermeira, a avó do entregador, a mãe do policial, o filho do mecânico, os seguranças do rico, os vizinhos.
- A ordem da interação, da maior para a menor:
  1. doou (mais moedas primeiro);
  2. compartilhou;
  3. seguiu;
  4. curtiu;
  5. comentou;
  6. só entrou na live.
- Se não houver doadores, vale quem interagiu mais no chat.
- **Se não tiver ninguém na live, valem os nomes originais** da história (Kauã, Vó Dita, Duda...).
- **Aparece só um nome por personagem:** o original ou o do espectador, nunca os dois.
- **Gênero:** o TikTok não informa o gênero de quem está na live, e adivinhar pelo nome ou pela foto erraria. Por isso, quem digitar **!ela** ou **!ele** no chat tem o personagem adaptado ao gênero que escolheu, e o jogo lembra a escolha dessa pessoa. Sem o comando, o personagem fica com o gênero original. *(Decidido; ainda não está no jogo.)*

## 7. Finais e mortes

- **A partida dura entre 3 e 17 minutos.**
- **Chegou no objetivo:** final feliz, com uma cena de filme única de cada personagem. A exceção é o entregador, cujo final é a entrega da foto e da insulina (seção 8).
- **Morreu:** a **tela de morte** escreve um resumo letra por letra, **como numa máquina de escrever**, com som de tecla e o sininho no fim da linha. O resumo diz:
  - quem ele era antes do apocalipse;
  - por que se arriscou;
  - por onde passou (ruas e lugares de verdade da partida);
  - quantos zumbis derrubou e quanta grana juntou;
  - o que o matou;
  - quanto faltava para chegar.

  O tom é triste: ele morreu sem conseguir.
- **O tom depende do tempo vivo:**
  - **Até 3 minutos:** chacota, com humor de quem escolheu muito mal ou deu muito azar.
  - **Depois de 3 minutos:** honroso, autêntico e trágico. Quanto mais longa a jornada, mais o texto honra o que ele passou.

## 8. O entregador: Kauã, 22 anos, "Moto 22" (APROVADO)

**Status:** história e arte aprovadas. A sequência completa está pronta como protótipo:
- página publicada: https://claude.ai/artifact/N8wFWWgx8TzzAfZtNv3DXS
- cópia no projeto: `historia/prototipos/moto22.html`

Ainda não está no jogo.

**Quem é:** 22 anos, moto financiada em 48 vezes (ainda faltam 41 parcelas), nota 4,8 no aplicativo. Sustenta a avó, a **Vó Dita**, que é diabética. Mora com ela no Morro do Farol. Sonha em fazer faculdade "quando sobrar tempo", e nunca sobra.

**Tema:** a precarização e a invisibilidade. "Ninguém vê quem entrega." O fim do mundo é a primeira vez que a escolha é dele.

### A sequência (capítulos)

| # | Capítulo | Quando acontece no jogo | O que mostra |
|---|---|---|---|
| 1 | **Abertura: A tarifa 5×** (3 cenas, ~40 s) | Começo de toda partida do entregador | (a) Plano aberto: a comunidade vendo a cidade queimar, na chuva, ele na moto com o rosto iluminado pelo celular. Raio e trovão. (b) Close no celular: "TARIFA DINÂMICA 5×", nova entrega de **insulina** para o condomínio Jardins do Mirante (R$ 87,50) e, por cima, a mensagem da Vó Dita: "Meu filho, acabou a insulina. Não precisa vir não. Se cuida. Te amo." (c) Por cima do ombro, a bifurcação: à esquerda, a rua desce para o centro em chamas; à direita, a escadaria sobe até a casa rosa com a avó na janela. |
| — | **Votação do chat** | Fim da abertura | **1 🏠 Subir até a Vó Dita** ou **2 📦 Aceitar as entregas (5×)** |
| 2 | **Caminho 1: A Vó primeiro** | Se votarem 1 | Ele cancela a corrida pela primeira vez na vida ("Você cancelou 1 entrega. Sua conta pode ser suspensa."). Larga a moto no pé do morro, com o baú aberto, e sobe a pé com a insulina na mão. Há zumbis na metade da escadaria. |
| 3 | **Caminho 1: Farmácia da Rua 9** | Encontro no meio do caminho | Farmácia saqueada. Uma mãe ajoelhada, com o filho diabético no colo, pede "só uma caixa". "Duas caixas. Uma avó. Um menino." **Votação:** 1 💊 Dar uma caixa / 2 🚶 Seguir. A escolha aparece depois na tela de morte. |
| 4 | **Caminho 2: Corrida aceita** | Se votarem 2 | A moto acelera rua abaixo, o farol ilumina os zumbis e ele atropela um atrás do outro: "+R$" subindo, a grana no canto da tela. "Pra quem tá de moto, zumbi é quebra-molas." |
| 5 | **Caminho 2: Jardins do Mirante** | Quando chega no destino da primeira entrega | Muro alto, cerca elétrica, torres todas acesas pelo gerador, portaria vazia. Pelo interfone: "— Deixa na portaria." / "— Não tem ninguém na portaria, senhor." / "— Então deixa no chão." No celular: entrega concluída, **3 estrelas, "DEMOROU."** |
| 6 | **Caminho 2: A poça** | Depois de um tempo bom de moto, no começo de um quarteirão | Tela preta, freada, batida, clarão. Depois a moto caída pegando fogo, as encomendas espalhadas, o celular trincado no chão, ele se levantando com a viseira quebrada e zumbis chegando do escuro. "A poça era de sangue." / "41 parcelas, pegando fogo." / "R$ 412 no bolso. Daqui pra frente, a pé." |
| 7 | **Final: O fim da linha** (3 cenas) | Quando ele chega no objetivo (os dois caminhos acabam aqui) | (a) Madrugada no pé do Morro do Farol. Kauã sentado contra o muro, com o braço mordido enrolado num pano. O **policial** chega com a lanterna. "A mordida, ele escondeu o caminho inteiro." / "— Ela mora lá em cima. Casa rosa, caixa d'água azul." / "— Entrega isso pra ela. Fala que eu cheguei." (b) **Close na polaroide** manchada de sangue: o aniversário de 70 anos da Vó Dita, os dois sorrindo na laje, varal colorido, bolo com "70". "Ele pagou o bolo em três vezes." (c) Ele desce de volta para a rua escura, mancando, "pra não virar perto dela". O policial olha a escadaria, e a casa rosa já tem luz. **Continua na história do Policial.** |

### A gameplay de cada caminho (decidido, falta implementar)

- **Caminho 1:** ele vai **a pé, sem arma nenhuma**, com um atributo único de classe: **muita esquiva e muita velocidade**. Sobrevive fugindo, não lutando. O destino no mapa é a casa da Vó Dita.
- **Caminho 2:**
  1. Começa uma **gameplay de moto**: ele segue de quarteirão em quarteirão **atropelando zumbis e ganhando dinheiro**, e o chat vota **reto, direita ou esquerda** em cada cruzamento. **Na moto ele não atira, não bate em ninguém e não recebe bônus (nem experiência, nem item): só atropela e segue.** A luta começa depois que ele cai. Cada entrega é um destino.
  2. Depois de um **tempo razoável**, no começo de um quarteirão, **ele cai** (capítulo 6).
  3. A partir daí vem a gameplay de sempre, a pé, **sem a mobilidade, mas com muita grana** para comprar armas e suprimentos do Barganha, o comerciante ambulante.
  4. A insulina, ele entregou no condomínio. Precisa conseguir outra (o Barganha tem, e cobra caro).

### O final: a foto e a insulina (decidido)

**O entregador não tem final feliz.** Ao chegar no objetivo, ele **entrega a foto dele com a avó e a insulina para outro herói**: o policial, porque os dois são do Morro do Farol. No **final do policial**, antes de concluir a própria história, ele sobe a escadaria, **encontra a Vó Dita em segurança** e entrega a insulina e a foto.

*Observação: o dono do projeto descreveu esse final ("ele entrega uma foto dela com ele e a insulina para outro herói"). Entendemos que é o final do entregador e que o outro herói é o policial. Confirme com ele se algo parecer diferente.*

### A tela de morte (exemplos aprovados)

- **Caminho 2, 23 minutos:** "Kauã tinha 22 anos, uma moto financiada em 48 vezes e nota 4,8 no aplicativo... Naquela noite, cada entrega valia cinco. Ele aceitou todas. Deixou a insulina na calçada do Jardins do Mirante e levou três estrelas. Atropelou 212 zumbis. Perdeu a moto numa poça de sangue... Caiu a seis quarteirões de casa, com R$ 412 no bolso. Não deu tempo de comprar outra insulina. O aplicativo ainda mandou uma última notificação: 'Como foi sua entrega?'"
- **Caminho 1, 14 minutos:** "Kauã tinha 22 anos e nunca tinha cancelado uma corrida. Na noite em que a cidade caiu, cancelou... Na farmácia da Rua 9, deu uma das duas caixas pra um menino que nunca tinha visto. Caiu na escadaria do Morro do Farol, a quarenta degraus da casa rosa... A conta dele no aplicativo foi suspensa às 23h52."
- **48 segundos (chacota):** "Aceitou a corrida de cinco vezes, acelerou com tudo e acertou em cheio o primeiro zumbi. Que era, na verdade, um poste. Nota no aplicativo: 1,0. O cliente pediu reembolso."

Os números, as ruas e a causa da morte vêm da partida de verdade.

## 9. Os outros personagens (próximos da fila)

### 🩺 A Enfermeira: "Quem cuida de quem cuida?" (IDEIA DO DONO, rascunho)
- **Quem é:** técnica de enfermagem e **mãe solo da Duda**, 9 anos. De dia, cuidadora de uma senhora rica; de noite, plantão no Hospital Central. Dorme quatro horas por noite. Deixa a filha sozinha com a regra: "não abre a porta pra ninguém".
- **O dia do caos:** exausta, ela dorme no plantão. Acorda com o caos. Uma **explosão** vem do subsolo (o laboratório da Dra. Lívia) e ela sai atordoada do hospital. No celular, a mensagem da filha: *"mãe, o seu Jorge tá batendo na porta, ele tá estranho"*. Depois, **um áudio dela gritando**. Depois, mais nada.
- **Objetivo:** chegar em casa, na vila do bairro residencial.
- **Dilemas:** ela foi treinada para cuidar, e cada ferido no caminho é a profissão dela pedindo para parar. Num deles, uma criança da idade da Duda.
- **A pergunta:** ela já se sacrifica um pedacinho todo dia. O apocalipse só cobra mais caro.
- **Final feliz (sugestão):** a porta arrombada, a casa vazia... e a Duda escondida no forro, viva, porque fez exatamente o que a mãe ensinou.
- **Elenco da live:** a enfermeira tem o nome de quem mais doou; a filha, dos próximos doadores, ou de alguém do chat.

### 👮 O Policial: "A lei protege quem?" (rascunho)
- **Quem é:** sargento com 18 anos de farda, nascido no **Morro do Farol**, que é o morro que ele patrulha. No morro o olham com desconfiança; no batalhão o chamam de "cria". A mãe, **Dona Zezé**, nunca quis sair de lá.
- **O dia do caos:** ele está na **viatura 12**. Chega a ordem: *"isolar o morro e proteger o Centro e os condomínios. Quem cruzar a barreira é tratado como infectado."*
- **Objetivo:** desertar e subir o morro para buscar a mãe.
- **Dilemas:** os bloqueios policiais do jogo agora são os colegas dele. Ele atira em alguém que "parecia infectado"?
- **Choque de realidade:** ele descobre o que é ser tratado como ameaça só pelo lugar de onde veio.
- **Final feliz:** a mãe organizou os vizinhos e protegeu o morro sozinha, sem farda e sem ordem. **Antes de concluir**, ele sobe a escadaria até a casa rosa, encontra a **Vó Dita em segurança** e entrega a insulina e a foto do Kauã (o fecho da história do entregador).

### 🧑‍🚒 A Bombeira: "Heroína é quem a cidade abandona primeiro" (rascunho)
- **Quem é:** 12 anos de corporação, a única mulher da equipe do **Quartel 3**, sempre tendo que provar o dobro. Caminhão velho, equipamento vencido. Chamam de heroína e não mandam verba.
- **O dia do caos:** num incêndio num condomínio de luxo, os moradores querem que ela salve primeiro os carros e o cachorro, enquanto o porteiro está preso no fogo. Depois o rádio avisa que o Quartel 3 caiu, e o parceiro dela, o **Rafa**, está preso lá dentro.
- **Objetivo:** voltar ao Quartel 3.
- **Dilema:** o Rafa foi mordido. "Se encontrar um de nós de pé, termine o serviço."
- **Choque de realidade:** pelo rádio, ela descobre a **lista da Operação Farol**.
- **A pergunta, ao contrário dos outros:** ela sempre pôs a vida dos outros na frente da dela. Quando ela pode escolher a si mesma?
- **Ela atravessa a história dos outros (decidido):** aparece como **aliada por alguns quarteirões** em histórias específicas e depois segue o próprio caminho, sem mudar o final de ninguém. A revelação da lista da Operação Farol pode ser contada por ela nessas histórias. Sugestão:
  - no **Policial**, no morro;
  - no **Mecânico**, na torre;
  - no **Valadares**, é ela quem conta da lista e se recusa a salvá-lo primeiro.

### 🔧 O Mecânico: "O homem que não pede ajuda" (rascunho)
- **Quem é:** 54 anos, oficina de bairro afundada em dívida, o cara que conserta tudo menos a própria família. Brigou com o filho, o **Beto**, que não quis herdar a oficina e foi trabalhar numa rádio comunitária. Não falam há dois anos. No grupo da rua, era quem dizia "cada um que se vire".
- **O dia do caos:** preso na oficina, ele liga o rádio de pilha e ouve: *"Aqui é o Beto, direto da torre..."* O filho está vivo, na Torre de Rádio.
- **Objetivo:** a Torre de Rádio, no alto do morro.
- **Dilemas:** sozinho, ele não chega. Vai ter que pedir ajuda, aceitar ajuda e confiar em estranhos.
- **Choque de realidade:** quem o salva no caminho são exatamente as pessoas que ele julgava.
- **Final feliz (sugestão):** ele conserta o gerador que mantém a rádio no ar. Pela primeira vez, pai e filho fazem algo juntos.

### 💼 O Rico: Augusto Valadares, 61 anos (personagem novo, rascunho; final aprovado)
- **Liberação (decidido):** só aparece na tela de escolha **depois que algum herói chegar a um final**.
- **O antagonista de todos (decidido):** ele é **o responsável pela crise**. Manipulou a vacina pelo lucro e, **sem querer**, transformou a população em zumbis. Nas histórias dos outros, ele é o vilão por trás de tudo; quando é jogado, é a vez de ver o mesmo homem por dentro.
- **Quem é:** maior acionista do Instituto Aurora. **Foi ele quem forçou a liberação do lote 7 antes dos testes**, pelo lucro.
- **Jogo:** começa com armas fortes (metralhadora e colete) e **3 seguranças armados** (aliados), pagos a cada quarteirão. Se a grana acabar, ou ele se recusar a pagar, eles vão embora: *"O senhor não paga o suficiente pra eu morrer pelo senhor."*
- **Objetivo:** o heliponto da Torre Valadares, onde a Operação Farol guarda um lugar para ele.
- **Choque de realidade:** os seguranças são da periferia, e cada um tem família lá fora. Sozinho, ele não sabe nem recarregar a arma.
- **Final (aprovado):** ele chega ao helicóptero e **entrega o lugar dele à filha do segurança que morreu por ele**. Pela primeira vez, não compra a saída. No rádio, ele confessa o que fez com a vacina.
- **Elenco da live:** os seguranças são espectadores da live.

## 10. Onde as histórias se cruzam

| Quem | Aparece na história de | Como |
|---|---|---|
| Kauã (entregador) | Policial | Entrega a foto e a insulina no pé do morro. O policial leva para a Vó Dita no próprio final. |
| Vó Dita | Policial | Está em segurança no morro, protegida pelos vizinhos que a Dona Zezé organizou. |
| Bombeira | Policial, Mecânico, Valadares | Aliada por alguns quarteirões; conta da lista da Operação Farol. |
| Beto (Rádio Resistência) | Todos (fragmentos de rádio) e Mecânico | A voz no rádio; o objetivo do mecânico. |
| Dra. Lívia / Instituto Aurora | Enfermeira (a explosão), Valadares (a culpa) | O mistério da vacina. |
| **Valadares (antagonista)** | **Todos** | Sugestões, a aprovar: na enfermeira, o Hospital Central recebeu ordem dele para esconder os casos; no policial, a ordem de isolar o morro protege os condomínios dele; na bombeira, a lista da Operação Farol tem o nome dele no topo; no entregador, o Jardins do Mirante é dele (o cliente do 1204 é ele, ou alguém da família); no mecânico, a Rádio Resistência é quem denuncia a culpa dele. |

## 11. O que falta (próximos passos)

0. **Tela de escolha do herói:** aprovada e no jogo (versão 2.3.0), junto com o prólogo do entregador e os dois caminhos.
0. **Acertar um detalhe com os fragmentos que já existem no jogo:** o fragmento "Diário de uma entregadora" é assinado "— Jéssica, moto 22", e o nosso entregador é o Kauã, "Moto 22". Sugestão: trocar a assinatura para "— Kauã, moto 22", ou fazer da Jéssica uma colega dele de aplicativo.

1. **Enfermeira, policial, bombeira, mecânico e Valadares:** fazer o roteiro detalhado e a sequência de cenas de cada um, no mesmo estilo do entregador, um por vez e sempre com aprovação antes. Começar pela abertura e pela escolha de cada um.
2. **Levar a história para o jogo**, quando aprovado:
   - as cenas de filme (abertura, capítulos, finais);
   - a tela de morte em máquina de escrever, com os dados reais da partida;
   - o elenco da live (nomes por interação) e o comando **!ela** / **!ele**;
   - a gameplay de moto do caminho 2 do entregador e o "sem arma, muita esquiva" do caminho 1.
3. **Conversar sobre o portal** (portal dos 500) dentro da história.
