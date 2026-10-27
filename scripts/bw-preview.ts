// CI-only visual check: renders contact sheets of the Brood War files copied to bwprev/ by
// `BW_INVENTORY=1 node scripts/fetch-bw.mjs` and prints them as base64 PNG lines in the job log
// (prefix "PNG <name> <part>/<parts> "). Nothing here is deployed.
//   node --experimental-strip-types scripts/bw-preview.ts bwprev
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
import { decodeFnt, decodePcx, drawMegatile, parseTileset } from '../src/bw/formats.ts';
import { drawGrpFrame, parseGrp } from '../src/bw/grp.ts';

const dir = process.argv[2] ?? 'bwprev';
const only = process.argv[3]; // optional sheet name filter
const f = (p: string) => readFileSync(join(dir, p.replace(/\\/g, '/').toLowerCase()));
const has = (p: string) => existsSync(join(dir, p.replace(/\\/g, '/').toLowerCase()));

class Sheet {
  data: Uint8ClampedArray;
  w: number;
  h: number;
  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(w * h * 4);
    for (let i = 0; i < w * h; i++) {
      this.data[i * 4] = 40;
      this.data[i * 4 + 1] = 0;
      this.data[i * 4 + 2] = 40;
      this.data[i * 4 + 3] = 255;
    }
  }
  blit(src: Uint8ClampedArray, sw: number, sh: number, dx: number, dy: number, scale = 1) {
    for (let y = 0; y < sh * scale; y++)
      for (let x = 0; x < sw * scale; x++) {
        const tx = dx + x;
        const ty = dy + y;
        if (tx < 0 || ty < 0 || tx >= this.w || ty >= this.h) continue;
        const s = (Math.floor(y / scale) * sw + Math.floor(x / scale)) * 4;
        if (!src[s + 3]) continue;
        const d = (ty * this.w + tx) * 4;
        this.data[d] = src[s];
        this.data[d + 1] = src[s + 1];
        this.data[d + 2] = src[s + 2];
      }
  }
  // 3x5 digits so cells can be labelled with their index
  label(n: number | string, x: number, y: number) {
    const G: Record<string, string> = { 0: '111101101101111', 1: '010110010010111', 2: '111001111100111', 3: '111001111001111', 4: '101101111001001', 5: '111100111001111', 6: '111100111101111', 7: '111001001001001', 8: '111101111101111', 9: '111101111001111' };
    const s = String(n);
    for (let i = 0; i < s.length; i++) {
      const g = G[s[i]];
      if (!g) continue;
      for (let p = 0; p < 15; p++) {
        for (const [ox, oy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) {
          const px = x + i * 8 + (p % 3) * 2 + ox;
          const py = y + Math.floor(p / 3) * 2 + oy;
          if (px >= this.w || py >= this.h) continue;
          const d = (py * this.w + px) * 4;
          const on = g[p] === '1';
          this.data[d] = on ? 255 : 0;
          this.data[d + 1] = on ? 255 : 0;
          this.data[d + 2] = on ? 0 : 0;
        }
      }
    }
  }
  emit(name: string) {
    const raw = Buffer.alloc((this.w * 3 + 1) * this.h);
    for (let y = 0; y < this.h; y++) {
      raw[y * (this.w * 3 + 1)] = 0;
      for (let x = 0; x < this.w; x++) {
        const s = (y * this.w + x) * 4;
        const d = y * (this.w * 3 + 1) + 1 + x * 3;
        raw[d] = this.data[s];
        raw[d + 1] = this.data[s + 1];
        raw[d + 2] = this.data[s + 2];
      }
    }
    const chunk = (type: string, body: Buffer) => {
      const len = Buffer.alloc(4);
      len.writeUInt32BE(body.length);
      const tb = Buffer.concat([Buffer.from(type), body]);
      const crc = Buffer.alloc(4);
      crc.writeUInt32BE(crc32(tb) >>> 0);
      return Buffer.concat([len, tb, crc]);
    };
    const ihdr = Buffer.alloc(13);
    ihdr.writeUInt32BE(this.w, 0);
    ihdr.writeUInt32BE(this.h, 4);
    ihdr[8] = 8;
    ihdr[9] = 2;
    const png = Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
    const b64 = png.toString('base64');
    const parts = Math.ceil(b64.length / 6000);
    for (let i = 0; i < parts; i++) console.log(`PNG ${name} ${i + 1}/${parts} ${b64.slice(i * 6000, (i + 1) * 6000)}`);
    console.log(`preview: ${name} ${this.w}x${this.h}, ${png.length} bytes`);
  }
}

