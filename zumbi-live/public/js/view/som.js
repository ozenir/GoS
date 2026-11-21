// Sons feitos na hora pelo navegador (sem arquivos): tiros, gemidos, baú, alarme, chefão, coração...
// Os navegadores só liberam o áudio depois de um clique; na janela do jogo (atalho 3) ele toca sozinho.
//
// Dois caminhos de som:
//   tela   avisos da tela (voto, nível, baú, presente...): identidade "16 bits ouvido de longe" (ver naTela)
//   mundo  o que acontece na rua (tiro, explosão, zumbi...): passa pela "acústica" abaixo
//
// Acústica (física do som, com a câmera no alto como num helicóptero):
//   - a câmera fica CAMERA_ALTURA casas acima do herói: tudo da rua já chega um pouco mais grave
//     (filtro de altura no caminho "mundo")
//   - quanto mais longe, mais baixo (o volume cai com 1/distância)
//   - o ar absorve primeiro os agudos (a perda cresce com o quadrado da frequência): de longe só sobra o grave
//   - o som demora a chegar (343 m/s; uma casa tem uns 2,5 m)
export const CAMERA_ALTURA = 12, METROS_POR_CASA = 2.5, VEL_SOM = 343;
// d = distância em casas, no chão, do herói até onde o som aconteceu
export function acustica(d = 0) {
  const r = Math.hypot(Math.max(0, d), CAMERA_ALTURA), extra = r - CAMERA_ALTURA;
  return { vol: CAMERA_ALTURA / r, corte: 280 + 6500 * Math.exp(-extra / 6), atraso: extra * METROS_POR_CASA / VEL_SOM };
}

// Vozes dos zumbis (só ambiente): altura da voz de cada tipo
const VOZ_BASE = { comum: 110, gordo: 78, corredor: 150, explosivo: 92, lobo: 170, esticado: 100, chefao: 62, rei: 50, exheroi: 85 };

export class Som {
  constructor() {
    this.on = true; this.volMusica = 0.35; this.volEfeitos = 0.8;
    this.ac = null; this.ultimo = {};
  }
  get running() { return !!this.ac && this.ac.state === 'running'; }

  unlock() {
    if (!this.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ac = new AC();
      this.master = this.ac.createGain(); this.master.connect(this.ac.destination);
      this.fx = this.ac.createGain(); this.fx.connect(this.master);
      // mundo → filtro de altura (helicóptero: o ar já levou parte dos agudos) → um pouco mais de grave → fx
      this.mundo = this.ac.createGain();
      const altura = this.ac.createBiquadFilter(); altura.type = 'lowpass'; altura.frequency.value = 3800; altura.Q.value = 0.5;
      const grave = this.ac.createBiquadFilter(); grave.type = 'lowshelf'; grave.frequency.value = 180; grave.gain.value = 4;
      this.mundo.connect(altura); altura.connect(grave); grave.connect(this.fx);
      // tela (avisos) → sem o brilho de cima → fx, com o eco curto dos consoles de 16 bits (repete 0,19 s depois, mais abafado)
      this.tela = this.ac.createGain();
      const telaLp = this.ac.createBiquadFilter(); telaLp.type = 'lowpass'; telaLp.frequency.value = 3200; telaLp.Q.value = 0.6;
      const eco = this.ac.createDelay(1); eco.delayTime.value = 0.19;
      const ecoLp = this.ac.createBiquadFilter(); ecoLp.type = 'lowpass'; ecoLp.frequency.value = 1500;
      const ecoG = this.ac.createGain(); ecoG.gain.value = 0.3;
      this.tela.connect(telaLp); telaLp.connect(this.fx);
      telaLp.connect(eco); eco.connect(ecoLp); ecoLp.connect(ecoG); ecoG.connect(this.fx); ecoG.connect(eco);
      this.mus = this.ac.createGain(); this.mus.connect(this.master);
      const n = this.ac.sampleRate * 1.5;
      this.ruido = this.ac.createBuffer(1, n, this.ac.sampleRate);
      const d = this.ruido.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      this.aplicarVolume();
      this.iniciarMusica();
    }
    if (this.ac.state === 'suspended') this.ac.resume().catch(() => {});
  }
  setOn(v) { this.on = v; this.aplicarVolume(); }
  volumes(m, e) { if (Number.isFinite(m)) this.volMusica = m; if (Number.isFinite(e)) this.volEfeitos = e; this.aplicarVolume(); }
  aplicarVolume() {
    if (!this.ac) return;
    this.master.gain.value = this.on ? 1 : 0;
    this.fx.gain.value = this.volEfeitos;
    this.mus.gain.value = this.volMusica;
  }

