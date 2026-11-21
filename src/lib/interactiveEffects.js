import { audioStore } from '@/src/lib/audio';

/**
 * Efek suara sintetis (Web Audio) — tanpa file audio.
 *  • klik / beep: umpan balik UI
 *  • cue bernama: welcome, success, fail, logout, notfound (bisa dimatikan satu per satu di panel Audio)
 * `enabled` dikendalikan oleh Theme Studio ("Efek suara"); volume & cue oleh audioStore.
 */
/** Event interaksi (bisa dimatikan satu per satu di panel Audio → "Interaksi"). */
export const EVENTS = [
  { id: 'click', label: 'Klik', hint: 'Tombol, tautan, kartu', def: true },
  { id: 'hover', label: 'Hover', hint: 'Tick halus saat kursor lewat (desktop)', def: false },
  { id: 'toggle', label: 'Saklar', hint: 'Switch & centang nyala/mati', def: true },
  { id: 'tab', label: 'Tab & pilihan', hint: 'Pindah tab, segmen, chip', def: true },
  { id: 'panel', label: 'Buka / tutup panel', hint: 'Menu, modal, dropdown, laci', def: true },
  { id: 'nav', label: 'Pindah halaman', hint: 'Whoosh saat navigasi', def: true },
  { id: 'typing', label: 'Mengetik', hint: 'Tick tiap ketukan di kolom input', def: false },
  { id: 'message', label: 'Pesan chat', hint: 'Kirim & terima pesan', def: true },
  { id: 'copy', label: 'Salin', hint: 'Saat menyalin ke clipboard', def: true },
  { id: 'status', label: 'Sukses / gagal / hapus', hint: 'Umpan balik aksi', def: true },
];
export const PACKS = [
  { id: 'pop', label: 'Soft Pop', hint: 'Gelembung manis ala UI modern' },
  { id: 'glass', label: 'Glass Bell', hint: 'Denting kaca jernih + gema' },
  { id: 'wood', label: 'Lo-fi Marimba', hint: 'Kayu hangat, santai' },
  { id: 'thock', label: 'Thock Keyboard', hint: 'Ketukan mekanik ASMR' },
  { id: 'retro', label: 'Retro 8-bit', hint: 'Chiptune arcade' },
  { id: 'scifi', label: 'Sci-Fi HUD', hint: 'Bip & sapuan futuristik' },
  { id: 'bubble', label: 'Bubble Pop', hint: 'Tetesan air, pop ringan' },
  { id: 'kalimba', label: 'Kalimba', hint: 'Petikan logam lembut' },
  { id: 'synth', label: 'Synthwave', hint: 'Synth neon ala 80-an' },
  { id: 'asmr', label: 'ASMR Tap', hint: 'Ketukan kertas & jari, sangat halus' },
  { id: 'kawaii', label: 'Kawaii Boing', hint: 'Imut, melenting, berkilau' },
  { id: 'mix', label: 'Acak (Mix)', hint: 'Tiap bunyi dari paket berbeda' },
];

// event → kategori yang bisa dimatikan
const EVENT_GROUP = { click: 'click', hover: 'hover', toggleOn: 'toggle', toggleOff: 'toggle', tab: 'tab', open: 'panel', close: 'panel', nav: 'nav', key: 'typing', send: 'message', receive: 'message', copy: 'copy', done: 'status', error: 'status', delete: 'status', notify: 'status', focus: 'hover' };

