// Painel por cima do jogo: vida, votação, avisos de presente, rankings, legenda e relatório da rodada.
import { fmtTempo, clamp } from '../core/util.js';
import { ARMAS, CORPO, CLASSES, xpParaNivel, NIVEL_MAXIMO } from '../core/dados.js';
import { STATUS } from '../core/status.js';
import { BAIRROS } from '../core/city.js';
import { EFEITOS, ladoDo } from '../core/efeitos.js';
import { progressoAmeaca } from '../core/ameaca.js';
import { slotsDoHeroi, NUCLEO } from '../core/habilidades.js';
import { Letreiro } from './letreiro.js';
import { graficoDoHeroi, GRAFICO_SEGUNDOS, BLOCOS } from '../core/grafico.js';

const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const urlOk = u => /^https:\/\//.test(String(u || ''));
const AVATAR_VAZIO = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><rect width="10" height="10" fill="#2a2238"/><circle cx="5" cy="4" r="2" fill="#6a5a88"/><rect x="2" y="7" width="6" height="3" rx="1.5" fill="#6a5a88"/></svg>');

export class Hud {
  constructor() {
    this.cache = {};
    this.legenda = [];
    this.legIdx = 0;
    this.legT = 0;
    this.bannerT = 0;
    this.introT = 0;
    this.resultadoAte = 0;
    this.toastsVivos = [];
    // linhas que viram letreiro quando não cabem
    this.letreiros = ['h-stats', 'h-linha-status'].map(id => $(id)).filter(Boolean).map(el => new Letreiro(el));
  }

  set(id, valor) {
    if (this.cache[id] === valor) return;
    this.cache[id] = valor;
    $(id).textContent = valor;
  }
  html(id, valor) {
    if (this.cache[id] === valor) return;
    this.cache[id] = valor;
    $(id).innerHTML = valor;
  }

  setLegenda(presentes, seguir, compartilhar, likesPor) {
    const itens = [];
    for (const [, r] of Object.entries(presentes || {})) {
      const ef = EFEITOS[r.efeito]; if (!ef) continue;
      itens.push({ emoji: r.emoji || '🎁', nome: r.nome || '', texto: ef.texto(r), lado: ladoDo(r), moedas: r.moedas || 0 });
    }
    itens.sort((a, b) => a.moedas - b.moedas);
    if (seguir && EFEITOS[seguir.efeito]) itens.push({ emoji: '➕', nome: 'Seguir', texto: EFEITOS[seguir.efeito].texto(seguir), lado: 'ajuda' });
    if (compartilhar && EFEITOS[compartilhar.efeito]) itens.push({ emoji: '🔁', nome: 'Compartilhar', texto: EFEITOS[compartilhar.efeito].texto(compartilhar), lado: 'ajuda' });
    if (likesPor > 0) itens.push({ emoji: '❤️', nome: 'Curtidas', texto: `${likesPor} = suprimento`, lado: 'ajuda' });
    itens.push({ emoji: '💬', nome: 'Chat', texto: 'vote 1 2 3 4 5 no cruzamento', lado: 'ajuda' });
    this.legenda = itens;
    // presente de ajuda mais barato: é o que o painel de "caído" pede
    this.ajudaBarata = itens.find(l => l.lado === 'ajuda' && l.moedas > 0) || null;
    this.legIdx = 0; this.legT = 0;
    this.mostrarLegenda();
  }

  mostrarLegenda() {
    const el = $('h-legenda');
    if (!this.legenda.length) { el.innerHTML = ''; return; }
    const pagina = [];
    for (let i = 0; i < 4; i++) pagina.push(this.legenda[(this.legIdx + i) % this.legenda.length]);
    el.innerHTML = pagina.map(l => `<span class="leg ${l.lado}">${esc(l.emoji)} ${esc(l.texto)}</span>`).join('');
  }

  rank(r) {
    for (const lado of ['ajuda', 'atrapalha']) {
      const lista = (r && r[lado]) || [];
      const html = lista.length
        ? lista.map((p, i) => `<div class="rk-l">${urlOk(p.avatar) ? `<img src="${esc(p.avatar)}" alt="" referrerpolicy="no-referrer">` : '<i class="ph"></i>'}<span>${i === 0 ? (lado === 'ajuda' ? '👑 ' : '😈 ') : ''}${esc(p.nick)}</span><em>${p.coins}🪙</em></div>`).join('')
        : `<div class="rk-vazio">${lado === 'ajuda' ? 'mande 🌹 pra ajudar' : 'mande 🎵 pra atrapalhar'}</div>`;
      this.html('rk-' + lado, html);
    }
  }

  toast(e) {
    const box = $('h-toasts');
    // mesma pessoa mandando o mesmo presente em seguida: soma no mesmo aviso (combo)
    const chave = e.nick + '|' + (e.giftName || e.texto);
    const u = this.ultimoToast;
    if (u && u.chave === chave && performance.now() - u.t < 3500 && u.el.isConnected) {
      u.qtd += e.qtd || 1; u.t = performance.now();
      u.el.querySelector('.vezes').textContent = ` x${u.qtd}`;
      u.el.style.animation = 'none'; void u.el.offsetWidth; u.el.style.animation = '';
      clearTimeout(u.timer);
      u.timer = setTimeout(() => { u.el.classList.add('out'); setTimeout(() => u.el.remove(), 460); }, 3800);
      return;
    }
    const t = document.createElement('div');
    t.className = 'toast ' + e.lado;
    const img = urlOk(e.avatar) ? esc(e.avatar) : AVATAR_VAZIO;
    const presente = urlOk(e.image) ? `<img class="gimg" src="${esc(e.image)}" alt="" referrerpolicy="no-referrer">` : esc(e.emoji);
    const vezes = `<span class="vezes">${e.qtd > 1 ? ` x${e.qtd}` : ''}</span>`;
    const espera = e.espera ? ` <small>(em ${e.espera}s)</small>` : '';
    t.innerHTML = `<img class="tava" src="${img}" alt="" referrerpolicy="no-referrer"><span class="tt"><b>${esc(e.nick)}</b> ${presente}${vezes} <em>${esc(e.texto)}</em>${espera}</span>`;
    box.prepend(t);
    while (box.children.length > 3) box.lastChild.remove();
    const timer = setTimeout(() => { t.classList.add('out'); setTimeout(() => t.remove(), 460); }, 3800);
    this.ultimoToast = { chave, el: t, qtd: e.qtd || 1, t: performance.now(), timer };
  }

