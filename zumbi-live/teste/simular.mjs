// Simula partidas inteiras sem desenhar nada, pra testar e equilibrar o jogo.
//   node teste/simular.mjs                -> 20 heróis em cada cenário (nada, só chat, com presentes)
//   node teste/simular.mjs 40 nada        -> 40 heróis, só o cenário sem nenhuma interação
//   cenários: nada | chat | presentes
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Jogo } from '../public/js/core/jogo.js';
import { makeRng, fmtTempo } from '../public/js/core/util.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(DIR, '..', 'config.json'), 'utf8'));
// Ajustes de teste sem mexer no config.json: AJUSTES='{"ameaca_por_minuto":1.2}' node teste/simular.mjs
if (process.env.AJUSTES) Object.assign(config.jogo, JSON.parse(process.env.AJUSTES));
const presentes = Object.entries(config.presentes.por_nome);

const N = Number(process.argv[2]) || 20;
const so = process.argv[3] || null;
const DT = 1 / 30;

const CENARIOS = {
  nada: { nome: 'Sem nenhuma interação', chat: 0, pessoas: 0, curtidas: 0, presentes: 0 },
  chat: { nome: 'Só chat (≈6 pessoas comentando e votando, curtidas)', chat: 0.5, pessoas: 6, curtidas: 2, presentes: 0 },
  presentes: { nome: 'Chat + presentes misturados (≈8 por minuto)', chat: 0.5, pessoas: 6, curtidas: 2, presentes: 8 },
  ajuda: { nome: 'Chat + só presentes que AJUDAM (≈4 por minuto)', chat: 0.5, pessoas: 6, curtidas: 2, presentes: 4, lado: 'ajuda' },
  atrapalha: { nome: 'Chat + só presentes que ATRAPALHAM (≈4 por minuto)', chat: 0.5, pessoas: 6, curtidas: 2, presentes: 4, lado: 'atrapalha' }
};
const ATRAPALHA = new Set(['zumbis', 'vidro', 'horda', 'explosivo', 'alarme', 'trem', 'chefao', 'rei']);

function publico(jogo, rng, dt, c) {
  if (c.chat && rng.next() < dt * c.chat) jogo.handle({ type: 'chat', id: 'u' + rng.int(1, c.pessoas), nick: 'pessoa' + rng.int(1, c.pessoas), texto: rng.pick(['1', '2', '3', '4', 'kkk', 'vai']) });
  if (c.presentes && rng.next() < dt * c.presentes / 60) {
    const lado = r => ATRAPALHA.has(r.efeito) ? 'atrapalha' : 'ajuda';
    const pesos = presentes.map(([, r]) => c.lado && lado(r) !== c.lado ? 0 : 1 / Math.pow(Math.max(1, r.moedas), 0.55));
    let soma = pesos.reduce((a, b) => a + b, 0), r = rng.next() * soma, k = 0;
    for (; k < pesos.length - 1; k++) { r -= pesos[k]; if (r <= 0) break; }
    const [nome, regra] = presentes[k];
    if (regra.moedas >= 1000 && rng.next() < 0.7) return; // caros são raros
    jogo.handle({ type: 'presente', id: 'g' + rng.int(1, 12), nick: 'doador' + rng.int(1, 12), giftName: nome, count: regra.moedas < 100 ? rng.int(1, 3) : 1, coins: regra.moedas, regra });
  }
  if (c.curtidas && rng.next() < dt * c.curtidas) jogo.handle({ type: 'curtidas', qtd: rng.int(1, 15) });
}

function rodar(id, seed) {
  const c = CENARIOS[id];
  const rng = makeRng(seed);
  const jogo = new Jogo({ seed });
  jogo.configurar(config.jogo);
  const res = [], contagem = {};
  let maxZ = 0, passos = 0;
  const t0 = Date.now();
  while (res.length < N) {
    publico(jogo, rng, DT, c);
    jogo.update(DT);
    passos++;
    maxZ = Math.max(maxZ, jogo.zumbis.length);
    for (const e of jogo.drainEvents()) {
      contagem[e.type] = (contagem[e.type] || 0) + 1;
      if (e.type === 'heroi_morreu') res.push(e.relatorio);
    }
    if (passos > 30 * 60 * 60 * 3) { console.log('  (parei: 3 horas de jogo simulado)'); break; }
  }
  const media = k => res.reduce((a, r) => a + r[k], 0) / Math.max(1, res.length);
  const tempos = res.map(r => r.tempo).sort((a, b) => a - b);
  const meio = tempos[Math.floor(tempos.length / 2)] || 0;
  console.log(`\n=== ${c.nome} — ${res.length} heróis, ${((Date.now() - t0) / 1000).toFixed(1)} s de processamento ===`);
  console.log(`  vida: média ${fmtTempo(media('tempo'))} · metade dura até ${fmtTempo(meio)} · mais curta ${fmtTempo(tempos[0] || 0)} · mais longa ${fmtTempo(tempos[tempos.length - 1] || 0)}`);
  console.log(`  ${media('quarteiroes').toFixed(1)} quarteirões, ${media('abates').toFixed(0)} abates, nível ${media('nivel').toFixed(1)}, ameaça final ${media('ameaca').toFixed(1)}; até ${maxZ} zumbis juntos`);
  const cam = res.reduce((a, r) => (a.p += r.caminhos.perigoso, a.l += r.caminhos.livre, a.h += r.caminhos.historia, a), { p: 0, l: 0, h: 0 });
  const tot = Math.max(1, cam.p + cam.l + cam.h);
  console.log(`  caminhos: perigoso ${(cam.p / tot * 100).toFixed(0)}% · livre ${(cam.l / tot * 100).toFixed(0)}% · história ${(cam.h / tot * 100).toFixed(1)}% (${tot} cruzamentos)`);
  const causas = {};
  for (const r of res) { const k = (r.matador?.causa || '?').replace(/ de .*/, ''); causas[k] = (causas[k] || 0) + 1; }
  console.log('  derrubado por:', Object.entries(causas).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
  return media('tempo');
}

for (const [k, s] of [['nada', 12345], ['chat', 4242], ['presentes', 777], ['ajuda', 31], ['atrapalha', 99]]) if (!so || so === k) rodar(k, s);