const wpe = (set: string) => f(`tileset/${set}.wpe`);
function grpFrame(path: string, frame: number, pal: Uint8Array) {
  const g = parseGrp(f(path));
  const px = new Uint8ClampedArray(g.width * g.height * 4);
  drawGrpFrame(g, Math.min(frame, g.frames - 1), pal, px, g.width, 0, 0);
  return { g, px };
}
const want = (n: string) => !only || n.startsWith(only);

// ---- terrain: every non-doodad CV5 group whose 4 edges match (fill tiles), first 8 megatiles, labelled by group index
const SETS = ['badlands', 'ashworld', 'jungle', 'platform', 'twilight'];
for (const set of SETS) {
  if (!want('terrain') || !has(`tileset/${set}.cv5`)) continue;
  const ts = parseTileset(f(`tileset/${set}.cv5`), f(`tileset/${set}.vx4`), f(`tileset/${set}.vr4`), wpe(set));
  const cand = ts.groups.map((g, i) => ({ g, i })).filter(({ g, i }) => i < 1024 && g.tiles.filter((t) => t).length >= 4 && g.edges.every((e) => e === g.edges[0]));
  console.log(`preview: terrain ${set}: ${ts.groups.length} groups, ${cand.length} fill candidates: ` + cand.map(({ g, i }) => `${i}(type ${g.type} edge ${g.edges[0]} flags ${g.flags.toString(16)})`).join(' '));
  const cols = 4;
  const cellW = 40 + 8 * 16;
  const cellH = 20;
  const rows = Math.ceil(cand.length / cols);
  const sh = new Sheet(cols * cellW, Math.max(1, rows) * cellH);
  cand.forEach(({ g, i }, k) => {
    const cx = (k % cols) * cellW;
    const cy = Math.floor(k / cols) * cellH;
    sh.label(i, cx + 2, cy + 5);
    for (let t = 0; t < 8; t++) {
      const buf = new Uint8ClampedArray(32 * 32 * 4);
      drawMegatile(ts, g.tiles[t], buf, 32, 0, 0);
      const half = new Uint8ClampedArray(16 * 16 * 4);
      for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) for (let c = 0; c < 4; c++) half[(y * 16 + x) * 4 + c] = buf[(y * 2 * 32 + x * 2) * 4 + c];
      sh.blit(half, 16, 16, cx + 40 + t * 16, cy + 2);
    }
  });
  sh.emit(`terrain-${set}`);
}

// ---- sprites: doodads / effects / neutral, frame 0 (effects: first 10 frames), labelled by list position
const idx = JSON.parse(readFileSync(join(dir, 'index.json'), 'utf8')) as { doodads: string[]; fx: string[]; neutral: string[] };
function spriteSheet(name: string, list: string[], frames: number, pal: Uint8Array, cell: number) {
  if (!want(name)) return;
  const items = list.filter((p) => has('unit/' + p));
  console.log(`preview: ${name}: ` + items.map((p, i) => `${i}=${p}`).join(' '));
  const cols = frames > 1 ? 1 : Math.max(1, Math.floor(1600 / cell));
  const rowH = cell + 12;
  const sh = new Sheet(frames > 1 ? 30 + frames * cell : cols * cell, Math.ceil(items.length / cols) * rowH);
  items.forEach((p, i) => {
    const cx = frames > 1 ? 30 : (i % cols) * cell;
    const cy = Math.floor(i / cols) * rowH;
    sh.label(i, frames > 1 ? 2 : cx + 2, cy + 2);
    try {
      const g = parseGrp(f('unit/' + p));
      for (let fr = 0; fr < Math.min(frames, g.frames); fr++) {
        const px = new Uint8ClampedArray(g.width * g.height * 4);
        drawGrpFrame(g, fr, pal, px, g.width, 0, 0);
        const s = Math.min(1, cell / Math.max(g.width, g.height));
        // nearest downscale if larger than the cell
        const w = Math.max(1, Math.floor(g.width * s));
        const h = Math.max(1, Math.floor(g.height * s));
        const sm = new Uint8ClampedArray(w * h * 4);
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) sm[(y * w + x) * 4 + c] = px[(Math.floor(y / s) * g.width + Math.floor(x / s)) * 4 + c];
        sh.blit(sm, w, h, cx + (frames > 1 ? fr * cell : 0) + Math.floor((cell - w) / 2), cy + 12);
      }
    } catch (e) {
      const b = f('unit/' + p);
      console.log(`preview: ${p} failed: ${(e as Error).message} len ${b.length} head ${b.subarray(0, 48).toString('hex')}`);
    }
  });
  sh.emit(name);
}
for (const set of SETS) spriteSheet(`doodads-${set}`, idx.doodads.filter((p) => p.toLowerCase().includes(`\\${set}\\`)).map((p) => p.replace(/\\/g, '/')), 1, wpe(set), 128);
spriteSheet('neutral', idx.neutral.map((p) => p.replace(/\\/g, '/')), 1, wpe('badlands'), 96);
spriteSheet('fx', idx.fx.map((p) => p.replace(/\\/g, '/')), 8, wpe('badlands'), 40);

