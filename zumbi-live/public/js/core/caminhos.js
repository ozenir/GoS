// ============================================================================
//  CAMINHOS — o que acontece na rua que o chat (ou a IA) escolheu.
//
//  Cada vez que o herói vira num cruzamento, o jogo sorteia o tipo de caminho:
//    - perigoso  (padrão 80%): um perigo aparece na rua e a ameaça sobe um pouco
//    - livre     (padrão 18%): nenhum zumbi novo aparece até o próximo cruzamento
//    - historia  (padrão  2%): caminho livre com um fragmento da história no chão
//  As chances ficam no config.json (caminho_perigoso_porcento etc.).
//  A história em si fica em historia.js.
// ============================================================================

export const CHANCES_PADRAO = { perigoso: 80, livre: 18, historia: 2 };

// Quanto um caminho perigoso aumenta a ameaça (em pontos; 1 ponto = 1 nível)
export const AMEACA_POR_PERIGO = 0.18;

// Segundos depois de virar a esquina até o perigo aparecer (dá tempo de ler o aviso)
export const ATRASO_PERIGO = 2.5;

// Tipos de perigo. peso = chance relativa entre eles. aplicar(g, n): g = jogo, n = nível de ameaça.
export const PERIGOS = {
  emboscada: {
    nome: 'EMBOSCADA', emoji: '⚠️', texto: 'zumbis dos dois lados', peso: 3,
    aplicar: (g, n) => {
      const q = g.hordaDaRua(n);
      g.soltarZumbis('horda', Math.ceil(q / 2), null, { horda: true, semEscala: true });
      g.soltarZumbisAtras(Math.ceil(q / 2));
    }
  },
  horda: {
    nome: 'RUA LOTADA', emoji: '🧟', texto: 'uma horda bloqueia a rua', peso: 3,
    aplicar: (g, n) => g.soltarZumbis('horda', Math.round(g.hordaDaRua(n) * 1.2), null, { horda: true, semEscala: true })
  },
  corredores: {
    nome: 'CORREDORES', emoji: '🏃', texto: 'eles correm!', peso: 2,
    aplicar: (g, n) => g.soltarZumbis('corredor', Math.max(2, Math.round((3 + n) * g.multInicio())), null, { semEscala: true })
  },
  explosivos: {
    nome: 'EXPLOSIVOS', emoji: '💣', texto: 'cuidado com os inchados', peso: 1.5,
    aplicar: (g, n) => g.soltarZumbis('explosivo', Math.max(1, Math.round((2 + Math.floor(n / 3)) * g.multInicio())), null, { semEscala: true })
  },
  escuridao: {
    nome: 'RUA ESCURA', emoji: '🌑', texto: 'as luzes apagaram', peso: 1.5,
    aplicar: (g, n) => { g.noite(20); g.soltarZumbis('horda', Math.round(g.hordaDaRua(n) * 0.6), null, { horda: true, semEscala: true }); }
  },
  chefe: {
    nome: 'CHEFE DE RUA', emoji: '👹', texto: 'um grandão no caminho', peso: 0.7, desdeNivel: 10,   // antes do nível 10, chefe só na arena
    aplicar: g => g.chefe('chefao', null, 0, { nome: 'Chefe de rua', vidaMult: 0.5 })
  }
};

// Sorteia o caminho. temHistoria = ainda existe fragmento não visto (se não, vira caminho livre).
// nivelHeroi: perigos com desdeNivel só aparecem a partir desse nível do herói.
export function sortearCaminho(rng, chances = CHANCES_PADRAO, temHistoria = true, nivelHeroi = 99) {
  const c = { ...CHANCES_PADRAO, ...chances };
  const total = Math.max(0.0001, c.perigoso + c.livre + c.historia);
  const r = rng.next() * total;
  if (r < c.perigoso) {
    const perigo = rng.weighted(Object.entries(PERIGOS).map(([id, p]) => [id, nivelHeroi >= (p.desdeNivel || 0) ? p.peso : 0]));
    return { tipo: 'perigoso', perigo };
  }
  if (r < c.perigoso + c.livre || !temHistoria) return { tipo: 'livre' };
  return { tipo: 'historia' };
}
