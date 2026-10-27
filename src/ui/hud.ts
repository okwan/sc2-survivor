import { bwTerrain } from '../bw/assets';
import { CONSOLE_H, consoleUrl, hasBwConsole, iconUrl, spellIcon, wireframeUrl, type BwTint } from '../bw/ui';
import { PAUSE_ICON, RACE_UI, SPELL_ICONS } from '../bw/ui-files';
import type { Game } from '../game/game';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

/** First-run hints, shown once per browser. */
const TIPS: { at: number; text: string; touch?: string }[] = [
  { at: 1, text: 'Right-click to move, like in StarCraft (WASD works too). Your spells fire on their own.', touch: 'Drag anywhere to move. Your spells fire on their own.' },
  { at: 8, text: 'Grab the blue crystals enemies drop to level up and pick upgrades.' },
  { at: 20, text: 'Arrows on the edge point to lairs (orange, guarded gear) and supply caches (yellow, cost minerals).' },
];

function tipsSeen(set = false): boolean {
  try {
    if (set) localStorage.setItem('ks-tips', '1');
    return localStorage.getItem('ks-tips') === '1';
  } catch {
    return set;
  }
}

/** Frame counter only for testing: add ?fps to the address. */
const SHOW_FPS = new URLSearchParams(location.search).has('fps');

