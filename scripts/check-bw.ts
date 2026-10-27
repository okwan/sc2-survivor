// Sanity check for the sprites fetch-bw wrote: decodes every .grp with the game's own decoder and prints
// a text preview of a few, so a bad download or decoder bug shows up in the deploy log.
//   node --experimental-strip-types scripts/check-bw.ts dist/bw
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { drawGrpFrame, parseGrp } from '../src/bw/grp.ts';
import { parseTileset } from '../src/bw/formats.ts';

const dir = process.argv[2] ?? 'dist/bw';
let manifest: { files: string[] };
try {
  manifest = JSON.parse(readFileSync(join(dir, 'manifest.json'), 'utf8'));
} catch {
  console.log('check-bw: no bundled sprites');
  process.exit(0);
}
const pal = readFileSync(join(dir, manifest.files.find((f) => f.endsWith('.wpe'))!));
const preview = new Set(['unit/terran/marine.grp', 'unit/zerg/hydra.grp', 'unit/protoss/zealot.grp']);
const shades = ' .:-=+*#%@';
for (const f of manifest.files.filter((p) => p.endsWith('.grp'))) {
  const buf = readFileSync(join(dir, f));
  let g;
  try {
    g = parseGrp(buf);
  } catch (e) {
    console.log(`check-bw: ${f} FAILED (${(e as Error).message}), ${buf.length} bytes, starts ${buf.subarray(0, 16).toString('hex')}`);
    continue;
  }
  const frame = Math.min(8, g.frames - 1);
  const px = new Uint8ClampedArray(g.width * g.height * 4);
  drawGrpFrame(g, frame, pal, px, g.width, 0, 0);
  let opaque = 0;
  for (let i = 3; i < px.length; i += 4) if (px[i]) opaque++;
  console.log(`check-bw: ${f} ${g.frames} frames ${g.width}x${g.height}, frame ${frame}: ${opaque} px`);
  if (f.startsWith('dlgs/'))
    console.log(`check-bw: ${f} boxes ` + Array.from({ length: g.frames }, (_, i) => {
      const h0 = 6 + i * 8;
      return `${i}:${g.view.getUint8(h0)},${g.view.getUint8(h0 + 1)} ${g.view.getUint8(h0 + 2)}x${g.view.getUint8(h0 + 3)}`;
    }).join(' '));
  if (!preview.has(f)) continue;
  for (let y = 0; y < g.height; y++) {
    let row = '';
    for (let x = 0; x < g.width; x++) {
      const i = (y * g.width + x) * 4;
      row += px[i + 3] ? shades[Math.min(9, 1 + Math.floor(((px[i] + px[i + 1] + px[i + 2]) / 765) * 9))] : ' ';
    }
    if (row.trim()) console.log('  |' + row + '|');
  }
}

// Real maps: decode each zone's map with its tileset and print a coarse picture of it, so a bad
// MTXM/CV5 lookup (noise, one flat colour) is obvious in the log.
const pmaps = (manifest as { maps?: Record<string, string> }).maps ?? {};
for (const [zone, set] of Object.entries(pmaps)) {
  const j = JSON.parse(readFileSync(join(dir, 'maps', `${zone}.json`), 'utf8'));
  const tiles = new Uint16Array(Buffer.from(j.tiles, 'base64').buffer.slice(0));
  const f = (x: string) => join(dir, 'tileset', `${set}.${x}`);
  if (!['cv5', 'vx4', 'vr4', 'wpe'].every((x) => existsSync(f(x)))) {
    console.log(`check-bw: map ${zone} tileset ${set} MISSING`);
    continue;
  }
  const ts = parseTileset(readFileSync(f('cv5')), readFileSync(f('vx4')), readFileSync(f('vr4')), readFileSync(f('wpe')));
  const distinct = new Set(tiles).size;
  const missingArt = j.images.filter((p: string) => !existsSync(join(dir, p)));
  console.log(`check-bw: map ${zone} "${j.title}" ${j.source} ${set} ${j.w}x${j.h}, ${distinct} distinct megatiles, ${j.doodads.length} doodads, ${j.minerals.length} minerals, starts ${JSON.stringify(j.starts)}${missingArt.length ? `, missing art ${missingArt.join(' ')}` : ''}`);
  const step = Math.max(1, Math.ceil(j.w / 64));
  for (let y = 0; y < j.h; y += step * 2) {
    let row = '';
    for (let x = 0; x < j.w; x += step) {
      const mini = ts.vx4[tiles[y * j.w + x] * 16 + 5] >> 1;
      const c = ts.vr4[mini * 64 + 27];
      const v = ts.pal[c * 4] + ts.pal[c * 4 + 1] + ts.pal[c * 4 + 2];
      row += shades[Math.min(9, Math.floor((v / 765) * 12))];
    }
    console.log('  |' + row + '|');
  }
}

// Walk cycles from iscript: every frame set must exist in the unit's GRP.
if (manifest.files.includes('anims.json')) {
  const anims: Record<string, { walk?: [number, number][] }> = JSON.parse(readFileSync(join(dir, 'anims.json'), 'utf8'));
  for (const [grp, a] of Object.entries(anims)) {
    if (!a.walk) continue;
    const g = parseGrp(readFileSync(join(dir, grp)));
    const bad = a.walk.filter(([f]) => f + 16 >= g.frames);
    console.log(`check-bw: walk ${grp} ${a.walk.length} steps, ${a.walk.reduce((n, [, t]) => n + t, 0)} ticks${bad.length ? `, MISSING frames ${bad.map(([f]) => f).join(',')} of ${g.frames}` : ''}`);
  }
}