  // Slots do herói: habilidades ← [fusão] (NÚCLEO) [fusão] → passivas
  atualizarSlots(h) {
    const S = slotsDoHeroi(h), N = S.nucleo;
    const k = JSON.stringify(S);
    if (this.cache.slots === k) return;
    const antes = new Set((this.cache.slotsIds || []));
    const ids = [];
    const slot = (x, cls) => {
      const id = cls + x.emoji + x.nivel; ids.push(id);
      return `<span class="sl ${cls}${antes.has(id) || !this.cache.slots ? '' : ' novo'}" title="${esc(x.nome)}">${esc(x.emoji)}<i>${x.nivel}</i>${x.runa ? '<u>🔮</u>' : ''}</span>`;
    };
    const mini = i => {
      const x = S.mini[i];
      if (!x) return '<span class="sm" title="Fusão: habilidade nível 3 + a passiva certa"></span>';
      const id = 'm' + x.emoji; ids.push(id);
      return `<span class="sm on${antes.has(id) || !this.cache.slots ? '' : ' novo'}" title="${esc(x.nome)} (fusão)">${esc(x.emoji)}</span>`;
    };
    // anel do núcleo: 3 terços com uma folguinha entre eles; cheios em dourado
    const parte = 360 / N.total, folga = 6, cor = i => (N.deus ? '#fff3a0' : i < N.tercos ? '#ffd23f' : 'rgba(255,255,255,.12)');
    const anel = Array.from({ length: N.total }, (_, i) => `${cor(i)} ${i * parte + folga / 2}deg ${(i + 1) * parte - folga / 2}deg, transparent ${(i + 1) * parte - folga / 2}deg ${(i + 1) * parte + folga / 2}deg`).join(',');
    const selo = N.deus ? '<em>DEUS</em>' : N.bloqueado ? `<em class="lock">🔒${NIVEL_MAXIMO}</em>` : N.tercos ? `<em>${N.tercos}/${N.total}</em>` : '';
    const titulo = N.deus ? 'Nível deus: Fúria divina' : `Núcleo ${N.tercos}/${N.total}: a cada ${NUCLEO.porTerco} fusões, 1 terço (+${Math.round(NUCLEO.danoPorTerco * 100)}% de dano). Cheio + nível ${NIVEL_MAXIMO} = habilidade nível deus`;
    const subiu = (this.cache.nucT ?? N.tercos) !== N.tercos || (this.cache.nucD === false && N.deus);
    this.cache.nucT = N.tercos; this.cache.nucD = N.deus;
    const vazio = !S.ativas.length && !S.passivas.length && !S.mini.length && !N.centro && !N.tercos;
    $('h-slots').innerHTML =
      `<div class="lado hab">${S.ativas.map(x => slot(x, 'hab')).join('') || (vazio ? '<span class="hb-vazio">⭐ cada nível:</span>' : '')}</div>` +
      `<div class="nucleo">${mini(0)}<span class="nuc${N.deus ? ' deus' : ''}${subiu ? ' up' : ''}" title="${esc(titulo)}"><span class="anel" style="background:conic-gradient(${anel});-webkit-mask:radial-gradient(circle,transparent 61%,#000 62%);mask:radial-gradient(circle,transparent 61%,#000 62%)"></span><span class="meio">${N.centro ? esc(N.centro.emoji) : ''}</span>${selo}</span>${mini(1)}</div>` +
      `<div class="lado pas">${S.passivas.map(x => slot(x, 'pas')).join('') || (vazio ? '<span class="hb-vazio">o chat escolhe</span>' : '')}</div>`;
    this.cache.slots = k; this.cache.slotsIds = ids;
  }

  banner(texto, sub = '', tipo = '', dur = 2.6) {
    const b = $('h-banner');
    b.className = 'banner ' + tipo;
    $('b-t').textContent = texto; $('b-s').textContent = sub;
    b.hidden = false;
    const bt = $('b-t'); bt.style.animation = 'none'; void bt.offsetWidth; bt.style.animation = '';
    this.bannerT = dur;
  }

