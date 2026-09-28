// Web Audio synthesized effects (no audio files). Fails silently.
let ac: AudioContext | null = null;
let master: GainNode | null = null;

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
    if (ac.state !== 'running') ac.resume().catch(() => {});
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

const FX = {
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

export function vibrate(ms = 40) {
  try {
    if (soundEnabled() && 'vibrate' in navigator) navigator.vibrate(ms);
  } catch {
    /* ignore */
  }
}
