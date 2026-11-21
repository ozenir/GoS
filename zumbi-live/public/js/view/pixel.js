// Desenho em pixel: tudo com retângulos inteiros, sem borrão. Usado pelos sprites e pelo cenário.

export function canvas(w, h) {
  const c = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
  const x = c.getContext('2d');
  x.imageSmoothingEnabled = false;
  return [c, x];
}

// Polígono convexo preenchido por linhas (bordas retas e nítidas)
export function fillPoly(ctx, pts, cor) {
  let y0 = Infinity, y1 = -Infinity;
  for (const p of pts) { if (p[1] < y0) y0 = p[1]; if (p[1] > y1) y1 = p[1]; }
  y0 = Math.round(y0); y1 = Math.round(y1);
  ctx.fillStyle = cor;
  const n = pts.length;
  for (let y = y0; y < y1; y++) {
    const yc = y + 0.5;
    let xa = Infinity, xb = -Infinity;
    for (let i = 0; i < n; i++) {
      const [ax, ay] = pts[i], [bx, by] = pts[(i + 1) % n];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) {
        const x = ax + (yc - ay) / (by - ay) * (bx - ax);
        if (x < xa) xa = x; if (x > xb) xb = x;
      }
    }
    if (xa < xb) ctx.fillRect(Math.round(xa), y, Math.round(xb) - Math.round(xa), 1);
  }
}

export function line(ctx, x0, y0, x1, y1, cor, w = 1) {
  ctx.fillStyle = cor;
  x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
  const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx - dy, n = 0;
  for (;;) {
    ctx.fillRect(x0, y0, w, w);
    if ((x0 === x1 && y0 === y1) || ++n > 600) break;
    const e2 = 2 * err;
    if (e2 > -dy) { err -= dy; x0 += sx; }
    if (e2 < dx) { err += dx; y0 += sy; }
  }
}

export function disc(ctx, cx, cy, r, cor, achatado = 1) {
  ctx.fillStyle = cor;
  const ry = r * achatado;
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
    const k = 1 - (y * y) / (ry * ry || 1);
    if (k < 0) continue;
    const hw = Math.round(r * Math.sqrt(k));
    ctx.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2, 1);
  }
}

// Contorno escuro de 1 pixel em volta de tudo que não é transparente (cara de pixel art)
export function contorno(c, cor = [20, 16, 26]) {
  const x = c.getContext('2d');
  const { width: w, height: h } = c;
  const img = x.getImageData(0, 0, w, h), d = img.data;
  const a = i => d[i * 4 + 3] > 40;
  const out = [];
  for (let y = 0; y < h; y++) for (let xx = 0; xx < w; xx++) {
    const i = y * w + xx;
    if (a(i)) continue;
    if ((xx > 0 && a(i - 1)) || (xx < w - 1 && a(i + 1)) || (y > 0 && a(i - w)) || (y < h - 1 && a(i + w))) out.push(i);
  }
  for (const i of out) { d[i * 4] = cor[0]; d[i * 4 + 1] = cor[1]; d[i * 4 + 2] = cor[2]; d[i * 4 + 3] = 255; }
  x.putImageData(img, 0, 0);
  return c;
}

export function espelhar(c) {
  const [o, x] = canvas(c.width, c.height);
  x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(c, 0, 0);
  return o;
}

// Escurece/clareia uma cor hex
export function tom(hex, k) {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
  if (k < 0) { r *= 1 + k; g *= 1 + k; b *= 1 + k; }
  else { r += (255 - r) * k; g += (255 - g) * k; b += (255 - b) * k; }
  return '#' + [r, g, b].map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
}
