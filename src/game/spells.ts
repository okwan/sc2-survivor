import { Sprite } from 'pixi.js';
import { bwSprite, orientBw } from '../bw/assets';
import { fx, minionTexture } from '../render/textures';
import { sfx, wc3HasSound, wc3Sfx, type Sfx } from './audio';
import { WC3_HERO_ATTACK_SOUNDS, WC3_SPELL_SOUNDS } from '../wc3/sounds';
import type { Enemy, SpellInstance } from './entities';
import type { Game } from './game';
import { hyp } from './math';

const TAU = Math.PI * 2;

function angleDiff(a: number, b: number): number {
  let d = a - b;
  while (d > Math.PI) d -= TAU;
  while (d < -Math.PI) d += TAU;
  return d;
}

/** A cast's Warcraft III sound; the hero's starting spell is their attack, voiced as their swing starts (game.ts). */
function castSfx(g: Game, id: string, fallback?: Sfx) {
  if (id === g.hero.startSpell && wc3HasSound(WC3_HERO_ATTACK_SOUNDS[g.hero.art])) return;
  if (!wc3Sfx(WC3_SPELL_SOUNDS[id]) && fallback) sfx(fallback);
}

/** Called when a spell's cooldown elapses. Returns false if it had nothing to do (retry soon). */
export function castSpell(g: Game, s: SpellInstance): boolean {
  const st = s.stats;
  const p = g.player;
  const def = s.def;
  switch (def.kind) {
    case 'bolt': {
      const range = st.speed * st.duration;
      const targets = g.preferBoss(g.nearestEnemies(p.x, p.y, st.count, range), range);
      if (!targets.length) return false;
      for (let i = 0; i < st.count; i++) {
        const t = targets[i % targets.length];
        let a = Math.atan2(t.y - p.y, t.x - p.x);
        if (i >= targets.length) a += (Math.random() - 0.5) * 0.5;
        g.spawnProjectile(p.x, p.y, a, st.speed, st.damage, st.area, st.pierce, st.duration, s.slot, def.color, def.tags);
      }
      castSfx(g, def.id, 'shoot');
      return true;
    }
    case 'lob': {
      const targets = g.randomEnemiesNear(p.x, p.y, 520, st.count);
      if (!targets.length) return false;
      for (let i = 0; i < st.count; i++) {
        const t = targets[i % targets.length];
        const jitter = i >= targets.length ? 60 : 0;
        g.addLob(p.x, p.y, t.x + (Math.random() - 0.5) * jitter, t.y + (Math.random() - 0.5) * jitter, st.duration, st.damage, st.area, s.slot, def.color, def.tags);
      }
      castSfx(g, def.id);
      return true;
    }
    case 'cone': {
      const reach = st.area;
      // melee swings at a boss in reach first, so it isn't screened by its adds
      const t = g.bosses.find((b) => b.hp > 0 && hyp(b.x - p.x, b.y - p.y) < reach + b.radius) ?? g.nearestEnemy(p.x, p.y, reach + 40);
      if (!t) return false;
      const isBlade = def.id === 'blades';
      const ring = s.evo?.effect === 'ring';
      const half = ring ? Math.PI : isBlade ? 1.05 : 0.6;
      const dir = Math.atan2(t.y - p.y, t.x - p.x);
      p.facing = dir;
      const hits = (mult: number) =>
        g.forEnemiesInRadius(p.x, p.y, reach, (e) => {
          const a = Math.atan2(e.y - p.y, e.x - p.x);
          const dist = hyp(e.x - p.x, e.y - p.y);
          if (dist < e.radius + 20 || Math.abs(angleDiff(a, dir)) < half) {
            g.hit(e, st.damage * mult, s.slot, { kx: Math.cos(a) * (isBlade ? 140 : 40), ky: Math.sin(a) * (isBlade ? 140 : 40), tags: def.tags });
          }
        });
      hits(1);
      if (isBlade && g.flags.has('darkTemplar')) hits(1);
      const tex = isBlade ? fx.arc() : fx.wedge();
      const scale = isBlade ? (reach * 1.15) / 210 : reach / 256;
      // evolved cones fire in all directions
      const arms = ring ? (isBlade ? 3 : 5) : 1;
      for (let k = 0; k < arms; k++) {
        const d2 = dir + (k / arms) * TAU;
        g.addFx(tex, p.x, p.y, def.color, scale * 0.85, scale, isBlade ? 0.18 : 0.28, 0.9, d2, isBlade ? 0.5 : 0, isBlade ? 0 : 0.5);
      }
      if (!isBlade) for (let i = 0; i < 4; i++) {
        const a = dir + (Math.random() - 0.5) * 1.0;
        const d = Math.random() * reach * 0.8;
        g.addFx(fx.soft(), p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, i % 2 ? 0xffd040 : 0xff5010, 0.2, 0.45, 0.3, 0.8);
      }
      castSfx(g, def.id, isBlade ? 'hit' : 'shoot');
      return true;
    }
    case 'aura': {
      let any = false;
      g.forEnemiesInRadius(p.x, p.y, st.area, (e) => {
        any = true;
        g.hit(e, st.damage, s.slot, { tags: def.tags, quiet: true });
        e.slow = Math.max(e.slow, 0.2);
      });
      return any || true;
    }
    case 'mine': {
      // spread around the hero rather than all on the path behind them
      const a0 = Math.random() * TAU;
      for (let i = 0; i < st.count; i++) {
        const a = a0 + (i / st.count) * TAU + (Math.random() - 0.5) * 0.6;
        const d = 60 + Math.random() * 140;
        g.addMine(p.x + Math.cos(a) * d, p.y + Math.sin(a) * d, st.damage, st.area, st.duration, s.slot);
      }
      return true;
    }
    case 'field': {
      const targets = g.denseTargets(p.x, p.y, 560, st.count);
      if (!targets.length) return false;
      for (const t of targets) g.addField(t.x, t.y, st.area, st.damage, st.duration, s.slot, def.color, def.id === 'acidpool' ? 0.35 : 0.15, def.tags);
      castSfx(g, def.id, def.id === 'storm' ? 'zap' : undefined);
      return true;
    }
    case 'chain': {
      const used = new Set<number>();
      let fired = false;
      for (let c = 0; c < st.count; c++) {
        let cur: Enemy | null = g.nearestEnemy(p.x, p.y, 480, used);
        if (!cur) break;
        fired = true;
        const pts = [p.x, p.y];
        let dmg = st.damage;
        for (let j = 0; j <= st.pierce && cur; j++) {
          used.add(cur.uid);
          pts.push(cur.x, cur.y);
          g.hit(cur, dmg, s.slot, { tags: def.tags });
          dmg *= 0.92;
          cur = g.nearestEnemy(cur.x, cur.y, st.area, used);
        }
        g.addChain(pts, def.color);
      }
      if (fired) castSfx(g, def.id, 'zap');
      return fired;
    }
    case 'beam': {
      const len = 900;
      const targets = g.preferBoss(g.nearestEnemies(p.x, p.y, st.count, len * 0.8), len * 0.8);
      if (!targets.length) return false;
      for (let i = 0; i < st.count; i++) {
        const t = targets[i % targets.length];
        let a = Math.atan2(t.y - p.y, t.x - p.x);
        if (i >= targets.length) a += (i % 2 ? 1 : -1) * 0.3;
        const dx = Math.cos(a);
        const dy = Math.sin(a);
        g.forEnemiesInRadius(p.x + dx * len * 0.5, p.y + dy * len * 0.5, len * 0.5 + 10, (e) => {
          const rx = e.x - p.x;
          const ry = e.y - p.y;
          const along = rx * dx + ry * dy;
          if (along < 0 || along > len) return;
          const perp = Math.abs(rx * dy - ry * dx);
          if (perp < st.area + e.radius) g.hit(e, st.damage, s.slot, { kx: dx * 120, ky: dy * 120, tags: def.tags });
        });
        const spr = g.addFx(fx.beam(), p.x + dx * len * 0.5, p.y + dy * len * 0.5, def.color, 1, 1, st.duration, 1, a);
        spr.sprite.scale.set(len / 64, (st.area * 2.4) / 32);
        spr.s0 = spr.s1 = -1; // keep manual scale
        g.addFx(fx.soft(), p.x + dx * 20, p.y + dy * 20, 0xffffff, 0.6, 0.2, 0.2, 1);
      }
      g.shake(4);
      castSfx(g, def.id, 'zap');
      return true;
    }
    case 'nova': {
      g.forEnemiesInRadius(p.x, p.y, st.area, (e) => {
        const a = Math.atan2(e.y - p.y, e.x - p.x);
        g.hit(e, st.damage, s.slot, { kx: Math.cos(a) * 420, ky: Math.sin(a) * 420, tags: def.tags });
        e.slow = Math.max(e.slow, 1.2); // a short stun: slow is capped at 70% and wears off over ~0.6 s
      });
      g.addFx(fx.ring(), p.x, p.y, def.color, 0.1, (st.area * 2) / 224, 0.35, 1);
      g.addFx(fx.soft(), p.x, p.y, def.color, 0.5, (st.area * 2) / 128, 0.3, 0.5);
      castSfx(g, def.id, 'explode');
      return true;
    }
    case 'barrier': {
      p.barrier = Math.max(p.barrier, st.damage);
      p.barrierTime = st.duration;
      castSfx(g, def.id);
      return true;
    }
    case 'summon':
    case 'orbit':
      return true; // persistent, handled in updatePersistent
  }
  return true;
}

