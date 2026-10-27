import { Graphics, Texture, type Renderer } from 'pixi.js';
import { SHAPE_INFO, type EnemyShape } from '../data/enemies';
import type { RaceId } from '../data/types';

/**
 * Procedural placeholder art. Every visual is generated at startup so the repo
 * ships no external assets. Units are drawn facing +x and rotated at runtime.
 */
let renderer: Renderer;
const cache = new Map<string, Texture>();

export function initTextures(r: Renderer) {
  renderer = r;
}

/** extent: draws an invisible circle so the texture is centered on the local origin. */
function bake(key: string, draw: (g: Graphics) => void, extent = 0): Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const g = new Graphics();
  if (extent > 0) g.circle(0, 0, extent).fill({ color: 0x000000, alpha: 0.001 });
  draw(g);
  const tex = renderer.generateTexture({ target: g, resolution: 2, antialias: true });
  g.destroy();
  cache.set(key, tex);
  return tex;
}

function canvasTex(key: string, w: number, h: number, draw: (c: CanvasRenderingContext2D) => void): Texture {
  const hit = cache.get(key);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  draw(cv.getContext('2d')!);
  const tex = Texture.from(cv);
  cache.set(key, tex);
  return tex;
}

function shade(c: number, f: number): number {
  const r = Math.min(255, Math.max(0, ((c >> 16) & 255) * f));
  const g = Math.min(255, Math.max(0, ((c >> 8) & 255) * f));
  const b = Math.min(255, Math.max(0, (c & 255) * f));
  return (r << 16) | (g << 8) | b;
}

