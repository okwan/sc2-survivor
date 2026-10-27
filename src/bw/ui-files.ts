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
};

/** Per race: dash icon and the hero's unit id (wireframe and portrait frame). */
export const RACE_UI: Record<string, { dash: number; unit: number }> = {
  terran: { dash: 237, unit: 0 },
  zerg: { dash: 259, unit: 38 },
  protoss: { dash: 312, unit: 65 },
};

export const PAUSE_ICON = 387;
