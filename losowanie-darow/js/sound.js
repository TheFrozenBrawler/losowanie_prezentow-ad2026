// Delikatne dźwięki dzwoneczków (WebAudio, bez plików).

let ctx = null;
let muted = localStorage.getItem('darow-muted') === '1';

export const isMuted = () => muted;

export function setMuted(v) {
  muted = v;
  localStorage.setItem('darow-muted', v ? '1' : '0');
}

export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

// Dzwonek: kilka niedokładnie harmonicznych składowych z szybkim wygasaniem.
export function bell(freq, delay = 0, { dur = 2.4, gain = 0.12 } = {}) {
  if (!ctx || muted) return;
  const t0 = ctx.currentTime + delay;
  const partials = [[1, 1], [2.76, 0.35], [5.4, 0.12]];
  for (const [mult, amp] of partials) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = freq * mult;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain * amp, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur / mult ** 0.5);
    o.connect(g).connect(ctx.destination);
    o.start(t0);
    o.stop(t0 + dur + 0.1);
  }
}

// Skala pentatoniczna D-dur, do liter imienia.
const SCALE = [587.33, 659.25, 739.99, 880, 987.77, 1108.73, 1318.51];
export const note = (i) => SCALE[i % SCALE.length];
