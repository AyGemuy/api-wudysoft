/**
 * Pengaturan audio (disimpan di localStorage) + pemutar BGM dari link YouTube.
 * Hanya dijalankan di browser. BGM memakai YouTube IFrame API (pemutar tersembunyi) sehingga
 * cukup menempel link video/playlist; tidak ada file audio yang di-host sendiri.
 */
import site from '@/configs/siteConfig';

const KEY = 'wd_audio_v1';
export const CUES = [
  { id: 'welcome', label: 'Selamat datang', hint: 'Saat pertama membuka situs' },
  { id: 'success', label: 'Berhasil masuk', hint: 'Login / daftar sukses' },
  { id: 'fail', label: 'Gagal masuk', hint: 'Login / daftar gagal' },
  { id: 'logout', label: 'Keluar', hint: 'Saat logout' },
  { id: 'notfound', label: 'Halaman 404', hint: 'Halaman tidak ditemukan' },
];

const DEFAULTS = {
  bgmUrl: site.DEFAULT_BGM_URL || '',
  bgmOn: !!site.DEFAULT_BGM_URL, // musik bawaan menyala (setelah interaksi pertama) sampai pengunjung mematikannya
  bgmVol: 0.35,
  sfxVol: 0.8,
  cues: Object.fromEntries(CUES.map((c) => [c.id, true])),
  pack: 'pop', // paket suara interaksi (lihat PACKS di interactiveEffects)
  events: {}, // kategori interaksi yang dimatikan/dinyalakan manual; kosong = bawaan
};

const listeners = new Set();
let state = null;
const clamp = (n, a = 0, b = 1) => Math.min(b, Math.max(a, Number.isFinite(+n) ? +n : a));

function loadSettings() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch {}
  return {
    bgmUrl: typeof saved.bgmUrl === 'string' ? saved.bgmUrl.slice(0, 300) : DEFAULTS.bgmUrl,
    bgmOn: typeof saved.bgmOn === 'boolean' ? saved.bgmOn : DEFAULTS.bgmOn,
    bgmVol: clamp(saved.bgmVol ?? DEFAULTS.bgmVol),
    sfxVol: clamp(saved.sfxVol ?? DEFAULTS.sfxVol),
    cues: { ...DEFAULTS.cues, ...(saved.cues || {}) },
    pack: typeof saved.pack === 'string' ? saved.pack.slice(0, 20) : DEFAULTS.pack,
    events: saved.events && typeof saved.events === 'object' ? saved.events : {},
  };
}

export const audioStore = {
  get() {
    if (typeof window === 'undefined') return DEFAULTS;
    return (state ||= loadSettings());
  },
  set(patch) {
    if (typeof window === 'undefined') return;
    state = { ...this.get(), ...patch };
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    listeners.forEach((fn) => fn(state));
  },
  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};

