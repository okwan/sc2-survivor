import type { Texture } from 'pixi.js';
import { BW_UNITS, buildSprites, bwStatus, clearStoredFiles, ingestFiles, storeFiles } from '../bw/assets';
import { applyBwChrome, bwIcon, resetBwUi, spellIcon } from '../bw/ui';
import { ACHIEVEMENTS, ACH_BY_ID } from '../data/achievements';
import { dailyFor, type DailyDef } from '../data/daily';
import { DIFFICULTIES } from '../data/difficulty';
import { HEROES, HERO_BY_ID } from '../data/heroes';
import { MAX_MUTATORS, MUTATORS, MUTATOR_BY_ID } from '../data/mutators';
import { ZONES, ZONE_BY_ID } from '../data/enemies';
import { GEAR_SLOTS, LEGENDARY_EFFECTS, PERKS, SLOT_NAMES, gearScore, type GearItem } from '../data/items';
import { RACE_DEFS } from '../data/races';
import { wc3HeroIconUrl } from '../wc3/sprites';
import { MAX_RANK, SPELL_BY_ID } from '../data/spells';
import { TALENTS, TALENT_CAP, type TalentNode } from '../data/talents';
import { RACES, RARITY_COLORS, RARITY_NAMES, STAT_LABELS, fmtStat, type RaceId, type StatKey } from '../data/types';
import { playMusic, setVolume, sfx } from '../game/audio';
import { applyCard, dealCards, describeCard, type Card } from '../game/cards';
import type { Game, RunResult } from '../game/game';
import type { Rewards } from '../meta/rewards';
import { canLearn, currentHero, equip, exportSave, heroUnlocked, importSave, learn, nextPointProgress, perkLevel, persist, pointsEarned, pointsSpent, resetSave, respec, save, stashItem, STASH_MAX } from '../meta/save';
import { fmtTime } from './hud';

export interface Shell {
  ui: HTMLElement;
  startRun(race: RaceId, zoneId: string, daily?: DailyDef): void | Promise<void>;
  quitRun(): void;
  heroPreview(race: RaceId): HTMLElement | null;
  setKeyHandler(fn: ((code: string) => void) | null): void;
  texture?: Texture;
}

const hex = (n: number) => '#' + n.toString(16).padStart(6, '0');

function clear(shell: Shell) {
  shell.ui.innerHTML = '';
  shell.setKeyHandler(null);
}

let tip: HTMLDivElement | null = null;
function showTip(e: MouseEvent, html: string) {
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'tooltip';
    document.body.append(tip);
  }
  tip.innerHTML = html;
  tip.style.display = 'block';
  const x = Math.min(window.innerWidth - 300, e.clientX + 14);
  const y = Math.min(window.innerHeight - 140, e.clientY + 14);
  tip.style.left = `${x}px`;
  tip.style.top = `${y}px`;
}
function hideTip() {
  if (tip) tip.style.display = 'none';
}

function itemHtml(it: GearItem): string {
  const stats = Object.entries(it.stats).map(([k, v]) => fmtStat(k as StatKey, v!)).join('<br>');
  return `<div class="grow"><div class="nm" style="color:${RARITY_COLORS[it.rarity]}">${it.name}</div><div class="muted" style="font-size:12px">${RARITY_NAMES[it.rarity]} ${SLOT_NAMES[it.slot]}</div><div class="st">${stats}</div>${it.effect ? `<div class="legfx">${LEGENDARY_EFFECTS[it.effect]}</div>` : ''}</div>`;
}

