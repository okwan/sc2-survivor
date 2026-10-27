import type { RaceId, SpellMod, StatMods } from './types';

export interface TalentNode {
  id: string;
  name: string;
  desc: string;
  maxRank: number;
  row: number; // requires row*5 points spent in the tree
  col: number; // 0..3 for layout
  stats?: StatMods; // per rank
  spells?: Record<string, SpellMod>; // per rank
  flag?: string; // milestone hook used by game code
  startSpell?: string; // capstones replace the starting spell
  requires?: string; // another node id that must be maxed
  milestone?: 10 | 20 | 30;
}

export interface TalentTree {
  id: string;
  name: string;
  icon: string;
  blurb: string;
  nodes: TalentNode[];
}

export const TALENT_CAP = 51;

function tree(id: string, name: string, icon: string, blurb: string, nodes: Omit<TalentNode, 'id'>[]): TalentTree {
  return { id, name, icon, blurb, nodes: nodes.map((n, i) => ({ ...n, id: `${id}.${i}` })) };
}

/** Wire milestone requirement chain (20 needs 10, 30 needs 20). */
function chain(t: TalentTree): TalentTree {
  const m10 = t.nodes.find((n) => n.milestone === 10);
  const m20 = t.nodes.find((n) => n.milestone === 20);
  const m30 = t.nodes.find((n) => n.milestone === 30);
  if (m20 && m10) m20.requires = m10.id;
  if (m30 && m20) m30.requires = m20.id;
  return t;
}

