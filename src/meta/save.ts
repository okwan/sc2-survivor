import type { GearItem, GearSlot } from '../data/items';
import { PERKS, gearScore } from '../data/items';
import { TALENTS, TALENT_CAP, talentXpForPoint, type TalentNode } from '../data/talents';
import { RACES, addMods, addSpellMod, type RaceId, type SpellMod, type StatMods } from '../data/types';

export interface RaceSave {
  talentXp: number; // total ever earned
  talents: Record<string, number>;
  gear: Partial<Record<GearSlot, GearItem>>;
  stash: GearItem[];
  zonesCleared: number; // number of zones beaten (unlocks next)
  bestTimes: Record<string, number>;
  runs: number;
  wins: number;
}

export interface Settings {
  volume: number;
  damageNumbers: boolean;
  screenShake: boolean;
  zoom: number;
}

export interface SaveData {
  version: 1;
  races: Record<RaceId, RaceSave>;
  vespene: number;
  perks: Record<string, number>;
  settings: Settings;
  lastRace: RaceId;
  lastZone: string;
}

const KEY = 'sc2-survivor-save-v1';

function freshRace(): RaceSave {
  return { talentXp: 0, talents: {}, gear: {}, stash: [], zonesCleared: 0, bestTimes: {}, runs: 0, wins: 0 };
}

function fresh(): SaveData {
  return {
    version: 1,
    races: { terran: freshRace(), zerg: freshRace(), protoss: freshRace() },
    vespene: 0,
    perks: {},
    settings: { volume: 0.5, damageNumbers: true, screenShake: true, zoom: 1 },
    lastRace: 'terran',
    lastZone: 'marsara',
  };
}

export let save: SaveData = load();

function load(): SaveData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return fresh();
    const data = JSON.parse(raw) as SaveData;
    const f = fresh();
    for (const r of RACES) data.races[r] = { ...freshRace(), ...(data.races?.[r] ?? {}) };
    data.settings = { ...f.settings, ...(data.settings ?? {}) };
    data.perks ??= {};
    data.vespene ??= 0;
    return data;
  } catch {
    return fresh();
  }
}

export function persist() {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
  } catch {
    /* storage unavailable: progress lives for this session only */
  }
}

export function resetSave() {
  save = fresh();
  persist();
}

// ------------------------------------------------------------ talents
export function pointsEarned(race: RaceId): number {
  let xp = save.races[race].talentXp;
  let n = 0;
  while (n < TALENT_CAP && xp >= talentXpForPoint(n)) {
    xp -= talentXpForPoint(n);
    n++;
  }
  return n;
}

/** XP progress toward the next point: [have, need]. */
export function nextPointProgress(race: RaceId): [number, number] {
  let xp = save.races[race].talentXp;
  let n = 0;
  while (n < TALENT_CAP && xp >= talentXpForPoint(n)) {
    xp -= talentXpForPoint(n);
    n++;
  }
  return n >= TALENT_CAP ? [1, 1] : [xp, talentXpForPoint(n)];
}

export function pointsSpent(race: RaceId, treeId?: string): number {
  const t = save.races[race].talents;
  let sum = 0;
  for (const k in t) if (!treeId || k.startsWith(treeId + '.')) sum += t[k];
  return sum;
}

export function findNode(race: RaceId, id: string): TalentNode | undefined {
  for (const tr of TALENTS[race]) for (const n of tr.nodes) if (n.id === id) return n;
  return undefined;
}

export function canLearn(race: RaceId, node: TalentNode): boolean {
  const t = save.races[race].talents;
  const rank = t[node.id] ?? 0;
  if (rank >= node.maxRank) return false;
  if (pointsSpent(race) >= pointsEarned(race)) return false;
  const treeId = node.id.split('.')[0];
  if (pointsSpent(race, treeId) < node.row * 5) return false;
  if (node.requires) {
    const req = findNode(race, node.requires);
    if (req && (t[req.id] ?? 0) < req.maxRank) return false;
  }
  return true;
}

export function learn(race: RaceId, node: TalentNode) {
  if (!canLearn(race, node)) return;
  const t = save.races[race].talents;
  t[node.id] = (t[node.id] ?? 0) + 1;
  persist();
}

export function respec(race: RaceId) {
  save.races[race].talents = {};
  persist();
}

export interface TalentBonuses {
  stats: StatMods;
  spells: Record<string, SpellMod>;
  flags: Set<string>;
  startSpell?: string;
}

export function talentBonuses(race: RaceId): TalentBonuses {
  const out: TalentBonuses = { stats: {}, spells: {}, flags: new Set() };
  const t = save.races[race].talents;
  for (const tr of TALENTS[race]) {
    for (const n of tr.nodes) {
      const r = t[n.id] ?? 0;
      if (!r) continue;
      if (n.stats) addMods(out.stats, n.stats, r);
      if (n.spells) for (const id in n.spells) addSpellMod(out.spells, id, n.spells[id], r);
      if (n.flag) out.flags.add(n.flag);
      if (n.startSpell) out.startSpell = n.startSpell;
    }
  }
  return out;
}

// ------------------------------------------------------------ perks & gear
export function perkLevel(id: string): number {
  return save.perks[id] ?? 0;
}

export function perkStats(): StatMods {
  const out: StatMods = {};
  for (const p of PERKS) {
    const lv = perkLevel(p.id);
    if (lv && p.stats) addMods(out, p.stats, lv);
  }
  return out;
}

export function gearStats(race: RaceId): StatMods {
  const out: StatMods = {};
  const g = save.races[race].gear;
  for (const k in g) {
    const item = g[k as GearSlot];
    if (item) addMods(out, item.stats);
  }
  return out;
}

export function equip(race: RaceId, item: GearItem) {
  const r = save.races[race];
  const prev = r.gear[item.slot];
  r.stash = r.stash.filter((s) => s.uid !== item.uid);
  if (prev) r.stash.unshift(prev);
  r.gear[item.slot] = item;
  const scrapped = trimStash(r.stash);
  persist();
  return scrapped;
}

export const STASH_MAX = 40;

/** Keeps the stash at its limit by scrapping the weakest items; returns what was scrapped. */
function trimStash(stash: GearItem[]): GearItem[] {
  const out: GearItem[] = [];
  while (stash.length > STASH_MAX) {
    let w = 0;
    for (let i = 1; i < stash.length; i++) if (gearScore(stash[i]) < gearScore(stash[w])) w = i;
    out.push(...stash.splice(w, 1));
  }
  return out;
}

export function stashItem(race: RaceId, item: GearItem) {
  const r = save.races[race];
  r.stash.unshift(item);
  const scrapped = trimStash(r.stash);
  persist();
  return scrapped;
}

export function bestRaceXp(): number {
  return Math.max(...RACES.map((r) => save.races[r].talentXp));
}
