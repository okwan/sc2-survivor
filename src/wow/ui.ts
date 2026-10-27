/**
 * World of Warcraft 1.12 interface art for the DOM menus and HUD. scripts/fetch-wow.mjs converts the
 * client's Interface textures to PNG at deploy time and lists them in wow/manifest.json; nothing
 * from Blizzard is in the repo. Without the manifest every helper returns null and the game keeps
 * its StarCraft interface.
 *
 * Paths are the client's own, lowercased, with .png for textures: 'interface/buttons/ui-quickslot2.png'.
 */

interface Manifest {
  files: string[];
  sizes: Record<string, [number, number]>;
  icons: string[];
  fonts: string[];
  sounds: string[];
}

let man: Manifest | null = null;
let iconSet = new Set<string>();

/** Loads the manifest (once). Resolves false when the WoW files aren't deployed. */
export async function initWow(): Promise<boolean> {
  if (man) return true;
  if (new URLSearchParams(location.search).has('nowow')) return false;
  try {
    const r = await fetch('wow/manifest.json');
    if (!r.ok) return false;
    man = (await r.json()) as Manifest;
    iconSet = new Set(man.icons);
  } catch {
    man = null;
  }
  return !!man;
}

export function hasWow(): boolean {
  return !!man;
}

/** Absolute URL: these end up in CSS variables, and a relative url() there would resolve against the stylesheet. */
function abs(rel: string): string {
  return new URL(rel, document.baseURI).href;
}

/** URL of an interface texture, or null when it isn't in the deployed set. */
export function wowFile(path: string): string | null {
  const p = path.toLowerCase();
  return man?.sizes[p] ? abs(`wow/${p}`) : null;
}

export function wowSize(path: string): [number, number] | null {
  return man?.sizes[path.toLowerCase()] ?? null;
}

/** URL of the first icon (Interface/Icons, name without extension) that exists. */
export function wowIconUrl(...names: string[]): string | null {
  for (const n of names) {
    const k = n.toLowerCase();
    if (iconSet.has(k)) return abs(`wow/interface/icons/${k}.png`);
  }
  return null;
}

/** URL of an interface sound (e.g. 'LevelUp' for Sound/Interface/LevelUp.wav), or null. */
export function wowSound(name: string): string | null {
  const p = `sound/interface/${name.toLowerCase()}.wav`;
  return man?.sounds.includes(p) ? abs(`wow/${p}`) : null;
}

// ------------------------------------------------------------ images

const images = new Map<string, Promise<HTMLImageElement | null>>();

function loadImage(path: string): Promise<HTMLImageElement | null> {
  const url = wowFile(path);
  if (!url) return Promise.resolve(null);
  let p = images.get(url);
  if (!p) {
    p = new Promise((res) => {
      const img = new Image();
      img.onload = () => res(img);
      img.onerror = () => res(null);
      img.src = url;
    });
    images.set(url, p);
  }
  return p;
}

function canvas(w: number, h: number) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return cv;
}

