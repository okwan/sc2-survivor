export type EnemyShape =
  | 'ling' | 'hydra' | 'roach' | 'bane' | 'muta' | 'ultra' | 'zealot' | 'stalker' | 'archon' | 'marine' | 'firebat' | 'tank' | 'hybrid' | 'broodling'
  | 'drone' | 'scourge' | 'queen' | 'guardian' | 'defiler'
  | 'scv' | 'medic' | 'vulture' | 'goliath' | 'ghost' | 'wraith' | 'bc'
  | 'probe' | 'dtemplar' | 'htemplar' | 'reaver' | 'corsair' | 'scout' | 'carrier' | 'arbiter';

/** Each shape's race (death effects) and the placeholder drawing used when its sprite is missing. */
export const SHAPE_INFO: Record<EnemyShape, { race: 'zerg' | 'terran' | 'protoss'; drawAs: EnemyShape }> = {
  ling: { race: 'zerg', drawAs: 'ling' }, broodling: { race: 'zerg', drawAs: 'broodling' }, hydra: { race: 'zerg', drawAs: 'hydra' },
  roach: { race: 'zerg', drawAs: 'roach' }, bane: { race: 'zerg', drawAs: 'bane' }, muta: { race: 'zerg', drawAs: 'muta' },
  ultra: { race: 'zerg', drawAs: 'ultra' }, drone: { race: 'zerg', drawAs: 'ling' }, scourge: { race: 'zerg', drawAs: 'bane' },
  queen: { race: 'zerg', drawAs: 'muta' }, guardian: { race: 'zerg', drawAs: 'muta' }, defiler: { race: 'zerg', drawAs: 'roach' },
  marine: { race: 'terran', drawAs: 'marine' }, firebat: { race: 'terran', drawAs: 'firebat' }, tank: { race: 'terran', drawAs: 'tank' },
  scv: { race: 'terran', drawAs: 'marine' }, medic: { race: 'terran', drawAs: 'marine' }, vulture: { race: 'terran', drawAs: 'tank' },
  goliath: { race: 'terran', drawAs: 'tank' }, ghost: { race: 'terran', drawAs: 'marine' }, wraith: { race: 'terran', drawAs: 'muta' },
  bc: { race: 'terran', drawAs: 'tank' },
  zealot: { race: 'protoss', drawAs: 'zealot' }, stalker: { race: 'protoss', drawAs: 'stalker' }, archon: { race: 'protoss', drawAs: 'archon' },
  hybrid: { race: 'protoss', drawAs: 'hybrid' }, probe: { race: 'protoss', drawAs: 'stalker' }, dtemplar: { race: 'protoss', drawAs: 'zealot' },
  htemplar: { race: 'protoss', drawAs: 'zealot' }, reaver: { race: 'protoss', drawAs: 'stalker' }, corsair: { race: 'protoss', drawAs: 'muta' },
  scout: { race: 'protoss', drawAs: 'muta' }, carrier: { race: 'protoss', drawAs: 'archon' }, arbiter: { race: 'protoss', drawAs: 'archon' },
};
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
  stalker: { id: 'stalker', name: 'Stalker', shape: 'stalker', color: 0x5a6aa0, hp: 40, speed: 95, damage: 8, radius: 17, xp: 3, behavior: 'ranged', range: 300, shotCd: 2.2, shotSpeed: 320 },
  archon: { id: 'archon', name: 'Archon', shape: 'archon', color: 0x9ad8ff, hp: 300, speed: 75, damage: 24, radius: 30, xp: 15, behavior: 'chase', mass: 5 },
  marine: { id: 'marine', name: 'Dominion Marine', shape: 'marine', color: 0xa03030, hp: 20, speed: 95, damage: 7, radius: 13, xp: 1, behavior: 'ranged', range: 230, shotCd: 1.8, shotSpeed: 360 },
  firebat: { id: 'firebat', name: 'Firebat', shape: 'firebat', color: 0xd06020, hp: 44, speed: 100, damage: 13, radius: 16, xp: 3, behavior: 'chase', mass: 1.5 },
  siegetank: { id: 'siegetank', name: 'Siege Tank', shape: 'tank', color: 0x707a60, hp: 320, speed: 55, damage: 25, radius: 30, xp: 15, behavior: 'ranged', range: 380, shotCd: 3.4, shotSpeed: 280, mass: 8 },
  hybrid: { id: 'hybrid', name: 'Hybrid Reaver', shape: 'hybrid', color: 0x40ffd0, hp: 380, speed: 85, damage: 22, radius: 34, xp: 20, behavior: 'charger', mass: 7 },
  // the rest of the StarCraft roster: every run mixes all three races, ground and air
  drone: { id: 'drone', name: 'Drone', shape: 'drone', color: 0x9a6a3a, hp: 10, speed: 125, damage: 4, radius: 12, xp: 1, behavior: 'chase' },
  scourge: { id: 'scourge', name: 'Scourge', shape: 'scourge', color: 0xc08040, hp: 10, speed: 185, damage: 12, radius: 10, xp: 1, behavior: 'exploder' },
  queen: { id: 'queen', name: 'Queen', shape: 'queen', color: 0xa050a0, hp: 60, speed: 110, damage: 12, radius: 17, xp: 4, behavior: 'ranged', range: 300, shotCd: 2.6, shotSpeed: 280 },
  guardian: { id: 'guardian', name: 'Guardian', shape: 'guardian', color: 0x7a8a40, hp: 160, speed: 70, damage: 18, radius: 26, xp: 12, behavior: 'ranged', range: 380, shotCd: 3.4, shotSpeed: 250, mass: 4 },
  defiler: { id: 'defiler', name: 'Defiler', shape: 'defiler', color: 0x6a7a3a, hp: 90, speed: 85, damage: 12, radius: 16, xp: 6, behavior: 'ranged', range: 280, shotCd: 3, shotSpeed: 220 },
  scv: { id: 'scv', name: 'SCV', shape: 'scv', color: 0x8a8a90, hp: 12, speed: 110, damage: 5, radius: 12, xp: 1, behavior: 'chase' },
  medic: { id: 'medic', name: 'Medic', shape: 'medic', color: 0xe0e0e0, hp: 24, speed: 100, damage: 5, radius: 13, xp: 2, behavior: 'chase' },
  vulture: { id: 'vulture', name: 'Vulture', shape: 'vulture', color: 0xb08040, hp: 30, speed: 175, damage: 9, radius: 16, xp: 2, behavior: 'chase' },
  goliath: { id: 'goliath', name: 'Goliath', shape: 'goliath', color: 0x8a8a70, hp: 70, speed: 80, damage: 10, radius: 18, xp: 4, behavior: 'ranged', range: 300, shotCd: 2, shotSpeed: 360, mass: 2 },
  ghost: { id: 'ghost', name: 'Ghost', shape: 'ghost', color: 0xc0c0d0, hp: 40, speed: 95, damage: 14, radius: 13, xp: 4, behavior: 'ranged', range: 360, shotCd: 2.8, shotSpeed: 440 },
  wraith: { id: 'wraith', name: 'Wraith', shape: 'wraith', color: 0x7090b0, hp: 40, speed: 130, damage: 9, radius: 16, xp: 3, behavior: 'ranged', range: 280, shotCd: 2, shotSpeed: 380 },
  battlecruiser: { id: 'battlecruiser', name: 'Battlecruiser', shape: 'bc', color: 0x8090a0, hp: 600, speed: 55, damage: 30, radius: 36, xp: 30, behavior: 'ranged', range: 360, shotCd: 2.6, shotSpeed: 300, mass: 10 },
  probe: { id: 'probe', name: 'Probe', shape: 'probe', color: 0xd0c060, hp: 11, speed: 120, damage: 4, radius: 11, xp: 1, behavior: 'chase' },
  darktemplar: { id: 'darktemplar', name: 'Dark Templar', shape: 'dtemplar', color: 0x404060, hp: 80, speed: 120, damage: 18, radius: 15, xp: 5, behavior: 'chase' },
  hightemplar: { id: 'hightemplar', name: 'High Templar', shape: 'htemplar', color: 0xd0b070, hp: 45, speed: 80, damage: 16, radius: 14, xp: 5, behavior: 'ranged', range: 300, shotCd: 3, shotSpeed: 240 },
  reaver: { id: 'reaver', name: 'Reaver', shape: 'reaver', color: 0xb09060, hp: 260, speed: 45, damage: 30, radius: 26, xp: 14, behavior: 'ranged', range: 340, shotCd: 4, shotSpeed: 200, mass: 8 },
  corsair: { id: 'corsair', name: 'Corsair', shape: 'corsair', color: 0x60a0e0, hp: 50, speed: 150, damage: 8, radius: 15, xp: 3, behavior: 'chase' },
  scout: { id: 'scout', name: 'Scout', shape: 'scout', color: 0xc0a050, hp: 90, speed: 120, damage: 12, radius: 20, xp: 6, behavior: 'ranged', range: 300, shotCd: 2.2, shotSpeed: 360 },
  carrier: { id: 'carrier', name: 'Carrier', shape: 'carrier', color: 0xd0b060, hp: 520, speed: 55, damage: 14, radius: 36, xp: 30, behavior: 'ranged', range: 360, shotCd: 1.2, shotSpeed: 340, mass: 10 },
  arbiter: { id: 'arbiter', name: 'Arbiter', shape: 'arbiter', color: 0xc0a040, hp: 220, speed: 85, damage: 16, radius: 24, xp: 15, behavior: 'ranged', range: 320, shotCd: 2.4, shotSpeed: 300, mass: 5 },
  hybridling: { id: 'hybridling', name: 'Void Shard', shape: 'hybrid', color: 0x2ad4b0, hp: 30, speed: 125, damage: 8, radius: 13, xp: 2, behavior: 'chase' },
};

