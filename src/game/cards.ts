import { spellIcon } from '../bw/ui';
import { PASSIVES, type PassiveDef } from '../data/items';
import { MAX_RANK, MAX_SPELLS, SPELLS, SPELL_BY_ID, SPELL_STAT_LABELS, spellStatsAtRank, type SpellDef, type SpellStats } from '../data/spells';
import { RARITY_MULT, fmtStat, type Rarity } from '../data/types';
import type { Game } from './game';

export type Card =
  | { kind: 'spell'; id: string; def: SpellDef; rarity: Rarity; key: string }
  | { kind: 'upgrade'; id: string; def: SpellDef; rarity: Rarity; key: string }
  | { kind: 'mastery'; id: string; def: SpellDef; rarity: Rarity; key: string }
  | { kind: 'passive'; id: string; def: PassiveDef; rarity: Rarity; key: string }
  | { kind: 'fallback'; id: 'minerals' | 'heal'; rarity: Rarity; key: string };

/** Extra damage on a spell from the card's rarity. */
export const RARITY_SPELL_BONUS = [0, 0.1, 0.2, 0.35, 0.5];

/** Late game: a maxed spell can take this many mastery cards. */
export const MAX_MASTERY = 5;
const MASTERY_DAMAGE = 0.15;

export function rollRarity(luck: number): Rarity {
  const w = [62, 24, 10, 3.4, 0.9];
  for (let i = 1; i < 5; i++) w[i] *= 1 + luck * (1 + i * 0.6);
  const total = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < 5; i++) {
    r -= w[i];
    if (r <= 0) return i as Rarity;
  }
  return 0;
}

export function dealCards(g: Game, n: number): Card[] {
  const owned = new Map(g.spells.map((s) => [s.def.id, s]));
  const pool: { key: string; w: number; make: (r: Rarity) => Card }[] = [];
  for (const def of SPELLS) {
    if (def.race !== g.race.id) continue;
    const key = `spell:${def.id}`;
    if (g.banished.has(key)) continue;
    const s = owned.get(def.id);
    if (s) {
      if (s.rank < MAX_RANK) pool.push({ key, w: 1.5, make: (r) => ({ kind: 'upgrade', id: def.id, def, rarity: r, key }) });
      else if ((s.mastery ?? 0) < MAX_MASTERY) pool.push({ key, w: 1.0, make: (r) => ({ kind: 'mastery', id: def.id, def, rarity: r, key }) });
    } else if (g.spells.length < MAX_SPELLS) {
      pool.push({ key, w: g.spells.length < 3 ? 1.6 : 1.0, make: (r) => ({ kind: 'spell', id: def.id, def, rarity: r, key }) });
    }
  }
  for (const def of PASSIVES) {
    const key = `passive:${def.id}`;
    if (g.banished.has(key)) continue;
    if ((g.passivePicks[def.id] ?? 0) >= def.maxPicks) continue;
    if (def.stat === 'maxShield' && g.race.id !== 'protoss') continue;
    pool.push({ key, w: def.minRarity ? 0.25 : 0.55, make: (r) => ({ kind: 'passive', id: def.id, def, rarity: Math.max(r, def.minRarity ?? 0) as Rarity, key }) });
  }
  const out: Card[] = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((a, p) => a + p.w, 0);
    let r = Math.random() * total;
    let idx = 0;
    for (; idx < pool.length - 1; idx++) {
      r -= pool[idx].w;
      if (r <= 0) break;
    }
    const pick = pool.splice(idx, 1)[0];
    out.push(pick.make(rollRarity(g.stats.luck)));
  }
  if (out.length < n) out.push({ kind: 'fallback', id: 'heal', rarity: 0, key: 'heal' });
  if (out.length < n) out.push({ kind: 'fallback', id: 'minerals', rarity: 0, key: 'minerals' });
  return out;
}

export interface CardView {
  title: string;
  icon: string;
  type: string;
  lines: string[];
  desc: string;
}

function fmtNum(k: keyof SpellStats, v: number): string {
  if (k === 'cooldown' || k === 'duration') return `${Math.round(v * 100) / 100}s`;
  return `${Math.round(v)}`;
}

