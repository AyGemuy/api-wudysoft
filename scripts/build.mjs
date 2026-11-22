/**
 * Build modern: `npm run build`
 *  1) generate OpenAPI  2) next build (dengan indikator fase)  3) ringkasan ukuran (gzip) & rute terbesar.
 * Output Next dibuffer agar rapi; bila gagal, log lengkap ditampilkan. Pakai `npm run build:raw` untuk output asli.
 */
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const require = createRequire(import.meta.url);
const tty = process.stdout.isTTY && !process.env.CI;
const col = !process.env.NO_COLOR && (tty || process.env.FORCE_COLOR);
const A = (c) => (t) => (col ? `\x1b[${c}m${t}\x1b[0m` : String(t));
const rgb = (r, g, b) => (t) => (col ? `\x1b[38;2;${r};${g};${b}m${t}\x1b[39m` : String(t));
const dim = rgb(120, 128, 150), vio = rgb(167, 139, 250), cyan = rgb(103, 232, 249), grn = rgb(74, 222, 128), red = rgb(248, 113, 113), yel = rgb(250, 204, 21), bold = A('1');
const sec = (ms) => (ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${Math.round(ms)}ms`);
const kb = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(2)} MB` : `${(n / 1024).toFixed(1)} kB`);

const FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];
function step(label, run) {
  const t0 = performance.now();
  let phase = '';
  let i = 0;
  const ctl = { phase: (p) => { if (p === phase) return; phase = p; if (!tty) console.log(`  ${dim('›')} ${p}`); } };
  const timer = tty ? setInterval(() => process.stdout.write(`\r\x1b[2K  ${vio(FRAMES[i++ % FRAMES.length])} ${label}${phase ? dim(`  ${phase}`) : ''}`), 80) : null;
  if (!tty) console.log(`  ${vio('◆')} ${label}…`);
  const done = (ok, extra = '') => {
    if (timer) { clearInterval(timer); process.stdout.write('\r\x1b[2K'); }
    console.log(`  ${ok ? grn('✔') : red('✖')} ${label} ${dim(sec(performance.now() - t0))}${extra ? dim('  ' + extra) : ''}`);
  };
  return run(ctl).then((r) => { done(true, r?.note); return r; }, (e) => { done(false); throw e; });
}

function exec(cmd, args, onLine) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { env: { ...process.env, FORCE_COLOR: '0', NEXT_TELEMETRY_DISABLED: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '';
    const feed = (d) => { const t = d.toString().replace(/\x1b\[[0-9;]*m/g, ''); out += t; if (onLine) t.split('\n').forEach((l) => l.trim() && onLine(l)); };
    p.stdout.on('data', feed); p.stderr.on('data', feed);
    p.on('close', (code) => (code === 0 ? resolve(out) : reject(Object.assign(new Error(`exit ${code}`), { out }))));
  });
}

const PHASES = [
  [/Creating an optimized production build/i, 'menyiapkan build'], [/Compiled successfully|Compiled with warnings/i, 'kompilasi selesai'],
  [/Linting/i, 'lint & tipe'], [/Collecting page data/i, 'mengumpulkan data halaman'], [/Generating static pages/i, 'membuat halaman statis'],
  [/Finalizing page optimization/i, 'finalisasi'], [/Collecting build traces/i, 'menjejak dependensi'],
];

function bundleSize() {
  const dir = path.join(process.cwd(), '.next/static');
  let raw = 0, files = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else if (/\.(js|css)$/.test(e.name)) files.push(p); } };
  if (fs.existsSync(dir)) walk(dir);
  const bufs = files.map((f) => fs.readFileSync(f));
  raw = bufs.reduce((n, b) => n + b.length, 0);
  const gzip = bufs.reduce((n, b) => n + zlib.gzipSync(b, { level: 9 }).length, 0);
  const brotli = bufs.reduce((n, b) => n + zlib.brotliCompressSync(b).length, 0);
  return { raw, gzip, brotli, count: files.length };
}

