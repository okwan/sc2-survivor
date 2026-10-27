// Deploy step: downloads Brood War 1.16.1, pulls out the unit sprites and palettes the game uses,
// and writes them to <outDir>/bw/ with a manifest. Nothing from Blizzard is committed to the repo.
//
//   node scripts/fetch-bw.mjs dist                 # download from BW_ZIP_URL or the default mirrors
//   node scripts/fetch-bw.mjs dist path/to/StarCraft  # use a local folder (or .zip) with STARDAT.MPQ / BROODAT.MPQ
//
// Never fails the build: without sprites the game falls back to its placeholder art.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

// Brood War 1.16.1 archives (.zip or .7z) containing STARDAT.MPQ and BROODAT.MPQ
const MIRRORS = [
  process.env.BW_ZIP_URL,
  'https://archive.org/download/scbw.-7z/SCBW.7z',
  'http://files.theabyss.ru/sc/starcraft.zip',
].filter(Boolean);

const outDir = process.argv[2] ?? 'dist';
const localSource = process.argv[3];

// the file lists live in src/bw/*.ts as quoted literal paths; keep one source of truth
const srcDir = new URL('../src/bw/', import.meta.url);
const assetsSrc = readdirSync(srcDir).filter((n) => n.endsWith('.ts')).map((n) => readFileSync(new URL(n, srcDir), 'utf8')).join('\n');
const wanted = [...new Set([...assetsSrc.matchAll(/'((?:unit|tileset|game|glue|font|cursor)\/[\w/]+\.(?:grp|wpe|cv5|vx4|vr4|pcx|fnt))'/g)].map((m) => m[1]))];

function findMpqs(dir) {
  const out = {};
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/^(stardat|broodat|patch_rt|broodwar)\.mpq$/i.test(name)) out[name.toLowerCase()] = p;
    }
  };
  walk(dir);
  return out;
}

// only the MPQs are needed, so skip the rest of the archive
function extract(archive, dir) {
  if (/\.7z$/i.test(archive)) execFileSync('7z', ['x', '-y', `-o${dir}`, archive, '-r', '*.mpq', '*.MPQ'], { stdio: 'ignore' });
  else execFileSync('unzip', ['-q', '-o', '-C', archive, '*.mpq', '-d', dir]);
}

async function download(url, dest) {
  const res = await fetch(url, { redirect: 'follow' });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
}

async function getSourceDir() {
  if (localSource) {
    if (statSync(localSource).isDirectory()) return localSource;
    const dir = mkdtempSync(join(tmpdir(), 'bw-'));
    extract(localSource, dir);
    return dir;
  }
  for (const url of MIRRORS) {
    const dir = mkdtempSync(join(tmpdir(), 'bw-'));
    const archive = join(dir, /\.7z$/i.test(url) ? 'bw.7z' : 'bw.zip');
    try {
      console.log(`fetch-bw: downloading ${url}`);
      await download(url, archive);
      extract(archive, join(dir, 'x'));
      if (Object.keys(findMpqs(join(dir, 'x'))).length) return join(dir, 'x');
      const list = execFileSync(/\.7z$/i.test(url) ? '7z' : 'unzip', /\.7z$/i.test(url) ? ['l', archive] : ['-l', archive]).toString();
      console.warn(`fetch-bw: no StarCraft MPQs inside ${url}. Contents:\n${list.split('\n').slice(0, 60).join('\n')}`);
    } catch (e) {
      console.warn(`fetch-bw: ${url} failed: ${e.message}`);
    }
  }
  return null;
}

// ------------------------------------------------------------ maps
// Each zone is played on a real StarCraft scenario. A zone takes the first of its preferred
// missions that exists, otherwise the largest scenario on the same tileset (then the fallback one).
const TILESETS = ['badlands', 'platform', 'install', 'ashworld', 'jungle', 'desert', 'ice', 'twilight'];
const ZONE_MAPS = {
  marsara: { era: 0, prefer: ['campaign\\terran\\terran07', 'campaign\\terran\\terran08'] },
  char: { era: 3, prefer: ['campaign\\zerg\\zerg06', 'campaign\\zerg\\zerg08'] },
  aiur: { era: 4, prefer: ['campaign\\protoss\\protoss10', 'campaign\\protoss\\protoss08'] },
  korhal: { era: 1, prefer: ['campaign\\terran\\terran09', 'campaign\\protoss\\protoss04'] },
  ulnar: { era: 7, fallback: 2, prefer: [] },
};
const MINERALS = { 176: 'unit/neutral/min01.grp', 177: 'unit/neutral/min02.grp', 178: 'unit/neutral/min03.grp' };
const GEYSER = 188;
const START = 214;

