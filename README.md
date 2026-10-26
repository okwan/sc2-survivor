# Koprulu Survivors

A StarCraft-themed survivors game for the browser, modeled closely on
[Azeroth Survivors](https://azerothsurvivor.com/). Pick Terran, Zerg or Protoss, auto-cast
your race's abilities against endless swarms, level up through three-card draws, and kill
the zone's bosses before the final one arrives.

Fan project, not affiliated with Blizzard Entertainment.

## Play locally

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build in dist/
```

## How it plays

| Azeroth Survivors | Koprulu Survivors |
| --- | --- |
| 9 classes | 3 races: Terran (Marine), Zerg (Hydralisk), Protoss (Zealot) |
| Spells cast themselves | 7 race abilities each (projectiles, grenades, cones, auras, orbitals, mines, storms, chain lightning, beams, summons, novas, barriers), max 6 per run, ranks 1-8 |
| 3 cards per level, WoW item-quality rarity | Same: Common → Legendary, rarity scales the bonus. `1`/`2`/`3` to pick, `R` reroll, `B` banish |
| Movement spell at level 5 | Jet Pack / Burrow Lunge / Blink on `F`, `Space` or right-click, aimed at the cursor |
| Zones with bosses on a timer, enrage below 30% | 5 zones (Mar Sara, Char, Aiur, Korhal, Ulnar), bosses at 3/6/9/12 min, final boss at 16-20 min, enrage below 30%, endless mode after |
| Guardians sleeping in lairs drop gear; caches cost gold | Guardians in lairs drop gear; supply caches cost minerals; gear is kept per race |
| 51-point talent trees per class, 3 trees, milestones at 10/20/30 | Same per race. Capstones change your starting ability |
| Account perks (rerolls, banish, opening hand, extra lives, companion) | Rewards tab bought with vespene |

Controls: WASD / arrow keys, mouse wheel to zoom, `Esc` to pause. Touch devices get a virtual joystick.

## Tech

- TypeScript + Vite + [PixiJS 8](https://pixijs.com/) (WebGL) for rendering
- DOM overlay for HUD and menus
- Spatial hash grid, pooled sprites and entities; the simulation stays under 1 ms per frame with 600+ enemies
- All art is generated procedurally at startup; the repo ships no Blizzard assets
- Progress is saved in `localStorage`

## Layout

```
src/
  data/     races, spells, talents, enemies & zones, items/perks
  game/     simulation (game.ts), spell behaviours, cards, input, audio, spatial grid
  meta/     save data, talents, rewards
  render/   procedural textures
  ui/       HUD, menus, styles
```
