// Generator aset public Wudysoft — warna mengikuti TEMA.
//   node scripts/gen-assets.cjs                      → tema bawaan (DEFAULT_CONFIG.theme)
//   node scripts/gen-assets.cjs --theme=coral        → pakai preset "coral" (lihat PRESETS di src/lib/themes.js)
//   node scripts/gen-assets.cjs --theme=coral --out=/tmp/aset   → tulis ke folder lain (pratinjau, tanpa menyentuh /public)
// Menghasilkan: ikon PWA, apple-touch, maskable, favicon.svg, og.jpg, banner & avatar, dan menyelaraskan
// warna di public/manifest.json, dan favicon.ico. Butuh playwright (+ Pillow bila ingin .ico). Set CHROME_PATH bila perlu.
const { chromium } = require('playwright');
const fs = require('fs'); const os = require('os'); const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');
const arg = (k) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || '').slice(k.length + 3);
const OUT = arg('out') ? path.resolve(arg('out')) : ROOT;

// Ambil palet dari src/lib/themes.js (ESM) lewat salinan sementara .mjs
function loadTheme(id) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'wudy-theme-'));
  fs.writeFileSync(path.join(tmp, 'themes.mjs'), fs.readFileSync(path.join(ROOT, 'src/lib/themes.js'), 'utf8').replace("'./themeAssets'", "'./themeAssets.mjs'"));
  fs.copyFileSync(path.join(ROOT, 'src/lib/themeAssets.js'), path.join(tmp, 'themeAssets.mjs'));
  const code = `import * as m from './themes.mjs';const id=${JSON.stringify(id || '')}||m.DEFAULT_CONFIG.theme;if(!m.PRESETS.some(p=>p.id===id)){console.error('Tema tidak dikenal: '+id+'. Pilihan: '+m.PRESETS.map(p=>p.id).join(', '));process.exit(2)}console.log(JSON.stringify({id,c:m.resolveColors({...m.DEFAULT_CONFIG,theme:id,custom:{}})}))`;
  fs.writeFileSync(path.join(tmp, 'run.mjs'), code);
  return JSON.parse(execFileSync(process.execPath, [path.join(tmp, 'run.mjs')], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }));
}
let THEME;
try { THEME = loadTheme(arg('theme')); } catch (e) { process.exit(e.status || 1); }
const C = THEME.c; // { a1, a2, a3, bg1, bg2, text, muted, light }
console.log(`Tema: ${THEME.id} (${C.light ? 'terang' : 'gelap'})`);
const GRID = C.light ? '0,0,0' : '255,255,255';
const FONT = "'Inter','Segoe UI','Open Sans',system-ui,sans-serif";

const MONO = "'JetBrains Mono','DejaVu Sans Mono',ui-monospace,monospace";
const T = C.text, M = C.muted;
const LIGHT = !!C.light;

// ---------- logo: squircle gradien dengan kilap kaca, bingkai dalam & huruf W ----------
const mark = (size, { rx = 11, id = 'm' } = {}) => `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${size}" height="${size}">
  <defs>
    <linearGradient id="${id}g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${C.a2}"/><stop offset=".55" stop-color="${C.a1}"/><stop offset="1" stop-color="${C.a3}"/></linearGradient>
    <linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".55"/><stop offset=".55" stop-color="#fff" stop-opacity=".04"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
    <radialGradient id="${id}d" cx=".5" cy="1.05" r=".8"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset="1" stop-color="#000" stop-opacity="0"/></radialGradient>
    <clipPath id="${id}c"><rect x="5" y="5" width="38" height="38" rx="${rx}"/></clipPath>
  </defs>
  <rect x="5" y="5" width="38" height="38" rx="${rx}" fill="url(#${id}g)"/>
  <g clip-path="url(#${id}c)"><rect x="5" y="30" width="38" height="14" fill="url(#${id}d)"/><ellipse cx="24" cy="9" rx="26" ry="15" fill="url(#${id}s)"/></g>
  <rect x="5.6" y="5.6" width="36.8" height="36.8" rx="${rx - 0.6}" fill="none" stroke="#fff" stroke-opacity=".4" stroke-width=".9"/>
  <path d="M13 17.6 L18.5 32.4 L24 21.6 L29.5 32.4 L35 17.6" fill="none" stroke="#0b1b4d" stroke-opacity=".3" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 1.6)"/>
  <path d="M13 17 L18.5 32 L24 21 L29.5 32 L35 17" fill="none" stroke="${C.a3}" stroke-opacity=".6" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" transform="translate(0 .8)"/>
  <path d="M13 17 L18.5 32 L24 21 L29.5 32 L35 17" fill="none" stroke="#fff" stroke-width="3.7" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="38" cy="10.5" r="2.3" fill="#fff"/>
</svg>`;

