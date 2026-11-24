/**
 * WUDYSOFT Theme Engine
 * - 34 preset (gelap & terang) + override warna bebas
 * - Bentuk (radius, blur, gaya kartu), efek (partikel, blob, grid, spotlight, tilt),
 *   tipografi (font, skala), animasi (kecepatan / mati), kepadatan, ukuran kartu
 * - Semua jadi CSS variable / data-attribute di <html>, disimpan di localStorage
 */

import { applyThemeAssets } from './themeAssets';

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
  P('snow', 'Snow', '#0284c7', '#0ea5e9', '#6366f1', '#e8eef6', '#ffffff', { text: '#0f172a', muted: '#475569' }),
  P('fluent', 'Fluent Dark', '#0078d4', '#4cc2ff', '#8764b8', '#0b0d11', '#16191f', { text: '#f3f2f1', muted: '#a19f9d' }),
  P('fluentlight', 'Fluent Light', '#0f6cbd', '#0078d4', '#8764b8', '#f3f2f1', '#ffffff', { text: '#201f1e', muted: '#605e5c' }),
  P('cyberpunk', 'Cyberpunk', '#f43f5e', '#fbbf24', '#d946ef', '#0c0814', '#1e102a'),
  P('matrix', 'Matrix', '#059669', '#10b981', '#34d399', '#030d07', '#091f14'),
  P('crimson', 'Crimson', '#e11d48', '#f43f5e', '#fb7185', '#0f0507', '#240a10'),
  P('ocean', 'Ocean', '#0ea5e9', '#22d3ee', '#3b82f6', '#04121f', '#082f49'),
  P('aurora', 'Aurora', '#10b981', '#22d3ee', '#a78bfa', '#060b17', '#0f2133'),
  P('sunset', 'Sunset', '#f97316', '#fb7185', '#fbbf24', '#160a0c', '#2b1319'),
  P('dracula', 'Dracula', '#bd93f9', '#ff79c6', '#50fa7b', '#191a21', '#282a36', { text: '#f8f8f2', muted: '#a9b0d0' }),
  P('nord', 'Nord', '#5e81ac', '#88c0d0', '#b48ead', '#232831', '#2e3440', { text: '#eceff4', muted: '#a3aec2' }),
  P('royal', 'Royal', '#7c3aed', '#c084fc', '#f0abfc', '#0b0716', '#1a1033'),
  P('gold', 'Gold', '#d97706', '#fbbf24', '#fde68a', '#0e0a04', '#231a0a'),
  P('sakura', 'Sakura', '#ec4899', '#f9a8d4', '#c084fc', '#140a12', '#2a1224'),
  P('mono', 'Mono', '#9ca3af', '#e5e7eb', '#6b7280', '#0a0a0a', '#171717'),
  P('latte', 'Latte', '#b45309', '#d97706', '#be123c', '#f3e9dc', '#fffaf3', { text: '#2b1d12', muted: '#6b5845' }),
  // Seri dasbor kaca (terinspirasi V22–V35)
  P('mintwork', 'Mint Studio', '#14584a', '#2fbf9a', '#f59e6b', '#dcebe5', '#f7fbf9', { text: '#0d2a24', muted: '#4f6f66' }),
  P('coral', 'Coral Glass', '#e5484d', '#ff7a6b', '#f5b9a0', '#2a1411', '#4a2520', { text: '#fff0ea', muted: '#e0b4a8' }),
  P('indigoair', 'Indigo Air', '#5648e8', '#7b6cff', '#22c3a6', '#eceefb', '#ffffff', { text: '#141433', muted: '#5a5d86' }),
  P('orbit', 'Orbit Green', '#2f9e4f', '#4cbf6a', '#1f7a8c', '#e9f1ee', '#ffffff', { text: '#0f2a1a', muted: '#52695c' }),
  P('graphite', 'Graphite Glass', '#4d8dff', '#9cc0ff', '#c9bfae', '#171616', '#2c2927', { text: '#efeae5', muted: '#a8a19a' }),
  P('refract', 'Refract', '#ff5a3c', '#ff9a73', '#ffc94d', '#0b0a0a', '#1b1716', { text: '#f6f1ee', muted: '#a79d97' }),
  // Seri HUD sci-fi (terinspirasi Kronos, Spectre, Vision, Chronos, Aether, Nexus, Valkyrie, Orion)
  P('kronos', 'Kronos', '#0ea5c6', '#38e0f5', '#4f7cff', '#06111f', '#12283f', { text: '#e8f4ff', muted: '#8fb0cc' }),
  P('spectre', 'Spectre', '#8b5cf6', '#b69cff', '#e879f9', '#0a0818', '#1b1738', { text: '#f0ebff', muted: '#a59cc8' }),
  P('vision', 'Vision', '#5b5bf0', '#8b93ff', '#f59e0b', '#070813', '#1a1e30', { text: '#f1f3ff', muted: '#9aa3c0' }),
  P('chronos', 'Chronos', '#2aa7d4', '#67e8f9', '#4ade80', '#0a1d29', '#18394a', { text: '#e6f7ff', muted: '#8fb8c8' }),
  P('nexus', 'Nexus', '#16d98a', '#6ff2b4', '#7c5cff', '#0a1220', '#133a35', { text: '#e8fff3', muted: '#8fc2ae' }),
  P('valkyrie', 'Valkyrie', '#e53e3e', '#ff6464', '#38bdf8', '#0a0a0c', '#1d1416', { text: '#f7eeee', muted: '#b79a9c' }),
  P('orion', 'Orion', '#e8891a', '#ffb347', '#4cc3e8', '#110b07', '#2c1c0e', { text: '#fbeedd', muted: '#c0a07c' }),
  // Tren 2025–2026: warna Pantone (Cloud Dancer, Mocha Mousse), matcha, ube, lime elektrik, midnight aurora
  P('cloud', 'Cloud Dancer', '#5b6b85', '#7c93c4', '#c4a7e7', '#eef0f4', '#ffffff', { text: '#1c2230', muted: '#5d6679' }),
  P('mocha', 'Mocha Mousse', '#a47764', '#d4a98f', '#e8cbb5', '#1a1311', '#2b201c', { text: '#f5ebe3', muted: '#b8a296' }),
  P('matcha', 'Matcha Latte', '#5c7f3f', '#8fb36b', '#d9a441', '#eef2e3', '#fbfcf6', { text: '#1f2a14', muted: '#5f6c4d' }),
  P('electric', 'Electric Lime', '#7ddc1f', '#c6ff3d', '#22d3ee', '#0a0c08', '#161b10', { text: '#f4ffe6', muted: '#9fb08a' }),
  P('ube', 'Ube Pastel', '#7c5cdb', '#a78bfa', '#f472b6', '#f1ecfb', '#ffffff', { text: '#241a45', muted: '#6a5f8f' }),
  P('midnight', 'Midnight Aurora', '#6d5efc', '#38e1c6', '#f472b6', '#05060f', '#0f1230', { text: '#eef0ff', muted: '#9aa0c8' }),
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
  F('barlowc', 'Barlow Condensed', 'display', 'Barlow Condensed', '400;500;600;700;800', SANS),
  F('oswald', 'Oswald', 'display', 'Oswald', '400;500;600;700', SANS),
  F('chakra', 'Chakra Petch', 'display', 'Chakra Petch', '400;500;600;700', SANS),
  F('oxanium', 'Oxanium', 'display', 'Oxanium', '400;500;600;700;800', SANS),
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
  { id: 'coral', name: 'Coral', css: 'radial-gradient(60% 55% at 15% 15%, rgba(255,122,107,.45), transparent 70%), radial-gradient(55% 55% at 90% 85%, rgba(176,110,70,.4), transparent 70%), radial-gradient(40% 40% at 60% 40%, rgba(245,185,160,.18), transparent 70%)' },
  { id: 'smoke', name: 'Smoke', css: 'radial-gradient(60% 60% at 20% 10%, rgba(180,170,160,.28), transparent 70%), radial-gradient(55% 55% at 85% 90%, rgba(77,141,255,.22), transparent 70%), radial-gradient(50% 50% at 50% 55%, rgba(120,110,100,.2), transparent 70%)' },
  { id: 'mintmist', name: 'Mint Mist', css: 'radial-gradient(60% 60% at 10% 10%, rgba(47,191,154,.35), transparent 70%), radial-gradient(55% 55% at 90% 20%, rgba(245,158,107,.28), transparent 70%), radial-gradient(60% 60% at 50% 105%, rgba(20,88,74,.22), transparent 70%)' },
  { id: 'lavender', name: 'Lavender', css: 'radial-gradient(60% 60% at 15% 10%, rgba(108,108,240,.32), transparent 70%), radial-gradient(55% 55% at 90% 15%, rgba(34,211,238,.22), transparent 70%), radial-gradient(60% 60% at 60% 105%, rgba(167,139,250,.3), transparent 70%)' },
  { id: 'prism', name: 'Prism', css: 'radial-gradient(45% 45% at 15% 20%, rgba(255,90,60,.32), transparent 70%), radial-gradient(45% 45% at 85% 25%, rgba(255,201,77,.22), transparent 70%), radial-gradient(50% 50% at 55% 95%, rgba(108,108,240,.25), transparent 70%)' },
  { id: 'warp', name: 'Warp', css: 'radial-gradient(70% 60% at 50% 40%, rgba(14,165,198,.28), transparent 70%), repeating-conic-gradient(from 0deg at 50% 45%, rgba(94,231,255,.10) 0 1.2deg, transparent 1.2deg 6deg), radial-gradient(60% 50% at 85% 95%, rgba(79,124,255,.28), transparent 70%)' },
  { id: 'spectre', name: 'Spectre', css: 'radial-gradient(60% 55% at 15% 10%, rgba(139,92,246,.34), transparent 70%), radial-gradient(55% 55% at 90% 90%, rgba(232,121,249,.2), transparent 70%), radial-gradient(40% 40% at 60% 45%, rgba(91,91,240,.14), transparent 70%)' },
  { id: 'nebula', name: 'Nebula', css: 'radial-gradient(40% 40% at 18% 30%, rgba(245,158,11,.24), transparent 70%), radial-gradient(45% 45% at 72% 18%, rgba(99,102,241,.34), transparent 70%), radial-gradient(50% 45% at 92% 88%, rgba(56,189,248,.2), transparent 70%)' },
  { id: 'cryo', name: 'Cryo', css: 'radial-gradient(60% 50% at 50% 0%, rgba(103,232,249,.3), transparent 70%), radial-gradient(55% 60% at 10% 90%, rgba(42,167,212,.28), transparent 70%), radial-gradient(40% 40% at 90% 60%, rgba(74,222,128,.12), transparent 70%)' },
  { id: 'solar', name: 'Solar', css: 'radial-gradient(45% 55% at 92% 40%, rgba(255,150,30,.5), transparent 70%), radial-gradient(60% 60% at 12% 105%, rgba(234,88,12,.18), transparent 70%), radial-gradient(30% 30% at 80% 20%, rgba(255,197,61,.16), transparent 70%)' },
  { id: 'biome', name: 'Biome', css: 'linear-gradient(180deg, rgba(88,48,160,.5), transparent 55%), radial-gradient(70% 50% at 50% 112%, rgba(22,217,138,.34), transparent 70%), radial-gradient(40% 40% at 85% 30%, rgba(124,92,255,.2), transparent 70%)' },
  { id: 'battle', name: 'Battle', css: 'radial-gradient(45% 55% at 86% 32%, rgba(56,120,200,.32), transparent 70%), radial-gradient(55% 50% at 70% 105%, rgba(229,62,62,.3), transparent 70%), radial-gradient(40% 40% at 10% 10%, rgba(229,62,62,.12), transparent 70%)' },
  { id: 'asteroid', name: 'Asteroid', css: 'radial-gradient(50% 50% at 76% 50%, rgba(76,195,232,.24), transparent 70%), radial-gradient(60% 60% at 8% 92%, rgba(232,137,26,.3), transparent 70%), radial-gradient(40% 40% at 50% 0%, rgba(255,179,71,.12), transparent 70%)' },
];

