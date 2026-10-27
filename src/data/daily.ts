import { ZONES } from './enemies';
import { MUTATORS } from './mutators';
import { RACES, type RaceId } from './types';

/** Today's challenge: the same race, zone and two mutators for everyone, picked from the date. */
export interface DailyDef {
  date: string; // YYYY-MM-DD, local time
  race: RaceId;
  zone: string;
  mutators: string[];
}

export function todayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function dailyFor(date = todayKey()): DailyDef {
  let h = 2166136261;
  for (let i = 0; i < date.length; i++) h = Math.imul(h ^ date.charCodeAt(i), 16777619);
  const rnd = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const race = RACES[Math.floor(rnd() * RACES.length)];
  // the first two zones, so a new account can play it too
  const zone = ZONES[Math.floor(rnd() * 2)].id;
  const pool = MUTATORS.map((m) => m.id);
  const mutators: string[] = [];
  while (mutators.length < 2) {
    const id = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    mutators.push(id);
  }
  return { date, race, zone, mutators };
}
