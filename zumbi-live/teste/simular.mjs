// Simula partidas inteiras sem desenhar nada, pra testar e equilibrar o jogo.
//   node teste/simular.mjs                -> 20 heróis em cada cenário (nada, só chat, com presentes)
//   node teste/simular.mjs 40 nada        -> 40 heróis, só o cenário sem nenhuma interação
//   cenários: nada | chat | presentes
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Jogo } from '../public/js/core/jogo.js';
import { ESCALA_AMEACA } from '../public/js/core/dano.js';
import { AMEACA } from '../public/js/core/ameaca.js';
import { makeRng, fmtTempo } from '../public/js/core/util.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const config = JSON.parse(fs.readFileSync(path.join(DIR, '..', 'config.json'), 'utf8'));
// Ajustes de teste sem mexer no config.json: AJUSTES='{"ameaca_por_minuto":1.2}' node teste/simular.mjs
if (process.env.AJUSTES) Object.assign(config.jogo, JSON.parse(process.env.AJUSTES));
// ESCALA='{"vida":0.3}' muda dano.js → ESCALA_AMEACA; AMEACA='{"cotaBase":20}' muda ameaca.js → AMEACA (só nesta simulação)
if (process.env.ESCALA) Object.assign(ESCALA_AMEACA, JSON.parse(process.env.ESCALA));
if (process.env.AMEACA) Object.assign(AMEACA, JSON.parse(process.env.AMEACA));
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
  const jogo = new Jogo({ seed, classe: process.env.CLASSE || null });
  jogo.configurar(config.jogo);
  const res = [], contagem = {};
  let maxZ = 0, passos = 0;
  // vida mínima (% da máxima) em cada faixa de nível, por herói; e em que nível cada um caiu
  const faixa = n => n < 5 ? '1-4' : n < 10 ? '5-9' : n < 15 ? '10-14' : n < 20 ? '15-19' : n < 25 ? '20-24' : '25+';
  let minV = {}; const minVs = [], morreuNivel = {}, tempo10 = [];
  let heroiAtual = jogo.hero, chegou10 = false, nasceu = jogo.t;
  const limpas = [], lutas = [];
  // quando sai cada suprema e o nível deus (tempo vivo e nível do herói)
  const marcos = { s1: [], s3: [], s6: [], deus: [] };
  let inicioLuta = null;
  const t0 = Date.now();
  while (res.length < N) {
    publico(jogo, rng, DT, c);
    jogo.update(DT);
    passos++;
    maxZ = Math.max(maxZ, jogo.zumbis.length);
    if (jogo.hero !== heroiAtual) { minVs.push(minV); minV = {}; heroiAtual = jogo.hero; chegou10 = false; nasceu = jogo.t; }
    // herói vivo há muito tempo: mostra o estado (pra achar travas)
    if (jogo.t - nasceu > 40 * 60 && passos % (30 * 60) === 0) {
      const h = jogo.hero;
      console.log(`  [vivo há ${fmtTempo(jogo.t - nasceu)}] q ${jogo.stats.quarteiroes} nível ${h.nivel} ameaça ${jogo.nivelAmeaca} vida ${Math.round(h.vida)}/${Math.round(h.vidaMax)} zumbis ${jogo.zumbis.filter(z => !z.morto).length} sala ${!!jogo.room} arena ${!!jogo.arena} limpando ${JSON.stringify(jogo.limpando)} decisão ${jogo.decisao?.id || '-'} caído ${!!jogo.caido} supremas ${(h.supremas || []).join(',')} deus ${h.deus} pos ${h.x.toFixed(1)},${h.y.toFixed(1)}`);
    }
    if (jogo.fase === 'jogo') {
      const h = jogo.hero, f = faixa(h.nivel), v = jogo.caido ? 0 : h.vida / h.vidaMax;
      minV[f] = Math.min(minV[f] ?? 1, v);
      if (!chegou10 && h.nivel >= 10) { chegou10 = true; tempo10.push(jogo.t - jogo.stats.inicio); }
    }
    if (process.env.DEBUG && passos % (30 * 300) === 0) {
      const h = jogo.hero;
      console.log(`  [${fmtTempo(passos * DT)}] ${h.classe} vida ${Math.round(h.vida)}/${Math.round(h.vidaMax)} q ${jogo.stats.quarteiroes} ameaça ${jogo.nivelAmeaca} zumbis ${jogo.zumbis.filter(z => !z.morto).length} sala ${!!jogo.room} arma ${h.arma} corpo ${h.corpo} regen ${h.attr.get('regen').toFixed(2)} defesa ${h.attr.get('defesa').toFixed(2)} esquiva ${h.attr.get('esquiva').toFixed(2)} curaGolpe ${h.attr.get('curaPorAcerto').toFixed(2)} status ${[...h.estados.lista.keys()]} torcida ${jogo.torcidaN} pos ${h.x.toFixed(2)},${h.y.toFixed(2)} trecho ${jogo.trecho?.tipo} voto ${jogo.voto ? (jogo.voto.aberta ? 'aberto ' + jogo.voto.t.toFixed(1) : 'fechado') : '-'} decisao ${jogo.decisao?.id || '-'} porta ${jogo.indoPorta ? jogo.indoPorta.door.x + ',' + jogo.indoPorta.door.y : '-'} alvo ${jogo.rota.alvo.i},${jogo.rota.alvo.j} dir ${jogo.rota.dir} votoAbreT ${jogo.votoAbreT?.toFixed(1)} mira ${!!h.mira} foco ${(h.focoRota||0).toFixed(1)} fase ${jogo.fase}`);
    }
    for (const e of jogo.drainEvents()) {
      contagem[e.type] = (contagem[e.type] || 0) + 1;
      if (e.type === 'area_limpa') limpas.push(e.segundos);
      if (e.type === 'suprema' && [1, 3, 6].includes(e.total)) marcos['s' + e.total].push({ t: jogo.t - jogo.stats.inicio, n: jogo.hero.nivel });
      if (e.type === 'deus') marcos.deus.push({ t: jogo.t - jogo.stats.inicio, n: jogo.hero.nivel });
      if (e.type === 'colosso') inicioLuta = jogo.t;
      if (e.type === 'colosso_vencido' && inicioLuta != null) { lutas.push(jogo.t - inicioLuta); inicioLuta = null; }
      if (e.type === 'heroi_morreu') { res.push(e.relatorio); const f = faixa(e.relatorio.nivel); morreuNivel[f] = (morreuNivel[f] || 0) + 1; }
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
  const faixas = ['1-4', '5-9', '10-14', '15-19', '20-24', '25+'];
  console.log('  caiu na faixa de nível:', faixas.map(f => `${f}: ${morreuNivel[f] || 0}`).join(' · '));
  console.log('  vida mínima (mediana dos que passaram pela faixa):', faixas.map(f => { const v = minVs.map(m => m[f]).filter(x => x != null).sort((a, b) => a - b); return v.length ? `${f}: ${Math.round(v[Math.floor(v.length / 2)] * 100)}%` : null; }).filter(Boolean).join(' · '));
  const t10 = tempo10.slice().sort((a, b) => a - b);
  if (t10.length) console.log(`  chegaram no nível 10: ${t10.length}/${res.length} · tempo mediano ${fmtTempo(t10[Math.floor(t10.length / 2)])}`);
  const marco = (k, nome) => { const l = marcos[k].slice().sort((a, b) => a.t - b.t); return l.length ? `${nome}: ${l.length}/${res.length} · ${fmtTempo(l[l.length >> 1].t)} (nível ${l.slice().sort((a, b) => a.n - b.n)[l.length >> 1].n})` : `${nome}: 0/${res.length}`; };
  console.log('  supremas (mediana):', [marco('s1', '1ª'), marco('s3', '3ª'), marco('s6', '6ª'), marco('deus', 'deus')].join(' · '));
  if (limpas.length) { const l = limpas.slice().sort((a, b) => a - b); console.log(`  limpar a área no cruzamento: ${l.length} vezes, mediana ${l[l.length >> 1]} s, 90% até ${l[Math.floor(l.length * 0.9)]} s · hordas gigantes ${contagem.horda_quadra || 0}`); }
  if (contagem.colosso) console.log(`  presentes: ${contagem.drop || 0} drops pegos, ${contagem.inspiracao || 0} inspirações · colossos: ${contagem.colosso} apareceram, ${contagem.colosso_cansou || 0} cansaram, ${contagem.colosso_vencido || 0} vencidos${lutas.length ? `, luta mediana ${fmtTempo(lutas.sort((a, b) => a - b)[lutas.length >> 1])}` : ''}`);
  const porClasse = {};
  for (const r of res) (porClasse[r.nome] ||= []).push(r.tempo);
  console.log('  por personagem:', Object.entries(porClasse).map(([k, v]) => `${k} ${fmtTempo(v.reduce((a, b) => a + b, 0) / v.length)} (${v.length})`).join(' · '));
  const causas = {};
  for (const r of res) { const k = (r.matador?.causa || '?').replace(/ de .*/, ''); causas[k] = (causas[k] || 0) + 1; }
  console.log('  derrubado por:', Object.entries(causas).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${v}`).join(' · '));
  return media('tempo');
}

// SEED=5 node teste/simular.mjs -> outra sequência de partidas (pra ver se o resultado se repete)
const extra = Number(process.env.SEED) || 0;
for (const [k, s] of [['nada', 12345], ['chat', 4242], ['presentes', 777], ['ajuda', 31], ['atrapalha', 99]]) if (!so || so === k) rodar(k, s + extra * 1000);
