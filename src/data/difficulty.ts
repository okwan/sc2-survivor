/** Per-run difficulty, chosen on the zone screen once a zone has been cleared (like Azeroth Survivors). */
export interface DifficultyDef {
  id: number;
  name: string;
  desc: string;
  color: string;
  hp: number; // enemy and boss health
  dmg: number; // enemy and boss damage
  spawn: number; // spawn rate
  rewards: number; // talent XP and vespene
  luck: number; // added to luck for gear and cache rolls
}

export const DIFFICULTIES: DifficultyDef[] = [
  { id: 0, name: 'Normal', desc: 'The standard campaign.', color: '#dfe8f2', hp: 1, dmg: 1, spawn: 1, rewards: 1, luck: 0 },
  { id: 1, name: 'Hard', desc: 'Tougher, hungrier swarms. +50% rewards, better gear.', color: '#ffb84d', hp: 1.6, dmg: 1.3, spawn: 1.15, rewards: 1.5, luck: 0.3 },
  { id: 2, name: 'Brutal', desc: 'For veterans. Double rewards, best gear.', color: '#ff5050', hp: 2.5, dmg: 1.6, spawn: 1.3, rewards: 2.2, luck: 0.6 },
];
