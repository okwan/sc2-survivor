import type { Game } from '../game/game';
import { wowIcon } from '../wow/icons';
import { wowCrop, wowFile, wowIconUrl } from '../wow/ui';
import { Radar } from './radar';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

const css = (u: string | null) => (u ? `url(${u})` : '');

/** Sets a background image once it is ready (crops are built on a canvas, so they arrive later). */
function bg(e: HTMLElement, u: string | null | Promise<string | null>) {
  void Promise.resolve(u).then((v) => {
    if (v) e.style.backgroundImage = css(v);
  });
}

/** True when the art the WoW HUD is built from was deployed. */
export function hasWowHud(): boolean {
  return !!(wowFile('interface/mainmenubar/ui-mainmenubar-dwarf.png') && wowFile('interface/targetingframe/ui-targetingframe.png'));
}

const BAR_W = 1024;
const CAP_OUT = 96; // the gryphons hang this far past each end of the bar
const RADAR_PX = 140;

interface Btn {
  root: HTMLDivElement;
  icon: HTMLImageElement;
  cd: HTMLElement;
  count: HTMLElement;
  key: string;
}

/**
 * The WoW 1.12 interface around the game: the player frame (portrait, health, shield or energy),
 * a target frame for the current boss, the round minimap, and the main action bar with its
 * gryphons, experience bar, spells, dash, backpack and main menu button. Laid out in the
 * client's own pixel coordinates and scaled as a piece, like the client's UI scale.
 */
export class WowHud {
  root = el('div', 'wowhud');
  private bar = el('div', 'wowbar');
  private xpFill = el('i');
  private xpText = el('span');
  private buttons: Btn[] = [];
  private player = el('div', 'wowunit player');
  private target = el('div', 'wowunit target');
  private pHp = el('i');
  private pMp = el('i');
  private pHpT = el('span');
  private pMpT = el('span');
  private pLvl = el('div', 'lvl');
  private tHp = el('i');
  private tHpT = el('span');
  private tName = el('div', 'nm');
  private tPortrait = el('div', 'portrait');
  private mm = el('div', 'wowmm');
  private radar: Radar;
  private zone = el('div', 'zonetxt');
  private info = el('div', 'info');
  private bagCount = el('span', 'count');
  private last: Record<string, string | number> = {};
  private frame = 0;
  private onResize = () => this.fit();

  constructor(
    private game: Game,
    pause: () => void,
  ) {
    this.radar = new Radar(game, RADAR_PX);
    this.buildBar(pause);
    this.buildPlayer();
    this.buildTarget();
    this.buildMinimap();
    this.root.append(this.player, this.target, this.mm, this.bar);
    this.fit();
    window.addEventListener('resize', this.onResize);
  }

  /** Bottom of the screen the HUD covers, for the off-screen arrows. */
  get bottomPx() {
    return Math.ceil((53 + 40) * this.k);
  }

  private k = 1;

  private fit() {
    const ui = Math.max(0.75, Math.min(1.35, window.innerHeight / 820));
    this.k = Math.min(ui, window.innerWidth / (BAR_W + CAP_OUT * 2));
    this.bar.style.transform = `translateX(-50%) scale(${this.k})`;
    this.player.style.transform = this.target.style.transform = this.mm.style.transform = `scale(${Math.min(ui, window.innerWidth / 900)})`;
  }

