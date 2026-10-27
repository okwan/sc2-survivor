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
  // Terran
  { spell: 'gauss', passive: 'p_crit', name: 'Hammer of Raynor', icon: '🔫', desc: 'A piercing flechette fan: +3 projectiles, +2 pierce, +30% damage.', mult: { damage: 1.3 }, add: { count: 3, pierce: 2 } },
  { spell: 'frag', passive: 'p_area', name: 'Cluster Barrage', icon: '💣', desc: '+3 grenades and 30% bigger blasts.', mult: { area: 1.3 }, add: { count: 3 } },
  { spell: 'flame', passive: 'p_dur', name: 'Hellbat Inferno', icon: '🔥', desc: 'Fire erupts all around you, +40% damage.', mult: { damage: 1.4 }, effect: 'ring' },
  { spell: 'mines', passive: 'p_haste', name: 'Widow Mines', icon: '🕷️', desc: '+2 mines, +60% damage, 40% bigger blasts.', mult: { damage: 1.6, area: 1.4 }, add: { count: 2 } },
  { spell: 'yamato', passive: 'p_critm', name: 'Hyperion Broadside', icon: '☄️', desc: '+2 beams and +30% damage.', mult: { damage: 1.3 }, add: { count: 2 } },
  { spell: 'turret', passive: 'p_armor', name: 'Planetary Fortress', icon: '🗼', desc: '+1 turret, double damage, fire 30% faster.', mult: { damage: 2, cooldown: 0.7 }, add: { count: 1 } },
  { spell: 'matrix', passive: 'p_hp', name: 'Matrix Mk II', icon: '🛡️', desc: 'Double barrier strength, recharges 40% faster.', mult: { damage: 2, cooldown: 0.6 } },
  { spell: 'emp', passive: 'p_pick', name: 'Shockwave Array', icon: '🌀', desc: '+60% damage, 30% bigger, recharges 30% faster.', mult: { damage: 1.6, area: 1.3, cooldown: 0.7 } },
  { spell: 'irradiate', passive: 'p_regen', name: 'Fallout', icon: '☢️', desc: '+2 zones, last 50% longer, +40% damage.', mult: { damage: 1.4, duration: 1.5 }, add: { count: 2 } },
  // Zerg
  { spell: 'spines', passive: 'p_crit', name: 'Impaler Spines', icon: '🦔', desc: '+1 spine, +4 pierce, +40% damage.', mult: { damage: 1.4 }, add: { count: 1, pierce: 4 } },
  { spell: 'spores', passive: 'p_regen', name: 'Virophage', icon: '🦠', desc: '50% bigger cloud, +50% damage.', mult: { damage: 1.5, area: 1.5 } },
  { spell: 'bile', passive: 'p_area', name: 'Bile Barrage', icon: '🟢', desc: '+3 globs and 30% bigger splashes.', mult: { area: 1.3 }, add: { count: 3 } },
  { spell: 'brood', passive: 'p_luck', name: 'Brood Lord', icon: '🪲', desc: '+3 broodlings, +60% damage.', mult: { damage: 1.6 }, add: { count: 3 } },
  { spell: 'scourge', passive: 'p_speed', name: 'Scourge Storm', icon: '🦇', desc: '+3 scourge, +40% damage.', mult: { damage: 1.4 }, add: { count: 3 } },
  { spell: 'acidpool', passive: 'p_dur', name: 'Living Creep', icon: '🟣', desc: '30% bigger, lasts 60% longer, +40% damage.', mult: { damage: 1.4, area: 1.3, duration: 1.6 } },
  { spell: 'spinenova', passive: 'p_armor', name: 'Spine Crawler Field', icon: '🌵', desc: '+60% damage, 30% bigger, 30% faster.', mult: { damage: 1.6, area: 1.3, cooldown: 0.7 } },
  { spell: 'lurker', passive: 'p_critm', name: 'Devouring Ones', icon: '🦂', desc: '+2 spine lines, +40% damage.', mult: { damage: 1.4 }, add: { count: 2 } },
  { spell: 'glaive', passive: 'p_haste', name: 'Glaive Swarm', icon: '🪃', desc: '+2 glaives, +4 bounces.', add: { count: 2, pierce: 4 } },
  // Protoss
  { spell: 'blades', passive: 'p_critm', name: 'Warp Blades', icon: '⚔️', desc: 'Blades sweep all around you, +50% damage.', mult: { damage: 1.5, area: 1.15 }, effect: 'ring' },
  { spell: 'photon', passive: 'p_crit', name: 'Phase Disruptor', icon: '🔷', desc: '+2 bolts, +2 pierce, +30% damage.', mult: { damage: 1.3 }, add: { count: 2, pierce: 2 } },
  { spell: 'storm', passive: 'p_dur', name: 'Tempest of Aiur', icon: '🌩️', desc: '+2 storms that last 50% longer.', mult: { duration: 1.5 }, add: { count: 2 } },
  { spell: 'interceptors', passive: 'p_shield', name: 'Carrier Bay', icon: '🛸', desc: '+4 interceptors, +40% damage.', mult: { damage: 1.4 }, add: { count: 4 } },
  { spell: 'arc', passive: 'p_haste', name: 'Archon Lightning', icon: '⚡', desc: '+1 bolt, +4 bounces, +30% damage.', mult: { damage: 1.3 }, add: { count: 1, pierce: 4 } },
  { spell: 'prism', passive: 'p_area', name: 'Void Ray Lance', icon: '🔆', desc: '+2 beams, 60% wider.', mult: { area: 1.6 }, add: { count: 2 } },
  { spell: 'purnova', passive: 'p_hp', name: 'Purifier Pulse', icon: '💠', desc: '+80% damage, recharges 30% faster.', mult: { damage: 1.8, cooldown: 0.7 } },
  { spell: 'scarab', passive: 'p_luck', name: 'Reaver Bay', icon: '🎯', desc: '+3 scarabs, 30% bigger blasts.', mult: { area: 1.3 }, add: { count: 3 } },
  { spell: 'psiaura', passive: 'p_regen', name: 'Khaydarin Aura', icon: '🔮', desc: '40% bigger aura, +60% damage.', mult: { damage: 1.6, area: 1.4 } },
];

export const EVO_BY_SPELL: Record<string, EvolutionDef> = Object.fromEntries(EVOLUTIONS.map((e) => [e.spell, e]));