/* ---------------------------- parser link YouTube ---------------------------- */
const ID_RE = /^[\w-]{11}$/;
export function parseYouTube(input) {
  const raw = String(input || '').trim();
  if (!raw) return null;
  if (ID_RE.test(raw)) return { type: 'video', id: raw };
  let u;
  try { u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`); } catch { return null; }
  const host = u.hostname.replace(/^(www|m|music)\./, '');
  const list = u.searchParams.get('list');
  let id = null;
  if (host === 'youtu.be') id = u.pathname.split('/')[1];
  else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (u.pathname === '/watch') id = u.searchParams.get('v');
    else {
      const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{11})/);
      if (m) id = m[2];
      if (u.pathname === '/playlist' && list) return { type: 'playlist', id: list };
    }
  } else return null;
  if (id && ID_RE.test(id)) return list && /^(PL|OL|UU|FL|RD)/.test(list) && !u.searchParams.get('v') ? { type: 'playlist', id: list } : { type: 'video', id, list: list || undefined };
  if (list) return { type: 'playlist', id: list };
  return null;
}

/* --------------------------------- BGM --------------------------------- */
const ERR = {
  2: 'Link tidak valid.',
  5: 'Video tidak bisa diputar di pemutar ini.',
  100: 'Video tidak ditemukan atau privat.',
  101: 'Pemilik video tidak mengizinkan diputar di situs lain.',
  150: 'Pemilik video tidak mengizinkan diputar di situs lain.',
};

const bgmListeners = new Set();
let bgmState = { status: 'idle', title: '', error: '' }; // idle | loading | playing | paused | error
let player = null;
let apiPromise = null;
let loadedKey = '';
let host = null;

const setBgm = (patch) => {
  bgmState = { ...bgmState, ...patch };
  bgmListeners.forEach((fn) => fn(bgmState));
};

function loadApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  return (apiPromise ||= new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => { prev?.(); resolve(window.YT); };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    s.async = true;
    s.onerror = () => { apiPromise = null; reject(new Error('Gagal memuat pemutar YouTube. Periksa koneksi.')); };
    document.head.appendChild(s);
  }));
}

function ensureHost() {
  if (host && document.body.contains(host)) return host;
  host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  host.style.cssText = 'position:fixed;right:0;bottom:0;width:2px;height:2px;opacity:0.01;pointer-events:none;overflow:hidden;z-index:-1';
  const inner = document.createElement('div');
  host.appendChild(inner);
  document.body.appendChild(host);
  return host;
}

function applyVolume() {
  try { player?.setVolume?.(Math.round(audioStore.get().bgmVol * 100)); } catch {}
}

async function load(parsed, autoplay) {
  const YT = await loadApi();
  const key = `${parsed.type}:${parsed.id}`;
  const vars = { autoplay: autoplay ? 1 : 0, controls: 0, playsinline: 1, rel: 0, modestbranding: 1, disablekb: 1, origin: window.location.origin };
  if (!player) {
    await new Promise((resolve) => {
      player = new YT.Player(ensureHost().firstChild, {
        width: '2', height: '2',
        playerVars: { ...vars, ...(parsed.type === 'playlist' ? { listType: 'playlist', list: parsed.id, loop: 1 } : { playlist: parsed.id, loop: 1 }) },
        videoId: parsed.type === 'video' ? parsed.id : undefined,
        events: {
          onReady: () => { applyVolume(); resolve(); },
          onStateChange: (e) => {
            const S = window.YT.PlayerState;
            if (e.data === S.PLAYING) {
              let title = '';
              try { title = player.getVideoData?.().title || ''; } catch {}
              setBgm({ status: 'playing', title, error: '' });
            } else if (e.data === S.PAUSED) setBgm({ status: 'paused' });
            else if (e.data === S.BUFFERING) setBgm({ status: 'loading' });
            else if (e.data === S.ENDED) { try { player.seekTo(0); player.playVideo(); } catch {} } // ulangi
            else if (e.data === S.UNSTARTED && audioStore.get().bgmOn) setBgm({ status: 'loading' });
          },
          onError: (e) => setBgm({ status: 'error', error: ERR[e.data] || 'Gagal memutar BGM.' }),
        },
      });
    });
    loadedKey = key;
    return;
  }
  if (loadedKey !== key) {
    loadedKey = key;
    if (parsed.type === 'playlist') player.loadPlaylist({ listType: 'playlist', list: parsed.id });
    else player.loadVideoById(parsed.id);
    if (!autoplay) player.pauseVideo();
    if (parsed.type === 'playlist') { try { player.setLoop(true); } catch {} }
  } else if (autoplay) player.playVideo();
  applyVolume();
}

export const bgm = {
  get: () => bgmState,
  subscribe(fn) { bgmListeners.add(fn); return () => bgmListeners.delete(fn); },
  /** Sinkronkan pemutar dengan pengaturan. `gesture` = dipanggil dari interaksi pengguna (boleh autoplay). */
  async sync(gesture = false) {
    if (typeof window === 'undefined') return;
    const { bgmOn, bgmUrl } = audioStore.get();
    const parsed = parseYouTube(bgmUrl);
    if (!bgmUrl) { try { player?.stopVideo?.(); } catch {} loadedKey = ''; return setBgm({ status: 'idle', title: '', error: '' }); }
    if (!parsed) return setBgm({ status: 'error', error: 'Link YouTube tidak valid. Contoh: https://youtu.be/dQw4w9WgXcQ' });
    if (!bgmOn) { try { player?.pauseVideo?.(); } catch {} return setBgm({ status: player ? 'paused' : 'idle', error: '' }); }
    if (!gesture && !navigator.userActivation?.hasBeenActive) return setBgm({ status: 'idle', error: '' }); // tunggu interaksi pertama
    setBgm({ status: 'loading', error: '' });
    try { await load(parsed, true); } catch (e) { setBgm({ status: 'error', error: e.message }); }
  },
  setUrl(url) { audioStore.set({ bgmUrl: String(url || '').trim() }); return this.sync(true); },
  setOn(on) { audioStore.set({ bgmOn: !!on }); return this.sync(true); },
  setVolume(v) { audioStore.set({ bgmVol: clamp(v) }); applyVolume(); },
  toggle() { return this.setOn(!audioStore.get().bgmOn); },
};