// ================================================================ main menu
export function showMenu(shell: Shell) {
  clear(shell);
  playMusic(['title']);
  const race = save.lastRace;
  const rs = save.races[race];
  const menu = document.createElement('div');
  menu.className = 'menu';
  const inner = document.createElement('div');
  inner.className = 'menu-inner';
  inner.innerHTML = `
    <div class="title"><h1>KOPRULU SURVIVORS</h1><div class="sub">Azeroth's heroes against the Koprulu sector</div></div>
    <div class="section-title">Choose your faction</div>
    <div class="races"></div>
    <div class="heroes"></div>
    <div class="section-title">Choose your battlefield</div>
    <div class="zones"></div>
    <div class="diffs"></div>
    <div class="mutators"></div>
    <div class="daily"></div>
    <div class="menu-actions">
      <button class="btn" data-a="talents">Talents</button>
      <button class="btn" data-a="armory">Armory</button>
      <button class="btn" data-a="achievements">Achievements <span class="gold">${Object.keys(save.achievements).length}/${ACHIEVEMENTS.length}</span></button>
      <button class="btn" data-a="history">Records</button>
      <button class="btn" data-a="perks">Rewards <span class="gold">⬢ ${save.vespene}</span></button>
      <button class="btn" data-a="graphics">Sprites${bwStatus().loaded ? ' <span class="gold">BW</span>' : ''}</button>
      <button class="btn" data-a="settings">Settings</button>
    </div>
    <div class="menu-actions deploy"><button class="btn primary" data-a="play">Deploy ▸</button></div>
    <div class="controls">${
      matchMedia('(pointer: coarse)').matches
        ? 'Drag anywhere to move · spells cast automatically · tap DASH from level 5 · tap a card to pick it'
        : 'Right-click or WASD to move · spells cast automatically · F / Space to dash (level 5) · 1-3 pick cards · R reroll · B banish · Esc pause · mouse wheel zoom'
    }</div>
    <div class="footer">Each faction unlocks battlefields on its own.<br>Fan project, not affiliated with Blizzard Entertainment. StarCraft and Warcraft are trademarks of Blizzard Entertainment.</div>`;
  menu.append(inner);
  shell.ui.append(menu);

  const racesEl = inner.querySelector('.races')!;
  for (const r of RACES) {
    const d = RACE_DEFS[r];
    const b = document.createElement('button');
    b.className = 'race-card' + (r === race ? ' sel' : '');
    b.style.setProperty('--race', hex(d.color === 0x8a3fb0 ? 0xc06ae0 : d.color === 0x3f7fd6 ? 0x5ca0ff : d.color));
    const pts = pointsEarned(r) - pointsSpent(r);
    b.innerHTML = `<div class="pts">${pts > 0 ? `<b>${pts}</b> talent pts` : ''}</div><h2>${d.name}</h2><div class="hero">${r === race ? currentHero(r).name : d.hero}</div><p>${d.desc}</p><p class="racial">${d.racial}</p><p class="racial">${d.active}</p>`;
    const cv = shell.heroPreview(r);
    if (cv) b.querySelector('h2')!.before(cv);
    b.onclick = () => {
      save.lastRace = r;
      const unlocked = save.races[r].zonesCleared;
      const zi = ZONES.findIndex((z) => z.id === save.lastZone);
      if (zi > unlocked) save.lastZone = ZONES[0].id;
      if (ZONES.findIndex((z) => z.id === save.lastZone) >= unlocked) save.difficulty = 0;
      persist();
      sfx('select');
      showMenu(shell);
    };
    racesEl.append(b);
  }

  // heroes of the selected race; the others unlock through achievements
  const heroesEl = inner.querySelector('.heroes')!;
  const cur = currentHero(race);
  for (const h of HEROES.filter((x) => x.race === race)) {
    const open = heroUnlocked(h);
    const b = document.createElement('button');
    b.className = 'hero-pick' + (h.id === cur.id ? ' sel' : '') + (open ? '' : ' locked');
    const how = h.unlock ? ACH_BY_ID[h.unlock] : undefined;
    const sp = SPELL_BY_ID[h.startSpell];
    const icon = wc3HeroIconUrl(h.art);
    b.innerHTML = `${icon ? `<img class="wc3-icon" src="${icon}" alt="">` : ''}<b>${open ? '' : '🔒 '}${h.name}</b><span>${open ? `${h.desc}${sp ? ` <i>${sp.name}</i>` : ''}` : `Unlock: ${how?.desc ?? 'Achievement'}`}</span>`;
    b.onclick = () => {
      if (!open) return;
      save.heroes[race] = h.id;
      persist();
      sfx('select');
      showMenu(shell);
    };
    heroesEl.append(b);
  }

  const zonesEl = inner.querySelector('.zones')!;
  ZONES.forEach((z, i) => {
    const locked = i > rs.zonesCleared;
    const b = document.createElement('button');
    b.className = 'zone' + (z.id === save.lastZone && !locked ? ' sel' : '') + (locked ? ' locked' : '');
    const best = rs.bestTimes[z.id];
    const cleared = i < rs.zonesCleared;
    b.innerHTML = `<h3>${locked ? '🔒 ' : cleared ? '✔ ' : ''}${z.name}</h3><div class="meta">Final boss at ${fmtTime(z.minutes * 60)} · Threat ${'★'.repeat(i + 1)}${best ? ` · Best ${fmtTime(best)}` : ''}</div><p>${locked ? `Clear ${ZONES[i - 1].name} with the ${RACE_DEFS[race].name} to unlock.` : z.desc}</p>`;
    b.onclick = () => {
      if (locked) return;
      save.lastZone = z.id;
      if (!cleared) save.difficulty = 0;
      persist();
      sfx('select');
      showMenu(shell);
    };
    zonesEl.append(b);
  });

  // difficulty: Hard and Brutal open on zones this race has already cleared
  const diffsEl = inner.querySelector('.diffs')!;
  const zoneCleared = ZONES.findIndex((z) => z.id === save.lastZone) < rs.zonesCleared;
  if (!zoneCleared) {
    save.difficulty = 0;
    save.mutators = [];
  }
  for (const d of DIFFICULTIES) {
    const b = document.createElement('button');
    const locked = d.id > 0 && !zoneCleared;
    b.className = 'diff' + (d.id === save.difficulty ? ' sel' : '') + (locked ? ' locked' : '');
    b.style.setProperty('--dc', d.color);
    b.title = locked ? 'Clear this zone to unlock' : d.desc;
    b.innerHTML = `<b>${locked ? '🔒 ' : ''}${d.name}</b><span>${d.id === 0 ? 'Standard' : `x${d.rewards} rewards`}</span>`;
    b.onclick = () => {
      if (locked) return;
      save.difficulty = d.id;
      persist();
      sfx('select');
      showMenu(shell);
    };
    diffsEl.append(b);
  }
  // mutators, SC2 co-op style: up to three on a cleared zone, each adding rewards
  const mutEl = inner.querySelector('.mutators') as HTMLElement;
  if (zoneCleared) {
    mutEl.innerHTML = `<div class="mut-title">Mutators <span>${save.mutators.length}/${MAX_MUTATORS} · bonus rewards</span></div>`;
    for (const m of MUTATORS) {
      const on = save.mutators.includes(m.id);
      const b = document.createElement('button');
      b.className = 'mut' + (on ? ' sel' : '');
      b.title = m.desc;
      b.innerHTML = `${m.icon} ${m.name} <span>+${Math.round(m.bonus * 100)}%</span>`;
      b.onclick = () => {
        if (on) save.mutators = save.mutators.filter((x) => x !== m.id);
        else if (save.mutators.length < MAX_MUTATORS) save.mutators = [...save.mutators, m.id];
        else return;
        persist();
        sfx('select');
        showMenu(shell);
      };
      mutEl.append(b);
    }
  }

  // daily challenge: same race, zone and mutators for everyone today
  const dd = dailyFor();
  const rec = save.daily[dd.date];
  const dailyEl = inner.querySelector('.daily') as HTMLElement;
  dailyEl.innerHTML = `<div><b>Daily challenge</b> <span class="muted">${RACE_DEFS[dd.race].name} on ${ZONE_BY_ID[dd.zone].name} · ${dd.mutators.map((m) => `${MUTATOR_BY_ID[m].icon} ${MUTATOR_BY_ID[m].name}`).join(' · ')}</span></div>
    <div class="muted">${rec ? `Today's best: ${rec.won ? '<b class="gold">Cleared</b>' : fmtTime(rec.time)} · ${rec.kills} kills · ${rec.tries} ${rec.tries > 1 ? 'tries' : 'try'}` : 'Not played today · first try pays ⬢ 5'}</div>`;
  const db = document.createElement('button');
  db.className = 'btn small';
  db.textContent = 'Play daily';
  db.onclick = () => {
    sfx('select');
    shell.startRun(dd.race, dd.zone, dd);
  };
  dailyEl.append(db);

  inner.querySelectorAll<HTMLButtonElement>('[data-a]').forEach((b) => {
    b.onclick = () => {
      sfx('select');
      const a = b.dataset.a;
      if (a === 'play') shell.startRun(save.lastRace, save.lastZone);
      else if (a === 'talents') showTalents(shell, save.lastRace);
      else if (a === 'armory') showArmory(shell, save.lastRace);
      else if (a === 'perks') showPerks(shell);
      else if (a === 'achievements') showAchievements(shell);
      else if (a === 'history') showHistory(shell);
      else if (a === 'settings') showSettingsMenu(shell);
      else if (a === 'graphics') showGraphics(shell);
    };
  });
  shell.setKeyHandler((c) => {
    if (c === 'Enter') shell.startRun(save.lastRace, save.lastZone);
  });
}

