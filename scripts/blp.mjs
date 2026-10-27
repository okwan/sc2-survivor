// Decodes World of Warcraft BLP2 textures (palettized, DXT1/3/5 or raw BGRA) to RGBA, mip level 0.
// Also handles the BLP1 JPEG-less palettized variant well enough for interface art.

/** @returns {{ width: number, height: number, data: Uint8Array }} */
export function decodeBlp(buf) {
  const b = Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength);
  const magic = b.toString('ascii', 0, 4);
  if (magic !== 'BLP2') throw new Error(`not BLP2 (${magic})`);
  const compression = b[8];
  const alphaDepth = b[9];
  const alphaType = b[10];
  const width = b.readUInt32LE(12);
  const height = b.readUInt32LE(16);
  const off = b.readUInt32LE(20);
  const size = b.readUInt32LE(20 + 64);
  const src = b.subarray(off, off + size);
  const out = new Uint8Array(width * height * 4);
  if (compression === 1) {
    const pal = b.subarray(148, 148 + 1024);
    const n = width * height;
    for (let i = 0; i < n; i++) {
      const c = src[i] * 4;
      out[i * 4] = pal[c + 2];
      out[i * 4 + 1] = pal[c + 1];
      out[i * 4 + 2] = pal[c];
      out[i * 4 + 3] = 255;
    }
    const a = src.subarray(n);
    if (alphaDepth === 1) for (let i = 0; i < n; i++) out[i * 4 + 3] = (a[i >> 3] >> (i & 7)) & 1 ? 255 : 0;
    else if (alphaDepth === 4) for (let i = 0; i < n; i++) out[i * 4 + 3] = ((a[i >> 1] >> ((i & 1) * 4)) & 15) * 17;
    else if (alphaDepth === 8) for (let i = 0; i < n; i++) out[i * 4 + 3] = a[i];
  } else if (compression === 2) {
    const kind = alphaDepth <= 1 ? 1 : alphaType === 7 ? 5 : 3;
    decodeDxt(src, width, height, kind, out);
  } else if (compression === 3) {
    for (let i = 0; i < width * height; i++) {
      out[i * 4] = src[i * 4 + 2];
      out[i * 4 + 1] = src[i * 4 + 1];
      out[i * 4 + 2] = src[i * 4];
      out[i * 4 + 3] = src[i * 4 + 3];
    }
  } else throw new Error(`unknown BLP2 compression ${compression}`);
  return { width, height, data: out };
}

function rgb565(v, o, i) {
  const r = (v >> 11) & 31;
  const g = (v >> 5) & 63;
  const b = v & 31;
  o[i] = (r << 3) | (r >> 2);
  o[i + 1] = (g << 2) | (g >> 4);
  o[i + 2] = (b << 3) | (b >> 2);
}

function decodeDxt(src, w, h, kind, out) {
  const blockBytes = kind === 1 ? 8 : 16;
  const bw = Math.max(1, (w + 3) >> 2);
  const bh = Math.max(1, (h + 3) >> 2);
  const col = new Uint8Array(16);
  const alpha = new Uint8Array(16);
  let p = 0;
  for (let by = 0; by < bh; by++) {
    for (let bx = 0; bx < bw; bx++, p += blockBytes) {
      if (p + blockBytes > src.length) return;
      let c = p;
      alpha.fill(255);
      if (kind === 3) {
        for (let i = 0; i < 16; i++) alpha[i] = ((src[p + (i >> 1)] >> ((i & 1) * 4)) & 15) * 17;
        c = p + 8;
      } else if (kind === 5) {
        const a0 = src[p];
        const a1 = src[p + 1];
        const pal = [a0, a1];
        if (a0 > a1) for (let i = 1; i < 7; i++) pal.push(((7 - i) * a0 + i * a1) / 7 | 0);
        else {
          for (let i = 1; i < 5; i++) pal.push(((5 - i) * a0 + i * a1) / 5 | 0);
          pal.push(0, 255);
        }
        // 48 bits of 3-bit indices
        let bits = 0n;
        for (let i = 0; i < 6; i++) bits |= BigInt(src[p + 2 + i]) << BigInt(8 * i);
        for (let i = 0; i < 16; i++) alpha[i] = pal[Number((bits >> BigInt(3 * i)) & 7n)];
        c = p + 8;
      }
      const c0 = src[c] | (src[c + 1] << 8);
      const c1 = src[c + 2] | (src[c + 3] << 8);
      rgb565(c0, col, 0);
      rgb565(c1, col, 4);
      col[3] = col[7] = 255;
      if (c0 > c1 || kind !== 1) {
        for (let k = 0; k < 3; k++) {
          col[8 + k] = (2 * col[k] + col[4 + k]) / 3 | 0;
          col[12 + k] = (col[k] + 2 * col[4 + k]) / 3 | 0;
        }
        col[11] = col[15] = 255;
      } else {
        for (let k = 0; k < 3; k++) {
          col[8 + k] = (col[k] + col[4 + k]) >> 1;
          col[12 + k] = 0;
        }
        col[11] = 255;
        col[15] = 0;
      }
      const idx = src[c + 4] | (src[c + 5] << 8) | (src[c + 6] << 16) | (src[c + 7] << 24);
      for (let i = 0; i < 16; i++) {
        const x = bx * 4 + (i & 3);
        const y = by * 4 + (i >> 2);
        if (x >= w || y >= h) continue;
        const ci = ((idx >>> (2 * i)) & 3) * 4;
        const o = (y * w + x) * 4;
        out[o] = col[ci];
        out[o + 1] = col[ci + 1];
        out[o + 2] = col[ci + 2];
        out[o + 3] = kind === 1 ? col[ci + 3] : alpha[i];
      }
    }
  }
}