export const TALENTS: Record<RaceId, TalentTree[]> = {
  terran: [
    chain(tree('infantry', 'Infantry', '🎖️', 'Marines and rapid fire. Hold the line with overwhelming bullets.', [
      { name: 'U-238 Shells', desc: 'Gauss Rifle deals 6% more damage per rank.', maxRank: 5, row: 0, col: 0, spells: { gauss: { damage: 0.06 } } },
      { name: 'Combat Drills', desc: '+2% damage per rank.', maxRank: 5, row: 0, col: 2, stats: { damage: 0.02 } },
      { name: 'Rapid Reload', desc: 'Gauss Rifle cooldown 4% shorter per rank.', maxRank: 3, row: 1, col: 0, spells: { gauss: { cooldown: 0.04 } } },
      { name: 'Combat Shield', desc: '+8 max health per rank.', maxRank: 5, row: 1, col: 2, stats: { maxHp: 8 } },
      { name: 'Stimpack', desc: 'Milestone. Every 12 sec, stim for 4 sec: +40% cooldown speed and +30% move speed.', maxRank: 1, row: 2, col: 1, flag: 'stimpack', milestone: 10 },
      { name: 'Target Acquisition', desc: '+2% crit chance per rank.', maxRank: 5, row: 2, col: 3, stats: { critChance: 0.02 } },
      { name: 'Field Medic', desc: '+0.3 health regen per rank.', maxRank: 3, row: 3, col: 0, stats: { hpRegen: 0.3 } },
      { name: 'Kinetic Rounds', desc: 'Projectile speed +5% and Auto-Turret damage +6% per rank.', maxRank: 5, row: 3, col: 2, stats: { projSpeed: 0.05 }, spells: { turret: { damage: 0.06 } } },
      { name: 'Focused Fire', desc: 'Milestone. Gauss Rifle fires 1 extra spike and pierces 1 more enemy.', maxRank: 1, row: 4, col: 1, spells: { gauss: { count: 1, pierce: 1 } }, milestone: 20 },
      { name: 'Veteran', desc: '+3% cooldown speed per rank.', maxRank: 3, row: 4, col: 3, stats: { haste: 0.03 } },
      { name: 'Hold the Line', desc: '+1 armor per rank.', maxRank: 5, row: 5, col: 1, stats: { armor: 1 } },
      { name: 'Raynor\'s Raiders', desc: 'Capstone. Gauss Rifle fires 2 extra spikes and deals 30% more damage. Stimpack lasts 2 sec longer.', maxRank: 1, row: 6, col: 1, startSpell: 'gauss', flag: 'raiders', spells: { gauss: { count: 2, damage: 0.3 } }, milestone: 30 },
    ])),
    chain(tree('mech', 'Mech', '⚙️', 'Fire, explosives and heavy armor. Burn the swarm down.', [
      { name: 'Infernal Pre-Igniter', desc: 'Flamethrower deals 6% more damage per rank.', maxRank: 5, row: 0, col: 0, spells: { flame: { damage: 0.06 } } },
      { name: 'Vehicle Plating', desc: '+1 armor per rank.', maxRank: 5, row: 0, col: 2, stats: { armor: 1 } },
      { name: 'Wide Nozzle', desc: 'Flamethrower and Frag Grenade area +6% per rank.', maxRank: 3, row: 1, col: 0, spells: { flame: { area: 0.06 }, frag: { area: 0.06 } } },
      { name: 'High Explosives', desc: 'Frag Grenade and Spider Mines deal 6% more damage per rank.', maxRank: 5, row: 1, col: 2, spells: { frag: { damage: 0.06 }, mines: { damage: 0.06 } } },
      { name: 'Napalm', desc: 'Milestone. Fire spells set enemies ablaze for 60% of the hit over 3 sec.', maxRank: 1, row: 2, col: 1, flag: 'napalm', milestone: 10 },
      { name: 'Reinforced Hull', desc: '+10 max health per rank.', maxRank: 5, row: 2, col: 3, stats: { maxHp: 10 } },
      { name: 'Smart Servos', desc: '+4% move speed per rank.', maxRank: 3, row: 3, col: 0, stats: { moveSpeed: 8 } },
      { name: 'Payload', desc: '+3% area per rank.', maxRank: 5, row: 3, col: 2, stats: { area: 0.03 } },
      { name: 'Siege Tech', desc: 'Milestone. Frag Grenade throws 1 extra grenade with 25% more area.', maxRank: 1, row: 4, col: 1, spells: { frag: { count: 1, area: 0.25 } }, milestone: 20 },
      { name: 'Drilling Claws', desc: 'Spider Mines: +1 mine per 2 ranks (rounded down) and +8% damage per rank.', maxRank: 3, row: 4, col: 3, spells: { mines: { damage: 0.08, count: 0.5 } } },
      { name: 'Behemoth Reactor', desc: '+3% damage per rank.', maxRank: 5, row: 5, col: 1, stats: { damage: 0.03 } },
      { name: 'Hellbat Assault', desc: 'Capstone. Also start with Flamethrower. Flamethrower gains 40% area and 40% damage, and Napalm burns twice as hard.', maxRank: 1, row: 6, col: 1, startSpell: 'flame', flag: 'hellbat', spells: { flame: { area: 0.4, damage: 0.4 } }, milestone: 30 },
    ])),
    chain(tree('covert', 'Covert Ops', '🎯', 'Ghosts and precision strikes. Crit hard and call down nukes.', [
      { name: 'Lockdown Training', desc: '+2% crit chance per rank.', maxRank: 5, row: 0, col: 0, stats: { critChance: 0.02 } },
      { name: 'Ocular Implants', desc: '+8% pickup range per rank.', maxRank: 5, row: 0, col: 2, stats: { pickupRange: 7 } },
      { name: 'Yamato Capacitors', desc: 'Yamato Cannon cooldown 5% shorter per rank.', maxRank: 3, row: 1, col: 0, spells: { yamato: { cooldown: 0.05 } } },
      { name: 'Moebius Reactor', desc: '+2% cooldown speed per rank.', maxRank: 5, row: 1, col: 2, stats: { haste: 0.02 } },
      { name: 'Personal Cloaking', desc: 'Milestone. +12% dodge. Dashing makes you invulnerable for 1 sec.', maxRank: 1, row: 2, col: 1, flag: 'cloak', stats: { dodge: 0.12 }, milestone: 10 },
      { name: 'Ghost Academy', desc: '+10% crit damage per rank.', maxRank: 5, row: 2, col: 3, stats: { critMult: 0.1 } },
      { name: 'Salvage', desc: '+10% minerals per rank.', maxRank: 3, row: 3, col: 0, stats: { minerals: 0.1 } },
      { name: 'Hi-Sec Auto Tracking', desc: 'Yamato Cannon and Auto-Turret deal 6% more damage per rank.', maxRank: 5, row: 3, col: 2, spells: { yamato: { damage: 0.06 }, turret: { damage: 0.06 } } },
      { name: 'Sniper Round', desc: 'Milestone. +10% crit chance and +50% crit damage.', maxRank: 1, row: 4, col: 1, stats: { critChance: 0.1, critMult: 0.5 }, milestone: 20 },
      { name: 'Luck of the Ghost', desc: '+8% luck per rank.', maxRank: 3, row: 4, col: 3, stats: { luck: 0.08 } },
      { name: 'Enhanced Shockwaves', desc: '+3% area per rank.', maxRank: 5, row: 5, col: 1, stats: { area: 0.03 } },
      { name: 'Tactical Nuke', desc: 'Capstone. Also start with Spider Mines. Every 10 sec a nuke hits the densest enemy pack for 1200% damage.', maxRank: 1, row: 6, col: 1, startSpell: 'mines', flag: 'nuke', milestone: 30 },
    ])),
  ],
  zerg: [
    chain(tree('swarm', 'Swarm', '🐜', 'Speed and numbers. Overwhelm them before they can react.', [
      { name: 'Metabolic Boost', desc: '+4% move speed per rank.', maxRank: 5, row: 0, col: 0, stats: { moveSpeed: 8 } },
      { name: 'Grooved Spines', desc: 'Needle Spines deal 6% more damage per rank.', maxRank: 5, row: 0, col: 2, spells: { spines: { damage: 0.06 } } },
      { name: 'Hatchery Brood', desc: 'Broodlings deal 8% more damage per rank.', maxRank: 3, row: 1, col: 0, spells: { brood: { damage: 0.08 } } },
      { name: 'Muscular Augments', desc: '+2% cooldown speed per rank.', maxRank: 5, row: 1, col: 2, stats: { haste: 0.02 } },
      { name: 'Burrow Charge', desc: 'Milestone. Dash cooldown 40% shorter and dashing knocks enemies away.', maxRank: 1, row: 2, col: 1, flag: 'burrowCharge', stats: { dashCooldown: -0.4 }, milestone: 10 },
      { name: 'Pheromone Trail', desc: '+8% pickup range per rank.', maxRank: 5, row: 2, col: 3, stats: { pickupRange: 7 } },
      { name: 'Larva Injection', desc: '+5% experience per rank.', maxRank: 3, row: 3, col: 0, stats: { xpGain: 0.05 } },
      { name: 'Frenzy', desc: '+2% damage per rank.', maxRank: 5, row: 3, col: 2, stats: { damage: 0.02 } },
      { name: 'Adrenal Glands', desc: 'Milestone. +15% cooldown speed.', maxRank: 1, row: 4, col: 1, stats: { haste: 0.15 }, milestone: 20 },
      { name: 'Swarm Host', desc: 'Broodlings +1 per 2 ranks (rounded down).', maxRank: 3, row: 4, col: 3, spells: { brood: { count: 0.5 } } },
      { name: 'Predatory Instinct', desc: '+2% crit chance per rank.', maxRank: 5, row: 5, col: 1, stats: { critChance: 0.02 } },
      { name: 'Endless Swarm', desc: 'Capstone. Also start with Broodlings. +3 broodlings, and every kill has a 10% chance to hatch a temporary broodling.', maxRank: 1, row: 6, col: 1, startSpell: 'brood', flag: 'endlessSwarm', spells: { brood: { count: 3 } }, milestone: 30 },
    ])),
    chain(tree('evolution', 'Evolution', '🧬', 'Regeneration and carapace. Shrug off what would kill anything else.', [
      { name: 'Chitinous Plating', desc: '+1 armor per rank.', maxRank: 5, row: 0, col: 0, stats: { armor: 1 } },
      { name: 'Tissue Assimilation', desc: '+10 max health per rank.', maxRank: 5, row: 0, col: 2, stats: { maxHp: 10 } },
      { name: 'Caustic Spores', desc: 'Acid Spores deal 8% more damage per rank.', maxRank: 3, row: 1, col: 0, spells: { spores: { damage: 0.08 } } },
      { name: 'Mend', desc: '+0.4 health regen per rank.', maxRank: 5, row: 1, col: 2, stats: { hpRegen: 0.4 } },
      { name: 'Rapid Regeneration', desc: 'Milestone. Health regen is tripled when you haven\'t been hit for 3 sec.', maxRank: 1, row: 2, col: 1, flag: 'rapidRegen', milestone: 10 },
      { name: 'Anabolic Synthesis', desc: '+3% area per rank.', maxRank: 5, row: 2, col: 3, stats: { area: 0.03 } },
      { name: 'Evasive Mutation', desc: '+3% dodge per rank.', maxRank: 3, row: 3, col: 0, stats: { dodge: 0.03 } },
      { name: 'Spine Growth', desc: 'Spine Eruption deals 8% more damage per rank.', maxRank: 5, row: 3, col: 2, spells: { spinenova: { damage: 0.08 } } },
      { name: 'Hardened Carapace', desc: 'Milestone. +4 armor and +30 max health.', maxRank: 1, row: 4, col: 1, stats: { armor: 4, maxHp: 30 }, milestone: 20 },
      { name: 'Vile Mutation', desc: '+3% damage per rank.', maxRank: 3, row: 4, col: 3, stats: { damage: 0.03 } },
      { name: 'Lurker Den', desc: 'Creep Bloom lasts 8% longer and hits 8% harder per rank.', maxRank: 5, row: 5, col: 1, spells: { acidpool: { duration: 0.08, damage: 0.08 } } },
      { name: 'Primal Mutation', desc: 'Capstone. Also start with Acid Spores. +50% max health, Acid Spores gain 50% area, deal 60% more damage and heal you for each enemy they kill.', maxRank: 1, row: 6, col: 1, startSpell: 'spores', flag: 'primal', spells: { spores: { area: 0.5, damage: 0.6 } }, milestone: 30 },
    ])),
    chain(tree('brood', 'Brood', '🥚', 'Bile and spines. Bombard the field from a distance.', [
      { name: 'Volatile Bile', desc: 'Corrosive Bile deals 6% more damage per rank.', maxRank: 5, row: 0, col: 0, spells: { bile: { damage: 0.06 } } },
      { name: 'Seismic Spines', desc: '+2% damage per rank.', maxRank: 5, row: 0, col: 2, stats: { damage: 0.02 } },
      { name: 'Splash Glands', desc: 'Corrosive Bile area +6% per rank.', maxRank: 3, row: 1, col: 0, spells: { bile: { area: 0.06 } } },
      { name: 'Scourge Nest', desc: 'Scourge Swarm deals 8% more damage per rank.', maxRank: 5, row: 1, col: 2, spells: { scourge: { damage: 0.08 } } },
      { name: 'Corrosive Splash', desc: 'Milestone. Projectiles splash 40% of their damage to enemies near the target.', maxRank: 1, row: 2, col: 1, flag: 'splash', milestone: 10 },
      { name: 'Hunter Instinct', desc: '+2% crit chance per rank.', maxRank: 5, row: 2, col: 3, stats: { critChance: 0.02 } },
      { name: 'Muscular Sacs', desc: '+6% projectile speed per rank.', maxRank: 3, row: 3, col: 0, stats: { projSpeed: 0.06 } },
      { name: 'Accelerated Gestation', desc: '+2% cooldown speed per rank.', maxRank: 5, row: 3, col: 2, stats: { haste: 0.02 } },
      { name: 'Spawn Larvae', desc: 'Milestone. +1 projectile for every spell that fires projectiles or summons.', maxRank: 1, row: 4, col: 1, stats: { extraProj: 1 }, milestone: 20 },
      { name: 'Bile Ducts', desc: '+3% area per rank.', maxRank: 3, row: 4, col: 3, stats: { area: 0.03 } },
      { name: 'Barbed Spines', desc: 'Needle Spines pierce +1 per 2 ranks (rounded down) and deal 5% more damage per rank.', maxRank: 5, row: 5, col: 1, spells: { spines: { pierce: 0.5, damage: 0.05 } } },
      { name: 'Leviathan Spines', desc: 'Capstone. Needle Spines fire 2 extra spines, pierce 3 more and deal 50% more damage.', maxRank: 1, row: 6, col: 1, startSpell: 'spines', spells: { spines: { count: 2, pierce: 3, damage: 0.5 } }, milestone: 30 },
    ])),
  ],
  protoss: [
    chain(tree('khala', 'Khala', '🔮', 'High templar psionics. Storms and lightning that shred packs.', [
      { name: 'Psionic Amplifier', desc: 'Psionic Storm deals 6% more damage per rank.', maxRank: 5, row: 0, col: 0, spells: { storm: { damage: 0.06 } } },
      { name: 'Khaydarin Amulet', desc: '+2% cooldown speed per rank.', maxRank: 5, row: 0, col: 2, stats: { haste: 0.02 } },
      { name: 'Unbound Fervor', desc: 'Arc Lightning deals 8% more damage per rank.', maxRank: 3, row: 1, col: 0, spells: { arc: { damage: 0.08 } } },
      { name: 'Psionic Focus', desc: '+3% area per rank.', maxRank: 5, row: 1, col: 2, stats: { area: 0.03 } },
      { name: 'Psionic Resonance', desc: 'Milestone. Psionic Storm calls 1 extra storm.', maxRank: 1, row: 2, col: 1, spells: { storm: { count: 1 } }, milestone: 10 },
      { name: 'Templar Archives', desc: '+5% experience per rank.', maxRank: 5, row: 2, col: 3, stats: { xpGain: 0.05 } },
      { name: 'Psi Disruptor', desc: '+2% damage per rank.', maxRank: 3, row: 3, col: 0, stats: { damage: 0.02 } },
      { name: 'Hallucination', desc: '+2% dodge per rank.', maxRank: 5, row: 3, col: 2, stats: { dodge: 0.02 } },
      { name: 'Feedback', desc: 'Milestone. When your shields break, release a psionic blast for 400% damage (8 sec cooldown).', maxRank: 1, row: 4, col: 1, flag: 'feedback', milestone: 20 },
      { name: 'Plasma Surge', desc: '+6 max shields per rank.', maxRank: 3, row: 4, col: 3, stats: { maxShield: 6 } },
      { name: 'Storm Lord', desc: 'Psionic Storm area +5% and duration +5% per rank.', maxRank: 5, row: 5, col: 1, spells: { storm: { area: 0.05, duration: 0.05 } } },
      { name: 'Archon Merge', desc: 'Capstone. Also start with Arc Lightning. Arc Lightning bounces 4 more times and deals 50% more damage.', maxRank: 1, row: 6, col: 1, startSpell: 'arc', spells: { arc: { pierce: 4, damage: 0.5 } }, milestone: 30 },
    ])),
    chain(tree('nerazim', 'Nerazim', '🌑', 'Dark templar void arts. Blink in, cleave and vanish.', [
      { name: 'Warp Blades', desc: 'Psi Blades deal 6% more damage per rank.', maxRank: 5, row: 0, col: 0, spells: { blades: { damage: 0.06 } } },
      { name: 'Void Sight', desc: '+2% crit chance per rank.', maxRank: 5, row: 0, col: 2, stats: { critChance: 0.02 } },
      { name: 'Wide Arc', desc: 'Psi Blades area +6% per rank.', maxRank: 3, row: 1, col: 0, spells: { blades: { area: 0.06 } } },
      { name: 'Charge', desc: '+4% move speed per rank.', maxRank: 5, row: 1, col: 2, stats: { moveSpeed: 8 } },
      { name: 'Shadow Stride', desc: 'Milestone. Dash cooldown 40% shorter and your dash slashes every enemy along its path.', maxRank: 1, row: 2, col: 1, flag: 'shadowStride', stats: { dashCooldown: -0.4 }, milestone: 10 },
      { name: 'Shadow Fury', desc: '+10% crit damage per rank.', maxRank: 5, row: 2, col: 3, stats: { critMult: 0.1 } },
      { name: 'Void Shroud', desc: '+3% dodge per rank.', maxRank: 3, row: 3, col: 0, stats: { dodge: 0.03 } },
      { name: 'Prismatic Alignment', desc: 'Prismatic Beam deals 6% more damage per rank.', maxRank: 5, row: 3, col: 2, spells: { prism: { damage: 0.06 } } },
      { name: 'Void Strike', desc: 'Milestone. +12% crit chance. Crits deal 30% more damage.', maxRank: 1, row: 4, col: 1, stats: { critChance: 0.12, critMult: 0.3 }, milestone: 20 },
      { name: 'Umbral Edge', desc: '+3% damage per rank.', maxRank: 3, row: 4, col: 3, stats: { damage: 0.03 } },
      { name: 'Blink Matrix', desc: '+3% cooldown speed per rank.', maxRank: 5, row: 5, col: 1, stats: { haste: 0.03 } },
      { name: 'Dark Templar', desc: 'Capstone. Psi Blades strike twice, gain 30% area and execute non-boss enemies below 15% health.', maxRank: 1, row: 6, col: 1, startSpell: 'blades', flag: 'darkTemplar', spells: { blades: { area: 0.3 } }, milestone: 30 },
    ])),
    chain(tree('purifier', 'Purifier', '🛡️', 'Shields and robotics. Outlast anything behind an army of drones.', [
      { name: 'Shield Capacitors', desc: '+8 max shields per rank.', maxRank: 5, row: 0, col: 0, stats: { maxShield: 8 } },
      { name: 'Interceptor Bay', desc: 'Interceptors deal 6% more damage per rank.', maxRank: 5, row: 0, col: 2, spells: { interceptors: { damage: 0.06 } } },
      { name: 'Hardened Shields', desc: '+1 armor per rank.', maxRank: 3, row: 1, col: 0, stats: { armor: 1 } },
      { name: 'Photon Overcharge', desc: 'Photon Bolt deals 6% more damage per rank.', maxRank: 5, row: 1, col: 2, spells: { photon: { damage: 0.06 } } },
      { name: 'Rapid Recharge', desc: 'Milestone. Shields start recharging 50% sooner and recharge 50% faster.', maxRank: 1, row: 2, col: 1, flag: 'rapidRecharge', milestone: 10 },
      { name: 'Singularity Charge', desc: '+5% projectile speed per rank.', maxRank: 5, row: 2, col: 3, stats: { projSpeed: 0.05 } },
      { name: 'Nexus Link', desc: '+8 max health per rank.', maxRank: 3, row: 3, col: 0, stats: { maxHp: 8 } },
      { name: 'Purification Matrix', desc: 'Purification Nova deals 8% more damage per rank.', maxRank: 5, row: 3, col: 2, spells: { purnova: { damage: 0.08 } } },
      { name: 'Graviton Catapult', desc: 'Milestone. Interceptors +2, Photon Bolt +1 projectile.', maxRank: 1, row: 4, col: 1, spells: { interceptors: { count: 2 }, photon: { count: 1 } }, milestone: 20 },
      { name: 'Solarite Core', desc: '+3% damage per rank.', maxRank: 3, row: 4, col: 3, stats: { damage: 0.03 } },
      { name: 'Khala\'s Light', desc: '+2% cooldown speed per rank.', maxRank: 5, row: 5, col: 1, stats: { haste: 0.02 } },
      { name: 'Carrier Command', desc: 'Capstone. Also start with Interceptors. +3 interceptors and they deal 50% more damage.', maxRank: 1, row: 6, col: 1, startSpell: 'interceptors', spells: { interceptors: { count: 3, damage: 0.5 } }, milestone: 30 },
    ])),
  ],
};

export function talentXpForPoint(n: number): number {
  // n = index of the point being bought (0-based). First costs 80, next 95, ...
  return Math.round(80 + n * 15 + n * n * 0.6);
}
