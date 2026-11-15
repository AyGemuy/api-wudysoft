/**
 * Menyalin aset statis ke folder standalone agar `node .next/standalone/server.js` bisa menyajikannya.
 * (Next.js sengaja tidak menyalin `.next/static` dan `public` ke output standalone.)
 */
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const dest = path.join(root, '.next', 'standalone');
if (!fs.existsSync(dest)) { console.error('.next/standalone tidak ada. Jalankan `npm run build` (bukan di Netlify) dulu.'); process.exit(1); }

const copy = (from, to) => {
  if (!fs.existsSync(from)) return;
  fs.rmSync(to, { recursive: true, force: true });
  fs.cpSync(from, to, { recursive: true });
  console.log(`[standalone] ${path.relative(root, from)} → ${path.relative(root, to)}`);
};
copy(path.join(root, '.next', 'static'), path.join(dest, '.next', 'static'));
copy(path.join(root, 'public'), path.join(dest, 'public'));
