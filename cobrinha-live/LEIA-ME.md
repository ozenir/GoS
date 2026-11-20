# Cobrinha do Jardim: passo a passo para ligar na sua live

A cobrinha joga sozinha no jardim. Cada presente que o público manda na sua live vira fruta caindo do céu. Encostou na cerca ou no próprio corpo, acabou a partida, e uma nova começa sozinha.

São duas peças que trabalham juntas:

- **O programa** (`servidor.js`) fica numa janela preta aberta durante a live. Ele lê os presentes da sua live e manda para o jogo.
- **O jogo** abre no navegador. É ele que você captura e mostra na live.

---

## O que você precisa

1. **Um computador com Windows.** No Mac também funciona, veja o final.
2. **Conta do TikTok que pode fazer LIVE e receber presentes.** O TikTok exige 18 anos ou mais e um mínimo de seguidores.
3. **TikTok LIVE Studio** (programa oficial do TikTok para fazer live pelo computador) **ou OBS Studio**.
4. **Node.js**, que é gratuito. Ele está explicado no passo 1.

---

## Passo 1: instalar o Node.js (só uma vez)

1. Entre em **https://nodejs.org**.
2. Baixe a versão marcada como **LTS**.
3. Instale clicando em "Próximo" até o fim, sem mudar nada.

## Passo 2: colocar a pasta no computador

Coloque a pasta `cobrinha-live` num lugar fácil, por exemplo na Área de Trabalho. Se ela veio em `.zip`, clique com o botão direito e escolha **Extrair tudo**.

## Passo 3: colocar o seu usuário

1. Abra o arquivo **`config.json`** com o Bloco de Notas (botão direito > Abrir com > Bloco de Notas).
2. Troque `seu_usuario_aqui` pelo seu usuário do TikTok, **sem o @**. Exemplo: se o seu perfil é `tiktok.com/@maria.jogos`, fica assim:

   ```json
   "usuario": "maria.jogos",
   ```

3. Salve e feche. Cuidado para não apagar as aspas nem as vírgulas.

## Passo 4: testar sem estar ao vivo

1. Dê dois cliques em **`1-testar-sem-live.bat`**.
   - Na primeira vez ele instala o que precisa, o que leva uns minutos. Se o Windows perguntar se pode executar, clique em **Mais informações > Executar assim mesmo**.
2. O jogo abre no navegador. Embaixo dele deve aparecer a bolinha verde com **"Modo teste: presentes de mentira"**.
3. Os presentes de mentira começam a chegar sozinhos, e você também pode clicar nos botões 🌹 🍩 🦁.
4. Deu certo? Feche a janela preta para desligar.

## Passo 5: no dia da live

Faça nesta ordem:

1. Dê dois cliques em **`2-iniciar-na-live.bat`**. Deixe essa janela preta aberta durante a live toda.
2. Dê dois cliques em **`3-abrir-janela-do-jogo.bat`**. Abre uma janela em pé, só com o jogo, sem botões.
3. Abra o **TikTok LIVE Studio**:
   1. Deixe a tela no modo **retrato** (em pé).
   2. Adicione uma fonte do tipo **Captura de janela** e escolha a janela **Cobrinha do Jardim**.
   3. Estique a captura para ocupar a tela toda. Se quiser, coloque sua câmera num cantinho por cima.
4. Clique em **Entrar ao vivo**.
5. Olhe a janela preta. Em até 1 minuto deve aparecer:

   ```
   ✅ Ligado na live de @seu_usuario. Os presentes já viram frutas!
   ```

   A partir daí, cada presente aparece listado nessa janela e as frutas caem no jogo.

> Se você abrir o programa antes de entrar ao vivo, ele mostra "ainda não está ao vivo" e confere sozinho a cada 30 segundos. Não precisa fazer nada.

### Primeiro teste de verdade

Na primeira live, peça para um amigo mandar **uma Rosa** e confira duas coisas:

- Na janela preta apareceu `🎁 nome mandou 1x Rose ... → 1 fruta`.
- No jogo caiu **uma** maçã e apareceu o aviso com o nome dele.

Se isso funcionar, está tudo certo.

