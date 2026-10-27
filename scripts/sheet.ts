// Temporary (branch builds only): prints a PNG contact sheet of a GRP as base64 so it can be viewed from the log.
//   node --experimental-strip-types scripts/sheet.ts dist/bw <grp path in the MPQ> <palette path>
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { deflateSync } from 'node:zlib';
import { drawGrpFrame, parseGrp } from '../src/bw/grp.ts';

export function png(w: number, h: number, rgba: Uint8ClampedArray): Buffer {
  const crcT = new Int32Array(256).map((_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c;
  });
  const crc = (b: Buffer) => {
    let c = -1;
    for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8);
    return (c ^ -1) >>> 0;
  };
  const chunk = (t: string, d: Buffer) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(d.length);
    const td = Buffer.concat([Buffer.from(t), d]);
    const c = Buffer.alloc(4);
    c.writeUInt32BE(crc(td));
    return Buffer.concat([len, td, c]);
  };
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const [dir, grpPath, palPath] = process.argv.slice(2);
const g = parseGrp(readFileSync(join(dir, grpPath)));
const pal = readFileSync(join(dir, palPath));
const cols = 10;
const cw = Math.min(g.width, 80) + 4;
const ch = Math.min(g.height, 40) + 4;
const rows = Math.ceil(g.frames / cols);
const W = cols * cw;
const H = rows * ch;
const out = new Uint8ClampedArray(W * H * 4);
// magenta background so transparency is visible, grey grid lines
for (let i = 0; i < W * H; i++) out.set([80, 0, 80, 255], i * 4);
const full = new Uint8ClampedArray(g.width * g.height * 4);
for (let f = 0; f < g.frames; f++) {
  full.fill(0);
  drawGrpFrame(g, f, pal, full, g.width, 0, 0);
  const ox = (f % cols) * cw + 2;
  const oy = Math.floor(f / cols) * ch + 2;
  for (let y = 0; y < ch - 4; y++)
    for (let x = 0; x < cw - 4; x++) {
      const s = (y * g.width + x) * 4;
      if (full[s + 3]) out.set(full.subarray(s, s + 4), ((oy + y) * W + ox + x) * 4);
    }
}
console.log(`sheet ${grpPath} ${g.frames} frames ${cols} per row cell ${cw}x${ch}`);
console.log('sheetpng ' + png(W, H, out).toString('base64'));
