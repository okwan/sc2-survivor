import { Application, Sprite } from 'pixi.js';
import { ZONE_BY_ID } from './data/enemies';
import type { RaceId } from './data/types';
import { setVolume, unlockAudio } from './game/audio';
import { Game } from './game/game';
import { Input } from './game/input';
import { grantRewards } from './meta/rewards';
import { save } from './meta/save';
import { heroTexture, initTextures } from './render/textures';
import { Hud } from './ui/hud';
import { showGear, showLevelUp, showMenu, showPause, showResults, showVictory, type Shell } from './ui/screens';
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
  });
  document.getElementById('app')!.appendChild(app.canvas);
  initTextures(app.renderer);
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

  const runKeys = (code: string) => {
    if (!game || game.over) return;
    if ((code === 'Escape' || code === 'KeyP') && !game.paused) pause();
  };

  const pause = () => {
    if (!game || game.paused || game.over) return;
    game.paused = true;
    showPause(shell, game, resume);
  };

  const shell: Shell = {
    ui,
    setKeyHandler(fn) {
      keyHandler = fn;
    },
    heroPreview(race) {
      let cv = previews.get(race);
      if (!cv) {
        try {
          const s = new Sprite(heroTexture(race));
          s.scale.set(2.2);
          cv = app.renderer.extract.canvas(s) as HTMLCanvasElement;
          s.destroy();
          previews.set(race, cv);
        } catch {
          return null;
        }
      }
      const copy = document.createElement('canvas');
      copy.width = cv.width;
      copy.height = cv.height;
      copy.style.width = '64px';
      copy.style.transform = 'rotate(-90deg)';
      copy.getContext('2d')!.drawImage(cv, 0, 0);
      return copy;
    },
    startRun(race, zoneId) {
      unlockAudio();
      shell.quitRun();
      ui.innerHTML = '';
      const zone = ZONE_BY_ID[zoneId] ?? ZONE_BY_ID.marsara;
      const g: Game = new Game(app, input, race, zone, {
        levelUp: () => showLevelUp(shell, g, resume),
        gear: (item) => showGear(shell, g, item, resume),
        bossSpawned: (name, title) => hud?.bossBanner(name, title),
        victory: () => {
          g.paused = true;
          showVictory(shell, g, resume);
        },
        ended: (r) => {
          const rw = grantRewards(r);
          setTimeout(() => showResults(shell, r, rw), r.won ? 300 : 900);
        },
        toast: (msg, color) => hud?.toast(msg, color),
      });
      game = g;
      app.stage.addChild(g.root);
      hud = new Hud(g, input.isTouch);
      ui.append(hud.root);
      hud.pauseBtn.onclick = pause;
      if (hud.dashBtn) hud.dashBtn.onpointerdown = () => (input.dashPressed = true);
      shell.setKeyHandler(runKeys);
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

  app.ticker.add((t) => {
    if (game) {
      game.update(t.deltaMS);
      hud?.update();
    }
  });

  // expose for automated smoke tests
  (window as unknown as { __ks: unknown }).__ks = { shell, get game() { return game; } };
  showMenu(shell);
}

void boot();
