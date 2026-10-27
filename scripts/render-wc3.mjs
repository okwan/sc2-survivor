// Pre-renders Warcraft III models into Brood War-style sprite sheets, in headless Chromium (WebGL via
// SwiftShader), so the game draws WC3 heroes as plain 2D sprites. Used by fetch-wc3.mjs.
//
//   renderModels([{ id, mdx, textures: { 'path.blp': Uint8Array } }], outDir, { anims, dirs })
//
// Per model it writes <outDir>/<id>-<anim>.png (columns = directions clockwise from facing up the
// screen, rows = frames) and returns { anims: { <anim>: { frames, ms, cell } } } for the manifest.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

const require = createRequire(import.meta.url);

function chromePath() {
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  for (const p of ['/opt/pw-browsers/chromium-1243/chrome-linux64/chrome', '/usr/bin/google-chrome', '/usr/bin/chromium']) {
    try {
      readFileSync(p, { flag: 'r' }).length;
      return p;
    } catch {}
  }
  return undefined; // playwright's own download, if any
}

// Runs inside the page. Everything it needs comes in as plain data.
async function renderInPage({ mdx, textures, opts }) {
  const W = window.war3model;
  const bytes = (b64) => Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  const model = W.parseMDX(bytes(mdx).buffer);
  // drop the team-colored hero glow under the feet: Brood War units have none
  const glowTex = new Set(model.Textures.flatMap((t, i) => (t.ReplaceableId === 2 ? [i] : [])));
  const glowMat = new Set(model.Materials.flatMap((m, i) => (m.Layers.some((l) => typeof l.TextureID === 'number' && glowTex.has(l.TextureID)) ? [i] : [])));
  if (glowMat.size) {
    const keep = model.Geosets.map((g) => !glowMat.has(g.MaterialID));
    const remap = [];
    let n = 0;
    keep.forEach((k, i) => (remap[i] = k ? n++ : -1));
    model.Geosets = model.Geosets.filter((_, i) => keep[i]);
    model.GeosetAnims = (model.GeosetAnims ?? []).filter((a) => remap[a.GeosetId] >= 0).map((a) => ({ ...a, GeosetId: remap[a.GeosetId] }));
  }
  const big = opts.cell * opts.ss;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = big;
  const gl = canvas.getContext('webgl2', { alpha: false, preserveDrawingBuffer: true, antialias: true });
  if (!gl) throw new Error('no WebGL2');
  const r = new W.ModelRenderer(model);
  r.initGL(gl);
  for (const [path, b64] of Object.entries(textures)) {
    try {
      const blp = W.decodeBLP(bytes(b64).buffer);
      const mips = [];
      for (let i = 0; i < blp.mipmaps.length; i++) {
        const d = W.getBLPImageData(blp, i);
        mips.push(new ImageData(new Uint8ClampedArray(d.data), d.width, d.height));
      }
      r.setTextureImageData(path, mips);
    } catch (e) {
      console.warn(`texture ${path}: ${e.message}`);
    }
  }
  r.setTeamColor(opts.teamColor);

  // column-major 4x4 helpers
  const mul = (a, b) => {
    const o = new Float32Array(16);
    for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++) for (let k = 0; k < 4; k++) o[c * 4 + rr] += a[k * 4 + rr] * b[c * 4 + k];
    return o;
  };
  const ortho = (h, near, far) => new Float32Array([1 / h, 0, 0, 0, 0, 1 / h, 0, 0, 0, 0, -2 / (far - near), 0, 0, 0, -(far + near) / (far - near), 1]);
  const lookAt = (eye, at, up) => {
    const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
    const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };
    const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const z = norm(sub(eye, at)), x = norm(cross(up, z)), y = cross(z, x);
    return new Float32Array([x[0], y[0], z[0], 0, x[1], y[1], z[1], 0, x[2], y[2], z[2], 0, -dot(x, eye), -dot(y, eye), -dot(z, eye), 1]);
  };
  const rotZ = (a) => new Float32Array([Math.cos(a), Math.sin(a), 0, 0, -Math.sin(a), Math.cos(a), 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const rotVecZ = (v, a) => [v[0] * Math.cos(a) - v[1] * Math.sin(a), v[0] * Math.sin(a) + v[1] * Math.cos(a), v[2]];
  const quatMul = (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2],
  ];

  const pitch = (opts.pitch * Math.PI) / 180;
  const dist = 2000;
  const eye = [0, -dist * Math.cos(pitch), opts.targetZ + dist * Math.sin(pitch)];
  const view = lookAt(eye, [0, 0, opts.targetZ], [0, 0, 1]);
  const proj = ortho(opts.halfExtent, 1, 4000);
  const light = [-900, -1400, 1800];

  // WC3 blends glows and particles additively, which leaves no usable alpha. Render each view over
  // black and over white instead: the difference gives coverage, the black pass gives colour.
  const onBlack = new Uint8Array(big * big * 4);
  const onWhite = new Uint8Array(big * big * 4);
  const matte = document.createElement('canvas');
  matte.width = matte.height = big;
  const mctx = matte.getContext('2d');
  const mimg = mctx.createImageData(big, big);
  const small = document.createElement('canvas');
  const half = document.createElement('canvas');
  const out = {};
  for (const anim of opts.anims) {
    const seq = model.Sequences.findIndex((s) => s.Name.trim().toLowerCase().split(/\s+/)[0] === anim && !/alternate|defend|channel|swim/i.test(s.Name));
    if (seq < 0) continue;
    const [start, end] = model.Sequences[seq].Interval;
    const ms = end - start;
    const frames = Math.max(4, Math.min(opts.maxFrames, Math.round(ms / opts.frameMs)));
    small.width = opts.cell * opts.dirs;
    small.height = opts.cell * frames;
    const sctx = small.getContext('2d');
    sctx.clearRect(0, 0, small.width, small.height);
    r.setSequence(seq);
    // warm up particles from the start of the sequence, then step through it
    r.update(0);
    for (let f = 0; f < frames; f++) {
      if (f > 0) {
        const step = ms / frames;
        for (let t = 0; t < step; t += 16) r.update(Math.min(16, step - t));
      }
      for (let d = 0; d < opts.dirs; d++) {
        const screenAngle = (d / opts.dirs) * Math.PI * 2; // clockwise from up
        const facing = Math.PI / 2 - screenAngle; // WC3 models face +X; world +Y is up the screen
        // billboards and lights are evaluated in model space, so turn the camera into it
        const camDir = rotVecZ([0, -Math.cos(pitch), Math.sin(pitch)], -facing);
        const yaw = Math.atan2(camDir[1], camDir[0]);
        const qPitch = [0, Math.sin(-pitch / 2), 0, Math.cos(-pitch / 2)];
        const qYaw = [0, 0, Math.sin(yaw / 2), Math.cos(yaw / 2)];
        r.setCamera(rotVecZ(eye, -facing), quatMul(qYaw, qPitch));
        r.setLightPosition(rotVecZ(light, -facing));
        r.setLightColor([1, 1, 1]);
        gl.viewport(0, 0, big, big);
        for (const [bg, buf] of [[0, onBlack], [1, onWhite]]) {
          gl.clearColor(bg, bg, bg, 1);
          gl.depthMask(true);
          gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
          r.render(mul(view, rotZ(facing)), proj, {});
          gl.readPixels(0, 0, big, big, gl.RGBA, gl.UNSIGNED_BYTE, buf);
        }
        const px = mimg.data;
        for (let y = 0; y < big; y++) {
          const row = (big - 1 - y) * big * 4; // GL rows run bottom-up
          for (let x = 0; x < big * 4; x += 4) {
            const i = row + x, o = y * big * 4 + x;
            const a = 255 - Math.min(255, Math.max(0, ((onWhite[i] - onBlack[i]) + (onWhite[i + 1] - onBlack[i + 1]) + (onWhite[i + 2] - onBlack[i + 2])) / 3));
            px[o + 3] = a;
            if (a) {
              const k = 255 / a;
              px[o] = Math.min(255, onBlack[i] * k);
              px[o + 1] = Math.min(255, onBlack[i + 1] * k);
              px[o + 2] = Math.min(255, onBlack[i + 2] * k);
            } else px[o] = px[o + 1] = px[o + 2] = 0;
          }
        }
        mctx.putImageData(mimg, 0, 0);
        // halve twice so thin details average out instead of shimmering
        let src = matte, size = big;
        while (size > opts.cell) {
          size /= 2;
          half.width = half.height = size;
          const h = half.getContext('2d');
          h.clearRect(0, 0, size, size);
          h.imageSmoothingQuality = 'high';
          h.drawImage(src, 0, 0, size * 2, size * 2, 0, 0, size, size);
          if (size > opts.cell) {
            const copy = document.createElement('canvas');
            copy.width = copy.height = size;
            copy.getContext('2d').drawImage(half, 0, 0);
            src = copy;
          } else src = half;
        }
        sctx.drawImage(src, 0, 0, opts.cell, opts.cell, d * opts.cell, f * opts.cell, opts.cell, opts.cell);
      }
    }
    out[anim] = { frames, ms, cell: opts.cell, png: small.toDataURL('image/png') };
  }
  return { sequences: model.Sequences.map((s) => s.Name), out };
}

