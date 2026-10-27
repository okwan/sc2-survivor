// Warcraft III files the deploy step pulls out of a classic (1.27) install: see scripts/fetch-wc3.mjs,
// which reads the quoted paths in this folder. Models are pre-rendered into sprite sheets under wc3/.

export interface Wc3HeroArt {
  /** MDX model, rendered in CI to wc3/hero/<id>-<anim>.png */
  model: string;
  /** 64x64 command-card portrait icon, served as wc3/icons/<file>.png */
  icon: string;
}

export const WC3_HEROES: Record<string, Wc3HeroArt> = {
  archmage: { model: 'Units/Human/HeroArchMage/HeroArchMage.mdx', icon: 'ReplaceableTextures/CommandButtons/BTNHeroArchMage.blp' },
  paladin: { model: 'Units/Human/HeroPaladin/HeroPaladin.mdx', icon: 'ReplaceableTextures/CommandButtons/BTNHeroPaladin.blp' },
  mountainking: { model: 'Units/Human/HeroMountainKing/HeroMountainKing.mdx', icon: 'ReplaceableTextures/CommandButtons/BTNHeroMountainKing.blp' },
  bloodmage: { model: 'Units/Human/HeroBloodElf/HeroBloodElf.mdx', icon: 'ReplaceableTextures/CommandButtons/BTNHeroBloodElfPrince.blp' },
  blademaster: { model: 'Units/Orc/HeroBladeMaster/HeroBladeMaster.mdx', icon: 'ReplaceableTextures/CommandButtons/BTNHeroBlademaster.blp' },
  farseer: { model: 'Units/Orc/HeroFarSeer/HeroFarSeer.mdx', icon: 'ReplaceableTextures/CommandButtons/BTNHeroFarseer.blp' },
  tauren: { model: 'Units/Orc/HeroTaurenChieftain/HeroTaurenChieftain.mdx', icon: 'ReplaceableTextures/CommandButtons/BTNHeroTaurenChieftain.blp' },
  shadowhunter: { model: 'Units/Orc/HeroShadowHunter/HeroShadowHunter.mdx', icon: 'ReplaceableTextures/CommandButtons/BTNShadowHunter.blp' },
  deathknight: { model: 'Units/Undead/HeroDeathKnight/HeroDeathKnight.mdx', icon: 'ReplaceableTextures/CommandButtons/BTNHeroDeathKnight.blp' },
  lich: { model: 'Units/Undead/HeroLich/HeroLich.mdx', icon: 'ReplaceableTextures/CommandButtons/BTNHeroLich.blp' },
  dreadlord: { model: 'Units/Undead/HeroDreadLord/HeroDreadLord.mdx', icon: 'ReplaceableTextures/CommandButtons/BTNHeroDreadLord.blp' },
  cryptlord: { model: 'Units/Undead/HeroCryptLord/HeroCryptLord.mdx', icon: 'ReplaceableTextures/CommandButtons/BTNHeroCryptLord.blp' },
  demonhunter: { model: 'Units/NightElf/HeroDemonHunter/HeroDemonHunter.mdx', icon: 'ReplaceableTextures/CommandButtons/BTNHeroDemonHunter.blp' },
  keeper: { model: 'Units/NightElf/HeroKeeperoftheGrove/HeroKeeperoftheGrove.mdx', icon: 'ReplaceableTextures/CommandButtons/BTNKeeperOfTheGrove.blp' },
  moonpriestess: { model: 'Units/NightElf/HeroMoonPriestess/HeroMoonPriestess.mdx', icon: 'ReplaceableTextures/CommandButtons/BTNPriestessOfTheMoon.blp' },
  warden: { model: 'Units/NightElf/HeroWarden/HeroWarden.mdx', icon: 'ReplaceableTextures/CommandButtons/BTNHeroWarden.blp' },
};

/** Animations rendered for every hero, by WC3 sequence name. */
export const WC3_ANIMS = ['stand', 'walk', 'attack', 'spell', 'death'] as const;
export type Wc3Anim = (typeof WC3_ANIMS)[number];
/** Directions per animation, clockwise from facing up the screen. */
export const WC3_DIRS = 16;

