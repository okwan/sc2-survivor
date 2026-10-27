// Encodes one 16-bit PCM WAV to MP3 for scripts/fetch-bw.mjs (one track per worker thread).
import { readFileSync, writeFileSync } from 'node:fs';
import { workerData } from 'node:worker_threads';
import { Mp3Encoder } from '@breezystack/lamejs';

const { wav, mp3, kbps } = workerData;
const d = readFileSync(wav);
let ch = 2;
let rate = 22050;
let pcm = null;
for (let o = 12; o + 8 <= d.length; ) {
  const id = d.toString('latin1', o, o + 4);
  const n = d.readUInt32LE(o + 4);
  if (id === 'fmt ') {
    if (d.readUInt16LE(o + 8) !== 1 || d.readUInt16LE(o + 22) !== 16) throw new Error(`${wav}: not 16-bit PCM`);
    ch = d.readUInt16LE(o + 10);
    rate = d.readUInt32LE(o + 12);
  } else if (id === 'data') pcm = new Int16Array(d.buffer.slice(d.byteOffset + o + 8, d.byteOffset + o + 8 + (Math.min(n, d.length - o - 8) & ~1)));
  o += 8 + n + (n & 1);
}
if (!pcm) throw new Error(`${wav}: no data chunk`);
const frames = pcm.length / ch;
const left = new Int16Array(frames);
const right = new Int16Array(frames);
for (let i = 0; i < frames; i++) {
  left[i] = pcm[i * ch];
  right[i] = pcm[i * ch + ch - 1];
}
const enc = new Mp3Encoder(ch, rate, kbps);
const out = [];
for (let i = 0; i < frames; i += 1152) {
  const b = ch === 2 ? enc.encodeBuffer(left.subarray(i, i + 1152), right.subarray(i, i + 1152)) : enc.encodeBuffer(left.subarray(i, i + 1152));
  if (b.length) out.push(Buffer.from(b));
}
out.push(Buffer.from(enc.flush()));
writeFileSync(mp3, Buffer.concat(out));
