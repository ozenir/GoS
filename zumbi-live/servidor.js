// Herói contra Hordas: liga o jogo na sua live do TikTok.
// Este programa lê a live (comentários, presentes, curtidas, quem segue e quem compartilha) e manda para o jogo,
// que roda no navegador.
//
//   node servidor.js            -> liga na live do usuário do config.json
//   node servidor.js --demo     -> modo teste, com público de mentira (não precisa estar ao vivo)
//   node servidor.js fulano     -> liga na live de @fulano (ignora o config.json)

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WebSocketServer } from 'ws';
import { TikTokLiveConnection, WebcastEvent, ControlEvent, UserOfflineError } from 'tiktok-live-connector';
import { pessoa, textoDoComentario, curtidasDe } from './leitura.js';
import { acharRegra, planoDoPresente, PARCELA } from './presentes.js';
import { lerVoto, lerEscolha, OPCOES } from './public/js/core/votacao.js';

const DIR = path.dirname(fileURLToPath(import.meta.url));
let VERSAO = '?';
try { VERSAO = JSON.parse(fs.readFileSync(path.join(DIR, 'package.json'), 'utf8')).version; } catch { /* ignora */ }
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
const PORTA = Number(config.porta) || 8081;
const SEM_USUARIO = !usuario || usuario === 'seu_usuario_aqui';

/* ---------- Página do jogo + canal com o navegador ---------- */
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp3': 'audio/mpeg' };
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
  c.send(JSON.stringify({
    type: 'estado', ...status, rank: topRank(), versao: VERSAO,
    jogo: config.jogo || {}, som: config.som || {},
    presentes: config.presentes?.por_nome || {},
    seguir: config.seguir || null, compartilhar: config.compartilhar || null
  }));
  c.on('message', raw => {
    let m; try { m = JSON.parse(String(raw)); } catch { return; }
    if (!m) return;
    if (m.type === 'teste') testarPresente(m.presente, m.nome, Math.min(50, Math.max(1, Number(m.vezes) || 1)));
    else if (m.type === 'teste_chat') processarChat({ user: { uniqueId: 'teste_' + String(m.nome || 'voce'), nickname: String(m.nome || 'você (teste)') }, comment: String(m.texto || '') });
    else if (m.type === 'teste_evento') testarEvento(m.evento, m.nome);
  });
});

/* ---------- Quem é quem: leitura.js (aceita o formato novo e o antigo das mensagens da live) ---------- */

/* ---------- Ranking da live: quem mais ajudou e quem mais atrapalhou ---------- */
// Efeitos que atrapalham o herói. Todo o resto ajuda.
const ATRAPALHA = new Set(['zumbis', 'vidro', 'horda', 'explosivo', 'alarme', 'trem', 'chefao', 'rei']);
const ranking = { ajuda: new Map(), atrapalha: new Map() };
function somar(lado, p, moedas) {
  const m = ranking[lado];
  const r = m.get(p.id) || { id: p.id, nick: p.nick, coins: 0, avatar: '' };
  r.nick = p.nick; r.coins += moedas; if (p.avatar) r.avatar = p.avatar; m.set(p.id, r);
}
const top = m => [...m.values()].sort((a, b) => b.coins - a.coins).slice(0, 3);
const topRank = () => ({ ajuda: top(ranking.ajuda), atrapalha: top(ranking.atrapalha) });

/* ---------- Presente -> efeito no jogo ---------- */
const avisados = new Set();
function regraPara(nome, moedas) {
  const p = config.presentes || {};
  const achada = acharRegra(p.por_nome || {}, nome);   // presentes.js: nome, nome em português ou "aliases"
  if (achada) return achada;
  // presente fora da tabela: avisa na janela (uma vez por nome), pra dar pra cadastrar no config.json
  if (nome && !avisados.has(nome)) { avisados.add(nome); log(`🎁 presente sem regra no config.json: "${nome}" (${moedas} moedas) → efeito sorteado do mesmo preço (ou parcelas, se for caro)`); }
  const regras = [...(p.por_moedas || [])].sort((a, b) => a.a_partir_de - b.a_partir_de);
  let r = null;
  for (const x of regras) if (moedas >= x.a_partir_de) r = x;
  return r || { efeito: 'cura', valor: 10 };
}