/** Warcraft III command-card icons for each spell id (src/data/spells.ts). */
export const WC3_SPELL_ICONS: Record<string, string> = {
  gauss: 'ReplaceableTextures/CommandButtons/BTNManaBurn.blp',
  frag: 'ReplaceableTextures/CommandButtons/BTNMortarTeam.blp',
  flame: 'ReplaceableTextures/CommandButtons/BTNBreathOfFire.blp',
  mines: 'ReplaceableTextures/CommandButtons/BTNGoblinLandMine.blp',
  yamato: 'ReplaceableTextures/CommandButtons/BTNStormBolt.blp',
  matrix: 'ReplaceableTextures/CommandButtons/BTNDivineIntervention.blp',
  turret: 'ReplaceableTextures/CommandButtons/BTNSummonWaterElemental.blp',
  emp: 'ReplaceableTextures/CommandButtons/BTNThunderclap.blp',
  irradiate: 'ReplaceableTextures/CommandButtons/BTNBlizzard.blp',
  spines: 'ReplaceableTextures/CommandButtons/BTNDeathCoil.blp',
  spores: 'ReplaceableTextures/CommandButtons/BTNPlagueCloud.blp',
  bile: 'ReplaceableTextures/CommandButtons/BTNMeatWagon.blp',
  brood: 'ReplaceableTextures/CommandButtons/BTNCarrionScarabs.blp',
  scourge: 'ReplaceableTextures/CommandButtons/BTNLocustSwarm.blp',
  acidpool: 'ReplaceableTextures/CommandButtons/BTNDeathAndDecay.blp',
  spinenova: 'ReplaceableTextures/CommandButtons/BTNGlacier.blp',
  lurker: 'ReplaceableTextures/CommandButtons/BTNImpale.blp',
  glaive: 'ReplaceableTextures/CommandButtons/BTNCarrionSwarm.blp',
  blades: 'ReplaceableTextures/CommandButtons/BTNCleavingAttack.blp',
  photon: 'ReplaceableTextures/CommandButtons/BTNHeadhunter.blp',
  storm: 'ReplaceableTextures/CommandButtons/BTNEarthquake.blp',
  interceptors: 'ReplaceableTextures/CommandButtons/BTNWhirlwind.blp',
  arc: 'ReplaceableTextures/CommandButtons/BTNChainLightning.blp',
  prism: 'ReplaceableTextures/CommandButtons/BTNShockWave.blp',
  purnova: 'ReplaceableTextures/CommandButtons/BTNWarStomp.blp',
  scarab: 'ReplaceableTextures/CommandButtons/BTNDemolisher.blp',
  psiaura: 'ReplaceableTextures/CommandButtons/BTNLiquidFire.blp',
};

/** Warcraft III item icons for the supply-cache modules (src/data/modules.ts). */
export const WC3_ITEM_ICONS: Record<string, string> = {
  m_dmg: 'ReplaceableTextures/CommandButtons/BTNClawsOfAttack.blp',
  m_haste: 'ReplaceableTextures/CommandButtons/BTNGlove.blp',
  m_armor: 'ReplaceableTextures/CommandButtons/BTNRingGreen.blp',
  m_hp: 'ReplaceableTextures/CommandButtons/BTNPeriapt.blp',
  m_regen: 'ReplaceableTextures/CommandButtons/BTNRingSkull.blp',
  m_pick: 'ReplaceableTextures/CommandButtons/BTNAmulet.blp',
  m_min: 'ReplaceableTextures/CommandButtons/BTNChestOfGold.blp',
  m_area: 'ReplaceableTextures/CommandButtons/BTNMantleOfIntelligence.blp',
  m_crit: 'ReplaceableTextures/CommandButtons/BTNOrbOfFire.blp',
  m_move: 'ReplaceableTextures/CommandButtons/BTNBootsOfSpeed.blp',
  m_leech: 'ReplaceableTextures/CommandButtons/BTNMaskOfDeath.blp',
  m_react: 'ReplaceableTextures/CommandButtons/BTNTalisman.blp',
  m_echo: 'ReplaceableTextures/CommandButtons/BTNWand.blp',
  m_proj: 'ReplaceableTextures/CommandButtons/BTNSnazzyScroll.blp',
  m_revive: 'ReplaceableTextures/CommandButtons/BTNAnkh.blp',
  m_xel: 'ReplaceableTextures/CommandButtons/BTNHelmutPurple.blp',
};
