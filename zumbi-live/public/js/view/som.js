// Sons feitos na hora pelo navegador (sem arquivos). Os navegadores só liberam o áudio depois de um clique;
// na janela do jogo (atalho 3) ele toca sozinho.
//
// DESIGN DE SOM: uma cidade perigosa que soa calma. Quem assiste está lá no alto (a câmera isométrica), longe
// do chão: ouve a cidade respirando — vento, pássaros de manhã, grilos de noite, um sino distante — e, de vez
// em quando, um perigo bem longe (um grito, um tiro ecoando nos prédios, uma sirene). A música é um tapete
// calmo de acordes com uma caixinha de música; quando o perigo chega perto, entra um pulso grave e suave.
//
// Caminhos do som:
//   mundo     o que acontece na rua (tiro, explosão, zumbi, passos...): passa pela ACÚSTICA abaixo
//   ambiente  a cama do lugar (vento, pássaros, grilos, prédio por dentro) e os perigos ao longe
//   música    o tapete calmo (abaixa um pouco nas explosões e quando o herói está sozinho)
//   tela      avisos da tela (voto, nível, baú, presente...): identidade "16 bits ouvido de longe" (naTela)
//   tudo isso → compressor (cola a mixagem e segura os picos) → saída
//
// ACÚSTICA (física do som, com a câmera no alto como num helicóptero):
//   - a câmera fica CAMERA_ALTURA casas acima do herói: tudo da rua já chega um pouco mais grave
//   - quanto mais longe, mais baixo (o volume cai com 1/distância)
//   - o ar absorve primeiro os agudos (a perda cresce com o quadrado da frequência): de longe só sobra o grave
//   - o som demora a chegar (343 m/s; uma casa tem uns 2,5 m)
//   - ECO DA CIDADE: perto, quase só o som direto; longe, cada vez mais o eco dos prédios (é o que mais faz o
//     ouvido sentir "longe"). Dentro do prédio, o eco é curto, de sala.
//   - ESTÉREO: o som vem do lado da tela onde aconteceu (som.pan, calculado em main.js)
export const CAMERA_ALTURA = 12, METROS_POR_CASA = 2.5, VEL_SOM = 343;
// d = distância em casas, no chão, do herói até onde o som aconteceu
export function acustica(d = 0) {
  const r = Math.hypot(Math.max(0, d), CAMERA_ALTURA), extra = r - CAMERA_ALTURA;
  const vol = CAMERA_ALTURA / r;
  return { vol, corte: 280 + 6500 * Math.exp(-extra / 6), atraso: extra * METROS_POR_CASA / VEL_SOM, eco: Math.min(0.85, 0.16 + (1 - vol) * 1.05) };
}

// Sozinho (sem zumbi na tela): espera em segundos, casas por passo, segundos por respiração, volume da música
export const SOZINHO = { espera: 1.5, passo: 0.55, respiracao: 3.6, musica: 0.7 };

// Avisos da tela uma oitava abaixo (sinos e marimba graves, como ouvidos de longe)
const OITAVA = 0.5;

// Vozes dos zumbis (só ambiente): altura da voz de cada tipo
const VOZ_BASE = { comum: 110, gordo: 78, corredor: 150, explosivo: 92, lobo: 170, esticado: 100, chefao: 62, rei: 50, exheroi: 85 };
// Voz do herói (dor, tombo, grito de guerra): altura de cada personagem
export const VOZ_HEROI = { policial: 118, enfermeira: 215, bombeiro: 196, entregador: 128, mecanico: 104 };

// Ambiente: de quanto em quanto tempo (s) cada coisa toca, por período do dia. [min, max]; null = não toca
export const AMBIENTE_SOM = {
  passaro: { manha: [2, 6], tarde: [6, 14], noite: null, madrugada: [14, 30] },
  grilo: { manha: null, tarde: null, noite: [0.6, 1.8], madrugada: [0.9, 2.4] },
  coruja: { manha: null, tarde: null, noite: [30, 60], madrugada: [18, 36] },
  sino: { manha: [70, 130], tarde: [80, 150], noite: null, madrugada: null },
  cachorro: { manha: [35, 70], tarde: [30, 60], noite: [20, 45], madrugada: [25, 55] },
  perigo: { manha: [24, 48], tarde: [20, 40], noite: [14, 30], madrugada: [16, 34] }   // grito, tiro, sirene, vidro... bem longe
};

