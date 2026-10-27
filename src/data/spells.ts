import type { RaceId } from './types';

export type SpellKind =
  | 'bolt' // projectiles at the nearest enemies
  | 'lob' // bombs that land on enemies and explode
  | 'cone' // instant cone in front of the hero toward the nearest enemy
  | 'aura' // ticks damage around the hero
  | 'orbit' // persistent orbiting blades
  | 'mine' // dropped charges that detonate on contact
  | 'field' // lingering damage zones on enemy packs
  | 'chain' // lightning bouncing between enemies
  | 'beam' // piercing line
  | 'summon' // minions that fight for you
  | 'nova' // expanding ring from the hero with knockback
  | 'barrier'; // periodic absorb shield

export interface SpellStats {
  damage: number;
  cooldown: number; // seconds
  count: number;
  area: number; // radius / size in px
  pierce: number;
  duration: number; // seconds
  speed: number; // px/s
}

export type SpellTag = 'fire' | 'bio' | 'psionic' | 'tech' | 'acid' | 'void' | 'explosive';

export interface SpellDef {
  id: string;
  race: RaceId;
  name: string;
  icon: string;
  color: number;
  kind: SpellKind;
  tags: SpellTag[];
  desc: string;
  base: SpellStats;
  /** Deltas applied at ranks 2..8. */
  ranks: Partial<SpellStats>[];
  ranged?: boolean; // for summons
}

export const MAX_RANK = 8;
export const MAX_SPELLS = 6;

const S = (damage: number, cooldown: number, count: number, area: number, pierce: number, duration: number, speed: number): SpellStats => ({
  damage,
  cooldown,
  count,
  area,
  pierce,
  duration,
  speed,
});

