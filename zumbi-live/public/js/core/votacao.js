// Votação do chat nos cruzamentos. Cada pessoa vota uma vez por cruzamento; vale o primeiro voto.
// Números fixos pra ficar fácil de decorar: 1 esquerda, 2 frente, 3 direita, 4 entrar, 5 voltar.
import { normalizar } from './util.js';

export const OPCOES = {
  esquerda: { n: 1, nome: 'ESQUERDA', seta: '↖' },
  frente: { n: 2, nome: 'FRENTE', seta: '↗' },
  direita: { n: 3, nome: 'DIREITA', seta: '↘' },
  entrar: { n: 4, nome: 'ENTRAR', seta: '🚪' },
  voltar: { n: 5, nome: 'VOLTAR', seta: '↙' }
};

const PALAVRAS = {
  esquerda: ['1', 'e', 'esq', 'esquerda', 'esquerdo', 'left', '⬅', '⬅️', '↖', '👈'],
  frente: ['2', 'f', 'frente', 'reto', 'segue', 'seguir', 'siga', 'em frente', 'pra frente', 'avanca', '⬆', '⬆️', '↗', '👆'],
  direita: ['3', 'd', 'dir', 'direita', 'direito', 'right', '➡', '➡️', '↘', '👉'],
  entrar: ['4', 'p', 'entrar', 'entra', 'entre', 'porta', 'dentro', 'loja', 'predio', 'praca', 'arena', '🚪'],
  voltar: ['5', 'v', 'voltar', 'volta', 'volte', 'tras', 'atras', 'pra tras', 'para tras', 're', '⬇', '⬇️', '↙', '👇']
};

// Lê um comentário e devolve a opção (ou null se não for voto)
export function lerVoto(texto) {
  const t = normalizar(texto).replace(/[!?.,;:]+/g, ' ').replace(/\s+/g, ' ').trim();
  if (!t) return null;
  const primeira = t.split(' ')[0];
  for (const [op, lista] of Object.entries(PALAVRAS)) {
    if (lista.includes(t) || lista.includes(primeira)) return op;
  }
  // "vai pra esquerda", "entra na farmácia"...
  if (t.length <= 30) {
    for (const [op, lista] of Object.entries(PALAVRAS)) {
      if (lista.some(p => p.length >= 4 && t.includes(p))) return op;
    }
  }
  return null;
}

export class Votacao {
  constructor(opcoes, duracao) {
    this.opcoes = opcoes.map(o => ({ ...o, votos: 0 }));   // [{ id: 'esquerda', ... }]
    this.duracao = duracao;
    this.t = duracao;
    this.votantes = new Map(); // id -> opção
    this.aberta = true;
    this.resultado = null;
  }
  get restante() { return Math.max(0, this.t); }
  get total() { return this.votantes.size; }

  votar(id, opId) {
    if (!this.aberta || this.votantes.has(id)) return false;
    const o = this.opcoes.find(x => x.id === opId);
    if (!o) return false;
    this.votantes.set(id, opId);
    o.votos++;
    return true;
  }

  update(dt) { if (this.aberta) this.t -= dt; }

  // Fecha e decide. Se ninguém votou, quem decide é a IA (função escolherIA).
  fechar(escolherIA, rng) {
    this.aberta = false;
    const max = Math.max(...this.opcoes.map(o => o.votos));
    if (max <= 0) {
      this.resultado = { id: escolherIA(this.opcoes), votos: 0, auto: true };
    } else {
      const empatados = this.opcoes.filter(o => o.votos === max);
      const escolhida = empatados.length > 1 ? empatados[Math.floor(rng.next() * empatados.length)] : empatados[0];
      this.resultado = { id: escolhida.id, votos: max, auto: false, empate: empatados.length > 1 };
    }
    return this.resultado;
  }
}
