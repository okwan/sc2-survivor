import { Rectangle, Texture, type Sprite } from 'pixi.js';
import { CascStorage } from './casc';
import { drawGrpFrame, parseGrp } from './grp';
import { BW_TERRAIN_FILES, terrainFilesFor, terrainTexture } from './terrain';
import { BW_UI_FILES } from './ui-files';
import { BW_SOUND_FILES } from './sounds';
import { MapGround, mapTilesetFiles, parseMapJson, type BwMap } from './map';
import { normalizePath, readZip } from './zip';

/**
 * Optional Brood War sprites, read from the player's own StarCraft files.
 * Nothing here ships with the game: the player picks a folder or .zip of the
 * extracted SD graphics (unit/ and tileset/ folders), and we keep a copy of the
 * few files we use in IndexedDB on their machine.
 */

/** Game sprite key -> path inside the StarCraft data. */
export const BW_UNITS: Record<string, string> = {
  'hero:terran': 'unit/terran/marine.grp',
  'hero:zerg': 'unit/zerg/hydra.grp',
  'hero:protoss': 'unit/protoss/zealot.grp',
  'hero:firebat': 'unit/terran/firebat.grp',
  'hero:ghost': 'unit/terran/ghost.grp',
  'hero:zergling': 'unit/zerg/zergling.grp',
  'hero:defiler': 'unit/zerg/defiler.grp',
  'hero:dtemplar': 'unit/protoss/dtemplar.grp',
  'hero:htemplar': 'unit/protoss/templar.grp',
  ling: 'unit/zerg/zergling.grp',
  broodling: 'unit/zerg/brood.grp',
  hydra: 'unit/zerg/hydra.grp',
  roach: 'unit/zerg/lurker.grp',
  bane: 'unit/zerg/bugguy.grp',
  muta: 'unit/zerg/mutalid.grp',
  ultra: 'unit/zerg/ultra.grp',
  zealot: 'unit/protoss/zealot.grp',
  stalker: 'unit/protoss/dragoon.grp',
  archon: 'unit/protoss/archon.grp',
  marine: 'unit/terran/marine.grp',
  firebat: 'unit/terran/firebat.grp',
  tank: 'unit/terran/tank.grp',
  hybrid: 'unit/protoss/dtemplar.grp',
  drone: 'unit/zerg/drone.grp',
  scourge: 'unit/zerg/avenger.grp',
  queen: 'unit/zerg/queen.grp',
  guardian: 'unit/zerg/guardian.grp',
  defiler: 'unit/zerg/defiler.grp',
  scv: 'unit/terran/scv.grp',
  medic: 'unit/terran/medic.grp',
  vulture: 'unit/terran/vulture.grp',
  goliath: 'unit/terran/goliath.grp',
  ghost: 'unit/terran/ghost.grp',
  wraith: 'unit/terran/phoenix.grp',
  bc: 'unit/terran/battlecr.grp',
  probe: 'unit/protoss/probe.grp',
  dtemplar: 'unit/protoss/dtemplar.grp',
  htemplar: 'unit/protoss/templar.grp',
  reaver: 'unit/protoss/trilob.grp',
  corsair: 'unit/protoss/corsair.grp',
  scout: 'unit/protoss/scout.grp',
  carrier: 'unit/protoss/carrier.grp',
  arbiter: 'unit/protoss/arbiter.grp',
  'minion:brood': 'unit/zerg/brood.grp',
  'minion:scourge': 'unit/zerg/avenger.grp',
  'minion:interceptor': 'unit/protoss/intercep.grp',
  'minion:probe': 'unit/protoss/probe.grp',
  'minion:turret': 'unit/terran/tankt.grp',
  'prop:min1': 'unit/neutral/min01.grp',
  'prop:min2': 'unit/neutral/min02.grp',
  'prop:min3': 'unit/neutral/min03.grp',
  'prop:geyser': 'unit/neutral/geyser.grp',
  'pickup:xp': 'unit/neutral/khchunk.grp',
  'pickup:mineral': 'unit/neutral/orechunk.grp',
  'pickup:medkit': 'unit/neutral/gasorb.grp',
  'pickup:magnet': 'unit/neutral/psiemit.grp',
  'pickup:gear': 'unit/neutral/datadisk.grp',
  'pickup:cache': 'unit/terran/depot.grp',
  'pickup:lair': 'unit/zerg/lair.grp',
  'pickup:bomb': 'unit/bullet/grenade.grp',
};

