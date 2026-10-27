import { bwTerrain } from '../bw/assets';
import type { Game } from '../game/game';

const RADAR = 4800; // world pixels across the minimap

/**
 * The minimap: the world has no edge, so it is a radar around the camera showing the ground,
 * caches, lairs, enemies, bosses, the player and the camera's view.
 */
export class Radar {
  canvas = document.createElement('canvas');
  private mmCtx: CanvasRenderingContext2D;
  private mmBg: { img: CanvasImageSource; w: number; h: number; dim: number } | null | undefined = undefined;

  constructor(
    private game: Game,
    private size: number,
  ) {
    this.canvas.width = this.canvas.height = size;
    this.mmCtx = this.canvas.getContext('2d')!;
  }

  /** Minimap pixels per world pixel: the world has no edge, so the minimap is a radar around the camera. */
  private mmScale() {
    return this.size / RADAR;
  }

  private mmX(x: number) {
    return (x - this.game.camX) * this.mmScale() + this.size / 2;
  }

  private mmY(y: number) {
    return (y - this.game.camY) * this.mmScale() + this.size / 2;
  }

  /** The ground's minimap image and the world size it repeats over. */
  private minimapSource(): { img: CanvasImageSource; w: number; h: number; dim: number } | null {
    if (this.mmBg !== undefined) return this.mmBg;
    const g = this.game;
    const mg = g.mapGround;
    const tex = mg ? null : bwTerrain(g.zone.id);
    const src = tex?.source.resource as CanvasImageSource | undefined;
    // the real map, one pixel per tile like the console's; otherwise the zone's ground pattern, darkened
    this.mmBg = mg ? { img: mg.minimap(), w: g.periodW, h: g.periodH, dim: 0 } : src && tex ? { img: src, w: tex.width, h: tex.height, dim: 0.25 } : null;
    return this.mmBg;
  }

  private drawBackground(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.size, this.size);
    const bg = this.minimapSource();
    if (!bg) return;
    const k = this.mmScale();
    const sw = bg.w * k;
    const sh = bg.h * k;
    const g = this.game;
    const mx = g.mapGround ? -g.mapOx : 0;
    const my = g.mapGround ? -g.mapOy : 0;
    const x0 = this.mmX(mx) - Math.ceil(this.mmX(mx) / sw) * sw;
    const y0 = this.mmY(my) - Math.ceil(this.mmY(my) / sh) * sh;
    ctx.imageSmoothingEnabled = !g.mapGround;
    for (let y = y0; y < this.size; y += sh) for (let x = x0; x < this.size; x += sw) ctx.drawImage(bg.img, Math.round(x), Math.round(y), Math.ceil(sw), Math.ceil(sh));
    if (bg.dim) {
      ctx.fillStyle = `rgba(0,0,0,${bg.dim})`;
      ctx.fillRect(0, 0, this.size, this.size);
    }
  }

  draw() {
    const g = this.game;
    const ctx = this.mmCtx;
    const k = this.mmScale();
    const mx = (x: number) => this.mmX(x);
    const my = (y: number) => this.mmY(y);
    this.drawBackground(ctx);
    ctx.fillStyle = '#ffd34d';
    for (const c of g.caches) if (!c.opened) ctx.fillRect(mx(c.x) - 1, my(c.y) - 1, 3, 3);
    ctx.fillStyle = '#ff9a3c';
    for (const l of g.lairs) if (!l.cleared) ctx.fillRect(mx(l.x) - 2, my(l.y) - 2, 4, 4);
    ctx.fillStyle = '#e02020';
    for (let i = 0; i < g.enemyCount; i++) {
      const e = g.enemies[i];
      ctx.fillRect(mx(e.x), my(e.y), 1.5, 1.5);
    }
    ctx.fillStyle = '#ff40ff';
    for (const b of g.bosses) ctx.fillRect(mx(b.x) - 2.5, my(b.y) - 2.5, 5, 5);
    const p = g.player;
    ctx.fillStyle = '#4fff6a';
    ctx.fillRect(mx(p.x) - 1.5, my(p.y) - 1.5, 3, 3);
    // the camera's view, like the white box on the real minimap
    const hw = (window.innerWidth / 2 / g.zoom) * k;
    const hh = (window.innerHeight / 2 / g.zoom) * k;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(mx(g.camX) - hw) + 0.5, Math.round(my(g.camY) - hh) + 0.5, Math.round(hw * 2), Math.round(hh * 2));
  }

}
