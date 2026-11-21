// Liga tudo: jogo + desenho + painel + som + conexão com o programa da live + botões de teste.
import { Jogo } from './core/jogo.js';
import { clamp, dist2 } from './core/util.js';
import { ZUMBIS } from './core/dados.js';
import { ladoDo } from './core/efeitos.js';
import { Render } from './view/render.js';
import { Hud } from './view/hud.js';
import { Som } from './view/som.js';
import { PRESENTES_PADRAO, SEGUIR_PADRAO, COMPARTILHAR_PADRAO, JOGO_PADRAO } from './catalogo.js';

const $ = id => document.getElementById(id);
const live = location.hash === '#live';
if (live) document.body.classList.add('live');
const isLocal = /^(localhost|127\.0\.0\.1)$/.test(location.hostname);

/* ---------- guardados no navegador (recorde, hall dos heróis, número do sobrevivente) ---------- */
const guardado = (k, padrao) => { try { const v = JSON.parse(localStorage.getItem('hch.' + k)); return v ?? padrao; } catch { return padrao; } };
const guardar = (k, v) => { try { localStorage.setItem('hch.' + k, JSON.stringify(v)); } catch { /* sem armazenamento: tudo bem */ } };

const jogo = new Jogo({ recorde: guardado('recorde', 0), hall: guardado('hall', []), heroiN: guardado('heroiN', 0), historiaVista: guardado('historia', []) });
jogo.configurar(JOGO_PADRAO);
const render = new Render($('game'), $('texto'));
const hud = new Hud();
const som = new Som();
let catalogo = PRESENTES_PADRAO;
let regraSeguir = SEGUIR_PADRAO, regraCompartilhar = COMPARTILHAR_PADRAO;
hud.setLegenda(catalogo, regraSeguir, regraCompartilhar, jogo.cfg.likesPor);
hud.rank({ ajuda: [], atrapalha: [] });
window.jogo = jogo; // para testes

/* ---------- tamanho da tela ---------- */
const frame = $('frame'), stage = $('stage');
function fit() {
  const r = stage.getBoundingClientRect();
  let h = r.height, w = h * 9 / 16;
  if (w > r.width) { w = r.width; h = w * 16 / 9; }
  frame.style.width = Math.floor(w) + 'px'; frame.style.height = Math.floor(h) + 'px';
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const tc = $('texto');
  tc.width = Math.round(Math.floor(w) * dpr); tc.height = Math.round(Math.floor(h) * dpr);
}
window.addEventListener('resize', fit); fit();

/* ---------- conexão com o programa ---------- */
let ws = null;
function setConn(s, txt) { const c = $('conn'); c.dataset.s = s; c.textContent = txt; }
function mostrarStatus(m) {
  const s = m.status;
  const txt = {
    conectado: [`on`, `Ligado na live de @${m.usuario}`],
    demo: ['on', 'Modo teste (público de mentira)'],
    aguardando: ['wait', `Esperando @${m.usuario} entrar ao vivo...`],
    conectando: ['wait', 'Conectando na live...'],
    reconectando: ['wait', 'Reconectando na live...'],
    sem_usuario: ['err', 'Falta o usuário no config.json'],
    erro: ['err', 'Erro ao conectar na live']
  }[s] || ['off', s];
  setConn(txt[0], txt[1]);
  $('sem-rede').hidden = !(live && (s === 'reconectando' || s === 'erro'));
}
function aplicarEstado(m) {
  if (m.jogo) { jogo.configurar(m.jogo); }
  if (m.presentes && Object.keys(m.presentes).length) catalogo = m.presentes;
  if (m.seguir !== undefined) regraSeguir = m.seguir;
  if (m.compartilhar !== undefined) regraCompartilhar = m.compartilhar;
  if (m.som) { som.volumes(Number(m.som.volume_musica), Number(m.som.volume_efeitos)); if (m.som.ligado === false) som.setOn(false); atualizarBotaoSom(); }
  hud.setLegenda(catalogo, regraSeguir, regraCompartilhar, jogo.cfg.likesPor);
  montarBotoes();
}
function conectar() {
  if (!isLocal) { setConn('off', 'Sem programa: só os botões de teste funcionam'); return; }
  try { ws = new WebSocket(`ws://${location.host}/ws`); } catch { setConn('off', 'Sem conexão com o programa'); return; }
  ws.onmessage = e => {
    let m; try { m = JSON.parse(e.data); } catch { return; }
    if (m.type === 'estado') { aplicarEstado(m); hud.rank(m.rank); mostrarStatus(m); }
    else if (m.type === 'status') mostrarStatus(m);
    else {
      if (m.rank) hud.rank(m.rank);
      jogo.handle(m);
    }
  };
  ws.onclose = () => { ws = null; setConn('off', 'Programa desligado. Tentando de novo...'); setTimeout(conectar, 3000); };
}
const conectado = () => ws && ws.readyState === 1;

