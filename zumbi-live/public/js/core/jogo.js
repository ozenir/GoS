// O jogo em si: herói com IA, zumbis, votação, presentes, rodadas. Não desenha nada:
// quem desenha é a parte "view", que lê o estado daqui e os eventos (this.events).
// Por isso dá pra rodar partidas inteiras no Node pra testar e equilibrar (teste/simular.mjs).
import { clamp, dist, dist2, makeRng, DIRS, turnLeft, turnRight, nomeSeguro, quarteiroesTxt } from './util.js';
import { City, SHOPS, BAIRROS, P as PERIODO } from './city.js';
import { Room } from './room.js';
import { Praia, PRAIA } from './praia.js';
import { FlowField } from './flow.js';
import { ZUMBIS, CLASSES, ARMAS, CORPO, xpParaNivel, multVidaNivel, NIVEL_MAXIMO } from './dados.js';
import { EFEITOS, ladoDo } from './efeitos.js';
import { Votacao, lerVoto, lerEscolha, OPCOES } from './votacao.js';
import { sortearCartas, escolhaDaIA, aplicarCarta, atualizarHabilidades, habilidadesDoHeroi, cartasDeus, deusPendente, supremaSegura, aoMatarZumbi, ATIVAS, NIVEL_PRESENTE, presenteNivel10, cartasPresente } from './habilidades.js';
import { pedeGrafico } from './grafico.js';
import { RECOMPENSA, DROPS, XP_POR_PILHA_SORTE, defesaRuna, CONVERSIVEL, PARAQUEDISTA, ZUMBI_FA, FORTES, chaveForte } from './recompensas.js';
import {
  atributosDaClasse, danoDoHeroi, intervaloTiro, intervaloCorpo, alcanceArma, velocidadeHeroi,
  danoNoHeroi, valorCura, statsZumbi, danoDoZumbi, danoNoZumbi, chanceDoStatus, danoExplosao, danoAliado, ALIADOS,
  TORCIDA, aplicarTorcida, aplicarPericias, PERICIAS, TOQUE, MORDIDA
} from './dano.js';
import { STATUS, Estados, sincronizarAtributos } from './status.js';
import { AMBIENTE, efeitoDoAmbiente, faixaLivre, machuca, dentro } from './ambiente.js';
import {
  AMEACA, furiaDaHorda, nivelAmeaca, alvoNaturais, intervaloAparecer, tamanhoGrupo, tamanhoHorda, multPresente, multPredio, pesosTipos,
  multInicio, forcaInicio, cotaQuadra, tamanhoHordaQuadra, NIVEL_INIMIGOS_NOVOS, EXPLOSAO, TOMATEIRO, PEDREIRO
} from './ameaca.js';
import { CHANCES_PADRAO, PERIGOS, AMEACA_POR_PERIGO, ATRASO_PERIGO, sortearCaminho } from './caminhos.js';
import { preverDestino } from './previsao.js';
import { pedeTabela } from './fusoes.js';
import { TELA, ZUMBIS_TELA, tipoTela, idTela, niveisPorMoedas, sortearTela, sortearNaRua } from './tela.js';
import { caboDeGuerra, multSpawnCabo, multForcaCabo, sorteCabo, CABO } from './cabo.js';
import { PORTAL, RELIQUIAS, sortearRodadas, forcaGuardiao, escolhaPortalIA, revelar, aplicarEfeito, poderComPresente, darReliquia, atualizarReliquia, reliquiaSalva } from './portal.js';

// Quanto tempo o resultado da votação fica na tela; a próxima votação só abre depois disso
export const RESULTADO_SEG = 10;
import { Historia, HISTORIA } from './historia.js';
import { SOBREVIVENCIA, rampa, montarCena, cenaAtiva, atualizarCena, zumbiDevorando, calcularDuelo, boteDoZumbi, movimentoDuelo, calmo, pesosDestino, vontadeDestino } from './sobrevivencia.js';
import { LOJAS } from './room.js';
import { lugaresDaViagem, rotaAte, ruaLivre, pontosDaRota } from './mapa.js';
import { ENCONTROS, criarEncontro, decidirEncontro, escolhaEncontroIA, atualizarEncontro, voltaramComoZumbi, quarteiraoDosSalvos, salvosChegaram } from './encontros.js';
import { atualizarCenario } from './cenario.js';
import { abrirEscolha, atualizarPrologo, votoPrologo, atualizarMoto } from './prologo.js';
import { MASCATE, talvezMascate, mascateAtivo, mascateSegura, atualizarMascate, objetivoMascate, atualizarLoja, votoLoja, escolhaBarganhaIA, decidirBarganha } from './mascate.js';
import { guardarTonico, atualizarBolsa, sortearTonico } from './itens.js';

export const PADRAO = {
  votoDur: 10, relNum: 10, relDest: 12, protecao: 15, likesPor: 300, maxZ: 90,
  velHeroi: 1.1, periodoDia: 150, predioT: 70,
  // zumbis da tela (tela.js): liga/desliga, chance de um presente de atrapalhar mandar um, intervalo e chance na rua
  telaAtiva: 1, telaChance: TELA.chancePresente, telaRecarga: TELA.recargaPresente, telaRua: TELA.naRua.chance,   // periodoDia: segundos de cada período (manhã, tarde, noite, madrugada)
  torcidaMax: TORCIDA.maxPessoas,
  atraso: 6,        // atraso da live (s): quanto tempo a tela do TikTok chega atrasada pra quem assiste
  escolhaDur: 12,   // tempo da contagem da escolha de habilidade (A, B, C) ao subir de nível
  caidoDur: 12,     // quanto tempo o herói fica caído esperando presente antes de morrer (0 = morre na hora)
  // recompensas de presente (recompensas.js)
  dropAteMoedas: RECOMPENSA.dropAteMoedas, doacaoAPartirDe: RECOMPENSA.doacaoAPartirDe,
  inspiracaoSeg: RECOMPENSA.inspiracao.segundos, colossoVida: RECOMPENSA.chefe.vida
};
const CHAVES = {
  segundos_de_votacao: 'votoDur', segundos_do_relatorio: 'relNum', segundos_dos_destaques: 'relDest',
  protecao_ao_nascer_segundos: 'protecao', curtidas_por_suprimento: 'likesPor', maximo_zumbis: 'maxZ',
  velocidade_do_heroi: 'velHeroi',
  periodo_do_dia_segundos: 'periodoDia', segundos_dentro_do_predio: 'predioT',
  zumbis_da_tela: 'telaAtiva', tela_chance_por_presente: 'telaChance', tela_recarga_segundos: 'telaRecarga', tela_na_rua_chance: 'telaRua',
  torcida_maximo_pessoas: 'torcidaMax', atraso_da_live_segundos: 'atraso', segundos_caido: 'caidoDur',
  segundos_escolha_habilidade: 'escolhaDur',
  drop_ate_moedas: 'dropAteMoedas', doacao_a_partir_de_moedas: 'doacaoAPartirDe', inspiracao_segundos: 'inspiracaoSeg',
  vida_do_colosso: 'colossoVida'
};
// Campos do config.json que mexem no nível de ameaça (ameaca.js)
const CHAVES_AMEACA = {
  ameaca_por_minuto: 'porMinuto', ameaca_por_quarteirao: 'porQuarteirao', ameaca_por_nivel_do_heroi: 'porNivelHeroi',
  horda_a_cada_segundos: 'hordaCadaSegundos', horda_base: 'hordaBase', horda_por_nivel: 'hordaPorNivel',
  horda_a_cada_quarteiroes: 'hordaCadaQuarteiroes', zumbis_por_quarteirao: 'cotaBase', zumbis_por_quarteirao_por_nivel: 'cotaPorNivel',
  zumbis_na_rua_base: 'naturaisBase', zumbis_na_rua_por_nivel: 'naturaisPorNivel', ameaca_por_caminho_perigoso: 'porPerigo'
};
// Ritmo de sobrevivência (sobrevivencia.js)
const CHAVES_SOBREV = { quarteiroes_ate_a_rua_cheia: 'quarteiroesAteCheio', zumbis_no_segundo_quarteirao: 'rampaInicio', passo_cuidadoso: 'calmaVel', cena_do_primeiro_quarteirao: 'cenaLigada', viagem_pelo_mapa: 'mapa' };
// Chances de cada tipo de caminho (caminhos.js)
const CHAVES_CAMINHO = { caminho_perigoso_porcento: 'perigoso', caminho_livre_porcento: 'livre', caminho_historia_porcento: 'historia' };

let proxId = 1;

// Escolha de habilidade com níveis acumulados na fila (2 ou mais): votação mais curta (escolhaDur × mult, no mínimo
// `minimo` segundos; o atraso da live continua valendo) e menos espera entre uma escolha e a próxima
export const ESCOLHA_RAPIDA = { mult: 0.6, minimo: 7, espera: 1.5 };

// Escudo de energia: o máximo que cada carga segura de um golpe (fração da vida máxima)
export const ESCUDO_SEGURA = 0.2;

// Controle no zumbi: atordoado, congelado e com medo não se renovam em cima um do outro; depois que passa,
// o zumbi fica CONTROLE_IMUNE segundos imune (a janela pra ele atacar)
export const CONTROLE = new Set(['atordoado', 'congelado', 'medo']);
export const CONTROLE_IMUNE = 1.2;

// Quantas curas/kits cabem na mochila do herói (guardados quando chegam com a vida alta)
export const MOCHILA_MAX = 5;

// Segundo fôlego do começo (ver segundoFolego)
export const FOLEGO = { ateNivel: 10, limite: 0.2, cura: 0.2, invencivel: 3, raio: 4, empurra: 7, atordoa: 1.5, recarga: 50 };

export class Jogo {
  constructor(opts = {}) {
    this.cfg = { ...PADRAO };
    this.A = { ...AMEACA };
    // ritmo de sobrevivência (sobrevivencia.js). opts.sobrevivencia = false: o ritmo antigo, de arcade (só testes)
    this.S = { ...JSON.parse(JSON.stringify(SOBREVIVENCIA)), cenaLigada: opts.cena ?? 1 };
    this.S.mapa = opts.mapa ?? 1;   // viagem pelo mapa (mapa.js): o chat escolhe pra onde ir, não a direção
    this.S.mascate = opts.mascate ?? 1;   // o comerciante ambulante e a grana (mascate.js)
    this.S.historia = opts.historia ?? 0;  // história (prologo.js): escolha do herói pelo chat, introdução e caminhos
    this.prologo = null;
    this.valadaresLiberado = !!opts.valadaresLiberado;   // o Valadares aparece na escolha depois de um final
    if (opts.sobrevivencia === false) Object.assign(this.S, { cenaLigada: 0, rampaInicio: 1, calmaVel: 1, tempoMin: 1, xpRampa: 0, quarteiroesAteCheio: 0, destinoChance: 0, mapa: 0, mascate: 0, duelo: { ...this.S.duelo, max: 0 } });
    this.chances = { ...CHANCES_PADRAO };
    this.historia = new Historia(opts.historiaVista);
    this.classeFixa = opts.classe && CLASSES[opts.classe] ? opts.classe : null;   // só para testes
    this.rng = makeRng(opts.seed ?? (Date.now() & 0xffffffff));
    this.events = [];
    this.t = 0;
    this.heroiN = opts.heroiN || 0;
    this.recorde = opts.recorde || 0;
    this.hall = opts.hall || [];
    this.nomes = [];
    this.likes = 0;
    this.flow = new FlowField(26);
    this.flowHeroi = new FlowField(14);
    this.flowRota = new FlowField(30);    // caminho de volta pra rota, quando o herói é empurrado pra outra rua
    this.ultimoHeroi = null;
    this.pendentesAjuda = [];
    this.fila = [];
    this.torcida = new Map();   // quem comentou -> quando
    this.torcidaN = 0;
    this.torcidaT = 0;
    this.novoHeroi();
  }

  emit(type, data = {}) {
    this.events.push({ type, ...data });
    if (this.events.length > 600) this.events.splice(0, 200);
  }
  drainEvents() { const e = this.events; this.events = []; return e; }

  configurar(jogo = {}) {
    for (const [k, v] of Object.entries(jogo)) {
      const c = CHAVES[k];
      if (c && Number.isFinite(Number(v)) && Number(v) >= 0) this.cfg[c] = Number(v);
      const a = CHAVES_AMEACA[k];
      if (a && Number.isFinite(Number(v)) && Number(v) >= 0) this.A[a] = Number(v);
      const ch = CHAVES_CAMINHO[k];
      if (ch && Number.isFinite(Number(v)) && Number(v) >= 0) this.chances[ch] = Number(v);
      const sb = CHAVES_SOBREV[k];
      if (sb && Number.isFinite(Number(v)) && Number(v) >= 0) this.S[sb] = Number(v);
    }
  }

  /* =================== Rodadas =================== */
  // classeEscolhida: quem o chat escolheu (prologo.js). Sem ela, com a história ligada, abre a tela de escolha
  // (o herói sorteado aqui só fica parado por trás da tela até o chat decidir).
  novoHeroi(classeEscolhida = null) {
    this.heroiN++;
    const ids = Object.keys(CLASSES).filter(c => c !== this.hero?.classe);
    const classe = classeEscolhida && CLASSES[classeEscolhida] ? classeEscolhida : this.classeFixa || this.rng.pick(ids);
    const C = CLASSES[classe];
    this.city = new City(this.rng.int(1, 1e9));
    this.map = this.city;
    this.room = null;
    const dir = this.rng.int(0, 3);
    const start = this.city.nodePos(0, 0);
    this.hero = {
      x: start.x, y: start.y, classe, n: this.heroiN,
      vida: C.vida, vidaMax: C.vida,          // vidaMax é só leitura: quem manda é h.attr (dano.js)
      arma: C.arma || null, municao: C.arma ? (C.municao ?? ARMAS[C.arma].municao ?? null) : null, armaQ: 0,   // armaQ: quarteirões que a arma lendária ainda dura
      corpo: C.corpo || 'empurrao', golpes: CORPO[C.corpo || 'empurrao'].golpes || 0,
      pericias: { ...(C.pericias || {}) }, instintoCd: 0, folegoCd: 0,
      colete: 0, tiroCd: 0, corpoCd: 0, invT: 0, invQ: 0,   // invT: invencível por segundos; invQ: por quarteirões (helicóptero)
      nivel: 1, xp: 0, fx: DIRS[dir][0], fy: DIRS[dir][1], andando: false, mira: null, animT: 0,
      parado: 0, ultimaPos: { x: start.x, y: start.y }, vidaBaixa: false,
      mochila: [],     // curas e kits que chegaram com a vida alta: ele usa sozinho quando precisar
      bolsa: [],       // tônicos (itens.js): ele bebe sozinho na hora certa
      habs: {}, passivas: {}, supremas: [], deus: null, treino: 0, habT: {}, supT: {}, escudo: 0   // habilidades escolhidas pelo chat (habilidades.js)
    };
    this.praia = null;            // praia em andamento (praia.js)
    this.figurantes = [];         // pessoas fugindo ou sendo devoradas (só cenário, ninguém interage)
    this.figT = 25;
    this.escolha = null;          // escolha de habilidade aberta (votação A/B/C)
    this.niveisPendentes = 0;     // níveis que ainda vão virar escolha
    this.filaNiveis = [];         // quais níveis são (a suprema do nível 10 passa na frente)
    this.escolhaEspera = 0;
    this.escolhaRes = null;       // última escolha (pra mostrar o resultado)
    this.caido = null;
    this.levantadas = 0;
    this.hero.viewer = this.proximoNome || null;     // { nick, avatar, lado } de quem deu o nome
    this.proximoNome = null;
    this.hero.attr = atributosDaClasse(C, this.hero);
    this.hero.estados = new Estados();
    aplicarPericias(this.hero, C);
    this.sincronizarVida();
    this.rota = { i: 0, j: 0, dir, alvo: { i: DIRS[dir][0], j: DIRS[dir][1] }, beco: null };
    this.bairroAtual = null;
    this.zumbis = [];
    this.aliados = [];
    this.itens = [];
    this.zonas = [];          // perigos que aparecem durante o jogo (vidro de presente, fogo de explosão...)
    this.zonasAgora = [];     // perigos perto do herói neste quadro (cidade ou prédio + os de cima)
    this.agendados = [];
    this.filaCd = 0;
    this.voto = null;
    this.votoAbreT = 1.2;
    this.decisao = null;
    this.indoPorta = null;
    this.indoPraca = null;
    this.destino = null;          // lugar no fim da rua escolhida (mercado, hospital...): entra quando chega
    this.viagem = null;           // viagem pelo mapa (mapa.js): { lugar, dirs } — a rota até o lugar escolhido
    this.visitados = [];          // cruzamentos ("i,j") dos últimos lugares visitados: o mapa não oferece de novo
    this.encontro = null;         // alguém pedindo ajuda no caminho (encontros.js)
    this.viaturas = []; this.janelas = []; this.viaturaT = null; this.janelaT = null;   // cenário vivo (cenario.js)
    this.mascate = null;          // o Barganha (mascate.js)
    this.loja = null;             // a banca do Barganha aberta (a rua fica pausada)
    this.hero.grana = this.S.mascate ? MASCATE.granaInicial : 0;   // 💰 R$ pra negociar com ele
    this.perdidos = [];           // quem ficou pra trás: volta como zumbi uns quarteirões depois
    this.arena = null;
    this.ultimaLoja = -9;
    this.stats = { inicio: this.t, quarteiroes: 0, abates: 0, predios: 0, ajudou: new Map(), atrapalhou: new Map(), matador: null, cruzamentos: 0, caminhos: { perigoso: 0, livre: 0, historia: 0 } };
    this.fase = 'jogo';
    this.faseT = 0;
    this.protecao = this.cfg.protecao;
    this.noiteT = 0;          // noite extra (Rei Zumbi, rua escura), por cima do ciclo do dia
    this.cicloT = 0;          // relógio do dia: todo herói começa de manhã
    this.periodo = 'manha';
    this.spawnT = 3;
    this.nivelAmeaca = 1;
    this.ameacaBonus = 0;
    this.trecho = null;
    this.hordaT = this.A.hordaCadaSegundos;
    this.cotaRua = null;            // zumbis da rua que ainda nascem neste quarteirão (null = calcula na hora)
    this.limpando = null;           // esperando no cruzamento a área ficar limpa
    this.areaLiberada = false;      // área limpa (ou tempo máximo da limpeza): pode atravessar quando chegar
    this.colossoPendente = null;    // doação: o colosso que vem no próximo quarteirão (recompensas.js)
    this.cabo = this.cabo || caboDeGuerra(null);   // cabo de guerra: top ajudante x top atrapalhante (cabo.js)
    this.fusoesDaLive = this.fusoesDaLive || new Set();   // supremas já feitas nesta live (tabela do T, fusoes.js)
    this.objHab = [];               // minas, torretas, bumerangues... das habilidades (hab-base.js)
    this.carros = [];               // conversíveis dos zumbis passando (presente de atrapalhar de 1 moeda)
    this.paraquedistas = [];        // zumbis descendo de paraquedas em cima do herói (idem)
    this.tomates = [];              // tomates (e pedras) voando do zumbi do tomate (e da pedra) até o herói
    // quarteirão da próxima horda gigante: a primeira só quando a rua já está cheia (sobrevivencia.js → rampa)
    this.proxHordaQ = Math.max(this.A.hordaCadaQuarteiroes, this.S.quarteiroesAteCheio);
    this.tempoAmeaca = 0;           // tempo que conta pra ameaça (na rua calma do começo, conta menos)
    this.cena = null;               // a cena do 1º quarteirão (zumbi devorando uma pessoa)
    this.dueloAtivo = null;
    this.alarmeT = 0;
    this.alarmeCarro = null;
    this.heliT = 0;
    this.flowT = 0;
    this.exHeroiT = this.ultimoHeroi ? 45 : -1;   // até o nível 10 o ex-herói espera a próxima arena
    this.ultimaAjudaT = this.t;                     // último presente de ajuda (a fúria da horda só conta o tempo sem ajuda)
    this.relatorio = null;
    this.curaGolpes = 0;
    this.emit('novo_heroi', { n: this.heroiN, classe, nome: C.nome, emoji: C.emoji, exHeroi: !!this.ultimoHeroi, viewer: this.hero.viewer, exNome: this.ultimoHeroi?.viewer?.nick || null });
    // Presentes que ajudam e chegaram enquanto o herói anterior estava morto valem para o novo
    this.aplicarPendentes();
    // 1º quarteirão: a cena (um zumbi devorando alguém). A votação da direção só abre depois da luta.
    if (this.S.cenaLigada && montarCena(this)) this.votoAbreT = 1e9;
    this.prologo = null;
    // história ligada: o chat escolhe o herói (prologo.js)
    if (this.S.historia && !classeEscolhida && !this.classeFixa) abrirEscolha(this);
  }

  // Presentes de ajuda que chegaram sem herói em jogo (morto, ou na escolha / introdução): valem agora
  aplicarPendentes() {
    const pend = this.pendentesAjuda.splice(0);
    for (const p of pend) this.agendar(2 + this.rng.next(), () => this.comPresente(p.quem, () => EFEITOS[p.regra.efeito].aplicar(this, p.regra, p.qtd, p.quem)));
  }

  morrer() {
    if (this.fase !== 'jogo') return;
    const h = this.hero;
    this.fase = 'morto';
    this.faseT = 0;
    h.vida = 0;
    this.voto = null;
    this.escolha = null; this.niveisPendentes = 0; this.filaNiveis = [];
    const tempo = this.t - this.stats.inicio;
    const q = this.stats.quarteiroes;
    const novoRecorde = q > this.recorde;
    if (novoRecorde) this.recorde = q;
    const topo = m => [...m.values()].sort((a, b) => b.coins - a.coins || a.primeiro - b.primeiro)[0] || null;
    this.proximoNome = this.escolherPadrinho(topo(this.stats.ajudou), topo(this.stats.atrapalhou));
    this.relatorio = {
      n: h.n, classe: h.classe, nome: CLASSES[h.classe].nome, emoji: CLASSES[h.classe].emoji, curaGolpes: Math.round(this.curaGolpes || 0),
      quarteiroes: q, abates: this.stats.abates, tempo, nivel: h.nivel, predios: this.stats.predios, ameaca: this.nivelAmeaca,
      recorde: this.recorde, novoRecorde, matador: this.stats.matador,
      caminhos: { ...this.stats.caminhos }, levantadas: this.levantadas, habs: habilidadesDoHeroi(h),
      topAjuda: topo(this.stats.ajudou), topAtrapalha: topo(this.stats.atrapalhou),
      viewer: h.viewer || null, proximoNome: this.proximoNome
    };
    this.hall.push({ n: h.n, nome: h.viewer?.nick || CLASSES[h.classe].nome, emoji: CLASSES[h.classe].emoji, quarteiroes: q, tempo });
    this.hall.sort((a, b) => b.quarteiroes - a.quarteiroes || b.tempo - a.tempo);
    this.hall.length = Math.min(this.hall.length, 3);
    this.ultimoHeroi = { n: h.n, classe: h.classe, arma: h.arma, viewer: h.viewer || null };
    this.emit('heroi_morreu', { relatorio: this.relatorio, hall: this.hall });
  }

  /* =================== Caído: espera os presentes atrasados da live =================== */
  // Quando a vida zera, o herói não morre na hora: fica CAÍDO por cfg.caidoDur segundos.
  // Motivo: quem assiste vê a tela uns segundos atrasada (cfg.atraso). Sem isso, quem manda uma Rosa
  // ao ver o herói quase morrendo chega tarde demais e perde o presente.
  //   presente de AJUDA     → levanta o herói (vida, invencível por 3 s, empurra os zumbis) e o presente vale normal
  //   presente de ATRAPALHAR → golpe final: morre em 2,5 s (se ninguém ajudar antes) e quem mandou leva o crédito
  //   kit guardado na mochila → levanta sozinho, sem precisar cair
  // semMochila: o botão de teste "derrubar herói" (a mochila não segura)
  cair(semMochila = false) {
    const h = this.hero;
    h.vida = 0;
    if (!semMochila && this.usarMochila(true)) return;
    if (!(this.cfg.caidoDur > 0)) { this.morrer(); return; }
    this.caido = { t: this.cfg.caidoDur, dur: this.cfg.caidoDur, finalizador: null };
    h.andando = false; h.mira = null;
    this.emit('caiu', { x: h.x, y: h.y, segundos: this.cfg.caidoDur });
  }

  atualizarCaido(dt) {
    const c = this.caido;
    c.t -= dt;
    this.atualizarZonas(dt);
    this.atualizarZumbis(dt);
    this.atualizarCarros(dt);
    this.atualizarItens(dt);
    if (c.t <= 0) {
      this.caido = null;
      if (c.finalizador) this.stats.matador = { nick: c.finalizador.nick, avatar: c.finalizador.avatar || '', causa: 'golpe final' };
      this.morrer();
    }
  }

  // Cada vez que levanta, volta com menos vida (50%, 40%, 30%... no mínimo 20%)
  levantar(quem) {
    const h = this.hero;
    if (!this.caido) return;
    this.caido = null;
    this.levantadas++;
    const pct = Math.max(0.2, 0.5 - 0.1 * (this.levantadas - 1));
    h.vida = h.vidaMax * pct;
    h.invT = Math.max(h.invT, 3);
    h.vidaBaixa = pct < 0.3;
    h.parado = 0; h.ultimaPos = { x: h.x, y: h.y };
    h.estados.limpar('negativo');
    sincronizarAtributos(h.estados, h.attr);
    // onda de choque: quem estava em volta é empurrado e fica tonto
    for (const z of this.zumbis) {
      if (z.morto) continue;
      const dx = z.x - h.x, dy = z.y - h.y, d = Math.hypot(dx, dy);
      if (d > 3.5) continue;
      if (d > 0.01) { z.kx += dx / d * 7; z.ky += dy / d * 7; }
      this.aplicarStatus(z, 'atordoado', { duracao: 1.5 });
      if (z.pavio >= 0) z.pavio = -1;      // explosivo perto apaga o pavio
    }
    this.emit('levantou', { x: h.x, y: h.y, nick: quem?.nick || null, vez: this.levantadas });
  }

  // Mochila: curas e kits que chegaram com a vida alta ficam guardados (até MOCHILA_MAX) em vez de
  // serem gastos à toa. tipo: 'kit' ou 'cura' (só muda o texto). item = pegou do chão (sem faixa na tela).
  guardarNaMochila(valor, quem, tipo = 'kit', item = false) {
    const h = this.hero;
    if (h.mochila.length >= MOCHILA_MAX) return false;
    h.mochila.push({ valor, quem, tipo });
    this.emit('mochila', { qtd: h.mochila.length, nick: quem?.nick || null, tipo, item, x: h.x, y: h.y });
    return true;
  }

  // A cura ia ser desperdiçada? (mais da metade dela passaria da vida cheia) → vale guardar na mochila
  curaSobrando(pct) {
    const h = this.hero;
    return h.vidaMax - h.vida < valorCura(h, pct) / 2;
  }

  // Cura pega do chão: com a vida alta vai pra mochila; se não couber (ou se precisa), usa na hora
  curarOuGuardar(pct, quem, tipo) {
    if (this.curaSobrando(pct) && this.guardarNaMochila(pct, quem, tipo, true)) return;
    this.curar(pct, quem, true);
  }

  // Usa um kit da mochila. caindo = a vida acabou de zerar (o kit segura o herói de pé).
  usarMochila(caindo = false) {
    const h = this.hero;
    if (!h.mochila.length) return false;
    const k = h.mochila.shift();
    if (caindo) h.invT = Math.max(h.invT, 1.5);
    this.curar(k.valor + (caindo ? 10 : 0), k.quem, true, caindo);   // caindo: salva mesmo no vidro
    this.emit('mochila_usou', { nick: k.quem?.nick || null, tipo: k.tipo || 'kit', caindo, x: h.x, y: h.y, resta: h.mochila.length });
    return true;
  }

  // Quem dá nome ao próximo herói: entre quem MAIS AJUDOU e quem MAIS ATRAPALHOU na rodada,
  // vale quem doou primeiro. Se só um dos lados teve doação, é esse. Se ninguém doou, o herói fica sem nome.
  escolherPadrinho(ajuda, atrapalha) {
    const c = [];
    if (ajuda) c.push({ ...ajuda, lado: 'ajuda' });
    if (atrapalha) c.push({ ...atrapalha, lado: 'atrapalha' });
    if (!c.length) return null;
    c.sort((a, b) => a.primeiro - b.primeiro);
    return { nick: c[0].nick, avatar: c[0].avatar || '', lado: c[0].lado };
  }