export async function renderModels(jobs, outDir, options = {}) {
  const opts = { anims: ['stand', 'walk', 'attack', 'spell', 'death'], dirs: 16, cell: 96, ss: 4, pitch: 56, targetZ: 70, halfExtent: 170, frameMs: 100, maxFrames: 12, teamColor: [0.0, 0.26, 1.0], ...options };
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath: chromePath(), args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
  const page = await browser.newPage();
  page.on('console', (m) => m.type() !== 'log' && console.warn(`render-wc3 [page] ${m.text()}`));
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ content: readFileSync(join(dirname(require.resolve('war3-model')), 'war3-model.browser.js'), 'utf8') });
  mkdirSync(outDir, { recursive: true });
  const result = {};
  for (const job of jobs) {
    try {
      const t0 = Date.now();
      const textures = Object.fromEntries(Object.entries(job.textures).map(([p, d]) => [p, Buffer.from(d).toString('base64')]));
      const { sequences, out } = await page.evaluate(renderInPage, { mdx: Buffer.from(job.mdx).toString('base64'), textures, opts });
      const anims = {};
      for (const [anim, a] of Object.entries(out)) {
        writeFileSync(join(outDir, `${job.id}-${anim}.png`), Buffer.from(a.png.split(',')[1], 'base64'));
        anims[anim] = { frames: a.frames, ms: a.ms, cell: a.cell };
      }
      result[job.id] = { dirs: opts.dirs, anims };
      console.log(`render-wc3: ${job.id} ${Object.entries(anims).map(([n, a]) => `${n}x${a.frames}`).join(' ')} in ${((Date.now() - t0) / 1000).toFixed(1)}s (sequences: ${sequences.join(', ')})`);
    } catch (e) {
      console.warn(`render-wc3: ${job.id} failed: ${e.stack || e}`);
    }
  }
  await browser.close();
  return result;
}
