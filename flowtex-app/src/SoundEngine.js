import { readPreference, writePreference } from './preferenceStorage';

const LS_ENABLED = 'flumenwrite.sfx.enabled';
const LS_VOLUME  = 'flumenwrite.sfx.volume';

let ctx    = null;
let enabled  = true;
let volume   = 0.6; // 0–1 master scalar

let mathErrorTimer  = null;
let saveLastPlayed  = 0;

// ─── init ─────────────────────────────────────────────────────────────────
// Call once after the first user gesture to satisfy browser autoplay policy.

export function init() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
  } catch {
    return; // Web Audio API unavailable — fail silently
  }
  const se = readPreference(LS_ENABLED);
  if (se !== null) enabled = se !== 'false';
  const sv = readPreference(LS_VOLUME);
  if (sv !== null) volume = Math.min(1, Math.max(0, parseFloat(sv) || 0));
}

function getCtx() {
  if (!ctx) return null;
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

// ─── sounds ───────────────────────────────────────────────────────────────

// math.open — soft rising sine, 440→520 Hz, subliminal
function playMathOpen() {
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.08 * volume, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  g.connect(c.destination);

  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(440, t);
  osc.frequency.linearRampToValueAtTime(520, t + 0.12);
  osc.connect(g);
  osc.start(t);
  osc.stop(t + 0.15);
}

// math.commit — two-oscillator "lock" chord, most present sound in the set
function playMathCommit() {
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;

  // Shared bandpass keeps it clean, not harsh
  const bpf = c.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.value = 780;
  bpf.Q.value = 0.8;
  bpf.connect(c.destination);

  // Primary: 522 Hz, pitch settles down ~10 Hz
  const g1 = c.createGain();
  g1.gain.setValueAtTime(0.0001, t);
  g1.gain.linearRampToValueAtTime(0.12 * volume, t + 0.002);
  g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.085);
  g1.connect(bpf);

  const osc1 = c.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.setValueAtTime(522, t);
  osc1.frequency.linearRampToValueAtTime(510, t + 0.08);
  osc1.connect(g1);
  osc1.start(t);
  osc1.stop(t + 0.1);

  // Harmonic octave: ~1047 Hz (slight detune from 1040 for warmth)
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.0001, t);
  g2.gain.linearRampToValueAtTime(0.05 * volume, t + 0.002);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  g2.connect(bpf);

  const osc2 = c.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.setValueAtTime(1047, t);
  osc2.frequency.linearRampToValueAtTime(1030, t + 0.06);
  osc2.connect(g2);
  osc2.start(t);
  osc2.stop(t + 0.08);
}

// toolbar.insert — white-noise burst through highpass, "key click" feel
function playToolbarInsert() {
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;

  const len = Math.round(c.sampleRate * 0.022);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

  const src = c.createBufferSource();
  src.buffer = buf;

  const hpf = c.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = 2200;

  const g = c.createGain();
  g.gain.setValueAtTime(0.05 * volume, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.022);

  src.connect(hpf);
  hpf.connect(g);
  g.connect(c.destination);
  src.start(t);
}

// document.save — 330 Hz + perfect fifth (495 Hz), lowpass warmth
// Hard-gated to at most once per 30 s
function playDocumentSave() {
  const c = getCtx(); if (!c) return;
  const wall = Date.now();
  if (wall - saveLastPlayed < 30000) return;
  saveLastPlayed = wall;

  const t = c.currentTime;

  const lpf = c.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 600;
  lpf.connect(c.destination);

  // Root: 330 Hz
  const g1 = c.createGain();
  g1.gain.setValueAtTime(0.0001, t);
  g1.gain.linearRampToValueAtTime(0.06 * volume, t + 0.04);
  g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  g1.connect(lpf);

  const osc1 = c.createOscillator();
  osc1.type = 'sine';
  osc1.frequency.value = 330;
  osc1.connect(g1);
  osc1.start(t);
  osc1.stop(t + 0.28);

  // Perfect fifth: 495 Hz, fades in 40 ms behind
  const g2 = c.createGain();
  g2.gain.setValueAtTime(0.0001, t + 0.04);
  g2.gain.linearRampToValueAtTime(0.03 * volume, t + 0.09);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.24);
  g2.connect(lpf);

  const osc2 = c.createOscillator();
  osc2.type = 'sine';
  osc2.frequency.value = 495;
  osc2.connect(g2);
  osc2.start(t + 0.04);
  osc2.stop(t + 0.28);
}

// math.error — low sine with downward pitch bend, non-startling
function playMathError() {
  const c = getCtx(); if (!c) return;
  const t = c.currentTime;

  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.07 * volume, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.11);
  g.connect(c.destination);

  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(220, t);
  osc.frequency.linearRampToValueAtTime(188, t + 0.1);
  osc.connect(g);
  osc.start(t);
  osc.stop(t + 0.13);
}

// ─── public API ───────────────────────────────────────────────────────────

const SoundEngine = {
  init,

  play(id) {
    if (!enabled) return;
    try {
      switch (id) {
        case 'math.open':      playMathOpen();      break;
        case 'math.commit':    playMathCommit();    break;
        case 'toolbar.insert': playToolbarInsert(); break;
        case 'document.save':  playDocumentSave();  break;
        case 'math.error':     playMathError();     break;
        default: break;
      }
    } catch { /* never surface audio errors to the UI */ }
  },

  // Debounced error sound — plays 800 ms after the last call, then resets.
  scheduleError() {
    clearTimeout(mathErrorTimer);
    mathErrorTimer = setTimeout(() => {
      if (enabled) {
        try { playMathError(); } catch {}
      }
    }, 800);
  },

  cancelError() {
    clearTimeout(mathErrorTimer);
  },

  setEnabled(val) {
    enabled = !!val;
    writePreference(LS_ENABLED, String(enabled));
  },

  setVolume(val) {
    volume = Math.min(1, Math.max(0, val));
    writePreference(LS_VOLUME, String(volume));
  },

  get isEnabled() { return enabled; },
  get volume()    { return volume; },
};

export default SoundEngine;
