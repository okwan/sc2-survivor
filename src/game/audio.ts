import { bwFile, fetchInto } from '../bw/assets';
import { BW_SOUND_FILES, BW_SOUNDS } from '../bw/sounds';

/**
 * Sound effects: StarCraft's own sounds when the site ships them (src/bw/sounds.ts), otherwise a
 * tiny WebAudio synth. Calls are throttled per sound.
 */
type Sfx = 'shoot' | 'hit' | 'explode' | 'pickup' | 'level' | 'boss' | 'hurt' | 'dash' | 'select' | 'zap' | 'win' | 'lose';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let volume = 0.5;
const last: Partial<Record<Sfx, number>> = {};
const MIN_GAP: Record<Sfx, number> = {
  shoot: 0.07, hit: 0.05, explode: 0.08, pickup: 0.04, level: 0.2, boss: 1, hurt: 0.25, dash: 0.2, select: 0.05, zap: 0.08, win: 1, lose: 1,
};
let noiseBuf: AudioBuffer | null = null;
let race = 'terran';
const samples = new Map<string, AudioBuffer>();
let loading: Promise<void> | null = null;
let voices = 0;
const MAX_VOICES = 14;
let lastDeath = -1;

/** Which race's variant of shoot / level / dash sounds to play. */
export function setSfxRace(r: string) {
  race = r;
}

/** Downloads and decodes the bundled StarCraft sounds (once; retried if nothing was available yet). */
function loadSamples() {
  if (loading || !ctx) return;
  const c = ctx;
  loading = (async () => {
    await fetchInto(BW_SOUND_FILES);
    await Promise.all(
      BW_SOUND_FILES.map(async (p) => {
        const buf = bwFile(p);
        if (!buf || samples.has(p)) return;
        try {
          samples.set(p, await c.decodeAudioData(buf.slice().buffer));
        } catch {
          /* not a playable wav */
        }
      }),
    );
    if (!samples.size) loading = null;
  })();
}

/** Plays one of a sound's StarCraft samples; false when none is loaded. */
function sample(key: string, gain = 1): boolean {
  const list = BW_SOUNDS[key];
  if (!list || !ctx || !master) return false;
  const have = list.filter((p) => samples.has(p));
  if (!have.length) return false;
  if (voices >= MAX_VOICES) return true;
  const src = ctx.createBufferSource();
  src.buffer = samples.get(have[Math.floor(Math.random() * have.length)])!;
  const g = ctx.createGain();
  g.gain.value = gain;
  src.connect(g).connect(master);
  voices++;
  src.onended = () => voices--;
  src.start();
  return true;
}

/** An enemy's StarCraft death sound (throttled so a big wave doesn't become noise). */
export function deathSfx(shape: string) {
  if (!ctx || volume <= 0) return;
  const now = ctx.currentTime;
  if (now - lastDeath < 0.06) return;
  lastDeath = now;
  sample(`death:${shape}`, 0.55);
}

export function setVolume(v: number) {
  volume = v;
  if (master) master.gain.value = v * 0.4;
}

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  try {
    ctx = new AudioContext();
    master = ctx.createGain();
    master.gain.value = volume * 0.4;
    master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.5, ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  } catch {
    ctx = null;
  }
  return ctx;
}

export function unlockAudio() {
  const c = ensure();
  if (c && c.state === 'suspended') void c.resume();
  loadSamples();
}

function tone(type: OscillatorType, f0: number, f1: number, dur: number, gain: number) {
  const c = ctx!;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f0, c.currentTime);
  o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), c.currentTime + dur);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g).connect(master!);
  o.start();
  o.stop(c.currentTime + dur);
}

function noise(dur: number, gain: number, freq: number) {
  const c = ctx!;
  const s = c.createBufferSource();
  s.buffer = noiseBuf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  s.connect(f).connect(g).connect(master!);
  s.start();
  s.stop(c.currentTime + dur);
}

export function sfx(name: Sfx) {
  if (!ctx || volume <= 0) return;
  const now = ctx.currentTime;
  if ((last[name] ?? -1) + MIN_GAP[name] > now) return;
  last[name] = now;
  if (sample(`${name}:${race}`) || sample(name)) return;
  switch (name) {
    case 'shoot': tone('square', 900, 300, 0.05, 0.05); break;
    case 'hit': tone('triangle', 300, 120, 0.05, 0.06); break;
    case 'explode': noise(0.35, 0.35, 900); break;
    case 'pickup': tone('sine', 900 + Math.random() * 300, 1600, 0.06, 0.05); break;
    case 'level': tone('triangle', 440, 880, 0.25, 0.2); setTimeout(() => tone('triangle', 660, 1320, 0.3, 0.15), 90); break;
    case 'boss': tone('sawtooth', 110, 55, 1.2, 0.25); noise(0.8, 0.2, 300); break;
    case 'hurt': tone('sawtooth', 200, 80, 0.15, 0.15); break;
    case 'dash': noise(0.15, 0.15, 3000); break;
    case 'select': tone('sine', 600, 900, 0.08, 0.12); break;
    case 'zap': tone('sawtooth', 1400, 400, 0.08, 0.06); break;
    case 'win': [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => tone('triangle', f, f, 0.35, 0.18), i * 140)); break;
    case 'lose': [392, 330, 262].forEach((f, i) => setTimeout(() => tone('triangle', f, f * 0.95, 0.4, 0.18), i * 200)); break;
  }
}
