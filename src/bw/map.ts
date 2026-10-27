import { Container, Sprite, Texture } from 'pixi.js';
import { drawMegatile, parseTileset, type Tileset } from './formats';

/**
 * Real StarCraft scenarios as battlefields. scripts/fetch-bw.mjs turns each zone's campaign map
 * into bw/maps/<zone>.json: the megatile under every 32x32 tile (MTXM resolved through the CV5),
 * the doodad sprites (THG2), mineral fields, geysers and start locations. The ground is drawn
 * here in chunks around the camera so a 192x192 map never needs one giant texture.
 */

export interface BwMap {
  zone: string;
  title: string;
  set: string;
  w: number;
  h: number;
  tiles: Uint16Array;
  /** walkable bit per 8 px minitile ((w*4) x (h*4)), when the build had the tileset's VF4 */
  walk: Uint8Array | null;
  images: string[];
  /** [image index, x, y] in map pixels */
  doodads: [number, number, number][];
  /** [x, y, kind 0-2] */
  minerals: [number, number, number][];
  geysers: [number, number][];
  /** [x, y, owner] */
  starts: [number, number, number][];
}

interface MapJson extends Omit<BwMap, 'tiles' | 'walk'> {
  tiles: string;
  walk?: string;
}

function base64(s: string): Uint8Array {
  const bin = atob(s);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function parseMapJson(j: MapJson): BwMap {
  return { ...j, tiles: new Uint16Array(base64(j.tiles).buffer, 0, j.w * j.h), walk: j.walk ? base64(j.walk) : null };
}

export function mapTilesetFiles(set: string): string[] {
  return ['cv5', 'vx4', 'vr4', 'wpe'].map((x) => `tileset/${set}.${x}`);
}

/**
 * Where the player starts, in map pixels: the start location nearest the middle of the map, so
 * enemies can come from every side; the middle itself when the map has none.
 */
export function mapStart(m: BwMap): [number, number] {
  const cx = m.w * 16;
  const cy = m.h * 16;
  let best: [number, number] = [cx, cy];
  let bestD = Infinity;
  for (const [x, y] of m.starts) {
    const d = Math.hypot(x - cx, y - cy);
    if (d < bestD) {
      bestD = d;
      best = [x, y];
    }
  }
  return best;
}

const CH = 16; // megatiles per chunk side (512 px)
const MAX_CHUNKS = 64;

/** Ground of one map, built lazily in 512 px chunks as the camera moves. */
export class MapGround {
  readonly container = new Container();
  private ts: Tileset;
  private chunks = new Map<number, { spr: Sprite; used: number }>();
  private frame = 0;

  constructor(readonly map: BwMap, files: Map<string, Uint8Array>) {
    const [cv5, vx4, vr4, wpe] = mapTilesetFiles(map.set).map((p) => files.get(p));
    if (!cv5 || !vx4 || !vr4 || !wpe) throw new Error(`tileset ${map.set} not loaded`);
    this.ts = parseTileset(cv5, vx4, vr4, wpe);
  }

  get palette() {
    return this.ts.pal;
  }

  private build(cx: number, cy: number): Sprite {
    const m = this.map;
    const tw = Math.min(CH, m.w - cx * CH);
    const th = Math.min(CH, m.h - cy * CH);
    const cv = document.createElement('canvas');
    cv.width = tw * 32;
    cv.height = th * 32;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(cv.width, cv.height);
    for (let y = 0; y < th; y++)
      for (let x = 0; x < tw; x++) drawMegatile(this.ts, m.tiles[(cy * CH + y) * m.w + cx * CH + x], img.data, cv.width, x * 32, y * 32);
    ctx.putImageData(img, 0, 0);
    const tex = Texture.from(cv);
    tex.source.scaleMode = 'nearest';
    const spr = new Sprite(tex);
    spr.position.set(cx * CH * 32, cy * CH * 32);
    this.container.addChild(spr);
    return spr;
  }

  /**
   * Makes sure the chunks under the view (map pixels) exist. Builds at most `budget` new chunks
   * per call so walking into new ground never hitches; the first call should pass Infinity.
   */
  update(x0: number, y0: number, x1: number, y1: number, budget = 2) {
    this.frame++;
    const m = this.map;
    const S = CH * 32;
    const ca = Math.max(0, Math.floor(x0 / S) - 1);
    const cb = Math.min(Math.ceil(m.w / CH) - 1, Math.floor(x1 / S) + 1);
    const ra = Math.max(0, Math.floor(y0 / S) - 1);
    const rb = Math.min(Math.ceil(m.h / CH) - 1, Math.floor(y1 / S) + 1);
    const vis0 = [Math.floor(x0 / S), Math.floor(x1 / S), Math.floor(y0 / S), Math.floor(y1 / S)];
    for (let pass = 0; pass < 2; pass++)
      for (let cy = ra; cy <= rb; cy++)
        for (let cx = ca; cx <= cb; cx++) {
          const key = cy * 1024 + cx;
          const c = this.chunks.get(key);
          if (c) {
            c.used = this.frame;
            continue;
          }
          // visible chunks first, then the margin around them
          const visible = cx >= vis0[0] && cx <= vis0[1] && cy >= vis0[2] && cy <= vis0[3];
          if (pass === 0 && !visible) continue;
          if (budget <= 0) continue;
          budget--;
          this.chunks.set(key, { spr: this.build(cx, cy), used: this.frame });
        }
    if (this.chunks.size > MAX_CHUNKS) {
      const old = [...this.chunks].sort((a, b) => a[1].used - b[1].used).slice(0, this.chunks.size - MAX_CHUNKS);
      for (const [k, c] of old) {
        if (c.used === this.frame) continue;
        c.spr.destroy({ texture: true, textureSource: true });
        this.chunks.delete(k);
      }
    }
  }

  /** One pixel per tile, like the console minimap. */
  minimap(): HTMLCanvasElement {
    const m = this.map;
    const cv = document.createElement('canvas');
    cv.width = m.w;
    cv.height = m.h;
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(m.w, m.h);
    const { vx4, vr4, pal } = this.ts;
    for (let i = 0; i < m.tiles.length; i++) {
      let r = 0;
      let g = 0;
      let b = 0;
      // average a few minitile pixels so the colour matches the tile's look
      for (const mi of [0, 5, 10, 15]) {
        const mini = (vx4[m.tiles[i] * 16 + mi] ?? 0) >> 1;
        const c = vr4[mini * 64 + 27] ?? 0;
        r += pal[c * 4];
        g += pal[c * 4 + 1];
        b += pal[c * 4 + 2];
      }
      img.data.set([r >> 2, g >> 2, b >> 2, 255], i * 4);
    }
    ctx.putImageData(img, 0, 0);
    return cv;
  }

  destroy() {
    for (const c of this.chunks.values()) c.spr.destroy({ texture: true, textureSource: true });
    this.chunks.clear();
    this.container.destroy();
  }
}