// Presentes de combo (giftType 1, como a Rosa) chegam várias vezes enquanto a pessoa toca.
// Guardamos quanto de cada combo já foi contado e só mandamos a diferença, então nada é contado duas vezes.
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
  const p = pessoa(d.user);
  const imagem = g.image?.urlList?.[0] || det.giftImage?.giftPictureUrl || ext.image?.url_list?.[0] || '';
  const total = Math.max(1, Number(d.repeatCount) || 1);

  let qtd = total;
  if (tipo === 1) {
    const chave = `${p.id}|${d.giftId ?? nome}|${d.groupId ?? ''}`;
    const c = combos.get(chave);
    const jaContado = c ? c.ultimo : 0;
    qtd = total - jaContado;
    if (d.repeatEnd) combos.delete(chave);
    else combos.set(chave, { ultimo: Math.max(total, jaContado), t: Date.now() });
    if (qtd <= 0) return;
  }

  regraPara(nome, moedas);   // (só pra avisar na janela se o presente não está na tabela)
  // presentes.js: da tabela → efeito dele; fora da tabela (até 5 moedas) → efeito sorteado do mesmo preço;
  // mais caro → parcelas de 5 moedas, uma a cada 30 s
  const plano = planoDoPresente(config.presentes?.por_nome || {}, nome, moedas, qtd);
  if (plano.length > 1 && plano[0].parcela) log(`🎁 ${p.nick} mandou ${qtd}x ${nome} (${moedas} moedas cada) → ${plano.length} parcelas de ${PARCELA.moedas} moedas, uma a cada ${PARCELA.intervalo} s`);
  for (const parte of plano) {
    const mandar = () => {
      const regra = parte.parcela ? { ...parte.regra, parcela: parte.parcela } : parte.regra;
      const lado = ATRAPALHA.has(regra.efeito) ? 'atrapalha' : 'ajuda';
      somar(lado, p, parte.coins * parte.count);
      log(`🎁 ${p.nick} mandou ${parte.count}x ${nome}${parte.parcela ? ` (parcela ${parte.parcela})` : ''} (${parte.coins} moeda${parte.coins === 1 ? '' : 's'}) → ${regra.efeito}${parte.sorteado ? ' sorteado' : ''} (${lado})`);
      enviar({ type: 'presente', ...p, giftName: nome, image: imagem, count: parte.count, coins: parte.coins, regra, lado, rank: topRank() });
    };
    if (parte.atraso > 0) setTimeout(mandar, parte.atraso * 1000).unref?.(); else mandar();
  }
}

/* ---------- Comentários, entradas, seguidores, compartilhamentos e curtidas ---------- */
function processarChat(d, mostrar = true) {
  const texto = textoDoComentario(d);
  if (!texto) return;
  const p = pessoa(d.user);
  // Mostra na janela preta: assim dá pra ver que o comentário chegou e se ele virou voto
  if (mostrar) {
    const voto = lerVoto(texto), letra = lerEscolha(texto);
    const extra = voto ? `  → voto ${OPCOES[voto].n} ${OPCOES[voto].nome}` : letra ? `  → habilidade ${letra.toUpperCase()}` : '';
    log(`💬 ${p.nick}: ${texto}${extra}`);
  }
  enviar({ type: 'chat', ...p, texto });
}
function processarEntrada(d) { enviar({ type: 'entrou', ...pessoa(d.user) }); }
const jaSeguiu = new Set();
function processarSeguir(d) {
  const p = pessoa(d.user);
  if (jaSeguiu.has(p.id)) return; // o TikTok às vezes repete o aviso
  jaSeguiu.add(p.id);
  log(`➕ ${p.nick} começou a seguir`);
  enviar({ type: 'seguiu', ...p, regra: config.seguir || null });
}
function processarCompartilhar(d) {
  const p = pessoa(d.user);
  log(`🔁 ${p.nick} compartilhou a live`);
  enviar({ type: 'compartilhou', ...p, regra: config.compartilhar || null });
}
// Curtidas chegam aos montes: juntamos e mandamos uma vez por segundo.
let curtidasPendentes = 0;
function processarCurtidas(d) { curtidasPendentes += curtidasDe(d); }
setInterval(() => {
  if (curtidasPendentes <= 0) return;
  enviar({ type: 'curtidas', qtd: curtidasPendentes });
  curtidasPendentes = 0;
}, 1000).unref();

