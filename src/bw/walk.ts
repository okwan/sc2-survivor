/**
 * Where units can walk on a real map, from the tileset's VF4 minitile flags (8 px cells) with
 * mineral fields and geysers blocked, like StarCraft's own pathing grid. Ground enemies follow a
 * flow field (breadth-first distances to the player on a 16 px grid) around cliffs and water.
 */
export class MapWalk {
  /** minitiles per row / column */
  readonly mw: number;
  readonly mh: number;
  /** 16 px pathing cells per row / column */
  readonly cw: number;
  readonly ch: number;
  private mini: Uint8Array;
  /** pathing cell is fully walkable and connected to the start */
  private open: Uint8Array;
  private dist: Int32Array;
  private queue: Int32Array;
  /** flow fields: 0 = toward the player (enemies), 1 = toward the player's move order */
  private flows: { dist: Int32Array; cell: number }[];

  constructor(w: number, h: number, bits: Uint8Array, startX: number, startY: number) {
    this.mw = w * 4;
    this.mh = h * 4;
    this.cw = w * 2;
    this.ch = h * 2;
    this.mini = new Uint8Array(this.mw * this.mh);
    for (let i = 0; i < this.mini.length; i++) this.mini[i] = (bits[i >> 3] >> (i & 7)) & 1;
    const n = this.cw * this.ch;
    const ok = new Uint8Array(n);
    for (let cy = 0; cy < this.ch; cy++)
      for (let cx = 0; cx < this.cw; cx++) {
        const m = cy * 2 * this.mw + cx * 2;
        ok[cy * this.cw + cx] = this.mini[m] & this.mini[m + 1] & this.mini[m + this.mw] & this.mini[m + this.mw + 1];
      }
    this.open = ok;
    this.dist = new Int32Array(n);
    this.queue = new Int32Array(n);
    this.flows = [0, 1].map(() => ({ dist: new Int32Array(n).fill(-1), cell: -1 }));
    // keep only the ground connected to the start, so nothing spawns on a plateau it can't leave
    const s = this.nearestCell(startX, startY, 12, ok);
    this.open = new Uint8Array(n);
    if (s >= 0) {
      this.bfs(s, ok, 1 << 30, this.dist);
      for (let i = 0; i < n; i++) this.open[i] = this.dist[i] >= 0 ? 1 : 0;
    }
  }

  /** True when the map pixel is on walkable ground. */
  walkable(x: number, y: number): boolean {
    const mx = x >> 3;
    const my = y >> 3;
    if (mx < 0 || my < 0 || mx >= this.mw || my >= this.mh) return false;
    return this.mini[my * this.mw + mx] === 1;
  }

  /** True when a circle of radius r around the map pixel fits on walkable ground (5 samples). */
  fits(x: number, y: number, r: number): boolean {
    const k = r * 0.7;
    return this.walkable(x, y) && this.walkable(x - k, y - k) && this.walkable(x + k, y - k) && this.walkable(x - k, y + k) && this.walkable(x + k, y + k);
  }

  /** True when the map pixel is on ground connected to the start. */
  reachable(x: number, y: number): boolean {
    const cx = x >> 4;
    const cy = y >> 4;
    return cx >= 0 && cy >= 0 && cx < this.cw && cy < this.ch && this.open[cy * this.cw + cx] === 1;
  }

  /** Centre of the nearest reachable cell within `maxR` cells, or null. */
  nearestReachable(x: number, y: number, maxR = 16): [number, number] | null {
    const c = this.nearestCell(x, y, maxR, this.open);
    return c < 0 ? null : [(c % this.cw) * 16 + 8, Math.floor(c / this.cw) * 16 + 8];
  }

  private nearestCell(x: number, y: number, maxR: number, grid: Uint8Array): number {
    const cx0 = Math.max(0, Math.min(this.cw - 1, x >> 4));
    const cy0 = Math.max(0, Math.min(this.ch - 1, y >> 4));
    for (let r = 0; r <= maxR; r++)
      for (let dy = -r; dy <= r; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const cx = cx0 + dx;
          const cy = cy0 + dy;
          if (cx < 0 || cy < 0 || cx >= this.cw || cy >= this.ch) continue;
          if (grid[cy * this.cw + cx]) return cy * this.cw + cx;
        }
    return -1;
  }

  private bfs(start: number, grid: Uint8Array, maxD: number, dist: Int32Array) {
    const { cw, ch, queue } = this;
    dist.fill(-1);
    let head = 0;
    let tail = 0;
    dist[start] = 0;
    queue[tail++] = start;
    while (head < tail) {
      const c = queue[head++];
      const d = dist[c] + 1;
      if (d > maxD) continue;
      const x = c % cw;
      if (x > 0 && grid[c - 1] && dist[c - 1] < 0) (dist[c - 1] = d), (queue[tail++] = c - 1);
      if (x < cw - 1 && grid[c + 1] && dist[c + 1] < 0) (dist[c + 1] = d), (queue[tail++] = c + 1);
      if (c >= cw && grid[c - cw] && dist[c - cw] < 0) (dist[c - cw] = d), (queue[tail++] = c - cw);
      if (c < cw * (ch - 1) && grid[c + cw] && dist[c + cw] < 0) (dist[c + cw] = d), (queue[tail++] = c + cw);
    }
  }

  /** Recomputes a flow field toward a map pixel (cheap to call every frame: only reruns when the target cell changes). */
  flowTo(x: number, y: number, slot = 0, maxCells = 220) {
    const t = this.nearestCell(x, y, 4, this.open);
    const f = this.flows[slot];
    if (t < 0 || t === f.cell) return;
    f.cell = t;
    this.bfs(t, this.open, maxCells, f.dist);
  }

  /**
   * Direction to walk from a map pixel along the flow field, written into out[0..1]; false when
   * the field doesn't reach there (walk straight instead).
   */
  flowDir(x: number, y: number, out: Float32Array, slot = 0): boolean {
    const cx = x >> 4;
    const cy = y >> 4;
    const { cw, ch } = this;
    const dist = this.flows[slot].dist;
    if (cx < 0 || cy < 0 || cx >= cw || cy >= ch) return false;
    let here = dist[cy * cw + cx];
    if (here < 0) {
      // standing on a wall edge: head for the best neighbouring cell
      here = 1 << 30;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
          const d = dist[ny * cw + nx];
          if (d >= 0 && d + 1 < here) here = d + 1;
        }
      if (here === 1 << 30) return false;
    }
    let vx = 0;
    let vy = 0;
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || ny < 0 || nx >= cw || ny >= ch) continue;
        const d = dist[ny * cw + nx];
        if (d < 0 || d >= here) continue;
        // no cutting corners past a wall
        if (dx && dy && (dist[cy * cw + nx] < 0 || dist[ny * cw + cx] < 0)) continue;
        const w = (here - d) / (dx && dy ? 1.414 : 1);
        vx += dx * w;
        vy += dy * w;
      }
    const l = Math.hypot(vx, vy);
    if (l < 1e-6) return false;
    out[0] = vx / l;
    out[1] = vy / l;
    return true;
  }
}
