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
    racial: 'Neosteel Armor: +3 armor and +1 reroll.',
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
    racial: 'Regeneration: +1.6 health regen and +8% move speed.',
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
    racial: 'Plasma Shields: 50 shields that recharge 3 sec after taking damage.',
    desc: 'Elite and precise. Fights up close with psionic blades and storms behind regenerating shields.',
    stats: { maxHp: -20, maxShield: 50, shieldRegen: 12 },
  },
};