  evento(e, g) {
    switch (e.type) {
      case 'presente': this.toast(e); break;
      case 'chefe':
        if (e.arena) break;   // na arena o aviso é o da arena
        if (e.tipo === 'rei') this.banner('👑 REI ZUMBI!', `despertado por ${e.nome}`, 'perigo', 3.2);
        else if (e.tipo === 'exheroi') this.banner('🧟 O EX-HERÓI VOLTOU!', 'derrote ele pra pegar a arma de volta', 'perigo', 3);
        else this.banner(`🎆 CHEFÃO DE ${e.nome.toUpperCase()}!`, 'a tela vai tremer...', 'perigo', 3);
        break;
      case 'morte_zumbi': if (e.chefe) this.banner('💥 CHEFÃO DERROTADO!', e.nome ? `adeus, ${e.nome}` : '', 'ouro', 2.4); break;
      case 'bau': if (e.raridade === 'lendario') this.banner(`✨ ${ARMAS[e.arma]?.nome.toUpperCase() || 'ARMA LENDÁRIA'}!`, e.quem ? `baú lendário de ${e.quem}` : 'baú lendário', 'ouro', 2.8); break;
      case 'nivel': this.banner(`⭐ NÍVEL ${e.nivel}`, (e.pericias || []).join(' · '), 'ouro', 1.6); break;
      case 'passiva': this.banner(e.texto, '', 'bom', 1.8); break;
      case 'nucleo': this.banner(`💠 NÚCLEO ${e.tercos}/${e.total}!`, e.bloqueado ? `núcleo cheio! a habilidade nível deus abre no nível ${NIVEL_MAXIMO}` : `+${Math.round(NUCLEO.danoPorTerco * 100 * e.tercos)}% de dano em tudo`, 'ouro', 3); break;
      case 'deus': this.banner('👑 NÍVEL DEUS!', `${e.emoji} ${e.nome}: luz do céu a cada poucos segundos`, 'ouro', 4); break;
      case 'nivel_maximo': this.banner(`🏆 NÍVEL ${e.nivel}! NÍVEL MÁXIMO`, '', 'ouro', 3); break;
      // recompensas de presente (recompensas.js)
      case 'drop': this.banner(`🪂 ${e.emoji} ${e.nome.toUpperCase()}${e.pilhas > 1 ? ' x' + e.pilhas : ''}!`, `${e.texto} · 5 quarteirões${e.quem ? ' · presente de ' + e.quem : ''}`, 'bom', 2.2); break;
      case 'inspiracao': this.banner('✨ INSPIRADO!', `${e.nick ? e.nick + ' doou · ' : ''}${e.segundos} s tomando só 20% do dano e machucando quem chega perto`, 'bom', 2.6); break;
      case 'grafico': this.graficoAte = performance.now() + GRAFICO_SEGUNDOS * 1000; this.cache.gk = null; break;
      case 'tomateiro': this.banner('🍅 ZUMBI DO TOMATE!', 'joga tomate de longe e suja a tela', 'perigo', 2); break;
      case 'paraquedista': this.banner(`🪂🧟 ZUMBI PARAQUEDISTA${e.nick ? ' DE ' + e.nick.toUpperCase() : ''}!`, 'vai cair bem em cima do herói', 'perigo', 2); break;
      case 'agarrou': this.banner('🧟 AGARROU A PERNA!', `lento até o próximo cruzamento${e.pilhas > 1 ? ` · ${e.pilhas} zumbis pendurados` : ''}${e.nick ? ' · presente de ' + e.nick : ''}`, 'perigo', 2.2); break;
      case 'soltou_perna': this.banner('🦵 SOLTOU A PERNA!', e.qtd > 1 ? `os ${e.qtd} zumbis caíram no chão: agora é matar` : 'o zumbi caiu no chão: agora é matar', 'bom', 2); break;
      case 'paraquedista_quicou': this.banner('🛡️ QUICOU!', 'o herói estava invencível: o zumbi caiu do lado', 'bom', 1.8); break;
      case 'conversivel': this.banner(`🚗 CONVERSÍVEL ${e.nick ? 'DE ' + e.nick.toUpperCase() : 'DOS ZUMBIS'}!`, 'passa atropelando todo mundo: metade da vida de quem pegar', 'perigo', 2); break;
      case 'conversivel_fim': {
        const z = e.zumbis ? `${e.zumbis} zumbi${e.zumbis === 1 ? '' : 's'}` : '';
        const txt = e.heroi ? (z ? `atropelou ${z} e o herói!` : 'atropelou o herói!') : (z ? `atropelou ${z} · o herói escapou!` : 'errou todo mundo!');
        this.banner(`🚗 ${txt}`, e.nick ? `conversível de ${e.nick}` : '', e.heroi ? 'perigo' : 'bom', 2.2); break;
      }
      case 'colosso_vem': this.banner('👹 VEM AÍ UM COLOSSO!', `no próximo quarteirão${e.nick ? ' · doação de ' + e.nick : ''}`, 'perigo', 2.6); break;
      case 'colosso': this.banner(`👹 ${e.nome.toUpperCase()}!`, `${e.vida.toLocaleString('pt-BR')} de vida · aguenta até ele cansar`, 'perigo', 3); break;
      case 'colosso_cansou': this.banner('😵 O COLOSSO CANSOU!', 'agora ele está lento e frágil: é a hora!', 'bom', 2.6); break;
      case 'colosso_vencido': this.banner('🏆 COLOSSO DERROTADO!', 'ele deixou uma 🔮 runa', 'bom', 2.4); break;
      case 'runa': this.banner(`🔮 RUNA DE ${e.tipo === 'dano' ? 'DANO' : 'RESISTÊNCIA'}!`, `grudou em ${e.emojiHab} ${e.nomeHab} e cresce com ela: ${e.tipo === 'dano' ? (e.hab === 'principal' ? '+10% de dano por nível de treino' : '+25% de dano por nível') : '+4% de defesa por nível'}`, 'bom', 3.2); break;
      case 'segundo_folego': this.banner('💢 SEGUNDO FÔLEGO!', 'o herói empurra a horda e respira (só até o nível 10)', 'bom', 2); break;
      case 'helicoptero': this.banner('🚁 RESGATE AÉREO!', e.quem ? `chamado por ${e.quem}` : '', 'bom', 3); break;
      case 'noite': this.banner('🌙 A NOITE CHEGOU', 'mais zumbis, menos visão', 'perigo', 2.4); break;
      case 'alarme': if (!e.sala) this.banner('🚨 ALARME DE CARRO!', 'a horda está vindo', 'perigo', 2.2); break;
      case 'aviso': this.banner(e.texto, '', e.tipo === 'perigo' ? 'perigo' : 'bom', 2.4); break;
      case 'ameaca': this.banner(`☠️ AMEAÇA ${e.nivel}`, 'zumbis mais resistentes e hordas maiores', 'perigo', 1.8); break;
      case 'horda': this.banner('🧟 HORDA CHEGANDO!', `${e.qtd} zumbis`, 'perigo', 2); break;
      case 'horda_quadra': this.banner(`☠️ HORDA GIGANTE!`, `${e.qtd} zumbis${e.ondas > 1 ? ` em ${e.ondas} ondas` : ''} · a cada 5 quarteirões`, 'perigo', 2.8); break;
      case 'limpar_area': this.banner('🧟 LIMPE A ÁREA!', `faltam ${e.restam} zumbi${e.restam === 1 ? '' : 's'} pra atravessar`, 'perigo', 1.6); break;
      case 'entrou_praia': this.banner('🏖️ A PRAIA!', `uma horda está saindo do mar · sobreviva 1 minuto`, 'perigo', 3.2); break;
      case 'praia_vencida': this.banner('🏆 SOBREVIVEU À PRAIA!', 'escolham por onde sair', 'ouro', 2.8); break;
      case 'novos_inimigos': this.banner('🐺 NOVOS INIMIGOS!', 'lobos que saltam, braços longos e 💣 inchados instáveis que estouram em cadeia (🧯 Anti-explosão salva)', 'perigo', 3.6); break;
      case 'arena': this.banner('⚔️ ARENA!', `derrote o ${e.nome}`, 'perigo', 2.6); break;
      case 'arena_vencida': this.banner('🏆 ARENA VENCIDA!', 'pegue a recompensa', 'ouro', 2.6); break;
      case 'arena_tempo': this.banner('⏱️ FIM DA ARENA', 'o chefe ainda está solto...', 'perigo', 2); break;
      case 'bairro': this.banner(`${e.emoji} ${e.nome.toUpperCase()}`, 'bairro novo à vista', '', 2); break;
      case 'beco': this.banner('🚧 RUA SEM SAÍDA', 'tem um baú lá no fim...', 'ouro', 2); break;
      case 'beco_emboscada': this.banner('⚠️ EMBOSCADA!', 'a horda fechou a saída do beco', 'perigo', 2.2); break;
      case 'caminho':
        if (e.tipo === 'perigoso') this.banner(`${e.emoji} ${e.nome}`, `caminho perigoso: ${e.texto}`, 'perigo', 2.4);
        else if (e.tipo === 'historia') this.banner('📜 TEM ALGO NO CHÃO...', 'uma pista do que aconteceu aqui', 'ouro', 2.2);
        else this.banner('🍃 CAMINHO LIVRE', 'nenhum zumbi novo nesta rua', 'bom', 2.2);
        break;
      case 'historia': this.mostrarHistoria(e); break;
      case 'recorde': this.banner('🏆 NOVO RECORDE!', `${e.quarteiroes} quarteirões`, 'ouro', 2.6); break;
      case 'entrou_predio': this.banner(`${e.emoji} ${e.nome.toUpperCase()}`, 'pegue o que der e saia pelos fundos', '', 2.2); break;
      case 'levantou': this.banner(`🙌 ${e.nick ? e.nick.toUpperCase() : 'ALGUÉM'} LEVANTOU O HERÓI!`, e.vez > 1 ? `de pé pela ${e.vez}ª vez` : 'de volta à luta', 'bom', 2.6); break;
      case 'mochila': this.banner('💼 KIT NA MOCHILA', `${e.nick ? 'de ' + e.nick + ' · ' : ''}ele usa quando precisar`, 'bom', 1.8); break;
      case 'mochila_usou': if (e.caindo) this.banner('💼 A MOCHILA SALVOU!', e.nick ? `kit de ${e.nick}` : '', 'bom', 2.4); break;
      case 'vida_baixa': this.banner('⚠️ VIDA BAIXA!', 'mande 🌹 ou 🍩 pra salvar o herói', 'perigo', 2.2); break;
      case 'decisao': this.resultadoAte = performance.now() + 2600; break;
      case 'novo_heroi': this.intro(e, g); $('over').hidden = true; this.histT = 0; $('h-hist').hidden = true; break;
      case 'heroi_morreu': this.relatorio(e.relatorio, e.hall, g); break;
      case 'arma': if (e.id === 'escopeta' && e.quem) this.banner('💥 ESCOPETA!', `presente de ${e.quem}`, 'bom', 1.8); if (e.id === 'taco') this.banner('🏏 TACO COM PREGOS!', e.quem ? `presente de ${e.quem}` : '', 'bom', 1.8); break;
    }
  }

