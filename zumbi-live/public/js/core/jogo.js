// O jogo em si: herói com IA, zumbis, votação, presentes, rodadas. Não desenha nada:
// quem desenha é a parte "view", que lê o estado daqui e os eventos (this.events).
// Por isso dá pra rodar partidas inteiras no Node pra testar e equilibrar (teste/simular.mjs).
import { clamp, dist, dist2, makeRng, DIRS, turnLeft, turnRight, nomeSeguro } from './util.js';
import { City, SHOPS } from './city.js';
import { Room } from './room.js';
import { FlowField } from './flow.js';
import { ZUMBIS, CLASSES, ARMAS, CORPO, MELHORIAS, xpParaNivel } from './dados.js';
import { EFEITOS, ladoDo } from './efeitos.js';
import { Votacao, lerVoto, OPCOES } from './votacao.js';
import {
  atributosDaClasse, danoDoHeroi, intervaloTiro, intervaloCorpo, alcanceArma, velocidadeHeroi,
  danoNoHeroi, valorCura, statsZumbi, danoDoZumbi, resistenciaDe, FOGO_DPS, danoExplosao, danoAliado, ALIADOS
} from './dano.js';
import {
  AMEACA, nivelAmeaca, alvoNaturais, intervaloAparecer, tamanhoGrupo, tamanhoHorda, multPresente, multPredio, pesosTipos
} from './ameaca.js';

export const PADRAO = {
  votoDur: 12, relNum: 10, relDest: 12, protecao: 15, likesPor: 300, maxZ: 90,
  velHeroi: 1.5, noiteCada: 150, noiteDur: 35, predioT: 70
};
const CHAVES = {
  segundos_de_votacao: 'votoDur', segundos_do_relatorio: 'relNum', segundos_dos_destaques: 'relDest',
  protecao_ao_nascer_segundos: 'protecao', curtidas_por_suprimento: 'likesPor', maximo_zumbis: 'maxZ',
  velocidade_do_heroi: 'velHeroi',
  noite_a_cada_segundos: 'noiteCada', noite_dura_segundos: 'noiteDur', segundos_dentro_do_predio: 'predioT'
};
// Campos do config.json que mexem no nível de ameaça (ameaca.js)
const CHAVES_AMEACA = {
  ameaca_por_minuto: 'porMinuto', ameaca_por_quarteirao: 'porQuarteirao', ameaca_por_nivel_do_heroi: 'porNivelHeroi',
  horda_a_cada_segundos: 'hordaCadaSegundos', horda_base: 'hordaBase', horda_por_nivel: 'hordaPorNivel'
};

let proxId = 1;

