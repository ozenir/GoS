// O que cada presente faz no jogo. O config.json diz qual presente usa qual efeito e com quais números.
// lado: 'ajuda' (salva o herói) ou 'atrapalha' (complica a vida dele).
// texto: frase curta da legenda. aviso: frase do aviso na tela quando alguém manda.
// qtd = quantas vezes a pessoa mandou de uma vez (combo).
//
// Os BÔNUS (tiro rápido, fúria, blindado, cachorro, sobrevivente, arma lendária, invencível do helicóptero)
// duram QUARTEIRÕES andados, não segundos: "tiro rápido nos próximos 3 quarteirões".
//
// Presentes inteligentes (por causa do atraso da live, o presente pode chegar numa hora diferente
// da que a pessoa viu): cura com vida cheia vira blindado, kit com vida alta vai pra mochila
// (usado sozinho quando a vida cair), munição sem arma de fogo vira fúria, colete cheio vira blindado.
// Se o herói estiver CAÍDO, qualquer presente de ajuda levanta ele (jogo.js → levantar).

import { ZUMBIS_TELA, niveisPorMoedas, sortearTela } from './tela.js';

const n = (v, padrao) => (Number.isFinite(Number(v)) && Number(v) > 0 ? Number(v) : padrao);
// Bônus duram QUARTEIRÕES (não segundos). Config antigo com "segundos" ainda funciona: vira ~1 quarteirão a cada 15 s.
const nq = (r, padrao) => r.quarteiroes != null ? n(r.quarteiroes, padrao) : r.segundos != null ? Math.max(1, Math.round(n(r.segundos, 15) / 15)) : padrao;
const qt = q => `${q} ${q === 1 ? 'quarteirão' : 'quarteirões'}`;

export const EFEITOS = {
  cura: {
    lado: 'ajuda',
    texto: r => `cura +${n(r.valor, 14)}%`,
    aviso: (r, q) => `curou +${Math.min(60, n(r.valor, 14) * q)}%`,
    aplicar: (g, r, q, quem) => g.curarPresente(Math.min(60, n(r.valor, 14) * q), quem)
  },
  kit: {
    lado: 'ajuda',
    texto: r => `kit médico +${n(r.valor, 35)}%`,
    aviso: (r, q) => q > 1 ? `${q} kits médicos` : 'kit médico',
    aplicar: (g, r, q, quem) => g.kitPresente(n(r.valor, 35), Math.min(q, 4), quem)
  },
  municao: {
    lado: 'ajuda',
    texto: r => `tiro rápido por ${qt(nq(r, 3))}`,
    aviso: (r, q) => `munição + tiro rápido por ${qt(Math.min(8, nq(r, 3) + q - 1))}`,
    aplicar: (g, r, q, quem) => g.darMunicao(Math.min(8, nq(r, 3) + q - 1), quem)
  },
  colete: {
    lado: 'ajuda',
    texto: r => `colete (${n(r.golpes, 4)} golpes)`,
    aviso: (r, q) => `colete de ${Math.min(12, n(r.golpes, 4) * q)} golpes`,
    aplicar: (g, r, q, quem) => g.darColete(Math.min(12, n(r.golpes, 4) * q), quem)
  },
  cachorro: {
    lado: 'ajuda',
    texto: r => `cachorro ajudante por ${qt(nq(r, 4))}`,
    aviso: (r, q) => `mandou um cachorro ajudante por ${qt(Math.min(12, nq(r, 4) * q))}`,
    aplicar: (g, r, q, quem) => g.addAliado('cachorro', Math.min(12, nq(r, 4) * q), quem)
  },
  aliado: {
    lado: 'ajuda',
    texto: r => `sobrevivente ajuda por ${qt(nq(r, 1))}`,
    aviso: r => `entrou pra ajudar por ${qt(nq(r, 1))}`,
    aplicar: (g, r, q, quem) => g.addAliado('sobrevivente', nq(r, 1), quem)
  },
  bau: {
    lado: 'ajuda',
    texto: r => r.raridade === 'lendario' ? 'baú LENDÁRIO (3 quarteirões)' : 'baú com arma',
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
  // Limpador de para-brisa: limpa a tela de propósito (todo presente de ajuda já passa o limpador se a tela estiver suja)
  limpador: {
    lado: 'ajuda',
    texto: () => 'limpador de para-brisa (limpa a tela)',
    aviso: () => 'passou o limpador na tela',
    aplicar: (g, r, q, quem) => g.emit('limpar_tela', { nick: quem?.nick || null, auto: false })
  },
  helicoptero: {
    lado: 'ajuda',
    texto: () => 'helicóptero de resgate',
    aviso: () => 'chamou o HELICÓPTERO DE RESGATE',
    aplicar: (g, r, q, quem) => g.helicoptero(nq(r, 1), quem)
  },

  zumbis: {
    lado: 'atrapalha',
    texto: r => `${n(r.qtd, 3)} zumbis com seu nome`,
    aviso: (r, q) => `mandou ${Math.min(18, n(r.qtd, 3) * q)} zumbis`,
    // zumbis do fã (recompensas.js → ZUMBI_FA): nome e foto de quem mandou, mais fortes, e cada um acerta o herói ao menos uma vez
    aplicar: (g, r, q, quem) => g.soltarZumbis('comum', Math.min(18, n(r.qtd, 3) * q), quem, { nomeados: true, combo: q, fa: true })
  },
  // Zumbi da tela (tela.js): "zumbi": id de um (ovo, pintor, torta, gigante...) ou, sem ele, um do nível do valor
  tela: {
    lado: 'atrapalha',
    texto: r => ZUMBIS_TELA[r.zumbi] ? `${ZUMBIS_TELA[r.zumbi].emoji} ${ZUMBIS_TELA[r.zumbi].nome.toLowerCase()}` : 'um zumbi que suja a tela',
    aviso: r => ZUMBIS_TELA[r.zumbi] ? `mandou o ${ZUMBIS_TELA[r.zumbi].nome.toLowerCase()}` : 'mandou um zumbi da tela',
    aplicar: (g, r, q, quem) => g.surgirTela(ZUMBIS_TELA[r.zumbi] ? r.zumbi : sortearTela(g.rng, niveisPorMoedas(r.moedas)), quem)
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
