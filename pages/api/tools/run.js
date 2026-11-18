/**
 * Proxy eksekusi kode ke Wandbox (https://wandbox.org) untuk bahasa yang tidak bisa dijalankan di browser.
 * POST { lang, code, stdin? } → { ok, stdout, stderr, compiler, status, signal }
 * Catatan: sandbox Wandbox tidak punya akses jaringan keluar, jadi kode yang memanggil API tidak akan berhasil di sini.
 */
const BASE = 'https://wandbox.org/api';
const LANG = { c: 'C', cpp: 'C++', java: 'Java', csharp: 'C#', go: 'Go', rust: 'Rust', php: 'PHP', ruby: 'Ruby', swift: 'Swift', lua: 'Lua', perl: 'Perl', bash: 'Bash script', haskell: 'Haskell', python: 'Python' };
const PREFER = { c: /^gcc-\d|gcc-head-c/, cpp: /^gcc-\d|^gcc-head$/, java: /^openjdk/, csharp: /^mono|dotnet/, go: /^go-\d/, rust: /^rust-\d/, php: /^php-\d/, ruby: /^ruby-\d/, swift: /^swift-\d/, lua: /^lua-\d/, perl: /^perl-\d/, bash: /bash/, haskell: /^ghc-\d/, python: /^cpython-\d/ };

let listCache = { at: 0, data: null };
async function compilers() {
  if (listCache.data && Date.now() - listCache.at < 3600_000) return listCache.data;
  const r = await fetch(`${BASE}/list.json`, { headers: { Accept: 'application/json' } });
  if (!r.ok) throw new Error(`Wandbox list HTTP ${r.status}`);
  listCache = { at: Date.now(), data: await r.json() };
  return listCache.data;
}
function pick(list, lang) {
  const all = list.filter((c) => c.language === LANG[lang]);
  if (!all.length) return null;
  const pref = all.filter((c) => PREFER[lang]?.test(c.name));
  const pool = pref.length ? pref : all;
  const stable = pool.filter((c) => !/head|HEAD|git/.test(c.name));
  return (stable.length ? stable : pool)[0];
}

const hits = new Map();
const limited = (ip) => { const now = Date.now(); const a = (hits.get(ip) || []).filter((t) => now - t < 60_000); a.push(now); hits.set(ip, a); if (hits.size > 5000) hits.clear(); return a.length > 12; };

export const config = { api: { bodyParser: { sizeLimit: '128kb' } } };

export default async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false, error: 'Gunakan POST' }); }
  const { lang, code, stdin } = req.body || {};
  if (!LANG[lang]) return res.status(400).json({ ok: false, error: 'Bahasa tidak didukung' });
  if (typeof code !== 'string' || !code.trim()) return res.status(400).json({ ok: false, error: 'Kode kosong' });
  if (code.length > 64_000) return res.status(413).json({ ok: false, error: 'Kode terlalu besar (maks 64 KB)' });
  const ip = String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').split(',')[0].trim();
  if (limited(ip)) return res.status(429).json({ ok: false, error: 'Terlalu sering menjalankan kode. Coba lagi sebentar.' });
  try {
    const comp = pick(await compilers(), lang);
    if (!comp) return res.status(502).json({ ok: false, error: `Compiler ${LANG[lang]} tidak tersedia di layanan eksekusi saat ini` });
    const ctl = new AbortController();
    const t = setTimeout(() => ctl.abort(), 20_000);
    const r = await fetch(`${BASE}/compile.json`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ compiler: comp.name, code, stdin: String(stdin || '').slice(0, 8000), save: false }), signal: ctl.signal });
    clearTimeout(t);
    if (!r.ok) return res.status(502).json({ ok: false, error: `Layanan eksekusi membalas HTTP ${r.status}` });
    const j = await r.json();
    const status = String(j.status ?? '0');
    return res.status(200).json({ ok: status === '0', compiler: comp.name, status, signal: j.signal || '', stdout: j.program_output || '', stderr: [j.compiler_error, j.program_error].filter(Boolean).join('\n') });
  } catch (e) {
    return res.status(502).json({ ok: false, error: e?.name === 'AbortError' ? 'Layanan eksekusi timeout' : 'Tidak dapat menghubungi layanan eksekusi' });
  }
}
