import type { RaceId, Rarity, StatKey, StatMods } from './types';

// ------------------------------------------------------------ passive level-up cards
export interface PassiveDef {
  id: string;
  name: string;
  icon: string;
  stat: StatKey;
  value: number; // at Common, scaled by rarity
  maxPicks: number;
  noScale?: boolean; // value ignores rarity
  minRarity?: number;
}

export const PASSIVES: PassiveDef[] = [
  { id: 'p_hp', name: 'Reinforced Carapace', icon: '❤️', stat: 'maxHp', value: 12, maxPicks: 6 },
  { id: 'p_regen', name: 'Nano-Repair', icon: '💉', stat: 'hpRegen', value: 0.35, maxPicks: 5 },
  { id: 'p_armor', name: 'Hardened Plating', icon: '🧱', stat: 'armor', value: 1, maxPicks: 5 },
  { id: 'p_speed', name: 'Hydraulic Servos', icon: '👟', stat: 'moveSpeed', value: 10, maxPicks: 5 },
  { id: 'p_dmg', name: 'Overcharged Cells', icon: '💥', stat: 'damage', value: 0.06, maxPicks: 6 },
  { id: 'p_haste', name: 'Rapid Cycling', icon: '⏱️', stat: 'haste', value: 0.04, maxPicks: 6 },
  { id: 'p_area', name: 'Blast Amplifier', icon: '🎇', stat: 'area', value: 0.06, maxPicks: 5 },
  { id: 'p_crit', name: 'Targeting Array', icon: '🎯', stat: 'critChance', value: 0.03, maxPicks: 5 },
  { id: 'p_critm', name: 'Armor Piercing', icon: '🗡️', stat: 'critMult', value: 0.12, maxPicks: 5 },
  { id: 'p_pick', name: 'Salvage Drones', icon: '🧲', stat: 'pickupRange', value: 18, maxPicks: 4 },
  { id: 'p_xp', name: 'Battle Analysis', icon: '📚', stat: 'xpGain', value: 0.05, maxPicks: 4 },
  { id: 'p_dur', name: 'Sustained Reaction', icon: '⏳', stat: 'duration', value: 0.06, maxPicks: 4 },
  { id: 'p_luck', name: 'Xel\'Naga Fortune', icon: '🍀', stat: 'luck', value: 0.06, maxPicks: 4 },
  { id: 'p_proj', name: 'Multi-Barrel', icon: '🔱', stat: 'extraProj', value: 1, maxPicks: 2, noScale: true, minRarity: 3 },
  { id: 'p_shield', name: 'Shield Battery', icon: '🔋', stat: 'maxShield', value: 10, maxPicks: 5 },
];

// ------------------------------------------------------------ gear
export type GearSlot = 'weapon' | 'armor' | 'module' | 'relic';
export const GEAR_SLOTS: GearSlot[] = ['weapon', 'armor', 'module', 'relic'];
export const SLOT_NAMES: Record<GearSlot, string> = { weapon: 'Weapon', armor: 'Armor', module: 'Module', relic: 'Relic' };

export interface GearItem {
  uid: string;
  slot: GearSlot;
  rarity: Rarity;
  name: string;
  stats: StatMods;
  level: number; // zone tier it dropped in
  /** Named legendaries carry a unique effect (see LEGENDARY_EFFECTS). */
  effect?: LegendaryEffect;
}

// ------------------------------------------------------------ named legendaries
export type LegendaryEffect = 'slayer' | 'bulwark' | 'twincast' | 'harvest';

export const LEGENDARY_EFFECTS: Record<LegendaryEffect, string> = {
  slayer: '+30% damage to bosses and elites. Other enemies below 8% health are executed.',
  bulwark: 'Below 40% health, take 35% less damage.',
  twincast: 'Every 4th spell cast fires twice.',
  harvest: 'Every 45 sec, pull in every experience crystal on the map.',
};

const SLOT_EFFECT: Record<GearSlot, LegendaryEffect> = { weapon: 'slayer', armor: 'bulwark', module: 'twincast', relic: 'harvest' };

const LEGENDARY_NAMES: Record<RaceId, Record<GearSlot, string>> = {
  terran: { weapon: 'Raynor\'s Penetrator', armor: 'Tychus\' Juggernaut Suit', module: 'Swann\'s Overclocked Core', relic: 'Hyperion Command Key' },
  zerg: { weapon: 'Kerrigan\'s Talon', armor: 'Ouros Carapace', module: 'Abathur\'s Sequencer', relic: 'Overmind Fragment' },
  protoss: { weapon: 'Zeratul\'s Warp Blade', armor: 'Fenix\'s Dragoon Shell', module: 'Artanis\' Khaydarin Amulet', relic: 'Xel\'Naga Keystone' },
};

/** Chance that a Legendary drop is one of the named, effect-bearing ones. */
const NAMED_CHANCE = 0.4;