// ---------- latar: mesh gradien (blob blur) + kisi memudar + butiran (grain) ----------
const grain = (o) => `<svg style="position:absolute;inset:0;width:100%;height:100%;opacity:${o};mix-blend-mode:overlay;pointer-events:none" xmlns="http://www.w3.org/2000/svg"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .6 0"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>`;
const blob = (w, h, l, t, bw, bh, col, a) => `<div style="position:absolute;left:${l}px;top:${t}px;width:${bw}px;height:${bh}px;border-radius:50%;background:${col};opacity:${a};filter:blur(${Math.round(Math.min(w, h) * 0.13)}px)"></div>`;
const mesh = (w, h, { vivid = false, noise = false, grid = true } = {}) => {
  const k = vivid ? 1 : LIGHT ? 0.62 : 0.85;
  const g = LIGHT ? 'rgba(15,23,42,.06)' : 'rgba(255,255,255,.05)'; const cell = Math.round(Math.min(w, h) / 12);
  const base = vivid ? `linear-gradient(150deg,${C.a2},${C.a1} 55%,${C.a3})` : `linear-gradient(160deg,${C.bg2},${C.bg1})`;
  return `<div style="position:absolute;inset:0;background:${base}"></div>
  ${blob(w, h, -w * 0.15, -h * 0.4, w * 0.62, h * 0.95, vivid ? C.a2 : C.a1, k)}${blob(w, h, w * 0.5, h * 0.3, w * 0.7, h * 0.95, C.a3, k)}${blob(w, h, w * 0.5, -h * 0.4, w * 0.45, h * 0.7, vivid ? '#fff' : C.a2, vivid ? 0.35 : k * 0.7)}
  ${grid ? `<div style="position:absolute;inset:0;background-image:linear-gradient(${g} 1px,transparent 1px),linear-gradient(90deg,${g} 1px,transparent 1px);background-size:${cell}px ${cell}px;-webkit-mask-image:radial-gradient(ellipse at 50% 45%,#000 10%,transparent 72%);mask-image:radial-gradient(ellipse at 50% 45%,#000 10%,transparent 72%)"></div>` : ''}
  ${noise ? grain(0.16) : ''}`; // butiran hanya untuk JPEG (di PNG membuat berkas 3x lebih besar)
};

// ---------- kartu kaca ----------
const glass = (style, inner, r = 22) => `<div style="position:absolute;${style};border-radius:${r}px;overflow:hidden;
  background:${LIGHT ? 'linear-gradient(145deg,rgba(255,255,255,.82),rgba(255,255,255,.5))' : 'linear-gradient(145deg,rgba(255,255,255,.17),rgba(255,255,255,.05))'};
  border:1px solid ${LIGHT ? 'rgba(15,23,42,.1)' : 'rgba(255,255,255,.22)'};backdrop-filter:blur(22px) saturate(1.4);
  box-shadow:0 30px 60px -24px rgba(0,0,0,${LIGHT ? 0.28 : 0.6}),inset 0 1px 0 rgba(255,255,255,${LIGHT ? 0.95 : 0.35})">${inner}</div>`;