export function describeCard(g: Game, c: Card): CardView {
  switch (c.kind) {
    case 'spell': {
      const st = spellStatsAtRank(c.def, 1);
      const lines = [`Damage ${Math.round(st.damage * (1 + RARITY_SPELL_BONUS[c.rarity]))}`];
      if (c.def.kind !== 'orbit' && c.def.kind !== 'aura') lines.push(`Cooldown ${fmtNum('cooldown', st.cooldown)}`);
      if (c.rarity > 0) lines.push(`+${Math.round(RARITY_SPELL_BONUS[c.rarity] * 100)}% spell damage`);
      return { title: c.def.name, icon: spellIcon(c.def.id, c.def.icon), type: 'New Spell', lines, desc: c.def.desc };
    }
    case 'upgrade': {
      const s = g.spells.find((x) => x.def.id === c.id)!;
      const ranks = c.rarity >= 4 ? 2 : 1;
      const to = Math.min(MAX_RANK, s.rank + ranks);
      const a = spellStatsAtRank(c.def, s.rank);
      const b = spellStatsAtRank(c.def, to);
      const lines: string[] = [];
      for (const k of Object.keys(SPELL_STAT_LABELS) as (keyof SpellStats)[]) {
        if (Math.abs(a[k] - b[k]) > 1e-6) lines.push(`${SPELL_STAT_LABELS[k]} ${fmtNum(k, a[k])} → ${fmtNum(k, b[k])}`);
      }
      if (c.rarity > 0) lines.push(`+${Math.round(RARITY_SPELL_BONUS[c.rarity] * 100)}% spell damage`);
      return { title: c.def.name, icon: spellIcon(c.def.id, c.def.icon), type: `Rank ${s.rank} → ${to}`, lines, desc: c.def.desc };
    }
    case 'mastery': {
      const s = g.spells.find((x) => x.def.id === c.id)!;
      const b = MASTERY_DAMAGE + RARITY_SPELL_BONUS[c.rarity];
      return {
        title: c.def.name,
        icon: spellIcon(c.def.id, c.def.icon),
        type: `Mastery ${(s.mastery ?? 0) + 1} of ${MAX_MASTERY}`,
        lines: [`+${Math.round(b * 100)}% damage`, '+5% area', '+4% cooldown speed'],
        desc: 'This spell is at max rank. Masteries keep making it stronger.',
      };
    }
    case 'passive': {
      const v = c.def.noScale ? c.def.value : c.def.value * RARITY_MULT[c.rarity];
      const picks = g.passivePicks[c.def.id] ?? 0;
      return { title: c.def.name, icon: c.def.icon, type: `Passive · picked ${picks} of ${c.def.maxPicks}`, lines: [fmtStat(c.def.stat, v)], desc: '' };
    }
    case 'fallback':
      return c.id === 'heal'
        ? { title: 'Field Repair', icon: '🩹', type: 'Supply', lines: ['Restore 30% health'], desc: '' }
        : { title: 'Mineral Drop', icon: '💎', type: 'Supply', lines: ['+50 minerals'], desc: '' };
  }
}

export function applyCard(g: Game, c: Card) {
  switch (c.kind) {
    case 'spell':
      g.learnSpell(c.id, RARITY_SPELL_BONUS[c.rarity]);
      break;
    case 'upgrade': {
      const s = g.spells.find((x) => x.def.id === c.id)!;
      s.rank = Math.min(MAX_RANK, s.rank + (c.rarity >= 4 ? 2 : 1));
      s.bonus += RARITY_SPELL_BONUS[c.rarity];
      g.recomputeStats();
      break;
    }
    case 'mastery': {
      const s = g.spells.find((x) => x.def.id === c.id)!;
      s.mastery = (s.mastery ?? 0) + 1;
      s.bonus += MASTERY_DAMAGE + RARITY_SPELL_BONUS[c.rarity];
      g.recomputeStats();
      break;
    }
    case 'passive': {
      const v = c.def.noScale ? c.def.value : c.def.value * RARITY_MULT[c.rarity];
      g.passiveMods[c.def.stat] = (g.passiveMods[c.def.stat] ?? 0) + v;
      g.passivePicks[c.def.id] = (g.passivePicks[c.def.id] ?? 0) + 1;
      const hpBefore = g.stats.maxHp;
      g.recomputeStats();
      if (c.def.stat === 'maxHp') g.player.hp += g.stats.maxHp - hpBefore;
      break;
    }
    case 'fallback':
      if (c.id === 'heal') g.heal(g.stats.maxHp * 0.3);
      else g.player.minerals += 50;
      break;
  }
}

export { SPELL_BY_ID };
