/**
 * Spell evolutions, the survivors genre's long-term build goal: a rank-8 spell plus one passive
 * becomes a stronger named version. Offered as a Legendary card once both are owned.
 */
export interface EvolutionDef {
  spell: string;
  passive: string; // PassiveDef id
  name: string;
  icon: string;
  desc: string;
  /** Multipliers (damage, area, cooldown, duration) and flat adds (count, pierce). */
  mult?: { damage?: number; area?: number; cooldown?: number; duration?: number };
  add?: { count?: number; pierce?: number };
  /** Behaviour change read by the spell code. ring: cones hit all around the hero. */
  effect?: 'ring';
}

export const EVOLUTIONS: EvolutionDef[] = [
  // Alliance
  { spell: 'gauss', passive: 'p_crit', name: 'Arcane Barrage', icon: '🔫', desc: 'A piercing fan of missiles: +3 projectiles, +2 pierce, +30% damage.', mult: { damage: 1.3 }, add: { count: 3, pierce: 2 } },
  { spell: 'frag', passive: 'p_area', name: 'Dwarven Artillery', icon: '💣', desc: '+3 shells and 30% bigger blasts.', mult: { area: 1.3 }, add: { count: 3 } },
  { spell: 'flame', passive: 'p_dur', name: 'Inferno', icon: '🔥', desc: 'Fire erupts all around you, +40% damage.', mult: { damage: 1.4 }, effect: 'ring' },
  { spell: 'mines', passive: 'p_haste', name: 'Goblin Sapper Charges', icon: '🕷️', desc: '+2 mines, +60% damage, 40% bigger blasts.', mult: { damage: 1.6, area: 1.4 }, add: { count: 2 } },
  { spell: 'yamato', passive: 'p_critm', name: 'Thunder Hammers', icon: '☄️', desc: '+2 hammers and +30% damage.', mult: { damage: 1.3 }, add: { count: 2 } },
  { spell: 'turret', passive: 'p_armor', name: 'Sea Giant', icon: '🗼', desc: '+1 elemental, double damage, fire 30% faster.', mult: { damage: 2, cooldown: 0.7 }, add: { count: 1 } },
  { spell: 'matrix', passive: 'p_hp', name: 'Guardian of Light', icon: '🛡️', desc: 'Double barrier strength, recharges 40% faster.', mult: { damage: 2, cooldown: 0.6 } },
  { spell: 'emp', passive: 'p_pick', name: 'Avatar Clap', icon: '🌀', desc: '+60% damage, 30% bigger, recharges 30% faster.', mult: { damage: 1.6, area: 1.3, cooldown: 0.7 } },
  { spell: 'irradiate', passive: 'p_regen', name: 'Frozen Wastes', icon: '☢️', desc: '+2 storms, last 50% longer, +40% damage.', mult: { damage: 1.4, duration: 1.5 }, add: { count: 2 } },
  // Scourge
  { spell: 'spines', passive: 'p_crit', name: 'Coil of Ner\'zhul', icon: '🦔', desc: '+1 coil, +4 pierce, +40% damage.', mult: { damage: 1.4 }, add: { count: 1, pierce: 4 } },
  { spell: 'spores', passive: 'p_regen', name: 'Plague of Stratholme', icon: '🦠', desc: '50% bigger cloud, +50% damage.', mult: { damage: 1.5, area: 1.5 } },
  { spell: 'bile', passive: 'p_area', name: 'Corpse Barrage', icon: '🟢', desc: '+3 corpses and 30% bigger splashes.', mult: { area: 1.3 }, add: { count: 3 } },
  { spell: 'brood', passive: 'p_luck', name: 'Nerubian Brood', icon: '🪲', desc: '+3 beetles, +60% damage.', mult: { damage: 1.6 }, add: { count: 3 } },
  { spell: 'scourge', passive: 'p_speed', name: 'Plague of Locusts', icon: '🦇', desc: '+3 locusts, +40% damage.', mult: { damage: 1.4 }, add: { count: 3 } },
  { spell: 'acidpool', passive: 'p_dur', name: 'The Blight', icon: '🟣', desc: '30% bigger, lasts 60% longer, +40% damage.', mult: { damage: 1.4, area: 1.3, duration: 1.6 } },
  { spell: 'spinenova', passive: 'p_armor', name: 'Breath of Sapphiron', icon: '🌵', desc: '+60% damage, 30% bigger, 30% faster.', mult: { damage: 1.6, area: 1.3, cooldown: 0.7 } },
  { spell: 'lurker', passive: 'p_critm', name: 'Anub\'arak\'s Wrath', icon: '🦂', desc: '+2 spike lines, +40% damage.', mult: { damage: 1.4 }, add: { count: 2 } },
  { spell: 'glaive', passive: 'p_haste', name: 'Endless Carrion', icon: '🪃', desc: '+2 swarms, +4 bounces.', add: { count: 2, pierce: 4 } },
  // Horde
  { spell: 'blades', passive: 'p_critm', name: 'Whirlwind', icon: '⚔️', desc: 'Blades sweep all around you, +50% damage.', mult: { damage: 1.5, area: 1.15 }, effect: 'ring' },
  { spell: 'photon', passive: 'p_crit', name: 'Berserker Spears', icon: '🔷', desc: '+2 spears, +2 pierce, +30% damage.', mult: { damage: 1.3 }, add: { count: 2, pierce: 2 } },
  { spell: 'storm', passive: 'p_dur', name: 'Cataclysm', icon: '🌩️', desc: '+2 quakes that last 50% longer.', mult: { duration: 1.5 }, add: { count: 2 } },
  { spell: 'interceptors', passive: 'p_shield', name: 'Mirror Image', icon: '🛸', desc: '+4 blades, +40% damage.', mult: { damage: 1.4 }, add: { count: 4 } },
  { spell: 'arc', passive: 'p_haste', name: 'Storm of the Elements', icon: '⚡', desc: '+1 bolt, +4 bounces, +30% damage.', mult: { damage: 1.3 }, add: { count: 1, pierce: 4 } },
  { spell: 'prism', passive: 'p_area', name: 'Kodo Stampede', icon: '🔆', desc: '+2 waves, 60% wider.', mult: { area: 1.6 }, add: { count: 2 } },
  { spell: 'purnova', passive: 'p_hp', name: 'Earthbreaker', icon: '💠', desc: '+80% damage, recharges 30% faster.', mult: { damage: 1.8, cooldown: 0.7 } },
  { spell: 'scarab', passive: 'p_luck', name: 'Siege Barrage', icon: '🎯', desc: '+3 boulders, 30% bigger blasts.', mult: { area: 1.3 }, add: { count: 3 } },
  { spell: 'psiaura', passive: 'p_regen', name: 'Burning Oil', icon: '🔮', desc: '40% bigger aura, +60% damage.', mult: { damage: 1.6, area: 1.4 } },
];

export const EVO_BY_SPELL: Record<string, EvolutionDef> = Object.fromEntries(EVOLUTIONS.map((e) => [e.spell, e]));