  /* =================== Laço principal =================== */
  update(dt) {
    // portal dos 500 aberto: a rua fica PAUSADA (nem o tempo da ameaça corre); só o minijogo anda
    if (this.portal) { this.atualizarPortal(dt); return; }
    // prólogo (escolha do herói, introdução, a queda da moto): a rua também fica PAUSADA (prologo.js)
    if (this.prologo) { atualizarPrologo(this, dt); return; }
    // banca do Barganha aberta: a rua também fica PAUSADA enquanto o chat negocia (mascate.js)
    if (this.loja) { atualizarLoja(this, dt); return; }
    this.t += dt;
    this.faseT += dt;
    for (let i = this.agendados.length - 1; i >= 0; i--) {
      const a = this.agendados[i];
      if (this.caido && !a.sempre) continue;      // caído: o que estava marcado espera ele levantar
      if ((a.t -= dt) <= 0) { this.agendados.splice(i, 1); if (this.fase === 'jogo' || a.sempre) a.fn(); }
    }
    if (this.fase === 'morto') {
      this.atualizarZumbis(dt);
      this.atualizarItens(dt);
      if (this.faseT >= this.cfg.relNum + this.cfg.relDest) this.novoHeroi();
      return;
    }
    if (this.caido) { this.atualizarCaido(dt); return; }
    this.protecao = Math.max(0, this.protecao - dt);
    this.atualizarTorcida(dt);
    this.atualizarZonas(dt);
    this.noiteT = Math.max(0, this.noiteT - dt);
    this.cicloT = (this.cicloT || 0) + dt;
    this.atualizarPeriodo();
    this.heliT = Math.max(0, this.heliT - dt);
    this.diretor(dt);
    atualizarCena(this, dt);
    atualizarEncontro(this, dt);
    atualizarCenario(this, dt);   // veículos de emergência passando e gente nas janelas (cenario.js)
    atualizarMascate(this, dt);   // o comerciante ambulante
    this.dueloAtivo = this.hero.moto ? null : calcularDuelo(this);
    this.processarFila(dt);
    this.zumbisDeQuemEntrou(dt);
    this.atualizarHeroi(dt);
    if (this.hero.moto && this.fase === 'jogo' && !this.caido) atualizarMoto(this, dt, ZUMBIS);   // de moto: atropela (prologo.js)
    if (this.fase === 'jogo' && !this.caido) atualizarBolsa(this, dt);   // os tônicos (itens.js)
    if (this.fase === 'jogo' && !this.caido) { this.atualizarEscolha(dt); if (!this.hero.moto) atualizarHabilidades(this, dt); atualizarReliquia(this, dt); this.checarPortal(); }
    this.atualizarFigurantes(dt);
    this.atualizarAliados(dt);
    this.atualizarZumbis(dt);
    this.danoPorToque(dt);
    this.atualizarCarros(dt);
    this.atualizarAlarmesCarro();
    this.atualizarItens(dt);
  }

  agendar(t, fn, sempre = false) { this.agendados.push({ t, fn, sempre }); }

  /* =================== Diretor: ritmo da partida =================== */
  diretor(dt) {
    const minutos = (this.t - this.stats.inicio) / 60;
    // Desgaste da cidade: começa depois de 1 minuto e chega no máximo com 10 minutos de run.
    // Ruas e prédios que aparecem depois disso vêm com buracos, carros batidos e em chamas, prédios pegando fogo.
    this.city.desgaste = clamp((minutos - 1) / 9, 0, 1);
    // na rua calma do começo o tempo pesa menos na ameaça (sobrevivencia.js)
    this.tempoAmeaca = (this.tempoAmeaca || 0) + dt * Math.max(this.S.tempoMin, this.rampaAtual());
    const n = nivelAmeaca(this.tempoAmeaca / 60, this.stats.quarteiroes, this.nivelForca(), this.A, this.ameacaBonus);
    if (!this.room) {
      const b = this.city.bairroNaPosicao(this.hero.x, this.hero.y);
      if (b !== this.bairroAtual) {
        const antes = this.bairroAtual; this.bairroAtual = b;
        if (antes) this.emit('bairro', { id: b, nome: BAIRROS[b].nome, emoji: BAIRROS[b].emoji });
      }
    }
    if (n > this.nivelAmeaca) { this.nivelAmeaca = n; this.emit('ameaca', { nivel: n }); }
    if (this.exHeroiT > 0 && (this.exHeroiT -= dt) <= 0) {
      // espera sair do prédio; antes do nível 10 só aparece como chefe da arena (iniciarArena)
      if (this.room || this.arena || this.hero.nivel < this.A.medioAteNivel) this.exHeroiT = 5;
      else this.chefe('exheroi', { nick: this.ultimoHeroi.viewer ? `${this.ultimoHeroi.viewer.nick} zumbi` : `Ex-herói #${this.ultimoHeroi.n}`, id: '__exheroi' }, 0);
    }

    if (this.room) { this.atualizarSala(dt); return; }
    if (this.arena) { this.atualizarArena(dt); return; }

    // Alarme de carro: zumbis chegando sem parar
    if (this.alarmeT > 0) {
      this.alarmeT -= dt;
      this.alarmeSpawn = (this.alarmeSpawn || 0) - dt;
      if (this.alarmeSpawn <= 0 && this.zumbis.length < this.cfg.maxZ + 15) {
        this.alarmeSpawn = 0.7;
        const base = this.alarmeCarro || this.hero;
        const p = this.pontoNaRua(base, 7, 12, 0);
        if (p) this.criarZumbi(this.rng.chance(0.25) ? 'corredor' : 'comum', p.x, p.y, this.alarmeQuem);
      }
      if (this.alarmeT <= 0 && this.alarmeCarro) { this.alarmeCarro.alarme = false; this.emit('alarme_fim'); }
    }

    const h = this.hero;
    const noite = this.ehNoite();
    const vidaPct = h.vida / h.vidaMax;
    const nv = this.nivelAmeaca;
    // Caminho livre: nenhum zumbi novo até o próximo cruzamento (no máximo 40 s, por segurança)
    if (this.trecho?.livre) {
      this.trecho.t = (this.trecho.t || 0) + dt;
      if (this.trecho.t < 40) return;
      this.trecho.livre = false;
    }
    // Horda que chega sozinha de tempos em tempos (cresce com a ameaça)
    if (this.protecao <= 0 && this.A.hordaCadaSegundos > 0 && h.nivel >= this.A.hordaDesdeNivel) {
      this.hordaT -= dt;
      if (this.hordaT <= 0) {
        this.hordaT = this.A.hordaCadaSegundos;
        const qtd = tamanhoHorda(nv, this.A);
        this.soltarZumbis('horda', qtd, null, { horda: true, semEscala: true });
        this.emit('horda', { qtd });
      }
    }
    let alvo = Math.round(alvoNaturais(nv, this.A) * this.multInicio());
    if (noite) alvo *= 1.6;
    if (vidaPct < 0.3) alvo *= 0.55;   // alivia quando o herói está quase morrendo (presentes não são afetados)
    if (this.protecao > 0) alvo *= 0.5;
    alvo = Math.min(alvo, this.cfg.maxZ * 0.7);
    let naturais = 0;
    for (const z of this.zumbis) if (!z.dono) naturais++;
    // cota da quadra: cada quarteirão tem um tanto fixo de zumbis da rua; esperando no cruzamento, não nasce mais
    if (this.cotaRua == null) this.cotaRua = Math.round(cotaQuadra(nv, this.multInicio(), this.A) * multSpawnCabo(this.cabo));   // atrapalhante na frente: mais zumbis
    if (this.limpando) { this.cotaRua = 0; this.limpando.restam = this.zumbisNaArea(); }   // (o painel mostra quantos faltam)
    this.spawnT -= dt;
    if (this.spawnT <= 0 && naturais < alvo && this.cotaRua > 0) {
      // na rua eles chegam em bandos (grupoRuaExtra a mais por grupo), com mais tempo entre um bando e outro
      this.spawnT = intervaloAparecer(nv, this.A) * this.A.intervaloRuaMult * (noite ? 0.7 : 1) / multSpawnCabo(this.cabo);
      const grupo = Math.min(this.cotaRua, Math.max(1, Math.round((tamanhoGrupo(nv, this.A) + this.A.grupoRuaExtra) * this.multInicio())));
      this.cotaRua -= grupo;
      const p = this.pontoNaRua(h, 8, 13, 0);   // de todos os lados (estilo Vampire Survivors), não só da frente
      if (p) for (let k = 0; k < grupo; k++) {
        const q = this.pontoPerto(p, 1.5) || p;
        this.criarZumbi(this.tipoNatural(), q.x, q.y, null, { nome: this.nomeDoChat() });
      }
    }
  }

  // De vez em quando um zumbi comum ganha o nome de alguém que comentou ou entrou na live
  nomeDoChat() {
    if (!this.nomes.length || !this.rng.chance(0.35)) return null;
    let comNome = 0;
    for (const z of this.zumbis) if (!z.morto && z.nome && !z.dono) comNome++;
    if (comNome >= 5) return null;
    return this.nomes[this.rng.int(0, Math.min(this.nomes.length, 15) - 1)].nick;
  }

  // Nível de ameaça: quão fortes os zumbis nascem agora (força: dano.js → statsZumbi; quando sobe: ameaca.js)
  ameaca() { return this.nivelAmeaca; }

  tipoNatural() { return this.rng.weighted(pesosTipos(this.nivelAmeaca, this.hero.nivel)); }

  noite(seg) {
    const antes = this.noiteT > 0;
    this.noiteT = Math.max(this.noiteT, seg);
    if (!antes) { this.noiteIni = this.t; this.emit('noite', { segundos: seg }); }
  }

  // Ciclo do dia: MANHÃ → TARDE → NOITE → MADRUGADA, cada um com cfg.periodoDia segundos (2:30; 0 = sempre manhã).
  // O relógio anda na rua e no prédio; pausa no herói caído e no portal. Todo herói novo começa de manhã.
  periodoDoDia() {
    const P = this.cfg.periodoDia;
    if (!(P > 0)) return { ...Jogo.PERIODOS[0], k: 0, resta: Infinity };
    const t = this.cicloT || 0, i = Math.floor(t / P) % 4;
    return { ...Jogo.PERIODOS[i], k: (t % P) / P, resta: P - (t % P) };
  }

  atualizarPeriodo() {
    const p = this.periodoDoDia();
    if (p.id === this.periodo) return;
    this.periodo = p.id;
    this.emit('periodo', { id: p.id, nome: p.nome, emoji: p.emoji });
    if (p.id === 'noite') this.emit('noite', { segundos: Math.round(p.resta) });
  }

  // Quanto está escuro agora (0 a 1) e em que parte do dia. Pelo ciclo: de manhã claro; na TARDE a luz fica
  // alaranjada e, na segunda metade, escurece aos poucos; a NOITE é escura; na MADRUGADA continua escuro e,
  // dos 40% em diante, clareia aos poucos (azulada). Por cima, a noite extra (Rei Zumbi, rua escura) chega
  // e vai embora com uma tarde e uma madrugada curtas (Jogo.CICLO). Vale a que estiver mais escura.
  luzDoDia() {
    const sm = x => { x = Math.min(1, Math.max(0, x)); return x * x * (3 - 2 * x); };
    const p = this.periodoDoDia();
    // tom: força da cor do céu (laranja na tarde, azul na madrugada); no ciclo é mais suave, porque dura minutos
    const ciclo = p.id === 'tarde' ? { noite: sm((p.k - 0.5) / 0.5), fase: 'tarde', k: p.k, tom: 0.6 * Math.sin(p.k * Math.PI) }
      : p.id === 'noite' ? { noite: 1, fase: 'noite', k: 1 }
      : p.id === 'madrugada' ? { noite: 1 - sm((p.k - 0.4) / 0.6), fase: 'madrugada', k: p.k, tom: 0.8 * Math.sin(p.k * Math.PI) }
      : { noite: 0, fase: 'dia', k: 0 };
    if (!(this.noiteT > 0)) return ciclo;
    const T = Jogo.CICLO, passou = this.t - (this.noiteIni ?? this.t), resta = this.noiteT;
    const tarde = Math.min(T.tarde, (passou + resta) / 3), madrugada = Math.min(T.madrugada, (passou + resta) / 3);
    let extra;
    if (passou < tarde) { const k = passou / tarde; extra = { noite: sm(k), fase: 'tarde', k }; }
    else if (resta < madrugada) { const k = 1 - resta / madrugada; extra = { noite: 1 - sm(k), fase: 'madrugada', k }; }
    else extra = { noite: 1, fase: 'noite', k: 1 };
    return extra.noite > ciclo.noite ? extra : ciclo;
  }

  // De noite os zumbis vêm em maior número e mais depressa: no período NOITE do ciclo ou na noite extra
  // (Rei Zumbi, rua escura). O escuro da tarde e da madrugada é só visual.
  ehNoite() {
    if (this.periodoDoDia().id === 'noite') return true;
    if (!(this.noiteT > 0)) return false;
    const passou = this.t - (this.noiteIni ?? this.t);
    return passou >= Math.min(Jogo.CICLO.tarde, (passou + this.noiteT) / 3) * 0.5;
  }

  static PERIODOS = [
    { id: 'manha', nome: 'manhã', emoji: '☀️' },
    { id: 'tarde', nome: 'tarde', emoji: '🌇' },
    { id: 'noite', nome: 'noite', emoji: '🌙' },
    { id: 'madrugada', nome: 'madrugada', emoji: '🌌' }
  ];

  // zumbis de quem entra na live: um a cada `intervalo` s, até `fila` esperando
  static ENTRADA = { intervalo: 2, fila: 20 };

  // noite extra (Rei Zumbi, rua escura): quantos segundos a tarde e a madrugada dela levam (escurecendo / clareando)
  static CICLO = { tarde: 8, madrugada: 8 };

  /* =================== Sala (dentro do prédio) =================== */
  entrarPredio(shop) {
    const h = this.hero;
    this.lembrarVisita(shop.i, shop.j);
    this.room = new Room(shop);
    this.map = this.room;
    this.salaT = 0;
    this.salaAlarme = false;
    this.indoPorta = null;
    this.ultimaLoja = this.stats.cruzamentos;
    this.stats.predios++;
    this.trecho = null;
    h.x = this.room.entrada.x; h.y = this.room.entrada.y;
    h.fx = 0; h.fy = -1;
    // Chefes seguem o herói pra dentro; o resto fica lá fora
    const chefes = this.zumbis.filter(z => ZUMBIS[z.tipo].chefe);
    this.zumbis = [];
    chefes.forEach((z, k) => this.agendar(4 + k * 2, () => { if (this.room) { z.x = this.room.entrada.x; z.y = this.room.entrada.y + 0.4; z.nascendo = 0.5; this.zumbis.push(z); } }));
    for (const a of this.aliados) { a.x = h.x + this.rng.range(-1, 1); a.y = h.y - 0.3; }
    // Itens que estavam caindo lá fora entram junto
    for (const it of this.itens) { const p = this.room.pontoLivre(this.rng, null); it.x = p.x; it.y = p.y; }
    this.zonas = [];
    const info = this.room.info;
    const nZ = Math.max(1, Math.round(info.zumbis * multPredio(this.nivelAmeaca, this.A) * Math.max(0.6, this.multInicio())));
    for (let k = 0; k < nZ; k++) {
      const p = this.room.pontoLivre(this.rng, this.room.entrada, 4);
      const tipo = shop.tipo === 'hospital' && this.rng.chance(0.3) ? 'gordo' : this.rng.chance(0.15 * shop.risco) ? 'corredor' : 'comum';
      this.criarZumbi(tipo, p.x, p.y, null, { nascendo: 0.01, dormindo: this.rng.chance(0.5) });
    }
    // grana escondida (mascate.js)
    if (this.S.mascate && this.rng.chance(MASCATE.predio.chance)) { const p = this.room.pontoLivre(this.rng, this.room.entrada, 3); this.itens.push({ id: proxId++, kind: 'grana', x: p.x, y: p.y, z: 0, vz: 0, data: { valor: this.rng.int(MASCATE.predio.min, MASCATE.predio.max) }, quem: null, vida: 999, achado: true }); }
    // às vezes, um tônico esquecido (itens.js)
    if (this.S.mascate && this.rng.chance(MASCATE.tonicoPredio)) { const p = this.room.pontoLivre(this.rng, this.room.entrada, 3); this.itens.push({ id: proxId++, kind: 'tonico', x: p.x, y: p.y, z: 0, vz: 0, data: { id: sortearTonico(this.rng, true) }, quem: null, vida: 999, achado: true }); }
    // o que tem lá dentro (cada item com sua chance: nem sempre tem tudo)
    for (const [kind, qtd, chance = 1] of info.loot) for (let k = 0; k < qtd; k++) {
      if (!this.rng.chance(chance)) continue;
      let kk = kind;
      if (kind === 'bau_lendario_chance') { if (!this.rng.chance(0.35)) continue; kk = 'bau_lendario'; }
      const p = this.room.pontoLivre(this.rng, this.room.entrada, 3);
      const data = kk === 'kit' ? { valor: 35 } : kk === 'arma' ? this.armaDaDelegacia() : {};
      this.itens.push({ id: proxId++, kind: kk, x: p.x, y: p.y, z: 0, vz: 0, data, quem: null, vida: 999, achado: true });
    }
    this.emit('entrou_predio', { tipo: shop.tipo, nome: shop.nome, emoji: shop.emoji });
  }

  atualizarSala(dt) {
    if (this.room.praia) { this.atualizarPraia(dt); return; }
    this.salaT += dt;
    const lim = this.cfg.predioT;
    if (!this.salaAlarme && this.salaT > lim - 20) {
      this.salaAlarme = true;
      this.emit('alarme', { sala: true });
      this.emit('aviso', { texto: '🚨 ALARME! Hora de sair do prédio', tipo: 'perigo' });
    }
    if (this.salaAlarme) {
      this.salaSpawn = (this.salaSpawn || 0) - dt;
      if (this.salaSpawn <= 0 && this.zumbis.length < 30) {
        this.salaSpawn = 1.6;
        this.criarZumbi('comum', this.room.entrada.x + this.rng.range(-1, 1), this.room.entrada.y + 0.3, null);
      }
    }
    if (this.salaT > lim + 20) this.sairPredio();   // segurança: nunca fica preso lá dentro
  }

  sairPredio() {
    const shop = this.room.shop;
    const chefes = this.zumbis.filter(z => ZUMBIS[z.tipo].chefe);
    this.room = null;
    this.map = this.city;
    const node = shop.saida;
    const p = this.city.nodePos(node.i, node.j);
    const h = this.hero;
    h.x = p.x; h.y = p.y;
    const r = this.rota;
    r.i = node.i; r.j = node.j;
    r.dir = this.direcaoLivre(node.i, node.j, r.dir);
    r.alvo = { i: node.i + DIRS[r.dir][0], j: node.j + DIRS[r.dir][1] };
    r.beco = null;
    h.fx = DIRS[r.dir][0]; h.fy = DIRS[r.dir][1];
    this.andouQuarteirao(1);
    this.zumbis = [];
    for (const z of chefes) {
      const q = this.pontoNaRua(h, 6, 9, 0) || { x: h.x - DIRS[r.dir][0] * 6, y: h.y - DIRS[r.dir][1] * 6 };
      z.x = q.x; z.y = q.y; z.nascendo = 0.5; this.zumbis.push(z);
    }
    for (const a of this.aliados) { a.x = h.x; a.y = h.y; }
    this.itens = this.itens.filter(it => !it.achado);
    for (const it of this.itens) { const q = this.pontoAFrente(2.5); it.x = q.x; it.y = q.y; }
    this.decisao = null;
    this.voto = null;
    this.trecho = null;
    this.votoAbreT = 0.8;
    this.spawnT = 2;
    this.flowT = 0;
    this.pararNoCruzamento();
    this.emit('saiu_predio', { tipo: shop.tipo });
    this.checarRecorde();
  }

  /* =================== Figurantes: pessoas fugindo ou sendo devoradas (só cenário) =================== */
  // Aparecem mais conforme o desgaste da cidade. Ninguém interage com eles: zumbis e herói não veem.
  //   fugindo:  corre pela rua gritando e some
  //   devorado: caído no chão com dois zumbis em cima, pedindo socorro; depois fica só o corpo
  atualizarFigurantes(dt) {
    for (const f of this.figurantes) {
      f.t += dt;
      if (f.tipo === 'fugindo') {
        const antes = { x: f.x, y: f.y };
        this.mover(f, f.vx * dt, f.vy * dt, 0.2);
        f.animT += Math.hypot(f.x - antes.x, f.y - antes.y);
        if (Math.hypot(f.x - antes.x, f.y - antes.y) < 0.005) { const a = this.rng.next() * Math.PI * 2; f.vx = Math.cos(a) * 1.7; f.vy = Math.sin(a) * 1.7; }
      }
    }
    if (this.figurantes.length) this.figurantes = this.figurantes.filter(f => f.t < f.vida && !this.room);
    const dg = this.city.desgaste || 0;
    if (this.room || this.arena || this.fase !== 'jogo' || dg <= 0) return;
    if ((this.figT -= dt) > 0) return;
    this.figT = this.rng.range(8, 16) / (0.5 + dg);
    const h = this.hero, p = this.pontoNaRua(h, 5, 9, 1);
    if (!p) return;
    const roupa = this.rng.int(0, 5);
    if (this.rng.chance(0.5)) {
      const dx = p.x - h.x, dy = p.y - h.y, d = Math.hypot(dx, dy) || 1;
      this.figurantes.push({ tipo: 'fugindo', x: p.x, y: p.y, vx: dx / d * 1.7, vy: dy / d * 1.7, fx: dx / d, fy: dy / d, t: 0, vida: 6, animT: 0, roupa, grito: this.rng.pick(['SOCORRO!', 'CORRE!', 'AAAH!', 'ME AJUDA!']) });
    } else {
      this.figurantes.push({ tipo: 'devorado', x: p.x, y: p.y, t: 0, vida: 16, roupa, grito: 'SOCORRO!' });
      this.emit('grito', { x: p.x, y: p.y });
    }
  }

  /* =================== Praia (nível 30+, praia.js) =================== */
  podePraia(extra = 0) {
    return this.hero.nivel >= PRAIA.desdeNivel && this.stats.cruzamentos + extra - (this.ultimaPraia ?? -99) >= PRAIA.intervalo && this.rng.chance(PRAIA.chance);
  }

  // A rua deu na praia: uma horda maior sai do mar; sobreviver 1 minuto
  entrarPraia() {
    const h = this.hero;
    this.viagem = null; this.destino = null;   // a rua deu na praia: a viagem acaba (saindo, vota pra onde ir)
    this.figurantes = [];
    this.room = new Praia(this.rng.int(1, 1e9));
    this.map = this.room;
    this.praia = { t: 0, ondaT: PRAIA.ondaCada, vencida: false };
    this.ultimaPraia = this.stats.cruzamentos;
    this.stats.praias = (this.stats.praias || 0) + 1;
    this.trecho = null; this.indoPorta = null; this.indoPraca = null; this.voto = null; this.decisao = null;
    h.x = this.room.entrada.x; h.y = this.room.entrada.y; h.fx = 0; h.fy = -1;
    this.zumbis = [];
    this.zonas = [];
    for (const a of this.aliados) { a.x = h.x + this.rng.range(-1, 1); a.y = h.y + 0.3; }
    for (const it of this.itens) { const p = this.room.pontoLivre(this.rng, null); it.x = p.x; it.y = p.y; }
    const q = Math.round(tamanhoHorda(this.nivelAmeaca, this.A) * PRAIA.hordaInicial);
    this.zumbisDoMar(q);
    this.emit('entrou_praia', { qtd: q });
  }

  zumbisDoMar(q) {
    for (let k = 0; k < q; k++) {
      const p = this.room.pontoNoMar(this.rng);
      const t = this.rng.chance(0.15) ? 'gordo' : this.hero.nivel >= NIVEL_INIMIGOS_NOVOS && this.rng.chance(0.15) ? 'esticado' : 'comum';
      this.criarZumbi(t, p.x, p.y, null, { nascendo: 0.3 + k * 0.1 });
    }
  }

  atualizarPraia(dt) {
    const p = this.praia, h = this.hero;
    p.t += dt;
    if (!p.vencida) {
      if ((p.ondaT -= dt) <= 0) {
        p.ondaT = PRAIA.ondaCada;
        if (this.zumbis.length < this.cfg.maxZ) this.zumbisDoMar(tamanhoGrupo(this.nivelAmeaca, this.A) + 3);
      }
      if (p.t >= PRAIA.duracao) {
        p.vencida = true;
        const a = this.pontoPerto(h, 1.5) || h, b = this.pontoPerto(h, 2) || h;
        this.soltarItemEm('bau_medio', {}, null, a.x, a.y, 6);
        this.soltarItemEm('kit', { valor: 40 }, null, b.x, b.y, 6);
        this.emit('praia_vencida', {});
        // votação de pra onde ir (mesma janela de votos atrasados)
        const ops = ['esquerda', 'frente', 'direita'].map(id => ({ id, ...OPCOES[id] }));
        this.voto = new Votacao(ops, this.cfg.votoDur, this.cfg.atraso);
        this.voto.loja = null; this.voto.bloqueadas = []; this.voto.praia = true;
        this.emit('votacao_abriu', { opcoes: ops.map(o => o.id), loja: null, praia: true });
      }
    } else if (this.voto) {
      if (this.voto.aberta) { this.voto.update(dt); if (this.voto.t <= 0) this.fecharVotacao(); }
      if (this.decisao && (p.saindoT = (p.saindoT ?? 2) - dt) <= 0) this.sairPraia(this.decisao.id);
    }
    if (p.t > PRAIA.duracao + 60) this.sairPraia('frente');   // segurança
  }

  // Na praia o herói fica na areia, longe do mar, girando em volta do meio (e pega o que cair)
  objetivoPraia() {
    const h = this.hero, room = this.room, c = room.centro;
    const ang = Math.atan2(h.y - c.y, h.x - c.x) + 0.5;
    return { x: clamp(c.x + Math.cos(ang) * 4, 2, room.w - 2), y: clamp(c.y + Math.sin(ang) * 2.6, room.mar + 1.5, room.h - 1.5), arena: true };
  }

  // Saindo da praia pela orla: volta pra cidade dois quarteirões na direção escolhida
  sairPraia(id = 'frente') {
    const r = this.rota, h = this.hero;
    const dir = id === 'esquerda' ? turnLeft(r.dir) : id === 'direita' ? turnRight(r.dir) : r.dir;
    const i = r.i + DIRS[dir][0] * 2, j = r.j + DIRS[dir][1] * 2;
    this.room = null; this.map = this.city; this.praia = null;
    r.i = i; r.j = j; r.dir = this.direcaoLivre(i, j, dir); r.beco = null;
    r.alvo = { i: i + DIRS[r.dir][0], j: j + DIRS[r.dir][1] };
    const p = this.city.nodePos(i, j);
    h.x = p.x; h.y = p.y; h.fx = DIRS[r.dir][0]; h.fy = DIRS[r.dir][1];
    h.ultimaPos = { x: h.x, y: h.y }; h.parado = 0;
    this.zumbis = []; this.zonas = [];
    for (const a of this.aliados) { a.x = h.x; a.y = h.y; }
    this.itens = this.itens.filter(it => !it.achado && it.kind !== 'bau_medio' && it.kind !== 'kit');
    this.decisao = null; this.voto = null; this.votoAbreT = 0.8; this.trecho = null; this.spawnT = 2; this.flowT = 0;
    this.andouQuarteirao(2);
    this.pararNoCruzamento();
    this.emit('saiu_predio', { tipo: 'praia' });
    this.checarRecorde();
  }

  /* =================== Rota, votação e decisões =================== */
  // Opções do próximo cruzamento: esquerda, frente, direita, voltar (+ entrar, se tiver loja).
  // Rua bloqueada não entra na votação (aparece riscada); rua sem saída entra, marcada (tem baú no fim).
  abrirVotacao() {
    if (this.S.mapa && this.abrirVotacaoDestino()) return;
    const r = this.rota, N = r.alvo;
    const shop = this.city.shopAt(N.i, N.j);
    const ops = [], bloqueadas = [];
    for (const [id, d] of [['esquerda', turnLeft(r.dir)], ['frente', r.dir], ['direita', turnRight(r.dir)], ['voltar', (r.dir + 2) % 4]]) {
      const t = this.city.trecho(N.i, N.j, d);
      if (t.s.bloqueio) { bloqueadas.push({ id, dir: d, ...OPCOES[id] }); continue; }
      ops.push({ id, dir: d, semSaida: !!t.s.semSaida, bairro: t.s.bairro });
    }
    // cada direção leva a um lugar no fim da rua (mercado, hospital, delegacia...): ir pra buscar alguma coisa
    const usados = new Set();
    for (const o of ops) {
      const dest = o.id !== 'voltar' && !o.semSaida && !this.hero.moto ? this.destinoDaDirecao(N, o.dir, usados) : null;
      if (dest) { o.destino = dest; usados.add(dest.tipo); }
    }
    const praca = this.city.pracaAt(N.i, N.j);
    if (shop && !this.hero.moto) ops.push({ id: 'entrar', shop });   // de moto não entra em lugar nenhum: segue pelos quarteirões
    else if (praca && !this.hero.moto) ops.push({ id: 'entrar', praca });
    for (const o of ops) { Object.assign(o, OPCOES[o.id]); if (o.praca) { o.nome = 'ARENA'; o.seta = '⚔️'; } }
    ops.sort((a, b) => a.n - b.n);
    this.voto = new Votacao(ops, this.cfg.votoDur, this.cfg.atraso);
    this.voto.loja = shop || (praca ? { nome: 'Praça: arena de chefe', emoji: '⚔️', tipo: 'praca' } : null);
    this.voto.bloqueadas = bloqueadas;
    this.voto.no = { ...N };
    this.emit('votacao_abriu', { opcoes: ops.map(o => o.id), loja: shop ? { tipo: shop.tipo, nome: shop.nome, emoji: shop.emoji } : null });
  }

  // Viagem pelo mapa: a votação mostra os lugares mais perto (o mais perto de cada necessidade: comida, cura,
  // armas; e a praça, se tiver) com a distância e o que tem lá. Números 1 a 4. false = nenhum lugar (vota a direção).
  abrirVotacaoDestino() {
    const N = this.rota.alvo;
    const lugares = lugaresDaViagem(this.city, N, this.rng, undefined, this.visitados);
    if (!lugares.length) return false;
    const ids = ['esquerda', 'frente', 'direita', 'entrar'];
    const ops = lugares.slice(0, 4).map((l, k) => ({ id: ids[k], n: k + 1, nome: l.nome.toUpperCase(), seta: l.emoji, lugar: { ...l, pts: pontosDaRota(N, l.dirs) } }));
    this.voto = new Votacao(ops, this.cfg.votoDur, this.cfg.atraso);
    this.voto.mapa = { ini: { i: N.i, j: N.j } };
    this.emit('votacao_abriu', { opcoes: ops.map(o => o.id), mapa: true });
    return true;
  }

