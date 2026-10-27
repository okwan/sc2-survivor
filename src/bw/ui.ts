import { bwFile, bwPalette } from './assets';
import { decodePcx } from './formats';
import { drawGrpFrame, parseGrp, type GrpFile } from './grp';
import { BW_UI, ICONS, SPELL_ICONS } from './ui-files';

/**
 * Brood War interface art for the DOM HUD and menus: the race consoles, command card icons,
 * unit wireframes, the green arrow cursor and the main menu backdrop. Everything comes back as
 * data URLs (cached), or null when the files aren't loaded so callers keep the plain UI.
 */

const urls = new Map<string, string | null>();
const grps = new Map<string, GrpFile | null>();

function cached(key: string, make: () => string | null): string | null {
  if (!urls.has(key)) {
    let v: string | null = null;
    try {
      v = make();
    } catch {
      v = null;
    }
    urls.set(key, v);
  }
  return urls.get(key)!;
}

function grp(path: string): GrpFile | null {
  if (!grps.has(path)) {
    const buf = bwFile(path);
    let g: GrpFile | null = null;
    try {
      g = buf ? parseGrp(buf) : null;
    } catch {
      g = null;
    }
    grps.set(path, g);
  }
  return grps.get(path)!;
}

function canvas(w: number, h: number) {
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  return cv;
}

/** Forgets every built image (call after the loaded files change). */
export function resetBwUi() {
  urls.clear();
  grps.clear();
}

/** True when the console art for this race is available. */
export function hasBwConsole(race: string): boolean {
  return !!bwFile(BW_UI.console[race] ?? '') && !!bwFile(BW_UI.icons) && !!bwPalette();
}

/** Height of the console strip we keep from the bottom of the 640x480 console image. */
export const CONSOLE_TOP = 290;
export const CONSOLE_H = 480 - CONSOLE_TOP;

/** The race console (bottom strip of the 640x480 overlay, palette index 0 transparent). */
export function consoleUrl(race: string): string | null {
  return cached(`console:${race}`, () => {
    const buf = bwFile(BW_UI.console[race] ?? '');
    if (!buf) return null;
    const img = decodePcx(buf, 0);
    const cv = canvas(img.width, CONSOLE_H);
    const ctx = cv.getContext('2d')!;
    const id = ctx.createImageData(img.width, CONSOLE_H);
    id.data.set(img.data.subarray(CONSOLE_TOP * img.width * 4, 480 * img.width * 4));
    ctx.putImageData(id, 0, 0);
    return cv.toDataURL();
  });
}

const TINTS = {
  on: [[40, 70, 8], [236, 255, 120]],
  hover: [[90, 90, 60], [255, 255, 255]],
  off: [[30, 30, 30], [130, 130, 130]],
  hp: [[10, 60, 10], [90, 255, 90]],
  hurt: [[70, 60, 0], [255, 230, 60]],
  dying: [[70, 10, 10], [255, 70, 50]],
} as const;
export type BwTint = keyof typeof TINTS;

/**
 * One frame of a monochrome GRP (command icons, wireframes) recoloured the way the game does it:
 * the art's brightness picks a shade between the dark and light colour of the tint.
 */
function tinted(path: string, frame: number, tint: BwTint): string | null {
  return cached(`${path}#${frame}:${tint}`, () => {
    const g = grp(path);
    const pal = bwPalette();
    if (!g || !pal || frame >= g.frames) return null;
    const cv = canvas(g.width, g.height);
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(g.width, g.height);
    drawGrpFrame(g, frame, pal, img.data, g.width, 0, 0);
    const d = img.data;
    let lo = 765;
    let hi = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const v = d[i] + d[i + 1] + d[i + 2];
      lo = Math.min(lo, v);
      hi = Math.max(hi, v);
    }
    const [a, b] = TINTS[tint];
    const span = Math.max(1, hi - lo);
    for (let i = 0; i < d.length; i += 4) {
      if (!d[i + 3]) continue;
      const t = 0.25 + 0.75 * ((d[i] + d[i + 1] + d[i + 2] - lo) / span);
      for (let c = 0; c < 3; c++) d[i + c] = a[c] + (b[c] - a[c]) * t;
    }
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL();
  });
}

