// ============================================================================
//  PORTAL DOS 500 — quando o herói derruba 500 zumbis, abre um portal: o jogo da rua PAUSA e a cena muda pra
//  um corredor no vazio, com a câmera atrás do herói. Em cada rodada vêm 3 portais pela estrada (1 esquerda,
//  2 meio, 3 direita) com um efeito no PODER do herói (+40, ×2, −30, ÷2, ? ...). O chat vota em qual passar.
//  No fim do corredor está o GUARDIÃO: se o poder acumulado for maior que o dele, o herói passa e o chat
//  escolhe uma RELÍQUIA rara (muito forte) que ele leva pra rua até o fim. Se não for, volta sem nada.
//  O poder e os efeitos dos portais valem só aqui dentro. Presentes mexem no poder (ajuda sobe, atrapalha desce).
//  Uma vez por herói. Tudo sorteado na hora que o portal abre (as rodadas e a força do guardião).
// ============================================================================
import { ZUMBIS } from './dados.js';
import { danoNoZumbi } from './dano.js';
import { dist2 } from './util.js';

export const PORTAL = {
  abates: 500,          // zumbis derrubados pra abrir
  rodadas: 4,
  poder: 100,           // poder do herói quando entra
  entrar: 1.8,          // s: transição de entrada
  atravessar: 1.8,      // s: depois da votação, o herói passa pelo portal escolhido
  duelo: 4.2,           // s: herói x guardião
  fim: 3,               // s: mostrando o resultado (ganhou a relíquia / não passou)
  sair: 1.4,            // s: transição de volta pra rua
  // guardião: entre o caminho médio (escolhendo ao acaso) e o melhor caminho possível
  guardiao: 0.55,       // 0 = média do acaso, 1 = o melhor caminho
  presentePorMoeda: 0.04,   // cada moeda de presente: ±4% de poder (ajuda sobe, atrapalha desce)
  presenteMax: 0.6          // um presente sozinho mexe no máximo isso
};

// Efeitos dos portais. bom = azul, ruim = vermelho, misterio = roxo (só revela ao passar)
const BONS = [
  { tipo: 'soma', v: 40 }, { tipo: 'soma', v: 60 }, { tipo: 'soma', v: 90 },
  { tipo: 'mult', v: 1.5 }, { tipo: 'mult', v: 2 }, { tipo: 'mult', v: 3, raro: true }
];
const RUINS = [{ tipo: 'soma', v: -30 }, { tipo: 'soma', v: -50 }, { tipo: 'mult', v: 0.5 }, { tipo: 'mult', v: 0.7 }];
const MISTERIO = [{ tipo: 'mult', v: 3 }, { tipo: 'mult', v: 2 }, { tipo: 'soma', v: 100 }, { tipo: 'mult', v: 0.5 }, { tipo: 'soma', v: -60 }];

export const rotulo = e => e.misterio ? '?' : e.tipo === 'mult' ? (e.v >= 1 ? `×${String(e.v).replace('.', ',')}` : `÷${String(Math.round(1 / e.v * 10) / 10).replace('.', ',')}`) : (e.v > 0 ? `+${e.v}` : `−${-e.v}`);
export const aplicarEfeito = (poder, e) => Math.max(1, Math.round(e.tipo === 'mult' ? poder * e.v : poder + e.v));
const esperado = (poder, e) => e.misterio ? MISTERIO.reduce((a, m) => a + aplicarEfeito(poder, m), 0) / MISTERIO.length : aplicarEfeito(poder, e);
const lado = e => e.misterio ? 'misterio' : (e.tipo === 'mult' ? e.v >= 1 : e.v > 0) ? 'bom' : 'ruim';

// As rodadas: cada uma com 3 portais (um ruim, um bom e um bom ou mistério), em ordem embaralhada
export function sortearRodadas(rng, P = PORTAL) {
  const pegar = l => l[Math.floor(rng.next() * l.length)];
  const rodadas = [];
  for (let r = 0; r < P.rodadas; r++) {
    let bons = BONS.filter(b => !b.raro || rng.next() < 0.35);
    const a = pegar(bons); bons = bons.filter(b => b !== a);
    const ops = [{ ...a }, { ...pegar(RUINS) }, rng.next() < 0.35 ? { misterio: true } : { ...pegar(bons) }];
    for (let i = ops.length - 1; i > 0; i--) { const j = Math.floor(rng.next() * (i + 1)); [ops[i], ops[j]] = [ops[j], ops[i]]; }
    rodadas.push(ops.map(o => ({ ...o, lado: lado(o), rotulo: rotulo(o) })));
  }
  return rodadas;
}

// Melhor caminho (pela esperança) e o caminho médio do acaso: o guardião fica entre os dois
export function forcaGuardiao(rodadas, P = PORTAL) {
  let melhor = P.poder, media = P.poder;
  for (const ops of rodadas) {
    melhor = Math.max(...ops.map(o => esperado(melhor, o)));
    media = ops.reduce((a, o) => a + esperado(media, o), 0) / ops.length;
  }
  return Math.round(media + (melhor - media) * P.guardiao);
}

// Ninguém votou: a IA escolhe, quase sempre o melhor (pela esperança), às vezes ao acaso
export function escolhaPortalIA(poder, ops, rng) {
  if (rng.next() < 0.25) return Math.floor(rng.next() * ops.length);
  let k = 0;
  ops.forEach((o, i) => { if (esperado(poder, o) > esperado(poder, ops[k])) k = i; });
  return k;
}

// Passou pelo portal: o mistério revela o efeito; devolve o efeito de verdade
export const revelar = (o, rng) => (o.misterio ? { ...MISTERIO[Math.floor(rng.next() * MISTERIO.length)] } : o);

