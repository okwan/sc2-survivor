/**
 * Minimal ZIP reader for the browser. Reads the central directory and inflates
 * only the entries the caller wants, using the native DecompressionStream.
 */
export async function readZip(blob: Blob, want: (path: string) => boolean): Promise<Map<string, Uint8Array>> {
  const out = new Map<string, Uint8Array>();
  const size = blob.size;
  // End of central directory record is in the last 22 + 65535 bytes.
  const tailLen = Math.min(size, 22 + 65535);
  const tail = new DataView(await blob.slice(size - tailLen).arrayBuffer());
  let eocd = -1;
  for (let i = tailLen - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Not a zip file');
  let count = tail.getUint16(eocd + 10, true);
  let cdSize = tail.getUint32(eocd + 12, true);
  let cdOffset = tail.getUint32(eocd + 16, true);
  // ZIP64 locator sits right before the EOCD
  if (cdOffset === 0xffffffff && eocd >= 20 && tail.getUint32(eocd - 20, true) === 0x07064b50) {
    const z64Off = Number(tail.getBigUint64(eocd - 20 + 8, true));
    const z64 = new DataView(await blob.slice(z64Off, z64Off + 56).arrayBuffer());
    count = Number(z64.getBigUint64(32, true));
    cdSize = Number(z64.getBigUint64(40, true));
    cdOffset = Number(z64.getBigUint64(48, true));
  }
  const cd = new DataView(await blob.slice(cdOffset, cdOffset + cdSize).arrayBuffer());
  const dec = new TextDecoder();
  let p = 0;
  for (let n = 0; n < count && p + 46 <= cd.byteLength; n++) {
    if (cd.getUint32(p, true) !== 0x02014b50) break;
    const method = cd.getUint16(p + 10, true);
    let compSize = cd.getUint32(p + 20, true);
    const nameLen = cd.getUint16(p + 28, true);
    const extraLen = cd.getUint16(p + 30, true);
    const commentLen = cd.getUint16(p + 32, true);
    let localOff = cd.getUint32(p + 42, true);
    const name = dec.decode(new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen));
    // ZIP64 extra field
    if (compSize === 0xffffffff || localOff === 0xffffffff) {
      let e = p + 46 + nameLen;
      const end = e + extraLen;
      while (e + 4 <= end) {
        const id = cd.getUint16(e, true);
        const len = cd.getUint16(e + 2, true);
        if (id === 0x0001) {
          let q = e + 4;
          if (cd.getUint32(p + 24, true) === 0xffffffff) q += 8;
          if (compSize === 0xffffffff) {
            compSize = Number(cd.getBigUint64(q, true));
            q += 8;
          }
          if (localOff === 0xffffffff) localOff = Number(cd.getBigUint64(q, true));
        }
        e += 4 + len;
      }
    }
    p += 46 + nameLen + extraLen + commentLen;
    const path = normalizePath(name);
    if (name.endsWith('/') || !want(path)) continue;
    const lh = new DataView(await blob.slice(localOff, localOff + 30).arrayBuffer());
    const dataOff = localOff + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
    const raw = blob.slice(dataOff, dataOff + compSize);
    if (method === 0) out.set(path, new Uint8Array(await raw.arrayBuffer()));
    else if (method === 8) {
      const stream = raw.stream().pipeThrough(new DecompressionStream('deflate-raw'));
      out.set(path, new Uint8Array(await new Response(stream).arrayBuffer()));
    }
  }
  return out;
}

/** Lowercase, forward slashes, no leading folders before the known roots. */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/').toLowerCase();
}
