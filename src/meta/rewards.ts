import { ZONES } from '../data/enemies';
import { mutatorBonus } from '../data/mutators';
import { ACHIEVEMENTS, type AchievementDef } from '../data/achievements';
import { RACES } from '../data/types';
import type { RunResult } from '../game/game';
import { bestRaceXp, perkLevel, persist, pointsEarned, save } from './save';

export interface Rewards {
  lines: [string, number][];
  total: number;
  vespene: number;
  pointsBefore: number;
  pointsAfter: number;
  unlocked: string | null;
  achievements: AchievementDef[];
}

export function grantRewards(r: RunResult): Rewards {
  const rs = save.races[r.race];
  const mins = r.time / 60;
  const lines: [string, number][] = [
    ['Time survived', mins * 13],
    ['Kills', r.kills / 60],
    ['Bosses slain', r.bosses * 20],
  ];
  if (r.won) lines.push(['Zone cleared', 100]);
  const mult = Math.pow(r.zone.tier, 0.7);
  if (mult > 1.01) lines.push([`${r.zone.name} difficulty`, lines.reduce((a, [, v]) => a + v, 0) * (mult - 1)]);
  const mb = mutatorBonus(r.mutators);
  if (mb > 0) lines.push([`Mutators (${r.mutators.length})`, lines.reduce((a, [, v]) => a + v, 0) * mb]);
  const dm = r.difficulty.rewards;
  if (dm > 1.01) lines.push([`${r.difficulty.name} mode`, lines.reduce((a, [, v]) => a + v, 0) * (dm - 1)]);
  const sub = lines.reduce((a, [, v]) => a + v, 0);
  if (perkLevel('veteran') && rs.talentXp < bestRaceXp() && RACES.length > 1) lines.push(["Veteran's Lessons", sub * 0.2]);
  for (const l of lines) l[1] = Math.round(l[1]);
  const total = lines.reduce((a, [, v]) => a + v, 0);
  const pointsBefore = pointsEarned(r.race);
  rs.talentXp += total;
  rs.runs++;
  // at least 1 vespene for any run past a minute, so the rewards loop starts on the first try
  const vespene = Math.max(mins >= 1 ? 1 : 0, Math.round((r.bosses * 2 + (r.won ? 10 : 0) + Math.floor(mins / 3)) * r.difficulty.rewards * (1 + mb)));
  save.vespene += vespene;
  let unlocked: string | null = null;
  const zi = ZONES.findIndex((z) => z.id === r.zone.id);
  if (r.won) {
    rs.wins++;
    if (zi + 1 > rs.zonesCleared) {
      rs.zonesCleared = zi + 1;
      unlocked = ZONES[zi + 1]?.name ?? null;
    }
  }
  rs.bestTimes[r.zone.id] = Math.max(rs.bestTimes[r.zone.id] ?? 0, r.time);
  if (r.won && !(save.clearedBy[r.zone.id] ??= []).includes(r.race)) save.clearedBy[r.zone.id].push(r.race);
  const stats = {
    won: r.won, race: r.race, zone: r.zone.id, time: r.time, kills: r.kills, bosses: r.bosses, elites: r.elites, evolved: r.evolved,
    difficulty: r.difficulty.id, mutators: r.mutators.length, endless: r.endless,
  };
  const achievements = ACHIEVEMENTS.filter((a) => !save.achievements[a.id] && a.test(stats, save.clearedBy));
  for (const a of achievements) {
    save.achievements[a.id] = Date.now();
    save.vespene += a.vespene;
  }
  persist();
  return { lines, total, vespene, pointsBefore, pointsAfter: pointsEarned(r.race), unlocked, achievements };
}