### Usando OBS em vez do LIVE Studio

No OBS, adicione uma fonte **Navegador** com:

- URL: `http://localhost:8080/#live`
- Largura `1080` e altura `1920`

Para transmitir pelo OBS, o TikTok precisa liberar a **chave de transmissão** para a sua conta. Nem todas as contas têm.

---

## Como a cobra joga (estratégia perfeita)

A cobra joga sozinha com uma estratégia que **sempre consegue a pontuação máxima** em qualquer mapa:

- A cada partida o jogo sorteia um **circuito que passa por todas as casas livres do campo** e volta ao começo.
- Seguindo esse circuito, a cobra **nunca se tranca**: o rabo está sempre "à frente" dela no caminho.
- Enquanto é pequena, ela **corta caminho** até as frutas (sem nunca passar do próprio rabo). Quando passa de 60% do campo, segue o circuito à risca, enchendo o campo em zigue-zague.
- A partida **sempre termina**: quando ela ocupa o campo inteiro aparece **"Campo completo! 🏆 Pontuação máxima!"** e começa o próximo cenário.

Ela foi **treinada** em milhares de partidas simuladas (5 mapas, muita fruta, pouca fruta e chuva de presentes). Com os ajustes escolhidos, encheu o campo em **100% das partidas**. A IA antiga, nos mesmos testes, não encheu nenhuma.

A duração da partida depende de quanta fruta cai: ela come praticamente tudo o que aparece, então **mais presentes = partida mais rápida**. Só com a maçã automática (uma a cada 5 segundos), encher o campo leva uns 20 minutos.

Se uma fruta cair em cima do corpo da cobra, ela aparece **4 casas à frente da cabeça**, no caminho que a cobra vai fazer, e é comida em poucos passos (sem a cobra precisar dar uma volta inteira). Se essa casa já tiver fruta, vai para a seguinte. Com o campo quase cheio, ela pode aparecer por um instante sobre a pontinha do rabo, que sai dali antes da cabeça chegar.

Os obstáculos dos cenários ficam em blocos de 2x2 casas: é isso que garante que o circuito passa por todas as casas livres em todos os mapas.

## O que aparece na tela

- **Em cima:** tamanho 🐍, pontos 🍎 e recorde 🏆, o cenário e os efeitos ativos. Logo abaixo, os **avisos de quem mandou presente**, com a **foto de perfil** da pessoa.
- **Embaixo:** o **pódio** com as fotos de quem mais mandou moedas na live (até 5). O 1º fica no meio, maior, com coroa 👑 e anel dourado; 2º prata; 3º bronze. Embaixo de cada foto, o nome e as moedas.
- **Cada fruta de presente tem a mini foto de quem mandou.** Quando a cobra come essa fruta, a fotinho sobe do lugar e a foto da pessoa **dá um pulinho** no pódio. Quando alguém assume o 1º lugar, a coroa pula.
- **No fim de cada rodada**, o relatório mostra dois destaques com foto: **👑 quem mais enviou presentes** na rodada (com as moedas) e **🍎 quem mandou a última fruta comida** antes da partida acabar. Se a última fruta foi uma maçã automática (sem dono), aparece quem mandou a última fruta de presente comida antes dela.
- A foto vem do perfil do TikTok de quem mandou. Se não tiver foto (ou ela não carregar), aparece um círculo colorido com a inicial do nome.

## Cenários e itens especiais

A cada partida o campo muda de cenário (a primeira é sempre o Jardim). Os obstáculos mudam de lugar toda vez, mas nunca fecham um pedaço do campo. Encostar neles é fim de jogo, igual à borda.

| Cenário | O que tem |
|---|---|
| 🌷 Jardim | grama e cerca viva, sem obstáculos |
| 🦆 Lago | um lago no meio do jardim |
| 🌋 Vulcão | poças de lava e fagulhas subindo |
| ❄️ Gelo | blocos de gelo e neve caindo |
| ⛰️ Montanhas | pedras pelo campo e névoa |

De tempos em tempos aparece um **item especial** (ele pisca e some depois de 18 segundos, ajustável em `item_no_chao_segundos`). A chuva do Leão também solta 2 itens.