const dots = (s) => `<div style="display:flex;gap:${s * 0.9}px;padding:${s * 1.4}px ${s * 1.6}px">${['#ff5f57', '#febc2e', '#28c840'].map((c) => `<i style="width:${s}px;height:${s}px;border-radius:50%;background:${c}"></i>`).join('')}</div>`;
const termCard = (u) => `${dots(u * 0.9)}<div style="padding:${u * 0.6}px ${u * 1.8}px;font-family:${MONO};font-size:${u * 1.25}px;line-height:1.7;color:${T}">
  <div><span style="color:${C.a1}">$</span> curl <span style="color:${M}">/api/health</span></div>
  <div style="color:#10b981">200 OK <span style="color:${M}">· 42 ms</span></div>
  <div style="color:${M}">{ <span style="color:${C.a1}">"ok"</span>: true, <span style="color:${C.a3}">"db"</span>: "up" }</div></div>`;
const codeCard = (u) => `${dots(u * 0.9)}<div style="padding:${u * 0.6}px ${u * 1.8}px;font-family:${MONO};font-size:${u * 1.2}px;line-height:1.7;color:${T}">
  <div><span style="color:${C.a3}">const</span> res = <span style="color:${C.a3}">await</span> <span style="color:${C.a1}">fetch</span>(url)</div>
  <div><span style="color:${C.a3}">const</span> data = <span style="color:${C.a3}">await</span> res.<span style="color:${C.a1}">json</span>()</div>
  <div style="color:${M}">// → { ok: true }</div></div>`;
const barsCard = (u, h) => `<div style="padding:${u * 1.6}px"><div style="font-size:${u * 1.05}px;letter-spacing:.14em;color:${M};font-family:${MONO}">REQUEST / DETIK</div>
  <div style="font-size:${u * 3.2}px;font-weight:800;margin:${u * 0.3}px 0 ${u * 0.8}px;background:linear-gradient(90deg,${C.a1},${C.a3});-webkit-background-clip:text;color:transparent">1.2k</div>
  <div style="display:flex;align-items:flex-end;gap:${u * 0.55}px;height:${h * 0.34}px">${[40, 62, 48, 78, 56, 90, 70].map((v, i) => `<i style="flex:1;height:${v}%;border-radius:${u * 0.4}px;background:linear-gradient(180deg,${i % 2 ? C.a3 : C.a2},${C.a1});opacity:${0.6 + i * 0.055}"></i>`).join('')}</div></div>`;
const chatCard = (u) => `<div style="padding:${u * 1.4}px;display:grid;gap:${u * 0.8}px;font-size:${u * 1.15}px;color:${T}">
  <div style="justify-self:start;padding:${u * 0.7}px ${u * 1.2}px;border-radius:${u * 1.2}px;background:${LIGHT ? 'rgba(15,23,42,.07)' : 'rgba(255,255,255,.12)'}">Halo, API sudah online? 👋</div>
  <div style="justify-self:end;padding:${u * 0.7}px ${u * 1.2}px;border-radius:${u * 1.2}px;background:linear-gradient(135deg,${C.a1},${C.a3});color:#fff">Online · 42 ms ⚡</div>
  <div style="justify-self:start;padding:${u * 0.7}px ${u * 1.2}px;border-radius:${u * 1.2}px;background:${LIGHT ? 'rgba(15,23,42,.07)' : 'rgba(255,255,255,.12)'}">Mantap!</div></div>`;
const gradTxt = `background:linear-gradient(90deg,${C.a1},${C.a3});-webkit-background-clip:text;color:transparent`;
const chip = (t, sz) => `<span style="padding:${sz * 0.5}px ${sz * 1.1}px;border-radius:999px;border:1px solid ${LIGHT ? 'rgba(15,23,42,.14)' : 'rgba(255,255,255,.2)'};background:${LIGHT ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.07)'};font-size:${sz}px;font-weight:600">${t}</span>`;
const page = (w, h, body, css = '') => `<!doctype html><meta charset="utf-8"><style>*{margin:0;box-sizing:border-box}html,body{width:${w}px;height:${h}px;overflow:hidden;background:transparent;font-family:${FONT};color:${T}}${css}</style>${body}`;