export class Jogo {
  constructor(opts = {}) {
    this.cfg = { ...PADRAO };
    this.A = { ...AMEACA };
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
    this.ultimoHeroi = null;
    this.pendentesAjuda = [];
    this.fila = [];
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
    }
  }

  /* =================== Rodadas =================== */
  novoHeroi() {
    this.heroiN++;
    const ids = Object.keys(CLASSES).filter(c => c !== this.hero?.classe);
    const classe = this.rng.pick(ids);
    const C = CLASSES[classe];
    this.city = new City(this.rng.int(1, 1e9));
    this.map = this.city;
    this.room = null;
    const dir = this.rng.int(0, 3);
    const start = this.city.nodePos(0, 0);
    this.hero = {
      x: start.x, y: start.y, classe, n: this.heroiN,
      vida: C.vida, vidaMax: C.vida,          // vidaMax é só leitura: quem manda é h.attr (dano.js)
      arma: C.arma, municao: C.municao ?? (ARMAS[C.arma].municao ?? null), armaT: 0,
      corpo: C.corpo || 'empurrao', golpes: C.corpo ? CORPO[C.corpo].golpes : 0,
      colete: 0, tiroCd: 0, corpoCd: 0, invT: 0,
      nivel: 1, xp: 0, fx: DIRS[dir][0], fy: DIRS[dir][1], andando: false, mira: null, animT: 0,
      parado: 0, ultimaPos: { x: start.x, y: start.y }, vidaBaixa: false
    };
    this.hero.attr = atributosDaClasse(C, this.hero);
    this.sincronizarVida();
    this.rota = { i: 0, j: 0, dir, alvo: { i: DIRS[dir][0], j: DIRS[dir][1] } };
    this.zumbis = [];
    this.aliados = [];
    this.itens = [];
    this.armadilhas = [];
    this.agendados = [];
    this.filaCd = 0;
    this.voto = null;
    this.votoAbreT = 1.2;
    this.decisao = null;
    this.indoPorta = null;
    this.ultimaLoja = -9;
    this.stats = { inicio: this.t, quarteiroes: 0, abates: 0, predios: 0, ajudou: new Map(), atrapalhou: new Map(), matador: null, cruzamentos: 0 };
    this.fase = 'jogo';
    this.faseT = 0;
    this.protecao = this.cfg.protecao;
    this.noiteT = 0;
    this.proxNoite = this.cfg.noiteCada;
    this.spawnT = 3;
    this.nivelAmeaca = 1;
    this.hordaT = this.A.hordaCadaSegundos;
    this.alarmeT = 0;
    this.alarmeCarro = null;
    this.heliT = 0;
    this.flowT = 0;
    this.exHeroiT = this.ultimoHeroi ? 45 : -1;
    this.relatorio = null;
    this.emit('novo_heroi', { n: this.heroiN, classe, nome: C.nome, emoji: C.emoji, exHeroi: !!this.ultimoHeroi });
    // Presentes que ajudam e chegaram enquanto o herói anterior estava morto valem para o novo
    const pend = this.pendentesAjuda.splice(0);
    for (const p of pend) this.agendar(2 + Math.random(), () => EFEITOS[p.regra.efeito].aplicar(this, p.regra, p.qtd, p.quem));
  }

  morrer() {
    if (this.fase !== 'jogo') return;
    const h = this.hero;
    this.fase = 'morto';
    this.faseT = 0;
    h.vida = 0;
    this.voto = null;
    const tempo = this.t - this.stats.inicio;
    const q = this.stats.quarteiroes;
    const novoRecorde = q > this.recorde;
    if (novoRecorde) this.recorde = q;
    const topo = m => [...m.values()].sort((a, b) => b.coins - a.coins)[0] || null;
    this.relatorio = {
      n: h.n, classe: h.classe, nome: CLASSES[h.classe].nome, emoji: CLASSES[h.classe].emoji,
      quarteiroes: q, abates: this.stats.abates, tempo, nivel: h.nivel, predios: this.stats.predios, ameaca: this.nivelAmeaca,
      recorde: this.recorde, novoRecorde, matador: this.stats.matador,
      topAjuda: topo(this.stats.ajudou), topAtrapalha: topo(this.stats.atrapalhou)
    };
    this.hall.push({ n: h.n, nome: CLASSES[h.classe].nome, emoji: CLASSES[h.classe].emoji, quarteiroes: q, tempo });
    this.hall.sort((a, b) => b.quarteiroes - a.quarteiroes || b.tempo - a.tempo);
    this.hall.length = Math.min(this.hall.length, 3);
    this.ultimoHeroi = { n: h.n, classe: h.classe, arma: h.arma };
    this.emit('heroi_morreu', { relatorio: this.relatorio, hall: this.hall });
  }

  /* =================== Laço principal =================== */
  update(dt) {
    this.t += dt;
    this.faseT += dt;
    for (let i = this.agendados.length - 1; i >= 0; i--) {
      const a = this.agendados[i];
      if ((a.t -= dt) <= 0) { this.agendados.splice(i, 1); if (this.fase === 'jogo' || a.sempre) a.fn(); }
    }
    if (this.fase === 'morto') {
      this.atualizarZumbis(dt);
      this.atualizarItens(dt);
      if (this.faseT >= this.cfg.relNum + this.cfg.relDest) this.novoHeroi();
      return;
    }
    this.protecao = Math.max(0, this.protecao - dt);
    this.noiteT = Math.max(0, this.noiteT - dt);
    this.heliT = Math.max(0, this.heliT - dt);
    this.diretor(dt);
    this.processarFila(dt);
    this.atualizarHeroi(dt);
    this.atualizarAliados(dt);
    this.atualizarZumbis(dt);
    this.atualizarItens(dt);
    this.atualizarArmadilhas(dt);
  }

  agendar(t, fn, sempre = false) { this.agendados.push({ t, fn, sempre }); }

  /* =================== Diretor: ritmo da partida =================== */
  diretor(dt) {
    const minutos = (this.t - this.stats.inicio) / 60;
    const n = nivelAmeaca(minutos, this.stats.quarteiroes, this.hero.nivel, this.A);
    if (n > this.nivelAmeaca) { this.nivelAmeaca = n; this.emit('ameaca', { nivel: n }); }
    if (this.cfg.noiteCada > 0) {
      this.proxNoite -= dt;
      if (this.proxNoite <= 0) { this.proxNoite = this.cfg.noiteCada; this.noite(this.cfg.noiteDur); }
    }
    if (this.exHeroiT > 0 && (this.exHeroiT -= dt) <= 0) {
      if (this.room) this.exHeroiT = 5;   // espera sair do prédio
      else this.chefe('exheroi', { nick: `Ex-herói #${this.ultimoHeroi.n}`, id: '__exheroi' }, 0);
    }

    if (this.room) { this.atualizarSala(dt); return; }

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
    const noite = this.noiteT > 0;
    const vidaPct = h.vida / h.vidaMax;
    const nv = this.nivelAmeaca;
    // Horda que chega sozinha de tempos em tempos (cresce com a ameaça)
    if (this.protecao <= 0 && this.A.hordaCadaSegundos > 0) {
      this.hordaT -= dt;
      if (this.hordaT <= 0) {
        this.hordaT = this.A.hordaCadaSegundos;
        const qtd = tamanhoHorda(nv, this.A);
        this.soltarZumbis('horda', qtd, null, { horda: true, semEscala: true });
        this.emit('horda', { qtd });
      }
    }
    let alvo = Math.round(alvoNaturais(nv, this.A));
    if (noite) alvo *= 1.6;
    if (vidaPct < 0.3) alvo *= 0.55;   // alivia quando o herói está quase morrendo (presentes não são afetados)
    if (this.protecao > 0) alvo *= 0.5;
    alvo = Math.min(alvo, this.cfg.maxZ * 0.7);
    let naturais = 0;
    for (const z of this.zumbis) if (!z.dono) naturais++;
    this.spawnT -= dt;
    if (this.spawnT <= 0 && naturais < alvo) {
      this.spawnT = intervaloAparecer(nv, this.A) * (noite ? 0.7 : 1);
      const grupo = tamanhoGrupo(nv, this.A);
      const p = this.pontoNaRua(h, 10, 15, 0.7);
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

  tipoNatural() { return this.rng.weighted(pesosTipos(this.nivelAmeaca)); }

  noite(seg) {
    const antes = this.noiteT > 0;
    this.noiteT = Math.max(this.noiteT, seg);
    if (!antes) this.emit('noite', { segundos: seg });
  }

  /* =================== Sala (dentro do prédio) =================== */
  entrarPredio(shop) {
    const h = this.hero;
    this.room = new Room(shop);
    this.map = this.room;
    this.salaT = 0;
    this.salaAlarme = false;
    this.indoPorta = null;
    this.ultimaLoja = this.stats.cruzamentos;
    this.stats.predios++;
    h.x = this.room.entrada.x; h.y = this.room.entrada.y;
    h.fx = 0; h.fy = -1;
    // Chefes seguem o herói pra dentro; o resto fica lá fora
    const chefes = this.zumbis.filter(z => ZUMBIS[z.tipo].chefe);
    this.zumbis = [];
    chefes.forEach((z, k) => this.agendar(4 + k * 2, () => { if (this.room) { z.x = this.room.entrada.x; z.y = this.room.entrada.y + 0.4; z.nascendo = 0.5; this.zumbis.push(z); } }));
    for (const a of this.aliados) { a.x = h.x + this.rng.range(-1, 1); a.y = h.y - 0.3; }
    // Itens que estavam caindo lá fora entram junto
    for (const it of this.itens) { const p = this.room.pontoLivre(this.rng, null); it.x = p.x; it.y = p.y; }
    this.armadilhas = [];
    const info = this.room.info;
    const nZ = Math.round(info.zumbis * multPredio(this.nivelAmeaca, this.A));
    for (let k = 0; k < nZ; k++) {
      const p = this.room.pontoLivre(this.rng, this.room.entrada, 4);
      const tipo = shop.tipo === 'hospital' && this.rng.chance(0.3) ? 'gordo' : this.rng.chance(0.15 * shop.risco) ? 'corredor' : 'comum';
      this.criarZumbi(tipo, p.x, p.y, null, { nascendo: 0.01, dormindo: this.rng.chance(0.5) });
    }
    for (const [kind, qtd] of info.loot) for (let k = 0; k < qtd; k++) {
      let kk = kind;
      if (kind === 'bau_lendario_chance') { if (!this.rng.chance(0.35)) continue; kk = 'bau_lendario'; }
      const p = this.room.pontoLivre(this.rng, this.room.entrada, 3);
      this.itens.push({ id: proxId++, kind: kk, x: p.x, y: p.y, z: 0, vz: 0, data: kk === 'kit' ? { valor: 25 } : {}, quem: null, vida: 999, achado: true });
    }
    this.emit('entrou_predio', { tipo: shop.tipo, nome: shop.nome, emoji: shop.emoji });
  }

  atualizarSala(dt) {
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
    r.alvo = { i: node.i + DIRS[r.dir][0], j: node.j + DIRS[r.dir][1] };
    h.fx = DIRS[r.dir][0]; h.fy = DIRS[r.dir][1];
    this.stats.quarteiroes++;
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
    this.votoAbreT = 0.8;
    this.spawnT = 2;
    this.flowT = 0;
    this.emit('saiu_predio', { tipo: shop.tipo });
    this.checarRecorde();
  }

  /* =================== Rota, votação e decisões =================== */
  abrirVotacao() {
    const r = this.rota;
    const shop = this.city.shopAt(r.alvo.i, r.alvo.j);
    const ops = [
      { id: 'esquerda', dir: turnLeft(r.dir) },
      { id: 'frente', dir: r.dir },
      { id: 'direita', dir: turnRight(r.dir) }
    ];
    if (shop) ops.push({ id: 'entrar', shop });
    for (const o of ops) Object.assign(o, OPCOES[o.id]);
    this.voto = new Votacao(ops, this.cfg.votoDur);
    this.voto.loja = shop;
    this.emit('votacao_abriu', { opcoes: ops.map(o => o.id), loja: shop ? { tipo: shop.tipo, nome: shop.nome, emoji: shop.emoji } : null });
  }

  fecharVotacao() {
    const res = this.voto.fechar(ops => this.escolhaIA(ops), this.rng);
    const op = this.voto.opcoes.find(o => o.id === res.id);
    this.decisao = op;
    const quem = [];
    for (const [id, v] of this.voto.votantes) if (v === res.id && quem.length < 3) quem.push(this.nickDe(id));
    this.emit('decisao', { id: op.id, nome: op.nome, seta: op.seta, votos: res.votos, total: this.voto.total, auto: res.auto, empate: !!res.empate, quem, loja: op.shop ? op.shop.nome : null });
  }

  escolhaIA(ops) {
    const h = this.hero, vidaPct = h.vida / h.vidaMax;
    const pesos = ops.map(o => {
      if (o.id === 'entrar') {
        const recente = this.stats.cruzamentos - this.ultimaLoja < 3;
        if (recente) return [o.id, 0.15];
        const cura = o.shop.tipo === 'farmacia' || o.shop.tipo === 'hospital';
        if (vidaPct < 0.5 && cura) return [o.id, 4];
        return [o.id, 0.7 - o.shop.risco * 0.1];
      }
      return [o.id, o.id === 'frente' ? 1.3 : 1];
    });
    return this.rng.weighted(pesos);
  }

  aplicarDecisao() {
    const r = this.rota, op = this.decisao;
    this.decisao = null;
    this.voto = null;
    this.stats.cruzamentos++;
    if (op.id === 'entrar') {
      this.indoPorta = op.shop;
      return;
    }
    r.i = r.alvo.i; r.j = r.alvo.j;
    const virou = op.dir !== r.dir;
    r.dir = op.dir;
    r.alvo = { i: r.i + DIRS[r.dir][0], j: r.j + DIRS[r.dir][1] };
    this.stats.quarteiroes++;
    this.votoAbreT = 0.8;
    if (virou) this.emit('virou', { dir: r.dir });
    this.checarRecorde();
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
    if (this.indoPorta) {
      const d = this.indoPorta.door;
      if (dist(h.x, h.y, d.x, d.y) < 0.45) { this.entrarPredio(this.indoPorta); return null; }
      return { x: d.x, y: d.y, porta: true };
    }
    if (!this.voto && !this.decisao) {
      this.votoAbreT -= dt;
      if (this.votoAbreT <= 0) this.abrirVotacao();
    }
    if (this.voto && this.voto.aberta) {
      this.voto.update(dt);
      if (this.voto.t <= 0) this.fecharVotacao();
    }
    const alvo = this.city.nodePos(r.alvo.i, r.alvo.j);
    const [dx, dy] = DIRS[r.dir];
    const falta = (alvo.x - h.x) * dx + (alvo.y - h.y) * dy;
    if (falta < 0.5 && dist(h.x, h.y, alvo.x, alvo.y) < 1.4) {
      if (this.decisao) { this.aplicarDecisao(); return this.objetivoRota(0); }
      return { x: alvo.x, y: alvo.y, esperando: true };
    }
    // Segue o meio da rua, olhando um pouco à frente
    const passo = Math.min(1.6, Math.max(0, falta));
    return dx ? { x: h.x + dx * passo, y: alvo.y } : { x: alvo.x, y: h.y + dy * passo };
  }

  /* =================== Herói =================== */
  atualizarHeroi(dt) {
    const h = this.hero;
    h.tiroCd -= dt; h.corpoCd -= dt;
    h.invT = Math.max(0, h.invT - dt);
    for (const m of h.attr.update(dt)) this.emit('buff_acabou', { id: m.id, attr: m.attr });
    this.sincronizarVida();
    const regen = h.attr.get('regen');
    if (regen > 0 && h.vida < h.vidaMax) h.vida = Math.min(h.vidaMax, h.vida + regen * dt);
    if (h.armaT > 0 && (h.armaT -= dt) <= 0) this.trocarArma(CLASSES[h.classe].arma === 'escopeta' ? 'pistola' : CLASSES[h.classe].arma, null);
    if (h.vidaBaixa && h.vida / h.vidaMax > 0.5) h.vidaBaixa = false;

    // 1) Pra onde ir
    let obj;
    if (this.room) obj = this.objetivoSala();
    else obj = this.objetivoRota(dt);
    if (this.fase !== 'jogo') return;
    if (!obj) return; // acabou de entrar no prédio
    // Item por perto? Vai pegar (se não estiver indo pra porta)
    const item = this.itemDesejado();
    if (item && !obj.porta && !obj.saida) obj = { x: item.x, y: item.y, item: true };

    // 2) Luta (escolhe alvo e atira; ataque de perto é automático)
    const lutando = this.combate(dt);

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
    } else dirObj = { x: obj.x - h.x, y: obj.y - h.y };
    const dObj = Math.hypot(dirObj.x, dirObj.y);
    if (!obj.esperando && dObj > 0.05) { vx = dirObj.x / dObj; vy = dirObj.y / dObj; }
    else if (obj.esperando && dObj > 0.15) { vx = dirObj.x / dObj * 0.6; vy = dirObj.y / dObj * 0.6; }

    // Zumbis perto: recua deles; se tiver muitos na frente, para e luta
    let rx = 0, ry = 0, naFrente = 0;
    for (const z of this.zumbis) {
      if (z.morto || z.nascendo > 0) continue;
      const dx = h.x - z.x, dy = h.y - z.y, d2 = dx * dx + dy * dy;
      const T = ZUMBIS[z.tipo];
      const raio = T.chefe ? 2.8 : z.tipo === 'explosivo' ? 2.6 : 1.7;
      if (d2 > raio * raio || d2 < 1e-6) continue;
      const d = Math.sqrt(d2);
      const peso = (raio - d) / raio * (T.chefe ? 2.2 : z.tipo === 'explosivo' ? 2.6 : 1);
      rx += dx / d * peso; ry += dy / d * peso;
      if (d < 1.7 && (vx * -dx + vy * -dy) / d > 0.3) naFrente++;
    }
    if (naFrente >= 4 && !obj.porta) { vx *= 0.25; vy *= 0.25; }
    const rm = Math.hypot(rx, ry);
    if (rm > 0.01) {
      const k = Math.min(1.6, rm);
      vx = vx * (1 - Math.min(0.75, rm * 0.5)) + rx / rm * k;
      vy = vy * (1 - Math.min(0.75, rm * 0.5)) + ry / rm * k;
    }
    const vm = Math.hypot(vx, vy);
    if (vm > 1) { vx /= vm; vy /= vm; }
    // armadilhas de vidro
    let noVidro = false;
    if (!this.room) for (const a of this.armadilhas) {
      if (a.tipo === 'vidro' && h.x > a.x0 && h.x < a.x1 && h.y > a.y0 && h.y < a.y1) {
        if (!a.pisou) { a.pisou = true; this.deixarLento(a.segundos); this.ferirHeroi(3, a.quem, 'cacos de vidro'); this.emit('vidro_pisou', { x: h.x, y: h.y }); }
        noVidro = true;
      }
    }
    const vel = velocidadeHeroi(h, this.cfg.velHeroi, { lutando, noVidro });
    const antesX = h.x, antesY = h.y;
    this.mover(h, vx * vel * dt, vy * vel * dt, 0.22);
    const andou = Math.hypot(h.x - antesX, h.y - antesY);
    h.andando = andou > 0.002;
    if (h.andando) h.animT += andou;
    if (!h.mira && h.andando) { h.fx = (h.x - antesX) / andou; h.fy = (h.y - antesY) / andou; }

    // Anti-travamento: se ficou muito tempo sem sair do lugar e sem zumbi perto, dá um jeito
    if (dist(h.x, h.y, h.ultimaPos.x, h.ultimaPos.y) > 0.5 || obj.esperando || rm > 0.01) { h.parado = 0; h.ultimaPos = { x: h.x, y: h.y }; }
    else if ((h.parado += dt) > 6) {
      h.parado = 0;
      if (!this.room) {
        const alvo = this.city.nodePos(this.rota.alvo.i, this.rota.alvo.j);
        const [dx, dy] = DIRS[this.rota.dir];
        h.x = dx ? h.x : alvo.x; h.y = dy ? h.y : alvo.y;   // volta pro meio da rua
        this.itens = this.itens.filter(it => it !== item);
      } else if (this.room) this.sairPredio();
    }
  }

  objetivoSala() {
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

  itemDesejado() {
    const h = this.hero;
    let best = null, bd = 49;
    for (const it of this.itens) {
      if (it.z > 0.3) continue;
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
    const arma = ARMAS[h.arma];
    // Ataque de perto
    const corpo = CORPO[h.corpo];
    if (h.corpoCd <= 0) {
      let alvoPerto = null, bd = 1e9;
      for (const z of this.zumbis) {
        if (z.morto || z.nascendo > 0) continue;
        const d = dist2(h.x, h.y, z.x, z.y), lim = 0.75 + ZUMBIS[z.tipo].raio;
        if (d < lim * lim && d < bd) { bd = d; alvoPerto = z; }
      }
      if (alvoPerto) {
        h.corpoCd = intervaloCorpo(h, corpo);
        const ang = Math.atan2(alvoPerto.y - h.y, alvoPerto.x - h.x);
        for (const z of this.zumbis) {
          if (z.morto || z.nascendo > 0) continue;
          const dx = z.x - h.x, dy = z.y - h.y, d = Math.hypot(dx, dy);
          if (d > 1.05 + ZUMBIS[z.tipo].raio) continue;
          let da = Math.abs(Math.atan2(dy, dx) - ang); if (da > Math.PI) da = 2 * Math.PI - da;
          if (da > 1.1) continue;
          const r = danoDoHeroi(h, corpo.dano, 'corpo', z, this.rng);
          this.ferirZumbi(z, r.dano, null, false, r.critico);
          if (!ZUMBIS[z.tipo].chefe && d > 0.01) { z.kx += dx / d * corpo.empurra * 4; z.ky += dy / d * corpo.empurra * 4; }
        }
        if (h.corpo === 'taco' && --h.golpes <= 0) { h.corpo = 'empurrao'; this.emit('arma_acabou', { nome: CORPO.taco.nome }); }
        this.emit('golpe', { x: h.x, y: h.y, ang, taco: h.corpo === 'taco' });
      }
    }
    // Arma de fogo
    const alcance = alcanceArma(h, arma);
    const alvo = this.escolherAlvo(alcance);
    h.mira = alvo;
    if (!alvo) return false;
    h.fx = alvo.x - h.x; h.fy = alvo.y - h.y;
    const fm = Math.hypot(h.fx, h.fy) || 1; h.fx /= fm; h.fy /= fm;
    const base = Math.atan2(h.fy, h.fx);
    if (arma.chama) {
      let n = 0;
      for (const z of this.zumbis) {
        if (z.morto || z.nascendo > 0) continue;
        const dx = z.x - h.x, dy = z.y - h.y, d = Math.hypot(dx, dy);
        if (d > alcance + ZUMBIS[z.tipo].raio) continue;
        let da = Math.abs(Math.atan2(dy, dx) - base); if (da > Math.PI) da = 2 * Math.PI - da;
        if (da > arma.cone) continue;
        this.ferirZumbi(z, danoDoHeroi(h, arma.dps * dt, 'chama', z).dano, null, true);
        z.fogo = 2; n++;
      }
      this.chamaT = (this.chamaT || 0) - dt;
      if (this.chamaT <= 0) { this.chamaT = 0.05; this.emit('chama', { x: h.x, y: h.y, ang: base, alcance }); }
      return true;
    }
    if (h.tiroCd > 0) return true;
    h.tiroCd = intervaloTiro(h, arma);
    for (let b = 0; b < arma.balas; b++) {
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
      if (hit) { const r = danoDoHeroi(h, arma.dano, 'tiro', hit, this.rng); this.ferirZumbi(hit, r.dano, null, false, r.critico); }
      this.emit('tiro', { x: h.x, y: h.y, tx: ex, ty: ey, arma: h.arma, acertou: !!hit, heroi: true });
    }
    if (h.municao != null && --h.municao <= 0) {
      this.emit('arma_acabou', { nome: arma.nome });
      this.trocarArma('pistola', null);
    }
    return true;
  }

  // vida máxima vem dos atributos; se ela cair, a vida atual acompanha
  sincronizarVida() {
    const h = this.hero, vm = h.attr.get('vidaMax');
    if (vm !== h.vidaMax) { h.vidaMax = vm; if (h.vida > vm) h.vida = vm; }
  }

  deixarLento(seg) {
    const h = this.hero;
    h.attr.addMod({ id: 'lento', attr: 'velocidade', mult: 0.5, segundos: Math.max(seg, h.attr.restante('lento')), fonte: 'cacos de vidro' });
  }

  escolherAlvo(alcance) {
    const h = this.hero;
    const cand = [];
    for (const z of this.zumbis) {
      if (z.morto || z.nascendo > 0) continue;
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

  trocarArma(id, quem) {
    const h = this.hero, a = ARMAS[id];
    h.arma = id;
    h.municao = a.municao ?? null;
    h.armaT = a.tempo || 0;
    if (id === 'pistola' && CLASSES[h.classe].arma === 'escopeta') { /* mecânico perde a escopeta inicial: volta pra pistola */ }
    this.emit('arma', { id, nome: a.nome, emoji: a.emoji, lendaria: !!a.lendaria, quem: quem?.nick || null });
  }

  ferirHeroi(dano, quem, causa) {
    const h = this.hero;
    if (this.fase !== 'jogo') return;
    const r = danoNoHeroi(h, dano);
    if (r.bloqueado === 'invencivel') return;
    if (r.bloqueado === 'colete') { h.colete--; this.emit('colete', { x: h.x, y: h.y, resta: h.colete }); return; }
    dano = r.dano;
    h.vida -= dano;
    this.emit('dano_heroi', { dano, x: h.x, y: h.y });
    this.stats.matador = quem ? { nick: quem.nick, avatar: quem.avatar || '', causa } : { nick: null, causa };
    if (!h.vidaBaixa && h.vida > 0 && h.vida / h.vidaMax < 0.3) { h.vidaBaixa = true; this.emit('vida_baixa'); }
    if (h.vida <= 0) this.morrer();
  }

  ganharXp(x) {
    const h = this.hero;
    h.xp += x;
    while (h.xp >= xpParaNivel(h.nivel)) {
      h.xp -= xpParaNivel(h.nivel);
      h.nivel++;
      const m = this.rng.pick(MELHORIAS);
      h.attr.addMod({ ...m.mod, fonte: `nível ${h.nivel}` });
      this.sincronizarVida();
      if (m.cura) h.vida = Math.min(h.vidaMax, h.vida + m.cura);
      this.emit('nivel', { nivel: h.nivel, texto: m.texto });
    }
  }

  /* =================== Zumbis =================== */
  criarZumbi(tipo, x, y, quem, opts = {}) {
    const T = ZUMBIS[tipo];
    const z = {
      id: proxId++, tipo, x, y, ...statsZumbi(T, this.ameaca(), opts.vidaMult || 1),
      atkCd: 0.5 + this.rng.next(), velMult: 0.85 + this.rng.next() * 0.3, nascendo: opts.nascendo ?? 0.7,
      dono: quem || null, nome: opts.nome || null, kx: 0, ky: 0, fx: 0, fy: 1, animT: this.rng.next() * 10,
      flash: 0, fogo: 0, pavio: -1, dormindo: !!opts.dormindo, roupa: this.rng.int(0, 5), extra: opts.extra || null
    };
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
    const noite = this.noiteT > 0;
    for (const z of this.zumbis) {
      if (z.morto) continue;
      const T = ZUMBIS[z.tipo];
      z.flash = Math.max(0, z.flash - dt);
      if (z.nascendo > 0) { z.nascendo -= dt; continue; }
      if (z.fogo > 0) { z.fogo -= dt; this.ferirZumbi(z, FOGO_DPS * dt * (1 - resistenciaDe(z)), null, true); if (z.morto) continue; }
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
      const vel = z.vel * z.velMult * (noite ? 1.12 : 1) * (vivo ? 1 : 0.25);
      const perto = d < T.alcance + 0.12;
      const avanco = perto ? 0 : vel * dt;
      this.mover(z, mx * avanco + sx * 0.5 * dt * 4, my * avanco + sy * 0.5 * dt * 4, Math.min(0.3, T.raio * 0.7));
      if (avanco > 0) z.animT += avanco;
      z.fx = mx; z.fy = my;
      // ataque
      z.atkCd -= dt;
      if (perto && z.atkCd <= 0 && vivo) {
        z.atkCd = T.cd;
        if (alvoAliado) { /* aliados não morrem: só seguram o zumbi */ }
        else this.ferirHeroi(danoDoZumbi(z), z.dono, z.dono ? `${T.nome.toLowerCase()} de ${z.dono.nick}` : 'a horda');
        this.emit('mordida', { x: z.x, y: z.y, chefe: !!T.chefe });
      }
      // gemido de vez em quando (o som decide se toca)
      if (this.rng.next() < dt * 0.08) this.emit('gemido', { x: z.x, y: z.y, tipo: z.tipo });
    }
    if (this.zumbis.length > 40 || this.rng.next() < 0.05) this.zumbis = this.zumbis.filter(z => !z.morto);
  }

  // dano já calculado (dano.js). critico só serve pra mostrar na tela.
  ferirZumbi(z, dano, quem, silencioso = false, critico = false) {
    if (z.morto) return;
    z.vida -= dano;
    z.dormindo = false;
    if (!silencioso) { z.flash = 0.1; this.emit('acerto', { x: z.x, y: z.y, tipo: z.tipo, critico }); }
    if (z.vida <= 0) this.matarZumbi(z, quem);
  }

  matarZumbi(z, quem) {
    if (z.morto) return;
    z.morto = true;
    const T = ZUMBIS[z.tipo];
    this.stats.abates++;
    if (this.fase === 'jogo') this.ganharXp(T.xp);
    this.emit('morte_zumbi', { x: z.x, y: z.y, tipo: z.tipo, chefe: !!T.chefe, nome: z.nome, dono: z.dono?.nick || null, roupa: z.roupa });
    if (z.tipo === 'explosivo') this.explodir(z.x, z.y, 1.9, 18, 80, z.dono, 'explosão');
    if (T.chefe) {
      this.explodir(z.x, z.y, 1.4, 0, 60, null, '');
      if (z.tipo === 'exheroi') {
        const arma = z.extra?.arma;
        if (arma && arma !== 'pistola' && ARMAS[arma]) this.soltarItemEm('arma', { arma }, null, z.x, z.y);
        else this.soltarItemEm('bau_medio', {}, null, z.x, z.y);
      } else this.soltarItemEm(z.tipo === 'rei' ? 'bau_lendario' : 'kit', { valor: 30 }, null, z.x, z.y);
    }
  }

  explodir(x, y, raio, danoHeroi, danoZumbi, quem, causa) {
    this.emit('explosao', { x, y, raio });
    const h = this.hero;
    const dh = dist(x, y, h.x, h.y);
    if (danoHeroi > 0 && dh < raio) this.ferirHeroi(danoExplosao(danoHeroi, dh, raio), quem, causa);
    for (const z of this.zumbis) {
      if (z.morto) continue;
      const d = dist(x, y, z.x, z.y);
      if (d < raio + ZUMBIS[z.tipo].raio) {
        this.ferirZumbi(z, danoZumbi * (1 - resistenciaDe(z)), null, true);
        if (!z.morto && d > 0.01 && !ZUMBIS[z.tipo].chefe) { z.kx += (z.x - x) / d * 4; z.ky += (z.y - y) / d * 4; }
      }
    }
  }

  /* =================== Aliados (cachorro, sobrevivente) =================== */
  addAliado(tipo, seg, quem) {
    const h = this.hero;
    const ja = this.aliados.find(a => a.tipo === tipo && a.quem?.id === quem?.id);
    if (ja) { ja.t = Math.min(ja.t + seg, 240); return; }
    if (this.aliados.length >= 3) this.aliados.shift();
    const p = this.pontoPerto(h, 1.5) || { x: h.x, y: h.y };
    this.aliados.push({ id: proxId++, tipo, t: seg, x: p.x, y: p.y, quem, nome: quem ? nomeSeguro(quem.nick, 12) : '', cd: 0, fx: 1, fy: 0, animT: 0, andando: false, alvo: null });
    this.emit('aliado', { tipo, nome: quem?.nick || '' });
  }

  atualizarAliados(dt) {
    const h = this.hero;
    for (const a of this.aliados) {
      a.t -= dt; a.cd -= dt;
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
          a.cd = ALIADOS.cachorro.cd; this.ferirZumbi(alvo, danoAliado('cachorro', this.ameaca()) * (1 - resistenciaDe(alvo)), null); this.emit('latido', { x: a.x, y: a.y });
        } else if (!cachorro && this.linhaLivre(a.x, a.y, alvo.x, alvo.y)) {
          a.cd = ALIADOS.sobrevivente.cd; a.fx = alvo.x - a.x; a.fy = alvo.y - a.y;
          const m = Math.hypot(a.fx, a.fy) || 1; a.fx /= m; a.fy /= m;
          this.ferirZumbi(alvo, danoAliado('sobrevivente', this.ameaca()) * (1 - resistenciaDe(alvo)), null);
          this.emit('tiro', { x: a.x, y: a.y, tx: alvo.x, ty: alvo.y, arma: 'pistola', acertou: true });
        }
      }
    }
    const antes = this.aliados.length;
    this.aliados = this.aliados.filter(a => a.t > 0);
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
        it.vz += 14 * dt; it.z -= it.vz * dt;
        if (it.z <= 0) { it.z = 0; it.vz = 0; this.emit('item_pousou', { x: it.x, y: it.y, kind: it.kind }); }
        continue;
      }
      it.vida -= dt;
      if (this.fase !== 'jogo') continue;
      const d2 = dist2(h.x, h.y, it.x, it.y);
      // ímã: item perto vem sozinho até o herói (não fica preso atrás de zumbi ou carro)
      if (d2 < 2.2 * 2.2 && d2 > 0.01) {
        const d = Math.sqrt(d2), v = Math.min(d, (2 + (2.2 - d) * 3) * dt);
        it.x += (h.x - it.x) / d * v; it.y += (h.y - it.y) / d * v;
      }
      if (d2 < 0.7 * 0.7) { this.pegar(it); it.pego = true; }
    }
    this.itens = this.itens.filter(it => !it.pego && it.vida > 0);
  }

  pegar(it) {
    const h = this.hero;
    const quem = it.quem;
    switch (it.kind) {
      case 'kit': this.curar(it.data.valor || 25, quem, true); break;
      case 'cura_pequena': this.curar(12, quem, true); break;
      case 'municao': this.darMunicao(8, quem, true); break;
      case 'colete': this.darColete(3, quem, true); break;
      case 'suprimento': if (h.vida / h.vidaMax < 0.7) this.curar(20, quem, true); else this.darMunicao(10, quem, true); break;
      case 'bau_medio': this.abrirBau('medio', quem); break;
      case 'bau_lendario': this.abrirBau('lendario', quem); break;
      case 'arma': this.trocarArma(it.data.arma, quem); this.emit('bau', { raridade: 'medio', arma: it.data.arma, x: it.x, y: it.y }); break;
    }
    this.emit('pegou', { kind: it.kind, x: it.x, y: it.y });
  }

  abrirBau(raridade, quem) {
    const h = this.hero;
    if (raridade === 'lendario') {
      const arma = this.rng.pick(['metralhadora', 'lanca']);
      this.trocarArma(arma, quem);
      this.emit('bau', { raridade, arma, x: h.x, y: h.y, quem: quem?.nick || null });
    } else {
      // Arma média: escopeta (tiro) ou taco com pregos (corpo a corpo). Se já tem uma, dá a outra.
      const querTaco = h.arma === 'escopeta' ? true : h.corpo === 'taco' ? false : this.rng.chance(0.4);
      if (querTaco) { h.corpo = 'taco'; h.golpes = CORPO.taco.golpes; this.emit('arma', { id: 'taco', nome: CORPO.taco.nome, emoji: CORPO.taco.emoji, quem: quem?.nick || null }); }
      else if (ARMAS[h.arma].lendaria) h.attr.addMod({ id: 'tiro_rapido', attr: 'cadencia', mult: 2, segundos: 10, acumula: true, maxSegundos: 40, fonte: 'baú' });
      else this.trocarArma('escopeta', quem);
      this.emit('bau', { raridade, arma: querTaco ? 'taco' : 'escopeta', x: h.x, y: h.y, quem: quem?.nick || null });
    }
  }

  curar(pct, quem, item = false) {
    const h = this.hero;
    if (this.fase !== 'jogo') return;
    const antes = h.vida;
    h.vida = Math.min(h.vidaMax, h.vida + valorCura(h, pct));
    const salvou = antes / h.vidaMax < 0.2;
    this.emit('cura', { valor: pct, x: h.x, y: h.y, salvou, item });
    if (salvou) this.emit('aviso', { texto: `😮‍💨 SALVO NO ÚLTIMO SEGUNDO${quem ? ' por ' + nomeSeguro(quem.nick) : ''}!`, tipo: 'bom' });
  }

  darMunicao(seg, quem, item = false) {
    const h = this.hero;
    h.attr.addMod({ id: 'tiro_rapido', attr: 'cadencia', mult: 2, segundos: seg, acumula: true, maxSegundos: 40, fonte: 'munição' });
    const a = ARMAS[h.arma];
    if (h.municao != null && a.municao) h.municao = Math.min(a.municao * 2, h.municao + Math.ceil(a.municao * 0.5));
    this.emit('municao', { segundos: seg, item });
  }

  darColete(golpes) {
    this.hero.colete = Math.min(12, this.hero.colete + golpes);
    this.emit('colete_ganhou', { golpes: this.hero.colete });
  }

  /* =================== Coisas ruins mandadas pelo público =================== */
  soltarZumbis(tipo, qtd, quem, opts = {}) {
    const h = this.hero;
    // Hordas mandadas pelo público crescem com a ameaça (o explosivo é sempre 1 por presente)
    if (quem && tipo !== 'explosivo' && !opts.semEscala) qtd = Math.round(qtd * multPresente(this.nivelAmeaca, this.A));
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
      const t = tipo === 'horda' ? (this.rng.chance(0.2) ? 'corredor' : this.rng.chance(0.2) ? 'gordo' : 'comum') : tipo;
      this.criarZumbi(t, p.x, p.y, quem, { nome, nascendo: 0.5 + k * 0.08 });
    });
  }

  armadilhaVidro(seg, quem) {
    const h = this.hero;
    if (this.room) { this.deixarLento(seg); this.emit('vidro_pisou', { x: h.x, y: h.y }); return; }
    const p = this.pontoAFrente(4);
    const [dx] = DIRS[this.rota.dir];
    // cobre a rua de lado a lado, 2 casas de comprimento
    const a = dx ? { x0: p.x - 1, x1: p.x + 1, y0: p.y - 2.5, y1: p.y + 2.5 } : { x0: p.x - 2.5, x1: p.x + 2.5, y0: p.y - 1, y1: p.y + 1 };
    this.armadilhas.push({ tipo: 'vidro', ...a, segundos: seg, quem, t: 30, pisou: false, semente: this.rng.int(1, 1e6) });
  }

  alarme(seg, quem) {
    this.alarmeT = Math.max(this.alarmeT, seg);
    this.alarmeQuem = quem;
    this.emit('alarme', {});
    if (this.room) { this.salaT = Math.max(this.salaT, this.cfg.predioT - 20); return; }
    // carro novo na rua à frente, piscando
    const p = this.pontoAFrente(5);
    const [dx, dy] = DIRS[this.rota.dir];
    const lado = this.rng.chance(0.5) ? 1 : -1;
    const cx = Math.floor(p.x + (dx ? 0 : lado * 1)), cy = Math.floor(p.y + (dy ? 0 : lado * 1));
    const tiles = dx ? [{ x: cx, y: cy }, { x: cx + 1, y: cy }] : [{ x: cx, y: cy }, { x: cx, y: cy + 1 }];
    if (!tiles.every(t => this.city.tileWalk(t.x, t.y))) { this.alarmeCarro = { x: p.x, y: p.y }; return; }
    if (this.alarmeCarro?.tiles) this.city.removeDyn(this.alarmeCarro);
    const carro = { tipo: 'carro', x: cx, y: cy, w: dx ? 2 : 1, h: dx ? 1 : 2, cor: this.rng.int(0, 5), alarme: true };
    this.city.addDyn(carro, tiles);
    this.alarmeCarro = carro;
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

  chefe(tipo, quem, atraso = 0) {
    const fazer = () => {
      const h = this.hero;
      const p = this.room ? this.room.pontoLivre(this.rng, h, 4) : this.pontoPerto(this.pontoAFrente(6), 1.5) || this.pontoAFrente(6);
      const extra = tipo === 'exheroi' ? { classe: this.ultimoHeroi?.classe, arma: this.ultimoHeroi?.arma } : null;
      const nome = quem ? nomeSeguro(quem.nick, 16) : ZUMBIS[tipo].nome;
      this.criarZumbi(tipo, p.x, p.y, tipo === 'exheroi' ? null : quem, { nome, nascendo: 1.2, extra });
      this.emit('chefe', { tipo, nome, x: p.x, y: p.y });
    };
    if (atraso > 0) this.agendar(atraso, fazer); else fazer();
  }

  helicoptero(seg, quem) {
    const h = this.hero;
    this.heliT = 4;
    h.invT = Math.max(h.invT, seg);
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
    if (!this.fila.length || this.filaCd > 0 || this.protecao > 0) return;
    let k = 0;
    for (let i = 1; i < this.fila.length; i++) if (this.fila[i].coins > this.fila[k].coins * 4 && this.fila[i].coins >= 500) k = i;
    const p = this.fila.splice(k, 1)[0];
    this.filaCd = 0.6;
    EFEITOS[p.regra.efeito].aplicar(this, p.regra, p.qtd, p.quem);
  }

  /* =================== Público =================== */
  handle(m) {
    if (!m || typeof m !== 'object') return;
    switch (m.type) {
      case 'chat': {
        this.lembrarNome(m.id, m.nick);
        const op = lerVoto(m.texto);
        if (op && this.voto && this.voto.aberta && this.fase === 'jogo') {
          if (this.voto.votar(m.id, op)) this.emit('voto', { nick: nomeSeguro(m.nick), op });
        }
        break;
      }
      case 'entrou': this.lembrarNome(m.id, m.nick); break;
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
    const ef = EFEITOS[regra.efeito];
    if (!ef) return;
    const lado = ladoDo(regra);
    quem = { ...quem, nick: nomeSeguro(quem.nick, 18) };
    if (coins > 0 && quem.id !== '__curtidas') {
      const m = lado === 'ajuda' ? this.stats.ajudou : this.stats.atrapalhou;
      const r = m.get(quem.id) || { nick: quem.nick, avatar: quem.avatar || '', coins: 0 };
      r.coins += coins * qtd; m.set(quem.id, r);
    }
    const espera = lado === 'atrapalha' && this.fase === 'jogo' && this.protecao > 0 ? Math.ceil(this.protecao) : 0;
    this.emit('presente', { nick: quem.nick, avatar: quem.avatar || '', emoji: emoji || regra.emoji || '🎁', image: image || '', texto: ef.aviso(regra, qtd), lado, coins, qtd, giftName, espera });
    if (lado === 'ajuda') {
      if (this.fase === 'jogo') ef.aplicar(this, regra, qtd, quem);
      else if (this.pendentesAjuda.length < 10) this.pendentesAjuda.push({ regra, qtd, quem });
    } else {
      if (this.fila.length < 40) this.fila.push({ regra, qtd, quem, coins: coins * qtd });
    }
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

  atualizarArmadilhas(dt) {
    for (const a of this.armadilhas) a.t -= dt;
    this.armadilhas = this.armadilhas.filter(a => a.t > 0);
  }
}

export { SHOPS };
