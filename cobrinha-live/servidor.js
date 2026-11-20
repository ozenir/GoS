// Cobrinha do Jardim: liga o jogo na sua live do TikTok.
// Este programa lê os presentes da live e manda para o jogo, que roda no navegador.
//
//   node servidor.js            -> liga na live do usuário do config.json
//   node servidor.js --demo     -> modo teste, com presentes de mentira (não precisa estar ao vivo)
//   node servidor.js fulano     -> liga na live de @fulano (ignora o config.json)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { TikTokLiveConnection, WebcastEvent, ControlEvent, UserOfflineError } from 'tiktok-live-connector';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC = path.join(DIR, 'public');
const hora = () => new Date().toLocaleTimeString('pt-BR');
const log = (...a) => console.log(`[${hora()}]`, ...a);
const dormir = ms => new Promise(r => setTimeout(r, ms));

let config;
try {
  config = JSON.parse(fs.readFileSync(path.join(DIR, 'config.json'), 'utf8'));
} catch (e) {
  console.error('❌ Não consegui ler o config.json. Confira se não apagou nenhuma aspa ou vírgula.');
  console.error('   Detalhe:', e.message);
  process.exit(1);
}

const args = process.argv.slice(2);
const DEMO = args.includes('--demo');
const usuario = String(args.find(a => !a.startsWith('--')) || config.usuario || '')
  .replace(/^https?:\/\/(www\.)?tiktok\.com\//, '').replace(/\/live.*$/, '').replace(/^@/, '').trim();
const PORTA = Number(config.porta) || 8080;
const SEM_USUARIO = !usuario || usuario === 'seu_usuario_aqui';

/* ---------- Página do jogo + canal com o navegador ---------- */
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json' };
const server = http.createServer((req, res) => {
  let p;
  try { p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  if (p === '/') p = '/index.html';
  const arquivo = path.normalize(path.join(PUBLIC, p));
  if (!arquivo.startsWith(PUBLIC + path.sep)) { res.writeHead(403).end(); return; }
  fs.readFile(arquivo, (err, data) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Não encontrado'); return; }
    res.writeHead(200, { 'Content-Type': TIPOS[path.extname(arquivo)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    res.end(data);
  });
});

const wss = new WebSocketServer({ server, path: '/ws' });
let status = { status: DEMO ? 'demo' : (SEM_USUARIO ? 'sem_usuario' : 'conectando'), usuario, detalhe: '' };
function enviar(msg) {
  const s = JSON.stringify(msg);
  for (const c of wss.clients) if (c.readyState === 1) c.send(s);
}
function setStatus(st, detalhe = '') {
  status = { status: st, usuario, detalhe };
  enviar({ type: 'status', ...status });
}
wss.on('connection', c => {
  c.send(JSON.stringify({ type: 'estado', ...status, rank: topRank(), velocidade: config.jogo?.segundos_por_casa, modoSeguro: config.jogo?.modo_seguro_a_partir_de, preenchimento: config.jogo?.otimizar_preenchimento_a_partir_de,
    espacoMaximo: config.jogo?.espaco_maximo_a_partir_de, itens: config.jogo?.itens_a_cada_segundos, cenarios: config.jogo?.cenarios }));
  c.on('message', raw => {
    let m; try { m = JSON.parse(String(raw)); } catch { return; }
    if (m && m.type === 'teste') testar(m.presente, m.nome, Math.min(50, Math.max(1, Number(m.vezes) || 1)));
  });
});

/* ---------- Ranking da live ---------- */
const ranking = new Map();
function somar(id, nick, moedas) {
  const r = ranking.get(id) || { nick, coins: 0 };
  r.nick = nick; r.coins += moedas; ranking.set(id, r);
}
const topRank = () => [...ranking.values()].sort((a, b) => b.coins - a.coins).slice(0, 3);

/* ---------- Presente -> frutas ---------- */
function regraPara(nome, moedas) {
  const p = config.presentes || {};
  const porNome = p.por_nome || {};
  if (nome && porNome[nome]) return porNome[nome];
  const regras = [...(p.por_moedas || [])].sort((a, b) => a.a_partir_de - b.a_partir_de);
  let r = null;
  for (const x of regras) if (moedas >= x.a_partir_de) r = x;
  return r || { frutas: 1 };
}

// Presentes de combo (giftType 1, como a Rosa) chegam várias vezes enquanto a pessoa toca.
// Guardamos quanto de cada combo já virou fruta e só soltamos a diferença, então nada é contado duas vezes.
const combos = new Map();
setInterval(() => {
  const limite = Date.now() - 120000;
  for (const [k, v] of combos) if (v.t < limite) combos.delete(k);
}, 60000).unref();

function processarPresente(d) {
  const g = d.gift || {}, det = d.giftDetails || {}, ext = d.extendedGiftInfo || {};
  const tipo = Number(g.type ?? det.giftType ?? ext.type ?? 0);
  const nome = String(g.name || det.giftName || ext.name || 'Presente');
  const moedas = Number(g.diamondCount ?? det.diamondCount ?? ext.diamond_count ?? 0) || 0;
  const u = d.user || {};
  const id = String(u.displayId || u.uniqueId || u.userId || u.id || u.nickname || 'anonimo');
  const nick = String(u.nickname || u.displayId || u.uniqueId || 'alguém').slice(0, 24);
  const imagem = g.image?.urlList?.[0] || det.giftImage?.giftPictureUrl || ext.image?.url_list?.[0] || '';
  const total = Math.max(1, Number(d.repeatCount) || 1);

  let qtd = total;
  if (tipo === 1) {
    const chave = `${id}|${d.giftId ?? nome}|${d.groupId ?? ''}`;
    const c = combos.get(chave);
    const jaContado = c ? c.ultimo : 0;
    qtd = total - jaContado;
    if (d.repeatEnd) combos.delete(chave);
    else combos.set(chave, { ultimo: Math.max(total, jaContado), t: Date.now() });
    if (qtd <= 0) return;
  }

  const regra = regraPara(nome, moedas);
  const maximo = Number(config.presentes?.maximo_frutas_por_envio) || 80;
  const frutas = Math.min(maximo, Math.round((Number(regra.frutas) || 0) * qtd));
  somar(id, nick, moedas * qtd);
  log(`🎁 ${nick} mandou ${qtd}x ${nome} (${moedas} moeda${moedas === 1 ? '' : 's'} cada) → ${frutas} fruta${frutas === 1 ? '' : 's'}`);
  enviar({ type: 'presente', id, nick, giftName: nome, image: imagem, count: qtd, coins: moedas, fruits: frutas, chuva: !!regra.chuva, rank: topRank() });
}

let curtidasAcumuladas = 0;
function processarCurtidas(d) {
  const por = Number(config.curtidas_por_fruta) || 0;
  if (por <= 0) return;
  curtidasAcumuladas += Number(d.likeCount) || 0;
  const n = Math.floor(curtidasAcumuladas / por);
  if (n <= 0) return;
  curtidasAcumuladas -= n * por;
  enviar({ type: 'presente', likes: true, id: '__curtidas', nick: 'Curtidas', giftName: '__curtidas', count: 1, coins: 0, fruits: Math.min(n, 10), chuva: false });
}

/* ---------- Presentes de teste (botões da página e modo --demo) ---------- */
const TESTES = {
  rose: { name: 'Rose', diamondCount: 1, type: 1 },
  donut: { name: 'Donut', diamondCount: 30, type: 1 },
  lion: { name: 'Lion', diamondCount: 29999, type: 2 }
};
let seq = 0;
function testar(tipo, nome, vezes = 1) {
  const g = TESTES[tipo]; if (!g) return;
  const nick = String(nome || 'você (teste)').slice(0, 24);
  const user = { displayId: 'teste_' + nick.replace(/[^\w.]+/g, ''), nickname: nick };
  const base = { gift: g, user, giftId: g.name, groupId: 'teste' + (++seq) };
  if (g.type === 1) {
    for (let i = 1; i <= vezes; i++) setTimeout(() => processarPresente({ ...base, repeatCount: i, repeatEnd: 0 }), (i - 1) * 280);
    setTimeout(() => processarPresente({ ...base, repeatCount: vezes, repeatEnd: 1 }), vezes * 280 + 400);
  } else processarPresente({ ...base, repeatCount: 1, repeatEnd: 1 });
}
const NOMES = ['ana.lu', 'pedrinho_gamer', 'mari.flor', 'joaovictor', 'bia.santos', 'lucas_rs', 'tia.cida', 'rafa99', 'gabi.oliveira', 'duda.m'];
function iniciarDemo() {
  let ultimoLeao = 0;
  const pick = a => a[Math.floor(Math.random() * a.length)];
  (function proximo() {
    setTimeout(() => {
      const r = Math.random();
      if (r < 0.05 && Date.now() - ultimoLeao > 45000) { ultimoLeao = Date.now(); testar('lion', pick(NOMES)); }
      else if (r < 0.25) testar('donut', pick(NOMES));
      else testar('rose', pick(NOMES), r < 0.45 ? 2 + Math.floor(Math.random() * 6) : 1);
      proximo();
    }, 2200 + Math.random() * 2600);
  })();
}

/* ---------- Ligação com a live do TikTok ---------- */
let conexao = null, desligando = false, tentando = false, espera = 15000;
async function tentarConectar() {
  if (tentando || desligando) return;
  tentando = true;
  while (!desligando) {
    try {
      setStatus('conectando');
      log(`Conectando na live de @${usuario}...`);
      const st = await conexao.connect();
      log(`✅ Ligado na live de @${usuario} (sala ${st.roomId}). Os presentes já viram frutas!`);
      setStatus('conectado');
      espera = 15000;
      break;
    } catch (e) {
      const msg = String(e?.message || e);
      if (e instanceof UserOfflineError || /offline|not live|isn't live|ended/i.test(msg)) {
        setStatus('aguardando');
        log(`⏳ @${usuario} ainda não está ao vivo. Confiro de novo a cada 30 segundos...`);
        try { await conexao.waitUntilLive(30); } catch { await dormir(30000); }
      } else {
        setStatus('erro', msg.slice(0, 120));
        log(`❌ Não consegui conectar: ${msg.slice(0, 200)}`);
        if (/room ?id/i.test(msg)) log(`   Confira se o usuário "${usuario}" está certo no config.json e se a live já está aberta.`);
        log(`   Tento de novo em ${espera / 1000} segundos.`);
        await dormir(espera);
        espera = Math.min(espera * 2, 120000);
      }
    }
  }
  tentando = false;
}

function ligarNaLive() {
  if (DEMO) { log('🧪 Modo teste: chegam presentes de mentira a cada poucos segundos.'); iniciarDemo(); return; }
  if (SEM_USUARIO) {
    log('⚠️  Falta o seu usuário. Abra o arquivo config.json e troque "seu_usuario_aqui" pelo seu @ do TikTok (sem o @).');
    log('   Enquanto isso, os botões de teste da página continuam funcionando.');
    return;
  }
  const opcoes = { processInitialData: false, enableExtendedGiftInfo: false }; // a lista completa de presentes exige plano pago no Euler Stream; o nome e o valor já vêm em cada presente
  if (config.chave_euler) opcoes.signApiKey = String(config.chave_euler);
  conexao = new TikTokLiveConnection(usuario, opcoes);
  conexao.on(WebcastEvent.GIFT, d => { try { processarPresente(d); } catch (e) { log('Erro ao ler um presente:', e.message); } });
  conexao.on(WebcastEvent.LIKE, d => { try { processarCurtidas(d); } catch { /* ignora */ } });
  conexao.on(WebcastEvent.STREAM_END, () => log('📴 A live terminou.'));
  conexao.on(ControlEvent.ERROR, e => { if (!tentando) log('⚠️  Aviso da conexão:', String(e?.message || e?.info || e).slice(0, 200)); });
  conexao.on(ControlEvent.DISCONNECTED, () => {
    if (desligando) return;
    setStatus('reconectando');
    log('🔌 A conexão com a live caiu. Tento de novo em 10 segundos...');
    setTimeout(tentarConectar, 10000);
  });
  tentarConectar();
}

server.on('error', e => {
  if (e.code === 'EADDRINUSE') {
    console.error(`❌ A porta ${PORTA} já está em uso. Feche a outra janela do programa ou mude "porta" no config.json.`);
    process.exit(1);
  }
  throw e;
});
server.listen(PORTA, '127.0.0.1', () => {
  console.log('');
  console.log('🐍  Cobrinha do Jardim ligada!');
  console.log(`    Pra testar no navegador:   http://localhost:${PORTA}`);
  console.log(`    Pra colocar na live:       http://localhost:${PORTA}/#live`);
  console.log('    Deixe esta janela aberta durante toda a live. Para desligar: Ctrl + C.');
  console.log('');
  ligarNaLive();
});

process.on('SIGINT', () => {
  desligando = true;
  try { conexao?.disconnect(); } catch { /* ignora */ }
  log('Até a próxima live! 👋');
  process.exit(0);
});
