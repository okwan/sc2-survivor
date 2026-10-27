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
    name: 'Terran',
    hero: 'Marine',
    color: 0x3f7fd6,
    accent: 0xffd34d,
    startSpell: 'gauss',
    dashName: 'Jet Pack',
    racial: 'Neosteel Armor: +3 armor, +10 max health and +1 reroll.',
    active: 'Orbital Strike: every 30 sec, the Orbital Command shells the densest pack near you.',
    desc: 'Durable and adaptable. Guns, fire, mines and big cannons.',
    stats: { armor: 3, rerolls: 1, maxHp: 10 },
  },
  zerg: {
    id: 'zerg',
    name: 'Zerg',
    hero: 'Hydralisk',
    color: 0x8a3fb0,
    accent: 0xc6ff5c,
    startSpell: 'spines',
    dashName: 'Burrow Lunge',
    racial: 'Regeneration: +1.6 health regen and +8% move speed, but 10 less max health.',
    active: 'Burrow: a killing blow makes you burrow instead, healing to 35% (once every 90 sec).',
    desc: 'Fast and relentless. Regenerates, spawns broodlings and melts packs with acid.',
    stats: { hpRegen: 1.6, moveSpeed: 17, maxHp: -10 },
  },
  protoss: {
    id: 'protoss',
    name: 'Protoss',
    hero: 'Zealot',
    color: 0xd8a83a,
    accent: 0x4fd2ff,
    startSpell: 'blades',
    dashName: 'Blink',
    racial: 'Plasma Shields: 50 shields that recharge 3 sec after taking damage, but 20 less max health.',
    active: 'Guardian Shield: every 25 sec, take 40% less damage for 5 sec.',
    desc: 'Elite and precise. Fights up close with psionic blades and storms behind regenerating shields.',
    stats: { maxHp: -20, maxShield: 50, shieldRegen: 12 },
  },
};
