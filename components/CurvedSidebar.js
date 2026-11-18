import { useEffect } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';
import { Home, Terminal, Activity, MessageSquare, FileText, FileCode, Wand2, UploadCloud, User, LogIn, LogOut, Search, Sliders, X, TerminalSquare, BookOpen, ExternalLink } from 'lucide-react';
import WudysoftBrand from '@/components/WudysoftBrand';
import { sound } from '@/src/lib/interactiveEffects';

const GROUPS = [
  { title: 'Navigasi', items: [
    { href: '/', label: 'Beranda', Icon: Home },
    { href: '/playground', label: 'API Playground', Icon: Terminal },
    { href: '/stats', label: 'Live Stats', Icon: Activity },
    { href: '/rooms', label: 'Chat Rooms', Icon: MessageSquare },
  ] },
  { title: 'Tools', items: [
    { href: '/tools/pastes', label: 'Pastes', Icon: FileText },
    { href: '/tools/code-share', label: 'Code Share', Icon: FileCode },
    { href: '/tools/compiler', label: 'Compiler', Icon: TerminalSquare },
    { href: '/tools/beautify', label: 'Code Beautifier', Icon: Wand2 },
    { href: '/tools/upload', label: 'Multi-Host Upload', Icon: UploadCloud },
  ] },
  { title: 'Developer', items: [
    { href: '/api/openapi', label: 'OpenAPI Spec', Icon: BookOpen, external: true },
  ] },
];

const isActive = (path, href) => (href === '/' ? path === '/' : path === href || path.startsWith(`${href}/`));

/**
 * Sidebar melengkung bergaya glassmorphism: sudut kanan sangat membulat, tab aktif "menyatu"
 * ke tepi dengan lekukan terbalik, item masuk bertahap. Dibuka dari tombol menu di header.
 */
