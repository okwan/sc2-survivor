// Temporary: screenshots of the WoW skin for review. node scripts/wow-shots.mjs <url> <outDir>
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
try {
  ({ chromium } = require('playwright'));
} catch {
  ({ chromium } = await import('playwright-core'));
}
const [url, out = 'shots'] = process.argv.slice(2);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
page.on('console', (m) => m.type() === 'error' && console.log('console:', m.text()));
page.on('pageerror', (e) => console.log('pageerror:', e.message));
const shot = async (name) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log('shot', name);
};
// raw textures, to check how the art is laid out
const tex = ['minimap/ui-minimap-border', 'dialogframe/ui-dialogbox-border', 'dialogframe/ui-dialogbox-gold-border', 'dialogframe/ui-dialogbox-header', 'tooltips/ui-tooltip-border', 'mainmenubar/ui-mainmenubar-dwarf', 'mainmenubar/ui-xp-bar', 'targetingframe/ui-targetingframe', 'buttons/ui-panel-button-up', 'buttons/ui-quickslot2', 'paperdollinfoframe/ui-character-activetab'];
await page.goto(url);
await page.setContent(`<body style="background:#468;margin:0;display:flex;flex-wrap:wrap;gap:6px">${tex.map((t) => `<div style="color:#fff;font:10px sans-serif">${t}<br><img src="${url}wow/interface/${t}.png" style="border:1px dashed #f0f"></div>`).join('')}</body>`);
await shot('0-textures');
await page.goto(url);
await page.waitForSelector('[data-a="play"]', { timeout: 30000 });
await page.waitForTimeout(1500);
await shot('1-menu');
await page.click('[data-a="talents"]');
await shot('2-talents');
await page.hover('.tnode');
await shot('3-tooltip');
await page.click('[data-back]');
await page.click('[data-a="settings"]');
await shot('4-settings');
await page.keyboard.press('Escape');
await page.goto(url);
await page.waitForSelector('[data-a="play"]');
await page.click('[data-a="play"]');
await page.waitForTimeout(4000);
await shot('5-hud');
try {
  await page.waitForSelector('.levelup', { timeout: 40000 });
  await shot('6-levelup');
  await page.keyboard.press('Digit1');
} catch {
  console.log('no level up');
}
await page.waitForTimeout(1000);
await page.keyboard.press('Escape');
await shot('7-pause');
await browser.close();
