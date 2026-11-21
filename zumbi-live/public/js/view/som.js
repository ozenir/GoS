// Sons feitos na hora pelo navegador (sem arquivos): tiros, gemidos, baú, alarme, chefão, coração...
// Os navegadores só liberam o áudio depois de um clique; na janela do jogo (atalho 3) ele toca sozinho.

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

  osc(tipo, f0, f1, dur, vol, quando = 0, destino = this.fx) {
    if (!this.running) return;
    const t = this.ac.currentTime + quando;
    const o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = tipo; o.frequency.setValueAtTime(f0, t);
    if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(destino); o.start(t); o.stop(t + dur + 0.05);
  }
  noise(dur, vol, filtro = 'lowpass', freq = 2000, quando = 0, q = 0.7, freq1 = null) {
    if (!this.running) return;
    const t = this.ac.currentTime + quando;
    const s = this.ac.createBufferSource(); s.buffer = this.ruido;
    const f = this.ac.createBiquadFilter(); f.type = filtro; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freq1) f.frequency.exponentialRampToValueAtTime(freq1, t + dur);
    const g = this.ac.createGain();
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(this.fx);
    s.start(t, Math.random() * 0.8); s.stop(t + dur + 0.05);
  }

  /* ---------- efeitos ---------- */
  tiro(arma) {
    if (arma === 'metralhadora') { if (!this.pode('mg', 0.07)) return; this.noise(0.06, 0.25, 'bandpass', 1800, 0, 1); this.osc('square', 180, 60, 0.05, 0.08); return; }
    if (arma === 'escopeta') { this.noise(0.28, 0.55, 'lowpass', 2400, 0, 0.7, 300); this.osc('sine', 120, 40, 0.2, 0.4); return; }
    if (!this.pode('tiro', 0.05)) return;
    this.noise(0.12, 0.35, 'bandpass', 2200, 0, 0.9, 600); this.osc('square', 220, 70, 0.08, 0.12);
  }
  tiroAliado() { if (this.pode('tiroA', 0.08)) this.noise(0.08, 0.15, 'bandpass', 2600, 0, 1, 900); }
  chama() { if (this.pode('chama', 0.09)) this.noise(0.14, 0.18, 'lowpass', 900, 0, 0.5, 400); }
  acerto() { if (this.pode('acerto', 0.04)) this.noise(0.06, 0.18, 'lowpass', 500); }
  golpe(taco) { this.noise(0.1, taco ? 0.4 : 0.25, 'lowpass', taco ? 700 : 400); this.osc('sine', 160, 60, 0.1, 0.25); }
  morteZumbi(chefe) {
    if (chefe) { this.osc('sawtooth', 120, 30, 1.2, 0.3); this.noise(0.9, 0.4, 'lowpass', 400, 0, 0.7, 60); return; }
    if (!this.pode('morte', 0.06)) return;
    this.osc('sawtooth', 160 + Math.random() * 60, 50, 0.25, 0.12); this.noise(0.15, 0.15, 'lowpass', 700);
  }
  gemido(tipo) {
    if (!this.pode('gemido', tipo === 'chefao' || tipo === 'rei' ? 0.8 : 1.3)) return;
    if (!this.running) return;
    const t = this.ac.currentTime, f = tipo === 'rei' ? 55 : tipo === 'chefao' ? 70 : 95 + Math.random() * 40;
    const o = this.ac.createOscillator(), lfo = this.ac.createOscillator(), lg = this.ac.createGain(), g = this.ac.createGain(), fl = this.ac.createBiquadFilter();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t); o.frequency.linearRampToValueAtTime(f * 0.8, t + 0.9);
    lfo.frequency.value = 6 + Math.random() * 4; lg.gain.value = f * 0.06; lfo.connect(lg); lg.connect(o.frequency);
    fl.type = 'lowpass'; fl.frequency.value = 600; fl.Q.value = 4;
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.09, t + 0.15); g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
    o.connect(fl); fl.connect(g); g.connect(this.fx); o.start(t); lfo.start(t); o.stop(t + 1.05); lfo.stop(t + 1.05);
  }
  mordida(chefe) { if (this.pode('mordida', 0.15)) { this.noise(0.12, chefe ? 0.45 : 0.3, 'lowpass', chefe ? 350 : 800); this.osc('sine', chefe ? 90 : 150, 50, 0.12, 0.3); } }
  explosao() { this.noise(1.1, 0.7, 'lowpass', 1200, 0, 0.6, 50); this.osc('sine', 90, 25, 0.8, 0.6); }
  cura() { [523, 659, 784].forEach((f, i) => this.osc('triangle', f, f, 0.25, 0.14, i * 0.06)); }
  municao() { this.noise(0.05, 0.2, 'highpass', 3000); this.noise(0.05, 0.2, 'highpass', 3000, 0.09); this.osc('square', 900, 900, 0.04, 0.05, 0.14); }
  colete() { this.osc('triangle', 300, 600, 0.15, 0.15); }
  bloqueio() { this.osc('square', 1200, 800, 0.08, 0.08); this.noise(0.08, 0.15, 'highpass', 2500); }
  bau(lendario) {
    this.noise(0.15, 0.2, 'lowpass', 900);
    const notas = lendario ? [523, 659, 784, 1047, 1319, 1568] : [392, 523, 659, 784];
    notas.forEach((f, i) => this.osc(lendario ? 'square' : 'triangle', f, f, 0.3, lendario ? 0.09 : 0.12, 0.12 + i * 0.08));
    if (lendario) for (let i = 0; i < 10; i++) this.osc('sine', 2000 + Math.random() * 2000, null, 0.12, 0.04, 0.5 + i * 0.05);
  }
  item() { this.osc('triangle', 660, 990, 0.1, 0.1); }
  pousou() { this.noise(0.1, 0.2, 'lowpass', 400); }
  nivel() { [392, 494, 587, 784].forEach((f, i) => this.osc('square', f, f, 0.16, 0.08, i * 0.07)); }
  presente(lado) {
    if (!this.pode('presente', 0.12)) return;
    if (lado === 'ajuda') [784, 1047].forEach((f, i) => this.osc('triangle', f, f, 0.18, 0.12, i * 0.07));
    else [311, 233].forEach((f, i) => this.osc('square', f, f, 0.2, 0.07, i * 0.09));
  }
  voto() { if (this.pode('voto', 0.05)) this.osc('sine', 1200, 1400, 0.05, 0.05); }
  tique(urgente) { this.osc('square', urgente ? 1000 : 700, null, 0.04, urgente ? 0.08 : 0.04); }
  decisao() { [523, 784].forEach((f, i) => this.osc('triangle', f, f, 0.2, 0.12, i * 0.08)); }
  porta() { this.noise(0.3, 0.25, 'lowpass', 600, 0, 3, 200); this.osc('sine', 80, 60, 0.3, 0.2); }
  virou() { this.noise(0.18, 0.08, 'bandpass', 1500, 0, 1, 500); }
  chefe(rei) {
    this.osc('sawtooth', rei ? 45 : 60, rei ? 30 : 40, 2.2, 0.35);
    this.noise(1.6, 0.35, 'lowpass', 300, 0, 0.8, 60);
    [0, 0.5, 1].forEach(q => this.osc('square', rei ? 98 : 131, rei ? 92 : 123, 0.4, 0.15, q + 0.2));
  }
  alarme(seg = 6) {
    if (!this.running) return;
    for (let i = 0; i < seg * 2.5; i++) this.osc('square', i % 2 ? 660 : 880, null, 0.36, 0.05, i * 0.4);
  }
  latido() { if (this.pode('latido', 0.5)) { this.osc('square', 600, 300, 0.07, 0.1); this.osc('square', 650, 320, 0.07, 0.1, 0.12); } }
  vidro() { for (let i = 0; i < 5; i++) this.osc('sine', 3000 + Math.random() * 3000, null, 0.06, 0.05, i * 0.03); }
  helicoptero() {
    if (!this.running) return;
    for (let i = 0; i < 40; i++) this.noise(0.05, Math.max(0.02, 0.25 * Math.sin(i / 40 * Math.PI)), 'lowpass', 500, i * 0.1);
  }
  zap() { if (this.pode('zap', 0.1)) { this.noise(0.15, 0.25, 'highpass', 3000); this.osc('sawtooth', 900, 200, 0.15, 0.08); } }
  onda() { this.osc('sine', 140, 40, 0.35, 0.35); this.noise(0.3, 0.2, 'lowpass', 600, 0, 0.7, 100); }
  arremesso() { if (this.pode('arr', 0.2)) this.noise(0.2, 0.08, 'bandpass', 1200, 0, 1, 400); }
  habilidade() { [523, 659, 784, 1047].forEach((f, i) => this.osc('triangle', f, f, 0.18, 0.11, i * 0.07)); }
  escolha() { [392, 523].forEach((f, i) => this.osc('square', f, f, 0.12, 0.07, i * 0.1)); }
  caiu() { this.osc('sawtooth', 220, 55, 0.7, 0.2); this.noise(0.5, 0.25, 'lowpass', 400, 0, 0.7, 80); }
  levantou() { [262, 392, 523, 784].forEach((f, i) => this.osc('square', f, f, 0.14, 0.1, i * 0.06)); this.noise(0.3, 0.2, 'lowpass', 900, 0, 0.6, 200); }
  golpeFinal() { this.osc('sawtooth', 160, 40, 0.6, 0.22); this.osc('square', 80, 40, 0.5, 0.12, 0.1); }
  coracao() { this.osc('sine', 70, 50, 0.12, 0.35); this.osc('sine', 70, 50, 0.12, 0.25, 0.18); }
  morteHeroi() { [392, 349, 311, 262].forEach((f, i) => this.osc('triangle', f, f * 0.98, 0.5, 0.16, i * 0.32)); this.noise(1.5, 0.2, 'lowpass', 300); }
  novoHeroi() { [262, 330, 392, 523].forEach((f, i) => this.osc('triangle', f, f, 0.25, 0.12, i * 0.1)); }
  recorde() { [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.osc('square', f, f, 0.15, 0.08, i * 0.1)); }
  historia() { [392, 494, 587, 740, 587].forEach((f, i) => this.osc('sine', f, f, 0.6, 0.07, i * 0.18)); this.osc('triangle', 98, 98, 1.6, 0.08); }
  perigo() { this.osc('sawtooth', 110, 55, 0.5, 0.18); this.noise(0.4, 0.2, 'lowpass', 500, 0, 0.7, 120); }
  livre() { [523, 659].forEach((f, i) => this.osc('sine', f, f, 0.4, 0.07, i * 0.12)); }
  ambiente(tipo) {
    if (!this.pode('amb' + tipo, 0.8)) return;
    if (tipo === 'vidro') this.vidro();
    else if (tipo === 'fios') { this.osc('sawtooth', 120, 2400, 0.12, 0.12); this.noise(0.15, 0.25, 'highpass', 3000); }
    else if (tipo === 'fogo') this.noise(0.35, 0.25, 'lowpass', 900, 0, 0.5, 300);
    else if (tipo === 'acido') { this.noise(0.25, 0.15, 'bandpass', 2500, 0, 2); this.osc('sine', 900, 300, 0.2, 0.05); }
    else if (tipo === 'arame') { this.osc('square', 1800, 900, 0.06, 0.06); this.noise(0.1, 0.15, 'highpass', 4000); }
  }
    noite() { this.osc('sine', 110, 55, 2.5, 0.2); this.osc('sine', 165, 82, 2.5, 0.12); }

  /* ---------- música ambiente: um zumbido grave e um pulso que acelera com o perigo ---------- */
  iniciarMusica() {
    const ac = this.ac;
    const g = ac.createGain(); g.gain.value = 0.22; g.connect(this.mus);
    const f = ac.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380; f.connect(g);
    [55, 55.4, 82.4].forEach(fr => { const o = ac.createOscillator(); o.type = 'sawtooth'; o.frequency.value = fr; o.connect(f); o.start(); });
    const lfo = ac.createOscillator(), lg = ac.createGain(); lfo.frequency.value = 0.08; lg.gain.value = 140; lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    this.tensao = 0;
    this.passo = 0;
    this.proxPulso = 0;
  }
  // chamado a cada quadro com 0..1 de perigo
  musica(perigo, dt) {
    if (!this.running) return;
    this.tensao += (perigo - this.tensao) * Math.min(1, dt * 0.8);
    this.proxPulso -= dt;
    if (this.proxPulso <= 0) {
      const bpm = 70 + this.tensao * 70;
      this.proxPulso = 60 / bpm / 2;
      this.passo++;
      const t = this.ac.currentTime;
      if (this.passo % 2 === 0) this.osc('sine', 60, 38, 0.25, 0.25 + this.tensao * 0.25, 0, this.mus);
      if (this.tensao > 0.35 && this.passo % 2 === 1) this.noise(0.04, 0.06 * this.tensao, 'highpass', 6000, 0);
      if (this.passo % 16 === 8) this.osc('triangle', this.tensao > 0.6 ? 233 : 196, null, 0.8, 0.05, 0, this.mus);
      void t;
    }
  }
}
