import { wowIconUrl } from './ui';

/**
 * WoW 1.12 icons (Interface/Icons) for the game's spells, passives, perks and talent trees, by game
 * id. Each lists a few candidates; the first one the client has is used.
 */
export const WOW_ICONS: Record<string, string[]> = {
  // spells
  gauss: ['Ability_Marksmanship', 'INV_Weapon_Rifle_01'],
  frag: ['INV_Misc_Bomb_05', 'INV_Misc_Bomb_04', 'Spell_Fire_SelfDestruct'],
  flame: ['Spell_Fire_Fire', 'Spell_Fire_SealOfFire'],
  mines: ['INV_Gizmo_03', 'Spell_Fire_SelfDestruct'],
  yamato: ['Spell_Arcane_StarFire', 'Spell_Fire_FlameBolt'],
  matrix: ['Spell_Holy_PowerWordShield'],
  turret: ['INV_Gizmo_02', 'INV_Gizmo_01'],
  emp: ['Spell_Nature_Purge', 'Spell_Nature_WispSplode'],
  irradiate: ['Spell_Nature_CorrosiveBreath', 'Spell_Shadow_PlagueCloud'],
  spines: ['Spell_Nature_Thorns'],
  spores: ['Spell_Nature_NullifyPoison', 'Spell_Nature_AbolishMagic'],
  bile: ['Spell_Nature_Acid_01'],
  brood: ['Ability_Hunter_Pet_Spider', 'Spell_Shadow_RaiseDead'],
  scourge: ['Ability_Hunter_Pet_Bat'],
  acidpool: ['Spell_Shadow_CreepingPlague'],
  spinenova: ['Spell_Nature_Earthquake'],
  lurker: ['Ability_Hunter_Pet_Scorpid'],
  glaive: ['Ability_Hunter_Pet_WindSerpent', 'Spell_Nature_Lightning'],
  blades: ['Ability_DualWield', 'Ability_Warrior_Cleave'],
  photon: ['Spell_Arcane_Arcane01', 'Spell_Nature_StarFall'],
  storm: ['Spell_Frost_IceStorm', 'Spell_Shadow_RainOfFire'],
  interceptors: ['INV_Gizmo_01', 'Ability_Hunter_Pet_Owl'],
  arc: ['Spell_Nature_ChainLightning'],
  prism: ['Spell_Holy_HolyBolt'],
  purnova: ['Spell_Holy_HolyNova'],
  scarab: ['INV_Misc_Bomb_08', 'Spell_Fire_SelfDestruct'],
  psiaura: ['Spell_Shadow_MindSteal', 'Spell_Arcane_MindMastery'],
  // passives
  p_hp: ['Spell_Holy_WordFortitude'],
  p_regen: ['Spell_Nature_Rejuvenation'],
  p_armor: ['INV_Shield_06', 'INV_Shield_04'],
  p_speed: ['Ability_Rogue_Sprint'],
  p_dmg: ['Ability_Warrior_BattleShout', 'INV_Sword_04'],
  p_haste: ['Spell_Nature_Bloodlust'],
  p_area: ['Ability_Whirlwind'],
  p_crit: ['Ability_CriticalStrike'],
  p_critm: ['Ability_BackStab'],
  p_pick: ['INV_Misc_Bag_10', 'INV_Misc_Bag_08'],
  p_xp: ['INV_Misc_Book_09', 'INV_Misc_Book_01'],
  p_dur: ['Spell_Nature_TimeStop'],
  p_luck: ['INV_Misc_Coin_01'],
  p_proj: ['Ability_UpgradeMoonGlaive'],
  p_shield: ['Spell_Nature_LightningShield'],
  // account perks
  reroll: ['INV_Misc_Dice_01', 'Spell_Holy_Dizzy'],
  banish: ['Spell_Shadow_Teleport'],
  opening: ['Spell_Holy_MindVision'],
  life: ['Spell_Holy_Resurrection'],
  probe: ['INV_Pick_02', 'Trade_Mining'],
  minerals: ['INV_Misc_Gem_Sapphire_02', 'INV_Ore_Mithril_01'],
  veteran: ['INV_Misc_Book_07'],
  // talent trees
  infantry: ['INV_Sword_27', 'Ability_Warrior_DefensiveStance'],
  mech: ['INV_Gizmo_02'],
  covert: ['Ability_Stealth'],
  swarm: ['Ability_Hunter_Pet_Wasp'],
  evolution: ['Spell_Shadow_UnholyStrength'],
  // 'brood' is shared with the Broodlings spell
  khala: ['Spell_Holy_HolyBolt'],
  nerazim: ['Spell_Shadow_ShadowWordPain'],
  purifier: ['Spell_Holy_HolySmite'],
  // damage that isn't from a spell
  napalm: ['Spell_Fire_Immolation'],
  nuke: ['Spell_Fire_Fireball02'],
  feedback: ['Spell_Shadow_ManaBurn'],
  // dashes, by race
  dash_terran: ['Ability_Rogue_Sprint'],
  dash_zerg: ['Ability_Druid_Dash'],
  dash_protoss: ['Spell_Arcane_Blink'],
  menu: ['INV_Misc_Book_08', 'INV_Misc_Note_01'],
};

/** URL of the WoW icon for a game id, or null. */
export function wowIcon(id: string): string | null {
  const c = WOW_ICONS[id];
  return c ? wowIconUrl(...c) : null;
}