/** A command card icon (36x34). */
export function iconUrl(frame: number, tint: BwTint = 'on'): string | null {
  return tinted(BW_UI.icons, frame, tint);
}

/** A unit wireframe (64x64), coloured by health like the status panel does. */
export function wireframeUrl(unitId: number, tint: BwTint): string | null {
  return tinted(BW_UI.wireframes, unitId, tint);
}

/** CSS cursor value for the green Brood War arrow, or null. */
export function cursorCss(): string | null {
  return cached('cursor', () => {
    const g = grp(BW_UI.cursor);
    const pal = bwPalette();
    if (!g || !pal) return null;
    const img = new ImageData(g.width, g.height);
    drawGrpFrame(g, 0, pal, img.data, g.width, 0, 0);
    // crop to the visible pixels; the hotspot is the centre of the full canvas
    let x0 = g.width;
    let y0 = g.height;
    let x1 = 0;
    let y1 = 0;
    for (let y = 0; y < g.height; y++)
      for (let x = 0; x < g.width; x++)
        if (img.data[(y * g.width + x) * 4 + 3]) {
          x0 = Math.min(x0, x);
          y0 = Math.min(y0, y);
          x1 = Math.max(x1, x);
          y1 = Math.max(y1, y);
        }
    if (x1 < x0) return null;
    const cx = g.width >> 1;
    const cy = g.height >> 1;
    x0 = Math.min(x0, cx);
    y0 = Math.min(y0, cy);
    const cv = canvas(x1 - x0 + 1, y1 - y0 + 1);
    const ctx = cv.getContext('2d')!;
    const tmp = canvas(g.width, g.height);
    tmp.getContext('2d')!.putImageData(img, 0, 0);
    ctx.drawImage(tmp, -x0, -y0);
    return `url(${cv.toDataURL()}) ${cx - x0} ${cy - y0}, auto`;
  });
}

/** The main menu backdrop (a planet in space), or null. */
export function menuBgUrl(): string | null {
  return cached('menubg', () => {
    const buf = bwFile(BW_UI.menuBg);
    if (!buf) return null;
    const img = decodePcx(buf);
    const cv = canvas(img.width, img.height);
    cv.getContext('2d')!.putImageData(new ImageData(new Uint8ClampedArray(img.data), img.width, img.height), 0, 0);
    return cv.toDataURL('image/jpeg', 0.9);
  });
}

/** Puts the cursor and menu backdrop on the page (CSS variables used by style.css). */
export function applyBwChrome() {
  const root = document.documentElement;
  const cur = cursorCss();
  const bg = menuBgUrl();
  root.classList.toggle('bw-cursor', !!cur);
  if (cur) root.style.setProperty('--bw-cursor', cur);
  else root.style.removeProperty('--bw-cursor');
  root.classList.toggle('bw-menu', !!bg);
  if (bg) root.style.setProperty('--bw-menu-bg', `url(${bg})`);
  else root.style.removeProperty('--bw-menu-bg');
}

/** HTML for a spell's icon: the Brood War command icon when loaded, otherwise its emoji. */
export function spellIcon(id: string, emoji: string): string {
  return frameIcon(SPELL_ICONS[id], emoji);
}

/** HTML for a passive, perk, talent tree or other icon by game id (see ICONS), or its emoji. */
export function bwIcon(id: string, emoji: string): string {
  return frameIcon(ICONS[id], emoji);
}

/** HTML for a command card frame, or the fallback. */
export function frameIcon(frame: number | undefined, fallback: string): string {
  const u = frame !== undefined ? iconUrl(frame) : null;
  return u ? `<img class="bwic" src="${u}" alt="">` : fallback;
}