/* ---------- Testes (botões da página e modo --demo) ---------- */
let seq = 0;
function testarPresente(nomePresente, nome, vezes = 1) {
  const regra = config.presentes?.por_nome?.[nomePresente];
  if (!regra) return;
  const moedas = Number(regra.moedas) || 1;
  const g = { name: nomePresente, diamondCount: moedas, type: moedas < 100 ? 1 : 2 };
  const nick = String(nome || 'você (teste)').slice(0, 24);
  const user = { uniqueId: 'teste_' + nick.replace(/[^\w.]+/g, ''), nickname: nick };
  const base = { gift: g, user, giftId: nomePresente, groupId: 'teste' + (++seq) };
  if (g.type === 1) {
    for (let i = 1; i <= vezes; i++) setTimeout(() => processarPresente({ ...base, repeatCount: i, repeatEnd: 0 }), (i - 1) * 280);
    setTimeout(() => processarPresente({ ...base, repeatCount: vezes, repeatEnd: 1 }), vezes * 280 + 400);
  } else processarPresente({ ...base, repeatCount: 1, repeatEnd: 1 });
}
function testarEvento(evento, nome) {
  const nick = String(nome || 'você (teste)').slice(0, 24);
  const user = { uniqueId: 'teste_' + nick.replace(/[^\w.]+/g, '') + (evento === 'seguiu' ? '_' + (++seq) : ''), nickname: nick };
  if (evento === 'seguiu') processarSeguir({ user });
  else if (evento === 'compartilhou') processarCompartilhar({ user });
  else if (evento === 'entrou') processarEntrada({ user });
  else if (evento === 'curtidas') processarCurtidas({ likeCount: 100 });
}

const NOMES = ['ana.lu', 'pedrinho_gamer', 'mari.flor', 'joaovictor', 'bia.santos', 'lucas_rs', 'tia.cida', 'rafa99', 'gabi.oliveira', 'duda.m', 'caio.zl', 'leticia_br', 'thiaguinho', 'nanda.s'];
const FALAS = ['kkkkk', 'corre!!', 'atira nele', 'vai herói', 'nãooo', 'que isso', 'boa!', 'socorro', '🔥🔥', 'manda o leão', 'g'];   // 'g' abre o gráfico de atributos
const VOTOS = ['1', '2', '3', '4', '5', 'esquerda', 'direita', 'frente', 'entrar', 'voltar', 'e', 'd', 'f', 'a', 'b', 'c'];
function iniciarDemo() {
  const pick = a => a[Math.floor(Math.random() * a.length)];
  const presentes = Object.entries(config.presentes?.por_nome || {});
  // Peso de cada presente no modo teste: os baratos aparecem muito mais que os caros.
  const pesos = presentes.map(([, r]) => 1 / Math.pow(Math.max(1, Number(r.moedas) || 1), 0.55));
  const somaPesos = pesos.reduce((a, b) => a + b, 0);
  let ultimoCaro = Date.now();
  function presenteAleatorio() {
    let r = Math.random() * somaPesos;
    for (let i = 0; i < presentes.length; i++) { r -= pesos[i]; if (r <= 0) return presentes[i]; }
    return presentes[0];
  }
  (function chat() {
    setTimeout(() => {
      const nome = pick(NOMES);
      processarChat({ user: { uniqueId: 'demo_' + nome, nickname: nome }, comment: Math.random() < 0.7 ? pick(VOTOS) : pick(FALAS) }, false);
      chat();
    }, 700 + Math.random() * 2200);
  })();
  (function presentesLoop() {
    setTimeout(() => {
      let [nome, regra] = presenteAleatorio();
      // No máximo um presente bem caro (mil moedas ou mais) a cada 40 segundos, pra dar pra ver o resto.
      if ((Number(regra.moedas) || 0) >= 1000 && Date.now() - ultimoCaro < 40000) [nome, regra] = presentes[0];
      if ((Number(regra.moedas) || 0) >= 1000) ultimoCaro = Date.now();
      testarPresente(nome, pick(NOMES), (Number(regra.moedas) || 1) < 100 && Math.random() < 0.3 ? 2 + Math.floor(Math.random() * 4) : 1);
      presentesLoop();
    }, 2500 + Math.random() * 3500);
  })();
  (function outros() {
    setTimeout(() => {
      const r = Math.random();
      if (r < 0.35) testarEvento('entrou', pick(NOMES));
      else if (r < 0.5) testarEvento('seguiu', pick(NOMES));
      else if (r < 0.6) testarEvento('compartilhou', pick(NOMES));
      else processarCurtidas({ likeCount: 5 + Math.floor(Math.random() * 40) });
      outros();
    }, 1500 + Math.random() * 3000);
  })();
}