// ------------------------------------------------------------ generic FX
export const fx = {
  soft: () =>
    canvasTex('soft', 128, 128, (c) => {
      const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.35, 'rgba(255,255,255,0.65)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, 128, 128);
    }),
  disc: () =>
    canvasTex('disc', 128, 128, (c) => {
      const gr = c.createRadialGradient(64, 64, 0, 64, 64, 64);
      gr.addColorStop(0, 'rgba(255,255,255,0.25)');
      gr.addColorStop(0.8, 'rgba(255,255,255,0.45)');
      gr.addColorStop(0.95, 'rgba(255,255,255,0.9)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr;
      c.beginPath();
      c.arc(64, 64, 64, 0, Math.PI * 2);
      c.fill();
    }),
  ring: () =>
    canvasTex('ring', 256, 256, (c) => {
      c.strokeStyle = 'white';
      c.lineWidth = 10;
      c.shadowColor = 'white';
      c.shadowBlur = 16;
      c.beginPath();
      c.arc(128, 128, 112, 0, Math.PI * 2);
      c.stroke();
    }),
  wedge: () =>
    canvasTex('wedge', 256, 256, (c) => {
      // cone pointing +x from the left-center, 70 degree spread
      const gr = c.createRadialGradient(0, 128, 0, 0, 128, 256);
      gr.addColorStop(0, 'rgba(255,255,255,0.95)');
      gr.addColorStop(0.7, 'rgba(255,255,255,0.55)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr;
      c.beginPath();
      c.moveTo(0, 128);
      c.arc(0, 128, 256, -0.61, 0.61);
      c.closePath();
      c.fill();
    }),
  arc: () =>
    canvasTex('arc', 256, 256, (c) => {
      // crescent slash pointing +x
      c.fillStyle = 'white';
      c.shadowColor = 'white';
      c.shadowBlur = 12;
      c.beginPath();
      c.arc(40, 128, 200, -1.0, 1.0);
      c.arc(10, 128, 190, 1.05, -1.05, true);
      c.closePath();
      c.fill();
    }),
  beam: () =>
    canvasTex('beam', 64, 32, (c) => {
      const gr = c.createLinearGradient(0, 0, 0, 32);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.3, 'rgba(255,255,255,0.7)');
      gr.addColorStop(0.5, 'rgba(255,255,255,1)');
      gr.addColorStop(0.7, 'rgba(255,255,255,0.7)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, 64, 32);
    }),
  spark: () =>
    canvasTex('spark', 32, 32, (c) => {
      const gr = c.createRadialGradient(16, 16, 0, 16, 16, 16);
      gr.addColorStop(0, 'rgba(255,255,255,1)');
      gr.addColorStop(0.4, 'rgba(255,255,255,0.8)');
      gr.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = gr;
      c.fillRect(0, 0, 32, 32);
    }),
  bolt: () =>
    canvasTex('bolt', 48, 16, (c) => {
      const gr = c.createLinearGradient(0, 0, 48, 0);
      gr.addColorStop(0, 'rgba(255,255,255,0)');
      gr.addColorStop(0.6, 'rgba(255,255,255,0.8)');
      gr.addColorStop(1, 'rgba(255,255,255,1)');
      c.fillStyle = gr;
      c.beginPath();
      c.ellipse(24, 8, 24, 6, 0, 0, Math.PI * 2);
      c.fill();
    }),
  shadow: () =>
    canvasTex('shadow', 64, 32, (c) => {
      const gr = c.createRadialGradient(32, 16, 0, 32, 16, 32);
      gr.addColorStop(0, 'rgba(0,0,0,0.45)');
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      c.fillStyle = gr;
      c.scale(1, 0.5);
      c.beginPath();
      c.arc(32, 32, 32, 0, Math.PI * 2);
      c.fill();
    }),
};

// ------------------------------------------------------------ ground
export function groundTexture(a: number, b: number, accent: number): Texture {
  return canvasTex(`ground:${a}:${b}`, 512, 512, (c) => {
    const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');
    c.fillStyle = hex(a);
    c.fillRect(0, 0, 512, 512);
    // deterministic noise blotches so the tile is seamless-ish
    let seed = 1337;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 220; i++) {
      const x = rnd() * 512;
      const y = rnd() * 512;
      const r = 6 + rnd() * 40;
      c.fillStyle = hex(rnd() > 0.5 ? b : shade(a, 1.12));
      c.globalAlpha = 0.18 + rnd() * 0.25;
      for (const ox of [-512, 0, 512])
        for (const oy of [-512, 0, 512]) {
          c.beginPath();
          c.ellipse(x + ox, y + oy, r, r * (0.5 + rnd() * 0.5), rnd() * 3, 0, Math.PI * 2);
          c.fill();
        }
    }
    c.globalAlpha = 0.5;
    for (let i = 0; i < 60; i++) {
      c.fillStyle = hex(shade(accent, 0.7 + rnd() * 0.4));
      c.fillRect(rnd() * 512, rnd() * 512, 2, 2);
    }
    // faint grid like an SC tileset
    c.globalAlpha = 0.06;
    c.strokeStyle = '#000';
    for (let i = 0; i <= 512; i += 64) {
      c.beginPath();
      c.moveTo(i, 0);
      c.lineTo(i, 512);
      c.moveTo(0, i);
      c.lineTo(512, i);
      c.stroke();
    }
    c.globalAlpha = 1;
  });
}

// ------------------------------------------------------------ units
export function heroTexture(race: RaceId): Texture {
  return bake(`hero:${race}`, (g) => {
    const r = 18;
    if (race === 'terran') {
      // power-armored marine: bulky shoulders, visor, rifle
      g.roundRect(-r * 0.2, r * 0.25, r * 1.6, r * 0.35, 3).fill(0x2a2f36);
      g.ellipse(0, 0, r * 0.85, r * 1.0).fill(0x2f63b0).stroke({ width: 2, color: 0x16325c });
      g.circle(-r * 0.15, -r * 0.75, r * 0.45).fill(0x3f7fd6).stroke({ width: 2, color: 0x16325c });
      g.circle(-r * 0.15, r * 0.75, r * 0.45).fill(0x3f7fd6).stroke({ width: 2, color: 0x16325c });
      g.circle(r * 0.15, 0, r * 0.45).fill(0x5c95e6);
      g.roundRect(r * 0.25, -r * 0.25, r * 0.35, r * 0.5, 3).fill(0xffd34d);
    } else if (race === 'zerg') {
      // hydralisk: serpentine body, hood, scythes
      g.ellipse(-r * 0.5, 0, r * 0.7, r * 0.45).fill(0x5a2a78);
      g.ellipse(r * 0.1, 0, r * 0.7, r * 0.6).fill(0x8a3fb0).stroke({ width: 2, color: 0x3a1450 });
      g.poly([r * 0.2, -r * 0.5, r * 0.9, -r * 1.05, r * 0.6, -r * 0.3]).fill(0xc6ff5c);
      g.poly([r * 0.2, r * 0.5, r * 0.9, r * 1.05, r * 0.6, r * 0.3]).fill(0xc6ff5c);
      g.ellipse(r * 0.55, 0, r * 0.45, r * 0.35).fill(0xa45ad0);
      g.circle(r * 0.8, -r * 0.15, 2.5).fill(0xffee55);
      g.circle(r * 0.8, r * 0.15, 2.5).fill(0xffee55);
    } else {
      // zealot: golden armor with glowing blades
      g.ellipse(0, 0, r * 0.75, r * 0.95).fill(0xc89a30).stroke({ width: 2, color: 0x6a4a10 });
      g.poly([-r * 0.4, -r * 0.9, r * 0.2, -r * 0.7, r * 0.1, -r * 0.3]).fill(0xe8c050);
      g.poly([-r * 0.4, r * 0.9, r * 0.2, r * 0.7, r * 0.1, r * 0.3]).fill(0xe8c050);
      g.circle(r * 0.2, 0, r * 0.38).fill(0x8a6a20);
      g.circle(r * 0.35, 0, r * 0.14).fill(0x4fd2ff);
      g.poly([r * 0.3, -r * 0.7, r * 1.4, -r * 0.55, r * 0.35, -r * 0.45]).fill({ color: 0x4fd2ff, alpha: 0.9 });
      g.poly([r * 0.3, r * 0.7, r * 1.4, r * 0.55, r * 0.35, r * 0.45]).fill({ color: 0x4fd2ff, alpha: 0.9 });
    }
  }, 28);
}

export function enemyTexture(shape: EnemyShape, color: number, radius: number): Texture {
  return bake(`enemy:${shape}:${color}:${radius}`, (g) => {
    const r = radius;
    const dark = shade(color, 0.55);
    const light = shade(color, 1.35);
    const line = { width: Math.max(1.5, r * 0.1), color: dark };
    switch (SHAPE_INFO[shape]?.drawAs ?? shape) {
      case 'ling':
      case 'broodling': {
        g.poly([-r, -r * 0.2, -r * 1.3, -r * 0.9, -r * 0.4, -r * 0.4]).fill(dark);
        g.poly([-r, r * 0.2, -r * 1.3, r * 0.9, -r * 0.4, r * 0.4]).fill(dark);
        g.ellipse(0, 0, r, r * 0.6).fill(color).stroke(line);
        g.poly([r * 0.2, -r * 0.4, r * 0.6, -r * 1.1, r * 0.7, -r * 0.3]).fill(light);
        g.poly([r * 0.2, r * 0.4, r * 0.6, r * 1.1, r * 0.7, r * 0.3]).fill(light);
        g.circle(r * 0.8, 0, r * 0.38).fill(shade(color, 1.15));
        g.circle(r * 1.0, -r * 0.15, Math.max(1.5, r * 0.1)).fill(0xffe040);
        g.circle(r * 1.0, r * 0.15, Math.max(1.5, r * 0.1)).fill(0xffe040);
        break;
      }
      case 'hydra': {
        g.ellipse(-r * 0.4, 0, r * 0.8, r * 0.5).fill(dark);
        g.ellipse(r * 0.1, 0, r * 0.7, r * 0.65).fill(color).stroke(line);
        g.poly([0, -r * 0.6, -r * 0.6, -r * 1.2, r * 0.4, -r * 0.7]).fill(light);
        g.poly([0, r * 0.6, -r * 0.6, r * 1.2, r * 0.4, r * 0.7]).fill(light);
        g.ellipse(r * 0.6, 0, r * 0.4, r * 0.3).fill(light);
        break;
      }
      case 'roach': {
        g.ellipse(0, 0, r, r * 0.8).fill(color).stroke(line);
        for (let i = -1; i <= 1; i++) g.ellipse(-r * 0.1 + i * r * 0.35, 0, r * 0.15, r * 0.7).fill(dark);
        g.ellipse(r * 0.75, 0, r * 0.35, r * 0.45).fill(light);
        g.circle(-r * 0.6, 0, r * 0.25).fill(0x9cff3c);
        break;
      }
      case 'bane': {
        g.circle(0, 0, r).fill(0x3a6a20).stroke(line);
        g.circle(-r * 0.15, 0, r * 0.75).fill({ color, alpha: 0.95 });
        g.circle(-r * 0.3, -r * 0.3, r * 0.25).fill({ color: 0xffffff, alpha: 0.5 });
        g.circle(r * 0.75, 0, r * 0.3).fill(0x6a4a2a);
        break;
      }
      case 'muta': {
        g.poly([0, 0, -r * 0.6, -r * 1.3, r * 0.4, -r * 0.4]).fill(shade(color, 0.8));
        g.poly([0, 0, -r * 0.6, r * 1.3, r * 0.4, r * 0.4]).fill(shade(color, 0.8));
        g.ellipse(0, 0, r * 0.9, r * 0.35).fill(color).stroke(line);
        g.poly([-r * 0.8, 0, -r * 1.3, -r * 0.3, -r * 1.3, r * 0.3]).fill(dark);
        g.circle(r * 0.75, 0, r * 0.25).fill(light);
        break;
      }
      case 'ultra': {
        g.ellipse(0, 0, r, r * 0.75).fill(color).stroke(line);
        for (let i = 0; i < 4; i++) g.ellipse(-r * 0.5 + i * r * 0.3, 0, r * 0.12, r * 0.62).fill(dark);
        g.poly([r * 0.4, -r * 0.5, r * 1.4, -r * 1.2, r * 0.8, -r * 0.3]).fill(0xf0e0c0);
        g.poly([r * 0.4, r * 0.5, r * 1.4, r * 1.2, r * 0.8, r * 0.3]).fill(0xf0e0c0);
        g.ellipse(r * 0.8, 0, r * 0.3, r * 0.35).fill(light);
        break;
      }
      case 'zealot': {
        g.ellipse(0, 0, r * 0.75, r * 0.95).fill(color).stroke(line);
        g.circle(r * 0.2, 0, r * 0.4).fill(dark);
        g.circle(r * 0.35, 0, r * 0.15).fill(0x4fd2ff);
        g.poly([r * 0.3, -r * 0.7, r * 1.4, -r * 0.55, r * 0.35, -r * 0.45]).fill({ color: 0x4fd2ff, alpha: 0.9 });
        g.poly([r * 0.3, r * 0.7, r * 1.4, r * 0.55, r * 0.35, r * 0.45]).fill({ color: 0x4fd2ff, alpha: 0.9 });
        break;
      }
      case 'stalker': {
        for (const s of [-1, 1]) {
          g.moveTo(0, 0).lineTo(-r * 0.6, s * r * 1.2).stroke({ width: r * 0.15, color: dark });
          g.moveTo(0, 0).lineTo(r * 0.6, s * r * 1.2).stroke({ width: r * 0.15, color: dark });
        }
        g.ellipse(0, 0, r * 0.8, r * 0.6).fill(color).stroke(line);
        g.circle(r * 0.45, 0, r * 0.22).fill(0x40e0ff);
        break;
      }
      case 'archon': {
        g.circle(0, 0, r).fill({ color, alpha: 0.35 });
        g.circle(0, 0, r * 0.75).fill({ color: light, alpha: 0.6 });
        g.circle(0, 0, r * 0.45).fill(0xffffff);
        break;
      }
      case 'marine':
      case 'firebat': {
        g.roundRect(-r * 0.1, r * 0.2, r * 1.5, r * 0.35, 2).fill(0x30343a);
        g.ellipse(0, 0, r * 0.8, r).fill(color).stroke(line);
        g.circle(-r * 0.1, -r * 0.7, r * 0.42).fill(light);
        g.circle(-r * 0.1, r * 0.7, r * 0.42).fill(light);
        g.circle(r * 0.15, 0, r * 0.42).fill(dark);
        g.rect(r * 0.3, -r * 0.2, r * 0.25, r * 0.4).fill(shape === 'firebat' ? 0xff9020 : 0xffd040);
        break;
      }
      case 'tank': {
        g.roundRect(-r, -r * 0.8, r * 2, r * 1.6, r * 0.2).fill(color).stroke(line);
        g.rect(-r, -r * 0.8, r * 2, r * 0.25).fill(dark);
        g.rect(-r, r * 0.55, r * 2, r * 0.25).fill(dark);
        g.circle(0, 0, r * 0.5).fill(light);
        g.rect(r * 0.2, -r * 0.12, r * 1.2, r * 0.24).fill(dark);
        break;
      }
      case 'hybrid': {
        g.poly([r, 0, r * 0.2, -r * 0.9, -r * 0.8, -r * 0.6, -r, 0, -r * 0.8, r * 0.6, r * 0.2, r * 0.9]).fill(shade(color, 0.4)).stroke({ width: 2, color });
        g.poly([r * 0.3, -r * 0.6, r * 1.2, -r * 1.1, r * 0.6, -r * 0.2]).fill(color);
        g.poly([r * 0.3, r * 0.6, r * 1.2, r * 1.1, r * 0.6, r * 0.2]).fill(color);
        g.circle(r * 0.3, 0, r * 0.25).fill(light);
        break;
      }
    }
  }, radius * 1.6);
}

export function pickupTexture(kind: 'xp0' | 'xp1' | 'xp2' | 'mineral' | 'medkit' | 'magnet' | 'cache' | 'lair' | 'bomb'): Texture {
  return bake(`pickup:${kind}`, (g) => {
    switch (kind) {
      case 'xp0':
        g.poly([0, -6, 4, 0, 0, 6, -4, 0]).fill(0x4fc3ff).stroke({ width: 1, color: 0xc0f0ff });
        break;
      case 'xp1':
        g.poly([0, -8, 5, 0, 0, 8, -5, 0]).fill(0x40ff80).stroke({ width: 1, color: 0xd0ffe0 });
        break;
      case 'xp2':
        g.poly([0, -10, 7, 0, 0, 10, -7, 0]).fill(0xff4060).stroke({ width: 1.5, color: 0xffd0d8 });
        break;
      case 'mineral':
        g.poly([-6, 6, -3, -7, 1, 6]).fill(0x40c8ff);
        g.poly([-1, 6, 3, -9, 7, 6]).fill(0x7ad8ff).stroke({ width: 1, color: 0xffffff });
        break;
      case 'medkit':
        g.roundRect(-9, -9, 18, 18, 3).fill(0xf0f0f0).stroke({ width: 1.5, color: 0x666666 });
        g.rect(-2.5, -6, 5, 12).fill(0xe02020);
        g.rect(-6, -2.5, 12, 5).fill(0xe02020);
        break;
      case 'magnet':
        g.circle(0, 0, 10).fill({ color: 0xffffff, alpha: 0.25 });
        g.poly([0, -11, 7, 0, 0, 11, -7, 0]).fill(0xfff080).stroke({ width: 2, color: 0xffffff });
        break;
      case 'cache':
        g.roundRect(-16, -12, 32, 24, 3).fill(0x5a6470).stroke({ width: 2, color: 0x2a3038 });
        g.rect(-16, -3, 32, 6).fill(0xffc030);
        g.rect(-3, -12, 6, 24).fill(0x404850);
        break;
      case 'lair':
        g.ellipse(0, 0, 70, 44).fill({ color: 0x000000, alpha: 0.35 });
        g.ellipse(0, 0, 52, 32).fill({ color: 0x3a1a3a, alpha: 0.6 });
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2;
          g.circle(Math.cos(a) * 60, Math.sin(a) * 38, 5).fill(0x5a4a40);
        }
        break;
      case 'bomb':
        g.circle(0, 0, 8).fill(0x30343a).stroke({ width: 2, color: 0xff3030 });
        g.circle(0, 0, 3).fill(0xff3030);
        break;
    }
  });
}

