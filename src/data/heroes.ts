import type { RaceId, StatMods } from './types';

/** Playable heroes. Each race starts with one; the others unlock through achievements. */
export interface HeroDef {
  id: string;
  race: RaceId;
  name: string;
  /** Brood War sprite key (see BW_UNITS) drawn in the player's team color. */
  sprite: string;
  startSpell: string;
  desc: string;
  stats: StatMods;
  flags?: string[]; // talent-style hooks, e.g. cloak after dashing
  unlock?: string; // achievement id
}

export const HEROES: HeroDef[] = [
  { id: 'marine', race: 'terran', name: 'Marine', sprite: 'hero:terran', startSpell: 'gauss', desc: 'The all-rounder. Starts with the Gauss Rifle.', stats: {} },
  { id: 'firebat', race: 'terran', name: 'Firebat', sprite: 'hero:firebat', startSpell: 'flame', desc: 'Heavy armor and a flamethrower. +3 armor, +30 health, slower.', stats: { armor: 3, maxHp: 30, moveSpeed: -15 }, unlock: 'clear_marsara_terran' },
  { id: 'ghost', race: 'terran', name: 'Ghost', sprite: 'hero:ghost', startSpell: 'yamato', desc: 'A psionic sniper. +10% crit chance, +50% crit damage, cloaks after dashing, 20 less health.', stats: { critChance: 0.1, critMult: 0.5, maxHp: -20 }, flags: ['cloak'], unlock: 'clear_char_terran' },
  { id: 'hydralisk', race: 'zerg', name: 'Hydralisk', sprite: 'hero:zerg', startSpell: 'spines', desc: 'The all-rounder. Starts with Needle Spines.', stats: {} },
  { id: 'zergling', race: 'zerg', name: 'Zergling', sprite: 'hero:zergling', startSpell: 'spores', desc: 'Very fast and frail. +40 move speed, +12% cooldown speed, 25 less health.', stats: { moveSpeed: 40, haste: 0.12, maxHp: -25 }, unlock: 'clear_marsara_zerg' },
  { id: 'defiler', race: 'zerg', name: 'Defiler', sprite: 'hero:defiler', startSpell: 'acidpool', desc: 'Plague and creep. +20% area, +20% duration, slower.', stats: { area: 0.2, duration: 0.2, moveSpeed: -10 }, unlock: 'clear_char_zerg' },
  { id: 'zealot', race: 'protoss', name: 'Zealot', sprite: 'hero:protoss', startSpell: 'blades', desc: 'The all-rounder. Starts with Psi Blades.', stats: {} },
  { id: 'dtemplar', race: 'protoss', name: 'Dark Templar', sprite: 'hero:dtemplar', startSpell: 'blades', desc: 'Warp blades from the shadows. +15% crit chance, cloaks after dashing, 20 less shields.', stats: { critChance: 0.15, maxShield: -20 }, flags: ['cloak'], unlock: 'clear_marsara_protoss' },
  { id: 'htemplar', race: 'protoss', name: 'High Templar', sprite: 'hero:htemplar', startSpell: 'storm', desc: 'Master of storms. +15% damage, +10% area, 20 less health.', stats: { damage: 0.15, area: 0.1, maxHp: -20 }, unlock: 'clear_char_protoss' },
];

export const HERO_BY_ID: Record<string, HeroDef> = Object.fromEntries(HEROES.map((h) => [h.id, h]));

export function defaultHero(race: RaceId): HeroDef {
  return HEROES.find((h) => h.race === race && !h.unlock)!;
}
