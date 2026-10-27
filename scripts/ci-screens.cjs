// CI-only: plays a few seconds in each zone with the bundled Brood War art and prints
// JPEG screenshots into the job log ("JPG <name> <part>/<parts> <base64>").
const { chromium } = require('playwright');

const emit = (name, buf) => {
  const b64 = buf.toString('base64');
  const parts = Math.ceil(b64.length / 6000);
  for (let i = 0; i < parts; i++) console.log(`JPG ${name} ${i + 1}/${parts} ${b64.slice(i * 6000, (i + 1) * 6000)}`);
  console.log(`screens: ${name} ${buf.length} bytes`);
};

(async () => {
  const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  page.on('pageerror', (e) => console.log('screens: pageerror ' + e.message));
  page.on('console', (m) => m.type() === 'error' && console.log('screens: console ' + m.text()));
  await page.goto('http://localhost:4173/');
  await page.waitForTimeout(2500);
  emit('menu', await page.screenshot({ type: 'jpeg', quality: 70 }));
  const races = ['terran', 'zerg', 'protoss', 'terran', 'protoss'];
  const zones = ['marsara', 'char', 'aiur', 'korhal', 'ulnar'];
  for (let i = 0; i < zones.length; i++) {
    await page.evaluate(([r, z]) => window.__ks.shell.startRun(r, z), [races[i], zones[i]]);
    await page.waitForTimeout(1500);
    // walk in a circle for a few seconds so enemies arrive and spells fire
    await page.evaluate(() => {
      const g = window.__ks.game;
      const t0 = performance.now();
      g.input.move = () => {
        const a = (performance.now() - t0) / 1500;
        return [Math.cos(a), Math.sin(a)];
      };
    });
    await page.waitForTimeout(9000);
    emit(`run-${zones[i]}`, await page.screenshot({ type: 'jpeg', quality: 70 }));
    await page.evaluate(() => window.__ks.shell.quitRun());
  }
  await browser.close();
})().catch((e) => {
  console.log('screens: failed ' + e.stack);
});
