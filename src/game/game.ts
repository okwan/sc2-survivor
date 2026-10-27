import { Application, Container, Graphics, Sprite, Texture, TilingSprite } from 'pixi.js';
import { AFFIXES, AFFIX_BY_ID, type AffixId } from '../data/affixes';
import { DIFFICULTIES, type DifficultyDef } from '../data/difficulty';
import { MODULES, modulePrice, type ModuleDef } from '../data/modules';
import { ZONE_EVENTS, type ZoneEvent } from '../data/mutators';
import { ENEMIES, ZONES, type BossDef, type EnemyDef, type ZoneDef } from '../data/enemies';
import { rollGear, type GearItem } from '../data/items';
import { RACE_DEFS, type RaceDef } from '../data/races';
import { SPELL_BY_ID, spellStatsAtRank } from '../data/spells';
import { addMods, baseStats, type Rarity, type SpellMod, type StatKey, type StatMods, type Stats, type RaceId } from '../data/types';
import { gearStats, perkLevel, perkStats, save, talentBonuses } from '../meta/save';
import { glyph } from '../render/glyphs';
import { enemyTexture, fx, groundTexture, heroTexture, minionTexture, pickupTexture, propTexture } from '../render/textures';
import { bwDoodads, bwSprite, bwTerrain, orientBw, type BwSprite } from '../bw/assets';
import { sfx } from './audio';
import { rollRarity } from './cards';
import type { BossState, Cache, ChainFx, Enemy, EnemyShot, Field, Fx, Gem, Lair, Lob, Mine, Minion, Pickup, PickupKind, Projectile, SpellInstance, Telegraph } from './entities';
import { MAX_SLOTS } from './entities';
import { SpatialGrid } from './grid';
import { damp, hyp } from './math';
import type { Input } from './input';
import { spellIcon } from '../bw/ui';
import { castSpell, updateMinions, updatePersistent } from './spells';

const WORLD = 4000; // half-size: world spans -WORLD..WORLD
const MAX_ENEMIES = 1400;
const MAX_ALIVE = 650;
const MAX_GEMS = 700;
const DASH_UNLOCK = 5;
const SLOT_NUKE = 7;
const SLOT_FEEDBACK = 8;
const SLOT_DASH = 9;
const SLOT_RACIAL = 10;

export interface RunResult {
  won: boolean;
  time: number;
  kills: number;
  level: number;
  bosses: number;
  zone: ZoneDef;
  race: RaceId;
  endless: boolean;
  difficulty: DifficultyDef;
  mutators: string[];
  damage: { name: string; icon: string; dmg: number }[];
  killedBy: string;
}

export interface GameHooks {
  levelUp: () => void;
  gear: (item: GearItem) => void;
  bossSpawned: (name: string, title: string) => void;
  victory: () => void;
  ended: (r: RunResult) => void;
  toast: (msg: string, color?: string) => void;
  /** Walking into a supply cache opens its shop. */
  cacheShop: (offers: CacheOffer[], gearCost: number, buy: (o: CacheOffer | 'gear' | null) => void) => void;
}

export interface CacheOffer {
  mod: ModuleDef;
  price: number;
}

interface Player {
  x: number;
  y: number;
  hp: number;
  shield: number;
  barrier: number;
  barrierTime: number;
  level: number;
  xp: number;
  minerals: number;
  kills: number;
  facing: number;
  lastHit: number;
  invuln: number;
  dashCd: number;
  dashT: number;
  dashVx: number;
  dashVy: number;
  stimCd: number;
  stimT: number;
  feedbackCd: number;
  nukeCd: number;
  revivesUsed: number;
  regenAcc: number;
}

interface DmgText {
  c: Container;
  glyphs: Sprite[];
  life: number;
  vy: number;
  /** Enemy this number belongs to, so rapid hits on one target add up instead of stacking. */
  uid: number;
  val: number;
}

const MAX_TEXTS = 40;

export class Game {
  app: Application;
  input: Input;
  hooks: GameHooks;
  zone: ZoneDef;
  race: RaceDef;
  root = new Container();
  world = new Container();
  ground!: TilingSprite;
  // Each busy layer is its own render group: pooled sprites flipping `visible` (and culling) then only
  // rebuild that layer's draw list instead of the whole scene's.
  layers = {
    ground: new Container({ isRenderGroup: true }),
    pickups: new Container({ isRenderGroup: true }),
    shadows: new Container(),
    units: new Container({ isRenderGroup: true }),
    top: new Container(),
    bwfx: new Container({ isRenderGroup: true }), // Brood War animated effects (normal blending)
    fx: new Container({ isRenderGroup: true }),
    text: new Container({ isRenderGroup: true }),
    overlay: new Container(), // telegraphs, boss rings, pickup range: pooled sprites instead of Graphics
  };
  gfx = new Graphics();
  private gfxDirty = false;
  private ovDisc = new SpritePass(this.layers.overlay, () => fx.disc());
  private ovRing = new SpritePass(this.layers.overlay, () => fx.ring());
  private ovLine = new SpritePass(this.layers.overlay, () => Texture.WHITE, 0);
  heroSprite!: Sprite;
  private heroBw: BwSprite | null = null;
  private heroAngle = 0;
  barrierSprite!: Sprite;

  diff: DifficultyDef = DIFFICULTIES[save.difficulty] ?? DIFFICULTIES[0];
  mutators = new Set<string>(save.mutators);
  private nextEvent = 105;
  private mutT = { rift: 60, lava: 30, missiles: 40 };
  private rifts: { e: Enemy; uid: number; next: number }[] = [];
  time = 0;
  /** Real seconds left of a hit-stop freeze (boss kills) and of slow motion (elite kills). */
  private hitstop = 0;
  private slowmo = 0;
  paused = false;
  over = false;
  victoryShown = false;
  endless = false;
  zoom = 1;
  shakeAmt = 0;
  camX = 0;
  camY = 0;

  player: Player;
  stats: Stats = baseStats();
  flags: Set<string>;
  talentMods: StatMods;
  spellMods: Record<string, SpellMod>;
  passiveMods: StatMods = {};
  passivePicks: Record<string, number> = {};
  banished = new Set<string>();
  rerollsUsed = 0;
  banishesUsed = 0;
  firstLevelUp = true;
  pendingLevels = 0;
  spells: SpellInstance[] = [];
  bossesKilled = 0;

  enemies: Enemy[] = [];
  enemyCount = 0;
  private enemyPool: Enemy[] = [];
  bosses: Enemy[] = [];
  private uid = 1;
  private grid: SpatialGrid;
  private qbuf = new Int32Array(4096);
  projectiles: Projectile[] = [];
  shots: EnemyShot[] = [];
  gems: Gem[] = [];
  pickups: Pickup[] = [];
  lairs: Lair[] = [];
  caches: Cache[] = [];
  fxs: Fx[] = [];
  fields: Field[] = [];
  mines: Mine[] = [];
  lobs: Lob[] = [];
  minions: Minion[] = [];
  telegraphs: Telegraph[] = [];
  chains: ChainFx[] = [];
  dmgTexts: DmgText[] = [];
  private freeTexts: DmgText[] = [];
  props: Sprite[] = [];
  private spritePool = new Map<Container, Sprite[]>();

  private spawnAcc = 0;
  private nextBoss = 0;
  private nextElite = 120; // later zones' elites (archons, hybrids) were killing fresh heroes at 1:30
  private nextSurge = 60;
  private nextMagnet = 75;
  private cacheCost = -1; // set on first use: starts higher in later zones
  private endlessBossT = 120;
  private endlessIdx = 0;
  /** Delayed actions on game time, so they wait while the game is paused. */
  private timers: { at: number; fn: () => void }[] = [];
  /** Damage from talents that aren't spells (burn, nuke, feedback, dash), for the results screen. */
  private extraDmg: Record<number, number> = {};
  /** The last enemy that hurt the player. */
  lastHitBy = '';
  private edgeWarnAt = 0;
  probe: Minion | null = null;
  /** Active racial timers: next Orbital Strike / Guardian Shield, Burrow ready time, Guardian Shield left. */
  racialAt = 30;
  guardT = 0;
  private reactiveAt = 0;
  private frameMs = 16;

  constructor(app: Application, input: Input, raceId: RaceId, zone: ZoneDef, hooks: GameHooks) {
    this.app = app;
    this.input = input;
    this.hooks = hooks;
    this.zone = zone;
    this.race = RACE_DEFS[raceId];
    const tb = talentBonuses(raceId);
    this.flags = tb.flags;
    this.talentMods = tb.stats;
    this.spellMods = tb.spells;
    this.grid = new SpatialGrid(-WORLD - 200, -WORLD - 200, WORLD * 2 + 400, WORLD * 2 + 400, 80, MAX_ENEMIES);
    this.player = {
      x: 0, y: 0, hp: 1, shield: 0, barrier: 0, barrierTime: 0, level: 1, xp: 0,
      minerals: perkLevel('minerals') * 40, kills: 0, facing: 0, lastHit: -10, invuln: 0,
      dashCd: 0, dashT: 0, dashVx: 0, dashVy: 0, stimCd: 12, stimT: 0, feedbackCd: 0, nukeCd: 6, revivesUsed: 0, regenAcc: 0,
    };

    this.buildScene();
    this.recomputeStats();
    this.player.hp = this.stats.maxHp;
    this.player.shield = this.stats.maxShield;
    const z = this.zone;
    // build every enemy texture this zone uses now, so the first appearance of a unit doesn't hitch
    const ids = new Set([...z.waves.flatMap((w) => w.pool.map(([id]) => id)), z.elite, z.guardian]);
    for (const id of ids) {
      const d = ENEMIES[id];
      if (d) enemyTexture(d.shape, d.color, d.radius);
    }
    for (const b of [...z.bosses, z.final]) enemyTexture(b.shape, b.color, b.radius);
    // later zones start you with a few free level-ups so the first minute isn't a stat check
    const zi = ZONES.findIndex((x) => x.id === z.id);
    if (zi > 0) {
      this.player.level += zi * 3;
      this.pendingLevels += zi * 3;
    }
    // a capstone's spell comes on top of the race's own starter, never instead of it
    this.learnSpell(this.race.startSpell, 0);
    if (tb.startSpell && tb.startSpell !== this.race.startSpell) this.learnSpell(tb.startSpell, 0);
    this.zoom = save.settings.zoom * (Math.min(window.innerWidth, window.innerHeight) < 600 ? 0.75 : 1);
  }

  // ------------------------------------------------------------ scene
  private buildScene() {
    const z = this.zone;
    const bwGround = bwTerrain(z.id);
    this.ground = new TilingSprite({ texture: bwGround ?? groundTexture(z.ground[0], z.ground[1], z.doodad), width: this.app.screen.width, height: this.app.screen.height });
    this.root.addChild(this.ground);
    this.root.addChild(this.world);
    for (const l of Object.values(this.layers)) this.world.addChild(l);
    this.world.addChild(this.gfx);
    this.layers.fx.blendMode = 'add';

    // arena border
    const border = new Graphics();
    border.rect(-WORLD, -WORLD, WORLD * 2, WORLD * 2).stroke({ width: 12, color: 0xff3030, alpha: 0.35 });
    border.rect(-WORLD - 2000, -WORLD - 2000, WORLD * 2 + 4000, 2000).fill({ color: 0x000000, alpha: 0.6 });
    border.rect(-WORLD - 2000, WORLD, WORLD * 2 + 4000, 2000).fill({ color: 0x000000, alpha: 0.6 });
    border.rect(-WORLD - 2000, -WORLD, 2000, WORLD * 2).fill({ color: 0x000000, alpha: 0.6 });
    border.rect(WORLD, -WORLD, 2000, WORLD * 2).fill({ color: 0x000000, alpha: 0.6 });
    this.layers.ground.addChild(border);

    // scattered props: Brood War mineral fields and geysers on BW ground, procedural ones otherwise
    const bwProps = bwGround ? (['prop:min1', 'prop:min2', 'prop:min3', 'prop:min1', 'prop:geyser'] as const).map((k) => bwSprite(k)).filter((b): b is BwSprite => !!b) : [];
    for (let i = 0; bwProps.length && i < 140; i++) {
      const b = bwProps[Math.floor(Math.random() * bwProps.length)];
      const s = new Sprite(b.frames[0]);
      s.anchor.set(0.5);
      s.position.set((Math.random() * 2 - 1) * WORLD, (Math.random() * 2 - 1) * WORLD);
      if (hyp(s.x, s.y) < 260) continue;
      this.layers.ground.addChild(s);
      this.props.push(s);
    }
    const dds = bwGround ? bwDoodads(z.id) : [];
    for (let i = 0; dds.length && i < 320; i++) {
      const d = dds[Math.floor(Math.random() * dds.length)];
      const x = (Math.random() * 2 - 1) * WORLD;
      const y = (Math.random() * 2 - 1) * WORLD;
      if (hyp(x, y) < 260) continue;
      for (const b of d.shadow ? [d.shadow, d.img] : [d.img]) {
        const s = new Sprite(b.frames[0]);
        s.anchor.set(0.5);
        s.position.set(x, y);
        this.layers.ground.addChild(s);
        this.props.push(s);
      }
    }
    const kinds = ['rock', 'rock', 'crystal', 'bones', 'pylon'] as const;
    for (let i = 0; !bwProps.length && i < 520; i++) {
      const k = kinds[Math.floor(Math.random() * kinds.length)];
      const s = new Sprite(propTexture(k, z.doodad, Math.floor(Math.random() * 6)));
      s.anchor.set(0.5);
      s.position.set((Math.random() * 2 - 1) * WORLD, (Math.random() * 2 - 1) * WORLD);
      if (hyp(s.x, s.y) < 200) continue;
      s.alpha = k === 'bones' ? 0.6 : 0.9;
      this.layers.ground.addChild(s);
      this.props.push(s);
    }

    // guardian lairs
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + Math.random() * 0.5;
      const d = 1600 + Math.random() * 1900; // not right next to the start
      const x = Math.cos(a) * d;
      const y = Math.sin(a) * d;
      const spr = new Sprite(pickupTexture('lair'));
      spr.anchor.set(0.5);
      spr.position.set(x, y);
      this.layers.ground.addChild(spr);
      const lair: Lair = { x, y, sprite: spr, guardian: null, cleared: false };
      this.lairs.push(lair);
      const def = ENEMIES[this.zone.guardian];
      const g = this.spawnEnemy(def, x, y, { hpMult: 6, elite: true, scale: 1.5 });
      if (g) {
        g.asleep = true;
        g.lair = lair;
        lair.guardian = g;
      }
    }

