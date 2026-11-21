// ============================================================================
//  HISTÓRIA — os fragmentos que o herói encontra nos caminhos livres.
//
//  Para mexer na história, só este arquivo:
//    - capitulos: nome de cada capítulo
//    - fragmentos: aparecem NA ORDEM desta lista, um por vez, e o progresso
//      continua de um herói para o outro (fica guardado no navegador da live).
//      Campos: id (único, nunca repita), capitulo, titulo, texto, assinatura.
//      Dica: texto com até uns 220 caracteres cabe bem no cartão da tela.
//  Quando todos forem lidos, os caminhos de história viram caminhos livres.
//  A chance de aparecer fica no config.json (caminho_historia_porcento).
// ============================================================================

export const HISTORIA = {
  titulo: 'Os Diários de Porto Sereno',
  capitulos: {
    1: 'O primeiro dia',
    2: 'A Febre Cinza',
    3: 'O Farol'
  },
  fragmentos: [
    {
      id: 'cartaz-aurora', capitulo: 1, titulo: 'Cartaz rasgado',
      texto: 'VACINE-SE! AURORA-7 GRÁTIS EM TODAS AS FARMÁCIAS. Proteção total contra a Febre Cinza. Por cima, alguém escreveu com batom vermelho: NÃO TOMEM.',
      assinatura: 'parede da farmácia da Rua 9'
    },
    {
      id: 'recado-parabrisa', capitulo: 1, titulo: 'Recado no para-brisa',
      texto: 'Amor, fui buscar as crianças na escola. Se a sirene tocar, não abre a porta pra ninguém. Nem pra mim.',
      assinatura: '— R.'
    },
    {
      id: 'diario-entregadora', capitulo: 1, titulo: 'Diário de uma entregadora',
      texto: 'Dia 2. Fiz 14 entregas hoje. Ninguém atende a porta, mas todo mundo arranha. A cidade inteira pediu remédio na mesma noite.',
      assinatura: '— Jéssica, moto 22'
    },
    {
      id: 'radio-viatura', capitulo: 1, titulo: 'Rádio da polícia',
      texto: 'Central, aqui é a viatura 12. Eles não sentem dor. Eles seguem o barulho. Repito: desliguem os alarmes dos carros. Os alarmes chamam eles.',
      assinatura: 'transcrição, 23h47'
    },
    {
      id: 'prontuario-0417', capitulo: 2, titulo: 'Prontuário do hospital',
      texto: 'Paciente 0417. Febre de 41 graus, pele acinzentada, pupilas fixas. Tomou a AURORA-7 há três dias. Às 03h12 foi declarado morto. Às 03h20, levantou.',
      assinatura: 'Hospital Central, ala B'
    },
    {
      id: 'caderno-crianca', capitulo: 2, titulo: 'Caderno de criança',
      texto: 'Meu vizinho virou monstro. A mamãe disse que é só uma gripe forte. Gripe não morde.',
      assinatura: '— Lucas, 8 anos (com desenho de giz de cera)'
    },
    {
      id: 'gravacao-livia', capitulo: 2, titulo: 'Gravação do Instituto Aurora',
      texto: 'Dra. Lívia Prado, registro 31. O lote 7 foi liberado antes dos testes. Eu avisei. A vacina não cura a febre: ela impede o corpo de morrer de verdade.',
      assinatura: 'fita encontrada num carro virado'
    },
    {
      id: 'placa-quartel', capitulo: 2, titulo: 'Placa do quartel',
      texto: 'Quem cai, levanta. Por isso a gente não deixa ninguém pra trás: nem vivo, nem morto. Se encontrar um de nós de pé, termine o serviço.',
      assinatura: 'Quartel de Bombeiros 3'
    },
    {
      id: 'panfleto-farol', capitulo: 3, titulo: 'Panfleto do céu',
      texto: 'OPERAÇÃO FAROL. Sobreviventes: sigam para a Torre de Rádio no alto do morro. Façam barulho só quando ouvirem o helicóptero.',
      assinatura: 'jogado de um helicóptero'
    },
    {
      id: 'radio-resistencia', capitulo: 3, titulo: 'Rádio Resistência 98.7',
      texto: 'Aqui é o Beto, direto da torre. Se você tá ouvindo, saiba: tem gente torcendo por você lá fora. Mandam rosas, mandam caixas, às vezes mandam problema. Mas mandam.',
      assinatura: 'rádio de pilha caído na calçada'
    },
    {
      id: 'mapa-rabiscado', capitulo: 3, titulo: 'Mapa rabiscado',
      texto: 'A Dra. Lívia está viva. Laboratório no subsolo do Hospital Central. Ela tem a cura. Ou tem a culpa.',
      assinatura: 'atrás de um mapa da cidade'
    },
    {
      id: 'ultima-pagina', capitulo: 3, titulo: 'Última página',
      texto: 'Se você chegou até aqui, a cidade lembra o seu nome. Continue andando. O Farol só acende quando o último herói não desiste.',
      assinatura: 'fim do capítulo 3 — continua...'
    }
  ]
};

// Progresso da história (quais fragmentos já foram encontrados)
export class Historia {
  constructor(vistos = []) {
    const ids = new Set(HISTORIA.fragmentos.map(f => f.id));
    this.vistos = new Set((Array.isArray(vistos) ? vistos : []).filter(id => ids.has(id)));
  }
  get total() { return HISTORIA.fragmentos.length; }
  get lidos() { return this.vistos.size; }
  // Próximo fragmento ainda não encontrado (na ordem da lista), ou null se acabou
  proximo() { return HISTORIA.fragmentos.find(f => !this.vistos.has(f.id)) || null; }
  marcar(id) { this.vistos.add(id); }
  numero(id) { return HISTORIA.fragmentos.findIndex(f => f.id === id) + 1; }
  nomeCapitulo(c) { return HISTORIA.capitulos[c] || `Capítulo ${c}`; }
  lista() { return [...this.vistos]; }
}
