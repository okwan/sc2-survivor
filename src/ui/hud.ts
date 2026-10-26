import type { Game } from '../game/game';

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
}

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
  pauseBtn = el('button', 'pausebtn', '❚❚');
  dashBtn: HTMLButtonElement | null = null;

  constructor(private game: Game, touch: boolean) {
    const xp = el('div', 'xp');
    xp.append(this.xpFill, this.lvl);
    const vit = el('div', 'vitals');
    const hp = el('div', 'vbar hp');
    hp.append(this.hpFill, this.brFill, this.hpText);
    this.brFill.style.background = 'rgba(180,230,255,0.45)';
    this.shBar.append(this.shFill);
    vit.append(this.shBar, hp);
    this.dashEl.append(this.dashCd, el('div', 'ic', '💨'), el('div', 'k', 'F'));
    this.root.append(xp, this.timer, this.stats, this.bossWrap, vit, this.dashEl, this.spellsEl, this.toasts, this.pauseBtn);
    if (game.stats.maxShield <= 0) this.shBar.style.display = 'none';
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
    const g = this.game;
    const p = g.player;
    const s = g.stats;
    const need = g.xpNeeded;
    const xpk = Math.min(1, p.xp / need);
    this.set('xp', Math.round(xpk * 400), () => (this.xpFill.style.transform = `scaleX(${xpk})`));
    this.set('lvl', p.level, () => (this.lvl.textContent = `LV ${p.level}`));
    const sec = Math.floor(g.time);
    this.set('time', sec + (g.endless ? 100000 : 0), () => {
      const sub = g.endless ? 'ENDLESS' : `${g.zone.name.toUpperCase()} · BOSS ${fmtTime(g.zone.minutes * 60)}`;
      this.timer.innerHTML = `${fmtTime(g.time)}<small>${sub}</small>`;
    });
    const fps = Math.round(g.fps);
    this.set('stats', `${p.kills}|${p.minerals}|${fps}|${g.enemyCount}`, () => {
      this.stats.innerHTML = `☠ ${p.kills}<br><span class="mineral-ic">💎</span> ${p.minerals}<br><span class="fps">${fps} fps · ${g.enemyCount} units</span>`;
    });
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
      this.dashCd.style.height = `${dk * 100}%`;
      this.dashEl.title = locked ? `${g.race.dashName} unlocks at level 5` : g.race.dashName;
      this.dashEl.style.opacity = locked ? '0.4' : '1';
      if (this.dashBtn) this.dashBtn.style.opacity = locked ? '0.3' : dk > 0 ? '0.6' : '1';
    });
    // spells
    const sig = g.spells.map((x) => `${x.def.id}${x.rank}`).join();
    this.set('spells', sig, () => {
      this.spellsEl.innerHTML = '';
      this.spellCds = [];
      for (const sp of g.spells) {
        const d = el('div', 'slot', sp.def.icon);
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
      if (cd) cd.style.height = `${Math.round(k * 46)}px`;
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
    this.root.remove();
  }
}
