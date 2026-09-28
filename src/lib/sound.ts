// Web Audio synthesized effects (no audio files). Fails silently.
let ac: AudioContext | null = null;
let master: GainNode | null = null;
const readySubs = new Set<() => void>();

/** True once the browser lets this page play sound. */
export function audioReady(): boolean {
  return !!ac && ac.state === 'running';
}

export function onAudioReady(cb: () => void): () => void {
  readySubs.add(cb);
  return () => readySubs.delete(cb);
}

function notifyReady() {
  if (audioReady()) readySubs.forEach((f) => f());
}

/**
 * Mobile browsers only start audio inside a real user activation. On touch screens pointerdown does not
 * count; touchend / click / keydown do. Keep listening until the audio context is actually running.
 */
export function installAudioUnlock() {
  const events = ['touchend', 'click', 'keydown', 'pointerup'] as const;
  const handler = () => {
    unlockAudio();
    if (audioReady()) events.forEach((e) => window.removeEventListener(e, handler, true));
  };
  events.forEach((e) => window.addEventListener(e, handler, true));
}

const PREF = 'teamdex.sound';

export function soundEnabled(): boolean {
  try {
    return localStorage.getItem(PREF) !== 'off';
  } catch {
    return true;
  }
}

export function setSoundEnabled(on: boolean) {
  try {
    localStorage.setItem(PREF, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
}

/** Call inside a user gesture. Lets iPhone play web audio even with the silent switch on (Safari 16.4+). */
export function unlockAudio() {
  try {
    const nav = navigator as Navigator & { audioSession?: { type: string } };
    if (nav.audioSession && nav.audioSession.type !== 'playback') nav.audioSession.type = 'playback';
  } catch {
    /* ignore */
  }
  try {
    if (!ac) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AC) return;
      ac = new AC();
      master = ac.createGain();
      master.gain.value = 0.8;
      master.connect(ac.destination);
    }
    ac.onstatechange = notifyReady;
    if (ac.state !== 'running') ac.resume().then(notifyReady).catch(() => {});
    const b = ac.createBuffer(1, 1, 22050);
    const src = ac.createBufferSource();
    src.buffer = b;
    src.connect(ac.destination);
    src.start(0);
  } catch {
    /* ignore */
  }
}

function tone(f: number, type: OscillatorType, dur: number, peak: number, t0 = 0, slide?: number) {
  if (!ac || !master) return;
  const t = ac.currentTime + t0;
  const o = ac.createOscillator();
  const g = ac.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.006 + dur);
  o.connect(g);
  g.connect(master);
  o.start(t);
  o.stop(t + dur + 0.05);
}

function noise(dur: number, peak: number, type: BiquadFilterType, f0: number, f1?: number, t0 = 0) {
  if (!ac || !master) return;
  const t = ac.currentTime + t0;
  const len = Math.max(1, Math.floor(ac.sampleRate * dur));
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.setValueAtTime(f0, t);
  if (f1) f.frequency.exponentialRampToValueAtTime(f1, t + dur);
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + dur * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

const FX = {
  whoosh: () => noise(0.55, 0.22, 'bandpass', 300, 2600),
  impact: () => {
    tone(110, 'sine', 0.38, 0.5, 0, 48);
    noise(0.18, 0.28, 'highpass', 1500);
    tone(1760, 'sine', 0.3, 0.09);
  },
  reveal: () => [1318, 1568, 1976, 2637, 3136].forEach((f, i) => tone(f, 'sine', 0.35, 0.06, i * 0.05)),
  pop: () => tone(540, 'sine', 0.14, 0.32, 0, 190),
  unlock: () => {
    tone(880, 'triangle', 0.4, 0.16);
    tone(1320, 'triangle', 0.5, 0.12, 0.09);
  },
  party: () => [523, 659, 784, 1046, 784, 1046].forEach((f, i) => tone(f, 'square', 0.12, 0.06, i * 0.1)),
  wrong: () => tone(220, 'triangle', 0.18, 0.12, 0, 160),
};

export type Sfx = keyof typeof FX;

export function play(k: Sfx) {
  if (!soundEnabled()) return;
  try {
    if (!ac) unlockAudio();
    if (ac && ac.state !== 'running') ac.resume().catch(() => {});
    FX[k]();
  } catch {
    /* ignore */
  }
}

export function vibrate(ms: number | number[] = 40) {
  try {
    // Chrome logs an error if vibrate is called before the user has tapped the page
    const ua = (navigator as Navigator & { userActivation?: { hasBeenActive: boolean } }).userActivation;
    if (ua && !ua.hasBeenActive) return;
    if (soundEnabled() && 'vibrate' in navigator) navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}
