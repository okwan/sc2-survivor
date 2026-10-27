/** Brood War interface art, as literal paths so scripts/fetch-bw.mjs bundles them. */
export const BW_UI = {
  console: { terran: 'game/tconsole.pcx', zerg: 'game/zconsole.pcx', protoss: 'game/pconsole.pcx' } as Record<string, string>,
  icons: 'unit/cmdbtns/cmdicons.grp',
  wireframes: 'unit/wirefram/wirefram.grp',
  cursor: 'cursor/arrow.grp',
  menuBg: 'glue/palmm/backgnd.pcx',
};

export const BW_UI_FILES = [...Object.values(BW_UI.console), BW_UI.icons, BW_UI.wireframes, BW_UI.cursor, BW_UI.menuBg];

/** Command card icon (frame of cmdicons.grp) for each spell, picked from the real sheet. */
export const SPELL_ICONS: Record<string, number> = {
  gauss: 339, frag: 314, flame: 335, mines: 376, yamato: 359, matrix: 317, turret: 290,
  spines: 352, spores: 373, bile: 356, brood: 349, scourge: 378, acidpool: 270, spinenova: 351,
  blades: 353, photon: 354, storm: 355, interceptors: 331, arc: 362, prism: 383, purnova: 381,
  // EMP Shockwave, Irradiate, Lurker Aspect, Mutalisk, Scarab Damage, Maelstrom
  emp: 241, irradiate: 242, lurker: 376, glaive: 43, scarab: 314, psiaura: 381,
};

/**
 * Command card icons for everything else, by game id. Frames are the real upgrade / tech / unit
 * icons (upgrades.dat, techdata.dat and unit ids), named after what they are in StarCraft.
 */
export const ICONS: Record<string, number> = {
  // passives
  p_hp: 297, // Zerg Carapace
  p_regen: 365, // Healing
  p_armor: 292, // Terran Infantry Armor
  p_speed: 287, // Ion Thrusters
  p_dmg: 288, // Terran Infantry Weapons
  p_haste: 264, // Adrenal Glands
  p_area: 314, // Scarab Damage
  p_crit: 249, // Ocular Implants
  p_critm: 238, // U-238 Shells
  p_pick: 319, // Apial Sensors
  p_xp: 295, // Metasynaptic Node
  p_dur: 256, // Moebius Reactor
  p_luck: 385, // Argus Talisman
  p_proj: 239, // Burst Lasers
  p_shield: 310, // Protoss Plasma Shields
  // account perks
  reroll: 250, // Scanner Sweep
  banish: 278, // Stasis Field
  opening: 277, // Hallucination
  life: 280, // Recall
  probe: 64, // Probe
  minerals: 176, // Mineral Field
  veteran: 248, // Titan Reactor
  // talent trees
  infantry: 0, // Marine
  mech: 289, // Terran Vehicle Weapons
  covert: 252, // Personnel Cloaking
  swarm: 263, // Metabolic Boost
  evolution: 379, // Chitinous Plating
  brood: 40, // Spawn Broodling
  khala: 275, // Psionic Storm
  nerazim: 61, // Dark Templar
  purifier: 303, // Protoss Armor
  // damage that isn't from a spell
  napalm: 32, // Firebat
  nuke: 14, // Nuclear Missile
  feedback: 372, // Feedback
};

/** Per race: dash icon and the hero's unit id (wireframe and portrait frame). */
export const RACE_UI: Record<string, { dash: number; unit: number }> = {
  terran: { dash: 237, unit: 0 },
  zerg: { dash: 259, unit: 38 },
  protoss: { dash: 312, unit: 65 },
};

export const PAUSE_ICON = 387;