// ---------- ikon aplikasi: mesh gradien penuh + W putih bergaya kaca ----------
const glyph = (size, id = 'gl') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" width="${size}" height="${size}" style="overflow:visible">
  <defs><linearGradient id="${id}b" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#dbe7ff"/></linearGradient>
  <filter id="${id}s" x="-30%" y="-30%" width="160%" height="170%"><feGaussianBlur stdDeviation="1.6"/></filter></defs>
  <g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <path d="M10.5 16.5 L17.5 35 L24 22.5 L30.5 35 L37.5 16.5" stroke="#0b1b4d" stroke-opacity=".38" stroke-width="5" filter="url(#${id}s)" transform="translate(0 2.2)"/>
    <path d="M10.5 15.5 L17.5 34 L24 21.5 L30.5 34 L37.5 15.5" stroke="${C.a3}" stroke-opacity=".55" stroke-width="5.2" transform="translate(0 1.1)"/>
    <path d="M10.5 15 L17.5 33.5 L24 21 L30.5 33.5 L37.5 15" stroke="url(#${id}b)" stroke-width="4.8"/>
    <path d="M10.9 14.3 L17.5 31.8 L24 19.4 L30.5 31.8 L37.1 14.3" stroke="#fff" stroke-opacity=".95" stroke-width="1.1" transform="translate(-.2 -.5)"/>
  </g></svg>`;
const iconTile = (size, glyphSize, { round = 0 } = {}) => `<div style="width:${size}px;height:${size}px;position:relative;overflow:hidden;border-radius:${round}px">${mesh(size, size, { vivid: true, grid: false })}
  <div style="position:absolute;inset:0;background:radial-gradient(ellipse 120% 70% at 50% 112%,rgba(8,12,60,.55),transparent 62%)"></div>
  <div style="position:absolute;left:-10%;top:-30%;width:120%;height:70%;border-radius:50%;background:linear-gradient(180deg,rgba(255,255,255,.55),rgba(255,255,255,.02) 80%);transform:rotate(-8deg)"></div>
  <div style="position:absolute;inset:${size * 0.03}px;border-radius:${size * 0.22}px;border:${Math.max(1, size * 0.007)}px solid rgba(255,255,255,.45);box-shadow:inset 0 ${size * 0.012}px ${size * 0.02}px rgba(255,255,255,.35)"></div>
  <div style="position:absolute;inset:0;display:grid;place-items:center">${glyph(glyphSize, 'gi' + size)}</div>
  <div style="position:absolute;right:${size * 0.19}px;top:${size * 0.19}px;width:${size * 0.065}px;height:${size * 0.065}px;border-radius:50%;background:linear-gradient(#fff,#cfe0ff);box-shadow:0 ${size * 0.01}px ${size * 0.02}px rgba(0,0,40,.3)"></div></div>`;

const ogBody = (w, h) => {
  const s = w / 1200;
  return `<div style="width:${w}px;height:${h}px;position:relative;overflow:hidden">${mesh(w, h)}
  <div style="position:absolute;left:${70 * s}px;top:${92 * s}px;width:${560 * s}px">
    <div style="display:inline-flex;align-items:center;gap:${10 * s}px;padding:${8 * s}px ${16 * s}px;border-radius:999px;border:1px solid ${LIGHT ? 'rgba(15,23,42,.14)' : 'rgba(255,255,255,.22)'};background:${LIGHT ? 'rgba(255,255,255,.7)' : 'rgba(255,255,255,.07)'};font-family:${MONO};font-size:${17 * s}px;letter-spacing:.14em;color:${M}"><i style="width:${9 * s}px;height:${9 * s}px;border-radius:50%;background:#10b981"></i>API · TOOLS · REALTIME</div>
    <div style="margin-top:${26 * s}px;display:flex;align-items:center;gap:${18 * s}px;white-space:nowrap"><div style="flex:none;display:flex">${mark(96 * s, { id: 'og' })}</div><div style="font-size:${92 * s}px;font-weight:800;letter-spacing:-.035em;line-height:1;${gradTxt}">Wudysoft</div></div>
    <div style="margin-top:${26 * s}px;font-size:${31 * s}px;line-height:1.38;color:${M}">API Playground, compiler, paste &amp; code share, dan chat realtime dalam satu tempat.</div>
    <div style="margin-top:${30 * s}px;display:flex;gap:${10 * s}px;flex-wrap:wrap">${['REST API', 'Compiler', 'Pastes', 'Chat'].map((t) => chip(t, 20 * s)).join('')}</div>
  </div>
  ${glass(`left:${640 * s}px;top:${70 * s}px;width:${500 * s}px;height:${200 * s}px;transform:rotate(2.2deg)`, termCard(14 * s), 22 * s)}
  ${glass(`left:${640 * s}px;top:${300 * s}px;width:${240 * s}px;height:${230 * s}px;transform:rotate(-2.5deg)`, barsCard(14 * s, 230 * s), 22 * s)}
  ${glass(`left:${900 * s}px;top:${300 * s}px;width:${250 * s}px;height:${230 * s}px;transform:rotate(1.8deg)`, chatCard(14 * s), 22 * s)}