function subScreen(shell: Shell, title: string, race: RaceId | null, onRace: ((r: RaceId) => void) | null): HTMLDivElement {
  clear(shell);
  const menu = document.createElement('div');
  menu.className = 'menu';
  const inner = document.createElement('div');
  inner.className = 'menu-inner';
  const head = document.createElement('div');
  head.className = 'screen-head';
  head.innerHTML = `<button class="btn small" data-back>◂ Back</button><h2>${title}</h2>`;
  if (race && onRace) {
    const tabs = document.createElement('div');
    tabs.className = 'tabs';
    for (const r of RACES) {
      const t = document.createElement('button');
      t.className = 'tab' + (r === race ? ' sel' : '');
      t.textContent = RACE_DEFS[r].name;
      t.onclick = () => onRace(r);
      tabs.append(t);
    }
    head.append(tabs);
  }
  head.querySelector<HTMLButtonElement>('[data-back]')!.onclick = () => {
    hideTip();
    showMenu(shell);
  };
  inner.append(head);
  menu.append(inner);
  shell.ui.append(menu);
  shell.setKeyHandler((c) => {
    if (c === 'Escape') {
      hideTip();
      showMenu(shell);
    }
  });
  return inner;
}

// ================================================================ talents
export function showTalents(shell: Shell, race: RaceId) {
  const inner = subScreen(shell, 'Talents', race, (r) => showTalents(shell, r));
  const earned = pointsEarned(race);
  const spent = pointsSpent(race);
  const [have, need] = nextPointProgress(race);
  const info = document.createElement('div');
  info.className = 'talent-info';
  info.innerHTML = `<div><b class="gold" style="font-size:22px">${earned - spent}</b> points available · ${spent}/${Math.min(earned, TALENT_CAP)} spent · cap ${TALENT_CAP}</div>
    <div class="muted">Next point: ${earned >= TALENT_CAP ? 'maxed' : `${Math.floor(have)}/${need} talent XP`}</div><div class="bar"><i style="width:${(have / need) * 100}%"></i></div>
    <button class="btn small danger" data-reset>Reset (free)</button>`;
  const resetBtn = info.querySelector<HTMLButtonElement>('[data-reset]')!;
  resetBtn.onclick = () => {
    if (!resetBtn.dataset.sure) {
      resetBtn.dataset.sure = '1';
      resetBtn.textContent = 'Click again to reset all talents';
      return;
    }
    respec(race);
    showTalents(shell, race);
  };
  inner.append(info);
  const hint = document.createElement('div');
  hint.className = 'muted';
  hint.style.marginBottom = '10px';
  hint.style.fontSize = '14px';
  hint.textContent = 'Talent XP is earned from every run, win or lose. Rows unlock every 5 points spent in a tree. Milestones sit at 10, 20 and 30 points; the 30-point capstone changes your starting spell.';
  inner.append(hint);
  const trees = document.createElement('div');
  trees.className = 'trees';
  for (const tr of TALENTS[race]) {
    const box = document.createElement('div');
    box.className = 'tree';
    box.innerHTML = `<span class="spent">${pointsSpent(race, tr.id)}</span><h3>${bwIcon(tr.id, tr.icon)} ${tr.name}</h3><div class="blurb">${tr.blurb}</div>`;
    const grid = document.createElement('div');
    grid.className = 'tgrid';
    for (const n of tr.nodes) {
      const rank = save.races[race].talents[n.id] ?? 0;
      const can = canLearn(race, n);
      const rowOpen = pointsSpent(race, tr.id) >= n.row * 5;
      const b = document.createElement('button');
      b.className = 'tnode' + (n.milestone ? ' mile' : '') + (rank >= n.maxRank ? ' max' : rank > 0 ? ' some' : can ? ' avail' : rowOpen ? '' : ' locked');
      b.style.gridRow = `${n.row + 1}`;
      b.style.gridColumn = `${n.col + 1}`;
      b.innerHTML = `${n.milestone ? `<span class="ms">${n.milestone}</span>` : ''}${n.name}<span class="rk">${rank}/${n.maxRank}</span>`;
      b.onmousemove = (e) => showTip(e, nodeTip(n, rank, rowOpen));
      b.onmouseleave = hideTip;
      b.onclick = () => {
        if (!canLearn(race, n)) return;
        learn(race, n);
        sfx('select');
        hideTip();
        showTalents(shell, race);
      };
      grid.append(b);
    }
    box.append(grid);
    trees.append(box);
  }
  inner.append(trees);
}

function nodeTip(n: TalentNode, rank: number, rowOpen: boolean): string {
  const req = rowOpen ? '' : `<div style="color:#ff8080">Requires ${n.row * 5} points in this tree</div>`;
  const ms = n.milestone ? `<div class="gold">Milestone (${n.milestone} points)</div>` : '';
  return `<b>${n.name}</b>${ms}<div>${n.desc}</div><div class="muted">Rank ${rank}/${n.maxRank}</div>${req}`;
}

