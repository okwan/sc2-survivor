/**
 * StarCraft sound effects for each game sound, as literal paths so scripts/fetch-bw.mjs bundles
 * them (sound\... inside the MPQs). A sound with several files picks one at random each time.
 */
export const BW_SOUNDS: Record<string, string[]> = {
  'shoot:terran': ['sound/bullet/tmafir00.wav'],
  'shoot:zerg': ['sound/bullet/zhyfir00.wav'],
  'shoot:protoss': ['sound/bullet/dragbull.wav'],
  hit: ['sound/bullet/psiblade.wav'],
  explode: ['sound/misc/explosm.wav', 'sound/misc/explo1.wav', 'sound/misc/explo2.wav', 'sound/misc/explo3.wav'],
  'explode:big': ['sound/misc/explolrg.wav', 'sound/misc/explomed.wav'],
  pickup: ['sound/terran/scv/tscmin00.wav', 'sound/terran/scv/tscmin01.wav'],
  'level:terran': ['sound/terran/advisor/tadupd00.wav'],
  'level:zerg': ['sound/zerg/advisor/zadupd00.wav'],
  'level:protoss': ['sound/protoss/advisor/padupd00.wav'],
  boss: ['sound/misc/transmission.wav'],
  hurt: ['sound/bullet/zdrhit00.wav', 'sound/bullet/zhyhit00.wav'],
  'dash:terran': ['sound/terran/marine/tmasti00.wav', 'sound/terran/marine/tmasti01.wav'],
  'dash:zerg': ['sound/misc/burrowup.wav'],
  'dash:protoss': ['sound/misc/pshtra00.wav'],
  select: ['sound/glue/mousedown2.wav'],
  zap: ['sound/bullet/psibolt.wav', 'sound/bullet/laserb.wav'],
  win: ['sound/misc/youwin.wav'],
  lose: ['sound/misc/youlose.wav'],
  // unit deaths, by enemy shape
  'death:ling': ['sound/zerg/zergling/zzedth00.wav'],
  'death:broodling': ['sound/zerg/broodling/zbrdth00.wav'],
  'death:hydra': ['sound/zerg/hydra/zhydth00.wav'],
  'death:roach': ['sound/zerg/lurker/zludth00.wav'],
  'death:bane': ['sound/zerg/bugguy/zbgdth00.wav'],
  'death:muta': ['sound/zerg/mutalid/zmudth00.wav'],
  'death:ultra': ['sound/zerg/ultra/zuldth00.wav'],
  'death:zealot': ['sound/protoss/zealot/pzedth00.wav'],
  'death:stalker': ['sound/protoss/dragoon/pdrdth00.wav'],
  'death:archon': ['sound/protoss/archon/pardth00.wav'],
  'death:hybrid': ['sound/protoss/darktemplar/pdtdth00.wav'],
  'death:marine': ['sound/terran/marine/tmadth00.wav', 'sound/terran/marine/tmadth01.wav'],
  'death:firebat': ['sound/terran/firebat/tfbdth00.wav', 'sound/terran/firebat/tfbdth01.wav', 'sound/terran/firebat/tfbdth02.wav'],
  'death:tank': ['sound/terran/tank/ttadth00.wav'],
};

export const BW_SOUND_FILES = [...new Set(Object.values(BW_SOUNDS).flat())];