const GEAR_POOL: Record<GearSlot, [StatKey, number][]> = {
  weapon: [['damage', 0.05], ['critChance', 0.025], ['critMult', 0.1], ['haste', 0.03], ['projSpeed', 0.06]],
  armor: [['maxHp', 10], ['armor', 1], ['hpRegen', 0.3], ['dodge', 0.02], ['maxShield', 8]],
  module: [['area', 0.05], ['pickupRange', 12], ['luck', 0.05], ['xpGain', 0.04], ['moveSpeed', 8], ['duration', 0.05], ['minerals', 0.08]],
  relic: [['damage', 0.035], ['haste', 0.025], ['xpGain', 0.035], ['luck', 0.04], ['maxHp', 8], ['critChance', 0.02]],
};

const GEAR_NAMES: Record<RaceId, Record<GearSlot, string[]>> = {
  terran: {
    weapon: ['C-14 Rifle Mod', 'Impaler Scope', 'Hellfire Igniter', 'Hammer Securities Barrel'],
    armor: ['CMC Powered Plating', 'Neosteel Frame', 'Infernal Suit', 'Juggernaut Plating'],
    module: ['Orbital Uplink', 'Targeting Computer', 'Stim Injector', 'Vanadium Core'],
    relic: ['Confederate Dog Tag', 'Umojan Data Core', 'Moebius Dossier', 'Artifact Shard'],
  },
  zerg: {
    weapon: ['Grooved Spine Sac', 'Acid Gland', 'Monarch Blades', 'Tyrannozor Talon'],
    armor: ['Chitin Shell', 'Ultralisk Carapace', 'Regenerative Hide', 'Aberration Plates'],
    module: ['Psionic Link Node', 'Evolution Chamber Strand', 'Larval Sac', 'Overmind Shard'],
    relic: ['Brood Essence', 'Cerebrate Husk', 'Primal Essence', 'Zerus Bone Idol'],
  },
  protoss: {
    weapon: ['Khaydarin Focus', 'Warp Blade Emitter', 'Phase Disruptor', 'Solarite Lens'],
    armor: ['Plasma Shell', 'Templar Vestments', 'Forged Khalai Plate', 'Purifier Chassis'],
    module: ['Khaydarin Amulet', 'Xel\'Naga Relic', 'Nexus Crystal', 'Uraj Fragment'],
    relic: ['Templar Archive', 'Shakuran Moonstone', 'Khalis Fragment', 'Keystone Sliver'],
  },
};

let uidCounter = 0;

export function rollGear(race: RaceId, rarity: Rarity, tier: number, slot?: GearSlot): GearItem {
  const s = slot ?? GEAR_SLOTS[Math.floor(Math.random() * GEAR_SLOTS.length)];
  const pool = [...GEAR_POOL[s]];
  const lines = Math.min(pool.length, 1 + Math.ceil(rarity / 1.5));
  const stats: StatMods = {};
  const power = (1 + rarity * 0.55) * (0.85 + tier * 0.15);
  for (let i = 0; i < lines; i++) {
    const idx = Math.floor(Math.random() * pool.length);
    const [k, v] = pool.splice(idx, 1)[0];
    const roll = 0.8 + Math.random() * 0.4;
    let val = v * power * roll;
    if (k === 'armor' || k === 'maxHp' || k === 'pickupRange' || k === 'moveSpeed' || k === 'maxShield') val = Math.round(val);
    else val = Math.round(val * 1000) / 1000;
    stats[k] = val;
  }
  const uid = `${Date.now().toString(36)}${(uidCounter++).toString(36)}`;
  if (rarity === 4 && Math.random() < NAMED_CHANCE) return { uid, slot: s, rarity, name: LEGENDARY_NAMES[race][s], stats, level: tier, effect: SLOT_EFFECT[s] };
  const names = GEAR_NAMES[race][s];
  const name = names[Math.min(names.length - 1, Math.floor(rarity * 0.75 + Math.random() * 1.2))];
  return { uid, slot: s, rarity, name, stats, level: tier };
}

export function gearScore(g: GearItem): number {
  return g.rarity * 10 + g.level * 3 + Object.keys(g.stats).length + (g.effect ? 12 : 0);
}

// ------------------------------------------------------------ account perks (Rewards tab)
export interface PerkDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  costs: number[]; // per level
  stats?: StatMods; // per level
}

export const PERKS: PerkDef[] = [
  { id: 'reroll', name: 'Requisition', icon: '🎲', desc: '+1 free reroll each run per level.', costs: [10, 25, 50], stats: { rerolls: 1 } },
  { id: 'banish', name: 'Purge Protocol', icon: '🚫', desc: '+1 banish each run per level. Banished cards never show again that run.', costs: [15, 35, 60], stats: { banishes: 1 } },
  { id: 'opening', name: 'Opening Hand', icon: '🃏', desc: 'Your first level-up offers 4 cards.', costs: [20] },
  { id: 'life', name: 'Emergency Evac', icon: '🚑', desc: '+1 extra life per level. Revive at half health.', costs: [40, 120], stats: { revives: 1 } },
  { id: 'probe', name: 'Salvage Probe', icon: '🤖', desc: 'A companion drone collects experience beyond your pickup range. Higher levels widen its reach.', costs: [25, 50, 90] },
  { id: 'minerals', name: 'Mining Contract', icon: '💎', desc: 'Start each run with 40 minerals per level.', costs: [10, 20, 40] },
  { id: 'veteran', name: 'Veteran\'s Lessons', icon: '🎓', desc: '+20% talent experience for races behind your best race.', costs: [30] },
];