// ================================================================ armory
export function showArmory(shell: Shell, race: RaceId) {
  const inner = subScreen(shell, 'Armory', race, (r) => showArmory(shell, r));
  const rs = save.races[race];
  const wrap = document.createElement('div');
  wrap.className = 'armory';
  const eq = document.createElement('div');
  eq.innerHTML = '<div class="section-title" style="margin-top:0">Equipped</div>';
  for (const s of GEAR_SLOTS) {
    const it = rs.gear[s];
    const d = document.createElement('div');
    d.className = 'item';
    d.innerHTML = it ? itemHtml(it) : `<div class="grow muted">Empty ${SLOT_NAMES[s]} slot</div>`;
    eq.append(d);
  }
  const st = document.createElement('div');
  st.innerHTML = `<div class="section-title" style="margin-top:0">Stash (${rs.stash.length}/${STASH_MAX})</div>`;
  if (!rs.stash.length) st.innerHTML += '<div class="muted">Kill guardians in their lairs, slay bosses and open supply caches to find gear. Gear is kept per faction.</div>';
  for (const it of rs.stash) {
    const d = document.createElement('div');
    d.className = 'item';
    d.innerHTML = itemHtml(it);
    const b = document.createElement('button');
    b.className = 'btn small';
    b.textContent = 'Equip';
    b.onclick = () => {
      equip(race, it);
      showArmory(shell, race);
    };
    const x = document.createElement('button');
    x.className = 'btn small danger';
    x.textContent = '✕';
    x.title = 'Discard';
    x.onclick = () => {
      if (!x.dataset.sure) {
        x.dataset.sure = '1';
        x.textContent = 'Discard?';
        return;
      }
      rs.stash = rs.stash.filter((s) => s.uid !== it.uid);
      persist();
      showArmory(shell, race);
    };
    d.append(b, x);
    st.append(d);
  }
  wrap.append(eq, st);
  inner.append(wrap);
}

// ================================================================ perks
export function showPerks(shell: Shell) {
  const inner = subScreen(shell, 'Rewards', null, null);
  const head = document.createElement('div');
  head.className = 'talent-info';
  head.innerHTML = `<div><b class="gold" style="font-size:22px">⬢ ${save.vespene}</b> vespene</div><div class="muted">Earned from bosses, cleared zones and time survived. Perks apply to every race.</div>`;
  inner.append(head);
  for (const p of PERKS) {
    const lv = perkLevel(p.id);
    const cost = p.costs[lv];
    const d = document.createElement('div');
    d.className = 'perk';
    d.innerHTML = `<div class="ic">${bwIcon(p.id, p.icon)}</div><div class="grow"><b>${p.name}</b> <span class="lv">${lv}/${p.costs.length}</span><div class="muted" style="font-size:14px">${p.desc}</div></div>`;
    const b = document.createElement('button');
    b.className = 'btn small';
    b.textContent = cost === undefined ? 'Maxed' : `⬢ ${cost}`;
    b.disabled = cost === undefined || save.vespene < cost;
    b.onclick = () => {
      if (cost === undefined || save.vespene < cost) return;
      save.vespene -= cost;
      save.perks[p.id] = lv + 1;
      persist();
      sfx('level');
      showPerks(shell);
    };
    d.append(b);
    inner.append(d);
  }
}

// ================================================================ settings
function settingsHtml(): HTMLDivElement {
  const d = document.createElement('div');
  d.className = 'settings';
  d.innerHTML = `
    <label>Volume <input type="range" min="0" max="1" step="0.05" value="${save.settings.volume}" data-k="volume"></label>
    <label>Damage numbers <input type="checkbox" ${save.settings.damageNumbers ? 'checked' : ''} data-k="damageNumbers"></label>
    <label>Screen shake <input type="checkbox" ${save.settings.screenShake ? 'checked' : ''} data-k="screenShake"></label>`;
  d.querySelectorAll<HTMLInputElement>('input').forEach((inp) => {
    inp.oninput = () => {
      const k = inp.dataset.k as 'volume' | 'damageNumbers' | 'screenShake';
      if (k === 'volume') {
        save.settings.volume = parseFloat(inp.value);
        setVolume(save.settings.volume);
      } else save.settings[k] = inp.checked;
      persist();
    };
  });
  return d;
}