  // Começa (ou segue) a viagem: devolve a direção a tomar no cruzamento r.alvo, como uma opção de votação.
  // A rua do caminho fechou (carros batidos aparecem com o tempo)? Recalcula; sem caminho, a viagem acaba.
  passoDaViagem() {
    const V = this.viagem, r = this.rota;
    if (!V) return null;
    let d = V.dirs[0];
    if (d == null || !ruaLivre(this.city, r.alvo.i, r.alvo.j, d)) {
      const nova = rotaAte(this.city, r.alvo, V.lugar);
      if (!nova || !nova.length) { this.viagem = null; this.emit('aviso', { texto: '🚧 O caminho fechou: escolham outro lugar', tipo: 'perigo' }); return null; }
      V.dirs = nova; d = V.dirs[0];
    }
    V.dirs.shift();
    const id = d === r.dir ? 'frente' : d === turnLeft(r.dir) ? 'esquerda' : d === turnRight(r.dir) ? 'direita' : 'voltar';
    return { id, dir: d, ...OPCOES[id], auto: true };
  }

  // Depois de andar um quarteirão na viagem: chegou na esquina do lugar (vai pra porta) ou marca o próximo passo
  // (o herói segue sozinho; atravessa quando a área estiver limpa, como sempre)
  seguirViagem() {
    const V = this.viagem, r = this.rota;
    if (!V) return;
    if (r.alvo.i === V.lugar.i && r.alvo.j === V.lugar.j) {
      this.destino = { i: V.lugar.i, j: V.lugar.j, praca: !!V.lugar.praca };
      return;
    }
    const op = this.passoDaViagem();
    if (!op) return;
    this.decisao = op;
    this.preparo = this.prepararDestino();
    // no meio da viagem, às vezes alguém pede ajuda numa rua do lado (encontros.js)
    V.passos = (V.passos || 0) + 1;
    if (V.passos >= 1 && !this.encontro && this.stats.quarteiroes >= ENCONTROS.desdeQuarteirao && this.rng.chance(ENCONTROS.chance)) {
      const espera = Math.max(3 + this.rng.next() * 3, (this.decididoEm ?? -1e9) + RESULTADO_SEG - this.t);   // depois do resultado sair da tela
      this.agendar(espera, () => {
        if (this.fase === 'jogo' && this.viagem && !this.encontro && !this.mascate && !this.voto && !this.room && !this.arena && !this.caido) criarEncontro(this);
      });
    }
  }

  // O lugar no fim da rua que sai do cruzamento N na direção dir: a loja que já existe lá ou, às vezes, uma
  // sorteada pelo que o herói precisa (sobrevivencia.js → pesosDestino). null = só rua.
  destinoDaDirecao(N, dir, usados) {
    const M = { i: N.i + DIRS[dir][0], j: N.j + DIRS[dir][1] };
    let shop = this.city.shopAt(M.i, M.j);
    if (!shop && this.S.destinoChance > 0 && this.rng.chance(this.S.destinoChance)) {
      const tipo = this.rng.weighted(pesosDestino(this.hero, usados));
      shop = this.city.garantirLoja(M.i, M.j, tipo);
    }
    if (!shop) return null;
    return { i: M.i, j: M.j, tipo: shop.tipo, nome: shop.nome, emoji: shop.emoji, oque: LOJAS[shop.tipo]?.oque || '' };
  }

  fecharVotacao() {
    if (this.voto.mascate) { const res = this.voto.fechar(() => escolhaBarganhaIA(this), this.rng); decidirBarganha(this, res.id, res); return; }   // ir na banca do Barganha ou seguir
    if (this.voto.encontro) { const res = this.voto.fechar(() => escolhaEncontroIA(this), this.rng); decidirEncontro(this, res.id, res); return; }
    const res = this.voto.fechar(ops => this.escolhaIA(ops), this.rng);
    const op = this.voto.opcoes.find(o => o.id === res.id);
    this.decisao = op;
    this.decididoEm = this.t;
    // o que tem lá já fica sorteado agora, pro resultado poder contar (previsao.js)
    this.preparo = (op.lugar ? op.lugar.dist > 0 : op.id !== 'entrar') && !op.semSaida ? this.prepararDestino() : null;
    if (op.lugar && !op.lugar.dist) this.preparo = null;   // o lugar é aqui mesmo: não anda quarteirão
    const previsao = preverDestino(this, op, this.preparo);
    this.voto.previsao = previsao;
    const quem = [];
    for (const [id, v] of this.voto.votantes) if (v === res.id && quem.length < 3) quem.push(this.nickDe(id));
    this.emit('decisao', { id: op.id, n: op.n, nome: op.nome, seta: op.seta, votos: res.votos, total: this.voto.total, auto: res.auto, empate: !!res.empate, quem, loja: op.shop ? op.shop.nome : null, praca: !!op.praca, previsao, caminho: this.preparo?.caminho || null, lugar: op.lugar ? { nome: op.lugar.nome, emoji: op.lugar.emoji, dist: op.lugar.dist, pts: op.lugar.pts, i: op.lugar.i, j: op.lugar.j } : null });
  }

  // Sorteia o que vai ter na rua escolhida (praia? que caminho?) na hora que a votação fecha
  prepararDestino() {
    if (this.podePraia(1)) return { praia: true, caminho: null };
    return { praia: false, caminho: sortearCaminho(this.rng, this.chances, !!this.historia.proximo(), this.hero.nivel) };
  }

  escolhaIA(ops) {
    const h = this.hero, vidaPct = h.vida / h.vidaMax;
    // viagem pelo mapa: o lugar que ele mais precisa, preferindo os mais perto
    if (ops.some(o => o.lugar)) return this.rng.weighted(ops.map(o => [o.id, (o.lugar.praca ? (vidaPct > 0.7 ? 0.8 : 0.1) : vontadeDestino(h, o.lugar.tipo)) / (1 + o.lugar.dist * 0.25)]));
    const pesos = ops.map(o => {
      if (o.id === 'entrar' && o.praca) return [o.id, this.stats.cruzamentos - this.ultimaLoja < 3 ? 0.1 : vidaPct > 0.6 ? 0.8 : 0.15];
      if (o.id === 'entrar') {
        const recente = this.stats.cruzamentos - this.ultimaLoja < 3;
        if (recente) return [o.id, 0.15];
        const cura = o.shop.tipo === 'farmacia' || o.shop.tipo === 'hospital';
        if (vidaPct < 0.5 && cura) return [o.id, 4];
        return [o.id, 0.7 - o.shop.risco * 0.1];
      }
      if (o.id === 'voltar') return [o.id, ops.length === 1 ? 1 : 0.06];
      const base = (o.id === 'frente' ? 1.3 : 1) * (o.destino ? vontadeDestino(h, o.destino.tipo) : 1);
      if (o.semSaida) return [o.id, base * (vidaPct > 0.5 ? 0.5 : 0.15)];   // baú no fim, mas é arriscado
      return [o.id, base];
    });
    return this.rng.weighted(pesos);
  }

  aplicarDecisao() {
    const r = this.rota;
    let op = this.decisao;
    this.decisao = null;
    this.areaLiberada = false;
    if (!this.voto?.encontro) this.voto = null;
    // o chat escolheu um lugar no mapa: começa a viagem (o 1º passo é a direção que sai daqui)
    if (op.lugar) {
      this.viagem = { lugar: op.lugar, dirs: [...op.lugar.dirs] };
      this.emit('viagem', { nome: op.lugar.nome, emoji: op.lugar.emoji, dist: op.lugar.dist });
      if (!op.lugar.dirs.length) { this.seguirViagem(); return; }   // é aqui mesmo: vai pra porta
      const prep = this.preparo;
      op = this.passoDaViagem();
      if (!op) return;
      this.preparo = prep;
    }
    this.stats.cruzamentos++;
    if (op.id === 'entrar') {
      this.destino = null;
      if (op.praca) this.indoPraca = op.praca; else this.indoPorta = op.shop;
      return;
    }
    r.i = r.alvo.i; r.j = r.alvo.j;
    this.destino = op.destino || null;   // foi pra buscar alguma coisa: entra no lugar do fim da rua
    const virou = op.dir !== r.dir;
    r.dir = op.dir;
    r.alvo = { i: r.i + DIRS[r.dir][0], j: r.j + DIRS[r.dir][1] };
    this.andouQuarteirao(1);
    // a próxima votação só abre depois do resultado sair da tela (RESULTADO_SEG depois do anúncio)
    this.votoAbreT = Math.max(0.8, (this.decididoEm ?? -1e9) + RESULTADO_SEG - this.t);
    if (virou) this.emit('virou', { dir: r.dir, voltou: op.id === 'voltar' });
    this.checarRecorde();
    const prep = this.preparo; this.preparo = null;
    // nível 30+: às vezes a rua dá na praia (já sorteado quando a votação fechou)
    if (prep ? prep.praia : this.podePraia()) { this.entrarPraia(); return; }
    const t = this.city.trecho(r.i, r.j, r.dir);
    if (t.s.semSaida) this.entrarBeco(t);
    else this.iniciarTrecho(prep?.caminho);
    this.seguirViagem();
    if (!t.s.semSaida) talvezMascate(this);   // 10%: o Barganha numa rua sem saída do lado do próximo cruzamento
  }

  /* =================== Arena (praça com chefe) =================== */
  // Duração máxima e ritmo das ondas da arena
  static ARENA = { duracao: 100, ondaCada: 9, chefeVida: 1.6 };

  // os últimos lugares visitados (o mapa não oferece de novo logo em seguida)
  lembrarVisita(i, j) { this.visitados = [...(this.visitados || []).filter(k => k !== i + ',' + j), i + ',' + j].slice(-3); }

  iniciarArena(praca) {
    const A = Jogo.ARENA;
    this.lembrarVisita(praca.i, praca.j);
    this.indoPraca = null;
    this.ultimaLoja = this.stats.cruzamentos;
    this.stats.arenas = (this.stats.arenas || 0) + 1;
    this.trecho = null;
    const c = praca.centro, h = this.hero;
    // chefe nasce do outro lado da fonte
    const ox = c.x + (c.x - h.x) * 0.6, oy = c.y + (c.y - h.y) * 0.6;
    const nomes = { centro: 'Brutamontes da Praça', residencial: 'Síndico Zumbi', parque: 'Guarda do Parque', industrial: 'Operário Gigante' };
    const nome = nomes[praca.bairro] || 'Chefe da Praça';
    // o ex-herói que ainda não voltou é o chefe desta arena
    const ex = this.exHeroiT > 0 && this.ultimoHeroi;
    const tipo = ex ? 'exheroi' : this.nivelAmeaca >= 8 ? 'rei' : 'chefao';
    const nomeChefe = ex ? (this.ultimoHeroi.viewer ? `${this.ultimoHeroi.viewer.nick} zumbi` : `Ex-herói #${this.ultimoHeroi.n}`) : nome;
    if (ex) this.exHeroiT = -1;
    const p = this.pontoPerto({ x: ox, y: oy }, 1.5) || { x: ox, y: oy };
    const extra = ex ? { classe: this.ultimoHeroi.classe, arma: this.ultimoHeroi.arma } : null;
    const chefe = this.criarZumbi(tipo, p.x, p.y, null, { nome: nomeChefe, nascendo: 1.2, vidaMult: A.chefeVida, extra });
    this.arena = { praca, t: 0, ondaT: 3, chefe, vencida: false, fimT: 0 };
    this.emit('arena', { nome: nomeChefe, bairro: praca.bairro });
    this.emit('chefe', { tipo, nome: nomeChefe, x: p.x, y: p.y, arena: true });
  }

  atualizarArena(dt) {
    const a = this.arena, A = Jogo.ARENA;
    a.t += dt;
    if (!a.vencida) {
      a.ondaT -= dt;
      if (a.ondaT <= 0) {
        a.ondaT = A.ondaCada;
        // ondas entrando pelas bordas da praça
        const q = Math.round((tamanhoGrupo(this.nivelAmeaca, this.A) + 2) * Math.max(0.6, this.multInicio()));
        const { bi, bj } = a.praca;
        for (let k = 0; k < q; k++) {
          const lado = this.rng.int(0, 3), r = this.rng.range(0, 15);
          const x = bi * PERIODO + 5 + (lado === 0 ? r : lado === 1 ? 14.5 : lado === 2 ? r : 0.5);
          const y = bj * PERIODO + 5 + (lado === 0 ? 0.5 : lado === 1 ? r : lado === 2 ? 14.5 : r);
          const pt = this.pontoPerto({ x, y }, 1);
          if (pt) this.criarZumbi(this.rng.chance(0.25) ? 'corredor' : 'comum', pt.x, pt.y, null, { nascendo: 0.6 + k * 0.1 });
        }
      }
      if (a.chefe.morto) {
        a.vencida = true; a.fimT = 4;
        const px = a.chefe.x, py = a.chefe.y, p1 = this.pontoPerto({ x: px, y: py }, 0.8) || { x: px, y: py }, p2 = this.pontoPerto({ x: px, y: py }, 1.2) || p1;
        this.soltarItemEm(this.rng.chance(0.5) ? 'bau_lendario' : 'bau_medio', {}, null, p1.x, p1.y).arena = true;
        this.soltarItemEm('kit', { valor: 45 }, null, p2.x, p2.y).arena = true;
        this.emit('arena_vencida', {});
      } else if (a.t > A.duracao) { a.vencida = true; a.fimT = 0.5; this.emit('arena_tempo', {}); }
    } else {
      a.fimT -= dt;
      const premio = this.itens.some(it => it.arena);
      // sai quando pegou a recompensa (ou depois de 12 s, por segurança)
      if (a.fimT <= 0 && (!premio || a.fimT < -12)) this.sairArena();
    }
  }

  // Na arena o herói gira em volta da fonte (chefe correndo atrás) e pega o que cair
  objetivoArena() {
    const a = this.arena, c = a.praca.centro, h = this.hero;
    // venceu: vai buscar a recompensa
    const premio = a.vencida && this.itens.filter(it => it.arena).sort((p, q) => dist2(p.x, p.y, h.x, h.y) - dist2(q.x, q.y, h.x, h.y))[0];
    if (premio) return { x: premio.x, y: premio.y, item: true };
    const ang = Math.atan2(h.y - c.y, h.x - c.x) + 0.6;
    return { x: c.x + Math.cos(ang) * 4.2, y: c.y + Math.sin(ang) * 4.2, arena: true };
  }

  sairArena() {
    const a = this.arena, s = a.praca.saida, r = this.rota, h = this.hero;
    this.arena = null;
    const p = this.city.nodePos(s.i, s.j);
    // continua no sentido "pra fora" da praça
    const dirFora = s.i > a.praca.i ? 1 : s.i < a.praca.i ? 3 : s.j > a.praca.j ? 2 : 0;
    r.i = s.i; r.j = s.j; r.dir = this.direcaoLivre(s.i, s.j, dirFora); r.beco = null;
    r.alvo = { i: s.i + DIRS[r.dir][0], j: s.j + DIRS[r.dir][1] };
    h.x = p.x; h.y = p.y; h.fx = DIRS[r.dir][0]; h.fy = DIRS[r.dir][1];
    this.andouQuarteirao(2);
    this.decisao = null; this.voto = null; this.votoAbreT = 0.8; this.trecho = null;
    this.pararNoCruzamento();
    this.emit('saiu_predio', { tipo: 'praca' });
    this.checarRecorde();
  }

  // Viagem pelo mapa: saindo de um prédio, da arena ou da praia, o herói fica PARADO no cruzamento onde saiu
  // (o alvo da rota é o próprio cruzamento) e a votação de destino abre ali mesmo
  pararNoCruzamento() {
    if (!this.S.mapa) return;
    const r = this.rota;
    r.alvo = { i: r.i, j: r.j };
    r.i -= DIRS[r.dir][0]; r.j -= DIRS[r.dir][1];
  }

  // Direção pra seguir a partir de um cruzamento sem passar por rua bloqueada nem sem saída:
  // a mesma se der; senão um dos lados; em último caso, volta.
  direcaoLivre(i, j, dir) {
    for (const d of [dir, turnLeft(dir), turnRight(dir), (dir + 2) % 4]) {
      const t = this.city.trecho(i, j, d);
      if (!t.s.bloqueio && !t.s.semSaida) return d;
    }
    return dir;
  }

  // Rua sem saída: baú no fim, perto da barricada. Quando o herói pega, a horda fecha a volta.
  entrarBeco(t) {
    const r = this.rota, s = t.s;
    const [dx, dy] = DIRS[r.dir];
    const no = this.city.nodePos(r.i, r.j);
    const base = (dx ? s.i : s.j) * PERIODO, ss = s.semSaida;     // a barricada (ou o galpão do Barganha), no eixo da rua
    const fimEixo = t.inicio ? base + (ss.ini ?? ss.along) - 1.4 : base + (ss.fim ?? ss.along + 1) + 1.4;
    const fim = dx ? { x: fimEixo, y: no.y } : { x: no.x, y: fimEixo };
    r.beco = { fim };
    this.trecho = { tipo: 'beco', livre: false };
    const kind = this.rng.chance(0.2) ? 'bau_lendario' : 'bau_medio';
    this.soltarItemEm(kind, {}, null, fim.x - dx * 0.6, fim.y - dy * 0.6, 0).beco = true;
    this.emit('beco', {});
  }

  // Chegou no fim da rua sem saída: emboscada e meia-volta
  voltarDoBeco() {
    const r = this.rota;
    r.beco = null;
    r.dir = (r.dir + 2) % 4;
    r.alvo = { i: r.i, j: r.j };            // volta pro cruzamento de onde veio
    this.votoAbreT = 0.3;
    this.emit('virou', { dir: r.dir, voltou: true });
    this.emit('beco_emboscada', {});
    this.soltarZumbisAtras(Math.round(this.hordaDaRua(this.nivelAmeaca) * 0.7));
  }

  // Sorteia o que vai acontecer na rua escolhida (caminhos.js)
  iniciarTrecho(sorteado = null) {
    const frag = this.historia.proximo();
    let s = sorteado || sortearCaminho(this.rng, this.chances, !!frag, this.hero.nivel);
    if (s.tipo === 'historia' && !frag) s = { tipo: 'livre' };
    this.trecho = { tipo: s.tipo, livre: s.tipo !== 'perigoso', perigo: s.perigo || null };
    this.stats.caminhos[s.tipo]++;
    if (s.tipo === 'perigoso') {
      const P = PERIGOS[s.perigo];
      this.ameacaBonus += this.A.porPerigo ?? AMEACA_POR_PERIGO;
      this.agendar(ATRASO_PERIGO, () => { if (!this.room) P.aplicar(this, this.nivelAmeaca); });
      this.emit('caminho', { tipo: 'perigoso', perigo: s.perigo, nome: P.nome, emoji: P.emoji, texto: P.texto });
    } else if (s.tipo === 'historia') {
      this.agendar(1.2, () => { if (!this.room) this.soltarItem('historia', { id: frag.id }, null, 1.5); });
      this.emit('caminho', { tipo: 'historia' });
    } else this.emit('caminho', { tipo: 'livre' });
  }

  // Zumbis que ainda faltam matar na área em volta do herói (os que estão dormindo não contam)
  zumbisNaArea() {
    const h = this.hero, R = this.A.areaRaio;
    let n = 0;
    for (const z of this.zumbis) if (!z.morto && !z.dormindo && !z.devorando && dist2(z.x, z.y, h.x, h.y) < R * R) n++;   // (em cima de alguém, parado, não conta)
    return n;
  }

  // Limpando a área: vai atrás do zumbi mais perto (sem se afastar muito do cruzamento) pra acabar logo.
  // Quem atira chega só até uns 70% do alcance da arma; quem luta de perto vai até o zumbi.
  // Faltando poucos (AMEACA.cacarPoucos), vai bem mais longe (cacarLonge) e quem atira caça até os explosivos.
  poucosPraLimpar() { return !!this.limpando && this.limpando.restam <= this.A.cacarPoucos; }
  cacarZumbi(no) {
    const h = this.hero, R = this.A.areaRaio, poucos = this.poucosPraLimpar();
    let melhor = null, md = Infinity;
    for (const z of this.zumbis) {
      if (z.morto || z.dormindo || z.devorando || z.nascendo > 0 || (z.tipo === 'explosivo' && !(poucos && h.arma))) continue;
      const d = dist2(z.x, z.y, h.x, h.y);
      if (d < md && d < R * R) { md = d; melhor = z; }
    }
    if (!melhor) return null;
    const perto = h.arma ? ARMAS[h.arma].alcance * 0.7 : 1;
    if (Math.sqrt(md) < perto) return { x: h.x, y: h.y, esperando: true };
    // não se afasta mais que 9 casas do cruzamento (faltando poucos, cacarLonge): os outros vêm até ele
    if (dist(melhor.x, melhor.y, no.x, no.y) > (poucos ? this.A.cacarLonge : 9)) return null;
    return { x: melhor.x, y: melhor.y, cacando: true };
  }

  // O herói chegou no cruzamento com a decisão do chat: só atravessa quando a área estiver limpa.
  // Enquanto espera, não nasce zumbi da rua (a cota acabou). Zumbi preso longe que não chega some depois de um
  // tempo sem abate, e por segurança, passado limpandoMax segundos, ele atravessa de qualquer jeito.
  areaLimpa(dt) {
    const A = this.A;
    if (A.areaRaio <= 0) return true;
    if (this.hero.moto) { this.limpando = null; return true; }   // de moto não para: passa por cima (prologo.js)
    const restam = this.zumbisNaArea();
    if (!restam) {
      if (this.limpando) this.emit('area_limpa', { segundos: Math.round(this.limpando.t) });
      this.limpando = null;
      return true;
    }
    const l = this.limpando ||= { t: 0, abates: this.stats.abates, semAbate: 0, restam };
    if (l.t === 0) this.emit('limpar_area', { restam });
    l.t += dt;
    l.restam = restam;
    if (this.stats.abates !== l.abates) { l.abates = this.stats.abates; l.semAbate = 0; l.travou = false; }
    else l.semAbate += dt;
    const h = this.hero;
    if (l.semAbate > A.limpandoSemAbate) {
      // os que estão longe e não chegam (presos atrás de alguma coisa) somem; chefe é trazido pra perto.
      // Se de novo ninguém morrer, somem também os de perto (presos atrás de barricada ou parede).
      l.semAbate = 0;
      const longe = l.travou ? 0 : A.limpandoLonge;
      l.travou = true;
      for (const z of this.zumbis) {
        if (z.morto || dist(z.x, z.y, h.x, h.y) < longe) continue;
        if (ZUMBIS[z.tipo].chefe) { const p = this.pontoNaRua(h, 4, 6, 0); if (p) { z.x = p.x; z.y = p.y; } }
        else { z.morto = true; z.sumiu = true; }
      }
    }
    if (l.t > A.limpandoMax) { this.limpando = null; return true; }
    return false;
  }

  // A área foi liberada (limpa ou passou o tempo máximo) e fica liberada até ele atravessar: a liberação por
  // tempo não se perde se o herói estiver longe do cruzamento caçando ou empurrado pela horda
  liberarArea(dt) {
    if (!this.areaLiberada && this.areaLimpa(dt)) this.areaLiberada = true;
    return this.areaLiberada;
  }

  checarRecorde() {
    const q = this.stats.quarteiroes;
    if (q > this.recorde && this.recorde > 0 && !this.stats.avisouRecorde) {
      this.stats.avisouRecorde = true;
      this.emit('recorde', { quarteiroes: q });
    }
  }

  // Ponto pra onde o herói quer ir agora (sem contar zumbis e itens)
  objetivoRota(dt) {
    const h = this.hero, r = this.rota;
    if (this.arena) return this.objetivoArena();
    if (this.indoPraca) {
      const e = this.indoPraca.entrada;
      if (dist(h.x, h.y, e.x, e.y) < 0.9) { this.iniciarArena(this.indoPraca); return this.objetivoArena(); }
      return { x: e.x, y: e.y, porta: true };
    }
    if (this.indoPorta) {
      const d = this.indoPorta.door;
      if (dist(h.x, h.y, d.x, d.y) < 0.45) { this.entrarPredio(this.indoPorta); return null; }
      return { x: d.x, y: d.y, porta: true };
    }
    // decidiram ajudar alguém (encontros.js): vai até a pessoa (os zumbis dela levantam quando ele chega)
    if (this.encontro?.fase === 'ajudando') { const p = this.encontro.pessoa; return { x: p.x, y: p.y, ajudando: true }; }
    // o Barganha na rua sem saída: entra até o janelão, negocia e volta pro cruzamento (mascate.js)
    if (this.mascate) { const o = objetivoMascate(this, dt); if (o) return o; }
    if (r.beco) {
      // rua sem saída: vai até o fim (baú), depois dá meia-volta
      if (dist(h.x, h.y, r.beco.fim.x, r.beco.fim.y) < 0.8) { this.voltarDoBeco(); return this.objetivoRota(0); }
      return { x: r.beco.fim.x, y: r.beco.fim.y };
    }
    // indo pra um destino (mercado, hospital...): perto do cruzamento do fim da rua, vai pra porta
    if (this.destino) {
      const D = this.destino, no = this.city.nodePos(D.i, D.j);
      if (r.alvo.i !== D.i || r.alvo.j !== D.j) this.destino = null;   // (foi parar em outra rua)
      else if (dist(h.x, h.y, no.x, no.y) < 4) {
        this.destino = null; this.viagem = null;
        salvosChegaram(this);   // chegou no lugar: quem foi salvo (mordido) não resiste
        const praca = D.praca ? this.city.pracaAt(D.i, D.j) : null;
        if (praca) { this.indoPraca = praca; this.emit('destino', { tipo: 'praca', nome: 'Praça', emoji: '⚔️' }); return { x: praca.entrada.x, y: praca.entrada.y, porta: true }; }
        const shop = this.city.shopAt(D.i, D.j);
        if (shop) { this.indoPorta = shop; this.emit('destino', { tipo: shop.tipo, nome: shop.nome, emoji: shop.emoji }); return { x: shop.door.x, y: shop.door.y, porta: true }; }
      }
    }
    // (viagem pelo mapa: a votação de destino só abre com o herói no cruzamento; ele PARA ali enquanto o chat
    // escolhe, consultando o mapa, e o mapa não esconde a ação)
    const noAlvo = this.city.nodePos(r.alvo.i, r.alvo.j);
    if (!this.voto && !this.decisao && !this.destino) {
      this.votoAbreT -= dt;
      const resultadoSaiu = this.t - (this.decididoEm ?? -1e9) >= RESULTADO_SEG;
      if (this.votoAbreT <= 0 && (!this.S.mapa || r.beco || (dist(h.x, h.y, noAlvo.x, noAlvo.y) < 1.2 && resultadoSaiu))) this.abrirVotacao();
    }
    h.noMapa = !!(this.voto?.mapa && this.voto.aberta);
    if (this.voto && this.voto.aberta) {
      this.voto.update(dt);
      if (this.voto.t <= 0) this.fecharVotacao();
    }
    const alvo = this.city.nodePos(r.alvo.i, r.alvo.j);
    const [dx, dy] = DIRS[r.dir];
    const falta = (alvo.x - h.x) * dx + (alvo.y - h.y) * dy;
    // limpando a área: vai atrás dos zumbis que faltam pra qualquer lado (inclusive pra trás, pela rua de onde
    // veio); sem nenhum pra caçar, volta pro cruzamento
    // (os relógios da limpeza continuam correndo: zumbi preso some e, no máximo em limpandoMax, ele segue)
    if (this.limpando && this.decisao && !(falta < 0.5 && dist(h.x, h.y, alvo.x, alvo.y) < 1.4) && !this.liberarArea(dt)) { const caca = this.cacarZumbi(alvo); if (caca) return caca; }
    if (falta < 0.5) {
      if (dist(h.x, h.y, alvo.x, alvo.y) < 1.4) {
        // só atravessa com a área limpa (todos os zumbis em volta mortos). A escolha de habilidade NÃO segura o
        // herói: ele segue andando enquanto o chat vota, e a habilidade entra quando a votação fechar
        if (this.decisao && !mascateSegura(this) && this.liberarArea(dt) && !this.voto?.encontro) { this.aplicarDecisao(); return this.objetivoRota(0); }
        if (this.limpando) { const caca = this.cacarZumbi(alvo); if (caca) return caca; }
        return { x: alvo.x, y: alvo.y, esperando: true };
      }
      // Passou do cruzamento (foi empurrado por zumbis ou foi caçar os que faltam): volta até ele
      if (this.limpando) { const caca = this.cacarZumbi(alvo); if (caca) return caca; }
      return { x: alvo.x, y: alvo.y };
    }
    // Segue o meio da rua, olhando um pouco à frente; se tem perigo no chão, desvia pela faixa livre
    const passo = Math.min(1.6, Math.max(0, falta));
    this.faixaT = (this.faixaT || 0) - dt;
    if (this.faixaT <= 0) {
      this.faixaT = 0.3;
      const cx = dx ? h.x : alvo.x, cy = dx ? alvo.y : h.y;
      this.faixa = faixaLivre(cx, cy, dx, dy, this.zonasHeroi || this.zonasAgora, Math.min(3.5, Math.max(0.5, falta)));
    }
    const lado = this.faixa || 0;
    // Ritmo: enquanto a votação não fecha, anda só o suficiente pra chegar no cruzamento junto com o fim
    // dela (a votação dura mais por causa do atraso da live). Assim ele não fica parado esperando.
    let ritmo = 1;
    if (!this.decisao && !this.S.mapa) {
      const resta = this.voto ? (this.voto.aberta ? this.voto.t : 0) : Math.max(0, this.votoAbreT) + this.cfg.votoDur + this.cfg.atraso;
      if (resta > 0.3) ritmo = clamp((falta - 0.5) / (resta * this.cfg.velHeroi), 0.45, 1);
    }
    const o = dx ? { x: h.x + dx * passo, y: alvo.y + dx * lado } : { x: alvo.x - dy * lado, y: h.y + dy * passo };
    o.ritmo = ritmo;
    return o;
  }

