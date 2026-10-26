/**
 * Uniform spatial hash rebuilt every frame. Items are referenced by index into
 * the owner's array, stored as intrusive linked lists so a rebuild allocates nothing.
 */
export class SpatialGrid {
  readonly cell: number;
  readonly cols: number;
  readonly rows: number;
  readonly minX: number;
  readonly minY: number;
  private head: Int32Array;
  private next: Int32Array;

  constructor(minX: number, minY: number, width: number, height: number, cell: number, capacity: number) {
    this.cell = cell;
    this.minX = minX;
    this.minY = minY;
    this.cols = Math.ceil(width / cell);
    this.rows = Math.ceil(height / cell);
    this.head = new Int32Array(this.cols * this.rows).fill(-1);
    this.next = new Int32Array(capacity).fill(-1);
  }

  clear() {
    this.head.fill(-1);
  }

  private cellIndex(x: number, y: number): number {
    let cx = ((x - this.minX) / this.cell) | 0;
    let cy = ((y - this.minY) / this.cell) | 0;
    if (cx < 0) cx = 0;
    else if (cx >= this.cols) cx = this.cols - 1;
    if (cy < 0) cy = 0;
    else if (cy >= this.rows) cy = this.rows - 1;
    return cy * this.cols + cx;
  }

  insert(i: number, x: number, y: number) {
    const c = this.cellIndex(x, y);
    this.next[i] = this.head[c];
    this.head[c] = i;
  }

  /** Writes candidate indices whose cell overlaps the circle into out; returns the count. */
  query(x: number, y: number, r: number, out: Int32Array): number {
    const cell = this.cell;
    let x0 = ((x - r - this.minX) / cell) | 0;
    let x1 = ((x + r - this.minX) / cell) | 0;
    let y0 = ((y - r - this.minY) / cell) | 0;
    let y1 = ((y + r - this.minY) / cell) | 0;
    if (x0 < 0) x0 = 0;
    if (y0 < 0) y0 = 0;
    if (x1 >= this.cols) x1 = this.cols - 1;
    if (y1 >= this.rows) y1 = this.rows - 1;
    let n = 0;
    const max = out.length;
    for (let cy = y0; cy <= y1; cy++) {
      for (let cx = x0; cx <= x1; cx++) {
        let i = this.head[cy * this.cols + cx];
        while (i !== -1) {
          if (n < max) out[n++] = i;
          i = this.next[i];
        }
      }
    }
    return n;
  }
}
