import type { Rarity, StatMods } from './types';

/**
 * Run-only modules sold at supply caches, the way Azeroth Survivors sells jewelry for gold.
 * They last until the run ends; persistent gear still comes from guardians and bosses.
 */
export interface ModuleDef {
  id: string;
  name: string;
  icon: string;
  rarity: Rarity;
  desc: string;
  stats?: StatMods;
  flag?: string; // behaviour hook read by the game
}

export const MODULES: ModuleDef[] = [
  { id: 'm_dmg', name: 'Overcharger', icon: '⚡', rarity: 1, desc: '+15% damage', stats: { damage: 0.15 } },
  { id: 'm_haste', name: 'Stim Injector', icon: '💉', rarity: 1, desc: '+12% cooldown speed', stats: { haste: 0.12 } },
  { id: 'm_armor', name: 'Kinetic Dampener', icon: '🧱', rarity: 1, desc: '+4 armor', stats: { armor: 4 } },
  { id: 'm_hp', name: 'Combat Shield', icon: '🛡️', rarity: 1, desc: '+40 max health', stats: { maxHp: 40 } },
  { id: 'm_regen', name: 'Regen Matrix', icon: '➕', rarity: 1, desc: '+2 health regen', stats: { hpRegen: 2 } },
  { id: 'm_pick', name: 'Gravity Well', icon: '🧲', rarity: 1, desc: '+60 pickup range', stats: { pickupRange: 60 } },
  { id: 'm_min', name: 'Vespene Condenser', icon: '💎', rarity: 1, desc: '+50% minerals', stats: { minerals: 0.5 } },
  { id: 'm_area', name: 'Psi Amplifier', icon: '🎇', rarity: 2, desc: '+15% area', stats: { area: 0.15 } },
  { id: 'm_crit', name: 'Crit Implant', icon: '🎯', rarity: 2, desc: '+8% crit chance, +25% crit damage', stats: { critChance: 0.08, critMult: 0.25 } },
  { id: 'm_move', name: 'Afterburners', icon: '🚀', rarity: 2, desc: '+25 move speed, dash recharges 20% faster', stats: { moveSpeed: 25, dashCooldown: -0.2 } },
  { id: 'm_leech', name: 'Vampiric Nanites', icon: '🩸', rarity: 2, desc: 'Each kill heals 0.5 health', flag: 'leech' },
  { id: 'm_react', name: 'Reactive Plating', icon: '🔰', rarity: 2, desc: 'Taking a hit gives 1 s of invulnerability (10 s cooldown)', flag: 'reactive' },
  { id: 'm_echo', name: 'Echo Chamber', icon: '🔁', rarity: 3, desc: 'Spells have a 15% chance to cast twice', flag: 'echo' },
  { id: 'm_proj', name: 'Shrapnel Rounds', icon: '🔱', rarity: 3, desc: '+1 projectile, mine, summon and beam', stats: { extraProj: 1 } },
  { id: 'm_revive', name: 'Emergency Beacon', icon: '🚑', rarity: 3, desc: '+1 revive this run', stats: { revives: 1 } },
  { id: 'm_xel', name: 'Xel\'Naga Shard', icon: '🔮', rarity: 4, desc: '+25% damage, +10% cooldown speed, +10% area', stats: { damage: 0.25, haste: 0.1, area: 0.1 } },
];

/** Mineral price of a module in a zone (later zones pay more, but also drop more). */
export function modulePrice(m: ModuleDef, zoneIndex: number): number {
  return Math.round([30, 45, 70, 110, 170][m.rarity] * (1 + zoneIndex * 0.2));
}
