/**
 * Aset & meta tag dinamis yang mengikuti tema aktif.
 *
 * Dipanggil dari applyConfig() (src/lib/themes.js) setiap tema berubah:
 *   - <meta> warna : theme-color, color-scheme, msapplication-*, status bar iOS
 *   - favicon SVG  : logo "W" dengan gradien aksen tema (data URI, langsung)
 *   - mask-icon    : Safari pinned tab, berwarna aksen
 *   - PNG ikon     : apple-touch-icon + msapplication-TileImage (dibuat lewat canvas)
 *   - manifest     : manifest.json dinamis (Blob) berisi warna & ikon tema → PWA terpasang ikut tema
 * Semua best-effort: bila gagal, aset statis di /public tetap dipakai.
 */

const hexToRgb = (hex) => {
  let h = String(hex || '').trim().replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(h)) return [0, 0, 0];
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};
const rgba = (hex, a) => {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
};

/** Logo Wudysoft sebagai SVG berwarna tema. `size` mengisi width/height (dibutuhkan saat dirender ke canvas). */
export function brandSvg(c, size) {
  const dim = size ? ` width="${size}" height="${size}"` : '';
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"${dim}>` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c.a2}"/><stop offset=".55" stop-color="${c.a1}"/><stop offset="1" stop-color="${c.a3}"/></linearGradient>` +
    `<linearGradient id="s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>` +
    `<clipPath id="c"><rect x="5" y="5" width="38" height="38" rx="9"/></clipPath></defs>` +
    `<rect x="5" y="5" width="38" height="38" rx="9" fill="url(#g)"/>` +
    `<g clip-path="url(#c)"><rect x="9" y="-4" width="12" height="56" fill="url(#s)" transform="skewX(-20)"/></g>` +
    `<rect x="3.5" y="3.5" width="41" height="41" rx="11" fill="none" stroke="url(#g)" stroke-width="1.2" opacity=".55"/>` +
    `<path d="M13.5 17 L18.5 32 L24 21 L29.5 32 L34.5 17" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<circle cx="38" cy="10" r="2.4" fill="#fff"/></svg>`
  );
}

export const faviconDataUri = (c) => `data:image/svg+xml,${encodeURIComponent(brandSvg(c))}`;

/* ---------- helper DOM ---------- */
function setMeta(name, content) {
  const all = document.querySelectorAll(`meta[name="${name}"]`);
  let el = all[0];
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute('name', name);
    document.head.appendChild(el);
  }
  for (let i = 1; i < all.length; i += 1) all[i].remove(); // satu tag saja agar tidak bentrok
  if (el.getAttribute('content') !== content) el.setAttribute('content', content);
}

function setLink(selector, attrs) {
  let el = document.querySelector(selector);
  if (!el) {
    el = document.createElement('link');
    document.head.appendChild(el);
  }
  Object.entries(attrs).forEach(([k, v]) => { if (el.getAttribute(k) !== v) el.setAttribute(k, v); });
  return el;
}

/* ---------- ikon PNG lewat canvas ---------- */
const svgImage = (svg) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
  });

/** Ikon aplikasi: latar gradien tema + glow aksen + logo. `ratio` = porsi logo (maskable memakai zona aman). */
async function iconPng(c, size, ratio) {
  const cv = document.createElement('canvas');
  cv.width = size;
  cv.height = size;
  const g = cv.getContext('2d');
  const bg = g.createLinearGradient(0, 0, size, size);
  bg.addColorStop(0, c.bg2);
  bg.addColorStop(1, c.bg1);
  g.fillStyle = bg;
  g.fillRect(0, 0, size, size);
  [[0.15, 0.1, 0.65, c.a1], [0.9, 0.95, 0.6, c.a3], [0.8, 0.1, 0.45, c.a2]].forEach(([x, y, r, col]) => {
    const rg = g.createRadialGradient(size * x, size * y, 0, size * x, size * y, size * r);
    rg.addColorStop(0, rgba(col, col === c.a2 ? 0.16 : 0.34));
    rg.addColorStop(1, rgba(col, 0));
    g.fillStyle = rg;
    g.fillRect(0, 0, size, size);
  });
  const img = await svgImage(brandSvg(c, 256));
  const m = size * ratio;
  g.drawImage(img, (size - m) / 2, (size - m) / 2, m, m);
  return cv.toDataURL('image/png');
}

let lastKey = '';
let timer = null;
let blobUrl = '';

async function buildPngAssets(c, key) {
  try {
    const [i180, i192, i512, mask] = await Promise.all([
      iconPng(c, 180, 0.78), iconPng(c, 192, 0.78), iconPng(c, 512, 0.78), iconPng(c, 512, 0.6),
    ]);
    if (key !== lastKey) return; // tema berubah lagi saat dirender
    setLink('link[rel="apple-touch-icon"]', { rel: 'apple-touch-icon', sizes: '180x180', href: i180 });
    setMeta('msapplication-TileImage', i192);

    const base = await fetch('/manifest.json', { cache: 'force-cache' }).then((r) => r.json()).catch(() => null);
    if (!base || key !== lastKey) return;
    const o = location.origin;
    const abs = (u) => (u && u.startsWith('/') ? o + u : u);
    const manifest = {
      ...base,
      id: `${o}/`,
      start_url: `${o}/`,
      scope: `${o}/`,
      background_color: c.bg1,
      theme_color: c.a1,
      icons: [
        { src: faviconDataUri(c), sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
        { src: i192, sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: i512, sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: mask, sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      shortcuts: (base.shortcuts || []).map((s) => ({ ...s, url: abs(s.url) })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(manifest)], { type: 'application/manifest+json' }));
    setLink('link[rel="manifest"]', { rel: 'manifest', href: url });
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = url;
  } catch {
    /* tetap pakai aset statis */
  }
}

/**
 * Terapkan meta + aset sesuai warna tema. `c` = hasil resolveColors() (a1,a2,a3,bg1,bg2,light).
 * Mengembalikan data URI favicon agar bisa disimpan di boot script (tanpa kedip favicon lama).
 */
export function applyThemeAssets(c) {
  if (typeof document === 'undefined') return null;
  const scheme = c.light ? 'light' : 'dark';
  const fav = faviconDataUri(c);

  setMeta('theme-color', c.bg1);
  setMeta('color-scheme', scheme);
  setMeta('supported-color-schemes', scheme);
  setMeta('msapplication-TileColor', c.a1);
  setMeta('msapplication-navbutton-color', c.bg1);
  setMeta('apple-mobile-web-app-status-bar-style', c.light ? 'default' : 'black-translucent');
  setLink('link[rel="icon"][type="image/svg+xml"]', { rel: 'icon', type: 'image/svg+xml', href: fav });
  setLink('link[rel="mask-icon"]', { rel: 'mask-icon', href: fav, color: c.a1 });

  // PNG + manifest lebih berat: tunda & lewati bila warna sama
  const key = [c.a1, c.a2, c.a3, c.bg1, c.bg2].join('|');
  if (key !== lastKey) {
    lastKey = key;
    clearTimeout(timer);
    timer = setTimeout(() => buildPngAssets(c, key), 350);
  }
  return fav;
}