| Item | Efeito |
|---|---|
| 🍇 Uva gigante | cresce 3 de uma vez (vale 3 pontos) |
| 🌶️ Pimenta | fica rápida por 8 segundos (ajustável em `pimenta_segundos`) |
| ❄️ Floco | fica lenta por 8 segundos (ajustável em `floco_segundos`) |
| 💎 Cristal | fica arco-íris por um instante e muda de cor (ajustável em `cristal_arco_iris_segundos`) |
| 🍄 Cogumelo | aparece sorteado com a cobra a partir do tamanho 200 (ajustável em `cogumelo_a_partir_do_tamanho`); **a partir do tamanho 230, cada item tem 33% de chance de ser o cogumelo** e **cai garantido ao chegar a 250 pontos e depois a cada 1 min 30 s**, com ou sem doações; por 10 segundos (ajustável em `cogumelo_segundos`), cada maçã comida diminui 1 de tamanho em vez de crescer (os pontos contam normal) |

## Som

O jogo gera a própria música e os efeitos na hora (nada de arquivos de áudio e nada de música de terceiros, então não tem problema de direitos autorais na live).

| Momento | Som |
|---|---|
| 🌷 Jardim | tema alegre com marimba e passarinhos |
| 🦆 Lago | tema calmo com sinos suaves e gotas d'água |
| 🌋 Vulcão | tema épico com tambores graves |
| ❄️ Gelo | tema cristalino com sinos e vento |
| ⛰️ Montanhas | tema "folk" com flauta e vento |
| 🍎 Maçã | mordida de verdade (gravação de uma maçã sendo mordida), com uma notinha que sobe a cada maçã seguida |
| 🌶️ Pimenta | arrancada; enquanto durar, a música acelera |
| ❄️ Floco | sinos de "congelar"; enquanto durar, a música fica lenta e abafada |
| 🐍 Tamanho 200+ | a música vira uma versão **tensa** do cenário: tom menor, baixo pulsando, coração batendo e subidas de suspense. Volta ao normal se a cobra ficar menor |
| 🍇 🍄 💎 | cada um tem seu som; o cogumelo ainda deixa um baixo engraçado tocando enquanto dura |

A melodia é composta na hora, dentro da harmonia de cada cenário, e muda a cada poucos compassos.

**Para o som chegar na live:**
- **OBS:** na fonte Navegador, marque **"Controlar áudio pelo OBS"**. O som aparece no mixer do OBS e você ajusta o volume ali.
- **TikTok LIVE Studio:** a captura de janela pega só a imagem. Deixe ligado o som do computador (áudio do sistema) no LIVE Studio para a música ir junto.
- Abrindo pelo atalho `3-abrir-janela-do-jogo.bat` o som começa sozinho. Num navegador comum, clique uma vez na página para liberar o som (é uma regra dos navegadores).

## Como os presentes viram frutas

| Presente | O que acontece |
|---|---|
| 🌹 Rosa (1 moeda) | 1 maçã |
| 🍩 Rosquinha (30 moedas) | 5 frutas |
| 🦁 Leão (29.999 moedas) | chuva de 22 frutas, com maçãs douradas |
| Outros presentes | pelo valor em moedas: 1 moeda = 1 fruta, 5 = 2, 10 = 3, 30 = 5, 100 = 10, 500 ou mais = chuva |

- **Combo** (a pessoa segura e manda 10 rosas seguidas) vira 10 maçãs e um aviso só, que vai somando: "10x Rosa".
- Presentes muito grandes não lotam o jardim: as frutas entram numa fila e vão caindo aos poucos.
- Presente que chega durante a tela de "Fim de jogo" não se perde: as frutas caem na partida seguinte.
- O **Top presentes** soma as moedas de cada pessoa durante a live. O 🏆 guarda o maior tamanho que a cobra já chegou.

## Ajustes no `config.json`