/** Per-frame update for spells that exist continuously (orbits, auras, summons). */
export function updatePersistent(g: Game, s: SpellInstance, dt: number) {
  const st = s.stats;
  const p = g.player;
  const def = s.def;
  if (def.kind === 'orbit') {
    const tex = minionTexture(def.id === 'scourge' ? 'scourge' : 'interceptor');
    while (s.orbiters.length < st.count) {
      const spr = new Sprite(tex);
      spr.anchor.set(0.5);
      spr.scale.set(1.3);
      g.layers.top.addChild(spr);
      s.orbiters.push(spr);
    }
    while (s.orbiters.length > st.count) s.orbiters.pop()!.destroy();
    s.angle += st.speed * dt;
    const n = s.orbiters.length;
    const hitCd = Math.max(0.15, st.cooldown);
    const now = g.time;
    for (let i = 0; i < n; i++) {
      const a = s.angle + (i / n) * TAU;
      const wob = def.id === 'interceptors' ? Math.sin(now * 3 + i) * 14 : 0;
      const x = p.x + Math.cos(a) * (st.area + wob);
      const y = p.y + Math.sin(a) * (st.area + wob);
      const spr = s.orbiters[i];
      spr.position.set(x, y);
      const bw = bwSprite(def.id === 'scourge' ? 'minion:scourge' : 'minion:interceptor');
      if (bw) orientBw(spr, bw, a + Math.PI / 2, 24 / bw.size);
      else spr.rotation = a + Math.PI / 2;
      g.forEnemiesInRadius(x, y, 22, (e) => {
        // the swarm shares one timer per enemy, so each orbiter adds a hit per cooldown
        if (now - e.hitStamp[s.slot] < hitCd / n) return;
        e.hitStamp[s.slot] = now;
        g.hit(e, st.damage, s.slot, { kx: Math.cos(a) * 160, ky: Math.sin(a) * 160, tags: def.tags });
      });
    }
  } else if (def.kind === 'aura') {
    if (!s.auraSprite) {
      s.auraSprite = new Sprite(fx.disc());
      s.auraSprite.anchor.set(0.5);
      s.auraSprite.tint = def.color;
      g.layers.ground.addChild(s.auraSprite);
    }
    const spr = s.auraSprite;
    spr.position.set(p.x, p.y);
    const pulse = 1 + Math.sin(g.time * 4) * 0.03;
    spr.scale.set(((st.area * 2) / 128) * pulse);
    spr.alpha = 0.32;
    spr.rotation += dt * 0.5;
  } else if (def.kind === 'summon') {
    const kind = def.id === 'turret' ? 'turret' : 'brood';
    // only the permanent summons count; temporary broodlings (Endless Swarm) are extra
    const mine = g.minions.filter((m) => m.slot === s.slot && m.life === Infinity);
    if (mine.length < st.count) {
      if (g.time >= s.nextSpawn) {
        g.addMinion(kind, s.slot, p.x + (Math.random() - 0.5) * 60, p.y + (Math.random() - 0.5) * 60, Infinity, st.damage);
        s.nextSpawn = g.time + (mine.length === 0 ? 0.2 : Math.max(0.3, st.duration / 3));
      }
    } else if (mine.length > st.count) {
      g.removeMinion(mine[0]);
    }
    for (const m of mine) m.damage = st.damage;
  }
}

