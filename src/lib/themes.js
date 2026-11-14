/**
 * NEXUS Theme Engine
 * - 17 preset (gelap & terang) + override warna bebas
 * - Bentuk (radius, blur, gaya kartu), efek (partikel, blob, grid, spotlight, tilt),
 *   tipografi (font, skala), animasi (kecepatan / mati), kepadatan, ukuran kartu
 * - Semua jadi CSS variable / data-attribute di <html>, disimpan di localStorage
 */

/* ---------- helper warna ---------- */
const clamp = (n, a = 0, b = 255) => Math.min(b, Math.max(a, n));

export function hexToRgb(hex) {
  let h = String(hex || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return null;
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
export const rgbToHex = ([r, g, b]) =>
  '#' + [r, g, b].map((v) => Math.round(clamp(v)).toString(16).padStart(2, '0')).join('');
export function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  if (!A || !B) return a;
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}
export function rgba(hex, alpha) {
  const c = hexToRgb(hex) || [0, 0, 0];
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}
export function luminance(hex) {
  const c = hexToRgb(hex) || [0, 0, 0];
  const f = (v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
}
export const isLight = (hex) => luminance(hex) > 0.4;
export const readableOn = (bg) => (luminance(bg) > 0.42 ? '#0b1220' : '#ffffff');

export function hsl(h, s, l) {
  s /= 100;
  l /= 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return rgbToHex([f(0) * 255, f(8) * 255, f(4) * 255]);
}

/* ---------- preset ---------- */
const P = (id, name, a1, a2, a3, bg1, bg2, extra = {}) => ({
  id,
  name,
  colors: { a1, a2, a3, bg1, bg2, ...extra },
});

export const PRESETS = [
  P('stealth', 'Stealth', '#0284c7', '#38bdf8', '#6366f1', '#07090e', '#0f172a'),
  P('cyberpunk', 'Cyberpunk', '#f43f5e', '#fbbf24', '#d946ef', '#0c0814', '#1e102a'),
  P('matrix', 'Matrix', '#059669', '#10b981', '#34d399', '#030d07', '#091f14'),
  P('crimson', 'Crimson', '#e11d48', '#f43f5e', '#fb7185', '#0f0507', '#240a10'),
  P('ocean', 'Ocean', '#0ea5e9', '#22d3ee', '#3b82f6', '#04121f', '#082f49'),
  P('aurora', 'Aurora', '#10b981', '#22d3ee', '#a78bfa', '#060b17', '#0f2133'),
  P('sunset', 'Sunset', '#f97316', '#fb7185', '#fbbf24', '#160a0c', '#2b1319'),
  P('dracula', 'Dracula', '#bd93f9', '#ff79c6', '#50fa7b', '#191a21', '#282a36', { text: '#f8f8f2', muted: '#a9b0d0' }),
  P('nord', 'Nord', '#5e81ac', '#88c0d0', '#b48ead', '#232831', '#2e3440', { text: '#eceff4', muted: '#a3aec2' }),
  P('forest', 'Forest', '#16a34a', '#86efac', '#a3e635', '#06100a', '#0f2417'),
  P('royal', 'Royal', '#7c3aed', '#c084fc', '#f0abfc', '#0b0716', '#1a1033'),
  P('gold', 'Gold', '#d97706', '#fbbf24', '#fde68a', '#0e0a04', '#231a0a'),
  P('sakura', 'Sakura', '#ec4899', '#f9a8d4', '#c084fc', '#140a12', '#2a1224'),
  P('mono', 'Mono', '#9ca3af', '#e5e7eb', '#6b7280', '#0a0a0a', '#171717'),
  P('snow', 'Snow', '#0284c7', '#0ea5e9', '#6366f1', '#e8eef6', '#ffffff', { text: '#0f172a', muted: '#475569' }),
  P('latte', 'Latte', '#b45309', '#d97706', '#be123c', '#f3e9dc', '#fffaf3', { text: '#2b1d12', muted: '#6b5845' }),
  P('mint', 'Mint', '#059669', '#10b981', '#0891b2', '#e3f6ee', '#ffffff', { text: '#052e22', muted: '#3f6b5b' }),
];

export const FONTS = [
  { id: 'jakarta', name: 'Jakarta', stack: "'Plus Jakarta Sans', system-ui, -apple-system, sans-serif" },
  { id: 'inter', name: 'Inter', stack: "'Inter', system-ui, -apple-system, sans-serif" },
  { id: 'space', name: 'Space Grotesk', stack: "'Space Grotesk', system-ui, sans-serif" },
  { id: 'outfit', name: 'Outfit', stack: "'Outfit', system-ui, sans-serif" },
  { id: 'poppins', name: 'Poppins', stack: "'Poppins', system-ui, sans-serif" },
  { id: 'mono', name: 'Mono', stack: "'JetBrains Mono', ui-monospace, monospace" },
  { id: 'system', name: 'System', stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
];

export const PARTICLES = [
  { id: 'off', label: 'Off' },
  { id: 'rain', label: 'Hujan' },
  { id: 'stars', label: 'Bintang' },
  { id: 'snow', label: 'Salju' },
  { id: 'fireflies', label: 'Kunang' },
  { id: 'matrix', label: 'Matrix' },
];

export const CARD_STYLES = [
  { id: 'glass', label: 'Glass' },
  { id: 'solid', label: 'Solid' },
  { id: 'outline', label: 'Outline' },
  { id: 'neon', label: 'Neon' },
];

export const COLOR_KEYS = [
  { key: 'a1', label: 'Aksen 1' },
  { key: 'a2', label: 'Aksen 2' },
  { key: 'a3', label: 'Aksen 3' },
  { key: 'bg1', label: 'Latar' },
  { key: 'bg2', label: 'Latar 2' },
  { key: 'text', label: 'Teks' },
  { key: 'muted', label: 'Teks redup' },
];

/* ---------- konfigurasi ---------- */
export const DEFAULT_CONFIG = {
  theme: 'stealth',
  custom: {},
  radius: 24,
  blur: 26,
  glass: 0.75,
  border: 0.12,
  card: 'glass',
  density: 'normal', // compact | normal | spacious
  cardSize: 'm', // s | m | l
  particle: 'rain',
  blobs: true,
  blobIntensity: 0.35,
  grid: false,
  spotlight: true,
  tilt: true,
  anim: 'on', // on | off
  speed: 1,
  font: 'jakarta',
  fontScale: 100,
  soundEnabled: true,
};

export const STORAGE_KEY = 'nexus_theme_config_v2';
export const BOOT_KEY = 'nexus_theme_boot';

export function sanitizeConfig(raw) {
  const c = { ...DEFAULT_CONFIG, ...(raw && typeof raw === 'object' ? raw : {}) };
  if (!PRESETS.some((p) => p.id === c.theme)) c.theme = DEFAULT_CONFIG.theme;
  if (!FONTS.some((f) => f.id === c.font)) c.font = DEFAULT_CONFIG.font;
  if (!PARTICLES.some((p) => p.id === c.particle)) c.particle = DEFAULT_CONFIG.particle;
  if (!CARD_STYLES.some((s) => s.id === c.card)) c.card = DEFAULT_CONFIG.card;
  if (!['compact', 'normal', 'spacious'].includes(c.density)) c.density = 'normal';
  if (!['s', 'm', 'l'].includes(c.cardSize)) c.cardSize = 'm';
  c.anim = c.anim === 'off' ? 'off' : 'on';
  const num = (v, min, max, d) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : d);
  c.radius = num(c.radius, 0, 40, 24);
  c.blur = num(c.blur, 0, 50, 26);
  c.glass = num(c.glass, 0.1, 1, 0.75);
  c.border = num(c.border, 0, 0.6, 0.12);
  c.blobIntensity = num(c.blobIntensity, 0, 0.7, 0.35);
  c.speed = num(c.speed, 0.5, 2, 1);
  c.fontScale = num(c.fontScale, 85, 120, 100);
  c.blobs = !!c.blobs;
  c.grid = !!c.grid;
  c.spotlight = !!c.spotlight;
  c.tilt = !!c.tilt;
  c.soundEnabled = c.soundEnabled !== false;
  const custom = {};
  if (c.custom && typeof c.custom === 'object') {
    COLOR_KEYS.forEach(({ key }) => {
      if (hexToRgb(c.custom[key])) custom[key] = c.custom[key];
    });
  }
  c.custom = custom;
  return c;
}

export function getPreset(id) {
  return PRESETS.find((p) => p.id === id) || PRESETS[0];
}

/** Warna final (preset + override) */
export function resolveColors(cfg) {
  const preset = getPreset(cfg.theme);
  const base = preset.colors;
  const c = { ...base, ...cfg.custom };
  const light = isLight(c.bg1);
  const presetLight = isLight(base.bg1);
  const dText = light ? '#0f172a' : '#f8fafc';
  const dMuted = light ? '#475569' : '#94a3b8';
  c.text = cfg.custom.text || (light === presetLight ? base.text || dText : dText);
  c.muted = cfg.custom.muted || (light === presetLight ? base.muted || dMuted : dMuted);
  c.light = light;
  return c;
}

const DENSITY = { compact: 0.8, normal: 1, spacious: 1.25 };
const CARD_MIN = { s: '240px', m: '300px', l: '380px' };

export function computeTheme(input) {
  const cfg = sanitizeConfig(input);
  const c = resolveColors(cfg);
  const font = FONTS.find((f) => f.id === cfg.font) || FONTS[0];
  const surface = mix(c.bg1, c.bg2, 0.6);

  const vars = {
    '--a1': c.a1,
    '--a2': c.a2,
    '--a3': c.a3,
    '--bg1': c.bg1,
    '--bg2': c.bg2,
    '--text': c.text,
    '--muted': c.muted,
    '--on-accent': readableOn(mix(c.a1, c.a3, 0.5)),
    '--glass': rgba(c.bg2, cfg.glass),
    '--glass-strong': rgba(mix(c.bg2, c.text, 0.08), Math.min(0.96, cfg.glass + 0.1)),
    '--border': rgba(c.text, cfg.border),
    '--border-glow': rgba(c.a2, 0.38),
    '--surface': surface,
    '--surface-2': mix(c.bg2, c.text, 0.07),
    '--surface-3': mix(c.bg2, c.text, 0.16),
    '--dock-bg': rgba(mix(c.bg1, c.bg2, 0.5), 0.94),
    '--dock-border': rgba(c.text, Math.max(0.1, cfg.border + 0.02)),
    '--shadow-c': c.light ? '#334155' : '#000000',
    '--blur': `${cfg.blur}px`,
    '--radius': `${cfg.radius}px`,
    '--font': font.stack,
    '--font-scale': String(cfg.fontScale / 100),
    '--speed': String(cfg.anim === 'off' ? 1000 : cfg.speed),
    '--blob-opacity': String(cfg.blobs ? cfg.blobIntensity : 0),
    '--space': String(DENSITY[cfg.density]),
    '--card-min': CARD_MIN[cfg.cardSize],
  };

  const attrs = {
    'data-theme': cfg.theme,
    'data-mode': c.light ? 'light' : 'dark',
    'data-card': cfg.card,
    'data-density': cfg.density,
    'data-anim': cfg.anim,
    'data-grid': cfg.grid ? 'on' : 'off',
  };

  return { cfg, colors: c, vars, attrs };
}

export function applyConfig(input) {
  if (typeof document === 'undefined') return null;
  const t = computeTheme(input);
  const root = document.documentElement;
  Object.entries(t.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  Object.entries(t.attrs).forEach(([k, v]) => root.setAttribute(k, v));
  root.style.colorScheme = t.attrs['data-mode'];
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t.colors.bg1);
  try {
    localStorage.setItem(BOOT_KEY, JSON.stringify({ vars: t.vars, attrs: t.attrs }));
  } catch {}
  return t;
}

export function loadConfig() {
  if (typeof window === 'undefined') return { ...DEFAULT_CONFIG };
  try {
    const v2 = localStorage.getItem(STORAGE_KEY);
    if (v2) return sanitizeConfig(JSON.parse(v2));
    const old = localStorage.getItem('nexus_theme_config'); // migrasi versi lama
    if (old) return sanitizeConfig(JSON.parse(old));
  } catch {}
  return { ...DEFAULT_CONFIG };
}

export function saveConfig(cfg) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg));
  } catch {}
}