| Campo | Para que serve |
|---|---|
| `usuario` | seu @ do TikTok, sem o @ |
| `segundos_por_casa` | velocidade da cobra. Menor é mais rápida (0.12 = rápida, 0.2 = calma) |
| `estrategia` | `"perfeita"` (padrão, sempre enche o campo) ou `"classica"` (a IA antiga; as opções de modo seguro, preenchimento, espaço máximo, organizar e fome valem só nela) |
| `cortar_caminho_ate` | até que fração do campo a cobra corta caminho até as frutas (0 a 1). Treinado: 0.6. Acima de 0.8 ela começa a se trancar |
| `folga_ao_cortar` | quantas casas de folga ela deixa entre a cabeça e o rabo ao cortar caminho. Padrão: 6 |
| `modo_seguro_a_partir_de` | pontos (🍎) a partir dos quais a cobra para de arriscar e prioriza não morrer. Padrão: 200 |
| `otimizar_preenchimento_a_partir_de` | pontos a partir dos quais ela também ocupa o jardim de forma compacta, sem deixar buracos (e já não arrisca). Padrão: 160 |
| `organizar_a_partir_do_tamanho` | a partir desse **tamanho** a cobra se organiza antes de comer: fica longe do rabo e espalha o corpo pelo campo; frutas e itens ficam em segundo plano. Padrão: 190 |
| `frutas_no_chao_organizando` | enquanto ela se organiza, no máximo essas frutas ficam no chão ao mesmo tempo; as outras esperam na fila e caem conforme ela come (nada se perde). Padrão: 6 |
| `fome_segundos` | se a cobra passar esse tempo sem comer fruta, ela vai atrás de uma (por um caminho seguro se existir; se não, arriscando). Garante que ela sempre volta a crescer e que a partida termina. `0` desliga. Padrão: 15 |
| `espaco_maximo_a_partir_de` | pontos a partir dos quais ela ocupa o máximo do campo, mantendo a cabeça o mais longe possível do rabo. Padrão: 190 |
| `maca_automatica_a_cada_segundos` | cai uma maçã sozinha a cada X segundos, para a cobra crescer mesmo sem presentes. `0` desliga. Padrão: 5 |
| `item_no_chao_segundos` | quanto tempo um item especial fica no chão antes de sumir. Padrão: 18 |
| `pimenta_segundos` | quanto tempo a cobra fica rápida com a 🌶️ pimenta. Padrão: 8 |
| `pimenta_velocidade` | quantas vezes mais rápida a cobra fica com a 🌶️ pimenta (de 1 a 4; ex.: 2 = o dobro da velocidade). Padrão: 1.7 |
| `floco_segundos` | quanto tempo a cobra fica lenta com o ❄️ floco. Padrão: 8 |
| `cogumelo_segundos` | quanto tempo dura o efeito do 🍄 cogumelo (cada maçã diminui 1 de tamanho). Padrão: 10 |
| `cogumelo_no_chao_segundos` | o 🍄 cogumelo some se não for comido em tantos segundos depois de cair (pisca antes de sumir). Os outros itens usam `item_no_chao_segundos`. Padrão: 5 |
| `cogumelo_a_partir_do_tamanho` | o 🍄 cogumelo só começa a aparecer quando a cobra tem pelo menos esse tamanho. `0` = desde o começo. Padrão: 200 |
| `cogumelo_chance_a_partir_do_tamanho` | a partir desse tamanho, cada item especial que cai tem a chance de `cogumelo_chance` de ser o 🍄 cogumelo. Padrão: 230 |
| `cogumelo_chance` | chance do cogumelo (de 0 a 1) quando a cobra passa do tamanho acima. Padrão: 0.33 (33%) |
| `cogumelo_garantido_a_partir_dos_pontos` | ao chegar nesses **pontos** cai um 🍄 cogumelo na hora, com ou sem doações. Padrão: 250 |
| `cogumelo_garantido_a_cada_segundos` | depois disso, cai mais um cogumelo a cada esses segundos até o fim da partida. `0` desliga. Padrão: 90 (1 min 30 s) |
| `cristal_arco_iris_segundos` | quanto tempo a cobra fica arco-íris com o 💎 cristal antes de ficar com a cor nova. Padrão: 1.6 |
| `itens_a_cada_segundos` | de quanto em quanto tempo (em média) aparece um item especial. `0` desliga os itens. Padrão: 15 |
| `cenarios` | quais cenários entram no rodízio: `jardim`, `lago`, `vulcao`, `gelo`, `montanhas`. Para jogar só no jardim: `["jardim"]` |
| `por_nome` | regra para um presente específico, usando o nome em inglês que aparece na janela preta. Ex.: `"Rose": { "frutas": 1 }` |
| `por_moedas` | regra para todos os outros presentes, pelo valor em moedas. `"chuva": true` mistura maçãs douradas |
| `maximo_frutas_por_envio` | limite de frutas de um único envio |
| `curtidas_por_fruta` | `0` desliga. Com `200`, a cada 200 curtidas na live cai 1 maçã |
| `chave_euler` | deixe vazio. Veja "Problemas comuns" |
| `som` → `ligado` | liga ou desliga todo o som (`true` / `false`) |
| `som` → `volume_musica` | volume da música, de 0 a 1. Padrão: 0.45 |
| `som` → `volume_efeitos` | volume dos efeitos (mordida, itens...), de 0 a 1. Padrão: 0.8 |
| `som` → `musica_tensa_a_partir_do_tamanho` | a partir desse tamanho a música do cenário fica tensa (tom menor, coração batendo, suspense). Padrão: 200 |
| `porta` | só mude se aparecer o erro de porta em uso |