/** Minion AI: broodlings chase and bite, turrets trail the hero and shoot. */
export function updateMinions(g: Game, dt: number) {
  const p = g.player;
  for (let i = g.minions.length - 1; i >= 0; i--) {
    const m = g.minions[i];
    m.life -= dt;
    if (m.life <= 0) {
      g.removeMinion(m);
      continue;
    }
    const s = m.slot >= 0 ? g.spellBySlot(m.slot) : null;
    const st = s?.stats;
    m.atk -= dt;
    if (m.kind === 'probe') continue; // handled by game pickups
    if (m.kind === 'turret') {
      const tx = p.x + m.ox;
      const ty = p.y + m.oy;
      m.x += (tx - m.x) * Math.min(1, dt * 3);
      m.y += (ty - m.y) * Math.min(1, dt * 3);
      const range = st?.area ?? 300;
      if (m.atk <= 0) {
        const t = g.nearestEnemy(m.x, m.y, range);
        if (t) {
          const a = Math.atan2(t.y - m.y, t.x - m.x);
          m.angle = a;
          g.spawnProjectile(m.x, m.y, a, st?.speed ?? 600, m.damage, 5, 0, 0.8, m.slot, 0xff6060, ['tech']);
          m.atk = st?.cooldown ?? 0.7;
        }
      }
    } else {
      // broodling
      if (!m.target || m.target.hp <= 0 || !m.target.sprite.parent) m.target = g.nearestEnemy(m.x, m.y, st?.area ?? 260);
      const speed = st?.speed ?? 300;
      let tx: number;
      let ty: number;
      if (m.target) {
        tx = m.target.x;
        ty = m.target.y;
      } else {
        tx = p.x + m.ox;
        ty = p.y + m.oy;
      }
      const dx = tx - m.x;
      const dy = ty - m.y;
      const d = hyp(dx, dy) || 1;
      if (d > 6) {
        const v = Math.min(d, speed * dt * (m.target ? 1 : d > 200 ? 1.6 : 0.8));
        m.x += (dx / d) * v;
        m.y += (dy / d) * v;
        m.angle = Math.atan2(dy, dx);
      }
      if (m.target && d < m.target.radius + 10 && m.atk <= 0) {
        g.hit(m.target, m.damage, Math.max(0, m.slot), { tags: ['bio'] });
        m.atk = st?.cooldown ?? 0.5;
      }
      // leash
      if (hyp(m.x - p.x, m.y - p.y) > 600) {
        m.target = null;
      }
    }
    m.sprite.position.set(m.x, m.y);
  }
}