/* ---------- botões de teste ---------- */
const NOMES = ['ana.lu', 'pedrinho_gamer', 'mari.flor', 'joaovictor', 'bia.santos', 'lucas_rs', 'tia.cida', 'rafa99', 'gabi.oliveira', 'duda.m'];
const pick = a => a[Math.floor(Math.random() * a.length)];
// ranking local quando não tem programa (o programa faz o dele)
const rankLocal = { ajuda: new Map(), atrapalha: new Map() };
function presenteTeste(nome, quem = 'você (teste)', vezes = 1) {
  if (conectado()) { ws.send(JSON.stringify({ type: 'teste', presente: nome, nome: quem, vezes })); return; }
  const regra = catalogo[nome]; if (!regra) return;
  const lado = ladoDo(regra);
  const r = rankLocal[lado].get(quem) || { nick: quem, coins: 0, avatar: '' };
  r.coins += (regra.moedas || 1) * vezes; rankLocal[lado].set(quem, r);
  const top = m => [...m.values()].sort((a, b) => b.coins - a.coins).slice(0, 3);
  hud.rank({ ajuda: top(rankLocal.ajuda), atrapalha: top(rankLocal.atrapalha) });
  jogo.handle({ type: 'presente', id: 'local_' + quem, nick: quem, avatar: '', giftName: nome, count: vezes, coins: regra.moedas || 1, regra });
}
function chatTeste(texto, quem) {
  quem = quem || pick(NOMES);
  if (conectado()) ws.send(JSON.stringify({ type: 'teste_chat', nome: quem, texto }));
  else jogo.handle({ type: 'chat', id: 'local_' + quem, nick: quem, texto });
}
function eventoTeste(evento, quem = 'você (teste)') {
  if (conectado()) { ws.send(JSON.stringify({ type: 'teste_evento', evento, nome: quem })); return; }
  if (evento === 'curtidas') jogo.handle({ type: 'curtidas', qtd: 100 });
  else if (evento === 'seguiu') jogo.handle({ type: 'seguiu', id: 'local_' + quem + Math.random(), nick: quem, regra: regraSeguir });
  else if (evento === 'compartilhou') jogo.handle({ type: 'compartilhou', id: 'local_' + quem, nick: quem, regra: regraCompartilhar });
}
function montarBotoes() {
  const box = $('t-presentes');
  box.innerHTML = '<span class="grupo-t">Presentes</span>';
  for (const [nome, r] of Object.entries(catalogo).sort((a, b) => (a[1].moedas || 0) - (b[1].moedas || 0))) {
    const b = document.createElement('button');
    b.className = 'btn ' + ladoDo(r);
    b.title = `${r.nome || nome} (${r.moedas || '?'} moedas)`;
    b.innerHTML = `${r.emoji || '🎁'} <small>${r.moedas || ''}</small>`;
    b.addEventListener('click', () => presenteTeste(nome));
    box.appendChild(b);
  }
}
montarBotoes();
document.querySelectorAll('[data-voto]').forEach(b => b.addEventListener('click', () => chatTeste(b.dataset.voto, 'você ' + Math.floor(Math.random() * 1000))));
document.querySelectorAll('[data-evento]').forEach(b => b.addEventListener('click', () => eventoTeste(b.dataset.evento)));
$('b-matar').addEventListener('click', () => { if (jogo.fase === 'jogo') jogo.ferirHeroi(9999, { nick: 'você (teste)' }, 'o botão de teste'); });
window.addEventListener('keydown', e => {
  if (e.target.closest('input')) return;
  if (['1', '2', '3', '4'].includes(e.key)) chatTeste(e.key, 'você ' + Math.floor(Math.random() * 1000));
});

/* ---------- modo "só o jogo": esconde os botões de teste ---------- */
function foco(on) { document.body.classList.toggle('foco', on); $('b-sair-foco').hidden = !on || live; requestAnimationFrame(fit); }
$('b-foco').addEventListener('click', () => foco(true));
$('b-sair-foco').addEventListener('click', () => foco(false));

/* ---------- público simulado (prévia sem programa) ---------- */
const simEl = $('sim-toggle');
simEl.checked = !isLocal && !live;
(function simLoop() {
  setTimeout(() => {
    if (simEl.checked && !document.hidden) {
      const r = Math.random();
      if (r < 0.55) chatTeste(pick(['1', '2', '3', '4', '1', '2']), pick(NOMES));
      else if (r < 0.85) {
        const lista = Object.entries(catalogo);
        const pesos = lista.map(([, x]) => 1 / Math.pow(Math.max(1, x.moedas || 1), 0.6));
        let s = Math.random() * pesos.reduce((a, b) => a + b, 0), i = 0;
        for (; i < lista.length - 1; i++) { s -= pesos[i]; if (s <= 0) break; }
        if ((lista[i][1].moedas || 0) < 1000 || Math.random() < 0.3) presenteTeste(lista[i][0], pick(NOMES));
      } else if (r < 0.93) eventoTeste('curtidas');
      else eventoTeste(Math.random() < 0.5 ? 'seguiu' : 'compartilhou', pick(NOMES));
    }
    simLoop();
  }, 900 + Math.random() * 1500);
})();

