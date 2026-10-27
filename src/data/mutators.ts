/** SC2 co-op style mutators, picked before a run on cleared zones for bonus rewards. */
export interface MutatorDef {
  id: string;
  name: string;
  icon: string;
  desc: string;
  bonus: number; // added to the reward multiplier
}

export const MUTATORS: MutatorDef[] = [
  { id: 'voidrifts', name: 'Void Rifts', icon: '🌀', desc: 'Void rifts open near you and pour out void shards until destroyed.', bonus: 0.25 },
  { id: 'infested', name: 'Walking Infested', icon: '🪲', desc: 'Slain enemies sometimes burst into broodlings.', bonus: 0.2 },
  { id: 'lava', name: 'Lava Burst', icon: '🌋', desc: 'Lava erupts beneath you every few seconds.', bonus: 0.2 },
  { id: 'justdie', name: 'Just Die!', icon: '💀', desc: 'Enemies revive once at 40% health.', bonus: 0.35 },
  { id: 'speed', name: 'Speed Freaks', icon: '💨', desc: 'Enemies move 30% faster.', bonus: 0.25 },
  { id: 'missiles', name: 'Missile Command', icon: '🚀', desc: 'Missile strikes target your position.', bonus: 0.2 },
  { id: 'power', name: 'Power Overwhelming', icon: '🔷', desc: 'Every enemy has a shield worth 30% of its health.', bonus: 0.3 },
  { id: 'barrier', name: 'Barrier', icon: '🛡️', desc: 'Elites and bosses get a shield worth half their health.', bonus: 0.2 },
];

export const MUTATOR_BY_ID: Record<string, MutatorDef> = Object.fromEntries(MUTATORS.map((m) => [m.id, m]));
export const MAX_MUTATORS = 3;

export function mutatorBonus(ids: string[]): number {
  return ids.reduce((a, id) => a + (MUTATOR_BY_ID[id]?.bonus ?? 0), 0);
}

/** Zone events rolled by the director roughly every 75 seconds. */
export type ZoneEvent = 'overlord' | 'rush' | 'lava' | 'storm' | 'nuke' | 'rift';

export const ZONE_EVENTS: Record<string, ZoneEvent[]> = {
  marsara: ['overlord', 'rush'],
  char: ['lava', 'overlord', 'rush'],
  aiur: ['storm', 'overlord', 'rush'],
  korhal: ['nuke', 'rush', 'overlord'],
  ulnar: ['rift', 'storm', 'nuke'],
};
