/**
 * Asisten lokal Wudysoft — berjalan 100% di perangkat (tanpa API/LLM eksternal).
 * Mesin berbasis aturan + pencarian: memahami perintah umum (Indonesia/Inggris), mencari halaman & endpoint,
 * membuat contoh kode request, dan membuka fitur situs. Bukan model bahasa: jawabannya terbatas pada pengetahuan situs ini.
 */
import { SITE_PAGES } from '@/src/lib/siteMap';
import { loadSpecOps } from '@/src/lib/specIndex';
import { SNIPPETS } from '@/src/lib/codegen';
import { PRESETS } from '@/src/lib/themes';

const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9/\s._-]/g, ' ').replace(/\s+/g, ' ').trim();
const has = (q, ...words) => words.some((w) => q.includes(w));
const STOP = new Set(['dan', 'yang', 'di', 'ke', 'dari', 'untuk', 'cara', 'bagaimana', 'apa', 'ada', 'itu', 'ini', 'saya', 'aku', 'mau', 'ingin', 'tolong', 'bisa', 'buka', 'cari', 'carikan', 'tampilkan', 'the', 'a', 'an', 'to', 'how', 'do', 'i', 'me', 'show', 'find', 'open', 'api', 'endpoint', 'kode', 'code', 'contoh', 'buat', 'buatkan']);
const words = (q) => q.split(' ').filter((w) => w.length > 1 && !STOP.has(w));

const LANG_ALIASES = [
  ['curl', 'curl'], ['wget', 'wget'], ['httpie', 'httpie'], ['axios', 'axios'], ['typescript', 'ts'], [' ts ', 'ts'], ['httpx', 'httpx'], ['python', 'python'], ['py ', 'python'],
  ['javascript', 'fetch'], ['fetch', 'fetch'], [' js ', 'fetch'], ['node', 'fetch'], ['php', 'php'], ['kotlin', 'kotlin'], ['java', 'java'], ['c#', 'csharp'], ['csharp', 'csharp'], ['dotnet', 'csharp'],
  ['golang', 'go'], [' go ', 'go'], ['rust', 'rust'], ['ruby', 'ruby'], ['swift', 'swift'], ['dart', 'dart'], ['flutter', 'dart'], ['powershell', 'powershell'],
];
const pickLang = (q) => { const s = ` ${q} `; for (const [k, id] of LANG_ALIASES) if (s.includes(k)) return id; return null; };

const PAGE_HINTS = {
  playground: ['playground', 'tes api', 'test api', 'coba api', 'request'], stats: ['live stats', 'statistik', 'stats', 'traffic'], rooms: ['room', 'chat', 'ngobrol', 'grup', 'group'],
  pastes: ['paste', 'pastebin'], 'code-share': ['code share', 'bagikan kode', 'share code'], beautify: ['beautif', 'format kode', 'rapikan'], compiler: ['compiler', 'jalankan kode', 'run code', 'interpreter'],
  upload: ['upload', 'unggah', 'hosting file'],
};

function scorePage(p, q, ws) {
  const hay = norm(`${p.title} ${p.desc} ${(p.tags || []).join(' ')} ${p.href}`);
  let s = 0;
  for (const w of ws) if (hay.includes(w)) s += norm(p.title).includes(w) ? 3 : 1;
  for (const h of PAGE_HINTS[p.id] || []) if (q.includes(h)) s += 4;
  return s;
}

async function searchOps(q, ws, limit = 5) {
  let ops = [];
  try { ops = await loadSpecOps(); } catch { return []; }
  const wsl = ws.length ? ws : [q];
  return ops.map((o) => {
    const path = norm(o.path); const hay = `${path} ${norm(o.summary)} ${norm(o.tag)}`;
    let s = 0;
    for (const w of wsl) { if (path.endsWith(`/${w}`) || path.split('/').includes(w)) s += 4; else if (path.includes(w)) s += 3; else if (hay.includes(w)) s += 1; }
    return { o, s };
  }).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, limit).map((x) => x.o);
}

const opCard = (o) => ({ title: o.path, sub: `${(o.methods || [o.method]).join(' · ')}${o.summary ? ` — ${o.summary}` : ''}`, href: `/playground?op=${encodeURIComponent(o.key)}` });

