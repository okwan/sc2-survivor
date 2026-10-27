import type { RaceId, StatMods } from './types';

/**
 * Playable heroes: Warcraft III heroes fighting the Koprulu sector. Each faction starts with one; the
 * others unlock through achievements. Ids stay the old Brood War ones so existing saves keep their pick.
 */
export interface HeroDef {
  id: string;
  race: RaceId;
  name: string;
  /** Warcraft III hero art (see WC3_HEROES), pre-rendered at deploy time. */
  art: string;
  /** Brood War sprite key (see BW_UNITS), used when the site has no WC3 art. */
  sprite: string;
  startSpell: string;
  desc: string;
  stats: StatMods;
  flags?: string[]; // talent-style hooks, e.g. cloak after dashing
  unlock?: string; // achievement id
}

export const HEROES: HeroDef[] = [
  { id: 'marine', race: 'terran', name: 'Archmage', art: 'archmage', sprite: 'hero:terran', startSpell: 'gauss', desc: 'The all-rounder, master of arcane bolts.', stats: {} },
  { id: 'firebat', race: 'terran', name: 'Blood Mage', art: 'bloodmage', sprite: 'hero:firebat', startSpell: 'flame', desc: 'Bathes the front line in fire. +3 armor, +30 health, slower.', stats: { armor: 3, maxHp: 30, moveSpeed: -15 }, unlock: 'clear_marsara_terran' },
  { id: 'ghost', race: 'terran', name: 'Mountain King', art: 'mountainking', sprite: 'hero:ghost', startSpell: 'yamato', desc: 'Hammers the biggest target. +10% crit chance, +50% crit damage, 20 less health.', stats: { critChance: 0.1, critMult: 0.5, maxHp: -20 }, unlock: 'clear_char_terran' },
  { id: 'hydralisk', race: 'zerg', name: 'Death Knight', art: 'deathknight', sprite: 'hero:zerg', startSpell: 'spines', desc: 'The all-rounder, hurling death coils.', stats: {} },
  { id: 'zergling', race: 'zerg', name: 'Dreadlord', art: 'dreadlord', sprite: 'hero:zergling', startSpell: 'spores', desc: 'A swift vampire lord. +40 move speed, +12% cooldown speed, 25 less health.', stats: { moveSpeed: 40, haste: 0.12, maxHp: -25 }, unlock: 'clear_marsara_zerg' },
  { id: 'defiler', race: 'zerg', name: 'Lich', art: 'lich', sprite: 'hero:defiler', startSpell: 'acidpool', desc: 'Frost and blight that linger. +20% area, +20% duration, slower.', stats: { area: 0.2, duration: 0.2, moveSpeed: -10 }, unlock: 'clear_char_zerg' },
  { id: 'zealot', race: 'protoss', name: 'Tauren Chieftain', art: 'tauren', sprite: 'hero:protoss', startSpell: 'blades', desc: 'The all-rounder, cleaving everything in reach.', stats: {} },
  { id: 'dtemplar', race: 'protoss', name: 'Blademaster', art: 'blademaster', sprite: 'hero:dtemplar', startSpell: 'blades', desc: 'Critical strikes and Wind Walk. +15% crit chance, turns invisible after dashing, 20 less spirit shield.', stats: { critChance: 0.15, maxShield: -20 }, flags: ['cloak'], unlock: 'clear_marsara_protoss' },
  { id: 'htemplar', race: 'protoss', name: 'Far Seer', art: 'farseer', sprite: 'hero:htemplar', startSpell: 'storm', desc: 'Calls down the storm. +15% damage, +10% area, 20 less health.', stats: { damage: 0.15, area: 0.1, maxHp: -20 }, unlock: 'clear_char_protoss' },
];

export const HERO_BY_ID: Record<string, HeroDef> = Object.fromEntries(HEROES.map((h) => [h.id, h]));

export function defaultHero(race: RaceId): HeroDef {
  return HEROES.find((h) => h.race === race && !h.unlock)!;
}