</div>`;
};

const banner = (w, h, title, sub, kind) => {
  const u = h / 36;
  const card = kind === 'code' ? codeCard(u) : kind === 'chat' ? chatCard(u) : termCard(u);
  return page(w, h, `<div style="width:${w}px;height:${h}px;position:relative;overflow:hidden">${mesh(w, h)}
  <div style="position:absolute;left:${w * 0.06}px;top:50%;transform:translateY(-50%);max-width:${w * 0.44}px">
    <div style="font-family:${MONO};font-size:${h * 0.05}px;letter-spacing:.2em;color:${C.a1};text-transform:uppercase;font-weight:700">${sub}</div>
    <div style="margin-top:${h * 0.03}px;font-size:${h * 0.15}px;font-weight:800;letter-spacing:-.025em;line-height:1.06">${title}</div>
  </div>
  ${glass(`right:${w * 0.05}px;top:${h * 0.2}px;width:${w * 0.4}px;height:${h * 0.6}px;transform:rotate(2deg)`, card, u * 1.6)}
  <div style="position:absolute;right:${w * 0.04}px;top:${h * 0.08}px;transform:rotate(-8deg)">${mark(h * 0.2, { id: 'bn' })}</div>
</div>`);
};

// avatar: mesh vivid + cakram kaca berisi huruf
const ava = (w, h, ch, flip) => page(w, h, `<div style="width:${w}px;height:${h}px;position:relative;overflow:hidden;${flip ? 'transform:scaleX(-1)' : ''}">${mesh(w, h, { vivid: true, noise: true })}
  <div style="position:absolute;left:50%;top:46%;width:${w * 0.62}px;height:${w * 0.62}px;transform:translate(-50%,-50%)${flip ? ' scaleX(-1)' : ''};border-radius:50%;background:linear-gradient(145deg,rgba(255,255,255,.34),rgba(255,255,255,.06));border:1px solid rgba(255,255,255,.5);backdrop-filter:blur(16px);display:grid;place-items:center;box-shadow:0 30px 60px -20px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.6)">
    <div style="font-size:${w * 0.36}px;font-weight:800;color:#fff;text-shadow:0 6px 24px rgba(0,0,0,.25)">${ch}</div></div></div>`);

const JOBS = [];
const job = (file, w, h, html, opts = {}) => JOBS.push({ file, w, h, html, ...opts });
job('public/icons/icon-512.png', 512, 512, page(512, 512, iconTile(512, 330)));
job('public/icons/icon-192.png', 192, 192, page(192, 192, iconTile(192, 124)));
job('public/icons/apple-touch-icon.png', 180, 180, page(180, 180, iconTile(180, 116)));
job('public/icons/maskable-512.png', 512, 512, page(512, 512, iconTile(512, 270))); // glyph di zona aman 80%
for (const sz of [64, 48, 32, 16]) job(path.join(os.tmpdir(), `fav-${sz}.png`), sz, sz, page(sz, sz, `<div style="width:${sz}px;height:${sz}px">${mark(sz)}</div>`), { transparent: true });
job('public/og.jpg', 1200, 630, page(1200, 630, ogBody(1200, 630)), { jpg: true }); // JPEG: ringan (<150KB) agar preview WhatsApp tampil besar
job('public/assets/images/all-img/image-1.png', 1096, 500, banner(1096, 500, 'Bangun &amp; uji API lebih cepat', 'API Playground', 'api'));
job('public/assets/images/all-img/image-2.png', 548, 250, banner(548, 250, 'Jalankan kode langsung', 'Compiler', 'code'));
job('public/assets/images/all-img/image-3.png', 1096, 500, banner(1096, 500, 'Paste, bagikan, ngobrol realtime', 'Tools &amp; Chat', 'chat'));
job('public/assets/images/users/user-5.jpg', 640, 800, ava(640, 800, 'W'), { jpg: true });
job('public/assets/images/users/user-6.jpg', 640, 800, ava(640, 800, 'S', true), { jpg: true });

(async () => {
  const b = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH, args: ['--no-sandbox'] } : {});
  for (const j of JOBS) {
    const p = await b.newPage({ viewport: { width: j.w, height: j.h }, deviceScaleFactor: 1 });
    await p.setContent(j.html, { waitUntil: 'load' });
    if (!j.transparent) await p.addStyleTag({ content: `html{background:${C.bg1}}` });
    await p.evaluate(() => document.fonts.ready);
    const out = path.isAbsolute(j.file) ? j.file : path.join(OUT, j.file);
    fs.mkdirSync(path.dirname(out), { recursive: true });
    await p.screenshot(j.jpg ? { path: out, type: 'jpeg', quality: 86 } : { path: out, omitBackground: !!j.transparent });
    await p.close();
  }
  fs.mkdirSync(path.join(OUT, 'public'), { recursive: true });
  fs.writeFileSync(path.join(OUT, 'public/favicon.svg'), mark(48).trim().replace('width="48" height="48"', ''));
  // selaraskan warna manifest dengan tema
  const mp = path.join(ROOT, 'public/manifest.json');
  const man = JSON.parse(fs.readFileSync(mp, 'utf8'));
  man.background_color = C.bg1; man.theme_color = C.a1;
  fs.writeFileSync(path.join(OUT, 'public/manifest.json'), JSON.stringify(man, null, 2));
  // kecilkan PNG (palet 256 warna + dithering) — gradien tetap halus, ukuran ~5x lebih kecil
  try {
    const files = JOBS.filter((j) => /\.png$/.test(j.file) && !j.transparent && !path.isAbsolute(j.file) && !j.file.includes('/icons/')).map((j) => path.join(OUT, j.file));
    execFileSync('python3', ['-c', `import sys,os\nfrom PIL import Image\nfor f in sys.argv[1:]:\n  im=Image.open(f).convert('RGB').quantize(256,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.FLOYDSTEINBERG)\n  im.save(f,optimize=True)`, ...files], { stdio: 'inherit' });
  } catch (e) { console.warn('kompresi PNG dilewati (butuh python3 + Pillow)'); }
  // favicon.ico (16/32/48/64) dari PNG sementara — butuh Pillow
  try {
    const fav = [16, 32, 48, 64].map((n) => path.join(os.tmpdir(), `fav-${n}.png`));
    execFileSync('python3', ['-c', `from PIL import Image;im=[Image.open(p).convert('RGBA') for p in ${JSON.stringify(fav)}];im[3].save(${JSON.stringify(path.join(OUT, 'public/favicon.ico'))},sizes=[(16,16),(32,32),(48,48),(64,64)],append_images=im[:3])`], { stdio: 'inherit' });
  } catch (e) { console.warn('favicon.ico dilewati (butuh python3 + Pillow)'); }
  console.log('Selesai →', OUT);
  await b.close();
})();
