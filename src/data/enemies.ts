export type EnemyShape = 'ling' | 'hydra' | 'roach' | 'bane' | 'muta' | 'ultra' | 'zealot' | 'stalker' | 'archon' | 'marine' | 'firebat' | 'tank' | 'hybrid' | 'broodling';
export type EnemyBehavior = 'chase' | 'ranged' | 'exploder' | 'charger';

export interface EnemyDef {
  id: string;
  name: string;
  shape: EnemyShape;
  color: number;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  xp: number;
  behavior: EnemyBehavior;
  mass?: number; // knockback resistance (1 = normal)
  range?: number; // ranged attackers keep this distance
  shotCd?: number;
  shotSpeed?: number;
}

export const ENEMIES: Record<string, EnemyDef> = {
  zergling: { id: 'zergling', name: 'Zergling', shape: 'ling', color: 0xb05a2e, hp: 9, speed: 120, damage: 6, radius: 12, xp: 1, behavior: 'chase' },
  broodling: { id: 'broodling', name: 'Broodling', shape: 'broodling', color: 0x8a6a3a, hp: 6, speed: 150, damage: 4, radius: 9, xp: 1, behavior: 'chase' },
  hydralisk: { id: 'hydralisk', name: 'Hydralisk', shape: 'hydra', color: 0x8c3a6a, hp: 22, speed: 85, damage: 8, radius: 15, xp: 2, behavior: 'ranged', range: 260, shotCd: 2.6, shotSpeed: 260 },
  roach: { id: 'roach', name: 'Roach', shape: 'roach', color: 0x7a4a2a, hp: 48, speed: 70, damage: 12, radius: 18, xp: 3, behavior: 'chase', mass: 2 },
  baneling: { id: 'baneling', name: 'Baneling', shape: 'bane', color: 0x7dff3c, hp: 14, speed: 135, damage: 22, radius: 12, xp: 2, behavior: 'exploder' },
  mutalisk: { id: 'mutalisk', name: 'Mutalisk', shape: 'muta', color: 0x6a5acd, hp: 26, speed: 150, damage: 8, radius: 15, xp: 2, behavior: 'chase' },
  ultralisk: { id: 'ultralisk', name: 'Ultralisk', shape: 'ultra', color: 0xa08060, hp: 260, speed: 80, damage: 18, radius: 32, xp: 15, behavior: 'charger', mass: 6 },
  zealot: { id: 'zealot', name: 'Zealot', shape: 'zealot', color: 0xd4a83a, hp: 34, speed: 105, damage: 10, radius: 14, xp: 2, behavior: 'chase' },
  stalker: { id: 'stalker', name: 'Stalker', shape: 'stalker', color: 0x5a6aa0, hp: 40, speed: 95, damage: 10, radius: 17, xp: 3, behavior: 'ranged', range: 300, shotCd: 2.2, shotSpeed: 320 },
  archon: { id: 'archon', name: 'Archon', shape: 'archon', color: 0x9ad8ff, hp: 300, speed: 75, damage: 24, radius: 30, xp: 15, behavior: 'chase', mass: 5 },
  marine: { id: 'marine', name: 'Dominion Marine', shape: 'marine', color: 0xa03030, hp: 20, speed: 95, damage: 7, radius: 13, xp: 1, behavior: 'ranged', range: 230, shotCd: 1.8, shotSpeed: 360 },
  firebat: { id: 'firebat', name: 'Firebat', shape: 'firebat', color: 0xd06020, hp: 44, speed: 100, damage: 13, radius: 16, xp: 3, behavior: 'chase', mass: 1.5 },
  siegetank: { id: 'siegetank', name: 'Siege Tank', shape: 'tank', color: 0x707a60, hp: 320, speed: 55, damage: 25, radius: 30, xp: 15, behavior: 'ranged', range: 380, shotCd: 3.4, shotSpeed: 280, mass: 8 },
  hybrid: { id: 'hybrid', name: 'Hybrid Reaver', shape: 'hybrid', color: 0x40ffd0, hp: 380, speed: 85, damage: 22, radius: 34, xp: 20, behavior: 'charger', mass: 7 },
  hybridling: { id: 'hybridling', name: 'Void Shard', shape: 'hybrid', color: 0x2ad4b0, hp: 30, speed: 125, damage: 10, radius: 13, xp: 2, behavior: 'chase' },
};