export function propTexture(kind: 'rock' | 'crystal' | 'bones' | 'pylon', accent: number, variant: number): Texture {
  return bake(`prop:${kind}:${accent}:${variant}`, (g) => {
    let seed = variant * 9301 + 49297;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    if (kind === 'rock') {
      const pts: number[] = [];
      const n = 7 + Math.floor(rnd() * 4);
      const R = 18 + rnd() * 26;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rr = R * (0.7 + rnd() * 0.4);
        pts.push(Math.cos(a) * rr, Math.sin(a) * rr * 0.75);
      }
      g.poly(pts).fill(0x4a4440).stroke({ width: 2, color: 0x2a2624 });
      g.ellipse(-R * 0.2, -R * 0.25, R * 0.4, R * 0.2).fill({ color: 0xffffff, alpha: 0.08 });
    } else if (kind === 'crystal') {
      for (let i = 0; i < 4; i++) {
        const x = (rnd() - 0.5) * 30;
        const h = 14 + rnd() * 22;
        g.poly([x - 6, 6, x, -h, x + 6, 6]).fill({ color: accent, alpha: 0.85 }).stroke({ width: 1, color: 0xffffff, alpha: 0.6 });
      }
    } else if (kind === 'bones') {
      g.ellipse(0, 0, 30, 10).fill({ color: 0xd8d0b8, alpha: 0.5 });
      for (let i = 0; i < 4; i++) g.moveTo(-20 + i * 12, -2).lineTo(-26 + i * 12, -16).stroke({ width: 3, color: 0xd8d0b8, alpha: 0.6 });
    } else {
      g.poly([0, -22, 12, 0, 0, 14, -12, 0]).fill(0xc8a040).stroke({ width: 2, color: 0x6a5020 });
      g.circle(0, -4, 5).fill(accent);
    }
  });
}