  mostrarHistoria(e) {
    const f = e.fragmento;
    $('hs-cap').textContent = `📜 Fragmento ${e.numero} de ${e.total} · ${e.capitulo}`;
    $('hs-tit').textContent = f.titulo;
    $('hs-txt').textContent = f.texto;
    $('hs-ass').textContent = f.assinatura || '';
    $('hs-bar').style.width = (e.numero / e.total * 100).toFixed(0) + '%';
    const el = $('h-hist');
    el.hidden = false; el.classList.remove('out');
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    this.histT = 11;
  }

  intro(e, g) {
    const C = CLASSES[e.classe];
    $('i-n').textContent = e.viewer ? `Sobrevivente #${e.n} · ${C.nome}` : `Sobrevivente #${e.n}`;
    $('i-nome').textContent = `${C.emoji} ${e.viewer ? e.viewer.nick : C.nome}`;
    const kit = [C.arma ? `${ARMAS[C.arma].emoji} ${ARMAS[C.arma].nome}` : null, C.corpo && C.corpo !== 'empurrao' ? `${CORPO[C.corpo].emoji} ${CORPO[C.corpo].nome}` : null].filter(Boolean).join(' + ');
    $('i-arma').textContent = `${kit} · ${C.descricao}`;
    $('i-passiva').textContent = C.passiva ? `✨ ${C.passiva.texto}` : '';
    $('i-aviso').hidden = !e.exHeroi;
    $('i-aviso').textContent = e.exHeroi ? `⚠️ ${e.exNome || 'O sobrevivente #' + (e.n - 1)} vai voltar como zumbi...` : '';
    $('i-padrinho').hidden = !e.viewer;
    if (e.viewer) $('i-padrinho').textContent = e.viewer.lado === 'ajuda' ? '🛡️ nome de quem mais ajudou na rodada passada' : '😈 nome de quem mais atrapalhou na rodada passada';
    const el = $('intro');
    el.hidden = false; el.classList.remove('out');
    this.introT = 4.2;
  }

