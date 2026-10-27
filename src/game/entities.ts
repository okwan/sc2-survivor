import type { Sprite } from 'pixi.js';
import type { BwSprite } from '../bw/assets';
import type { BossDef, EnemyDef } from '../data/enemies';
import type { SpellDef, SpellStats } from '../data/spells';

export const MAX_SLOTS = 10; // spell slots + internal sources (nuke, feedback, dash)

export interface BossState {
  def: BossDef;
  abilityTimer: number;
  enraged: boolean;
  charging: number; // remaining charge time
  chargeDx: number;
  chargeDy: number;
  windup: number; // telegraph time before a charge
  final: boolean;
}

export interface Enemy {
  uid: number;
  def: EnemyDef;
  x: number;
  y: number;
  kx: number; // knockback velocity
  ky: number;
  hp: number;
  maxHp: number;
  speed: number;
  damage: number;
  radius: number;
  mass: number;
  xp: number;
  sprite: Sprite;
  flash: number;
  slow: number;
  burnDps: number;
  burnTime: number;
  burnTick: number;
  contactCd: number;
  shotTimer: number;
  elite: boolean;
  boss: BossState | null;
  lair: Lair | null;
  asleep: boolean;
  hitStamp: Float32Array; // last time hit by each spell slot
  charge: number; // charger state timer
  windup: number;
  cdx: number;
  cdy: number;
  facing: number;
  bw: BwSprite | null;
  bwScale: number;
}

export interface Projectile {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  radius: number;
  pierce: number;
  life: number;
  slot: number;
  sprite: Sprite;
  hits: number[]; // uids already hit
  splash: boolean;
  tags: string[];
}

export interface EnemyShot {
  x: number;
  y: number;
  vx: number;
  vy: number;
  damage: number;
  life: number;
  radius: number;
  sprite: Sprite;
}

export interface Gem {
  x: number;
  y: number;
  value: number;
  tier: number;
  sprite: Sprite;
  pulled: boolean;
  speed: number;
}

export type PickupKind = 'mineral' | 'medkit' | 'magnet' | 'gear';

export interface Pickup {
  x: number;
  y: number;
  kind: PickupKind;
  value: number;
  sprite: Sprite;
  pulled: boolean;
  speed: number;
  life: number;
  data?: unknown;
}

export interface Lair {
  x: number;
  y: number;
  sprite: Sprite;
  guardian: Enemy | null;
  cleared: boolean;
}

export interface Cache {
  x: number;
  y: number;
  sprite: Sprite;
  opened: boolean;
  label: Sprite | null;
}

export interface Fx {
  sprite: Sprite;
  life: number;
  max: number;
  s0: number;
  s1: number;
  a0: number;
  vx: number;
  vy: number;
  spin: number;
}

export interface Field {
  x: number;
  y: number;
  r: number;
  damage: number;
  life: number;
  tick: number;
  slot: number;
  sprite: Sprite;
  slowAmt: number;
  tags: string[];
}

export interface Mine {
  x: number;
  y: number;
  damage: number;
  r: number;
  life: number;
  arm: number;
  slot: number;
  sprite: Sprite;
}

export interface Lob {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  t: number;
  dur: number;
  damage: number;
  r: number;
  slot: number;
  color: number;
  sprite: Sprite;
  tags: string[];
}

export interface Minion {
  x: number;
  y: number;
  slot: number; // -1 for temporary broodlings from Endless Swarm
  kind: 'brood' | 'turret' | 'probe';
  target: Enemy | null;
  atk: number;
  life: number;
  sprite: Sprite;
  ox: number;
  oy: number;
  damage: number;
  angle: number;
  bw: BwSprite | null;
}

export interface Telegraph {
  kind: 'circle' | 'line';
  x: number;
  y: number;
  r: number;
  dx: number;
  dy: number;
  len: number;
  t: number;
  max: number;
  damage: number;
  onDone: (() => void) | null;
  friendly: boolean;
}

export interface ChainFx {
  pts: number[];
  life: number;
  color: number;
}

export interface SpellInstance {
  def: SpellDef;
  rank: number;
  bonus: number; // extra damage fraction from card rarity
  timer: number;
  slot: number;
  stats: SpellStats; // effective stats, recomputed when stats change
  angle: number; // for orbits
  orbiters: Sprite[];
  auraSprite: Sprite | null;
  dmgDone: number;
  nextSpawn: number;
}
