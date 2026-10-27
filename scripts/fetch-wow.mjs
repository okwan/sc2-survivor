// Deploy step: downloads the World of Warcraft 1.12 client, pulls out the interface art (frames,
// buttons, action bar, unit frames, tooltips, cursors, loading screens, icons), the fonts and the
// interface sounds, converts BLP textures to PNG and writes them to <outDir>/wow/ with a manifest.
// Nothing from Blizzard is committed to the repo.
//
//   node scripts/fetch-wow.mjs dist                  # download from WOW_ARCHIVE_URL or the default mirrors
//   node scripts/fetch-wow.mjs dist path/to/WoW      # use a local install folder (or archive) with Data/*.MPQ
//
// Converted files are kept in WOW_CACHE (default .wow-cache/) so CI can skip the multi-GB download.
// Paths are lowercased everywhere (GitHub Pages is case sensitive, the MPQs are not).
// Never fails the build: without WoW files the game keeps its StarCraft interface.
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative } from 'node:path';
import { crc32, deflateSync } from 'node:zlib';
import { decodeBlp } from './blp.mjs';

/**
 * Where the client comes from. An archive URL (zip/7z/rar holding Data/*.MPQ) from WOW_ARCHIVE_URL wins;
 * otherwise the 1.12.1 enUS installers on archive.org, which are Inno Setup sets (setup.exe + .bin
 * slices) unpacked with innoextract. archive.org serves single files out of a zip, so only the
 * installer itself is downloaded.
 */
const SOURCES = [
  process.env.WOW_ARCHIVE_URL && { url: process.env.WOW_ARCHIVE_URL },
  {
    inno: 'https://archive.org/download/nostalrius-wow-classic/Nostalrius-WoW-Classic.zip/WoW%20Classic%2F',
    parts: ['WoW-1.12.1-Setup.exe', 'WoW-1.12.1-Setup-1.bin', 'WoW-1.12.1-Setup-2.bin', 'WoW-1.12.1-Setup-3.bin'],
  },
  {
    inno: 'https://archive.org/download/World_of_Warcraft_Client_and_Installation_Archive/ISO/WoW-1.12.1_install.rar/Wowinstall%20classic%2F',
    parts: ['setup.exe', 'setup-1.bin', 'setup-2.bin', 'setup-3.bin', 'setup-4.bin'],
  },
].filter(Boolean);

const outDir = process.argv[2] ?? 'dist';
const localSource = process.argv[3];
const cacheDir = process.env.WOW_CACHE ?? '.wow-cache';
/** bump when the extracted set or the conversion changes */
const CACHE_VERSION = 3;

// what we keep, matched against the archives' (listfile) entries
const KEEP = [
  /^interface\\(?!worldmap\\|taxiframe\\|glues\\credits\\|glues\\models\\|pictures\\)[^.]+\.blp$/i,
  /^fonts\\[^\\]+\.ttf$/i,
  /^sound\\interface\\[^\\]+\.wav$/i,
];
// patches first: they override the base game, like the client itself
const MPQ_ORDER = ['patch-3.mpq', 'patch-2.mpq', 'patch.mpq', 'interface.mpq', 'fonts.mpq', 'sound.mpq', 'misc.mpq', 'base.mpq'];

// ------------------------------------------------------------ source
function findMpqs(dir) {
  const out = {};
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (MPQ_ORDER.includes(name.toLowerCase())) out[name.toLowerCase()] = p;
    }
  };
  walk(dir);
  return out;
}

function extract(archive, dir) {
  mkdirSync(dir, { recursive: true });
  const pats = MPQ_ORDER.flatMap((n) => [n, n.toUpperCase(), n.replace('.mpq', '.MPQ')]);
  if (/\.zip$/i.test(archive)) {
    try {
      execFileSync('unzip', ['-q', '-o', '-C', archive, ...pats.map((p) => `*${p}`), '-d', dir], { stdio: 'inherit' });
    } catch {
      // unzip exits non-zero when some patterns match nothing
    }
  } else execFileSync('7z', ['x', '-y', `-o${dir}`, archive, '-r', ...pats], { stdio: 'ignore' });
}

