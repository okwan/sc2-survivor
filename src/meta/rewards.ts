import { ZONES } from '../data/enemies';
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
  const sub = lines.reduce((a, [, v]) => a + v, 0);
  if (perkLevel('veteran') && rs.talentXp < bestRaceXp() && RACES.length > 1) lines.push(["Veteran's Lessons", sub * 0.2]);
  for (const l of lines) l[1] = Math.round(l[1]);
  const total = lines.reduce((a, [, v]) => a + v, 0);
  const pointsBefore = pointsEarned(r.race);
  rs.talentXp += total;
  rs.runs++;
  // at least 1 vespene for any run past a minute, so the rewards loop starts on the first try
  const vespene = Math.max(mins >= 1 ? 1 : 0, r.bosses * 2 + (r.won ? 10 : 0) + Math.floor(mins / 3));
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
  persist();
  return { lines, total, vespene, pointsBefore, pointsAfter: pointsEarned(r.race), unlocked };
}
