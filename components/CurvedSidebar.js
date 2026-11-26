import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Terminal, Activity, MessageSquare, FileText, FileCode, Wand2, UploadCloud, User, LogIn, LogOut, Search, Sliders, X, ChevronLeft, MoreHorizontal, TerminalSquare, BookOpen, ExternalLink, Gauge, Webhook, MessageSquareText, Newspaper, MousePointerClick, Database, Gamepad2 } from 'lucide-react';
import WudysoftBrand from '@/components/WudysoftBrand';
import { sound } from '@/src/lib/interactiveEffects';

const GROUPS = [
  { title: 'Navigasi', items: [
    { href: '/', label: 'Beranda', Icon: Home },
    { href: '/playground', label: 'API Playground', Icon: Terminal },
    { href: '/docs?tab=stats', label: 'Live Stats', Icon: Activity },
    { href: '/rooms', label: 'Chat Rooms', Icon: MessageSquare },
    { href: '/community', label: 'Komentar', Icon: MessageSquareText },
    { href: '/community?tab=posts', label: 'Posts', Icon: Newspaper },
  ] },
  { title: 'Tools', items: [
    { href: '/tools/pastes', label: 'Pastes', Icon: FileText },
    { href: '/tools/code-share', label: 'Code Share', Icon: FileCode },
    { href: '/tools/compiler', label: 'Compiler', Icon: TerminalSquare },
    { href: '/tools/beautify', label: 'Code Beautifier', Icon: Wand2 },
    { href: '/tools/upload', label: 'Multi-Host Upload', Icon: UploadCloud },
    { href: '/tools/hit', label: 'Hit Counter', Icon: MousePointerClick },
    { href: '/tools/db', label: 'Data Store', Icon: Database },
  ] },
  { title: 'Game', items: [
    { href: '/games', label: 'Arena Game', Icon: Gamepad2 },
  ] },
  { title: 'Developer', items: [
    { href: '/docs', label: 'Dokumentasi API', Icon: BookOpen },
    { href: '/docs?tab=status', label: 'Status Layanan', Icon: Gauge },
    { href: '/webhooks', label: 'Webhook Inspector', Icon: Webhook },
    { href: '/profile?tab=kontak', label: 'Kontak & Komunitas', Icon: MessageSquare },
    { href: '/api/openapi', label: 'OpenAPI Spec', Icon: ExternalLink, external: true },
  ] },
];

const ALL_ITEMS = GROUPS.flatMap((g) => g.items).filter((it) => !it.external);
const DOTS = ['#f59e0b', '#34d399', '#f472b6', '#60a5fa', '#a78bfa', '#fb7185'];
const dotOf = (str) => DOTS[[...str].reduce((a, c) => a + c.charCodeAt(0), 0) % DOTS.length];
const REC_KEY = 'wd_recent_v1';
const readRecent = () => { try { return JSON.parse(localStorage.getItem(REC_KEY) || '[]'); } catch { return []; } };
const labelOf = (path) => (ALL_ITEMS.find((it) => it.href.split('?')[0] === path) || {}).label || path.split('/').filter(Boolean).pop() || 'Beranda';

const isActive = (path, href) => {
  const [hp, hq = ''] = href.split('?');
  const [pp, pq = ''] = path.split('?');
  if (hp === '/') return pp === '/';
  if (pp !== hp && !pp.startsWith(`${hp}/`)) return false;
  const tab = new URLSearchParams(pq).get('tab') || '';
  return (new URLSearchParams(hq).get('tab') || '') === tab; // item bertab hanya aktif pada tab-nya
};

/**
 * Sidebar melengkung bergaya glassmorphism: sudut kanan sangat membulat, tab aktif "menyatu"
 * ke tepi dengan lekukan terbalik, item masuk bertahap. Dibuka dari tombol menu di header.
 */