/** Effects (all animation frames are kept). */
export const BW_FX: Record<string, string> = {
  'fx:tbangs': 'unit/thingy/tbangs.grp',
  'fx:tbangl': 'unit/thingy/tbangl.grp',
  'fx:zdeath': 'unit/thingy/zairdths.grp',
  'fx:zdeathl': 'unit/thingy/zairdthl.grp',
  'fx:pdeath': 'unit/thingy/hkexplod.grp',
  'fx:blood1': 'unit/thingy/bblood01.grp',
  'fx:blood2': 'unit/thingy/bblood02.grp',
  'fx:blood3': 'unit/thingy/bblood03.grp',
  'fx:blood4': 'unit/thingy/bblood04.grp',
  'fx:tspark': 'unit/bullet/tspark.grp',
  'fx:zspark': 'unit/bullet/zspark.grp',
  'fx:pspark': 'unit/bullet/pspark.grp',
  'fx:gemini': 'unit/bullet/gemini.grp',
  'fx:spores': 'unit/bullet/spores.grp',
  'fx:dragbull': 'unit/bullet/dragbull.grp',
  'fx:psistorm': 'unit/thingy/psistorm.grp',
  'fx:nuke': 'unit/thingy/mushroom.grp',
  'fx:emp': 'unit/thingy/emp.grp',
};

