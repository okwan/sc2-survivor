/**
 * Decoders for the other Brood War data formats the game uses: PCX images (console, title screen),
 * FNT bitmap fonts, and tilesets (CV5 groups -> VX4 megatiles -> VR4 8x8 minitiles).
 * All output is RGBA so it can go straight into a canvas or a PNG.
 */

export interface Rgba {
  width: number;
  height: number;
  data: Uint8ClampedArray;
}

/** 8-bit RLE PCX with its own 256-colour palette at the end. Index `transparent` (if given) becomes alpha 0. */
export function decodePcx(buf: Uint8Array, transparent?: number): Rgba & { indices: Uint8Array; palette: Uint8Array } {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf[0] !== 0x0a || buf[3] !== 8) throw new Error('not an 8-bit PCX');
  const width = v.getUint16(8, true) - v.getUint16(4, true) + 1;
  const height = v.getUint16(10, true) - v.getUint16(6, true) + 1;
  const bpl = v.getUint16(66, true);
  const indices = new Uint8Array(width * height);
  let p = 128;
  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < bpl && p < buf.length) {
      let c = buf[p++];
      let n = 1;
      if ((c & 0xc0) === 0xc0) {
        n = c & 0x3f;
        c = buf[p++];
      }
      for (let i = 0; i < n; i++, x++) if (x < width) indices[y * width + x] = c;
    }
  }
  const palette = new Uint8Array(768);
  if (buf.length >= 769 && buf[buf.length - 769] === 0x0c) palette.set(buf.subarray(buf.length - 768));
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < indices.length; i++) {
    const c = indices[i];
    data[i * 4] = palette[c * 3];
    data[i * 4 + 1] = palette[c * 3 + 1];
    data[i * 4 + 2] = palette[c * 3 + 2];
    data[i * 4 + 3] = c === transparent ? 0 : 255;
  }
  return { width, height, data, indices, palette };
}

export interface FntGlyph {
  w: number;
  h: number;
  x: number;
  y: number;
  /** palette shade per pixel (0 = empty, 1-7 = shade index), w*h */
  px: Uint8Array;
}

export interface Fnt {
  low: number;
  high: number;
  maxW: number;
  maxH: number;
  glyphs: Map<number, FntGlyph>;
}

/** Brood War .fnt: "FONT", low/high char, max size, offsets, then per glyph (skip << 3 | shade) bytes. */
export function decodeFnt(buf: Uint8Array): Fnt {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  if (String.fromCharCode(buf[0], buf[1], buf[2], buf[3]) !== 'FONT') throw new Error('not a FONT');
  const low = buf[4];
  const high = buf[5];
  const maxW = buf[6];
  const maxH = buf[7];
  const glyphs = new Map<number, FntGlyph>();
  for (let c = low; c <= high; c++) {
    const off = v.getUint32(8 + (c - low) * 4, true);
    if (!off) continue;
    const w = buf[off];
    const h = buf[off + 1];
    const x = buf[off + 2];
    const y = buf[off + 3];
    const px = new Uint8Array(w * h);
    let p = off + 4;
    let i = 0;
    while (i < w * h && p < buf.length) {
      const b = buf[p++];
      i += b >> 3;
      if (i < w * h) px[i++] = b & 7;
    }
    glyphs.set(c, { w, h, x, y, px });
  }
  return { low, high, maxW, maxH, glyphs };
}

export interface Tileset {
  /** CV5 groups: 16 megatile ids each, plus header fields */
  groups: { type: number; flags: number; edges: number[]; extra: number[]; tiles: number[] }[];
  vx4: Uint16Array;
  vr4: Uint8Array;
  pal: Uint8Array; // 256 RGBA (.wpe)
}

export function parseTileset(cv5: Uint8Array, vx4: Uint8Array, vr4: Uint8Array, wpe: Uint8Array): Tileset {
  const v = new DataView(cv5.buffer, cv5.byteOffset, cv5.byteLength);
  const groups: Tileset['groups'] = [];
  for (let o = 0; o + 52 <= cv5.length; o += 52) {
    const u = (i: number) => v.getUint16(o + i * 2, true);
    groups.push({ type: u(0), flags: u(1), edges: [u(2), u(3), u(4), u(5)], extra: [u(6), u(7), u(8), u(9)], tiles: Array.from({ length: 16 }, (_, i) => u(10 + i)) });
  }
  const vx = new Uint16Array(vx4.length >> 1);
  const vv = new DataView(vx4.buffer, vx4.byteOffset, vx4.byteLength);
  for (let i = 0; i < vx.length; i++) vx[i] = vv.getUint16(i * 2, true);
  return { groups, vx4: vx, vr4: vr4, pal: wpe };
}

/** Draws a 32x32 megatile into an RGBA buffer. */
export function drawMegatile(ts: Tileset, mega: number, out: Uint8ClampedArray, stride: number, ox: number, oy: number) {
  for (let m = 0; m < 16; m++) {
    const ref = ts.vx4[mega * 16 + m] ?? 0;
    const flip = ref & 1;
    const mini = ref >> 1;
    const mx = (m & 3) * 8;
    const my = (m >> 2) * 8;
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const c = ts.vr4[mini * 64 + y * 8 + (flip ? 7 - x : x)] ?? 0;
        const o = ((oy + my + y) * stride + ox + mx + x) * 4;
        out[o] = ts.pal[c * 4];
        out[o + 1] = ts.pal[c * 4 + 1];
        out[o + 2] = ts.pal[c * 4 + 2];
        out[o + 3] = 255;
      }
    }
  }
}