/** Efek hover kartu. lift/tilt memakai framer-motion; sisanya CSS murni (properti scale/translate/rotate). */
export const HOVERS = [
  { id: 'lift', label: 'Angkat' },
  { id: 'tilt', label: 'Tilt 3D' },
  { id: 'spotlight', label: 'Sorot' },
  { id: 'shine', label: 'Kilat' },
  { id: 'pop', label: 'Pop' },
  { id: 'jelly', label: 'Jelly' },
  { id: 'float', label: 'Melayang' },
  { id: 'press', label: 'Tekan' },
  { id: 'glow', label: 'Kilau' },
  { id: 'none', label: 'Mati' },
];

/** Id tema lama yang sudah dihapus (duplikat) → pengganti, agar pengaturan tersimpan tetap valid. */
export const THEME_ALIASES = { stealth: 'fluent', mint: 'mintwork', clinova: 'indigoair', aether: 'gold', forest: 'matrix' };

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
  { id: 'liquid', label: 'Liquid' },
  { id: 'neu', label: 'Neumorph' },
  { id: 'brutal', label: 'Brutal' },
  { id: 'bevel', label: 'Bevel 3D' },
  { id: 'gradient', label: 'Gradien' },
  { id: 'aurora', label: 'Aurora' },
  { id: 'minimal', label: 'Minimal' },
  { id: 'frosted', label: 'Frosted' },
  { id: 'crystal', label: 'Crystal' },
  { id: 'clay', label: 'Clay' },
  { id: 'holo', label: 'Holo' },
  { id: 'stack', label: 'Stack 3D' },
  { id: 'terminal', label: 'Terminal' },
  { id: 'tint', label: 'Tinted' },
  { id: 'soft', label: 'Soft' },
  { id: 'smoke', label: 'Smoke' },
  { id: 'refract', label: 'Refract' },
  { id: 'hud', label: 'HUD' },
  { id: 'panel', label: 'Panel' },
];


