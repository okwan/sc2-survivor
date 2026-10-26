/**
 * Decoder for StarCraft: Brood War .grp sprite files (palette-indexed, row RLE).
 *
 * Layout: u16 frameCount, u16 width, u16 height, then per frame
 * u8 x, u8 y, u8 w, u8 h, u32 offset to a table of u16 row offsets.
 * Each row is a stream of: 0x80|n = n transparent px, 0x40|n c = n px of colour c,
 * n c0..cn = n literal px.
 */
export interface GrpFile {
  frames: number;
  width: number;
  height: number;
  buf: Uint8Array;
  view: DataView;
}

export function parseGrp(buf: Uint8Array): GrpFile {
  if (buf.length < 6) throw new Error('grp too small');
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const frames = view.getUint16(0, true);
  const width = view.getUint16(2, true);
  const height = view.getUint16(4, true);
  if (!frames || !width || !height || 6 + frames * 8 > buf.length) throw new Error('bad grp header');
  return { frames, width, height, buf, view };
}

/**
 * Draws one frame into an RGBA buffer of the full sprite canvas (width x height),
 * so every frame shares the same centre. `pal` is 256 RGBA entries.
 */
export function drawGrpFrame(g: GrpFile, frame: number, pal: Uint8Array, out: Uint8ClampedArray, outStride: number, ox: number, oy: number, flip = false) {
  const { view, buf } = g;
  const h0 = 6 + frame * 8;
  const fx = view.getUint8(h0);
  const fy = view.getUint8(h0 + 1);
  const raw = view.getUint32(h0 + 4, true);
  let fw = view.getUint8(h0 + 2);
  if (raw & 0x80000000) fw += 0x100;
  const fh = view.getUint8(h0 + 3);
  const off = raw & 0x7fffffff;
  for (let y = 0; y < fh; y++) {
    let pos = off + view.getUint16(off + y * 2, true);
    let x = 0;
    const row = oy + fy + y;
    while (x < fw && pos < buf.length) {
      const c = buf[pos];
      if (c & 0x80) {
        x += c & 0x7f;
        pos++;
      } else if (c & 0x40) {
        const n = c & 0x3f;
        const col = buf[pos + 1];
        for (let i = 0; i < n; i++) put(x++, col);
        pos += 2;
      } else {
        for (let i = 0; i < c; i++) put(x++, buf[pos + 1 + i]);
        pos += 1 + c;
      }
    }
    function put(px: number, col: number) {
      if (px >= fw) return;
      const cx = flip ? g.width - 1 - (fx + px) : fx + px;
      const o = (row * outStride + ox + cx) * 4;
      const p = col * 4;
      out[o] = pal[p];
      out[o + 1] = pal[p + 1];
      out[o + 2] = pal[p + 2];
      out[o + 3] = 255;
    }
  }
}

/** Builds a GRP from indexed frames. Used by tests to round-trip the decoder. */
export function encodeGrp(width: number, height: number, frames: { x: number; y: number; w: number; h: number; px: Uint8Array }[]): Uint8Array {
  const chunks: number[][] = [];
  const header: number[] = [];
  let cursor = 6 + frames.length * 8;
  const body: number[] = [];
  for (const f of frames) {
    const rows: number[][] = [];
    for (let y = 0; y < f.h; y++) {
      const r: number[] = [];
      let x = 0;
      while (x < f.w) {
        const c = f.px[y * f.w + x];
        if (c === 0) {
          let n = 0;
          while (x < f.w && f.px[y * f.w + x] === 0 && n < 127) {
            n++;
            x++;
          }
          r.push(0x80 | n);
        } else {
          let n = 0;
          while (x + n < f.w && f.px[y * f.w + x + n] === c && n < 63) n++;
          if (n >= 3) {
            r.push(0x40 | n, c);
            x += n;
          } else {
            const lit: number[] = [];
            while (x < f.w && f.px[y * f.w + x] !== 0 && lit.length < 63) lit.push(f.px[y * f.w + x++]);
            r.push(lit.length, ...lit);
          }
        }
      }
      rows.push(r);
    }
    const tableOff = cursor + body.length;
    const tableLen = f.h * 2;
    let rowOff = tableLen;
    const table: number[] = [];
    for (const r of rows) {
      table.push(rowOff & 255, rowOff >> 8);
      rowOff += r.length;
    }
    body.push(...table, ...rows.flat());
    header.push(f.x, f.y, f.w & 255, f.h, tableOff & 255, (tableOff >> 8) & 255, (tableOff >> 16) & 255, ((tableOff >> 24) & 0x7f) | (f.w > 255 ? 0x80 : 0));
  }
  chunks.push([frames.length & 255, frames.length >> 8, width & 255, width >> 8, height & 255, height >> 8], header, body);
  return new Uint8Array(chunks.flat());
}
