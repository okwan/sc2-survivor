import { Application, Sprite } from 'pixi.js';
import { ZONE_BY_ID, ZONES } from './data/enemies';
import type { RaceId } from './data/types';
import { setVolume, unlockAudio } from './game/audio';
import { Game } from './game/game';
import { Input } from './game/input';
import { grantRewards } from './meta/rewards';
import { currentHero, save } from './meta/save';
import { heroTexture, initTextures } from './render/textures';
import { bwSprite, ensureZoneFiles, initBw, prefetchTerrain } from './bw/assets';
import { applyBwChrome } from './bw/ui';
import { Hud } from './ui/hud';
import { showCacheShop, showGear, showLevelUp, showMenu, showPause, showResults, showVictory, type Shell } from './ui/screens';
import './ui/style.css';

async function boot() {
  const app = new Application();
  await app.init({
    resizeTo: window,
    background: 0x05070c,
    antialias: false,
    resolution: Math.min(window.devicePixelRatio || 1, 2),
    autoDensity: true,
    powerPreference: 'high-performance',
    preference: 'webgl',
    roundPixels: true, // Brood War pixel art shimmers when sprites land between pixels
  });
  document.getElementById('app')!.appendChild(app.canvas);
  initTextures(app.renderer);
  await initBw();
  applyBwChrome();
  prefetchTerrain(ZONES.map((z) => z.id));
  setVolume(save.settings.volume);

  const input = new Input(app.canvas);
  const ui = document.getElementById('ui')!;
  let game: Game | null = null;
  let hud: Hud | null = null;
  let keyHandler: ((code: string) => void) | null = null;
  const previews = new Map<RaceId, HTMLCanvasElement>();

  const resume = () => {
    shell.setKeyHandler(runKeys);
    if (game && !game.over) game.paused = false;
  };

  // In-run dialogs (level-up, gear, victory, pause) open one at a time: when two are raised on the
  // same frame the second waits, and the game only resumes after the last one closes.
  let dialogs: ((done: () => void) => void)[] = [];
  let dialogOpen = false;
  const nextDialog = () => {
    const show = dialogs.shift();
    if (!show) {
      dialogOpen = false;
      resume();
      return;
    }
    dialogOpen = true;
    if (game) game.paused = true;
    show(nextDialog);
  };
  const openDialog = (show: (done: () => void) => void) => {
    if (game) game.paused = true;
    dialogs.push(show);
    if (!dialogOpen) nextDialog();
  };

  const runKeys = (code: string) => {
    if (!game || game.over) return;
    if ((code === 'Escape' || code === 'KeyP') && !game.paused) pause();
  };

  const pause = () => {
    if (!game || game.paused || game.over) return;
    const g = game;
    openDialog((done) => showPause(shell, g, done));
  };

  const shell: Shell = {
    ui,
    setKeyHandler(fn) {
      keyHandler = fn;
    },
    heroPreview(race) {
      const bw = bwSprite(currentHero(race).sprite) ?? bwSprite(`hero:${race}`);
      let cv = bw ? undefined : previews.get(race);
      if (!cv) {
        try {
          const s = new Sprite(bw ? bw.frames[8] : heroTexture(race));
          s.scale.set(bw ? 64 / bw.frames[8].width * 0.9 : 2.2);
          cv = app.renderer.extract.canvas(s) as HTMLCanvasElement;
          s.destroy();
          if (!bw) previews.set(race, cv);
        } catch {
          return null;
        }
      }
      const copy = document.createElement('canvas');
      copy.width = cv.width;
      copy.height = cv.height;
      copy.style.width = '64px';
      if (!bw) copy.style.transform = 'rotate(-90deg)';
      copy.style.imageRendering = bw ? 'pixelated' : '';
      copy.getContext('2d')!.drawImage(cv, 0, 0);
      return copy;
    },
    async startRun(race, zoneId) {
      unlockAudio();
      shell.quitRun();
      ui.innerHTML = '<div class="loading">Warping in...</div>';
      const zone = ZONE_BY_ID[zoneId] ?? ZONE_BY_ID.marsara;
      await ensureZoneFiles(zone.id);
      ui.innerHTML = '';
      dialogs = [];
      dialogOpen = false;
      const g: Game = new Game(app, input, race, zone, {
        levelUp: () => openDialog((done) => showLevelUp(shell, g, done)),
        gear: (item) => openDialog((done) => showGear(shell, g, item, done)),
        bossSpawned: (name, title) => hud?.bossBanner(name, title),
        victory: () => openDialog((done) => showVictory(shell, g, done)),
        ended: (r) => {
          const rw = grantRewards(r);
          setTimeout(() => showResults(shell, r, rw), r.won ? 300 : 900);
        },
        toast: (msg, color) => hud?.toast(msg, color),
        cacheShop: (offers, gearCost, buy) => openDialog((done) => showCacheShop(shell, g, offers, gearCost, buy, done)),
      });
      game = g;
      app.stage.addChild(g.root);
      hud = new Hud(g, input.isTouch);
      ui.append(hud.root);
      hud.pauseBtn.onclick = pause;
      if (hud.dashBtn) hud.dashBtn.onpointerdown = () => (input.dashPressed = true);
      shell.setKeyHandler(runKeys);
      const title = g.mapGround?.map.title;
      if (title) hud.toast(title, '#9cf');
    },
    quitRun() {
      if (game) {
        app.stage.removeChild(game.root);
        game.destroy();
        game = null;
      }
      hud?.destroy();
      hud = null;
      ui.innerHTML = '';
    },
  };

  input.onKey = (code) => keyHandler?.(code);
  window.addEventListener('blur', () => pause());
  document.addEventListener('visibilitychange', () => document.hidden && pause());
  window.addEventListener('pointerdown', unlockAudio, { once: true });

  // On a slow GPU, step the render resolution down (2 -> 1.5 -> 1) rather than drop frames for the whole run.
  let slowMs = 0;
  let avgMs = 16;
  app.ticker.add((t) => {
    if (game) {
      game.update(t.deltaMS);
      hud?.update();
      if (!game.paused && !game.over && t.deltaMS < 100) {
        avgMs = avgMs * 0.95 + t.deltaMS * 0.05;
        slowMs = avgMs > 20 ? slowMs + t.deltaMS : 0;
        const res = app.renderer.resolution;
        if (slowMs > 4000 && res > 1) {
          slowMs = 0;
          avgMs = 16;
          app.renderer.resize(app.screen.width, app.screen.height, Math.max(1, res - 0.5));
        }
      }
    }
  });

  // expose for automated smoke tests
  (window as unknown as { __ks: unknown }).__ks = { shell, get game() { return game; } };
  showMenu(shell);
}

void boot();