/* ---------- som ---------- */
const sndBtn = $('b-som');
function atualizarBotaoSom() { sndBtn.textContent = som.on ? '🔊 Som ligado' : '🔇 Som desligado'; }
sndBtn.addEventListener('click', () => { som.unlock(); som.setOn(!som.on); atualizarBotaoSom(); });
['pointerdown', 'keydown'].forEach(ev => window.addEventListener(ev, () => som.unlock()));
som.unlock();
setInterval(() => { $('snd-hint').hidden = !(live && som.on && !som.running); }, 1000);

function tocar(e, g) {
  switch (e.type) {
    case 'tiro': if (e.heroi) som.tiro(e.arma); else som.tiroAliado(); break;
    case 'chama': som.chama(); break;
    case 'acerto': som.acerto(); break;
    case 'golpe': som.golpe(e.taco); break;
    case 'morte_zumbi': som.morteZumbi(e.chefe); break;
    case 'gemido': if (dist2(e.x, e.y, g.hero.x, g.hero.y) < 100) som.gemido(e.tipo); break;
    case 'mordida': som.mordida(e.chefe); break;
    case 'explosao': som.explosao(); break;
    case 'cura': som.cura(); break;
    case 'municao': som.municao(); break;
    case 'colete_ganhou': som.colete(); break;
    case 'colete': som.bloqueio(); break;
    case 'bau': som.bau(e.raridade === 'lendario'); break;
    case 'pegou': som.item(); break;
    case 'item_pousou': som.pousou(); break;
    case 'nivel': som.nivel(); break;
    case 'presente': som.presente(e.lado); break;
    case 'voto': som.voto(); break;
    case 'decisao': som.decisao(); break;
    case 'entrou_predio': case 'saiu_predio': som.porta(); break;
    case 'virou': som.virou(); break;
    case 'chefe': som.chefe(e.tipo === 'rei'); break;
    case 'alarme': som.alarme(e.sala ? 4 : 6); break;
    case 'latido': som.latido(); break;
    case 'vidro_pisou': som.vidro(); break;
    case 'helicoptero': som.helicoptero(); break;
    case 'heroi_morreu': som.morteHeroi(); break;
    case 'novo_heroi': som.novoHeroi(); break;
    case 'recorde': som.recorde(); break;
    case 'noite': som.noite(); break;
    case 'historia': som.historia(); break;
    case 'ambiente': som.ambiente(e.tipo); break;
    case 'caminho': if (e.tipo === 'perigoso') som.perigo(); else som.livre(); break;
  }
}

/* ---------- laço ---------- */
let ultimo = performance.now(), acc = 0, coracaoT = 0, ultimoSeg = -1;
const PASSO = 1 / 60;
function loop(agora) {
  const dt = Math.min(0.1, (agora - ultimo) / 1000); ultimo = agora;
  acc += dt;
  let n = 0;
  while (acc >= PASSO && n < 6) { jogo.update(PASSO); acc -= PASSO; n++; }
  if (n === 6) acc = 0;
  for (const e of jogo.drainEvents()) {
    try {
      render.evento(e, jogo);
      hud.evento(e, jogo);
      tocar(e, jogo);
      if (e.type === 'heroi_morreu') { guardar('recorde', jogo.recorde); guardar('hall', jogo.hall); }
      if (e.type === 'novo_heroi') guardar('heroiN', jogo.heroiN);
      if (e.type === 'historia') guardar('historia', jogo.historia.lista());
    } catch (err) { console.error('evento', e.type, err); }
  }
  render.draw(jogo, dt);
  hud.update(jogo, dt);
  // som de perigo
  const h = jogo.hero;
  const pct = h.vida / h.vidaMax;
  let perto = 0, chefe = 0;
  for (const z of jogo.zumbis) if (!z.morto && dist2(z.x, z.y, h.x, h.y) < 36) { perto++; if (ZUMBIS[z.tipo].chefe) chefe = 1; }
  som.musica(jogo.fase === 'jogo' ? clamp(perto / 18 + (1 - pct) * 0.4 + (jogo.noiteT > 0 ? 0.25 : 0) + chefe * 0.4, 0, 1) : 0, dt);
  if (jogo.fase === 'jogo' && pct < 0.3) { coracaoT -= dt; if (coracaoT <= 0) { coracaoT = pct < 0.15 ? 0.55 : 0.85; som.coracao(); } }
  // tique dos últimos segundos da votação
  const v = jogo.voto;
  if (v && v.aberta && !jogo.room) { const s = Math.ceil(v.restante); if (s !== ultimoSeg && s <= 3 && s > 0) som.tique(true); ultimoSeg = s; } else ultimoSeg = -1;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
conectar();