async function getSourceDir() {
  if (localSource) {
    if (statSync(localSource).isDirectory()) return localSource;
    const dir = mkdtempSync(join(tmpdir(), 'wow-'));
    extract(localSource, dir);
    return dir;
  }
  for (const src of SOURCES) {
    const dir = mkdtempSync(join(tmpdir(), 'wow-'));
    if (src.inno) {
      try {
        const t0 = Date.now();
        for (const part of src.parts) {
          console.log(`fetch-wow: downloading ${src.inno}${part}`);
          execFileSync('curl', ['-fsSL', '--retry', '3', '-o', join(dir, part), src.inno + encodeURIComponent(part)], { stdio: 'inherit' });
        }
        console.log(`fetch-wow: installer downloaded in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
        const out = join(dir, 'x');
        mkdirSync(out);
        const inc = MPQ_ORDER.flatMap((n) => ['-I', n]);
        execFileSync('innoextract', ['-s', '--progress=0', '-e', '-d', out, ...inc, join(dir, src.parts[0])], { stdio: 'inherit' });
        for (const part of src.parts) rmSync(join(dir, part), { force: true });
        if (Object.keys(findMpqs(out)).length) return out;
        console.warn('fetch-wow: no WoW MPQs in the installer; it holds:');
        const list = execFileSync('innoextract', ['-l', join(dir, src.parts[0])], { encoding: 'utf8', maxBuffer: 1 << 28 });
        console.warn(list.split('\n').filter((l) => /mpq|\.exe/i.test(l)).slice(0, 60).join('\n'));
      } catch (e) {
        console.warn(`fetch-wow: installer ${src.inno} failed: ${e.message}`);
      }
      rmSync(dir, { recursive: true, force: true });
      continue;
    }
    const url = src.url;
    const ext = (url.match(/\.(zip|7z|rar|tar|gz)(?:$|\?)/i)?.[1] ?? 'zip').toLowerCase();
    const archive = join(dir, `wow.${ext}`);
    try {
      console.log(`fetch-wow: downloading ${url}`);
      const t0 = Date.now();
      // curl streams to disk; the client is far too big to buffer in memory
      execFileSync('curl', ['-fsSL', '--retry', '3', '-o', archive, url], { stdio: 'inherit' });
      console.log(`fetch-wow: ${(statSync(archive).size / 1e6).toFixed(0)} MB in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      extract(archive, join(dir, 'x'));
      rmSync(archive, { force: true });
      if (Object.keys(findMpqs(join(dir, 'x'))).length) return join(dir, 'x');
      console.warn(`fetch-wow: no WoW MPQs inside ${url}`);
    } catch (e) {
      console.warn(`fetch-wow: ${url} failed: ${e.message}`);
    }
    rmSync(dir, { recursive: true, force: true });
  }
  return null;
}

// ------------------------------------------------------------ conversion
function png(width, height, rgba) {
  const chunk = (type, data) => {
    const b = Buffer.alloc(12 + data.length);
    b.writeUInt32BE(data.length, 0);
    b.write(type, 4, 'ascii');
    data.copy(b, 8);
    b.writeUInt32BE(crc32(b.subarray(4, 8 + data.length)), 8 + data.length);
    return b;
  };
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8);
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))]);
}

