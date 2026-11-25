/**
 * Aula de exemplo (escrita à mão, sem IA): pêndulo simples.
 * Serve como demonstração do motor visual e como referência de estilo.
 */
import type { LessonContent } from "@qi/shared";

export const PENDULUM_LESSON: LessonContent = {
  plan: {
    title: "Pêndulo simples e o movimento harmônico",
    subject: "Física",
    topic: "Pêndulo simples — dedução da equação do MHS e do período",
    subtopics: ["Decomposição de forças", "Segunda lei de Newton", "Relação arco–ângulo", "Aproximação de pequenos ângulos", "Movimento harmônico simples"],
    level: "Ensino Médio / Pré-vestibular",
    learningObjective: "Deduzir, a partir das leis de Newton, que o pêndulo simples executa MHS para pequenas oscilações e obter seu período.",
    prerequisites: ["Decomposição de vetores", "Segunda lei de Newton", "Ângulos em radianos", "Noção de derivada como taxa de variação"],
    finalAnswer: "Para pequenas oscilações, θ'' + (g/ℓ)θ = 0, um MHS com ω = √(g/ℓ) e período T₀ = 2π√(ℓ/g).",
    estimatedMinutes: 20,
  },
  steps: [
    {
      id: "s1",
      kind: "introduction",
      title: "Apresentando o pêndulo",
      goal: "Entender o sistema físico e as grandezas que vamos usar.",
      newPage: false,
      board: [
        { id: "s1-title", type: "text", variant: "title", content: "Pêndulo simples", ink: "ink", align: "left" },
        {
          id: "s1-row",
          type: "row",
          columns: [
            {
              weight: 1.2,
              elements: [
                {
                  id: "s1-txt",
                  type: "list",
                  style: "bullet",
                  ink: "ink",
                  items: ["massa $m$ presa a um fio", "fio de comprimento $\\ell$, sem massa e inextensível", "$\\theta$: ângulo com a vertical", "sem atrito com o ar"],
                },
              ],
            },
            {
              weight: 1,
              elements: [
                {
                  id: "s1-fig",
                  type: "diagram",
                  caption: "",
                  xRange: [-2.6, 3.0],
                  yRange: [-4.3, 0.7],
                  width: "lg",
                  shapes: [
                    { kind: "support", from: [-1.6, 0], to: [1.6, 0], ink: "ink", side: "above" },
                    { kind: "segment", from: [0, 0], to: [0, -3.9], ink: "gray", dashed: true, arrow: "none", label: "", weight: "thin" },
                    { kind: "segment", from: [0, 0], to: [1.75, -3.03], ink: "ink", dashed: false, arrow: "none", label: "", weight: "normal" },
                    { kind: "angle", vertex: [0, 0], from: [0, -1], to: [1.75, -3.03], radius: 1.0, label: "$\\theta$", ink: "ink", arrow: true, right: false },
                    { kind: "body", shape: "ball", at: [1.75, -3.03], size: 0.32, ink: "blue", label: "$m$" },
                    { kind: "arc", center: [0, 0], radius: 2.4, startDeg: -68, endDeg: -42, ink: "ink", dashed: false, arrow: "end", label: "$+$" },
                  ],
                },
              ],
            },
          ],
        },
      ],
      script: [
        {
          text: "Hoje vamos estudar um dos sistemas mais clássicos da Física: o pêndulo simples. Vou escrever o nome no quadro e, ao lado, fazer um desenho bem simples dele.",
          elements: ["s1-title"],
        },
        {
          text: "O modelo tem algumas hipóteses importantes: uma massa $m$ pendurada num fio de comprimento $\\ell$. Esse fio é ideal — não tem massa e não estica. E vamos desprezar a resistência do ar.",
          elements: ["s1-txt"],
        },
        {
          text: "No desenho, o fio está preso no teto, e a linha tracejada é a vertical, que é a posição de equilíbrio. O ângulo $\\theta$ mede o quanto o pêndulo se afastou da vertical. Repare na setinha com o sinal de mais: ela define o sentido positivo de $\\theta$. Isso vai ser importante para entender um sinal de menos daqui a pouco.",
          elements: ["s1-fig"],
        },
      ],
      teacherNotes: "Reforce que o sentido positivo é uma escolha. Ela é que dá sentido ao sinal negativo da força restauradora.",
      studentQuestions: [
        { question: "Por que o fio precisa ser inextensível?", answer: "Porque assim a massa anda sempre sobre um arco de circunferência de raio ℓ, e podemos usar x = ℓθ." },
      ],
    },
    {
      id: "s2",
      kind: "concepts",
      title: "As forças sobre a massa",
      goal: "Identificar e decompor as forças que agem na massa.",
      newPage: false,
      board: [
        { id: "s2-sub", type: "text", variant: "subtitle", content: "Forças na massa", ink: "ink", align: "left" },
        {
          id: "s2-row",
          type: "row",
          columns: [
            {
              weight: 1,
              elements: [
                {
                  id: "s2-fig",
                  type: "diagram",
                  caption: "",
                  xRange: [-2.9, 2.9],
                  yRange: [-2.9, 2.0],
                  width: "lg",
                  shapes: [
                    { kind: "vector", from: [0, 0], to: [-0.85, 1.47], ink: "orange", label: "$T$" },
                    { kind: "vector", from: [0, 0], to: [0, -2.2], ink: "red", label: "$mg$" },
                    { kind: "vector", from: [0, 0], to: [0.95, -1.65], ink: "red", label: "$mg\\cos\\theta$" },
                    { kind: "vector", from: [0, 0], to: [-0.95, -0.55], ink: "red", label: "$mg\\sin\\theta$" },
                    { kind: "angle", vertex: [0, 0], from: [0, -1], to: [0.5, -0.866], radius: 0.8, label: "$\\theta$", ink: "ink", arrow: true, right: false },
                    { kind: "body", shape: "ball", at: [0, 0], size: 0.26, ink: "blue", label: "" },
                    { kind: "label", at: [0.45, 0.45], text: "$(m)$", ink: "blue", size: "md", anchor: "left" },
                  ],
                },
              ],
            },
            {
              weight: 1,
              elements: [
                {
                  id: "s2-list",
                  type: "list",
                  style: "arrow",
                  ink: "ink",
                  items: ["$T$: tração do fio (aponta para o ponto de suspensão)", "$mg$: peso (vertical, para baixo)", "decompomos o peso: ao longo do fio e na direção do movimento"],
                },
                {
                  id: "s2-eq",
                  type: "equation",
                  latex: "T - mg\\cos\\theta = m\\dfrac{v^2}{\\ell}",
                  ink: "ink",
                  size: "md",
                  align: "left",
                  label: "",
                  marks: [],
                },
                {
                  id: "s2-eq2",
                  type: "equation",
                  latex: "\\text{nos extremos } (v=0):\\; T = mg\\cos\\theta",
                  ink: "ink",
                  size: "md",
                  align: "left",
                  label: "",
                  marks: [],
                },
              ],
            },
          ],
        },
      ],
      script: [
        {
          text: "Agora vamos olhar só para a massa e perguntar: quais forças agem nela? São apenas duas.",
          elements: ["s2-sub"],
        },
        {
          text: "A tração $T$, em laranja, puxa a massa ao longo do fio, em direção ao ponto de suspensão. E o peso $mg$, em vermelho, aponta sempre para baixo. O truque é decompor o peso em duas direções que combinam com o movimento: uma ao longo do fio, que vale $mg\\cos\\theta$, e outra perpendicular ao fio, tangente à trajetória, que vale $mg\\sin\\theta$. O ângulo entre o peso e o fio é o mesmo $\\theta$ — são ângulos de lados perpendiculares.",
          elements: ["s2-fig"],
        },
        {
          text: "Vou resumir isso aqui ao lado, para não perdermos o fio da meada.",
          elements: ["s2-list"],
        },
        {
          text: "Na direção do fio, a massa faz uma curva, então a resultante é a força centrípeta: $T - mg\\cos\\theta = m v^2/\\ell$. Nos pontos extremos a velocidade é zero, e aí sobra $T = mg\\cos\\theta$. Para oscilações pequenas, $v$ é sempre pequeno, então essa é uma boa aproximação o tempo todo.",
          elements: ["s2-eq", "s2-eq2"],
        },
      ],
      teacherNotes: "Muitos livros escrevem diretamente T = mg cos θ. Vale mostrar que isso é exato apenas nos extremos; a direção que importa para o movimento é a tangencial.",
      studentQuestions: [
        { question: "Por que o ângulo entre o peso e o fio é θ?", answer: "O fio faz θ com a vertical, e o peso é vertical. Então o ângulo entre o peso e a direção do fio é o mesmo θ." },
      ],
    },
    {
      id: "s3",
      kind: "development",
      title: "Segunda lei de Newton na direção do movimento",
      goal: "Escrever a equação do movimento na direção tangencial e entender o sinal negativo.",
      newPage: false,
      board: [
        {
          id: "s3-eq",
          type: "equation",
          latex: "\\sum F_t = \\qimark{neg}{-}\\,mg\\sin\\theta = m\\,a",
          ink: "ink",
          size: "lg",
          align: "left",
          label: "(1)",
          marks: [{ id: "neg", shape: "circle", ink: "red", note: "este sinal de menos indica que a força aponta no sentido oposto ao de θ crescente" }],
        },
      ],
      script: [
        {
          text: "Quem faz a massa acelerar ao longo da trajetória é só a componente tangencial do peso, $mg\\sin\\theta$. A tração não ajuda nem atrapalha nessa direção, porque é perpendicular ao movimento. Aplicando a segunda lei de Newton nessa direção: a soma das forças tangenciais é igual a massa vezes a aceleração.",
          elements: ["s3-eq"],
        },
        {
          text: "Agora, atenção ao sinal de menos que eu circulei. Se o pêndulo está deslocado para o lado positivo, $\\theta > 0$, a força puxa de volta, no sentido negativo. Se $\\theta < 0$, ela puxa para o lado positivo. Ela sempre tenta trazer a massa de volta ao equilíbrio. Por isso chamamos essa força de restauradora.",
          elements: [],
        },
      ],
      teacherNotes: "O sinal negativo é o coração da oscilação. Pergunte ao aluno o que aconteceria se o sinal fosse positivo (o pêndulo se afastaria cada vez mais).",
      studentQuestions: [],
    },
    {
      id: "s4",
      kind: "development",
      title: "Do arco ao ângulo",
      goal: "Relacionar a aceleração linear com a variação do ângulo.",
      newPage: false,
      board: [
        {
          id: "s4-row",
          type: "row",
          columns: [
            {
              weight: 1,
              elements: [
                {
                  id: "s4-fig",
                  type: "diagram",
                  caption: "",
                  xRange: [-1.5, 3.2],
                  yRange: [-4.1, 0.6],
                  width: "lg",
                  shapes: [
                    { kind: "support", from: [-1.0, 0], to: [1.2, 0], ink: "ink", side: "above" },
                    { kind: "segment", from: [0, 0], to: [0, -3.6], ink: "gray", dashed: true, arrow: "none", label: "", weight: "thin" },
                    { kind: "segment", from: [0, 0], to: [1.5, -2.6], ink: "ink", dashed: false, arrow: "none", label: "", weight: "normal" },
                    { kind: "segment", from: [0.3, 0.05], to: [1.8, -2.55], ink: "red", dashed: false, arrow: "both", label: "$\\ell$", weight: "thin" },
                    { kind: "angle", vertex: [0, 0], from: [0, -1], to: [1.5, -2.6], radius: 0.8, label: "$\\theta$", ink: "ink", arrow: true, right: false },
                    { kind: "body", shape: "ball", at: [1.5, -2.6], size: 0.3, ink: "blue", label: "" },
                    { kind: "arc", center: [0, 0], radius: 3.45, startDeg: -91, endDeg: -61, ink: "red", dashed: false, arrow: "both", label: "$x$" },
                  ],
                },
              ],
            },
            {
              weight: 1,
              elements: [
                {
                  id: "s4-der",
                  type: "derivation",
                  layout: "vertical",
                  size: "lg",
                  lines: [
                    { latex: "x = \\ell\\,\\theta", ink: "ink", connector: "none", annotation: "comprimento do arco ($\\theta$ em radianos)" },
                    { latex: "v = \\ell\\,\\dfrac{d\\theta}{dt}", ink: "ink", connector: "implies", annotation: "derivando no tempo; $\\ell$ é constante" },
                    { latex: "a = \\ell\\,\\dfrac{d^2\\theta}{dt^2}", ink: "ink", connector: "implies", annotation: "derivando mais uma vez" },
                  ],
                },
              ],
            },
          ],
        },
      ],
      script: [
        {
          text: "A equação (1) mistura duas coisas: a aceleração $a$, que é linear, e o ângulo $\\theta$. Precisamos escrever tudo em termos de uma só variável. Para isso, olhe a distância $x$ percorrida pela massa ao longo do arco.",
          elements: ["s4-fig"],
        },
        {
          text: "Da geometria da circunferência: comprimento do arco é igual ao raio vezes o ângulo, desde que o ângulo esteja em radianos. Aqui o raio é o próprio fio: $x = \\ell\\theta$. Derivando no tempo, como $\\ell$ não muda, a velocidade é $\\ell$ vezes a taxa de variação do ângulo. Derivando de novo, a aceleração é $\\ell$ vezes a segunda derivada de $\\theta$.",
          elements: ["s4-der"],
        },
      ],
      teacherNotes: "Se o aluno não conhece derivadas, apresente d/dt como 'taxa de variação no tempo' e mostre que, se x é sempre ℓ vezes θ, então x varia ℓ vezes mais rápido que θ.",
      studentQuestions: [
        { question: "Por que precisa ser em radianos?", answer: "Porque a fórmula do arco, x = ℓθ, só vale com θ em radianos — é justamente assim que o radiano é definido." },
      ],
    },
    {
      id: "s5",
      kind: "concepts",
      title: "A aproximação de pequenos ângulos",
      goal: "Justificar numérica e graficamente que sen θ ≈ θ para θ pequeno.",
      newPage: false,
      board: [
        { id: "s5-eq", type: "equation", latex: "\\theta \\text{ pequeno} \\;\\Rightarrow\\; \\sin\\theta \\approx \\theta", ink: "ink", size: "lg", align: "left", label: "", marks: [] },
        {
          id: "s5-row",
          type: "row",
          columns: [
            {
              weight: 1,
              elements: [
                {
                  id: "s5-tab",
                  type: "table",
                  caption: "$\\theta$ em radianos",
                  headers: ["$\\theta$", "$\\sin\\theta$", "erro"],
                  rows: [
                    ["$0{,}05$", "$0{,}0500$", "$0{,}04\\%$"],
                    ["$0{,}10$", "$0{,}0998$", "$0{,}17\\%$"],
                    ["$0{,}20$", "$0{,}1987$", "$0{,}67\\%$"],
                    ["$0{,}50$", "$0{,}4794$", "$4{,}3\\%$"],
                  ],
                  ink: "ink",
                  highlightRow: 1,
                },
              ],
            },
            {
              weight: 1,
              elements: [
                {
                  id: "s5-graph",
                  type: "graph",
                  caption: "",
                  xRange: [-1.8, 1.8],
                  yRange: [-1.6, 1.6],
                  xLabel: "$\\theta$",
                  yLabel: "",
                  grid: true,
                  aspect: "square",
                  width: "lg",
                  functions: [
                    { expr: "x", ink: "orange", label: "$y=\\theta$", domain: [-1.5, 1.5], dashed: true },
                    { expr: "sin(x)", ink: "blue", label: "$y=\\sin\\theta$", domain: [-1.8, 1.8], dashed: false },
                  ],
                  points: [],
                  segments: [],
                },
              ],
            },
          ],
        },
      ],
      script: [
        {
          text: "Agora vem o passo que torna o problema solúvel de forma simples. Para ângulos pequenos, o seno do ângulo é praticamente igual ao próprio ângulo — de novo, em radianos.",
          elements: ["s5-eq"],
        },
        {
          text: "Veja os números: para $\\theta = 0{,}10$ rad, que é cerca de $6^\\circ$, o seno vale $0{,}0998$. O erro é menor que $0{,}2\\%$! Mesmo em $0{,}20$ rad, uns $11^\\circ$, o erro não chega a $1\\%$. Só começa a pesar lá pelos $0{,}5$ rad.",
          elements: ["s5-tab"],
        },
        {
          text: "No gráfico dá para ver o porquê: perto da origem, a curva do seno, em azul, praticamente encosta na reta $y = \\theta$, tracejada. A reta é tangente à curva na origem.",
          elements: ["s5-graph"],
        },
      ],
      teacherNotes: "Quem já viu séries de Taylor pode ver sin θ = θ − θ³/6 + ..., o que mostra que o erro relativo é cerca de θ²/6.",
      studentQuestions: [{ question: "E se o ângulo for grande?", answer: "Aí o movimento ainda é periódico, mas não é mais um MHS, e o período aumenta um pouco com a amplitude." }],
    },
    {
      id: "s6",
      kind: "solution",
      title: "Chegando à equação do MHS",
      goal: "Combinar os resultados e reconhecer a equação do movimento harmônico simples.",
      newPage: false,
      board: [
        {
          id: "s6-der",
          type: "derivation",
          layout: "horizontal",
          size: "lg",
          lines: [
            { latex: "-mg\\,\\theta = m\\ell\\,\\dfrac{d^2\\theta}{dt^2}", ink: "ink", connector: "none", annotation: "" },
            { latex: "\\dfrac{d^2\\theta}{dt^2} + \\dfrac{g}{\\ell}\\,\\theta = 0", ink: "ink", connector: "implies", annotation: "" },
          ],
        },
        { id: "s6-res", type: "result", label: "Equação do MHS", latex: "\\ddot{\\theta} + \\omega^2\\,\\theta = 0", text: "", ink: "ink" },
        { id: "s6-con", type: "connector", from: "s3-eq", to: "s6-der", ink: "red", style: "bracket", label: "" },
      ],
      script: [
        {
          text: "Vamos juntar tudo. Na equação (1), troco $\\sin\\theta$ por $\\theta$ e a aceleração $a$ por $\\ell\\,d^2\\theta/dt^2$. A massa aparece dos dois lados, então dividimos tudo por $m$ — ela não é zero, claro. Depois dividimos por $\\ell$ e passamos tudo para o mesmo lado.",
          elements: ["s6-der"],
        },
        {
          text: "Essa é exatamente a forma da equação do movimento harmônico simples, com $\\omega^2 = g/\\ell$. Os dois pontinhos em cima do $\\theta$ são só uma forma curta de escrever a segunda derivada no tempo.",
          elements: ["s6-res"],
        },
        {
          text: "E repare nesta seta: ela liga a segunda lei de Newton, lá de cima, ao resultado final. Foi dela que tudo saiu.",
          elements: ["s6-con"],
        },
      ],
      teacherNotes: "Destaque que a massa se cancelou: o movimento não depende de m.",
      studentQuestions: [{ question: "Por que chamar g/ℓ de ω²?", answer: "Porque g/ℓ é positivo, e escrever como um quadrado deixa a solução na forma cos(ωt), com ω sendo a frequência angular." }],
    },
    {
      id: "s7",
      kind: "conclusion",
      title: "Frequência e período",
      goal: "Obter as relações finais do pêndulo simples.",
      newPage: false,
      board: [
        { id: "s7-sol", type: "equation", latex: "\\theta(t) = \\theta_0\\cos(\\omega t + \\varphi)", ink: "ink", size: "md", align: "left", label: "", marks: [] },
        {
          id: "s7-list",
          type: "list",
          style: "bullet",
          ink: "orange",
          items: ["$\\omega^2 = \\dfrac{g}{\\ell}$", "$T_0 = \\dfrac{2\\pi}{\\omega} = 2\\pi\\sqrt{\\dfrac{\\ell}{g}}$", "$\\ell = \\dfrac{g}{\\pi^2}\\cdot\\dfrac{T_0^2}{4}$"],
        },
        { id: "s7-note", type: "note", tone: "remember", title: "Repare", content: "O período não depende da massa $m$ nem da amplitude $\\theta_0$ (desde que $\\theta_0$ seja pequeno)." },
      ],
      script: [
        {
          text: "A equação do MHS tem como solução uma função cosseno: o ângulo oscila entre $+\\theta_0$ e $-\\theta_0$. Você pode conferir derivando duas vezes.",
          elements: ["s7-sol"],
        },
        {
          text: "Daí saem as três relações que você vai usar nos exercícios: $\\omega^2 = g/\\ell$; o período, que é o tempo de uma oscilação completa, $T_0 = 2\\pi/\\omega = 2\\pi\\sqrt{\\ell/g}$; e, isolando $\\ell$, a fórmula para descobrir o comprimento a partir do período.",
          elements: ["s7-list"],
        },
        {
          text: "E a grande lição: o período só depende de $\\ell$ e de $g$. Uma massa pesada e uma leve, com o mesmo fio, oscilam no mesmo ritmo.",
          elements: ["s7-note"],
        },
      ],
      teacherNotes: "",
      studentQuestions: [],
    },
    {
      id: "s8",
      kind: "verification",
      title: "Verificação: unidades e um exemplo numérico",
      goal: "Conferir a fórmula do período por análise dimensional e com números reais.",
      newPage: true,
      board: [
        {
          id: "s8-dim",
          type: "derivation",
          layout: "vertical",
          size: "md",
          lines: [
            { latex: "\\left[\\sqrt{\\dfrac{\\ell}{g}}\\right] = \\sqrt{\\dfrac{\\text{m}}{\\text{m/s}^2}}", ink: "green", connector: "none", annotation: "" },
            { latex: "= \\sqrt{\\text{s}^2} = \\text{s}", ink: "green", connector: "equals", annotation: "unidade de tempo ✓" },
          ],
        },
        {
          id: "s8-num",
          type: "derivation",
          layout: "vertical",
          size: "md",
          lines: [
            { latex: "\\ell = 1{,}00\\,\\text{m},\\quad g = 9{,}8\\,\\text{m/s}^2", ink: "blue", connector: "none", annotation: "exemplo" },
            { latex: "T_0 = 2\\pi\\sqrt{\\dfrac{1{,}00}{9{,}8}} \\approx 2\\pi\\cdot 0{,}319", ink: "ink", connector: "none", annotation: "" },
          ],
        },
        { id: "s8-res", type: "result", label: "Resultado", latex: "T_0 \\approx 2{,}0\\,\\text{s}", text: "", ink: "ink" },
      ],
      script: [
        {
          text: "Antes de confiar numa fórmula, sempre confira as unidades. Dentro da raiz temos metro dividido por metro por segundo ao quadrado. Os metros se cancelam e sobra segundo ao quadrado. Tirando a raiz: segundos. Um período tem que ser um tempo — então a fórmula está coerente.",
          elements: ["s8-dim"],
        },
        {
          text: "Agora um exemplo: um pêndulo de um metro, com $g = 9{,}8$. A raiz de $1/9{,}8$ dá aproximadamente $0{,}319$; multiplicando por $2\\pi$...",
          elements: ["s8-num"],
        },
        {
          text: "...chegamos a cerca de dois segundos. Um segundo para ir e um para voltar. Inclusive, esse é o famoso pêndulo que 'bate o segundo', usado em relógios antigos.",
          elements: ["s8-res"],
        },
      ],
      teacherNotes: "Se houver tempo, proponha medir o período com um fio e um celular e comparar com a fórmula.",
      studentQuestions: [],
    },
  ],
};