  relatorio(r, hall, g) {
    this.relT = 0;
    this.rel = r;
    $('o-title').textContent = `${r.emoji} ${(r.viewer?.nick || r.nome).toUpperCase()} #${r.n} CAIU!`;
    $('o-prox').textContent = r.proximoNome ? `${r.proximoNome.lado === 'ajuda' ? '🛡️' : '😈'} ${r.proximoNome.nick}` : 'sobrevivente';
    $('o-why').textContent = (r.matador?.causa ? `derrubado por ${r.matador.causa}` : 'derrubado pela horda') + ` · ameaça ${r.ameaca}` + (r.levantadas ? ` · levantou ${r.levantadas}x` : '')
      + (r.habs?.length ? ` · ${r.habs.map(x => x.emoji + x.nivel).join(' ')}` : '');
    $('o-rec').hidden = !r.novoRecorde;
    $('o-q').textContent = r.quarteiroes; $('o-abates').textContent = r.abates; $('o-tempo').textContent = fmtTempo(r.tempo);
    $('o-nivel').textContent = r.nivel; $('o-predios').textContent = r.predios; $('o-recorde').textContent = r.recorde;
    const pessoa = (pre, p, vazio) => {
      $(pre + '-img').src = urlOk(p?.avatar) ? p.avatar : AVATAR_VAZIO;
      $(pre + '-img').referrerPolicy = 'no-referrer';
      $(pre + '-n').textContent = p?.nick || vazio;
      $(pre + '-c').textContent = p?.coins ? `${p.coins} moedas` : '';
    };
    pessoa('d-a', r.topAjuda, 'ninguém');
    pessoa('d-t', r.topAtrapalha, 'ninguém');
    pessoa('d-k', r.matador?.nick ? r.matador : null, 'a horda');
    $('d-k-c').textContent = r.matador?.nick ? 'mandou o golpe final' : '';
    $('hall').innerHTML = hall?.length ? `<h5>🏛️ Hall dos heróis</h5>` + hall.map((h, i) => `<div><span>${['🥇', '🥈', '🥉'][i]} ${esc(h.emoji)} ${esc(h.nome)} #${h.n}</span><b>${h.quarteiroes} quarteirões · ${fmtTempo(h.tempo)}</b></div>`).join('') : '';
    $('over-card').classList.remove('dest');
    $('over').hidden = false;
    $('h-voto').hidden = true;
  }

  // Gráfico de atributos (core/grafico.js): aberto por GRAFICO_SEGUNDOS depois que alguém comenta "G"
  atualizarGrafico(g) {
    const painel = $('g-painel'), pill = $('g-pill');
    const aberto = g.fase === 'jogo' && performance.now() < (this.graficoAte || 0);
    if (painel.hidden === aberto) painel.hidden = !aberto;
    if (pill.hidden !== aberto) pill.hidden = aberto;
    if (!aberto) return;
    // só a sigla e os 5 blocos de cada atributo (sem moldura)
    const linhas = graficoDoHeroi(g.hero);
    const chave = linhas.map(l => l.blocos).join('');
    if (this.cache.gk !== chave) {
      this.cache.gk = chave;
      painel.innerHTML = linhas.map(l => `<div class="g-l" style="--c:${l.cor}" title="${esc(l.nome)}: ${esc(l.texto)} de ${esc(l.fmt(l.max))}"><b>${l.sigla}</b><span class="g-b">${Array.from({ length: BLOCOS }, (_, k) => `<i${k < l.blocos ? ' class="on"' : ''}></i>`).join('')}</span></div>`).join('');
    }
  }

