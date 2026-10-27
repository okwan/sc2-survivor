import { Rectangle, Texture, type Sprite } from 'pixi.js';
import { CascStorage } from './casc';
import { drawGrpFrame, parseGrp } from './grp';
import { BW_TERRAIN_FILES, terrainFilesFor, terrainTexture } from './terrain';
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
  'minion:brood': 'unit/zerg/brood.grp',
  'minion:scourge': 'unit/zerg/avenger.grp',
  'minion:interceptor': 'unit/protoss/intercep.grp',
  'minion:probe': 'unit/protoss/probe.grp',
  'minion:turret': 'unit/terran/tankt.grp',
  'prop:min1': 'unit/neutral/min01.grp',
  'prop:min2': 'unit/neutral/min02.grp',
  'prop:min3': 'unit/neutral/min03.grp',
  'prop:geyser': 'unit/neutral/geyser.grp',
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
  frames: Texture[]; // 17 facings, north to south clockwise
  size: number; // typical visible size in px
}

const registry = new Map<string, BwSprite>();
/** Every Brood War file currently available (player's own or bundled with the site). */
let store = new Map<string, Uint8Array>();
const LAZY = /\.(cv5|vx4|vr4)$/; // big tileset files, fetched per zone when a run starts
type BwSource = 'local' | 'bundled' | null;
let status: { loaded: boolean; count: number; missing: string[]; source: BwSource } = { loaded: false, count: 0, missing: [], source: null };

export function bwStatus() {
  return status;
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

/** Points a sprite at the facing frame for an angle (0 = east, radians). BW mirrors the west half. */
export function orientBw(spr: Sprite, bw: BwSprite, angle: number, scale: number) {
  let d = Math.round(((angle + Math.PI / 2) / (Math.PI * 2)) * 32);
  d = ((d % 32) + 32) % 32;
  const n = bw.frames.length;
  if (d <= 16) {
    spr.texture = bw.frames[Math.min(d, n - 1)];
    spr.scale.set(scale, scale);
  } else {
    spr.texture = bw.frames[Math.min(32 - d, n - 1)];
    spr.scale.set(-scale, scale);
  }
  spr.rotation = 0;
}

// ------------------------------------------------------------ file intake
const DOODAD_FILES = () => Object.values(BW_DOODADS).flatMap((l) => l.flatMap(([a, b]) => (b ? [a, b] : [a])));
const ALL_FILES = () => [...new Set([...Object.values(BW_UNITS), ...Object.values(BW_FX), ...DOODAD_FILES()]), ...PALETTES, ...BW_TERRAIN_FILES];

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
      const team = key.startsWith('hero:') || key.startsWith('minion:') ? 'blue' : 'red';
      registry.set(key, buildOne(buf, pals[team]));
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

function buildOne(buf: Uint8Array, pal: Uint8Array, maxFrames = 17, shadow = false): BwSprite {
  const g = parseGrp(buf);
  const n = Math.min(maxFrames, g.frames);
  const W = g.width;
  const H = g.height;
  const cv = document.createElement('canvas');
  cv.width = W * n;
  cv.height = H;
  const ctx = cv.getContext('2d')!;
  const img = ctx.createImageData(W * n, H);
  let sizeSum = 0;
  for (let i = 0; i < n; i++) {
    drawGrpFrame(g, i, pal, img.data, W * n, i * W, 0);
    const h0 = 6 + i * 8;
    sizeSum += Math.max(g.view.getUint8(h0 + 2), g.view.getUint8(h0 + 3));
  }
  if (shadow) for (let i = 0; i < img.data.length; i += 4) if (img.data[i + 3]) img.data.set([0, 0, 0, 110], i);
  ctx.putImageData(img, 0, 0);
  const sheet = Texture.from(cv);
  sheet.source.scaleMode = 'nearest';
  const frames: Texture[] = [];
  for (let i = 0; i < n; i++) frames.push(new Texture({ source: sheet.source, frame: new Rectangle(i * W, 0, W, H) }));
  return { frames, size: Math.max(8, sizeSum / n) };
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

async function loadBundled() {
  try {
    const res = await fetch('bw/manifest.json');
    if (!res.ok) return;
    const { files: paths } = (await res.json()) as { files: string[] };
    bundledPaths = new Set(paths);
    const got = new Map<string, Uint8Array>();
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

/** Fetches the tileset files a zone needs if the site ships them and they aren't loaded yet. */
export async function ensureZoneFiles(zoneId: string): Promise<void> {
  const need = terrainFilesFor(zoneId).filter((p) => !store.has(p) && bundledPaths.has(p));
  await Promise.all(
    need.map(async (p) => {
      try {
        const r = await fetch('bw/' + p);
        if (r.ok) store.set(p, new Uint8Array(await r.arrayBuffer()));
      } catch {
        /* keep the procedural ground */
      }
    }),
  );
}

/** Starts downloading every zone's tileset in the background so runs start instantly. */
export function prefetchTerrain(zoneIds: string[]) {
  zoneIds.reduce((p, z) => p.then(() => ensureZoneFiles(z)), Promise.resolve());
}

/** The zone's Brood War ground texture, or null to use the procedural one. */
export function bwTerrain(zoneId: string) {
  try {
    return terrainTexture(zoneId, store);
  } catch {
    return null;
  }
}