// ---- UI
if (want('ui')) {
  for (const p of ['game/tconsole.pcx', 'game/pconsole.pcx', 'game/zconsole.pcx', 'glue/title/title.pcx', 'glue/palmm/backgnd.pcx']) {
    if (!has(p)) continue;
    const img = decodePcx(f(p), 0);
    const sh = new Sheet(img.width, img.height);
    sh.blit(img.data, img.width, img.height, 0, 0);
    sh.emit('ui-' + p.split('/').pop()!.replace('.pcx', ''));
  }
  const pal = wpe('platform');
  for (const p of ['unit/cmdbtns/cmdicons.grp', 'game/icons.grp', 'cursor/arrow.grp', 'cursor/targg.grp', 'cursor/magg.grp', 'unit/wirefram/wirefram.grp']) {
    if (!has(p)) continue;
    const g = parseGrp(f(p));
    const cols = 20;
    const cw = g.width + 4;
    const ch = g.height + 12;
    const n = Math.min(g.frames, p.includes('wirefram') ? 140 : 400);
    const sh = new Sheet(cols * cw, Math.ceil(n / cols) * ch);
    for (let i = 0; i < n; i++) {
      const { px } = grpFrame(p, i, pal);
      sh.label(i, (i % cols) * cw, Math.floor(i / cols) * ch);
      sh.blit(px, g.width, g.height, (i % cols) * cw, Math.floor(i / cols) * ch + 11);
    }
    console.log(`preview: ${p} ${g.frames} frames ${g.width}x${g.height}`);
    sh.emit('ui-' + p.split('/').pop()!.replace('.grp', ''));
  }
  for (const p of ['font/font10.fnt', 'font/font14.fnt', 'font/font16.fnt', 'font/font16x.fnt', 'font/font50.fnt']) {
    if (!has(p)) continue;
    const fnt = decodeFnt(f(p));
    const text = 'Koprulu Survivors 0123456789 Minerals Level Up! ABCXYZ';
    const sh = new Sheet(fnt.maxW * text.length, fnt.maxH + 4);
    let x = 0;
    for (const ch of text) {
      const gl = fnt.glyphs.get(ch.charCodeAt(0));
      if (!gl) {
        x += fnt.maxW / 2;
        continue;
      }
      const px = new Uint8ClampedArray(gl.w * gl.h * 4);
      for (let i = 0; i < gl.px.length; i++)
        if (gl.px[i]) {
          const v = 80 + gl.px[i] * 25;
          px.set([v, v, v * 0.6, 255], i * 4);
        }
      sh.blit(px, gl.w, gl.h, x + gl.x, 2 + gl.y);
      x += gl.w + 1;
    }
    console.log(`preview: ${p} chars ${fnt.low}-${fnt.high} max ${fnt.maxW}x${fnt.maxH}`);
    sh.emit('ui-' + p.split('/').pop()!.replace('.fnt', ''));
  }
}
