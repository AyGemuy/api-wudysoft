// Generator aset public Wudysoft (tema Fluent Dark). Jalankan: node scripts/gen-assets.cjs (butuh playwright + python3 Pillow untuk .ico)
const { chromium } = require('playwright');
const fs = require('fs'); const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const C = { a1: '#0078d4', a2: '#4cc2ff', a3: '#8764b8', bg1: '#0b0d11', bg2: '#16191f', text: '#f3f2f1', muted: '#a19f9d' };
const FONT = "'Inter','Segoe UI','Open Sans',system-ui,sans-serif";

const mark = (size, { pad = 0, bg = false, rx = 9 } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${size}" height="${size}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.a2}"/><stop offset=".55" stop-color="${C.a1}"/><stop offset="1" stop-color="${C.a3}"/></linearGradient>
    <linearGradient id="s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".35"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <clipPath id="c"><rect x="5" y="5" width="38" height="38" rx="${rx}"/></clipPath>
  </defs>
  ${bg ? `<rect width="48" height="48" fill="${C.bg1}"/>` : ''}
  <g transform="translate(24 24) scale(${1 - pad}) translate(-24 -24)">
    <rect x="5" y="5" width="38" height="38" rx="${rx}" fill="url(#g)"/>
    <g clip-path="url(#c)"><rect x="9" y="-4" width="12" height="56" fill="url(#s)" transform="skewX(-20)"/></g>
    <rect x="3.5" y="3.5" width="41" height="41" rx="${rx + 2}" fill="none" stroke="url(#g)" stroke-width="1.2" opacity=".55"/>
    <path d="M13.5 17 L18.5 32 L24 21 L29.5 32 L34.5 17" fill="none" stroke="#fff" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="38" cy="10" r="2.4" fill="#fff"/>
  </g>
</svg>`;

const page = (w, h, body, css = '') => `<!doctype html><meta charset="utf-8"><style>*{margin:0;box-sizing:border-box}html,body{width:${w}px;height:${h}px;overflow:hidden;background:transparent;font-family:${FONT};color:${C.text}}${css}</style>${body}`;
const dots = `background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.035) 1px,transparent 1px);background-size:40px 40px;`;
const glow = `radial-gradient(60% 70% at 15% 10%, ${C.a1}55, transparent 65%), radial-gradient(55% 65% at 90% 95%, ${C.a3}55, transparent 65%), radial-gradient(40% 50% at 80% 10%, ${C.a2}25, transparent 70%), linear-gradient(160deg, ${C.bg2}, ${C.bg1})`;

const JOBS = [];
const job = (file, w, h, html, opts = {}) => JOBS.push({ file, w, h, html, ...opts });

// ikon aplikasi
job('public/icons/icon-512.png', 512, 512, page(512, 512, `<div style="width:512px;height:512px;display:grid;place-items:center;background:${glow}">${mark(400)}</div>`));
job('public/icons/icon-192.png', 192, 192, page(192, 192, `<div style="width:192px;height:192px;display:grid;place-items:center;background:${glow}">${mark(150)}</div>`));
job('public/icons/apple-touch-icon.png', 180, 180, page(180, 180, `<div style="width:180px;height:180px;display:grid;place-items:center;background:${glow}">${mark(140)}</div>`));
job('public/icons/maskable-512.png', 512, 512, page(512, 512, `<div style="width:512px;height:512px;display:grid;place-items:center;background:${glow}">${mark(512 * 0.6)}</div>`)); // zona aman 80%
job('/tmp/gen/fav-64.png', 64, 64, page(64, 64, `<div style="width:64px;height:64px">${mark(64)}</div>`), { transparent: true });
job('/tmp/gen/fav-32.png', 32, 32, page(32, 32, `<div style="width:32px;height:32px">${mark(32)}</div>`), { transparent: true });
job('/tmp/gen/fav-16.png', 16, 16, page(16, 16, `<div style="width:16px;height:16px">${mark(16)}</div>`), { transparent: true });
job('/tmp/gen/fav-48.png', 48, 48, page(48, 48, `<div style="width:48px;height:48px">${mark(48)}</div>`), { transparent: true });

// OG / twitter
const ogBody = (w, h, s = 1) => `<div style="width:${w}px;height:${h}px;position:relative;background:${glow};${dots}display:flex;align-items:center;padding:0 ${80 * s}px;gap:${48 * s}px">
  <div style="filter:drop-shadow(0 20px 60px ${C.a1}88)">${mark(220 * s)}</div>
  <div><div style="font-size:${96 * s}px;font-weight:800;letter-spacing:-.02em;line-height:1;background:linear-gradient(90deg,${C.a2},${C.a1} 55%,${C.a3});-webkit-background-clip:text;color:transparent">Wudysoft</div>
  <div style="margin-top:${18 * s}px;font-size:${32 * s}px;color:${C.muted};line-height:1.35;max-width:${600 * s}px">API Playground, tools developer, paste &amp; code share, dan chat realtime.</div>
  <div style="margin-top:${28 * s}px;display:flex;gap:${10 * s}px">${['REST API', 'Compiler', 'Pastes', 'Chat'].map((t) => `<span style="padding:${8 * s}px ${16 * s}px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.06);font-size:${20 * s}px;font-weight:600">${t}</span>`).join('')}</div></div>