/** Bentuk kartu (html[data-cshape], lihat styles/shapes.css). */
export const CARD_SHAPES = [
  { id: 'none', label: 'Ikuti model', desc: 'Pakai model kartu biasa' },
  { id: 'tab', label: 'Kaca terpisah', desc: 'Header, isi & footer lepas, sudut kiri-atas tajam' },
  { id: 'water', label: 'Air', desc: 'Tetesan membulat, kilau & riak' },
  { id: 'wood', label: 'Kayu', desc: 'Serat papan, paku & bingkai tebal' },
  { id: 'electric', label: 'Listrik', desc: 'Tepi petir berputar & kilat' },
  { id: 'ice', label: 'Es', desc: 'Kaca beku dengan tetesan es' },
  { id: 'cut', label: 'Potong', desc: 'Sudut miring ala sci-fi' },
  { id: 'ticket', label: 'Tiket', desc: 'Takik samping & garis sobekan' },
  { id: 'pixel', label: 'Pixel', desc: 'Sudut bertangga 8-bit' },
  { id: 'stitch', label: 'Jahitan', desc: 'Kain dengan benang putus-putus' },
  { id: 'bubble', label: 'Balon', desc: 'Balon percakapan' },
  { id: 'torn', label: 'Kertas sobek', desc: 'Kertas bergaris, tepi sobek' },
];

/** Bentuk navbar atas (data-tshape) & bawah (data-bshape). */
export const NAV_SHAPES = [
  { id: 'none', label: 'Ikuti sudut' },
  { id: 'square', label: 'Siku' },
  { id: 'leaf', label: 'Daun' },
  { id: 'tab', label: 'Terpisah' },
  { id: 'water', label: 'Air' },
  { id: 'wood', label: 'Kayu' },
  { id: 'electric', label: 'Listrik' },
  { id: 'ice', label: 'Es' },
  { id: 'stitch', label: 'Jahitan' },
];

/** Gaya header kartu (data-chead). */
export const CARD_HEADS = [
  { id: 'bar', label: 'Bilah' },
  { id: 'gradient', label: 'Gradien' },
  { id: 'chrome', label: 'Jendela' },
  { id: 'plain', label: 'Polos' },
];

/** Tata letak navbar (data-tlayout / data-blayout). */
export const NAV_LAYOUTS = [
  { id: 'float', label: 'Melayang' },
  { id: 'bar', label: 'Menempel' },
  { id: 'island', label: 'Pulau' },
];

/** Gaya tiga tombol melayang di tepi layar (Tema · Audio · Asisten). */
export const FAB_STYLES = [
  { id: 'tab', label: 'Tab tepi' },
  { id: 'orb', label: 'Bulat' },
  { id: 'pill', label: 'Kapsul' },
  { id: 'square', label: 'Kotak' },
  { id: 'dock', label: 'Dock menyatu' },
  { id: 'neon', label: 'Neon' },
  { id: 'minimal', label: 'Minimal' },
];

/** Huruf judul (h1–h4). */
export const HEADING_CASES = [
  { id: 'normal', label: 'Normal' },
  { id: 'upper', label: 'KAPITAL' },
];

/** Model tombol navbar bawah (tab). */
export const NAV_STYLES = [
  { id: 'classic', label: 'Klasik', desc: 'Pil + tombol ⚡ melayang' },
  { id: 'notch', label: 'Lekuk', desc: 'Garis melengkung di tab aktif' },
  { id: 'beam', label: 'Sinar', desc: 'Cahaya jatuh ke tab aktif' },
  { id: 'bubble', label: 'Gelembung', desc: 'Ikon aktif menyembul' },
  { id: 'label', label: 'Label', desc: 'Ikon + teks, titik penanda' },
];
export const NAV_LABELS = [
  { id: 'auto', label: 'Otomatis' },
  { id: 'on', label: 'Tampil' },
  { id: 'off', label: 'Sembunyi' },
];

export const SPLASH_STYLES = [
  { id: 'ring', label: 'Cincin' },
  { id: 'orbit', label: 'Orbit' },
  { id: 'bars', label: 'Equalizer' },
  { id: 'pulse', label: 'Gelombang' },
  { id: 'morph', label: 'Morph' },
  { id: 'dots', label: 'Titik' },
  { id: 'typing', label: 'Mengetik' },
];

export const SPLASH_BGS = [
  { id: 'theme', label: 'Tema' },
  { id: 'gradient', label: 'Gradien' },
  { id: 'mesh', label: 'Mesh' },
  { id: 'glass', label: 'Kaca' },
];

export const BORDER_COLORS = [
  { id: 'theme', label: 'Tema' },
  { id: 'accent', label: 'Aksen' },
  { id: 'gradient', label: 'Gradien' },
];

export const GLINTS = [
  { id: 'hover', label: 'Saat hover' },
  { id: 'always', label: 'Berkala' },
  { id: 'off', label: 'Mati' },
];

export const BORDER_STYLES = [
  { id: 'solid', label: 'Solid' },
  { id: 'dashed', label: 'Putus' },
  { id: 'dotted', label: 'Titik' },
  { id: 'double', label: 'Ganda' },
  { id: 'none', label: 'Tanpa' },
];

const TPL_BASE = { custom: {}, card: 'glass', cardBorderStyle: 'solid', cardBorderW: 0, cardBorderColor: 'theme', cardGlint: 'hover', cardDepth: 0.5, radius: 10, rBtn: 6, rInput: 6, rChip: 6, rDockTop: 14, rDockBottom: 14, rDockBtn: 8, rModal: 12, blur: 28, glass: 0.75, border: 0.12, blobs: true, blobIntensity: 0.22, grid: false, particle: 'off', animHover: 'tilt', bgType: 'none', density: 'normal', font: 'segoe', fontHeading: 'same', headingCase: 'normal', fontMono: 'jetbrains', navStyle: 'classic', navLabels: 'auto', navCenter: true, cardShape: 'none', cardHead: 'bar', cardFoot: true, topShape: 'none', bottomShape: 'none', topLayout: 'float', bottomLayout: 'float' };
const T = (id, name, desc, theme, v) => ({ id, name, desc, theme, v: { ...TPL_BASE, theme, ...v } });