const PENT = [0, 2, 4, 7, 9];
/** Parameter tiap paket: gelombang, nada dasar, panjang peluruhan, gema, dll. */
const PACK_DEF = {
  pop: { wave: 'sine', root: 330, dec: 1, gain: 1, wet: 0.12, bell: 0, tick: 0 },
  glass: { wave: 'sine', root: 523.25, dec: 1.6, gain: 0.85, wet: 0.4, bell: 1, tick: 0 },
  wood: { wave: 'triangle', root: 261.63, dec: 0.9, gain: 1.1, wet: 0.15, bell: 0, tick: 0.5 },
  thock: { wave: 'sine', root: 140, dec: 0.7, gain: 1.2, wet: 0.05, bell: 0, tick: 1 },
  retro: { wave: 'square', root: 392, dec: 0.6, gain: 0.55, wet: 0, bell: 0, tick: 0 },
  scifi: { wave: 'sawtooth', root: 440, dec: 1.1, gain: 0.5, wet: 0.25, bell: 0, tick: 0.2, lp: 3200 },
  bubble: { wave: 'sine', root: 392, dec: 0.8, gain: 1.15, wet: 0.18, bell: 0, tick: 0, up: 1 },
  kalimba: { wave: 'sine', root: 392, dec: 1.4, gain: 1.05, wet: 0.24, bell: 0, tick: 0, pluck: 1 },
  synth: { wave: 'sawtooth', root: 220, dec: 1.25, gain: 0.38, wet: 0.32, bell: 0, tick: 0, lp: 1900, det: 9 },
  asmr: { wave: 'sine', root: 210, dec: 0.5, gain: 0.55, wet: 0.04, bell: 0, tick: 1, paper: 1 },
  kawaii: { wave: 'triangle', root: 523.25, dec: 1, gain: 0.95, wet: 0.2, bell: 0.5, tick: 0, up: 1, sparkle: 1 },
};

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.out = null;
    this.rev = null;
    this.enabled = true;
    this.pending = null;
    this.armed = false;
    this.last = {};
  }

  init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        // rantai master: kompresor lembut agar suara tidak pecah saat bertumpuk
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -18; comp.ratio.value = 4; comp.attack.value = 0.003; comp.release.value = 0.15;
        comp.connect(this.ctx.destination);
        this.out = comp;
        // gema kecil (impuls noise meluruh) untuk kesan "ruang"
        const len = Math.floor(this.ctx.sampleRate * 0.7);
        const buf = this.ctx.createBuffer(2, len, this.ctx.sampleRate);
        for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 3; }
        const conv = this.ctx.createConvolver(); conv.buffer = buf;
        const wg = this.ctx.createGain(); wg.gain.value = 0.9;
        conv.connect(wg); wg.connect(comp);
        this.rev = conv;
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
  }

  get vol() { return audioStore.get().sfxVol; }
  get pack() {
    if (this._p) return this._p;
    const id = audioStore.get().pack;
    if (id === 'mix') { const k = Object.keys(PACK_DEF); return PACK_DEF[k[Math.floor(Math.random() * k.length)]]; }
    return PACK_DEF[id] || PACK_DEF.pop;
  }

  /** Satu nada: frekuensi (Hz), mulai (detik dari sekarang), durasi, opsi. */
  tone(freq, at, dur, { type = 'sine', gain = 0.12, to = null, attack = 0.012, wet = 0, lp = 0, det = 0 } = {}) {
    const t = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const peak = Math.max(0.0002, gain * this.vol);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    let node = g;
    if (lp) { const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(lp * 1.6, t); f.frequency.exponentialRampToValueAtTime(Math.max(200, lp * 0.5), t + dur); f.Q.value = 1.2; g.connect(f); node = f; }
    osc.connect(g);
    node.connect(this.out || this.ctx.destination);
    if (wet > 0 && this.rev) { const w = this.ctx.createGain(); w.gain.value = wet; node.connect(w); w.connect(this.rev); }
    osc.start(t);
    osc.stop(t + dur + 0.05);
    if (det) { // osilator kedua sedikit sumbang → suara synth lebar ("supersaw")
      const o2 = this.ctx.createOscillator(); o2.type = type; o2.frequency.setValueAtTime(freq, t); o2.detune.value = det;
      if (to) o2.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
      o2.connect(g); o2.start(t); o2.stop(t + dur + 0.05);
    }
  }

  /** Semburan noise tersaring (ketukan, whoosh). */
  noise(at, dur, { freq = 2000, to = null, q = 1, gain = 0.1, type = 'bandpass', wet = 0 } = {}) {
    const t = this.ctx.currentTime + at;
    const n = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource(); src.buffer = buf;
    const f = this.ctx.createBiquadFilter(); f.type = type; f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (to) f.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, gain * this.vol), t + Math.min(0.01, dur / 3));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.out || this.ctx.destination);
    if (wet > 0 && this.rev) { const w = this.ctx.createGain(); w.gain.value = wet; g.connect(w); w.connect(this.rev); }
    src.start(t); src.stop(t + dur + 0.02);
  }

  /** Nada ke-n tangga pentatonik dari nada dasar paket (n boleh > 4 → oktaf berikutnya). */
  deg(n) { const P = this.pack; return P.root * 2 ** ((PENT[n % 5] + 12 * Math.floor(n / 5)) / 12); }

  /** Nada paket: gelombang paket + (opsional) partial lonceng. */
  note(n, at, dur, o = {}) {
    const P = this.pack; const f = this.deg(n) * (o.jit ? 1 + (Math.random() - 0.5) * 0.04 : 1);
    const glide = o.to ? (P.up ? 1.5 : o.to) : null; // paket "up" (bubble/kawaii) meluncur naik seperti tetesan/boing
    const g = (o.gain ?? 0.1) * P.gain;
    this.tone(f, at, dur * P.dec, { type: P.wave, gain: g, to: glide ? f * glide : null, wet: P.wet, attack: o.attack ?? (P.pluck ? 0.002 : 0.006), lp: P.lp || 0, det: P.det || 0 });
    if (P.bell) this.tone(f * 2.76, at, dur * P.dec * 0.7, { type: 'sine', gain: (o.gain ?? 0.1) * 0.28 * P.bell, wet: P.wet });
    if (P.pluck) this.tone(f * 4.01, at, dur * 0.35, { type: 'sine', gain: g * 0.35, wet: P.wet, attack: 0.001 }); // dentingan logam kalimba
    if (P.sparkle && Math.random() < 0.35) this.tone(this.deg(n + 10), at + 0.05, 0.12, { type: 'sine', gain: g * 0.22, wet: P.wet });
  }

  /** Nada klik berantai: naik-turun pentatonik tiap klik (arpeggio halus); reset bila diam >1,4 dtk. */
  step(base = 0) {
    const now = performance.now();
    if (now - (this._stepAt || 0) > 1400) this._si = 0;
    this._stepAt = now;
    const seq = [7, 9, 8, 10, 9, 11, 10, 12];
    this._si = ((this._si ?? -1) + 1) % seq.length;
    return seq[this._si] + base;
  }

  /** Ketukan perkusif (thock / tick) sesuai paket. */
  tap(at = 0, strength = 1) {
    const P = this.pack;
    if (P.paper) { // ASMR: sapuan kertas + ketukan jari yang empuk
      this.noise(at, 0.07, { freq: 1700 + Math.random() * 600, q: 0.6, gain: 0.09 * strength, type: 'bandpass' });
      this.tone(P.root * (0.95 + Math.random() * 0.1), at, 0.08, { type: 'sine', gain: 0.1 * strength, to: P.root * 0.7, attack: 0.003 });
    } else if (P.tick >= 1) { // thock keyboard: badan rendah + klik tinggi
      this.tone(P.root * (0.9 + Math.random() * 0.2), at, 0.09, { type: 'sine', gain: 0.2 * strength, to: P.root * 0.55, attack: 0.002 });
      this.noise(at, 0.035, { freq: 3200, q: 0.8, gain: 0.07 * strength });
    } else if (P.tick > 0) this.noise(at, 0.025, { freq: 2400, q: 2, gain: 0.05 * P.tick * strength });
  }

  gate(name) {
    if (!this.enabled) return false;
    const st = audioStore.get();
    const grp = EVENT_GROUP[name];
    if (grp && st.events?.[grp] === false) return false;
    if (grp && st.events?.[grp] === undefined && EVENTS.find((e) => e.id === grp)?.def === false) return false;
    const gap = { hover: 90, focus: 120, key: 38, click: 45 }[name] || 25;
    const now = performance.now();
    if (now - (this.last[name] || 0) < gap) return false;
    this.last[name] = now;
    return true;
  }

  /** Mainkan event interaksi (click, hover, toggleOn, toggleOff, tab, open, close, nav, key, send, receive, copy, done, error, delete, notify, focus). */
  fx(name) {
    try {
      if (!this.gate(name)) return;
      this.init();
      if (!this.ctx) return;
      const f = EV[name];
      this._p = null; this._p = this.pack; // 'mix': satu paket untuk seluruh bunyi ini
      if (f) f(this);
    } catch (e) {}
    this._p = null;
  }

  // Panggilan eksplisit di komponen lama: lewati bila suara global untuk gestur yang sama baru saja berbunyi
  playClick() { if (performance.now() - (this.downAt || 0) < 700) return; this.fx('click'); }
  playBeep() { if (performance.now() - (this.downAt || 0) < 700) return; this.fx('tab'); }

  /** Putar cue bernama (welcome, success, fail, logout, notfound). Mengembalikan durasi kira-kira (detik), 0 bila tidak diputar. */
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

  /** Pratinjau paket (dipakai tombol di panel Audio) — mengabaikan gerbang event. */
  preview(packId) {
    const was = this.enabled; this.enabled = true;
    const prev = audioStore.get().pack;
    try {
      audioStore.set({ pack: packId }); this.init(); if (!this.ctx) return;
      EV.click(this); setTimeout(() => EV.toggleOn(this), 160); setTimeout(() => EV.done(this), 340);
    } catch (e) {}
    setTimeout(() => { audioStore.set({ pack: prev }); this.enabled = was; }, 1100);
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

/** Definisi event — semuanya memakai parameter paket aktif (nada pentatonik → selalu enak didengar). */
const EV = {
  click: (s) => { s.tap(0); s.note(s.step(), 0, 0.09, { gain: 0.09, to: 0.82 }); },
  hover: (s) => { s.note(11, 0, 0.04, { gain: 0.028, jit: true }); },
  focus: (s) => { s.note(9, 0, 0.06, { gain: 0.04 }); },
  toggleOn: (s) => { s.note(5, 0, 0.09, { gain: 0.09 }); s.note(9, 0.07, 0.14, { gain: 0.09 }); },
  toggleOff: (s) => { s.note(9, 0, 0.09, { gain: 0.08 }); s.note(5, 0.07, 0.14, { gain: 0.08 }); },
  tab: (s) => { const n = s.step(1); s.tap(0, 0.7); s.note(n, 0, 0.07, { gain: 0.08 }); s.note(n + 2, 0.045, 0.09, { gain: 0.07 }); },
  open: (s) => { s.noise(0, 0.16, { freq: 500, to: 3200, q: 1.2, gain: 0.04, wet: 0.1 }); s.note(5, 0, 0.12, { gain: 0.08 }); s.note(10, 0.08, 0.2, { gain: 0.08 }); },
  close: (s) => { s.noise(0, 0.14, { freq: 3200, to: 500, q: 1.2, gain: 0.035 }); s.note(10, 0, 0.1, { gain: 0.07 }); s.note(5, 0.07, 0.16, { gain: 0.07 }); },
  nav: (s) => { s.noise(0, 0.22, { freq: 700, to: 4200, q: 0.9, gain: 0.05, wet: 0.15 }); s.note(6, 0.08, 0.12, { gain: 0.05 }); },
  key: (s) => { s.tap(0, 0.55); s.note(12 + Math.floor(Math.random() * 3), 0, 0.03, { gain: 0.03, jit: true }); },
  send: (s) => { s.noise(0, 0.12, { freq: 900, to: 3800, q: 1, gain: 0.04 }); s.note(7, 0, 0.1, { gain: 0.09 }); s.note(12, 0.07, 0.2, { gain: 0.09 }); },
  receive: (s) => { s.note(9, 0, 0.14, { gain: 0.1 }); s.note(14, 0.1, 0.26, { gain: 0.1 }); },
  copy: (s) => { s.tap(0, 0.8); s.note(9, 0, 0.06, { gain: 0.08 }); s.note(12, 0.05, 0.1, { gain: 0.08 }); },
  done: (s) => { s.note(5, 0, 0.1, { gain: 0.09 }); s.note(7, 0.08, 0.1, { gain: 0.09 }); s.note(10, 0.16, 0.3, { gain: 0.1 }); },
  error: (s) => { s.note(4, 0, 0.14, { gain: 0.09, to: 0.9 }); s.note(2, 0.13, 0.26, { gain: 0.09, to: 0.85 }); },
  delete: (s) => { s.noise(0, 0.2, { freq: 3000, to: 300, q: 0.9, gain: 0.05 }); s.note(3, 0, 0.18, { gain: 0.08, to: 0.6 }); },
  notify: (s) => { s.note(9, 0, 0.12, { gain: 0.09 }); s.note(12, 0.12, 0.12, { gain: 0.09 }); s.note(16, 0.24, 0.32, { gain: 0.1 }); },
};

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