</div>`;
job('public/og.png', 1200, 630, page(1200, 630, ogBody(1200, 630)));

// banner (image-1/2/3) & avatar
const banner = (w, h, title, sub, icon, hue) => page(w, h, `<div style="width:${w}px;height:${h}px;position:relative;background:${glow};${dots}overflow:hidden">
  <div style="position:absolute;right:-${h * .15}px;top:-${h * .2}px;width:${h * 1.1}px;height:${h * 1.1}px;border-radius:50%;background:radial-gradient(circle at 35% 35%,${hue}aa,transparent 70%);filter:blur(6px)"></div>
  <div style="position:absolute;left:${w * .06}px;top:50%;transform:translateY(-50%)">
    <div style="font-family:'DejaVu Sans Mono',monospace;font-size:${h * .052}px;letter-spacing:.2em;color:${C.a2};text-transform:uppercase">${sub}</div>
    <div style="margin-top:${h * .03}px;font-size:${h * .17}px;font-weight:800;letter-spacing:-.02em;line-height:1.05;max-width:${w * .6}px">${title}</div>
  </div>
  <div style="position:absolute;right:${w * .07}px;top:50%;transform:translateY(-50%);filter:drop-shadow(0 16px 40px ${C.a1}77)">${mark(h * .5)}</div>
</div>`);
job('public/assets/images/all-img/image-1.png', 1096, 500, banner(1096, 500, 'Bangun &amp; uji API lebih cepat', 'API Playground', '', C.a1));
job('public/assets/images/all-img/image-2.png', 548, 250, banner(548, 250, 'Jalankan kode langsung', 'Compiler', '', C.a3));
job('public/assets/images/all-img/image-3.png', 1096, 500, banner(1096, 500, 'Paste, bagikan, ngobrol realtime', 'Tools &amp; Chat', '', C.a2));
const ava = (a, b, ch) => page(640, 800, `<div style="width:640px;height:800px;display:grid;place-items:center;background:linear-gradient(145deg,${a},${b});${dots}"><div style="font-size:340px;font-weight:800;color:#fff;text-shadow:0 16px 60px rgba(0,0,0,.35)">${ch}</div></div>`);
job('public/assets/images/users/user-5.jpg', 640, 800, ava(C.a1, C.a3, 'W'), { jpg: true });
job('public/assets/images/users/user-6.jpg', 640, 800, ava(C.a3, C.a2, 'S'), { jpg: true });

(async () => {
  const b = await chromium.launch();
  for (const j of JOBS) {
    const p = await b.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 1 });
    await p.setContent(j.html, { waitUntil: 'load' });
    if (!j.transparent) await p.addStyleTag({ content: `html{background:${C.bg1}}` });
    await p.evaluate(() => document.fonts.ready);
    const out = path.isAbsolute(j.file) ? j.file : path.join(ROOT, j.file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await p.screenshot(j.jpg ? { path: out, type: 'jpeg', quality: 86 } : { path: out, omitBackground: !!j.transparent });
    await p.close();
  }
  fs.writeFileSync(path.join(ROOT, 'public/favicon.svg'), mark(48).trim().replace(/<svg /, '<svg ').replace('width="48" height="48"', ''));
  await b.close();
})();