export function minionTexture(kind: 'brood' | 'turret' | 'scourge' | 'interceptor' | 'mine' | 'probe'): Texture {
  return bake(`minion:${kind}`, (g) => {
    switch (kind) {
      case 'brood':
        g.ellipse(0, 0, 8, 5).fill(0xd9a066).stroke({ width: 1.5, color: 0x5a3a20 });
        g.poly([2, -3, 9, -8, 6, -2]).fill(0xffe0a0);
        g.poly([2, 3, 9, 8, 6, 2]).fill(0xffe0a0);
        break;
      case 'turret':
        g.circle(0, 0, 11).fill(0x6a7480).stroke({ width: 2, color: 0x2a3038 });
        g.rect(0, -3, 16, 6).fill(0x3a4048);
        g.circle(0, 0, 4).fill(0xff4040);
        break;
      case 'scourge':
        g.poly([10, 0, -6, -8, -2, 0, -6, 8]).fill(0xff9ad5).stroke({ width: 1.5, color: 0x8a3a6a });
        g.circle(4, 0, 3).fill(0xffe060);
        break;
      case 'interceptor':
        g.poly([10, 0, -6, -7, -3, 0, -6, 7]).fill(0xffd36a).stroke({ width: 1.5, color: 0x8a6a20 });
        g.circle(2, 0, 2.5).fill(0x4fd2ff);
        break;
      case 'mine':
        g.circle(0, 0, 8).fill(0x50545a).stroke({ width: 1.5, color: 0x202428 });
        for (let i = 0; i < 4; i++) {
          const a = (i / 4) * Math.PI * 2 + 0.78;
          g.moveTo(Math.cos(a) * 6, Math.sin(a) * 6).lineTo(Math.cos(a) * 12, Math.sin(a) * 12).stroke({ width: 2, color: 0x30343a });
        }
        g.circle(0, 0, 3).fill(0xff3030);
        break;
      case 'probe':
        g.circle(0, 0, 8).fill(0xc8a040).stroke({ width: 1.5, color: 0x6a5020 });
        g.circle(3, 0, 3).fill(0x4fd2ff);
        break;
    }
  }, 17);
}