export function fmtTime(t: number): string {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

/** In-run heads-up display. Only touches the DOM when a value actually changes. */
export class Hud {
  root = el('div', 'hud');
  private xpFill = el('i');
  private lvl = el('div', 'lvl');
  private timer = el('div', 'timer');
  private stats = el('div', 'stats');
  private bossWrap = el('div', 'bosses');
  private hpFill = el('i');
  private hpText = el('span');
  private shBar = el('div', 'vbar sh');
  private shFill = el('i');
  private brFill = el('i');
  private spellsEl = el('div', 'spells');
  private toasts = el('div', 'toasts');
  private dashEl = el('div', 'dash');
  private dashCd = el('div', 'cd');
  private last: Record<string, string | number> = {};
  private bossBars = new Map<number, { root: HTMLDivElement; fill: HTMLElement }>();
  private spellCds: HTMLElement[] = [];
  private statsEls: { kills: HTMLElement; minerals: HTMLElement; fps: HTMLElement | null } | null = null;
  pauseBtn = el('button', 'pausebtn', '❚❚');
  dashBtn: HTMLButtonElement | null = null;
  private bw: BwConsole | null = null;
  private arrowsEl = el('div', 'poi');
  private tipStep = tipsSeen() ? TIPS.length : 0;
  private arrows: HTMLElement[] = [];
  private objEl = el('div', 'objective');

  constructor(
    private game: Game,
    private touch: boolean,
  ) {
    const xp = el('div', 'xp');
    xp.append(this.xpFill, this.lvl);
    const vit = el('div', 'vitals');
    const hp = el('div', 'vbar hp');
    hp.append(this.hpFill, this.brFill, this.hpText);
    this.brFill.style.background = 'rgba(180,230,255,0.45)';
    this.shBar.append(this.shFill);
    vit.append(this.shBar, hp);
    this.dashEl.append(this.dashCd, el('div', 'ic', '💨'), el('div', 'k', 'F'));
    this.root.append(this.arrowsEl, xp, this.timer, this.objEl, this.stats, this.bossWrap, vit, this.dashEl, this.spellsEl, this.toasts, this.pauseBtn);
    if (game.stats.maxShield <= 0) this.shBar.style.display = 'none';
    if (!touch && hasBwConsole(game.race.id)) {
      this.bw = new BwConsole(game, () => this.pauseBtn.click());
      this.root.append(this.bw.root);
      this.root.classList.add('bwmode');
    }
    if (touch) {
      this.dashBtn = el('button', 'touch-dash', 'DASH');
      this.root.append(this.dashBtn);
      this.dashEl.style.display = 'none';
    }
  }

  private set(key: string, v: string | number, fn: () => void) {
    if (this.last[key] === v) return;
    this.last[key] = v;
    fn();
  }

  update() {
    this.bw?.update();
    const g = this.game;
    const p = g.player;
    const s = g.stats;
    const need = g.xpNeeded;
    const xpk = Math.min(1, p.xp / need);
    this.set('xp', Math.round(xpk * 400), () => (this.xpFill.style.transform = `scaleX(${xpk})`));
    this.set('lvl', p.level, () => (this.lvl.textContent = `Level ${p.level}`));
    const sec = Math.floor(g.time);
    this.set('time', sec + (g.endless ? 100000 : 0), () => {
      const sub = g.endless ? 'ENDLESS' : `${g.zone.name.toUpperCase()} · BOSS ${fmtTime(g.zone.minutes * 60)}`;
      this.timer.innerHTML = `${fmtTime(g.time)}<small>${sub}</small>`;
    });
    const obj = g.objectiveText();
    this.set('obj', obj, () => {
      this.objEl.textContent = obj;
      this.objEl.style.display = obj ? '' : 'none';
    });
    const fps = Math.round(g.fps);
    if (!this.statsEls) {
      this.stats.innerHTML = `☠ <span></span><br><span class="minerals"></span>${SHOW_FPS ? '<br><span class="fps"></span>' : ''}`;
      const sp = this.stats.querySelectorAll('span');
      this.statsEls = { kills: sp[0], minerals: sp[1], fps: sp[2] ?? null };
    }
    // text nodes only: rewriting innerHTML on every kill made the browser parse HTML every frame
    const se = this.statsEls;
    this.set('kills', p.kills, () => (se.kills.textContent = `${p.kills}`));
    this.set('minerals', p.minerals, () => (se.minerals.textContent = `${p.minerals} minerals`));
    if (se.fps) this.set('fps', `${fps}|${g.enemyCount}`, () => (se.fps!.textContent = `${fps} fps · ${g.enemyCount} units`));
    const hpk = Math.max(0, p.hp / s.maxHp);
    this.set('hp', Math.round(hpk * 300), () => (this.hpFill.style.transform = `scaleX(${hpk})`));
    this.set('hpt', `${Math.ceil(p.hp)}/${Math.round(s.maxHp)}`, () => (this.hpText.textContent = `${Math.ceil(Math.max(0, p.hp))} / ${Math.round(s.maxHp)}`));
    const brk = Math.min(1, p.barrier / s.maxHp);
    this.set('br', Math.round(brk * 200), () => (this.brFill.style.transform = `scaleX(${brk})`));
    if (s.maxShield > 0) {
      this.shBar.style.display = '';
      const shk = p.shield / s.maxShield;
      this.set('sh', Math.round(shk * 200), () => (this.shFill.style.transform = `scaleX(${shk})`));
    }
    // dash
    const locked = p.level < 5;
    const dk = locked ? 1 : p.dashCd / (5 * Math.max(0.3, s.dashCooldown));
    this.set('dash', Math.round(dk * 40) + (locked ? 1000 : 0), () => {
      setHeight(this.dashCd, `${Math.round(dk * 40) * 2.5}%`);
      this.dashEl.title = locked ? `${g.race.dashName} unlocks at level 5` : g.race.dashName;
      this.dashEl.style.opacity = locked ? '0.4' : '1';
      if (this.dashBtn) {
        this.dashBtn.style.opacity = locked ? '0.3' : dk > 0 ? '0.6' : '1';
        this.dashBtn.textContent = locked ? 'LV 5' : 'DASH';
      }
    });
    // spells
    const sig = g.spells.map((x) => `${x.def.id}${x.rank}`).join();
    this.set('spells', sig, () => {
      this.spellsEl.innerHTML = '';
      this.spellCds = [];
      for (const sp of g.spells) {
        const d = el('div', 'slot', spellIcon(sp.def.id, sp.def.icon));
        d.title = `${sp.def.name} (rank ${sp.rank})`;
        const cd = el('div', 'cd');
        d.prepend(cd);
        d.append(el('div', 'rk', `${sp.rank}`));
        this.spellsEl.append(d);
        this.spellCds.push(cd);
      }
    });
    for (let i = 0; i < g.spells.length; i++) {
      const sp = g.spells[i];
      const k = sp.def.kind === 'orbit' || sp.def.kind === 'aura' || sp.def.kind === 'summon' ? 0 : Math.max(0, Math.min(1, sp.timer / sp.stats.cooldown));
      const cd = this.spellCds[i];
      if (cd) setHeight(cd, `${Math.round(k * 46)}px`);
    }
    this.updateArrows();
    this.root.classList.toggle('lowhp', p.hp > 0 && p.hp / s.maxHp < 0.3);
    if (this.tipStep < TIPS.length && g.time >= TIPS[this.tipStep].at) {
      const t = TIPS[this.tipStep++];
      this.toast(this.touch ? t.touch ?? t.text : t.text, '#ffe9a8');
      if (this.tipStep === TIPS.length) tipsSeen(true);
    }
    // bosses
    const seen = new Set<number>();
    for (const b of g.bosses) {
      seen.add(b.uid);
      let bar = this.bossBars.get(b.uid);
      if (!bar) {
        const root = el('div', 'bossbar');
        root.innerHTML = `<div class="nm">${b.boss!.def.name}<span>${b.boss!.def.title}</span></div>`;
        const bb = el('div', 'b');
        const fill = el('i');
        bb.append(fill);
        root.append(bb);
        this.bossWrap.append(root);
        bar = { root, fill };
        this.bossBars.set(b.uid, bar);
      }
      bar.fill.style.transform = `scaleX(${Math.max(0, b.hp / b.maxHp)})`;
      bar.root.classList.toggle('enraged', !!b.boss?.enraged);
    }
    for (const [uid, bar] of this.bossBars) {
      if (!seen.has(uid)) {
        bar.root.remove();
        this.bossBars.delete(uid);
      }
    }
  }

  /** Arrows on the screen edge pointing at off-screen bosses, lairs and supply caches. */
  private updateArrows() {
    const g = this.game;
    const W = window.innerWidth;
    const H = window.innerHeight;
    const pad = 28;
    const bottom = this.bw ? H * 0.27 : 70; // keep clear of the console
    let n = 0;
    for (const t of g.pointsOfInterest()) {
      const [sx, sy] = g.toScreen(t.x, t.y);
      if (sx > 0 && sx < W && sy > 60 && sy < H - bottom) continue;
      const cx = W / 2;
      const cy = H / 2;
      const dx = sx - cx;
      const dy = sy - cy;
      const k = Math.min((cx - pad) / Math.abs(dx || 1), (dy > 0 ? H - bottom - pad - cy : cy - 90) / Math.abs(dy || 1));
      let a = this.arrows[n];
      if (!a) {
        a = el('div', 'arrow');
        this.arrowsEl.append(a);
        this.arrows.push(a);
      }
      const cls = `arrow ${t.kind}`;
      if (a.className !== cls) a.className = cls;
      if (a.style.display) a.style.display = '';
      a.style.transform = `translate(${cx + dx * k}px, ${cy + dy * k}px) rotate(${Math.atan2(dy, dx)}rad)`;
      n++;
    }
    for (let i = n; i < this.arrows.length; i++) if (this.arrows[i].style.display !== 'none') this.arrows[i].style.display = 'none';
  }

  toast(msg: string, color = '#dfe8f2') {
    const t = el('div', 'toast');
    t.textContent = msg;
    t.style.color = color;
    this.toasts.append(t);
    while (this.toasts.children.length > 4) this.toasts.firstChild!.remove();
    setTimeout(() => t.remove(), 2700);
  }

  bossBanner(name: string, title: string) {
    const b = el('div', 'boss-banner', `<h2>${name}</h2><div>${title}</div>`);
    this.root.append(b);
    setTimeout(() => b.remove(), 3100);
  }

  destroy() {
    this.bw?.destroy();
    this.root.remove();
  }
}

/** Command card slots in console pixels: three columns, three rows. */
const CARD_X = [505, 551, 597];
const CARD_Y = [68, 110, 152];
const MM = 128;

/**
 * The Brood War console along the bottom of the screen: minimap, status panel, hero wireframe
 * and a command card with the spells, dash and pause. Laid out in the console's own 640 px
 * coordinates and scaled as one piece.
 */
class BwConsole {
  root = el('div', 'bwconsole');
  private mm = document.createElement('canvas');
  private mmCtx: CanvasRenderingContext2D;
  private mmBg: HTMLCanvasElement | null = null;
  private status = el('div', 'bwstatus');
  private wire = el('img', 'bwwire');
  private cells: { root: HTMLDivElement; img: HTMLImageElement; cd: HTMLElement; rk: HTMLElement; key: string }[] = [];
  private last: Record<string, string | number> = {};
  private frame = 0;
  private st: { lvl: HTMLElement; hp: HTMLElement; hpv: HTMLElement; sh: HTMLElement | null; shv: HTMLElement | null; xp: HTMLElement; kills: HTMLElement; min: HTMLElement } | null = null;
  private onResize = () => this.fit();

  constructor(private game: Game, pause: () => void) {
    this.root.style.backgroundImage = `url(${consoleUrl(game.race.id)})`;
    this.root.style.height = `${CONSOLE_H}px`;
    this.mm.width = this.mm.height = MM;
    this.mm.className = 'bwmm';
    this.mmCtx = this.mm.getContext('2d')!;
    const portrait = el('div', 'bwportrait');
    portrait.append(this.wire);
    this.root.append(this.mm, this.status, portrait);
    for (let i = 0; i < 9; i++) {
      const root = el('div', 'bwcmd');
      root.style.left = `${CARD_X[i % 3]}px`;
      root.style.top = `${CARD_Y[Math.floor(i / 3)]}px`;
      const img = el('img');
      const cd = el('div', 'cd');
      const rk = el('div', 'rk');
      root.append(img, cd, rk);
      this.root.append(root);
      this.cells.push({ root, img, cd, rk, key: '' });
    }
    const p = this.cells[8];
    p.root.onclick = pause;
    p.root.title = 'Menu (Esc)';
    p.root.classList.add('click');
    this.setIcon(p, PAUSE_ICON, 'on');
    this.fit();
    window.addEventListener('resize', this.onResize);
  }

  private fit() {
    const k = Math.min(window.innerWidth / 640, (window.innerHeight * 0.26) / CONSOLE_H, 2.25);
    this.root.style.transform = `translateX(-50%) scale(${k})`;
  }

  private setIcon(c: (typeof this.cells)[number], frame: number, tint: BwTint) {
    const key = `${frame}:${tint}`;
    if (c.key === key) return;
    c.key = key;
    const u = frame >= 0 ? iconUrl(frame, tint) : null;
    c.img.style.visibility = u ? '' : 'hidden';
    if (u) c.img.src = u;
  }

  private set(key: string, v: string | number, fn: () => void) {
    if (this.last[key] === v) return;
    this.last[key] = v;
    fn();
  }

  update() {
    const g = this.game;
    const p = g.player;
    const s = g.stats;
    const ru = RACE_UI[g.race.id];
    // command card: spells 0-5, dash, empty, pause
    for (let i = 0; i < 6; i++) {
      const c = this.cells[i];
      const sp = g.spells[i];
      if (!sp) {
        this.setIcon(c, -1, 'on');
        setHeight(c.cd, '0px');
        c.rk.textContent = '';
        c.root.title = '';
        continue;
      }
      this.setIcon(c, SPELL_ICONS[sp.def.id] ?? -1, 'on');
      const passive = sp.def.kind === 'orbit' || sp.def.kind === 'aura' || sp.def.kind === 'summon';
      const k = passive ? 0 : Math.max(0, Math.min(1, sp.timer / sp.stats.cooldown));
      setHeight(c.cd, `${Math.round(k * 34)}px`);
      this.set(`rk${i}`, `${sp.def.id}${sp.rank}`, () => {
        c.rk.textContent = `${sp.rank}`;
        c.root.title = `${sp.def.name} (rank ${sp.rank})`;
      });
    }
    const dash = this.cells[6];
    const locked = p.level < 5;
    const dk = locked ? 1 : p.dashCd / (5 * Math.max(0.3, s.dashCooldown));
    this.setIcon(dash, ru?.dash ?? -1, locked ? 'off' : 'on');
    setHeight(dash.cd, `${Math.round((locked ? 0 : dk) * 34)}px`);
    this.set('dash', locked ? 1 : 0, () => {
      dash.root.title = locked ? `${g.race.dashName} unlocks at level 5` : `${g.race.dashName} (F / Space)`;
      dash.rk.textContent = locked ? '' : 'F';
    });
    // status panel and wireframe
    const hpk = Math.max(0, p.hp / s.maxHp);
    const tint: BwTint = hpk > 0.66 ? 'hp' : hpk > 0.33 ? 'hurt' : 'dying';
    this.set('wire', tint, () => {
      const u = ru ? wireframeUrl(ru.unit, tint) : null;
      this.wire.style.visibility = u ? '' : 'hidden';
      if (u) this.wire.src = u;
    });
    const xpk = Math.min(1, p.xp / g.xpNeeded);
    const hasShield = s.maxShield > 0;
    this.set('statusShape', hasShield ? 1 : 0, () => {
      this.status.innerHTML = `<div class="nm">${g.race.hero}<span></span></div>
<div class="bar hp"><i></i></div><div class="v hp"></div>
${hasShield ? '<div class="bar sh"><i></i></div><div class="v sh"></div>' : ''}
<div class="bar xp"><i></i></div>
<div class="row"><span></span><span class="min"></span></div>`;
      const q = (sel: string) => this.status.querySelector(sel) as HTMLElement;
      this.st = {
        lvl: q('.nm span'), hp: q('.bar.hp i'), hpv: q('.v.hp'), sh: hasShield ? q('.bar.sh i') : null, shv: hasShield ? q('.v.sh') : null,
        xp: q('.bar.xp i'), kills: q('.row span'), min: q('.row .min'),
      };
      this.last.lvl = this.last.hpt = this.last.sht = this.last.kills = this.last.min = this.last.hpw = this.last.shw = this.last.xpw = '';
    });
    // update text nodes and bar widths in place; rebuilding the panel's HTML on every kill was a per-frame parse late in a run
    const st = this.st!;
    this.set('lvl', p.level, () => (st.lvl.textContent = `Level ${p.level}`));
    this.set('hpw', Math.round(hpk * 200), () => (st.hp.style.width = `${hpk * 100}%`));
    this.set('hpt', `${Math.ceil(p.hp)}/${Math.round(s.maxHp)}`, () => (st.hpv.textContent = `${Math.ceil(Math.max(0, p.hp))}/${Math.round(s.maxHp)}`));
    if (st.sh && st.shv) {
      const shk = p.shield / s.maxShield;
      this.set('shw', Math.round(shk * 200), () => (st.sh!.style.width = `${shk * 100}%`));
      this.set('sht', `${Math.ceil(p.shield)}/${Math.round(s.maxShield)}`, () => (st.shv!.textContent = `${Math.ceil(p.shield)}/${Math.round(s.maxShield)}`));
    }
    this.set('xpw', Math.round(xpk * 200), () => (st.xp.style.width = `${xpk * 100}%`));
    this.set('kills', p.kills, () => (st.kills.textContent = `Kills ${p.kills}`));
    this.set('min', p.minerals, () => (st.min.textContent = `Minerals ${p.minerals}`));
    if (this.frame++ % 4 === 0) this.drawMinimap();
  }

  /** Minimap pixels per world pixel: the arena's long side fills the box. */
  private mmScale() {
    const g = this.game;
    return MM / Math.max(g.bx1 - g.bx0, g.by1 - g.by0);
  }

  private mmX(x: number) {
    const g = this.game;
    return (x - g.bx0) * this.mmScale() + (MM - (g.bx1 - g.bx0) * this.mmScale()) / 2;
  }

  private mmY(y: number) {
    const g = this.game;
    return (y - g.by0) * this.mmScale() + (MM - (g.by1 - g.by0) * this.mmScale()) / 2;
  }

  private minimapBackground(): HTMLCanvasElement {
    if (this.mmBg) return this.mmBg;
    const cv = document.createElement('canvas');
    cv.width = cv.height = MM;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, MM, MM);
    const g = this.game;
    const mg = g.mapGround;
    const tex = mg ? null : bwTerrain(g.zone.id);
    const src = tex?.source.resource as CanvasImageSource | undefined;
    if (mg) {
      // the real map, one pixel per tile, letterboxed like the console does for non-square maps
      const k = this.mmScale();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(mg.minimap(), this.mmX(g.bx0), this.mmY(g.by0), (g.bx1 - g.bx0) * k, (g.by1 - g.by0) * k);
    } else if (src && tex) {
      // the ground repeats every texture-width world pixels
      const step = tex.width * this.mmScale();
      ctx.imageSmoothingEnabled = true;
      for (let y = 0; y < MM; y += step) for (let x = 0; x < MM; x += step) ctx.drawImage(src, x, y, step, step);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(0, 0, MM, MM);
    }
    this.mmBg = cv;
    return cv;
  }

  private drawMinimap() {
    const g = this.game;
    const ctx = this.mmCtx;
    const k = this.mmScale();
    const mx = (x: number) => this.mmX(x);
    const my = (y: number) => this.mmY(y);
    ctx.drawImage(this.minimapBackground(), 0, 0);
    ctx.fillStyle = '#ffd34d';
    for (const c of g.caches) if (!c.opened) ctx.fillRect(mx(c.x) - 1, my(c.y) - 1, 3, 3);
    ctx.fillStyle = '#ff9a3c';
    for (const l of g.lairs) if (!l.cleared) ctx.fillRect(mx(l.x) - 2, my(l.y) - 2, 4, 4);
    ctx.fillStyle = '#e02020';
    for (let i = 0; i < g.enemyCount; i++) {
      const e = g.enemies[i];
      ctx.fillRect(mx(e.x), my(e.y), 1.5, 1.5);
    }
    ctx.fillStyle = '#ff40ff';
    for (const b of g.bosses) ctx.fillRect(mx(b.x) - 2.5, my(b.y) - 2.5, 5, 5);
    const p = g.player;
    ctx.fillStyle = '#4fff6a';
    ctx.fillRect(mx(p.x) - 1.5, my(p.y) - 1.5, 3, 3);
    // the camera's view, like the white box on the real minimap
    const hw = (window.innerWidth / 2 / g.zoom) * k;
    const hh = (window.innerHeight / 2 / g.zoom) * k;
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.strokeRect(Math.round(mx(g.camX) - hw) + 0.5, Math.round(my(g.camY) - hh) + 0.5, Math.round(hw * 2), Math.round(hh * 2));
  }

  destroy() {
    window.removeEventListener('resize', this.onResize);
  }
}

/** Writes a style height only when it changed: style writes invalidate layout even when the value is the same. */
function setHeight(e: HTMLElement & { _h?: string }, h: string) {
  if (e._h === h) return;
  e._h = h;
  e.style.height = h;
}