const rnd = (a, b) => a + Math.random() * (b - a);
const pick = l => l[Math.floor(Math.random() * l.length)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Som {
  constructor() {
    this.on = true; this.volMusica = 0.35; this.volEfeitos = 0.8;
    this.ac = null; this.ultimo = {};
    this.pan = 0;          // de que lado da tela vem o próximo som (-1 esquerda, 1 direita): main.js põe antes de tocar
    this.espacoAtual = 'rua';
  }
  get running() { return !!this.ac && this.ac.state === 'running'; }

  unlock() {
    if (!this.ac) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.montar(new AC());
    }
    if (this.ac.state === 'suspended') this.ac.resume().catch(() => {});
  }

  // Monta a mesa de som num contexto de áudio (o do navegador, ou um OfflineAudioContext nos testes)
  montar(ac) {
    this.ac = ac;
    // saída: master → compressor (cola e segura os picos) → caixas
    this.master = ac.createGain();
    const comp = ac.createDynamicsCompressor();
    comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.25;
    this.master.connect(comp); comp.connect(ac.destination);
    this.fx = ac.createGain(); this.fx.connect(this.master);
    // mundo → filtro de altura (helicóptero: o ar já levou parte dos agudos) → um pouco mais de grave → fx
    this.mundo = ac.createGain();
    const altura = ac.createBiquadFilter(); altura.type = 'lowpass'; altura.frequency.value = 4800; altura.Q.value = 0.5;
    const grave = ac.createBiquadFilter(); grave.type = 'lowshelf'; grave.frequency.value = 180; grave.gain.value = 4;
    this.mundo.connect(altura); altura.connect(grave); grave.connect(this.fx);
    // eco da cidade (reverberação): cada som manda um pouco pra cá, mais quanto mais longe
    this.ecoIn = ac.createGain();
    this.conv = ac.createConvolver();
    const ecoLp = ac.createBiquadFilter(); ecoLp.type = 'lowpass'; ecoLp.frequency.value = 3200;
    this.ecoOut = ac.createGain(); this.ecoOut.gain.value = 0.9;
    this.ecoIn.connect(this.conv); this.conv.connect(ecoLp); ecoLp.connect(this.ecoOut); this.ecoOut.connect(this.mundo);
    // ruídos: branco (chiado) e marrom (grave, pra estrondo, vento e cidade)
    this.ruido = this.bufferRuido(1.5, false);
    this.marrom = this.bufferRuido(4, true);
    this.irRua = this.impulso(2.6, 3.2, [[0.021, 0.5], [0.047, 0.36], [0.083, 0.3], [0.131, 0.22], [0.19, 0.16], [0.27, 0.1]]);
    this.irSala = this.impulso(0.8, 2.4, [[0.009, 0.5], [0.017, 0.4], [0.026, 0.3], [0.041, 0.2]]);
    this.conv.buffer = this.irRua;
    // saturação suave: cria harmônicos do grave (celular não toca 40 Hz, mas toca 120: o ouvido completa o "buuum")
    this.curvaSat = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; this.curvaSat[i] = (1 + 3) * x / (1 + 3 * Math.abs(x)); }
    // tela (avisos) → sem o brilho de cima → fx, com o eco curto dos consoles de 16 bits (repete 0,19 s depois)
    this.tela = ac.createGain();
    const telaLp = ac.createBiquadFilter(); telaLp.type = 'lowpass'; telaLp.frequency.value = 2000; telaLp.Q.value = 0.5;
    const eco = ac.createDelay(1); eco.delayTime.value = 0.19;
    const ecoTl = ac.createBiquadFilter(); ecoTl.type = 'lowpass'; ecoTl.frequency.value = 1100;
    const ecoG = ac.createGain(); ecoG.gain.value = 0.3;
    this.tela.connect(telaLp); telaLp.connect(this.fx);
    telaLp.connect(eco); eco.connect(ecoTl); ecoTl.connect(ecoG); ecoG.connect(this.fx); ecoG.connect(eco);
    // ambiente: cama do lugar e perigos ao longe → abaixa nas explosões (ambDuck) → fx
    this.ambDuck = ac.createGain(); this.ambDuck.connect(this.fx);
    this.amb = ac.createGain(); this.amb.connect(this.ambDuck);
    // música → soco das explosões (musSoco) → "abaixa quando está sozinho" (musDuck) → master
    this.musDuck = ac.createGain(); this.musDuck.connect(this.master);
    this.musSoco = ac.createGain(); this.musSoco.connect(this.musDuck);
    this.mus = ac.createGain(); this.mus.connect(this.musSoco);
    this.aplicarVolume();
    this.iniciarAmbiente();
    this.iniciarMusica();
  }

  // Ruído em buffer. marrom = cada amostra soma um pouco ao que vinha (grave, como trovão e vento)
  bufferRuido(seg, marrom) {
    const n = Math.floor(this.ac.sampleRate * seg), b = this.ac.createBuffer(1, n, this.ac.sampleRate), d = b.getChannelData(0);
    let y = 0, max = 0;
    for (let i = 0; i < n; i++) {
      const w = Math.random() * 2 - 1;
      if (marrom) { y = (y + 0.02 * w) / 1.02; d[i] = y; } else d[i] = w;
      max = Math.max(max, Math.abs(d[i]));
    }
    if (marrom && max > 0) for (let i = 0; i < n; i++) d[i] /= max;
    return b;
  }

  // Resposta ao impulso (o "eco" de um lugar): reflexões cedo (as paredes dos prédios) e uma cauda que vai
  // ficando mais escura (o ar e as paredes comem os agudos primeiro)
  impulso(seg, decai, cedo) {
    const sr = this.ac.sampleRate, n = Math.floor(sr * seg), b = this.ac.createBuffer(2, n, sr);
    for (let ch = 0; ch < 2; ch++) {
      const d = b.getChannelData(ch);
      let y = 0;
      for (let i = 0; i < n; i++) {
        const t = i / sr, k = i / n;
        const w = (Math.random() * 2 - 1) * Math.pow(1 - k, decai) * (t < 0.015 ? t / 0.015 : 1);
        const a = 0.35 + 0.6 * k;      // escurece com o tempo
        y = y * a + w * (1 - a);
        d[i] = y * 0.9;
      }
      for (const [t, amp] of cedo) { const i = Math.floor((t + (ch ? 0.0037 : 0)) * sr); if (i < n) d[i] += amp * (ch ? 0.85 : 1); }
    }
    return b;
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

  // Rua ou dentro de prédio: muda o eco (sala: curto) e a cama do ambiente
  espaco(qual) {
    if (!this.ac || qual === this.espacoAtual) return;
    this.espacoAtual = qual;
    this.conv.buffer = qual === 'sala' ? this.irSala : this.irRua;
  }

  // Abaixa o ambiente e a música por uns instantes (o "soco" de uma explosão perto)
  abaixar(quanto, seg) {
    if (!this.running) return;
    const t = this.ac.currentTime;
    for (const g of [this.ambDuck.gain, this.musSoco.gain]) {
      g.cancelScheduledValues(t); g.setValueAtTime(g.value, t);
      g.linearRampToValueAtTime(Math.max(0.15, 1 - quanto), t + 0.03);
      g.setTargetAtTime(1, t + 0.1, seg / 3);
    }
  }

  // Toca o que fn() criar como se viesse de d casas do herói (acústica acima), do lado this.pan da tela.
  // dur = quanto dura, no máximo. opts: { pan, vol, eco (força do eco no lugar do calculado), bus (saída) }
  noMundo(d, dur, fn, opts = {}) {
    if (!this.running) return;
    const a = acustica(d), ac = this.ac;
    const g = ac.createGain(); g.gain.value = a.vol * (opts.vol ?? 1);
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = a.corte; f.Q.value = 0.5;
    g.connect(f);
    let saida = f, p = null;
    const pan = clamp(opts.pan ?? this.pan ?? 0, -1, 1);
    if (ac.createStereoPanner && pan) { p = ac.createStereoPanner(); p.pan.value = pan; f.connect(p); saida = p; }
    const eco = ac.createGain(); eco.gain.value = (opts.eco ?? a.eco) * (this.espacoAtual === 'sala' ? 0.7 : 1);
    let dl = null;
    const bus = opts.bus || this.mundo;
    if (a.atraso > 0.004) { dl = ac.createDelay(1); dl.delayTime.value = a.atraso; saida.connect(dl); dl.connect(bus); dl.connect(eco); }
    else { saida.connect(bus); saida.connect(eco); }
    eco.connect(this.ecoIn);
    const antes = this.alvo; this.alvo = g;
    try { fn(); } finally { this.alvo = antes; }
    setTimeout(() => { g.disconnect(); f.disconnect(); p?.disconnect(); dl?.disconnect(); eco.disconnect(); }, (dur + a.atraso + 0.6) * 1000);
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
  // ataque = segundos até o volume cheio (0 = na hora, com estalo; maior = entra suave, sem "tiro"); buf: 'marrom' = grave
  noise(dur, vol, filtro = 'lowpass', freq = 2000, quando = 0, q = 0.7, freq1 = null, ataque = 0, buf = null) {
    if (!this.running) return;
    const t = this.ac.currentTime + quando;
    const s = this.ac.createBufferSource(); s.buffer = buf === 'marrom' ? this.marrom : this.ruido;
    if (dur > s.buffer.duration - 0.2) s.loop = true;   // som longo: o ruído dá a volta
    const f = this.ac.createBiquadFilter(); f.type = filtro; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freq1) f.frequency.exponentialRampToValueAtTime(freq1, t + dur);
    const g = this.ac.createGain();
    if (ataque > 0) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + ataque); }
    else g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(dur, ataque + 0.02));
    s.connect(f); f.connect(g); g.connect(this.alvo || this.fx);
    s.start(t, Math.random() * (s.buffer.duration - dur - 0.1 > 0 ? s.buffer.duration - dur - 0.1 : 0.01)); s.stop(t + dur + 0.05);
  }
  // um "tim" curtinho (caco de vidro, metal): seno com ataque de 2 ms e queda rápida
  ping(f, dur, vol, quando = 0) {
    if (!this.running) return;
    const t = this.ac.currentTime + quando, o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = 'sine'; o.frequency.value = f;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.alvo || this.fx); o.start(t); o.stop(t + dur + 0.03);
  }
  // metal batendo: parciais inarmônicas (o "blém" do pé de cabra, de uma lata, de um cano)
  metalico(fs, dur, vol, quando = 0) { fs.forEach((f, i) => this.ping(f, dur * (1 - i * 0.18), vol / (1 + i * 0.6), quando)); }

  /* ---------- explosão: o "buuum" ---------- */
  // Ouvida do alto: um seno bem grave caindo (a onda de pressão) + a mesma coisa SATURADA (harmônicos de 100-300 Hz
  // que o celular toca: o ouvido "completa" o grave que a caixinha não tem), o estrondo rolando (ruído marrom com o
  // filtro descendo: o "uuum"), um estalo só quando é perto, a cauda ecoando nos prédios e destroços caindo.
  // Abaixa a música e o ambiente por um instante (o soco).
  explosao(raio = 1.6, d = 3) {
    if (!this.pode('explosao', 0.07)) return;
    const agora = performance.now();
    this.expRecentes = (this.expRecentes || []).filter(t => agora - t < 700); this.expRecentes.push(agora);
    const k = 1 / Math.sqrt(this.expRecentes.length), tam = clamp(raio / 1.8, 0.6, 1.6), perto = clamp(1 - d / 14, 0, 1);
    this.abaixar(0.5 * k * (0.35 + 0.65 * perto), 1.6);
    this.noMundo(d, 5.5, () => {
      const ac = this.ac, t = ac.currentTime;
      const sat = ac.createWaveShaper(); sat.curve = this.curvaSat; sat.oversample = '2x';
      const satG = ac.createGain(); satG.gain.value = 0.3 * k; sat.connect(satG); satG.connect(this.alvo);
      for (const [f0, f1, v, dur] of [[56, 24, 0.75, 1.9], [84, 36, 0.38, 1.4], [41, 22, 0.45, 2.4]]) {
        const o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * tam * 0.8);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v * k, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur * tam);
        o.connect(g); g.connect(this.alvo); g.connect(sat); o.start(t); o.stop(t + dur * tam + 0.1);
      }
      this.noise(2.6 * tam, 0.65 * k, 'lowpass', 750, 0, 0.9, 65, 0.012, 'marrom');        // o estrondo rolando ("uuum")
      this.noise(0.06, 0.32 * k, 'bandpass', 1400, 0, 0.8, 500, 0.002);                     // o estalo (de longe a acústica corta)
      this.noise(3.4 * tam, 0.2 * k, 'lowpass', 170, 0.22, 0.7, 40, 0.35, 'marrom');        // a cauda nos prédios
      if (perto > 0.25) for (let i = 0; i < 8; i++) this.noise(rnd(0.03, 0.08), 0.05 * perto * k, 'bandpass', rnd(1500, 4200), rnd(0.35, 1.5), 2.5, null, 0.002);   // destroços caindo
    }, { eco: 0.55 });
  }

  /* ---------- vidro quebrando ---------- */
  // O estalo, o corpo estilhaçando e os cacos: pares de frequências inarmônicas (vidro não tem nota), curtíssimos,
  // caindo cada vez mais espaçados; no fim, pedaços maiores batendo no chão. forca 0..1+
  quebrarVidro(forca = 1, quando = 0) {
    this.noise(0.022, 0.34 * forca, 'highpass', 4200, quando, 0.7);
    this.noise(0.16, 0.2 * forca, 'bandpass', 3300, quando, 1.4, 2100, 0.002);
    for (let i = 0; i < 18; i++) {
      const q = quando + 0.01 + Math.pow(Math.random(), 1.7) * 0.75, f = rnd(2300, 7200), v = 0.032 * forca * (1 - (q - quando) / 1.1);
      this.ping(f, rnd(0.03, 0.1), v, q); this.ping(f * 1.47, rnd(0.02, 0.06), v * 0.6, q);
    }
    for (let i = 0; i < 3; i++) this.noise(0.05, 0.06 * forca, 'bandpass', rnd(450, 1000), quando + rnd(0.15, 0.6), 2, null, 0.002);
  }
  vidro(d = 0) { this.noMundo(d, 1.2, () => this.quebrarVidro(1.2)); }
  // pisando em cacos: o crec-crec (não é uma quebra inteira)
  crocante(d = 0) { this.noMundo(d, 0.5, () => { for (let i = 0; i < 5; i++) this.noise(0.012, rnd(0.05, 0.1), 'highpass', rnd(3000, 5500), i * rnd(0.012, 0.03), 1); this.ping(rnd(3000, 5000), 0.04, 0.02, 0.02); }); }

  /* ---------- alarme de carro (explosão perto de um carro parado) ---------- */
  // Primeiro os vidros estouram; depois o alarme de verdade, passando pelos padrões de um alarme comum:
  // "uiu-uiu" (sobe e desce), bipes rápidos e o "uô-uô" alternado. Sai de uma cornetinha de carro (filtro estreito).
  // O alarme fica NO CARRO: enquanto toca, o volume, o abafamento, o eco e o lado acompanham o herói a cada quadro
  // (atualizarAlarmes). Ele se afastando, o alarme vai baixando até sumir.
  alarmeCarro(seg = 9, d = 6, pos = null) {
    if (!this.running) return;
    const ac = this.ac;
    const g = ac.createGain(), lp = ac.createBiquadFilter(), eco = ac.createGain();
    lp.type = 'lowpass'; lp.Q.value = 0.5;
    g.connect(lp);
    let saida = lp, p = null;
    if (ac.createStereoPanner) { p = ac.createStereoPanner(); lp.connect(p); saida = p; }
    saida.connect(this.mundo); saida.connect(eco); eco.connect(this.ecoIn);
    const al = { g, lp, p, eco, pos, ate: ac.currentTime + seg + 0.8 };
    this.posicionar(al, d, this.pan, true);
    const antes = this.alvo; this.alvo = g;
    try {
      this.quebrarVidro(0.7);
      let t = 0.35;
      for (const [tipo, dur] of [['uiu', 2.4], ['bip', 1.6], ['uo', 2.2], ['uiu', 2.4], ['bip', 1.6], ['uo', 2.2]]) {
        if (t >= seg) break;
        this.padraoAlarme(tipo, t, Math.min(dur, seg - t));
        t += dur;
      }
    } finally { this.alvo = antes; }
    (this.alarmes ||= []).push(al);
    setTimeout(() => { g.disconnect(); lp.disconnect(); p?.disconnect(); eco.disconnect(); }, (seg + 1.5) * 1000);
  }
  // põe um som contínuo (alarme) a d casas do herói, do lado pan; longe de verdade (25+ casas), some aos poucos
  posicionar(al, d, pan = 0, ja = false) {
    const a = acustica(d), t = this.ac.currentTime, some = clamp(1 - (d - 22) / 22, 0, 1), k = ja ? 0.001 : 0.18;
    al.g.gain.setTargetAtTime(a.vol * some, t, k);
    al.lp.frequency.setTargetAtTime(a.corte, t, k);
    al.eco.gain.setTargetAtTime(a.eco * some, t, k);
    if (al.p) al.p.pan.setTargetAtTime(clamp(pan, -1, 1), t, k);
  }
  // a cada quadro: onde = pos => [distância, lado] (main.js)
  atualizarAlarmes(onde) {
    if (!this.alarmes?.length || !this.running) return;
    const t = this.ac.currentTime;
    this.alarmes = this.alarmes.filter(al => al.ate > t);
    for (const al of this.alarmes) if (al.pos) { const [d, pan] = onde(al.pos); this.posicionar(al, d, pan); }
  }
  padraoAlarme(tipo, quando, dur) {
    const ac = this.ac, t0 = ac.currentTime + quando;
    const o = ac.createOscillator(); o.type = 'square';
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1500; bp.Q.value = 0.8;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0);
    o.connect(bp); bp.connect(g); g.connect(this.alvo || this.fx);
    const v = 0.075;
    if (tipo === 'uiu') {
      g.gain.linearRampToValueAtTime(v, t0 + 0.02);
      for (let t = 0; t < dur; t += 0.34) { o.frequency.setValueAtTime(700, t0 + t); o.frequency.linearRampToValueAtTime(1650, t0 + t + 0.3); }
      g.gain.setValueAtTime(v, t0 + dur - 0.02); g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    } else if (tipo === 'bip') {
      o.frequency.value = 1250;
      for (let t = 0; t + 0.1 < dur; t += 0.18) { g.gain.setValueAtTime(v, t0 + t); g.gain.setValueAtTime(0.0001, t0 + t + 0.09); }
    } else {
      g.gain.linearRampToValueAtTime(v, t0 + 0.02);
      for (let t = 0, k = 0; t < dur; t += 0.28, k++) o.frequency.setValueAtTime(k % 2 ? 1350 : 950, t0 + t);
      g.gain.setValueAtTime(v, t0 + dur - 0.02); g.gain.linearRampToValueAtTime(0.0001, t0 + dur);
    }
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  // Veículo de emergência passando (cenario.js): a sirene de cada um (viatura: "uiôôô" sobe e desce; ambulância:
  // o "iu-iu-iu" rápido; bombeiros: mais grave, com a buzina), com o Doppler (mais aguda chegando, mais grave indo
  // embora), o volume, o abafamento e o lado acompanhando a posição. amostras = [{ t, d, pan, vr }] (vr: m/s, + chegando)
  sirenePassando(tipo, amostras, dur) {
    if (!this.running || !amostras.length) return;
    const ac = this.ac, t0 = ac.currentTime;
    const o = ac.createOscillator(); o.type = tipo === 'bombeiros' ? 'sawtooth' : 'square';
    const bp = ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = tipo === 'bombeiros' ? 900 : 1300; bp.Q.value = 0.9;
    const g = ac.createGain(), lp = ac.createBiquadFilter(), eco = ac.createGain();
    lp.type = 'lowpass'; lp.Q.value = 0.5;
    o.connect(bp); bp.connect(g); g.connect(lp);
    let saida = lp, p = null;
    if (ac.createStereoPanner) { p = ac.createStereoPanner(); lp.connect(p); saida = p; }
    saida.connect(this.mundo); saida.connect(eco); eco.connect(this.ecoIn);
    // a nota da sirene em cada instante (antes do Doppler)
    const nota = t => tipo === 'policia' ? 700 + 650 * (0.5 - 0.5 * Math.cos(2 * Math.PI * t / 2.2))
      : tipo === 'ambulancia' ? 760 + 640 * ((t / 0.36) % 1)
      : 480 + 560 * (0.5 - 0.5 * Math.cos(2 * Math.PI * t / 3));
    const em = t => { let a = amostras[0]; for (const x of amostras) { if (x.t > t) break; a = x; } return a; };
    g.gain.setValueAtTime(0.0001, t0); lp.frequency.setValueAtTime(300, t0);
    for (let t = 0; t <= dur; t += 0.025) {
      const a = em(t), A = acustica(a.d), some = clamp(1 - (a.d - 24) / 18, 0, 1);
      o.frequency.linearRampToValueAtTime(nota(t) * VEL_SOM / (VEL_SOM - clamp(a.vr, -120, 120)), t0 + t);
      g.gain.linearRampToValueAtTime(Math.max(0.0001, 0.09 * A.vol * some), t0 + t);
      lp.frequency.linearRampToValueAtTime(A.corte, t0 + t);
      eco.gain.linearRampToValueAtTime(A.eco * some, t0 + t);
      if (p) p.pan.linearRampToValueAtTime(clamp(a.pan, -1, 1), t0 + t);
    }
    g.gain.linearRampToValueAtTime(0.0001, t0 + dur + 0.2);
    o.start(t0); o.stop(t0 + dur + 0.3);
    // bombeiros: a buzina grave (dois tons) no meio da passagem
    if (tipo === 'bombeiros') {
      const meio = amostras.reduce((m, x) => (x.d < m.d ? x : m), amostras[0]);
      for (const q of [meio.t - 0.6, meio.t + 0.2]) if (q > 0) setTimeout(() => this.noMundo(meio.d, 1, () => { this.nota('sawtooth', 220, 0, 0.5, 0.06, 0.02, 900); this.nota('sawtooth', 277, 0, 0.5, 0.05, 0.02, 900); }, { pan: meio.pan }), q * 1000);
    }
    setTimeout(() => { g.disconnect(); lp.disconnect(); p?.disconnect(); eco.disconnect(); bp.disconnect(); }, (dur + 1) * 1000);
  }
  // alguém gritando da janela de um prédio (cenario.js): voz humana lá do alto, com o eco da rua
  janela(d, texto, socorro = false) {
    if (socorro) { this.socorro(d, texto.toUpperCase().startsWith('ME') ? 'ME AJUDA!' : 'SOCORRO!', rnd(0.85, 1.2)); return; }
    if (!this.pode('janela', 1)) return;
    const f = rnd(170, 330), n = Math.max(2, Math.min(5, Math.round(texto.length / 5)));
    this.noMundo(d, 2, () => {
      let q = 0;
      for (let i = 0; i < n; i++) { const dur = i === n - 1 ? 0.32 : rnd(0.09, 0.14), sobe = i === n - 1 && texto.includes('?'); this.voz(f * rnd(0.95, 1.08), f * (sobe ? 1.25 : 0.9), dur, 0.11, [[rnd(500, 850), 5, 1.4], [rnd(1000, 1500), 6, 0.5], [2700, 8, 0.12]], q, 0.08, 0.02); q += dur + 0.03; }
    }, { eco: 0.55 });
  }
  // fogo por perto (lixeira, carro ou prédio pegando fogo): o crepitar, mais forte quanto mais perto (d em casas)
  crepitar(dt, d) {
    if (!this.running || !(d < 9)) return;
    this.fogoT = (this.fogoT ?? 0) - dt;
    if (this.fogoT > 0) return;
    const k = 1 - d / 9;
    this.fogoT = rnd(0.05, 0.18) / (0.3 + k);
    this.noMundo(d, 0.3, () => { this.noise(rnd(0.008, 0.02), 0.05 + 0.08 * k, 'bandpass', rnd(1800, 4200), 0, 1.5); if (Math.random() < 0.25) this.noise(0.3, 0.03 * k, 'lowpass', 500, 0, 0.7, 200, 0.05, 'marrom'); }, { eco: 0.2, bus: this.amb });
  }

  // alarme de presente (o carro novo piscando na rua) e o alarme do prédio
  alarme(seg = 6, sala = false, pos = null) {
    if (!this.running) return;
    if (!sala) { this.alarmeCarro(seg, 5, pos); return; }
    // alarme do prédio: campainha de incêndio (sino elétrico martelando)
    this.noMundo(3, seg + 1, () => { for (let i = 0; i < seg * 14; i++) this.metalico([2200, 3150, 4400], 0.06, 0.03, i / 14); }, { eco: 0.6 });
  }

  /* ---------- armas ---------- */
  // Tiro ouvido do alto: o estampido (curto e seco), o corpo grave, o eco batendo nos prédios (o tiro na cidade
  // "rola" pelas ruas) e, na pistola, a cápsula tilintando no chão.
  tiro(arma) {
    this.noMundo(0, 1.6, () => {
      if (arma === 'metralhadora') { if (!this.pode('mg', 0.07)) return; this.noise(0.04, 0.2, 'bandpass', 1800, 0, 0.8, 600); this.osc('sine', 120, 45, 0.05, 0.14); return; }
      if (arma === 'escopeta') {
        this.noise(0.03, 0.35, 'bandpass', 2000, 0, 0.7);
        this.noise(0.28, 0.42, 'lowpass', 1500, 0, 0.7, 140); this.osc('sine', 88, 30, 0.2, 0.42);
        this.noise(0.05, 0.12, 'bandpass', 1600, 0.45, 3); this.noise(0.04, 0.12, 'bandpass', 2300, 0.58, 3);   // pump: "tchk-tchk"
        return;
      }
      if (arma === 'drone') { if (!this.pode('drone', 0.06)) return; this.noise(0.03, 0.08, 'bandpass', 2600, 0, 1.4); this.osc('square', 900, 400, 0.04, 0.02); return; }
      if (!this.pode('tiro', 0.05)) return;
      this.noise(0.025, 0.26, 'bandpass', 2600, 0, 0.8);                    // o estalo
      this.noise(0.1, 0.22, 'lowpass', 1300, 0, 0.6, 160); this.osc('sine', 140, 48, 0.08, 0.22);   // o corpo
      this.metalico([3400, 4900], 0.05, 0.012, 0.32);                       // a cápsula no chão
    }, { eco: 0.4 });
  }
  // tiro do ajudante (sobrevivente): o mesmo da pistola, com a distância
  tiroAliado(d = 3) { if (this.pode('tiroA', 0.05)) this.noMundo(d, 1.4, () => { this.noise(0.025, 0.24, 'bandpass', 2600, 0, 0.8); this.noise(0.1, 0.2, 'lowpass', 1300, 0, 0.6, 160); this.osc('sine', 140, 48, 0.08, 0.2); }); }
  chama() { if (this.pode('chama', 0.09)) this.noMundo(0, 0.4, () => this.noise(0.16, 0.18, 'lowpass', 900, 0, 0.5, 350, 0.02, 'marrom')); }
  // bala acertando carne: um "tchak" abafado
  acerto(d = 2) { if (this.pode('acerto', 0.05)) this.noMundo(d, 0.3, () => { this.noise(0.05, 0.14, 'bandpass', 600, 0, 1.2, 300, 0.002); this.osc('sine', 130, 70, 0.05, 0.08); }); }

  // Golpe de perto: o vento da arma passando e, se acertou, o impacto de cada arma (é o som que vende a luta)
  //   faca: corte rápido e molhado · machado: talho pesado · taco: madeira "tók" · pé de cabra: ferro "blém" ·
  //   lanterna: pancada abafada e o chocalhar das pilhas · chave: metal "tlim" · empurrão: o baque do corpo
  golpe(arma = 'empurrao', acertos = 1) {
    this.noMundo(0.4, 0.8, () => {
      const pesado = arma === 'machado' || arma === 'pe_de_cabra' || arma === 'beisebol' || arma === 'taco';
      this.noise(pesado ? 0.16 : 0.1, pesado ? 0.07 : 0.05, 'bandpass', pesado ? 500 : 900, 0, 1.4, pesado ? 1600 : 2600, pesado ? 0.06 : 0.03);   // o vento
      if (!acertos) return;
      const q = pesado ? 0.09 : 0.05;
      const carne = (v, q0 = q) => { this.noise(0.07, v, 'bandpass', 520, q0, 1.4, 260, 0.003); this.osc('sine', 120, 60, 0.07, v * 0.8, q0); };
      switch (arma) {
        case 'faca': this.noise(0.04, 0.12, 'highpass', 3200, q, 1); carne(0.12); break;
        case 'machado': this.osc('sine', 110, 50, 0.12, 0.3, q); this.noise(0.09, 0.2, 'bandpass', 1100, q, 1.4, 500, 0.002); carne(0.16, q + 0.02); break;
        case 'beisebol': case 'taco': this.noise(0.05, 0.2, 'bandpass', 950, q, 6, null, 0.001); this.osc('sine', 105, 55, 0.1, 0.2, q); carne(0.1); break;
        case 'pe_de_cabra': this.metalico([640, 1190, 1760, 2510], 0.32, 0.06, q); this.osc('sine', 100, 50, 0.1, 0.18, q); carne(0.1); break;
        case 'lanterna': this.osc('sine', 125, 60, 0.08, 0.22, q); this.noise(0.03, 0.06, 'bandpass', 2600, q + 0.04, 3); this.noise(0.03, 0.05, 'bandpass', 2300, q + 0.09, 3); carne(0.08); break;
        case 'chave': this.metalico([1520, 2310, 3170], 0.18, 0.05, q); this.osc('sine', 115, 60, 0.08, 0.2, q); carne(0.08); break;
        default: this.osc('sine', 95, 50, 0.1, 0.24, q); this.noise(0.08, 0.1, 'lowpass', 500, q); break;
      }
    });
  }

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
        this.voz(f, f * 0.5, 0.9 * longo, vol, [[380, 4, 1.5], [720, 5, 0.5]], 0, 0.25, 0.03);
        this.noise(0.7 * longo, vol * 0.45, 'bandpass', 480, 0.5 * longo, 1.2, 200, 0.08);
      } else if (qual === 1) {
        this.noise(0.28, vol * 0.45, 'bandpass', 700, 0, 2.5, 1000, 0.12);
        this.voz(f * 1.1, f * 0.6, 0.6 * longo, vol, [[460, 4, 1.4], [850, 5, 0.5]], 0.26, 0.4);
        this.noise(0.5 * longo, vol * 0.35, 'bandpass', 450, 0.7, 1.2, 180, 0.06);
      } else {
        this.voz(f * 0.8, f * 0.55, 1.1 * longo, vol * 0.9, [[380, 4, 1.4], [820, 5, 0.7]], 0, 0.95);
        this.noise(0.9 * longo, vol * 0.3, 'bandpass', 420, 0.2, 1.5, 160, 0.15);
      }
      this.noise(0.12, vol * 0.5, 'lowpass', 300, 0.35 * longo, 0.7, 90, 0.01);   // o corpo caindo no chão
      if (chefe) this.nota('sine', 80, 0.15, 0.6, 0.25 * k, 0.004, 300, 38);
    });
  }

  // Mordida no herói: a dentada (crocante, molhada) e o herói gemendo de dor (a voz dele)
  mordida(chefe, classe = null) {
    if (!this.pode('mordida', 0.15)) return;
    this.noMundo(0.5, 0.6, () => {
      this.noise(0.1, chefe ? 0.36 : 0.24, 'lowpass', chefe ? 380 : 900, 0, 0.8, 200);
      this.noise(0.05, 0.12, 'bandpass', 1500, 0.01, 2);
      this.osc('sine', chefe ? 90 : 150, 50, 0.12, 0.26);
    });
    if (classe && this.pode('dor', 0.9)) this.vozHeroi('dor', classe);
  }

  /* ---------- voz do herói ---------- */
  // dor ("uh!"), tombo ("uff") e grito de guerra ("HAAA!"): a voz passa pelos formantes do "a"
  vozHeroi(tipo, classe = 'policial') {
    const f = (VOZ_HEROI[classe] || 120) * rnd(0.95, 1.05), fem = f > 170;
    const A = fem ? [[850, 5, 1.4], [1350, 6, 0.5], [2900, 8, 0.12]] : [[700, 5, 1.4], [1150, 6, 0.5], [2600, 8, 0.12]];
    this.noMundo(0.3, 1.4, () => {
      if (tipo === 'dor') { this.voz(f * 1.25, f * 0.85, 0.22, 0.11, A, 0, 0.15); this.noise(0.12, 0.03, 'bandpass', 1200, 0.02, 1.5, 600, 0.02); }
      else if (tipo === 'tombo') { this.voz(f * 1.05, f * 0.7, 0.26, 0.1, [[500, 5, 1.4], [900, 6, 0.4]], 0, 0.2); this.noise(0.2, 0.05, 'bandpass', 700, 0, 1.2, 300, 0.02); }
      else { this.voz(f * 1.1, f * 1.3, 0.75, 0.14, A, 0, 0.55, 0.02); this.noise(0.7, 0.04, 'bandpass', 1100, 0, 1, 900, 0.05); }
    });
  }
  // tropeçou: o pé raspando, o tombo no chão e o "uff"
  tropecou(classe) {
    this.noMundo(0.3, 0.9, () => {
      this.noise(0.12, 0.08, 'bandpass', 900, 0, 1.3, 400, 0.01);
      this.osc('sine', 90, 45, 0.18, 0.18, 0.16); this.noise(0.18, 0.09, 'lowpass', 500, 0.16, 0.7, 120, 0.004);
    });
    this.vozHeroi('tombo', classe);
  }

  /* ---------- zumbis ---------- */
  // devorando alguém: mastigar molhado, rasgar e o rosnado baixo de boca cheia
  devorando(d = 6) {
    if (!this.pode('devora', 0.5)) return;
    this.noMundo(d, 1.4, () => {
      const n = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < n; i++) { const q = i * rnd(0.14, 0.24); this.noise(rnd(0.05, 0.09), 0.1, 'bandpass', rnd(350, 750), q, 1.6, 220, 0.004); }
      if (Math.random() < 0.6) this.noise(0.14, 0.05, 'highpass', 2200, rnd(0.2, 0.5), 1, 900, 0.01);   // rasgando
      this.voz(rnd(80, 100), 70, 0.8, 0.06, [[380, 4, 1.4], [800, 5, 0.4]], 0.1, 0.8);
    });
  }
  // notou o herói: levanta e rosna alto
  notou(d = 4, tipo = 'comum') {
    const f = (VOZ_BASE[tipo] || 110) * rnd(0.9, 1.05);
    this.noMundo(d, 1.4, () => { this.voz(f * 1.25, f * 0.75, 0.95, 0.2, [[480, 4, 1.5], [1000, 5, 0.6]], 0, 0.75); this.noise(0.6, 0.06, 'bandpass', 600, 0, 1.2, 300, 0.05); });
  }
  // preparando o bote (duelo): puxa o ar chiando e o rosnado sobe — dá pra ouvir que ele vai pular
  botePreparo(d = 1.5) {
    if (!this.pode('botep', 0.25)) return;
    this.noMundo(d, 0.7, () => { this.noise(0.42, 0.16, 'bandpass', 850, 0, 2, 1700, 0.3); this.voz(95, 140, 0.45, 0.15, [[420, 4, 1.4], [900, 5, 0.4]], 0, 0.6); });
  }
  bote(d = 1) { if (this.pode('bote', 0.2)) this.noMundo(d, 0.5, () => { this.noise(0.14, 0.08, 'bandpass', 700, 0, 1.2, 1600, 0.01); this.voz(150, 100, 0.2, 0.1, [[480, 4, 1.4], [950, 5, 0.4]], 0, 0.5); }); }
  // o pé arrastando no chão (zumbi perto)
  arrastar(d = 3) { this.noMundo(d, 0.5, () => this.noise(rnd(0.22, 0.34), 0.05, 'bandpass', rnd(380, 620), 0, 1.1, rnd(250, 400), 0.07)); }

  latido(d = 1) { if (this.pode('latido', 0.5)) this.noMundo(d, 0.6, () => { this.ladrar(0); this.ladrar(0.16); }); }
  ladrar(q) { this.voz(rnd(420, 520), 300, 0.11, 0.09, [[900, 4, 1.2], [1800, 5, 0.4]], q, 0.3); }
  helicoptero() {
    if (!this.running) return;
    this.noMundo(4, 4.5, () => { for (let i = 0; i < 40; i++) this.noise(0.05, Math.max(0.02, 0.25 * Math.sin(i / 40 * Math.PI)), 'lowpass', 500, i * 0.1); });
  }

  /* ---------- gente ---------- */
  // Pessoa gritando por socorro: voz humana (formantes do "ó" e do "a") nas sílabas da frase, com o choro tremendo.
  // Cada pessoa tem a sua altura de voz (agudo = alto, grave = baixo)
  socorro(d = 6, texto = 'SOCORRO!', altura = 1) {
    if (!this.pode('socorro', 1.2)) return;
    const f = 290 * altura * rnd(0.92, 1.08);
    const silabas = texto.startsWith('ME') ? [0.13, 0.12, 0.5] : texto.startsWith('POR') ? [0.12, 0.14, 0.45] : texto.startsWith('AA') ? [0.8] : [0.11, 0.11, 0.55];
    this.noMundo(d, 2, () => {
      let q = 0;
      silabas.forEach((dur, i) => {
        const ult = i === silabas.length - 1;
        this.voz(f * (ult ? 1.18 : 1 + i * 0.05), f * (ult ? 0.85 : 1.02), dur, ult ? 0.2 : 0.15, [[ult ? 820 : 520, 5, 1.4], [ult ? 1300 : 950, 6, 0.6], [2700, 8, 0.15]], q, ult ? 0.25 : 0.1, 0.05);
        q += dur + 0.03;
      });
      this.noise(0.4, 0.02, 'bandpass', 1500, q, 1.2, 900, 0.1);   // o soluço depois
    }, { eco: 0.5 });
  }
  // salvou: um suspiro de alívio e um "obrigada" baixinho
  alivio(d = 2, altura = 1) {
    const f = 270 * altura;
    this.noMundo(d, 1.6, () => { this.noise(0.5, 0.04, 'bandpass', 700, 0, 1.2, 400, 0.15); this.voz(f, f * 0.8, 0.25, 0.06, [[500, 5, 1.4], [900, 6, 0.4]], 0.5); this.voz(f * 0.95, f * 0.75, 0.35, 0.06, [[750, 5, 1.4], [1200, 6, 0.4]], 0.8); });
  }
  grito(d = 6) { this.socorro(d, 'AAAH!', rnd(0.9, 1.2)); }

  /* ---------- habilidades ---------- */
  // arremesso (granada, molotov, gelo, míssil): o braço jogando ("fffu", entrando suave pra não parecer tiro)
  arremesso(tipo = 'granada') {
    if (!this.pode('arr', 0.15)) return;
    this.noMundo(0, 0.5, () => {
      if (tipo === 'missil') { this.noise(0.5, 0.1, 'bandpass', 1800, 0, 0.8, 600, 0.03); return; }
      this.noise(0.26, 0.12, 'bandpass', 380, 0, 1.4, 950, 0.1);
    });
  }
  // onde o arremesso cai: granada quica (metal), molotov estoura a garrafa e o fogo pega ("vuf"), gelo trinca
  caiu(tipo, d = 3) {
    this.noMundo(d, 1.4, () => {
      if (tipo === 'molotov') { this.quebrarVidro(0.55); this.noise(0.9, 0.16, 'lowpass', 1200, 0.03, 0.6, 260, 0.06, 'marrom'); }
      else if (tipo === 'gelo') this.gelinho();
      else if (tipo === 'granada') { this.metalico([1800, 2900], 0.06, 0.04, 0); this.metalico([1700, 2800], 0.05, 0.025, 0.14); }
    });
  }
  // gelo: estalos de cristal e um brilho frio subindo
  gelinho() { for (let i = 0; i < 9; i++) this.ping(rnd(3000, 6500), rnd(0.04, 0.12), 0.025, i * rnd(0.02, 0.05)); this.noise(0.5, 0.05, 'highpass', 4000, 0, 1, 7000, 0.05); }
  gelo(d = 2) { this.noMundo(d, 0.9, () => { this.gelinho(); this.osc('sine', 1200, 2400, 0.5, 0.025); }); }
  zap(d = 2) { if (this.pode('zap', 0.1)) this.noMundo(d, 0.8, () => { this.noise(0.15, 0.2, 'highpass', 3000); this.osc('sawtooth', 900, 200, 0.15, 0.07); this.noise(0.6, 0.06, 'lowpass', 220, 0.08, 0.7, 60, 0.05, 'marrom'); }); }
  onda(d = 0) { this.noMundo(d, 0.8, () => { this.osc('sine', 120, 38, 0.45, 0.34); this.noise(0.4, 0.2, 'lowpass', 700, 0, 0.7, 90, 0.01, 'marrom'); }); }
  escudo() { this.noMundo(0, 1.2, () => { [523, 659, 784].forEach((f, i) => this.osc('triangle', f, f * 1.5, 0.7, 0.03, i * 0.05)); this.noise(0.6, 0.04, 'bandpass', 2400, 0, 2, 4800, 0.2); }); }
  escudoBloqueou() { this.noMundo(0, 0.6, () => { this.osc('triangle', 1400, 700, 0.25, 0.06); this.noise(0.12, 0.08, 'highpass', 2500, 0, 1); }); }
  ima(d = 1) { if (this.pode('ima', 0.4)) this.noMundo(d, 1, () => { this.osc('sawtooth', 60, 180, 0.8, 0.05); this.osc('sine', 120, 360, 0.8, 0.05); this.noise(0.8, 0.03, 'bandpass', 2000, 0, 3, 3500, 0.3); }); }
  algemas(d = 2) { this.noMundo(d, 0.6, () => { for (let i = 0; i < 5; i++) this.metalico([2600, 3900], 0.035, 0.03, i * 0.045); }); }
  sirene() { this.noMundo(0, 1.8, () => { const o = this.ac.createOscillator(), g = this.ac.createGain(), t = this.ac.currentTime; o.type = 'sawtooth'; o.frequency.setValueAtTime(600, t); o.frequency.linearRampToValueAtTime(1300, t + 0.7); o.frequency.linearRampToValueAtTime(600, t + 1.4); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.05); g.gain.setValueAtTime(0.05, t + 1.35); g.gain.linearRampToValueAtTime(0.0001, t + 1.5); const bp = this.ac.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1000; o.connect(bp); bp.connect(g); g.connect(this.alvo); o.start(t); o.stop(t + 1.55); }); }
  seringa() { this.noMundo(0, 0.8, () => { this.noise(0.2, 0.06, 'highpass', 3500, 0, 1, 6000, 0.02); this.osc('sine', 70, 50, 0.14, 0.2, 0.3); this.osc('sine', 70, 50, 0.14, 0.15, 0.5); }); }
  gritoGuerra(classe, grande = false) { this.vozHeroi('guerra', classe); if (grande) this.noMundo(0, 1.2, () => this.noise(0.9, 0.12, 'lowpass', 400, 0.1, 0.7, 120, 0.1, 'marrom')); }

  rosnado(d = 2) { if (this.pode('rosna', 0.3)) this.noMundo(d, 0.5, () => { this.voz(140, 90, 0.3, 0.12, [[600, 4, 1.4], [1300, 5, 0.4]], 0, 0.8); this.noise(0.2, 0.1, 'lowpass', 700); }); }
  esticar(d = 2) { if (this.pode('estica', 0.2)) this.noMundo(d, 0.4, () => this.noise(0.18, 0.12, 'bandpass', 900, 0, 1, 2200)); }
  pousou() { this.noMundo(1, 0.3, () => this.noise(0.1, 0.2, 'lowpass', 400)); }
  porta() { this.noMundo(0.5, 0.8, () => { this.noise(0.45, 0.06, 'bandpass', 520, 0, 6, 380, 0.06); this.noise(0.3, 0.2, 'lowpass', 600, 0.35, 3, 200); this.osc('sine', 80, 60, 0.3, 0.2, 0.35); }); }   // dobradiça rangendo + a porta batendo
  ambiente(tipo) {
    if (!this.pode('amb' + tipo, 0.8)) return;
    if (tipo === 'vidro') { this.crocante(); return; }
    this.noMundo(0, 0.6, () => {
      if (tipo === 'fios') { this.osc('sawtooth', 120, 2400, 0.12, 0.12); this.noise(0.15, 0.25, 'highpass', 3000); }
      else if (tipo === 'fogo') this.noise(0.4, 0.22, 'lowpass', 900, 0, 0.5, 300, 0.02, 'marrom');
      else if (tipo === 'acido') { this.noise(0.25, 0.15, 'bandpass', 2500, 0, 2); this.osc('sine', 900, 300, 0.2, 0.05); }
      else if (tipo === 'arame') { this.metalico([1800, 2700], 0.08, 0.05); this.noise(0.1, 0.15, 'highpass', 4000); }
      else if (tipo === 'lama') this.noise(0.22, 0.14, 'bandpass', 500, 0, 1.4, 220, 0.02);
    });
  }

  /* ---------- atrapalhar com 1 moeda (recompensas.js) ---------- */
  // Conversível passando pelo herói: o motor (grave, rouco) vem de longe, passa e vai embora. Física: o volume e
  // os agudos seguem a distância (acustica) e o Doppler muda a altura (mais agudo chegando, mais grave indo).
  // Buzina "fom-fom" quando aparece e a festa dos zumbis ("uhuu!") quando passa.
  conversivel(D = 16, vel = 9) {
    if (!this.running) return;
    const ac = this.ac, t0 = ac.currentTime, T = 2 * D / vel, N = 30;
    const o = ac.createOscillator(); o.type = 'sawtooth';
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 0.8;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0);
    const am = ac.createOscillator(), amg = ac.createGain(); am.frequency.value = 22; amg.gain.value = 0.35;   // ronco do motor
    const ronco = ac.createGain(); ronco.gain.value = 0.65; am.connect(amg); amg.connect(ronco.gain);
    o.connect(ronco); ronco.connect(lp); lp.connect(g); g.connect(this.mundo);
    for (let k = 0; k <= N; k++) {
      const t = k / N * T, ate = D - vel * t, a = acustica(Math.abs(ate));
      const r = Math.hypot(ate, CAMERA_ALTURA), vr = vel * ate / r * METROS_POR_CASA;   // m/s: + chegando, − indo embora
      o.frequency.linearRampToValueAtTime(55 * VEL_SOM / (VEL_SOM - vr), t0 + t);
      lp.frequency.linearRampToValueAtTime(Math.min(a.corte, 700), t0 + t);
      g.gain.linearRampToValueAtTime(Math.max(0.0001, 0.2 * a.vol * a.vol), t0 + t);
    }
    g.gain.linearRampToValueAtTime(0.0001, t0 + T + 0.2);
    o.start(t0); am.start(t0); o.stop(t0 + T + 0.3); am.stop(t0 + T + 0.3);
    setTimeout(() => { g.disconnect(); lp.disconnect(); ronco.disconnect(); }, (T + 1) * 1000);
    const chega = Math.max(0, D / vel - 1.4);
    for (let b = 0; b < 3; b++) {
      const q = chega + b * 0.62;
      setTimeout(() => this.noMundo(Math.abs(D - vel * q), 0.8, () => {
        this.nota('sawtooth', 405, 0, 0.45, 0.05, 0.015, 1500);
        this.nota('sawtooth', 507, 0, 0.45, 0.045, 0.015, 1500);
        this.nota('square', 405, 0, 0.45, 0.02, 0.015, 900);
      }), q * 1000);
    }
    setTimeout(() => this.noMundo(1.5, 1.2, () => {
      this.voz(120, 210, 0.45, 0.1, [[480, 4, 1.3], [900, 5, 0.45]], 0, 0.3);
      this.voz(105, 180, 0.5, 0.09, [[440, 4, 1.3], [850, 5, 0.45]], 0.18, 0.3);
    }), Math.max(0, D / vel - 0.35) * 1000);
  }
  atropelou(heroi, d = 2) {
    if (!heroi && !this.pode('atrop', 0.08)) return;
    this.noMundo(d, 0.5, () => { this.nota('sine', heroi ? 85 : 110, 0, 0.25, heroi ? 0.3 : 0.12, 0.003, 300, 40); this.noise(0.15, heroi ? 0.2 : 0.08, 'lowpass', 500, 0, 0.7, 120); });
  }
  tomatada() {
    this.noMundo(0, 1.6, () => {
      this.nota('sine', 120, 0, 0.12, 0.2, 0.002, 400, 60);
      this.noise(0.22, 0.22, 'bandpass', 700, 0, 1.6, 220, 0.004);
      this.noise(0.1, 0.1, 'bandpass', 1100, 0.05, 2.5, 500, 0.004);
      for (let i = 0; i < 4; i++) this.noise(0.05, 0.03, 'bandpass', 500 + Math.random() * 300, 0.35 + i * 0.22 + Math.random() * 0.1, 3, 300, 0.01);
    });
  }
  paraquedista() {
    this.noMundo(4, 3, () => {
      this.noise(0.12, 0.12, 'lowpass', 500, 0, 0.8, 200, 0.01);
      this.noise(2.4, 0.035, 'bandpass', 320, 0.1, 0.8, 220, 0.3);
      this.voz(95, 80, 1.2, 0.08, [[300, 5, 1.6], [650, 6, 0.6]], 0.6, 0, 0.04);
    });
  }
  agarrou() {
    this.noMundo(0, 1.2, () => {
      this.nota('sine', 80, 0, 0.22, 0.25, 0.003, 300, 45); this.noise(0.18, 0.12, 'lowpass', 450, 0, 0.7, 120);
      this.voz(88, 70, 0.7, 0.13, [[400, 4, 1.4], [850, 5, 0.45]], 0.1, 0.85);
    });
  }
  soltouPerna() { this.noMundo(0.8, 0.8, () => { this.noise(0.4, 0.06, 'bandpass', 380, 0, 1, 220, 0.05); this.voz(80, 60, 0.5, 0.08, [[380, 4, 1.4], [800, 5, 0.4]], 0.1, 0.6); }); }

  /* ---------- o herói: passos e respiração ---------- */
  // Passos SEMPRE (um a cada SOZINHO.passo casas andadas, pé esquerdo e direito um pouco diferentes). Andando com
  // cuidado (sem zumbi perto), a pisada é macia: calcanhar e depois a ponta do pé rolando. Correndo e lutando,
  // mais forte. Com zumbi na tela, os passos ficam mais baixos (a ação cobre). Chão: asfalto, grama, piso,
  // azulejo, concreto, vidro (crocante) ou lama.
  // Respiração: sozinho e bem, lenta e calma; com a vida abaixo de 40%, pesada e rápida SEMPRE (mesmo lutando).
  //   e = { sozinho, andando, anda (casas andadas, h.animT), chao, vida (0..1), cauteloso }
  solidao(dt, e) {
    if (!this.running) return;
    const S = SOZINHO;
    this.semNinguem = e.sozinho ? (this.semNinguem || 0) + dt : 0;
    const alvo = this.semNinguem > S.espera ? 1 : 0;
    this.soz = (this.soz || 0) + (alvo - (this.soz || 0)) * Math.min(1, dt * (alvo ? 0.8 : 6));   // entra devagar, sai rápido
    this.musDuck.gain.setTargetAtTime(1 - (1 - S.musica) * this.soz, this.ac.currentTime, 0.4);
    const n = Math.floor((e.anda || 0) / S.passo);
    if (this.passoN == null) this.passoN = n;
    if (e.andando && n !== this.passoN) {
      this.passoN = n;
      const k = (0.55 + 0.45 * this.soz) * (e.cauteloso ? 0.75 : 1.15);
      this.pisada(e.chao, n % 2, k, e.cauteloso);
    } else if (!e.andando) this.passoN = n;
    // respiração: puxa e solta, num ciclo que acelera com a vida baixa
    const aflito = clamp((0.4 - e.vida) / 0.4, 0, 1);   // 0 com 40% da vida ou mais, 1 quase morto
    const ouvir = Math.max(this.soz * 0.7, aflito > 0 ? 0.5 + aflito * 0.7 : 0);
    this.respT = (this.respT ?? 0.5) - dt;
    if (this.respT <= 0) {
      const ciclo = S.respiracao * (1 - 0.55 * aflito) * rnd(0.9, 1.1);
      this.respT = ciclo;
      if (ouvir > 0.05) this.respirar(ciclo, ouvir * (1 + aflito * 0.8), aflito);
    }
  }
  pisada(chao, pe, k = 1, cauteloso = false) {
    this.noMundo(0, 0.5, () => {
      const v = 0.06 * k * rnd(0.85, 1.15), f = pe ? 1 : 0.9, rola = cauteloso ? 0.07 : 0;
      if (chao === 'grama') {
        this.noise(0.14, v * 0.9, 'bandpass', 650 * f, 0, 0.9, 380, 0.012);
        this.nota('sine', 80 * f, 0, 0.08, v * 0.8, 0.004, 200, 50);
      } else if (chao === 'vidro') {
        this.nota('sine', 95 * f, 0, 0.06, v, 0.002, 300, 55);
        for (let i = 0; i < 3; i++) this.noise(0.012, v * 0.9, 'highpass', rnd(3200, 5000), 0.01 + i * 0.02, 1);
      } else if (chao === 'lama') {
        this.noise(0.18, v * 1.1, 'bandpass', 480 * f, 0, 1.6, 220, 0.01);
      } else {
        const duro = chao === 'piso' || chao === 'azulejo' || chao === 'concreto';
        this.nota('sine', 95 * f, 0, 0.07, v * 1.2, 0.002, 300, 55);                                   // calcanhar
        this.noise(0.05, v * 0.6, 'bandpass', (duro ? 1900 : 1200) * f, 0, duro ? 2.2 : 1.2, 500, 0.002);   // sola
        if (rola) this.noise(0.04, v * 0.45, 'bandpass', (duro ? 2400 : 1500) * f, rola, 1.6, 700, 0.004);   // a ponta do pé rolando
      }
    }, { eco: 0.1 });
  }
  respirar(ciclo, k = 1, aflito = 0) {
    this.noMundo(0, ciclo + 0.5, () => {
      const v = (0.05 + 0.05 * aflito) * k;
      this.noise(ciclo * 0.38, v, 'bandpass', 520 + aflito * 200, 0, 1.4, 760, ciclo * 0.25);
      this.noise(ciclo * 0.5, v * 1.15, 'bandpass', 480 + aflito * 150, ciclo * 0.42, 1.4, 300, ciclo * 0.08);
      if (aflito > 0.5) this.voz(150, 120, ciclo * 0.3, 0.03 * aflito, [[600, 4, 1.2]], ciclo * 0.45, 0.4);   // um gemido junto
    }, { eco: 0.05 });
  }
  // coração com a vida baixa: tum-tum grave, bem perto (saturado de leve pra aparecer no celular)
  coracao() {
    this.noMundo(0, 0.6, () => {
      const ac = this.ac, sat = ac.createWaveShaper(); sat.curve = this.curvaSat;
      const sg = ac.createGain(); sg.gain.value = 0.25; sat.connect(sg); sg.connect(this.alvo);
      for (const [q, v] of [[0, 0.13], [0.17, 0.1]]) {
        const t = ac.currentTime + q, o = ac.createOscillator(), g = ac.createGain();
        o.type = 'sine'; o.frequency.setValueAtTime(62, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
        o.connect(g); g.connect(this.alvo); g.connect(sat); o.start(t); o.stop(t + 0.2);
      }
    }, { eco: 0 });
  }

  /* ---------- vozes dos zumbis (só pra ambientar) ---------- */
  // Uma voz: onda "rouca" (dente de serra) passando por formantes (as ressonâncias da garganta, que fazem o
  // "uuh" ou o "aah"). am = tremor rápido no volume (rosnado/gargarejo), vib = tremor na altura (gemido).
  voz(f0, f1, dur, vol, formantes, quando = 0, am = 0, vib = 0) {
    if (!this.running) return;
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
  vozZumbi(qual, tipo = 'comum', d = 6, pan = 0) {
    if (!this.running) return;
    const f = (VOZ_BASE[tipo] || 110) * (0.9 + Math.random() * 0.2), vol = 0.16;
    this.noMundo(d, 2, () => {
      if (qual === 0) this.voz(f, f * 0.72, 1.1 + Math.random() * 0.4, vol, [[300, 5, 1.6], [650, 6, 0.7]], 0, 0, 0.035);
      else if (qual === 1) {
        this.voz(f * 0.8, f * 0.65, 0.75 + Math.random() * 0.3, vol * 1.1, [[420, 4, 1.4], [900, 6, 0.45]], 0, 0.85);
        this.noise(0.6, 0.05, 'bandpass', 450, 0.05, 2, 300, 0.08);
      } else {
        this.voz(f * 1.15, f * 0.95, 0.16, vol, [[520, 5, 1.4], [1000, 6, 0.5]], 0, 0.5);
        this.voz(f * 1.05, f * 0.7, 0.3, vol * 0.9, [[540, 5, 1.4], [980, 6, 0.45]], 0.24, 0.3);
        this.noise(0.03, 0.05, 'bandpass', 900, 0.2, 3);
      }
    }, { pan });
  }
  // Chamado a cada quadro com os zumbis na tela ([{ d, tipo, pan }]). De vez em quando (3 a 8 s, um pouco mais
  // seguido com muitos zumbis) um deles solta uma voz, nunca a mesma duas vezes seguidas. Quando um zumbi
  // aparece depois de um tempo sem nenhum, a primeira voz vem logo. O mais perto arrasta o pé de vez em quando.
  vozes(dt, vistos) {
    if (!vistos.length) { this.semZumbi = true; return; }
    if (this.semZumbi) { this.semZumbi = false; this.vozT = 0.4 + Math.random() * 1.2; }
    this.vozT = (this.vozT ?? 1) - dt;
    const perto = vistos.reduce((a, z) => (!a || z.d < a.d ? z : a), null);
    this.arrastoT = (this.arrastoT ?? 1) - dt;
    if (perto && perto.d < 4.5 && this.arrastoT <= 0) { this.arrastoT = rnd(0.6, 1.1); this.arrastar(perto.d); }
    if (this.vozT > 0) return;
    this.vozT = (3 + Math.random() * 5) / (1 + Math.min(vistos.length, 12) * 0.05);
    const z = vistos[Math.floor(Math.random() * vistos.length)];
    let qual;
    do qual = Math.floor(Math.random() * 3); while (qual === this.ultimaVoz);
    this.ultimaVoz = qual;
    this.vozZumbi(qual, z.tipo, z.d, z.pan || 0);
  }

  /* ---------- ambiente: a cidade respirando ---------- */
  // Fundo contínuo: o vento (ruído marrom com rajadas lentas), a cidade lá longe (um grave quase parado), o
  // zumbido de lâmpada de dentro dos prédios e o mar da praia. O resto (pássaros, grilos, sino, cachorro e os
  // perigos ao longe) toca de vez em quando, sorteado (AMBIENTE_SOM), sempre de longe e de um lado.
  iniciarAmbiente() {
    const ac = this.ac;
    const laco = (buf, freq, tipo = 'lowpass', q = 0.7) => {
      const s = ac.createBufferSource(); s.buffer = buf; s.loop = true;
      const f = ac.createBiquadFilter(); f.type = tipo; f.frequency.value = freq; f.Q.value = q;
      const g = ac.createGain(); g.gain.value = 0;
      s.connect(f); f.connect(g); g.connect(this.amb); s.start();
      return { f, g };
    };
    // vento: rajadas lentas (o filtro e o volume balançam com dois LFOs bem lentos)
    this.vento = laco(this.marrom, 520, 'bandpass', 0.6);
    for (const [freq, ganho, alvo] of [[0.07, 260, this.vento.f.frequency], [0.045, 0.6, null]]) {
      const l = ac.createOscillator(), lg = ac.createGain(); l.frequency.value = freq; lg.gain.value = ganho; l.connect(lg); l.start();
      if (alvo) lg.connect(alvo); else this.ventoLfo = lg;
    }
    this.ventoRajada = ac.createGain(); this.ventoRajada.gain.value = 1; this.ventoLfo.connect(this.ventoRajada.gain);
    this.vento.g.disconnect(); this.vento.g.connect(this.ventoRajada); this.ventoRajada.connect(this.amb);
    this.cidade = laco(this.marrom, 95);                    // a cidade lá longe
    this.mar = laco(this.marrom, 650);                      // o mar (praia)
    const lm = ac.createOscillator(), lmg = ac.createGain(); lm.frequency.value = 0.11; lmg.gain.value = 0.5; lm.connect(lmg); lm.start();
    this.marOnda = ac.createGain(); this.marOnda.gain.value = 0.6; lmg.connect(this.marOnda.gain);
    this.mar.g.disconnect(); this.mar.g.connect(this.marOnda); this.marOnda.connect(this.amb);
    // dentro do prédio: o zumbido da lâmpada fluorescente (120 Hz e harmônicos, baixinho)
    this.lampada = ac.createGain(); this.lampada.gain.value = 0; this.lampada.connect(this.amb);
    for (const [f, v] of [[120, 0.5], [240, 0.25], [360, 0.12]]) { const o = ac.createOscillator(); o.frequency.value = f; const g = ac.createGain(); g.gain.value = v * 0.02; o.connect(g); g.connect(this.lampada); o.start(); }
    this.ambT = {};
  }

  // Chamado a cada quadro. e = { periodo: 'manha'|'tarde'|'noite'|'madrugada', dentro, praia, parque, perigo 0..1 }
  cenario(dt, e) {
    if (!this.running || !this.vento) return;
    const t = this.ac.currentTime, noite = e.periodo === 'noite' || e.periodo === 'madrugada';
    const fora = !e.dentro;
    this.espaco(e.dentro && !e.praia ? 'sala' : 'rua');
    this.vento.g.gain.setTargetAtTime(fora ? (noite ? 0.075 : 0.055) * (e.parque ? 1.3 : 1) : 0.008, t, 1.5);
    this.cidade.g.gain.setTargetAtTime(fora && !e.praia ? 0.045 : 0.01, t, 2);
    this.mar.g.gain.setTargetAtTime(e.praia ? 0.13 : 0, t, 2);
    this.lampada.gain.setTargetAtTime(e.dentro && !e.praia ? 1 : 0, t, 0.8);
    // coisas de vez em quando (uma de cada tipo por vez)
    for (const [id, tempos] of Object.entries(AMBIENTE_SOM)) {
      const faixa = tempos[e.periodo];
      if (!faixa || (e.dentro && id !== 'perigo')) { this.ambT[id] = null; continue; }
      if (this.ambT[id] == null) this.ambT[id] = rnd(faixa[0] * 0.3, faixa[1] * 0.6);
      if ((this.ambT[id] -= dt) > 0) continue;
      this.ambT[id] = rnd(faixa[0], faixa[1]) * (id === 'perigo' ? 1.4 - Math.min(0.6, e.perigo || 0) : 1);
      this.tocarAmbiente(id, e);
    }
    // dentro do prédio: goteira de vez em quando
    if (e.dentro && !e.praia) { this.goteiraT = (this.goteiraT ?? 2) - dt; if (this.goteiraT <= 0) { this.goteiraT = rnd(2.5, 6); this.noMundo(rnd(3, 6), 0.5, () => { this.ping(rnd(900, 1400), 0.09, 0.03); this.ping(rnd(1800, 2600), 0.05, 0.012, 0.01); }, { pan: rnd(-0.7, 0.7), bus: this.amb, eco: 0.7 }); } }
  }

  tocarAmbiente(id, e) {
    const longe = (a, b) => ({ d: rnd(a, b), pan: rnd(-0.85, 0.85) });
    const L = id === 'perigo' ? longe(22, 40) : id === 'grilo' ? longe(5, 12) : longe(12, 28);
    const op = { pan: L.pan, bus: this.amb, eco: id === 'grilo' ? 0.25 : 0.6 };
    switch (id) {
      case 'passaro': this.noMundo(L.d, 2, () => this.passaro(), { ...op, vol: 2 }); break;
      case 'grilo': this.noMundo(L.d, 1.5, () => this.grilo(), op); break;
      case 'coruja': this.noMundo(L.d, 2.5, () => { this.voz(390, 360, 0.35, 0.05, [[400, 3, 1.4]], 0); this.voz(380, 340, 0.6, 0.05, [[400, 3, 1.4]], 0.55, 0, 0.02); }, op); break;
      case 'sino': this.noMundo(30, 6, () => { for (let k = 0; k < 3; k++) this.sinoIgreja(k * 2.2); }, { ...op, eco: 0.8 }); break;
      case 'cachorro': this.noMundo(L.d, 2, () => { const n = 2 + Math.floor(Math.random() * 3); for (let k = 0; k < n; k++) this.ladrar(k * rnd(0.25, 0.4)); }, op); break;
      case 'perigo': this.perigoLonge(L.d, op); break;
    }
  }
  // pássaro: duas ou três notas curtas que deslizam e trinam
  passaro() {
    const base = rnd(2600, 4200), n = 2 + Math.floor(Math.random() * 3);
    for (let i = 0; i < n; i++) {
      const q = i * rnd(0.09, 0.16), f = base * rnd(0.85, 1.2);
      this.osc('sine', f, f * rnd(1.1, 1.5), rnd(0.05, 0.1), 0.03, q);
    }
  }
  // grilo: um trem de pulsos agudos
  grilo() { const f = rnd(4200, 4800); for (let i = 0; i < 6; i++) this.ping(f, 0.018, 0.02, i * 0.032); }
  // sino de igreja lá longe: parciais de sino (fundamental, terça menor, quinta, oitava) soando demorado
  sinoIgreja(q) { const f = 196; for (const [m, v, dur] of [[0.5, 0.05, 4], [1, 0.06, 3.5], [1.2, 0.03, 2.6], [1.5, 0.025, 2.4], [2, 0.03, 2], [2.76, 0.012, 1.3]]) this.nota('sine', f * m, q, dur, v, 0.004, 3000); }
  // um perigo bem longe: grito, tiro ecoando, sirene, vidro, metal caindo, um coro de zumbis
  perigoLonge(d, op) {
    const qual = pick(['grito', 'tiro', 'sirene', 'vidro', 'metal', 'zumbis', 'tiro', 'grito']);
    this.noMundo(d, 5, () => {
      if (qual === 'grito') this.voz(rnd(320, 420), 260, 0.9, 0.1, [[850, 5, 1.4], [1300, 6, 0.5]], 0, 0.15, 0.05);
      else if (qual === 'tiro') { const n = 1 + Math.floor(Math.random() * 3); for (let k = 0; k < n; k++) { this.noise(0.03, 0.3, 'bandpass', 2200, k * rnd(0.3, 0.7), 0.8); this.osc('sine', 130, 45, 0.08, 0.25, k * 0.5); } }
      else if (qual === 'sirene') { const o = this.ac.createOscillator(), g = this.ac.createGain(), t = this.ac.currentTime; o.type = 'sine'; for (let k = 0; k < 4; k++) { o.frequency.setValueAtTime(700, t + k * 1.1); o.frequency.linearRampToValueAtTime(1100, t + k * 1.1 + 0.55); o.frequency.linearRampToValueAtTime(700, t + k * 1.1 + 1.1); } g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.05, t + 0.8); g.gain.linearRampToValueAtTime(0.0001, t + 4.4); o.connect(g); g.connect(this.alvo); o.start(t); o.stop(t + 4.5); }
      else if (qual === 'vidro') this.quebrarVidro(0.8);
      else if (qual === 'metal') { this.metalico([310, 580, 870, 1340], 1.2, 0.08); this.noise(0.4, 0.1, 'lowpass', 500, 0.05, 0.7, 120); }
      else for (let k = 0; k < 4; k++) this.voz(rnd(85, 130), 70, rnd(1, 1.6), 0.07, [[320, 5, 1.6], [650, 6, 0.6]], k * rnd(0.2, 0.5), 0, 0.04);
    }, { ...op, eco: 0.75, vol: 4 });
  }

  /* ---------- avisos da tela (identidade "16 bits ouvido de longe") ---------- */
  // Tudo que avisa quem assiste (presente, voto, nível, baú...) usa os mesmos poucos instrumentos, como num
  // videogame de 16 bits: sino, marimba, metal grave e tambor. Ataque suave, sem o brilho de cima e com o
  // eco curto do caminho "tela". Coisa boa sobe e soa em sino; coisa ruim é grave, em metal e tambor.
  naTela(fn) {
    if (!this.running) return;
    const antes = this.alvo; this.alvo = this.tela;
    try { fn(); } finally { this.alvo = antes; }
  }
  nota(tipo, f, quando, dur, vol, ataque = 0.006, corte = 2600, f1 = null) {
    if (!this.running) return;
    const ac = this.ac, t = ac.currentTime + quando;
    const o = ac.createOscillator(); o.type = tipo; o.frequency.setValueAtTime(f, t);
    if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = corte; lp.Q.value = 0.5;
    const g = ac.createGain();
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + ataque); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(lp); lp.connect(g); g.connect(this.alvo || this.fx); o.start(t); o.stop(t + dur + 0.05);
  }
  sino(f, quando = 0, dur = 0.7, vol = 0.1) {
    f *= OITAVA;
    this.nota('triangle', f, quando, dur, vol, 0.008, 1600);
    this.nota('sine', f * 2, quando, dur * 0.35, vol * 0.18, 0.006, 1800);
  }
  madeira(f, quando = 0, vol = 0.08) { f *= OITAVA; this.nota('sine', f, quando, 0.24, vol, 0.004, 1400); this.nota('sine', f * 3.98, quando, 0.04, vol * 0.12, 0.003, 1800); }
  metal(f, quando = 0, dur = 0.6, vol = 0.07) { this.nota('square', f, quando, dur, vol, 0.05, 700); this.nota('square', f * 1.006, quando, dur, vol * 0.7, 0.07, 600); }
  tambor(quando = 0, vol = 0.3) { this.nota('sine', 95, quando, 0.45, vol, 0.004, 400, 42); this.noise(0.25, vol * 0.4, 'lowpass', 320, quando, 0.7, 90); }

  cura() { this.naTela(() => [523, 659, 784].forEach((f, i) => this.sino(f, i * 0.09, 0.9, 0.07))); }
  municao() { this.naTela(() => { this.noise(0.04, 0.16, 'bandpass', 2200, 0, 2); this.noise(0.05, 0.2, 'bandpass', 1600, 0.11, 2); this.madeira(659, 0.2, 0.05); }); }
  colete() { this.naTela(() => { this.noise(0.22, 0.1, 'bandpass', 1100, 0, 1.5, 700, 0.04); this.nota('sine', 110, 0.18, 0.2, 0.18, 0.004, 400, 70); this.sino(523, 0.25, 0.5, 0.05); }); }
  bloqueio() { this.naTela(() => { this.sino(1175, 0, 0.35, 0.06); this.noise(0.06, 0.1, 'bandpass', 1800, 0, 2); }); }
  bau(lendario) {
    this.naTela(() => {
      this.noise(0.35, 0.12, 'bandpass', 380, 0, 3, 700, 0.06);
      const notas = lendario ? [523, 659, 784, 1047, 1319, 1568] : [392, 523, 659, 784];
      notas.forEach((f, i) => this.sino(f, 0.2 + i * 0.09, 0.8, lendario ? 0.07 : 0.08));
      if (lendario) for (let i = 0; i < 8; i++) this.sino(1047 + Math.random() * 500, 0.75 + i * 0.07, 0.4, 0.025);
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
  // o mapa abriu (viagem): papel desdobrando e duas notas de marimba
  mapa() { this.naTela(() => { this.noise(0.3, 0.06, 'bandpass', 1800, 0, 1.2, 3500, 0.05); this.madeira(523, 0.18, 0.06); this.madeira(659, 0.3, 0.06); }); }
  // alguém pedindo ajuda no caminho: duas notas que perguntam (sobe e fica no ar)
  encontro() { this.naTela(() => { this.sino(587, 0, 0.6, 0.06); this.sino(698, 0.18, 0.9, 0.06); }); }
  virou() { this.noMundo(0, 0.3, () => this.noise(0.22, 0.05, 'bandpass', 500, 0, 1.2, 1000, 0.08)); }
  chefe(rei) {
    this.naTela(() => {
      this.metal(rei ? 73 : 98, 0, 2, 0.09); this.metal(rei ? 69 : 92.5, 0.6, 1.6, 0.07);
      [0, 0.45, 0.9].forEach(q => this.tambor(q, 0.32));
      this.noise(1.6, 0.18, 'lowpass', 260, 0, 0.8, 60, 0.2);
    });
  }
  portalAbriu(fechando = false) {
    this.naTela(() => {
      this.nota('sine', fechando ? 520 : 90, 0, 1.4, 0.12, 0.3, 900, fechando ? 90 : 520);
      this.noise(1.2, 0.08, 'bandpass', fechando ? 2400 : 300, 0, 2, fechando ? 300 : 2400, 0.4);
      [523, 659, 784, 1047].forEach((f, i) => this.sino(fechando ? f / 2 : f, 0.5 + i * 0.12, 1.2, 0.045));
    });
  }
  portalPassou(bom) {
    this.naTela(() => {
      const fs = bom ? [392, 494, 587, 784] : [440, 370, 311, 262];
      fs.forEach((f, i) => this.sino(f, i * 0.07, 0.8, 0.06));
      this.noise(0.35, 0.08, 'bandpass', bom ? 1800 : 500, 0, 1.4, bom ? 3200 : 200, 0.02);
    });
  }
  // avião do Ataque aéreo: ronco grave do motor passando (sobe e desce, com Doppler) e o vento
  aviao(dur = 1.8) {
    if (!this.running) return;
    const ac = this.ac, t0 = ac.currentTime, T = dur + 1.2;
    const o = ac.createOscillator(); o.type = 'sawtooth';
    const o2 = ac.createOscillator(); o2.type = 'sawtooth'; o2.detune.value = 9;
    const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.1;
    const g = ac.createGain(); g.gain.setValueAtTime(0.0001, t0);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.mundo); g.connect(this.ecoIn);
    for (let k = 0; k <= 24; k++) {
      const t = k / 24 * T, x = (t / T - 0.5) * 2, perto = 1 - Math.min(1, Math.abs(x));
      const f = 78 * (1 + 0.06 * (x < 0 ? 1 : -1) * Math.min(1, Math.abs(x) * 3));
      o.frequency.linearRampToValueAtTime(f, t0 + t); o2.frequency.linearRampToValueAtTime(f * 1.5, t0 + t);
      lp.frequency.linearRampToValueAtTime(250 + 650 * perto, t0 + t);
      g.gain.linearRampToValueAtTime(Math.max(0.0001, 0.17 * perto * perto + 0.01), t0 + t);
    }
    g.gain.linearRampToValueAtTime(0.0001, t0 + T + 0.2);
    o.start(t0); o2.start(t0); o.stop(t0 + T + 0.3); o2.stop(t0 + T + 0.3);
    setTimeout(() => { g.disconnect(); lp.disconnect(); }, (T + 1) * 1000);
    this.noMundo(0, T, () => this.noise(T, 0.07, 'bandpass', 500, 0, 0.8, 1400, T * 0.45));
  }
  bombaCaindo(queda = 0.5) { if (this.pode('assobio', 0.05)) this.noMundo(1.5, queda + 0.2, () => this.osc('sine', 1500, 420, queda, 0.05)); }
  // Zumbis da tela (core/tela.js): som exagerado em cada impacto (é o som que vende a piada)
  telaSom(id) {
    const splat = (grave = 120, molhado = 700) => { this.nota('sine', grave, 0, 0.12, 0.22, 0.002, 400, 55); this.noise(0.25, 0.24, 'bandpass', molhado, 0, 1.6, 200, 0.004); this.noise(0.1, 0.1, 'bandpass', molhado * 1.6, 0.05, 2.5, 500, 0.004); };
    this.noMundo(0, 2.5, () => {
      switch (id) {
        case 'ovo': splat(160, 900); this.noise(0.03, 0.18, 'highpass', 3000, 0, 1); break;
        case 'pintor': splat(90, 500); for (let i = 0; i < 5; i++) this.noise(0.06, 0.05, 'bandpass', 400, 0.3 + i * 0.2, 3, 250, 0.01); break;
        case 'chiclete': this.noise(0.15, 0.18, 'bandpass', 900, 0, 2, 300, 0.01); this.osc('sawtooth', 220, 520, 0.5, 0.05, 0.1); this.osc('sine', 300, 90, 0.25, 0.08, 0.6); break;
        case 'torta': splat(80, 450); this.nota('square', 330, 0.25, 0.12, 0.08); this.nota('square', 247, 0.4, 0.2, 0.08); break;
        case 'lambedor': this.noise(0.7, 0.16, 'bandpass', 600, 0, 4, 1600, 0.08); this.noise(0.3, 0.08, 'bandpass', 2000, 0.6, 5, 900, 0.03); break;
        case 'bate': this.nota('sine', 150, 0, 0.18, 0.3, 0.002, 500, 70); this.noise(0.06, 0.18, 'lowpass', 900, 0, 1); break;
        case 'encostado': this.nota('sine', 110, 0, 0.2, 0.28, 0.002, 400, 60); this.noise(0.4, 0.06, 'bandpass', 2400, 0.25, 6, 3000, 0.05); break;
        case 'puxa': this.noise(0.5, 0.14, 'bandpass', 1400, 0, 1.2, 3400, 0.02); this.noise(0.08, 0.1, 'highpass', 4000, 0.45, 1); break;
        case 'grafite': this.noise(1.0, 0.13, 'highpass', 5000, 0, 0.8, 4000, 0.04); this.noise(0.05, 0.08, 'bandpass', 1200, 1.05, 3); break;
        case 'eletricista': this.osc('square', 60, 60, 0.6, 0.06); this.noise(2.6, 0.12, 'bandpass', 3000, 0, 0.5, 2000, 0.02); for (let i = 0; i < 6; i++) this.noise(0.03, 0.2, 'highpass', 4000, Math.random() * 1.5, 1); break;
        case 'fumaca': this.noise(1.6, 0.14, 'lowpass', 900, 0, 0.7, 300, 0.2); this.osc('sine', 90, 70, 0.6, 0.06, 0.1); break;
        case 'apagao': this.osc('sawtooth', 220, 40, 0.8, 0.08); this.nota('sine', 70, 0.75, 0.6, 0.2); break;
        case 'tonto': for (let i = 0; i < 4; i++) this.osc('sine', 400 + i * 80, 260 + i * 60, 0.4, 0.05, i * 0.35); break;
        case 'lama': splat(70, 400); this.noise(0.4, 0.12, 'lowpass', 600, 0, 0.8, 200, 0.01); break;
        case 'gigante': this.osc('sawtooth', 70, 40, 1.4, 0.14); this.noise(1.4, 0.16, 'lowpass', 300, 0, 0.6, 120, 0.15); this.nota('sine', 55, 1.4, 0.6, 0.35); break;
        case 'selfie': this.noise(0.02, 0.2, 'highpass', 5000, 0.7, 1); this.noise(0.08, 0.14, 'bandpass', 2400, 0.72, 2, 1200); break;
        case 'fa': [523, 659, 784, 1047].forEach((f, i) => this.osc('square', f, f, 0.12, 0.05, i * 0.1)); break;
      }
    }, { eco: 0.05 });
  }
  limpador() {
    this.noMundo(0, 1.4, () => {
      this.osc('sawtooth', 70, 85, 1.1, 0.04);
      this.osc('square', 1800, 2400, 0.12, 0.03, 0.15); this.osc('square', 2200, 1600, 0.12, 0.03, 0.7);
      this.noise(1.0, 0.07, 'bandpass', 1500, 0, 2, 900, 0.05);
    }, { eco: 0 });
  }
  pedrada() {
    this.noMundo(0, 1.4, () => {
      this.noise(0.03, 0.32, 'highpass', 2600, 0, 0.9);
      this.nota('sine', 95, 0, 0.14, 0.26, 0.002, 380, 55);
      this.noise(0.16, 0.12, 'bandpass', 1800, 0.01, 2.2, 3800, 0.003);
      for (let i = 0; i < 7; i++) this.noise(0.012, 0.05 + Math.random() * 0.04, 'highpass', 3000 + Math.random() * 2500, 0.03 + i * 0.035 + Math.random() * 0.02, 1.5);
      for (let i = 0; i < 3; i++) this.osc('sine', 3200 + Math.random() * 2400, null, 0.05, 0.025, 0.25 + i * 0.12 + Math.random() * 0.08);
    }, { eco: 0 });
  }
  recarregar() { this.noMundo(0.3, 0.6, () => { this.noise(0.03, 0.12, 'bandpass', 2400, 0, 2); this.metalico([900, 1340], 0.05, 0.03, 0.18); this.metalico([820, 1220], 0.04, 0.02, 0.3); }); }
  habilidade() { this.naTela(() => [523, 659, 784, 1047].forEach((f, i) => this.sino(f, i * 0.07, 0.8, 0.07))); }
  escolha() { this.naTela(() => { this.sino(392, 0, 0.6, 0.06); this.sino(523, 0.12, 0.7, 0.06); }); }
  caiuHeroi() { this.naTela(() => { this.tambor(0, 0.35); this.metal(110, 0.05, 0.9, 0.07); this.nota('square', 110, 0.05, 0.9, 0.06, 0.03, 600, 55); }); }
  levantou() { this.naTela(() => { [262, 392, 523, 784].forEach((f, i) => this.sino(f, i * 0.07, 0.8, 0.07)); this.noise(0.4, 0.08, 'bandpass', 600, 0, 1, 1400, 0.1); }); }
  golpeFinal() { this.naTela(() => { this.metal(82, 0, 0.9, 0.09); this.metal(87, 0.02, 0.9, 0.08); this.tambor(0, 0.4); this.tambor(0.25, 0.3); }); }
  morteHeroi() { this.naTela(() => { [392, 349, 311, 262].forEach((f, i) => this.sino(f, i * 0.34, 1.2, 0.08)); this.nota('triangle', 131, 0, 2.2, 0.06, 0.3, 500); }); }
  novoHeroi() { this.naTela(() => [262, 330, 392, 523].forEach((f, i) => this.sino(f, i * 0.1, 0.9, 0.07))); }
  recorde() { this.naTela(() => { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.sino(f, i * 0.11, 0.7, 0.07)); this.tambor(0, 0.2); this.tambor(0.33, 0.2); }); }
  historia() { this.naTela(() => { [392, 494, 587, 740, 587].forEach((f, i) => this.sino(f, i * 0.2, 1.2, 0.05)); this.nota('triangle', 98, 0, 2, 0.06, 0.3, 500); }); }
  perigo() { this.naTela(() => { this.tambor(0, 0.3); this.metal(110, 0.02, 0.7, 0.07); this.metal(116.5, 0.04, 0.7, 0.05); }); }
  livre() { this.naTela(() => { this.sino(523, 0, 0.7, 0.05); this.sino(659, 0.13, 0.8, 0.05); }); }
  paraquedas(d = 3) { if (this.pode('paraq', 0.25)) this.noMundo(d, 1.2, () => { this.noise(0.12, 0.14, 'lowpass', 500, 0, 0.8, 200, 0.01); this.noise(0.9, 0.04, 'bandpass', 350, 0.1, 0.8, 250, 0.2); }); }
  drop(pilhas = 1) {
    this.naTela(() => {
      this.noise(0.18, 0.1, 'bandpass', 420, 0, 2, 700, 0.03);
      [523, 659, 784].forEach((f, i) => this.sino(f, 0.08 + i * 0.07, 0.7, 0.07));
      this.sino([784, 880, 988, 1047, 1175][Math.min(4, pilhas - 1)], 0.32, 1, 0.08);
    });
  }
  inspiracao() {
    this.naTela(() => {
      [131, 165, 196, 262].forEach((f, i) => this.nota('triangle', f, i * 0.04, 2.2, 0.05, 0.35, 900));
      this.noise(1.4, 0.06, 'bandpass', 300, 0, 0.8, 900, 0.4);
      this.sino(784, 0.25, 1.2, 0.05);
    });
  }
  pulso() { if (this.pode('pulso', 0.3)) this.naTela(() => this.nota('sine', 110, 0, 0.25, 0.08, 0.01, 300, 70)); }
  cansou(d = 3) {
    this.noMundo(d, 2.4, () => {
      this.voz(62, 34, 1.8, 0.22, [[300, 4, 1.6], [620, 5, 0.5]], 0, 0.6, 0.02);
      this.noise(1.4, 0.08, 'bandpass', 380, 0.3, 1.2, 160, 0.2);
    });
    this.naTela(() => { this.sino(523, 0.4, 0.9, 0.06); this.sino(659, 0.52, 1, 0.06); });
  }
  runa() { this.naTela(() => { [392, 523, 659, 784, 1047].forEach((f, i) => this.sino(f, i * 0.1, 1.2, 0.06)); this.nota('triangle', 98, 0, 2, 0.06, 0.3, 500); }); }
  nucleo(t = 1) { this.naTela(() => { const b = [262, 294, 330][Math.min(2, t - 1)] || 262; [1, 1.25, 1.5, 2].forEach((m, i) => this.sino(b * m, i * 0.09, 1.3, 0.06)); this.metal(b / 4, 0, 1.4, 0.05); this.tambor(0, 0.22); }); }
  deus() { this.naTela(() => { [262, 330, 392, 523, 659, 784, 1047].forEach((f, i) => this.sino(f, i * 0.12, 1.8, 0.06)); this.metal(65, 0, 2.4, 0.08); this.metal(98, 0.05, 2.4, 0.05); this.tambor(0, 0.35); this.tambor(0.42, 0.3); this.tambor(0.84, 0.35); this.nota('triangle', 131, 0, 2.6, 0.07, 0.4, 600); }); }
  furiaDivina() { if (this.pode('furia', 1)) { this.noMundo(4, 2, () => { this.osc('sine', 70, 28, 1.2, 0.4); this.noise(1.4, 0.3, 'lowpass', 700, 0, 0.7, 90, 0.02, 'marrom'); }, { eco: 0.6 }); this.naTela(() => [784, 1047, 1319].forEach((f, i) => this.sino(f, i * 0.05, 0.9, 0.04))); } }
  noite() { this.naTela(() => { this.nota('triangle', 110, 0, 2.6, 0.12, 0.4, 500, 82); this.nota('triangle', 165, 0.1, 2.6, 0.07, 0.5, 500, 123); }); }

  /* ---------- música: um tapete calmo, que fica tenso quando o perigo chega perto ---------- */
  // Acordes longos e macios (entram em 3 s e somem devagar), em lá menor: Am9 → Fmaj7 → Cmaj7 → G6 → ...,
  // um acorde a cada ~9 s, com eco largo. Por cima, de vez em quando, uma caixinha de música toca uma nota da
  // escala pentatônica (só quando está calmo). Com perigo, um pulso grave e suave (como um coração lento) e um
  // zumbido dissonante bem baixinho; com a vida baixa, cordas nervosas (aflição) — tudo sem estridência.
  iniciarMusica() {
    const ac = this.ac;
    // eco largo da música (dois atrasos com retorno, escurecendo)
    this.musEco = ac.createGain(); this.musEco.gain.value = 1; this.musEco.connect(this.mus);
    this.musIn = ac.createGain(); this.musIn.connect(this.mus);
    for (const [t, fb] of [[0.37, 0.38], [0.53, 0.32]]) {
      const d = ac.createDelay(1); d.delayTime.value = t;
      const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
      const g = ac.createGain(); g.gain.value = fb;
      this.musIn.connect(d); d.connect(lp); lp.connect(g); g.connect(d); lp.connect(this.musEco);
    }
    this.padLp = ac.createBiquadFilter(); this.padLp.type = 'lowpass'; this.padLp.frequency.value = 1100; this.padLp.Q.value = 0.4;
    this.padG = ac.createGain(); this.padG.gain.value = 0.22;
    this.padLp.connect(this.padG); this.padG.connect(this.musIn);
    // tensão: zumbido dissonante (dois senos a meio tom) e o pulso grave
    this.tensaoG = ac.createGain(); this.tensaoG.gain.value = 0; this.tensaoG.connect(this.musIn);
    for (const f of [110, 116.54]) { const o = ac.createOscillator(); o.type = 'triangle'; o.frequency.value = f; const lp = ac.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500; o.connect(lp); lp.connect(this.tensaoG); o.start(); }
    // aflição (vida abaixo da metade): cordas nervosas com tremolo, bem mais baixas que antes
    this.aflitoG = ac.createGain(); this.aflitoG.gain.value = 0; this.aflitoG.connect(this.mus);
    const trem = ac.createGain(); trem.gain.value = 0.6; trem.connect(this.aflitoG);
    const tl = ac.createOscillator(), tlg = ac.createGain(); tl.frequency.value = 7; tlg.gain.value = 0.35; tl.connect(tlg); tlg.connect(trem.gain); tl.start();
    const fa = ac.createBiquadFilter(); fa.type = 'bandpass'; fa.frequency.value = 650; fa.Q.value = 0.9; fa.connect(trem);
    [110, 116.54, 155.56, 233.08].forEach((fr, i) => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.detune.value = (i % 2 ? 7 : -7); o.connect(fa); o.start(); });
    this.tensao = 0; this.aflicao = 0; this.proxPulso = 0; this.acordeT = 0; this.acordeN = 0; this.caixinhaT = 3;
  }
  static ACORDES = [
    [110, 130.81, 164.81, 196, 246.94],   // Am9 (lá, dó, mi, sol, si)
    [87.31, 130.81, 174.61, 220, 261.63], // Fmaj7 (fá, dó, fá, lá, dó)
    [130.81, 164.81, 196, 246.94, 329.63],// Cmaj7
    [98, 146.83, 196, 246.94, 329.63]     // G6 (sol, ré, sol, si, mi)
  ];
  static PENTATONICA = [440, 523.25, 587.33, 659.25, 783.99, 880, 1046.5];
  tocarAcorde(notas, dur) {
    const ac = this.ac, t = ac.currentTime;
    for (const [i, f] of notas.entries()) for (const [tipo, det, v] of [['triangle', -5, 0.05], ['sine', 6, 0.06]]) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = tipo; o.frequency.value = f; o.detune.value = det + (i - 2) * 1.5;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v / (1 + i * 0.25), t + 3); g.gain.setValueAtTime(v / (1 + i * 0.25), t + dur); g.gain.linearRampToValueAtTime(0.0001, t + dur + 3.5);
      o.connect(g); g.connect(this.padLp); o.start(t); o.stop(t + dur + 3.6);
    }
  }
  caixinha(f) {
    const ac = this.ac, t = ac.currentTime;
    for (const [m, v, dur] of [[1, 0.05, 1.8], [2, 0.012, 0.7], [3.01, 0.006, 0.4]]) {
      const o = ac.createOscillator(), g = ac.createGain();
      o.type = 'sine'; o.frequency.value = f * m;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.musIn); o.start(t); o.stop(t + dur + 0.05);
    }
  }
  // chamado a cada quadro com 0..1 de perigo; vidaBaixa vai de 0 (metade da vida ou mais) a 1 (quase morto)
  musica(perigo, dt, vidaBaixa = 0) {
    if (!this.running) return;
    this.aflicao += (vidaBaixa - this.aflicao) * Math.min(1, dt * 1.5);
    const alvo = vidaBaixa > 0 ? Math.max(perigo, 0.5 + vidaBaixa * 0.4) : perigo;
    this.tensao += (alvo - this.tensao) * Math.min(1, dt * 0.6);
    const t = this.ac.currentTime;
    // o tapete: um acorde a cada ~9 s (com perigo, mais escuro e mais baixo)
    this.acordeT -= dt;
    if (this.acordeT <= 0) {
      const dur = 8.5;
      this.acordeT = dur;
      this.tocarAcorde(Som.ACORDES[this.acordeN++ % Som.ACORDES.length], dur);
    }
    this.padLp.frequency.setTargetAtTime(1100 - this.tensao * 500, t, 1);
    this.padG.gain.setTargetAtTime(0.22 * (1 - this.tensao * 0.35), t, 1);
    this.tensaoG.gain.setTargetAtTime(this.tensao > 0.3 ? (this.tensao - 0.3) * 0.05 : 0, t, 1.2);
    this.aflitoG.gain.setTargetAtTime(this.aflicao > 0.01 ? 0.02 + this.aflicao * 0.04 : 0, t, 0.4);
    // caixinha de música, só com calma
    this.caixinhaT -= dt;
    if (this.caixinhaT <= 0) { this.caixinhaT = rnd(2.5, 7); if (this.tensao < 0.4) this.caixinha(pick(Som.PENTATONICA)); }
    // o pulso grave, suave, com perigo
    this.proxPulso -= dt;
    if (this.proxPulso <= 0) {
      const bpm = 58 + this.tensao * 40 + this.aflicao * 20;
      this.proxPulso = 60 / bpm;
      if (this.tensao > 0.3) this.osc('sine', 62, 40, 0.3, 0.1 + (this.tensao - 0.3) * 0.25, 0, this.mus);
    }
  }
}
