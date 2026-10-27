import { Rectangle, Texture } from 'pixi.js';

/**
 * A small font atlas for floating combat text. Each glyph is a sub-texture of one canvas, so
 * swapping digits on a pooled Sprite never breaks a batch or forces Pixi to rebuild the scene
 * (changing a BitmapText's text does both).
 */
const CHARS = '0123456789+-!.KMABCDEFGHIJLNOPQRSTUVWXYZ';
const SIZE = 32;
const PAD = 4;

export interface Glyph {
  tex: Texture;
  w: number; // advance in atlas pixels
}

let glyphs: Map<string, Glyph> | null = null;

export const GLYPH_H = SIZE + PAD * 2;

export function glyph(ch: string): Glyph | undefined {
  if (!glyphs) build();
  return glyphs!.get(ch);
}

function build() {
  glyphs = new Map();
  const cell = SIZE + PAD * 2;
  const cols = 16;
  const rows = Math.ceil(CHARS.length / cols);
  const cv = document.createElement('canvas');
  cv.width = cols * cell;
  cv.height = rows * cell;
  const c = cv.getContext('2d')!;
  c.font = `bold ${SIZE}px "Arial Black", Arial, sans-serif`;
  c.textBaseline = 'middle';
  c.textAlign = 'left';
  c.lineJoin = 'round';
  c.lineWidth = 6;
  c.strokeStyle = 'black';
  c.fillStyle = 'white';
  const widths: number[] = [];
  for (let i = 0; i < CHARS.length; i++) {
    const ch = CHARS[i];
    const x = (i % cols) * cell + PAD;
    const y = Math.floor(i / cols) * cell + cell / 2;
    c.strokeText(ch, x, y);
    c.fillText(ch, x, y);
    widths.push(Math.min(cell, Math.ceil(c.measureText(ch).width) + PAD * 2));
  }
  const base = Texture.from(cv);
  base.source.scaleMode = 'linear';
  for (let i = 0; i < CHARS.length; i++) {
    const x = (i % cols) * cell;
    const y = Math.floor(i / cols) * cell;
    const tex = new Texture({ source: base.source, frame: new Rectangle(x, y, widths[i], cell) });
    glyphs.set(CHARS[i], { tex, w: widths[i] - PAD * 2 });
  }
}
