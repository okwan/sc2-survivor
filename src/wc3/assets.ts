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