/** Opens the MPQs, converts every kept file into the cache. */
async function fillCache() {
  const marker = join(cacheDir, `done-v${CACHE_VERSION}`);
  if (existsSync(marker)) return console.log(`fetch-wow: using cached files in ${cacheDir}`);
  const src = await getSourceDir();
  if (!src) return console.warn('fetch-wow: no source available');
  const mpqs = findMpqs(src);
  console.log(`fetch-wow: archives ${Object.keys(mpqs).join(', ')}`);
  const { FS, MPQ } = await import('@wowserhq/stormjs');
  FS.mkdir('/wow');
  FS.mount(FS.filesystems.NODEFS, { root: '/' }, '/wow');
  const archives = [];
  for (const n of MPQ_ORDER) if (mpqs[n]) archives.push(await MPQ.open('/wow' + mpqs[n], 'r'));
  const readFrom = (a, p) => {
    if (!a.hasFile(p)) return null;
    const f = a.openFile(p);
    const d = f.read().slice(); // copy out of the WASM heap before close() frees it
    f.close();
    return d;
  };
  const read = (p) => {
    for (const a of archives) {
      const d = readFrom(a, p);
      if (d) return d;
    }
    return null;
  };
  // union of every archive's own file list
  const names = new Map();
  for (const a of archives) {
    const list = readFrom(a, '(listfile)');
    if (!list) continue;
    for (const l of new TextDecoder().decode(list).split(/\r?\n|;/)) if (l && KEEP.some((r) => r.test(l))) names.set(l.toLowerCase(), l);
  }
  console.log(`fetch-wow: ${names.size} files to convert`);
  rmSync(cacheDir, { recursive: true, force: true });
  let n = 0;
  const failed = [];
  for (const [lower, name] of names) {
    const d = read(name);
    if (!d) continue;
    const rel = lower.replace(/\\/g, '/');
    try {
      if (rel.endsWith('.blp')) {
        const img = decodeBlp(d);
        const out = join(cacheDir, rel.replace(/\.blp$/, '.png'));
        mkdirSync(dirname(out), { recursive: true });
        writeFileSync(out, png(img.width, img.height, img.data));
      } else {
        const out = join(cacheDir, rel);
        mkdirSync(dirname(out), { recursive: true });
        writeFileSync(out, d);
      }
      n++;
    } catch (e) {
      failed.push(`${rel} (${e.message})`);
    }
  }
  for (const a of archives) a.close();
  if (failed.length) console.warn(`fetch-wow: ${failed.length} failed: ${failed.slice(0, 20).join(', ')}`);
  console.log(`fetch-wow: converted ${n} files`);
  if (n) writeFileSync(marker, '');
}

function listFiles(dir) {
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (!name.startsWith('done-v')) out.push(relative(dir, p).replace(/\\/g, '/'));
    }
  };
  if (existsSync(dir)) walk(dir);
  return out.sort();
}

/** Width x height of a PNG we wrote, from its IHDR. */
function pngSize(p) {
  const b = readFileSync(p);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
}

async function main() {
  await fillCache();
  const files = listFiles(cacheDir);
  if (!files.length) return console.warn('fetch-wow: nothing to ship, the game keeps its StarCraft interface');
  const dest = join(outDir, 'wow');
  rmSync(dest, { recursive: true, force: true });
  cpSync(cacheDir, dest, { recursive: true, filter: (p) => !/done-v\d+$/.test(p) });
  // the client only needs the sizes of the interface art; icons are all 64x64
  const sizes = {};
  for (const f of files) if (f.endsWith('.png') && !f.startsWith('interface/icons/')) sizes[f] = pngSize(join(cacheDir, f));
  const icons = files.filter((f) => f.startsWith('interface/icons/')).map((f) => f.slice(16, -4));
  writeFileSync(join(dest, 'manifest.json'), JSON.stringify({ files: Object.keys(sizes), sizes, icons, fonts: files.filter((f) => f.startsWith('fonts/')), sounds: files.filter((f) => f.startsWith('sound/')) }));
  console.log(`fetch-wow: wrote ${files.length} files to ${dest} (${icons.length} icons)`);
  if (process.env.WOW_LIST) for (const f of Object.keys(sizes)) console.log(`WOWFILE ${f} ${sizes[f].join('x')}`);
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
main().catch((e) => console.warn(`fetch-wow: ${e.stack || e}`));