/** Tileset doodads scattered over each zone: [sprite, shadow]. */
export const BW_DOODADS: Record<string, [string, string | null][]> = {
  marsara: [
    ['unit/thingy/tileset/badlands/hdrock01.grp', 'unit/thingy/tileset/badlands/hdrock1s.grp'], ['unit/thingy/tileset/badlands/hdrock02.grp', 'unit/thingy/tileset/badlands/hdrock2s.grp'],
    ['unit/thingy/tileset/badlands/hdrock03.grp', 'unit/thingy/tileset/badlands/hdrock3s.grp'], ['unit/thingy/tileset/badlands/hdrock04.grp', 'unit/thingy/tileset/badlands/hdrock4s.grp'],
    ['unit/thingy/tileset/badlands/hdrock05.grp', null], ['unit/thingy/tileset/badlands/hdrock06.grp', null], ['unit/thingy/tileset/badlands/hdrock07.grp', null], ['unit/thingy/tileset/badlands/hdrock08.grp', null],
    ['unit/thingy/tileset/badlands/hdtree01.grp', 'unit/thingy/tileset/badlands/ldtree1s.grp'], ['unit/thingy/tileset/badlands/hdtree02.grp', 'unit/thingy/tileset/badlands/ldtree2s.grp'],
    ['unit/thingy/tileset/badlands/hdtree03.grp', 'unit/thingy/tileset/badlands/ldtree3s.grp'], ['unit/thingy/tileset/badlands/hdtree04.grp', 'unit/thingy/tileset/badlands/ldtree4s.grp'],
    ['unit/thingy/tileset/badlands/hgtree01.grp', null], ['unit/thingy/tileset/badlands/hdvent01.grp', null],
  ],
  char: [
    ['unit/thingy/tileset/ashworld/rock01.grp', 'unit/thingy/tileset/ashworld/rock1sha.grp'], ['unit/thingy/tileset/ashworld/rock02.grp', 'unit/thingy/tileset/ashworld/rock2sha.grp'],
    ['unit/thingy/tileset/ashworld/rock03.grp', 'unit/thingy/tileset/ashworld/rock3sha.grp'], ['unit/thingy/tileset/ashworld/rock04.grp', 'unit/thingy/tileset/ashworld/rock4sha.grp'],
    ['unit/thingy/tileset/ashworld/rock05.grp', 'unit/thingy/tileset/ashworld/rock5sha.grp'], ['unit/thingy/tileset/ashworld/lalroc01.grp', null], ['unit/thingy/tileset/ashworld/lalroc02.grp', null],
    ['unit/thingy/tileset/ashworld/hasroc01.grp', null], ['unit/thingy/tileset/ashworld/hasroc02.grp', null], ['unit/thingy/tileset/ashworld/hasroc03.grp', null],
    ['unit/thingy/tileset/ashworld/hasroc04.grp', null], ['unit/thingy/tileset/ashworld/hasroc05.grp', null], ['unit/thingy/tileset/ashworld/hasroc06.grp', null],
    ['unit/thingy/tileset/ashworld/rorock01.grp', null], ['unit/thingy/tileset/ashworld/rorock02.grp', null], ['unit/thingy/tileset/ashworld/rorock03.grp', null],
  ],
  aiur: [
    ['unit/thingy/tileset/jungle/hdrock01.grp', 'unit/thingy/tileset/jungle/hdrock1s.grp'], ['unit/thingy/tileset/jungle/hdrock02.grp', 'unit/thingy/tileset/jungle/hdrock2s.grp'],
    ['unit/thingy/tileset/jungle/jubush01.grp', 'unit/thingy/tileset/jungle/jubush1s.grp'], ['unit/thingy/tileset/jungle/jubush03.grp', 'unit/thingy/tileset/jungle/jubush3s.grp'],
    ['unit/thingy/tileset/jungle/jubush05.grp', 'unit/thingy/tileset/jungle/jubush5s.grp'], ['unit/thingy/tileset/jungle/ldtree01.grp', 'unit/thingy/tileset/jungle/ldtree1s.grp'],
    ['unit/thingy/tileset/jungle/ldtree02.grp', 'unit/thingy/tileset/jungle/ldtree2s.grp'], ['unit/thingy/tileset/jungle/ldtree04.grp', 'unit/thingy/tileset/jungle/ldtree4s.grp'],
    ['unit/thingy/tileset/jungle/tree02.grp', 'unit/thingy/tileset/jungle/tree2sha.grp'], ['unit/thingy/tileset/jungle/tree03.grp', 'unit/thingy/tileset/jungle/tree3sha.grp'],
    ['unit/thingy/tileset/jungle/tree04.grp', 'unit/thingy/tileset/jungle/tree4sha.grp'], ['unit/thingy/tileset/jungle/dd025.grp', null], ['unit/thingy/tileset/jungle/dd026.grp', null],
    ['unit/thingy/tileset/jungle/dd029.grp', null], ['unit/thingy/tileset/jungle/dd075.grp', null], ['unit/thingy/tileset/jungle/dd077.grp', null], ['unit/thingy/tileset/jungle/dd080.grp', null],
    ['unit/thingy/tileset/jungle/dd091.grp', null], ['unit/thingy/tileset/jungle/dd204.grp', null], ['unit/thingy/tileset/jungle/dd209.grp', null],
  ],
  korhal: [
    ['unit/thingy/tileset/platform/dish01.grp', 'unit/thingy/tileset/platform/dish1sha.grp'], ['unit/thingy/tileset/platform/dish02.grp', 'unit/thingy/tileset/platform/dish2sha.grp'],
    ['unit/thingy/tileset/platform/dish03.grp', 'unit/thingy/tileset/platform/dish3sha.grp'], ['unit/thingy/tileset/platform/glob01.grp', 'unit/thingy/tileset/platform/glob1sha.grp'],
    ['unit/thingy/tileset/platform/glob02.grp', 'unit/thingy/tileset/platform/glob2sha.grp'], ['unit/thingy/tileset/platform/glob03.grp', 'unit/thingy/tileset/platform/glob3sha.grp'],
    ['unit/thingy/tileset/platform/towr01.grp', null], ['unit/thingy/tileset/platform/towr02.grp', null], ['unit/thingy/tileset/platform/tree01.grp', null], ['unit/thingy/tileset/platform/tree02.grp', null],
    ['unit/thingy/tileset/platform/lbsign01.grp', null], ['unit/thingy/tileset/platform/lbsign03.grp', null], ['unit/thingy/tileset/platform/lbsign05.grp', null], ['unit/thingy/tileset/platform/spthin01.grp', null],
  ],
  ulnar: [
    ['unit/thingy/tileset/twilight/ldarch.grp', null], ['unit/thingy/tileset/twilight/lddrill.grp', null], ['unit/thingy/tileset/twilight/ldxel01.grp', null], ['unit/thingy/tileset/twilight/ldxel02.grp', null],
    ['unit/thingy/tileset/twilight/ldxel03.grp', null], ['unit/thingy/tileset/twilight/ldxel05.grp', null], ['unit/thingy/tileset/twilight/ldxel06.grp', null], ['unit/thingy/tileset/twilight/ldxeltur.grp', null],
    ['unit/thingy/tileset/twilight/jtree01.grp', null], ['unit/thingy/tileset/twilight/jtree02.grp', null], ['unit/thingy/tileset/twilight/jtree03.grp', null], ['unit/thingy/tileset/twilight/jtree04.grp', null],
    ['unit/thingy/tileset/twilight/jtree05.grp', null], ['unit/thingy/tileset/twilight/rstatue.grp', null],
  ],
};