/** pods: drop pods land around you and unload; cross: beams sweep out from the boss; voidzones: void eruptions around you. */
export type BossAbility = 'burst' | 'charge' | 'summon' | 'slam' | 'barrage' | 'pods' | 'cross' | 'voidzones';
/**
 * Raid mechanics every boss gets as the fight goes on (WoW-style, announced with a raid warning):
 * soak: stand in the falling circle or everyone gets hit; mark: a bomb follows you, drag it onto the
 * swarm; nova: get out of range before the channel ends; safezone: hide in a green circle.
 */
export type BossMechanic = 'soak' | 'mark' | 'nova' | 'safezone';

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
  /** At half health the boss splits off elite copies of this unit (Ulrezaj's Dark Archons). */
  split?: [string, number];
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
      // Mar Sara was a free win: banelings and mutalisks now arrive earlier
      { from: 6, pool: [['zergling', 6], ['baneling', 2], ['hydralisk', 2], ['roach', 3]] },
      { from: 9, pool: [['zergling', 5], ['baneling', 3], ['hydralisk', 3], ['roach', 4], ['mutalisk', 2]] },
    ],
    elite: 'ultralisk', guardian: 'ultralisk',
    bosses: [
      { id: 'b1', name: 'Kukulza Larva', title: 'Brood Mother', shape: 'muta', color: 0xb06ad0, hp: 1600, speed: 90, damage: 18, radius: 40, abilities: ['burst', 'summon'], summon: 'zergling' },
      { id: 'b2', name: 'Hunter Killer', title: 'Elite Hydralisk', shape: 'hydra', color: 0xd04a8a, hp: 3200, speed: 100, damage: 20, radius: 38, abilities: ['barrage', 'charge', 'cross'] },
      { id: 'b3', name: 'Devourer Queen', title: 'Hive Matriarch', shape: 'roach', color: 0xc07030, hp: 5200, speed: 85, damage: 24, radius: 44, abilities: ['slam', 'summon', 'burst'], summon: 'baneling' },
      { id: 'b4', name: 'Torrasque', title: 'Ultralisk Alpha', shape: 'ultra', color: 0xe0b080, hp: 8000, speed: 95, damage: 30, radius: 52, abilities: ['charge', 'slam'] },
    ],
    final: { id: 'bf', name: 'Cerebrate Zasz', title: 'Overmind\'s Voice', shape: 'ultra', color: 0x9a2ad0, hp: 16000, speed: 75, damage: 34, radius: 64, abilities: ['burst', 'summon', 'slam', 'barrage', 'pods'], summon: 'hydralisk', split: ['ultralisk', 2] },
  },
  {
    id: 'char', name: 'Char', desc: 'A volcanic world of ash and lava. The Swarm\'s heart beats here.', tier: 1.4, minutes: 16,
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
    final: { id: 'cf', name: 'Queen of Blades', title: 'Sovereign of the Swarm', shape: 'hydra', color: 0xc040ff, hp: 24000, speed: 110, damage: 38, radius: 54, abilities: ['charge', 'burst', 'summon', 'cross', 'voidzones'], summon: 'mutalisk' },
  },
  {
    id: 'aiur', name: 'Aiur', desc: 'The fallen jungle homeworld of the Protoss, haunted by rogue templar.', tier: 1.9, minutes: 18,
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
    final: { id: 'af', name: 'Ulrezaj', title: 'Archon of Shadows', shape: 'archon', color: 0x5020c0, hp: 34000, speed: 85, damage: 44, radius: 66, abilities: ['burst', 'barrage', 'summon', 'voidzones'], summon: 'zealot', split: ['archon', 3] },
  },
  {
    id: 'korhal', name: 'Korhal', desc: 'The Dominion capital. Imperial battalions hold every street.', tier: 2.5, minutes: 18,
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
      { id: 'k2', name: 'Odin Prototype', title: 'Thor-class Walker', shape: 'tank', color: 0x9aa0a8, hp: 9000, speed: 70, damage: 36, radius: 54, abilities: ['barrage', 'slam', 'pods'] },
      { id: 'k3', name: 'Spectre Nova', title: 'Shadow Operative', shape: 'marine', color: 0x50e0ff, hp: 12000, speed: 140, damage: 34, radius: 36, abilities: ['charge', 'burst', 'summon'], summon: 'marine' },
      { id: 'k4', name: 'Hyperion Echo', title: 'Battlecruiser', shape: 'tank', color: 0x6080a0, hp: 17000, speed: 75, damage: 42, radius: 62, abilities: ['barrage', 'burst', 'slam'] },
    ],
    final: { id: 'kf', name: 'Emperor Mengsk', title: 'Dominion Warlord', shape: 'marine', color: 0xc02020, hp: 46000, speed: 95, damage: 48, radius: 56, abilities: ['barrage', 'pods', 'charge', 'cross', 'slam'], summon: 'marine' },
  },
  {
    id: 'ulnar', name: 'Ulnar', desc: 'An ancient Xel\'Naga temple where the Void bleeds into reality.', tier: 3.2, minutes: 20,
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
      { id: 'u3', name: 'Narud', title: 'The Faceless', shape: 'zealot', color: 0xa060ff, hp: 18000, speed: 120, damage: 44, radius: 44, abilities: ['charge', 'burst', 'voidzones'] },
      { id: 'u4', name: 'Void Colossus', title: 'Herald of Ruin', shape: 'hybrid', color: 0x7a30ff, hp: 26000, speed: 80, damage: 50, radius: 66, abilities: ['slam', 'barrage', 'summon'], summon: 'hybrid' },
    ],
    final: { id: 'uf', name: 'Amon\'s Avatar', title: 'The Dark God', shape: 'hybrid', color: 0xff3060, hp: 70000, speed: 90, damage: 56, radius: 74, abilities: ['burst', 'cross', 'voidzones', 'pods', 'slam'], summon: 'hybridling', split: ['hybrid', 2] },
  },
  {
    id: 'braxis', name: 'Braxis', desc: 'A frozen UED stronghold. Directorate marines and captured Zerg guard the Psi Disrupter.', tier: 3.9, minutes: 20,
    ground: [0x5a6a7a, 0x4c5a68], doodad: 0x9ad8ff,
    waves: [
      { from: 0, pool: [['marine', 6], ['zergling', 6]] },
      { from: 2, pool: [['marine', 6], ['firebat', 3], ['hydralisk', 3]] },
      { from: 5, pool: [['marine', 5], ['firebat', 3], ['hydralisk', 3], ['baneling', 3], ['roach', 2]] },
      { from: 10, pool: [['marine', 5], ['firebat', 4], ['roach', 4], ['mutalisk', 3], ['siegetank', 1]] },
      { from: 15, pool: [['marine', 5], ['firebat', 4], ['mutalisk', 4], ['siegetank', 1], ['ultralisk', 1]] },
    ],
    elite: 'siegetank', guardian: 'ultralisk',
    bosses: [
      { id: 'x1', name: 'Samir Duran', title: 'Traitor Lieutenant', shape: 'marine', color: 0x80b0ff, hp: 9000, speed: 140, damage: 40, radius: 38, abilities: ['charge', 'burst', 'summon'], summon: 'marine' },
      { id: 'x2', name: 'Psi Disrupter', title: 'UED Superweapon', shape: 'tank', color: 0xa0c8e0, hp: 15000, speed: 60, damage: 44, radius: 58, abilities: ['barrage', 'pods', 'voidzones'] },
      { id: 'x3', name: 'Tamed Torrasque', title: 'Directorate Pet', shape: 'ultra', color: 0xd8e8f0, hp: 20000, speed: 100, damage: 48, radius: 60, abilities: ['charge', 'slam', 'summon'], summon: 'zergling' },
      { id: 'x4', name: 'Aleksander', title: 'UED Flagship', shape: 'tank', color: 0x5070a0, hp: 28000, speed: 75, damage: 52, radius: 66, abilities: ['barrage', 'cross', 'slam'] },
    ],
    final: { id: 'xf', name: 'Admiral DuGalle', title: 'United Earth Directorate', shape: 'marine', color: 0x3060c0, hp: 90000, speed: 95, damage: 58, radius: 60, abilities: ['barrage', 'pods', 'charge', 'cross', 'voidzones'], summon: 'firebat', split: ['siegetank', 2] },
  },
  {
    id: 'shakuras', name: 'Shakuras', desc: 'The Dark Templar refuge, overrun by the Swarm and stalked by hybrids in its twin temples.', tier: 4.6, minutes: 22,
    ground: [0x6a5a3a, 0x5c4e32], doodad: 0x4fd2ff,
    waves: [
      { from: 0, pool: [['hybridling', 5], ['zergling', 8], ['zealot', 2]] },
      { from: 2, pool: [['hybridling', 6], ['zealot', 3], ['hydralisk', 3], ['mutalisk', 2]] },
      { from: 5, pool: [['hybridling', 6], ['stalker', 3], ['baneling', 3], ['roach', 3], ['zealot', 3]] },
      { from: 10, pool: [['hybridling', 6], ['stalker', 4], ['mutalisk', 4], ['archon', 1], ['hybrid', 1]] },
      { from: 16, pool: [['hybridling', 7], ['stalker', 4], ['ultralisk', 1], ['archon', 1], ['hybrid', 2]] },
    ],
    elite: 'archon', guardian: 'hybrid',
    bosses: [
      { id: 's1', name: 'Aldaris', title: 'Judicator of the Conclave', shape: 'zealot', color: 0xffe080, hp: 12000, speed: 125, damage: 46, radius: 42, abilities: ['charge', 'burst', 'cross'] },
      { id: 's2', name: 'Daggoth', title: 'Cerebrate of the Tiamat Brood', shape: 'ultra', color: 0xc070ff, hp: 20000, speed: 80, damage: 50, radius: 62, abilities: ['slam', 'summon', 'pods'], summon: 'hydralisk' },
      { id: 's3', name: 'Shadow of Raszagal', title: 'Corrupted Matriarch', shape: 'archon', color: 0x60a0ff, hp: 27000, speed: 90, damage: 52, radius: 52, abilities: ['burst', 'barrage', 'voidzones'] },
      { id: 's4', name: 'Hybrid Nemesis', title: 'Moebius Masterwork', shape: 'hybrid', color: 0x30ffa0, hp: 36000, speed: 95, damage: 58, radius: 70, abilities: ['charge', 'slam', 'summon', 'cross'], summon: 'hybridling' },
    ],
    final: { id: 'sf', name: 'The Second Overmind', title: 'Will of the Swarm', shape: 'ultra', color: 0x8a1ad0, hp: 120000, speed: 70, damage: 64, radius: 80, abilities: ['burst', 'summon', 'slam', 'pods', 'voidzones'], summon: 'ultralisk', split: ['hybrid', 3] },
  },
];

