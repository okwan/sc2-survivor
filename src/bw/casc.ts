/**
 * Read-only CASC reader for a local StarCraft: Remastered install, running in the browser.
 * The player picks their StarCraft folder; we only read the slices of the archives we need.
 *
 * Chain: .build.info -> build config -> encoding (CKey -> EKey) + root (name -> CKey)
 *        -> local .idx files (EKey -> data.### offset) -> BLTE decode.
 * Format reference: CascLib by Ladislav Zezula and https://wowdev.wiki/CASC
 */

interface IdxEntry {
  archive: number;
  offset: number;
  size: number;
}

const hex = (b: Uint8Array) => Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
const unhex = (s: string) => new Uint8Array(s.match(/../g)!.map((x) => parseInt(x, 16)));

function relPath(f: File): string {
  return ((f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name).replace(/\\/g, '/');
}

export class CascStorage {
  private idx = new Map<string, IdxEntry>(); // first 9 bytes of EKey (hex) -> location
  private archives = new Map<number, File>();
  private encoding = new Map<string, string>(); // CKey hex -> EKey hex (only keys we asked for)
  root = new Map<string, string>(); // lowercase path -> CKey hex
  private encodingData: Uint8Array | null = null;

  private constructor(private files: File[]) {}

  /** `files` is the folder selection (webkitdirectory) of the StarCraft install folder. */
  static async open(files: File[]): Promise<CascStorage> {
    const s = new CascStorage(files);
    await s.init();
    return s;
  }

  private async init() {
    const files = this.files;
    // data archives and index files live in Data/data/
    const idxByBucket = new Map<number, { ver: number; file: File }>();
    for (const f of files) {
      const p = relPath(f).toLowerCase();
      const name = p.split('/').pop()!;
      let m = /^([0-9a-f]{2})([0-9a-f]{8})\.idx$/.exec(name);
      if (m && p.includes('data/')) {
        const bucket = parseInt(m[1], 16);
        const ver = parseInt(m[2], 16);
        const cur = idxByBucket.get(bucket);
        if (!cur || ver > cur.ver) idxByBucket.set(bucket, { ver, file: f });
        continue;
      }
      m = /^data\.(\d{3})$/.exec(name);
      if (m) this.archives.set(parseInt(m[1], 10), f);
    }
    if (!idxByBucket.size || !this.archives.size) {
      throw new Error('This does not look like a StarCraft install folder (no Data/data/*.idx or data.### files). Pick the folder that contains "Data" and ".build.info".');
    }
    for (const { file } of idxByBucket.values()) this.parseIdx(new Uint8Array(await file.arrayBuffer()));

    const cfg = await this.findBuildConfig();
    const encLine = /^encoding\s*=\s*([0-9a-f]{32})\s+([0-9a-f]{32})/m.exec(cfg);
    const rootLine = /^root\s*=\s*([0-9a-f]{32})/m.exec(cfg);
    if (!encLine || !rootLine) throw new Error('Build configuration is missing the encoding or root entry.');
    this.encodingData = await this.readByEKey(encLine[2]);
    const rootEKey = this.lookupCKeys([rootLine[1]]).get(rootLine[1]);
    if (!rootEKey) throw new Error('Root file not found in the encoding table.');
    const rootText = new TextDecoder().decode(await this.readByEKey(rootEKey));
    for (const line of rootText.split(/\r?\n/)) {
      const parts = line.split('|');
      if (parts.length >= 2 && /^[0-9a-f]{32}$/i.test(parts[1])) this.root.set(parts[0].replace(/\\/g, '/').toLowerCase(), parts[1].toLowerCase());
    }
    if (!this.root.size) throw new Error('Root file has no entries. This StarCraft version may use a different layout.');
  }

  private async findBuildConfig(): Promise<string> {
    const info = this.files.find((f) => relPath(f).split('/').pop() === '.build.info');
    let key: string | null = null;
    if (info) {
      const lines = (await info.text()).split(/\r?\n/).filter((l) => l.trim());
      const head = lines[0].split('|').map((h) => h.split('!')[0].toLowerCase());
      const kCol = head.indexOf('build key');
      const aCol = head.indexOf('active');
      const rows = lines.slice(1).map((l) => l.split('|'));
      const row = rows.find((r) => aCol < 0 || r[aCol] === '1') ?? rows[0];
      if (row && kCol >= 0) key = row[kCol].toLowerCase();
    }
    const configs = this.files.filter((f) => /\/config\/[0-9a-f]{2}\/[0-9a-f]{2}\/[0-9a-f]{32}$/i.test(relPath(f)));
    if (key) {
      const f = configs.find((c) => relPath(c).toLowerCase().endsWith('/' + key));
      if (f) return f.text();
    }
    // no .build.info (e.g. only the Data folder was picked): newest file that looks like a build config
    configs.sort((a, b) => b.lastModified - a.lastModified);
    for (const f of configs) {
      if (f.size > 64 * 1024) continue;
      const t = await f.text();
      if (/^root\s*=/m.test(t) && /^encoding\s*=/m.test(t)) return t;
    }
    throw new Error('Could not find the build configuration (Data/config). Pick the StarCraft folder itself.');
  }

  private parseIdx(b: Uint8Array) {
    const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
    const headerSize = v.getUint32(0, true);
    // v2 header: guarded block (8) + 16-byte header, then padding to 0x20
    const h = 8;
    if (v.getUint16(h, true) !== 7) return;
    const sizeBytes = b[h + 4];
    const offBytes = b[h + 5];
    const keyBytes = b[h + 6];
    const segBits = b[h + 7];
    const entryLen = sizeBytes + offBytes + keyBytes;
    let p = (8 + headerSize + 0x0f) & ~0x0f;
    const blockSize = v.getUint32(p, true);
    p += 8;
    const end = Math.min(b.length, p + blockSize);
    const segMask = 2 ** segBits;
    for (; p + entryLen <= end; p += entryLen) {
      const key = hex(b.subarray(p, p + keyBytes));
      let raw = 0;
      for (let i = 0; i < offBytes; i++) raw = raw * 256 + b[p + keyBytes + i];
      const archive = Math.floor(raw / segMask);
      const offset = raw % segMask;
      const size = v.getUint32(p + keyBytes + offBytes, true);
      if (!this.idx.has(key)) this.idx.set(key, { archive, offset, size });
    }
  }

  /** Resolves content keys to encoded keys by scanning the encoding table. */
  private lookupCKeys(ckeys: string[]): Map<string, string> {
    const want = new Set(ckeys.filter((c) => !this.encoding.has(c)));
    if (want.size && this.encodingData) {
      const b = this.encodingData;
      const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
      if (b[0] !== 0x45 || b[1] !== 0x4e) throw new Error('Bad encoding file');
      const ckLen = b[3];
      const ekLen = b[4];
      const pageSize = v.getUint16(5) * 1024;
      const pageCount = v.getUint32(9);
      const especSize = v.getUint32(18);
      let p = 22 + especSize + pageCount * 32;
      for (let page = 0; page < pageCount && want.size; page++, p += pageSize) {
        let q = p;
        const end = p + pageSize;
        while (q + 6 + ckLen <= end) {
          const n = b[q];
          if (n === 0) break;
          const ck = hex(b.subarray(q + 6, q + 6 + ckLen));
          if (want.has(ck)) {
            this.encoding.set(ck, hex(b.subarray(q + 6 + ckLen, q + 6 + ckLen + ekLen)));
            want.delete(ck);
          }
          q += 6 + ckLen + n * ekLen;
        }
      }
    }
    return new Map(ckeys.filter((c) => this.encoding.has(c)).map((c) => [c, this.encoding.get(c)!]));
  }

  private async readByEKey(ekey: string): Promise<Uint8Array> {
    const loc = this.idx.get(ekey.slice(0, 18));
    if (!loc) throw new Error(`Encoded key ${ekey} not in the local index`);
    const f = this.archives.get(loc.archive);
    if (!f) throw new Error(`Missing archive data.${String(loc.archive).padStart(3, '0')}`);
    const raw = new Uint8Array(await f.slice(loc.offset, loc.offset + loc.size + 0x1e).arrayBuffer());
    // 0x1E-byte local header precedes the BLTE block
    let start = 0x1e;
    if (!(raw[start] === 0x42 && raw[start + 1] === 0x4c && raw[start + 2] === 0x54 && raw[start + 3] === 0x45)) {
      start = raw.findIndex((_, i) => raw[i] === 0x42 && raw[i + 1] === 0x4c && raw[i + 2] === 0x54 && raw[i + 3] === 0x45);
      if (start < 0) throw new Error('BLTE signature not found');
    }
    // the local header records the BLTE length; use it to drop trailing bytes
    const blteLen = start === 0x1e ? new DataView(raw.buffer, raw.byteOffset).getUint32(0x10, true) : 0;
    const end = blteLen > 8 && start + blteLen <= raw.length ? start + blteLen : raw.length;
    return decodeBlte(raw.subarray(start, end));
  }

  /** Reads files by path; returns those found. Paths are matched case-insensitively by suffix. */
  async readFiles(paths: string[]): Promise<Map<string, Uint8Array>> {
    const found = new Map<string, string>(); // wanted path -> ckey
    for (const want of paths) {
      let best: string | null = null;
      for (const name of this.root.keys()) {
        if (name === want || name.endsWith('/' + want)) {
          if (!best || name.length < best.length) best = name;
        }
      }
      if (best) found.set(want, this.root.get(best)!);
    }
    const ek = this.lookupCKeys([...new Set(found.values())]);
    const out = new Map<string, Uint8Array>();
    for (const [want, ck] of found) {
      const e = ek.get(ck);
      if (!e) continue;
      try {
        out.set(want, await this.readByEKey(e));
      } catch {
        /* skip unreadable file */
      }
    }
    return out;
  }
}

export async function inflate(data: Uint8Array, raw = false): Promise<Uint8Array> {
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(new DecompressionStream(raw ? 'deflate-raw' : 'deflate'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Decodes a BLTE container (N = plain, Z = zlib, F = nested). */
export async function decodeBlte(b: Uint8Array): Promise<Uint8Array> {
  const v = new DataView(b.buffer, b.byteOffset, b.byteLength);
  if (v.getUint32(0) !== 0x424c5445) throw new Error('Not BLTE');
  const headerSize = v.getUint32(4);
  const chunks: [number, number][] = []; // encoded sizes, content sizes
  let p: number;
  if (headerSize === 0) {
    chunks.push([b.length - 8, -1]);
    p = 8;
  } else {
    const count = (b[9] << 16) | (b[10] << 8) | b[11];
    for (let i = 0; i < count; i++) {
      const o = 12 + i * 24;
      chunks.push([v.getUint32(o), v.getUint32(o + 4)]);
    }
    p = headerSize;
  }
  const parts: Uint8Array[] = [];
  for (const [enc] of chunks) {
    const chunk = b.subarray(p, p + enc);
    p += enc;
    const mode = chunk[0];
    const body = chunk.subarray(1);
    if (mode === 0x4e) parts.push(body);
    else if (mode === 0x5a) parts.push(await inflate(body));
    else if (mode === 0x46) parts.push(await decodeBlte(body));
    else throw new Error(`Unsupported BLTE chunk mode ${String.fromCharCode(mode)}`);
  }
  const total = parts.reduce((a, x) => a + x.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const x of parts) {
    out.set(x, o);
    o += x.length;
  }
  return out;
}

export { hex, unhex };
