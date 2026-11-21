// O que cada presente faz no jogo. O config.json diz qual presente usa qual efeito e com quais números.
// lado: 'ajuda' (salva o herói) ou 'atrapalha' (complica a vida dele).
// texto: frase curta da legenda. aviso: frase do aviso na tela quando alguém manda.
// qtd = quantas vezes a pessoa mandou de uma vez (combo).
//
// Presentes inteligentes (por causa do atraso da live, o presente pode chegar numa hora diferente
// da que a pessoa viu): cura com vida cheia vira blindado, kit com vida alta vai pra mochila
// (usado sozinho quando a vida cair), munição sem arma de fogo vira fúria, colete cheio vira blindado.
// Se o herói estiver CAÍDO, qualquer presente de ajuda levanta ele (jogo.js → levantar).

const n = (v, padrao) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : padrao);

export const EFEITOS = {
  cura: {
    lado: 'ajuda',
    texto: r => `cura +${n(r.valor, 10)}%`,
    aviso: (r, q) => `curou +${Math.min(60, n(r.valor, 10) * q)}%`,
    aplicar: (g, r, q, quem) => g.curarPresente(Math.min(60, n(r.valor, 10) * q), quem)
  },
  kit: {
    lado: 'ajuda',
    texto: r => `kit médico +${n(r.valor, 25)}%`,
    aviso: (r, q) => q > 1 ? `${q} kits médicos` : 'kit médico',
    aplicar: (g, r, q, quem) => g.kitPresente(n(r.valor, 25), Math.min(q, 4), quem)
  },
  municao: {
    lado: 'ajuda',
    texto: r => `munição + tiro rápido ${n(r.segundos, 10)}s`,
    aviso: (r, q) => `munição + tiro rápido ${Math.min(40, n(r.segundos, 10) * q)}s`,
    aplicar: (g, r, q, quem) => g.darMunicao(Math.min(40, n(r.segundos, 10) * q), quem)
  },
  colete: {
    lado: 'ajuda',
    texto: r => `colete (${n(r.golpes, 3)} golpes)`,
    aviso: (r, q) => `colete de ${Math.min(12, n(r.golpes, 3) * q)} golpes`,
    aplicar: (g, r, q, quem) => g.darColete(Math.min(12, n(r.golpes, 3) * q), quem)
  },
  cachorro: {
    lado: 'ajuda',
    texto: r => `cachorro ajudante ${n(r.segundos, 60)}s`,
    aviso: () => 'mandou um cachorro ajudante',
    aplicar: (g, r, q, quem) => g.addAliado('cachorro', Math.min(180, n(r.segundos, 60) * q), quem)
  },
  aliado: {
    lado: 'ajuda',
    texto: r => `sobrevivente ajuda ${n(r.segundos, 20)}s`,
    aviso: () => 'entrou pra ajudar',
    aplicar: (g, r, q, quem) => g.addAliado('sobrevivente', n(r.segundos, 20), quem)
  },
  bau: {
    lado: 'ajuda',
    texto: r => r.raridade === 'lendario' ? 'baú LENDÁRIO' : 'baú com arma',
    aviso: r => r.raridade === 'lendario' ? 'mandou um BAÚ LENDÁRIO' : 'mandou um baú com arma',
    aplicar: (g, r, q, quem) => { for (let i = 0; i < Math.min(q, 3); i++) g.soltarItem(r.raridade === 'lendario' ? 'bau_lendario' : 'bau_medio', {}, quem, i); }
  },
  caixa_municao: {
    lado: 'ajuda',
    texto: () => 'caixa de munição',
    aviso: () => 'compartilhou: caixa de munição',
    aplicar: (g, r, q, quem) => g.soltarItem('municao', {}, quem, 0)
  },
  suprimento: {
    lado: 'ajuda',
    texto: () => 'suprimento de avião',
    aviso: () => 'curtidas: suprimento de avião!',
    aplicar: (g, r, q, quem) => g.soltarItem('suprimento', {}, quem, 0)
  },
  helicoptero: {
    lado: 'ajuda',
    texto: () => 'helicóptero de resgate',
    aviso: () => 'chamou o HELICÓPTERO DE RESGATE',
    aplicar: (g, r, q, quem) => g.helicoptero(n(r.segundos, 15), quem)
  },

  zumbis: {
    lado: 'atrapalha',
    texto: r => `${n(r.qtd, 3)} zumbis com seu nome`,
    aviso: (r, q) => `mandou ${Math.min(18, n(r.qtd, 3) * q)} zumbis`,
    aplicar: (g, r, q, quem) => g.soltarZumbis('comum', Math.min(18, n(r.qtd, 3) * q), quem, { nomeados: true, combo: q })
  },
  vidro: {
    lado: 'atrapalha',
    texto: r => `cacos de vidro (lento ${n(r.segundos, 5)}s)`,
    aviso: () => 'espalhou cacos de vidro',
    aplicar: (g, r, q, quem) => g.armadilhaVidro(Math.min(15, n(r.segundos, 5) + (q - 1) * 2), quem)
  },
  horda: {
    lado: 'atrapalha',
    texto: r => `horda de ${n(r.qtd, 8)}`,
    aviso: (r, q) => `atraiu uma horda de ${Math.min(30, n(r.qtd, 8) * q)}`,
    aplicar: (g, r, q, quem) => g.soltarZumbis('horda', Math.min(30, n(r.qtd, 8) * q), quem, { horda: true })
  },
  explosivo: {
    lado: 'atrapalha',
    texto: () => 'zumbi que explode',
    aviso: (r, q) => q > 1 ? `mandou ${Math.min(5, q)} zumbis explosivos` : 'mandou um zumbi EXPLOSIVO',
    aplicar: (g, r, q, quem) => g.soltarZumbis('explosivo', Math.min(5, n(r.qtd, 1) * q), quem, { nomeados: true })
  },
  alarme: {
    lado: 'atrapalha',
    texto: r => `carro com alarme ${n(r.segundos, 20)}s`,
    aviso: () => 'disparou um ALARME DE CARRO',
    aplicar: (g, r, q, quem) => g.alarme(Math.min(45, n(r.segundos, 20) * q), quem)
  },
  trem: {
    lado: 'atrapalha',
    texto: r => `trem de ${n(r.qtd, 15)} corredores`,
    aviso: () => 'mandou o TREM DE ZUMBIS',
    aplicar: (g, r, q, quem) => g.trem(Math.min(30, n(r.qtd, 15) * q), quem)
  },
  chefao: {
    lado: 'atrapalha',
    texto: () => 'CHEFÃO com seu nome',
    aviso: () => 'invocou um CHEFÃO',
    aplicar: (g, r, q, quem) => { for (let i = 0; i < Math.min(q, 3); i++) g.chefe('chefao', quem, i * 2.5); }
  },
  rei: {
    lado: 'atrapalha',
    texto: () => 'REI ZUMBI + noite',
    aviso: () => 'despertou o REI ZUMBI',
    aplicar: (g, r, q, quem) => { g.chefe('rei', quem, 0); g.noite(n(r.segundos, 60)); }
  }
};

export const ladoDo = regra => (EFEITOS[regra?.efeito]?.lado) || 'ajuda';
