// Deploy step (work in progress): finds a classic Warcraft III install on archive.org and pulls out
// the hero models, icons and sounds the game will use. Nothing from Blizzard is committed to the repo.
//
//   node scripts/fetch-wc3.mjs dist --probe   # only list candidate archives (used while choosing a mirror)
//
// Never fails the build.
const ITEMS = [
  'warcraft-3-expansion',
  'warcraft-iii_202603',
  'warcraft-iii-3-reign-of-chaos-the-frozen-throne-p-rus-rus-2002-2003-1.26a-1.27b-1.29.2',
  'war3tft-esn',
  'warcraft-iii-the-frozen-throne-german-2003',
];

async function probe() {
  for (const id of ITEMS) {
    try {
      const res = await fetch(`https://archive.org/metadata/${id}`);
      const meta = await res.json();
      const files = (meta.files ?? []).filter((f) => /\.(mpq|zip|7z|rar|iso|exe|bin|mdf|cue)$/i.test(f.name));
      console.log(`fetch-wc3: ${id} (${meta.metadata?.title ?? '?'}) ${files.length} archives`);
      for (const f of files.slice(0, 40)) console.log(`  ${(Number(f.size) / 1e6).toFixed(1).padStart(8)} MB  ${f.name}`);
    } catch (e) {
      console.warn(`fetch-wc3: ${id} failed: ${e.message}`);
    }
  }
}

if (process.argv.includes('--probe')) probe().catch((e) => console.warn(`fetch-wc3: ${e.stack || e}`));