  /* =================== Herói =================== */
  atualizarHeroi(dt) {
    const h = this.hero;
    h.tiroCd -= dt; h.corpoCd -= dt;
    if (h.tropecou > 0) h.tropecou = Math.max(0, h.tropecou - dt);   // tropeçou no duelo: caído uns instantes (sobrevivencia.js)
    if (h.recargaT > 0 && (h.recargaT -= dt) <= 0) { h.recargaT = 0; h.pente = ARMAS[h.arma]?.pente ?? null; this.emit('recarregou', { x: h.x, y: h.y }); }
    h.invT = Math.max(0, h.invT - dt);
    h.folegoCd = Math.max(0, (h.folegoCd || 0) - dt);
    for (const m of h.attr.update(dt)) this.emit('buff_acabou', { id: m.id, attr: m.attr });
    this.sincronizarVida();
    const regen = h.attr.get('regen');
    // pisando em cacos de vidro o herói NÃO se cura (regeneração, status, golpes); presentes e itens ficam guardados
    if (regen > 0 && h.vida < h.vidaMax && !h.noVidro) h.vida = Math.min(h.vidaMax, h.vida + regen * dt);
    // Status (status.js): dano e cura por segundo
    const st = h.estados.update(dt);
    for (const d of st.danos) this.ferirHeroi(d.valor, d.fonte, STATUS[d.status].nome.toLowerCase(), d.tipo, true);
    if (this.fase !== 'jogo') return;
    // arremesso da explosão: voa pra longe (desliza nas paredes) e vai freando
    if (h.kx || h.ky) {
      this.mover(h, h.kx * dt, h.ky * dt, 0.22);
      h.kx *= Math.pow(0.02, dt); h.ky *= Math.pow(0.02, dt);
      if (Math.abs(h.kx) + Math.abs(h.ky) < 0.05) h.kx = h.ky = 0;
    }
    if (st.cura > 0 && !h.noVidro) h.vida = Math.min(h.vidaMax, h.vida + st.cura * h.attr.get('cura'));
    if (st.acabaram.length) sincronizarAtributos(h.estados, h.attr);
    // inspiração (doação): pulsos de luz que machucam todos os zumbis em volta
    if (h.estados.tem('inspirado')) {
      const I = RECOMPENSA.inspiracao;
      h.inspPulso = (h.inspPulso || 0) - dt;
      if (h.inspPulso <= 0) {
        h.inspPulso = I.pulso;
        const forca = I.dano * h.attr.get('dano') * (1 + 0.15 * (this.nivelAmeaca - 1));
        for (const z of this.zumbis) {
          if (z.morto || z.nascendo > 0) continue;
          const r = I.raio + ZUMBIS[z.tipo].raio;
          if (dist2(z.x, z.y, h.x, h.y) < r * r) this.ferirZumbi(z, danoNoZumbi(z, forca, 'impacto'), null, true);
        }
        this.emit('inspiracao_pulso', { x: h.x, y: h.y, raio: I.raio });
      }
    }
    // Passiva "instinto" (bombeira): com pouca vida, ganha o status instinto (defesa e cura)
    const P = CLASSES[h.classe].passiva;
    if (P?.id === 'instinto') {
      h.instintoCd -= dt;
      if (h.instintoCd <= 0 && h.vida / h.vidaMax < P.limite) { h.instintoCd = P.recarga; this.aplicarStatus(h, 'instinto'); this.emit('passiva', { texto: '🧡 INSTINTO DE SOBREVIVÊNCIA' }); }
    }
    if (h.vidaBaixa && h.vida / h.vidaMax > 0.5) h.vidaBaixa = false;
    if (h.mochila.length && h.vida / h.vidaMax < 0.35 && !h.noVidro) this.usarMochila();   // no vidro, a mochila espera

    // 1) Pra onde ir
    let obj;
    if (this.room) obj = this.objetivoSala();
    else obj = this.objetivoRota(dt);
    if (this.fase !== 'jogo') return;
    if (!obj) return; // acabou de entrar no prédio
    // Item por perto? Vai pegar (se não estiver indo pra porta)
    const item = h.moto ? null : this.itemDesejado();   // de moto não desvia pra pegar nada
    if (item && !obj.porta && !obj.saida) obj = { x: item.x, y: item.y, item: true };
    if (h.estados.parado()) { h.andando = false; return; }   // atordoado: não anda nem ataca

    // 2) Luta (escolhe alvo e atira; ataque de perto é automático). De moto não luta: só atropela (prologo.js)
    if (h.moto) h.mira = null;
    const lutando = h.moto ? false : this.combate(dt);

    // 3) Movimento
    let vx = 0, vy = 0;
    let dirObj = null;
    if (this.room) {
      this.flowHeroiT = (this.flowHeroiT || 0) - dt;
      const chave = Math.floor(obj.x) + ',' + Math.floor(obj.y);
      if (this.flowHeroiT <= 0 || this.flowHeroiChave !== chave) {
        this.flowHeroi.build(this.map, obj.x, obj.y);
        this.flowHeroiT = 0.4; this.flowHeroiChave = chave;
      }
      const d = dist(h.x, h.y, obj.x, obj.y);
      dirObj = d < 1.2 ? { x: obj.x - h.x, y: obj.y - h.y } : this.flowHeroi.dir(h.x, h.y) || { x: obj.x - h.x, y: obj.y - h.y };
    } else if (this.foraDaRota(dt)) {
      // Foi empurrado pra uma rua transversal: volta contornando os prédios até o próximo cruzamento
      const no = this.city.nodePos(this.rota.alvo.i, this.rota.alvo.j);
      this.flowRotaT = (this.flowRotaT || 0) - dt;
      if (this.flowRotaT <= 0) { this.flowRota.build(this.map, no.x, no.y); this.flowRotaT = 1; }
      dirObj = this.flowRota.dir(h.x, h.y) || { x: no.x - h.x, y: no.y - h.y };
      h.focoRota = Math.max(h.focoRota || 0, 1);
    } else dirObj = { x: obj.x - h.x, y: obj.y - h.y };
    const dObj = Math.hypot(dirObj.x, dirObj.y);
    if (!obj.esperando && dObj > 0.05) { vx = dirObj.x / dObj; vy = dirObj.y / dObj; }
    else if (obj.esperando && dObj > 0.15) { vx = dirObj.x / dObj * 0.6; vy = dirObj.y / dObj * 0.6; }
    // Sem arma de fogo: vai pra cima do zumbi mirado até ficar no alcance do golpe.
    // Na rua, só persegue quem está à frente no caminho, pra nunca largar a rota.
    const perto = !h.arma || h.semTiro;
    this.vigiarProgresso(dt);
    if (perto && h.mira && !obj.porta && !obj.saida && h.focoRota <= 0) {
      const m = h.mira, dz = dist(h.x, h.y, m.x, m.y), alc = CORPO[h.corpo].alcance * 0.75 + ZUMBIS[m.tipo].raio;
      let vale = true;
      if (!this.room && !this.arena) {   // quem vem por trás leva o golpe automático quando chega, mas não tira o herói do caminho
        const [rx, ry] = DIRS[this.rota.dir];
        const frente = ((m.x - h.x) * rx + (m.y - h.y) * ry) / dz;
        const no = this.city.nodePos(this.rota.alvo.i, this.rota.alvo.j);
        const foraDaRua = rx ? Math.abs(m.y - no.y) > 2.6 : Math.abs(m.x - no.x) > 2.6;
        vale = frente > -0.2 && !foraDaRua;
      }
      if (vale && dz > alc && dz > 0.01) { vx = vx * 0.1 + (m.x - h.x) / dz * 0.9; vy = vy * 0.1 + (m.y - h.y) / dz * 0.9; }
      else if (vale) { vx *= 0.2; vy *= 0.2; }
    }

    // Duelo (poucos zumbis perto): espera a brecha, entra, bate e recua; vendo o bote do zumbi, desvia.
    // Quem atira mantém distância. Recuando, pode tropeçar (sobrevivencia.js).
    let duelo = null;
    if (this.dueloAtivo && !h.moto && !obj.porta && !obj.saida && !(h.focoRota > 0)) duelo = movimentoDuelo(this, h, this.dueloAtivo, dt);
    if (duelo) { vx = duelo.vx; vy = duelo.vy; }

    // Zumbis perto: recua deles; se tiver muitos na frente, para e luta.
    // Forçando a rota (focoRota: muito tempo sem avançar), recua bem menos e abre caminho no empurrão.
    const forcando = h.focoRota > 0 && !this.room && !this.arena;
    let rx = 0, ry = 0, naFrente = 0;
    for (const z of duelo || h.moto ? [] : this.zumbis) {   // (de moto passa por cima: não recua de ninguém)
      if (z.morto || z.nascendo > 0) continue;
      const dx = h.x - z.x, dy = h.y - z.y, d2 = dx * dx + dy * dy;
      const T = ZUMBIS[z.tipo];
      // Quem luta de perto só recua de explosivo (com menos de metade da vida; com mais, vai pra cima e
      // aguenta a explosão), de chefe (com pouca vida) e quando fica cercado
      const raio = perto
        ? (z.tipo === 'explosivo' ? (h.vida / h.vidaMax < 0.5 ? 2.8 : 0) : T.chefe ? (h.vida / h.vidaMax < 0.4 ? 2.6 : 0) : 0.7)
        : (T.chefe ? 2.8 : z.tipo === 'explosivo' ? 2.6 : 1.7);
      if (!raio || d2 > raio * raio || d2 < 1e-6) continue;
      const d = Math.sqrt(d2);
      const peso = (raio - d) / raio * (T.chefe ? 2.2 : z.tipo === 'explosivo' ? 2.6 : 1) * (forcando ? 0.3 : 1);
      rx += dx / d * peso; ry += dy / d * peso;
      const naMinhaFrente = d < 1.7 && (vx * -dx + vy * -dy) / d > 0.3;
      if (naMinhaFrente) naFrente++;
      // abre caminho: empurra pro lado quem está bem na frente (chefe não sai do lugar)
      if (forcando && naMinhaFrente && d < 1 && !T.chefe) {
        // (dx, dy) aponta do zumbi pro herói; (-vy, vx) é o lado do caminho
        const lado = (-dx * -vy + -dy * vx) >= 0 ? 1 : -1;
        z.kx += (-vy * lado * 4 - dx / d) * 3 * dt;
        z.ky += (vx * lado * 4 - dy / d) * 3 * dt;
      }
    }
    if (naFrente >= 4 && !obj.porta && !perto && !forcando) { vx *= 0.25; vy *= 0.25; }
    // conversível vindo: se ele percebeu (desvia), pula pro lado da rua
    for (const c of this.carros) {
      if (!c.desvia || c.atingidos.has(h)) continue;
      const qx = h.x - c.x, qy = h.y - c.y, along = qx * c.dx + qy * c.dy, lat = qx * -c.dy + qy * c.dx;
      if (along > -1 && along < 9 && Math.abs(lat) < 1.6) { const sg = lat >= 0 ? 1 : -1; vx = -c.dy * sg * 1.6; vy = c.dx * sg * 1.6; }
    }
    const rm = Math.hypot(rx, ry);
    if (rm > 0.01) {
      const k = Math.min(1.6, rm);
      vx = vx * (1 - Math.min(0.75, rm * 0.5)) + rx / rm * k;
      vy = vy * (1 - Math.min(0.75, rm * 0.5)) + ry / rm * k;
    }
    // Vida em 30% ou menos: vidro é proibido (no vidro ele não se cura)
    const fugaVidro = this.evitarVidro(obj, vx, vy, dt);
    if (fugaVidro) { vx = fugaVidro.x; vy = fugaVidro.y; }
    const vm = Math.hypot(vx, vy);
    if (vm > 1) { vx /= vm; vy /= vm; }
    // Perigos do chão (ambiente.js): machucam, causam status e deixam lento
    const amb = this.ambienteNoHeroi(dt);
    const vel = velocidadeHeroi(h, this.cfg.velHeroi, { lutando: lutando && !perto }) * h.estados.lentidao() * amb.lentidao * this.fatorPasso(obj, duelo);
    const antesX = h.x, antesY = h.y;
    this.mover(h, vx * vel * dt, vy * vel * dt, 0.22);
    const andou = Math.hypot(h.x - antesX, h.y - antesY);
    h.andando = andou > 0.002;
    if (h.andando) h.animT += andou;
    if (!h.mira && h.andando) { h.fx = (h.x - antesX) / andou; h.fy = (h.y - antesY) / andou; }

    // Anti-travamento: se ficou muito tempo sem sair do lugar e sem zumbi perto, dá um jeito
    if (dist(h.x, h.y, h.ultimaPos.x, h.ultimaPos.y) > 0.5 || obj.esperando || rm > 0.01 || this.arena) { h.parado = 0; h.travas = 0; h.ultimaPos = { x: h.x, y: h.y }; }
    else if ((h.parado += dt) > 6) {
      h.parado = 0;
      h.travas = (h.travas || 0) + 1;
      if (!this.room) {
        const alvo = this.city.nodePos(this.rota.alvo.i, this.rota.alvo.j);
        const [dx, dy] = DIRS[this.rota.dir];
        // rua sem saída: o cruzamento do alvo fica do outro lado da barricada; vai pro fim da rua (baú) e volta
        if (h.travas >= 2 && this.mascate?.fase === 'entrando') { h.x = this.mascate.gp.ponto.x; h.y = this.mascate.gp.ponto.y; h.travas = 0; }
        else if (h.travas >= 2 && this.rota.beco) { h.x = this.rota.beco.fim.x; h.y = this.rota.beco.fim.y; h.travas = 0; }
        else if (h.travas >= 2) { h.x = alvo.x; h.y = alvo.y; h.travas = 0; }       // segunda vez: vai direto pro cruzamento
        else { h.x = dx ? h.x : alvo.x; h.y = dy ? h.y : alvo.y; }           // primeira vez: volta pro meio da rua
        h.ultimaPos = { x: h.x, y: h.y };
        this.itens = this.itens.filter(it => it !== item);
        this.emit('destravou', { vez: h.travas });
      } else if (this.room.praia) { h.x = this.room.centro.x; h.y = this.room.centro.y; h.ultimaPos = { x: h.x, y: h.y }; }
      else this.sairPredio();
    }
  }

  // Quanto da velocidade ele usa: no duelo, a do duelo; sem zumbi por perto, o passo cuidadoso (devagar,
  // olhando em volta); e, esperando a votação, o ritmo pra chegar no cruzamento junto com o fim dela
  fatorPasso(obj, duelo) {
    const h = this.hero;
    if (duelo) { h.cauteloso = false; return duelo.vel; }
    // em cima de perigo no chão (vidro, fogo, lama...): sai rápido, nada de passo cuidadoso
    const noPerigo = h.noVidro || (this.zonasHeroi || this.zonasAgora || []).some(z => dentro(z, h.x, h.y));
    h.cauteloso = !obj.item && !this.limpando && !noPerigo && calmo(this);
    const ritmo = cenaAtiva(this) ? 1 : (obj.ritmo || 1);
    return h.cauteloso ? Math.min(ritmo, this.S.calmaVel) : ritmo;
  }

  // O herói está fora do "corredor" da rua atual (entre o último cruzamento e o próximo) há mais de 1,5 s?
  // Acontece quando, no meio do cruzamento, ele recua de um chefe ou corre atrás de item pela rua do lado.
  foraDaRota(dt) {
    const h = this.hero, r = this.rota;
    if (this.arena || this.indoPorta || this.indoPraca || r.beco || this.encontro?.fase === 'ajudando' || mascateAtivo(this)) { h.foraT = 0; return false; }
    const a = this.city.nodePos(r.i, r.j), b = this.city.nodePos(r.alvo.i, r.alvo.j);
    const cx = clamp(h.x, Math.min(a.x, b.x), Math.max(a.x, b.x)), cy = clamp(h.y, Math.min(a.y, b.y), Math.max(a.y, b.y));
    const d = Math.hypot(h.x - cx, h.y - cy);
    // limpando a área: pode caçar zumbi pelas ruas do cruzamento, mas sem se afastar mais de 10 casas dele
    // (faltando poucos zumbis, até AMEACA.cacarLonge)
    if (d < 2.8 || (this.limpando && dist(h.x, h.y, b.x, b.y) < (this.poucosPraLimpar() ? this.A.cacarLonge + 1 : 10))) { h.foraT = 0; return false; }
    h.foraT = (h.foraT || 0) + dt;
    if (h.foraT > 1.5 && !h.avisouFora) { h.avisouFora = true; this.emit('voltando_rota'); }
    if (h.foraT <= 1.5) h.avisouFora = false;
    return h.foraT > 1.5;
  }

  // Se o herói passa muito tempo sem chegar mais perto do próximo cruzamento, ele prioriza o caminho
  // por alguns segundos (para de perseguir zumbis). Garante que a votação do chat sempre tem efeito.
  vigiarProgresso(dt) {
    const h = this.hero;
    h.focoRota = Math.max(0, (h.focoRota || 0) - dt);
    if (this.room || this.arena || this.limpando || this.encontro?.fase === 'ajudando' || mascateAtivo(this)) { h.semProgresso = 0; h.semCruzar = 0; return; }
    const r = this.rota, no = this.city.nodePos(r.alvo.i, r.alvo.j);
    const d = dist(h.x, h.y, no.x, no.y);
    const chave = r.alvo.i + ',' + r.alvo.j;
    // Herói forte preso no meio de uma horda gigante, empurrado pra frente e pra trás do cruzamento sem
    // conseguir atravessar: depois de 75 s na mesma quadra, é levado até o cruzamento (como no anti-travamento).
    h.semCruzar = (h.semCruzar || 0) + dt;
    if (h.semCruzar > 75 && !r.beco && !this.indoPorta && !this.indoPraca) {
      h.semCruzar = 0; h.x = no.x; h.y = no.y; h.ultimaPos = { x: h.x, y: h.y };
      this.emit('destravou', { vez: 2 });
    }
    if (h.progressoNo !== chave || d < (h.melhorDist ?? 1e9) - 1) { h.progressoNo = chave; h.melhorDist = d; h.semProgresso = 0; return; }
    h.semProgresso = (h.semProgresso || 0) + dt;
    if (h.semProgresso > 20 && h.focoRota <= 0) { h.focoRota = 8; h.semProgresso = 0; h.melhorDist = d; }
  }

  objetivoSala() {
    if (this.room.praia) return this.objetivoPraia();
    const h = this.hero, room = this.room;
    const restam = this.itens.filter(it => it.achado);
    const vivos = this.zumbis.filter(z => !z.morto).length;
    const saindo = this.salaT > this.cfg.predioT - 20 || (!restam.length && (vivos === 0 || this.salaT > 25));
    if (saindo) {
      const s = room.saida;
      if (dist(h.x, h.y, s.x, s.y) < 0.6) { this.sairPredio(); return null; }
      return { x: s.x, y: s.y, saida: true };
    }
    if (restam.length) {
      let best = restam[0], bd = 1e9;
      for (const it of restam) { const d = dist2(h.x, h.y, it.x, it.y); if (d < bd) { bd = d; best = it; } }
      return { x: best.x, y: best.y, item: true };
    }
    return { x: room.w / 2, y: room.h / 2, esperando: true };
  }

  // Com 30% de vida ou menos, o herói não pisa em cacos de vidro (lá ele não se cura). Devolve a direção nova
  // (ou null pra seguir normal):
  //   - em cima do vidro: sai na hora rumo ao objetivo (sem parar pra lutar nem recuar); se o objetivo também está
  //     no vidro, sai pela borda mais perto, puxando pro lado do objetivo
  //   - fora: se o próximo passo cai num vidro, desvia pro lado livre; sem lado livre (rua tomada de vidro),
  //     espera; passados VIDRO_ESPERA segundos, atravessa (pra nunca travar)
  evitarVidro(obj, vx, vy, dt) {
    const h = this.hero, VIDRO_ESPERA = 4;
    if (h.vida / h.vidaMax > 0.3) { h.vidroEspera = 0; h.vidroLiberado = false; return null; }
    const vidros = (this.zonasHeroi || this.zonasAgora).filter(z => z.tipo === 'vidro');
    if (!vidros.length) { h.vidroEspera = 0; h.vidroLiberado = false; return null; }
    const noVidro = vidros.find(z => dentro(z, h.x, h.y));
    if (noVidro && h.vidroLiberado) return null;   // não tinha outro caminho: atravessa até o fim
    if (noVidro) {
      let ax = obj.x - h.x, ay = obj.y - h.y;
      if (dentro(noVidro, obj.x, obj.y) || Math.hypot(ax, ay) < 0.05) {
        // o objetivo está no vidro: borda mais perto (preferindo o lado do objetivo) com chão livre
        const m = 0.45, saidas = [[noVidro.x0 - m, h.y], [noVidro.x1 + m, h.y], [h.x, noVidro.y0 - m], [h.x, noVidro.y1 + m]]
          .filter(([x, y]) => this.livre(x, y))
          .map(([x, y]) => ({ x: x - h.x, y: y - h.y, custo: Math.hypot(x - h.x, y - h.y) - 0.3 * ((x - h.x) * ax + (y - h.y) * ay) / (Math.hypot(ax, ay) || 1) }))
          .sort((p, q) => p.custo - q.custo);
        if (saidas.length) { ax = saidas[0].x; ay = saidas[0].y; }
      }
      const d = Math.hypot(ax, ay) || 1;
      if (!h.saindoVidro) { h.saindoVidro = true; this.emit('saindo_vidro', { x: h.x, y: h.y }); }
      return { x: ax / d, y: ay / d };
    }
    h.saindoVidro = false;
    const vm = Math.hypot(vx, vy);
    if (vm < 0.05) return null;
    const ux = vx / vm, uy = vy / vm;
    const pisaria = (x, y) => vidros.some(z => dentro(z, x, y, 0.25));
    if (!pisaria(h.x + ux * 0.7, h.y + uy * 0.7)) { h.vidroEspera = 0; h.vidroLiberado = false; return null; }
    // desvia pro lado (diagonal, pra continuar avançando) que não tem vidro
    for (const [px, py] of [[-uy, ux], [uy, -ux]]) {
      const dx = (px * 0.8 + ux * 0.6), dy = (py * 0.8 + uy * 0.6);
      if (!pisaria(h.x + dx * 0.7, h.y + dy * 0.7) && this.livre(h.x + dx * 0.7, h.y + dy * 0.7)) { h.vidroEspera = 0; return { x: dx, y: dy }; }
      if (!pisaria(h.x + px * 0.7, h.y + py * 0.7) && this.livre(h.x + px * 0.7, h.y + py * 0.7)) { h.vidroEspera = 0; return { x: px, y: py }; }
    }
    // rua tomada de vidro: espera um pouco antes de atravessar
    h.vidroEspera = (h.vidroEspera || 0) + dt;
    if (h.vidroEspera < VIDRO_ESPERA) return { x: 0, y: 0 };
    h.vidroLiberado = true;
    return null;
  }

  itemDesejado() {
    const h = this.hero;
    let best = null, bd = 49;
    const semVidro = h.vida / h.vidaMax <= 0.3 ? (this.zonasHeroi || this.zonasAgora).filter(z => z.tipo === 'vidro') : [];
    for (const it of this.itens) {
      if (it.z > 0.3) continue;
      if (semVidro.some(z => dentro(z, it.x, it.y, 0.3))) continue;   // vida baixa: não vai buscar item em cima de vidro
      const d = dist2(h.x, h.y, it.x, it.y);
      if (d < bd && (this.room || this.linhaLivre(h.x, h.y, it.x, it.y, true))) { bd = d; best = it; }
    }
    return best;
  }

  // Move com colisão (desliza nas paredes). raio = metade da largura da entidade.
  mover(e, dx, dy, raio) {
    const m = this.map;
    const ok = (x, y) => m.walkable(x - raio, y - raio) && m.walkable(x + raio, y - raio) && m.walkable(x - raio, y + raio) && m.walkable(x + raio, y + raio);
    if (dx && ok(e.x + dx, e.y)) e.x += dx;
    if (dy && ok(e.x, e.y + dy)) e.y += dy;
  }

  linhaLivre(ax, ay, bx, by, andando = false) {
    const d = dist(ax, ay, bx, by), n = Math.ceil(d / 0.35);
    for (let i = 1; i < n; i++) {
      const x = ax + (bx - ax) * i / n, y = ay + (by - ay) * i / n;
      if (andando ? !this.map.walkable(x, y) : !this.map.tileOpen(Math.floor(x), Math.floor(y))) return false;
    }
    return true;
  }

  combate(dt) {
    const h = this.hero;
    this.golpear(h, CORPO[h.corpo]);
    const arma = h.arma ? ARMAS[h.arma] : null;
    if (!arma) {
      // Sem arma de fogo: mira no zumbi mais perto pra ir até ele (luta de perto)
      const alvo = this.escolherAlvo(CORPO[h.corpo].alcance + 4, true);
      h.mira = alvo;
      if (alvo) { const fm = Math.hypot(alvo.x - h.x, alvo.y - h.y) || 1; h.fx = (alvo.x - h.x) / fm; h.fy = (alvo.y - h.y) / fm; }
      return !!alvo;
    }
    // Arma de fogo
    const alcance = alcanceArma(h, arma);
    const alvo = this.escolherAlvo(alcance);
    h.mira = alvo;
    if (!alvo) return false;
    // a cena do 1º quarteirão: com o zumbi em cima da pessoa, não dá pra atirar (pode acertar ela). Vai de perto.
    const vit = this.cena?.vitima;
    if (vit && !vit.salva && alvo.cena && dist(alvo.x, alvo.y, vit.x, vit.y) < 1.4) {
      if (!this.cena.avisouTiro) { this.cena.avisouTiro = true; this.emit('aviso', { texto: '🔦 Não dá pra atirar: pode acertar a pessoa!', tipo: 'info' }); }
      h.semTiro = true;
      const fm = Math.hypot(alvo.x - h.x, alvo.y - h.y) || 1; h.fx = (alvo.x - h.x) / fm; h.fy = (alvo.y - h.y) / fm;
      return true;
    }
    h.semTiro = false;
    h.fx = alvo.x - h.x; h.fy = alvo.y - h.y;
    const fm = Math.hypot(h.fx, h.fy) || 1; h.fx /= fm; h.fy /= fm;
    const base = Math.atan2(h.fy, h.fx);
    if (arma.chama) {
      for (const z of this.zumbis) {
        if (z.morto || z.nascendo > 0) continue;
        const dx = z.x - h.x, dy = z.y - h.y, d = Math.hypot(dx, dy);
        if (d > alcance + ZUMBIS[z.tipo].raio) continue;
        let da = Math.abs(Math.atan2(dy, dx) - base); if (da > Math.PI) da = 2 * Math.PI - da;
        if (da > arma.cone) continue;
        this.ferirZumbi(z, danoDoHeroi(h, arma, z, null, { base: arma.dps * dt, continuo: true }).dano, null, true);
        if (!z.morto) this.statusDeAtaque(h, arma, z);
      }
      this.chamaT = (this.chamaT || 0) - dt;
      if (this.chamaT <= 0) { this.chamaT = 0.05; this.emit('chama', { x: h.x, y: h.y, ang: base, alcance }); }
      return true;
    }
    if (h.tiroCd > 0) return true;
    // arma com pente (pistola): recarregando, não atira (mas continua mirando)
    if (arma.pente) {
      if (h.recargaT > 0) return true;
      if (h.pente == null) h.pente = arma.pente;
    }
    h.tiroCd = intervaloTiro(h, arma);
    if (arma.area) this.tiroEmArea(h, arma, base, alcance);
    else for (let b = 0; b < arma.balas; b++) {
      const a = base + (this.rng.next() - 0.5) * 2 * arma.espalha;
      const ca = Math.cos(a), sa = Math.sin(a);
      let hit = null, ht = alcance;
      for (const z of this.zumbis) {
        if (z.morto || z.nascendo > 0) continue;
        const vx = z.x - h.x, vy = z.y - h.y;
        const proj = vx * ca + vy * sa;
        if (proj < 0 || proj > ht) continue;
        const perp2 = vx * vx + vy * vy - proj * proj, r = ZUMBIS[z.tipo].raio + 0.08;
        if (perp2 < r * r) { hit = z; ht = proj; }
      }
      const ex = h.x + ca * ht, ey = h.y + sa * ht;
      if (hit && !this.linhaLivre(h.x, h.y, ex, ey)) hit = null;
      if (hit) {
        const r = danoDoHeroi(h, arma, hit, this.rng);
        this.ferirZumbi(hit, r.dano, null, false, r.critico, r.efetividade);
        if (!hit.morto) {
          this.statusDeAtaque(h, arma, hit);
          // Passiva "tiro certeiro" (policial): crítico com arma de fogo marca o zumbi
          if (r.critico && CLASSES[h.classe].passiva?.id === 'tiro_certeiro' && arma.categoria === 'armas_fogo') this.aplicarStatus(hit, 'marcado');
        }
      }
      this.emit('tiro', { x: h.x, y: h.y, tx: ex, ty: ey, arma: h.arma, acertou: !!hit, heroi: true });
    }
    if (arma.pente && --h.pente <= 0) {   // acabou o pente: recarrega
      h.recargaT = arma.recarga;
      this.emit('recarregando', { x: h.x, y: h.y, segundos: arma.recarga });
    }
    if (h.municao != null && --h.municao <= 0) {
      this.emit('arma_acabou', { nome: arma.nome });
      this.trocarArma(this.armaPadrao(), null);
    }
    return true;
  }