function scenarioDirs() {
  const out = [];
  for (const r of ['terran', 'zerg', 'protoss']) {
    for (let i = 1; i <= 10; i++) out.push(`campaign\\${r}\\${r}${String(i).padStart(2, '0')}`);
    // Brood War's own missions; the folder name differs between releases, so try the known spellings
    for (let i = 1; i <= 10; i++) {
      const n = String(i).padStart(2, '0');
      out.push(`campaign\\expcamp\\${r}${n}`, `campaign\\x${r}\\${r}${n}`, `campaign\\exp${r}\\${r}${n}`, `campaign\\${r}\\x${r}${n}`, `campaign\\x${r}\\x${r}${n}`, `campaign\\expansion\\${r}\\${r}${n}`, `campaign\\bw\\${r}${n}`, `campaign\\${r}x\\${r}${n}`);
    }
  }
  return out;
}

function chkSections(d) {
  const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
  const secs = new Map();
  for (let o = 0; o + 8 <= d.length; ) {
    const id = Buffer.from(d.subarray(o, o + 4)).toString('latin1');
    const len = v.getInt32(o + 4, true);
    const body = d.subarray(o + 8, Math.min(d.length, o + 8 + Math.max(0, len)));
    if (!secs.has(id)) secs.set(id, []);
    secs.get(id).push(body);
    o += 8 + Math.max(0, len);
  }
  return secs;
}