function routeTable(out) {
  const rows = [];
  let shared = '';
  for (const l of out.split('\n')) {
    const m = l.match(/^[┌├└]\s+(\S+)\s+(\S+)\s+([\d.]+ [kMB]+B?)\s+([\d.]+ [kM]?B)\s*$/);
    if (m) rows.push({ type: m[1], route: m[2], size: m[3], first: m[4] });
    const s = l.match(/First Load JS shared by all\s+([\d.]+ [kM]?B)/);
    if (s) shared = s[1];
    const r = l.match(/^[┌├└]\s+([○ƒ●λ])\s+(\S+)\s+([\d.]+ [kM]?B)\s+([\d.]+ [kM]?B)/);
    if (r) rows.push({ type: r[1], route: r[2], size: r[3], first: r[4] });
  }
  const seen = new Set();
  const uniq = rows.filter((r) => (seen.has(r.route) ? false : seen.add(r.route)));
  return { pages: uniq.filter((r) => !r.route.startsWith('/api/')), api: uniq.filter((r) => r.route.startsWith('/api/')).length, shared };
}

const num = (s) => parseFloat(s) * (/MB/.test(s) ? 1024 : 1);

(async () => {
  const t0 = performance.now();
  console.log(`\n  ${bold(vio('◆ Wudysoft'))} ${dim('· build produksi')}\n`);
  try {
    await step('Generate OpenAPI', () => exec(process.execPath, ['scripts/openapi-gen.mjs']).then(() => ({})));
    const nextBin = require.resolve('next/dist/bin/next');
    const out = await step('Next.js build', (ctl) => exec(process.execPath, [nextBin, 'build'], (l) => { for (const [re, p] of PHASES) if (re.test(l)) ctl.phase(p); }).then((o) => ({ note: '', out: o })));
    try { fs.writeFileSync(path.join('.next', 'build-output.log'), out.out); } catch {}
    const { pages, api, shared } = routeTable(out.out);
    const b = bundleSize();
    console.log(`\n  ${bold('Ringkasan')}`);
    console.log(`  ${dim('─'.repeat(52))}`);
    console.log(`  ${dim('Halaman'.padEnd(18))} ${bold(pages.length)} ${dim(`+ ${api} API route`)}`);
    if (shared) console.log(`  ${dim('JS bersama'.padEnd(18))} ${cyan(shared)} ${dim('(First Load, semua halaman)')}`);
    console.log(`  ${dim('Aset JS+CSS'.padEnd(18))} ${kb(b.raw)} ${dim('mentah')} ${dim('→')} ${grn(kb(b.gzip))} ${dim('gzip')} ${dim('·')} ${grn(kb(b.brotli))} ${dim('brotli')}`);
    const top = [...pages].sort((a, c) => num(c.first) - num(a.first)).slice(0, 6);
    if (top.length) {
      console.log(`\n  ${bold('Halaman terberat')} ${dim('(First Load JS)')}`);
      const max = num(top[0].first) || 1;
      for (const r of top) {
        const w = Math.max(1, Math.round((num(r.first) / max) * 18));
        const c = num(r.first) > 350 ? yel : cyan;
        console.log(`  ${c('█'.repeat(w)).padEnd(col ? 18 + 19 : 18)}${' '.repeat(col ? 0 : 0)} ${r.first.padStart(8)}  ${dim(r.route)}`);
      }
    }
    console.log(`\n  ${grn('✔')} ${bold('Build selesai')} ${dim(`dalam ${sec(performance.now() - t0)}`)}\n`);
  } catch (e) {
    if (e.out) console.error(`\n${e.out}`);
    else console.error(e);
    console.error(`\n  ${red('✖')} ${bold('Build gagal')} ${dim(`setelah ${sec(performance.now() - t0)}`)}\n`);
    process.exit(1);
  }
})();
