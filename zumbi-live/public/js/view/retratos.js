// ============================================================================
//  RETRATOS — o rosto de cada herói (busto de frente, 92 x 56, pixel art), com o cenário dele atrás
//  e a luz mexendo: o hospital da enfermeira, a sirene do policial, o fogo da bombeira, a chuva e o
//  celular do entregador, a oficina do mecânico, a cobertura do Valadares.
//  Usado na tela de escolha do herói (view/escolha.js) e no cartão de introdução (view/cinema.js).
//  Protótipo original: historia/prototipos/escolha.html
// ============================================================================
/* ------------------------------ pixel art ------------------------------ */
const BAY = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const th = (x, y) => (BAY[(y & 3) * 4 + (x & 3)] + 0.5) / 16;
const rnd = seed => { let a = seed >>> 0; return () => { a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
const P = (x, c, X, Y) => { x.fillStyle = c; x.fillRect(X | 0, Y | 0, 1, 1); };
const R = (x, c, X, Y, w, h) => { x.fillStyle = c; x.fillRect(Math.round(X), Math.round(Y), Math.round(w), Math.round(h)); };
function G(x, X0, Y0, w, h, cores, f) { const n = cores.length - 1; for (let Y = Y0; Y < Y0 + h; Y++) for (let X = X0; X < X0 + w; X++) { const v = Math.max(0, Math.min(0.9999, f(X, Y))) * n; let i = Math.floor(v); if (v - i > th(X, Y)) i++; x.fillStyle = cores[Math.min(n, i)]; x.fillRect(X, Y, 1, 1); } }
function brilho(x, cx, cy, r, cor, dens = 1, sy = 1) { x.fillStyle = cor; for (let Y = Math.floor(cy - r * sy); Y <= cy + r * sy; Y++) for (let X = Math.floor(cx - r); X <= cx + r; X++) { const dx = (X - cx) / r, dy = (Y - cy) / (r * sy), d = Math.sqrt(dx * dx + dy * dy); if (d >= 1) continue; if ((1 - d) * (1 - d) * dens > th(X, Y)) x.fillRect(X, Y, 1, 1); } }
function disco(x, cx, cy, r, c) { x.fillStyle = c; for (let Y = -r; Y <= r; Y++) { const w = Math.floor(Math.sqrt(r * r - Y * Y)); x.fillRect(Math.round(cx - w), Math.round(cy + Y), w * 2 + 1, 1); } }
function linha(x, c, x0, y0, x1, y1) { x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1); const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1; let e = dx + dy; x.fillStyle = c; for (;;) { x.fillRect(x0, y0, 1, 1); if (x0 === x1 && y0 === y1) break; const e2 = 2 * e; if (e2 >= dy) { e += dy; x0 += sx; } if (e2 <= dx) { e += dx; y0 += sy; } } }
const novo = (w, h) => { const k = document.createElement('canvas'); k.width = w; k.height = h; return [k, k.getContext('2d')]; };

/* ------------------------------ retratos (92 x 56): busto de frente ------------------------------ */
const PW = 92, PH = 56;
function busto(o) {
  const [k, x] = novo(PW, PH), cx = 46, cy = 25, ey = cy + 1;
  // roupa (ombros)
  for (let y = 39; y < PH; y++) { const w = Math.round(15 + (y - 39) * 1.7); R(x, o.roupa, cx - w, y, w * 2, 1); R(x, o.roupaS, cx - w, y, Math.round(w * 0.55), 1); R(x, o.roupaL, cx + w - 2, y, 2, 1); }
  // pescoço
  R(x, o.peleS, cx - 5, 33, 10, 9); R(x, o.pele, cx - 2, 33, 6, 8); R(x, o.peleS, cx - 5, 39, 10, 2);
  o.roupaExtra?.(x, cx);
  // cabeça
  for (let y = -12; y <= 12; y++) {
    const w = Math.round(Math.sqrt(1 - Math.pow(y / 12.6, 2)) * (y > 4 ? 9.4 - (y - 4) * 0.35 : 10));
    R(x, o.pele, cx - w, cy + y, w * 2 + 1, 1);
    for (let X = cx - w; X < cx - w * 0.15; X++) if ((cx - w * 0.15 - X) / (w * 0.9) > th(X, cy + y) * 0.9) P(x, o.peleS, X, cy + y);
    P(x, o.peleL, cx + w, cy + y); if (w > 3) P(x, o.peleL, cx + w - 1, cy + y);
  }
  R(x, o.peleS, cx - 11, cy - 1, 2, 5); R(x, o.pele, cx + 10, cy - 1, 2, 5); P(x, o.peleL, cx + 11, cy);
  // olhos, sobrancelhas, olheiras
  R(x, '#d8d0c4', cx - 7, ey, 4, 2); R(x, '#d8d0c4', cx + 3, ey, 4, 2);
  R(x, o.olho || '#1a100a', cx - 6, ey, 2, 2); R(x, o.olho || '#1a100a', cx + 4, ey, 2, 2); P(x, '#f4efe6', cx - 6, ey); P(x, '#f4efe6', cx + 4, ey);
  R(x, o.peleS, cx - 7, ey - 1, 4, 1); R(x, o.peleS, cx + 3, ey - 1, 4, 1);
  const so = o.sobrancelha || o.cabelo;
  if (o.cansado) { R(x, so, cx - 7, ey - 2, 2, 1); R(x, so, cx - 5, ey - 3, 2, 1); R(x, so, cx + 3, ey - 3, 2, 1); R(x, so, cx + 5, ey - 2, 2, 1); R(x, o.peleS, cx - 6, ey + 2, 3, 1); R(x, o.peleS, cx + 4, ey + 2, 3, 1); }
  else if (o.frio) { R(x, so, cx - 7, ey - 3, 4, 1); R(x, so, cx + 3, ey - 3, 4, 1); P(x, so, cx - 4, ey - 2); P(x, so, cx + 3, ey - 2); }
  else { R(x, so, cx - 7, ey - 2, 4, 1); R(x, so, cx + 3, ey - 2, 4, 1); }
  // nariz e boca
  R(x, o.peleS, cx - 1, ey + 2, 1, 4); P(x, o.peleS, cx - 2, ey + 5); P(x, o.peleS, cx + 1, ey + 5); P(x, o.peleL, cx, ey + 3);
  if (o.sorriso) { R(x, o.boca || '#5a2a20', cx - 3, ey + 8, 6, 1); P(x, o.boca || '#5a2a20', cx + 3, ey + 7); }
  else { R(x, o.boca || '#5a2a20', cx - 3, ey + 8, 7, 1); R(x, o.peleS, cx - 2, ey + 9, 5, 1); }
  o.rostoExtra?.(x, cx, cy, ey);
  o.cabeloFn?.(x, cx, cy, o);
  return k;
}
// cabelos e chapéus
const coque = (x, cx, cy, o) => { for (let y = -13; y <= -5; y++) { const w = Math.round(Math.sqrt(1 - Math.pow(y / 13.4, 2)) * 11); R(x, o.cabelo, cx - w, cy + y, w * 2 + 1, 1); } R(x, o.cabelo, cx - 11, cy - 5, 3, 9); R(x, o.cabelo, cx + 9, cy - 5, 3, 7); disco(x, cx + 1, cy - 15, 4, o.cabelo); R(x, o.cabeloL, cx - 2, cy - 17, 5, 1); R(x, o.cabeloL, cx - 6, cy - 11, 9, 1); P(x, o.cabelo, cx - 9, cy + 3); P(x, o.cabelo, cx - 10, cy + 5); P(x, o.cabelo, cx - 9, cy + 7); P(x, o.cabeloL, cx + 4, cy - 9); };
const quepe = (x, cx, cy, o) => { R(x, o.cabelo, cx - 10, cy - 6, 2, 6); R(x, o.cabelo, cx + 9, cy - 6, 2, 6); R(x, '#161a26', cx - 11, cy - 15, 23, 7); R(x, '#222a3c', cx - 11, cy - 15, 23, 1); R(x, '#0a0a10', cx - 11, cy - 9, 23, 2); R(x, '#0a0a10', cx - 12, cy - 7, 25, 2); R(x, '#3a3e4a', cx - 4, cy - 7, 10, 1); R(x, '#e8c84a', cx - 1, cy - 14, 3, 3); P(x, '#fff2a0', cx, cy - 13); };
const capacete = (x, cx, cy) => { for (let y = -18; y <= -6; y++) { const w = Math.round(Math.sqrt(1 - Math.pow((y + 6) / 12.6, 2)) * 13); R(x, '#9a2418', cx - w, cy + y, w * 2 + 1, 1); R(x, '#c83a24', cx - w + 2, cy + y, Math.max(0, w - 2), 1); } R(x, '#7a1a10', cx - 15, cy - 7, 31, 2); R(x, '#5a120a', cx - 15, cy - 5, 31, 1); R(x, '#c8c8d0', cx - 2, cy - 14, 5, 5); R(x, '#8a8a96', cx - 1, cy - 13, 3, 3); R(x, '#e86a4a', cx - 7, cy - 17, 6, 1); };
const bone = (x, cx, cy, o) => { R(x, o.cabelo, cx - 10, cy - 6, 2, 5); R(x, o.cabelo, cx + 9, cy - 6, 2, 5); for (let y = -14; y <= -7; y++) { const w = Math.round(Math.sqrt(1 - Math.pow(y / 14.4, 2)) * 11); R(x, '#c8642a', cx - w, cy + y, w * 2 + 1, 1); } R(x, '#e0884a', cx - 4, cy - 14, 9, 1); R(x, '#f4e0c0', cx - 2, cy - 12, 5, 3); R(x, '#c8642a', cx - 1, cy - 11, 3, 1); R(x, '#9a4a1e', cx - 12, cy - 7, 25, 2); R(x, '#7a3a16', cx - 11, cy - 5, 23, 1); R(x, o.peleS, cx - 9, cy - 4, 19, 1); };
const grisalho = (x, cx, cy) => { R(x, '#9a9a9e', cx - 11, cy - 8, 3, 9); R(x, '#9a9a9e', cx + 9, cy - 8, 3, 9); R(x, '#b8b8bc', cx - 11, cy - 8, 1, 6); for (const [dx, dy] of [[-6, -11], [-3, -12], [2, -12], [5, -11], [-8, -9], [7, -9]]) P(x, '#8a8a8e', cx + dx, cy + dy); P(x, '#f0d0b0', cx + 3, cy - 10); P(x, '#f0d0b0', cx + 4, cy - 10); };
const prata = (x, cx, cy) => { for (let y = -13; y <= -6; y++) { const w = Math.round(Math.sqrt(1 - Math.pow(y / 13.4, 2)) * 11); R(x, '#b8bcc4', cx - w, cy + y, w * 2 + 1, 1); } for (let k = -8; k <= 8; k += 3) linha(x, '#8a8e98', cx + k, cy - 12, cx + k + 3, cy - 6); R(x, '#d8dce4', cx - 3, cy - 13, 8, 1); R(x, '#b8bcc4', cx - 11, cy - 6, 2, 6); R(x, '#b8bcc4', cx + 10, cy - 6, 2, 6); };

const HEROIS = [
  { id: 'enfermeira', n: 1, nome: 'Daiane', quem: 'Enfermeira. A filha ficou sozinha em casa.',
    pele: '#a86e48', peleS: '#8a5638', peleL: '#c88a60', cabelo: '#1a1210', cabeloL: '#3a2a22', roupa: '#2a6a64', roupaS: '#1e504c', roupaL: '#3a8a82', cansado: true, cabeloFn: coque,
    roupaExtra: (x, cx) => { for (let y = 39; y < 46; y++) R(x, '#8a5638', cx - (46 - y) / 2 + 1, y, 46 - y - 1, 1); linha(x, '#8a8e96', cx - 9, 40, cx - 7, 52); linha(x, '#8a8e96', cx + 9, 40, cx + 7, 50); disco(x, cx + 7, 52, 2, '#c8ccd4'); R(x, '#e8eef2', cx - 16, 47, 5, 3); R(x, '#2a6ad8', cx - 15, 48, 3, 1); },
    fundo: (x, t) => { G(x, 0, 0, PW, PH, ['#0c1414', '#122020', '#18302c', '#1e3a36'], (X, Y) => 0.1 + Y / 120 + Math.max(0, 1 - Math.abs(X - 46) / 60) * 0.3); R(x, '#0a1010', 0, 36, PW, 1); for (let X = 4; X < PW; X += 14) R(x, '#0e1818', X, 37, 1, 19); const on = Math.sin(t * 9) + Math.sin(t * 2.7) > -1.2; R(x, on ? '#e8fff4' : '#3a4a46', 30, 1, 32, 2); if (on) { x.globalCompositeOperation = 'lighter'; brilho(x, 46, 4, 36, 'rgba(160,255,220,0.10)', 1, 1.1); x.globalCompositeOperation = 'source-over'; } },
    luz: (x, t) => brilho(x, 58, 22, 18, 'rgba(160,255,220,0.10)') },
  { id: 'policial', n: 2, nome: 'Sargento Edson', quem: 'Policial. Mandaram isolar o morro da mãe.',
    pele: '#5a3a28', peleS: '#46281a', peleL: '#7a5038', cabelo: '#0e0c0c', roupa: '#2a3446', roupaS: '#1c2432', roupaL: '#3a465c', cabeloFn: quepe,
    rostoExtra: (x, cx, cy, ey) => { R(x, '#1a100a', cx - 3, ey + 6, 7, 1); },
    roupaExtra: (x, cx) => { R(x, '#121418', cx - 14, 44, 28, 12); R(x, '#2a2c34', cx - 14, 44, 28, 1); R(x, '#e8c84a', cx - 9, 47, 3, 3); R(x, '#3a3e4a', cx + 5, 47, 6, 2); R(x, '#0a0a0e', cx + 14, 40, 4, 6); R(x, '#0a0a0e', cx + 16, 34, 1, 6); R(x, '#3a465c', cx - 7, 39, 4, 4); R(x, '#3a465c', cx + 4, 39, 4, 4); },
    fundo: (x, t) => { G(x, 0, 0, PW, PH, ['#06070e', '#0a0c18', '#10142a'], (X, Y) => Y / 70); const k = Math.floor(t * 4) % 2; x.globalCompositeOperation = 'lighter'; brilho(x, k ? 4 : 88, 20, 46, k ? 'rgba(255,40,40,0.16)' : 'rgba(40,90,255,0.18)'); x.globalCompositeOperation = 'source-over'; for (let i = 0; i < 18; i++) P(x, '#2a2e44', (i * 37) % PW, (i * 23) % 30); },
    luz: (x, t) => { const k = Math.floor(t * 4) % 2; brilho(x, k ? 34 : 58, 24, 14, k ? 'rgba(255,60,60,0.16)' : 'rgba(80,120,255,0.18)'); } },
  { id: 'bombeiro', n: 3, nome: 'Tati', quem: 'Bombeira. O quartel caiu com o parceiro dentro.',
    pele: '#c8906a', peleS: '#a8704c', peleL: '#e0aa82', cabelo: '#3a2414', roupa: '#8a6a3a', roupaS: '#6a5028', roupaL: '#a8844c', cabeloFn: capacete,
    rostoExtra: (x, cx, cy, ey) => { for (const [dx, dy] of [[-8, 5], [-7, 6], [6, 7], [7, 6], [-2, -4], [8, 3]]) P(x, '#4a3226', cx + dx, ey + dy); R(x, '#3a2414', cx - 11, cy + 2, 2, 6); },
    roupaExtra: (x, cx) => { R(x, '#6a5028', cx - 6, 38, 12, 4); for (let y = 49; y < 52; y++) { const w = Math.round(15 + (y - 39) * 1.7); R(x, y === 50 ? '#e8d84a' : '#c8c8b8', cx - w, y, w * 2, 1); } R(x, '#2a2018', cx, 42, 1, 14); },
    fundo: (x, t) => { G(x, 0, 0, PW, PH, ['#1a0806', '#3a120a', '#6a2410', '#a84a1a', '#e8862a'], (X, Y) => Y / 70 + 0.15 * Math.sin(X / 9 + t * 3) * (Y / PH)); for (let i = 0; i < 14; i++) { const X = (i * 29 + t * 9 * (1 + i % 3)) % PW, Y = PH - ((t * 14 * (1 + i % 4) + i * 17) % PH); P(x, i % 2 ? '#ffd27a' : '#ff8a3a', X, Y); } },
    luz: (x, t) => brilho(x, 40, 34, 20, `rgba(255,140,60,${0.12 + 0.04 * Math.sin(t * 11)})`) },
  { id: 'entregador', n: 4, nome: 'Kauã', quem: 'Entregador. A insulina da avó acabou.',
    pele: '#7a4a30', peleS: '#5e3622', peleL: '#9a6444', cabelo: '#141010', roupa: '#1e2a42', roupaS: '#141c2e', roupaL: '#2c3c5c', cabeloFn: bone,
    roupaExtra: (x, cx) => { R(x, '#16203a', cx - 12, 38, 24, 4); for (let y = 48; y < 50; y++) { const w = Math.round(15 + (y - 39) * 1.7); R(x, '#8a96a8', cx - w, y, w * 2, 1); } R(x, '#0e1420', cx, 42, 1, 14); },
    fundo: (x, t) => { G(x, 0, 0, PW, PH, ['#05060c', '#0a0b17', '#121228', '#22182e', '#3a1c2a'], (X, Y) => Y / 70); const r = rnd(4); x.globalCompositeOperation = 'lighter'; for (let i = 0; i < 8; i++) brilho(x, r() * PW, 10 + r() * 30, 4 + r() * 5, r() < 0.6 ? 'rgba(230,130,60,0.14)' : 'rgba(80,200,230,0.12)', 1.5); x.globalCompositeOperation = 'source-over'; for (let i = 0; i < 26; i++) { const X = (i * 13 + t * 20) % PW, Y = (i * 31 + t * 80) % PH; P(x, 'rgba(150,170,215,0.5)', X, Y); P(x, 'rgba(150,170,215,0.4)', X - 1, Y + 2); } },
    luz: (x, t) => brilho(x, 46, 48, 20, `rgba(90,220,240,${0.14 + 0.03 * Math.sin(t * 2)})`, 1, 0.9) },
  { id: 'mecanico', n: 5, nome: 'Seu Ademir', quem: 'Mecânico. Ouviu o filho no rádio.',
    pele: '#d8a878', peleS: '#b8885a', peleL: '#f0c49a', cabelo: '#8a8a8e', sobrancelha: '#7a7a7e', roupa: '#2a4a7a', roupaS: '#1e365a', roupaL: '#3a5e94', cansado: false, cabeloFn: grisalho,
    rostoExtra: (x, cx, cy, ey) => { R(x, '#9a9a9e', cx - 4, ey + 6, 9, 2); R(x, '#b8b8bc', cx - 3, ey + 6, 7, 1); for (const [dx, dy] of [[-7, 8], [-6, 10], [5, 9], [7, 8], [-5, 11], [4, 11]]) P(x, '#a8805a', cx + dx, ey + dy); R(x, '#3a3430', cx + 5, ey + 3, 3, 1); P(x, '#3a3430', cx + 6, ey + 4); },
    roupaExtra: (x, cx) => { R(x, '#6a6a6e', cx - 7, 39, 14, 6); R(x, '#5a5a5e', cx - 7, 39, 3, 6); R(x, '#2a4a7a', cx - 9, 44, 4, 12); R(x, '#2a4a7a', cx + 5, 44, 4, 12); R(x, '#c8c8d0', cx - 8, 45, 2, 2); R(x, '#c8c8d0', cx + 6, 45, 2, 2); R(x, '#a82a2a', cx + 13, 38, 9, 6); R(x, '#c83a3a', cx + 13, 38, 9, 1); R(x, '#1a1a1a', cx - 14, 50, 4, 2); },
    fundo: (x, t) => { G(x, 0, 0, PW, PH, ['#0a0806', '#16120c', '#221a10', '#30241a'], (X, Y) => 0.2 + Math.max(0, 1 - Math.hypot((X - 18) / 50, (Y - 6) / 40)) * 0.8); for (let Y = 6; Y < 36; Y += 4) for (let X = 60; X < 90; X += 4) P(x, '#2a2218', X, Y); linha(x, '#3a3228', 66, 10, 72, 22); linha(x, '#3a3228', 78, 8, 78, 24); R(x, '#3a3228', 75, 8, 7, 2); const s = Math.sin(t * 1.4) * 3; linha(x, '#2a2a2a', 18, 0, 18 + s, 6); R(x, '#4a4232', 15 + s, 6, 7, 2); P(x, '#ffe8a0', 18 + s, 8); x.globalCompositeOperation = 'lighter'; brilho(x, 18 + s, 12, 34, 'rgba(255,210,120,0.10)'); x.globalCompositeOperation = 'source-over'; },
    luz: (x, t) => brilho(x, 34, 18, 16, 'rgba(255,210,120,0.12)') },
  { id: 'valadares', n: 6, nome: 'Augusto Valadares', quem: 'O dono da vacina. Lugar reservado no helicóptero.',
    pele: '#e0b89a', peleS: '#c09878', peleL: '#f4d2b8', cabelo: '#b8bcc4', sobrancelha: '#8a8e98', roupa: '#1a1c24', roupaS: '#101218', roupaL: '#2a2c38', frio: true, sorriso: true, cabeloFn: prata,
    rostoExtra: (x, cx, cy, ey) => { R(x, '#c8ccd4', cx - 8, ey - 1, 6, 1); R(x, '#c8ccd4', cx + 2, ey - 1, 6, 1); R(x, '#c8ccd4', cx - 2, ey, 4, 1); P(x, '#ffffff', cx - 3, ey); P(x, '#ffffff', cx + 7, ey); },
    roupaExtra: (x, cx) => { for (let y = 39; y < PH; y++) { const w = Math.max(0, Math.round((y - 39) * 0.45)); R(x, '#e8e4dc', cx - 4 - w, y, 9 + w * 2, 1); } R(x, '#7a1a22', cx - 1, 40, 3, 16); R(x, '#5a1018', cx - 1, 40, 3, 2); linha(x, '#2a2c38', cx - 6, 40, cx - 12, 56); linha(x, '#2a2c38', cx + 6, 40, cx + 12, 56); R(x, '#c8a84a', cx - 15, 47, 2, 2); },
    fundo: (x, t) => { G(x, 0, 0, PW, PH, ['#0a0c16', '#10142a', '#182040'], (X, Y) => Y / 80); for (let X = 0; X < PW; X++) { const h = 30 + Math.round(Math.abs(Math.sin(X * 0.7)) * 8); R(x, '#0a0a14', X, h + 14, 1, PH); } for (const fx of [14, 40, 70]) { x.globalCompositeOperation = 'lighter'; brilho(x, fx, 46, 10, `rgba(255,110,40,${0.18 + 0.06 * Math.sin(t * 7 + fx)})`); x.globalCompositeOperation = 'source-over'; P(x, '#ffb04a', fx, 46); } for (let X = 0; X < PW; X += 23) R(x, '#2a2e3a', X, 0, 2, PH); R(x, '#2a2e3a', 0, 30, PW, 1); R(x, 'rgba(160,190,230,0.06)', 0, 0, PW, PH); },
    luz: (x) => brilho(x, 60, 20, 16, 'rgba(200,220,255,0.10)') }
];


const POR_ID = Object.fromEntries(HEROIS.map(h => [h.id, h]));
const pessoas = new Map(), quadros = new Map();
export const INFO_HEROI = id => POR_ID[id] || null;
// o retrato do herói no tempo t (o mesmo canvas é reaproveitado; desenhe-o logo em seguida)
export function retrato(id, t = 0, trancado = false) {
  const h = POR_ID[id];
  if (!h) return null;
  if (!pessoas.has(id)) pessoas.set(id, busto(h));
  const k = id + (trancado ? ':t' : '');
  if (!quadros.has(k)) quadros.set(k, novo(PW, PH));
  const [c, x] = quadros.get(k), pessoa = pessoas.get(id);
  x.globalCompositeOperation = 'source-over';
  h.fundo(x, t);
  x.globalCompositeOperation = 'source-over';
  if (trancado) {
    R(x, 'rgba(4,4,8,0.72)', 0, 0, PW, PH);
    const [s, sx] = novo(PW, PH); sx.drawImage(pessoa, 0, 0); sx.globalCompositeOperation = 'source-in'; R(sx, '#050508', 0, 0, PW, PH);
    x.drawImage(s, 0, 0);
    for (const [dx, dy] of [[-2, -6], [-1, -7], [0, -7], [1, -7], [2, -6], [2, -5], [1, -4], [0, -3], [0, -2], [0, 1]]) R(x, '#3a3846', 45 + dx * 2, 26 + dy * 2, 2, 2);
    return c;
  }
  x.drawImage(pessoa, 0, 0);
  x.globalCompositeOperation = 'lighter'; h.luz(x, t); x.globalCompositeOperation = 'source-over';
  return c;
}