const u16 = (b, o) => b[o] | (b[o + 1] << 8);
const u32 = (b, o) => (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0;

function mapString(secs, idx) {
  const str = secs.get('STRx')?.at(-1) ?? secs.get('STR ')?.at(-1);
  if (!str || !idx) return '';
  const wide = secs.has('STRx');
  const count = wide ? u32(str, 0) : u16(str, 0);
  if (idx > count) return '';
  const off = wide ? u32(str, idx * 4) : u16(str, idx * 2);
  let e = off;
  while (e < str.length && str[e]) e++;
  // drop colour codes
  return Buffer.from(str.subarray(off, e)).toString('latin1').replace(/[\x00-\x1f]/g, '').trim();
}

function buildMaps(read, outDir, got) {
  const tbl = (() => {
    const d = read('arr\\images.tbl');
    if (!d) return [];
    const n = u16(d, 0);
    const out = [];
    for (let i = 0; i < n; i++) {
      const o = u16(d, 2 + i * 2);
      let e = o;
      while (e < d.length && d[e]) e++;
      out.push(Buffer.from(d.subarray(o, e)).toString('latin1'));
    }
    return out;
  })();
  const spritesDat = read('arr\\sprites.dat');
  const imagesDat = read('arr\\images.dat');
  // sprites.dat starts with 517 u16 image ids; images.dat with 999 u32 GRP ids (1-based into images.tbl)
  const spriteGrp = (sid) => {
    if (!spritesDat || !imagesDat || sid >= 517) return null;
    const img = u16(spritesDat, sid * 2);
    if (img >= 999) return null;
    const g = u32(imagesDat, img * 4);
    const p = g ? tbl[g - 1] : null;
    return p ? 'unit/' + p.replace(/\\/g, '/').toLowerCase() : null;
  };

  const found = [];
  for (const dir of scenarioDirs()) {
    const d = read(`${dir}\\staredit\\scenario.chk`);
    if (!d) continue;
    const secs = chkSections(d);
    const era = secs.get('ERA ') ? u16(secs.get('ERA ').at(-1), 0) & 7 : -1;
    const dim = secs.get('DIM ')?.at(-1);
    if (!dim || era < 0) continue;
    found.push({ dir, secs, era, w: u16(dim, 0), h: u16(dim, 2) });
  }
  console.log('fetch-bw: scenarios ' + found.map((m) => `${m.dir} ${TILESETS[m.era]} ${m.w}x${m.h}`).join(' | '));

  const maps = {};
  for (const [zone, cfg] of Object.entries(ZONE_MAPS)) {
    const bySize = (era) => found.filter((m) => m.era === era).sort((a, b) => b.w * b.h - a.w * a.h)[0];
    const m = cfg.prefer.map((p) => found.find((f) => f.dir === p)).find(Boolean) ?? bySize(cfg.era) ?? (cfg.fallback !== undefined ? bySize(cfg.fallback) : undefined);
    if (!m) {
      console.warn(`fetch-bw: no scenario for ${zone}`);
      continue;
    }
    const set = TILESETS[m.era];
    const cv5 = read(`tileset\\${set}.cv5`);
    if (!cv5) continue;
    const { secs, w, h } = m;
    // MTXM holds what is drawn: group << 4 | index into the CV5 group's 16 megatiles
    const raw = new Uint16Array(w * h);
    for (const mt of secs.get('MTXM') ?? []) for (let i = 0; i < raw.length && i * 2 + 1 < mt.length; i++) raw[i] = u16(mt, i * 2);
    const groups = cv5.length / 52;
    const mega = new Uint16Array(w * h);
    for (let i = 0; i < raw.length; i++) {
      const g = raw[i] >> 4;
      mega[i] = g < groups ? u16(cv5, g * 52 + 20 + (raw[i] & 15) * 2) : 0;
    }
    const minerals = [];
    const geysers = [];
    const starts = [];
    for (const u of secs.get('UNIT') ?? [])
      for (let o = 0; o + 36 <= u.length; o += 36) {
        const x = u16(u, o + 4);
        const y = u16(u, o + 6);
        const id = u16(u, o + 8);
        if (MINERALS[id]) minerals.push([x, y, id - 176]);
        else if (id === GEYSER) geysers.push([x, y]);
        else if (id === START) starts.push([x, y, u[o + 16]]);
      }
    const images = [];
    const doodads = [];
    for (const t of secs.get('THG2') ?? [])
      for (let o = 0; o + 10 <= t.length; o += 10) {
        const flags = u16(t, o + 8);
        if (!(flags & 0x1000)) continue; // a unit, not a sprite
        const grp = spriteGrp(u16(t, o));
        if (!grp || !/^unit\/(thingy\/tileset|neutral)\//.test(grp)) continue;
        let k = images.indexOf(grp);
        if (k < 0) k = images.push(grp) - 1;
        doodads.push([k, u16(t, o + 2), u16(t, o + 4)]);
      }
    const sprp = secs.get('SPRP')?.at(-1);
    // "T7) Biting the Bullet" -> "Biting the Bullet"; the editor's default name means no title
    const title = (sprp ? mapString(secs, u16(sprp, 0)) : '').replace(/^[A-Z]?\d+\)\s*/, '').replace(/^Untitled Scenario$/i, '');
    // copy the doodad art next to the map
    const keep = images.filter((p) => {
      if (got.includes(p)) return true;
      const d = read(p.replace(/^unit\//, 'unit\\').replace(/\//g, '\\'));
      if (!d) return false;
      const dest = join(outDir, 'bw', p);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, d);
      got.push(p);
      return true;
    });
    const json = {
      zone, source: m.dir.replace(/\\/g, '/'), title, set, w, h,
      tiles: Buffer.from(mega.buffer).toString('base64'),
      images, doodads: doodads.filter(([k]) => keep.includes(images[k])),
      minerals, geysers, starts,
    };
    const dest = join(outDir, 'bw', 'maps', `${zone}.json`);
    mkdirSync(dirname(dest), { recursive: true });
    writeFileSync(dest, JSON.stringify(json));
    got.push(`maps/${zone}.json`);
    maps[zone] = set;
    console.log(`fetch-bw: ${zone} -> ${m.dir} "${title}" ${set} ${w}x${h}, ${json.doodads.length} doodads (${images.length} kinds), ${minerals.length} minerals, ${geysers.length} geysers, ${starts.length} starts`);
  }
  return maps;
}

async function main() {
  const src = await getSourceDir();
  if (!src) return console.warn('fetch-bw: no source available, shipping placeholder art only');
  const mpqs = findMpqs(src);
  const { FS, MPQ } = await import('@wowserhq/stormjs');
  FS.mkdir('/bw');
  FS.mount(FS.filesystems.NODEFS, { root: '/' }, '/bw');
  // later archives override earlier ones, like the game itself
  const order = ['patch_rt.mpq', 'broodat.mpq', 'stardat.mpq', 'broodwar.mpq'].filter((n) => mpqs[n]);
  const archives = [];
  for (const n of order) archives.push(await MPQ.open('/bw' + mpqs[n], 'r'));
  const got = [];
  const looksValid = (path, d) => {
    if (!path.endsWith('.grp')) return d.length >= 64;
    const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
    const n = d.length >= 6 ? v.getUint16(0, true) : 0;
    return n > 0 && n < 2048 && v.getUint16(2, true) > 0 && v.getUint16(4, true) > 0 && 6 + n * 8 <= d.length;
  };
  for (const path of wanted) {
    const mpqPath = path.replace(/\//g, '\\');
    for (const [i, a] of archives.entries()) {
      if (!a.hasFile(mpqPath)) continue;
      const f = a.openFile(mpqPath);
      const data = f.read().slice(); // copy out of the WASM heap before close() frees it
      f.close();
      if (!looksValid(path, data)) {
        console.warn(`fetch-bw: ${path} in ${order[i]} is not a valid file (${data.length} bytes), trying the next archive`);
        continue;
      }
      const dest = join(outDir, 'bw', path);
      mkdirSync(dirname(dest), { recursive: true });
      writeFileSync(dest, data);
      got.push(path);
      break;
    }
  }
  const readAny = (p) => {
    for (const a of archives) {
      if (!a.hasFile(p)) continue;
      const f = a.openFile(p);
      const d = f.read().slice();
      f.close();
      return d;
    }
    return null;
  };
  let maps = {};
  try {
    maps = buildMaps(readAny, outDir, got);
  } catch (e) {
    console.warn(`fetch-bw: maps failed: ${e.stack || e}`);
  }
  for (const a of archives) a.close();
  if (!got.length) return console.warn('fetch-bw: found none of the sprite files');
  writeFileSync(join(outDir, 'bw', 'manifest.json'), JSON.stringify({ files: got, maps }));
  const missing = wanted.filter((p) => !got.includes(p));
  console.log(`fetch-bw: wrote ${got.length}/${wanted.length} files to ${join(outDir, 'bw')}${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`);
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
main().catch((e) => console.warn(`fetch-bw: ${e.stack || e}`));