    // supply caches
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const d = 450 + Math.random() * 3200;
      const spr = new Sprite(pickupTexture('cache'));
      spr.anchor.set(0.5);
      spr.position.set(Math.cos(a) * d, Math.sin(a) * d);
      this.layers.pickups.addChild(spr);
      this.caches.push({ x: spr.x, y: spr.y, sprite: spr, opened: false, label: null });
    }

    // hero
    const shadow = new Sprite(fx.shadow());
    shadow.anchor.set(0.5);
    shadow.scale.set(0.9);
    this.layers.shadows.addChild(shadow);
    this.heroSprite = new Sprite(heroTexture(this.race.id));
    this.heroBw = bwSprite(`hero:${this.race.id}`) ?? null;
    this.heroSprite.anchor.set(0.5);
    this.heroSprite.scale.set(1.25);
    this.layers.units.addChild(this.heroSprite);
    (this.heroSprite as Sprite & { shadow?: Sprite }).shadow = shadow;
    this.barrierSprite = new Sprite(fx.disc());
    this.barrierSprite.anchor.set(0.5);
    this.barrierSprite.tint = 0x6ad1ff;
    this.barrierSprite.visible = false;
    this.layers.top.addChild(this.barrierSprite);

    if (perkLevel('probe') > 0) {
      this.probe = this.addMinion('probe', -2, 30, 30, Infinity, 0);
    }
  }

  private sprite(layer: Container, tex: Texture): Sprite {
    const pool = this.spritePool.get(layer);
    let s = pool?.pop();
    if (s) {
      s.texture = tex;
      s.visible = true;
      s.alpha = 1;
      s.tint = 0xffffff;
      s.rotation = 0;
      s.scale.set(1);
    } else {
      s = new Sprite(tex);
      s.anchor.set(0.5);
      layer.addChild(s);
    }
    return s;
  }

  private release(layer: Container, s: Sprite) {
    s.visible = false;
    let pool = this.spritePool.get(layer);
    if (!pool) this.spritePool.set(layer, (pool = []));
    pool.push(s);
  }

  // ------------------------------------------------------------ stats
  recomputeStats() {
    const s = baseStats();
    const mods: StatMods = {};
    addMods(mods, this.race.stats);
    addMods(mods, this.talentMods);
    addMods(mods, gearStats(this.race.id));
    addMods(mods, perkStats());
    addMods(mods, this.passiveMods);
    for (const k in mods) s[k as StatKey] += mods[k as StatKey] ?? 0;
    if (this.flags.has('primal')) s.maxHp *= 1.5;
    if (this.flags.has('rapidRecharge')) {
      s.shieldDelay *= 0.5;
      s.shieldRegen *= 1.5;
    }
    if (this.player?.stimT > 0) {
      s.haste += 0.4;
      s.moveSpeed *= 1.3;
    }
    s.maxHp = Math.max(1, s.maxHp);
    s.critChance = Math.min(1, s.critChance);
    s.dodge = Math.min(0.6, s.dodge);
    this.stats = s;
    for (const sp of this.spells) this.computeSpell(sp);
  }

  private computeSpell(sp: SpellInstance) {
    const b = spellStatsAtRank(sp.def, sp.rank);
    const m = this.spellMods[sp.def.id] ?? {};
    const s = this.stats;
    const k = sp.def.kind;
    const mast = sp.mastery ?? 0;
    const usesCount = k === 'bolt' || k === 'lob' || k === 'summon' || k === 'orbit' || k === 'mine' || k === 'beam' || k === 'field' || k === 'chain';
    sp.stats = {
      damage: b.damage * (1 + (m.damage ?? 0) + sp.bonus) * s.damage,
      cooldown: (b.cooldown * Math.max(0.3, 1 - (m.cooldown ?? 0))) / (1 + s.haste + mast * 0.04),
      count: Math.floor(b.count + (m.count ?? 0) + (usesCount && k !== 'chain' ? s.extraProj : 0) + 1e-6),
      area: b.area * (1 + (m.area ?? 0) + mast * 0.05) * (k === 'bolt' || k === 'summon' ? 1 : s.area),
      pierce: Math.floor(b.pierce + (m.pierce ?? 0) + 1e-6),
      duration: b.duration * (1 + (m.duration ?? 0)) * (k === 'bolt' ? 1 : s.duration),
      speed: k === 'bolt' || k === 'summon' ? b.speed * s.projSpeed : b.speed,
    };
    const ev = sp.evo;
    if (ev) {
      const st = sp.stats;
      st.damage *= ev.mult?.damage ?? 1;
      st.area *= ev.mult?.area ?? 1;
      st.cooldown *= ev.mult?.cooldown ?? 1;
      st.duration *= ev.mult?.duration ?? 1;
      st.count += ev.add?.count ?? 0;
      st.pierce += ev.add?.pierce ?? 0;
    }
  }

  learnSpell(id: string, bonus: number) {
    const def = SPELL_BY_ID[id];
    if (!def || this.spells.some((s) => s.def.id === id)) return;
    const used = new Set(this.spells.map((s) => s.slot));
    let slot = 0;
    while (used.has(slot)) slot++;
    const sp: SpellInstance = {
      def, rank: 1, bonus, timer: 0.3, slot, stats: { ...def.base }, angle: 0, orbiters: [], auraSprite: null, dmgDone: 0, nextSpawn: 0,
    };
    this.spells.push(sp);
    this.computeSpell(sp);
  }

  spellBySlot(slot: number): SpellInstance | undefined {
    return this.spells.find((s) => s.slot === slot);
  }

  get xpNeeded(): number {
    const l = this.player.level - 1;
    // steeper early: the old curve gave ~12 level-ups in the first minute, a card screen every 5 s
    return Math.round(8 + l * 3 + Math.pow(l, 1.8) * 0.22);
  }

  // ------------------------------------------------------------ enemies
  /** Enemy health and damage multipliers at minute m. */
  private enemyScale(m: number) {
    // harder zones ramp up to their full tier over the first ~70% of the run instead of starting there
    // (starting at 20% of the tier still killed fresh heroes on Aiur and Ulnar inside two minutes)
    const ramp = Math.min(1, 0.05 + (0.95 * m) / (this.zone.minutes * 0.7));
    const tier = (1 + (this.zone.tier - 1) * ramp) * (this.endless ? 1 + (m - this.zone.minutes) * 0.08 : 1);
    return { hp: tier * (1 + m * 0.16 + m * m * 0.012) * this.diff.hp, dmg: Math.pow(tier, 0.85) * (1 + m * 0.07) * this.diff.dmg };
  }

  spawnEnemy(def: EnemyDef, x: number, y: number, opts: { hpMult?: number; elite?: boolean; boss?: BossDef; final?: boolean; scale?: number } = {}): Enemy | null {
    if (this.enemyCount >= MAX_ENEMIES) return null;
    const { hp: hpScale, dmg: dmgScale } = this.enemyScale(this.time / 60);
    let e = this.enemyPool.pop();
    const shape = opts.boss?.shape ?? def.shape;
    const color = opts.boss?.color ?? def.color;
    const radius = opts.boss?.radius ?? def.radius;
    const tex = enemyTexture(shape, color, radius);
    if (!e) {
      const spr = new Sprite(tex);
      spr.anchor.set(0.5);
      e = {
        uid: 0, idx: -1, def, x, y, kx: 0, ky: 0, hp: 1, maxHp: 1, speed: 1, damage: 1, radius: 1, mass: 1, xp: 1, sprite: spr, flash: 0, slow: 0,
        burnDps: 0, burnTime: 0, burnTick: 0, contactCd: 0, shotTimer: 0, elite: false, boss: null, lair: null, asleep: false,
        hitStamp: new Float32Array(MAX_SLOTS).fill(-99), charge: 0, windup: 0, cdx: 0, cdy: 0, facing: 0, bw: null, bwScale: 1,
        affixes: [], shieldHp: 0, baseTint: 0xffffff, revived: false,
      };
    }
    e.uid = this.uid++;
    e.def = def;
    e.x = x;
    e.y = y;
    e.kx = e.ky = 0;
    e.flash = 0;
    e.slow = 0;
    e.burnDps = e.burnTime = e.burnTick = 0;
    e.contactCd = 0;
    e.shotTimer = (def.shotCd ?? 3) * Math.random();
    e.elite = !!opts.elite;
    e.lair = null;
    e.asleep = false;
    e.charge = 0;
    e.windup = 0;
    e.hitStamp.fill(-99);
    e.affixes.length = 0;
    e.shieldHp = 0;
    e.revived = false;
    e.baseTint = opts.elite ? 0xffe9a0 : 0xffffff;
    if (opts.boss) {
      const b = opts.boss;
      // final bosses were long, low-threat fights; they have less health and attack more often instead
      const bossHp = b.hp * (opts.final ? 0.65 : 1) * Math.pow(this.zone.tier, 0.5) * (this.endless ? 1 + this.endlessIdx * 0.6 : 1) * this.diff.hp;
      e.maxHp = bossHp;
      e.speed = b.speed;
      e.damage = b.damage * Math.pow(this.zone.tier, 0.6) * this.diff.dmg;
      e.radius = b.radius;
      e.mass = 20;
      e.xp = 60;
      e.boss = { def: b, abilityTimer: 2.5, enraged: false, charging: 0, chargeDx: 0, chargeDy: 0, windup: 0, final: !!opts.final, phase2: false };
      this.bosses.push(e);
    } else {
      e.maxHp = def.hp * hpScale * (opts.hpMult ?? 1);
      e.speed = def.speed * (0.92 + Math.random() * 0.16) * (this.mutators.has('speed') ? 1.3 : 1);
      e.damage = def.damage * dmgScale;
      e.radius = def.radius * (opts.scale ?? 1);
      e.mass = (def.mass ?? 1) * (opts.elite ? 4 : 1);
      e.xp = def.xp * (opts.elite ? 12 : 1);
      e.boss = null;
    }
    e.hp = e.maxHp;
    if (this.mutators.has('barrier') && (opts.elite || opts.boss)) e.shieldHp = e.maxHp * 0.5;
    else if (this.mutators.has('power') && !opts.boss) e.shieldHp = e.maxHp * 0.3;
    const spr = e.sprite;
    spr.texture = tex;
    spr.visible = true;
    spr.alpha = 1;
    e.bw = bwSprite(shape) ?? null;
    if (e.bw) {
      e.bwScale = (radius * (opts.boss ? 1 : opts.scale ?? 1) * 2.5) / e.bw.size;
      spr.texture = e.bw.frames[0];
    }
    spr.scale.set(opts.boss ? 1 : opts.scale ?? 1);
    spr.tint = e.baseTint;
    spr.position.set(x, y);
    if (!spr.parent) this.layers.units.addChild(spr);
    e.idx = this.enemyCount;
    this.enemies[this.enemyCount++] = e;
    return e;
  }

  private removeEnemyAt(i: number) {
    const e = this.enemies[i];
    e.sprite.visible = false;
    if (e.boss) this.bosses.splice(this.bosses.indexOf(e), 1);
    this.enemyCount--;
    const last = this.enemies[this.enemyCount];
    this.enemies[i] = last;
    last.idx = i;
    this.enemies[this.enemyCount] = e;
    e.idx = -1;
    e.hp = 0;
    this.enemyPool.push(e);
  }

  private nbuf = new Int32Array(4096);

  nearestEnemy(x: number, y: number, maxDist: number, exclude?: Set<number>): Enemy | null {
    let best: Enemy | null = null;
    let bd = maxDist * maxDist;
    // short searches (chain hops, broodlings, turrets) go through the spatial grid instead of every enemy
    const useGrid = maxDist <= 800;
    const n = useGrid ? this.grid.query(x, y, maxDist + 40, this.nbuf) : this.enemyCount;
    for (let k = 0; k < n; k++) {
      const e = this.enemies[useGrid ? this.nbuf[k] : k];
      if (!e) continue;
      if (e.asleep || e.hp <= 0 || !this.revealed(e)) continue;
      if (exclude && exclude.has(e.uid)) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d < bd) {
        bd = d;
        best = e;
      }
    }
    return best;
  }

  /** Puts a boss in range at the front of a target list, so single-target spells don't get screened by its adds. */
  preferBoss(targets: Enemy[], range: number): Enemy[] {
    const p = this.player;
    for (const b of this.bosses) {
      if (b.hp <= 0 || (b.x - p.x) ** 2 + (b.y - p.y) ** 2 > range * range) continue;
      const i = targets.indexOf(b);
      if (i > 0) targets.splice(i, 1);
      if (i !== 0) targets.unshift(b);
      if (targets.length > 1 && i < 0) targets.pop();
      break;
    }
    return targets;
  }

  nearestEnemies(x: number, y: number, n: number, maxDist: number): Enemy[] {
    const res: Enemy[] = [];
    const dists: number[] = [];
    const md = maxDist * maxDist;
    for (let i = 0; i < this.enemyCount; i++) {
      const e = this.enemies[i];
      if (e.asleep || e.hp <= 0 || !this.revealed(e)) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const d = dx * dx + dy * dy;
      if (d > md) continue;
      if (res.length < n) {
        let j = res.length;
        res.push(e);
        dists.push(d);
        while (j > 0 && dists[j - 1] > d) {
          res[j] = res[j - 1];
          dists[j] = dists[j - 1];
          j--;
        }
        res[j] = e;
        dists[j] = d;
      } else if (d < dists[n - 1]) {
        let j = n - 1;
        while (j > 0 && dists[j - 1] > d) {
          res[j] = res[j - 1];
          dists[j] = dists[j - 1];
          j--;
        }
        res[j] = e;
        dists[j] = d;
      }
    }
    return res;
  }

  randomEnemiesNear(x: number, y: number, r: number, n: number): Enemy[] {
    const cands: Enemy[] = [];
    const r2 = r * r;
    for (let i = 0; i < this.enemyCount; i++) {
      const e = this.enemies[i];
      if (e.asleep || !this.revealed(e)) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy < r2) cands.push(e);
    }
    const out: Enemy[] = [];
    while (out.length < n && cands.length) {
      const k = Math.floor(Math.random() * cands.length);
      out.push(cands[k]);
      cands[k] = cands[cands.length - 1];
      cands.pop();
    }
    return out;
  }

  /** Picks enemies that have the most neighbours, for fields and nukes. */
  denseTargets(x: number, y: number, r: number, n: number): Enemy[] {
    const sample = this.randomEnemiesNear(x, y, r, 14);
    const scored = sample.map((e) => {
      const c = this.grid.query(e.x, e.y, 90, this.qbuf);
      return { e, c };
    });
    scored.sort((a, b) => b.c - a.c);
    const out: Enemy[] = [];
    for (const s of scored) {
      if (out.length >= n) break;
      if (out.some((o) => hyp(o.x - s.e.x, o.y - s.e.y) < 80)) continue;
      out.push(s.e);
    }
    return out;
  }

  private scratch: Enemy[][] = [];
  private scratchDepth = 0;

  forEnemiesInRadius(x: number, y: number, r: number, fn: (e: Enemy) => void) {
    const n = this.grid.query(x, y, r + 80, this.qbuf);
    // copy into a reusable buffer, since fn may kill enemies and reshuffle the array
    const hits = (this.scratch[this.scratchDepth] ??= []);
    hits.length = 0;
    this.scratchDepth++;
    for (let k = 0; k < n; k++) {
      const e = this.enemies[this.qbuf[k]];
      // sleeping guardians can be hit too; the hit wakes them
      if (!e || e.hp <= 0) continue;
      const dx = e.x - x;
      const dy = e.y - y;
      const rr = r + e.radius;
      if (dx * dx + dy * dy < rr * rr) hits.push(e);
    }
    for (let k = 0; k < hits.length; k++) if (hits[k].hp > 0) fn(hits[k]);
    hits.length = 0;
    this.scratchDepth--;
  }

  hit(e: Enemy, base: number, slot: number, opts: { kx?: number; ky?: number; tags?: readonly string[]; quiet?: boolean; noCrit?: boolean; splash?: boolean } = {}) {
    if (e.hp <= 0) return;
    if (e.asleep) this.wake(e);
    let dmg = base * (0.92 + Math.random() * 0.16);
    let crit = false;
    if (!opts.noCrit && Math.random() < this.stats.critChance) {
      dmg *= this.stats.critMult;
      crit = true;
    }
    if (e.shieldHp > 0) {
      const a = Math.min(e.shieldHp, dmg);
      e.shieldHp -= a;
      dmg -= a;
      if (e.shieldHp <= 0) {
        this.floatText(e.x, e.y - e.radius - 14, 'SHIELD DOWN', 0x8ad8ff, 0.5);
        if (e.baseTint === AFFIX_BY_ID.shielded.color) e.baseTint = 0xffe9a0;
      }
    }
    e.hp -= dmg;
    e.flash = 0.08;
    if (slot >= 0 && slot < 6) {
      const sp = this.spellBySlot(slot);
      if (sp) sp.dmgDone += dmg;
    } else if (slot >= 6) this.extraDmg[slot] = (this.extraDmg[slot] ?? 0) + dmg;
    if (opts.kx || opts.ky) {
      const inv = 1 / e.mass;
      e.kx += (opts.kx ?? 0) * inv;
      e.ky += (opts.ky ?? 0) * inv;
    }
    const tags = opts.tags ?? [];
    if (this.flags.has('napalm') && tags.includes('fire')) {
      const mult = this.flags.has('hellbat') ? 1.2 : 0.6;
      e.burnDps = Math.max(e.burnDps, (dmg * mult) / 3);
      e.burnTime = 3;
    }
    if (opts.splash && this.flags.has('splash')) {
      this.forEnemiesInRadius(e.x, e.y, 55, (o) => {
        if (o !== e) this.hit(o, base * 0.4, slot, { quiet: true, noCrit: true });
      });
    }
    if (save.settings.damageNumbers && (!opts.quiet || crit)) this.damageText(e.x, e.y - e.radius, dmg, crit, e.uid);
    if (e.hp <= 0) {
      this.killEnemy(e, slot);
    } else if (this.flags.has('darkTemplar') && slot === this.spells.find((s) => s.def.id === 'blades')?.slot && !e.boss && e.hp < e.maxHp * 0.15) {
      e.hp = 0;
      this.killEnemy(e, slot);
    }
  }

  private killEnemy(e: Enemy, slot: number) {
    const i = e.idx;
    if (i < 0 || i >= this.enemyCount || this.enemies[i] !== e) return;
    if (this.mutators.has('justdie') && !e.revived && !e.boss && !e.lair) {
      e.revived = true;
      e.hp = e.maxHp * 0.4;
      this.addFx(fx.ring(), e.x, e.y, 0x9a7cff, 0.05, 0.4, 0.3, 0.9);
      return;
    }
    if (this.mutators.has('infested') && e.def.id !== 'broodling' && !e.boss && Math.random() < 0.12 && this.enemyCount < MAX_ALIVE) {
      for (let k = 0; k < 2; k++) this.timers.push({ at: this.time, fn: () => this.spawnEnemy(ENEMIES.broodling, e.x + (k ? 14 : -14), e.y) });
    }
    this.player.kills++;
    if (this.flags.has('leech')) this.heal(0.5);
    const affixBonus = 1 + e.affixes.length * 0.5;
    this.dropGem(e.x, e.y, e.xp * affixBonus);
    if (e.affixes.length) this.affixDeath(e);
    if (Math.random() < (e.elite ? 1 : 0.035)) this.dropPickup('mineral', e.x + 8, e.y, Math.ceil((e.elite ? 25 * affixBonus : 1 + Math.random() * 3) * this.stats.minerals));
    if (Math.random() < 0.0025) this.dropPickup('medkit', e.x, e.y, 0);
    if (Math.random() < 0.0012) this.dropPickup('magnet', e.x, e.y, 0);
    const big = e.elite || !!e.boss;
    if (!this.bwDeath(e, big)) this.addFx(fx.soft(), e.x, e.y, e.def.color, 0.3, big ? 2.4 : 0.8, big ? 0.5 : 0.25, 0.8);
    if (e.def.behavior === 'exploder') this.banelingBlast(e);
    if (this.flags.has('endlessSwarm') && Math.random() < 0.1 && this.minions.length < 60) {
      const brood = this.spells.find((s) => s.def.id === 'brood');
      this.addMinion('brood', brood ? brood.slot : -1, e.x, e.y, 6, brood ? brood.stats.damage : 10);
    }
    if (this.flags.has('primal')) {
      const spores = this.spells.find((s) => s.def.id === 'spores');
      if (spores && spores.slot === slot) this.heal(1.5);
    }
    if (e.lair) {
      e.lair.cleared = true;
      e.lair.sprite.alpha = 0.4;
      const rar = Math.min(4, Math.max(2, rollRarity(this.stats.luck + this.diff.luck + 0.5) + 1)) as Rarity;
      this.dropPickup('gear', e.x, e.y, 0, rollGear(this.race.id, rar, this.zone.tier));
      this.hooks.toast('Guardian slain! Gear dropped.', '#ffd34d');
    } else if (e.elite) {
      this.dropPickup('medkit', e.x - 10, e.y, 0);
    }
    if (e.elite && !e.boss) this.slowmo = Math.max(this.slowmo, 0.18);
    if (e.boss) {
      this.bossesKilled++;
      sfx('explode');
      this.shake(16);
      this.hitstop = 0.08;
      for (let k = 0; k < 12; k++) this.dropPickup('mineral', e.x + (Math.random() - 0.5) * 120, e.y + (Math.random() - 0.5) * 120, Math.ceil(6 * this.stats.minerals));
      this.dropPickup('medkit', e.x, e.y + 30, 0);
      this.dropPickup('magnet', e.x, e.y - 30, 0);
      const rar = Math.min(4, rollRarity(this.stats.luck + this.diff.luck + 1) + 1) as Rarity;
      const loot = rollGear(this.race.id, rar, this.zone.tier + (e.boss.final ? 1 : 0));
      if (e.boss.final && !this.endless) {
        this.removeEnemyAt(i);
        this.victoryShown = true;
        sfx('win');
        // hand the final boss's gear over directly so extracting can't leave it on the ground
        this.hooks.gear(loot);
        this.hooks.victory();
        return;
      }
      this.dropPickup('gear', e.x + 30, e.y, 0, loot);
    }
    this.removeEnemyAt(i);
  }

  private wake(e: Enemy) {
    e.asleep = false;
    if (e.lair && !e.boss && !e.lair.scaled) {
      e.lair.scaled = true;
      // guardians were placed at the start of the run: bring them up to the current strength
      const a = this.enemyScale(0);
      const b = this.enemyScale(this.time / 60);
      const k = b.hp / a.hp;
      e.hp *= k;
      e.maxHp *= k;
      e.damage *= b.dmg / a.dmg;
    }
    if (e.lair) this.hooks.toast(`${e.def.name} guardian awakens! Kill it for gear, or outrun it.`, '#ff8040');
  }

  /** Gives an elite 1-2 random modifiers and announces it. */
  private rollAffixes(e: Enemy, n: number) {
    const pool = AFFIXES.slice();
    for (let i = 0; i < n && pool.length; i++) {
      const a = pool.splice(Math.floor(Math.random() * pool.length), 1)[0];
      e.affixes.push(a.id);
      if (a.id === 'shielded') e.shieldHp = e.maxHp * 0.5;
      if (a.id === 'hasted') e.speed *= 1.6;
    }
    e.baseTint = AFFIX_BY_ID[e.affixes[0]].color;
    e.sprite.tint = e.baseTint;
    const names = e.affixes.map((id) => AFFIX_BY_ID[id].name).join(' ');
    this.hooks.toast(`${names} ${e.def.name} incoming! ${e.affixes.map((id) => AFFIX_BY_ID[id].desc).join(' ')}`, '#ffd34d');
  }

  private affixDeath(e: Enemy) {
    for (const id of e.affixes as AffixId[]) {
      if (id === 'splitter') {
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2;
          this.spawnEnemy(ENEMIES.broodling, e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30);
        }
      } else if (id === 'volatile') {
        const x = e.x;
        const y = e.y;
        const dmg = e.damage * 1.5;
        const name = e.def.name;
        this.telegraphs.push({
          kind: 'circle', x, y, r: 110, dx: 0, dy: 0, len: 0, t: 0, max: 0.9, damage: dmg, friendly: false,
          onDone: () => {
            this.addFx(fx.soft(), x, y, 0x9cff3c, 0.5, 1.9, 0.4, 0.9);
            if (hyp(this.player.x - x, this.player.y - y) < 110) this.damagePlayer(dmg, `Volatile ${name}`);
          },
        });
      }
    }
  }

  /** Cloaked elites can only be targeted near the hero (or always, if they're a boss). */
  revealed(e: Enemy): boolean {
    if (!e.affixes.length || !e.affixes.includes('cloaked')) return true;
    const dx = e.x - this.player.x;
    const dy = e.y - this.player.y;
    return dx * dx + dy * dy < 220 * 220;
  }

  private banelingBlast(e: Enemy) {
    const p = this.player;
    this.addFx(fx.soft(), e.x, e.y, 0x9cff3c, 0.4, 1.6, 0.35, 0.9);
    if (hyp(p.x - e.x, p.y - e.y) < 60) this.damagePlayer(e.damage, e.def.name);
  }

  // ------------------------------------------------------------ player
  damagePlayer(amount: number, by = '') {
    const p = this.player;
    if (p.invuln > 0 || p.dashT > 0 || this.over) return;
    if (by) this.lastHitBy = by;
    if (Math.random() < this.stats.dodge) {
      this.floatText(p.x, p.y - 30, 'MISS', 0xaaaaaa);
      return;
    }
    let dmg = Math.max(amount * 0.25, amount - this.stats.armor);
    if (this.guardT > 0) dmg *= 0.6;
    p.lastHit = this.time;
    if (p.barrier > 0) {
      const a = Math.min(p.barrier, dmg);
      p.barrier -= a;
      dmg -= a;
      // the results screen shows absorbed damage for barrier spells
      const bar = this.spells.find((x) => x.def.kind === 'barrier');
      if (bar) bar.dmgDone += a;
    }
    if (dmg > 0 && p.shield > 0) {
      const a = Math.min(p.shield, dmg);
      p.shield -= a;
      dmg -= a;
      if (p.shield <= 0 && this.flags.has('feedback') && p.feedbackCd <= 0) {
        p.feedbackCd = 8;
        const d = (10 + p.level * 1.5) * 4 * this.stats.damage;
        this.forEnemiesInRadius(p.x, p.y, 220 * this.stats.area, (e) => {
          const a2 = Math.atan2(e.y - p.y, e.x - p.x);
          this.hit(e, d, SLOT_FEEDBACK, { kx: Math.cos(a2) * 400, ky: Math.sin(a2) * 400 });
        });
        this.addFx(fx.ring(), p.x, p.y, 0x9a7cff, 0.1, (440 * this.stats.area) / 224, 0.4, 1);
      }
    }
    if (dmg > 0) {
      p.hp -= dmg;
      if (this.flags.has('reactive') && this.time >= this.reactiveAt && p.hp > 0) {
        this.reactiveAt = this.time + 10;
        p.invuln = 1;
      }
      sfx('hurt');
      this.heroSprite.tint = 0xff6060;
      if (save.settings.screenShake) this.shake(3);
    }
    if (p.hp <= 0) this.onDeath();
  }

  heal(v: number) {
    this.player.hp = Math.min(this.stats.maxHp, this.player.hp + v);
  }

  private onDeath() {
    const p = this.player;
    if (this.race.id === 'zerg' && this.time >= this.racialAt) {
      this.racialAt = this.time + 90;
      p.hp = this.stats.maxHp * 0.35;
      p.invuln = 1.5;
      this.addFx(fx.soft(), p.x, p.y, 0x8a6a3a, 0.4, 1.6, 0.5, 0.9);
      this.floatText(p.x, p.y - 40, 'BURROW', 0xc6ff5c, 0.7);
      return;
    }
    if (p.revivesUsed < this.stats.revives) {
      p.revivesUsed++;
      p.hp = this.stats.maxHp * 0.5;
      p.invuln = 2.5;
      this.forEnemiesInRadius(p.x, p.y, 300, (e) => {
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        e.kx += Math.cos(a) * 900 / e.mass;
        e.ky += Math.sin(a) * 900 / e.mass;
      });
      this.addFx(fx.ring(), p.x, p.y, 0xffffff, 0.1, 3, 0.6, 1);
      this.hooks.toast('Emergency evac! Revived.', '#7ad8ff');
      return;
    }
    p.hp = 0;
    this.end(false);
  }

  end(won: boolean) {
    if (this.over) return;
    won ||= this.victoryShown; // dying in endless still counts the zone as cleared
    this.over = true;
    sfx(won ? 'win' : 'lose');
    this.hooks.ended({
      won,
      time: this.time,
      kills: this.player.kills,
      level: this.player.level,
      bosses: this.bossesKilled,
      zone: this.zone,
      race: this.race.id,
      endless: this.endless,
      difficulty: this.diff,
      mutators: [...this.mutators],
      killedBy: won ? '' : this.lastHitBy,
      damage: [
        ...this.spells.map((s) => ({ name: s.def.name, icon: spellIcon(s.def.id, s.def.icon), dmg: s.dmgDone })),
        ...[
          [6, 'Napalm burn', '🔥'],
          [SLOT_NUKE, 'Tactical Nuke', '☢️'],
          [SLOT_FEEDBACK, 'Feedback', '💫'],
          [SLOT_DASH, this.race.dashName, '💨'],
          [SLOT_RACIAL, 'Orbital Strike', '🛰️'],
        ].map(([slot, name, icon]) => ({ name: name as string, icon: icon as string, dmg: this.extraDmg[slot as number] ?? 0 })),
      ].sort((a, b) => b.dmg - a.dmg),
    });
  }

  private tryDash() {
    const p = this.player;
    if (p.level < DASH_UNLOCK || p.dashCd > 0 || p.dashT > 0) return;
    let dx: number;
    let dy: number;
    const [mx, my] = this.input.move();
    // dash where you're moving; aim with the mouse only when standing still
    if (mx || my) {
      dx = mx;
      dy = my;
    } else if (this.input.hasMouse && !this.input.isTouch) {
      const sx = this.app.screen.width / 2;
      const sy = this.app.screen.height / 2;
      dx = this.input.mouseX - sx;
      dy = this.input.mouseY - sy;
    } else {
      dx = Math.cos(p.facing);
      dy = Math.sin(p.facing);
    }
    const l = hyp(dx, dy) || 1;
    const speed = 1300;
    p.dashVx = (dx / l) * speed;
    p.dashVy = (dy / l) * speed;
    p.dashT = 0.16;
    p.dashCd = 5 * Math.max(0.3, this.stats.dashCooldown);
    const sx0 = p.x;
    const sy0 = p.y;
    if (this.flags.has('cloak')) p.invuln = Math.max(p.invuln, 1);
    sfx('dash');
    for (let i = 0; i < 5; i++) this.addFx(this.heroSprite.texture, p.x + (p.dashVx * 0.16 * i) / 5, p.y + (p.dashVy * 0.16 * i) / 5, this.race.accent, 1.25, 1.25, 0.3, 0.35 - i * 0.04, Math.atan2(dy, dx));
    if (this.flags.has('shadowStride')) {
      const ex = sx0 + p.dashVx * 0.16;
      const ey = sy0 + p.dashVy * 0.16;
      const d = (10 + p.level * 1.5) * 3 * this.stats.damage;
      this.forEnemiesInRadius((sx0 + ex) / 2, (sy0 + ey) / 2, 140, (e) => this.hit(e, d, SLOT_DASH, {}));
    }
  }

  // ------------------------------------------------------------ spawners
  addMinion(kind: Minion['kind'], slot: number, x: number, y: number, life: number, damage: number): Minion {
    const tex = minionTexture(kind === 'brood' ? 'brood' : kind === 'turret' ? 'turret' : 'probe');
    const spr = this.sprite(this.layers.units, tex);
    spr.scale.set(kind === 'turret' ? 1.2 : 1.3);
    const a = Math.random() * Math.PI * 2;
    const m: Minion = { x, y, slot, kind, target: null, atk: Math.random() * 0.5, life, sprite: spr, ox: Math.cos(a) * 60, oy: Math.sin(a) * 60, damage, angle: 0, bw: bwSprite(`minion:${kind}`) ?? null };
    spr.position.set(x, y);
    this.minions.push(m);
    return m;
  }

  removeMinion(m: Minion) {
    const i = this.minions.indexOf(m);
    if (i >= 0) this.minions.splice(i, 1);
    this.release(this.layers.units, m.sprite);
  }

  spawnProjectile(x: number, y: number, a: number, speed: number, damage: number, radius: number, pierce: number, life: number, slot: number, color: number, tags: readonly string[]) {
    const bw = this.bulletBw;
    const spr = this.sprite(bw ? this.layers.bwfx : this.layers.fx, bw ? bw.frames[0] : fx.bolt());
    let anim: Texture[] | undefined;
    if (bw) {
      spr.tint = 0xffffff;
      const s = 0.7 + radius * 0.04;
      if (this.race.id === 'terran') orientBw(spr, bw, a, s);
      else {
        spr.rotation = 0;
        spr.scale.set(s);
        anim = bw.frames;
      }
    } else {
      spr.tint = color;
      spr.rotation = a;
      spr.scale.set(0.6 + radius * 0.06, 0.5 + radius * 0.08);
    }
    spr.position.set(x, y);
    this.projectiles.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, damage, radius, pierce, life, slot, sprite: spr, hits: [], splash: true, tags: tags as string[], anim });
  }

  /** The hero race's Brood War bullet: Terran missiles, Zerg spores, Protoss plasma. */
  private get bulletBw(): BwSprite | null {
    return bwSprite(this.race.id === 'terran' ? 'fx:gemini' : this.race.id === 'zerg' ? 'fx:spores' : 'fx:dragbull') ?? null;
  }

  addLob(x0: number, y0: number, x1: number, y1: number, dur: number, damage: number, r: number, slot: number, color: number, tags: readonly string[]) {
    const spr = this.sprite(this.layers.top, pickupTexture('bomb'));
    spr.tint = color;
    this.lobs.push({ x0, y0, x1, y1, t: 0, dur, damage, r, slot, color, sprite: spr, tags: tags as string[] });
  }

  addMine(x: number, y: number, damage: number, r: number, life: number, slot: number) {
    if (this.mines.length > 60) return;
    const spr = this.sprite(this.layers.pickups, minionTexture('mine'));
    spr.position.set(x, y);
    this.mines.push({ x, y, damage, r, life, arm: 0.5, slot, sprite: spr });
  }

  addField(x: number, y: number, r: number, damage: number, life: number, slot: number, color: number, slowAmt: number, tags: readonly string[]) {
    const spr = this.sprite(this.layers.ground, fx.disc());
    spr.tint = color;
    spr.position.set(x, y);
    spr.scale.set((r * 2) / 128);
    spr.alpha = 0;
    this.fields.push({ x, y, r, damage, life, tick: 0, slot, sprite: spr, slowAmt, tags: tags as string[] });
  }

  addChain(pts: number[], color: number) {
    this.chains.push({ pts, life: 0.18, color });
  }

  /** Plays a Brood War effect animation once. Returns false when the art isn't loaded. */
  addAnim(key: string, x: number, y: number, scale = 1, life = 0.5, layer: Container = this.layers.bwfx): boolean {
    const b = bwSprite(key);
    if (!b) return false;
    const spr = this.sprite(layer, b.frames[0]);
    spr.tint = 0xffffff;
    spr.position.set(x, y);
    spr.rotation = 0;
    spr.scale.set(scale);
    spr.alpha = 1;
    this.fxs.push({ sprite: spr, frames: b.frames, life, max: life, s0: -1, s1: -1, a0: 1, vx: 0, vy: 0, spin: 0 });
    return true;
  }

  private bwDeath(e: Enemy, big: boolean): boolean {
    const sh = e.def.shape;
    const s = Math.max(0.8, (e.radius * (e.boss ? 1.2 : 1)) / 14);
    if (sh === 'zealot' || sh === 'stalker' || sh === 'archon' || sh === 'hybrid') return this.addAnim('fx:pdeath', e.x, e.y, s * 0.7, 0.55);
    if (sh === 'marine' || sh === 'firebat' || sh === 'tank') return this.addAnim(big ? 'fx:tbangl' : 'fx:tbangs', e.x, e.y, s * 0.6, 0.6);
    if (!this.addAnim(big ? 'fx:zdeathl' : 'fx:zdeath', e.x, e.y, s * 0.55, 0.45)) return false;
    // blood splat left on the ground for a while
    if (this.fxs.length < 600) this.addAnim(`fx:blood${1 + Math.floor(Math.random() * 4)}`, e.x, e.y, s * 0.8, 6, this.layers.ground);
    return true;
  }

  addFx(tex: Texture, x: number, y: number, color: number, s0: number, s1: number, life: number, a0: number, rot = 0, spin = 0, drift = 0): Fx {
    const spr = this.sprite(this.layers.fx, tex);
    spr.tint = color;
    spr.position.set(x, y);
    spr.rotation = rot;
    spr.scale.set(s0);
    spr.alpha = a0;
    const f: Fx = { sprite: spr, life, max: life, s0, s1, a0, vx: Math.cos(rot) * drift * 100, vy: Math.sin(rot) * drift * 100, spin };
    this.fxs.push(f);
    return f;
  }

  dropGem(x: number, y: number, value: number) {
    if (this.gems.length >= MAX_GEMS) {
      // merge into a random existing gem far from the player to cap entity count
      const g = this.gems[Math.floor(Math.random() * this.gems.length)];
      g.value += value;
      this.setGemTier(g);
      return;
    }
    const tier = value >= 10 ? 2 : value >= 3 ? 1 : 0;
    const spr = this.sprite(this.layers.pickups, pickupTexture(tier === 2 ? 'xp2' : tier === 1 ? 'xp1' : 'xp0'));
    spr.position.set(x, y);
    this.gems.push({ x, y, value, tier, sprite: spr, pulled: false, speed: 0 });
  }

  private setGemTier(g: Gem) {
    const tier = g.value >= 10 ? 2 : g.value >= 3 ? 1 : 0;
    if (tier !== g.tier) {
      g.tier = tier;
      g.sprite.texture = pickupTexture(tier === 2 ? 'xp2' : tier === 1 ? 'xp1' : 'xp0');
    }
  }

  dropPickup(kind: PickupKind, x: number, y: number, value: number, data?: unknown) {
    const tex = pickupTexture(kind === 'gear' ? 'cache' : kind);
    const spr = this.sprite(this.layers.pickups, tex);
    spr.position.set(x, y);
    if (kind === 'gear') {
      spr.scale.set(0.8);
      spr.tint = 0xffd34d;
    }
    this.pickups.push({ x, y, kind, value, sprite: spr, pulled: false, speed: 0, life: kind === 'mineral' ? 60 : 9999, data });
  }

  damageText(x: number, y: number, v: number, crit: boolean, uid = 0) {
    if (uid && !crit) {
      for (const d of this.dmgTexts) {
        if (d.uid === uid && d.life > 0.35) {
          d.val += v;
          this.setText(d, fmtDmg(d.val));
          d.life = 0.7;
          return;
        }
      }
    }
    const str = fmtDmg(v);
    // bigger hits read bigger: 0.42 at 10 damage up to ~0.7 at 10k
    const size = Math.min(0.75, 0.34 + Math.log10(Math.max(1, v)) * 0.09) * (crit ? 1.3 : 1);
    const d = this.floatText(x + (Math.random() - 0.5) * 16, y, crit ? str + '!' : str, crit ? 0xffd040 : 0xffffff, size);
    d.uid = crit ? 0 : uid;
    d.val = v;
  }

  floatText(x: number, y: number, text: string, color: number, scale = 0.6): DmgText {
    let d: DmgText | undefined;
    if (this.dmgTexts.length >= MAX_TEXTS) {
      d = this.dmgTexts.shift()!;
    } else {
      d = this.freeTexts.pop();
      if (!d) {
        d = { c: new Container(), glyphs: [], life: 0, vy: 0, uid: 0, val: 0 };
        this.layers.text.addChild(d.c);
      }
    }
    this.setText(d, text);
    d.c.tint = color;
    d.c.position.set(x, y);
    d.c.scale.set(scale);
    d.c.alpha = 1;
    d.life = 0.7;
    d.vy = -60;
    d.uid = 0;
    d.val = 0;
    this.dmgTexts.push(d);
    return d;
  }

  /** Lays out glyph sprites. Unused glyphs are hidden with alpha, never `visible`, which would rebuild the scene. */
  private setText(d: DmgText, text: string) {
    let x = 0;
    let n = 0;
    for (let i = 0; i < text.length; i++) {
      const g = glyph(text[i]);
      if (!g) {
        x += 12;
        continue;
      }
      let s = d.glyphs[n];
      if (!s) {
        s = new Sprite(g.tex);
        s.anchor.set(0, 0.5);
        d.c.addChild(s);
        d.glyphs.push(s);
      } else s.texture = g.tex;
      s.alpha = 1;
      s.x = x - 4;
      x += g.w;
      n++;
    }
    for (let i = n; i < d.glyphs.length; i++) d.glyphs[i].alpha = 0;
    d.c.pivot.x = x / 2;
  }

  shake(v: number) {
    if (save.settings.screenShake) this.shakeAmt = Math.max(this.shakeAmt, v);
  }

  // ------------------------------------------------------------ boss logic
  private spawnBoss(def: BossDef, final: boolean) {
    const p = this.player;
    const a = Math.random() * Math.PI * 2;
    const base = ENEMIES[def.summon ?? 'zergling'] ?? ENEMIES.zergling;
    if (this.enemyCount >= MAX_ENEMIES) {
      // make room so a full map can't swallow a boss: drop the farthest ordinary enemy
      let far = -1;
      let fd = -1;
      for (let i = 0; i < this.enemyCount; i++) {
        const o = this.enemies[i];
        if (o.boss || o.lair) continue;
        const d = (o.x - p.x) ** 2 + (o.y - p.y) ** 2;
        if (d > fd) {
          fd = d;
          far = i;
        }
      }
      if (far >= 0) this.removeEnemyAt(far);
    }
    const e = this.spawnEnemy(base, p.x + Math.cos(a) * 600, p.y + Math.sin(a) * 600, { boss: def, final });
    if (!e) return;
    sfx('boss');
    this.shake(10);
    this.hooks.bossSpawned(def.name, def.title);
  }

  private updateBoss(e: Enemy, b: BossState, dt: number) {
    const p = this.player;
    const dx = p.x - e.x;
    const dy = p.y - e.y;
    const d = hyp(dx, dy) || 1;
    if (!b.phase2 && e.hp < e.maxHp * 0.5) {
      b.phase2 = true;
      b.abilityTimer = 0.6;
      if (b.def.split) {
        const [id, n] = b.def.split;
        for (let k = 0; k < n; k++) {
          const a = (k / n) * Math.PI * 2;
          const c = this.spawnEnemy(ENEMIES[id], e.x + Math.cos(a) * (e.radius + 50), e.y + Math.sin(a) * (e.radius + 50), { elite: true, hpMult: 2, scale: 1.2 });
          if (c) c.baseTint = c.sprite.tint = b.def.color;
        }
        this.hooks.toast(`${b.def.name} splits apart!`, '#ff5050');
      }
    }
    if (!b.enraged && e.hp < e.maxHp * 0.3) {
      b.enraged = true;
      e.sprite.tint = 0xff7070;
      this.hooks.toast(`${b.def.name} is enraged!`, '#ff5050');
    }
    const rage = b.enraged ? 1.3 : 1;
    if (b.windup > 0) {
      b.windup -= dt;
      if (b.windup <= 0) b.charging = 0.6;
      return;
    }
    if (b.charging > 0) {
      b.charging -= dt;
      e.x += b.chargeDx * e.speed * 4.2 * dt;
      e.y += b.chargeDy * e.speed * 4.2 * dt;
      return;
    }
    e.x += (dx / d) * e.speed * rage * dt;
    e.y += (dy / d) * e.speed * rage * dt;
    b.abilityTimer -= dt;
    if (b.abilityTimer > 0) return;
    b.abilityTimer = (b.enraged ? 1.7 : 2.8) + Math.random();
    const ab = b.def.abilities[Math.floor(Math.random() * b.def.abilities.length)];
    const bulletDmg = e.damage * 0.6;
    switch (ab) {
      case 'burst': {
        const n = b.enraged ? 28 : 18;
        const off = Math.random();
        for (let i = 0; i < n; i++) this.enemyShot(e.x, e.y, ((i + off) / n) * Math.PI * 2, 230, bulletDmg, 8, b.def.name);
        break;
      }
      case 'barrage': {
        const base = Math.atan2(dy, dx);
        const volleys = b.enraged ? 4 : 3;
        for (let v = 0; v < volleys; v++) {
          this.timers.push({
            at: this.time + v * 0.26,
            fn: () => {
              if (e.hp <= 0 || !e.boss) return;
              const a0 = Math.atan2(this.player.y - e.y, this.player.x - e.x);
              for (let i = -2; i <= 2; i++) this.enemyShot(e.x, e.y, a0 + i * 0.16, 330, bulletDmg, 7, e.boss.def.name);
            },
          });
        }
        void base;
        break;
      }
      case 'charge': {
        b.chargeDx = dx / d;
        b.chargeDy = dy / d;
        b.windup = 0.7;
        this.telegraphs.push({ kind: 'line', x: e.x, y: e.y, r: e.radius, dx: b.chargeDx, dy: b.chargeDy, len: e.speed * 4.2 * 0.6 + e.radius, t: 0, max: 0.7, damage: 0, onDone: null, friendly: false });
        break;
      }
      case 'slam': {
        const tx = p.x;
        const ty = p.y;
        const r = b.enraged ? 170 : 130;
        this.telegraphs.push({
          kind: 'circle', x: tx, y: ty, r, dx: 0, dy: 0, len: 0, t: 0, max: b.enraged ? 0.6 : 0.8, damage: e.damage * 1.2, friendly: false,
          onDone: () => {
            this.addFx(fx.soft(), tx, ty, 0xff6030, 0.5, (r * 2.2) / 128, 0.4, 0.9);
            this.shake(8);
            sfx('explode');
            if (hyp(this.player.x - tx, this.player.y - ty) < r) this.damagePlayer(e.damage * 1.2, b.def.name);
          },
        });
        break;
      }
      case 'pods': {
        // drop pods land around the hero, hurt on impact, and unload the boss's troops
        const def = ENEMIES[b.def.summon ?? 'zergling'];
        const n = b.enraged ? 4 : 3;
        for (let k = 0; k < n; k++) {
          const a = Math.random() * Math.PI * 2;
          const d = 120 + Math.random() * 180;
          const x = p.x + Math.cos(a) * d;
          const y = p.y + Math.sin(a) * d;
          this.hazard(x, y, 90, 1.3, e.damage, b.def.name, false, () => {
            for (let j = 0; j < 3; j++) this.spawnEnemy(def, x + (j - 1) * 22, y + (j % 2) * 18);
          });
        }
        break;
      }
      case 'cross': {
        // beams sweep out from the boss along a cross, alternating straight and diagonal
        const a0 = (Math.round(this.time) % 2) * (Math.PI / 4);
        const arms = b.enraged ? 8 : 4;
        for (let k = 0; k < arms; k++) {
          const a = a0 + (k / arms) * Math.PI * 2;
          this.lineHazard(e.x, e.y, Math.cos(a), Math.sin(a), 760, 26, 1.0, e.damage * 1.1, b.def.name);
        }
        break;
      }
      case 'voidzones': {
        const n = b.enraged ? 7 : 5;
        for (let k = 0; k < n; k++) {
          const a = Math.random() * Math.PI * 2;
          const d = k === 0 ? 0 : 80 + Math.random() * 240;
          this.hazard(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 75, 1.1, e.damage, b.def.name, false);
        }
        break;
      }
      case 'summon': {
        const def = ENEMIES[b.def.summon ?? 'zergling'];
        const n = b.enraged ? 12 : 8;
        // half around the boss, half in a ring around the player so the summon actually threatens
        for (let i = 0; i < n; i++) {
          const a = (i / n) * Math.PI * 2;
          if (i % 2) this.spawnEnemy(def, p.x + Math.cos(a) * 340, p.y + Math.sin(a) * 340);
          else this.spawnEnemy(def, e.x + Math.cos(a) * (e.radius + 40), e.y + Math.sin(a) * (e.radius + 40));
        }
        break;
      }
    }
  }

  /** A telegraphed circle that hurts the hero (and enemies, if hitsEnemies) when its fuse runs out. */
  private hazard(x: number, y: number, r: number, fuse: number, dmg: number, by: string, hitsEnemies: boolean, then?: () => void, color = 0xff6030) {
    this.telegraphs.push({
      kind: 'circle', x, y, r, dx: 0, dy: 0, len: 0, t: 0, max: fuse, damage: dmg, friendly: false,
      onDone: () => {
        this.addFx(fx.soft(), x, y, color, 0.4, (r * 2.2) / 128, 0.4, 0.9);
        if (hyp(this.player.x - x, this.player.y - y) < r) this.damagePlayer(dmg, by);
        if (hitsEnemies) this.forEnemiesInRadius(x, y, r, (o) => this.hit(o, dmg * 3, -1, { quiet: true, noCrit: true }));
        this.shake(4);
        then?.();
      },
    });
  }

  /** A telegraphed beam from (x, y) along (dx, dy). */
  private lineHazard(x: number, y: number, dx: number, dy: number, len: number, w: number, fuse: number, dmg: number, by: string) {
    this.telegraphs.push({
      kind: 'line', x, y, r: w, dx, dy, len, t: 0, max: fuse, damage: dmg, friendly: false,
      onDone: () => {
        const rx = this.player.x - x;
        const ry = this.player.y - y;
        const along = rx * dx + ry * dy;
        if (along > 0 && along < len && Math.abs(rx * dy - ry * dx) < w + 12) this.damagePlayer(dmg, by);
        for (let k = 1; k <= 6; k++) this.addFx(fx.soft(), x + dx * (len * k) / 6, y + dy * (len * k) / 6, 0xff4060, 0.3, 0.9, 0.3, 0.8);
      },
    });
  }

  /** Zone events and mutators: something different happens every minute or so. */
  private updateEvents() {
    const t = this.time;
    if (t >= this.nextEvent && !this.endless) {
      this.nextEvent = t + 70 + Math.random() * 20;
      const list = ZONE_EVENTS[this.zone.id] ?? ['rush'];
      this.zoneEvent(list[Math.floor(Math.random() * list.length)]);
    }
    const mt = this.mutT;
    if (this.mutators.has('voidrifts') && t >= mt.rift) {
      mt.rift = t + 45;
      this.zoneEvent('rift');
    }
    if (this.mutators.has('lava') && t >= mt.lava) {
      mt.lava = t + 7;
      const p = this.player;
      const dmg = 14 * this.enemyScale(t / 60).dmg;
      for (let k = 0; k < 3; k++) {
        const a = Math.random() * Math.PI * 2;
        const d = k === 0 ? 0 : 60 + Math.random() * 160;
        this.hazard(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 70, 1.2, dmg, 'Lava Burst', true, undefined, 0xff7020);
      }
    }
    if (this.mutators.has('missiles') && t >= mt.missiles) {
      mt.missiles = t + 9;
      this.hazard(this.player.x, this.player.y, 110, 1.6, 22 * this.enemyScale(t / 60).dmg, 'Missile Command', true, undefined, 0xffc040);
    }
    // void rifts pour out shards until destroyed
    for (let i = this.rifts.length - 1; i >= 0; i--) {
      const r = this.rifts[i];
      if (r.e.hp <= 0 || r.e.uid !== r.uid) {
        this.rifts.splice(i, 1);
        continue;
      }
      if (t >= r.next) {
        r.next = t + 2.5;
        for (let k = 0; k < 3; k++) this.spawnEnemy(ENEMIES.hybridling, r.e.x + (Math.random() - 0.5) * 60, r.e.y + (Math.random() - 0.5) * 60);
      }
    }
  }

  private zoneEvent(ev: ZoneEvent) {
    const p = this.player;
    const sc = this.enemyScale(this.time / 60).dmg;
    const toast = (msg: string, col = '#ff8040') => this.hooks.toast(msg, col);
    switch (ev) {
      case 'overlord': {
        const a = Math.random() * Math.PI * 2;
        const x = p.x + Math.cos(a) * 320;
        const y = p.y + Math.sin(a) * 320;
        let wave = this.zone.waves[0];
        for (const w of this.zone.waves) if (this.time / 60 >= w.from) wave = w;
        const def = ENEMIES[wave.pool[0][0]];
        this.hazard(x, y, 110, 1.6, 10 * sc, 'Overlord drop', false, () => {
          for (let k = 0; k < 12; k++) {
            const b = (k / 12) * Math.PI * 2;
            this.spawnEnemy(def, x + Math.cos(b) * 50, y + Math.sin(b) * 50);
          }
        }, 0xc08040);
        toast('Overlord drop!');
        break;
      }
      case 'rush': {
        const a = Math.random() * Math.PI * 2;
        const r = Math.max(this.app.screen.width, this.app.screen.height) / this.zoom * 0.65;
        for (let k = 0; k < 30; k++) {
          const s = (k - 15) * 0.035;
          this.spawnEnemy(ENEMIES.zergling, p.x + Math.cos(a + s) * (r + (k % 3) * 30), p.y + Math.sin(a + s) * (r + (k % 3) * 30));
        }
        toast('Zerg rush incoming!');
        break;
      }
      case 'lava':
        for (let k = 0; k < 7; k++) {
          const a = Math.random() * Math.PI * 2;
          const d = k === 0 ? 0 : 80 + Math.random() * 260;
          this.hazard(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 85, 1.3, 16 * sc, 'Lava eruption', true, undefined, 0xff7020);
        }
        toast('The ground erupts! Lava also burns the Swarm.');
        break;
      case 'storm':
        for (let k = 0; k < 6; k++) {
          const a = Math.random() * Math.PI * 2;
          const d = k === 0 ? 0 : 90 + Math.random() * 280;
          this.hazard(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, 100, 1.2, 14 * sc, 'Psionic Storm', true, undefined, 0x9a7cff);
        }
        toast('Psionic storms rain down! Lure enemies into them.', '#b48cff');
        break;
      case 'nuke':
        this.hazard(p.x, p.y, 230, 3, 45 * sc, 'Tactical Nuke', true, () => this.shake(18), 0xffe0a0);
        toast('Nuclear launch detected.', '#ff4040');
        break;
      case 'rift': {
        const a = Math.random() * Math.PI * 2;
        const e = this.spawnEnemy(ENEMIES.hybrid, p.x + Math.cos(a) * 380, p.y + Math.sin(a) * 380, { elite: true, hpMult: 1.5, scale: 1.3 });
        if (e) {
          e.speed = 0;
          e.baseTint = e.sprite.tint = 0x9a4aff;
          this.rifts.push({ e, uid: e.uid, next: this.time + 1 });
        }
        toast('A void rift tears open! Destroy it to stop the shards.', '#b48cff');
        break;
      }
    }
  }

  private enemyShot(x: number, y: number, a: number, speed: number, damage: number, radius: number, by: string) {
    const spr = this.sprite(this.layers.fx, fx.spark());
    spr.tint = 0xff4060;
    spr.scale.set(radius / 8);
    spr.position.set(x, y);
    this.shots.push({ x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, damage, life: 5, radius, sprite: spr, by });
  }

  // ------------------------------------------------------------ main update
  update(dtMs: number) {
    this.frameMs = this.frameMs * 0.95 + dtMs * 0.05;
    if (this.paused || this.over) {
      this.render(Math.min(dtMs / 1000, 1 / 20));
      return;
    }
    if (this.hitstop > 0) {
      this.hitstop -= dtMs / 1000;
      this.render(0);
      return;
    }
    let dt = Math.min(dtMs / 1000, 1 / 20);
    if (this.slowmo > 0) {
      this.slowmo -= dt;
      dt *= 0.4;
    }
    this.time += dt;
    if (this.timers.length) {
      const due = this.timers.filter((t) => t.at <= this.time);
      if (due.length) {
        this.timers = this.timers.filter((t) => t.at > this.time);
        for (const t of due) t.fn();
      }
    }
    const p = this.player;
    const s = this.stats;

    // zoom
    const w = this.input.consumeWheel();
    if (w) {
      this.zoom = Math.min(1.5, Math.max(0.55, this.zoom - w * 0.08));
      save.settings.zoom = this.zoom;
    }

    // ---- player movement & timers
    if (this.input.consumeDash()) this.tryDash();
    const [mx, my] = this.input.move();
    if (p.dashT > 0) {
      p.dashT -= dt;
      p.x += p.dashVx * dt;
      p.y += p.dashVy * dt;
      if (p.dashT <= 0 && this.flags.has('burrowCharge')) {
        this.forEnemiesInRadius(p.x, p.y, 140, (e) => {
          const a = Math.atan2(e.y - p.y, e.x - p.x);
          e.kx += (Math.cos(a) * 700) / e.mass;
          e.ky += (Math.sin(a) * 700) / e.mass;
        });
        this.addFx(fx.ring(), p.x, p.y, 0xc6ff5c, 0.1, 1.2, 0.3, 0.9);
      }
    } else if (mx || my) {
      p.x += mx * s.moveSpeed * dt;
      p.y += my * s.moveSpeed * dt;
      p.facing = Math.atan2(my, mx);
    }
    p.x = Math.max(-WORLD + 20, Math.min(WORLD - 20, p.x));
    p.y = Math.max(-WORLD + 20, Math.min(WORLD - 20, p.y));
    if (Math.max(Math.abs(p.x), Math.abs(p.y)) > WORLD - 300 && this.time >= this.edgeWarnAt) {
      this.edgeWarnAt = this.time + 10;
      this.hooks.toast('Edge of the zone: you can get pinned here. Head back toward the middle.', '#ff9a6a');
    }
    p.dashCd = Math.max(0, p.dashCd - dt);
    p.invuln = Math.max(0, p.invuln - dt);
    p.feedbackCd -= dt;

    // regen / shields
    let regen = s.hpRegen;
    if (this.flags.has('rapidRegen') && this.time - p.lastHit > 3) regen *= 3;
    if (p.hp < s.maxHp) p.hp = Math.min(s.maxHp, p.hp + regen * dt);
    if (s.maxShield > 0 && this.time - p.lastHit > s.shieldDelay) p.shield = Math.min(s.maxShield, p.shield + s.shieldRegen * dt);
    if (p.barrierTime > 0) {
      p.barrierTime -= dt;
      if (p.barrierTime <= 0) p.barrier = 0;
    }

    this.updateRacial(dt);

    // stimpack
    if (this.flags.has('stimpack')) {
      if (p.stimT > 0) {
        p.stimT -= dt;
        if (p.stimT <= 0) this.recomputeStats();
      } else {
        p.stimCd -= dt;
        if (p.stimCd <= 0) {
          p.stimCd = 12;
          p.stimT = this.flags.has('raiders') ? 6 : 4;
          this.recomputeStats();
          this.floatText(p.x, p.y - 40, '+STIM', 0xff6060, 0.6);
        }
      }
    }

    // nuke
    if (this.flags.has('nuke')) {
      p.nukeCd -= dt;
      if (p.nukeCd <= 0) {
        p.nukeCd = 10;
        const t = this.denseTargets(p.x, p.y, 700, 1)[0];
        if (t) {
          const tx = t.x;
          const ty = t.y;
          const r = 230 * s.area;
          const dmg = (10 + p.level * 1.5) * 12 * s.damage;
          this.telegraphs.push({
            kind: 'circle', x: tx, y: ty, r, dx: 0, dy: 0, len: 0, t: 0, max: 1.1, damage: dmg, friendly: true,
            onDone: () => {
              this.forEnemiesInRadius(tx, ty, r, (e) => {
                const a = Math.atan2(e.y - ty, e.x - tx);
                this.hit(e, dmg, SLOT_NUKE, { kx: Math.cos(a) * 500, ky: Math.sin(a) * 500, tags: ['explosive'] });
              });
              this.addFx(fx.soft(), tx, ty, 0xffe0a0, 1, (r * 2.6) / 128, 0.7, 1);
              this.addFx(fx.ring(), tx, ty, 0xff8040, 0.2, (r * 2.2) / 224, 0.5, 1);
              this.shake(14);
              sfx('explode');
            },
          });
        }
      }
    }

    // ---- spells
    for (const sp of this.spells) {
      updatePersistent(this, sp, dt);
      if (sp.def.kind === 'orbit' || sp.def.kind === 'summon') continue;
      sp.timer -= dt;
      if (sp.timer <= 0) {
        const ok = castSpell(this, sp);
        sp.timer = ok ? sp.stats.cooldown : 0.15;
        if (ok && this.flags.has('echo') && Math.random() < 0.15) this.timers.push({ at: this.time + 0.15, fn: () => castSpell(this, sp) });
      }
    }
    updateMinions(this, dt);

    // ---- director
    this.direct(dt);
    this.updateEvents();

    // ---- enemies
    this.updateEnemies(dt);

    // ---- projectiles
    this.updateProjectiles(dt);

    // ---- fields, mines, lobs, telegraphs
    this.updateHazards(dt);

    // ---- pickups
    this.updatePickups(dt);

    // ---- level up
    while (p.xp >= this.xpNeeded) {
      p.xp -= this.xpNeeded;
      p.level++;
      this.pendingLevels++;
      if (p.level === DASH_UNLOCK) {
        // shown once the level-up screen closes, so it isn't hidden behind it
        const msg = `${this.race.dashName} unlocked! ${this.input.isTouch ? 'Tap DASH' : 'Press F / Space'} to dash.`;
        this.timers.push({ at: this.time + 0.3, fn: () => this.hooks.toast(msg, '#7ad8ff') });
      }
    }
    if (this.pendingLevels > 0) {
      sfx('level');
      this.addFx(fx.ring(), p.x, p.y, 0xffe066, 0.1, 1.5, 0.5, 1);
      this.paused = true;
      this.hooks.levelUp();
    }

    this.render(dt);
  }

  private updateRacial(dt: number) {
    const p = this.player;
    if (this.guardT > 0) this.guardT -= dt;
    if (this.race.id === 'zerg' || this.time < this.racialAt) return;
    if (this.race.id === 'protoss') {
      this.racialAt = this.time + 25;
      this.guardT = 5;
      this.floatText(p.x, p.y - 40, 'GUARDIAN SHIELD', 0xffd36a, 0.5);
      return;
    }
    // Terran: Orbital Strike on the densest pack in view
    const t = this.denseTargets(p.x, p.y, 650, 1)[0];
    if (!t) return;
    this.racialAt = this.time + 30;
    const tx = t.x;
    const ty = t.y;
    const r = 170 * this.stats.area;
    const dmg = (10 + p.level * 1.5) * 9 * this.stats.damage;
    this.telegraphs.push({
      kind: 'circle', x: tx, y: ty, r, dx: 0, dy: 0, len: 0, t: 0, max: 0.9, damage: dmg, friendly: true,
      onDone: () => {
        this.forEnemiesInRadius(tx, ty, r, (e) => {
          const a = Math.atan2(e.y - ty, e.x - tx);
          this.hit(e, dmg, SLOT_RACIAL, { kx: Math.cos(a) * 400, ky: Math.sin(a) * 400, tags: ['explosive'] });
        });
        this.addFx(fx.soft(), tx, ty, 0x9fe8ff, 0.6, (r * 2.4) / 128, 0.5, 1);
        this.addFx(fx.ring(), tx, ty, 0xffffff, 0.2, (r * 2) / 224, 0.4, 1);
        this.shake(10);
        sfx('explode');
      },
    });
  }

  private direct(dt: number) {
    const m = this.time / 60;
    const z = this.zone;
    const p = this.player;
    // bosses
    if (!this.endless) {
      if (this.nextBoss < z.bosses.length && this.time >= (this.nextBoss + 1) * 180) {
        this.spawnBoss(z.bosses[this.nextBoss], false);
        this.nextBoss++;
      }
      if (this.nextBoss === z.bosses.length && this.time >= z.minutes * 60) {
        this.spawnBoss(z.final, true);
        this.nextBoss++;
      }
    } else {
      this.endlessBossT -= dt;
      if (this.endlessBossT <= 0) {
        this.endlessBossT = 120;
        const list = [...z.bosses, z.final];
        this.spawnBoss(list[this.endlessIdx % list.length], false);
        this.endlessIdx++;
      }
    }
    // regular spawns
    // a little more pressure in the first minutes so the start isn't empty
    const rate = (2.4 + m * 0.75 + m * m * 0.03) * (this.endless ? 1.5 : 1) * this.diff.spawn;
    // cap the backlog so a full map can't release hundreds of enemies in one frame
    this.spawnAcc = Math.min(this.spawnAcc + rate * dt, 12);
    let wave = z.waves[0];
    for (const w of z.waves) if (m >= w.from) wave = w;
    const total = wave.pool.reduce((a, [, w]) => a + w, 0);
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      if (this.enemyCount >= MAX_ALIVE) break;
      let r = Math.random() * total;
      let id = wave.pool[0][0];
      for (const [eid, w] of wave.pool) {
        r -= w;
        if (r <= 0) {
          id = eid;
          break;
        }
      }
      const [x, y] = this.spawnPoint();
      const def = ENEMIES[id];
      // small packs feel more like an RTS swarm
      const pack = def.speed > 110 && Math.random() < 0.35 ? 3 : 1;
      this.spawnAcc -= pack - 1;
      for (let k = 0; k < pack; k++) this.spawnEnemy(def, x + k * 18, y + (k % 2) * 18);
    }
    // elites
    if (this.time >= this.nextElite) {
      this.nextElite += 60;
      const [x, y] = this.spawnPoint();
      const e = this.spawnEnemy(ENEMIES[z.elite], x, y, { elite: true, hpMult: 3, scale: 1.35 });
      if (e) this.rollAffixes(e, m < 8 ? 1 : 2);
    }
    // surges: a ring of enemies closing in
    if (this.time >= this.nextSurge) {
      this.nextSurge += 60;
      const def = ENEMIES[wave.pool[0][0]];
      const n = Math.min(70, 24 + Math.floor(m * 4));
      const r = Math.max(this.app.screen.width, this.app.screen.height) / this.zoom * 0.6;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        this.spawnEnemy(def, p.x + Math.cos(a) * r, p.y + Math.sin(a) * r);
      }
      this.hooks.toast('The swarm surges!', '#ff8040');
    }
    // magnets
    if (this.time >= this.nextMagnet) {
      this.nextMagnet += 80;
      const a = Math.random() * Math.PI * 2;
      this.dropPickup('magnet', p.x + Math.cos(a) * 400, p.y + Math.sin(a) * 400, 0);
    }
  }

  private spawnPoint(): [number, number] {
    const p = this.player;
    const hw = this.app.screen.width / 2 / this.zoom;
    const hh = this.app.screen.height / 2 / this.zoom;
    const r = hyp(hw, hh) + 60;
    for (let tries = 0; tries < 6; tries++) {
      const a = Math.random() * Math.PI * 2;
      const x = p.x + Math.cos(a) * r;
      const y = p.y + Math.sin(a) * r;
      if (x > -WORLD && x < WORLD && y > -WORLD && y < WORLD) return [x, y];
    }
    const a = Math.random() * Math.PI * 2;
    return [Math.max(-WORLD, Math.min(WORLD, p.x + Math.cos(a) * r)), Math.max(-WORLD, Math.min(WORLD, p.y + Math.sin(a) * r))];
  }

  private updateEnemies(dt: number) {
    const p = this.player;
    const hw = this.app.screen.width / 2 / this.zoom + 120;
    const hh = this.app.screen.height / 2 / this.zoom + 120;
    const farR = hyp(hw, hh) * 1.7;
    const damp = Math.exp(-7 * dt);
    this.grid.clear();
    for (let i = 0; i < this.enemyCount; i++) {
      const e = this.enemies[i];
      if (e.flash > 0) {
        e.flash -= dt;
        // the tint setter does colour work and allocates, so only write it when it changes
        const tint = e.flash <= 0 ? (e.boss?.enraged ? 0xff7070 : e.baseTint) : 0xff6666;
        if (e.sprite.tint !== tint) e.sprite.tint = tint;
      }
      if (e.burnTime > 0) {
        e.burnTime -= dt;
        e.burnTick -= dt;
        if (e.burnTick <= 0) {
          e.burnTick = 0.5;
          this.hit(e, e.burnDps * 0.5, 6, { quiet: true, noCrit: true });
          if (e.hp <= 0) {
            i--;
            continue;
          }
          if (Math.random() < 0.5) this.addFx(fx.soft(), e.x, e.y - 6, 0xff7020, 0.15, 0.35, 0.3, 0.8);
        }
      }
      if (e.contactCd > 0) e.contactCd -= dt;
      if (e.asleep) {
        const dx = p.x - e.x;
        const dy = p.y - e.y;
        if (dx * dx + dy * dy < 380 * 380) this.wake(e);
        this.grid.insert(i, e.x, e.y);
        e.sprite.visible = onScreen(e.sprite.visible, e.x - p.x, e.y - p.y, hw, hh);
        e.sprite.alpha = 0.75 + Math.sin(this.time * 2) * 0.1;
        continue;
      }
      const cloaked = e.affixes.length > 0 && e.affixes.includes('cloaked');
      e.sprite.alpha = cloaked ? (this.revealed(e) ? 0.75 : 0.3) : 1;
      const dx = p.x - e.x;
      const dy = p.y - e.y;
      const d = hyp(dx, dy) || 1;
      if (e.boss) {
        this.updateBoss(e, e.boss, dt);
      } else {
        // guardians return to their lair and fall asleep when the player leaves
        if (e.lair && hyp(p.x - e.lair.x, p.y - e.lair.y) > 750) {
          const lx = e.lair.x - e.x;
          const ly = e.lair.y - e.y;
          const ld = hyp(lx, ly);
          if (ld < 20) {
            // no heal on the way home: chipping a guardian down over several visits is fair play
            e.asleep = true;
          } else {
            e.x += (lx / ld) * e.speed * 1.5 * dt;
            e.y += (ly / ld) * e.speed * 1.5 * dt;
          }
          this.grid.insert(i, e.x, e.y);
          e.sprite.position.set(e.x, e.y);
          continue;
        }
        // relocate stragglers ahead of the player to keep pressure up
        if (d > farR && !e.lair) {
          const [nx, ny] = this.spawnPoint();
          e.x = nx;
          e.y = ny;
          this.grid.insert(i, e.x, e.y);
          continue;
        }
        const spd = e.speed * (1 - Math.min(0.7, e.slow));
        e.slow = Math.max(0, e.slow - dt * 2);
        const def = e.def;
        if (def.behavior === 'ranged') {
          const range = def.range ?? 250;
          if (d > range) {
            e.x += (dx / d) * spd * dt;
            e.y += (dy / d) * spd * dt;
          } else if (d < range * 0.6) {
            e.x -= (dx / d) * spd * 0.5 * dt;
            e.y -= (dy / d) * spd * 0.5 * dt;
          }
          e.shotTimer -= dt;
          if (e.shotTimer <= 0 && d < range * 1.3) {
            e.shotTimer = def.shotCd ?? 2.5;
            const a = Math.atan2(dy, dx);
            this.enemyShot(e.x, e.y, a, def.shotSpeed ?? 280, e.damage, def.id === 'siegetank' ? 11 : 6, def.name);
          }
        } else if (def.behavior === 'charger') {
          if (e.windup > 0) {
            // telegraphed: stand still and shake before charging
            e.windup -= dt;
            e.sprite.tint = Math.sin(this.time * 40) > 0 ? 0xff9090 : e.baseTint;
            if (e.windup <= 0) e.charge = 0.6;
          } else if (e.charge > 0) {
            e.charge -= dt;
            e.x += e.cdx * spd * 2.4 * dt;
            e.y += e.cdy * spd * 2.4 * dt;
          } else {
            e.x += (dx / d) * spd * dt;
            e.y += (dy / d) * spd * dt;
            e.shotTimer -= dt;
            if (e.shotTimer <= 0 && d < 340) {
              e.shotTimer = 4;
              e.windup = 0.8;
              e.cdx = dx / d;
              e.cdy = dy / d;
              this.telegraphs.push({ kind: 'line', x: e.x, y: e.y, r: e.radius * 0.8, dx: e.cdx, dy: e.cdy, len: spd * 2.4 * 0.6 + e.radius, t: 0, max: 0.8, damage: 0, onDone: null, friendly: false });
            }
          }
        } else {
          e.x += (dx / d) * spd * dt;
          e.y += (dy / d) * spd * dt;
          if (def.behavior === 'exploder' && d < e.radius + 26) {
            // blowing up on you isn't a kill: no XP, no kill count
            this.banelingBlast(e);
            this.bwDeath(e, false);
            this.removeEnemyAt(i);
            i--;
            continue;
          }
        }
      }
      e.x += e.kx * dt;
      e.y += e.ky * dt;
      e.kx *= damp;
      e.ky *= damp;
      // contact damage
      const cr = e.radius + 14;
      if (d < cr && e.contactCd <= 0) {
        // a charger's charge hits once, not on every contact tick
        e.contactCd = e.def.behavior === 'charger' ? 1.2 : 0.6;
        if (e.affixes.length && e.affixes.includes('vampiric')) e.hp = Math.min(e.maxHp, e.hp + e.maxHp * 0.08);
        this.damagePlayer(e.def.behavior === 'charger' ? e.damage * 0.75 : e.damage, e.boss ? e.boss.def.name : e.lair ? `${e.def.name} Guardian` : e.def.name);
      }
      this.grid.insert(i, e.x, e.y);
    }

    // separation + sprite sync
    const qb = this.qbuf;
    const sepK = Math.min(0.7, 0.35 * dt * 60); // same crowd stiffness at any frame rate
    for (let i = 0; i < this.enemyCount; i++) {
      const e = this.enemies[i];
      if (!e.boss && !e.asleep) {
        const n = this.grid.query(e.x, e.y, e.radius, qb);
        let checked = 0;
        for (let k = 0; k < n && checked < 10; k++) {
          const j = qb[k];
          if (j === i) continue;
          const o = this.enemies[j];
          checked++;
          const ox = e.x - o.x;
          const oy = e.y - o.y;
          const rr = e.radius + o.radius;
          const d2 = ox * ox + oy * oy;
          if (d2 < rr * rr && d2 > 0.01) {
            const dd = Math.sqrt(d2);
            const push = ((rr - dd) / dd) * sepK;
            const w = o.mass / (e.mass + o.mass);
            e.x += ox * push * w * 2;
            e.y += oy * push * w * 2;
          }
        }
      }
      const spr = e.sprite;
      const vis = onScreen(spr.visible, e.x - p.x, e.y - p.y, hw, hh);
      if (spr.visible !== vis) spr.visible = vis;
      if (vis) {
        spr.position.set(e.x, e.y);
        const a = Math.atan2(p.y - e.y, p.x - e.x);
        e.facing += angleLerp(e.facing, a, Math.min(1, dt * 8));
        if (e.bw) orientBw(spr, e.bw, e.facing, e.bwScale);
        else spr.rotation = e.facing;
      }
    }
  }

  private updateProjectiles(dt: number) {
    const qb = this.qbuf;
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.x += pr.vx * dt;
      pr.y += pr.vy * dt;
      pr.life -= dt;
      let dead = pr.life <= 0;
      if (!dead) {
        const n = this.grid.query(pr.x, pr.y, pr.radius + 80, qb);
        for (let k = 0; k < n; k++) {
          const e = this.enemies[qb[k]];
          if (!e || e.hp <= 0 || e.asleep && !e.lair) continue;
          const dx = e.x - pr.x;
          const dy = e.y - pr.y;
          const rr = e.radius + pr.radius;
          if (dx * dx + dy * dy > rr * rr) continue;
          if (pr.hits.includes(e.uid)) continue;
          pr.hits.push(e.uid);
          const sp = hyp(pr.vx, pr.vy) || 1;
          this.hit(e, pr.damage, pr.slot, { kx: (pr.vx / sp) * 60, ky: (pr.vy / sp) * 60, tags: pr.tags, splash: pr.splash });
          if (!this.addAnim(this.race.id === 'terran' ? 'fx:tspark' : this.race.id === 'zerg' ? 'fx:zspark' : 'fx:pspark', pr.x, pr.y, 1, 0.25)) this.addFx(fx.spark(), pr.x, pr.y, pr.sprite.tint as number, 0.6, 1.4, 0.12, 0.9);
          if (pr.pierce-- <= 0) {
            dead = true;
            break;
          }
        }
      }
      if (dead) {
        this.release((pr.sprite.parent as Container | null) ?? this.layers.fx, pr.sprite);
        this.projectiles[i] = this.projectiles[this.projectiles.length - 1];
        this.projectiles.pop();
      } else {
        pr.sprite.position.set(pr.x, pr.y);
        if (pr.anim) pr.sprite.texture = pr.anim[Math.floor(this.time * 20) % pr.anim.length];
      }
    }

    const p = this.player;
    for (let i = this.shots.length - 1; i >= 0; i--) {
      const s = this.shots[i];
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      const dx = s.x - p.x;
      const dy = s.y - p.y;
      const rr = s.radius + 12;
      let dead = s.life <= 0;
      if (!dead && dx * dx + dy * dy < rr * rr) {
        this.damagePlayer(s.damage, s.by);
        dead = true;
      }
      if (dead) {
        this.release(this.layers.fx, s.sprite);
        this.shots[i] = this.shots[this.shots.length - 1];
        this.shots.pop();
      } else s.sprite.position.set(s.x, s.y);
    }
  }

  private updateHazards(dt: number) {
    // fields
    for (let i = this.fields.length - 1; i >= 0; i--) {
      const f = this.fields[i];
      f.life -= dt;
      f.tick -= dt;
      f.sprite.alpha = Math.min(0.55, f.life * 2, f.sprite.alpha + dt * 3);
      f.sprite.rotation += dt * 1.5;
      if (f.tick <= 0) {
        f.tick = 0.4;
        this.forEnemiesInRadius(f.x, f.y, f.r, (e) => {
          e.slow = Math.max(e.slow, f.slowAmt);
          // overlapping fields of one spell share a tick, so stacking storms isn't a multiplier
          if (f.slot >= 0 && this.time - e.hitStamp[f.slot] < 0.35) return;
          if (f.slot >= 0) e.hitStamp[f.slot] = this.time;
          this.hit(e, f.damage, f.slot, { quiet: true, tags: f.tags });
        });
        if (Math.random() < 0.7) {
          const a = Math.random() * Math.PI * 2;
          const d = Math.random() * f.r * 0.8;
          this.addFx(fx.spark(), f.x + Math.cos(a) * d, f.y + Math.sin(a) * d, 0xffffff, 1, 2.5, 0.15, 0.9);
        }
      }
      if (f.life <= 0) {
        this.release(this.layers.ground, f.sprite);
        this.fields.splice(i, 1);
      }
    }
    // mines
    const qb = this.qbuf;
    for (let i = this.mines.length - 1; i >= 0; i--) {
      const m = this.mines[i];
      m.life -= dt;
      m.arm -= dt;
      let boom = false;
      if (m.arm <= 0) {
        const n = this.grid.query(m.x, m.y, 60, qb);
        for (let k = 0; k < n; k++) {
          const e = this.enemies[qb[k]];
          if (!e || e.asleep) continue;
          if (hyp(e.x - m.x, e.y - m.y) < e.radius + 22) {
            boom = true;
            break;
          }
        }
      }
      if (boom || m.life <= 0) {
        if (boom) this.explode(m.x, m.y, m.r, m.damage, m.slot, 0xff8040, ['explosive']);
        this.release(this.layers.pickups, m.sprite);
        this.mines.splice(i, 1);
      } else {
        m.sprite.alpha = m.arm > 0 ? 1 : 0.7 + Math.sin(this.time * 8 + i) * 0.2;
      }
    }
    // lobs
    for (let i = this.lobs.length - 1; i >= 0; i--) {
      const l = this.lobs[i];
      l.t += dt;
      const k = Math.min(1, l.t / l.dur);
      const x = l.x0 + (l.x1 - l.x0) * k;
      const y = l.y0 + (l.y1 - l.y0) * k - Math.sin(k * Math.PI) * 120;
      l.sprite.position.set(x, y);
      l.sprite.rotation += dt * 10;
      l.sprite.scale.set(1 + Math.sin(k * Math.PI) * 0.6);
      if (k >= 1) {
        this.explode(l.x1, l.y1, l.r, l.damage, l.slot, l.color, l.tags);
        this.release(this.layers.top, l.sprite);
        this.lobs.splice(i, 1);
      }
    }
    // telegraphs
    for (let i = this.telegraphs.length - 1; i >= 0; i--) {
      const t = this.telegraphs[i];
      t.t += dt;
      if (t.t >= t.max) {
        t.onDone?.();
        this.telegraphs.splice(i, 1);
      }
    }
    // chains
    for (let i = this.chains.length - 1; i >= 0; i--) {
      this.chains[i].life -= dt;
      if (this.chains[i].life <= 0) this.chains.splice(i, 1);
    }
  }

  explode(x: number, y: number, r: number, damage: number, slot: number, color: number, tags: readonly string[]) {
    this.forEnemiesInRadius(x, y, r, (e) => {
      const a = Math.atan2(e.y - y, e.x - x);
      this.hit(e, damage, slot, { kx: Math.cos(a) * 220, ky: Math.sin(a) * 220, tags });
    });
    this.addFx(fx.soft(), x, y, color, 0.3, (r * 2.4) / 128, 0.35, 1);
    this.addFx(fx.ring(), x, y, 0xffffff, 0.1, (r * 2) / 224, 0.25, 0.7);
    sfx('explode');
    this.shake(2);
  }

  private updatePickups(dt: number) {
    const p = this.player;
    const pr2 = this.stats.pickupRange * this.stats.pickupRange;
    for (let i = this.gems.length - 1; i >= 0; i--) {
      const g = this.gems[i];
      const dx = p.x - g.x;
      const dy = p.y - g.y;
      const d2 = dx * dx + dy * dy;
      if (!g.pulled && d2 < pr2) g.pulled = true;
      if (g.pulled) {
        g.speed = Math.min(1400, g.speed + 1800 * dt);
        const d = Math.sqrt(d2) || 1;
        g.x += (dx / d) * g.speed * dt;
        g.y += (dy / d) * g.speed * dt;
        if (d < 18) {
          p.xp += g.value * this.stats.xpGain;
          sfx('pickup');
          this.release(this.layers.pickups, g.sprite);
          this.gems[i] = this.gems[this.gems.length - 1];
          this.gems.pop();
          continue;
        }
        g.sprite.position.set(g.x, g.y);
      }
    }
    // probe companion fetches distant gems
    if (this.probe) {
      const pb = this.probe;
      const reach = 300 + perkLevel('probe') * 120;
      let target: Gem | null = null;
      let bd = reach * reach;
      for (const g of this.gems) {
        if (g.pulled) continue;
        const d2 = (g.x - p.x) ** 2 + (g.y - p.y) ** 2;
        if (d2 < bd) {
          bd = d2;
          target = g;
        }
      }
      const tx = target ? target.x : p.x + 30;
      const ty = target ? target.y : p.y - 30;
      const dx = tx - pb.x;
      const dy = ty - pb.y;
      const d = hyp(dx, dy) || 1;
      const v = Math.min(d, 520 * dt);
      pb.x += (dx / d) * v;
      pb.y += (dy / d) * v;
      if (target && d < 14) target.pulled = true;
      pb.sprite.position.set(pb.x, pb.y);
      pb.angle = Math.atan2(dy, dx);
    }

    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const k = this.pickups[i];
      k.life -= dt;
      const dx = p.x - k.x;
      const dy = p.y - k.y;
      const d = hyp(dx, dy) || 1;
      if (!k.pulled && d < (k.kind === 'mineral' ? this.stats.pickupRange : 40)) k.pulled = true;
      if (k.kind === 'magnet') k.sprite.rotation += dt * 2;
      if (k.pulled) {
        k.speed = Math.min(1200, k.speed + 1600 * dt);
        k.x += (dx / d) * k.speed * dt;
        k.y += (dy / d) * k.speed * dt;
        k.sprite.position.set(k.x, k.y);
      }
      if (d < 20 || k.life <= 0) {
        if (d < 20) this.collect(k);
        this.release(this.layers.pickups, k.sprite);
        this.pickups.splice(i, 1);
      }
    }

    // supply caches
    this.cacheCost = this.cacheCostNow;
    for (const c of this.caches) {
      if (c.opened && c.restockAt !== undefined && this.time >= c.restockAt) {
        // caches restock, so minerals stay worth collecting late in the run
        c.opened = false;
        c.sprite.alpha = 1;
      }
      if (c.opened) continue;
      if (Math.abs(c.x - p.x) > 40 || Math.abs(c.y - p.y) > 40) {
        if (c.shopAt === -1) c.shopAt = 0; // left the cache: it can open again next visit
        continue;
      }
      if (c.shopAt === -1) continue; // still standing on it after closing the shop
      c.shopAt = -1;
      this.openCacheShop(c);
    }
  }

  /** Supply caches sell run-only modules (Azeroth Survivors' jewelry), or a gear requisition. */
  private openCacheShop(c: Cache) {
    const zi = Math.max(0, ZONES.findIndex((z) => z.id === this.zone.id));
    const owned = new Set(this.modules.map((m) => m.id));
    const pool = MODULES.filter((m) => !owned.has(m.id));
    const luck = this.stats.luck + this.diff.luck;
    const offers: CacheOffer[] = [];
    while (offers.length < 3 && pool.length) {
      const w = pool.map((m) => [0, 6, 3.2, 1.4 * (1 + luck), 0.5 * (1 + luck * 2)][m.rarity]);
      let r = Math.random() * w.reduce((x, y) => x + y, 0);
      let i = 0;
      while (i < pool.length - 1 && (r -= w[i]) > 0) i++;
      const mod = pool.splice(i, 1)[0];
      offers.push({ mod, price: modulePrice(mod, zi) });
    }
    sfx('select');
    this.paused = true;
    this.hooks.cacheShop(offers, this.cacheCost, (o) => {
      const p = this.player;
      if (o === 'gear') {
        if (p.minerals < this.cacheCost) return;
        p.minerals -= this.cacheCost;
        // a flat step: the old x1.5 growth left players ending runs with hundreds of unspent minerals
        this.cacheCost += 20;
        const rar = Math.max(1, rollRarity(luck + 0.2)) as Rarity;
        this.timers.push({ at: this.time, fn: () => this.hooks.gear(rollGear(this.race.id, rar, this.zone.tier)) });
      } else if (o) {
        if (p.minerals < o.price) return;
        p.minerals -= o.price;
        this.addModule(o.mod);
        this.hooks.toast(`${o.mod.name}: ${o.mod.desc}`, '#7ad8ff');
      } else return;
      c.opened = true;
      c.restockAt = this.time + 240;
      c.sprite.alpha = 0.35;
    });
  }

  modules: ModuleDef[] = [];

  addModule(m: ModuleDef) {
    this.modules.push(m);
    if (m.flag) this.flags.add(m.flag);
    if (m.stats) {
      addMods(this.passiveMods, m.stats);
      const before = this.stats.maxHp;
      this.recomputeStats();
      this.player.hp += Math.max(0, this.stats.maxHp - before);
    }
  }

  private collect(k: Pickup) {
    const p = this.player;
    switch (k.kind) {
      case 'mineral':
        p.minerals += k.value;
        sfx('pickup');
        break;
      case 'medkit':
        this.heal(this.stats.maxHp * 0.3);
        this.floatText(p.x, p.y - 30, '+HP', 0x60ff60, 0.7);
        break;
      case 'magnet':
        for (const g of this.gems) g.pulled = true;
        sfx('level');
        break;
      case 'gear':
        this.hooks.gear(k.data as GearItem);
        this.paused = true;
        break;
    }
  }

  get cacheCostNow() {
    return this.cacheCost >= 0 ? this.cacheCost : 25 + 10 * Math.max(0, ZONES.findIndex((z) => z.id === this.zone.id));
  }

  // ------------------------------------------------------------ render
  /** dt: real seconds since the last frame, so smoothing feels the same at 30, 60 or 144 Hz. */
  render(dt: number) {
    const p = this.player;
    const W = this.app.screen.width;
    const H = this.app.screen.height;
    this.shakeAmt *= 1 - damp(9.75, dt);
    const sx = (Math.random() - 0.5) * this.shakeAmt;
    const sy = (Math.random() - 0.5) * this.shakeAmt;
    const ck = damp(17, dt);
    this.camX += (p.x - this.camX) * ck;
    this.camY += (p.y - this.camY) * ck;
    if (Math.abs(p.x - this.camX) > 300 || this.time < 0.1) {
      this.camX = p.x;
      this.camY = p.y;
    }
    const z = this.zoom;
    this.world.scale.set(z);
    this.world.position.set(W / 2 - this.camX * z + sx, H / 2 - this.camY * z + sy);
    if (this.ground.width !== W) this.ground.width = W;
    if (this.ground.height !== H) this.ground.height = H;
    this.ground.tileScale.set(z);
    this.ground.tilePosition.set(-this.camX * z + W / 2 + sx, -this.camY * z + H / 2 + sy);

    // hero
    const hs = this.heroSprite;
    hs.position.set(p.x, p.y);
    const moving = this.input.move()[0] !== 0 || this.input.move()[1] !== 0;
    this.heroAngle = angleLerpTo(this.heroAngle, p.facing, damp(21, dt));
    const bob = moving && !this.paused ? 1 + Math.sin(this.time * 18) * 0.04 : 1;
    if (this.heroBw) {
      orientBw(hs, this.heroBw, this.heroAngle, (40 / this.heroBw.size) * 1.1);
      hs.scale.y *= 1 / bob;
    } else {
      hs.rotation = this.heroAngle;
      hs.scale.set(1.25 * bob, 1.25 / bob);
    }
    hs.alpha = p.invuln > 0 || p.dashT > 0 ? 0.55 + Math.sin(this.time * 40) * 0.25 : 1;
    if (hs.tint !== 0xffffff && this.time - p.lastHit > 0.1) hs.tint = 0xffffff;
    const sh = (hs as Sprite & { shadow?: Sprite }).shadow!;
    sh.position.set(p.x, p.y + 16);
    const bsp = this.barrierSprite;
    bsp.visible = p.barrier > 0 || this.guardT > 0 || (p.shield > 0 && this.time - p.lastHit < 0.3);
    if (bsp.visible) {
      bsp.tint = this.guardT > 0 ? 0xffd36a : p.barrier > 0 ? 0x6ad1ff : 0x4fd2ff;
      bsp.position.set(p.x, p.y);
      bsp.scale.set(0.6 + Math.sin(this.time * 5) * 0.02);
      bsp.alpha = p.barrier > 0 ? 0.5 : 0.35;
    }

    for (const m of this.minions) {
      if (m.bw) orientBw(m.sprite, m.bw, m.angle, (m.kind === 'turret' ? 30 : 22) / m.bw.size);
      else m.sprite.rotation = m.angle;
    }

    // props culling
    const hw = W / 2 / z + 80;
    const hh = H / 2 / z + 80;
    for (const s of this.props) {
      const v = onScreen(s.visible, s.x - this.camX, s.y - this.camY, hw, hh);
      if (s.visible !== v) s.visible = v;
    }

    if (this.paused || this.over) return;

    // fx
    for (let i = this.fxs.length - 1; i >= 0; i--) {
      const f = this.fxs[i];
      f.life -= dt;
      const k = 1 - Math.max(0, f.life) / f.max;
      if (f.frames) {
        // animations play through once; long-lived ones (decals) hold the last frame and fade at the end
        const fr = Math.min(f.frames.length - 1, Math.floor(Math.min(1, k * (f.max > 2 ? f.max / 0.6 : 1)) * f.frames.length));
        f.sprite.texture = f.frames[fr];
        f.sprite.alpha = f.max > 2 ? Math.min(1, f.life / 1.5) * 0.85 : 1;
      } else f.sprite.alpha = f.a0 * (1 - k * k);
      if (f.s0 >= 0) f.sprite.scale.set(f.s0 + (f.s1 - f.s0) * easeOut(k));
      f.sprite.rotation += f.spin * dt;
      f.sprite.x += f.vx * dt;
      f.sprite.y += f.vy * dt;
      if (f.life <= 0) {
        this.release((f.sprite.parent as Container | null) ?? this.layers.fx, f.sprite);
        this.fxs[i] = this.fxs[this.fxs.length - 1];
        this.fxs.pop();
      }
    }
    // damage text
    const free = this.freeTexts;
    for (let i = this.dmgTexts.length - 1; i >= 0; i--) {
      const d = this.dmgTexts[i];
      d.life -= dt;
      d.c.y += d.vy * dt;
      d.vy *= 1 - damp(5, dt);
      d.c.alpha = Math.min(1, d.life * 3);
      if (d.life <= 0) {
        d.c.alpha = 0;
        this.dmgTexts.splice(i, 1);
        free.push(d);
      }
    }

    // overlay: telegraphs, boss rings and the pickup range are sprites, so nothing is re-tessellated per frame
    const disc = this.ovDisc.begin();
    const ring = this.ovRing.begin();
    const line = this.ovLine.begin();
    for (const t of this.telegraphs) {
      const k = t.t / t.max;
      const col = t.friendly ? 0xffd040 : 0xff3030;
      if (t.kind === 'circle') {
        disc.add(t.x, t.y, t.r / 64, t.r / 64, 0, col, 0.3);
        ring.add(t.x, t.y, t.r / 112, t.r / 112, 0, col, 0.8);
        disc.add(t.x, t.y, (t.r * k) / 64, (t.r * k) / 64, 0, col, 0.35);
      } else {
        line.add(t.x, t.y, t.len, t.r * 2, Math.atan2(t.dy, t.dx), col, 0.12 + k * 0.15);
      }
    }
    for (const b of this.bosses) {
      const r = (b.radius + 10) / 112;
      ring.add(b.x, b.y, r, r, 0, b.boss?.enraged ? 0xff3030 : 0xffd040, 0.5 + Math.sin(this.time * 6) * 0.2);
    }
    const pr = this.stats.pickupRange / 112;
    ring.add(p.x, p.y, pr, pr, 0, 0xffffff, 0.06);
    disc.end();
    ring.end();
    line.end();

    // chain lightning still needs lines; only touch the Graphics while one is showing
    const g = this.gfx;
    if (this.chains.length || this.gfxDirty) {
      g.clear();
      this.gfxDirty = this.chains.length > 0;
    }
    for (const c of this.chains) {
      const a = Math.min(1, c.life * 8);
      for (let pass = 0; pass < 2; pass++) {
        g.moveTo(c.pts[0], c.pts[1]);
        for (let j = 2; j < c.pts.length; j += 2) {
          const px = c.pts[j - 2];
          const py = c.pts[j - 1];
          const qx = c.pts[j];
          const qy = c.pts[j + 1];
          const mx2 = (px + qx) / 2 + (Math.random() - 0.5) * 30;
          const my2 = (py + qy) / 2 + (Math.random() - 0.5) * 30;
          g.lineTo(mx2, my2).lineTo(qx, qy);
        }
        g.stroke({ width: pass ? 2 : 7, color: pass ? 0xffffff : c.color, alpha: pass ? a : a * 0.5 });
      }
    }
  }

  /** Things worth walking to, for the HUD's off-screen arrows: bosses, nearby lairs and caches. */
  pointsOfInterest(): { x: number; y: number; kind: 'boss' | 'lair' | 'cache' }[] {
    const p = this.player;
    const near = (x: number, y: number, r: number) => (x - p.x) ** 2 + (y - p.y) ** 2 < r * r;
    const out: { x: number; y: number; kind: 'boss' | 'lair' | 'cache' }[] = [];
    for (const b of this.bosses) out.push({ x: b.x, y: b.y, kind: 'boss' });
    for (const l of this.lairs) if (!l.cleared && near(l.x, l.y, 1800)) out.push({ x: l.x, y: l.y, kind: 'lair' });
    for (const c of this.caches) if (!c.opened && near(c.x, c.y, 1400)) out.push({ x: c.x, y: c.y, kind: 'cache' });
    return out;
  }

  /** Shows a HUD toast (for UI code outside the game). */
  toastMsg(msg: string, color?: string) {
    this.hooks.toast(msg, color);
  }

  /** World position to screen pixels. */
  toScreen(x: number, y: number): [number, number] {
    return [(x - this.camX) * this.zoom + this.app.screen.width / 2, (y - this.camY) * this.zoom + this.app.screen.height / 2];
  }

  get fps() {
    return 1000 / this.frameMs;
  }

  destroy() {
    this.root.destroy({ children: true });
    this.input.joystickEl.style.display = 'none';
  }
}