  update(g, dt) {
    const h = g.hero;
    this.atualizarGrafico(g);
    for (const l of this.letreiros) l.update(dt);
    // vida
    const pct = clamp(h.vida / h.vidaMax, 0, 1);
    $('h-vfill').style.width = (pct * 100).toFixed(1) + '%';
    const vb = $('h-vbar');
    const cls = 'vbar' + (pct < 0.3 ? ' baixa' : pct < 0.6 ? ' media' : '');
    if (vb.dataset.c !== cls) { vb.className = cls; vb.dataset.c = cls; }
    this.set('h-vida', `${Math.ceil(Math.max(0, h.vida))}/${Math.round(h.vidaMax)}`);
    this.set('h-colete', h.colete > 0 ? `🛡️${h.colete}` : '');
    const C = CLASSES[h.classe];
    this.set('h-emoji', C.emoji);
    // herói com nome de espectador: a foto dele aparece no lugar do emoji (o emoji da classe vira um selinho)
    const foto = urlOk(h.viewer?.avatar) ? h.viewer.avatar : '';
    if (this.cache['h-foto'] !== foto) {
      this.cache['h-foto'] = foto;
      const img = $('h-foto'), av = $('h-av');
      img.onerror = () => { img.hidden = true; av.classList.remove('foto'); };
      if (foto) img.src = foto; else img.removeAttribute('src');
      img.hidden = !foto; av.classList.toggle('foto', !!foto);
    }
    this.set('h-heroi', `${h.viewer ? h.viewer.nick : C.nome} #${h.n}`);
    const a = h.arma ? ARMAS[h.arma] : null;
    const cp = CORPO[h.corpo];
    let armaTxt = a ? `${a.emoji} ${a.nome}` : `${cp.emoji} ${cp.nome}`;
    if (a && h.municao != null) armaTxt += ` · ${h.municao}`;
    if (a && h.armaQ > 0) armaTxt += ` · 📍${h.armaQ}`;
    const golpes = cp.golpes && Number.isFinite(h.golpes) ? h.golpes : '';
    if (a && h.corpo !== 'empurrao') armaTxt += ` + ${cp.emoji}${golpes}`;
    else if (!a && golpes !== '') armaTxt += ` · ${golpes}`;
    this.set('h-arma', armaTxt);
    const armaEl = $('h-arma'), lend = !!a?.lendaria;
    if (armaEl.dataset.l !== String(lend)) { armaEl.classList.toggle('lend', lend); armaEl.dataset.l = String(lend); }
    if (this.cache['h-nv'] !== String(h.nivel)) { const el = $('h-nv'); el.classList.remove('up'); void el.offsetWidth; el.classList.add('up'); }
    this.set('h-nv', String(h.nivel));
    this.atualizarSlots(h);
    const max = h.nivel >= NIVEL_MAXIMO;
    if (this.cache.xpmax !== max) { this.cache.xpmax = max; $('h-xpb').classList.toggle('max', max); $('h-xpb').title = max ? `Nível máximo (${NIVEL_MAXIMO})` : 'Experiência até o próximo nível'; }
    $('h-xp').style.width = (max ? 100 : clamp(h.xp / xpParaNivel(h.nivel), 0, 1) * 100).toFixed(0) + '%';
    this.set('h-q', String(g.stats.quarteiroes));
    this.set('h-rec', String(Math.max(g.recorde, g.stats.quarteiroes)));
    this.set('h-abates', String(g.stats.abates));
    this.set('h-ameaca', String(g.nivelAmeaca));
    if (g.fase === 'jogo') $('h-amx').style.width = (progressoAmeaca((g.t - g.stats.inicio) / 60, g.stats.quarteiroes, h.nivel, g.A, g.ameacaBonus) * 100).toFixed(0) + '%';
    this.set('h-tempo', fmtTempo((g.fase === 'jogo' ? g.t : g.t - g.faseT) - g.stats.inicio));
    $('h-likes').style.width = (g.cfg.likesPor > 0 ? clamp(g.likes / g.cfg.likesPor, 0, 1) * 100 : 0).toFixed(0) + '%';

    // situação
    const st = [];
    if (g.arena && g.fase === 'jogo') { const ch = g.arena.chefe; st.push(`<span class="chip mal">⚔️ arena · chefe ${ch.morto ? 'derrotado' : Math.ceil(Math.max(0, ch.vida) / ch.vidaMax * 100) + '%'} · ${Math.max(0, Math.ceil(100 - g.arena.t))}s</span>`); }
    if (!g.room && g.bairroAtual) { const B = BAIRROS[g.bairroAtual]; st.push(`<span class="chip">${B.emoji} ${esc(B.nome)}</span>`); }
    if (g.protecao > 0 && g.fase === 'jogo') st.push(`<span class="chip ok">🛡️ proteção ${Math.ceil(g.protecao)}s</span>`);
    if (g.fila.length && g.protecao > 0) st.push(`<span class="chip mal">😈 ${g.fila.length} na fila</span>`);
    if (g.noiteT > 0) st.push(`<span class="chip mal">🌙 noite ${Math.ceil(g.noiteT)}s</span>`);
    if (g.room?.praia && g.praia) st.push(g.praia.vencida ? '<span class="chip ok">🏖️ praia · sobreviveu!</span>' : `<span class="chip mal">🏖️ praia · sobreviva ${Math.max(0, Math.ceil(60 - g.praia.t))}s</span>`);
    else if (g.room) st.push(`<span class="chip">${g.room.shop.emoji} ${g.room.shop.nome} · ${Math.max(0, Math.ceil(g.cfg.predioT - g.salaT))}s</span>`);
    if (g.torcidaN > 0 && g.fase === 'jogo') st.push(`<span class="chip ok" title="Quem comentou nos últimos 30 s dá força ao herói">📣 torcida ${g.torcidaN} · +${Math.round(g.torcidaN * 3)}% dano</span>`);
    if (g.trecho?.livre && !g.room && g.fase === 'jogo') st.push(`<span class="chip ok">${g.trecho.tipo === 'historia' ? '📜 rua da pista' : '🍃 rua tranquila'}</span>`);
    if (h.mochila?.length) st.push(`<span class="chip ok" title="Kits guardados: ele usa sozinho quando a vida cair">💼 mochila ${h.mochila.length}</span>`);
    if (h.invQ > 0) st.push(`<span class="chip ok" title="Quarteirões que ainda faltam">✨ invencível 📍${h.invQ}</span>`);
    else if (h.invT > 0) st.push(`<span class="chip ok">✨ invencível ${Math.ceil(h.invT)}s</span>`);
    // status do herói (status.js): verde = bom, vermelho = ruim
    // bônus contados em quarteirões aparecem com 📍 (quantos quarteirões ainda faltam); o resto em segundos
    if (g.fase === 'jogo' && h.noVidro) st.push(`<span class="chip mal">🔸 no vidro: sem cura${h.curaGuardada > 0 ? ` · 💚${Math.round(h.curaGuardada)}% guardada` : ''}</span>`);
    if (g.fase === 'jogo') for (const s of h.estados.ativos()) st.push(`<span class="chip ${s.lado === 'positivo' ? 'ok' : 'mal'}">${s.emoji} ${esc(s.nome.toLowerCase())}${s.pilhas > 1 ? ' x' + s.pilhas : ''} ${s.q != null ? '📍' + s.q : Math.ceil(s.t) + 's'}</span>`);
    if (g.alarmeT > 0) st.push(`<span class="chip mal">🚨 alarme ${Math.ceil(g.alarmeT)}s</span>`);
    for (const al of g.aliados) st.push(`<span class="chip ok">${al.tipo === 'cachorro' ? '🐶' : '🧍'} ${esc(al.nome)} 📍${al.q}</span>`);
    this.html('h-status', st.join(''));

    // pedido de ajuda com vida baixa
    $('h-cta').hidden = !(g.fase === 'jogo' && !g.caido && pct < 0.3 && this.bannerT <= 0);
    this.atualizarCaido(g);

    this.atualizarVoto(g);
    this.atualizarEscolha(g);

    // banner, intro, relatório
    if (this.bannerT > 0 && (this.bannerT -= dt) <= 0) { const b = $('h-banner'); b.classList.add('out'); setTimeout(() => { if (this.bannerT <= 0) b.hidden = true; }, 500); }
    if (this.histT > 0 && (this.histT -= dt) <= 0) { const el = $('h-hist'); el.classList.add('out'); setTimeout(() => { if (this.histT <= 0) el.hidden = true; }, 500); }
    if (this.introT > 0 && (this.introT -= dt) <= 0) { const el = $('intro'); el.classList.add('out'); setTimeout(() => { el.hidden = true; }, 420); }
    if (g.fase === 'morto' && this.rel) {
      this.relT += dt;
      if (this.relT > g.cfg.relNum) $('over-card').classList.add('dest');
      this.set('o-count', String(Math.max(1, Math.ceil(g.cfg.relNum + g.cfg.relDest - g.faseT))));
    }

    // legenda gira a cada 5 s
    this.legT += dt;
    if (this.legT > 5 && this.legenda.length > 4) {
      this.legT = 0;
      const el = $('h-legenda'); el.classList.add('fade');
      setTimeout(() => { this.legIdx = (this.legIdx + 4) % this.legenda.length; this.mostrarLegenda(); el.classList.remove('fade'); }, 360);
    }
  }

