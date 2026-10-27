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
    chain(tree('infantry', 'Kirin Tor', '🎖️', 'Arcane mastery. Bury the line in a torrent of missiles.', [
      { name: 'Arcane Focus', desc: 'Arcane Missiles deals 6% more damage per rank.', maxRank: 5, row: 0, col: 0, spells: { gauss: { damage: 0.06 } } },
      { name: 'Footman Drills', desc: '+2% damage per rank.', maxRank: 5, row: 0, col: 2, stats: { damage: 0.02 } },
      { name: 'Quickened Casting', desc: 'Arcane Missiles cooldown 4% shorter per rank.', maxRank: 3, row: 1, col: 0, spells: { gauss: { cooldown: 0.04 } } },
      { name: 'Defend', desc: '+8 max health per rank.', maxRank: 5, row: 1, col: 2, stats: { maxHp: 8 } },
      { name: 'Inner Fire', desc: 'Milestone. Every 12 sec, Inner Fire burns for 4 sec: +40% cooldown speed and +30% move speed.', maxRank: 1, row: 2, col: 1, flag: 'stimpack', milestone: 10 },
      { name: 'Far Sight', desc: '+2% crit chance per rank.', maxRank: 5, row: 2, col: 3, stats: { critChance: 0.02 } },
      { name: 'Priest Training', desc: '+0.3 health regen per rank.', maxRank: 3, row: 3, col: 0, stats: { hpRegen: 0.3 } },
      { name: 'Tidal Mastery', desc: 'Projectile speed +5% and Water Elemental damage +6% per rank.', maxRank: 5, row: 3, col: 2, stats: { projSpeed: 0.05 }, spells: { turret: { damage: 0.06 } } },
      { name: 'Focused Fire', desc: 'Milestone. Arcane Missiles fires 1 extra missile and pierces 1 more enemy.', maxRank: 1, row: 4, col: 1, spells: { gauss: { count: 1, pierce: 1 } }, milestone: 20 },
      { name: 'Brilliance', desc: '+3% cooldown speed per rank.', maxRank: 3, row: 4, col: 3, stats: { haste: 0.03 } },
      { name: 'Hold the Line', desc: '+1 armor per rank.', maxRank: 5, row: 5, col: 1, stats: { armor: 1 } },
      { name: 'Archmage of Dalaran', desc: 'Capstone. Arcane Missiles fires 2 extra missiles and deals 30% more damage. Inner Fire lasts 2 sec longer.', maxRank: 1, row: 6, col: 1, startSpell: 'gauss', flag: 'raiders', spells: { gauss: { count: 2, damage: 0.3 } }, milestone: 30 },
    ])),
    chain(tree('mech', 'Quel\'Thalas', '⚙️', 'Phoenix fire, dwarven powder and heavy plate. Burn the swarm down.', [
      { name: 'Mark of Fire', desc: 'Breath of Fire deals 6% more damage per rank.', maxRank: 5, row: 0, col: 0, spells: { flame: { damage: 0.06 } } },
      { name: 'Plate Armor', desc: '+1 armor per rank.', maxRank: 5, row: 0, col: 2, stats: { armor: 1 } },
      { name: 'Dragon\'s Breath', desc: 'Breath of Fire and Mortar Shells area +6% per rank.', maxRank: 3, row: 1, col: 0, spells: { flame: { area: 0.06 }, frag: { area: 0.06 } } },
      { name: 'Black Powder', desc: 'Mortar Shells and Goblin Land Mines deal 6% more damage per rank.', maxRank: 5, row: 1, col: 2, spells: { frag: { damage: 0.06 }, mines: { damage: 0.06 } } },
      { name: 'Immolation', desc: 'Milestone. Fire spells set enemies ablaze for 60% of the hit over 3 sec.', maxRank: 1, row: 2, col: 1, flag: 'napalm', milestone: 10 },
      { name: 'Thorium Plate', desc: '+10 max health per rank.', maxRank: 5, row: 2, col: 3, stats: { maxHp: 10 } },
      { name: 'Boots of Speed', desc: '+4% move speed per rank.', maxRank: 3, row: 3, col: 0, stats: { moveSpeed: 8 } },
      { name: 'Flare', desc: '+3% area per rank.', maxRank: 5, row: 3, col: 2, stats: { area: 0.03 } },
      { name: 'Siege Engineering', desc: 'Milestone. Mortar Shells fires 1 extra shell with 25% more area.', maxRank: 1, row: 4, col: 1, spells: { frag: { count: 1, area: 0.25 } }, milestone: 20 },
      { name: 'Goblin Sappers', desc: 'Goblin Land Mines: +1 mine per 2 ranks (rounded down) and +8% damage per rank.', maxRank: 3, row: 4, col: 3, spells: { mines: { damage: 0.08, count: 0.5 } } },
      { name: 'Sunwell Power', desc: '+3% damage per rank.', maxRank: 5, row: 5, col: 1, stats: { damage: 0.03 } },
      { name: 'Phoenix', desc: 'Capstone. Also start with Breath of Fire. Breath of Fire gains 40% area and 40% damage, and Immolation burns twice as hard.', maxRank: 1, row: 6, col: 1, startSpell: 'flame', flag: 'hellbat', spells: { flame: { area: 0.4, damage: 0.4 } }, milestone: 30 },
    ])),
    chain(tree('covert', 'Ironforge', '🎯', 'Dwarven thunder. Crit hard and call down the Avatar.', [
      { name: 'Bash', desc: '+2% crit chance per rank.', maxRank: 5, row: 0, col: 0, stats: { critChance: 0.02 } },
      { name: 'Gryphon Eyes', desc: '+8% pickup range per rank.', maxRank: 5, row: 0, col: 2, stats: { pickupRange: 7 } },
      { name: 'Hammer Throw', desc: 'Storm Bolt cooldown 5% shorter per rank.', maxRank: 3, row: 1, col: 0, spells: { yamato: { cooldown: 0.05 } } },
      { name: 'Rune of Haste', desc: '+2% cooldown speed per rank.', maxRank: 5, row: 1, col: 2, stats: { haste: 0.02 } },
      { name: 'Invisibility', desc: 'Milestone. +12% dodge. Dashing makes you invulnerable for 1 sec.', maxRank: 1, row: 2, col: 1, flag: 'cloak', stats: { dodge: 0.12 }, milestone: 10 },
      { name: 'Storm Hammers', desc: '+10% crit damage per rank.', maxRank: 5, row: 2, col: 3, stats: { critMult: 0.1 } },
      { name: 'Goblin Merchant', desc: '+10% minerals per rank.', maxRank: 3, row: 3, col: 0, stats: { minerals: 0.1 } },
      { name: 'Elemental Bond', desc: 'Storm Bolt and Water Elemental deal 6% more damage per rank.', maxRank: 5, row: 3, col: 2, spells: { yamato: { damage: 0.06 }, turret: { damage: 0.06 } } },
      { name: 'Mighty Blow', desc: 'Milestone. +10% crit chance and +50% crit damage.', maxRank: 1, row: 4, col: 1, stats: { critChance: 0.1, critMult: 0.5 }, milestone: 20 },
      { name: 'Dwarven Luck', desc: '+8% luck per rank.', maxRank: 3, row: 4, col: 3, stats: { luck: 0.08 } },
      { name: 'Thunder Clap', desc: '+3% area per rank.', maxRank: 5, row: 5, col: 1, stats: { area: 0.03 } },
      { name: 'Avatar', desc: 'Capstone. Also start with Goblin Land Mines. Every 10 sec a thunderous hammer hits the densest enemy pack for 1200% damage.', maxRank: 1, row: 6, col: 1, startSpell: 'mines', flag: 'nuke', milestone: 30 },
    ])),
  ],
  zerg: [
    chain(tree('swarm', 'Nerubian', '🐜', 'Speed and numbers. Overwhelm them before they can react.', [
      { name: 'Unholy Frenzy', desc: '+4% move speed per rank.', maxRank: 5, row: 0, col: 0, stats: { moveSpeed: 8 } },
      { name: 'Death Pact', desc: 'Death Coil deals 6% more damage per rank.', maxRank: 5, row: 0, col: 2, spells: { spines: { damage: 0.06 } } },
      { name: 'Spider Crypt', desc: 'Carrion Beetles deal 8% more damage per rank.', maxRank: 3, row: 1, col: 0, spells: { brood: { damage: 0.08 } } },
      { name: 'Cannibalize', desc: '+2% cooldown speed per rank.', maxRank: 5, row: 1, col: 2, stats: { haste: 0.02 } },
      { name: 'Shadow Charge', desc: 'Milestone. Dash cooldown 40% shorter and dashing knocks enemies away.', maxRank: 1, row: 2, col: 1, flag: 'burrowCharge', stats: { dashCooldown: -0.4 }, milestone: 10 },
      { name: 'Haunted Gold', desc: '+8% pickup range per rank.', maxRank: 5, row: 2, col: 3, stats: { pickupRange: 7 } },
      { name: 'Dark Ritual', desc: '+5% experience per rank.', maxRank: 3, row: 3, col: 0, stats: { xpGain: 0.05 } },
      { name: 'Vampiric Aura', desc: '+2% damage per rank.', maxRank: 5, row: 3, col: 2, stats: { damage: 0.02 } },
      { name: 'Unholy Strength', desc: 'Milestone. +15% cooldown speed.', maxRank: 1, row: 4, col: 1, stats: { haste: 0.15 }, milestone: 20 },
      { name: 'Nerubian Brood', desc: 'Carrion Beetles +1 per 2 ranks (rounded down).', maxRank: 3, row: 4, col: 3, spells: { brood: { count: 0.5 } } },
      { name: 'Ghoul Frenzy', desc: '+2% crit chance per rank.', maxRank: 5, row: 5, col: 1, stats: { critChance: 0.02 } },
      { name: 'Crypt Lord', desc: 'Capstone. Also start with Carrion Beetles. +3 beetles, and every kill has a 10% chance to raise a temporary beetle.', maxRank: 1, row: 6, col: 1, startSpell: 'brood', flag: 'endlessSwarm', spells: { brood: { count: 3 } }, milestone: 30 },
    ])),
    chain(tree('evolution', 'Unholy', '🧬', 'Regeneration and bone armor. Shrug off what would kill anything else.', [
      { name: 'Bone Armor', desc: '+1 armor per rank.', maxRank: 5, row: 0, col: 0, stats: { armor: 1 } },
      { name: 'Flesh Golem', desc: '+10 max health per rank.', maxRank: 5, row: 0, col: 2, stats: { maxHp: 10 } },
      { name: 'Plague Spreader', desc: 'Disease Cloud deals 8% more damage per rank.', maxRank: 3, row: 1, col: 0, spells: { spores: { damage: 0.08 } } },
      { name: 'Unholy Aura', desc: '+0.4 health regen per rank.', maxRank: 5, row: 1, col: 2, stats: { hpRegen: 0.4 } },
      { name: 'Raise Dead', desc: 'Milestone. Health regen is tripled when you haven\'t been hit for 3 sec.', maxRank: 1, row: 2, col: 1, flag: 'rapidRegen', milestone: 10 },
      { name: 'Blight', desc: '+3% area per rank.', maxRank: 5, row: 2, col: 3, stats: { area: 0.03 } },
      { name: 'Ghostly Form', desc: '+3% dodge per rank.', maxRank: 3, row: 3, col: 0, stats: { dodge: 0.03 } },
      { name: 'Frost Armor', desc: 'Frost Nova deals 8% more damage per rank.', maxRank: 5, row: 3, col: 2, spells: { spinenova: { damage: 0.08 } } },
      { name: 'Spiked Carapace', desc: 'Milestone. +4 armor and +30 max health.', maxRank: 1, row: 4, col: 1, stats: { armor: 4, maxHp: 30 }, milestone: 20 },
      { name: 'Necromancy', desc: '+3% damage per rank.', maxRank: 3, row: 4, col: 3, stats: { damage: 0.03 } },
      { name: 'Plague Lands', desc: 'Death and Decay lasts 8% longer and hits 8% harder per rank.', maxRank: 5, row: 5, col: 1, spells: { acidpool: { duration: 0.08, damage: 0.08 } } },
      { name: 'Abomination', desc: 'Capstone. Also start with Disease Cloud. +50% max health, and Disease Cloud gains 50% area, deals 60% more damage and heals you for each enemy it kills.', maxRank: 1, row: 6, col: 1, startSpell: 'spores', flag: 'primal', spells: { spores: { area: 0.5, damage: 0.6 } }, milestone: 30 },
    ])),
    chain(tree('brood', 'Plague', '🥚', 'Corpses and coils. Bombard the field from a distance.', [
      { name: 'Exhume Corpses', desc: 'Meat Wagon deals 6% more damage per rank.', maxRank: 5, row: 0, col: 0, spells: { bile: { damage: 0.06 } } },
      { name: 'Unholy Might', desc: '+2% damage per rank.', maxRank: 5, row: 0, col: 2, stats: { damage: 0.02 } },
      { name: 'Disease Splash', desc: 'Meat Wagon area +6% per rank.', maxRank: 3, row: 1, col: 0, spells: { bile: { area: 0.06 } } },
      { name: 'Locust Hive', desc: 'Locust Swarm deals 8% more damage per rank.', maxRank: 5, row: 1, col: 2, spells: { scourge: { damage: 0.08 } } },
      { name: 'Orb of Corruption', desc: 'Milestone. Projectiles splash 40% of their damage to enemies near the target.', maxRank: 1, row: 2, col: 1, flag: 'splash', milestone: 10 },
      { name: 'Shadow Strike', desc: '+2% crit chance per rank.', maxRank: 5, row: 2, col: 3, stats: { critChance: 0.02 } },
      { name: 'Skeletal Mastery', desc: '+6% projectile speed per rank.', maxRank: 3, row: 3, col: 0, stats: { projSpeed: 0.06 } },
      { name: 'Haste of Undeath', desc: '+2% cooldown speed per rank.', maxRank: 5, row: 3, col: 2, stats: { haste: 0.02 } },
      { name: 'Raise Skeletons', desc: 'Milestone. +1 projectile for every spell that fires projectiles or summons.', maxRank: 1, row: 4, col: 1, stats: { extraProj: 1 }, milestone: 20 },
      { name: 'Wide Plague', desc: '+3% area per rank.', maxRank: 3, row: 4, col: 3, stats: { area: 0.03 } },
      { name: 'Coil of Agony', desc: 'Death Coil pierces +1 per 2 ranks (rounded down) and deals 5% more damage per rank.', maxRank: 5, row: 5, col: 1, spells: { spines: { pierce: 0.5, damage: 0.05 } } },
      { name: 'Lord of the Dead', desc: 'Capstone. Death Coil fires 2 extra coils, pierces 3 more and deals 50% more damage.', maxRank: 1, row: 6, col: 1, startSpell: 'spines', spells: { spines: { count: 2, pierce: 3, damage: 0.5 } }, milestone: 30 },
    ])),
  ],
  protoss: [
    chain(tree('khala', 'Shamanism', '🔮', 'Far seer magic. Earthquakes and lightning that shred packs.', [
      { name: 'Elemental Fury', desc: 'Earthquake deals 6% more damage per rank.', maxRank: 5, row: 0, col: 0, spells: { storm: { damage: 0.06 } } },
      { name: 'Spirit Totem', desc: '+2% cooldown speed per rank.', maxRank: 5, row: 0, col: 2, stats: { haste: 0.02 } },
      { name: 'Storm Caller', desc: 'Chain Lightning deals 8% more damage per rank.', maxRank: 3, row: 1, col: 0, spells: { arc: { damage: 0.08 } } },
      { name: 'Far Reach', desc: '+3% area per rank.', maxRank: 5, row: 1, col: 2, stats: { area: 0.03 } },
      { name: 'Aftershock', desc: 'Milestone. Earthquake calls 1 extra quake.', maxRank: 1, row: 2, col: 1, spells: { storm: { count: 1 } }, milestone: 10 },
      { name: 'Spirit Lodge', desc: '+5% experience per rank.', maxRank: 5, row: 2, col: 3, stats: { xpGain: 0.05 } },
      { name: 'Feral Spirit', desc: '+2% damage per rank.', maxRank: 3, row: 3, col: 0, stats: { damage: 0.02 } },
      { name: 'Mirror Image', desc: '+2% dodge per rank.', maxRank: 5, row: 3, col: 2, stats: { dodge: 0.02 } },
      { name: 'Ancestral Wrath', desc: 'Milestone. When your spirit shield breaks, release a blast of spirit fire for 400% damage (8 sec cooldown).', maxRank: 1, row: 4, col: 1, flag: 'feedback', milestone: 20 },
      { name: 'Spirit Ward', desc: '+6 max spirit shield per rank.', maxRank: 3, row: 4, col: 3, stats: { maxShield: 6 } },
      { name: 'Thrall\'s Fury', desc: 'Earthquake area +5% and duration +5% per rank.', maxRank: 5, row: 5, col: 1, spells: { storm: { area: 0.05, duration: 0.05 } } },
      { name: 'Doom of the Storm', desc: 'Capstone. Also start with Chain Lightning. Chain Lightning bounces 4 more times and deals 50% more damage.', maxRank: 1, row: 6, col: 1, startSpell: 'arc', spells: { arc: { pierce: 4, damage: 0.5 } }, milestone: 30 },
    ])),
    chain(tree('nerazim', 'Burning Blade', '🌑', 'Blademaster arts. Wind Walk in, cleave and vanish.', [
      { name: 'Sharpened Blades', desc: 'Cleaving Attack deals 6% more damage per rank.', maxRank: 5, row: 0, col: 0, spells: { blades: { damage: 0.06 } } },
      { name: 'Critical Strike', desc: '+2% crit chance per rank.', maxRank: 5, row: 0, col: 2, stats: { critChance: 0.02 } },
      { name: 'Sweeping Strikes', desc: 'Cleaving Attack area +6% per rank.', maxRank: 3, row: 1, col: 0, spells: { blades: { area: 0.06 } } },
      { name: 'Pillage', desc: '+4% move speed per rank.', maxRank: 5, row: 1, col: 2, stats: { moveSpeed: 8 } },
      { name: 'Wind Walk', desc: 'Milestone. Dash cooldown 40% shorter and your dash slashes every enemy along its path.', maxRank: 1, row: 2, col: 1, flag: 'shadowStride', stats: { dashCooldown: -0.4 }, milestone: 10 },
      { name: 'Blood Fury', desc: '+10% crit damage per rank.', maxRank: 5, row: 2, col: 3, stats: { critMult: 0.1 } },
      { name: 'Evasion', desc: '+3% dodge per rank.', maxRank: 3, row: 3, col: 0, stats: { dodge: 0.03 } },
      { name: 'Earthshaker', desc: 'Shockwave deals 6% more damage per rank.', maxRank: 5, row: 3, col: 2, spells: { prism: { damage: 0.06 } } },
      { name: 'Mirror Strike', desc: 'Milestone. +12% crit chance. Crits deal 30% more damage.', maxRank: 1, row: 4, col: 1, stats: { critChance: 0.12, critMult: 0.3 }, milestone: 20 },
      { name: 'Berserker Rage', desc: '+3% damage per rank.', maxRank: 3, row: 4, col: 3, stats: { damage: 0.03 } },
      { name: 'Haste Rune', desc: '+3% cooldown speed per rank.', maxRank: 5, row: 5, col: 1, stats: { haste: 0.03 } },
      { name: 'Grom\'s Fury', desc: 'Capstone. Cleaving Attack strikes twice, gain 30% area and execute non-boss enemies below 15% health.', maxRank: 1, row: 6, col: 1, startSpell: 'blades', flag: 'darkTemplar', spells: { blades: { area: 0.3 } }, milestone: 30 },
    ])),
    chain(tree('purifier', 'Ancestors', '🛡️', 'Spirit shields and spinning blades. Outlast anything.', [
      { name: 'Spirit Link', desc: '+8 max spirit shield per rank.', maxRank: 5, row: 0, col: 0, stats: { maxShield: 8 } },
      { name: 'Whirlwind', desc: 'Bladestorm deals 6% more damage per rank.', maxRank: 5, row: 0, col: 2, spells: { interceptors: { damage: 0.06 } } },
      { name: 'Spiked Barricades', desc: '+1 armor per rank.', maxRank: 3, row: 1, col: 0, stats: { armor: 1 } },
      { name: 'Berserker Strength', desc: 'Troll Spears deals 6% more damage per rank.', maxRank: 5, row: 1, col: 2, spells: { photon: { damage: 0.06 } } },
      { name: 'Ancestral Spirit', desc: 'Milestone. Spirit shields start recharging 50% sooner and recharge 50% faster.', maxRank: 1, row: 2, col: 1, flag: 'rapidRecharge', milestone: 10 },
      { name: 'Troll Regeneration', desc: '+5% projectile speed per rank.', maxRank: 5, row: 2, col: 3, stats: { projSpeed: 0.05 } },
      { name: 'Endurance Aura', desc: '+8 max health per rank.', maxRank: 3, row: 3, col: 0, stats: { maxHp: 8 } },
      { name: 'Thunder Hooves', desc: 'War Stomp deals 8% more damage per rank.', maxRank: 5, row: 3, col: 2, spells: { purnova: { damage: 0.08 } } },
      { name: 'Headhunter Training', desc: 'Milestone. Bladestorm +2, Troll Spears +1 projectile.', maxRank: 1, row: 4, col: 1, spells: { interceptors: { count: 2 }, photon: { count: 1 } }, milestone: 20 },
      { name: 'Reinforced Defenses', desc: '+3% damage per rank.', maxRank: 3, row: 4, col: 3, stats: { damage: 0.03 } },
      { name: 'Ancestral Guidance', desc: '+2% cooldown speed per rank.', maxRank: 5, row: 5, col: 1, stats: { haste: 0.02 } },
      { name: 'Master of the Blade', desc: 'Capstone. Also start with Bladestorm. +3 blades and they deal 50% more damage.', maxRank: 1, row: 6, col: 1, startSpell: 'interceptors', spells: { interceptors: { count: 3, damage: 0.5 } }, milestone: 30 },
    ])),
  ],
};

export function talentXpForPoint(n: number): number {
  // n = index of the point being bought (0-based). First costs 80, next 95, ...
  return Math.round(80 + n * 15 + n * n * 0.6);
}