/**
 * Immediate-mode sprites for one texture: call add() for each shape this frame, then end().
 * Spare sprites are hidden with alpha 0 rather than `visible`, so the scene structure never changes.
 */
class SpritePass {
  private sprites: Sprite[] = [];
  private n = 0;
  constructor(private layer: Container, private tex: () => Texture, private anchorX = 0.5) {}
  begin(): this {
    this.n = 0;
    return this;
  }
  add(x: number, y: number, sx: number, sy: number, rot: number, tint: number, alpha: number) {
    let s = this.sprites[this.n];
    if (!s) {
      s = new Sprite(this.tex());
      s.anchor.set(this.anchorX, 0.5);
      this.layer.addChild(s);
      this.sprites.push(s);
    }
    this.n++;
    s.position.set(x, y);
    s.scale.set(sx, sy);
    s.rotation = rot;
    if (s.tint !== tint) s.tint = tint;
    s.alpha = alpha;
  }
  end() {
    for (let i = this.n; i < this.sprites.length; i++) this.sprites[i].alpha = 0;
  }
}

/** Culling with a margin before hiding, so sprites near the screen edge don't flip every frame (each flip rebuilds the scene). */
function onScreen(was: boolean, dx: number, dy: number, hw: number, hh: number): boolean {
  const m = was ? 120 : 0;
  return Math.abs(dx) < hw + m && Math.abs(dy) < hh + m;
}

function fmtDmg(v: number): string {
  return v >= 10000 ? `${(v / 1000).toFixed(0)}K` : `${Math.round(v)}`;
}

function easeOut(k: number) {
  return 1 - (1 - k) * (1 - k);
}

function angleLerp(from: number, to: number, k: number): number {
  let d = to - from;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d * k;
}

function angleLerpTo(from: number, to: number, k: number): number {
  return from + angleLerp(from, to, k);
}