const PALETTES = ['tileset/platform.wpe', 'tileset/badlands.wpe', 'tileset/jungle.wpe', 'tileset/install.wpe', 'tileset/ashworld.wpe', 'tileset/desert.wpe', 'tileset/ice.wpe', 'tileset/twilight.wpe'];

// Player colour remaps for palette indices 8-15 (from tunit.pcx): red, blue, ..., purple
const PLAYER_COLORS = {
  red: [0x6f, 0x17, 0x17, 0x62, 0x5e, 0xab, 0xaa, 0xa8],
  blue: [0xa5, 0xa2, 0xa2, 0x2d, 0xa0, 0x2a, 0x29, 0x28],
  purple: [0x9c, 0xb3, 0x1c, 0x1a, 0x15, 0x12, 0x59, 0x56],
};

export interface BwSprite {
  /** GRP frames by index: 0-16 are the 17 facings (north to south clockwise); later sets only if animated */
  frames: Texture[];
  size: number; // typical visible size in px
  /** walk cycle from iscript: [first frame of the set, game ticks shown] */
  walk?: [number, number][];
}

/** Frame sequences per unit GRP, read from iscript.bin at deploy (bw/anims.json). */
let anims: Record<string, { walk?: [number, number][] }> = {};

const registry = new Map<string, BwSprite>();
/** Every Brood War file currently available (player's own or bundled with the site). */
let store = new Map<string, Uint8Array>();
const LAZY = /\.(cv5|vx4|vr4)$|^maps\/|^unit\/thingy\/tileset\/|^sound\/|^music\//; // tilesets, maps and their doodads: fetched per zone when a run starts
type BwSource = 'local' | 'bundled' | null;
let status: { loaded: boolean; count: number; missing: string[]; source: BwSource } = { loaded: false, count: 0, missing: [], source: null };

export function bwStatus() {
  return status;
}

/** True when the site ships this file (bw/manifest.json). */
export function bwBundled(path: string): boolean {
  return bundledPaths.has(path);
}

/** A raw Brood War file if it is loaded. */
export function bwFile(path: string): Uint8Array | undefined {
  return store.get(path);
}