export default function CurvedSidebar({ open, onClose, user, pathname, onSearch, onTheme, onLogout }) {
  const [mini, setMini] = useState(false);
  const [menu, setMenu] = useState(false);
  const [recent, setRecent] = useState([]);
  useEffect(() => { try { setMini(localStorage.getItem('wd_sb_mini') === '1'); } catch {} }, []);
  const toggleMini = () => setMini((v) => { try { localStorage.setItem('wd_sb_mini', v ? '0' : '1'); } catch {} return !v; });
  // halaman terakhir dikunjungi (lokal di perangkat): path → { n: jumlah kunjungan, t: waktu }
  useEffect(() => {
    const path = (pathname || '').split('?')[0];
    if (!path || path.startsWith('/api')) return;
    try {
      const map = Object.fromEntries(readRecent().map((r) => [r.path, r]));
      map[path] = { path, n: (map[path]?.n || 0) + 1, t: Date.now() };
      localStorage.setItem(REC_KEY, JSON.stringify(Object.values(map).sort((a, b) => b.t - a.t).slice(0, 12)));
    } catch {}
  }, [pathname]);
  useEffect(() => { if (open) { setMenu(false); setRecent(readRecent().filter((r) => r.path !== (pathname || '').split('?')[0]).slice(0, 4)); } }, [open, pathname]);
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  let n = 0;
  const curLabel = (GROUPS.flatMap((g) => g.items).find((it) => !it.external && isActive(pathname, it.href)) || { label: 'Menu' }).label;
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="sb-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />
          <motion.aside
            className={`sb-panel ${mini ? 'is-mini' : ''}`}
            role="dialog"
            aria-modal="true"
            aria-label="Menu navigasi"
            initial={{ x: '-105%' }}
            animate={{ x: 0 }}
            exit={{ x: '-105%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 30 }}
          >
            <span className="sb-glow g1" aria-hidden="true" />
            <span className="sb-glow g2" aria-hidden="true" />

            <div className="sb-main">
            <header className="sb-head">
              <WudysoftBrand onClick={() => { sound.playClick(); onClose(); }} />
              <button type="button" className="sb-collapse" onClick={() => { sound.playClick(); toggleMini(); }} aria-label={mini ? 'Lebarkan sidebar' : 'Ciutkan sidebar'} title={mini ? 'Lebarkan' : 'Ciutkan'}><ChevronLeft size={16} /></button>
              <button className="sb-x" onClick={() => { sound.playClick(); onClose(); }} aria-label="Tutup menu"><X size={18} /></button>
            </header>

            <button type="button" className="sb-search" onClick={() => { sound.playClick(); onClose(); onSearch(); }}>
              <Search size={16} /> <span>Cari halaman…</span> <kbd>⌘K</kbd>
            </button>

            <div className="sb-top">
              {user ? (
                <div className="sb-user">
                  <Link href="/profile" className="sb-ava" onClick={onClose} aria-label="Profil saya">
                    {user.image ? <img src={user.image} alt="" referrerPolicy="no-referrer" /> : <span>{(user.name || 'U').trim()[0]?.toUpperCase()}</span>}
                  </Link>
                  <div className="sb-uinfo"><b>{user.name}</b><small>{user.email || 'Sesi tamu'}</small></div>
                </div>
              ) : (
                <Link href="/auth" className="sb-login" onClick={() => { sound.playClick(); onClose(); }}><LogIn size={16} /> Masuk / Daftar</Link>
              )}
              <div className="sb-quick">
                <button onClick={() => { sound.playClick(); onClose(); onSearch(); }}><Search size={15} /> Cari</button>
                <button onClick={() => { sound.playClick(); onClose(); onTheme(); }}><Sliders size={15} /> Tema</button>
                {user && <button className="danger" onClick={() => { onClose(); onLogout(); }} aria-label="Keluar"><LogOut size={15} /> Keluar</button>}
              </div>
            </div>

            <nav className="sb-nav" aria-label="Menu">
              {GROUPS.map((g) => (
                <div key={g.title} className="sb-group">
                  <div className="sb-cap">{g.title}</div>
                  {g.items.map(({ href, label, Icon, external }) => {
                    const i = n++;
                    const on = isActive(pathname, href);
                    return (
                      <motion.div key={href} initial={{ opacity: 0, x: -22 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.08 + i * 0.045, type: 'spring', stiffness: 280, damping: 26 }}>
                        {external ? (
                          <a href={href} target="_blank" rel="noopener noreferrer" className="sb-item" onClick={() => sound.playClick()}>
                            <span className="sb-ico"><Icon size={18} /></span>
                            <span className="sb-label">{label}</span>
                            <ExternalLink size={13} className="sb-ext" />
                          </a>
                        ) : (
                          <Link href={href} className={`sb-item ${on ? 'active' : ''}`} aria-current={on ? 'page' : undefined} onClick={() => { sound.playClick(); onClose(); }}>
                            <span className="sb-ico"><Icon size={18} /></span>
                            <span className="sb-label">{label}</span>
                          </Link>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              ))}

              {recent.length > 0 && (
                <div className="sb-group sb-recent">
                  <div className="sb-cap">Terakhir dikunjungi</div>
                  {recent.map((r) => (
                    <Link key={r.path} href={r.path} className="sb-rec" onClick={() => { sound.playClick(); onClose(); }} title={labelOf(r.path)}>
                      <i style={{ background: dotOf(r.path) }} aria-hidden="true" />
                      <span className="sb-label">{labelOf(r.path)}</span>
                      <em className="sb-rec-n">{r.n}</em>
                    </Link>
                  ))}
                </div>
              )}
            </nav>
            <div className="sb-foot">
              {menu && (
                <div className="sb-pop" role="menu">
                  <Link href="/profile" role="menuitem" onClick={() => { sound.playClick(); onClose(); }}><User size={14} /> Profil</Link>
                  <button type="button" role="menuitem" onClick={() => { sound.playClick(); onClose(); onTheme(); }}><Sliders size={14} /> Tema</button>
                  {user ? <button type="button" role="menuitem" className="danger" onClick={() => { onClose(); onLogout(); }}><LogOut size={14} /> Keluar</button>
                    : <Link href="/auth" role="menuitem" onClick={() => { sound.playClick(); onClose(); }}><LogIn size={14} /> Masuk</Link>}
                </div>
              )}
              <div className="sb-fcard">
                <span className="sb-fava">{user?.image ? <img src={user.image} alt="" referrerPolicy="no-referrer" /> : <b>{(user?.name || 'T').trim()[0]?.toUpperCase()}</b>}<i className={user ? 'on' : ''} /></span>
                <span className="sb-uinfo"><b>{user?.name || 'Tamu'}</b><small>{user?.email || 'Belum masuk'}</small></span>
                <button type="button" className="sb-more" onClick={() => { sound.playClick(); setMenu((v) => !v); }} aria-label="Menu akun" aria-expanded={menu}><MoreHorizontal size={16} /></button>
              </div>
            </div>
            <div className="sb-spacer" aria-hidden="true"><small>Wudysoft · v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0'}</small></div>
            </div>

            {/* rel kanan (gaya "Rel"): aksi cepat + judul halaman vertikal */}
            <aside className="sb-rail" aria-label="Aksi cepat">
              <button type="button" className="rl-main" onClick={() => { sound.playClick(); onClose(); onSearch(); }} aria-label="Cari" title="Cari"><Search size={17} /></button>
              <button type="button" onClick={() => { sound.playClick(); onClose(); onTheme(); }} aria-label="Tema" title="Tema"><Sliders size={17} /></button>
              {user
                ? <button type="button" onClick={() => { onClose(); onLogout(); }} aria-label="Keluar" title="Keluar"><LogOut size={17} /></button>
                : <Link href="/auth" className="rl-btn" onClick={() => { sound.playClick(); onClose(); }} aria-label="Masuk" title="Masuk"><LogIn size={17} /></Link>}
              <button type="button" onClick={() => { sound.playClick(); onClose(); }} aria-label="Tutup menu" title="Tutup"><X size={17} /></button>
              <span className="rl-cap" aria-hidden="true">{curLabel}</span>
            </aside>
          </motion.aside>
        </>
      )}
      <style jsx global>{`
        .sb-backdrop { position: fixed; inset: 0; z-index: 1900; background: rgba(2, 6, 16, 0.55); backdrop-filter: blur(3px); }
        .sb-panel {
          position: fixed; z-index: 1901; top: 0; bottom: 0; left: 0; height: 100dvh;
          width: min(340px, 88vw); display: flex; flex-direction: column; gap: 10px; padding: calc(var(--safe-top, 0px) + 14px) 0 0 14px; overflow: hidden;
          border-radius: 0;
          background: var(--surface); color: var(--text);
          border-right: 1px solid var(--border);
          box-shadow: 10px 0 30px color-mix(in srgb, var(--shadow-c, #000) 55%, transparent);
        }
        .sb-glow { position: absolute; border-radius: 50%; filter: blur(46px); pointer-events: none; opacity: .5; }
        .sb-glow.g1 { width: 190px; height: 190px; top: -60px; left: -60px; background: var(--a1); }
        .sb-glow.g2 { width: 170px; height: 170px; bottom: 40px; right: -70px; background: var(--a3); opacity: .3; }
        .sb-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding-right: 18px; }
        .sb-x { width: 36px; height: 36px; border-radius: var(--r-dock-btn, 8px); display: grid; place-items: center; background: color-mix(in srgb, #fff 8%, transparent); border: 1px solid var(--border); color: var(--muted); cursor: pointer; transition: transform .35s cubic-bezier(.34,1.56,.64,1), color .2s; }
        .sb-x:hover { color: var(--text); transform: rotate(90deg); }
        .sb-nav { position: relative; flex: 1; overflow-y: auto; display: grid; align-content: start; gap: 14px; padding: 6px 0; scrollbar-width: none; }
        .sb-nav::-webkit-scrollbar { display: none; }
        .sb-cap { font-size: .64rem; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); font-family: var(--font-mono); padding: 0 0 6px 10px; }
        .sb-item { position: relative; display: flex; align-items: center; gap: 12px; height: 46px; padding: 0 16px 0 10px; margin: 2px 0; color: var(--muted); text-decoration: none; font-size: .88rem; font-weight: 600; border-radius: var(--r-btn, 10px) 0 0 var(--r-btn, 10px); transition: color .2s, background .25s, transform .25s; }
        .sb-ico { width: 32px; height: 32px; border-radius: var(--r-dock-btn, 8px); display: grid; place-items: center; flex-shrink: 0; transition: background .25s, transform .3s cubic-bezier(.34,1.56,.64,1); }
        .sb-item:hover { color: var(--text); background: color-mix(in srgb, #fff 6%, transparent); transform: translateX(3px); }
        .sb-item:hover .sb-ico { transform: scale(1.12) rotate(-6deg); }
        .sb-item.active { color: var(--text); }
        .sb-item.active .sb-ico { background: linear-gradient(135deg, var(--a1), var(--a3)); color: var(--on-accent); box-shadow: 0 6px 16px -4px var(--a1); }
        .sb-item.active { background: linear-gradient(90deg, color-mix(in srgb, var(--a1) 32%, transparent), color-mix(in srgb, var(--a1) 10%, transparent)); box-shadow: inset 3px 0 0 var(--a2); }
        .sb-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sb-ext { opacity: .55; }
        .sb-top { position: relative; display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px; padding-right: 14px; }
        .sb-quick { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6px; }
        .sb-quick button { display: flex; align-items: center; justify-content: center; gap: 6px; height: 38px; border-radius: var(--r-btn, 10px); background: var(--surface-2); border: 1px solid var(--border); color: var(--text); font: inherit; font-size: .74rem; font-weight: 600; cursor: pointer; transition: border-color .2s, transform .2s; }
        .sb-quick button:hover { border-color: var(--a2); transform: translateY(-2px); }
        .sb-quick button.danger { color: var(--err); }
        .sb-spacer { position: relative; flex-shrink: 0; height: 52px; display: flex; align-items: flex-end; justify-content: flex-end; padding: 0 28px 6px 0; }
        .sb-spacer small { font-family: var(--font-mono); font-size: .62rem; color: var(--muted); opacity: .7; }
        .sb-user { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: var(--r-btn, 10px); background: var(--surface-2); border: 1px solid var(--border); min-width: 0; }
        .sb-ava { width: 40px; height: 40px; border-radius: var(--r-dock-btn, 8px); overflow: hidden; display: grid; place-items: center; flex-shrink: 0; background: linear-gradient(135deg, var(--a1), var(--a3)); color: var(--on-accent); font-weight: 800; text-decoration: none; }
        .sb-ava img { width: 100%; height: 100%; object-fit: cover; }
        .sb-uinfo { min-width: 0; flex: 1; display: grid; }
        .sb-uinfo b { font-size: .82rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sb-uinfo small { font-size: .68rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sb-out-unused { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: transparent; border: 1px solid var(--border); color: var(--err); cursor: pointer; flex-shrink: 0; }
        .sb-login { display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; border-radius: var(--r-btn, 10px); background: linear-gradient(135deg, var(--a1), var(--a3)); color: var(--on-accent); font-weight: 700; font-size: .85rem; text-decoration: none; box-shadow: 0 10px 24px -8px var(--a1); }

        /* ---------------- struktur umum ---------------- */
        .sb-main { position: relative; flex: 1; min-height: 0; min-width: 0; display: flex; flex-direction: column; gap: 10px; }
        .sb-rail, .sb-search { display: none; }

        /* ============ GAYA "REL": panel kaca + rel putih di kanan, tab aktif menyatu ke rel ============ */
        html:is([data-sbs='rail'], [data-sbs='aurora']) { --sb-w: 64px; --sb-paper: color-mix(in srgb, var(--text) 93%, var(--bg1)); --sb-ink: color-mix(in srgb, var(--bg1) 94%, #000); }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-panel {
          top: 12px; bottom: 12px; left: 12px; height: auto; width: min(372px, calc(100vw - 24px)); padding: 0; gap: 0; border-radius: 36px; display: grid; grid-template-columns: minmax(0, 1fr) var(--sb-w);
          background: linear-gradient(160deg, color-mix(in srgb, var(--a1) 38%, var(--surface)), color-mix(in srgb, var(--surface) 92%, #000) 62%);
          border: 1px solid color-mix(in srgb, #fff 16%, transparent);
          box-shadow: 0 30px 70px -20px rgba(0,0,0,.75), inset 0 1px 0 color-mix(in srgb, #fff 22%, transparent);
        }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-main { padding: 16px 0 12px 14px; gap: 12px; }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-head { padding-right: 14px; } html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-x { display: none; }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-search { display: flex; align-items: center; gap: 10px; height: 42px; margin-right: 14px; padding: 0 14px; border-radius: 999px; cursor: pointer; color: var(--muted); font: inherit; font-size: .82rem;
          background: color-mix(in srgb, #fff 8%, transparent); border: 1px solid color-mix(in srgb, #fff 14%, transparent); box-shadow: inset 0 1px 0 color-mix(in srgb, #fff 14%, transparent); }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-search span { flex: 1; text-align: left; } html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-search kbd { font-family: var(--font-mono); font-size: .64rem; padding: 2px 6px; border-radius: 6px; background: color-mix(in srgb, #fff 12%, transparent); }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-top { order: 5; padding-right: 14px; } html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-quick { display: none; }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-nav { gap: 10px; padding: 14px 0; }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-cap { padding: 0 0 6px 8px; letter-spacing: .16em; }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-item { height: 48px; margin: 4px 14px 4px 0; border-radius: 999px; padding: 0 16px 0 8px; color: var(--text);
          background: linear-gradient(180deg, color-mix(in srgb, #fff 12%, transparent), color-mix(in srgb, #fff 4%, transparent)); border: 1px solid color-mix(in srgb, #fff 12%, transparent); box-shadow: 0 8px 18px -12px rgba(0,0,0,.6), inset 0 1px 0 color-mix(in srgb, #fff 16%, transparent); }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-item:hover { transform: translateX(3px); background: color-mix(in srgb, #fff 16%, transparent); }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-item.active { margin-right: 0; padding-right: 14px; border-radius: 999px 0 0 999px; color: var(--sb-ink); background: var(--sb-paper); border-color: transparent; box-shadow: none; z-index: 2; }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-item.active .sb-ico { background: transparent; box-shadow: none; color: var(--sb-ink); }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-item.active::before, html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-item.active::after { content: ''; position: absolute; right: 0; width: var(--sb-nr, 36px); height: var(--sb-nr, 36px); pointer-events: none; }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-item.active::before { top: calc(var(--sb-nr, 36px) * -1 + 1px); height: calc(var(--sb-nr, 36px)); background: var(--sb-paper); -webkit-mask: var(--sb-mask-top) 0 0 / 100% 100% no-repeat; mask: var(--sb-mask-top) 0 0 / 100% 100% no-repeat; }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-item.active::after { bottom: calc(var(--sb-nr, 36px) * -1 + 1px); height: calc(var(--sb-nr, 36px)); background: var(--sb-paper); -webkit-mask: var(--sb-mask-bot) 0 0 / 100% 100% no-repeat; mask: var(--sb-mask-bot) 0 0 / 100% 100% no-repeat; }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-spacer { display: none; }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-rail { display: flex; position: relative; z-index: 1; flex-direction: column; align-items: center; gap: 10px; padding: 14px 0 16px; margin: 0; border-radius: 0 36px 36px 0; background: var(--sb-paper); color: var(--sb-ink); }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-rail > button, html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-rail > .rl-btn { width: 40px; height: 40px; flex: none; display: grid; place-items: center; border: 0; border-radius: 13px; cursor: pointer; color: color-mix(in srgb, var(--sb-ink) 55%, transparent); background: color-mix(in srgb, var(--sb-ink) 6%, transparent); transition: transform .2s, background .2s, color .2s; text-decoration: none; }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-rail > button:hover, html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-rail > .rl-btn:hover { color: var(--sb-ink); background: color-mix(in srgb, var(--sb-ink) 12%, transparent); transform: translateY(-2px); }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-rail > .rl-main { color: var(--on-accent, #fff); background: linear-gradient(135deg, var(--a1), var(--a3)); box-shadow: 0 10px 20px -8px var(--a1); }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-rail > .rl-main:hover { color: var(--on-accent, #fff); }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .rl-cap { margin-top: auto; writing-mode: vertical-rl; transform: rotate(180deg); font-family: var(--font-mono); font-size: .66rem; letter-spacing: .24em; text-transform: uppercase; color: color-mix(in srgb, var(--sb-ink) 45%, transparent); max-height: 55%; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
        html:is([data-sbs='rail'], [data-sbs='aurora']) .sb-glow { opacity: .35; }
        @media (max-width: 380px) { html:is([data-sbs='rail'], [data-sbs='aurora']) { --sb-w: 56px; } }

        /* ============ GAYA "KACA": kartu kaca melayang, item pil ============ */
        html:is([data-sbs='glass'], [data-sbs='dock']) .sb-panel { top: 12px; bottom: 12px; left: 12px; height: auto; border-radius: 30px; padding: 14px 0 0 12px; border: 1px solid color-mix(in srgb, #fff 18%, transparent);
          background: linear-gradient(165deg, color-mix(in srgb, var(--surface) 62%, transparent), color-mix(in srgb, var(--bg1) 70%, transparent)); backdrop-filter: blur(26px) saturate(1.5); -webkit-backdrop-filter: blur(26px) saturate(1.5);
          box-shadow: 0 30px 70px -24px rgba(0,0,0,.7), inset 0 1px 0 color-mix(in srgb, #fff 22%, transparent); }
        html:is([data-sbs='glass'], [data-sbs='dock']) .sb-item { border-radius: 16px; } html:is([data-sbs='glass'], [data-sbs='dock']) .sb-item.active { box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--a2) 45%, transparent), 0 10px 24px -14px var(--a2); }
        html:is([data-sbs='glass'], [data-sbs='dock']) .sb-quick button { border-radius: 14px; }

        /* ============ GAYA "MINIMAL": rata, garis tipis, tanpa cahaya ============ */
        html[data-sbs='minimal'] .sb-panel { border-radius: 0; background: var(--bg1); box-shadow: none; padding-left: 0; }
        html[data-sbs='minimal'] .sb-glow { display: none; }
        html[data-sbs='minimal'] .sb-head, html[data-sbs='minimal'] .sb-top { padding-left: 16px; } html[data-sbs='minimal'] .sb-nav { padding-left: 8px; }
        html[data-sbs='minimal'] .sb-item { border-radius: 8px; height: 40px; } html[data-sbs='minimal'] .sb-item.active { background: color-mix(in srgb, var(--text) 8%, transparent); box-shadow: inset 2px 0 0 var(--a2); }
        html[data-sbs='minimal'] .sb-item.active .sb-ico { background: transparent; box-shadow: none; color: var(--a2); }
        html[data-sbs='minimal'] .sb-ico { width: 26px; }

        /* ============ elemen tambahan: hanya tampil di gaya "Aurora" & "Dok" ============ */
        .sb-collapse, .sb-recent, .sb-foot { display: none; }
        html[data-sbs='aurora'] .sb-top { display: none; }

        /* ============ GAYA "AURORA": rel kaca + ruang kerja, terakhir dikunjungi, kartu akun, bisa diciutkan ============ */
        html[data-sbs='aurora'] .sb-panel { background: linear-gradient(165deg, color-mix(in srgb, var(--a2) 46%, var(--surface)) 0%, color-mix(in srgb, var(--a1) 22%, var(--surface)) 34%, color-mix(in srgb, var(--bg1) 96%, #000) 78%);
          border-color: color-mix(in srgb, #fff 18%, transparent); transition: width .35s cubic-bezier(.2,.8,.2,1); }
        html[data-sbs='aurora'] .sb-panel::before { content: ''; position: absolute; inset: 0; border-radius: inherit; pointer-events: none; z-index: 0;
          background: linear-gradient(115deg, transparent 30%, color-mix(in srgb, #fff 9%, transparent) 46%, transparent 62%); background-size: 240% 100%; animation: sb-sheen 7s ease-in-out infinite; }
        @keyframes sb-sheen { 0%, 100% { background-position: 120% 0; } 50% { background-position: -20% 0; } }
        html[data-sbs='aurora'] .sb-collapse { display: grid; place-items: center; width: 30px; height: 30px; margin-right: 14px; flex: none; border-radius: 50%; cursor: pointer; color: var(--text);
          background: color-mix(in srgb, #fff 14%, transparent); border: 1px solid color-mix(in srgb, #fff 18%, transparent); transition: transform .3s, background .2s; }
        html[data-sbs='aurora'] .sb-collapse:hover { background: color-mix(in srgb, #fff 24%, transparent); }
        html[data-sbs='aurora'] .sb-panel.is-mini .sb-collapse { transform: rotate(180deg); }
        html[data-sbs='aurora'] .sb-head { gap: 8px; } html[data-sbs='aurora'] .sb-head > :first-child { flex: 1; min-width: 0; }
        html[data-sbs='aurora'] .sb-recent { display: grid; margin-top: 4px; }
        .sb-rec { display: flex; align-items: center; gap: 12px; height: 40px; margin: 1px 14px 1px 0; padding: 0 14px 0 14px; border-radius: 14px; color: var(--text); text-decoration: none; font-size: .84rem; font-weight: 600;
          background: color-mix(in srgb, #fff 5%, transparent); transition: background .2s, transform .25s; }
        .sb-rec:hover { background: color-mix(in srgb, #fff 13%, transparent); transform: translateX(3px); }
        .sb-rec > i { width: 11px; height: 11px; border-radius: 4px; flex: none; box-shadow: 0 0 10px -1px currentColor; }
        .sb-rec-n { font-style: normal; font-family: var(--font-mono); font-size: .66rem; color: var(--muted); padding: 2px 7px; border-radius: 99px; background: color-mix(in srgb, #fff 8%, transparent); }
        html:is([data-sbs='aurora'], [data-sbs='dock']) .sb-foot { display: block; position: relative; flex: none; padding: 0 14px 0 0; margin-bottom: 2px; }
        .sb-fcard { display: flex; align-items: center; gap: 10px; padding: 8px 10px 8px 8px; border-radius: 22px; background: color-mix(in srgb, #fff 8%, transparent); border: 1px solid color-mix(in srgb, #fff 14%, transparent); }
        .sb-fava { position: relative; width: 38px; height: 38px; flex: none; border-radius: 50%; display: grid; place-items: center; background: linear-gradient(135deg, #fb923c, #f472b6); color: #fff; font-size: .8rem; }
        .sb-fava img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
        .sb-fava > i { position: absolute; right: -1px; bottom: -1px; width: 11px; height: 11px; border-radius: 50%; background: var(--muted); border: 2px solid var(--surface); }
        .sb-fava > i.on { background: #22c55e; }
        .sb-more { width: 30px; height: 30px; flex: none; display: grid; place-items: center; border: 0; background: none; color: var(--muted); border-radius: 50%; cursor: pointer; }
        .sb-more:hover { color: var(--text); background: color-mix(in srgb, #fff 12%, transparent); }
        .sb-pop { position: absolute; left: 0; right: 14px; bottom: calc(100% + 8px); display: grid; gap: 2px; padding: 6px; border-radius: 18px; z-index: 5; background: color-mix(in srgb, var(--surface) 92%, #000); border: 1px solid var(--border); box-shadow: 0 18px 40px -12px rgba(0,0,0,.7); }
        .sb-pop a, .sb-pop button { display: flex; align-items: center; gap: 10px; height: 36px; padding: 0 12px; border: 0; border-radius: 12px; background: none; color: var(--text); font: inherit; font-size: .8rem; font-weight: 600; text-decoration: none; cursor: pointer; text-align: left; }
        .sb-pop a:hover, .sb-pop button:hover { background: color-mix(in srgb, var(--text) 9%, transparent); } .sb-pop .danger { color: var(--err); }

        /* ============ MODE CIUT (Aurora yang diciutkan) & GAYA "DOK": hanya ikon ============ */
        html[data-sbs='dock'] .sb-panel { width: 84px; padding: 14px 0 0 8px; }
        html[data-sbs='aurora'] .sb-panel.is-mini { width: 84px; grid-template-columns: minmax(0, 1fr); }
        html[data-sbs='aurora'] .sb-panel.is-mini .sb-rail { display: none; }
        html[data-sbs='aurora'] .sb-panel.is-mini .sb-main { padding: 14px 10px 12px 10px; }
        :is(html[data-sbs='dock'] .sb-panel, html[data-sbs='aurora'] .sb-panel.is-mini) :is(.sb-label, .sb-cap, .sb-ext, .sb-uinfo, .sb-more, .sb-rec-n, .sb-search span, .sb-search kbd, .sb-spacer, .sb-quick, .sb-top, .wd-word, .sb-recent, .sb-x) { display: none !important; }
        :is(html[data-sbs='dock'] .sb-panel, html[data-sbs='aurora'] .sb-panel.is-mini) :is(.sb-head, .sb-search) { justify-content: center; padding: 0; margin-right: 0; }
        :is(html[data-sbs='dock'] .sb-panel, html[data-sbs='aurora'] .sb-panel.is-mini) .sb-search { display: grid; place-items: center; width: 46px; height: 46px; margin: 0 auto; padding: 0; border-radius: 50%; }
        :is(html[data-sbs='dock'] .sb-panel, html[data-sbs='aurora'] .sb-panel.is-mini) .sb-collapse { margin: 6px 0 0; }
        html[data-sbs='dock'] .sb-collapse { display: none; }
        :is(html[data-sbs='dock'] .sb-panel, html[data-sbs='aurora'] .sb-panel.is-mini) .sb-head { flex-direction: column; gap: 8px; }
        :is(html[data-sbs='dock'] .sb-panel, html[data-sbs='aurora'] .sb-panel.is-mini) .sb-item { width: 48px; height: 48px; margin: 4px auto; padding: 0; justify-content: center; border-radius: 16px; transform: none; }
        :is(html[data-sbs='dock'] .sb-panel, html[data-sbs='aurora'] .sb-panel.is-mini) .sb-item::before, :is(html[data-sbs='dock'] .sb-panel, html[data-sbs='aurora'] .sb-panel.is-mini) .sb-item::after { display: none; }
        :is(html[data-sbs='dock'] .sb-panel, html[data-sbs='aurora'] .sb-panel.is-mini) .sb-item.active { margin: 4px auto; border-radius: 16px; background: var(--sb-paper, color-mix(in srgb, var(--text) 92%, var(--bg1))); }
        :is(html[data-sbs='dock'] .sb-panel, html[data-sbs='aurora'] .sb-panel.is-mini) .sb-ico { width: 34px; height: 34px; }
        :is(html[data-sbs='dock'] .sb-panel, html[data-sbs='aurora'] .sb-panel.is-mini) .sb-nav { padding: 10px 0; justify-items: center; gap: 4px; }
        :is(html[data-sbs='dock'] .sb-panel, html[data-sbs='aurora'] .sb-panel.is-mini) .sb-group { display: grid; justify-items: center; width: 100%; border-top: 1px solid color-mix(in srgb, #fff 10%, transparent); padding-top: 6px; }
        :is(html[data-sbs='dock'] .sb-panel, html[data-sbs='aurora'] .sb-panel.is-mini) .sb-group:first-child { border-top: 0; padding-top: 0; }
        :is(html[data-sbs='dock'] .sb-panel, html[data-sbs='aurora'] .sb-panel.is-mini) .sb-foot { padding: 0; display: grid; justify-items: center; }
        :is(html[data-sbs='dock'] .sb-panel, html[data-sbs='aurora'] .sb-panel.is-mini) .sb-fcard { padding: 4px; border-radius: 50%; background: none; border: 0; }
        :is(html[data-sbs='dock'] .sb-panel, html[data-sbs='aurora'] .sb-panel.is-mini) .sb-pop { left: 0; right: auto; min-width: 150px; }
        html[data-anim='off'] html[data-sbs='aurora'] .sb-panel::before { animation: none; }
        @media (max-width: 380px) { html[data-sbs='aurora'] .sb-panel:not(.is-mini) { width: calc(100vw - 24px); } }
        @supports not (backdrop-filter: blur(1px)) { .sb-panel { background: var(--bg2); } }
      `}</style>
    </AnimatePresence>
  );
}
