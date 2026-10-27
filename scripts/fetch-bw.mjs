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

// the file list lives in src/bw/assets.ts; keep one source of truth
const assetsSrc = readFileSync(new URL('../src/bw/assets.ts', import.meta.url), 'utf8');
const wanted = [...new Set([...assetsSrc.matchAll(/'((?:unit|tileset)\/[\w/]+\.(?:grp|wpe))'/g)].map((m) => m[1]))];

function findMpqs(dir) {
  const out = {};
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (/^(stardat|broodat|patch_rt)\.mpq$/i.test(name)) out[name.toLowerCase()] = p;
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

async function main() {
  const src = await getSourceDir();
  if (!src) return console.warn('fetch-bw: no source available, shipping placeholder art only');
  const mpqs = findMpqs(src);
  const { FS, MPQ } = await import('@wowserhq/stormjs');
  FS.mkdir('/bw');
  FS.mount(FS.filesystems.NODEFS, { root: '/' }, '/bw');
  // later archives override earlier ones, like the game itself
  const order = ['patch_rt.mpq', 'broodat.mpq', 'stardat.mpq'].filter((n) => mpqs[n]);
  const archives = [];
  for (const n of order) archives.push(await MPQ.open('/bw' + mpqs[n], 'r'));
  const got = [];
  const looksValid = (path, d) => {
    if (!path.endsWith('.grp')) return d.length >= 768;
    const v = new DataView(d.buffer, d.byteOffset, d.byteLength);
    const n = d.length >= 6 ? v.getUint16(0, true) : 0;
    return n > 0 && n < 2048 && v.getUint16(2, true) > 0 && v.getUint16(4, true) > 0 && 6 + n * 8 <= d.length;
  };
  for (const path of wanted) {
    const mpqPath = path.replace(/\//g, '\\');
    for (const [i, a] of archives.entries()) {
      if (!a.hasFile(mpqPath)) continue;
      const f = a.openFile(mpqPath);
      const data = f.read();
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
  for (const a of archives) a.close();
  if (!got.length) return console.warn('fetch-bw: found none of the sprite files');
  writeFileSync(join(outDir, 'bw', 'manifest.json'), JSON.stringify({ files: got }));
  const missing = wanted.filter((p) => !got.includes(p));
  console.log(`fetch-bw: wrote ${got.length}/${wanted.length} files to ${join(outDir, 'bw')}${missing.length ? ` (missing: ${missing.join(', ')})` : ''}`);
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
main().catch((e) => console.warn(`fetch-bw: ${e.stack || e}`));
