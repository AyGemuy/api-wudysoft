/**
 * Laporan ukuran fungsi serverless: menjumlahkan semua file yang dijejak Next.js
 * (`.next/**\/*.nft.json`) per paket. Jalankan SETELAH `next build`:
 *
 *   npm run size
 *
 * Paket paling atas = penyebab utama error "function exceeds the maximum size of 250 MB".
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const NEXT_DIR = path.join(ROOT, '.next');
if (!fs.existsSync(NEXT_DIR)) { console.error('Folder .next tidak ada. Jalankan `npm run build` dulu.'); process.exit(1); }

function* walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) { if (e.name === 'cache') continue; yield* walk(p); }
    else if (e.name.endsWith('.nft.json')) yield p;
  }
}

const files = new Set();
for (const f of walk(NEXT_DIR)) {
  let d; try { d = JSON.parse(fs.readFileSync(f, 'utf8')); } catch { continue; }
  for (const rel of d.files || []) files.add(path.normalize(path.join(path.dirname(f), rel)));
}

let total = 0;
const by = new Map();
for (const p of files) {
  let size = 0; try { size = fs.statSync(p).size; } catch { continue; }
  total += size;
  const i = p.lastIndexOf(`${path.sep}node_modules${path.sep}`);
  let name = '(kode aplikasi / .next)';
  if (i >= 0) {
    const parts = p.slice(i + 14).split(path.sep);
    name = parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
  }
  by.set(name, (by.get(name) || 0) + size);
}

const mb = (n) => (n / 1048576).toFixed(1).padStart(8);
console.log(`\nTotal file dijejak: ${(total / 1048576).toFixed(1)} MB dari ${files.size} file\n`);
[...by.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25).forEach(([k, v]) => console.log(`${mb(v)} MB  ${k}`));
const heavy = [...by.entries()].filter(([, v]) => v > 20 * 1048576);
if (heavy.length) {
  console.log('\n⚠ Paket > 20 MB (kandidat penyebab fungsi terlalu besar):');
  heavy.forEach(([k, v]) => console.log(`   - ${k} (${(v / 1048576).toFixed(0)} MB)`));
  console.log('  Solusi: hapus import-nya dari route server, pindahkan ke layanan lain, atau tambahkan ke outputFileTracingExcludes di next.config.js bila tidak dipakai saat runtime.');
}
if (total > 200 * 1048576) console.log('\n⚠ Mendekati/lewat batas 250 MB fungsi Netlify.');
