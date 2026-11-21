// Simula partidas inteiras sem desenhar nada, pra testar e equilibrar o jogo.
//   node teste/simular.mjs                 -> 6 heróis sem público e 6 com público simulado
//   node teste/simular.mjs 20 sem          -> 20 heróis, só sem público
//   node teste/simular.mjs 20 com          -> 20 heróis, só com público
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Jogo } from '../public/js/core/jogo.js';
import { makeRng, fmtTempo } from '../public/js/core/util.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(DIR, '..', 'config.json'), 'utf8'));
const presentes = Object.entries(config.presentes.por_nome);

const N = Number(process.argv[2]) || 6;
const modo = process.argv[3] || 'ambos';
const DT = 1 / 30;

// Público simulado: comentários com voto e presentes. "intensidade" = presentes por minuto.
function publico(jogo, rng, dt, intensidade) {
  if (rng.next() < dt * 0.6) jogo.handle({ type: 'chat', id: 'u' + rng.int(1, 30), nick: 'pessoa' + rng.int(1, 30), texto: rng.pick(['1', '2', '3', '4', 'kkk']) });
  if (rng.next() < dt * intensidade / 60) {
    const pesos = presentes.map(([, r]) => 1 / Math.pow(Math.max(1, r.moedas), 0.55));
    let soma = pesos.reduce((a, b) => a + b, 0), r = rng.next() * soma, k = 0;
    for (; k < pesos.length - 1; k++) { r -= pesos[k]; if (r <= 0) break; }
    const [nome, regra] = presentes[k];
    if (regra.moedas >= 1000 && rng.next() < 0.7) return; // caros são raros
    jogo.handle({ type: 'presente', id: 'g' + rng.int(1, 12), nick: 'doador' + rng.int(1, 12), giftName: nome, count: regra.moedas < 100 ? rng.int(1, 3) : 1, coins: regra.moedas, regra });
  }
  if (rng.next() < dt * 2) jogo.handle({ type: 'curtidas', qtd: rng.int(1, 15) });
}

function rodar(nome, intensidade, seed) {
  const rng = makeRng(seed);
  const jogo = new Jogo({ seed });
  jogo.configurar(config.jogo);
  const res = [];
  const contagem = {};
  let maxZ = 0, eventos = 0, t0 = Date.now(), passos = 0;
  while (res.length < N) {
    publico(jogo, rng, DT, intensidade);
    jogo.update(DT);
    passos++;
    maxZ = Math.max(maxZ, jogo.zumbis.length);
    for (const e of jogo.drainEvents()) {
      eventos++;
      contagem[e.type] = (contagem[e.type] || 0) + 1;
      if (e.type === 'heroi_morreu') res.push(e.relatorio);
    }
    if (passos > 30 * 60 * 60 * 3) { console.log('  (parei: 3 horas de jogo simulado)'); break; }
  }
  const media = k => res.reduce((a, r) => a + r[k], 0) / Math.max(1, res.length);
  console.log(`\n=== ${nome} (${res.length} heróis, ${((Date.now() - t0) / 1000).toFixed(1)} s de processamento para ${fmtTempo(passos * DT)} de jogo) ===`);
  for (const r of res) console.log(`  #${r.n} ${r.nome.padEnd(10)} ${fmtTempo(r.tempo).padStart(5)}  quarteirões ${String(r.quarteiroes).padStart(3)}  abates ${String(r.abates).padStart(4)}  nível ${r.nivel}  prédios ${r.predios}  derrubado por: ${r.matador?.causa || '?'}`);
  console.log(`  média: ${fmtTempo(media('tempo'))} de vida, ${media('quarteiroes').toFixed(1)} quarteirões, ${media('abates').toFixed(0)} abates, nível ${media('nivel').toFixed(1)}; no máximo ${maxZ} zumbis ao mesmo tempo`);
  const interessantes = ['votacao_abriu', 'decisao', 'entrou_predio', 'saiu_predio', 'chefe', 'bau', 'nivel', 'vida_baixa', 'noite', 'helicoptero', 'alarme', 'presente', 'recorde'];
  console.log('  eventos:', interessantes.map(k => `${k} ${contagem[k] || 0}`).join(' · '));
  return res;
}

if (modo === 'ambos' || modo === 'sem') rodar('Sem público', 0, 12345);
if (modo === 'ambos' || modo === 'com') rodar('Com público (≈8 presentes por minuto)', 8, 777);