  // Escolha de habilidade ao subir de nível (embaixo, no lugar da legenda e dos rankings).
  // A contagem desconta o atraso da live, igual à votação da direção.
  atualizarEscolha(g) {
    const box = $('h-escolha'), e = g.escolha;
    const res = !e && g.escolhaRes && g.t < g.escolhaRes.ate ? g.escolhaRes : null;
    const ativo = g.fase === 'jogo' && !!(e || res);
    if (this.cache.eAtivo !== ativo) { this.cache.eAtivo = ativo; $('h-bottom').classList.toggle('escolhendo', ativo); box.hidden = !ativo; }
    if (!ativo) { this.cache.ekey = null; return; }
    if (e) this.eCartas = e.cartas;
    const cartas = this.eCartas || [];
    const key = cartas.map(c => c.tipo + c.id + c.nivel).join(',') + (e ? 'a' : 'f');
    if (this.cache.ekey !== key) {
      this.cache.ekey = key;
      const tag = c => c.cat === 'combo' ? `COMBO ${c.de}` : c.cat === 'suprema' ? 'SUPREMA' : c.cat === 'nova' ? (c.tipo === 'arma' ? 'ARMA NOVA' : 'NOVA') : c.cat === 'passiva' ? 'PASSIVA' : (c.tipo === 'treino' ? 'APRIMORAR' : `NÍVEL ${c.nivel}`);
      $('e-ops').innerHTML = cartas.map(c => `<div class="ec${c.cat === 'combo' ? ' combo' : ''}" data-l="${c.letra}"><i class="fill"></i><span class="le">${c.letra}</span><span class="ic">${esc(c.emoji)}</span><span class="tag ${c.cat}">${tag(c)}</span><b>${esc(c.nome)}</b><p>${esc(c.desc)}</p><span class="cnt">0 votos</span></div>`).join('');
    }
    const vt = e ? e.voto : res.voto;
    if (vt) {
      const max = Math.max(1, ...vt.opcoes.map(o => o.votos));
      for (const o of vt.opcoes) {
        const el = document.querySelector(`.ec[data-l="${o.n}"]`); if (!el) continue;
        el.querySelector('.cnt').textContent = `${o.votos} voto${o.votos === 1 ? '' : 's'}`;
        el.querySelector('.fill').style.height = (e ? o.votos / max * 100 : 0).toFixed(0) + '%';
      }
    }
    if (e) {
      const v = e.voto, max = Math.max(1, ...v.opcoes.map(o => o.votos));
      for (const o of v.opcoes) {
        const el = document.querySelector(`.ec[data-l="${o.n}"]`); if (!el) continue;
        el.classList.toggle('lider', o.votos > 0 && o.votos === max);
      }
      const resta = v.restanteNaTela;
      $('e-barra').style.width = (clamp(resta / v.duracao, 0, 1) * 100).toFixed(1) + '%';
      $('e-tempo').classList.toggle('urg', resta < 3.5);
      if (v.contandoAtrasados) { this.set('e-titulo', '⏳ CONTANDO VOTOS DA LIVE...'); this.set('e-sub', 'ainda dá tempo: A, B ou C'); }
      else { this.set('e-titulo', e.suprema ? `🔥 NÍVEL ${e.nivel} · HABILIDADE SUPREMA!` : `⭐ NÍVEL ${e.nivel} · ESCOLHAM!`); this.set('e-sub', `digite A, B ou C · ${Math.ceil(resta)}s`); }
    } else {
      for (const el of document.querySelectorAll('.ec')) {
        const venceu = el.dataset.l === res.carta.letra;
        el.classList.toggle('venceu', venceu); el.classList.toggle('perdeu', !venceu); el.classList.remove('lider');
      }
      $('e-barra').style.width = '0%';
      this.set('e-titulo', res.auto ? '🤖 NINGUÉM VOTOU · A IA ESCOLHEU' : `✅ O CHAT ESCOLHEU (${res.votos} voto${res.votos === 1 ? '' : 's'})`);
      this.set('e-sub', `${res.carta.emoji} ${res.carta.nome}`);
    }
  }