function buildSnippet(op, langId, origin) {
  const sn = SNIPPETS.find((x) => x.id === langId) || SNIPPETS[0];
  const method = (op.methods || [op.method])[0];
  const body = method !== 'GET' && method !== 'HEAD';
  const req = { method, url: `${origin}${op.path}`, headers: body ? { 'Content-Type': 'application/json' } : {}, desc: body ? { kind: 'json', text: '{}' } : { kind: 'none' } };
  return { code: sn.fn(req), lang: sn.lang, label: sn.label, run: sn.run };
}

export const QUICK = ['Apa yang bisa kamu lakukan?', 'Cari endpoint cache', 'Kode curl untuk /api/health', 'Buka compiler', 'Ganti tema', 'Cara pakai paste'];

/**
 * @returns {Promise<{ text: string, cards?: {title,sub,href}[], code?: {code,lang,label}, actions?: {label,href?,event?}[] }>}
 */
export async function reply(input, { origin = '' } = {}) {
  const raw = String(input || '').trim();
  const q = ` ${norm(raw)} `.replace(/\s+/g, ' ');
  const qt = q.trim();
  if (!qt) return { text: 'Ketik pertanyaan atau perintah, misalnya “cari endpoint upload”.' };

  if (has(qt, 'halo', 'hai', 'hello', 'hi ', 'selamat pagi', 'selamat siang', 'selamat malam') && qt.split(' ').length <= 4) {
    return { text: 'Halo! Saya asisten lokal Wudysoft. Saya bisa mencari halaman dan endpoint, membuat contoh kode request, serta membuka fitur situs.', actions: [{ label: 'Apa yang bisa kamu lakukan?', ask: true }] };
  }
  if (has(qt, 'bisa apa', 'bisa kamu lakukan', 'kemampuan', 'bantuan', 'help', 'fitur kamu', 'what can you')) {
    return { text: 'Yang bisa saya bantu:\n• Cari halaman — “buka paste”, “di mana upload?”\n• Cari endpoint — “cari endpoint cache”\n• Buat kode request — “kode python untuk /api/health” (18 bahasa)\n• Buka fitur — tema, musik, compiler, playground\n• Panduan singkat — login, paste, room, upload\n\nCatatan: saya berjalan offline di perangkat Anda dan bukan model bahasa, jadi jawaban terbatas pada pengetahuan situs ini.' };
  }

  // daftar halaman
  if (has(qt, 'halaman apa', 'daftar halaman', 'semua halaman', 'menu apa', 'fitur apa', 'list halaman', 'page apa')) {
    return { text: 'Halaman utama situs:', cards: SITE_PAGES.slice(0, 8).map((p) => ({ title: p.title, sub: p.desc, href: p.href })) };
  }
  // tema
  if (has(qt, 'tema', 'theme', 'warna', 'dark mode', 'mode gelap', 'terang', 'tampilan')) {
    const names = PRESETS.slice(0, 8).map((p) => p.name || p.label || p.id).join(', ');
    if (has(qt, 'reset', 'default', 'kembalikan', 'bawaan')) return { text: 'Buka Theme Studio lalu tekan tombol Reset di kanan atas header panel (ketuk dua kali untuk konfirmasi).', actions: [{ label: 'Buka Theme Studio', event: 'wudysoft:open-studio' }] };
    return { text: `Theme Studio punya ${PRESETS.length} preset (mis. ${names}), warna kustom, bentuk, teks, latar, dan animasi. Ada juga ekspor/impor tema.`, actions: [{ label: 'Buka Theme Studio', event: 'wudysoft:open-studio' }] };
  }
  if (has(qt, 'musik', 'bgm', 'lagu', 'suara', 'audio', 'volume', 'youtube')) {
    return { text: 'Panel Musik: pasang link YouTube sebagai BGM, atur volume, dan nyalakan/matikan efek suara (klik, login, logout, 404).', actions: [{ label: 'Buka panel Musik', event: 'wudysoft:open-audio' }] };
  }

  // kode request
  const lang = pickLang(` ${qt} `);
  if (has(qt, 'kode', 'code', 'snippet', 'contoh', 'curl', 'fetch', 'axios', 'python', 'php', 'kotlin', 'golang', 'rust', 'swift', 'dart') && (lang || has(qt, 'kode', 'snippet')) && !has(qt, 'code share', 'pastes')) {
    const pathMatch = raw.match(/\/[a-z0-9_\-./[\]]+/i);
    const ws = words(qt).filter((w) => !LANG_ALIASES.some(([k]) => k.trim() === w));
    let ops = []; let allOps = [];
    try { allOps = await loadSpecOps(); } catch {}
    if (pathMatch) ops = allOps.filter((o) => o.path === pathMatch[0] || o.path.startsWith(pathMatch[0]));
    if (!ops.length) ops = await searchOps(qt, ws, 3);
    if (ops.length) {
      const op = ops[0];
      const s = buildSnippet(op, lang || 'curl', origin);
      return { text: `Contoh ${s.label} untuk ${(op.methods || [op.method]).join('/')} ${op.path}:`, code: s, cards: ops.slice(1).map(opCard), actions: [{ label: 'Buka di Playground', href: `/playground?op=${encodeURIComponent(op.key)}` }, ...(s.run ? [{ label: 'Jalankan di Compiler', href: '/tools/compiler' }] : [])] };
    }
    return { text: 'Endpoint mana yang dimaksud? Sebutkan path-nya, mis. “kode python untuk /api/health”.', actions: [{ label: 'Buka Playground', href: '/playground' }] };
  }

  // panduan fitur
  const guides = [
    [['login', 'masuk', 'daftar', 'signup', 'sign in', 'tamu', 'guest', 'akun'], 'Buka halaman Masuk/Daftar. Pilih email+password, Google/GitHub, atau “Login Tamu” untuk mencoba tanpa akun.', '/auth', 'Buka Masuk'],
    [['paste', 'pastebin'], 'Pastes: buat, edit, dan hapus catatan/kode dengan syntax highlighting, kedaluwarsa opsional, dan link raw.', '/tools/pastes', 'Buka Pastes'],
    [['code share', 'bagikan kode'], 'Code Share: tempel kode, dapatkan link untuk dibagikan, lengkap dengan pilihan bahasa.', '/tools/code-share', 'Buka Code Share'],
    [['room', 'ngobrol', 'grup', 'chat'], 'Chat Rooms: pilih grup dari daftar (list/grid, cari, urutkan), lalu ngobrol realtime. Buat channel baru lewat tombol di atas.', '/rooms', 'Buka Rooms'],
    [['upload', 'unggah', 'hosting'], 'Multi-Host Uploader: pilih server tujuan (dengan pencarian & pagination), lalu seret file dan unggah.', '/tools/upload', 'Buka Uploader'],
    [['compiler', 'jalankan', 'run'], 'Compiler: JavaScript, TypeScript, Python, dan HTML jalan di browser; C, C++, Java, Go, Rust, PHP, Ruby dan lainnya lewat server.', '/tools/compiler', 'Buka Compiler'],
    [['beautif', 'rapikan', 'format'], 'Code Beautifier merapikan kode (JS, CSS, HTML, JSON, dll.).', '/tools/beautify', 'Buka Beautifier'],
    [['stats', 'statistik', 'traffic', 'live'], 'Live Stats menampilkan lalu lintas dan status API secara real-time.', '/stats', 'Buka Live Stats'],
    [['playground', 'tes api', 'test api', 'request', 'openapi', 'spesifikasi', 'spec'], 'API Playground: pilih endpoint, atur metode/params/body, kirim request, dan salin kodenya dalam 18 bahasa.', '/playground', 'Buka Playground'],
  ];
  const navVerb = has(qt, 'buka', 'ke halaman', 'pergi', 'open', 'go to', 'navigasi', 'di mana', 'dimana', 'cara', 'gimana', 'bagaimana', 'tentang', 'apa itu');
  for (const [keys, text, href, label] of guides) {
    if (has(qt, ...keys) && (navVerb || qt.split(' ').length <= 3)) return { text, actions: [{ label, href }] };
  }

  // pencarian umum: endpoint + halaman
  const ws = words(qt);
  const pages = SITE_PAGES.map((p) => ({ p, s: scorePage(p, qt, ws) })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => ({ title: x.p.title, sub: x.p.desc, href: x.p.href }));
  const wantsEndpoint = has(qt, 'endpoint', 'api', 'route', 'path', '/') || !pages.length;
  const ops = wantsEndpoint ? await searchOps(qt, ws, 5) : [];
  if (ops.length || pages.length) {
    const cards = [...ops.map(opCard), ...pages].slice(0, 6);
    return { text: ops.length ? `Ketemu ${ops.length} endpoint${pages.length ? ' dan halaman terkait' : ''}:` : 'Mungkin ini yang Anda cari:', cards };
  }
  return { fallback: true, text: 'Maaf, saya belum menemukan jawabannya. Coba kata kunci lain, mis. “cari endpoint upload”, “kode go untuk /api/health”, atau “cara pakai paste”.', actions: [{ label: 'Apa yang bisa kamu lakukan?', ask: true }] };
}
