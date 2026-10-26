export type RaceId = 'terran' | 'zerg' | 'protoss';
export const RACES: RaceId[] = ['terran', 'zerg', 'protoss'];

/** Card / item quality, mirroring WoW item colors. */
export type Rarity = 0 | 1 | 2 | 3 | 4;
export const RARITY_NAMES = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
export const RARITY_COLORS = ['#e6e6e6', '#1eff00', '#2f8fff', '#b048f8', '#ff8000'];
/** How much stronger each rarity tier is than Common. */
export const RARITY_MULT = [1, 1.5, 2, 3, 4];

export interface Stats {
  maxHp: number;
  hpRegen: number; // hp per second
  armor: number; // flat damage reduction per hit
  maxShield: number;
  shieldRegen: number; // per second once recharging
  shieldDelay: number; // seconds without damage before shields recharge
  moveSpeed: number; // px per second
  pickupRange: number; // px
  damage: number; // multiplier, 1 = 100%
  haste: number; // 0.1 = cooldowns 10% faster
  area: number; // multiplier
  duration: number; // multiplier
  projSpeed: number; // multiplier
  critChance: number; // 0..1
  critMult: number; // e.g. 1.5 = +50%
  extraProj: number; // flat extra projectiles / summons
  luck: number; // 0.2 = +20% rare card odds
  xpGain: number; // multiplier
  minerals: number; // multiplier
  dodge: number; // 0..1
  revives: number;
  rerolls: number;
  banishes: number;
  dashCooldown: number; // multiplier
}

export type StatKey = keyof Stats;

export function baseStats(): Stats {
  return {
    maxHp: 120,
    hpRegen: 0.2,
    armor: 0,
    maxShield: 0,
    shieldRegen: 0,
    shieldDelay: 3,
    moveSpeed: 210,
    pickupRange: 90,
    damage: 1,
    haste: 0,
    area: 1,
    duration: 1,
    projSpeed: 1,
    critChance: 0.05,
    critMult: 1.5,
    extraProj: 0,
    luck: 0,
    xpGain: 1,
    minerals: 1,
    dodge: 0,
    revives: 0,
    rerolls: 2,
    banishes: 0,
    dashCooldown: 1,
  };
}

export type StatMods = Partial<Record<StatKey, number>>;

/** Per-spell modifiers from talents / gear / rarity bonuses. Percent fields are additive fractions. */
export interface SpellMod {
  damage?: number;
  cooldown?: number; // 0.1 = 10% shorter
  area?: number;
  count?: number; // flat
  pierce?: number; // flat
  duration?: number;
}

export function addMods(target: StatMods, src: StatMods, scale = 1) {
  for (const k in src) {
    const key = k as StatKey;
    target[key] = (target[key] ?? 0) + (src[key] ?? 0) * scale;
  }
}

export function addSpellMod(target: Record<string, SpellMod>, id: string, m: SpellMod, scale = 1) {
  const t = (target[id] ??= {});
  for (const k in m) {
    const key = k as keyof SpellMod;
    t[key] = (t[key] ?? 0) + (m[key] ?? 0) * scale;
  }
}

/** Human readable formatting of a stat bonus. */
export const STAT_LABELS: Record<StatKey, [string, 'flat' | 'pct' | 'mult']> = {
  maxHp: ['Max Health', 'flat'],
  hpRegen: ['Health Regen /s', 'flat'],
  armor: ['Armor', 'flat'],
  maxShield: ['Max Shields', 'flat'],
  shieldRegen: ['Shield Regen /s', 'flat'],
  shieldDelay: ['Shield Recharge Delay', 'flat'],
  moveSpeed: ['Move Speed', 'flat'],
  pickupRange: ['Pickup Range', 'flat'],
  damage: ['Damage', 'pct'],
  haste: ['Cooldown Speed', 'pct'],
  area: ['Area', 'pct'],
  duration: ['Duration', 'pct'],
  projSpeed: ['Projectile Speed', 'pct'],
  critChance: ['Crit Chance', 'pct'],
  critMult: ['Crit Damage', 'pct'],
  extraProj: ['Projectiles', 'flat'],
  luck: ['Luck', 'pct'],
  xpGain: ['Experience', 'pct'],
  minerals: ['Minerals', 'pct'],
  dodge: ['Dodge', 'pct'],
  revives: ['Extra Lives', 'flat'],
  rerolls: ['Rerolls', 'flat'],
  banishes: ['Banishes', 'flat'],
  dashCooldown: ['Dash Cooldown', 'pct'],
};

export function fmtStat(key: StatKey, v: number): string {
  const [label, kind] = STAT_LABELS[key];
  const sign = v >= 0 ? '+' : '';
  if (kind === 'pct') return `${sign}${Math.round(v * 1000) / 10}% ${label}`;
  return `${sign}${Math.round(v * 10) / 10} ${label}`;
}
