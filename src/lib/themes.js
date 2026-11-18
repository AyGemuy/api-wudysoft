/**
 * WUDYSOFT Theme Engine
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
  // Tema bawaan: bahasa visual Fluent (biru #0078D4, permukaan netral, sudut halus)
  P('fluent', 'Fluent Dark', '#0078d4', '#4cc2ff', '#8764b8', '#0b0d11', '#16191f', { text: '#f3f2f1', muted: '#a19f9d' }),
  P('fluentlight', 'Fluent Light', '#0f6cbd', '#0078d4', '#8764b8', '#f3f2f1', '#ffffff', { text: '#201f1e', muted: '#605e5c' }),
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

const GF = (family, weights) => `${family.replace(/ /g, '+')}${weights ? `:wght@${weights}` : ''}`;
const F = (id, name, cat, family, weights, fallback) => ({
  id, name, cat, family, gf: GF(family, weights),
  stack: `'${family}', ${fallback}`,
});
const SANS = 'system-ui, -apple-system, sans-serif';
const SERIF = "Georgia, 'Times New Roman', serif";
const MONO = 'ui-monospace, monospace';

export const FONT_CATS = [
  { id: 'sans', label: 'Sans' },
  { id: 'display', label: 'Display' },
  { id: 'serif', label: 'Serif' },
  { id: 'mono', label: 'Mono' },
  { id: 'fun', label: 'Fun' },
];

export const FONTS = [
  // sans modern
  F('jakarta', 'Plus Jakarta', 'sans', 'Plus Jakarta Sans', '400;500;600;700;800', SANS),
  F('inter', 'Inter', 'sans', 'Inter', '400;500;600;700;800', SANS),
  F('manrope', 'Manrope', 'sans', 'Manrope', '400;500;600;700;800', SANS),
  F('dmsans', 'DM Sans', 'sans', 'DM Sans', '400;500;600;700', SANS),
  F('sora', 'Sora', 'sans', 'Sora', '400;500;600;700;800', SANS),
  F('outfit', 'Outfit', 'sans', 'Outfit', '400;500;600;700;800', SANS),
  F('lexend', 'Lexend', 'sans', 'Lexend', '400;500;600;700', SANS),
  F('urbanist', 'Urbanist', 'sans', 'Urbanist', '400;500;600;700;800', SANS),
  F('figtree', 'Figtree', 'sans', 'Figtree', '400;500;600;700;800', SANS),
  F('bricolage', 'Bricolage', 'sans', 'Bricolage Grotesque', '400;500;600;700;800', SANS),
  F('space', 'Space Grotesk', 'sans', 'Space Grotesk', '400;500;600;700', SANS),
  F('poppins', 'Poppins', 'sans', 'Poppins', '400;500;600;700;800', SANS),
  F('ibmplex', 'IBM Plex Sans', 'sans', 'IBM Plex Sans', '400;500;600;700', SANS),
  { id: 'segoe', name: 'Segoe UI', cat: 'sans', family: 'Open Sans', gf: GF('Open Sans', '400;500;600;700;800'), stack: "'Segoe UI Variable Text', 'Segoe UI', 'Selawik', 'Open Sans', system-ui, -apple-system, sans-serif" },
  { id: 'system', name: 'System UI', cat: 'sans', family: null, gf: null, stack: "system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif" },
  // display / cyber
  F('orbitron', 'Orbitron', 'display', 'Orbitron', '400;500;600;700;800', SANS),
  F('rajdhani', 'Rajdhani', 'display', 'Rajdhani', '400;500;600;700', SANS),
  F('exo2', 'Exo 2', 'display', 'Exo 2', '400;500;600;700;800', SANS),
  F('syne', 'Syne', 'display', 'Syne', '400;500;600;700;800', SANS),
  F('unbounded', 'Unbounded', 'display', 'Unbounded', '400;500;600;700;800', SANS),
  F('audiowide', 'Audiowide', 'display', 'Audiowide', '', SANS),
  F('righteous', 'Righteous', 'display', 'Righteous', '', SANS),
  F('pressstart', 'Press Start 2P', 'display', 'Press Start 2P', '', MONO),
  // serif
  F('fraunces', 'Fraunces', 'serif', 'Fraunces', '400;500;600;700;800', SERIF),
  F('playfair', 'Playfair Display', 'serif', 'Playfair Display', '400;500;600;700;800', SERIF),
  F('lora', 'Lora', 'serif', 'Lora', '400;500;600;700', SERIF),
  F('dmserif', 'DM Serif Display', 'serif', 'DM Serif Display', '', SERIF),
  // mono
  F('jetbrains', 'JetBrains Mono', 'mono', 'JetBrains Mono', '400;600', MONO),
  F('firacode', 'Fira Code', 'mono', 'Fira Code', '400;600', MONO),
  F('spacemono', 'Space Mono', 'mono', 'Space Mono', '400;700', MONO),
  F('ibmplexmono', 'IBM Plex Mono', 'mono', 'IBM Plex Mono', '400;600', MONO),
  F('sourcecode', 'Source Code Pro', 'mono', 'Source Code Pro', '400;600', MONO),
  // fun
  F('caveat', 'Caveat', 'fun', 'Caveat', '400;500;600;700', 'cursive'),
  F('pacifico', 'Pacifico', 'fun', 'Pacifico', '', 'cursive'),
  F('kalam', 'Kalam', 'fun', 'Kalam', '400;700', 'cursive'),
];

const DEFAULT_LOADED = new Set(['jakarta', 'jetbrains', 'segoe']); // sudah dimuat di _document.js
export const getFont = (id) => FONTS.find((f) => f.id === id) || FONTS[0];

/** URL Google Fonts hanya untuk font terpilih yang belum dimuat default. */
export function fontHref(cfg) {
  const ids = [cfg.font, cfg.fontHeading !== 'same' ? cfg.fontHeading : null, cfg.fontMono].filter(Boolean);
  const fam = [...new Set(ids)].filter((id) => !DEFAULT_LOADED.has(id)).map(getFont).filter((f) => f.gf);
  if (!fam.length) return '';
  return `https://fonts.googleapis.com/css2?${fam.map((f) => `family=${f.gf}`).join('&')}&display=swap`;
}

