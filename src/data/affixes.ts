/** Elite modifiers, rolled when an elite spawns (like Diablo or Azeroth Survivors' champion packs). */
export type AffixId = 'shielded' | 'hasted' | 'vampiric' | 'splitter' | 'volatile' | 'cloaked';

export interface AffixDef {
  id: AffixId;
  name: string;
  color: number; // sprite tint for the elite
  desc: string;
}

export const AFFIXES: AffixDef[] = [
  { id: 'shielded', name: 'Shielded', color: 0x8ad8ff, desc: 'A plasma shield soaks the first half of its health in damage.' },
  { id: 'hasted', name: 'Hasted', color: 0xfff080, desc: 'Moves 60% faster.' },
  { id: 'vampiric', name: 'Vampiric', color: 0xff6a80, desc: 'Heals when it hits you.' },
  { id: 'splitter', name: 'Brood', color: 0xd8a060, desc: 'Bursts into broodlings when killed.' },
  { id: 'volatile', name: 'Volatile', color: 0xb0ff60, desc: 'Leaves a bursting acid pool when killed.' },
  { id: 'cloaked', name: 'Cloaked', color: 0xc0c8ff, desc: 'Can only be targeted from close range.' },
];

export const AFFIX_BY_ID = Object.fromEntries(AFFIXES.map((a) => [a.id, a])) as Record<AffixId, AffixDef>;