Depois de mudar o `config.json`, feche a janela preta e abra de novo.

---

## Problemas comuns

**"ainda não está ao vivo" e eu já estou ao vivo**
Espere até 1 minuto. Se continuar, confira se o usuário no `config.json` está escrito igual ao do seu perfil.

**"Não consegui conectar" várias vezes, ou erro falando de limite / rate limit**
Para entrar na live, o programa usa um serviço gratuito chamado Euler Stream. Ele tem um limite de uso para quem não tem conta. Para aumentar o limite, sem pagar:

1. Crie uma conta grátis em **https://www.eulerstream.com**.
2. Copie a sua **API key**.
3. Cole no `config.json`, em `"chave_euler": "cole-aqui"`.

**O jogo congela quando a janela fica atrás de outra**
Abra o jogo sempre pelo `3-abrir-janela-do-jogo.bat`. Ele já abre o navegador com a opção que impede o congelamento.

**"A porta 8080 já está em uso"**
O programa já está aberto em outra janela preta. Feche as duas e abra só uma.

**Os presentes pararam de chegar depois de uma atualização do TikTok**
A ligação com o TikTok não é oficial, e às vezes o TikTok muda coisas. Atualize a peça de ligação: abra o Prompt de Comando dentro da pasta e rode:

```
npm install tiktok-live-connector@latest
```

**Quero começar a partida do zero**
Na janela de teste (http://localhost:8080), clique em **↻ Próximo cenário**. O botão **✨ Item** (ou a tecla 4) solta um item especial para testar.

---

## No Mac

Use o arquivo `iniciar-mac.command`. Para o modo teste, abra o Terminal na pasta e rode `./iniciar-mac.command --demo`. Depois abra `http://localhost:8080/#live` no navegador ou coloque no OBS como fonte Navegador. O TikTok LIVE Studio não tem versão para Mac, então use o OBS.

## Créditos

- **Som da mordida da maçã:** "Apple Crunched 2", de **Joseph SARDIN**, [BigSoundBank.com](https://bigsoundbank.com/apple-crunched-2-s1114.html). Licença **CC0 (domínio público)**: pode usar até comercialmente, sem pedir permissão. O crédito não é obrigatório, mas fica aqui por respeito ao autor. O trecho usado foi recortado e suavizado e está em `public/sons/mordida-maca.mp3`.
- **Música e demais efeitos:** gerados pelo próprio jogo.

## Aviso

A leitura dos presentes usa a biblioteca não oficial **TikTok-Live-Connector**. Ela é muito usada por streamers, mas não é do TikTok e pode parar de funcionar se o TikTok mudar algo. O jogo só **lê** os presentes da live: não entra na sua conta e não precisa da sua senha.