/**
 * Units from all three races that join every zone's own waves, by the minute they start showing up
 * (later zones get them sooner). Half of all spawns come from here, so a run always mixes Zerg,
 * Terran and Protoss, ground and air.
 */
export const MIXED_ROSTER: { from: number; pool: [string, number][] }[] = [
  { from: 0, pool: [['zergling', 3], ['drone', 2], ['scv', 2], ['probe', 2], ['marine', 2], ['zealot', 1]] },
  { from: 1.5, pool: [['hydralisk', 2], ['medic', 1], ['vulture', 2], ['scourge', 2], ['mutalisk', 2], ['baneling', 1]] },
  { from: 4, pool: [['roach', 2], ['firebat', 2], ['stalker', 2], ['wraith', 2], ['goliath', 2], ['corsair', 2], ['queen', 1], ['darktemplar', 1]] },
  { from: 7, pool: [['ghost', 2], ['hightemplar', 2], ['reaver', 1], ['guardian', 1], ['defiler', 1], ['scout', 1]] },
  { from: 10, pool: [['ultralisk', 1], ['archon', 1], ['siegetank', 1], ['battlecruiser', 1], ['carrier', 1], ['arbiter', 1]] },
];

export const ZONE_BY_ID: Record<string, ZoneDef> = Object.fromEntries(ZONES.map((z) => [z.id, z]));