  private buildBar(pause: () => void) {
    const bar = this.bar;
    // the stone bar: four 256x43 strips of one texture
    const strips: [number, number][] = [
      [0.83203125, 1],
      [0.58203125, 0.75],
      [0.33203125, 0.5],
      [0.08203125, 0.25],
    ];
    strips.forEach(([t, b], i) => {
      const s = el('div', 'strip');
      s.style.left = `${i * 256}px`;
      bg(s, wowCrop('interface/mainmenubar/ui-mainmenubar-dwarf.png', 0, 1, t, b));
      bar.append(s);
    });
    // experience bar along the top
    const xp = el('div', 'xpbar');
    xp.append(this.xpFill);
    const xpStrips: [number, number][] = [
      [0.79296875, 1],
      [0.54296875, 0.75],
      [0.29296875, 0.5],
      [0.04296875, 0.25],
    ];
    xpStrips.forEach(([t, b], i) => {
      const s = el('div', 'xpart');
      s.style.left = `${i * 256}px`;
      bg(s, wowCrop('interface/mainmenubar/ui-xp-bar.png', 0, 1, t, b));
      xp.append(s);
    });
    xp.append(this.xpText);
    bar.append(xp);
    // gryphons
    for (const side of ['left', 'right'] as const) {
      const cap = el('div', `cap ${side}`);
      const file = wowFile('interface/mainmenubar/ui-mainmenubar-endcap-dwarf.png') ? 'interface/mainmenubar/ui-mainmenubar-endcap-dwarf.png' : 'interface/mainmenubar/ui-mainmenubar-endcap-human.png';
      bg(cap, side === 'left' ? wowFile(file) : wowCrop(file, 1, 0, 0, 1));
      bar.append(cap);
    }
    // twelve action buttons; spells take 1-6, the dash takes 12 like a mount
    for (let i = 0; i < 12; i++) {
      const root = el('div', 'wowbtn');
      root.style.left = `${8 + i * 42}px`;
      const icon = el('img');
      const cd = el('div', 'cd');
      const count = el('span', 'count');
      root.append(icon, cd, count, el('div', 'frame'));
      if (i >= 6 && i < 11) root.classList.add('empty');
      bar.append(root);
      this.buttons.push({ root, icon, cd, count, key: '' });
    }
    // main menu micro button opens the pause menu
    const menu = el('div', 'micro');
    menu.title = 'Main Menu (Esc)';
    bg(menu, wowFile('interface/buttons/ui-microbutton-mainmenu-up.png'));
    menu.onpointerdown = () => bg(menu, wowFile('interface/buttons/ui-microbutton-mainmenu-down.png'));
    menu.onpointerup = menu.onpointerleave = () => bg(menu, wowFile('interface/buttons/ui-microbutton-mainmenu-up.png'));
    menu.onclick = pause;
    bar.append(menu);
    // the backpack holds the minerals
    const bag = el('div', 'bag');
    bag.title = 'Minerals';
    bg(bag, wowFile('interface/buttons/button-backpack-up.png'));
    bag.append(this.bagCount);
    bar.append(bag);
  }

  private buildPlayer() {
    const p = this.player;
    const portrait = el('div', 'portrait');
    bg(portrait, heroPortrait(this.game.race.id));
    const art = el('div', 'art');
    bg(art, wowCrop('interface/targetingframe/ui-targetingframe.png', 1, 0.09375, 0, 0.78125));
    const name = el('div', 'nm', this.game.race.hero);
    const hp = el('div', 'sb hp');
    hp.append(this.pHp, this.pHpT);
    const mp = el('div', 'sb mp');
    mp.append(this.pMp, this.pMpT);
    p.append(el('div', 'back'), portrait, hp, mp, art, name, this.pLvl);
  }

  private buildTarget() {
    const t = this.target;
    const art = el('div', 'art');
    bg(art, wowCrop(wowFile('interface/targetingframe/ui-targetingframe-elite.png') ? 'interface/targetingframe/ui-targetingframe-elite.png' : 'interface/targetingframe/ui-targetingframe.png', 0.09375, 1, 0, 0.78125));
    bg(this.tPortrait, wowIconUrl('INV_Misc_Head_Dragon_01', 'Spell_Shadow_Shadowfury', 'INV_Misc_QuestionMark'));
    const hp = el('div', 'sb hp');
    hp.append(this.tHp, this.tHpT);
    const mp = el('div', 'sb mp');
    mp.append(el('i'));
    const skull = el('div', 'skull');
    bg(skull, wowFile('interface/targetingframe/ui-targetingframe-skull.png'));
    t.append(el('div', 'back'), this.tPortrait, hp, mp, art, this.tName, skull);
    t.style.display = 'none';
  }

  private buildMinimap() {
    const m = this.mm;
    this.radar.canvas.className = 'radar';
    const border = el('div', 'border');
    bg(border, wowFile('interface/minimap/ui-minimap-border.png'));
    this.zone.textContent = this.game.zone.name;
    m.append(this.radar.canvas, border, this.zone, this.info);
  }

  private set(key: string, v: string | number, fn: () => void) {
    if (this.last[key] === v) return;
    this.last[key] = v;
    fn();
  }

  private setIcon(b: Btn, url: string | null) {
    const key = url ?? '';
    if (b.key === key) return;
    b.key = key;
    b.icon.style.visibility = url ? '' : 'hidden';
    b.root.classList.toggle('empty', !url);
    if (url) b.icon.src = url;
  }