  // Tiro em leque (escopeta, dados.js → ARMAS.escopeta.area): acerta todos os zumbis dentro do cone que estão à
  // vista, 4x o dano em quem está muito perto, e empurra cada um `empurra` casas pra trás (chefe: um terço).
  tiroEmArea(h, arma, base, alcance) {
    const A = arma.area, K = Math.log(50);   // (o empurrão perde 98% da força por segundo: anda K casas por unidade)
    const acertos = [];
    for (const z of this.zumbis) {
      if (z.morto || z.nascendo > 0) continue;
      const dx = z.x - h.x, dy = z.y - h.y, d = Math.hypot(dx, dy), raio = ZUMBIS[z.tipo].raio;
      if (d > alcance + raio) continue;
      const borda = Math.max(0, d - raio), cone = borda < A.perto ? A.cone * 1.8 : A.cone;   // colado no herói, o leque pega mais largo
      let da = Math.abs(Math.atan2(dy, dx) - base); if (da > Math.PI) da = 2 * Math.PI - da;
      if (da > cone + Math.atan2(raio, Math.max(0.3, d))) continue;
      if (!this.linhaLivre(h.x, h.y, z.x, z.y)) continue;
      const perto = borda < A.perto;
      const r = danoDoHeroi(h, arma, z, this.rng, { base: arma.dano * (perto ? A.multPerto : 1) });
      this.ferirZumbi(z, r.dano, null, false, r.critico, r.efetividade);
      acertos.push({ z, d });
      if (z.morto) continue;
      this.statusDeAtaque(h, arma, z);
      if (r.critico && CLASSES[h.classe].passiva?.id === 'tiro_certeiro') this.aplicarStatus(z, 'marcado');
      if (d > 0.01) {
        const f = A.empurra * K * (ZUMBIS[z.tipo].chefe ? 1 / 3 : 1);
        z.kx = dx / d * f; z.ky = dy / d * f;
      }
    }
    // os rastros do leque: um pra cada zumbi acertado e o resto espalhado
    for (const a of acertos.slice(0, arma.balas)) this.emit('tiro', { x: h.x, y: h.y, tx: a.z.x, ty: a.z.y, arma: h.arma, acertou: true, heroi: true });
    for (let b = acertos.length; b < Math.min(arma.balas, 4); b++) {
      const a = base + (this.rng.next() - 0.5) * 2 * arma.espalha;
      this.emit('tiro', { x: h.x, y: h.y, tx: h.x + Math.cos(a) * alcance, ty: h.y + Math.sin(a) * alcance, arma: h.arma, acertou: false, heroi: true });
    }
    if (acertos.some(a => a.d < A.perto + 0.6)) this.emit('escopetada', { x: h.x, y: h.y });
  }

  // Golpe de perto (automático quando um zumbi está no alcance). Acerta todos dentro do arco.
  golpear(h, corpo) {
    if (h.corpoCd > 0) return;
    let alvoPerto = null, bd = 1e9;
    for (const z of this.zumbis) {
      if (z.morto || z.nascendo > 0) continue;
      const d = dist2(h.x, h.y, z.x, z.y), lim = corpo.alcance - 0.3 + ZUMBIS[z.tipo].raio;
      if (d < lim * lim && d < bd) { bd = d; alvoPerto = z; }
    }
    if (!alvoPerto) return;
    h.corpoCd = intervaloCorpo(h, corpo);
    const ang = Math.atan2(alvoPerto.y - h.y, alvoPerto.x - h.x);
    let acertos = 0;
    for (const z of this.zumbis) {
      if (z.morto || z.nascendo > 0) continue;
      const dx = z.x - h.x, dy = z.y - h.y, d = Math.hypot(dx, dy);
      if (d > corpo.alcance + ZUMBIS[z.tipo].raio) continue;
      let da = Math.abs(Math.atan2(dy, dx) - ang); if (da > Math.PI) da = 2 * Math.PI - da;
      if (da > corpo.arco) continue;
      const r = danoDoHeroi(h, corpo, z, this.rng);
      this.ferirZumbi(z, r.dano, null, false, r.critico, r.efetividade);
      acertos++;
      if (z.morto) continue;
      this.statusDeAtaque(h, corpo, z);
      if (!ZUMBIS[z.tipo].chefe && d > 0.01) { z.kx += dx / d * corpo.empurra * 4; z.ky += dy / d * corpo.empurra * 4; }
    }
    // Cura por acerto (ex.: enfermeira): uma vez por golpe que acerta alguém
    const cpa = h.attr.get('curaPorAcerto');
    if (acertos && cpa > 0 && h.vida < h.vidaMax && !h.noVidro) { h.vida = Math.min(h.vidaMax, h.vida + cpa * h.attr.get('cura')); this.curaGolpes = (this.curaGolpes || 0) + cpa; }
    // Arma de perto achada (taco) quebra depois de alguns golpes
    if (corpo.golpes && --h.golpes <= 0) { h.corpo = this.corpoPadrao(); this.emit('arma_acabou', { nome: corpo.nome }); }
    this.emit('golpe', { x: h.x, y: h.y, ang, arma: h.corpo, acertos });
  }

  // Efeitos que um ataque do herói pode causar no zumbi (status.js), com a chance da arma + perícia
  statusDeAtaque(h, ataque, z) {
    for (const s of ataque.status || []) {
      if (this.rng.next() < chanceDoStatus(h, ataque, s.chance)) this.aplicarStatus(z, s.id, { duracao: s.duracao, pilhas: s.pilhas });
    }
  }

  // Aplica um status (status.js) no herói ou num zumbi. Devolve true se o status é novo.
  aplicarStatus(alvo, id, opts = {}) {
    const S = STATUS[id];
    const heroi = alvo === this.hero;
    if ((S.so === 'heroi' && !heroi) || (S.so === 'zumbi' && heroi)) return false;
    if (!heroi && id === 'atordoado' && ZUMBIS[alvo.tipo].chefe) opts = { ...opts, duracao: (opts.duracao ?? S.duracao) * 0.4 }; // chefes se recuperam rápido
    if (heroi && id === 'infectado' && this.rng.next() < alvo.attr.get('resInfeccao')) return false;
    if (heroi && S.multNoHeroi) opts = { ...opts, mult: (opts.mult ?? 1) * S.multNoHeroi };
    // Controle no zumbi (atordoar, congelar, medo): depois que passa, ele fica CONTROLE_IMUNE s sem poder ser
    // controlado de novo. Senão as supremas de controle juntas prendem a horda pra sempre e o herói vira imortal.
    if (!heroi && CONTROLE.has(id)) {
      if ((alvo.ctrlAte ?? -1) > this.t) return false;
      alvo.ctrlAte = this.t + (opts.duracao ?? S.duracao) + CONTROLE_IMUNE;
    }
    const novo = alvo.estados.aplicar(id, opts);
    if (heroi) {
      sincronizarAtributos(alvo.estados, alvo.attr);
      if (novo) this.emit('status', { id, lado: S.lado, x: alvo.x, y: alvo.y });
      // veio de um presente da live: mostra na tela o que o herói ganhou (ou sofreu) por uns segundos
      const quem = opts.presente || this.presenteAtual;
      if (quem) {
        const e = alvo.estados.lista.get(id);
        this.emit('status_presente', { id, nome: S.nome, emoji: S.emoji, lado: S.lado, nick: quem.nick || null,
          quarteiroes: Number.isFinite(e?.q) ? e.q : null, segundos: Number.isFinite(e?.t) && e?.q == null ? Math.ceil(e.t) : null, pilhas: e?.pilhas || 1 });
      }
    }
    return novo;
  }

  // Roda fn com "quem" como o dono do presente: os status que caírem no herói durante fn avisam na tela
  // (status_presente). Curtidas não contam (não são doação).
  comPresente(quem, fn) {
    const antes = this.presenteAtual;
    this.presenteAtual = quem && quem.id !== '__curtidas' ? quem : null;
    try { return fn(); } finally { this.presenteAtual = antes; }
  }

  armaPadrao() { const h = this.hero, C = CLASSES[h.classe]; if (h.armaFixa) return h.armaFixa; return C.arma === 'escopeta' ? 'pistola' : (C.arma || null); }
  corpoPadrao() { return this.hero.corpoFixo || CLASSES[this.hero.classe].corpo || 'empurrao'; }

  // vida máxima vem dos atributos; se ela cair, a vida atual acompanha
  sincronizarVida() {
    const h = this.hero, vm = h.attr.get('vidaMax');
    if (vm !== h.vidaMax) { h.vidaMax = vm; if (h.vida > vm) h.vida = vm; }
  }

  deixarLento(seg) { this.aplicarStatus(this.hero, 'lento', { duracao: seg }); }

  // perto = true: luta de perto (só mira em explosivo com mais de metade da vida: ele explode na cara)
  escolherAlvo(alcance, perto = false) {
    const h = this.hero;
    const cand = [];
    for (const z of this.zumbis) {
      if (z.morto || z.nascendo > 0 || (perto && z.tipo === 'explosivo' && h.vida / h.vidaMax < 0.5)) continue;
      if (z.fa?.escudo > 0) continue;   // zumbi do fã com escudo: não adianta mirar nele
      if (z.devorando && z.encontro && this.encontro?.fase !== 'ajudando') continue;   // em cima de alguém no encontro: só se decidirem ajudar
      const d = dist(h.x, h.y, z.x, z.y);
      if (d > alcance + ZUMBIS[z.tipo].raio) continue;
      let s = d;
      if (z.tipo === 'explosivo' && d > 1.6) s -= 2;
      if (z.tipo === 'corredor') s -= 0.6;
      if (h.mira === z) s -= 0.5;      // não fica trocando de alvo
      cand.push([s, z]);
    }
    cand.sort((a, b) => a[0] - b[0]);
    for (let i = 0; i < Math.min(6, cand.length); i++) {
      const z = cand[i][1];
      if (this.linhaLivre(h.x, h.y, z.x, z.y)) return z;
    }
    return null;
  }

  // id null = fica sem arma de fogo (luta só de perto)
  trocarArma(id, quem) {
    const h = this.hero;
    if (!id) { h.arma = null; h.municao = null; h.armaQ = 0; this.emit('arma', { id: null, quem: null }); return; }
    const a = ARMAS[id];
    h.arma = id;
    h.municao = a.municao ?? null;
    h.pente = a.pente ?? null; h.recargaT = 0;   // pente cheio ao pegar a arma
    h.armaQ = a.quarteiroes || 0;      // arma lendária dura alguns quarteirões
    this.emit('arma', { id, nome: a.nome, emoji: a.emoji, lendaria: !!a.lendaria, quem: quem?.nick || null });
  }

  // tipo = tipo de dano (dano.js → TIPOS_DANO). silencioso = sem efeito na tela (dano de status por segundo).
  // Devolve true se o dano entrou.
  ferirHeroi(dano, quem, causa, tipo = 'mordida', silencioso = false) {
    const h = this.hero;
    if (this.fase !== 'jogo' || this.caido) return false;
    const r = danoNoHeroi(h, dano, tipo, this.rng);
    if (r.bloqueado === 'invencivel') return false;
    if (r.bloqueado === 'esquiva') { this.emit('esquiva', { x: h.x, y: h.y }); return false; }
    // Escudo de energia (habilidades): cada carga segura um golpe, até ESCUDO_SEGURA da vida máxima (o que passar
    // disso machuca: senão, com a horda cada vez mais forte, o escudo deixava o herói imortal); quando a última
    // carga quebra, empurra a horda
    if (h.escudo > 0 && !silencioso && tipo !== 'esmagar') {
      h.escudo--;
      this.emit('escudo_bloqueou', { x: h.x, y: h.y, resta: h.escudo });
      const passou = r.dano - h.vidaMax * ESCUDO_SEGURA;
      if (passou > 0) r.dano = passou;
      if (h.escudo === 0 && h.escudoEstouro > 0) {
        this.emit('onda', { x: h.x, y: h.y, raio: 2.2, cor: '#7ad8ff' });
        for (const z of this.zumbis) {
          if (z.morto || dist2(z.x, z.y, h.x, h.y) > 2.2 * 2.2) continue;
          this.ferirZumbi(z, h.escudoEstouro * h.attr.get('dano'), null, false);
          const d = Math.hypot(z.x - h.x, z.y - h.y) || 0.01;
          if (!z.morto && !ZUMBIS[z.tipo].chefe) { z.kx += (z.x - h.x) / d * 7; z.ky += (z.y - h.y) / d * 7; }
        }
      }
      if (!(passou > 0)) return false;
    }
    if (r.bloqueado === 'colete') { h.colete--; this.emit('colete', { x: h.x, y: h.y, resta: h.colete }); return false; }
    dano = r.dano;
    if (h.estados.tem('inspirado')) dano *= RECOMPENSA.inspiracao.danoRecebido;   // doação: toma só 20% do dano
    h.vida -= dano;
    // o golpe que levou o herói a 30% cansa o colosso na hora (antes da mochila ou de outra cura chegar)
    if (h.vida / h.vidaMax <= RECOMPENSA.chefe.cansaVida) this.cansarColosso();
    // segundo fôlego (antes do nível 10): com a vida quase no fim, o herói empurra todo mundo e respira
    if (h.vida / h.vidaMax < FOLEGO.limite && h.nivel < FOLEGO.ateNivel && !h.supremas?.length && h.folegoCd <= 0) this.segundoFolego();
    if (!silencioso) this.emit('dano_heroi', { dano, x: h.x, y: h.y });
    this.stats.matador = quem ? { nick: quem.nick, avatar: quem.avatar || '', causa } : { nick: null, causa };
    if (!h.vidaBaixa && h.vida > 0 && h.vida / h.vidaMax < 0.3) { h.vidaBaixa = true; this.emit('vida_baixa'); }
    if (h.vida <= 0 && !supremaSegura(this, h) && !reliquiaSalva(this, h)) this.cair();
    return true;
  }

  // Botão de teste "derrubar herói": derruba na hora, sem esquiva, colete, invencibilidade, segundo fôlego,
  // mochila, suprema ou relíquia segurando (um golpe de 9999 podia ser esquivado ou segurado por eles)
  derrubar(quem = null, causa = 'o botão de teste') {
    if (this.fase !== 'jogo' || this.caido || this.portal) return false;
    this.stats.matador = quem ? { nick: quem.nick, avatar: quem.avatar || '', causa } : { nick: null, causa };
    this.cair(true);
    return true;
  }

  // Dano por toque (dano.js → TOQUE): cada zumbi encostado tira um tanto por segundo, além da mordida
  danoPorToque(dt) {
    const h = this.hero;
    if (this.fase !== 'jogo' || this.caido || h.invT > 0 || h.invQ > 0) return;
    const baixa = h.vida / h.vidaMax <= TOQUE.vidaBaixa;
    let dps = 0, quem = null;
    for (const z of this.zumbis) {
      if (z.morto || z.dormindo || z.nascendo > 0 || z.dono?.aliado) continue;
      const T = ZUMBIS[z.tipo], r = T.raio + 0.3 + TOQUE.folga;   // raio do zumbi + do herói
      if (dist2(z.x, z.y, h.x, h.y) > r * r) continue;
      dps += (baixa ? TOQUE.porSegundoBaixa : TOQUE.porSegundo) * Math.max(1, (z.dano || T.dano) / T.dano);
      quem = z;
    }
    if (!dps) return;
    let dano = dps * dt * (1 - h.attr.get('defesa'));
    if (h.estados.tem('inspirado')) dano *= RECOMPENSA.inspiracao.danoRecebido;
    h.vida -= dano;
    h.toqueAcum = (h.toqueAcum || 0) + dano;
    if ((h.toqueT = (h.toqueT || 0) - dt) <= 0 && h.toqueAcum >= 1) {   // aviso na tela (sangue, piscada) uma vez por segundo
      h.toqueT = 1; this.emit('dano_heroi', { dano: h.toqueAcum, x: h.x, y: h.y, toque: true }); h.toqueAcum = 0;
    }
    if (h.vida / h.vidaMax <= RECOMPENSA.chefe.cansaVida) this.cansarColosso();
    if (h.vida / h.vidaMax < FOLEGO.limite && h.nivel < FOLEGO.ateNivel && !h.supremas?.length && h.folegoCd <= 0) this.segundoFolego();
    if (!h.vidaBaixa && h.vida > 0 && h.vida / h.vidaMax < 0.3) { h.vidaBaixa = true; this.emit('vida_baixa'); }
    if (h.vida <= 0) {
      this.stats.matador = quem?.dono ? { nick: quem.dono.nick, avatar: quem.dono.avatar || '', causa: 'a horda' } : { nick: null, causa: 'a horda' };
      if (!supremaSegura(this, h) && !reliquiaSalva(this, h)) this.cair();
    }
  }

  // Segundo fôlego: até o nível 10 (FOLEGO.ateNivel), quando a vida cai abaixo de 20% o herói solta um grito,
  // empurra e atordoa os zumbis em volta, fica invencível por uns segundos e recupera um pouco de vida.
  // Recarrega em FOLEGO.recarga segundos: segura o herói com vida baixa, mas dá pra morrer se apertar de novo.
  segundoFolego() {
    const h = this.hero, F = FOLEGO;
    h.folegoCd = F.recarga;
    h.vida = Math.max(h.vida, 1) + h.vidaMax * F.cura;
    h.invT = Math.max(h.invT, F.invencivel);
    for (const z of this.zumbis) {
      if (z.morto || ZUMBIS[z.tipo].chefe) continue;
      const d = dist(z.x, z.y, h.x, h.y);
      if (d > F.raio || d < 0.01) continue;
      z.kx += (z.x - h.x) / d * F.empurra; z.ky += (z.y - h.y) / d * F.empurra;
      this.aplicarStatus(z, 'atordoado', { duracao: F.atordoa });
      if (z.tipo === 'explosivo') z.pavio = -1;
    }
    this.emit('segundo_folego', { x: h.x, y: h.y, raio: F.raio });
  }

  ganharXp(x) {
    const h = this.hero;
    h.xp += x * (1 + XP_POR_PILHA_SORTE * h.estados.pilhas('d_sorte')) * h.attr.get('xpGanho');   // drop Sortudo e passivas (Estudioso, Gorjeta): mais experiência
    while (h.xp >= xpParaNivel(h.nivel) && h.nivel < NIVEL_MAXIMO) {
      h.xp -= xpParaNivel(h.nivel);
      h.nivel++;
      // Perícias do personagem sobem a cada nível (dados.js → CLASSES[...].crescimento)
      const C = CLASSES[h.classe];
      const subiu = [];
      for (const [cat, inc] of Object.entries(C.crescimento || {})) {
        const antes = Math.floor(h.pericias[cat] ?? 0);
        h.pericias[cat] = (h.pericias[cat] ?? 0) + inc;
        if (Math.floor(h.pericias[cat]) > antes) subiu.push(`${PERICIAS[cat].emoji} ${PERICIAS[cat].nome} ${Math.floor(h.pericias[cat])}`);
      }
      aplicarPericias(h, C);
      // a vida máxima cresce com o nível (subir de nível NÃO cura: a vida atual fica como estava)
      h.attr.addMod({ id: 'nivel:vida', attr: 'vidaMax', mult: multVidaNivel(h.nivel), fonte: 'nível' });
      this.sincronizarVida();
      this.emit('nivel', { nivel: h.nivel, pericias: subiu });
      if (h.nivel === NIVEL_INIMIGOS_NOVOS) this.emit('novos_inimigos', {});
      if (h.nivel === NIVEL_MAXIMO) { h.xp = 0; this.emit('nivel_maximo', { nivel: h.nivel }); }
      // cada nível vira uma escolha de habilidade do chat (A, B ou C)
      this.niveisPendentes++;
      this.filaNiveis.push(h.nivel);
      if (!this.escolha && this.escolhaEspera <= 0) this.escolhaEspera = 0.6;
    }
    if (h.nivel >= NIVEL_MAXIMO) h.xp = 0;   // nível máximo: a experiência para
  }

  // Quantas escolhas de habilidade ainda faltam (aberta, na fila e a do nível deus)
  contarEscolhas() { return (this.escolha ? 1 : 0) + this.niveisPendentes + (deusPendente(this.hero) && !this.escolha?.deus ? 1 : 0); }
  escolhasPendentes() { return this.contarEscolhas() > 0; }

  // Nível que conta pra ameaça: só os níveis que o chat já escolheu (os que ainda esperam na fila de escolhas
  // não deixaram o herói mais forte, então não deixam os zumbis mais fortes)
  nivelForca() { return Math.max(1, this.hero.nivel - this.niveisPendentes); }

  // Começo puxado: quantos zumbis normais a mais aparecem no nível atual do herói (ameaca.js → multInicio)
  // (enquanto o chat escolhe a habilidade suprema do nível 10, ainda vale o do nível 9)
  // × a rampa da sobrevivência: a rua começa vazia e vai enchendo quarteirão a quarteirão
  multInicio() { return multInicio(this.hero.nivel, this.A) * this.rampaAtual(); }
  rampaAtual() { return this.S.cenaLigada || this.S.rampaInicio < 1 ? rampa(this.stats.quarteiroes + (this.S.cenaLigada ? 0 : 1), this.S) : 1; }
  // Tamanho de horda dos caminhos perigosos, já com o multiplicador do começo
  hordaDaRua(n) { return Math.max(3, Math.round(tamanhoHorda(n, this.A) * this.multInicio())); }

  // Horda gigante da quadra: a cada hordaCadaQuarteiroes quarteirões (ameaca.js). Chega anunciada, de frente
  // e por trás, em ondas (8 s entre uma e outra), e precisa ser limpa pra atravessar o próximo cruzamento.
  hordaDaQuadra() {
    if (this.fase !== 'jogo') return;
    if (this.room || this.arena || this.caido || this.rota.beco) { this.agendar(3, () => this.hordaDaQuadra()); return; }   // espera voltar pra rua
    const qtd = tamanhoHordaQuadra(this.nivelAmeaca, 1, this.A);
    const ondas = Math.max(1, Math.ceil(qtd / this.A.hordaQuadraOndaCada)), por = Math.ceil(qtd / ondas);
    for (let k = 0; k < ondas; k++) this.agendar(1.5 + k * 8, () => {
      if (this.fase !== 'jogo') return;
      this.soltarZumbis('horda', Math.ceil(por * 0.65), null, { horda: true, semEscala: true });
      this.soltarZumbisAtras(Math.floor(por * 0.35));
    });
    this.hordaT = Math.max(this.hordaT, this.A.hordaCadaSegundos);
    this.emit('horda_quadra', { qtd, ondas, quarteirao: this.stats.quarteiroes });
  }

  // Toda vez que o herói completa quarteirões (cruzamento, saída de prédio, arena ou praia).
  // Os BÔNUS contam quarteirões, não segundos: tiro rápido, fúria, blindado, foco (status),
  // arma lendária, cachorro e sobrevivente ajudante e o invencível do helicóptero.
  andouQuarteirao(n = 1) {
    const h = this.hero;
    h.semCruzar = 0;
    this.stats.quarteiroes += n;
    // quarteirão novo: cota de zumbis da rua nova
    this.cotaRua = null;
    voltaramComoZumbi(this);   // quem ficou pra trás num encontro pode voltar como zumbi (encontros.js)
    quarteiraoDosSalvos(this);  // e quem foi salvo (mordido) pode virar zumbi ou não resistir
    // zumbi do tomate: um por vez, às vezes, num quarteirão novo
    if (h.nivel >= TOMATEIRO.desdeNivel && !this.zumbis.some(z => !z.morto && z.tipo === 'tomateiro') && this.rng.chance(TOMATEIRO.chance)) this.agendar(3, () => this.surgirTomateiro());
    // zumbi da tela sozinho na rua (tela.js → TELA.naRua; cada um tem o nível do herói em que começa a aparecer)
    if (this.cfg.telaAtiva && this.zumbis.filter(z => !z.morto && idTela(z.tipo)).length < TELA.naRua.max && this.rng.chance(this.cfg.telaRua)) {
      const id = sortearNaRua(this.rng, h.nivel);
      if (id) this.agendar(4, () => this.surgirTela(id, null));
    }
    // zumbi da pedra: também um por vez, um pouco mais tarde
    if (h.nivel >= PEDREIRO.desdeNivel && !this.zumbis.some(z => !z.morto && z.tipo === 'pedreiro') && this.rng.chance(PEDREIRO.chance)) this.agendar(5, () => this.surgirTomateiro('pedreiro'));
    // doação: o colosso aparece no quarteirão seguinte
    if (this.colossoPendente?.estado === 'esperando') { this.colossoPendente.estado = 'chamado'; this.agendar(2.5, () => this.surgirColosso()); }
    this.limpando = null;
    // a cada 5 quarteirões, a horda gigante
    const cada = this.A.hordaCadaQuarteiroes;
    if (cada > 0 && this.stats.quarteiroes >= this.proxHordaQ) {
      while (this.proxHordaQ <= this.stats.quarteiroes) this.proxHordaQ += cada;
      this.agendar(2, () => this.hordaDaQuadra());
    }
    const fim = h.estados.passarQuarteiroes(n);
    if (fim.includes('agarrado')) this.soltarPerna();
    if (fim.length) { sincronizarAtributos(h.estados, h.attr); for (const id of fim) this.emit('buff_acabou', { id }); }
    if (h.armaQ > 0 && (h.armaQ -= n) <= 0) { h.armaQ = 0; this.trocarArma(this.armaPadrao(), null); }
    if (h.invQ > 0) h.invQ = Math.max(0, h.invQ - n);
    if (this.aliados.length) {
      for (const a of this.aliados) a.q -= n;
      const antes = this.aliados.length;
      this.aliados = this.aliados.filter(a => a.q > 0);
      if (this.aliados.length < antes) this.emit('aliado_foi');
    }
  }

  /* =================== Escolha de habilidade (roguelike) =================== */
  // A cada nível o chat escolhe 1 de 3 cartas (habilidades.js). Mesma janela de votos atrasados da votação.
  // Se subir vários níveis de uma vez, as escolhas vêm uma depois da outra.
  // Com 6 supremas no núcleo, a próxima escolha é a do NÍVEL DEUS (3 poderes; passa na frente da fila e não
  // gasta um nível)
  // No nível 10, a escolha especial das 3 supremas originais de presente (habilidades.js → cartasPresente); ela passa
  // na frente das escolhas de níveis anteriores que ainda estão na fila.
  abrirEscolha() {
    const h = this.hero;
    const deus = deusPendente(h);
    if (!deus) this.niveisPendentes--;
    const k10 = this.filaNiveis.indexOf(NIVEL_PRESENTE), presente = !deus && k10 >= 0 && presenteNivel10(h);
    const nivel = deus ? h.nivel : (presente ? this.filaNiveis.splice(k10, 1)[0] : this.filaNiveis.shift()) ?? h.nivel;
    const cartas = deus ? cartasDeus(h, this.rng) : presente ? cartasPresente(h) : sortearCartas(h, this.rng);
    if (!cartas.length) return;
    // com níveis acumulados na fila, a votação fica mais curta (o chat escolhe mais rápido e o herói não fica pra trás)
    const dur = this.niveisPendentes >= 2 ? Math.max(ESCOLHA_RAPIDA.minimo, this.cfg.escolhaDur * ESCOLHA_RAPIDA.mult) : this.cfg.escolhaDur;
    const voto = new Votacao(cartas.map(c => ({ id: c.letra.toLowerCase(), n: c.letra })), dur, this.cfg.atraso);
    this.escolha = { voto, cartas, nivel, deus, presente };
    this.emit('escolha_abriu', { nivel, cartas, deus, presente });
  }

  atualizarEscolha(dt) {
    if (!this.escolha) {
      if ((this.niveisPendentes > 0 || deusPendente(this.hero)) && (this.escolhaEspera -= dt) <= 0) this.abrirEscolha();
      return;
    }
    const e = this.escolha;
    e.voto.update(dt);
    if (e.voto.t > 0) return;
    const h = this.hero;
    const res = e.voto.fechar(() => escolhaDaIA(h, e.cartas, this.rng).toLowerCase(), this.rng);
    const carta = e.cartas.find(c => c.letra.toLowerCase() === res.id);
    aplicarCarta(this, carta);
    const quem = [];
    for (const [id, v] of e.voto.votantes) if (v === res.id && quem.length < 3) quem.push(this.nickDe(id));
    this.escolhaRes = { carta, votos: res.votos, total: e.voto.total, auto: res.auto, empate: !!res.empate, quem, ate: this.t + 3.5, voto: e.voto };
    this.emit('habilidade', { carta, votos: res.votos, auto: res.auto, quem, x: h.x, y: h.y });
    this.escolha = null;
    this.escolhaEspera = this.niveisPendentes >= 2 ? ESCOLHA_RAPIDA.espera : 3.5;
  }

  /* =================== Zumbis =================== */
  // semInicio: sem o reforço do começo (zumbi do fã já vem forte por conta própria)
  statsComFuria(T, vidaMult, semInicio = false) {
    const f = furiaDaHorda((this.t - Math.max(this.stats.inicio, this.ultimaAjudaT ?? 0)) / 60, this.A);
    // começo puxado (antes do nível 10): zumbis mais fortes
    const ini = semInicio ? 1 : forcaInicio(this.hero.nivel, this.A);
    const cabo = multForcaCabo(this.cabo);   // atrapalhante na frente no cabo de guerra: zumbis um pouco mais fortes
    const s = statsZumbi(T, this.ameaca(), vidaMult * (1 + (f - 1) * this.A.furiaVida) * ini * cabo, f * ini * cabo);
    s.vel *= 1 + Math.min(this.A.furiaVelMax, (f - 1) * this.A.furiaVel);
    return s;
  }

