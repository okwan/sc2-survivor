// Deploy step: downloads a classic Warcraft III (1.27b, MPQ based) install, pulls out the hero models,
// icons and sounds listed in src/wc3/*.ts, pre-renders the heroes into sprite sheets and writes
// everything to <outDir>/wc3/ with a manifest. Nothing from Blizzard is committed to the repo.
//
//   node scripts/fetch-wc3.mjs dist                    # download from WC3_ARCHIVE_URL or the default mirrors
//   node scripts/fetch-wc3.mjs dist path/to/Warcraft3  # use a local install folder (or .7z/.zip) with war3.mpq
//
// Raw files are kept in WC3_CACHE (default .wc3-cache/) so CI can skip the 1.6 GB download next time.
// Never fails the build: without WC3 files the game keeps its Brood War hero art.
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { deflateSync, crc32 } from 'node:zlib';

const MIRRORS = [
  process.env.WC3_ARCHIVE_URL,
  'https://archive.org/download/warcraft-iii_202603/Warcraft%20III%20%28v1.27b%29.7z',
  'https://archive.org/download/warcraft-3-expansion/Warcraft_III_-_Complete_Edition_Repack.7z',
].filter(Boolean);

const outDir = process.argv[2] ?? 'dist';
const localSource = process.argv[3];
const cacheDir = process.env.WC3_CACHE ?? '.wc3-cache';

// the file lists live in src/wc3/*.ts as quoted literal paths; keep one source of truth
const srcDir = new URL('../src/wc3/', import.meta.url);
const assetsSrc = readdirSync(srcDir).filter((n) => n.endsWith('.ts')).map((n) => readFileSync(new URL(n, srcDir), 'utf8')).join('\n');
const wanted = [...new Set([...assetsSrc.matchAll(/'((?:Units|ReplaceableTextures|Textures|Abilities|Objects|Sound|UI)\/[\w/ .-]+\.(?:mdx|blp|wav|mp3))'/g)].map((m) => m[1]))];
const heroes = Object.fromEntries([...assetsSrc.matchAll(/(\w+): \{ model: '([^']+)', icon: '([^']+)' \}/g)].map((m) => [m[1], { model: m[2], icon: m[3] }]));

// ------------------------------------------------------------ source
const MPQ_RE = /^(war3|war3x|war3xlocal|war3patch)\.mpq$/i;

function findMpqs(dir) {
  const out = {};
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const p = join(d, name);
      if (statSync(p).isDirectory()) walk(p);
      else if (MPQ_RE.test(name)) out[name.toLowerCase()] = p;
    }
  };
  walk(dir);
  return out;
}

function extract(archive, dir) {
  if (/\.zip$/i.test(archive)) execFileSync('unzip', ['-q', '-o', '-C', archive, '*.mpq', '-d', dir]);
  else execFileSync('7z', ['x', '-y', `-o${dir}`, archive, '-r', '*.mpq', '*.MPQ'], { stdio: 'ignore' });
}

