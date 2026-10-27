import type { RaceId, StatMods } from './types';

export interface RaceDef {
  id: RaceId;
  name: string;
  hero: string;
  color: number;
  accent: number;
  startSpell: string;
  dashName: string;
  racial: string;
  /** Active racial on a timer, like Azeroth Survivors' Blood Fury or War Stomp. */
  active: string;
  desc: string;
  stats: StatMods;
}

export const RACE_DEFS: Record<RaceId, RaceDef> = {
  terran: {
    id: 'terran',
    name: 'Alliance',
    hero: 'Archmage',
    color: 0x3f7fd6,
    accent: 0xffd34d,
    startSpell: 'gauss',
    dashName: 'Blink',
    racial: 'Devotion Aura: +3 armor, +10 max health and +1 reroll.',
    active: 'Flame Strike: every 30 sec, a pillar of fire scorches the densest pack near you.',
    desc: 'Humans, dwarves and high elves. Durable and adaptable, with arcane bolts, fire and thunder.',
    stats: { armor: 3, rerolls: 1, maxHp: 10 },
  },
  zerg: {
    id: 'zerg',
    name: 'Scourge',
    hero: 'Death Knight',
    color: 0x8a3fb0,
    accent: 0xc6ff5c,
    startSpell: 'spines',
    dashName: 'Death Charge',
    racial: 'Unholy Aura: +1.6 health regen and +8% move speed, but 10 less max health.',
    active: 'Death Pact: a killing blow is cheated instead, healing you to 35% (once every 90 sec).',
    desc: 'The undead. Fast and relentless, raising minions and rotting packs with plague.',
    stats: { hpRegen: 1.6, moveSpeed: 17, maxHp: -10 },
  },
  protoss: {
    id: 'protoss',
    name: 'Horde',
    hero: 'Tauren Chieftain',
    color: 0xd8a83a,
    accent: 0x4fd2ff,
    startSpell: 'blades',
    dashName: 'Wind Walk',
    racial: 'Spirit Shield: 50 shields that recharge 3 sec after taking damage, but 20 less max health.',
    active: 'Hardened Skin: every 25 sec, take 40% less damage for 5 sec.',
    desc: 'Orcs and tauren. Fights up close with blades and lightning behind ancestral spirit shields.',
    stats: { maxHp: -20, maxShield: 50, shieldRegen: 12 },
  },
};