/** A region of a texture in texture coordinates (0..1), as a data URL; flipped when l > r. */
async function crop(path: string, l: number, r: number, t: number, b: number): Promise<string | null> {
  const img = await loadImage(path);
  if (!img) return null;
  const W = img.naturalWidth;
  const H = img.naturalHeight;
  const x0 = Math.min(l, r) * W;
  const w = Math.round(Math.abs(r - l) * W);
  const h = Math.round((b - t) * H);
  const cv = canvas(w, h);
  const ctx = cv.getContext('2d')!;
  if (l > r) {
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(img, x0, t * H, w, h, 0, 0, w, h);
  return cv.toDataURL();
}

/**
 * A backdrop edge file (8 square pieces side by side: left, right, top, bottom, then the four
 * corners) rebuilt as the 3x3 nine-slice CSS border-image wants. WoW stores the top and bottom
 * pieces turned on their side. `tint` multiplies the art like SetBackdropBorderColor does.
 */
async function nineSlice(path: string, tint?: [number, number, number]): Promise<{ url: string; size: number } | null> {
  const img = await loadImage(path);
  if (!img) return null;
  const s = img.naturalHeight;
  if (img.naturalWidth < s * 8) return null;
  const cv = canvas(s * 3, s * 3);
  const ctx = cv.getContext('2d')!;
  const piece = (i: number, x: number, y: number, rot = 0) => {
    ctx.save();
    ctx.translate(x + s / 2, y + s / 2);
    ctx.rotate(rot);
    ctx.drawImage(img, i * s, 0, s, s, -s / 2, -s / 2, s, s);
    ctx.restore();
  };
  piece(0, 0, s);
  piece(1, 2 * s, s);
  piece(2, s, 0, Math.PI / 2);
  piece(3, s, 2 * s, Math.PI / 2);
  piece(4, 0, 0);
  piece(5, 2 * s, 0);
  piece(6, 0, 2 * s);
  piece(7, 2 * s, 2 * s);
  if (tint) {
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgb(${tint.map((c) => Math.round(c * 255)).join(',')})`;
    ctx.fillRect(0, 0, s * 3, s * 3);
    ctx.globalCompositeOperation = 'destination-in';
    piece(0, 0, s);
    piece(1, 2 * s, s);
    piece(2, s, 0, Math.PI / 2);
    piece(3, s, 2 * s, Math.PI / 2);
    piece(4, 0, 0);
    piece(5, 2 * s, 0);
    piece(6, 0, 2 * s);
    piece(7, 2 * s, 2 * s);
  }
  return { url: cv.toDataURL(), size: s };
}

/** A cursor file as a CSS cursor value (hotspot at the fingertip, top left). */
async function cursor(path: string): Promise<string | null> {
  const img = await loadImage(path);
  if (!img) return null;
  // browsers cap cursors at 32x32 (128 in some); the 1.12 cursors are 32x32 already
  const cv = canvas(32, 32);
  cv.getContext('2d')!.drawImage(img, 0, 0, 32, 32);
  return `url(${cv.toDataURL()}) 1 1, auto`;
}

const MENU_SCREENS = ['loadscreenkalimdor', 'loadscreeneasternkingdom', 'loadscreenduskwood', 'loadscreenmoltencore', 'loadscreenblackwinglair', 'loadscreenonyxia'];

/** The art and fonts style.css reads under html.wow; resolves once everything is set. */
export async function applyWowChrome(): Promise<boolean> {
  if (!man) return false;
  const root = document.documentElement;
  const set = (k: string, v: string | null) => (v ? root.style.setProperty(k, v) : root.style.removeProperty(k));
  const url = (u: string | null) => (u ? `url(${u})` : null);
  await loadFonts();
  const [dialog, tooltip, gold] = await Promise.all([
    nineSlice('interface/dialogframe/ui-dialogbox-border.png'),
    nineSlice('interface/tooltips/ui-tooltip-border.png'),
    nineSlice('interface/tooltips/ui-tooltip-border.png', [1, 0.82, 0]),
  ]);
  if (dialog) {
    set('--wow-dialog', `url(${dialog.url})`);
    set('--wow-dialog-slice', `${dialog.size}`);
  }
  if (tooltip) {
    set('--wow-tip', `url(${tooltip.url})`);
    set('--wow-tip-slice', `${tooltip.size}`);
  }
  if (gold) set('--wow-tip-gold', `url(${gold.url})`);
  set('--wow-dialog-bg', url(wowFile('interface/dialogframe/ui-dialogbox-background.png')));
  // red panel buttons: the art fills 80x22 of a 128x32 texture
  const btn = await Promise.all(['up', 'down', 'highlight', 'disabled'].map((k) => crop(`interface/buttons/ui-panel-button-${k}.png`, 0, 0.625, 0, 0.6875)));
  ['up', 'down', 'hi', 'off'].forEach((k, i) => set(`--wow-btn-${k}`, url(btn[i])));
  set('--wow-statusbar', url(wowFile('interface/targetingframe/ui-statusbar.png')));
  set('--wow-slot', url(wowFile('interface/buttons/ui-quickslot2.png')));
  set('--wow-slot-hi', url(wowFile('interface/buttons/buttonhilight-square.png')));
  set('--wow-slot-down', url(wowFile('interface/buttons/ui-quickslot-depress.png')));
  set('--wow-slot-border', url(wowFile('interface/buttons/ui-actionbutton-border.png')));
  set('--wow-empty-slot', url(wowFile('interface/paperdoll/ui-backpack-emptyslot.png')));
  set('--wow-header', url(await crop('interface/dialogframe/ui-dialogbox-header.png', 0, 1, 0, 0.625)));
  set('--wow-cursor', await cursor('interface/cursor/point.png'));
  const screen = MENU_SCREENS.map((n) => wowFile(`interface/glues/loadingscreens/${n}.png`)).find(Boolean) ?? null;
  set('--wow-menu-bg', url(screen));
  root.classList.add('wow');
  root.classList.toggle('wow-dialog', !!dialog);
  root.classList.toggle('wow-tip', !!tooltip);
  root.classList.toggle('wow-btn', btn.every(Boolean));
  root.classList.toggle('wow-cursor', !!wowFile('interface/cursor/point.png'));
  return true;
}

/** Friz Quadrata for text, Morpheus for titles, Skurri for numbers, Arial Narrow for small print. */
async function loadFonts() {
  const faces: [string, string][] = [
    ['Friz Quadrata', 'fonts/frizqt__.ttf'],
    ['Morpheus', 'fonts/morpheus.ttf'],
    ['Skurri', 'fonts/skurri.ttf'],
    ['Arial Narrow WoW', 'fonts/arialn.ttf'],
  ];
  await Promise.all(
    faces.map(async ([family, file]) => {
      if (!man?.fonts.includes(file)) return;
      try {
        const f = new FontFace(family, `url(${abs(`wow/${file}`)})`);
        document.fonts.add(await f.load());
      } catch {
        // the fallback fonts in style.css take over
      }
    }),
  );
}

/** A portrait-sized texture region helper for the HUD frames, cached. */
const crops = new Map<string, Promise<string | null>>();
export function wowCrop(path: string, l: number, r: number, t: number, b: number): Promise<string | null> {
  const k = `${path}|${l}|${r}|${t}|${b}`;
  let p = crops.get(k);
  if (!p) {
    p = crop(path, l, r, t, b);
    crops.set(k, p);
  }
  return p;
}