  // Painel de herói caído. A contagem desconta o atraso da live: quem assiste vê o 0 quando acaba de verdade.
  atualizarCaido(g) {
    const box = $('h-caido'), c = g.caido;
    if (!c || g.fase !== 'jogo') { if (!box.hidden) box.hidden = true; return; }
    if (box.hidden) box.hidden = false;
    const final = !!c.finalizador;
    box.classList.toggle('final', final);
    const naTela = c.t - (final ? 0 : g.cfg.atraso);
    const cd = $('c-cd');
    if (naTela > 0) { this.set('c-cd', String(Math.ceil(naTela))); cd.classList.remove('espera'); }
    else { this.set('c-cd', '⏳ chegando presentes da live...'); cd.classList.add('espera'); }
    const a = this.ajudaBarata;
    this.set('c-tit', final ? `😈 GOLPE FINAL DE ${c.finalizador.nick.toUpperCase()}!` : '💀 HERÓI CAÍDO!');
    this.set('c-txt', final ? 'SÓ UM PRESENTE DE AJUDA SALVA AGORA!' : `mande ${a ? a.emoji + ' ' + (a.nome || '') : 'um presente de ajuda'} pra levantar ele`.replace(/\s+/g, ' '));
    this.set('c-sub', final ? '' : 'qualquer presente de ajuda ou seguir levanta · presente de atrapalhar = golpe final');
  }

  atualizarVoto(g) {
    const box = $('h-voto');
    const v = g.voto;
    const mostrar = g.fase === 'jogo' && !g.caido && (!g.room || g.room.praia) && v && (v.aberta || performance.now() < this.resultadoAte || g.decisao);
    if (!mostrar) { if (!box.hidden) box.hidden = true; this.cache.vkey = null; return; }
    if (box.hidden) box.hidden = false;
    const bloq = v.bloqueadas || [];
    const key = v.opcoes.map(o => o.id).join(',') + '|' + bloq.map(o => o.id).join(',') + (v.aberta ? 'a' : 'f');
    if (this.cache.vkey !== key) {
      this.cache.vkey = key;
      const ops = $('v-ops');
      // opções na ordem dos números; rua bloqueada aparece riscada no lugar dela
      const todas = [...v.opcoes, ...bloq.map(o => ({ ...o, bloqueada: true }))].sort((a, b) => a.n - b.n);
      ops.style.setProperty('--n', todas.length);
      ops.innerHTML = todas.map(o => {
        if (o.bloqueada) return `<div class="op bloq"><span class="num">${o.n}</span><span class="nome"><small>🚧</small> ${o.nome}</span><span class="cnt">bloqueada</span></div>`;
        const icone = o.id === 'entrar' ? (o.praca ? '⚔️' : esc(o.shop.emoji)) : o.seta;
        const extra = o.semSaida ? ' <small>📦</small>' : '';
        return `<div class="op${o.semSaida ? ' beco' : ''}" data-op="${o.id}"><i class="fill"></i><span class="num">${o.n}</span><span class="nome"><small>${icone}</small> ${o.id === 'entrar' ? (o.praca ? 'ARENA' : 'ENTRAR') : o.nome}${extra}</span><span class="cnt">${o.semSaida ? 'sem saída' : '0 votos'}</span></div>`;
      }).join('');
      this.cache.vt = null;
    }
    const max = Math.max(1, ...v.opcoes.map(o => o.votos));
    for (const o of v.opcoes) {
      const el = document.querySelector(`.op[data-op="${o.id}"]`); if (!el) continue;
      el.querySelector('.cnt').textContent = `${o.votos} voto${o.votos === 1 ? '' : 's'}${o.semSaida ? ' · sem saída' : ''}`;
      el.querySelector('.fill').style.height = (o.votos / max * 100).toFixed(0) + '%';
      const lider = v.aberta && o.votos > 0 && o.votos === max;
      el.classList.toggle('lider', lider);
      el.classList.toggle('venceu', !v.aberta && v.resultado?.id === o.id);
      el.classList.toggle('perdeu', !v.aberta && v.resultado?.id !== o.id);
    }
    const res = $('v-res'), tempo = $('v-tempo');
    if (v.aberta) {
      res.hidden = true; tempo.hidden = false;
      // a contagem termina "atraso" segundos antes de fechar: é o tempo dos votos de quem assiste atrasado chegarem
      const resta = v.restanteNaTela ?? v.restante;
      const frac = clamp(resta / v.duracao, 0, 1);
      $('v-barra').style.width = (frac * 100).toFixed(1) + '%';
      tempo.classList.toggle('urg', resta < 3.5);
      if (v.contandoAtrasados) {
        this.set('v-titulo', '⏳ CONTANDO VOTOS DA LIVE...');
        this.set('v-sub', 'ainda dá tempo de votar');
      } else {
        this.set('v-titulo', v.praia ? `🏖️ SAIR DA PRAIA POR ONDE? · ${Math.ceil(resta)}s` : `🗳️ PRÓXIMO CRUZAMENTO · ${Math.ceil(resta)}s`);
        this.set('v-sub', v.loja ? `${v.loja.emoji} ${v.loja.nome} aqui!` : 'comente o número');
      }
    } else {
      tempo.hidden = true; res.hidden = false;
      const r = v.resultado, op = v.opcoes.find(o => o.id === r.id);
      const nome = op.id === 'entrar' ? (op.praca ? 'ARENA DA PRAÇA' : `ENTRAR NA ${op.shop.nome.toUpperCase()}`) : op.nome;
      const txt = r.auto ? `🤖 ninguém votou · a IA escolheu <b>${esc(nome)}</b>` : `➜ <b>${esc(nome)}</b> com ${r.votos} voto${r.votos === 1 ? '' : 's'}${r.empate ? ' (desempate no sorteio)' : ''}`;
      this.html('v-res', txt);
      // decidido, mas o herói só atravessa com a área limpa
      const l = g.limpando;
      this.set('v-titulo', l ? `🧟 LIMPE A ÁREA · faltam ${l.restam}` : '🗳️ O CHAT DECIDIU');
      this.set('v-sub', l ? 'pra atravessar' : '');
    }
  }
}
