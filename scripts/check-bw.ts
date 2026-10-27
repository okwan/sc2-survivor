// Sanity check for the sprites fetch-bw wrote: decodes every .grp with the game's own decoder and prints
// a text preview of a few, so a bad download or decoder bug shows up in the deploy log.
//   node --experimental-strip-types scripts/check-bw.ts dist/bw
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { drawGrpFrame, parseGrp } from '../src/bw/grp.ts';

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
