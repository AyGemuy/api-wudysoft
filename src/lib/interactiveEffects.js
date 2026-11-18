import { audioStore } from '@/src/lib/audio';

/**
 * Efek suara sintetis (Web Audio) — tanpa file audio.
 *  • klik / beep: umpan balik UI
 *  • cue bernama: welcome, success, fail, logout, notfound (bisa dimatikan satu per satu di panel Audio)
 * `enabled` dikendalikan oleh Theme Studio ("Efek suara"); volume & cue oleh audioStore.
 */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.pending = null;
    this.armed = false;
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  get vol() {
    return audioStore.get().sfxVol;
  }

  /** Satu nada: frekuensi (Hz), mulai (detik dari sekarang), durasi, opsi. */
  tone(freq, at, dur, { type = 'sine', gain = 0.12, to = null, attack = 0.012 } = {}) {
    const t = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(to, t + dur);
    const peak = Math.max(0.0002, gain * this.vol);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g);
    g.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.03);
  }

  playClick() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.tone(600, 0, 0.045, { gain: 0.07, to: 200, attack: 0.003 });
    } catch (e) {}
  }

  playBeep() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      this.tone(520, 0, 0.03, { type: 'triangle', gain: 0.06, attack: 0.003 });
      this.tone(880, 0.03, 0.04, { type: 'triangle', gain: 0.06, attack: 0.003 });
    } catch (e) {}
  }

  /** Putar cue bernama. Mengembalikan durasi kira-kira (detik), 0 bila tidak diputar. */
  play(name) {
    if (!this.enabled || audioStore.get().cues?.[name] === false) return 0;
    try {
      this.init();
      if (!this.ctx) return 0;
      const C = CUE_DEF[name];
      if (!C) return 0;
      C(this);
      return CUE_LEN[name] || 0.6;
    } catch (e) {
      return 0;
    }
  }

  /** Seperti play(), tetapi bila browser belum mengizinkan audio, tunda sampai interaksi pertama. */
  playWhenReady(name) {
    if (typeof window === 'undefined') return;
    if (navigator.userActivation?.hasBeenActive) return void this.play(name);
    this.pending = name;
    if (this.armed) return;
    this.armed = true;
    const fire = () => {
      window.removeEventListener('pointerdown', fire, true);
      window.removeEventListener('keydown', fire, true);
      this.armed = false;
      const n = this.pending;
      this.pending = null;
      if (n) setTimeout(() => this.play(n), 30);
    };
    window.addEventListener('pointerdown', fire, true);
    window.addEventListener('keydown', fire, true);
  }
}

const seq = (s, notes, o) => notes.forEach(([f, at, d, extra]) => s.tone(f, at, d, { ...o, ...extra }));

const CUE_LEN = { welcome: 1.3, success: 0.7, fail: 0.6, logout: 0.9, notfound: 0.9 };
const CUE_DEF = {
  // arpeggio naik C-E-G-C dengan kilau
  welcome: (s) => {
    seq(s, [[523.25, 0, 0.5], [659.25, 0.12, 0.5], [783.99, 0.24, 0.6], [1046.5, 0.38, 0.9]], { type: 'sine', gain: 0.13 });
    seq(s, [[1046.5, 0.38, 0.9], [1318.5, 0.5, 0.7]], { type: 'triangle', gain: 0.05 });
  },
  // dua nada naik, ceria
  success: (s) => {
    seq(s, [[659.25, 0, 0.18], [880, 0.1, 0.18], [1318.5, 0.2, 0.45]], { type: 'triangle', gain: 0.12 });
    s.tone(1318.5, 0.2, 0.45, { type: 'sine', gain: 0.06 });
  },
  // buzz turun dua kali
  fail: (s) => {
    s.tone(230, 0, 0.2, { type: 'sawtooth', gain: 0.07, to: 170 });
    s.tone(190, 0.24, 0.3, { type: 'sawtooth', gain: 0.07, to: 120 });
    s.tone(115, 0.24, 0.3, { type: 'square', gain: 0.03 });
  },
  // arpeggio turun
  logout: (s) => {
    seq(s, [[783.99, 0, 0.3], [659.25, 0.13, 0.3], [523.25, 0.26, 0.35], [392, 0.4, 0.5]], { type: 'sine', gain: 0.12 });
  },
  // "wah-wah" sedih + ketukan rendah
  notfound: (s) => {
    s.tone(440, 0, 0.28, { type: 'triangle', gain: 0.12, to: 370 });
    s.tone(370, 0.3, 0.28, { type: 'triangle', gain: 0.12, to: 310 });
    s.tone(310, 0.6, 0.55, { type: 'triangle', gain: 0.12, to: 180 });
    s.tone(90, 0, 0.14, { type: 'sine', gain: 0.18 });
  },
};

export const sound = new SoundEngine();