  update() {
    const g = this.game;
    const p = g.player;
    const s = g.stats;
    // action bar
    for (let i = 0; i < 6; i++) {
      const b = this.buttons[i];
      const sp = g.spells[i];
      if (!sp) {
        this.setIcon(b, null);
        continue;
      }
      this.setIcon(b, wowIcon(sp.def.id));
      const passive = sp.def.kind === 'orbit' || sp.def.kind === 'aura' || sp.def.kind === 'summon';
      const k = passive ? 0 : Math.max(0, Math.min(1, sp.timer / sp.stats.cooldown));
      this.set(`cd${i}`, Math.round(k * 60), () => sweep(b.cd, k));
      this.set(`rk${i}`, `${sp.def.id}${sp.rank}`, () => {
        b.count.textContent = `${sp.rank}`;
        b.root.title = `${sp.def.name} (rank ${sp.rank})`;
      });
    }
    const dash = this.buttons[11];
    const locked = p.level < 5;
    const dk = locked ? 0 : p.dashCd / (5 * Math.max(0.3, s.dashCooldown));
    this.setIcon(dash, wowIcon(`dash_${g.race.id}`));
    this.set('dashcd', Math.round(dk * 60) + (locked ? 1000 : 0), () => {
      sweep(dash.cd, dk);
      dash.root.classList.toggle('locked', locked);
      dash.root.title = locked ? `${g.race.dashName} unlocks at level 5` : `${g.race.dashName} (F / Space)`;
      dash.count.textContent = locked ? '' : 'F';
    });
    const xpk = Math.min(1, p.xp / g.xpNeeded);
    this.set('xp', Math.round(xpk * 500), () => (this.xpFill.style.transform = `scaleX(${xpk})`));
    this.set('xpt', `${p.level}|${Math.floor(p.xp)}`, () => (this.xpText.textContent = `Level ${p.level}  ·  XP ${Math.floor(p.xp)} / ${Math.round(g.xpNeeded)}`));
    this.set('bag', p.minerals, () => (this.bagCount.textContent = `${p.minerals}`));
    // player frame
    const hpk = Math.max(0, p.hp / s.maxHp);
    this.set('hp', Math.round(hpk * 300), () => (this.pHp.style.transform = `scaleX(${hpk})`));
    this.set('hpt', `${Math.ceil(p.hp)}/${Math.round(s.maxHp)}`, () => (this.pHpT.textContent = `${Math.ceil(Math.max(0, p.hp))} / ${Math.round(s.maxHp)}`));
    this.set('lvl', p.level, () => (this.pLvl.textContent = `${p.level}`));
    if (s.maxShield > 0) {
      const shk = Math.max(0, p.shield / s.maxShield);
      this.set('mpk', 'sh', () => this.pMp.parentElement!.classList.remove('energy'));
      this.set('mp', Math.round(shk * 300), () => (this.pMp.style.transform = `scaleX(${shk})`));
      this.set('mpt', `${Math.ceil(p.shield)}/${Math.round(s.maxShield)}`, () => (this.pMpT.textContent = `${Math.ceil(p.shield)} / ${Math.round(s.maxShield)}`));
    } else {
      // no shields: the bar is the dash's energy, like a rogue's
      const ek = locked ? 0 : 1 - dk;
      this.set('mpk', 'en', () => this.pMp.parentElement!.classList.add('energy'));
      this.set('mp', Math.round(ek * 300), () => (this.pMp.style.transform = `scaleX(${ek})`));
      this.set('mpt', locked ? 'l' : Math.round(ek * 100), () => (this.pMpT.textContent = locked ? 'Level 5' : `${Math.round(ek * 100)}`));
    }
    this.player.classList.toggle('hurt', hpk < 0.3 && p.hp > 0);
    // target frame: the first boss alive
    const b = g.bosses[0];
    this.set('tvis', b ? b.uid : -1, () => {
      this.target.style.display = b ? '' : 'none';
      if (b?.boss) this.tName.textContent = b.boss.def.name;
    });
    if (b) {
      const k = Math.max(0, b.hp / b.maxHp);
      this.set('thp', Math.round(k * 300), () => {
        this.tHp.style.transform = `scaleX(${k})`;
        this.tHpT.textContent = `${Math.round(k * 100)}%`;
      });
      this.set('tenr', b.boss?.enraged ? 1 : 0, () => this.target.classList.toggle('enraged', !!b.boss?.enraged));
    }
    // minimap
    this.set('info', `${p.kills}`, () => (this.info.textContent = `Kills ${p.kills}`));
    if (this.frame++ % 4 === 0) this.radar.draw();
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
  }
}

/** The hero's portrait for the player frame: a class-like icon per race. */
function heroPortrait(race: string): string | null {
  const icons: Record<string, string[]> = {
    terran: ['INV_Helmet_03', 'Ability_Warrior_DefensiveStance'],
    zerg: ['Ability_Hunter_Pet_Ravager', 'Ability_Druid_CatForm'],
    protoss: ['Spell_Holy_SealOfWisdom', 'Spell_Arcane_ArcanePotency'],
  };
  return wowIconUrl(...(icons[race] ?? []), 'INV_Misc_QuestionMark');
}

/** The cooldown shade: a clock sweep over what is still cooling down (k = 1 just used, 0 ready). */
function sweep(e: HTMLElement, k: number) {
  e.style.background = k > 0.001 ? `conic-gradient(transparent ${(1 - k) * 360}deg, rgba(0,0,0,0.65) 0)` : 'none';
}