/** The base 256-colour RGBA palette, if any palette is loaded. */
export function bwPalette(): Uint8Array | undefined {
  const p = PALETTES.find((x) => store.has(x));
  return p ? store.get(p) : undefined;
}

export function bwSprite(key: string): BwSprite | undefined {
  return registry.get(key);
}

/** Doodads available for a zone, with their shadow sprites. */
export function bwDoodads(zoneId: string): { img: BwSprite; shadow: BwSprite | null }[] {
  return (BW_DOODADS[zoneId] ?? []).flatMap(([a, b]) => {
    const img = registry.get(a);
    return img ? [{ img, shadow: (b && registry.get(b)) || null }] : [];
  });
}

/** First frame of the walk cycle's set at a time in seconds (0 for units without one). StarCraft runs ~24 ticks a second on Fastest. */
export function walkFrame(bw: BwSprite, seconds: number): number {
  const w = bw.walk;
  if (!w) return 0;
  let total = 0;
  for (const [, t] of w) total += t;
  let k = (seconds * 24) % total;
  for (const [f, t] of w) {
    if (k < t) return f;
    k -= t;
  }
  return w[0][0];
}

/**
 * Points a sprite at the facing frame for an angle (0 = east, radians), within the frame set
 * starting at `base` (a walk cycle frame). BW mirrors the west half.
 */
export function orientBw(spr: Sprite, bw: BwSprite, angle: number, scale: number, base = 0) {
  let d = Math.round(((angle + Math.PI / 2) / (Math.PI * 2)) * 32);
  d = ((d % 32) + 32) % 32;
  const n = bw.frames.length;
  const f = d <= 16 ? d : 32 - d;
  spr.texture = bw.frames[base + f] ?? bw.frames[Math.min(f, n - 1)];
  spr.scale.set(d <= 16 ? scale : -scale, scale);
  spr.rotation = 0;
}

// ------------------------------------------------------------ file intake
const DOODAD_FILES = () => Object.values(BW_DOODADS).flatMap((l) => l.flatMap(([a, b]) => (b ? [a, b] : [a])));
const ALL_FILES = () => [...new Set([...Object.values(BW_UNITS), ...Object.values(BW_FX), ...DOODAD_FILES()]), ...PALETTES, ...BW_TERRAIN_FILES, ...BW_UI_FILES, ...BW_SOUND_FILES];

function wanted(path: string): string | null {
  for (const p of ALL_FILES()) if (path.endsWith(p)) return p;
  return null;
}