/* ---------- Ligação com a live do TikTok ---------- */
let conexao = null, desligando = false, tentando = false, espera = 15000;
let avisouSemLive = false;
async function tentarConectar() {
  if (tentando || desligando) return;
  tentando = true;
  while (!desligando) {
    try {
      setStatus('conectando');
      log(`Conectando na live de @${usuario}...`);
      const st = await conexao.connect();
      log(`✅ Ligado na live de @${usuario} (sala ${st.roomId}). Comentários e presentes já chegam no jogo!`);
      setStatus('conectado');
      espera = 15000;
      break;
    } catch (e) {
      const msg = String(e?.message || e);
      const motivos = (e?.config?.requestErrs || []).map(x => String(x?.message || x).slice(0, 160));
      const tudo = motivos.join(' ');
      // Sem live aberta, o TikTok responde "user_not_found" ao procurar a sala: é o mesmo que "ainda não está ao vivo".
      const semLive = /user_not_found/i.test(tudo);
      if (e instanceof UserOfflineError || semLive || /offline|not live|isn't live|ended/i.test(msg)) {
        setStatus('aguardando');
        log(`⏳ @${usuario} ainda não está ao vivo (o TikTok não achou nenhuma live aberta). Confiro de novo a cada 30 segundos...`);
        if (semLive && !avisouSemLive) {
          avisouSemLive = true;
          log('   Já está ao vivo e continua aparecendo isso depois de 1 minuto? Confira se o @ no config.json é o mesmo da conta que está fazendo a live.');
        }
        if (semLive) await dormir(30000);
        else { try { await conexao.waitUntilLive(30); } catch { await dormir(30000); } }
      } else {
        setStatus('erro', msg.slice(0, 120));
        log(`❌ Não consegui conectar: ${msg.slice(0, 200)}`);
        motivos.forEach((m, i) => log(`   motivo ${i + 1}: ${m}`));
        if (/blocked|captcha/i.test(tudo)) log('   ➜ O TikTok pode estar bloqueando este computador. Tente outra internet (ex.: o 4G do celular) ou use a chave do Euler Stream.');
        else if (/lack of permission|401|402|403/i.test(tudo) && !config.chave_euler) log('   ➜ Coloque a chave grátis do Euler Stream em "chave_euler" no config.json (veja o LEIA-ME, "Problemas comuns").');
        log(`   Tento de novo em ${espera / 1000} segundos.`);
        await dormir(espera);
        espera = Math.min(espera * 2, 120000);
      }
    }
  }
  tentando = false;
}

function protegido(nome, fn) {
  return d => { try { fn(d); } catch (e) { log(`Erro ao ler ${nome}:`, e.message); } };
}

function ligarNaLive() {
  if (DEMO) { log('🧪 Modo teste: chegam comentários, votos e presentes de mentira a cada poucos segundos.'); iniciarDemo(); return; }
  if (SEM_USUARIO) {
    log('⚠️  Falta o seu usuário. Abra o arquivo config.json e troque "seu_usuario_aqui" pelo seu @ do TikTok (sem o @).');
    log('   Enquanto isso, os botões de teste da página continuam funcionando.');
    return;
  }
  const opcoes = { processInitialData: false, enableExtendedGiftInfo: false }; // a lista completa de presentes exige plano pago no Euler Stream; o nome e o valor já vêm em cada presente
  if (config.chave_euler) opcoes.signApiKey = String(config.chave_euler);
  conexao = new TikTokLiveConnection(usuario, opcoes);
  conexao.on(WebcastEvent.GIFT, protegido('um presente', processarPresente));
  conexao.on(WebcastEvent.CHAT, protegido('um comentário', processarChat));
  conexao.on(WebcastEvent.MEMBER, protegido('uma entrada', processarEntrada));
  conexao.on(WebcastEvent.FOLLOW, protegido('um seguidor', processarSeguir));
  conexao.on(WebcastEvent.SHARE, protegido('um compartilhamento', processarCompartilhar));
  conexao.on(WebcastEvent.LIKE, protegido('curtidas', processarCurtidas));
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
    console.error(`❌ A porta ${PORTA} já está em uso: o programa ANTIGO ainda está aberto e continua rodando no lugar deste.`);
    console.error('   Feche a outra janela preta (ou reinicie o computador) e abra de novo.');
    process.exit(1);
  }
  throw e;
});
server.listen(PORTA, '127.0.0.1', () => {
  console.log('');
  console.log(`🧟  Herói contra Hordas ligado!  (versão ${VERSAO})`);
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