  // evita o mesmo som repetido muitas vezes por segundo
  pode(nome, intervalo) {
    const t = performance.now();
    if (this.ultimo[nome] && t - this.ultimo[nome] < intervalo * 1000) return false;
    this.ultimo[nome] = t; return true;
  }

  // Toca o que fn() criar como se viesse de d casas do herói (acústica acima). dur = quanto dura, no máximo.
  noMundo(d, dur, fn) {
    if (!this.running) return;
    const a = acustica(d), ac = this.ac;
    const g = ac.createGain(); g.gain.value = a.vol;
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = a.corte; f.Q.value = 0.5;
    g.connect(f);
    let dl = null;
    if (a.atraso > 0.004) { dl = ac.createDelay(1); dl.delayTime.value = a.atraso; f.connect(dl); dl.connect(this.mundo); }
    else f.connect(this.mundo);
    const antes = this.alvo; this.alvo = g;
    try { fn(); } finally { this.alvo = antes; }
    setTimeout(() => { g.disconnect(); f.disconnect(); dl?.disconnect(); }, (dur + a.atraso + 0.5) * 1000);
  }

  osc(tipo, f0, f1, dur, vol, quando = 0, destino = this.alvo || this.fx) {
    if (!this.running) return;
    const t = this.ac.currentTime + quando;
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(destino); o.start(t); o.stop(t + dur + 0.05);
  }
  // ataque = segundos até o volume cheio (0 = na hora, com estalo; maior = entra suave, sem "tiro")
  noise(dur, vol, filtro = 'lowpass', freq = 2000, quando = 0, q = 0.7, freq1 = null, ataque = 0) {
    if (!this.running) return;
    const t = this.ac.currentTime + quando;
    const s = this.ac.createBufferSource(); s.buffer = this.ruido;
    const f = this.ac.createBiquadFilter(); f.type = filtro; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freq1) f.frequency.exponentialRampToValueAtTime(freq1, t + dur);
    const g = this.ac.createGain();
    if (ataque > 0) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + ataque); }
    else g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, ataque + 0.02));
    s.connect(f); f.connect(g); g.connect(this.alvo || this.fx);
    s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.05);
  }

  /* ---------- efeitos da rua (passam pela acústica; d = distância em casas do herói) ---------- */
  tiro(arma) {
    this.noMundo(0, 0.4, () => {
      if (arma === 'metralhadora') { if (!this.pode('mg', 0.07)) return; this.noise(0.05, 0.2, 'lowpass', 1500, 0, 0.7, 300); this.osc('sine', 110, 40, 0.05, 0.12); return; }
      if (arma === 'escopeta') { this.noise(0.2, 0.45, 'lowpass', 1600, 0, 0.7, 150); this.osc('sine', 85, 28, 0.16, 0.38); return; }
      if (!this.pode('tiro', 0.05)) return;
      // pistola: estampido grave, curto e seco (sem cauda), mais baixo
      this.noise(0.09, 0.22, 'lowpass', 1300, 0, 0.6, 160); this.osc('sine', 95, 32, 0.07, 0.2);
    });
  }
  tiroAliado(d = 3) { if (this.pode('tiroA', 0.08)) this.noMundo(d, 0.3, () => { this.noise(0.07, 0.16, 'lowpass', 1300, 0, 0.6, 180); this.osc('sine', 100, 35, 0.06, 0.12); }); }
  chama() { if (this.pode('chama', 0.09)) this.noMundo(0, 0.3, () => this.noise(0.14, 0.18, 'lowpass', 900, 0, 0.5, 400)); }
  acerto(d = 2) { if (this.pode('acerto', 0.04)) this.noMundo(d, 0.2, () => this.noise(0.06, 0.18, 'lowpass', 500)); }
  golpe(taco) { this.noMundo(0.5, 0.3, () => { this.noise(0.1, taco ? 0.4 : 0.25, 'lowpass', taco ? 700 : 400); this.osc('sine', 160, 60, 0.1, 0.25); }); }
  // Zumbi morrendo: o último suspiro. 3 jeitos (sorteados): 0 = gemido que desce e termina num sopro,
  // 1 = puxa o ar (engasgo) e solta um gemido curto, 2 = estertor (a garganta chiando) que vai sumindo.
  // Muitos morrendo juntos (horda): cada um mais baixo, e no máximo uns 8 por segundo.
  morteZumbi(chefe, d = 3, tipo = 'comum') {
    if (!this.pode(chefe ? 'morteChefe' : 'morte', chefe ? 0.3 : 0.12)) return;
    const agora = performance.now();
    this.mortesRecentes = (this.mortesRecentes || []).filter(t => agora - t < 600); this.mortesRecentes.push(agora);
    const k = 1 / Math.sqrt(this.mortesRecentes.length);
    const f = (VOZ_BASE[tipo] || 110) * (0.9 + Math.random() * 0.2) * (chefe ? 0.85 : 1);
    const vol = (chefe ? 0.2 : 0.13) * k, longo = chefe ? 1.6 : 1;
    this.noMundo(d, 2.5 * longo, () => {
      const qual = Math.floor(Math.random() * 3);
      if (qual === 0) {
        this.voz(f, f * 0.5, 0.9 * longo, vol, [[420, 4, 1.5], [900, 5, 0.6]], 0, 0.25, 0.03);
        this.noise(0.7 * longo, vol * 0.45, 'bandpass', 800, 0.5 * longo, 1.2, 300, 0.08);       // o ar saindo
      } else if (qual === 1) {
        this.noise(0.28, vol * 0.5, 'bandpass', 1300, 0, 2.5, 2200, 0.12);                        // puxa o ar
        this.voz(f * 1.1, f * 0.6, 0.6 * longo, vol, [[520, 4, 1.4], [1100, 5, 0.6]], 0.26, 0.4);
        this.noise(0.5 * longo, vol * 0.35, 'bandpass', 700, 0.7, 1.2, 250, 0.06);
      } else {
        this.voz(f * 0.8, f * 0.55, 1.1 * longo, vol * 0.9, [[380, 4, 1.4], [820, 5, 0.7]], 0, 0.95);   // estertor
        this.noise(0.9 * longo, vol * 0.3, 'bandpass', 600, 0.2, 1.5, 220, 0.15);
      }
      if (chefe) this.nota('sine', 80, 0.15, 0.6, 0.25 * k, 0.004, 300, 38);   // o corpo grande caindo
    });
  }

  mordida(chefe) { if (this.pode('mordida', 0.15)) this.noMundo(0.6, 0.3, () => { this.noise(0.12, chefe ? 0.45 : 0.3, 'lowpass', chefe ? 350 : 800); this.osc('sine', chefe ? 90 : 150, 50, 0.12, 0.3); }); }
  // Explosão ouvida do alto e de longe: quase só grave. Uma pancada funda (a onda de pressão), um estrondo
  // que vai sumindo devagar, um pouco de médio só quando é perto (a acústica corta de longe) e o eco nos prédios.
  explosao(raio = 1.6, d = 3) {
    if (!this.pode('explosao', 0.07)) return;
    // muitas juntas (cadeia de inchados, bomba de fragmentação): cada uma um pouco mais baixa
    const agora = performance.now();
    this.expRecentes = (this.expRecentes || []).filter(t => agora - t < 700); this.expRecentes.push(agora);
    const k = 1 / Math.sqrt(this.expRecentes.length), tam = Math.min(1.5, Math.max(0.6, raio / 1.8));
    this.noMundo(d, 3.5, () => {
      this.osc('sine', 58 + 14 / tam, 22, 0.9 * tam, 0.55 * k);
      this.noise(2.1 * tam, 0.55 * k, 'lowpass', 240, 0, 0.8, 35, 0.025);
      this.noise(0.16, 0.16 * k, 'lowpass', 1000, 0, 0.6, 200, 0.004);
      this.noise(1.5 * tam, 0.16 * k, 'lowpass', 140, 0.3 + Math.random() * 0.12, 0.7, 35, 0.06);
    });
  }
  latido(d = 1) { if (this.pode('latido', 0.5)) this.noMundo(d, 0.4, () => { this.osc('square', 600, 300, 0.07, 0.1); this.osc('square', 650, 320, 0.07, 0.1, 0.12); }); }
  vidro() { this.noMundo(0, 0.3, () => { for (let i = 0; i < 5; i++) this.osc('sine', 3000 + Math.random() * 3000, null, 0.06, 0.05, i * 0.03); }); }
  helicoptero() {
    if (!this.running) return;
    this.noMundo(4, 4.5, () => { for (let i = 0; i < 40; i++) this.noise(0.05, Math.max(0.02, 0.25 * Math.sin(i / 40 * Math.PI)), 'lowpass', 500, i * 0.1); });
  }
  grito(d = 6) { if (this.pode('grito', 3)) this.noMundo(d, 0.9, () => { this.osc('sine', 900, 1500, 0.35, 0.05); this.osc('sine', 1400, 800, 0.4, 0.04, 0.35); }); }
  rosnado(d = 2) { if (this.pode('rosna', 0.3)) this.noMundo(d, 0.4, () => { this.osc('sawtooth', 320, 110, 0.25, 0.12); this.noise(0.2, 0.12, 'lowpass', 700); }); }
  esticar(d = 2) { if (this.pode('estica', 0.2)) this.noMundo(d, 0.3, () => this.noise(0.18, 0.12, 'bandpass', 900, 0, 1, 2200)); }
  onda() { this.noMundo(0, 0.5, () => { this.osc('sine', 140, 40, 0.35, 0.35); this.noise(0.3, 0.2, 'lowpass', 600, 0, 0.7, 100); }); }
  // jogar granada/molotov: só o "fffu" do braço, entrando suave (sem estalo, pra não parecer tiro)
  pousou() { this.noMundo(1, 0.2, () => this.noise(0.1, 0.2, 'lowpass', 400)); }
  porta() { this.noMundo(0.5, 0.4, () => { this.noise(0.3, 0.25, 'lowpass', 600, 0, 3, 200); this.osc('sine', 80, 60, 0.3, 0.2); }); }
  ambiente(tipo) {
    if (!this.pode('amb' + tipo, 0.8)) return;
    if (tipo === 'vidro') { this.vidro(); return; }
    this.noMundo(0, 0.5, () => {
      if (tipo === 'fios') { this.osc('sawtooth', 120, 2400, 0.12, 0.12); this.noise(0.15, 0.25, 'highpass', 3000); }
      else if (tipo === 'fogo') this.noise(0.35, 0.25, 'lowpass', 900, 0, 0.5, 300);
      else if (tipo === 'acido') { this.noise(0.25, 0.15, 'bandpass', 2500, 0, 2); this.osc('sine', 900, 300, 0.2, 0.05); }
      else if (tipo === 'arame') { this.osc('square', 1800, 900, 0.06, 0.06); this.noise(0.1, 0.15, 'highpass', 4000); }
    });
  }

  /* ---------- vozes dos zumbis (só pra ambientar) ---------- */
  // Uma voz: onda "rouca" (dente de serra) passando por formantes (as ressonâncias da garganta, que fazem o
  // "uuh" ou o "aah"). am = tremor rápido no volume (rosnado/gargarejo), vib = tremor na altura (gemido).
  voz(f0, f1, dur, vol, formantes, quando = 0, am = 0, vib = 0) {
    const ac = this.ac, t = ac.currentTime + quando;
    const o = ac.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(Math.max(30, f1), t + dur);
    const env = ac.createGain();
    env.gain.setValueAtTime(0.0001, t); env.gain.exponentialRampToValueAtTime(vol, t + Math.min(0.08, dur * 0.3)); env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    const extras = [];
    if (vib) { const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 4.5 + Math.random() * 2; lg.gain.value = f0 * vib; l.connect(lg); lg.connect(o.frequency); extras.push(l); }
    let fonte = o;
    if (am) {
      const trem = ac.createGain(); trem.gain.value = 1 - am / 2;
      const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = 24 + Math.random() * 12; lg.gain.value = am / 2;
      l.connect(lg); lg.connect(trem.gain); o.connect(trem); fonte = trem; extras.push(l);
    }
    for (const [fr, q, ganho] of formantes) {
      const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = fr; bp.Q.value = q;
      const gg = ac.createGain(); gg.gain.value = ganho;
      fonte.connect(bp); bp.connect(gg); gg.connect(env);
    }
    env.connect(this.alvo || this.fx);
    for (const x of [o, ...extras]) { x.start(t); x.stop(t + dur + 0.05); }
  }
  // 3 vozes: 0 = gemido longo ("uuuh"), 1 = rosnado com gargarejo, 2 = engasgo em duas sílabas ("hrr-ah")
  vozZumbi(qual, tipo = 'comum', d = 6) {
    if (!this.running) return;
    const f = (VOZ_BASE[tipo] || 110) * (0.9 + Math.random() * 0.2), vol = 0.16;
    this.noMundo(d, 2, () => {
      if (qual === 0) this.voz(f, f * 0.72, 1.1 + Math.random() * 0.4, vol, [[320, 5, 1.6], [760, 6, 0.9]], 0, 0, 0.035);
      else if (qual === 1) {
        this.voz(f * 0.8, f * 0.65, 0.75 + Math.random() * 0.3, vol * 1.1, [[480, 4, 1.4], [1150, 6, 0.6]], 0, 0.85);
        this.noise(0.6, 0.05, 'bandpass', 650, 0.05, 2, 400, 0.08);
      } else {
        this.voz(f * 1.15, f * 0.95, 0.16, vol, [[600, 5, 1.4], [1300, 6, 0.8]], 0, 0.5);
        this.voz(f * 1.05, f * 0.7, 0.3, vol * 0.9, [[620, 5, 1.4], [1250, 6, 0.7]], 0.24, 0.3);
        this.noise(0.03, 0.06, 'bandpass', 1500, 0.2, 3);
      }
    });
  }
  // Chamado a cada quadro com os zumbis na tela ([{ d, tipo }]). De vez em quando (3 a 8 s, um pouco mais
  // seguido com muitos zumbis) um deles solta uma voz, nunca a mesma duas vezes seguidas. Quando um zumbi
  // aparece depois de um tempo sem nenhum, a primeira voz vem logo.
  vozes(dt, vistos) {
    if (!vistos.length) { this.semZumbi = true; return; }
    if (this.semZumbi) { this.semZumbi = false; this.vozT = 0.4 + Math.random() * 1.2; }
    this.vozT = (this.vozT ?? 1) - dt;
    if (this.vozT > 0) return;
    this.vozT = (3 + Math.random() * 5) / (1 + Math.min(vistos.length, 12) * 0.05);
    const z = vistos[Math.floor(Math.random() * vistos.length)];
    let qual;
    do qual = Math.floor(Math.random() * 3); while (qual === this.ultimaVoz);
    this.ultimaVoz = qual;
    this.vozZumbi(qual, z.tipo, z.d);
  }

  /* ---------- avisos da tela (identidade "16 bits ouvido de longe") ---------- */
  // Tudo que avisa quem assiste (presente, voto, nível, baú...) usa os mesmos poucos instrumentos, como num
  // videogame de 16 bits: sino, marimba, metal grave e tambor. Ataque suave, sem o brilho de cima e com o
  // eco curto do caminho "tela" (o eco dos consoles de 16 bits). Coisa boa sobe e soa em sino; coisa ruim é
  // grave, em metal e tambor.
  naTela(fn) {
    if (!this.running) return;
    const antes = this.alvo; this.alvo = this.tela;
    try { fn(); } finally { this.alvo = antes; }
  }
  // uma nota com filtro próprio: ataque em segundos, corte = até onde vão os agudos
  nota(tipo, f, quando, dur, vol, ataque = 0.006, corte = 2600, f1 = null) {
    const ac = this.ac, t = ac.currentTime + quando;
    const o = ac.createOscillator(); o.type = tipo; o.frequency.setValueAtTime(f, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = corte; lp.Q.value = 0.5;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + ataque); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(this.alvo || this.fx); o.start(t); o.stop(t + dur + 0.05);
  }
  // sino (glockenspiel de 16 bits): fundamental + harmônicos que somem mais rápido
  sino(f, quando = 0, dur = 0.7, vol = 0.1) {
    this.nota('triangle', f, quando, dur, vol, 0.006, 2400);
    this.nota('sine', f * 2, quando, dur * 0.5, vol * 0.35, 0.004, 3200);
    this.nota('sine', f * 3.01, quando, dur * 0.25, vol * 0.12, 0.003, 3200);
  }
  // marimba: batida de madeira, curta
  madeira(f, quando = 0, vol = 0.08) { this.nota('sine', f, quando, 0.22, vol, 0.003, 2000); this.nota('sine', f * 3.98, quando, 0.05, vol * 0.25, 0.002, 2600); }
  // metal grave (trompa ao longe): duas ondas quadradas um pouco desafinadas, bem abafadas, entrando devagar
  metal(f, quando = 0, dur = 0.6, vol = 0.07) { this.nota('square', f, quando, dur, vol, 0.05, 700); this.nota('square', f * 1.006, quando, dur, vol * 0.7, 0.07, 600); }
  // tambor ao longe (taiko)
  tambor(quando = 0, vol = 0.3) { this.nota('sine', 95, quando, 0.45, vol, 0.004, 400, 42); this.noise(0.25, vol * 0.4, 'lowpass', 320, quando, 0.7, 90); }

  cura() { this.naTela(() => [523, 659, 784].forEach((f, i) => this.sino(f, i * 0.09, 0.9, 0.07))); }
  municao() { this.naTela(() => { this.noise(0.04, 0.16, 'bandpass', 2200, 0, 2); this.noise(0.05, 0.2, 'bandpass', 1600, 0.11, 2); this.madeira(659, 0.2, 0.05); }); }   // pente encaixando: clique-claque
  colete() { this.naTela(() => { this.noise(0.22, 0.1, 'bandpass', 1100, 0, 1.5, 700, 0.04); this.nota('sine', 110, 0.18, 0.2, 0.18, 0.004, 400, 70); this.sino(523, 0.25, 0.5, 0.05); }); }   // velcro + tapinha
  bloqueio() { this.naTela(() => { this.sino(1175, 0, 0.35, 0.06); this.noise(0.06, 0.1, 'bandpass', 1800, 0, 2); }); }   // o golpe bateu no colete: "tim"
  bau(lendario) {
    this.naTela(() => {
      this.noise(0.35, 0.12, 'bandpass', 380, 0, 3, 700, 0.06);   // tampa rangendo
      const notas = lendario ? [523, 659, 784, 1047, 1319, 1568] : [392, 523, 659, 784];
      notas.forEach((f, i) => this.sino(f, 0.2 + i * 0.09, 0.8, lendario ? 0.07 : 0.08));
      if (lendario) for (let i = 0; i < 8; i++) this.sino(1568 + Math.random() * 800, 0.75 + i * 0.07, 0.4, 0.025);
    });
  }
  item() { this.naTela(() => { this.sino(784, 0, 0.35, 0.06); this.sino(1175, 0.06, 0.4, 0.05); }); }
  nivel() { this.naTela(() => { [392, 494, 587, 784].forEach((f, i) => this.sino(f, i * 0.08, 0.9, 0.07)); this.nota('triangle', 196, 0, 1.2, 0.06, 0.08, 800); }); }
  presente(lado) {
    if (!this.pode('presente', 0.12)) return;
    this.naTela(() => {
      if (lado === 'ajuda') { this.sino(659, 0, 0.6, 0.08); this.sino(988, 0.08, 0.7, 0.07); }
      else { this.metal(117, 0, 0.55, 0.06); this.metal(123.5, 0.02, 0.55, 0.05); this.tambor(0, 0.18); }
    });
  }
  voto() { if (this.pode('voto', 0.05)) this.naTela(() => this.madeira(880 + Math.random() * 60, 0, 0.035)); }
  tique(urgente) { this.naTela(() => this.madeira(urgente ? 1047 : 784, 0, urgente ? 0.09 : 0.05)); }
  decisao() { this.naTela(() => { this.madeira(523, 0, 0.09); this.madeira(784, 0.1, 0.09); this.sino(784, 0.1, 0.6, 0.04); }); }
  virou() { this.noMundo(0, 0.3, () => this.noise(0.22, 0.05, 'bandpass', 500, 0, 1.2, 1000, 0.08)); }
  chefe(rei) {
    this.naTela(() => {
      this.metal(rei ? 73 : 98, 0, 2, 0.09); this.metal(rei ? 69 : 92.5, 0.6, 1.6, 0.07);   // trompa ao longe
      [0, 0.45, 0.9].forEach(q => this.tambor(q, 0.32));
      this.noise(1.6, 0.18, 'lowpass', 260, 0, 0.8, 60, 0.2);
    });
  }
  alarme(seg = 6) {
    if (!this.running) return;
    this.noMundo(5, seg * 1 + 1, () => { for (let i = 0; i < seg * 2.5; i++) this.osc('square', i % 2 ? 660 : 880, null, 0.36, 0.04, i * 0.4); });
  }
  zap() { if (this.pode('zap', 0.1)) this.noMundo(2, 0.3, () => { this.noise(0.15, 0.25, 'highpass', 3000); this.osc('sawtooth', 900, 200, 0.15, 0.08); }); }
  // jogar granada/molotov: só o "fffu" do braço, entrando suave (sem estalo, pra não parecer tiro)
  arremesso() { if (this.pode('arr', 0.2)) this.noMundo(0, 0.4, () => this.noise(0.26, 0.12, 'bandpass', 380, 0, 1.4, 950, 0.1)); }
  habilidade() { this.naTela(() => [523, 659, 784, 1047].forEach((f, i) => this.sino(f, i * 0.07, 0.8, 0.07))); }
  escolha() { this.naTela(() => { this.sino(392, 0, 0.6, 0.06); this.sino(523, 0.12, 0.7, 0.06); }); }
  caiu() { this.naTela(() => { this.tambor(0, 0.35); this.metal(110, 0.05, 0.9, 0.07); this.nota('square', 110, 0.05, 0.9, 0.06, 0.03, 600, 55); }); }
  levantou() { this.naTela(() => { [262, 392, 523, 784].forEach((f, i) => this.sino(f, i * 0.07, 0.8, 0.07)); this.noise(0.4, 0.08, 'bandpass', 600, 0, 1, 1400, 0.1); }); }
  golpeFinal() { this.naTela(() => { this.metal(82, 0, 0.9, 0.09); this.metal(87, 0.02, 0.9, 0.08); this.tambor(0, 0.4); this.tambor(0.25, 0.3); }); }
  coracao() { this.naTela(() => { this.nota('sine', 70, 0, 0.14, 0.35, 0.004, 300, 50); this.nota('sine', 70, 0.18, 0.14, 0.25, 0.004, 300, 50); }); }
  morteHeroi() { this.naTela(() => { [392, 349, 311, 262].forEach((f, i) => this.sino(f, i * 0.34, 1.2, 0.08)); this.nota('triangle', 131, 0, 2.2, 0.06, 0.3, 500); }); }
  novoHeroi() { this.naTela(() => [262, 330, 392, 523].forEach((f, i) => this.sino(f, i * 0.1, 0.9, 0.07))); }
  recorde() { this.naTela(() => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.sino(f, i * 0.11, 0.7, 0.07)); this.tambor(0, 0.2); this.tambor(0.33, 0.2); }); }
  historia() { this.naTela(() => { [392, 494, 587, 740, 587].forEach((f, i) => this.sino(f, i * 0.2, 1.2, 0.05)); this.nota('triangle', 98, 0, 2, 0.06, 0.3, 500); }); }
  perigo() { this.naTela(() => { this.tambor(0, 0.3); this.metal(110, 0.02, 0.7, 0.07); this.metal(116.5, 0.04, 0.7, 0.05); }); }
  livre() { this.naTela(() => { this.sino(523, 0, 0.7, 0.05); this.sino(659, 0.13, 0.8, 0.05); }); }
  noite() { this.naTela(() => { this.nota('triangle', 110, 0, 2.6, 0.12, 0.4, 500, 82); this.nota('triangle', 165, 0.1, 2.6, 0.07, 0.5, 500, 123); }); }

  /* ---------- música ambiente: um zumbido grave e um pulso que acelera com o perigo ---------- */
  iniciarMusica() {
    const ac = this.ac;
    const g = ac.createGain(); g.gain.value = 0.22; g.connect(this.mus);
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; f.connect(g);
    [55, 55.4, 82.4].forEach(fr => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(); });
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.08; lg.gain.value = 140; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    // camada de aflição (vida abaixo da metade): acordes dissonantes com tremolo, como cordas nervosas
    this.aflitoG = ac.createGain(); this.aflitoG.gain.value = 0; this.aflitoG.connect(this.mus);
    const trem = ac.createGain(); trem.gain.value = 0.6; trem.connect(this.aflitoG);
    const tl = ac.createOscillator(), tlg = ac.createGain(); tl.frequency.value = 9; tlg.gain.value = 0.4; tl.connect(tlg); tlg.connect(trem.gain); tl.start();
    const fa = ac.createBiquadFilter(); fa.type = 'bandpass'; fa.frequency.value = 700; fa.Q.value = 0.9; fa.connect(trem);
    // lá, si bemol (segunda menor) e mi bemol (trítono): o intervalo mais "errado" da música
    [110, 116.54, 155.56, 233.08].forEach((fr, i) => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = (i % 2 ? 7 : -7); o.connect(fa); o.start(); });
    this.tensao = 0;
    this.aflicao = 0;
    this.passo = 0;
    this.proxPulso = 0;
  }
  // chamado a cada quadro com 0..1 de perigo; vidaBaixa vai de 0 (metade da vida ou mais) a 1 (quase morto)
  musica(perigo, dt, vidaBaixa = 0) {
    if (!this.running) return;
    this.aflicao += (vidaBaixa - this.aflicao) * Math.min(1, dt * 1.5);
    // com a vida abaixo da metade a música nunca fica calma
    const alvo = vidaBaixa > 0 ? Math.max(perigo, 0.6 + vidaBaixa * 0.4) : perigo;
    this.tensao += (alvo - this.tensao) * Math.min(1, dt * 0.8);
    this.aflitoG.gain.setTargetAtTime(this.aflicao > 0.01 ? 0.045 + this.aflicao * 0.09 : 0, this.ac.currentTime, 0.25);
    this.proxPulso -= dt;
    if (this.proxPulso <= 0) {
      const bpm = 70 + this.tensao * 70 + this.aflicao * 30;
      this.proxPulso = 60 / bpm / 2;
      this.passo++;
      if (this.passo % 2 === 0) this.osc('sine', 60, 38, 0.25, 0.25 + this.tensao * 0.25, 0, this.mus);
      if (this.tensao > 0.35 && this.passo % 2 === 1) this.noise(0.04, 0.06 * this.tensao, 'highpass', 6000, 0);
      if (this.passo % 16 === 8) this.osc('triangle', this.aflicao > 0.05 ? 207.65 : this.tensao > 0.6 ? 233 : 196, null, 0.8, 0.05, 0, this.mus);
      // aflito: duas notas agudas que se chocam (semitom), estilo filme de terror
      if (this.aflicao > 0.05 && this.passo % 8 === 4) {
        const v = 0.025 + this.aflicao * 0.035;
        this.osc('sawtooth', 880, 870, 0.35, v, 0, this.mus);
        this.osc('sawtooth', 932.3, 922, 0.35, v, 0.02, this.mus);
      }
    }
  }
}