  criarZumbi(tipo, x, y, quem, opts = {}) {
    const T = ZUMBIS[tipo];
    const z = {
      // fúria sem ajuda da live: zumbis batem mais forte e (com FURIA_VIDA) também aguentam mais
      // opts.simples: zumbi comum sem bônus nenhum (só a escala da ameaça, sem fúria nem cabo de guerra)
      id: proxId++, tipo, x, y, ...(opts.simples ? statsZumbi(T, this.ameaca(), 1, 1) : this.statsComFuria(T, opts.vidaMult || 1, !!opts.fa)),
      atkCd: 0.5 + this.rng.next(), velMult: 0.85 + this.rng.next() * 0.3, nascendo: opts.nascendo ?? 0.7,
      dono: quem || null, nome: opts.nome || null, kx: 0, ky: 0, fx: 0, fy: 1, animT: this.rng.next() * 10,
      flash: 0, estados: new Estados(), pavio: -1, dormindo: !!opts.dormindo, roupa: this.rng.int(0, 5), extra: opts.extra || null
    };
    if (opts.fa) {
      // zumbi do fã (presente TikTok): mais forte e rápido, com a foto de quem mandou e escudo até acertar o herói
      const F = ZUMBI_FA;
      z.vida = z.vidaMax = z.vidaMax * F.vida; z.vel *= F.vel; z.dano *= F.dano;
      z.fa = { escudo: F.escudoMax, avatar: quem?.avatar || '' };
    }
    if (tipo === 'explosivo') {
      // do nível 20 em diante, inchado instável: o estouro cresce com a ameaça como o dano dos outros zumbis
      const E = EXPLOSAO, instavel = this.hero.nivel >= E.desdeNivel;
      z.estouro = instavel ? E.base * this.statsComFuria(ZUMBIS.comum, 1).dano / ZUMBIS.comum.dano * E.multNovo : E.base;
      z.estouroRaio = instavel ? E.raioNovo : E.raio;
      z.instavel = instavel;
    }
    this.zumbis.push(z);
    return z;
  }