export function showSettingsMenu(shell: Shell) {
  const inner = subScreen(shell, 'Settings', null, null);
  const box = document.createElement('div');
  box.className = 'panel modal';
  box.style.margin = '0 auto';
  box.append(settingsHtml());
  const row = document.createElement('div');
  row.className = 'row';
  const reset = document.createElement('button');
  reset.className = 'btn danger small';
  reset.textContent = 'Erase all progress';
  reset.onclick = () => {
    if (confirm('Erase all talents, gear, perks and unlocks?')) {
      resetSave();
      showMenu(shell);
    }
  };
  const exp = document.createElement('button');
  exp.className = 'btn small';
  exp.textContent = 'Export save';
  exp.onclick = () => {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([exportSave()], { type: 'application/json' }));
    a.download = `koprulu-survivors-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const imp = document.createElement('button');
  imp.className = 'btn small';
  imp.textContent = 'Import save';
  imp.onclick = () => {
    const f = document.createElement('input');
    f.type = 'file';
    f.accept = '.json,application/json';
    f.onchange = async () => {
      const file = f.files?.[0];
      if (!file) return;
      if (!confirm('Replace all current progress with this save file?')) return;
      if (importSave(await file.text())) showMenu(shell);
      else alert('That file is not a Koprulu Survivors save.');
    };
    f.click();
  };
  row.append(exp, imp, reset);
  box.append(row);
  inner.append(box);
}

// ================================================================ Brood War graphics
export function showGraphics(shell: Shell, message = '') {
  const inner = subScreen(shell, 'Optional: real StarCraft sprites', null, null);
  const st = bwStatus();
  const box = document.createElement('div');
  box.className = 'panel modal';
  box.style.margin = '0 auto';
  box.style.maxWidth = '720px';
  const needed = [...new Set(Object.values(BW_UNITS))];
  box.innerHTML = `
    <h2>Brood War sprites</h2>
    <p>${!st.loaded ? 'The game is using its built-in placeholder art.' : st.source === 'bundled' ? `<b class="gold">Using the ${st.count} Brood War unit sprites that come with the game.</b> You don't need to do anything here.` : `<b class="gold">Loaded ${st.count} unit sprites from your StarCraft files.</b>`}
    ${st.missing.length ? `<br><span class="muted">Not found: ${st.missing.join(', ')}</span>` : ''}</p>
    ${message ? `<p style="color:#ff8080">${message}</p>` : ''}
    <p>${st.source === 'bundled' ? 'Optionally, you can load' : 'You can play with'} the real StarCraft unit sprites from your own copy of the game. Nothing is uploaded: the files are read in your browser, and the ${needed.length} small sprite files the game uses are kept in this browser's storage so you only do this once.</p>
    <ol style="line-height:1.5">
      <li>Install <b>StarCraft: Remastered</b> from Battle.net (the free edition is enough).</li>
      <li>Press <b>Choose StarCraft folder</b> and pick the folder StarCraft is installed in (on Windows usually <code>C:\\Program Files (x86)\\StarCraft</code>, on Mac <code>/Applications/StarCraft</code>). Your browser will ask to confirm access to the folder.</li>
    </ol>
    <p class="muted" style="font-size:14px">Already extracted the SD <code>unit</code> and <code>tileset</code> folders, or have a Brood War 1.16 copy? Choose that folder or a .zip of it instead.</p>
    <div class="row">
      <label class="btn primary" style="cursor:pointer">Choose StarCraft folder<input type="file" webkitdirectory multiple hidden data-dir></label>
      <label class="btn" style="cursor:pointer">Extracted files or .zip<input type="file" multiple accept=".zip,.grp,.wpe" hidden data-files></label>
      ${st.source === 'local' ? '<button class="btn danger" data-clear>Forget my files</button>' : ''}
    </div>
    <details style="margin-top:14px"><summary class="muted">Files the game looks for</summary><div class="muted" style="font-size:13px;columns:2">${needed.map((p) => `<div>${p}</div>`).join('')}<div>tileset/platform.wpe (any tileset .wpe works)</div></div></details>`;
  const handle = async (files: File[]) => {
    if (!files.length) return;
    box.style.opacity = '0.6';
    try {
      const got = await ingestFiles(files);
      const res = buildSprites(got);
      if (!res.loaded) throw new Error('No unit sprites found. Make sure the unit folder is included.');
      await storeFiles(got);
      resetBwUi();
      applyBwChrome();
      sfx('level');
      showGraphics(shell);
    } catch (e) {
      showGraphics(shell, e instanceof Error ? e.message : String(e));
    }
  };
  box.querySelector<HTMLInputElement>('[data-dir]')!.onchange = (e) => handle(Array.from((e.target as HTMLInputElement).files ?? []));
  box.querySelector<HTMLInputElement>('[data-files]')!.onchange = (e) => handle(Array.from((e.target as HTMLInputElement).files ?? []));
  const clr = box.querySelector<HTMLButtonElement>('[data-clear]');
  if (clr) clr.onclick = async () => {
    await clearStoredFiles();
    resetBwUi();
    applyBwChrome();
    showGraphics(shell);
  };
  box.ondragover = (e) => {
    e.preventDefault();
    box.style.borderColor = 'var(--accent)';
  };
  box.ondragleave = () => (box.style.borderColor = '');
  box.ondrop = async (e) => {
    e.preventDefault();
    const items = Array.from(e.dataTransfer?.items ?? []);
    const files: File[] = [];
    const walk = async (entry: FileSystemEntry, path: string): Promise<void> => {
      if (entry.isFile) {
        const f = await new Promise<File>((res, rej) => (entry as FileSystemFileEntry).file(res, rej));
        files.push(new File([f], path + f.name));
      } else if (entry.isDirectory) {
        const reader = (entry as FileSystemDirectoryEntry).createReader();
        let batch: FileSystemEntry[];
        do {
          batch = await new Promise<FileSystemEntry[]>((res, rej) => reader.readEntries(res, rej));
          for (const c of batch) await walk(c, path + entry.name + '/');
        } while (batch.length);
      }
    };
    for (const it of items) {
      const entry = it.webkitGetAsEntry?.();
      if (entry) await walk(entry, '');
    }
    handle(files);
  };
  inner.append(box);
}

// ================================================================ in-run modals
function overlay(shell: Shell): HTMLDivElement {
  const o = document.createElement('div');
  o.className = 'overlay';
  shell.ui.append(o);
  return o;
}

export function showLevelUp(shell: Shell, g: Game, onDone: () => void) {
  const o = overlay(shell);
  const n = g.firstLevelUp && perkLevel('opening') ? 4 : 3;
  g.firstLevelUp = false;
  let cards: Card[] = dealCards(g, n);
  if (cards.some((c) => c.rarity === 4)) sfx('win'); // a legendary in the hand gets a fanfare
  let banishMode = false;
  let showStats = false;
  // free rerolls don't raise the price of the paid ones
  const rerollCost = () => 15 + Math.max(0, g.rerollsUsed - g.stats.rerolls) * 10;

  let picking = false;
  const pick = (c: Card) => {
    if (picking) return;
    if (banishMode) {
      if (g.banishesUsed >= g.stats.banishes || c.kind === 'fallback') return;
      g.banishesUsed++;
      g.banished.add(c.key);
      banishMode = false;
      // replace only the banished card, not the whole hand
      const fresh = dealCards(g, cards.length + 4).find((x) => !cards.some((y) => y.key === x.key));
      cards = cards.flatMap((x) => (x === c ? (fresh ? [fresh] : []) : [x]));
      sfx('select');
      render();
      return;
    }
    sfx('select');
    // the chosen card bursts for 0.28 s, then the choice applies
    picking = true;
    const row = o.querySelector('.cards');
    const i = cards.indexOf(c);
    row?.classList.add('picking');
    row?.children[i]?.classList.add('picked');
    const done = () => {
      applyCard(g, c);
      o.remove();
      hideTip();
      g.pendingLevels--;
      if (g.pendingLevels > 0) showLevelUp(shell, g, onDone);
      else onDone();
    };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) done();
    else setTimeout(done, 280);
  };
  const autoPick = () => {
    const order = { evolution: 5, upgrade: 4, spell: 3, mastery: 2, passive: 1, fallback: 0 } as const;
    let hand = cards;
    while (g.pendingLevels > 0) {
      const best = hand.slice().sort((a, b) => b.rarity - a.rarity || order[b.kind] - order[a.kind])[0];
      applyCard(g, best);
      g.pendingLevels--;
      hand = dealCards(g, 3);
    }
    sfx('select');
    o.remove();
    hideTip();
    onDone();
  };
  const reroll = () => {
    const free = g.stats.rerolls - g.rerollsUsed;
    if (free <= 0) {
      if (g.player.minerals < rerollCost()) return;
      g.player.minerals -= rerollCost();
    }
    g.rerollsUsed++;
    cards = dealCards(g, cards.length);
    sfx('select');
    render();
  };

  const render = () => {
    const free = Math.max(0, g.stats.rerolls - g.rerollsUsed);
    const bans = Math.max(0, g.stats.banishes - g.banishesUsed);
    o.innerHTML = '';
    const box = document.createElement('div');
    box.className = 'levelup' + (banishMode ? ' banish-mode' : '');
    box.innerHTML = `<h2>LEVEL ${g.player.level - g.pendingLevels + 1}</h2><div class="hint">${banishMode ? '<span style="color:#ff8080">Choose a card to banish for the rest of this run</span>' : 'Choose an upgrade'}</div>`;
    const row = document.createElement('div');
    row.className = 'cards';
    cards.forEach((c, i) => {
      const v = describeCard(g, c);
      const b = document.createElement('button');
      b.className = 'card' + (c.rarity >= 3 ? ` r${c.rarity}` : '');
      b.style.setProperty('--rc', RARITY_COLORS[c.rarity]);
      b.style.setProperty('--i', String(i));
      const pips = v.ranks ? `<div class="pips">${Array.from({ length: v.ranks[1] }, (_, r) => `<i class="${r < v.ranks![0] ? 'have' : r === v.ranks![0] ? 'next' : ''}"></i>`).join('')}</div>` : '';
      b.innerHTML = `<kbd class="key">${i + 1}</kbd><div class="rar">${RARITY_NAMES[c.rarity]}</div><div class="ic">${v.icon}</div><div class="nm">${v.title}</div><div class="ty">${v.type}</div>${pips}<ul>${v.lines.map((l) => `<li>${l}</li>`).join('')}</ul><div class="ds">${v.desc}</div>`;
      b.onclick = () => pick(c);
      // the hovered card leans toward the cursor
      b.onpointermove = (ev) => {
        const r = b.getBoundingClientRect();
        b.style.setProperty('--tx', ((ev.clientX - r.left) / r.width - 0.5).toFixed(3));
        b.style.setProperty('--ty', ((ev.clientY - r.top) / r.height - 0.5).toFixed(3));
      };
      b.onpointerleave = () => {
        b.style.removeProperty('--tx');
        b.style.removeProperty('--ty');
      };
      row.append(b);
    });
    box.append(row);
    const acts = document.createElement('div');
    acts.className = 'row';
    const rb = document.createElement('button');
    rb.className = 'btn small';
    rb.innerHTML = `<kbd>R</kbd> Reroll ${free > 0 ? `(${free} free)` : `(💎 ${rerollCost()})`}`;
    rb.disabled = free <= 0 && g.player.minerals < rerollCost();
    rb.onclick = reroll;
    acts.append(rb);
    if (g.stats.banishes > 0) {
      const bb = document.createElement('button');
      bb.className = 'btn small danger';
      bb.innerHTML = `<kbd>B</kbd> ${banishMode ? 'Cancel' : `Banish (${bans})`}`;
      bb.disabled = bans <= 0 && !banishMode;
      bb.onclick = () => {
        banishMode = !banishMode;
        render();
      };
      acts.append(bb);
    }
    if (g.pendingLevels > 2 && !banishMode) {
      // a magnet sweep can bank a dozen levels at once: let the player take the rest in one go
      const ab = document.createElement('button');
      ab.className = 'btn small';
      ab.innerHTML = `<kbd>A</kbd> Auto-pick ${g.pendingLevels}`;
      ab.title = 'Take the best card from a fresh hand for each remaining level';
      ab.onclick = autoPick;
      acts.append(ab);
    }
    const sb = document.createElement('button');
    sb.className = 'btn small';
    sb.innerHTML = `<kbd>Esc</kbd> ${showStats ? 'Hide stats' : 'Stats'}`;
    sb.onclick = () => {
      showStats = !showStats;
      render();
    };
    acts.append(sb);
    const build = document.createElement('div');
    build.className = 'build-list';
    build.innerHTML = g.spells.map((s) => `<span class="slot" title="${s.def.name}" style="width:38px;height:38px;font-size:20px">${spellIcon(s.def.id, s.def.icon)}<span class="rk">${s.rank === MAX_RANK ? 'MAX' : s.rank}</span></span>`).join('');
    box.append(acts, build);
    if (showStats) {
      const st = document.createElement('div');
      st.className = 'lvstats';
      st.innerHTML = `<table>${statRowsHtml(g)}</table>`;
      box.append(st);
    }
    o.append(box);
  };
  render();
  shell.setKeyHandler((c) => {
    if (c.startsWith('Digit')) {
      const i = parseInt(c.slice(5)) - 1;
      if (cards[i]) pick(cards[i]);
    } else if (c === 'KeyR') reroll();
    else if (c === 'KeyA' && g.pendingLevels > 2 && !banishMode) autoPick();
    else if (c === 'KeyB' && g.stats.banishes > g.banishesUsed) {
      banishMode = !banishMode;
      render();
    } else if (c === 'Escape' || c === 'Tab') {
      showStats = !showStats;
      render();
    }
  });
}

export function showGear(shell: Shell, g: Game, item: GearItem, onDone: () => void) {
  const o = overlay(shell);
  const race = g.race.id;
  const cur = save.races[race].gear[item.slot];
  const box = document.createElement('div');
  box.className = 'panel modal';
  box.innerHTML = `<h2 style="color:${RARITY_COLORS[item.rarity]}">Gear found!</h2><div class="item">${itemHtml(item)}</div>
    <div class="muted" style="margin-top:6px">Currently equipped:</div><div class="item">${cur ? itemHtml(cur) : '<div class="muted grow">Nothing</div>'}</div>
    <div class="muted" style="font-size:13px">${cur && gearScore(item) > gearScore(cur) ? 'Looks like an upgrade.' : ''} Equipped gear applies right away and is kept for future ${RACE_DEFS[race].name} runs.</div>
    ${save.races[race].stash.length >= STASH_MAX ? `<div style="font-size:13px;color:var(--gold)">Your stash is full (${STASH_MAX}). Stashing scraps your weakest stashed item.</div>` : ''}`;
  const row = document.createElement('div');
  row.className = 'row';
  const done = () => {
    o.remove();
    onDone();
  };
  const eb = document.createElement('button');
  eb.className = 'btn primary';
  eb.innerHTML = '<kbd>E</kbd> Equip';
  eb.onclick = () => {
    const lost = equip(race, item);
    if (lost.length) g.toastMsg(`Stash full: scrapped ${lost.map((x) => x.name).join(', ')}`, '#ffd34d');
    const hpBefore = g.stats.maxHp;
    g.recomputeStats();
    g.player.hp += Math.max(0, g.stats.maxHp - hpBefore);
    done();
  };
  const sb = document.createElement('button');
  sb.className = 'btn';
  sb.innerHTML = '<kbd>S</kbd> Stash';
  sb.onclick = () => {
    const lost = stashItem(race, item);
    if (lost.length) g.toastMsg(`Stash full: scrapped ${lost.map((x) => x.name).join(', ')}`, '#ffd34d');
    done();
  };
  row.append(eb, sb);
  box.append(row);
  o.append(box);
  shell.setKeyHandler((c) => {
    if (c === 'KeyE' || c === 'Enter') eb.click();
    else if (c === 'KeyS' || c === 'Escape') sb.click();
  });
}

/** The hero's current stats as table rows (pause menu and level-up screen). */
function statRowsHtml(g: Game): string {
  const s = g.stats;
  const keyStats: StatKey[] = ['maxHp', 'armor', 'hpRegen', 'maxShield', 'damage', 'haste', 'area', 'critChance', 'critMult', 'moveSpeed', 'pickupRange', 'luck', 'dodge'];
  return keyStats
    .filter((k) => k !== 'maxShield' || s.maxShield > 0)
    .map((k) => {
      const [label, kind] = STAT_LABELS[k];
      const v = s[k];
      const txt = kind === 'pct' ? (k === 'damage' || k === 'area' ? `${Math.round(v * 100)}%` : `${Math.round(v * 1000) / 10}%`) : `${Math.round(v * 10) / 10}`;
      return `<tr><td>${label}</td><td>${txt}</td></tr>`;
    })
    .join('');
}

export function showPause(shell: Shell, g: Game, onResume: () => void) {
  const o = overlay(shell);
  const box = document.createElement('div');
  box.className = 'panel modal';
  const statRows = statRowsHtml(g);
  box.innerHTML = `<h2>Paused</h2>
    <div class="build-list">${g.spells.map((sp) => `<span class="named"><span class="slot" title="${sp.def.name}">${spellIcon(sp.def.id, sp.def.icon)}<span class="rk">${sp.rank}</span></span><small>${sp.def.name}</small></span>`).join('')}</div>
    <div class="results"><table>${statRows}</table></div>`;
  box.append(settingsHtml());
  const row = document.createElement('div');
  row.className = 'row';
  const rb = document.createElement('button');
  rb.className = 'btn primary';
  rb.textContent = 'Resume';
  const done = () => {
    o.remove();
    onResume();
  };
  rb.onclick = done;
  const qb = document.createElement('button');
  qb.className = 'btn danger';
  qb.textContent = 'Retreat (end run)';
  let sure = false;
  qb.onclick = () => {
    if (!sure) {
      sure = true;
      qb.textContent = 'Click again to retreat';
      return;
    }
    o.remove();
    g.paused = false;
    g.end(false);
  };
  row.append(rb, qb);
  box.append(row);
  o.append(box);
  shell.setKeyHandler((c) => {
    if (c === 'Escape' || c === 'KeyP') done();
  });
}

export function showVictory(shell: Shell, g: Game, onContinue: () => void) {
  const o = overlay(shell);
  const box = document.createElement('div');
  box.className = 'panel modal';
  box.style.textAlign = 'center';
  box.innerHTML = `<h2 class="gold">${g.zone.name} cleared!</h2><p>${g.bosses.some((b) => b.boss?.final) ? 'You held out until the bell.' : `${g.zone.final.name} has fallen.`} Extract now with your rewards, or stay for endless mode where bosses return every 2:15.</p>`;
  const row = document.createElement('div');
  row.className = 'row';
  const ex = document.createElement('button');
  ex.className = 'btn primary';
  ex.textContent = 'Extract';
  ex.onclick = () => {
    o.remove();
    g.paused = false;
    g.end(true);
  };
  const cont = document.createElement('button');
  cont.className = 'btn';
  cont.textContent = 'Endless mode';
  cont.onclick = () => {
    o.remove();
    g.endless = true;
    onContinue();
  };
  row.append(ex, cont);
  box.append(row);
  o.append(box);
  shell.setKeyHandler(null);
}

export function showHistory(shell: Shell) {
  const inner = subScreen(shell, 'Records', null, null);
  const best = document.createElement('table');
  best.className = 'records';
  best.innerHTML = `<tr><th></th>${RACES.map((r) => `<th>${RACE_DEFS[r].name}</th>`).join('')}</tr>
    <tr><td>Runs / wins</td>${RACES.map((r) => `<td>${save.races[r].runs} / ${save.races[r].wins}</td>`).join('')}</tr>
    ${ZONES.map((z) => `<tr><td>${z.name}</td>${RACES.map((r) => {
      const t = save.races[r].bestTimes[z.id];
      const won = (save.clearedBy[z.id] ?? []).includes(r);
      return `<td>${t ? `${won ? '✔ ' : ''}${fmtTime(t)}` : '<span class="muted">-</span>'}</td>`;
    }).join('')}</tr>`).join('')}`;
  const title = document.createElement('div');
  title.className = 'section-title';
  title.style.margin = '16px 0 6px';
  title.textContent = 'Recent runs';
  const list = document.createElement('table');
  list.className = 'records';
  list.innerHTML = save.history.length
    ? `<tr><th>When</th><th>Hero</th><th>Zone</th><th>Result</th><th>Time</th><th>Level</th><th>Kills</th></tr>` +
      save.history.map((h) => {
        const mode = [h.daily ? 'Daily' : '', h.difficulty ? DIFFICULTIES[h.difficulty]?.name ?? '' : '', h.mutators.length ? `${h.mutators.length} mut.` : ''].filter(Boolean).join(' · ');
        return `<tr><td>${new Date(h.at).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td><td>${HERO_BY_ID[h.hero]?.name ?? RACE_DEFS[h.race].name}</td><td>${ZONE_BY_ID[h.zone]?.name ?? h.zone}${mode ? ` <span class="muted">${mode}</span>` : ''}</td><td>${h.won ? '<b class="gold">Victory</b>' : '<span class="muted">Defeat</span>'}</td><td>${fmtTime(h.time)}</td><td>${h.level}</td><td>${h.kills.toLocaleString()}</td></tr>`;
      }).join('')
    : '<tr><td class="muted">No runs yet.</td></tr>';
  inner.append(best, title, list);
}

export function showAchievements(shell: Shell) {
  const inner = subScreen(shell, 'Achievements', null, null);
  const got = Object.keys(save.achievements).length;
  const head = document.createElement('div');
  head.className = 'muted';
  head.style.margin = '0 0 10px';
  head.textContent = `${got} of ${ACHIEVEMENTS.length} earned. Achievements award vespene, and some unlock new heroes.`;
  const list = document.createElement('div');
  list.className = 'achievements';
  for (const a of ACHIEVEMENTS) {
    const at = save.achievements[a.id];
    const hero = HEROES.find((h) => h.unlock === a.id);
    const el = document.createElement('div');
    el.className = 'ach' + (at ? ' got' : '');
    el.innerHTML = `<div class="ach-icon">${a.icon}</div><div><b>${a.name}</b><p>${a.desc}</p><span class="gold">⬢ ${a.vespene}</span>${hero ? ` · <span class="accent">Unlocks ${hero.name}</span>` : ''}${at ? ` · <span class="muted">${new Date(at).toLocaleDateString()}</span>` : ''}</div>`;
    list.append(el);
  }
  inner.append(head, list);
}

export function showResults(shell: Shell, r: RunResult, rw: Rewards) {
  const o = overlay(shell);
  const box = document.createElement('div');
  box.className = 'panel modal results';
  const won = r.won;
  const maxDmg = Math.max(1, ...r.damage.map((d) => d.dmg));
  const [have, need] = nextPointProgress(r.race);
  box.innerHTML = `<h2 style="color:${won ? 'var(--gold)' : 'var(--danger)'}">${won ? 'Victory' : 'Defeated'}</h2>
    <div class="muted">${RACE_DEFS[r.race].name} · ${r.zone.name}${r.difficulty.id ? ` · ${r.difficulty.name}` : ''}${r.mutators.length ? ` · ${r.mutators.length} mutator${r.mutators.length > 1 ? 's' : ''}` : ''}${r.endless ? ' · Endless' : ''}</div>
    ${!won && r.killedBy ? `<div style="margin-top:4px">Killed by <b style="color:var(--danger)">${r.killedBy}</b></div>` : ''}
    <table style="margin:10px 0"><tr><td>Time survived</td><td>${fmtTime(r.time)}</td></tr><tr><td>Level</td><td>${r.level}</td></tr><tr><td>Kills</td><td>${r.kills}</td></tr><tr><td>Bosses</td><td>${r.bosses}</td></tr></table>
    <div class="section-title" style="margin:10px 0 4px">Damage</div>
    ${r.damage.filter((d) => d.dmg > 0).map((d) => `<div class="dmgrow"><span style="width:150px">${d.icon} ${d.name}</span><div class="bar"><i style="width:${(d.dmg / maxDmg) * 100}%"></i></div><span style="width:60px;text-align:right">${Math.round(d.dmg).toLocaleString()}</span></div>`).join('')}
    <div class="section-title" style="margin:14px 0 4px">Talent experience</div>
    <table>${rw.lines.map(([k, v]) => `<tr><td>${k}</td><td>+${v}</td></tr>`).join('')}<tr class="total"><td>Total</td><td>+${rw.total}</td></tr></table>
    <div style="margin-top:8px">${rw.pointsAfter > rw.pointsBefore ? `<b class="gold">+${rw.pointsAfter - rw.pointsBefore} talent point${rw.pointsAfter - rw.pointsBefore > 1 ? 's' : ''}!</b> ` : ''}<span class="muted">Next point ${Math.floor(have)}/${need}</span> · <span class="gold">⬢ +${rw.vespene} vespene</span></div>
    ${rw.unlocked ? `<div class="gold" style="margin-top:8px">New zone unlocked: ${rw.unlocked}</div>` : ''}
    ${rw.daily ? `<div class="gold" style="margin-top:8px">Daily challenge${rw.daily.best ? ': new best today!' : ''}${rw.daily.first ? ' · ⬢ +5 first try' : ''}</div>` : ''}
    ${rw.achievements.map((a) => {
      const hero = HEROES.find((h) => h.unlock === a.id);
      return `<div class="ach-new">${a.icon} Achievement: <b>${a.name}</b> <span class="gold">⬢ +${a.vespene}</span>${hero ? ` · <b class="accent">${hero.name} unlocked!</b>` : ''}</div>`;
    }).join('')}`;
  const row = document.createElement('div');
  row.className = 'row';
  const again = document.createElement('button');
  again.className = 'btn primary';
  again.textContent = 'Deploy again';
  again.onclick = () => shell.startRun(r.race, r.zone.id, r.daily ? dailyFor(r.daily) : undefined);
  const tal = document.createElement('button');
  tal.className = 'btn';
  tal.textContent = 'Talents';
  tal.onclick = () => {
    shell.quitRun();
    showTalents(shell, r.race);
  };
  const menu = document.createElement('button');
  menu.className = 'btn';
  menu.textContent = 'Main menu';
  menu.onclick = () => {
    shell.quitRun();
    showMenu(shell);
  };
  row.append(again, tal, menu);
  box.append(row);
  o.append(box);
  shell.setKeyHandler((c) => {
    if (c === 'Enter') again.click();
  });
}
