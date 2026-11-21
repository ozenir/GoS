// Mapa de distâncias até um alvo (o herói, ou a porta da sala). Os zumbis descem por ele
// e assim contornam prédios, carros e prateleiras sem ficar presos.

export class FlowField {
  constructor(raio = 26) {
    this.r = raio;
    this.n = raio * 2 + 1;
    this.d = new Int16Array(this.n * this.n);
    this.cx = 0; this.cy = 0;
    this.fila = new Int32Array(this.n * this.n);
    this.ok = false;
  }

  build(map, gx, gy) {
    const { n, r, d, fila } = this;
    const cx = Math.floor(gx), cy = Math.floor(gy);
    this.cx = cx; this.cy = cy;
    d.fill(-1);
    const ox = cx - r, oy = cy - r;
    // Cache de quais casas dá pra andar
    if (!this.walk || this.walk.length !== n * n) this.walk = new Uint8Array(n * n);
    const walk = this.walk;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) walk[y * n + x] = map.tileWalk(ox + x, oy + y) ? 1 : 0;
    let ini = 0, fim = 0;
    const start = r * n + r;
    d[start] = 0; fila[fim++] = start; walk[start] = 1;
    while (ini < fim) {
      const k = fila[ini++], x = k % n, y = (k / n) | 0, nd = d[k] + 1;
      if (x > 0 && walk[k - 1] && d[k - 1] < 0) { d[k - 1] = nd; fila[fim++] = k - 1; }
      if (x < n - 1 && walk[k + 1] && d[k + 1] < 0) { d[k + 1] = nd; fila[fim++] = k + 1; }
      if (y > 0 && walk[k - n] && d[k - n] < 0) { d[k - n] = nd; fila[fim++] = k - n; }
      if (y < n - 1 && walk[k + n] && d[k + n] < 0) { d[k + n] = nd; fila[fim++] = k + n; }
    }
    this.ok = true;
  }

  dist(tx, ty) {
    const x = tx - this.cx + this.r, y = ty - this.cy + this.r;
    if (x < 0 || y < 0 || x >= this.n || y >= this.n) return -1;
    return this.d[y * this.n + x];
  }

  // Direção para descer no mapa a partir de (px, py). Devolve null se estiver fora do mapa.
  dir(px, py) {
    if (!this.ok) return null;
    const tx = Math.floor(px), ty = Math.floor(py);
    const here = this.dist(tx, ty);
    if (here < 0) return null;
    if (here === 0) return { x: this.cx + 0.5 - px, y: this.cy + 0.5 - py };
    let best = here, bx = 0, by = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const v = this.dist(tx + dx, ty + dy);
      if (v < 0 || v >= best) continue;
      // Diagonal só se as duas casas do lado também estiverem livres (não corta quina de prédio)
      if (dx && dy && (this.dist(tx + dx, ty) < 0 || this.dist(tx, ty + dy) < 0)) continue;
      best = v; bx = dx; by = dy;
    }
    if (best === here) return null;
    return { x: tx + bx + 0.5 - px, y: ty + by + 0.5 - py };
  }
}