/** Accepts a .zip, a folder selection (webkitdirectory) or loose files. */
export async function ingestFiles(files: File[]): Promise<Map<string, Uint8Array>> {
  // A StarCraft: Remastered install folder: read straight from its CASC storage
  if (files.some((f) => /^[0-9a-f]{10}\.idx$/i.test(f.name))) {
    const casc = await CascStorage.open(files);
    const wantedPaths = ALL_FILES();
    const got = await casc.readFiles(wantedPaths);
    if (!got.size) throw new Error(`Opened the StarCraft data (${casc.root.size} files) but found none of the unit sprites.`);
    return got;
  }
  const out = new Map<string, Uint8Array>();
  for (const f of files) {
    const name = normalizePath((f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name);
    if (name.endsWith('.zip')) {
      const inner = await readZip(f, (p) => wanted(p) !== null);
      for (const [p, data] of inner) out.set(wanted(p)!, data);
      continue;
    }
    let key = wanted(name);
    // loose files picked without folders: match by file name alone
    if (!key) {
      const base = name.split('/').pop()!;
      key = ALL_FILES().find((p) => p.endsWith('/' + base)) ?? null;
    }
    if (key) out.set(key, new Uint8Array(await f.arrayBuffer()));
  }
  return out;
}

// ------------------------------------------------------------ persistence
const DB = 'koprulu-bw';

function idb(): Promise<IDBDatabase> {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore('files');
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}

export async function storeFiles(files: Map<string, Uint8Array>) {
  const db = await idb();
  await new Promise<void>((res, rej) => {
    const tx = db.transaction('files', 'readwrite');
    tx.objectStore('files').put(Object.fromEntries(files), 'v1');
    tx.oncomplete = () => res();
    tx.onerror = () => rej(tx.error);
  });
  db.close();
}

export async function loadStoredFiles(): Promise<Map<string, Uint8Array> | null> {
  try {
    const db = await idb();
    const data = await new Promise<Record<string, Uint8Array> | undefined>((res, rej) => {
      const r = db.transaction('files').objectStore('files').get('v1');
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    db.close();
    return data ? new Map(Object.entries(data)) : null;
  } catch {
    return null;
  }
}

export async function clearStoredFiles() {
  try {
    const db = await idb();
    await new Promise<void>((res) => {
      const tx = db.transaction('files', 'readwrite');
      tx.objectStore('files').delete('v1');
      tx.oncomplete = () => res();
      tx.onerror = () => res();
    });
    db.close();
  } catch {
    /* nothing stored */
  }
  for (const s of registry.values()) for (const f of s.frames) f.destroy();
  registry.clear();
  status = { loaded: false, count: 0, missing: [], source: null };
  store = new Map();
  await loadBundled();
}

// ------------------------------------------------------------ texture building
export function buildSprites(files: Map<string, Uint8Array>, source: BwSource = 'local'): typeof status {
  const palPath = PALETTES.find((p) => files.has(p));
  if (!palPath) throw new Error('No palette found. Include the tileset folder (for example tileset/platform.wpe).');
  const base = files.get(palPath)!;
  if (base.length < 1024) throw new Error(`${palPath} is not a valid palette`);
  const pals: Record<string, Uint8Array> = {};
  for (const [name, idx] of Object.entries(PLAYER_COLORS)) {
    const p = new Uint8Array(1024);
    p.set(base.subarray(0, 1024));
    for (let i = 0; i < 8; i++) p.set(base.subarray(idx[i] * 4, idx[i] * 4 + 3), (8 + i) * 4);
    pals[name] = p;
  }
  for (const s of registry.values()) for (const f of s.frames) f.destroy();
  registry.clear();
  store = files;
  const missing: string[] = [];
  for (const [key, path] of Object.entries(BW_UNITS)) {
    const buf = files.get(path);
    if (!buf) {
      missing.push(path);
      continue;
    }
    try {
      const team = key.startsWith('hero:') || key.startsWith('minion:') || key === 'pickup:cache' ? 'blue' : 'red';
      registry.set(key, buildUnit(path, buf, pals[team]));
    } catch {
      missing.push(path);
    }
  }
  const unitCount = registry.size;
  const plain = pals.red;
  for (const [key, path] of Object.entries(BW_FX)) {
    const buf = files.get(path);
    if (!buf) continue;
    try {
      registry.set(key, buildOne(buf, plain, 32));
    } catch {
      /* skip */
    }
  }
  for (const [path, shadow] of Object.values(BW_DOODADS).flat()) {
    for (const [p, sh] of [[path, false], [shadow, true]] as const) {
      const buf = p && files.get(p);
      if (!buf || registry.has(p)) continue;
      try {
        registry.set(p, buildOne(buf, plain, 1, sh));
      } catch {
        /* skip */
      }
    }
  }
  status = { loaded: unitCount > 0, count: unitCount, missing: [...new Set(missing)], source };
  return status;
}

const ATLAS_W = 2048;

/**
 * Decodes GRP frames into an atlas, each trimmed to its own box so animated units stay small in
 * memory; the textures keep the full frame size so every frame shares the GRP's centre.
 * `which` lists the frames to keep (default: the first `maxFrames`).
 */
function buildOne(buf: Uint8Array, pal: Uint8Array, maxFrames = 17, shadow = false, which?: number[]): BwSprite {
  const g = parseGrp(buf);
  const list = (which ?? Array.from({ length: Math.min(maxFrames, g.frames) }, (_, i) => i)).filter((f) => f < g.frames);
  const W = g.width;
  const H = g.height;
  const box = (f: number) => {
    const h0 = 6 + f * 8;
    let fw = g.view.getUint8(h0 + 2);
    if (g.view.getUint32(h0 + 4, true) & 0x80000000) fw += 0x100;
    return { x: g.view.getUint8(h0), y: g.view.getUint8(h0 + 1), w: Math.max(1, fw), h: Math.max(1, g.view.getUint8(h0 + 3)) };
  };
  // shelf packing
  const place: { f: number; x: number; y: number; b: ReturnType<typeof box> }[] = [];
  let cx = 0;
  let cy = 0;
  let rowH = 0;
  let sizeSum = 0;
  for (const f of list) {
    const b = box(f);
    if (cx + b.w > ATLAS_W) {
      cx = 0;
      cy += rowH + 1;
      rowH = 0;
    }
    place.push({ f, x: cx, y: cy, b });
    cx += b.w + 1;
    rowH = Math.max(rowH, b.h);
    sizeSum += Math.max(b.w, b.h);
  }
  const cv = document.createElement('canvas');
  cv.width = Math.min(ATLAS_W, Math.max(1, ...place.map((p) => p.x + p.b.w)));
  cv.height = Math.max(1, cy + rowH);
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(cv.width, cv.height);
  // drawGrpFrame writes at (ox + frame.x, oy + frame.y), so shift by the frame's own offset
  for (const p of place) drawGrpFrame(g, p.f, pal, img.data, cv.width, p.x - p.b.x, p.y - p.b.y);
  if (shadow) for (let i = 0; i < img.data.length; i += 4) if (img.data[i + 3]) img.data.set([0, 0, 0, 110], i);
  ctx.putImageData(img, 0, 0);
  const sheet = Texture.from(cv);
  sheet.source.scaleMode = 'nearest';
  const frames: Texture[] = [];
  for (const p of place)
    frames[p.f] = new Texture({
      source: sheet.source,
      frame: new Rectangle(p.x, p.y, p.b.w, p.b.h),
      orig: new Rectangle(0, 0, W, H),
      trim: new Rectangle(p.b.x, p.b.y, p.b.w, p.b.h),
    });
  return { frames, size: Math.max(8, sizeSum / Math.max(1, place.length)) };
}

/** A unit's facings plus its walk cycle frame sets, if the site shipped its iscript animation. */
function buildUnit(path: string, buf: Uint8Array, pal: Uint8Array): BwSprite {
  const walk = anims[path]?.walk;
  if (!walk) return buildOne(buf, pal);
  const bases = [...new Set([0, ...walk.map(([f]) => f)])];
  const spr = buildOne(buf, pal, 17, false, bases.flatMap((b) => Array.from({ length: 17 }, (_, i) => b + i)));
  // only keep the cycle if every frame set decoded
  if (walk.every(([f]) => spr.frames[f] && spr.frames[f + 16])) spr.walk = walk;
  return spr;
}

/** Loads the player's own files if they picked some, otherwise the sprites the site ships in bw/ (if any). */
export async function initBw(): Promise<void> {
  const files = await loadStoredFiles();
  if (files) {
    try {
      if (buildSprites(files, 'local').loaded) return;
    } catch {
      /* stored data unusable; try the bundled sprites */
    }
  }
  await loadBundled();
}

let bundledPaths = new Set<string>();
/** zone -> tileset of the real map the site ships for it */
let bundledMaps: Record<string, string> = {};
const maps = new Map<string, BwMap>();

async function loadBundled() {
  try {
    const res = await fetch('bw/manifest.json');
    if (!res.ok) return;
    const { files: paths, maps: zoneMaps } = (await res.json()) as { files: string[]; maps?: Record<string, string> };
    bundledPaths = new Set(paths);
    bundledMaps = zoneMaps ?? {};
    const got = new Map<string, Uint8Array>();
    if (paths.includes('anims.json'))
      try {
        anims = await (await fetch('bw/anims.json')).json();
      } catch {
        anims = {};
      }
    await Promise.all(
      paths.filter((p) => !LAZY.test(p)).map(async (p) => {
        const r = await fetch('bw/' + p);
        if (r.ok) got.set(p, new Uint8Array(await r.arrayBuffer()));
      }),
    );
    buildSprites(got, 'bundled');
  } catch {
    /* no bundled sprites (e.g. the single-file preview): placeholder art */
  }
}

/** Fetches bundled files that aren't loaded yet (missing ones are skipped). */
export async function fetchInto(paths: string[]) {
  await Promise.all(
    paths.filter((p) => !store.has(p) && bundledPaths.has(p)).map(async (p) => {
      try {
        const r = await fetch('bw/' + p);
        if (r.ok) store.set(p, new Uint8Array(await r.arrayBuffer()));
      } catch {
        /* keep the procedural ground */
      }
    }),
  );
}

/** Fetches what a zone needs (its real map, tileset and doodads) if the site ships them and they aren't loaded yet. */
export async function ensureZoneFiles(zoneId: string): Promise<void> {
  const set = bundledMaps[zoneId];
  if (set && !maps.has(zoneId)) {
    try {
      const r = await fetch(`bw/maps/${zoneId}.json`);
      if (r.ok) maps.set(zoneId, parseMapJson(await r.json()));
    } catch {
      /* fall back to the zone's tile pattern */
    }
  }
  const m = maps.get(zoneId);
  if (m) await fetchInto([...mapTilesetFiles(m.set), ...m.images, ...m.images.map((p) => DOODAD_SHADOW.get(p) ?? '')]);
  else await fetchInto(terrainFilesFor(zoneId));
}
/** Starts downloading every zone's tileset in the background so runs start instantly. */
export function prefetchTerrain(zoneIds: string[]) {
  zoneIds.reduce((p, z) => p.then(() => ensureZoneFiles(z)), Promise.resolve());
}

/** The zone's real StarCraft map with its ground renderer, when the map and its tileset are loaded. */
export function bwMap(zoneId: string): MapGround | null {
  const m = maps.get(zoneId);
  if (!m) return null;
  try {
    return new MapGround(m, store);
  } catch {
    return null;
  }
}

const DOODAD_SHADOW = new Map(Object.values(BW_DOODADS).flat().filter((d): d is [string, string] => !!d[1]));
const mapSprites = new Map<string, BwSprite | null>();
const palIds = new WeakMap<Uint8Array, number>();
let palCount = 0;

/** A map doodad (frame 0) in its tileset's palette, plus its shadow if we know it. */
export function mapDoodad(path: string, pal: Uint8Array): { img: BwSprite; shadow: BwSprite | null } | null {
  const get = (p: string, shadow: boolean) => {
    if (!palIds.has(pal)) palIds.set(pal, palCount++);
    const key = `${p}@${palIds.get(pal)}`;
    if (!mapSprites.has(key)) {
      const buf = store.get(p);
      let spr: BwSprite | null = null;
      try {
        spr = buf ? buildOne(buf, pal, 1, shadow) : null;
      } catch {
        spr = null;
      }
      mapSprites.set(key, spr);
    }
    return mapSprites.get(key)!;
  };
  const img = get(path, false);
  if (!img) return null;
  const sh = DOODAD_SHADOW.get(path);
  return { img, shadow: sh ? get(sh, true) : null };
}

/** The zone's Brood War ground texture, or null to use the procedural one. */
export function bwTerrain(zoneId: string) {
  try {
    return terrainTexture(zoneId, store);
  } catch {
    return null;
  }
}
