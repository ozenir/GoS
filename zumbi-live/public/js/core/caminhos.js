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
import { tamanhoHorda } from './ameaca.js';

export const CHANCES_PADRAO = { perigoso: 80, livre: 18, historia: 2 };

// Quanto um caminho perigoso aumenta a ameaça (em pontos; 1 ponto = 1 nível)
export const AMEACA_POR_PERIGO = 0.3;

// Segundos depois de virar a esquina até o perigo aparecer (dá tempo de ler o aviso)
export const ATRASO_PERIGO = 2.5;

// Tipos de perigo. peso = chance relativa entre eles. aplicar(g, n): g = jogo, n = nível de ameaça.
export const PERIGOS = {
  emboscada: {
    nome: 'EMBOSCADA', emoji: '⚠️', texto: 'zumbis dos dois lados', peso: 3,
    aplicar: (g, n) => {
      const q = tamanhoHorda(n, g.A);
      g.soltarZumbis('horda', Math.ceil(q / 2), null, { horda: true, semEscala: true });
      g.soltarZumbisAtras(Math.ceil(q / 2));
    }
  },
  horda: {
    nome: 'RUA LOTADA', emoji: '🧟', texto: 'uma horda bloqueia a rua', peso: 3,
    aplicar: (g, n) => g.soltarZumbis('horda', Math.round(tamanhoHorda(n, g.A) * 1.2), null, { horda: true, semEscala: true })
  },
  corredores: {
    nome: 'CORREDORES', emoji: '🏃', texto: 'eles correm!', peso: 2,
    aplicar: (g, n) => g.soltarZumbis('corredor', 3 + n, null, { semEscala: true })
  },
  explosivos: {
    nome: 'EXPLOSIVOS', emoji: '💣', texto: 'cuidado com os inchados', peso: 1.5,
    aplicar: (g, n) => g.soltarZumbis('explosivo', 2 + Math.floor(n / 3), null, { semEscala: true })
  },
  escuridao: {
    nome: 'RUA ESCURA', emoji: '🌑', texto: 'as luzes apagaram', peso: 1.5,
    aplicar: (g, n) => { g.noite(20); g.soltarZumbis('horda', Math.round(tamanhoHorda(n, g.A) * 0.6), null, { horda: true, semEscala: true }); }
  },
  chefe: {
    nome: 'CHEFE DE RUA', emoji: '👹', texto: 'um grandão no caminho', peso: 0.7,
    aplicar: g => g.chefe('chefao', null, 0, { nome: 'Chefe de rua', vidaMult: 0.5 })
  }
};

// Sorteia o caminho. temHistoria = ainda existe fragmento não visto (se não, vira caminho livre).
export function sortearCaminho(rng, chances = CHANCES_PADRAO, temHistoria = true) {
  const c = { ...CHANCES_PADRAO, ...chances };
  const total = Math.max(0.0001, c.perigoso + c.livre + c.historia);
  const r = rng.next() * total;
  if (r < c.perigoso) {
    const perigo = rng.weighted(Object.entries(PERIGOS).map(([id, p]) => [id, p.peso]));
    return { tipo: 'perigoso', perigo };
  }
  if (r < c.perigoso + c.livre || !temHistoria) return { tipo: 'livre' };
  return { tipo: 'historia' };
}