/** Template: satu klik menerapkan tema, model kartu, bentuk, efek, dan font sekaligus. */
export const TEMPLATES = [
  T('snow', 'Snow Klasik', 'Terang, bersih, kaca halus (tampilan lama)', 'snow', {}),
  T('liquid', 'Liquid Glass', 'Kaca cair bening ala iOS terbaru', 'aurora', { card: 'liquid', cardDepth: 0.6, radius: 28, rBtn: 20, rInput: 18, rChip: 60, rDockTop: 36, rDockBottom: 36, rDockBtn: 24, rModal: 30, blur: 38, glass: 0.5, border: 0.2, blobIntensity: 0.4, bgType: 'gradient', bgGradient: 'aurora', font: 'jakarta' }),
  T('brutal', 'Neo Brutal', 'Garis tebal, bayangan keras, tajam', 'snow', { card: 'brutal', cardDepth: 0.5, radius: 4, rBtn: 4, rInput: 4, rChip: 4, rDockTop: 6, rDockBottom: 6, rDockBtn: 4, rModal: 6, blur: 0, glass: 1, border: 0.5, blobs: false, grid: true, animHover: 'lift', font: 'space', fontMono: 'spacemono' }),
  T('neu', 'Soft Neumorph', 'Timbul lembut, menekan saat disentuh', 'snow', { card: 'neu', cardDepth: 0.6, radius: 26, rBtn: 18, rInput: 16, rChip: 60, rDockTop: 30, rDockBottom: 30, rDockBtn: 18, rModal: 28, blur: 0, glass: 1, border: 0, blobs: false, animHover: 'lift', font: 'manrope' }),
  T('bevel', 'Bento 3D', 'Kartu tebal berlapis dengan kedalaman', 'fluent', { card: 'bevel', cardDepth: 0.8, radius: 18, rBtn: 12, rInput: 12, rChip: 10, rDockTop: 22, rDockBottom: 22, rDockBtn: 14, rModal: 22, blur: 12, glass: 0.9, border: 0.14, blobs: false, density: 'compact', font: 'inter' }),
  T('aurora', 'Aurora Mesh', 'Kartu berwarna gradien mesh lembut', 'ocean', { card: 'aurora', cardDepth: 0.5, radius: 22, rBtn: 14, rInput: 14, rChip: 60, rDockTop: 30, rDockBottom: 30, rDockBtn: 16, rModal: 24, blur: 30, glass: 0.6, border: 0.16, blobIntensity: 0.35, bgType: 'gradient', bgGradient: 'mesh', font: 'outfit' }),
  T('cyber', 'Cyber Neon', 'Neon gelap dengan grid & hujan kode', 'cyberpunk', { card: 'neon', radius: 6, rBtn: 4, rInput: 4, rChip: 4, rDockTop: 8, rDockBottom: 8, rDockBtn: 6, rModal: 8, blur: 16, glass: 0.7, border: 0.2, blobIntensity: 0.3, grid: true, particle: 'matrix', font: 'rajdhani', fontHeading: 'orbitron' }),
  T('sakura', 'Sakura Gradien', 'Garis gradien pastel, salju lembut', 'sakura', { card: 'gradient', cardDepth: 0.4, radius: 24, rBtn: 16, rInput: 16, rChip: 60, rDockTop: 34, rDockBottom: 34, rDockBtn: 20, rModal: 26, blur: 24, particle: 'snow', font: 'figtree', fontHeading: 'fraunces' }),
  T('minimal', 'Minimal Mono', 'Datar, bersih, garis tipis', 'mono', { card: 'minimal', cardDepth: 0.1, radius: 8, rBtn: 6, rInput: 6, rChip: 6, rDockTop: 12, rDockBottom: 12, rDockBtn: 8, rModal: 10, blur: 0, glass: 0.4, border: 0.1, blobs: false, animHover: 'lift', font: 'inter' }),
  T('frost', 'Frosted Ice', 'Es beku buram, terang & bersih', 'snow', { card: 'frosted', cardDepth: 0.5, radius: 22, rBtn: 14, rInput: 14, rChip: 60, rDockTop: 30, rDockBottom: 30, rDockBtn: 16, rModal: 26, blur: 40, glass: 0.55, border: 0.18, blobIntensity: 0.3, bgType: 'gradient', bgGradient: 'dusk', font: 'jakarta' }),
  T('crystal', 'Crystal Glass', 'Kaca kristal bersudut dengan kilau diagonal', 'ocean', { card: 'crystal', cardDepth: 0.6, cardGlint: 'always', radius: 16, rBtn: 10, rInput: 10, rChip: 10, rDockTop: 20, rDockBottom: 20, rDockBtn: 12, rModal: 20, blur: 34, glass: 0.5, border: 0.22, blobIntensity: 0.4, bgType: 'gradient', bgGradient: 'ocean', font: 'jakarta' }),
  T('holo', 'Holo Chrome', 'Tepi holografis bergerak ala Y2K', 'dracula', { card: 'holo', cardDepth: 0.5, radius: 18, rBtn: 12, rInput: 12, rChip: 60, rDockTop: 24, rDockBottom: 24, rDockBtn: 14, rModal: 22, blur: 20, glass: 0.8, border: 0.14, blobIntensity: 0.3, grid: true, particle: 'stars', font: 'jakarta' }),
  T('stack', 'Stack Deck', 'Kartu bertumpuk seperti setumpuk kartu', 'royal', { card: 'stack', cardDepth: 0.8, radius: 14, rBtn: 10, rInput: 10, rChip: 8, rDockTop: 18, rDockBottom: 18, rDockBtn: 10, rModal: 18, blur: 10, glass: 0.95, border: 0.14, blobIntensity: 0.25, animHover: 'lift' }),
  T('terminal', 'Hacker Terminal', 'Monospace, siku sudut, garis pindai CRT', 'matrix', { card: 'terminal', cardDepth: 0.3, radius: 2, rBtn: 2, rInput: 2, rChip: 2, rDockTop: 4, rDockBottom: 4, rDockBtn: 2, rModal: 4, blur: 0, glass: 0.9, border: 0.3, blobs: false, grid: true, particle: 'matrix', animHover: 'none', font: 'jetbrains' }),
  T('vapor', 'Vaporwave', 'Gradien senja neon, bintang berkelip', 'sunset', { card: 'gradient', cardBorderColor: 'gradient', cardDepth: 0.5, radius: 20, rBtn: 14, rInput: 14, rChip: 60, rDockTop: 28, rDockBottom: 28, rDockBtn: 16, rModal: 24, blur: 22, glass: 0.7, border: 0.16, blobIntensity: 0.45, particle: 'stars', bgType: 'gradient', bgGradient: 'neon', font: 'jakarta' }),
  T('noir', 'Golden Noir', 'Hitam elegan, tepi emas, kaca buram', 'gold', { card: 'frosted', cardBorderColor: 'accent', cardDepth: 0.6, radius: 12, rBtn: 8, rInput: 8, rChip: 8, rDockTop: 16, rDockBottom: 16, rDockBtn: 10, rModal: 16, blur: 30, glass: 0.7, border: 0.2, blobIntensity: 0.2 }),
  // Seri dasbor kaca — tiap template sekaligus memilih model nav tab yang cocok
  T('mintwork', 'Mint Studio', 'Kartu putih lembut, hijau mint & persik', 'mintwork', { card: 'soft', cardDepth: 0.5, radius: 22, rBtn: 14, rInput: 14, rChip: 60, rDockTop: 30, rDockBottom: 30, rDockBtn: 60, rModal: 26, blur: 20, glass: 0.9, border: 0.07, blobIntensity: 0.22, bgType: 'gradient', bgGradient: 'mintmist', font: 'jakarta', navStyle: 'bubble' }),
  T('coral', 'Coral Glass', 'Kaca berwarna koral di atas latar hangat', 'coral', { card: 'tint', cardDepth: 0.6, radius: 24, rBtn: 16, rInput: 16, rChip: 60, rDockTop: 34, rDockBottom: 34, rDockBtn: 22, rModal: 28, blur: 30, glass: 0.55, border: 0.18, blobIntensity: 0.35, bgType: 'gradient', bgGradient: 'coral', font: 'outfit', navStyle: 'label' }),
  T('indigoair', 'Indigo Air', 'Putih lapang dengan aksen indigo', 'indigoair', { card: 'soft', cardDepth: 0.45, radius: 18, rBtn: 12, rInput: 12, rChip: 60, rDockTop: 26, rDockBottom: 26, rDockBtn: 14, rModal: 22, blur: 18, glass: 0.92, border: 0.06, blobIntensity: 0.18, bgType: 'gradient', bgGradient: 'lavender', font: 'figtree', navStyle: 'classic' }),
  T('graphite', 'Graphite Glass', 'Kaca abu monokrom yang tenang', 'graphite', { card: 'smoke', cardDepth: 0.6, radius: 20, rBtn: 14, rInput: 14, rChip: 60, rDockTop: 30, rDockBottom: 30, rDockBtn: 18, rModal: 24, blur: 42, glass: 0.5, border: 0.16, blobIntensity: 0.3, bgType: 'gradient', bgGradient: 'smoke', font: 'manrope', navStyle: 'beam' }),
  T('refract', 'Refract Glass', 'Kaca gelap dengan tepi pelangi kromatik', 'refract', { card: 'refract', cardDepth: 0.6, radius: 22, rBtn: 14, rInput: 14, rChip: 60, rDockTop: 32, rDockBottom: 32, rDockBtn: 20, rModal: 26, blur: 36, glass: 0.5, border: 0.14, blobIntensity: 0.4, bgType: 'gradient', bgGradient: 'prism', font: 'sora', navStyle: 'notch' }),
  // Seri HUD sci-fi — tiap template memilih model kartu, font, latar, partikel & model nav yang cocok
  T('kronos', 'Kronos Warp', 'HUD biru neon dengan garis warp & sudut siku', 'kronos', { card: 'hud', cardDepth: 0.6, radius: 10, rBtn: 6, rInput: 6, rChip: 6, rDockTop: 14, rDockBottom: 14, rDockBtn: 8, rModal: 12, blur: 18, glass: 0.65, border: 0.2, blobIntensity: 0.3, grid: true, particle: 'stars', bgType: 'gradient', bgGradient: 'warp', font: 'inter', fontHeading: 'barlowc', headingCase: 'upper', navStyle: 'beam' }),
  T('spectre', 'Spectre Intercept', 'Panel ungu gelap, tepi violet, aliran sinyal', 'spectre', { card: 'panel', cardBorderW: 1, cardBorderColor: 'accent', cardDepth: 0.5, radius: 14, rBtn: 10, rInput: 10, rChip: 60, rDockTop: 22, rDockBottom: 22, rDockBtn: 12, rModal: 18, blur: 22, glass: 0.7, border: 0.18, blobIntensity: 0.3, particle: 'matrix', bgType: 'gradient', bgGradient: 'spectre', font: 'inter', navStyle: 'notch' }),
  T('vision', 'Vision Nebula', 'Kaca gelap di atas nebula, aksen indigo', 'vision', { card: 'glass', cardDepth: 0.55, radius: 16, rBtn: 12, rInput: 12, rChip: 60, rDockTop: 26, rDockBottom: 26, rDockBtn: 14, rModal: 20, blur: 26, glass: 0.55, border: 0.14, blobIntensity: 0.28, particle: 'stars', bgType: 'gradient', bgGradient: 'nebula', font: 'inter', navStyle: 'bubble' }),
  T('chronos', 'Chronos Cryo', 'Kaca beku biru-teal dengan kabut dingin', 'chronos', { card: 'frosted', cardDepth: 0.55, radius: 16, rBtn: 12, rInput: 12, rChip: 60, rDockTop: 26, rDockBottom: 26, rDockBtn: 14, rModal: 20, blur: 34, glass: 0.45, border: 0.18, blobIntensity: 0.3, particle: 'snow', bgType: 'gradient', bgGradient: 'cryo', font: 'chakra', navStyle: 'label' }),
  T('nexus', 'Nexus Biome', 'Kaca hijau neon di atas kubah bio, malam ungu', 'nexus', { card: 'glass', cardBorderW: 1, cardBorderColor: 'accent', cardDepth: 0.55, radius: 14, rBtn: 10, rInput: 10, rChip: 60, rDockTop: 24, rDockBottom: 24, rDockBtn: 14, rModal: 18, blur: 24, glass: 0.5, border: 0.2, blobIntensity: 0.34, particle: 'fireflies', bgType: 'gradient', bgGradient: 'biome', font: 'outfit', navStyle: 'bubble' }),
  T('valkyrie', 'Valkyrie Combat', 'HUD merah-hitam siaga tempur', 'valkyrie', { card: 'hud', cardDepth: 0.6, radius: 8, rBtn: 4, rInput: 4, rChip: 4, rDockTop: 12, rDockBottom: 12, rDockBtn: 6, rModal: 10, blur: 16, glass: 0.7, border: 0.2, blobIntensity: 0.28, grid: true, bgType: 'gradient', bgGradient: 'battle', font: 'rajdhani', fontHeading: 'rajdhani', navStyle: 'notch' }),
  T('orion', 'Orion Mining', 'Kartu amber-tembaga, rig tambang asteroid', 'orion', { card: 'tint', cardDepth: 0.6, radius: 10, rBtn: 6, rInput: 6, rChip: 6, rDockTop: 16, rDockBottom: 16, rDockBtn: 8, rModal: 14, blur: 20, glass: 0.6, border: 0.2, blobIntensity: 0.3, particle: 'stars', bgType: 'gradient', bgGradient: 'asteroid', font: 'inter', fontHeading: 'oswald', navStyle: 'label' }),
  // Tren 2025–2026
  T('cloud', 'Cloud Dancer', 'Putih awan lembut, warna tahun 2026, lapang', 'cloud', { card: 'soft', cardDepth: 0.4, radius: 20, rBtn: 14, rInput: 14, rChip: 60, rDockTop: 28, rDockBottom: 28, rDockBtn: 16, rModal: 24, blur: 24, glass: 0.8, border: 0.1, blobIntensity: 0.18, bgType: 'gradient', bgGradient: 'lavender', font: 'jakarta', animHover: 'spotlight', navStyle: 'bubble' }),
  T('mocha', 'Mocha Mousse', 'Cokelat hangat berkabut, judul serif elegan', 'mocha', { card: 'frosted', cardDepth: 0.5, radius: 22, rBtn: 14, rInput: 14, rChip: 60, rDockTop: 30, rDockBottom: 30, rDockBtn: 16, rModal: 26, blur: 36, glass: 0.55, border: 0.16, blobIntensity: 0.3, bgType: 'gradient', bgGradient: 'smoke', font: 'figtree', fontHeading: 'fraunces', animHover: 'shine', navStyle: 'notch' }),
  T('matcha', 'Matcha Latte', 'Hijau sage kenyal, ramah dan ceria', 'matcha', { card: 'clay', cardDepth: 0.7, radius: 28, rBtn: 20, rInput: 18, rChip: 60, rDockTop: 32, rDockBottom: 32, rDockBtn: 20, rModal: 30, blur: 0, glass: 1, border: 0, blobs: false, font: 'figtree', animHover: 'jelly', navStyle: 'label' }),
  T('lime', 'Electric Lime', 'Hitam & hijau lime, garis tegas ala Gen-Z', 'electric', { card: 'brutal', cardBorderColor: 'accent', cardDepth: 0.5, radius: 6, rBtn: 4, rInput: 4, rChip: 4, rDockTop: 8, rDockBottom: 8, rDockBtn: 4, rModal: 8, blur: 0, glass: 1, border: 0.4, blobs: false, grid: true, font: 'space', fontMono: 'spacemono', headingCase: 'upper', animHover: 'press', navStyle: 'beam' }),
  T('ube', 'Ube Pastel', 'Ungu ube dan pink, tepi gradien manis', 'ube', { card: 'gradient', cardDepth: 0.45, radius: 26, rBtn: 18, rInput: 16, rChip: 60, rDockTop: 34, rDockBottom: 34, rDockBtn: 20, rModal: 28, blur: 24, bgType: 'gradient', bgGradient: 'lavender', font: 'manrope', animHover: 'pop', navStyle: 'bubble' }),
  T('midnight', 'Midnight Aurora', 'Bawaan baru — malam pekat, cahaya aurora, kaca cair', 'midnight', { card: 'liquid', cardDepth: 0.6, radius: 28, rBtn: 20, rInput: 18, rChip: 60, rDockTop: 36, rDockBottom: 36, rDockBtn: 22, rModal: 30, blur: 38, glass: 0.4, border: 0.2, blobIntensity: 0.35, particle: 'stars', bgType: 'gradient', bgGradient: 'aurora', font: 'jakarta', animHover: 'float', navStyle: 'beam' }),
  // ---- seri BENTUK: kartu header/isi/footer dengan bentuk khusus ----
  T('glasstab', 'Kaca Terpisah', 'Header lepas di kiri-atas, isi & footer ikut terpisah', 'midnight', { card: 'glass', cardShape: 'tab', cardHead: 'bar', cardDepth: 0.55, radius: 24, rBtn: 16, rInput: 16, rChip: 60, rDockTop: 30, rDockBottom: 30, rDockBtn: 18, rModal: 28, blur: 30, glass: 0.45, border: 0.2, blobIntensity: 0.38, particle: 'stars', bgType: 'gradient', bgGradient: 'aurora', font: 'jakarta', navStyle: 'beam', topShape: 'tab', bottomShape: 'tab' }),
  T('waterdrop', 'Tetes Air', 'Kartu & navbar bergerak seperti tetesan air', 'ocean', { card: 'liquid', cardShape: 'water', cardHead: 'plain', cardDepth: 0.6, radius: 36, rBtn: 22, rInput: 20, rChip: 60, rDockTop: 40, rDockBottom: 40, rDockBtn: 24, rModal: 34, blur: 30, glass: 0.45, border: 0.2, blobIntensity: 0.4, bgType: 'gradient', bgGradient: 'cryo', font: 'outfit', navStyle: 'bubble', topShape: 'water', bottomShape: 'water' }),
  T('woodcabin', 'Kabin Kayu', 'Papan kayu berpaku, hangat & bertekstur', 'sunset', { card: 'solid', cardShape: 'wood', cardHead: 'bar', cardDepth: 0.6, radius: 10, rBtn: 8, rInput: 8, rChip: 8, rDockTop: 14, rDockBottom: 14, rDockBtn: 10, rModal: 14, blur: 0, glass: 1, border: 0.2, blobs: false, bgType: 'gradient', bgGradient: 'asteroid', font: 'fraunces', navStyle: 'label', topShape: 'wood', bottomShape: 'wood' }),
  T('storm', 'Badai Listrik', 'Tepi petir berputar & kilat acak', 'cyberpunk', { card: 'neon', cardShape: 'electric', cardHead: 'gradient', cardDepth: 0.6, radius: 14, rBtn: 10, rInput: 10, rChip: 10, rDockTop: 16, rDockBottom: 16, rDockBtn: 10, rModal: 18, blur: 0, glass: 0.9, border: 0.2, particle: 'rain', grid: true, bgType: 'gradient', bgGradient: 'warp', font: 'chakra', navStyle: 'beam', topShape: 'electric', bottomShape: 'electric' }),
  T('frostbite', 'Gigitan Es', 'Kaca beku dengan tetesan es di tepi', 'snow', { card: 'frosted', cardShape: 'ice', cardHead: 'plain', cardDepth: 0.5, radius: 22, rBtn: 14, rInput: 14, rChip: 60, rDockTop: 28, rDockBottom: 28, rDockBtn: 16, rModal: 26, blur: 30, glass: 0.6, border: 0.2, particle: 'snow', bgType: 'gradient', bgGradient: 'lavender', font: 'figtree', navStyle: 'bubble', topShape: 'ice', bottomShape: 'ice' }),
  T('retroarcade', 'Arcade 8-bit', 'Sudut bertangga ala game pixel', 'matrix', { card: 'solid', cardShape: 'pixel', cardHead: 'chrome', cardDepth: 0.3, radius: 4, rBtn: 2, rInput: 2, rChip: 2, rDockTop: 6, rDockBottom: 6, rDockBtn: 4, rModal: 6, blur: 0, glass: 1, border: 0.3, blobs: false, grid: true, font: 'space', fontMono: 'spacemono', headingCase: 'upper', navStyle: 'label', topShape: 'square', bottomShape: 'square', bottomLayout: 'bar' }),
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
  theme: 'midnight', // Midnight Aurora: malam pekat + aurora + kaca cair (tren 2025–2026)
  custom: {},
  // bentuk (60 = pill) — sudut besar & lembut ala kaca cair
  radius: 28, // kartu
  rBtn: 20,
  rInput: 18,
  rChip: 60,
  rDockTop: 36, // header & navbar melayang: sudut atas
  rDockBottom: 36, // sudut bawah
  rDockBtn: 22, // ikon di dalam dock
  rModal: 30,
  blur: 38,
  glass: 0.4,
  border: 0.2,
  card: 'liquid',
  cardBorderStyle: 'solid', // solid | dashed | dotted | double | none
  cardBorderW: 0, // 0 = ikuti model, 1..4 px
  cardBorderColor: 'theme', // theme | accent | gradient
  cardGlint: 'hover', // hover | always | off
  cardDepth: 0.6, // 0..1 kedalaman bayangan & kemiringan 3D
  density: 'normal', // compact | normal | spacious
  cardSize: 'm', // s | m | l
  // bentuk & struktur kartu (header / isi / footer) + bentuk navbar — lihat styles/shapes.css
  cardShape: 'none', // none | tab | water | wood | electric | ice | cut | ticket | pixel | stitch | bubble | torn
  cardHead: 'bar', // bar | gradient | chrome | plain
  cardFoot: true, // footer kartu tampil / sembunyi
  topShape: 'none', // bentuk header atas: none | square | leaf | tab | water | wood | electric | ice | stitch
  bottomShape: 'none', // bentuk navbar bawah (pilihan sama)
  topLayout: 'float', // float | bar | island
  bottomLayout: 'float', // float | bar | island
  // navbar bawah (tab)
  navStyle: 'beam', // classic | notch | beam | bubble | label
  navLabels: 'auto', // auto (ikut model) | on | off
  navCenter: true, // tombol menu cepat ⚡ di tengah
  // efek latar
  particle: 'stars',
  blobs: true,
  blobIntensity: 0.35,
  grid: false,
  spotlight: false,
  // animasi
  anim: 'on', // master on | off
  speed: 1,
  animPage: 'auto', // auto | slide | fade | zoom | blur | slideX | rise | flip | drop | skew | none
  animEntrance: true,
  animHover: 'float', // lift | tilt | glow | none
  animPreview: true,
  animBlobs: true,
  animBtn: true,
  smoothScroll: true, // gulir halus (Lenis)
  scrollFx: 'full', // animasi saat gulir (GSAP ScrollTrigger): off | soft | full
  fabStyle: 'tab', // gaya tombol kanan: tab | orb | pill | square | dock | neon | minimal
  fabSide: 'right', // right | left
  fabY: 'mid', // top | mid | low
  animSplash: true,
  splashStyle: 'ring', // ring | orbit | bars | pulse | morph | dots | typing
  splashBg: 'theme', // theme | gradient | mesh | glass
  splashBar: true,
  splashTitle: 'WUDYSOFT',
  splashSpeed: 1,
  animBar: true,
  // latar kustom
  bgType: 'gradient', // none | gradient | link | upload
  bgGradient: 'aurora',
  bgUrl: '',
  bgFit: 'cover', // cover | contain | repeat
  bgPos: 'center', // center | top | bottom
  bgBlur: 0,
  bgDim: 0.45,
  // teks
  font: 'jakarta',
  fontHeading: 'same',
  headingCase: 'normal', // normal | upper
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

  if (THEME_ALIASES[c.theme]) c.theme = THEME_ALIASES[c.theme];
  if (!PRESETS.some((p) => p.id === c.theme)) c.theme = DEFAULT_CONFIG.theme;
  c.font = FONT_ALIASES[c.font] || c.font;
  c.fontMono = FONT_ALIASES[c.fontMono] || c.fontMono;
  if (!FONTS.some((f) => f.id === c.font)) c.font = DEFAULT_CONFIG.font;
  if (c.fontHeading !== 'same' && !FONTS.some((f) => f.id === c.fontHeading)) c.fontHeading = 'same';
  if (!FONTS.some((f) => f.id === c.fontMono && f.cat === 'mono')) c.fontMono = DEFAULT_CONFIG.fontMono;
  if (!PARTICLES.some((p) => p.id === c.particle)) c.particle = DEFAULT_CONFIG.particle;
  if (!CARD_STYLES.some((x) => x.id === c.card)) c.card = DEFAULT_CONFIG.card;
  c.cardBorderStyle = pick(c.cardBorderStyle, BORDER_STYLES.map((b) => b.id), 'solid');
  c.cardBorderW = Math.round(num(c.cardBorderW, 0, 4, 0));
  c.cardBorderColor = pick(c.cardBorderColor, BORDER_COLORS.map((b) => b.id), 'theme');
  c.cardGlint = pick(c.cardGlint, GLINTS.map((g) => g.id), 'hover');
  c.splashStyle = pick(c.splashStyle, SPLASH_STYLES.map((s) => s.id), 'ring');
  c.splashBg = pick(c.splashBg, SPLASH_BGS.map((s) => s.id), 'theme');
  c.splashBar = bool(c.splashBar, true);
  c.splashTitle = String(c.splashTitle ?? 'WUDYSOFT').replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 20);
  c.splashSpeed = num(c.splashSpeed, 0.5, 2.5, 1);
  c.cardDepth = num(c.cardDepth, 0, 1, 0.5);
  c.density = pick(c.density, ['compact', 'normal', 'spacious'], 'normal');
  c.cardSize = pick(c.cardSize, ['s', 'm', 'l'], 'm');
  c.headingCase = pick(c.headingCase, HEADING_CASES.map((h) => h.id), 'normal');
  c.navStyle = pick(c.navStyle, NAV_STYLES.map((n) => n.id), 'classic');
  c.navLabels = pick(c.navLabels, NAV_LABELS.map((n) => n.id), 'auto');
  c.navCenter = bool(c.navCenter, true);
  c.scrollFx = pick(c.scrollFx, ['off', 'soft', 'full'], 'full');
  c.fabStyle = pick(c.fabStyle, FAB_STYLES.map((x) => x.id), 'tab');
  c.fabSide = pick(c.fabSide, ['right', 'left'], 'right');
  c.fabY = pick(c.fabY, ['top', 'mid', 'low'], 'mid');
  c.cardShape = pick(c.cardShape, CARD_SHAPES.map((x) => x.id), 'none');
  c.cardHead = pick(c.cardHead, CARD_HEADS.map((x) => x.id), 'bar');
  c.cardFoot = bool(c.cardFoot, true);
  c.topShape = pick(c.topShape, NAV_SHAPES.map((x) => x.id), 'none');
  c.bottomShape = pick(c.bottomShape, NAV_SHAPES.map((x) => x.id), 'none');
  c.topLayout = pick(c.topLayout, NAV_LAYOUTS.map((x) => x.id), 'float');
  c.bottomLayout = pick(c.bottomLayout, NAV_LAYOUTS.map((x) => x.id), 'float');
  c.anim = c.anim === 'off' ? 'off' : 'on';
  c.animPage = pick(c.animPage, ['auto', 'slide', 'fade', 'zoom', 'blur', 'slideX', 'rise', 'flip', 'drop', 'skew', 'none'], 'auto');
  // migrasi: `tilt` (boolean) → animHover
  c.animHover = pick(r.animHover !== undefined ? c.animHover : r.tilt === false ? 'lift' : 'tilt', HOVERS.map((h) => h.id), 'tilt');
  ['animEntrance', 'animPreview', 'animBlobs', 'animBtn', 'smoothScroll', 'animSplash', 'animBar'].forEach((k) => { c[k] = bool(c[k], DEFAULT_CONFIG[k]); });

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
    '--ok': c.light ? '#059669' : '#34d399',
    '--warn': c.light ? '#b45309' : '#fbbf24',
    '--err': c.light ? '#dc2626' : '#f87171',
    '--info': c.light ? '#2563eb' : '#60a5fa',
    '--r-s': `min(${rad(cfg.rBtn)}, 10px)`,
    '--r-m': `min(${rad(cfg.radius)}, 18px)`,
    '--r-l': `min(${rad(cfg.rModal)}, 28px)`,
    '--blur': `${cfg.blur}px`,
    '--card-depth': String(cfg.cardDepth),
    '--splash-title': JSON.stringify(cfg.splashTitle),
    '--splash-speed': String(cfg.splashSpeed),
    '--card-bw': `${cfg.cardBorderW}px`,
    '--tilt-k': String(cfg.cardDepth * 2),
    '--neu-hi': c.light ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.07)',
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
  const navLabelsOn = cfg.navLabels === 'on' || (cfg.navLabels === 'auto' && ['notch', 'label'].includes(cfg.navStyle));
  const attrs = {
    'data-theme': cfg.theme,
    'data-mode': c.light ? 'light' : 'dark',
    'data-card': cfg.card,
    'data-hcase': cfg.headingCase,
    'data-nav': cfg.navStyle,
    'data-nav-labels': navLabelsOn ? 'on' : 'off',
    'data-cshape': cfg.cardShape,
    'data-chead': cfg.cardHead,
    'data-cfoot': cfg.cardFoot ? 'on' : 'off',
    'data-tshape': cfg.topShape,
    'data-bshape': cfg.bottomShape,
    'data-tlayout': cfg.topLayout,
    'data-blayout': cfg.bottomLayout,
    'data-bstyle': cfg.cardBorderStyle,
    'data-bw': cfg.cardBorderW ? 'on' : 'off',
    'data-bcolor': cfg.cardBorderColor,
    'data-glint': cfg.cardGlint,
    'data-density': cfg.density,
    'data-anim': cfg.anim,
    'data-grid': cfg.grid ? 'on' : 'off',
    'data-hover': off ? 'none' : cfg.animHover,
    'data-page': off ? 'none' : cfg.animPage,
    'data-anim-preview': cfg.animPreview ? 'on' : 'off',
    'data-anim-blobs': cfg.animBlobs ? 'on' : 'off',
    'data-anim-btn': cfg.animBtn ? 'on' : 'off',
    'data-smooth': cfg.smoothScroll ? 'on' : 'off',
    'data-scrollfx': cfg.scrollFx,
    'data-fab': cfg.fabStyle,
    'data-fab-side': cfg.fabSide,
    'data-fab-y': cfg.fabY,
    'data-splash': cfg.animSplash ? 'on' : 'off',
    'data-splash-style': cfg.splashStyle,
    'data-splash-bg': cfg.splashBg,
    'data-splash-bar': cfg.splashBar ? 'on' : 'off',
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
  // meta warna, favicon, ikon PWA & manifest ikut tema (src/lib/themeAssets.js)
  let fav = null;
  try { fav = applyThemeAssets(t.colors); } catch {}
  try {
    localStorage.setItem(BOOT_KEY, JSON.stringify({ vars: t.vars, attrs: t.attrs, font: t.fontHref, fav }));
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
export const THEME_BOOT_SCRIPT = `(function(){try{var d=JSON.parse(localStorage.getItem('${BOOT_KEY}')||'null');if(!d)return;var r=document.documentElement;for(var k in d.vars)r.style.setProperty(k,d.vars[k]);for(var a in d.attrs)r.setAttribute(a,d.attrs[a]);r.style.colorScheme=d.attrs['data-mode'];var m=document.querySelector('meta[name="theme-color"]');if(m&&d.vars['--bg1'])m.setAttribute('content',d.vars['--bg1']);var cs=document.querySelector('meta[name="color-scheme"]');if(cs)cs.setAttribute('content',d.attrs['data-mode']);if(d.fav){var f=document.querySelector('link[rel="icon"][type="image/svg+xml"]');if(f)f.setAttribute('href',d.fav);}if(d.font){var l=document.createElement('link');l.id='wudysoft-fonts';l.rel='stylesheet';l.href=d.font;document.head.appendChild(l);}}catch(e){}})();`;
