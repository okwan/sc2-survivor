import type { RaceId } from './types';

/** What a finished run looked like, for achievement checks. */
export interface RunStats {
  won: boolean;
  race: RaceId;
  zone: string;
  time: number; // seconds
  kills: number;
  bosses: number;
  elites: number;
  evolved: number;
  objectives: number;
  difficulty: number;
  mutators: number;
  endless: boolean;
}

export interface AchievementDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  vespene: number;
  /** Unlocks a hero (shown on the card). */
  hero?: string;
  test: (r: RunStats, clearedBy: Record<string, RaceId[]>) => boolean;
}

const clear = (zone: string, race: RaceId) => (r: RunStats) => r.won && r.zone === zone && r.race === race;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'kills_1000', name: 'Swarm Sweeper', icon: '☠️', desc: 'Kill 1,000 enemies in one run.', vespene: 5, test: (r) => r.kills >= 1000 },
  { id: 'kills_5000', name: 'Exterminator', icon: '💀', desc: 'Kill 5,000 enemies in one run.', vespene: 15, test: (r) => r.kills >= 5000 },
  { id: 'kills_15000', name: 'Extinction Event', icon: '☄️', desc: 'Kill 15,000 enemies in one run.', vespene: 30, test: (r) => r.kills >= 15000 },
  { id: 'objectives_4', name: 'Mission Specialist', icon: '📡', desc: 'Complete 4 zone objectives in one run.', vespene: 15, test: (r) => r.objectives >= 4 },
  { id: 'boss_1', name: 'Giant Slayer', icon: '⚔️', desc: 'Kill a boss.', vespene: 5, test: (r) => r.bosses >= 1 },
  { id: 'elites_10', name: 'Elite Hunter', icon: '🎯', desc: 'Kill 10 elites in one run.', vespene: 10, test: (r) => r.elites >= 10 },
  { id: 'evolve_1', name: 'Evolution Complete', icon: '🧬', desc: 'Evolve a spell.', vespene: 10, test: (r) => r.evolved >= 1 },
  { id: 'evolve_3', name: 'Apex Strain', icon: '🧪', desc: 'Evolve three spells in one run.', vespene: 25, test: (r) => r.evolved >= 3 },
  { id: 'clear_marsara_terran', name: 'Mar Sara Marshal', icon: '🔥', desc: 'Clear Mar Sara as Terran.', vespene: 10, hero: 'firebat', test: clear('marsara', 'terran') },
  { id: 'clear_marsara_zerg', name: 'Brood of Mar Sara', icon: '🦷', desc: 'Clear Mar Sara as Zerg.', vespene: 10, hero: 'zergling', test: clear('marsara', 'zerg') },
  { id: 'clear_marsara_protoss', name: 'Shadow of Mar Sara', icon: '🌑', desc: 'Clear Mar Sara as Protoss.', vespene: 10, hero: 'dtemplar', test: clear('marsara', 'protoss') },
  { id: 'clear_char_terran', name: 'Char Survivor', icon: '👁️', desc: 'Clear Char as Terran.', vespene: 15, hero: 'ghost', test: clear('char', 'terran') },
  { id: 'clear_char_zerg', name: 'Queen\'s Favor', icon: '☣️', desc: 'Clear Char as Zerg.', vespene: 15, hero: 'defiler', test: clear('char', 'zerg') },
  { id: 'clear_char_protoss', name: 'Templar of Char', icon: '🌩️', desc: 'Clear Char as Protoss.', vespene: 15, hero: 'htemplar', test: clear('char', 'protoss') },
  { id: 'clear_aiur', name: 'Aiur Reclaimed', icon: '🏛️', desc: 'Clear Aiur.', vespene: 20, test: (r) => r.won && r.zone === 'aiur' },
  { id: 'clear_korhal', name: 'Regime Change', icon: '👑', desc: 'Defeat Emperor Mengsk on Korhal.', vespene: 25, test: (r) => r.won && r.zone === 'korhal' },
  { id: 'clear_ulnar', name: 'Dark God Banished', icon: '🌌', desc: 'Defeat Amon\'s Avatar on Ulnar.', vespene: 40, test: (r) => r.won && r.zone === 'ulnar' },
  { id: 'clear_braxis', name: 'Directorate Broken', icon: '❄️', desc: 'Defeat Admiral DuGalle on Braxis.', vespene: 50, test: (r) => r.won && r.zone === 'braxis' },
  { id: 'clear_shakuras', name: 'Twin Temples', icon: '🌗', desc: 'Defeat the Second Overmind on Shakuras.', vespene: 60, test: (r) => r.won && r.zone === 'shakuras' },
  { id: 'all_races', name: 'Koprulu United', icon: '🤝', desc: 'Clear a zone with all three races.', vespene: 25, test: (_r, c) => Object.values(c).some((rs) => rs.length >= 3) },
  { id: 'hard_clear', name: 'Hardened', icon: '🟧', desc: 'Clear a zone on Hard.', vespene: 15, test: (r) => r.won && r.difficulty >= 1 },
  { id: 'brutal_clear', name: 'Brutal Victory', icon: '🟥', desc: 'Clear a zone on Brutal.', vespene: 30, test: (r) => r.won && r.difficulty >= 2 },
  { id: 'mutated', name: 'Mutation Survivor', icon: '🧫', desc: 'Clear a zone with three mutators.', vespene: 25, test: (r) => r.won && r.mutators >= 3 },
  { id: 'endless_25', name: 'Endless War', icon: '♾️', desc: 'Survive 25 minutes.', vespene: 20, test: (r) => r.time >= 25 * 60 },
];

export const ACH_BY_ID: Record<string, AchievementDef> = Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, a]));