export type BossAbility = 'burst' | 'charge' | 'summon' | 'slam' | 'barrage';

export interface BossDef {
  id: string;
  name: string;
  title: string;
  shape: EnemyShape;
  color: number;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  abilities: BossAbility[];
  summon?: string;
}

export interface ZoneDef {
  id: string;
  name: string;
  desc: string;
  tier: number; // difficulty multiplier
  minutes: number; // final boss arrives at this time
  ground: [number, number]; // ground colors
  doodad: number;
  /** Enemy pools by minute. Later entries take over when minute >= from. */
  waves: { from: number; pool: [string, number][] }[];
  elite: string;
  guardian: string;
  bosses: BossDef[]; // spawned at 3, 6, 9, 12 minutes
  final: BossDef;
}

export const ZONES: ZoneDef[] = [
  {
    id: 'marsara', name: 'Mar Sara', desc: 'A dusty frontier colony overrun by the first wave of the Swarm.', tier: 1, minutes: 16,
    ground: [0x5a4632, 0x4e3c2a], doodad: 0x8a6a4a,
    waves: [
      { from: 0, pool: [['zergling', 10]] },
      { from: 1.5, pool: [['zergling', 8], ['hydralisk', 2]] },
      { from: 4, pool: [['zergling', 7], ['hydralisk', 2], ['roach', 2]] },
      { from: 7, pool: [['zergling', 6], ['baneling', 2], ['hydralisk', 2], ['roach', 3]] },
      { from: 11, pool: [['zergling', 5], ['baneling', 3], ['hydralisk', 3], ['roach', 4], ['mutalisk', 2]] },
    ],
    elite: 'ultralisk', guardian: 'ultralisk',
    bosses: [
      { id: 'b1', name: 'Kukulza Larva', title: 'Brood Mother', shape: 'muta', color: 0xb06ad0, hp: 1600, speed: 90, damage: 18, radius: 40, abilities: ['burst', 'summon'], summon: 'zergling' },
      { id: 'b2', name: 'Hunter Killer', title: 'Elite Hydralisk', shape: 'hydra', color: 0xd04a8a, hp: 3200, speed: 100, damage: 20, radius: 38, abilities: ['barrage', 'charge'] },
      { id: 'b3', name: 'Devourer Queen', title: 'Hive Matriarch', shape: 'roach', color: 0xc07030, hp: 5200, speed: 85, damage: 24, radius: 44, abilities: ['slam', 'summon', 'burst'], summon: 'baneling' },
      { id: 'b4', name: 'Torrasque', title: 'Ultralisk Alpha', shape: 'ultra', color: 0xe0b080, hp: 8000, speed: 95, damage: 30, radius: 52, abilities: ['charge', 'slam'] },
    ],
    final: { id: 'bf', name: 'Cerebrate Zasz', title: 'Overmind\'s Voice', shape: 'ultra', color: 0x9a2ad0, hp: 16000, speed: 75, damage: 34, radius: 64, abilities: ['burst', 'summon', 'slam', 'barrage'], summon: 'hydralisk' },
  },
  {
    id: 'char', name: 'Char', desc: 'A volcanic world of ash and lava. The Swarm\'s heart beats here.', tier: 1.6, minutes: 16,
    ground: [0x3a2420, 0x2c1a18], doodad: 0xff5a20,
    waves: [
      { from: 0, pool: [['zergling', 8], ['broodling', 4]] },
      { from: 1.5, pool: [['zergling', 6], ['mutalisk', 3], ['hydralisk', 2]] },
      { from: 4, pool: [['zergling', 6], ['mutalisk', 3], ['baneling', 3], ['roach', 2]] },
      { from: 8, pool: [['zergling', 5], ['mutalisk', 4], ['baneling', 3], ['roach', 3], ['hydralisk', 3]] },
      { from: 12, pool: [['zergling', 4], ['mutalisk', 4], ['baneling', 4], ['roach', 4], ['hydralisk', 3], ['ultralisk', 1]] },
    ],
    elite: 'ultralisk', guardian: 'ultralisk',
    bosses: [
      { id: 'c1', name: 'Brakk', title: 'Primal Pack Leader', shape: 'ling', color: 0xe06030, hp: 2400, speed: 140, damage: 22, radius: 36, abilities: ['charge', 'summon'], summon: 'zergling' },
      { id: 'c2', name: 'Izsha\'s Echo', title: 'Lair Sentinel', shape: 'muta', color: 0x8a70ff, hp: 4600, speed: 95, damage: 24, radius: 40, abilities: ['burst', 'barrage'] },
      { id: 'c3', name: 'Dehaka\'s Brood', title: 'Primal Devourer', shape: 'roach', color: 0xd0a040, hp: 7200, speed: 95, damage: 28, radius: 46, abilities: ['slam', 'charge', 'summon'], summon: 'roach' },
      { id: 'c4', name: 'Omegalisk', title: 'Apex Strain', shape: 'ultra', color: 0xff9060, hp: 11000, speed: 100, damage: 34, radius: 56, abilities: ['charge', 'slam', 'burst'] },
    ],
    final: { id: 'cf', name: 'Queen of Blades', title: 'Sovereign of the Swarm', shape: 'hydra', color: 0xc040ff, hp: 24000, speed: 110, damage: 38, radius: 54, abilities: ['charge', 'burst', 'summon', 'barrage'], summon: 'mutalisk' },
  },
  {
    id: 'aiur', name: 'Aiur', desc: 'The fallen jungle homeworld of the Protoss, haunted by rogue templar.', tier: 2.4, minutes: 18,
    ground: [0x2e4a2c, 0x243e22], doodad: 0x4fd2ff,
    waves: [
      // the Swarm is on Aiur too: lighter zerglings open the zone before the zealots take over
      { from: 0, pool: [['zergling', 6], ['zealot', 3]] },
      { from: 1.5, pool: [['zealot', 6], ['stalker', 3]] },
      { from: 4.5, pool: [['zealot', 6], ['stalker', 3], ['hybridling', 3]] },
      { from: 9, pool: [['zealot', 5], ['stalker', 4], ['hybridling', 4]] },
      { from: 13, pool: [['zealot', 5], ['stalker', 4], ['hybridling', 4], ['archon', 1]] },
    ],
    elite: 'archon', guardian: 'archon',
    bosses: [
      { id: 'a1', name: 'Rogue Executor', title: 'Templar Exile', shape: 'zealot', color: 0xffcf40, hp: 3600, speed: 120, damage: 26, radius: 38, abilities: ['charge', 'burst'] },
      { id: 'a2', name: 'Talandar\'s Shell', title: 'Corrupted Immortal', shape: 'stalker', color: 0x7090ff, hp: 6400, speed: 85, damage: 30, radius: 44, abilities: ['barrage', 'slam'] },
      { id: 'a3', name: 'Dark Archon', title: 'Mind of the Void', shape: 'archon', color: 0x8040ff, hp: 9800, speed: 80, damage: 32, radius: 48, abilities: ['burst', 'summon', 'slam'], summon: 'hybridling' },
      { id: 'a4', name: 'Maar', title: 'Hybrid Destroyer', shape: 'hybrid', color: 0x30ffc0, hp: 14000, speed: 95, damage: 38, radius: 56, abilities: ['charge', 'barrage', 'burst'] },
    ],
    final: { id: 'af', name: 'Ulrezaj', title: 'Archon of Shadows', shape: 'archon', color: 0x5020c0, hp: 34000, speed: 85, damage: 44, radius: 66, abilities: ['burst', 'barrage', 'summon', 'slam'], summon: 'zealot' },
  },
  {
    id: 'korhal', name: 'Korhal', desc: 'The Dominion capital. Imperial battalions hold every street.', tier: 3.4, minutes: 18,
    ground: [0x3a3e44, 0x30343a], doodad: 0xd04040,
    waves: [
      { from: 0, pool: [['marine', 6], ['zergling', 4]] },
      { from: 1.5, pool: [['marine', 6], ['firebat', 3]] },
      { from: 4.5, pool: [['marine', 6], ['firebat', 4], ['zergling', 3]] },
      { from: 9, pool: [['marine', 6], ['firebat', 4], ['zealot', 3], ['siegetank', 1]] },
      { from: 13, pool: [['marine', 6], ['firebat', 5], ['stalker', 3], ['siegetank', 1]] },
    ],
    elite: 'siegetank', guardian: 'siegetank',
    bosses: [
      { id: 'k1', name: 'Tychus Fireteam', title: 'Hired Guns', shape: 'firebat', color: 0xff7030, hp: 5200, speed: 100, damage: 30, radius: 40, abilities: ['barrage', 'charge'] },
      { id: 'k2', name: 'Odin Prototype', title: 'Thor-class Walker', shape: 'tank', color: 0x9aa0a8, hp: 9000, speed: 70, damage: 36, radius: 54, abilities: ['barrage', 'slam'] },
      { id: 'k3', name: 'Spectre Nova', title: 'Shadow Operative', shape: 'marine', color: 0x50e0ff, hp: 12000, speed: 140, damage: 34, radius: 36, abilities: ['charge', 'burst', 'summon'], summon: 'marine' },
      { id: 'k4', name: 'Hyperion Echo', title: 'Battlecruiser', shape: 'tank', color: 0x6080a0, hp: 17000, speed: 75, damage: 42, radius: 62, abilities: ['barrage', 'burst', 'slam'] },
    ],
    final: { id: 'kf', name: 'Emperor Mengsk', title: 'Dominion Warlord', shape: 'marine', color: 0xc02020, hp: 46000, speed: 95, damage: 48, radius: 56, abilities: ['barrage', 'summon', 'charge', 'burst', 'slam'], summon: 'firebat' },
  },
  {
    id: 'ulnar', name: 'Ulnar', desc: 'An ancient Xel\'Naga temple where the Void bleeds into reality.', tier: 4.6, minutes: 20,
    ground: [0x1e1c2e, 0x181626], doodad: 0x9a4aff,
    waves: [
      { from: 0, pool: [['hybridling', 4], ['zergling', 8]] },
      { from: 2, pool: [['hybridling', 6], ['zealot', 3], ['mutalisk', 3]] },
      { from: 5, pool: [['hybridling', 6], ['stalker', 3], ['baneling', 3], ['roach', 3]] },
      { from: 10, pool: [['hybridling', 6], ['stalker', 4], ['firebat', 3], ['hybrid', 1]] },
      { from: 15, pool: [['hybridling', 6], ['archon', 1], ['ultralisk', 1], ['hybrid', 1], ['mutalisk', 4]] },
    ],
    elite: 'hybrid', guardian: 'hybrid',
    bosses: [
      { id: 'u1', name: 'Void Herald', title: 'Moebius Spawn', shape: 'hybrid', color: 0x60ffe0, hp: 8000, speed: 110, damage: 38, radius: 44, abilities: ['burst', 'charge'] },
      { id: 'u2', name: 'Dominator Prime', title: 'Hybrid Psion', shape: 'archon', color: 0x40c0ff, hp: 13000, speed: 85, damage: 42, radius: 50, abilities: ['barrage', 'summon', 'slam'], summon: 'hybridling' },
      { id: 'u3', name: 'Narud', title: 'The Faceless', shape: 'zealot', color: 0xa060ff, hp: 18000, speed: 120, damage: 44, radius: 44, abilities: ['charge', 'burst', 'barrage'] },
      { id: 'u4', name: 'Void Colossus', title: 'Herald of Ruin', shape: 'hybrid', color: 0x7a30ff, hp: 26000, speed: 80, damage: 50, radius: 66, abilities: ['slam', 'barrage', 'summon'], summon: 'hybrid' },
    ],
    final: { id: 'uf', name: 'Amon\'s Avatar', title: 'The Dark God', shape: 'hybrid', color: 0xff3060, hp: 70000, speed: 90, damage: 56, radius: 74, abilities: ['burst', 'barrage', 'charge', 'summon', 'slam'], summon: 'hybridling' },
  },
];

export const ZONE_BY_ID: Record<string, ZoneDef> = Object.fromEntries(ZONES.map((z) => [z.id, z]));
