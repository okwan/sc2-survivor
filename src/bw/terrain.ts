import { Texture } from 'pixi.js';
import { drawMegatile, parseTileset, type Tileset } from './formats';

/**
 * Brood War ground for each zone, built from the tileset's own fill tiles (CV5 groups whose
 * edges all match). Group numbers were picked from contact sheets of the real tilesets:
 * `base` covers most of the map, `accent` forms soft patches of a similar-looking terrain.
 */
export const ZONE_TERRAIN: Record<string, { set: string; base: number[]; accent: number[]; accent2?: number[] }> = {
  marsara: { set: 'badlands', base: [2, 3], accent: [12, 13], accent2: [4, 5] },
  char: { set: 'ashworld', base: [2, 3], accent: [10, 11], accent2: [14, 15] },
  aiur: { set: 'jungle', base: [8, 9, 18, 19], accent: [12, 13, 22, 23], accent2: [10, 11] },
  korhal: { set: 'platform', base: [4, 5, 8, 9], accent: [16, 17], accent2: [18, 19] },
  ulnar: { set: 'twilight', base: [2, 3], accent: [10, 11], accent2: [18, 19] },
};

/** Every tileset file the terrain can use, as literal paths so scripts/fetch-bw.mjs finds them. */
export const BW_TERRAIN_FILES = [
  'tileset/badlands.cv5', 'tileset/badlands.vx4', 'tileset/badlands.vr4',
  'tileset/ashworld.cv5', 'tileset/ashworld.vx4', 'tileset/ashworld.vr4',
  'tileset/jungle.cv5', 'tileset/jungle.vx4', 'tileset/jungle.vr4',
  'tileset/platform.cv5', 'tileset/platform.vx4', 'tileset/platform.vr4',
  'tileset/twilight.cv5', 'tileset/twilight.vx4', 'tileset/twilight.vr4',
];

export function terrainFilesFor(zoneId: string): string[] {
  const t = ZONE_TERRAIN[zoneId];
  return t ? ['cv5', 'vx4', 'vr4', 'wpe'].map((x) => `tileset/${t.set}.${x}`) : [];
}

const SIZE = 64; // megatiles per side of the repeating ground texture (64 * 32 = 2048 px)
const textures = new Map<string, Texture>();

/** Seamless value noise on a SIZE x SIZE torus, 0..1. */
function noiseField(seed: number, cells: number): Float32Array {
  let s = seed;
  const rnd = () => ((s = (s * 1103515245 + 12345) >>> 0) / 4294967296);
  const grid = Array.from({ length: cells * cells }, rnd);
  const out = new Float32Array(SIZE * SIZE);
  const sm = (t: number) => t * t * (3 - 2 * t);
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const gx = (x / SIZE) * cells;
      const gy = (y / SIZE) * cells;
      const x0 = Math.floor(gx);
      const y0 = Math.floor(gy);
      const tx = sm(gx - x0);
      const ty = sm(gy - y0);
      const g = (i: number, j: number) => grid[(((j % cells) + cells) % cells) * cells + (((i % cells) + cells) % cells)];
      const a = g(x0, y0) * (1 - tx) + g(x0 + 1, y0) * tx;
      const b = g(x0, y0 + 1) * (1 - tx) + g(x0 + 1, y0 + 1) * tx;
      out[y * SIZE + x] = a * (1 - ty) + b * ty;
    }
  return out;
}

/** Megatiles of the given groups that are real art (non-zero and not a flat colour). */
function tilesOf(ts: Tileset, groups: number[]): number[] {
  const out: number[] = [];
  for (const gi of groups) {
    const g = ts.groups[gi];
    if (!g) continue;
    for (const t of g.tiles) {
      if (!t) continue;
      const first = ts.vr4[(ts.vx4[t * 16] >> 1) * 64];
      let flat = true;
      for (let m = 0; m < 16 && flat; m++) {
        const mini = ts.vx4[t * 16 + m] >> 1;
        for (let p = 0; p < 64; p += 7) if (ts.vr4[mini * 64 + p] !== first) flat = false;
      }
      if (!flat) out.push(t);
    }
  }
  return out;
}

/** Builds (once) the repeating ground texture for a zone from its tileset files, or returns null. */
export function terrainTexture(zoneId: string, files: Map<string, Uint8Array>): Texture | null {
  const cached = textures.get(zoneId);
  if (cached) return cached;
  const cfg = ZONE_TERRAIN[zoneId];
  if (!cfg) return null;
  const [cv5, vx4, vr4, wpe] = terrainFilesFor(zoneId).map((p) => files.get(p));
  if (!cv5 || !vx4 || !vr4 || !wpe) return null;
  const ts = parseTileset(cv5, vx4, vr4, wpe);
  const base = tilesOf(ts, cfg.base);
  const accent = tilesOf(ts, cfg.accent);
  const accent2 = tilesOf(ts, cfg.accent2 ?? []);
  if (!base.length) return null;
  const n1 = noiseField(zoneId.length * 7919 + 17, 8);
  const n2 = noiseField(zoneId.length * 104729 + 3, 6);
  const cv = document.createElement('canvas');
  cv.width = cv.height = SIZE * 32;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(cv.width, cv.height);
  let seed = 1;
  const pick = (a: number[]) => a[(seed = (seed * 16807) % 2147483647) % a.length];
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const i = y * SIZE + x;
      const set = accent.length && n1[i] > 0.68 ? accent : accent2.length && n2[i] > 0.74 ? accent2 : base;
      drawMegatile(ts, pick(set), img.data, cv.width, x * 32, y * 32);
    }
  ctx.putImageData(img, 0, 0);
  const tex = Texture.from(cv);
  tex.source.scaleMode = 'nearest';
  textures.set(zoneId, tex);
  return tex;
}