/** Subset kecil (hanya "Aa") untuk pratinjau semua font di Studio. */
export function fontPreviewHref(cat) {
  const fam = FONTS.filter((f) => f.gf && (!cat || f.cat === cat)).map((f) => `family=${f.family.replace(/ /g, '+')}`);
  return fam.length ? `https://fonts.googleapis.com/css2?${fam.join('&')}&text=AaBbCc123&display=swap` : '';
}

export const GRADIENTS = [
  { id: 'aurora', name: 'Aurora', css: 'radial-gradient(60% 55% at 15% 10%, rgba(34,211,238,.45), transparent 70%), radial-gradient(50% 50% at 88% 18%, rgba(167,139,250,.42), transparent 70%), radial-gradient(65% 60% at 50% 105%, rgba(16,185,129,.38), transparent 70%)' },
  { id: 'sunset', name: 'Sunset', css: 'radial-gradient(60% 55% at 85% 10%, rgba(251,113,133,.5), transparent 70%), radial-gradient(60% 60% at 10% 90%, rgba(249,115,22,.42), transparent 70%), radial-gradient(50% 50% at 50% 50%, rgba(251,191,36,.18), transparent 70%)' },
  { id: 'ocean', name: 'Ocean', css: 'radial-gradient(70% 60% at 50% 0%, rgba(14,165,233,.5), transparent 70%), radial-gradient(60% 60% at 0% 100%, rgba(59,130,246,.4), transparent 70%), radial-gradient(50% 50% at 100% 80%, rgba(34,211,238,.28), transparent 70%)' },
  { id: 'neon', name: 'Neon', css: 'radial-gradient(55% 55% at 10% 20%, rgba(217,70,239,.5), transparent 70%), radial-gradient(55% 55% at 90% 80%, rgba(34,211,238,.45), transparent 70%), radial-gradient(40% 40% at 60% 30%, rgba(251,191,36,.2), transparent 70%)' },
  { id: 'forest', name: 'Forest', css: 'radial-gradient(60% 60% at 20% 80%, rgba(22,163,74,.45), transparent 70%), radial-gradient(55% 55% at 85% 15%, rgba(163,230,53,.3), transparent 70%)' },
  { id: 'rose', name: 'Rose', css: 'radial-gradient(60% 60% at 80% 15%, rgba(244,63,94,.45), transparent 70%), radial-gradient(60% 60% at 15% 85%, rgba(192,132,252,.4), transparent 70%)' },
  { id: 'mesh', name: 'Mesh', css: 'radial-gradient(40% 40% at 20% 20%, rgba(99,102,241,.5), transparent 70%), radial-gradient(40% 40% at 80% 25%, rgba(236,72,153,.4), transparent 70%), radial-gradient(45% 45% at 30% 85%, rgba(34,211,238,.4), transparent 70%), radial-gradient(40% 40% at 85% 85%, rgba(250,204,21,.28), transparent 70%)' },
  { id: 'dusk', name: 'Dusk', css: 'linear-gradient(160deg, rgba(76,29,149,.55) 0%, rgba(30,64,175,.35) 50%, rgba(2,6,23,0) 100%)' },
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
export const RADIUS_PRESETS = [
  { id: 'sharp', label: 'Tajam', v: { radius: 6, rBtn: 6, rInput: 6, rChip: 6, rDockTop: 10, rDockBottom: 10, rDockBtn: 8, rModal: 8 } },
  { id: 'soft', label: 'Lembut', v: { radius: 24, rBtn: 14, rInput: 14, rChip: 60, rDockTop: 40, rDockBottom: 40, rDockBtn: 60, rModal: 24 } },
  { id: 'round', label: 'Bulat', v: { radius: 32, rBtn: 60, rInput: 24, rChip: 60, rDockTop: 48, rDockBottom: 48, rDockBtn: 60, rModal: 32 } },
];

export const DEFAULT_CONFIG = {
  theme: 'fluent',
  custom: {},
  // bentuk (60 = pill) — sudut halus ala Fluent
  radius: 10, // kartu
  rBtn: 6,
  rInput: 6,
  rChip: 6,
  rDockTop: 14, // header & navbar melayang: sudut atas
  rDockBottom: 14, // sudut bawah
  rDockBtn: 8, // ikon di dalam dock
  rModal: 12,
  blur: 28,
  glass: 0.75,
  border: 0.12,
  card: 'glass',
  density: 'normal', // compact | normal | spacious
  cardSize: 'm', // s | m | l
  // efek latar
  particle: 'off',
  blobs: true,
  blobIntensity: 0.22,
  grid: false,
  spotlight: false,
  // animasi
  anim: 'on', // master on | off
  speed: 1,
  animPage: 'auto', // auto | slide | fade | zoom | blur | slideX | rise | flip | drop | skew | none
  animEntrance: true,
  animHover: 'tilt', // lift | tilt | glow | none
  animPreview: true,
  animBlobs: true,
  animBtn: true,
  animSplash: true,
  animBar: true,
  // latar kustom
  bgType: 'none', // none | gradient | link | upload
  bgGradient: 'aurora',
  bgUrl: '',
  bgFit: 'cover', // cover | contain | repeat
  bgPos: 'center', // center | top | bottom
  bgBlur: 0,
  bgDim: 0.45,
  // teks
  font: 'segoe',
  fontHeading: 'same',
  fontMono: 'jetbrains',
  fontScale: 100,
  soundEnabled: true,
};

export const STORAGE_KEY = 'wudysoft_theme_config_v2';
export const BOOT_KEY = 'wudysoft_theme_boot';

const FONT_ALIASES = { mono: 'jetbrains' };

export function sanitizeConfig(raw) {
  const r = raw && typeof raw === 'object' ? raw : {};
  const c = { ...DEFAULT_CONFIG, ...r };
  const pick = (v, list, d) => (list.includes(v) ? v : d);
  const num = (v, min, max, d) => (Number.isFinite(Number(v)) ? Math.min(max, Math.max(min, Number(v))) : d);
  const bool = (v, d) => (typeof v === 'boolean' ? v : d);

  if (!PRESETS.some((p) => p.id === c.theme)) c.theme = DEFAULT_CONFIG.theme;
  c.font = FONT_ALIASES[c.font] || c.font;
  c.fontMono = FONT_ALIASES[c.fontMono] || c.fontMono;
  if (!FONTS.some((f) => f.id === c.font)) c.font = DEFAULT_CONFIG.font;
  if (c.fontHeading !== 'same' && !FONTS.some((f) => f.id === c.fontHeading)) c.fontHeading = 'same';
  if (!FONTS.some((f) => f.id === c.fontMono && f.cat === 'mono')) c.fontMono = DEFAULT_CONFIG.fontMono;
  if (!PARTICLES.some((p) => p.id === c.particle)) c.particle = DEFAULT_CONFIG.particle;
  if (!CARD_STYLES.some((x) => x.id === c.card)) c.card = DEFAULT_CONFIG.card;
  c.density = pick(c.density, ['compact', 'normal', 'spacious'], 'normal');
  c.cardSize = pick(c.cardSize, ['s', 'm', 'l'], 'm');
  c.anim = c.anim === 'off' ? 'off' : 'on';
  c.animPage = pick(c.animPage, ['auto', 'slide', 'fade', 'zoom', 'blur', 'slideX', 'rise', 'flip', 'drop', 'skew', 'none'], 'auto');
  // migrasi: `tilt` (boolean) → animHover
  c.animHover = pick(r.animHover !== undefined ? c.animHover : r.tilt === false ? 'lift' : 'tilt', ['lift', 'tilt', 'glow', 'none'], 'tilt');
  ['animEntrance', 'animPreview', 'animBlobs', 'animBtn', 'animSplash', 'animBar'].forEach((k) => { c[k] = bool(c[k], DEFAULT_CONFIG[k]); });

  ['radius', 'rBtn', 'rInput', 'rChip', 'rDockTop', 'rDockBottom', 'rDockBtn', 'rModal'].forEach((k) => { c[k] = Math.round(num(c[k], 0, 60, DEFAULT_CONFIG[k])); });
  c.blur = num(c.blur, 0, 50, 26);
  c.glass = num(c.glass, 0.1, 1, 0.75);
  c.border = num(c.border, 0, 0.6, 0.12);
  c.blobIntensity = num(c.blobIntensity, 0, 0.7, 0.35);
  c.speed = num(c.speed, 0.5, 2, 1);
  c.fontScale = num(c.fontScale, 85, 120, 100);
  c.blobs = !!c.blobs;
  c.grid = !!c.grid;
  c.spotlight = !!c.spotlight;
  c.soundEnabled = c.soundEnabled !== false;

  c.bgType = pick(c.bgType, ['none', 'gradient', 'link', 'upload'], 'none');
  if (!GRADIENTS.some((g) => g.id === c.bgGradient)) c.bgGradient = DEFAULT_CONFIG.bgGradient;
  c.bgUrl = typeof c.bgUrl === 'string' && /^https?:\/\//i.test(c.bgUrl.trim()) ? c.bgUrl.trim().slice(0, 2000) : '';
  c.bgFit = pick(c.bgFit, ['cover', 'contain', 'repeat'], 'cover');
  c.bgPos = pick(c.bgPos, ['center', 'top', 'bottom'], 'center');
  c.bgBlur = num(c.bgBlur, 0, 24, 0);
  c.bgDim = num(c.bgDim, 0, 0.9, 0.45);

  const custom = {};
  if (c.custom && typeof c.custom === 'object') {
    COLOR_KEYS.forEach(({ key }) => {
      if (hexToRgb(c.custom[key])) custom[key] = c.custom[key];
    });
  }
  c.custom = custom;
  delete c.tilt;
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
const rad = (v) => (v >= 60 ? '999px' : `${v}px`);

export function computeTheme(input) {
  const cfg = sanitizeConfig(input);
  const c = resolveColors(cfg);
  const body = getFont(cfg.font);
  const heading = cfg.fontHeading === 'same' ? body : getFont(cfg.fontHeading);
  const mono = getFont(cfg.fontMono);
  const surface = mix(c.bg1, c.bg2, 0.6);
  const grad = GRADIENTS.find((g) => g.id === cfg.bgGradient)?.css || 'none';

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
    '--radius': rad(cfg.radius),
    '--r-btn': rad(cfg.rBtn),
    '--r-input': rad(cfg.rInput),
    '--r-chip': rad(cfg.rChip),
    '--r-dock-top': rad(cfg.rDockTop),
    '--r-dock-bottom': rad(cfg.rDockBottom),
    '--r-dock-btn': rad(cfg.rDockBtn),
    '--r-modal': rad(cfg.rModal),
    '--dock-radius': `${rad(cfg.rDockTop)} ${rad(cfg.rDockTop)} ${rad(cfg.rDockBottom)} ${rad(cfg.rDockBottom)}`,
    '--font': body.stack,
    '--font-heading': heading.stack,
    '--font-mono': mono.stack,
    '--font-scale': String(cfg.fontScale / 100),
    '--speed': String(cfg.anim === 'off' ? 1000 : cfg.speed),
    '--blob-opacity': String(cfg.blobs ? cfg.blobIntensity : 0),
    '--space': String(DENSITY[cfg.density]),
    '--card-min': CARD_MIN[cfg.cardSize],
    '--bg-gradient': cfg.bgType === 'gradient' ? grad : 'none',
  };

  const off = cfg.anim === 'off';
  const attrs = {
    'data-theme': cfg.theme,
    'data-mode': c.light ? 'light' : 'dark',
    'data-card': cfg.card,
    'data-density': cfg.density,
    'data-anim': cfg.anim,
    'data-grid': cfg.grid ? 'on' : 'off',
    'data-hover': off ? 'none' : cfg.animHover,
    'data-page': off ? 'none' : cfg.animPage,
    'data-anim-preview': cfg.animPreview ? 'on' : 'off',
    'data-anim-blobs': cfg.animBlobs ? 'on' : 'off',
    'data-anim-btn': cfg.animBtn ? 'on' : 'off',
    'data-splash': cfg.animSplash ? 'on' : 'off',
    'data-bar': cfg.animBar ? 'on' : 'off',
  };

  return { cfg, colors: c, vars, attrs, fontHref: fontHref(cfg) };
}

function ensureFontLink(href) {
  let el = document.getElementById('wudysoft-fonts');
  if (!href) { el?.remove(); return; }
  if (!el) {
    el = document.createElement('link');
    el.id = 'wudysoft-fonts';
    el.rel = 'stylesheet';
    document.head.appendChild(el);
  }
  if (el.getAttribute('href') !== href) el.setAttribute('href', href);
}

export function applyConfig(input) {
  if (typeof document === 'undefined') return null;
  const t = computeTheme(input);
  const root = document.documentElement;
  Object.entries(t.vars).forEach(([k, v]) => root.style.setProperty(k, v));
  Object.entries(t.attrs).forEach(([k, v]) => root.setAttribute(k, v));
  root.style.colorScheme = t.attrs['data-mode'];
  ensureFontLink(t.fontHref);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute('content', t.colors.bg1);
  try {
    localStorage.setItem(BOOT_KEY, JSON.stringify({ vars: t.vars, attrs: t.attrs, font: t.fontHref }));
  } catch {}
  return t;
}

export function loadConfig() {
  if (typeof window === 'undefined') return { ...DEFAULT_CONFIG };
  try {
    const v2 = localStorage.getItem(STORAGE_KEY);
    if (v2) return sanitizeConfig(JSON.parse(v2));
    const old = localStorage.getItem('wudysoft_theme_config'); // migrasi versi lama
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
export const THEME_BOOT_SCRIPT = `(function(){try{var d=JSON.parse(localStorage.getItem('${BOOT_KEY}')||'null');if(!d)return;var r=document.documentElement;for(var k in d.vars)r.style.setProperty(k,d.vars[k]);for(var a in d.attrs)r.setAttribute(a,d.attrs[a]);r.style.colorScheme=d.attrs['data-mode'];if(d.font){var l=document.createElement('link');l.id='wudysoft-fonts';l.rel='stylesheet';l.href=d.font;document.head.appendChild(l);}}catch(e){}})();`;