/** Palet acak dari satu hue (gelap atau terang) */
export function randomPalette(lightMode = false) {
  const h = Math.floor(Math.random() * 360);
  if (lightMode) {
    return {
      a1: hsl(h, 70, 40),
      a2: hsl((h + 20) % 360, 80, 48),
      a3: hsl((h + 150) % 360, 70, 50),
      bg1: hsl(h, 40, 94),
      bg2: '#ffffff',
      text: hsl(h, 40, 10),
      muted: hsl(h, 20, 36),
    };
  }
  return {
    a1: hsl(h, 75, 45),
    a2: hsl((h + 25) % 360, 90, 62),
    a3: hsl((h + 150) % 360, 75, 62),
    bg1: hsl(h, 45, 5),
    bg2: hsl(h, 38, 11),
  };
}

/** Script kecil di <head> supaya tema tersimpan langsung terpasang sebelum paint */
export const THEME_BOOT_SCRIPT = `(function(){try{var d=JSON.parse(localStorage.getItem('${BOOT_KEY}')||'null');if(!d)return;var r=document.documentElement;for(var k in d.vars)r.style.setProperty(k,d.vars[k]);for(var a in d.attrs)r.setAttribute(a,d.attrs[a]);r.style.colorScheme=d.attrs['data-mode'];}catch(e){}})();`;
