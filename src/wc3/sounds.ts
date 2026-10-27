// Warcraft III sounds for the player's hero and spells, fetched from the WC3 archives at deploy time
// (scripts/fetch-wc3.mjs ships them as wc3/sound/<path>). Several entries are variations picked at random.

/** Each hero's own attack sound, played as their attack swing starts. */
export const WC3_HERO_ATTACK_SOUNDS: Record<string, string[]> = {
  archmage: ['Abilities/Weapons/SorceressMissile/SorceressMissileLaunch1.wav', 'Abilities/Weapons/SorceressMissile/SorceressMissileLaunch2.wav', 'Abilities/Weapons/SorceressMissile/SorceressMissileLaunch3.wav'],
  bloodmage: ['Abilities/Weapons/BloodElfMissile/BloodMageRangedAttack.wav'],
  mountainking: ['Units/Human/HeroMountainKing/HeroMountainkingAttack1.wav'],
  deathknight: ['Units/Undead/HeroDeathKnight/HeroDeathKnightAttack1.wav'],
  dreadlord: ['Units/Undead/HeroDreadLord/HeroDreadlordAttack1.wav'],
  lich: ['Units/Undead/HeroLich/LichAttackEffort1.wav', 'Units/Undead/HeroLich/LichAttackEffort2.wav', 'Units/Undead/HeroLich/LichAttackEffort3.wav'],
  tauren: ['Units/Orc/HeroTaurenChieftain/HeroTaurenChieftainAttack1.wav', 'Units/Orc/HeroTaurenChieftain/HeroTaurenChieftainAttack2.wav', 'Units/Orc/HeroTaurenChieftain/HeroTaurenChieftainAttack3.wav'],
  blademaster: ['Units/Orc/HeroBladeMaster/HeroBlademasterAttack1.wav', 'Units/Orc/HeroBladeMaster/HeroBlademasterAttack2.wav'],
  farseer: ['Abilities/Weapons/FarseerMissile/FarseerMissileLaunch.wav'],
};

/** The WC3 ability each spell stands for (see WC3_SPELL_ICONS), played when it is cast. */
export const WC3_SPELL_SOUNDS: Record<string, string[]> = {
  gauss: ['Abilities/Weapons/SorceressMissile/SorceressMissileLaunch1.wav', 'Abilities/Weapons/SorceressMissile/SorceressMissileLaunch2.wav'],
  frag: ['Abilities/Spells/Human/FragmentationShards/FragBombs.wav'],
  flame: ['Abilities/Spells/Other/BreathOfFire/BreathOfFire1.wav'],
  yamato: ['Abilities/Spells/Human/StormBolt/StormBoltLaunch.wav'],
  matrix: ['Abilities/Spells/Human/DivineShield/DivineShield.wav'],
  emp: ['Abilities/Spells/Human/Thunderclap/ThunderclapCaster.wav'],
  irradiate: ['Abilities/Spells/Human/Blizzard/BlizzardTarget1.wav', 'Abilities/Spells/Human/Blizzard/BlizzardTarget2.wav', 'Abilities/Spells/Human/Blizzard/BlizzardTarget3.wav'],
  spines: ['Abilities/Spells/Undead/DeathCoil/DeathCoilMissileLaunch1.wav'],
  bile: ['Units/Undead/Meatwagon/CatapultAttack1.wav'],
  acidpool: ['Abilities/Spells/Undead/DeathandDecay/DeathAndDecayTarget1.wav', 'Abilities/Spells/Undead/DeathandDecay/DeathAndDecayTarget2.wav', 'Abilities/Spells/Undead/DeathandDecay/DeathAndDecayTarget3.wav'],
  spinenova: ['Abilities/Spells/Undead/FrostNova/FrostNovaTarget1.wav'],
  lurker: ['Abilities/Spells/Undead/Impale/ImpaleLaunch1.wav'],
  glaive: ['Abilities/Spells/Undead/CarrionSwarm/CarrionSwarmLaunch1.wav'],
  blades: ['Sound/Units/Combat/MetalHeavySliceFlesh1.wav', 'Sound/Units/Combat/MetalHeavySliceFlesh2.wav', 'Sound/Units/Combat/MetalHeavySliceFlesh3.wav'],
  photon: ['Abilities/Weapons/huntermissile/HeadHunterMissileLaunch.wav'],
  storm: ['Abilities/Spells/Orc/EarthQuake/EarthquakeRock.wav'],
  arc: ['Abilities/Spells/Orc/LightningBolt/LightningBolt.wav'],
  prism: ['Abilities/Spells/Orc/Shockwave/Shockwave.wav'],
  purnova: ['Units/Orc/HeroTaurenChieftain/WarStompBirth1.wav'],
  scarab: ['Abilities/Weapons/CannonTowerMissile/CannonTowerMissileLaunch1.wav', 'Abilities/Weapons/CannonTowerMissile/CannonTowerMissileLaunch2.wav', 'Abilities/Weapons/CannonTowerMissile/CannonTowerMissileLaunch3.wav'],
};

export const WC3_SOUND_FILES = [...new Set([...Object.values(WC3_HERO_ATTACK_SOUNDS), ...Object.values(WC3_SPELL_SOUNDS)].flat())];