  atualizarZumbis(dt) {
    const h = this.hero;
    const vivo = this.fase === 'jogo';
    this.flowT -= dt;
    if (this.flowT <= 0 && vivo) { this.flowT = 0.35; this.flow.build(this.map, h.x, h.y); }
    // Grade pra separar zumbis uns dos outros
    const grade = new Map();
    for (const z of this.zumbis) {
      if (z.morto) continue;
      const k = (Math.floor(z.x) * 92821) ^ Math.floor(z.y);
      let l = grade.get(k); if (!l) grade.set(k, l = []); l.push(z);
    }
    const noite = this.ehNoite();
    for (const z of this.zumbis) {
      if (z.morto) continue;
      const T = ZUMBIS[z.tipo];
      z.flash = Math.max(0, z.flash - dt);
      if (z.nascendo > 0) { z.nascendo -= dt; continue; }
      if (z.fa?.escudo > 0) z.fa.escudo = Math.max(0, z.fa.escudo - dt);   // escudo do zumbi do fã some sozinho com o tempo
      // colosso da doação: cansa quando o herói chega em 30% de vida (ou a luta demora demais)
      if (z.doacao && vivo) {
        const D = z.doacao, C = RECOMPENSA.chefe;
        D.t += dt;
        if (!D.cansado && (h.vida / h.vidaMax <= C.cansaVida || D.t > C.cansaSegundos)) this.cansarColosso(z);
      }
      // Status (status.js): dano por segundo, atordoado
      const st = z.estados.update(dt);
      for (const d of st.danos) this.ferirZumbi(z, danoNoZumbi(z, d.valor, d.tipo), null, true);
      if (z.morto) continue;
      if (z.estados.parado()) { z.atkCd = Math.max(z.atkCd, 0.25); z.bote = null; continue; }
      // a cena do 1º quarteirão: agachado devorando (ou levantando), não anda nem ataca
      if ((z.devorando || z.levantando > 0) && zumbiDevorando(this, z, dt)) continue;
      // Perigos do chão também pegam os zumbis
      let lentidaoChao = 1;
      if (this.zonasAgora.length) {
        const amb = efeitoDoAmbiente(z, this.zonasAgora, dt, this.t, this.rng);
        lentidaoChao = amb.lentidao;
        for (const d of amb.danos) this.ferirZumbi(z, danoNoZumbi(z, d.valor, d.tipo), null, true);
        if (z.morto) continue;
        for (const s of amb.status) this.aplicarStatus(z, s.id, { duracao: s.duracao, pilhas: s.pilhas });
        if (amb.apagaFogo) z.estados.remover('queimando');
      }
      // empurrão
      if (z.kx || z.ky) {
        this.mover(z, z.kx * dt, z.ky * dt, 0.2);
        z.kx *= Math.pow(0.02, dt); z.ky *= Math.pow(0.02, dt);
        if (Math.abs(z.kx) + Math.abs(z.ky) < 0.05) z.kx = z.ky = 0;
      }
      // alvo: herói, ou um aliado que esteja mais perto
      let tx = h.x, ty = h.y, alvoAliado = null;
      let d = dist(z.x, z.y, h.x, h.y);
      for (const a of this.aliados) {
        const da = dist(z.x, z.y, a.x, a.y);
        if (da < d - 1 && da < 2.5) { d = da; tx = a.x; ty = a.y; alvoAliado = a; }
      }
      if (z.dormindo) { if (d < 3.2 || z.vida < z.vidaMax) z.dormindo = false; else continue; }
      // longe demais: some (chefes são trazidos de volta pra perto)
      if (d > 30 && vivo) {
        if (T.chefe) { const p = this.pontoNaRua(h, 8, 11, 0); if (p) { z.x = p.x; z.y = p.y; } }
        else { z.morto = true; z.sumiu = true; continue; }
      }
      // lobo zumbi: salta no herói (paralisa e pode fazer sangrar)
      if (T.salto && vivo && !this.caido) {
        if (z.salto) {
          const sa = z.salto;
          sa.t += dt;
          const k = Math.min(1, sa.t / sa.dur);
          this.mover(z, sa.x0 + (sa.x1 - sa.x0) * k - z.x, sa.y0 + (sa.y1 - sa.y0) * k - z.y, 0.2);
          z.alt = Math.sin(k * Math.PI);
          if (k >= 1) {
            z.salto = null; z.alt = 0; z.atkCd = T.cd;
            const perto = dist(z.x, z.y, h.x, h.y) < 0.75 + T.raio;
            if (perto) {
              const entrou = this.ferirHeroi(danoDoZumbi(z) * T.salto.dano, z.dono, 'o salto do lobo zumbi', 'mordida');
              if (entrou) for (const s of T.saltoStatus) if (this.rng.next() < s.chance) this.aplicarStatus(h, s.id, { duracao: s.duracao, fonte: z.dono });
            }
            this.emit('lobo_caiu', { x: z.x, y: z.y, acertou: perto });
          }
          continue;
        }
        z.saltoCd = (z.saltoCd ?? 1 + this.rng.next() * 2) - dt;
        if (z.saltoCd <= 0 && !alvoAliado && d >= T.salto.min && d <= T.salto.max && this.linhaLivre(z.x, z.y, h.x, h.y)) {
          z.saltoCd = T.salto.recarga;
          z.salto = { t: 0, dur: T.salto.duracao, x0: z.x, y0: z.y, x1: h.x - (h.x - z.x) / d * 0.35, y1: h.y - (h.y - z.y) / d * 0.35 };
          z.fx = (h.x - z.x) / d; z.fy = (h.y - z.y) / d;
          this.emit('lobo_pulou', { x: z.x, y: z.y });
          continue;
        }
      }
      // braço longo: estica o braço e acerta de longe (com chance de errar)
      if (T.braco && vivo && !alvoAliado && !this.caido) {
        z.bracoCd = (z.bracoCd ?? 1 + this.rng.next() * 1.5) - dt;
        if (z.bracoCd <= 0 && d > T.alcance + 0.3 && d <= T.braco.alcance && this.linhaLivre(z.x, z.y, h.x, h.y)) {
          z.bracoCd = T.braco.recarga;
          const acertou = this.rng.next() < T.braco.chance;
          if (acertou) {
            const entrou = this.ferirHeroi(danoDoZumbi(z), z.dono, 'o braço longo', 'impacto');
            if (entrou) for (const s of T.ataque.status || []) if (this.rng.next() < s.chance) this.aplicarStatus(h, s.id, { duracao: s.duracao, fonte: z.dono });
          }
          this.emit('braco', { x: z.x, y: z.y, tx: acertou ? h.x : z.x + (h.x - z.x) * 0.8 + (this.rng.next() - 0.5) * 0.8, ty: acertou ? h.y : z.y + (h.y - z.y) * 0.8 + (this.rng.next() - 0.5) * 0.8, acertou });
        }
      }
      // explosivo: acende o pavio quando chega perto
      if (z.tipo === 'explosivo') {
        if (z.pavio < 0 && d < 1.1 && vivo) { z.pavio = 0.75; this.emit('pavio', { x: z.x, y: z.y }); }
        if (z.pavio >= 0) { z.pavio -= dt; if (z.pavio <= 0) { this.matarZumbi(z, null); continue; } continue; }
      }
      // rei: chama ajudantes
      if (z.tipo === 'rei' && vivo) {
        z.chamarT = (z.chamarT ?? 4) - dt;
        if (z.chamarT <= 0) {
          z.chamarT = 6;
          for (let k = 0; k < 3; k++) { const p = this.pontoPerto(z, 2); if (p) this.criarZumbi('comum', p.x, p.y, z.dono); }
          this.emit('rei_chamou', { x: z.x, y: z.y });
        }
      }
      // direção: perto vai reto; longe segue o mapa de distâncias
      let mx = tx - z.x, my = ty - z.y;
      if (!vivo) { mx = Math.sin(this.t * 0.3 + z.id) ; my = Math.cos(this.t * 0.37 + z.id * 1.7); }
      else if (d > 1.8 && !alvoAliado) { const f = this.flow.dir(z.x, z.y); if (f) { mx = f.x; my = f.y; } }
      let mm = Math.hypot(mx, my) || 1;
      mx /= mm; my /= mm;
      // separação
      const cx = Math.floor(z.x), cy = Math.floor(z.y);
      let sx = 0, sy = 0;
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        const l = grade.get(((cx + ox) * 92821) ^ (cy + oy)); if (!l) continue;
        for (const o of l) {
          if (o === z || o.morto) continue;
          const ddx = z.x - o.x, ddy = z.y - o.y, dd = ddx * ddx + ddy * ddy;
          const rr = T.raio + ZUMBIS[o.tipo].raio;
          if (dd < rr * rr && dd > 1e-6) { const q = Math.sqrt(dd); sx += ddx / q * (rr - q); sy += ddy / q * (rr - q); }
        }
      }
      // limpando a área: os que estão longe vêm correndo pro herói (senão a espera no cruzamento demora)
      const chamado = this.limpando && d > 6 ? 1.7 : 1;
      const vel = z.vel * z.velMult * z.estados.lentidao() * lentidaoChao * (noite ? 1.12 : 1) * (vivo ? 1 : 0.25) * chamado;
      const perto = d < T.alcance + 0.12;
      // morde quem está encostado na tela (dano.js → MORDIDA), mesmo que o empurrão do herói não deixe colar
      const morde = d < T.alcance + MORDIDA.folga;
      if (morde && !z.encostou && vivo) { z.encostou = true; z.atkCd = Math.min(z.atkCd, MORDIDA.chegada); }
      else if (!morde && d > T.alcance + MORDIDA.folga + 1.5) z.encostou = false;
      // zumbi do tomate e da pedra: fica de longe (recua se o herói chega perto, para quando está na distância boa) e joga
      let quieto = false;
      const Tm = T.tomate || T.pedra || T.arremesso;   // (arremesso: zumbis da tela que jogam de longe, tela.js)
      if (Tm && vivo && !alvoAliado) {
        z.tomateCd = (z.tomateCd ?? 1.5 + this.rng.next()) - dt;
        if (d < Tm.min) { mx = -mx; my = -my; }
        else if (d <= Tm.max) quieto = true;
        if (z.tomateCd <= 0 && d <= Tm.max + 1.5 && !this.caido) { z.tomateCd = Tm.recarga; this.lancarTomate(z); }
      }
      // zumbi da tela que vem até a câmera (tela.js, jeito 'perto'): chegou no herói, faz o efeito na tela
      if (T.tela && !Tm && vivo && !alvoAliado && !this.caido) {
        z.telaCd = (z.telaCd ?? 0.3) - dt;
        if (perto && z.telaCd <= 0) { z.telaCd = ZUMBIS_TELA[T.tela].recarga; this.efeitoTela(T.tela, z.dono, z); }
      }
      // com medo (Grito de guerra e cia., habilidades.js): foge do herói e não ataca
      const medo = vivo && z.estados.tem('medo');
      if (medo) { mx = -mx; my = -my; quieto = false; z.atkCd = Math.max(z.atkCd, 0.3); }
      // duelo (poucos zumbis perto): o zumbi prepara o bote e avança, em vez de morder direto (sobrevivencia.js)
      z.atkCd -= dt;
      const noBote = z.duelo && vivo && !alvoAliado && !medo && boteDoZumbi(this, z, T, d, dt, () => this.morderHeroi(z, T));
      const avanco = (perto && !medo) || quieto || noBote ? 0 : vel * dt;
      this.mover(z, mx * avanco + sx * 0.5 * dt * 4, my * avanco + sy * 0.5 * dt * 4, Math.min(0.3, T.raio * 0.7));
      if (avanco > 0) z.animT += avanco;
      z.fx = mx; z.fy = my;
      // ataque (no duelo, o bote acima já cuida)
      if (!noBote && !(z.duelo && !alvoAliado) && morde && z.atkCd <= 0 && vivo) {
        z.atkCd = T.cd;
        if (alvoAliado) this.emit('mordida', { x: z.x, y: z.y, chefe: !!T.chefe });   // aliados não morrem: só seguram o zumbi
        else this.morderHeroi(z, T);
      }
      // gemido de vez em quando (o som decide se toca)
      if (this.rng.next() < dt * 0.08) this.emit('gemido', { x: z.x, y: z.y, tipo: z.tipo });
    }
    if (this.zumbis.length > 40 || this.rng.next() < 0.05) this.zumbis = this.zumbis.filter(z => !z.morto);
  }

  // A mordida (ou o golpe) de um zumbi no herói
  morderHeroi(z, T) {
    const h = this.hero, A = T.ataque || { tipo: 'mordida' };
    // colosso: cada golpe tira 10% da vida máxima do herói e atravessa a armadura (tipo "esmagar");
    // cansado, bate bem mais fraco
    const C = RECOMPENSA.chefe;
    const golpe = z.doacao ? h.vidaMax * C.golpe * (z.doacao.cansado ? C.cansadoDano : 1) : danoDoZumbi(z);
    const coleteAntes = h.colete;
    const entrou = this.ferirHeroi(golpe, z.dono, z.doacao ? 'o colosso' : z.dono ? `${T.nome.toLowerCase()} de ${z.dono.nick}` : 'a horda', z.doacao ? 'esmagar' : A.tipo);
    // zumbi do fã: acertou (ou bateu no colete) → perde o escudo
    if (z.fa?.escudo > 0 && (entrou || h.colete < coleteAntes)) { z.fa.escudo = 0; this.emit('fa_acertou', { x: z.x, y: z.y, nome: z.nome }); }
    if (entrou) for (const s of A.status || []) if (this.rng.next() < s.chance) this.aplicarStatus(h, s.id, { duracao: s.duracao, fonte: z.dono });
    this.emit('mordida', { x: z.x, y: z.y, chefe: !!T.chefe, entrou });
    return entrou;
  }

  // dano já calculado (dano.js). critico e efetividade ('super' | 'fraco') só servem pra mostrar na tela.
  ferirZumbi(z, dano, quem, silencioso = false, critico = false, efetividade = null) {
    if (z.morto) return;
    if (z.fa?.escudo > 0) { if (!silencioso) { z.flash = 0.1; this.emit('acerto', { x: z.x, y: z.y, tipo: z.tipo, critico: false, efetividade: 'escudo' }); } return; }   // zumbi do fã: ainda não acertou o herói
    if (z.doacao?.cansado) dano *= RECOMPENSA.chefe.cansadoDanoRecebido;   // colosso cansado: frágil
    z.vida -= dano;
    z.dormindo = false;
    if (!silencioso) { z.flash = 0.1; this.emit('acerto', { x: z.x, y: z.y, tipo: z.tipo, critico, efetividade }); }
    if (z.vida <= 0) this.matarZumbi(z, quem);
  }

  matarZumbi(z, quem) {
    if (z.morto) return;
    z.morto = true;
    const T = ZUMBIS[z.tipo];
    this.stats.abates++;
    aoMatarZumbi(this, z);   // supremas que reagem a zumbi morrendo (Transfusão)
    // zumbi mais forte dá mais XP; na rua calma do começo (poucos zumbis), cada um vale mais (sobrevivencia.js → xpRampa)
    if (this.fase === 'jogo' && !this.hero.moto) this.ganharXp(T.xp * (1 + (this.nivelAmeaca - 1) * 0.1) * (1 + (1 - this.rampaAtual()) * this.S.xpRampa) * (z.cena ? this.S.cena.vidaZumbi : 1));
    this.emit('morte_zumbi', { x: z.x, y: z.y, tipo: z.tipo, chefe: !!T.chefe, nome: z.nome, dono: z.dono?.nick || null, roupa: z.roupa });
    // grana pro Barganha (mascate.js): às vezes cai de zumbi; chefe sempre deixa um bolo
    if (this.S.mascate && this.fase === 'jogo' && !z.sumiu) {
      const M = MASCATE, D = T.chefe ? M.dropChefe : M.dropZumbi;
      if (T.chefe || this.rng.chance(D.chance)) this.soltarItemEm('grana', { valor: this.rng.int(D.min, D.max) }, null, z.x, z.y);
      if (T.chefe && !this.hero.moto && this.rng.chance(M.tonicoChefe)) this.soltarItemEm('tonico', { id: sortearTonico(this.rng) }, null, z.x + 0.4, z.y + 0.4);   // e às vezes um tônico
    }
    // ajudante na frente no cabo de guerra: sorte, às vezes o cadáver tem um suprimento
    const sorte = this.fase === 'jogo' && !T.chefe ? sorteCabo(this.cabo) : 0;
    if (sorte > 0 && this.rng.chance(sorte)) {
      const it = this.soltarItemEm(this.rng.weighted(CABO.suprimentos), {}, null, z.x, z.y);
      if (it) it.ima = 6;   // vem até o herói de mais longe
      this.emit('sorte_cadaver', { x: z.x, y: z.y, kind: it?.kind });
    }
    if (z.tipo === 'explosivo') this.explodir(z.x, z.y, z.estouroRaio ?? EXPLOSAO.raio, z.estouro ?? EXPLOSAO.base, EXPLOSAO.danoZumbi, z.dono, z.instavel ? 'o inchado instável' : 'explosão', z.instavel);
    if (T.chefe) {
      this.explodir(z.x, z.y, 1.4, 0, 60, null, '');
      if (z.tipo === 'exheroi') {
        const arma = z.extra?.arma;
        if (arma && arma !== 'pistola' && ARMAS[arma]) this.soltarItemEm('arma', { arma }, null, z.x, z.y);
        else this.soltarItemEm('bau_medio', {}, null, z.x, z.y);
      } else if (z.doacao) {
        // colosso da doação: deixa uma runa (e o próximo colosso já pode vir)
        this.soltarItemEm('runa', {}, z.doacao.quem, z.x, z.y);
        this.colossoPendente = null;
        this.emit('colosso_vencido', { nome: z.nome, x: z.x, y: z.y });
      } else this.soltarItemEm(z.tipo === 'rei' ? 'bau_lendario' : 'kit', { valor: 40 }, null, z.x, z.y);
    }
  }

  // cadeia = true: explosivos dentro do estouro estouram logo em seguida (inchados instáveis do nível 20)
  explodir(x, y, raio, danoHeroi, danoZumbi, quem, causa, cadeia = false) {
    this.emit('explosao', { x, y, raio });
    this.alarmeDeCarro(x, y, raio);
    // explosão grande deixa o chão pegando fogo por alguns segundos
    if (raio >= 1.5 && this.zonas.length < 12) { const m = raio * 0.55; this.zonas.push({ tipo: 'fogo', x0: x - m, y0: y - m, x1: x + m, y1: y + m, t: 4, semente: this.rng.int(1, 1e6) }); }
    const h = this.hero;
    const dh = dist(x, y, h.x, h.y);
    // várias explosões juntas (cadeia de inchados, horda de explosivos): só a primeira de cada EXPLOSAO.janela s
    // machuca o herói; as outras no intervalo só empurram os zumbis
    if (danoHeroi > 0 && dh < raio && !(this.t - (h.explosaoT ?? -1e9) < EXPLOSAO.janela)) {
      h.explosaoT = this.t;
      // arremessado pra longe do estouro (no centro exato, pra trás de onde ele olha)
      const ax = dh > 0.05 ? (h.x - x) / dh : -(h.fx || 0) || 1, ay = dh > 0.05 ? (h.y - y) / dh : -(h.fy || 0);
      const am = Math.hypot(ax, ay) || 1;
      h.kx = ax / am * EXPLOSAO.arremesso; h.ky = ay / am * EXPLOSAO.arremesso;
      this.emit('arremessado', { x: h.x, y: h.y });
      const entrou = this.ferirHeroi(danoExplosao(danoHeroi, dh, raio), quem, causa, 'explosao');
      // o estouro do inchado instável derruba o herói (atordoa), a não ser que ele aguente explosão (Anti-explosão)
      if (entrou && cadeia && h.attr.get('resExplosao') < EXPLOSAO.resSemAtordoar) this.aplicarStatus(h, 'atordoado', { duracao: EXPLOSAO.atordoa });
    }
    for (const z of this.zumbis) {
      if (z.morto) continue;
      const d = dist(x, y, z.x, z.y);
      if (d < raio + ZUMBIS[z.tipo].raio) {
        if (cadeia && z.tipo === 'explosivo' && z.nascendo <= 0) { z.pavio = Math.min(z.pavio >= 0 ? z.pavio : 9, EXPLOSAO.cadeia); continue; }
        this.ferirZumbi(z, danoNoZumbi(z, danoZumbi, 'explosao'), null, true);
        if (!z.morto && d > 0.01 && !ZUMBIS[z.tipo].chefe) { z.kx += (z.x - x) / d * 4; z.ky += (z.y - y) / d * 4; }
      }
    }
  }

  // Explosão perto de um carro parado: o alarme dispara (pisca e toca uns segundos) e os vidros estouram.
  // Um por vez (com intervalo), pra não virar uma sinfonia de alarmes.
  alarmeDeCarro(x, y, raio) {
    if (this.room || this.t < (this.carroAlarmeCd || 0)) return;
    const R = raio + 1.5;
    for (const o of this.city.objectsIn(x - R, y - R, x + R, y + R)) {
      if (o.kind !== 'prop' || o.p.tipo !== 'carro' || o.p.alarme) continue;
      const cx = o.p.x + (o.p.w || 1) / 2, cy = o.p.y + (o.p.h || 1) / 2;
      if (dist(cx, cy, x, y) > R) continue;
      const seg = 9;
      o.p.alarme = true;
      (this.carrosAlarme ||= []).push({ p: o.p, ate: this.t + seg });
      this.carroAlarmeCd = this.t + 14;
      this.emit('alarme_carro', { x: cx, y: cy, seg });
      return;
    }
  }
  // desliga os alarmes que já tocaram o bastante
  atualizarAlarmesCarro() {
    if (!this.carrosAlarme?.length) return;
    for (const c of this.carrosAlarme) if (this.t > c.ate) c.p.alarme = false;
    this.carrosAlarme = this.carrosAlarme.filter(c => this.t <= c.ate);
  }

  /* =================== Aliados (cachorro, sobrevivente) =================== */
  // q = quantos quarteirões o aliado acompanha o herói
  addAliado(tipo, q, quem) {
    const h = this.hero;
    const ja = this.aliados.find(a => a.tipo === tipo && a.quem?.id === quem?.id);
    if (ja) { ja.q = Math.min(ja.q + q, 12); return; }
    if (this.aliados.length >= 3) this.aliados.shift();
    const p = this.pontoPerto(h, 1.5) || { x: h.x, y: h.y };
    this.aliados.push({ id: proxId++, tipo, q, x: p.x, y: p.y, quem, nome: quem ? nomeSeguro(quem.nick, 12) : '', cd: 0, fx: 1, fy: 0, animT: 0, andando: false, alvo: null });
    this.emit('aliado', { tipo, nome: quem?.nick || '' });
  }

  atualizarAliados(dt) {
    const h = this.hero;
    for (const a of this.aliados) {
      a.cd -= dt;
      const cachorro = a.tipo === 'cachorro';
      // alvo: zumbi mais perto do herói, dentro do alcance
      let alvo = null, bd = cachorro ? 4.5 * 4.5 : 6 * 6;
      for (const z of this.zumbis) {
        if (z.morto || z.nascendo > 0 || z.dormindo) continue;
        const d = dist2(a.x, a.y, z.x, z.y);
        if (d < bd && dist2(h.x, h.y, z.x, z.y) < 49) { bd = d; alvo = z; }
      }
      a.alvo = alvo;
      let tx, ty, vel;
      if (cachorro && alvo) { tx = alvo.x; ty = alvo.y; vel = 2.6; }
      else {
        const lado = cachorro ? -1 : 1;
        tx = h.x - h.fx * 1.1 + -h.fy * 0.8 * lado; ty = h.y - h.fy * 1.1 + h.fx * 0.8 * lado;
        vel = 2.0;
      }
      const dx = tx - a.x, dy = ty - a.y, d = Math.hypot(dx, dy);
      const antes = { x: a.x, y: a.y };
      if (d > (cachorro && alvo ? 0.55 : 0.4)) this.mover(a, dx / d * Math.min(d, vel * dt), dy / d * Math.min(d, vel * dt), 0.18);
      if (d > 9) { a.x = h.x; a.y = h.y; }
      const andou = Math.hypot(a.x - antes.x, a.y - antes.y);
      a.andando = andou > 0.002; a.animT += andou;
      if (a.andando) { a.fx = (a.x - antes.x) / andou; a.fy = (a.y - antes.y) / andou; }
      if (alvo && a.cd <= 0) {
        if (cachorro && Math.sqrt(bd) < 0.75 + ZUMBIS[alvo.tipo].raio) {
          a.cd = ALIADOS.cachorro.cd;
          this.ferirZumbi(alvo, danoNoZumbi(alvo, danoAliado('cachorro', this.ameaca()), 'corte'), null);
          if (!alvo.morto && this.rng.next() < 0.2) this.aplicarStatus(alvo, 'sangramento');
          this.emit('latido', { x: a.x, y: a.y });
        } else if (!cachorro && this.linhaLivre(a.x, a.y, alvo.x, alvo.y)) {
          a.cd = ALIADOS.sobrevivente.cd * (a.encontro ? ENCONTROS.infeccao.lentidao : 1); a.fx = alvo.x - a.x; a.fy = alvo.y - a.y;
          const m = Math.hypot(a.fx, a.fy) || 1; a.fx /= m; a.fy /= m;
          this.ferirZumbi(alvo, danoNoZumbi(alvo, danoAliado('sobrevivente', this.ameaca()), 'perfuracao'), null);
          this.emit('tiro', { x: a.x, y: a.y, tx: alvo.x, ty: alvo.y, arma: 'pistola', acertou: true });
        }
      }
    }
    const antes = this.aliados.length;
    this.aliados = this.aliados.filter(a => a.q > 0);
    if (this.aliados.length < antes) this.emit('aliado_foi');
  }

  /* =================== Itens =================== */
  pontoAFrente(dAlvo) {
    const h = this.hero;
    if (this.room) {
      const p = this.room.pontoLivre(this.rng, null);
      const d = dist(h.x, h.y, p.x, p.y);
      return d < 4 ? p : this.pontoPerto(h, 2) || { x: h.x, y: h.y };
    }
    const r = this.rota, [dx, dy] = DIRS[r.dir];
    const alvo = this.city.nodePos(r.alvo.i, r.alvo.j);
    const falta = (alvo.x - h.x) * dx + (alvo.y - h.y) * dy;
    const a = Math.min(dAlvo, Math.max(0, falta) + 1.5);
    return dx ? { x: h.x + dx * a, y: alvo.y } : { x: alvo.x, y: h.y + dy * a };
  }

  soltarItem(kind, data, quem, idx = 0) {
    const p = this.pontoAFrente(2.4 + idx * 0.9);
    const q = this.pontoPerto(p, 0.6) || p;
    this.soltarItemEm(kind, data, quem, q.x, q.y, 7);
  }

  soltarItemEm(kind, data, quem, x, y, z = 0) {
    if (this.itens.length > 25) this.itens.shift();
    const it = { id: proxId++, kind, x, y, z, vz: 0, data: data || {}, quem, vida: 45 };
    this.itens.push(it);
    if (z > 0) this.emit('item_caindo', { kind, x, y });
    return it;
  }

  atualizarItens(dt) {
    const h = this.hero;
    for (const it of this.itens) {
      if (it.z > 0) {
        if (it.paraquedas) it.z -= RECOMPENSA.dropQueda * dt;   // drop: desce devagar, pra todo mundo ver
        else { it.vz += 14 * dt; it.z -= it.vz * dt; }
        if (it.z <= 0) { it.z = 0; it.vz = 0; this.emit('item_pousou', { x: it.x, y: it.y, kind: it.kind }); }
        continue;
      }
      it.vida -= dt;
      if (this.fase !== 'jogo' || this.caido) continue;
      // de moto não pega nada (nem bônus): o item fica no chão; só a grana dos atropelos conta (prologo.js)
      if (h.moto && it.kind !== 'grana') continue;
      const d2 = dist2(h.x, h.y, it.x, it.y);
      // ímã: item perto vem sozinho até o herói (não fica preso atrás de zumbi ou carro)
      const ima = (it.ima || 2.2) * h.attr.get('ima');   // passivas (Gorjeta) puxam de mais longe
      if (d2 < ima * ima && d2 > 0.01) {
        const d = Math.sqrt(d2), v = Math.min(d, (2 + Math.max(0, 2.2 - d) * 3) * dt);
        it.x += (h.x - it.x) / d * v; it.y += (h.y - it.y) / d * v;
      }
      if (d2 < 0.7 * 0.7) { this.comPresente(it.quem, () => this.pegar(it)); it.pego = true; }
    }
    this.itens = this.itens.filter(it => !it.pego && it.vida > 0);
  }

  pegar(it) {
    const h = this.hero;
    const quem = it.quem;
    switch (it.kind) {
      case 'kit': this.curarOuGuardar(it.data.valor || 35, quem, 'kit'); break;
      case 'cura_pequena': this.curarOuGuardar(18, quem, 'cura'); break;
      case 'municao': this.darMunicao(1, quem, true); break;
      case 'colete': this.darColete(4, quem, true); break;
      case 'suprimento': if (h.vida / h.vidaMax < 0.7) this.curar(30, quem, true); else this.darMunicao(1, quem, true); break;
      case 'bau_medio': this.abrirBau('medio', quem); break;
      case 'bau_lendario': this.abrirBau('lendario', quem); break;
      case 'arma': {
        const mesma = h.arma === it.data.arma;
        if (!mesma) this.trocarArma(it.data.arma, quem);
        if (it.data.municao) h.municao = (mesma && h.municao != null ? h.municao : 0) + it.data.municao;   // pistola achada: munição contada (a do policial é infinita)
        this.emit('bau', { raridade: 'medio', arma: it.data.arma, x: it.x, y: it.y });
        if (it.data.municao) this.emit('aviso', { texto: `${ARMAS[it.data.arma].emoji} ${ARMAS[it.data.arma].nome}${mesma ? ': munição' : ''} (+${it.data.municao} balas)`, tipo: 'bom' });
        break;
      }
      case 'tonico': guardarTonico(this, it.data.id, quem); break;   // vai pra bolsa (itens.js)
      case 'grana': h.grana = (h.grana || 0) + (it.data.valor || 5); this.emit('grana', { valor: it.data.valor || 5, x: it.x, y: it.y }); break;
      // achados com propósito (room.js → LOJAS)
      case 'comida': this.curarOuGuardar(15, quem, 'cura'); this.emit('aviso', { texto: '🥫 Comida: +15% de vida', tipo: 'bom' }); break;
      case 'energetico': this.aplicarStatus(h, 'energizado', { quarteiroes: 2, acumula: true, maxQuarteiroes: 4 }); this.emit('aviso', { texto: '🥤 Energético: mais rápido por 2 quarteirões', tipo: 'bom' }); break;
      case 'vitamina': this.aplicarStatus(h, 'vitaminado', { quarteiroes: 3, acumula: true, maxQuarteiroes: 6 }); this.emit('aviso', { texto: '🍊 Vitaminas: +15% de resistência por 3 quarteirões', tipo: 'bom' }); break;
      case 'remedio':
        h.estados.remover('infectado'); sincronizarAtributos(h.estados, h.attr);
        this.aplicarStatus(h, 'medicado', { quarteiroes: 2, acumula: true, maxQuarteiroes: 4 });
        this.emit('aviso', { texto: '💊 Remédio: regenera vida por 2 quarteirões', tipo: 'bom' });
        break;
      case 'drop': {
        const id = it.data.buff, S = STATUS[id];
        this.aplicarStatus(h, id, { quarteiroes: RECOMPENSA.dropQuarteiroes, pilhas: 1, fonte: quem });
        this.emit('drop', { id, nome: S.nome, emoji: S.emoji, texto: S.texto, pilhas: h.estados.pilhas(id), quem: quem?.nick || null, x: it.x, y: it.y });
        break;
      }
      case 'runa': this.ganharRuna(quem); break;
      case 'historia': {
        const f = HISTORIA.fragmentos.find(x => x.id === it.data.id);
        if (!f) break;
        this.historia.marcar(f.id);
        this.emit('historia', { fragmento: f, numero: this.historia.numero(f.id), total: this.historia.total, capitulo: this.historia.nomeCapitulo(f.capitulo) });
        break;
      }
    }
    this.emit('pegou', { kind: it.kind, x: it.x, y: it.y });
  }

  // Arma achada na delegacia: sem arma de fogo, uma pistola; com pistola, uma escopeta (munição contada)
  armaDaDelegacia() {
    const h = this.hero;
    if (!h.arma) return { arma: 'pistola', municao: 36 };
    if (h.arma === 'pistola') return { arma: 'escopeta', municao: 24 };
    return { arma: h.arma, municao: 24 };
  }

  abrirBau(raridade, quem) {
    const h = this.hero;
    if (raridade === 'lendario') {
      const arma = this.rng.pick(['metralhadora', 'lanca']);
      this.trocarArma(arma, quem);
      this.emit('bau', { raridade, arma, x: h.x, y: h.y, quem: quem?.nick || null });
    } else {
      // Arma média: escopeta (tiro) ou taco com pregos (corpo a corpo). Se já tem uma, dá a outra.
      // Quem luta de perto ganha "arma afiada" (fúria + foco) ou, às vezes, uma escopeta
      if (CLASSES[h.classe].estilo === 'perto' && (h.arma || this.rng.chance(0.65))) {
        this.aplicarStatus(h, 'furia', { quarteiroes: 2, acumula: true, maxQuarteiroes: 8 }); this.aplicarStatus(h, 'foco', { quarteiroes: 2, acumula: true, maxQuarteiroes: 8 });
        this.emit('bau', { raridade, arma: 'afiada', x: h.x, y: h.y, quem: quem?.nick || null });
        this.emit('arma', { id: 'afiada', nome: 'Arma afiada', emoji: '✨', quem: quem?.nick || null });
        return;
      }
      const querTaco = h.arma === 'escopeta' ? true : h.corpo !== 'empurrao' ? false : this.rng.chance(0.4);
      if (querTaco) { h.corpo = 'taco'; h.golpes = CORPO.taco.golpes; this.emit('arma', { id: 'taco', nome: CORPO.taco.nome, emoji: CORPO.taco.emoji, quem: quem?.nick || null }); }
      else if (h.arma && ARMAS[h.arma].lendaria) this.aplicarStatus(h, 'acelerado', { quarteiroes: 1, acumula: true, maxQuarteiroes: 8 });
      else this.trocarArma('escopeta', quem);
      this.emit('bau', { raridade, arma: querTaco ? 'taco' : 'escopeta', x: h.x, y: h.y, quem: quem?.nick || null });
    }
  }

  // forcar: cura mesmo pisando em cacos de vidro (só a mochila salvando o herói que ia cair)
  curar(pct, quem, item = false, forcar = false) {
    const h = this.hero;
    if (this.fase !== 'jogo') return;
    if (h.noVidro && !forcar) {
      // no vidro não cura: fica guardada e sai quando ele pisar fora (ninguém doa à toa)
      h.curaGuardada = Math.min(100, (h.curaGuardada || 0) + pct);
      h.curaGuardadaQuem = quem || h.curaGuardadaQuem || null;
      this.emit('cura_bloqueada', { x: h.x, y: h.y, guardada: Math.round(h.curaGuardada) });
      return;
    }
    const antes = h.vida;
    h.vida = Math.min(h.vidaMax, h.vida + valorCura(h, pct));
    const salvou = antes / h.vidaMax < 0.2;
    this.emit('cura', { valor: pct, x: h.x, y: h.y, salvou, item });
    if (salvou) this.emit('aviso', { texto: `😮‍💨 SALVO NO ÚLTIMO SEGUNDO${quem ? ' por ' + nomeSeguro(quem.nick) : ''}!`, tipo: 'bom' });
  }

  // q = por quantos quarteirões dura o tiro rápido
  darMunicao(q, quem, item = false) {
    const h = this.hero;
    this.aplicarStatus(h, 'acelerado', { quarteiroes: q, acumula: true, maxQuarteiroes: 8 });
    const a = h.arma ? ARMAS[h.arma] : null;
    // arma com munição contada (escopeta, ou a pistola achada na delegacia): mais balas
    if (a && h.municao != null) h.municao = Math.min((a.municao || 36) * 2, h.municao + Math.ceil((a.municao || 24) * 0.5));
    this.emit('municao', { quarteiroes: q, item });
    // Sem arma de fogo, munição não serve pra nada: vira fúria (mais dano e velocidade) pelos mesmos quarteirões
    if (!a && !item) {
      this.aplicarStatus(h, 'furia', { quarteiroes: q, acumula: true, maxQuarteiroes: 8 });
      this.adaptado(`sem arma de fogo → 😤 fúria por ${quarteiroesTxt(q)}`);
    }
  }

  darColete(golpes) {
    const h = this.hero;
    // Colete cheio: o que não cabe vira blindado (menos dano por uns segundos)
    const sobra = Math.max(0, h.colete + golpes - 12);
    h.colete = Math.min(12, h.colete + golpes);
    this.emit('colete_ganhou', { golpes: h.colete });
    if (sobra > 0) {
      const q = sobra >= 3 ? 2 : 1;
      this.aplicarStatus(h, 'blindado', { quarteiroes: q, acumula: true, maxQuarteiroes: 4 });
      this.adaptado(`colete cheio → 🛡️ blindado por ${quarteiroesTxt(q)}`);
    }
  }

  /* ----- Presentes inteligentes: o presente sempre serve pra alguma coisa, chegue quando chegar ----- */
  // Mensagem em cima do herói dizendo no que o presente virou
  adaptado(texto) { const h = this.hero; this.emit('adaptado', { texto, x: h.x, y: h.y }); }

  // Cura de presente: com a vida alta vai pra mochila (usa quando precisar);
  // mochila cheia ou vida mais baixa: cura, e o que passar da vida cheia vira blindado.
  // naMochila = false: não tenta a mochila (o kit que já não coube nela)
  curarPresente(pct, quem, naMochila = true) {
    const h = this.hero;
    if (this.fase !== 'jogo') return;
    if (naMochila && this.curaSobrando(pct) && this.guardarNaMochila(pct, quem, 'cura')) return;
    const falta = h.vidaMax - h.vida, sobra = valorCura(h, pct) - falta;
    if (falta > 0.5) this.curar(pct, quem);
    if (sobra > h.vidaMax * 0.05) {
      const q = sobra > h.vidaMax * 0.25 ? 2 : 1;
      this.aplicarStatus(h, 'blindado', { quarteiroes: q, acumula: true, maxQuarteiroes: 4 });
      this.adaptado(`vida cheia → 🛡️ blindado por ${quarteiroesTxt(q)}`);
    }
  }

  // Kit de presente: precisando, cura na hora (no herói, sem esperar cair do céu);
  // com a vida alta, vai pra mochila e ele usa sozinho quando a vida cair (ou quando a vida zerar)
  kitPresente(valor, qtd, quem) {
    for (let i = 0; i < qtd; i++) {
      const h = this.hero;
      if (h.vida / h.vidaMax < 0.6) this.curar(valor, quem, true);
      else if (!this.guardarNaMochila(valor, quem)) this.curarPresente(valor, quem, false);
    }
  }

  /* =================== Recompensas de presente (recompensas.js) =================== */
  // moedas = valor de UMA unidade do presente; qtd = quantas vieram juntas
  // lado: 'ajuda' (1 moeda = drop de paraquedas) ou 'atrapalha' (1 moeda = conversível dos zumbis)
  recompensaDePresente(moedas, qtd, quem, lado = 'ajuda') {
    if (moedas <= this.cfg.dropAteMoedas && lado === 'atrapalha') {
      const n = Math.min(CONVERSIVEL.porPresente, Math.max(1, qtd));
      // conversível ou zumbi paraquedista (sorteio por unidade)
      for (let k = 0; k < n; k++) this.agendar(0.8 + k * CONVERSIVEL.entre, () => this.rng.chance(PARAQUEDISTA.chance) ? this.paraquedista(quem) : this.conversivel(quem));
    } else if (moedas <= this.cfg.dropAteMoedas) {
      const n = Math.min(RECOMPENSA.dropsPorPresente, Math.max(1, qtd));
      for (let k = 0; k < n; k++) this.agendar(0.3 + k * 0.45, () => this.soltarDrop(quem));
    }
    if (moedas >= this.cfg.doacaoAPartirDe) this.doacao(quem);
  }

  // Caixa de paraquedas com um bônus sorteado (o bônus só aparece quando o herói pega)
  soltarDrop(quem) {
    if (this.fase !== 'jogo') return;
    const h = this.hero;
    const buff = this.rng.weighted(DROPS.map(d => [d.id, d.peso]));
    let p;
    if (this.room) p = this.room.pontoLivre(this.rng, h, 3);
    else { const a = this.pontoAFrente(2 + this.rng.range(0, 2.5)); p = this.pontoPerto(a, 1.2) || a; }
    const it = this.soltarItemEm('drop', { buff }, quem, p.x, p.y, RECOMPENSA.dropAltura);
    it.paraquedas = true;
  }

  // Doação: inspiração, um drop e o colosso no próximo quarteirão (um por vez)
  doacao(quem) {
    const h = this.hero;
    this.aplicarStatus(h, 'inspirado', { duracao: this.cfg.inspiracaoSeg });
    h.inspPulso = 0;
    this.emit('inspiracao', { nick: quem?.nick || null, segundos: this.cfg.inspiracaoSeg });
    this.soltarDrop(quem);
    // colosso: um por vez e, com presentes de 5 moedas, no máximo um a cada colossoRecarga s (a inspiração vem sempre)
    if (!this.colossoPendente && this.t - (this.colossoT ?? -1e9) >= RECOMPENSA.colossoRecarga) {
      this.colossoT = this.t;
      this.colossoPendente = { quem, estado: 'esperando' };
      this.emit('colosso_vem', { nick: quem?.nick || null });
    }
  }

  surgirColosso() {
    const c = this.colossoPendente;
    if (!c || c.estado !== 'chamado' || this.fase !== 'jogo') return;
    if (this.room || this.arena || this.caido || this.rota.beco) { this.agendar(3, () => this.surgirColosso()); return; }   // espera voltar pra rua
    const C = RECOMPENSA.chefe;
    const a = this.pontoAFrente(7), p = this.pontoPerto(a, 1.5) || a;
    const nome = c.quem?.nick ? `Colosso de ${nomeSeguro(c.quem.nick, 12)}` : 'Colosso';
    const z = this.criarZumbi('colosso', p.x, p.y, null, { nome, nascendo: 1.6 });
    z.vida = z.vidaMax = this.cfg.colossoVida * (1 + C.vidaPorNivel * (this.hero.nivel - 1));
    z.doacao = { t: 0, cansado: false, quem: c.quem };
    c.estado = 'vivo';
    this.emit('chefe', { tipo: 'colosso', nome, x: p.x, y: p.y });
    this.emit('colosso', { nome, vida: Math.round(z.vida) });
  }

  // O colosso cansa: fica lento (😵 em cima dele), frágil e bate fraco. O herói não muda.
  cansarColosso(so = null) {
    for (const z of so ? [so] : this.zumbis) {
      if (z.morto || !z.doacao || z.doacao.cansado || z.nascendo > 0) continue;
      z.doacao.cansado = true;
      z.estados.aplicar('cansado');
      this.emit('colosso_cansou', { x: z.x, y: z.y, nome: z.nome });
    }
  }

  // Runa do colosso: dano ou resistência, grudada numa habilidade que o herói já tem
  ganharRuna(quem) {
    const h = this.hero;
    const tipo = this.rng.chance(0.5) ? 'dano' : 'resistencia';
    const ids = Object.keys(h.habs || {});
    const livres = ids.filter(id => !h.runas?.[id]?.[tipo]);
    const alvo = ids.length ? this.rng.pick(livres.length ? livres : ids) : 'principal';
    h.runas = h.runas || {};
    const r = h.runas[alvo] = h.runas[alvo] || {};
    r[tipo] = (r[tipo] || 0) + 1;
    this.aplicarRunas();
    const hab = alvo === 'principal' ? { nome: 'ataque principal', emoji: '⚔️' } : ATIVAS[alvo];
    this.emit('runa', { tipo, hab: alvo, nomeHab: hab.nome, emojiHab: hab.emoji, quem: quem?.nick || null, x: h.x, y: h.y });
  }

  // O que as runas dão agora (chamado ao ganhar runa e quando uma habilidade ou o treino sobe de nível).
  // A runa de dano numa habilidade fica em habilidades.js (atualizarHabilidades).
  aplicarRunas() {
    const h = this.hero, R = RECOMPENSA;
    for (const [id, r] of Object.entries(h.runas || {})) {
      const nivel = id === 'principal' ? 1 + (h.treino || 0) : (h.habs?.[id] || 1);
      if (r.resistencia) h.attr.addMod({ id: 'runa:def:' + id, attr: 'defesa', soma: defesaRuna(r, nivel), fonte: 'runa' });
      if (id === 'principal' && r.dano) h.attr.addMod({ id: 'runa:dano:principal', attr: 'dano', mult: 1 + R.runa.principal * nivel * r.dano, fonte: 'runa' });
    }
  }

  /* =================== Conversível dos zumbis (presente de atrapalhar de 1 moeda; recompensas.js) =================== */
  conversivel(quem, esperou = 0) {
    if (this.fase !== 'jogo') return;
    const C = CONVERSIVEL;
    if (this.room || this.arena) { if (esperou < C.espera) this.agendar(2, () => this.conversivel(quem, esperou + 2)); return; }   // espera voltar pra rua
    const h = this.hero, [ax, ay] = DIRS[this.rota.dir];
    const s = this.rng.chance(0.5) ? 1 : -1;   // 1: vem por trás, no mesmo sentido do herói; -1: vem de frente
    const dx = ax * s, dy = ay * s;
    const car = {
      id: proxId++, x: h.x - dx * C.distancia, y: h.y - dy * C.distancia, dx, dy,
      resta: C.distancia * 2, atingidos: new Set(), quem, desvia: this.rng.chance(C.chanceDesviar), zumbis: 0, heroi: false,
      passageiros: 3 + this.rng.int(0, 1)
    };
    this.carros.push(car);
    this.emit('conversivel', { nick: quem?.nick || null, x: car.x, y: car.y, distancia: C.distancia, vel: C.vel });
  }

  /* =================== Zumbi paraquedista (presente de atrapalhar de 1 moeda; recompensas.js) =================== */
  paraquedista(quem, esperou = 0) {
    if (this.fase !== 'jogo') return;
    if (this.room || this.arena) { if (esperou < CONVERSIVEL.espera) this.agendar(2, () => this.paraquedista(quem, esperou + 2)); return; }
    const h = this.hero, a = this.rng.next() * Math.PI * 2;
    this.paraquedistas.push({ id: proxId++, x: h.x + Math.cos(a) * 3, y: h.y + Math.sin(a) * 3, z: PARAQUEDISTA.altura, quem, roupa: this.rng.int(0, 5) });
    this.emit('paraquedista', { nick: quem?.nick || null, x: h.x, y: h.y });
  }

  atualizarParaquedistas(dt) {
    if (!this.paraquedistas.length) return;
    const P = PARAQUEDISTA, h = this.hero;
    for (const p of this.paraquedistas) {
      p.z -= P.queda * dt;
      // desce seguindo o herói (não tem como fugir)
      const k = Math.min(1, dt * 1.6);
      p.x += (h.x - p.x) * k; p.y += (h.y - p.y) * k;
      if (p.z > 0) continue;
      p.pousou = true;
      if (this.fase !== 'jogo') continue;
      if (this.caido || h.invT > 0 || h.invQ > 0) {
        // quicou: cai do lado e vira zumbi normal
        const q = this.pontoPerto(h, 1.5) || { x: h.x, y: h.y };
        this.criarZumbi('comum', q.x, q.y, p.quem, { nascendo: 0.2 });
        this.emit('paraquedista_quicou', { x: h.x, y: h.y });
        continue;
      }
      const antes = h.estados.tem('agarrado') ? h.agarradosQuem || [] : [];
      this.aplicarStatus(h, 'agarrado', { quarteiroes: P.quarteiroes, pilhas: 1, fonte: p.quem, presente: p.quem?.nick ? p.quem : null });
      h.agarradosQuem = [...antes, p.quem].slice(-P.maxPilhas);
      this.emit('agarrou', { nick: p.quem?.nick || null, pilhas: h.estados.pilhas('agarrado'), x: h.x, y: h.y });
    }
    this.paraquedistas = this.paraquedistas.filter(p => !p.pousou);
  }

  // Passou o tempo: os zumbis soltam a perna e viram zumbis normais no chão
  soltarPerna() {
    const h = this.hero, quem = h.agarradosQuem || [];
    for (const q of quem.length ? quem : [null]) {
      const p = this.pontoPerto(h, 1.2) || { x: h.x, y: h.y };
      this.criarZumbi('comum', p.x, p.y, q, { nascendo: 0.1 });
    }
    h.agarradosQuem = [];
    this.emit('soltou_perna', { x: h.x, y: h.y, qtd: Math.max(1, quem.length) });
  }

  /* =================== Portal dos 500 (core/portal.js) =================== */
  // Abre sozinho quando o herói chega em PORTAL.abates zumbis (uma vez por herói), num momento calmo:
  // fora de loja, arena, praia, beco, sem escolha de habilidade nem votação de rua aberta.
  checarPortal() {
    const h = this.hero;
    if (h.portalFeito || this.stats.abates < PORTAL.abates) return;
    if (this.room || this.arena || this.caido || this.rota?.beco || this.escolha || this.voto?.aberta || this.limpando) return;
    this.abrirPortal();
  }

  // forcar: o botão de teste abre na hora, sem os 500 zumbis
  abrirPortal(forcar = false) {
    if (this.fase !== 'jogo' || this.portal || this.caido) return false;
    if (!forcar) this.hero.portalFeito = true;
    const rodadas = sortearRodadas(this.rng);
    this.portal = { fase: 'entrando', t: 0, rodada: 0, rodadas, poder: PORTAL.poder, guardiao: forcaGuardiao(rodadas), escolhas: [], voto: null, forcado: forcar };
    this.emit('portal_abriu', { guardiao: this.portal.guardiao });
    return true;
  }

  votacaoPortal(ops, premio = false) {
    const ids = ['esquerda', 'frente', 'direita'];
    const v = new Votacao(ops.map((o, i) => ({ id: ids[i], n: i + 1, nome: o.nome, seta: o.seta })), this.cfg.votoDur, this.cfg.atraso);
    v.portal = true; v.premio = premio;
    return v;
  }

  atualizarPortal(dt) {
    const P = this.portal, C = PORTAL, ids = ['esquerda', 'frente', 'direita'];
    P.t += dt;
    if (P.mostrado !== undefined) P.mostrado += (P.poder - P.mostrado) * Math.min(1, dt * 4);   // o número do poder corre até o valor novo
    else P.mostrado = P.poder;
    switch (P.fase) {
      case 'entrando':
        if (P.t >= C.entrar) this.portalRodada();
        break;
      case 'votando': {
        P.voto.update(dt);
        if (P.voto.t > 0) break;
        const ops = P.rodadas[P.rodada];
        const res = P.voto.fechar(() => ids[escolhaPortalIA(P.poder, ops, this.rng)], this.rng);
        const k = ids.indexOf(res.id), efeito = revelar(ops[k], this.rng);
        const antes = P.poder;
        P.poder = aplicarEfeito(P.poder, efeito);
        P.escolhas.push(k);
        P.passou = { k, antes, depois: P.poder, rotulo: ops[k].misterio ? `? = ${efeito.tipo === 'mult' ? (efeito.v >= 1 ? '×' + efeito.v : '÷' + Math.round(1 / efeito.v)) : (efeito.v > 0 ? '+' + efeito.v : '−' + -efeito.v)}` : ops[k].rotulo, bom: P.poder >= antes, votos: res.votos, auto: res.auto };
        P.fase = 'atravessando'; P.t = 0;
        this.emit('portal_passou', { ...P.passou });
        break;
      }
      case 'atravessando':
        if (P.t < C.atravessar) break;
        P.rodada++;
        if (P.rodada < P.rodadas.length) this.portalRodada();
        else { P.fase = 'duelo'; P.t = 0; P.voto = null; this.emit('portal_duelo', { poder: P.poder, guardiao: P.guardiao }); }
        break;
      case 'duelo':
        if (P.t < C.duelo) break;
        P.venceu = P.poder > P.guardiao;
        P.t = 0;
        if (P.venceu) {
          // prêmio: 3 relíquias sorteadas, o chat escolhe
          const todas = Object.keys(RELIQUIAS);
          for (let i = todas.length - 1; i > 0; i--) { const j = Math.floor(this.rng.next() * (i + 1)); [todas[i], todas[j]] = [todas[j], todas[i]]; }
          P.premio = todas.slice(0, 3);
          P.voto = this.votacaoPortal(P.premio.map(id => ({ nome: RELIQUIAS[id].nome, seta: RELIQUIAS[id].emoji })), true);
          P.fase = 'premio';
        } else P.fase = 'perdeu';
        this.emit(P.venceu ? 'portal_venceu' : 'portal_perdeu', { poder: P.poder, guardiao: P.guardiao });
        break;
      case 'premio': {
        P.voto.update(dt);
        if (P.voto.t > 0) break;
        const res = P.voto.fechar(() => ids[Math.floor(this.rng.next() * 3)], this.rng);
        P.reliquia = P.premio[ids.indexOf(res.id)];
        if (this.hero.reliquia) { const ant = RELIQUIAS[this.hero.reliquia]; (ant.mods || []).forEach((m, k) => this.hero.attr.removeMod(`rel:${this.hero.reliquia}:${k}`)); }
        darReliquia(this, P.reliquia);
        P.voto = null; P.fase = 'ganhou'; P.t = 0;
        this.emit('portal_reliquia', { id: P.reliquia, nome: RELIQUIAS[P.reliquia].nome, emoji: RELIQUIAS[P.reliquia].emoji, votos: res.votos });
        break;
      }
      case 'ganhou': case 'perdeu':
        if (P.t >= C.fim) { P.fase = 'saindo'; P.t = 0; this.emit('portal_saindo', {}); }
        break;
      case 'saindo':
        if (P.t >= C.sair) {
          this.portal = null;
          this.hero.invT = Math.max(this.hero.invT, 3);   // volta pra rua com uns segundos de folga
          this.emit('portal_fechou', { reliquia: this.hero.reliquia || null });
        }
        break;
    }
  }

  portalRodada() {
    const P = this.portal;
    P.fase = 'votando'; P.t = 0;
    P.voto = this.votacaoPortal(P.rodadas[P.rodada].map(o => ({ nome: o.rotulo, seta: o.lado === 'bom' ? '🔵' : o.lado === 'ruim' ? '🔴' : '🟣' })));
    this.emit('portal_rodada', { rodada: P.rodada + 1, total: P.rodadas.length });
  }

  presenteNoPortal(lado, moedas, quem) {
    const P = this.portal;
    if (P.fase === 'saindo' || P.fase === 'ganhou' || P.fase === 'perdeu') return;
    const antes = P.poder;
    P.poder = poderComPresente(P.poder, lado, moedas);
    this.emit('portal_presente', { lado, antes, depois: P.poder, nick: quem?.nick || '' });
  }

  /* =================== Zumbis da tela (tela.js; a arte fica em view/tela.js) =================== */
  // Faz um zumbi da tela aparecer. Vindo de presente, nasce perto (o efeito acontece em poucos segundos);
  // sozinho na rua, nasce mais longe. A mão gigante não tem zumbi na rua: o efeito vem direto.
  surgirTela(id, quem) {
    const Zt = ZUMBIS_TELA[id];
    if (!Zt || this.fase !== 'jogo' || this.room || this.arena) return false;
    this.emit('tela_vem', { id, nick: quem?.nick || null });
    if (Zt.jeito === 'direto') { this.agendar(1.2, () => this.efeitoTela(id, quem)); return true; }
    const p = quem ? this.pontoNaRua(this.hero, 4.5, 7, 1) || this.pontoNaRua(this.hero, 3, 9, 0) : this.pontoNaRua(this.hero, 8, 11, 1);
    if (!p) return false;
    this.criarZumbi(tipoTela(id), p.x, p.y, quem, { nascendo: 0.6 });
    return true;
  }

  // Presente de atrapalhar: às vezes também manda um zumbi da tela do nível do valor (barato = ovo, caro = mão gigante)
  telaDePresente(quem, moedas) {
    if (!this.cfg.telaAtiva || this.t - (this.telaPresT ?? -1e9) < this.cfg.telaRecarga || !this.rng.chance(this.cfg.telaChance)) return null;
    const id = sortearTela(this.rng, niveisPorMoedas(moedas));
    if (id && this.surgirTela(id, quem)) { this.telaPresT = this.t; return id; }
    return null;
  }

  // O efeito na tela (o que aparece fica em view/tela.js). Alguns também mexem no jogo: a mão gigante bate no herói.
  efeitoTela(id, quem, z = null) {
    const Zt = ZUMBIS_TELA[id], h = this.hero;
    if (!Zt || this.fase !== 'jogo') return;
    const e = { id, nick: quem?.nick || null, avatar: quem?.avatar || '', x: z?.x ?? h.x, y: z?.y ?? h.y, semente: this.rng.int(1, 1e6) };
    // grafite: o nome de quem mandou, ou uma palavra; fã: a plaquinha com o nome de quem mandou
    if (id === 'grafite') e.palavra = quem?.nick && this.rng.chance(0.6) ? '@' + quem.nick : this.rng.pick(Zt.palavras);
    if (id === 'fa') e.palavra = quem?.nick ? quem.nick : 'VOCÊ';
    if (id === 'gigante') {
      this.agendar(1.4, () => {   // a mão bate e arrasta o herói pro lado
        if (this.fase !== 'jogo') return;
        this.ferirHeroi(h.vidaMax * Zt.golpe, quem, 'a mão gigante', 'esmagar');
        const [dx, dy] = DIRS[this.rota.dir];
        h.kx = -dy * 8; h.ky = dx * 8;
      });
    }
    this.emit('tela', e);
  }

  /* =================== Zumbi do tomate (dados.js → tomateiro; ameaca.js → TOMATEIRO) =================== */
  // (também o zumbi da pedra: tipo = 'pedreiro')
  surgirTomateiro(tipo = 'tomateiro') {
    if (this.fase !== 'jogo' || this.room || this.arena || this.zumbis.some(z => !z.morto && z.tipo === tipo)) return;
    const p = this.pontoNaRua(this.hero, 8, 11, 1);
    if (!p) return;
    this.criarZumbi(tipo, p.x, p.y, null, { nascendo: 0.8 });
    this.emit(tipo, { x: p.x, y: p.y });
  }

  lancarTomate(z) {
    const T = ZUMBIS[z.tipo], pedra = !!T.pedra, Tm = T.pedra || T.tomate || T.arremesso;
    if (T.tela) {   // zumbi da tela: joga o que é dele (ovo, tinta, chiclete, torta, lama); acertando, o efeito vai pra tela
      this.tomates.push({ id: proxId++, tipo: 'tela', tela: T.tela, quem: z.dono, x0: z.x, y0: z.y, x: z.x, y: z.y, alt: 0, t: 0, voo: Tm.voo, dano: z.dano, danoMax: 0.03 });
      this.emit('tomate_lancado', { x: z.x, y: z.y, tela: T.tela });
      return;
    }
    this.tomates.push({ id: proxId++, tipo: pedra ? 'pedra' : 'tomate', x0: z.x, y0: z.y, x: z.x, y: z.y, alt: 0, t: 0, voo: Tm.voo, dano: z.dano, danoMax: Tm.danoMax ?? 0.05 });
    this.emit(pedra ? 'pedra_lancada' : 'tomate_lancado', { x: z.x, y: z.y });
  }

  // O tomate voa em arco e vai atrás do herói: sempre acerta. Dano pequeno (passa direto, é tomate na cara)
  // e a tela da live fica suja (view/sujeira.js, evento "tomatada").
  atualizarTomates(dt) {
    if (!this.tomates.length) return;
    const h = this.hero;
    for (const t of this.tomates) {
      t.t += dt;
      const k = Math.min(1, t.t / t.voo);
      t.x = t.x0 + (h.x - t.x0) * k; t.y = t.y0 + (h.y - t.y0) * k;
      t.alt = Math.sin(Math.PI * k) * 2.2 + 0.6 * (1 - k);
      if (k < 1) continue;
      t.fim = true;
      if (this.fase !== 'jogo') continue;
      if (t.tipo === 'tela') {
        this.ferirHeroi(Math.min(t.dano, h.vidaMax * t.danoMax), t.quem, 'o ' + ZUMBIS_TELA[t.tela].nome.toLowerCase(), 'impacto');
        this.efeitoTela(t.tela, t.quem);
        continue;
      }
      if (t.tipo === 'pedra') {
        // pedra: machuca um pouco mais (até 7% da vida máxima) e trinca a tela (view/sujeira.js)
        this.ferirHeroi(Math.min(t.dano, h.vidaMax * t.danoMax), null, 'a pedra', 'impacto');
        this.emit('pedrada', { x: h.x, y: h.y });
        continue;
      }
      this.ferirHeroi(Math.min(t.dano, h.vidaMax * t.danoMax), null, 'o tomate', 'esmagar');   // dano pequeno: no máximo 5% da vida máxima
      this.emit('tomatada', { x: h.x, y: h.y });
    }
    this.tomates = this.tomates.filter(t => !t.fim);
  }

  atualizarCarros(dt) {
    this.atualizarParaquedistas(dt);
    this.atualizarTomates(dt);
    if (!this.carros.length) return;
    const C = CONVERSIVEL, h = this.hero;
    for (const c of this.carros) {
      const passo = C.vel * dt;
      c.x += c.dx * passo; c.y += c.dy * passo; c.resta -= passo;
      // quem está na frente do carro: herói e zumbis (inclusive chefes)
      const pega = (e, raio) => {
        const rx = e.x - c.x, ry = e.y - c.y;
        const along = rx * c.dx + ry * c.dy, lat = rx * -c.dy + ry * c.dx;
        return Math.abs(along) < C.comprimento / 2 + raio && Math.abs(lat) < C.largura / 2 + raio ? (lat >= 0 ? 1 : -1) : 0;
      };
      if (this.fase === 'jogo' && !this.caido && !c.atingidos.has(h)) {
        const lado = pega(h, 0.22);
        if (lado) {
          c.atingidos.add(h); c.heroi = true;
          this.ferirHeroi(h.vida * C.dano, c.quem, c.quem ? `o conversível de ${c.quem.nick}` : 'o conversível', 'esmagar');
          this.mover(h, -c.dy * lado * 1.2, c.dx * lado * 1.2, 0.22);   // jogado pro lado
          this.aplicarStatus(h, 'atordoado', { duracao: 0.6 });
          this.emit('atropelou', { x: h.x, y: h.y, heroi: true });
        }
      }
      for (const z of this.zumbis) {
        if (z.morto || z.nascendo > 0 || c.atingidos.has(z)) continue;
        const lado = pega(z, ZUMBIS[z.tipo].raio);
        if (!lado) continue;
        c.atingidos.add(z); c.zumbis++;
        z.vida *= 1 - C.dano; z.flash = 0.15;   // metade da vida atual (não passa pelos multiplicadores: é metade mesmo)
        z.kx += -c.dy * lado * 6; z.ky += c.dx * lado * 6;
        this.aplicarStatus(z, 'atordoado', { duracao: 0.8 });
        this.emit('atropelou', { x: z.x, y: z.y, heroi: false, chefe: !!ZUMBIS[z.tipo].chefe });
      }
      if (c.resta <= 0) this.emit('conversivel_fim', { nick: c.quem?.nick || null, zumbis: c.zumbis, heroi: c.heroi });
    }
    this.carros = this.carros.filter(c => c.resta > 0);
  }

  /* =================== Coisas ruins mandadas pelo público =================== */
  soltarZumbis(tipo, qtd, quem, opts = {}) {
    const h = this.hero;
    // Hordas mandadas pelo público crescem com a ameaça (o explosivo é sempre 1 por presente)
    // (o multiplicador do começo vale entre 60% e 100%: presente nunca manda mais que o normal)
    if (quem && tipo !== 'explosivo' && !opts.semEscala && !opts.fa) qtd = Math.max(1, Math.round(qtd * multPresente(this.nivelAmeaca, this.A) * clamp(multInicio(this.hero.nivel, this.A), 0.6, 1)));   // (presente não leva a rampa do começo)
    const nome = opts.nomeados && quem ? nomeSeguro(quem.nick, 12) : null;
    const lugares = [];
    if (this.room) {
      for (let k = 0; k < qtd; k++) lugares.push(this.room.pontoLivre(this.rng, h, 3.5));
    } else if (opts.horda) {
      const frente = this.pontoAFrente(7);
      for (let k = 0; k < qtd; k++) {
        const p = k % 3 === 2 ? this.pontoNaRua(h, 6, 9, 0) : this.pontoPerto(frente, 2.5);
        if (p) lugares.push(p);
      }
    } else {
      const frente = this.pontoAFrente(6.5);
      for (let k = 0; k < qtd; k++) { const p = this.pontoPerto(frente, 2); if (p) lugares.push(p); }
    }
    // Limite de zumbis: abre espaço tirando os comuns mais longe (os do público têm prioridade)
    const sobra = this.zumbis.length + lugares.length - (this.cfg.maxZ + 20);
    if (sobra > 0) {
      const longe = this.zumbis.filter(z => !z.dono && !z.morto).sort((a, b) => dist2(b.x, b.y, h.x, h.y) - dist2(a.x, a.y, h.x, h.y));
      for (let k = 0; k < Math.min(sobra, longe.length); k++) { longe[k].morto = true; longe[k].sumiu = true; }
    }
    lugares.forEach((p, k) => {
      const novos = this.hero.nivel >= NIVEL_INIMIGOS_NOVOS;
      const t = tipo === 'horda' ? (novos && this.rng.chance(EXPLOSAO.naHorda) ? 'explosivo' : novos && this.rng.chance(0.25) ? (this.rng.chance(0.55) ? 'lobo' : 'esticado') : this.rng.chance(0.2) ? 'corredor' : this.rng.chance(0.2) ? 'gordo' : 'comum') : tipo;
      this.criarZumbi(t, p.x, p.y, quem, { nome, nascendo: 0.5 + k * 0.08, fa: opts.fa });
    });
  }

  // Zumbis que aparecem atrás do herói (emboscada)
  soltarZumbisAtras(qtd) {
    const h = this.hero;
    for (let k = 0; k < qtd; k++) {
      const p = this.room ? this.room.pontoLivre(this.rng, h, 3) : this.pontoNaRua(h, 5, 9, -1);
      const instaveis = this.hero.nivel >= EXPLOSAO.desdeNivel && this.rng.chance(EXPLOSAO.naHorda);
      if (p) this.criarZumbi(instaveis ? 'explosivo' : this.rng.chance(0.25) ? 'corredor' : 'comum', p.x, p.y, null, { nascendo: 0.5 + k * 0.08 });
    }
  }

  // Presente "cacos de vidro": cobre a rua de lado a lado logo à frente (não tem como desviar)
  armadilhaVidro(seg, quem) {
    const h = this.hero;
    if (this.room) { this.deixarLento(seg); this.emit('vidro_pisou', { x: h.x, y: h.y }); return; }
    const p = this.pontoAFrente(4);
    const [dx] = DIRS[this.rota.dir];
    const a = dx ? { x0: p.x - 1, x1: p.x + 1, y0: p.y - 2.5, y1: p.y + 2.5 } : { x0: p.x - 2.5, x1: p.x + 2.5, y0: p.y - 1, y1: p.y + 1 };
    this.zonas.push({ tipo: 'vidro', ...a, t: 30, quem, lentoAoEntrar: seg, semente: this.rng.int(1, 1e6) });
  }

  // Perigos ativos perto do herói (uma vez por quadro) e o tempo de vida dos que aparecem no jogo
  atualizarZonas(dt) {
    for (const z of this.zonas) z.t -= dt;
    if (this.zonas.some(z => z.t <= 0)) this.zonas = this.zonas.filter(z => z.t > 0);
    const h = this.hero;
    const fixas = this.room ? (this.room.zonas || []) : this.city.zonasEm(h.x - 26, h.y - 26, h.x + 26, h.y + 26);
    this.zonasAgora = this.zonas.length ? fixas.concat(this.zonas) : fixas;
    // fogo das habilidades do herói (molotov) não machuca ele: o herói só "vê" os outros perigos
    this.zonasHeroi = this.zonas.some(z => z.doHeroi) ? this.zonasAgora.filter(z => !z.doHeroi) : this.zonasAgora;
  }

  ambienteNoHeroi(dt) {
    const h = this.hero;
    const zonas = this.zonasHeroi || this.zonasAgora;
    // pisando em cacos de vidro? (não se cura enquanto estiver neles)
    const noVidro = zonas.some(z => z.tipo === 'vidro' && dentro(z, h.x, h.y));
    if (noVidro && !h.noVidro) this.emit('vidro_sem_cura', { x: h.x, y: h.y });
    h.noVidro = noVidro;
    if (!noVidro && h.curaGuardada > 0) {
      const pct = h.curaGuardada, quem = h.curaGuardadaQuem;
      h.curaGuardada = 0; h.curaGuardadaQuem = null;
      this.curar(pct, quem, true);
      this.emit('cura_liberada', { x: h.x, y: h.y, valor: Math.round(pct) });
    }
    const r = efeitoDoAmbiente(h, zonas, dt, this.t, this.rng);
    for (const z of r.entrou) {
      if (z.lentoAoEntrar) { this.deixarLento(z.lentoAoEntrar); this.aplicarStatus(h, 'sangramento', { pilhas: 2, fonte: z.quem, mult: AMBIENTE.vidro.noHeroi }); this.emit('vidro_pisou', { x: h.x, y: h.y }); }
      if (machuca(z.tipo)) this.emit('ambiente', { tipo: z.tipo, x: h.x, y: h.y });
    }
    // perigos machucam menos o herói do que os zumbis (ambiente.js → noHeroi): vidro 1/6, fogo 1/4
    for (const d of r.danos) this.ferirHeroi(d.valor * (AMBIENTE[d.zona.tipo].noHeroi ?? 1), d.zona.quem || null, AMBIENTE[d.zona.tipo].nome.toLowerCase(), d.tipo, !d.golpe);
    if (this.fase !== 'jogo') return r;
    for (const s of r.status) {
      // o sangramento do vidro também é 6× mais fraco (o queimando já se reduz sozinho: status.js → multNoHeroi)
      const m = STATUS[s.id].multNoHeroi ? 1 : (AMBIENTE[s.zona.tipo].noHeroi ?? 1);
      this.aplicarStatus(h, s.id, { duracao: s.duracao, pilhas: s.pilhas, fonte: s.zona.quem, mult: m });
    }
    if (r.apagaFogo && h.estados.tem('queimando')) h.estados.remover('queimando');
    return r;
  }

  alarme(seg, quem) {
    this.alarmeT = Math.max(this.alarmeT, seg);
    this.alarmeQuem = quem;
    if (this.room) { this.emit('alarme', { sala: true }); this.salaT = Math.max(this.salaT, this.cfg.predioT - 20); return; }
    // carro novo na rua à frente, piscando
    const p = this.pontoAFrente(5);
    const [dx, dy] = DIRS[this.rota.dir];
    const lado = this.rng.chance(0.5) ? 1 : -1;
    const cx = Math.floor(p.x + (dx ? 0 : lado * 1)), cy = Math.floor(p.y + (dy ? 0 : lado * 1));
    const tiles = dx ? [{ x: cx, y: cy }, { x: cx + 1, y: cy }] : [{ x: cx, y: cy }, { x: cx, y: cy + 1 }];
    if (!tiles.every(t => this.city.tileWalk(t.x, t.y))) { this.alarmeCarro = { x: p.x, y: p.y }; this.emit('alarme', { x: p.x, y: p.y }); return; }
    if (this.alarmeCarro?.tiles) this.city.removeDyn(this.alarmeCarro);
    const carro = { tipo: 'carro', x: cx, y: cy, w: dx ? 2 : 1, h: dx ? 1 : 2, cor: this.rng.int(0, 5), alarme: true };
    this.city.addDyn(carro, tiles);
    this.alarmeCarro = carro;
    this.emit('alarme', { x: cx + carro.w / 2, y: cy + carro.h / 2 });   // o som fica no carro (som.js → atualizarAlarmes)
  }

  trem(qtd, quem) {
    const h = this.hero;
    qtd = Math.round(qtd * multPresente(this.nivelAmeaca, this.A));
    if (!this.room) {
      // barricada atrás: não tem volta
      const [dx, dy] = DIRS[this.rota.dir];
      const bx = Math.floor(h.x - dx * 4), by = Math.floor(h.y - dy * 4);
      const tiles = [];
      for (let k = -2; k <= 2; k++) {
        const t = dx ? { x: bx, y: Math.floor(this.city.nodePos(0, this.rota.j).y) + k } : { x: Math.floor(this.city.nodePos(this.rota.i, 0).x) + k, y: by };
        if (this.city.tileWalk(t.x, t.y)) tiles.push(t);
      }
      if (tiles.length) {
        const city = this.city;
        const bar = { tipo: 'barricada', x: tiles[0].x, y: tiles[0].y, eixo: dx ? 'x' : 'y' };
        city.addDyn(bar, tiles);
        this.agendar(40, () => city.removeDyn(bar), true);
      }
    }
    this.soltarZumbis('corredor', Math.ceil(qtd / 2), quem, { semEscala: true });
    const h2 = this.hero;
    for (let k = 0; k < Math.floor(qtd / 2); k++) {
      const p = this.room ? this.room.pontoLivre(this.rng, h2, 3) : this.pontoNaRua(h2, 5, 8, -1);
      if (p) this.criarZumbi('corredor', p.x, p.y, quem, { nascendo: 0.6 + k * 0.1 });
    }
  }

  // opts.nome: nome em cima do chefe (se não vier, usa o nome de quem mandou). opts.vidaMult: vida extra/menor.
  chefe(tipo, quem, atraso = 0, opts = {}) {
    const fazer = () => {
      const h = this.hero;
      const p = this.room ? this.room.pontoLivre(this.rng, h, 4) : this.pontoPerto(this.pontoAFrente(6), 1.5) || this.pontoAFrente(6);
      const extra = tipo === 'exheroi' ? { classe: this.ultimoHeroi?.classe, arma: this.ultimoHeroi?.arma } : null;
      const nome = opts.nome || (quem ? nomeSeguro(quem.nick, 16) : ZUMBIS[tipo].nome);
      this.criarZumbi(tipo, p.x, p.y, tipo === 'exheroi' ? null : quem, { nome, nascendo: 1.2, extra, vidaMult: opts.vidaMult });
      this.emit('chefe', { tipo, nome, x: p.x, y: p.y });
    };
    if (atraso > 0) this.agendar(atraso, fazer); else fazer();
  }

  // q = quarteirões invencível
  helicoptero(q, quem) {
    const h = this.hero;
    this.heliT = 4;
    h.invQ = Math.min(4, Math.max(h.invQ || 0, q));
    this.emit('helicoptero', { quem: quem?.nick || null });
    const alvos = this.zumbis.filter(z => !z.morto && dist2(z.x, z.y, h.x, h.y) < 16 * 16);
    alvos.forEach((z, k) => this.agendar(0.8 + k * 0.06, () => {
      if (z.morto) return;
      this.emit('explosao', { x: z.x, y: z.y, raio: 0.8, aereo: true });
      if (ZUMBIS[z.tipo].chefe) this.ferirZumbi(z, z.vidaMax * 0.5, null, true);
      else this.matarZumbi(z, null);
    }));
    this.agendar(0.5, () => this.curar(100, quem));
  }

  /* =================== Fila de coisas ruins =================== */
  // Tudo que atrapalha entra numa fila: sai um efeito a cada 0,6 s, e nada sai durante a proteção de nascimento.
  // Presentes caros furam a fila.
  processarFila(dt) {
    this.filaCd -= dt;
    if (!this.fila.length || this.filaCd > 0 || this.protecao > 0 || cenaAtiva(this)) return;   // a cena do 1º quarteirão é uma luta só: o resto espera
    let k = 0;
    for (let i = 1; i < this.fila.length; i++) if (this.fila[i].coins > this.fila[k].coins * 4 && this.fila[i].coins >= 500) k = i;
    const p = this.fila.splice(k, 1)[0];
    this.filaCd = 0.6;
    this.comPresente(p.quem, () => EFEITOS[p.regra.efeito].aplicar(this, p.regra, p.qtd, p.quem));
    // presente de atrapalhar também pode mandar um zumbi da tela, do nível do valor do presente (tela.js)
    if (p.moedas > 0 && p.regra.efeito !== 'tela') this.telaDePresente(p.quem, p.moedas);
  }

  /* =================== Público =================== */
  // Ranking da live (top ajudantes e atrapalhantes): move o cabo de guerra
  definirRanking(rank) {
    if (!rank) return;
    const antes = this.cabo?.lado;
    this.cabo = caboDeGuerra(rank);
    if (this.cabo.lado !== antes) this.emit('cabo_virou', { lado: this.cabo.lado, ajuda: this.cabo.ajuda?.nick || null, atrapalha: this.cabo.atrapalha?.nick || null });
  }

  handle(m) {
    if (!m || typeof m !== 'object') return;
    if (m.rank) this.definirRanking(m.rank);
    switch (m.type) {
      case 'chat': {
        this.lembrarNome(m.id, m.nick);
        this.torcida.set(m.id, this.t);
        if (votoPrologo(this, m)) break;   // na escolha do herói (ou do caminho), o número vota lá
        if (votoLoja(this, m)) break;      // na banca do Barganha, o número (1 a 9) vota lá (mascate.js)
        const op = lerVoto(m.texto);
        const V = this.portal ? this.portal.voto : this.voto;   // no portal, 1 2 3 votam no portal
        if (op && V && V.aberta && this.fase === 'jogo') {
          if (V.votar(m.id, op)) this.emit('voto', { nick: nomeSeguro(m.nick), op });
        }
        // "G" (ou "gráfico", "status"...): abre o gráfico de atributos do herói (core/grafico.js)
        if (pedeGrafico(m.texto)) this.emit('grafico', { nick: nomeSeguro(m.nick) });
        // "T" (ou "tabela", "fusões"...): abre a tabela de fusões (core/fusoes.js)
        if (pedeTabela(m.texto)) this.emit('tabela', { nick: nomeSeguro(m.nick) });
        const letra = lerEscolha(m.texto);
        if (letra && this.escolha?.voto.aberta && this.fase === 'jogo' && !this.portal) {   // no portal, não tem roleta
          if (this.escolha.voto.votar(m.id, letra)) this.emit('voto', { nick: nomeSeguro(m.nick), op: letra, habilidade: true });
        }
        break;
      }
      case 'entrou': this.lembrarNome(m.id, m.nick); this.entrouNaLive(m.id, m.nick); break;
      case 'curtidas': {
        this.likes += Number(m.qtd) || 0;
        const por = this.cfg.likesPor;
        if (por > 0 && this.likes >= por) {
          this.likes -= por;
          if (this.likes > por) this.likes = por - 1;
          this.receberEfeito({ efeito: 'suprimento', emoji: '❤️' }, 1, { id: '__curtidas', nick: 'Curtidas', avatar: '' }, 0, 'Curtidas');
        }
        break;
      }
      case 'seguiu':
        this.lembrarNome(m.id, m.nick);
        this.receberEfeito(m.regra || { efeito: 'aliado', segundos: 20 }, 1, { id: m.id, nick: m.nick, avatar: m.avatar }, 0, 'seguiu', '➕');
        break;
      case 'compartilhou':
        this.receberEfeito(m.regra || { efeito: 'caixa_municao' }, 1, { id: m.id, nick: m.nick, avatar: m.avatar }, 0, 'compartilhou', '🔁');
        break;
      case 'presente': {
        const regra = m.regra || { efeito: 'cura', valor: 10 };
        this.receberEfeito(regra, Math.max(1, Number(m.count) || 1), { id: m.id, nick: m.nick, avatar: m.avatar }, Number(m.coins) || 0, m.giftName, regra.emoji, m.image);
        break;
      }
    }
  }

  receberEfeito(regra, qtd, quem, coins, giftName, emoji, image) {
    // poder forte (Rei, Chefão, Helicóptero, baú lendário) ainda recarregando: vira a versão menor (recompensas.js → FORTES)
    const forte = chaveForte(regra);
    let recarregando = false;
    if (forte) {
      this.fortesT = this.fortesT || {};
      const agora = this.t;   // tempo do jogo (o simulador e os testes contam certo)
      if (agora - (this.fortesT[forte] ?? -1e9) < FORTES[forte].segundos) { regra = { ...regra, ...FORTES[forte].troca }; recarregando = true; }
      else this.fortesT[forte] = agora;
    }
    const ef = EFEITOS[regra.efeito];
    if (!ef) return;
    const lado = ladoDo(regra);
    quem = { ...quem, nick: nomeSeguro(quem.nick, 18) };
    if (coins > 0 && quem.id !== '__curtidas') {
      const m = lado === 'ajuda' ? this.stats.ajudou : this.stats.atrapalhou;
      const r = m.get(quem.id) || { nick: quem.nick, avatar: quem.avatar || '', coins: 0, primeiro: this.t };
      r.coins += coins * qtd; m.set(quem.id, r);
    }
    const espera = lado === 'atrapalha' && this.fase === 'jogo' && this.protecao > 0 ? Math.ceil(this.protecao) : 0;
    this.emit('presente', { nick: quem.nick, avatar: quem.avatar || '', emoji: emoji || regra.emoji || '🎁', image: image || '', texto: ef.aviso(regra, qtd) + (recarregando ? ' (⏳ o forte recarrega)' : '') + (regra.parcela ? ` · parcela ${regra.parcela}` : ''), lado, coins, qtd, giftName, espera });
    // Resposta na hora, em cima do herói, com o nome de quem mandou (mesmo que o efeito vá pra fila)
    if (this.fase === 'jogo') this.emit('presente_heroi', { nick: quem.nick, emoji: emoji || regra.emoji || '🎁', lado, x: this.hero.x, y: this.hero.y });
    if (lado === 'ajuda' && (coins > 0 || giftName === 'seguiu')) this.ultimaAjudaT = this.t;
    // disputa da tela: quem ajuda passa o limpador de para-brisa (só limpa se tiver sujeira: view/tela.js)
    if (lado === 'ajuda' && coins > 0 && regra.efeito !== 'limpador') this.emit('limpar_tela', { nick: quem.nick, auto: true });
    // no portal, presente mexe no poder do herói (ajuda sobe, atrapalha desce); a rua está pausada
    if (this.portal) { this.presenteNoPortal(lado, coins * qtd, quem); return; }
    // recompensas de presente (recompensas.js): drop de paraquedas (1 moeda) e doação (inspiração + colosso)
    if (coins > 0 && quem.id !== '__curtidas' && this.fase === 'jogo') this.comPresente(quem, () => this.recompensaDePresente(coins, qtd, quem, lado));
    if (lado === 'ajuda') {
      if (this.fase === 'jogo') {
        // caído: qualquer presente de ajuda (ou seguir) levanta; compartilhar e curtidas não (são de graça e sem limite)
        if (this.caido && (coins > 0 || giftName === 'seguiu')) this.levantar(quem);
        this.comPresente(quem, () => ef.aplicar(this, regra, qtd, quem));
      } else if (this.pendentesAjuda.length < 10) this.pendentesAjuda.push({ regra, qtd, quem });
    } else {
      // caído: presente de atrapalhar é o golpe final (ainda dá 2,5 s pra alguém salvar)
      if (this.caido && !this.caido.finalizador) {
        this.caido.finalizador = quem;
        this.caido.t = Math.min(this.caido.t, 2.5);
        this.emit('golpe_final', { nick: quem.nick });
      }
      if (this.fila.length < 40) this.fila.push({ regra, qtd, quem, coins: coins * qtd, moedas: coins });
    }
  }

  // Torcida (dano.js → TORCIDA): recalcula uma vez por segundo
  atualizarTorcida(dt) {
    this.torcidaT -= dt;
    if (this.torcidaT > 0) return;
    this.torcidaT = 1;
    const limite = this.t - TORCIDA.janelaSegundos;
    for (const [id, t] of this.torcida) if (t < limite) this.torcida.delete(id);
    const n = aplicarTorcida(this.hero, this.torcida.size, { ...TORCIDA, maxPessoas: this.cfg.torcidaMax });
    if (n !== this.torcidaN) { const subiu = n > this.torcidaN; this.torcidaN = n; this.emit('torcida', { pessoas: n, subiu }); }
  }

  // Quem entra na live vira um zumbi com o nome dela (uma vez por pessoa na live). Pra live cheia não virar
  // enxurrada: um a cada ENTRADA.intervalo s, no máximo ENTRADA.fila esperando (o resto fica só com o nome guardado
  // pros zumbis comuns) e só na rua (loja, arena, portal e herói caído esperam).
  entrouNaLive(id, nick) {
    this.entraram = this.entraram || new Set();
    this.filaEntradas = this.filaEntradas || [];
    if (!id || this.entraram.has(id)) return;
    this.entraram.add(id);
    if (this.filaEntradas.length < Jogo.ENTRADA.fila) this.filaEntradas.push(nomeSeguro(nick, 12));
  }

  zumbisDeQuemEntrou(dt) {
    if (!this.filaEntradas?.length || this.fase !== 'jogo' || this.room || this.arena || this.caido || cenaAtiva(this)) return;
    if ((this.entradaT = (this.entradaT || 0) - dt) > 0) return;
    const p = this.pontoNaRua(this.hero, 8, 12, 0);
    if (!p) { this.entradaT = 0.5; return; }
    this.entradaT = Jogo.ENTRADA.intervalo;
    const nome = this.filaEntradas.shift();
    const z = this.criarZumbi('comum', p.x, p.y, null, { nome, nascendo: 0.8, simples: true });   // comum, sem bônus
    z.entrou = true;   // nome em branco (render.js)
    this.emit('zumbi_entrou', { nome, x: z.x, y: z.y });
  }

  lembrarNome(id, nick) {
    const n = nomeSeguro(nick, 12);
    const i = this.nomes.findIndex(x => x.id === id);
    if (i >= 0) this.nomes.splice(i, 1);
    this.nomes.unshift({ id, nick: n });
    if (this.nomes.length > 40) this.nomes.pop();
  }
  nickDe(id) { return this.nomes.find(x => x.id === id)?.nick || 'alguém'; }

  /* =================== Lugares =================== */
  pontoPerto(base, raio) {
    for (let k = 0; k < 14; k++) {
      const a = this.rng.next() * Math.PI * 2, r = Math.sqrt(this.rng.next()) * raio;
      const x = base.x + Math.cos(a) * r, y = base.y + Math.sin(a) * r;
      if (this.livre(x, y)) return { x, y };
    }
    return this.livre(base.x, base.y) ? { x: base.x, y: base.y } : null;
  }

  livre(x, y) {
    const m = this.map, r = 0.24;
    return m.walkable(x - r, y - r) && m.walkable(x + r, y - r) && m.walkable(x - r, y + r) && m.walkable(x + r, y + r);
  }

  // Ponto numa rua entre dMin e dMax casas de distância. frente: 1 = só na frente, -1 = só atrás, 0 = tanto faz.
  // Usa o mapa de distâncias (só lugares onde dá pra chegar andando).
  pontoNaRua(base, dMin, dMax, frente = 0) {
    const h = this.hero;
    const [hx, hy] = this.room ? [h.fx, h.fy] : DIRS[this.rota.dir];
    for (let k = 0; k < 24; k++) {
      const a = this.rng.next() * Math.PI * 2, r = this.rng.range(dMin, dMax);
      const x = base.x + Math.cos(a) * r, y = base.y + Math.sin(a) * r;
      const dot = (x - h.x) * hx + (y - h.y) * hy;
      if (frente > 0 && dot < -2 && this.rng.next() < frente) continue;
      if (frente < 0 && dot > 0) continue;
      if (!this.livre(x, y)) continue;
      return { x, y };
    }
    return null;
  }

}

export { SHOPS };