export const SPELLS: SpellDef[] = [
  // ---------------------------------------------------------------- TERRAN
  {
    id: 'gauss', race: 'terran', name: 'Gauss Rifle', icon: '🔫', color: 0xffe066, kind: 'bolt', tags: ['tech'],
    desc: 'Rapid 8mm spikes fired at the nearest enemies.',
    base: S(11, 0.55, 1, 6, 0, 1.2, 720),
    ranks: [{ damage: 3 }, { count: 1 }, { cooldown: -0.07 }, { damage: 4, pierce: 1 }, { count: 1 }, { damage: 5 }, { count: 1, pierce: 1 }],
  },
  {
    id: 'frag', race: 'terran', name: 'Frag Grenade', icon: '💣', color: 0xff9a3c, kind: 'lob', tags: ['explosive', 'fire'],
    desc: 'Lobs grenades onto enemy packs that explode on impact.',
    base: S(24, 2.4, 1, 60, 0, 0.6, 0),
    ranks: [{ damage: 8 }, { count: 1 }, { area: 15 }, { damage: 10 }, { count: 1, cooldown: -0.3 }, { area: 15, damage: 10 }, { count: 2 }],
  },
  {
    id: 'flame', race: 'terran', name: 'Flamethrower', icon: '🔥', color: 0xff6a1a, kind: 'cone', tags: ['fire'],
    desc: 'Sprays fire in a short cone, scorching everything in front.',
    base: S(9, 0.45, 1, 150, 0, 0.3, 0),
    ranks: [{ damage: 3 }, { area: 25 }, { damage: 3 }, { cooldown: -0.06 }, { area: 25, damage: 3 }, { damage: 4 }, { area: 30, damage: 5 }],
  },
  {
    id: 'mines', race: 'terran', name: 'Spider Mines', icon: '🕷️', color: 0xcfd8dc, kind: 'mine', tags: ['explosive', 'tech'],
    desc: 'Drops spider mines that burrow and detonate on contact.',
    base: S(32, 3, 2, 70, 0, 12, 0),
    ranks: [{ count: 1 }, { damage: 10 }, { area: 15 }, { count: 1 }, { damage: 14, cooldown: -0.4 }, { count: 2 }, { damage: 20, area: 20 }],
  },
  {
    id: 'yamato', race: 'terran', name: 'Yamato Cannon', icon: '☄️', color: 0x66e0ff, kind: 'beam', tags: ['tech'],
    desc: 'Fires a devastating beam that pierces through every enemy in a line.',
    base: S(70, 4.5, 1, 22, 99, 0.35, 0),
    ranks: [{ damage: 25 }, { cooldown: -0.5 }, { area: 10 }, { damage: 35 }, { count: 1 }, { damage: 40, cooldown: -0.5 }, { count: 1, area: 10 }],
  },
  {
    id: 'matrix', race: 'terran', name: 'Defensive Matrix', icon: '🛡️', color: 0x6ad1ff, kind: 'barrier', tags: ['tech'],
    desc: 'Projects a barrier that absorbs damage. Scales with your damage. Recharges periodically.',
    base: S(30, 10, 1, 0, 0, 8, 0),
    ranks: [{ damage: 10 }, { cooldown: -1 }, { damage: 15 }, { duration: 2 }, { damage: 20 }, { cooldown: -1.5 }, { damage: 30 }],
  },
  {
    id: 'turret', race: 'terran', name: 'Auto-Turret', icon: '🗼', color: 0xb0bec5, kind: 'summon', tags: ['tech'], ranged: true,
    desc: 'Deploys auto-turrets that follow you and shoot nearby enemies.',
    base: S(9, 0.7, 1, 320, 0, 4, 600),
    ranks: [{ damage: 3 }, { count: 1 }, { cooldown: -0.1 }, { damage: 4 }, { count: 1 }, { damage: 5, cooldown: -0.1 }, { count: 1 }],
  },
  // ---------------------------------------------------------------- ZERG
  {
    id: 'spines', race: 'zerg', name: 'Needle Spines', icon: '🦔', color: 0xc6ff5c, kind: 'bolt', tags: ['bio'],
    desc: 'Launches bone spines at the nearest enemies.',
    base: S(12, 0.6, 1, 7, 1, 1.1, 640),
    ranks: [{ damage: 3 }, { count: 1 }, { pierce: 1 }, { cooldown: -0.08 }, { count: 1, damage: 4 }, { pierce: 1, damage: 4 }, { count: 2 }],
  },
  {
    id: 'spores', race: 'zerg', name: 'Acid Spores', icon: '🦠', color: 0x9cff3c, kind: 'aura', tags: ['acid', 'bio'],
    desc: 'A cloud of corrosive spores that constantly burns nearby enemies.',
    base: S(10, 0.5, 1, 85, 0, 0, 0),
    ranks: [{ area: 15 }, { damage: 3 }, { area: 15 }, { damage: 4 }, { cooldown: -0.08, area: 10 }, { damage: 4 }, { area: 20, damage: 5 }],
  },
  {
    id: 'bile', race: 'zerg', name: 'Corrosive Bile', icon: '🟢', color: 0x7dff00, kind: 'lob', tags: ['acid', 'explosive'],
    desc: 'Spits globs of bile that splash acid where they land.',
    base: S(28, 2.6, 2, 55, 0, 0.7, 0),
    ranks: [{ damage: 8 }, { count: 1 }, { area: 12 }, { damage: 10 }, { count: 1 }, { cooldown: -0.4, area: 12 }, { count: 2, damage: 12 }],
  },
  {
    id: 'brood', race: 'zerg', name: 'Broodlings', icon: '🪲', color: 0xd9a066, kind: 'summon', tags: ['bio'],
    desc: 'Spawns broodlings that hunt down nearby enemies.',
    base: S(8, 0.5, 2, 260, 0, 3, 300),
    ranks: [{ count: 1 }, { damage: 3 }, { count: 1 }, { damage: 3, cooldown: -0.06 }, { count: 1 }, { damage: 4 }, { count: 2 }],
  },
  {
    id: 'scourge', race: 'zerg', name: 'Scourge Swarm', icon: '🦇', color: 0xff9ad5, kind: 'orbit', tags: ['bio'],
    desc: 'Scourge circle around you, biting anything they touch.',
    base: S(14, 0.5, 2, 95, 0, 0, 3.2),
    ranks: [{ count: 1 }, { damage: 4 }, { area: 15 }, { count: 1 }, { damage: 5, speed: 0.6 }, { count: 1 }, { damage: 6, area: 15 }],
  },
  {
    id: 'acidpool', race: 'zerg', name: 'Creep Bloom', icon: '🟣', color: 0xa040ff, kind: 'field', tags: ['acid'],
    desc: 'Creep erupts beneath enemy packs, dissolving everything standing on it.',
    base: S(6, 4, 1, 75, 0, 4, 0),
    ranks: [{ area: 15 }, { damage: 3 }, { count: 1 }, { duration: 1 }, { damage: 4, area: 10 }, { count: 1 }, { damage: 5, cooldown: -0.6 }],
  },
  {
    id: 'spinenova', race: 'zerg', name: 'Spine Eruption', icon: '🌵', color: 0xe0c070, kind: 'nova', tags: ['bio'],
    desc: 'Spines burst from the ground around you, knocking enemies back and stunning them.',
    base: S(22, 3.4, 1, 150, 0, 0.4, 0),
    ranks: [{ damage: 8 }, { area: 25 }, { cooldown: -0.4 }, { damage: 10 }, { area: 25 }, { damage: 12, cooldown: -0.4 }, { area: 30, damage: 15 }],
  },
  // ---------------------------------------------------------------- PROTOSS
  {
    id: 'blades', race: 'protoss', name: 'Psi Blades', icon: '⚔️', color: 0x7ae0ff, kind: 'cone', tags: ['psionic'],
    desc: 'Sweeping psionic blades cleave enemies in a wide arc.',
    base: S(18, 0.75, 1, 165, 0, 0.2, 0),
    ranks: [{ damage: 5 }, { area: 20 }, { cooldown: -0.1 }, { damage: 6 }, { area: 20 }, { damage: 7, cooldown: -0.1 }, { area: 25, damage: 8 }],
  },
  {
    id: 'photon', race: 'protoss', name: 'Photon Bolt', icon: '🔷', color: 0x40b0ff, kind: 'bolt', tags: ['tech'],
    desc: 'Fires phase disruptor bolts at the nearest enemies.',
    base: S(14, 0.75, 1, 8, 0, 1.2, 560),
    ranks: [{ damage: 4 }, { count: 1 }, { pierce: 1 }, { damage: 5 }, { count: 1, cooldown: -0.08 }, { damage: 6, pierce: 1 }, { count: 2 }],
  },
  {
    id: 'storm', race: 'protoss', name: 'Psionic Storm', icon: '🌩️', color: 0x9a7cff, kind: 'field', tags: ['psionic'],
    desc: 'Calls down a storm of psionic energy on enemy packs.',
    base: S(8.5, 3.5, 1, 85, 0, 3, 0),
    ranks: [{ damage: 4 }, { area: 15 }, { count: 1 }, { damage: 5 }, { duration: 1, area: 10 }, { count: 1 }, { damage: 8, cooldown: -0.5 }],
  },
  {
    id: 'interceptors', race: 'protoss', name: 'Interceptors', icon: '🛸', color: 0xffd36a, kind: 'orbit', tags: ['tech'],
    desc: 'Interceptor drones orbit you and strafe enemies in their path.',
    base: S(15, 0.5, 2, 110, 0, 0, 2.6),
    ranks: [{ count: 1 }, { damage: 4 }, { area: 20 }, { count: 1 }, { damage: 5, speed: 0.6 }, { count: 1 }, { damage: 7, area: 15 }],
  },
  {
    id: 'arc', race: 'protoss', name: 'Arc Lightning', icon: '⚡', color: 0x9fe8ff, kind: 'chain', tags: ['psionic'],
    desc: 'Archon lightning that leaps between enemies.',
    base: S(18, 1.6, 1, 170, 3, 0.2, 0),
    ranks: [{ pierce: 1 }, { damage: 6 }, { count: 1 }, { pierce: 2 }, { damage: 8, cooldown: -0.2 }, { count: 1 }, { pierce: 3, damage: 10 }],
  },
  {
    id: 'prism', race: 'protoss', name: 'Prismatic Beam', icon: '🔆', color: 0xffe9a8, kind: 'beam', tags: ['void'],
    desc: 'A void ray lance that burns through every enemy in a line.',
    base: S(45, 3.2, 1, 18, 99, 0.3, 0),
    ranks: [{ damage: 15 }, { cooldown: -0.4 }, { area: 8 }, { damage: 20 }, { count: 1 }, { damage: 25, cooldown: -0.4 }, { count: 1 }],
  },
  {
    id: 'purnova', race: 'protoss', name: 'Purification Nova', icon: '💠', color: 0xb5f0ff, kind: 'nova', tags: ['psionic', 'void'],
    desc: 'Releases a wave of purifying energy that stuns nearby enemies.',
    base: S(26, 3.6, 1, 170, 0, 0.4, 0),
    ranks: [{ damage: 8 }, { area: 25 }, { cooldown: -0.45 }, { damage: 12 }, { area: 25 }, { damage: 14, cooldown: -0.4 }, { area: 30, damage: 18 }],
  },
];

export const SPELL_BY_ID: Record<string, SpellDef> = Object.fromEntries(SPELLS.map((s) => [s.id, s]));

export function spellStatsAtRank(def: SpellDef, rank: number): SpellStats {
  const s = { ...def.base };
  for (let i = 0; i < rank - 1 && i < def.ranks.length; i++) {
    const d = def.ranks[i];
    for (const k in d) {
      const key = k as keyof SpellStats;
      s[key] += d[key] ?? 0;
    }
  }
  return s;
}

export const SPELL_STAT_LABELS: Partial<Record<keyof SpellStats, string>> = {
  damage: 'Damage',
  cooldown: 'Cooldown',
  count: 'Count',
  area: 'Area',
  pierce: 'Pierce',
  duration: 'Duration',
  speed: 'Speed',
};
