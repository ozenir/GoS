// ============================================================================
//  MAPA — a viagem: o chat escolhe PRA ONDE ir, olhando um mapa do bairro.
//
//  Em vez de votar esquerda/direita em cada cruzamento, a votação mostra os lugares mais perto (mercado,
//  hospital, delegacia...) com quantos quarteirões até lá e o que dá pra achar. O herói segue a rota sozinho,
//  quarteirão por quarteirão, lutando com o que aparece no caminho; chegando, entra no lugar. Saindo dele,
//  vota o próximo destino. No caminho podem aparecer pessoas pedindo ajuda (encontros.js).
//
//  As ruas: um grafo de cruzamentos (i, j). Rua bloqueada ou sem saída não serve de caminho.
// ============================================================================
import { DIRS } from './util.js';
import { LOJAS } from './room.js';

export const MAPA = {
  raio: 7,              // até quantos quarteirões procura lugares
  opcoes: 3,            // quantos lugares a votação mostra (+ a praça, se tiver uma perto)
  garantirDe: 2,        // sem nenhum lugar de um tipo por perto, aparece um a esta distância...
  garantirAte: 5,       // ...até esta
  arenaAte: 4,          // a praça (arena de chefe) entra como opção até esta distância
  distMin: 2            // o lugar fica a pelo menos 2 quarteirões: é uma viagem, com caminho
};

// O que cada tipo de lugar resolve (as 3 necessidades: comida, cura e armas)
export const CATEGORIAS = {
  suprimentos: { nome: 'suprimentos', tipos: ['mercado', 'casa'], garantir: 'mercado' },
  cura: { nome: 'cura', tipos: ['hospital', 'farmacia'], garantir: 'farmacia' },
  armas: { nome: 'armas', tipos: ['delegacia', 'posto', 'fabrica'], garantir: 'delegacia' }
};
export const categoriaDe = tipo => Object.keys(CATEGORIAS).find(c => CATEGORIAS[c].tipos.includes(tipo)) || null;

// Dá pra ir do cruzamento (i, j) na direção d? (rua bloqueada ou sem saída: não)
export function ruaLivre(city, i, j, d) {
  const t = city.trecho(i, j, d);
  return !t.s.bloqueio && !t.s.semSaida;
}

// Busca em largura a partir do cruzamento ini, até `raio` quarteirões: Map "i,j" -> { i, j, dist, dirs }
// (dirs = as direções a tomar em cada cruzamento, na ordem)
export function rotas(city, ini, raio = MAPA.raio) {
  const vistos = new Map([[ini.i + ',' + ini.j, { i: ini.i, j: ini.j, dist: 0, dirs: [] }]]);
  let fila = [vistos.get(ini.i + ',' + ini.j)];
  for (let n = 0; n < raio && fila.length; n++) {
    const prox = [];
    for (const no of fila) for (let d = 0; d < 4; d++) {
      const i = no.i + DIRS[d][0], j = no.j + DIRS[d][1], k = i + ',' + j;
      if (vistos.has(k) || !ruaLivre(city, no.i, no.j, d)) continue;
      const novo = { i, j, dist: no.dist + 1, dirs: [...no.dirs, d] };
      vistos.set(k, novo); prox.push(novo);
    }
    fila = prox;
  }
  return vistos;
}

// Rota até um cruzamento (ou null)
export function rotaAte(city, ini, alvo, raio = MAPA.raio + 4) {
  return rotas(city, ini, raio).get(alvo.i + ',' + alvo.j)?.dirs ?? null;
}

const lugar = (no, shop) => ({
  i: no.i, j: no.j, dist: no.dist, dirs: no.dirs, tipo: shop.tipo, nome: shop.nome, emoji: shop.emoji,
  oque: LOJAS[shop.tipo]?.oque || '', categoria: categoriaDe(shop.tipo), risco: shop.risco || 1
});

// Os lugares da votação: o mais perto de cada necessidade (comida, cura, armas) e, se tiver, a praça.
// Sem nenhum lugar de uma necessidade por perto, um aparece (city.garantirLoja) a 2-5 quarteirões.
// rng: sorteio de onde garantir. Devolve a lista ordenada pela distância.
// excluir = cruzamentos ("i,j") dos lugares visitados há pouco (não oferece o mesmo de novo)
export function lugaresDaViagem(city, ini, rng, M = MAPA, excluir = []) {
  const todas = rotas(city, ini, M.raio);
  const nos = [...todas.values()].filter(n => n.dist >= M.distMin && !excluir.includes(n.i + ',' + n.j)).sort((a, b) => a.dist - b.dist);
  const escolhidos = [];
  for (const [cat, C] of Object.entries(CATEGORIAS)) {
    let achou = null;
    for (const no of nos) {
      const s = city.shopAt(no.i, no.j);
      if (s && C.tipos.includes(s.tipo) && !escolhidos.some(e => e.i === no.i && e.j === no.j)) { achou = lugar(no, s); break; }
    }
    if (!achou) {
      // garante um lugar dessa necessidade num cruzamento livre a 2-5 quarteirões
      const cand = nos.filter(n => n.dist >= M.garantirDe && n.dist <= M.garantirAte && !city.shopAt(n.i, n.j) && !escolhidos.some(e => e.i === n.i && e.j === n.j));
      for (let k = 0; k < 6 && cand.length && !achou; k++) {
        const no = cand.splice(Math.floor(rng.next() * cand.length), 1)[0];
        const s = city.garantirLoja(no.i, no.j, C.garantir);
        if (s) achou = lugar(no, s);
      }
    }
    if (achou) { achou.categoria = cat; escolhidos.push(achou); }
  }
  escolhidos.sort((a, b) => a.dist - b.dist);
  const lista = escolhidos.slice(0, M.opcoes);
  // a praça (arena de chefe) perto: vira uma opção a mais
  for (const no of nos) {
    if (no.dist > M.arenaAte) continue;
    const p = city.pracaAt(no.i, no.j);
    if (p) { lista.push({ i: no.i, j: no.j, dist: no.dist, dirs: no.dirs, tipo: 'praca', nome: 'Praça', emoji: '⚔️', oque: 'chefe e baú', categoria: 'arena', risco: 4, praca: true }); break; }
  }
  return lista;
}

// Pontos (cruzamentos) da rota, do início até o destino: pra desenhar no mapa
export function pontosDaRota(ini, dirs) {
  const pts = [{ i: ini.i, j: ini.j }];
  let i = ini.i, j = ini.j;
  for (const d of dirs) { i += DIRS[d][0]; j += DIRS[d][1]; pts.push({ i, j }); }
  return pts;
}
