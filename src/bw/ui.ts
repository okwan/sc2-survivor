import { bwFile, bwPalette } from './assets';
import { decodePcx } from './formats';
import { drawGrpFrame, parseGrp, type GrpFile } from './grp';
import { BW_UI, ICONS, RACE_UI, SPELL_ICONS } from './ui-files';
import { WC3_SPELL_ICONS } from '../wc3/assets';
import { wc3IconUrl } from '../wc3/sprites';
import { wowIcon } from '../wow/icons';
import { hasWow } from '../wow/ui';

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

/**
 * One piece of a race's dialog art (dlgs\<race>.grp). Unlike unit GRPs these frames are stored
 * uncompressed: w*h palette indices at the frame offset, 0 transparent.
 */
function dialogUrl(race: string, frame: number): string | null {
  return cached(`dlg:${race}#${frame}`, () => {
    const buf = bwFile(BW_UI.dialog[race] ?? '');
    const pal = bwPalette();
    if (!buf || !pal) return null;
    const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    if (frame >= v.getUint16(0, true)) return null;
    const h = 6 + frame * 8;
    const w = v.getUint8(h + 2);
    const ht = v.getUint8(h + 3);
    const off = v.getUint32(h + 4, true);
    if (off + w * ht > buf.length) return null;
    const cv = canvas(w, ht);
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(w, ht);
    for (let i = 0; i < w * ht; i++) {
      const c = buf[off + i];
      if (c) img.data.set([pal[c * 4], pal[c * 4 + 1], pal[c * 4 + 2], 255], i * 4);
    }
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL();
  });
}

/** The 3x3 box StarCraft draws tooltips and text boxes with (dlgs\tile.grp, 8x8 pieces), as one 24x24 image. */
function boxUrl(): string | null {
  return cached('dlgbox', () => {
    const buf = bwFile(BW_UI.dialogTile);
    const g = buf ? parseGrp(buf) : null;
    const pal = bwPalette();
    if (!g || !pal || g.frames < 9) return null;
    const cv = canvas(24, 24);
    const ctx = cv.getContext('2d')!;
    const img = ctx.createImageData(24, 24);
    for (let i = 0; i < 9; i++) drawGrpFrame(g, i, pal, img.data, 24, (i % 3) * 8, Math.floor(i / 3) * 8);
    ctx.putImageData(img, 0, 0);
    return cv.toDataURL();
  });
}

/** Frames of a race's dialog GRP used for buttons: dull, normal, lit (hazard stripes). */
const BUTTON = { off: 0, on: 1, hover: 2 };

/**
 * Puts the cursor, menu backdrop and dialog art on the page (CSS variables used by style.css).
 * Buttons take the metal plates of `race`'s dialogs, like the in-game menus do.
 */
export function applyBwChrome(race = 'terran') {
  const root = document.documentElement;
  if (hasWow()) {
    // the WoW interface replaces all of it
    root.classList.remove('bw-box', 'bw-btn', 'bw-cursor', 'bw-menu');
    return;
  }
  const cur = cursorCss();
  const bg = menuBgUrl();
  const box = boxUrl();
  const btn = Object.fromEntries(Object.entries(BUTTON).map(([k, f]) => [k, dialogUrl(race, f)]));
  root.classList.toggle('bw-box', !!box);
  if (box) root.style.setProperty('--bw-box', `url(${box})`);
  const hasBtn = !!(btn.off && btn.on && btn.hover);
  root.classList.toggle('bw-btn', hasBtn);
  if (hasBtn) for (const [k, u] of Object.entries(btn)) root.style.setProperty(`--bw-btn-${k}`, `url(${u})`);
  root.classList.toggle('bw-cursor', !!cur);
  if (cur) root.style.setProperty('--bw-cursor', cur);
  else root.style.removeProperty('--bw-cursor');
  root.classList.toggle('bw-menu', !!bg);
  if (bg) root.style.setProperty('--bw-menu-bg', `url(${bg})`);
  else root.style.removeProperty('--bw-menu-bg');
}

/** HTML for a spell's icon: its Warcraft III icon, else the WoW icon, else the Brood War command icon, else its emoji. */
export function spellIcon(id: string, emoji: string): string {
  const wc3 = wc3IconUrl(WC3_SPELL_ICONS[id]);
  return wc3 ? `<img class="bwic wc3ic" src="${wc3}" alt="">` : wowIconHtml(id) ?? frameIcon(SPELL_ICONS[id], emoji);
}

/** HTML for a passive, perk, talent tree or other icon by game id (see ICONS), or its emoji. */
export function bwIcon(id: string, emoji: string): string {
  return wowIconHtml(id) ?? frameIcon(ICONS[id], emoji);
}

function wowIconHtml(id: string): string | null {
  const u = wowIcon(id);
  return u ? `<img class="wowic" src="${u}" alt="">` : null;
}

/** HTML for a command card frame, or the fallback. */
export function frameIcon(frame: number | undefined, fallback: string): string {
  const u = frame !== undefined ? iconUrl(frame) : null;
  return u ? `<img class="bwic" src="${u}" alt="">` : fallback;
}

/** HTML for a race's dash icon. */
export function dashIcon(race: string): string {
  return wowIconHtml(`dash_${race}`) ?? frameIcon(RACE_UI[race]?.dash, '💨');
}

/** URL of a spell's icon for the WoW action bar: its Warcraft III icon, else its WoW icon. */
export function spellIconUrl(id: string): string | null {
  return wc3IconUrl(WC3_SPELL_ICONS[id]) ?? wowIcon(id);
}
