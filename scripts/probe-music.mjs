// Temporary (branch builds only): checks the Brood War CD's INSTALL.EXE (an MPQ) for the music.
import { execFileSync } from 'node:child_process';
import { createWriteStream } from 'node:fs';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
const url = 'https://archive.org/download/starcraft-expansion-set-brood-war/INSTALL.EXE';
const t0 = Date.now();
const res = await fetch(url, { redirect: 'follow' });
console.log(`probe: ${res.status} ${res.headers.get('content-length')}`);
await pipeline(Readable.fromWeb(res.body), createWriteStream('/tmp/install.exe'));
console.log(`probe: downloaded in ${((Date.now() - t0) / 1000).toFixed(0)} s`);
const { FS, MPQ } = await import('@wowserhq/stormjs');
FS.mkdir('/bw');
FS.mount(FS.filesystems.NODEFS, { root: '/' }, '/bw');
const a = await MPQ.open('/bw/tmp/install.exe', 'r');
const names = ['title', 'terran1', 'terran2', 'terran3', 'zerg1', 'zerg2', 'zerg3', 'protoss1', 'protoss2', 'protoss3', 'tdefeat', 'zdefeat', 'pdefeat', 'tvictory', 'zvictory', 'pvictory', 'trdyroom', 'zrdyroom', 'prdyroom', 'tcredits', 'zcredits', 'pcredits'];
for (const n of names) {
  const p = `music\\${n}.wav`;
  if (!a.hasFile(p)) {
    console.log(`probe: ${p} missing`);
    continue;
  }
  const f = a.openFile(p);
  const d = f.read().slice();
  f.close();
  console.log(`probe: ${p} ${d.length} head ${Buffer.from(d.subarray(20, 36)).toString('hex')}`);
}
console.log('probe: ffmpeg ' + execFileSync('ffmpeg', ['-hide_banner', '-encoders']).toString().split('\n').filter((l) => /opus|vorbis|mp3|aac/.test(l)).join(' / '));