// Presente durante o portal: ajuda multiplica o poder, atrapalha divide
export function poderComPresente(poder, ladoPresente, moedas, P = PORTAL) {
  const k = 1 + Math.min(P.presenteMax, Math.max(0.02, moedas * P.presentePorMoeda));
  return Math.max(1, Math.round(ladoPresente === 'ajuda' ? poder * k : poder / k));
}

/* ---------------- Relíquias raras (o prêmio) ---------------- */
// Cada herói leva uma só (h.reliquia). São fortes de verdade, mas não seguram a horda pra sempre.
const alvos = g => g.zumbis.filter(z => !z.morto && !(z.nascendo > 0) && !(z.fa?.escudo > 0));
export const RELIQUIAS = {
  trovao: {
    nome: 'Martelo do Trovão', emoji: '🔨', cd: 3.5, alvos: 6, raio: 9, dano: 220,
    desc: 'a cada 3,5 s, raios caem nos 6 zumbis mais fortes em volta (dano enorme) e atordoam',
    atualizar(g, h, dt) {
      if ((h.reliquiaT = (h.reliquiaT ?? 1) - dt) > 0) return;
      const perto = alvos(g).filter(z => dist2(z.x, z.y, h.x, h.y) < this.raio * this.raio).sort((a, b) => b.vida - a.vida).slice(0, this.alvos);
      if (!perto.length) { h.reliquiaT = 0.4; return; }
      h.reliquiaT = this.cd;
      const pts = [[h.x, h.y]];
      for (const z of perto) {
        g.ferirZumbi(z, danoNoZumbi(z, this.dano * h.attr.get('dano'), 'eletrico'), null, false);
        if (!z.morto) g.aplicarStatus(z, 'atordoado', { duracao: 1 });
        pts.push([z.x, z.y]);
      }
      g.emit('raio', { pts });
    }
  },
  eclipse: {
    nome: 'Olho do Eclipse', emoji: '🌑', cd: 6, alcance: 12, largura: 1.4, chefe: 0.15,
    desc: 'a cada 6 s, um feixe do vazio na frente do herói desintegra os zumbis no caminho (chefes perdem 15%)',
    atualizar(g, h, dt) {
      if ((h.reliquiaT = (h.reliquiaT ?? 1) - dt) > 0) return;
      // mira no lado com mais zumbis (entre as 8 direções)
      let melhor = null, mq = 0;
      for (let k = 0; k < 8; k++) {
        const a = k / 8 * Math.PI * 2, dx = Math.cos(a), dy = Math.sin(a);
        const q = alvos(g).filter(z => this.naLinha(z, h, dx, dy)).length;
        if (q > mq) { mq = q; melhor = [dx, dy]; }
      }
      if (!melhor) { h.reliquiaT = 0.4; return; }
      h.reliquiaT = this.cd;
      for (const z of alvos(g)) {
        if (!this.naLinha(z, h, melhor[0], melhor[1])) continue;
        if (ZUMBIS[z.tipo].chefe) g.ferirZumbi(z, z.vidaMax * this.chefe, null, true);
        else g.matarZumbi(z, null);
      }
      g.emit('eclipse', { x: h.x, y: h.y, x2: h.x + melhor[0] * this.alcance, y2: h.y + melhor[1] * this.alcance });
    },
    naLinha(z, h, dx, dy) {
      const px = z.x - h.x, py = z.y - h.y, ao = px * dx + py * dy;
      return ao > 0 && ao < this.alcance && Math.abs(px * dy - py * dx) < this.largura;
    }
  },
  fenix: {
    nome: 'Pena da Fênix', emoji: '🪶', cd: 75, cura: 0.6, raio: 3.5, dano: 160,
    desc: 'quando o herói ia cair, renasce em chamas: volta com 60% da vida e queima tudo em volta (a cada 75 s)',
    atualizar(g, h, dt) { h.reliquiaT = Math.max(0, (h.reliquiaT ?? 0) - dt); },
    // chamado no golpe que ia derrubar o herói; devolve true se salvou
    salvar(g, h) {
      if ((h.reliquiaT ?? 0) > 0) return false;
      h.reliquiaT = this.cd;
      h.vida = h.vidaMax * this.cura;
      h.invT = Math.max(h.invT, 3);
      for (const z of alvos(g)) if (dist2(z.x, z.y, h.x, h.y) < this.raio * this.raio) g.ferirZumbi(z, danoNoZumbi(z, this.dano * h.attr.get('dano'), 'fogo'), null, false);
      g.emit('onda', { x: h.x, y: h.y, raio: this.raio });
      g.emit('fenix', { x: h.x, y: h.y });
      return true;
    }
  },
  vendaval: {
    nome: 'Botas do Vendaval', emoji: '🌪️',
    desc: '+35% de velocidade, +40% de velocidade de ataque e +20% de esquiva',
    mods: [{ attr: 'velocidade', mult: 1.35 }, { attr: 'cadencia', mult: 1.4 }, { attr: 'esquiva', soma: 0.2 }]
  }
};

export function darReliquia(g, id) {
  const h = g.hero, R = RELIQUIAS[id];
  h.reliquia = id; h.reliquiaT = 1;
  for (const [k, m] of (R.mods || []).entries()) h.attr.addMod({ ...m, id: `rel:${id}:${k}`, fonte: R.nome });
  g.sincronizarVida?.();
}
export function atualizarReliquia(g, dt) {
  const h = g.hero, R = h.reliquia && RELIQUIAS[h.reliquia];
  if (R?.atualizar) R.atualizar(g, h, dt);
}
export function reliquiaSalva(g, h) {
  const R = h.reliquia && RELIQUIAS[h.reliquia];
  return !!(R?.salvar && R.salvar(g, h));
}