async function getSourceDir() {
  if (localSource) {
    if (statSync(localSource).isDirectory()) return localSource;
    const dir = mkdtempSync(join(tmpdir(), 'wc3-'));
    extract(localSource, dir);
    return dir;
  }
  for (const url of MIRRORS) {
    const dir = mkdtempSync(join(tmpdir(), 'wc3-'));
    const archive = join(dir, /\.zip$/i.test(url) ? 'wc3.zip' : 'wc3.7z');
    try {
      console.log(`fetch-wc3: downloading ${url}`);
      const t0 = Date.now();
      // curl streams to disk; the archive is too big to buffer in memory
      execFileSync('curl', ['-fsSL', '--retry', '3', '-o', archive, url], { stdio: 'inherit' });
      console.log(`fetch-wc3: ${(statSync(archive).size / 1e6).toFixed(0)} MB in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
      extract(archive, join(dir, 'x'));
      execFileSync('rm', ['-f', archive]);
      if (Object.keys(findMpqs(join(dir, 'x'))).length) return join(dir, 'x');
      console.warn(`fetch-wc3: no Warcraft III MPQs inside ${url}`);
    } catch (e) {
      console.warn(`fetch-wc3: ${url} failed: ${e.message}`);
    }
  }
  return null;
}

// ------------------------------------------------------------ raw files
const cached = (p) => join(cacheDir, p);

function missingFromCache(paths) {
  return paths.filter((p) => !existsSync(cached(p)) && !existsSync(cached(p) + '.missing'));
}

/** Copies the wanted files (plus every texture the wanted models use) from the MPQs into the cache. */
async function fillCache() {
  const W = await import('war3-model');
  let todo = missingFromCache(wanted);
  if (!todo.length) {
    // the model list may be cached but a new model's textures not yet
    todo = wanted.filter((p) => p.endsWith('.mdx') && existsSync(cached(p))).flatMap((p) => texturesOf(W, readFileSync(cached(p))).map(slash));
    todo = missingFromCache(todo);
    if (!todo.length) return console.log(`fetch-wc3: all ${wanted.length} files already cached in ${cacheDir}`);
  }
  const src = await getSourceDir();
  if (!src) return console.warn('fetch-wc3: no source available');
  const mpqs = findMpqs(src);
  console.log(`fetch-wc3: archives ${Object.keys(mpqs).join(', ')}`);
  const { FS, MPQ } = await import('@wowserhq/stormjs');
  FS.mkdir('/wc3');
  FS.mount(FS.filesystems.NODEFS, { root: '/' }, '/wc3');
  // patch first: it overrides the base game, like the game itself
  const order = ['war3patch.mpq', 'war3xlocal.mpq', 'war3x.mpq', 'war3.mpq'].filter((n) => mpqs[n]);
  const archives = [];
  for (const n of order) archives.push(await MPQ.open('/wc3' + mpqs[n], 'r'));
  const read = (p) => {
    const mp = p.replace(/\//g, '\\');
    for (const a of archives) {
      if (!a.hasFile(mp)) continue;
      const f = a.openFile(mp);
      const d = f.read().slice(); // copy out of the WASM heap before close() frees it
      f.close();
      return d;
    }
    return null;
  };
  const save = (p, d) => {
    mkdirSync(dirname(cached(p)), { recursive: true });
    if (d) writeFileSync(cached(p), d);
    else writeFileSync(cached(p) + '.missing', '');
  };
  const missing = [];
  for (const p of wanted) {
    const d = read(p);
    save(p, d);
    if (!d) missing.push(p);
    if (d && p.endsWith('.mdx')) {
      for (const t of texturesOf(W, d).map(slash)) {
        const td = read(t);
        save(t, td);
        if (!td) missing.push(t);
      }
    }
  }
  if (missing.length) {
    console.warn(`fetch-wc3: not found: ${missing.join(', ')}`);
    // help pick the right names from the archive's own file list
    const list = new TextDecoder().decode(read('(listfile)') ?? new Uint8Array());
    for (const p of missing) {
      const base = p.split('/').pop().replace(/\.\w+$/, '').toLowerCase().slice(0, 8);
      const near = list.split(/\r?\n/).filter((l) => l.toLowerCase().includes(base)).slice(0, 8);
      if (near.length) console.warn(`fetch-wc3:   ${p} -> maybe ${near.join(' | ')}`);
    }
  }
  // keep the archive's file list so later (cached) runs can suggest names for icons that weren't found
  const listfile = read('(listfile)');
  if (listfile) writeFileSync(join(cacheDir, 'listfile.txt'), listfile);
  if (process.env.WC3_LIST_ICONS) {
    // handy when picking ability and item icons for src/wc3/*.ts
    const list = new TextDecoder().decode(read('(listfile)') ?? new Uint8Array());
    const btn = [...new Set(list.split(/\r?\n/).filter((l) => /^ReplaceableTextures\\CommandButtons\\BTN/i.test(l)).map((l) => l.split('\\').pop().replace(/\.blp$/i, '')))];
    for (let i = 0; i < btn.length; i += 40) console.log(`fetch-wc3: icons ${btn.slice(i, i + 40).join(' ')}`);
  }
  for (const a of archives) a.close();
}

const slash = (p) => p.replace(/\\/g, '/');

function texturesOf(W, mdx) {
  try {
    const m = W.parseMDX(new Uint8Array(mdx).slice().buffer);
    return m.Textures.map((t) => t.Image).filter((p) => p && /\.blp$/i.test(p));
  } catch (e) {
    console.warn(`fetch-wc3: bad model: ${e.message}`);
    return [];
  }
}

// ------------------------------------------------------------ output
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
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

async function main() {
  await fillCache();
  const W = await import('war3-model');
  const dest = join(outDir, 'wc3');
  const got = [];
  // icons: BLP -> PNG
  for (const p of wanted.filter((p) => /\.blp$/i.test(p) && existsSync(cached(p)))) {
    try {
      const blp = W.decodeBLP(new Uint8Array(readFileSync(cached(p))).slice().buffer);
      const img = W.getBLPImageData(blp, 0);
      const name = `icons/${p.split('/').pop().replace(/\.blp$/i, '.png')}`;
      mkdirSync(join(dest, 'icons'), { recursive: true });
      writeFileSync(join(dest, name), png(img.width, img.height, new Uint8Array(img.data.buffer, img.data.byteOffset, img.data.byteLength)));
      got.push(name);
    } catch (e) {
      console.warn(`fetch-wc3: icon ${p} failed: ${e.message}`);
    }
  }
  // sounds go out as they are
  for (const p of wanted.filter((p) => /\.(wav|mp3)$/i.test(p) && existsSync(cached(p)))) {
    const name = `sound/${p}`;
    mkdirSync(dirname(join(dest, name)), { recursive: true });
    writeFileSync(join(dest, name), readFileSync(cached(p)));
    got.push(name);
  }
  // heroes: MDX -> sprite sheets
  const jobs = [];
  for (const [id, h] of Object.entries(heroes)) {
    if (!existsSync(cached(h.model))) continue;
    const mdx = readFileSync(cached(h.model));
    const textures = {};
    // keyed by the model's own (backslashed) path, which is how the renderer looks them up
    for (const t of texturesOf(W, mdx)) if (existsSync(cached(slash(t)))) textures[t] = readFileSync(cached(slash(t)));
    const lacking = texturesOf(W, mdx).filter((t) => !textures[t]);
    if (lacking.length) console.warn(`fetch-wc3: ${id} has no ${lacking.join(', ')}`);
    jobs.push({ id, mdx, textures });
  }
  let sprites = {};
  if (jobs.length) {
    const only = process.env.WC3_ONLY?.split(',');
    const { renderModels } = await import('./render-wc3.mjs');
    sprites = await renderModels(only ? jobs.filter((j) => only.includes(j.id)) : jobs, join(dest, 'hero'));
    for (const [id, s] of Object.entries(sprites)) for (const a of Object.keys(s.anims)) got.push(`hero/${id}-${a}.png`);
  }
  // CI logs are the only window into the rendered sheets, so print a few as base64 when asked
  for (const name of process.env.WC3_PREVIEW?.split(',') ?? []) {
    const p = join(dest, 'hero', `${name}.png`);
    if (!existsSync(p)) continue;
    const b64 = readFileSync(p).toString('base64');
    for (let i = 0; i < b64.length; i += 4000) console.log(`WC3PNG ${name} ${b64.slice(i, i + 4000)}`);
  }
  if (!got.length) return console.warn('fetch-wc3: nothing to ship, the game keeps its Brood War heroes');
  writeFileSync(join(dest, 'manifest.json'), JSON.stringify({ files: got, heroes: sprites }));
  console.log(`fetch-wc3: wrote ${got.length} files to ${dest} (${Object.keys(sprites).length}/${Object.keys(heroes).length} heroes rendered)`);
}

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });
main().catch((e) => console.warn(`fetch-wc3: ${e.stack || e}`));