export default function CurvedSidebar({ open, onClose, user, pathname, onSearch, onTheme, onLogout }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [open, onClose]);

  let n = 0;
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="sb-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.25 }} />
          <motion.aside
            className="sb-panel"
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

            <header className="sb-head">
              <WudysoftBrand onClick={() => { sound.playClick(); onClose(); }} />
              <button className="sb-x" onClick={() => { sound.playClick(); onClose(); }} aria-label="Tutup menu"><X size={18} /></button>
            </header>

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
            </nav>
            <div className="sb-spacer" aria-hidden="true"><small>Wudysoft · v{process.env.NEXT_PUBLIC_APP_VERSION || '1.0'}</small></div>
          </motion.aside>
        </>
      )}
      <style jsx global>{`
        .sb-backdrop { position: fixed; inset: 0; z-index: 1900; background: rgba(2, 6, 16, 0.55); backdrop-filter: blur(3px); }
        .sb-panel {
          position: fixed; z-index: 1901; top: calc(var(--safe-top, 0px) + 10px); bottom: calc(var(--safe-bottom, 0px) + 10px); left: 0;
          width: min(310px, 86vw); display: flex; flex-direction: column; gap: 10px; padding: 16px 0 14px 14px; overflow: hidden;
          border-radius: 0 56px 56px 0;
          background: linear-gradient(160deg, color-mix(in srgb, var(--surface) 62%, transparent), color-mix(in srgb, var(--surface) 38%, transparent));
          backdrop-filter: blur(26px) saturate(150%); -webkit-backdrop-filter: blur(26px) saturate(150%);
          border: 1px solid color-mix(in srgb, #fff 16%, transparent); border-left: none;
          box-shadow: 0 30px 80px -20px rgba(0,0,0,.7), inset 0 1px 0 color-mix(in srgb, #fff 22%, transparent), inset -1px 0 0 color-mix(in srgb, var(--a2) 35%, transparent);
          
        }
        .sb-glow { position: absolute; border-radius: 50%; filter: blur(46px); pointer-events: none; opacity: .5; }
        .sb-glow.g1 { width: 190px; height: 190px; top: -60px; left: -60px; background: var(--a1); }
        .sb-glow.g2 { width: 170px; height: 170px; bottom: 40px; right: -70px; background: var(--a3); opacity: .3; }
        .sb-head { position: relative; display: flex; align-items: center; justify-content: space-between; padding-right: 18px; }
        .sb-x { width: 36px; height: 36px; border-radius: 50%; display: grid; place-items: center; background: color-mix(in srgb, #fff 8%, transparent); border: 1px solid var(--border); color: var(--muted); cursor: pointer; transition: transform .35s cubic-bezier(.34,1.56,.64,1), color .2s; }
        .sb-x:hover { color: var(--text); transform: rotate(90deg); }
        .sb-nav { position: relative; flex: 1; overflow-y: auto; display: grid; align-content: start; gap: 14px; padding: 6px 0; scrollbar-width: none; }
        .sb-nav::-webkit-scrollbar { display: none; }
        .sb-cap { font-size: .64rem; letter-spacing: .14em; text-transform: uppercase; color: var(--muted); font-family: var(--font-mono); padding: 0 0 6px 10px; }
        .sb-item { position: relative; display: flex; align-items: center; gap: 12px; height: 46px; padding: 0 16px 0 10px; margin: 2px 0; color: var(--muted); text-decoration: none; font-size: .88rem; font-weight: 600; border-radius: 18px 0 0 18px; transition: color .2s, background .25s, transform .25s; }
        .sb-ico { width: 32px; height: 32px; border-radius: 12px; display: grid; place-items: center; flex-shrink: 0; transition: background .25s, transform .3s cubic-bezier(.34,1.56,.64,1); }
        .sb-item:hover { color: var(--text); background: color-mix(in srgb, #fff 6%, transparent); transform: translateX(3px); }
        .sb-item:hover .sb-ico { transform: scale(1.12) rotate(-6deg); }
        .sb-item.active { color: var(--text); }
        .sb-item.active .sb-ico { background: linear-gradient(135deg, var(--a1), var(--a3)); color: var(--on-accent); box-shadow: 0 6px 16px -4px var(--a1); }
        .sb-item.active { background: linear-gradient(90deg, color-mix(in srgb, var(--a1) 32%, transparent), color-mix(in srgb, var(--a1) 10%, transparent)); box-shadow: inset 3px 0 0 var(--a2); }
        .sb-label { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sb-ext { opacity: .55; }
        .sb-top { position: relative; display: grid; gap: 8px; padding-right: 14px; }
        .sb-quick { display: grid; grid-auto-flow: column; grid-auto-columns: 1fr; gap: 6px; }
        .sb-quick button { display: flex; align-items: center; justify-content: center; gap: 6px; height: 38px; border-radius: 14px; background: color-mix(in srgb, #fff 7%, transparent); border: 1px solid var(--border); color: var(--text); font: inherit; font-size: .74rem; font-weight: 600; cursor: pointer; transition: border-color .2s, transform .2s; }
        .sb-quick button:hover { border-color: var(--a2); transform: translateY(-2px); }
        .sb-quick button.danger { color: #f87171; }
        .sb-spacer { position: relative; flex-shrink: 0; height: 52px; display: flex; align-items: flex-end; justify-content: flex-end; padding: 0 28px 6px 0; }
        .sb-spacer small { font-family: var(--font-mono); font-size: .62rem; color: var(--muted); opacity: .7; }
        .sb-user { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 22px; background: color-mix(in srgb, #fff 7%, transparent); border: 1px solid var(--border); min-width: 0; }
        .sb-ava { width: 40px; height: 40px; border-radius: 50%; overflow: hidden; display: grid; place-items: center; flex-shrink: 0; background: linear-gradient(135deg, var(--a1), var(--a3)); color: var(--on-accent); font-weight: 800; text-decoration: none; }
        .sb-ava img { width: 100%; height: 100%; object-fit: cover; }
        .sb-uinfo { min-width: 0; flex: 1; display: grid; }
        .sb-uinfo b { font-size: .82rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sb-uinfo small { font-size: .68rem; color: var(--muted); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .sb-out-unused { width: 34px; height: 34px; border-radius: 50%; display: grid; place-items: center; background: transparent; border: 1px solid var(--border); color: #f87171; cursor: pointer; flex-shrink: 0; }
        .sb-login { display: flex; align-items: center; justify-content: center; gap: 8px; height: 44px; border-radius: 22px; background: linear-gradient(135deg, var(--a1), var(--a3)); color: var(--on-accent); font-weight: 700; font-size: .85rem; text-decoration: none; box-shadow: 0 10px 24px -8px var(--a1); }
        @supports not (backdrop-filter: blur(1px)) { .sb-panel { background: var(--bg2); } }
      `}</style>
    </AnimatePresence>
  );
}
