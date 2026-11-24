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

// Tira o que atrapalha a leitura: emoji de número (2️⃣ vira 2), #, parênteses, pontuação
const limpar = texto => normalizar(String(texto || '').replace(/🅰/g, 'a').replace(/🅱/g, 'b')).replace(/[\uFE0F\u20E3]/g, '').replace(/[!?.,;:#()\[\]*"'“”]+/g, ' ').replace(/\s+/g, ' ').trim();
const POR_NUMERO = { 1: 'esquerda', 2: 'frente', 3: 'direita', 4: 'entrar', 5: 'voltar' };

// Lê um comentário e devolve a opção (ou null se não for voto)
export function lerVoto(texto) {
  const t = limpar(texto);
  if (!t) return null;
  // "2", "22", "222" (gente que repete o número)
  const rep = t.match(/^([1-5])\1*$/);
  if (rep) return POR_NUMERO[rep[1]];
  const primeira = t.split(' ')[0];
  for (const [op, lista] of Object.entries(PALAVRAS)) {
    if (lista.includes(t) || lista.includes(primeira)) return op;
  }
  // "vai pra esquerda", "entra na farmácia"...
  if (t.length <= 30) {
    for (const [op, lista] of Object.entries(PALAVRAS)) {
      if (lista.some(p => p.length >= 4 && t.includes(p))) return op;
    }
    // "vai 2", "bora no 3": um número de 1 a 5 sozinho no meio da frase (se só tiver um número diferente)
    const nums = new Set(t.split(' ').filter(x => /^[1-5]$/.test(x)));
    if (nums.size === 1) return POR_NUMERO[[...nums][0]];
  }
  return null;
}

// Na banca do Barganha (mascate.js) o chat vota de 1 a 9: "7", "77", "7️⃣", "quero o 3", "vai 9".
// Também vale a palavra: vender (7), trocar (8), sair/tchau (9). Devolve o número ou null.
const PALAVRAS_LOJA = { 7: ['vender', 'vende', 'venda', 'vendo'], 8: ['trocar', 'troca', 'troco', 'troque'], 9: ['sair', 'sai', 'tchau', 'seguir', 'segue', 'bora', 'nada'] };
export function lerNumero(texto, max = 9) {
  const t = limpar(texto);
  if (!t) return null;
  const rep = t.match(/^([1-9])\1*$/);
  if (rep) return +rep[1] <= max ? +rep[1] : null;
  const primeira = t.split(' ')[0];
  for (const [n, lista] of Object.entries(PALAVRAS_LOJA)) if (+n <= max && lista.includes(primeira)) return +n;
  if (t.length <= 30) {
    const nums = new Set(t.split(' ').filter(x => /^[1-9]$/.test(x)));
    if (nums.size === 1) { const n = +[...nums][0]; return n <= max ? n : null; }
  }
  return null;
}

// Atraso da live: quem assiste pelo TikTok vê a tela alguns segundos atrasada (atraso).
// Por isso a votação fica aberta "duracao + atraso" segundos, mas a contagem na tela termina
// "atraso" segundos antes: assim, quando o espectador vê o 0, a votação está fechando de verdade.
// Nesses últimos segundos a tela mostra "contando votos da live" e os votos que chegam ainda valem.
// Escolha de habilidade ao subir de nível: o comentário tem que ser só a letra (A, B ou C)
// Aceita: "a", "A!", "aaa", "a)", "letra a", "opção b", "hab c"
export function lerEscolha(texto) {
  const t = limpar(texto);
  let m = t.match(/^([abc])\1*$/);
  if (m) return m[1];
  m = t.match(/^(?:letra|opcao|hab|habilidade|carta)\s+([abc])$/);
  return m ? m[1] : null;
}

export class Votacao {
  constructor(opcoes, duracao, atraso = 0) {
    this.opcoes = opcoes.map(o => ({ ...o, votos: 0 }));   // [{ id: 'esquerda', ... }]
    this.atraso = Math.max(0, atraso);
    this.duracao = duracao;                  // o que aparece na contagem
    this.t = duracao + this.atraso;          // quanto tempo fica aberta de verdade
    this.votantes = new Map(); // id -> opção
    this.aberta = true;
    this.resultado = null;
  }
  get restante() { return Math.max(0, this.t); }
  // O que a contagem mostra (chega a 0 quando o espectador atrasado ainda está vendo a contagem acabar)
  get restanteNaTela() { return Math.max(0, this.t - this.atraso); }
  // Contagem já zerou na tela, mas ainda chegam votos de quem assiste com atraso
  get contandoAtrasados() { return this.aberta && this.t > 0 && this.t <= this.atraso; }
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
