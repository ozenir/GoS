// Liga tudo: jogo + desenho + painel + som + conexão com o programa da live + botões de teste.
import { Jogo } from './core/jogo.js';
import { clamp, dist2 } from './core/util.js';
import { ZUMBIS } from './core/dados.js';
import { ladoDo } from './core/efeitos.js';
import { Render } from './view/render.js';
import { Hud } from './view/hud.js';
import { Som } from './view/som.js';
import { Sujeira } from './view/sujeira.js';
import { TelaFX } from './view/tela.js';
import { ZUMBIS_TELA } from './core/tela.js';
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
const sujeira = new Sujeira($('sujeira'));   // tomate no vidro (zumbi do tomate)
// zumbis da tela (core/tela.js): a arte fica em view/tela.js; a camada de baixo fica por baixo do painel
const telaFX = new TelaFX({ cima: $('sujeira'), baixo: $('tela-baixo'), jogo: [$('game'), $('texto')], sujeira, render, som: id => som.telaSom(id) });
window.telaFX = telaFX;
let catalogo = PRESENTES_PADRAO;
let regraSeguir = SEGUIR_PADRAO, regraCompartilhar = COMPARTILHAR_PADRAO;
hud.setLegenda(catalogo, regraSeguir, regraCompartilhar, jogo.cfg.likesPor);
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
let versaoPrograma = null;
function conectar() {
  if (!isLocal) { setConn('off', 'Sem programa: só os botões de teste funcionam'); return; }
  try { ws = new WebSocket(`ws://${location.host}/ws`); } catch { setConn('off', 'Sem conexão com o programa'); return; }
  ws.onmessage = e => {
    let m; try { m = JSON.parse(e.data); } catch { return; }
    if (m.type === 'estado') {
      // o programa foi atualizado com esta janela aberta: recarrega pra pegar a versão nova do jogo
      if (versaoPrograma && m.versao && m.versao !== versaoPrograma) { location.reload(); return; }
      versaoPrograma = m.versao || versaoPrograma;
      aplicarEstado(m); jogo.definirRanking(m.rank); mostrarStatus(m);
    }
    else if (m.type === 'status') mostrarStatus(m);
    else {
      jogo.handle(m);   // (m.rank, quando vem, move o cabo de guerra)
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
  jogo.handle({ rank: { ajuda: top(rankLocal.ajuda), atrapalha: top(rankLocal.atrapalha) }, type: 'presente', id: 'local_' + quem, nick: quem, avatar: '', giftName: nome, count: vezes, coins: regra.moedas || 1, regra });
}
function chatTeste(texto, quem) {
  quem = quem || pick(NOMES);
  if (conectado()) ws.send(JSON.stringify({ type: 'teste_chat', nome: quem, texto }));
  else jogo.handle({ type: 'chat', id: 'local_' + quem, nick: quem, texto });
}
function eventoTeste(evento, quem = 'você (teste)') {
  if (conectado()) { ws.send(JSON.stringify({ type: 'teste_evento', evento, nome: quem })); return; }
  if (evento === 'curtidas') jogo.handle({ type: 'curtidas', qtd: 100 });
  else if (evento === 'entrou') jogo.handle({ type: 'entrou', id: 'local_' + quem, nick: quem });
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
$('b-portal').addEventListener('click', () => jogo.abrirPortal(true));
// zumbis da tela: um botão pra cada (o zumbi aparece perto e faz o efeito) e o limpador
{
  const box = $('t-tela');
  for (const [id, Zt] of Object.entries(ZUMBIS_TELA)) {
    const b = document.createElement('button');
    b.className = 'btn atrapalha'; b.title = `${Zt.nome} (nível ${Zt.nivel}) · ${Zt.frase}`; b.innerHTML = `${Zt.emoji} <small>${Zt.nivel}</small>`;
    b.addEventListener('click', e => { if (e.shiftKey) jogo.efeitoTela(id, { nick: 'você' }); else jogo.surgirTela(id, { id: 'teste', nick: pick(NOMES) }); });   // shift: só o efeito, na hora
    box.appendChild(b);
  }
  const l = document.createElement('button');
  l.className = 'btn ajuda'; l.title = 'Limpador de para-brisa: limpa a tela'; l.textContent = '🧽 Limpar';
  l.addEventListener('click', () => jogo.emit('limpar_tela', { nick: 'você' }));
  box.appendChild(l);
}   // portal dos 500 na hora (teste)
document.querySelectorAll('[data-voto]').forEach(b => b.addEventListener('click', () => chatTeste(b.dataset.voto, 'você ' + Math.floor(Math.random() * 1000))));
document.querySelectorAll('[data-evento]').forEach(b => b.addEventListener('click', () => eventoTeste(b.dataset.evento, b.dataset.evento === 'entrou' ? pick(NOMES) + Math.floor(Math.random() * 100) : undefined)));
$('b-matar').addEventListener('click', () => jogo.derrubar({ nick: 'você (teste)' }));   // derruba mesmo (sem esquiva, colete, mochila...)
window.addEventListener('keydown', e => {
  if (e.target.closest('input')) return;
  if (['1', '2', '3', '4', '5', 'a', 'b', 'c', 'g', 't'].includes(e.key.toLowerCase())) chatTeste(e.key.toLowerCase(), 'você ' + Math.floor(Math.random() * 1000));   // g = gráfico de atributos
  if (e.key.toLowerCase() === 'p') jogo.abrirPortal(true);   // p = abre o portal dos 500 na hora (teste)
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
      if (r < 0.03) chatTeste('g', pick(NOMES));   // de vez em quando alguém pede o gráfico de atributos
      else if (r < 0.55) chatTeste(jogo.escolha && Math.random() < 0.5 ? pick(['a', 'b', 'c']) : pick(['1', '2', '3', '4', '1', '2']), pick(NOMES));
      else if (r < 0.85) {
        const lista = Object.entries(catalogo);
        const pesos = lista.map(([, x]) => 1 / Math.pow(Math.max(1, x.moedas || 1), 0.6));
        let s = Math.random() * pesos.reduce((a, b) => a + b, 0), i = 0;
        for (; i < lista.length - 1; i++) { s -= pesos[i]; if (s <= 0) break; }
        if ((lista[i][1].moedas || 0) < 1000 || Math.random() < 0.3) presenteTeste(lista[i][0], pick(NOMES));
      } else if (r < 0.9) eventoTeste('curtidas');
      else if (r < 0.93) eventoTeste('entrou', pick(NOMES) + Math.floor(Math.random() * 1000));   // gente entrando na live
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

// distância (em casas) do herói até onde o som aconteceu: a câmera segue o herói (acústica em som.js)
const longe = (e, g, x = e.x, y = e.y) => Number.isFinite(x) ? Math.hypot(x - g.hero.x, y - g.hero.y) : 0;

function tocar(e, g) {
  switch (e.type) {
    case 'tiro': if (e.heroi) som.tiro(e.arma); else som.tiroAliado(longe(e, g)); break;
    case 'chama': som.chama(); break;
    case 'acerto': som.acerto(longe(e, g)); break;
    case 'golpe': som.golpe(e.taco); break;
    case 'morte_zumbi': som.morteZumbi(e.chefe, longe(e, g), e.tipo); break;
    // (as vozes dos zumbis tocam sozinhas, de vez em quando: som.vozes no laço abaixo)
    case 'mordida': som.mordida(e.chefe); break;
    case 'explosao': som.explosao(e.raio, longe(e, g)); break;
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
    case 'entrou_praia': som.perigo(); break;
    case 'praia_vencida': som.recorde(); break;
    case 'virou': som.virou(); break;
    case 'chefe': som.chefe(e.tipo === 'rei' || e.tipo === 'colosso'); break;
    case 'alarme': som.alarme(e.sala ? 4 : 6); break;
    case 'latido': som.latido(longe(e, g)); break;
    case 'vidro_pisou': som.vidro(); break;
    case 'helicoptero': som.helicoptero(); break;
    case 'heroi_morreu': som.morteHeroi(); break;
    case 'caiu': som.caiu(); break;
    case 'raio': som.zap(); break;
    case 'lobo_pulou': som.rosnado(longe(e, g)); break;
    case 'grito': som.grito(longe(e, g)); break;
    case 'braco': som.esticar(longe(e, g)); break;
    case 'horda_quadra': som.perigo(); break;
    case 'segundo_folego': som.onda(); break;
    case 'item_caindo': if (e.kind === 'drop') som.paraquedas(longe(e, g)); break;
    case 'drop': som.drop(e.pilhas); break;
    case 'inspiracao': som.inspiracao(); break;
    case 'inspiracao_pulso': som.pulso(); break;
    case 'colosso_vem': som.perigo(); break;
    case 'conversivel': som.conversivel(e.distancia, e.vel); break;
    case 'atropelou': som.atropelou(e.heroi, longe(e, g)); break;
    case 'paraquedista': som.paraquedista(); break;
    case 'tomate_lancado': som.arremesso(); break;
    case 'tomatada': sujeira.tomatada(); som.tomatada(); break;
    case 'tela': som.telaSom(e.id); break;
    case 'pedra_lancada': som.arremesso(); break;
    case 'pedrada': sujeira.pedrada(); som.pedrada(); break;
    case 'portal_abriu': som.portalAbriu(); break;
    case 'portal_rodada': som.escolha(); break;
    case 'portal_passou': som.portalPassou(e.bom); break;
    case 'portal_presente': som.portalPassou(e.lado === 'ajuda'); break;
    case 'portal_duelo': som.chefe(true); break;
    case 'portal_venceu': som.recorde(); break;
    case 'portal_perdeu': som.morteHeroi(); break;
    case 'portal_reliquia': som.runa(); break;
    case 'portal_saindo': som.portalAbriu(true); break;
    case 'eclipse': som.onda(); break;
    case 'aviao': som.aviao(e.voo); break;
    case 'bomba_caindo': som.bombaCaindo(e.queda); break;
    case 'fenix': som.levantou(); break;
    case 'agarrou': case 'paraquedista_quicou': som.agarrou(); break;
    case 'soltou_perna': som.soltouPerna(); break;
    case 'colosso_cansou': som.cansou(longe(e, g)); break;
    case 'colosso_vencido': som.recorde(); break;
    case 'runa': som.runa(); break;
    case 'suprema': som.nucleo(Math.min(3, Math.ceil(e.total / 2))); break;
    // habilidades novas (hab-ativas.js, hab-supremas.js)
    case 'gelo': som.onda(); break;
    case 'ima': som.zap(); break;
    case 'algemas': som.bloqueio(); break;
    case 'grito': som.onda(); break;
    case 'sirene': som.alarme(1.5); break;
    case 'escudo': som.colete(); break;
    case 'escudo_bloqueou': som.bloqueio(); break;
    case 'seringa': som.cura(); break;
    case 'rajada': som.tiro(e.grande ? 'metralhadora' : 'escopeta'); break;
    case 'tempo_parado': som.furiaDivina(); break;
    case 'justica': som.tiro('escopeta'); break;
    case 'deus': som.deus(); break;
    case 'nivel_maximo': som.recorde(); break;
    case 'furia_divina': som.furiaDivina(); break;
    case 'novos_inimigos': som.chefe(false); break;
    case 'onda': som.onda(); break;
    case 'arremesso': som.arremesso(); break;
    case 'habilidade': som.habilidade(); break;
    case 'escolha_abriu': som.escolha(); break;
    case 'levantou': som.levantou(); break;
    case 'golpe_final': som.golpeFinal(); break;
    case 'mochila': som.item(); break;
    case 'mochila_usou': som.cura(); break;
    case 'recarregando': som.recarregar(); break;
    case 'recarregou': som.municao(); break;
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
      if (e.type === 'tela') telaFX.disparar(e);
      // limpador: só passa (e avisa) se tinha sujeira na tela
      if (e.type === 'limpar_tela') { if (telaFX.limpar()) { som.limpador(); hud.avisoTela({ limpou: true, nick: e.nick }); } continue; }
      render.evento(e, jogo);
      hud.evento(e, jogo);
      tocar(e, jogo);
      if (e.type === 'heroi_morreu') { guardar('recorde', jogo.recorde); guardar('hall', jogo.hall); }
      if (e.type === 'novo_heroi') guardar('heroiN', jogo.heroiN);
      if (e.type === 'historia') guardar('historia', jogo.historia.lista());
    } catch (err) { console.error('evento', e.type, err); }
  }
  render.draw(jogo, dt);
  sujeira.desenhar(dt);
  telaFX.desenhar(dt, jogo);
  hud.update(jogo, dt);
  // som de perigo
  const h = jogo.hero;
  const pct = h.vida / h.vidaMax;
  let perto = 0, chefe = 0;
  const vistos = [];   // zumbis na tela (até ~11 casas): de vez em quando um deles geme, rosna ou engasga
  for (const z of jogo.zumbis) {
    if (z.morto) continue;
    const d2 = dist2(z.x, z.y, h.x, h.y);
    if (d2 < 36) { perto++; if (ZUMBIS[z.tipo].chefe) chefe = 1; }
    if (d2 < 121 && !(z.nascendo > 0) && !z.dormindo) vistos.push({ d: Math.sqrt(d2), tipo: z.tipo });
  }
  som.vozes(dt, jogo.fase === 'jogo' ? vistos : []);
  // sozinho: só os próprios passos e a respiração (som.js → solidao)
  som.solidao(dt, {
    sozinho: jogo.fase === 'jogo' && !jogo.caido && !vistos.length,
    andando: h.andando, anda: h.animT || 0, vida: pct,
    chao: jogo.room ? (jogo.room.praia ? 'grama' : 'piso') : jogo.bairroAtual === 'parque' ? 'grama' : 'asfalto'   // areia da praia soa como grama
  });
  som.musica(jogo.fase === 'jogo' ? clamp(perto / 18 + (1 - pct) * 0.4 + (jogo.ehNoite() ? 0.25 : 0) + chefe * 0.4, 0, 1) : 0, dt, jogo.fase === 'jogo' && pct < 0.5 ? clamp((0.5 - pct) / 0.5, 0.05, 1) : 0);
  if (jogo.fase === 'jogo' && pct < 0.3) { coracaoT -= dt; if (coracaoT <= 0) { coracaoT = pct < 0.15 ? 0.55 : 0.85; som.coracao(); } }
  // tique dos últimos segundos da votação
  const v = jogo.voto;
  // (segue a contagem da tela, que desconta o atraso da live; no herói caído, toca a cada segundo)
  const cd = jogo.caido ? jogo.caido.t - (jogo.caido.finalizador ? 0 : jogo.cfg.atraso) : v && v.aberta && !jogo.room ? (v.restanteNaTela ?? v.restante) : null;
  if (cd != null) { const s = Math.ceil(cd); if (s !== ultimoSeg && s <= (jogo.caido ? 10 : 3) && s > 0) som.tique(true); ultimoSeg = s; } else ultimoSeg = -1;
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);
conectar();
