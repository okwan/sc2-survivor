import { Rectangle, Texture } from 'pixi.js';
import { WC3_ANIMS, WC3_HEROES, type Wc3Anim } from './assets';

/** A Warcraft III hero pre-rendered at deploy time (wc3/hero/<id>-<anim>.png, see scripts/render-wc3.mjs). */
export interface Wc3Sprite {
  dirs: number;
  cell: number;
  /** frames[anim][frame][dir] */
  frames: Partial<Record<Wc3Anim, Texture[][]>>;
  ms: Partial<Record<Wc3Anim, number>>;
}

interface Manifest {
  files: string[];
  heroes: Record<string, { dirs: number; anims: Partial<Record<Wc3Anim, { frames: number; ms: number; cell: number }>> }>;
}

let manifest: Manifest | null = null;
const loaded = new Map<string, Wc3Sprite>();
const loading = new Map<string, Promise<Wc3Sprite | null>>();

/** Reads wc3/manifest.json if the site ships Warcraft III art. */
export async function initWc3(): Promise<void> {
  try {
    const res = await fetch('wc3/manifest.json');
    if (res.ok) manifest = await res.json();
  } catch {
    /* no WC3 art (e.g. the single-file preview): heroes keep their Brood War sprites */
  }
}

/** URL of a WC3 command-card icon (BTN*.png) if the site ships it. */
export function wc3IconUrl(blpPath: string | undefined): string | null {
  if (!blpPath || !manifest) return null;
  const name = `icons/${blpPath.split('/').pop()!.replace(/\.blp$/i, '.png')}`;
  return manifest.files.includes(name) ? `wc3/${name}` : null;
}

/** URL of a WC3 sound (path as in src/wc3/sounds.ts) if the site ships it. */
export function wc3SoundUrl(path: string): string | null {
  return manifest?.files.includes(`sound/${path}`) ? `wc3/sound/${path}` : null;
}

export function wc3HeroIconUrl(art: string | undefined): string | null {
  return art ? wc3IconUrl(WC3_HEROES[art]?.icon) : null;
}

export function wc3Hero(art: string | undefined): Wc3Sprite | null {
  return (art && loaded.get(art)) || null;
}

/** Fetches and slices a hero's sprite sheets. */
export function loadWc3Hero(art: string | undefined): Promise<Wc3Sprite | null> {
  if (!art || !manifest?.heroes[art]) return Promise.resolve(null);
  const have = loaded.get(art);
  if (have) return Promise.resolve(have);
  let p = loading.get(art);
  if (!p) {
    const info = manifest.heroes[art];
    p = (async () => {
      const spr: Wc3Sprite = { dirs: info.dirs, cell: 0, frames: {}, ms: {} };
      await Promise.all(
        WC3_ANIMS.filter((a) => info.anims[a]).map(async (a) => {
          const { frames, ms, cell } = info.anims[a]!;
          const img = new Image();
          img.src = `wc3/hero/${art}-${a}.png`;
          await img.decode();
          const base = Texture.from(img);
          base.source.scaleMode = 'linear';
          spr.cell = cell;
          spr.ms[a] = ms;
          spr.frames[a] = Array.from({ length: frames }, (_, f) =>
            Array.from({ length: info.dirs }, (_, d) => new Texture({ source: base.source, frame: new Rectangle(d * cell, f * cell, cell, cell) })),
          );
        }),
      );
      if (!spr.frames.stand && !spr.frames.walk) return null;
      loaded.set(art, spr);
      return spr;
    })().catch(() => null);
    loading.set(art, p);
  }
  return p;
}

/** The frame for an animation at a time, facing an angle (0 = east, radians, y down). */
export function wc3Frame(spr: Wc3Sprite, anim: Wc3Anim, seconds: number, angle: number, loop = true): Texture {
  const set = spr.frames[anim] ?? spr.frames.stand ?? spr.frames.walk!;
  const ms = spr.ms[anim] ?? 1000;
  let f = Math.floor(((seconds * 1000) / ms) * set.length);
  f = loop ? f % set.length : Math.min(f, set.length - 1);
  // sheets go clockwise from facing up the screen
  let d = Math.round(((angle + Math.PI / 2) / (Math.PI * 2)) * spr.dirs);
  d = ((d % spr.dirs) + spr.dirs) % spr.dirs;
  return set[f][d];
}

/** How long an animation lasts, in seconds. */
export function wc3AnimLength(spr: Wc3Sprite, anim: Wc3Anim): number {
  return (spr.ms[anim] ?? 0) / 1000;
}
