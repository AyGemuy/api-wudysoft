import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './Icons';
import dynamic from 'next/dynamic';
import BgLayer from './BgLayer';
import SiteFooter from './SiteFooter';
import { useFullscreen } from '@/src/lib/fullscreen';
import WudysoftBrand from './WudysoftBrand';
import CurvedSidebar from './CurvedSidebar';
import ThemeFab from './ThemeFab';
import { FileText, MessageSquare, Wand2, UploadCloud, TerminalSquare, Terminal as TermIcon } from 'lucide-react';
import { ThemeContext } from './ThemeContext';
import { logout } from '@/src/lib/nav';
import { loadSpecOps } from '@/src/lib/specIndex';
import { DEFAULT_CONFIG, loadConfig, saveConfig, applyConfig, computeTheme } from '@/src/lib/themes';
import { sound } from '@/src/lib/interactiveEffects';

// Dimuat terpisah (code splitting) agar bundle awal kecil & cepat: studio tema besar hanya diunduh saat dibuka,
// kanvas/cursor adalah efek dekoratif yang tidak perlu menghalangi render pertama.
const CustomThemeStudio = dynamic(() => import('./CustomThemeStudio'), { ssr: false });
const InteractiveCanvas = dynamic(() => import('./InteractiveCanvas'), { ssr: false });
const CursorGlow = dynamic(() => import('./CursorGlow'), { ssr: false });

/** Avatar header: foto bila ada (dan bisa dimuat), jika tidak → inisial nama. */
function Avatar({ user }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [user?.image]);
  if (user?.image && !failed) {
    // referrerPolicy: foto Google/GitHub sering menolak request yang membawa Referer
    return <img src={user.image} alt="" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
  }
  return <span>{(user?.name || 'U').trim()[0]?.toUpperCase() || 'U'}</span>;
}

const DIAL = [
  { href: '/playground', label: 'Playground', Icon: TermIcon },
  { href: '/tools/compiler', label: 'Compiler', Icon: TerminalSquare },
  { href: '/tools/pastes', label: 'Pastes', Icon: FileText },
  { href: '/rooms', label: 'Rooms', Icon: MessageSquare },
];

export default function Layout({ children }) {
  const router = useRouter();
  const { data: session, status } = useSession();
  const user = session?.user || null;

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [studioOpen, setStudioOpen] = useState(false);
  const [studioEver, setStudioEver] = useState(false); // studio tema baru diunduh setelah pertama dibuka
  useEffect(() => { if (studioOpen) setStudioEver(true); }, [studioOpen]);
  const fs = useFullscreen();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [dialOpen, setDialOpen] = useState(false);

  // tombol melayang di tepi (audio) disembunyikan saat panel/sidebar penuh terbuka
  useEffect(() => {
    document.documentElement.toggleAttribute('data-overlay', studioOpen || sidebarOpen);
  }, [studioOpen, sidebarOpen]);
  const [endpoints, setEndpoints] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  // Tutup dropdown profil saat klik di luar / tekan Esc / pindah halaman
  useEffect(() => {
    if (!profileOpen) return;
    const onDown = (e) => {
      if (e.target.closest?.('[data-profile-toggle]')) return;
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false);
    };
    const onKey = (e) => e.key === 'Escape' && setProfileOpen(false);
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [profileOpen]);

  useEffect(() => {
    setProfileOpen(false);
    setSearchOpen(false);
    setSidebarOpen(false);
    setDialOpen(false);
  }, [router.asPath]);

  // Shortcut ⌘K / Ctrl+K dan Esc untuk pencarian
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      } else if (e.key === 'Escape') {
        setSearchOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (!searchOpen) setSearchQuery('');
  }, [searchOpen]);

  // ---- Tema: dimuat dari localStorage setelah mount, diterapkan ke <html> ----
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [hydrated, setHydrated] = useState(false);
  const theme = useMemo(() => computeTheme(config), [config]);

  useEffect(() => {
    setConfig(loadConfig());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyConfig(config);
    saveConfig(config);
    sound.enabled = config.soundEnabled;
  }, [config, hydrated]);

  // sinkron antar-tab/jendela: perubahan tema di satu tab langsung diterapkan di tab lain
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key && !e.key.startsWith('wudysoft_theme')) return;
      setConfig((cur) => {
        const next = loadConfig();
        return JSON.stringify(next) === JSON.stringify(cur) ? cur : next;
      });
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const openStudio = useCallback(() => setStudioOpen(true), []);
  useEffect(() => {
    window.addEventListener('wudysoft:open-studio', openStudio);
    return () => window.removeEventListener('wudysoft:open-studio', openStudio);
  }, [openStudio]);
  useEffect(() => {
    window.addEventListener('wudysoft:open-studio', openStudio);
    return () => window.removeEventListener('wudysoft:open-studio', openStudio);
  }, [openStudio]);

  const themeCtx = useMemo(() => ({ config, setConfig, openStudio }), [config, openStudio]);

  // Endpoint untuk pencarian global diambil dari spesifikasi OpenAPI (dimuat saat pencarian dibuka)
  useEffect(() => {
    if (searchOpen && !endpoints.length) loadSpecOps().then(setEndpoints);
  }, [searchOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const pages = [
      { type: 'Halaman', title: 'Command Deck', sub: 'Beranda', action: '/' },
      { type: 'Halaman', title: 'API Playground', sub: 'Uji endpoint dari OpenAPI', action: '/playground' },
      { type: 'Halaman', title: 'System & API Stats', sub: 'Telemetri realtime', action: '/docs?tab=stats' },
      { type: 'Halaman', title: 'Code Beautifier', sub: 'Tools', action: '/tools/beautify' },
      { type: 'Halaman', title: 'Compiler', sub: 'Tools · jalankan kode langsung', action: '/tools/compiler' },
      { type: 'Halaman', title: 'Multi-Host Uploader', sub: 'Tools', action: '/tools/upload' },
      { type: 'Halaman', title: 'Chat Rooms', sub: 'Komunikasi', action: '/rooms' },
      { type: 'Halaman', title: 'Pastes', sub: 'Tools · simpan & bagikan teks', action: '/tools/pastes' },
      { type: 'Halaman', title: 'Code Share', sub: 'Tools · bagikan potongan kode', action: '/tools/code-share' },
      { type: 'Halaman', title: 'Dokumentasi API', sub: 'Developer · referensi endpoint', action: '/docs' },
      { type: 'Halaman', title: 'Status Layanan', sub: 'Developer · uptime & latensi', action: '/docs?tab=status' },
      { type: 'Halaman', title: 'Komentar', sub: 'Komunikasi · buku tamu', action: '/community' },
      { type: 'Halaman', title: 'Posts', sub: 'Komunikasi · tulisan & pengumuman', action: '/community?tab=posts' },
      { type: 'Halaman', title: 'Hit Counter', sub: 'Tools · penghitung kunjungan', action: '/tools/hit' },
      { type: 'Halaman', title: 'Data Store', sub: 'Tools · penyimpanan JSON', action: '/tools/db' },
      { type: 'Halaman', title: 'Arena Game', sub: 'Game · Tic-Tac-Toe, Catur, Blackjack, Ludo, Akinator', action: '/games' },
      { type: 'Halaman', title: 'Kontak & Komunitas', sub: 'WhatsApp · email · grup · GitHub', action: '/profile?tab=kontak' },
      { type: 'Halaman', title: 'Webhook Inspector', sub: 'Developer · tangkap request', action: '/webhooks' },
      { type: 'Halaman', title: 'Masuk / Daftar', sub: 'Akun', action: '/auth' },
    ].filter((i) => !q || `${i.title} ${i.sub}`.toLowerCase().includes(q));
    const eps = endpoints
      .filter((o) => !q || `${(o.methods || [o.method]).join(' ')} ${o.path} ${o.summary} ${o.tag}`.toLowerCase().includes(q))
      .slice(0, 40)
      .map((o) => ({ type: 'Endpoint', method: o.method, methods: o.methods, title: o.path, sub: o.summary, secure: o.secure, action: `/playground?op=${encodeURIComponent(o.key)}` }));
    return [...pages, ...eps];
  }, [searchQuery, endpoints, user]);

  // Tab navbar bawah (dipakai semua model nav: classic / notch / beam / bubble / label)
  const navItems = [
    { key: 'home', href: '/', label: 'Beranda', Icon: Icons.Home, active: router.pathname === '/' },
    { key: 'api', href: '/playground', label: 'API', Icon: Icons.Terminal, active: router.pathname === '/playground' },
    { key: 'menu', center: true },
    { key: 'search', label: 'Cari', Icon: Icons.Search, onClick: () => setSearchOpen(true) },
    user
      ? { key: 'me', href: '/profile', label: 'Profil', Icon: Icons.User, active: router.pathname === '/profile' }
      : { key: 'me', href: '/auth', label: 'Masuk', Icon: Icons.User, active: router.pathname.startsWith('/auth') },
  ];

  return (
    <ThemeContext.Provider value={themeCtx}>
      <BgLayer config={config} />
      <InteractiveCanvas
        particleType={config.particle}
        color={theme.colors.a2}
        color2={theme.colors.a3}
        paused={config.anim === 'off'}
        speed={config.speed}
      />
      <CursorGlow enabled={config.spotlight && config.anim === 'on'} />

      <div className="bg-grid" aria-hidden="true" />

      <div className="blobs">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
      </div>

      {/* TOP HEADER DOCK — hanya ikon, ukuran seragam */}
      <header className="top-header-wrap">
        <nav className="top-header-nav" aria-label="Navigasi utama">
          <div className="hd-side">
            <button className="hd-btn hd-menu" aria-label="Buka menu" aria-expanded={sidebarOpen} title="Menu" onClick={() => { sound.playClick(); setSidebarOpen(true); }}>
              <Icons.Menu size={18} />
            </button>
            <WudysoftBrand onClick={() => sound.playClick()} />
          </div>

          <button
            className="hd-search"
            aria-label="Cari"
            title="Cari (Ctrl/⌘ + K)"
            onClick={() => {
              sound.playClick();
              setSearchOpen(true);
            }}
          >
            <Icons.Search size={17} />
            <span className="hd-search-text">Cari halaman, endpoint…</span>
            <kbd className="hd-kbd">⌘K</kbd>
          </button>

          <div className="hd-side hd-tools">
            {fs.supported && (
              <button className="hd-btn hd-fs" aria-label={fs.active ? 'Keluar layar penuh' : 'Layar penuh'} aria-pressed={fs.active} title={fs.active ? 'Keluar layar penuh (Esc)' : 'Layar penuh'} onClick={() => { sound.playClick(); fs.toggle(); }}>
                {fs.active ? <Icons.Minimize size={17} /> : <Icons.Maximize size={17} />}
              </button>
            )}
            {status === 'loading' ? (
              <div className="skeleton hd-btn" aria-hidden="true" />
            ) : user ? (
              <div ref={profileRef} className="hd-profile">
                <button
                  className="hd-btn hd-avatar"
                  aria-label={`Akun ${user.name || ''}`}
                  aria-haspopup="menu"
                  aria-expanded={profileOpen}
                  onClick={() => {
                    sound.playClick();
                    setProfileOpen(!profileOpen);
                  }}
                >
                  <Avatar user={user} />
                </button>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      className="profile-dropdown-solid"
                      role="menu"
                      initial={{ opacity: 0, y: -8, scale: 0.96 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.96 }}
                      transition={{ duration: 0.16 }}
                    >
                      <div className="dd-head">
                        <strong>{user.name}</strong>
                        <span>{user.email || 'Sesi tamu'}</span>
                        <em>{user.isGuest ? 'Tamu' : user.provider || 'Akun'}</em>
                      </div>
                      <div className="dd-sep" />
                      <Link href="/profile" className="dropdown-item" role="menuitem" onClick={() => setProfileOpen(false)}>
                        <Icons.User size={14} color="var(--a2)" />
                        <span>Profil saya</span>
                      </Link>
                      <Link href="/docs?tab=stats" className="dropdown-item" role="menuitem" onClick={() => setProfileOpen(false)}>
                        <Icons.Activity size={14} color="var(--a2)" />
                        <span>Live Stats</span>
                      </Link>
                      <Link href="/playground" className="dropdown-item" role="menuitem" onClick={() => setProfileOpen(false)}>
                        <Icons.Terminal size={14} color="var(--a2)" />
                        <span>Playground</span>
                      </Link>
                      <button
                        className="dropdown-item"
                        role="menuitem"
                        onClick={() => {
                          setProfileOpen(false);
                          setStudioOpen(true);
                        }}
                      >
                        <Icons.Sliders size={14} color="var(--a2)" />
                        <span>Tema</span>
                      </button>
                      <button
                        className="dropdown-item logout-btn"
                        role="menuitem"
                        onClick={() => {
                          setProfileOpen(false);
                          logout('/');
                        }}
                      >
                        <Icons.LogOut size={14} style={{ stroke: 'var(--err)' }} />
                        <span style={{ color: 'var(--err)' }}>Keluar</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/auth" className="hd-btn hd-primary" aria-label="Masuk" title="Masuk atau daftar" onClick={() => sound.playClick()}>
                <Icons.User size={17} />
              </Link>
            )}
          </div>
        </nav>
      </header>

      {/* SEARCH MODAL SOLID (TIDAK BOCOR KE BAWAH) */}
      <AnimatePresence>
        {searchOpen && (
          <div className="search-modal-backdrop" onClick={() => setSearchOpen(false)}>
            <motion.div
              className="search-modal-solid"
              initial={{ scale: 0.95, y: -20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: -20 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="search-input-wrap">
                <Icons.Search size={18} color="var(--a2)" />
                <input
                  autoFocus
                  className="search-field"
                  placeholder="Cari halaman atau endpoint OpenAPI…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button onClick={() => setSearchOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <Icons.Close size={18} />
                </button>
              </div>

              <div className="search-results">
                {searchResults.length === 0 && <div className="si-empty">Tidak ada hasil untuk “{searchQuery}”.</div>}
                {searchResults.map((item, idx) => (
                  <div
                    key={`${item.type}-${item.title}-${item.method || ''}-${idx}`}
                    className="search-item"
                    role="button"
                    tabIndex={0}
                    onClick={() => {
                      sound.playBeep();
                      setSearchOpen(false);
                      router.push(item.action);
                    }}
                    onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.click()}
                  >
                    {item.method ? <span className="si-badges">{(item.methods || [item.method]).map((mm) => <span key={mm} className={`si-badge m-${mm}`}>{mm === 'DELETE' ? 'DEL' : mm}</span>)}</span> : <span className="si-badge si-page">{item.type}</span>}
                    <span className="si-text">
                      <b className={item.method ? 'si-path' : ''}>{item.title}</b>
                      {item.sub ? <small>{item.sub}</small> : null}
                    </span>
                    {item.secure && <Icons.Lock size={12} style={{ stroke: 'var(--warn)' }} />}
                    <Icons.ChevronRight size={14} color="var(--a2)" />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <a href="#konten" className="skip-link">Lewati ke konten</a>

      {studioEver && (
      <CustomThemeStudio
        isOpen={studioOpen}
        onClose={() => setStudioOpen(false)}
        config={config}
        setConfig={setConfig}
      />
      )}

      <CurvedSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        user={user}
        pathname={router.asPath.split('#')[0]}
        onSearch={() => setSearchOpen(true)}
        onTheme={() => setStudioOpen(true)}
        onLogout={() => logout('/')}
      />
      <ThemeFab hidden={studioOpen || sidebarOpen} onClick={() => setStudioOpen(true)} />

      <main id="konten" className="wrap app-main" tabIndex={-1}>{children}</main>

      <div className="wrap footer-wrap">
        <SiteFooter />
      </div>

      <AnimatePresence>
        {dialOpen && <motion.div className="dial-scrim" onClick={() => setDialOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />}
      </AnimatePresence>

      {/* FLOATING BOTTOM NAVBAR — model diatur lewat Theme Studio → Nav (data-nav) */}
      <div className="floating-navbar-wrap">
        <nav className="floating-navbar" aria-label="Navigasi bawah">
          {navItems.map((it) => {
            if (it.center) {
              if (!config.navCenter) return null;
              return (
                <div className="dial-slot" key="center">
                  <AnimatePresence>
                    {dialOpen && (
                      <>
                        {DIAL.map((d, i) => {
                          const ang = (-158 + (i * 136) / (DIAL.length - 1)) * (Math.PI / 180);
                          const R = 140;
                          return (
                            <motion.button
                              key={d.href}
                              className="dial-chip"
                              aria-label={d.label}
                              initial={{ x: 0, y: 0, scale: 0.2, opacity: 0 }}
                              animate={{ x: Math.cos(ang) * R, y: Math.sin(ang) * R - 48, scale: 1, opacity: 1 }}
                              exit={{ x: 0, y: 0, scale: 0.2, opacity: 0, transition: { duration: 0.15 } }}
                              transition={{ type: 'spring', stiffness: 380, damping: 22, delay: i * 0.04 }}
                              onClick={() => { sound.playClick(); setDialOpen(false); router.push(d.href); }}
                            >
                              <d.Icon size={22} className="dc-ico" />
                              <span>{d.label}</span>
                            </motion.button>
                          );
                        })}
                      </>
                    )}
                  </AnimatePresence>
                  <button
                    className={`nav-center-action ${dialOpen ? 'open' : ''}`}
                    aria-label={dialOpen ? 'Tutup menu cepat' : 'Menu cepat'}
                    aria-expanded={dialOpen}
                    onClick={() => { sound.playBeep(); setDialOpen((o) => !o); }}
                  >
                    {dialOpen ? <Icons.Close key="x" size={24} strokeWidth={2.4} className="dock-ico" /> : <Icons.Zap key="z" size={26} strokeWidth={2.2} fill="currentColor" className="dock-ico dock-zap" />}
                    <span className="nav-lbl">Menu</span>
                  </button>
                </div>
              );
            }

            const inner = (
              <>
                {it.active && <motion.span layoutId="navInd" className="nav-ind" aria-hidden="true" transition={{ type: 'spring', stiffness: 420, damping: 32 }} />}
                <it.Icon size={22} />
                <span className="nav-lbl">{it.label}</span>
              </>
            );
            return it.href ? (
              <Link key={it.key} href={it.href} className={`nav-tab ${it.active ? 'active' : ''}`} aria-label={it.label} aria-current={it.active ? 'page' : undefined} onClick={() => sound.playClick()}>
                {inner}
              </Link>
            ) : (
              <button key={it.key} type="button" className="nav-tab" aria-label={it.label} onClick={() => { sound.playClick(); it.onClick?.(); }}>
                {inner}
              </button>
            );
          })}
        </nav>
      </div>

      <style jsx>{`
        /* Header melayang (fixed), satu bahasa desain dengan floating bottom navbar */
        .top-header-wrap {
          position: fixed;
          top: calc(var(--safe-top) + var(--dock-gap));
          left: 0;
          right: 0;
          display: flex;
          justify-content: center;
          padding: 0 var(--dock-gap);
          z-index: 1000;
          pointer-events: none;
        }

        .top-header-nav {
          pointer-events: auto;
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          max-width: 1140px;
          min-height: var(--header-h);
          padding: 8px;
          border-radius: var(--dock-radius);
          background: var(--dock-bg);
          backdrop-filter: blur(32px);
          -webkit-backdrop-filter: blur(32px);
          border: 1px solid var(--dock-border);
          box-shadow: var(--dock-shadow);
        }

        /* sisi kiri & kanan sama lebar → pencarian tepat di tengah (desktop) */
        .hd-side {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }
        .hd-tools {
          justify-content: flex-end;
          flex: 0 0 auto;
        }

        /* tombol ikon seragam */
        .top-header-nav :global(.hd-btn),
        .hd-btn {
          position: relative;
          width: var(--hd-size, 40px);
          height: var(--hd-size, 40px);
          flex-shrink: 0;
          display: grid;
          place-items: center;
          padding: 0;
          border-radius: var(--r-dock-btn);
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--text) 6%, transparent);
          color: var(--text);
          cursor: pointer;
          overflow: hidden;
          transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease, box-shadow 0.2s ease;
        }
        .hd-btn:hover {
          border-color: var(--a2);
          transform: translateY(-1px);
        }
        .hd-btn:active {
          transform: scale(0.94);
        }
        .hd-btn :global(svg) {
          color: currentColor;
        }
        .top-header-nav :global(.hd-brand),
        .top-header-nav :global(.hd-primary) {
          border-color: transparent;
          color: var(--on-accent);
          background: linear-gradient(135deg, var(--a1), var(--a3));
          box-shadow: 0 6px 16px -4px var(--border-glow);
        }
        .top-header-nav :global(.hd-brand:hover),
        .top-header-nav :global(.hd-primary:hover) {
          box-shadow: 0 8px 20px -2px var(--border-glow);
          border-color: transparent;
        }
        .top-header-nav :global(.hd-avatar) {
          border-color: color-mix(in srgb, var(--a2) 55%, transparent);
          background: linear-gradient(135deg, var(--a1), var(--a3));
          color: var(--on-accent);
          font-weight: 800;
          font-size: 0.9rem;
        }
        .hd-avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        /* pencarian: lingkaran di HP, pil lebar di desktop */
        .hd-search {
          margin-left: auto;
          flex-shrink: 0;
          width: var(--hd-size, 40px);
          height: var(--hd-size, 40px);
          display: grid;
          place-items: center;
          padding: 0;
          border-radius: var(--r-dock-btn);
          border: 1px solid var(--border);
          background: color-mix(in srgb, var(--text) 6%, transparent);
          color: var(--a2);
          cursor: pointer;
          transition: border-color 0.2s ease, background 0.2s ease;
        }
        .hd-search:hover {
          border-color: var(--a2);
        }
        .hd-search-text,
        .hd-kbd {
          display: none;
        }
        .hd-kbd {
          font-family: var(--font-mono);
          font-size: 0.68rem;
          padding: 2px 7px;
          border-radius: 6px;
          color: var(--muted);
          background: color-mix(in srgb, var(--text) 8%, transparent);
          border: 1px solid var(--border);
        }

        @media (min-width: 768px) {
          .hd-search {
            margin: 0;
            flex: 0 1 460px;
            width: auto;
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 0 14px;
            border-radius: var(--r-dock-btn);
          }
          .hd-search-text {
            display: block;
            flex: 1;
            text-align: left;
            font-family: var(--font-mono);
            font-size: 0.8rem;
            color: var(--muted);
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .hd-kbd {
            display: block;
          }
        }

        .hd-profile {
          position: relative;
        }
        .skeleton.hd-btn {
          border-radius: var(--r-dock-btn);
        }

        :global(.profile-dropdown-solid) {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 230px;
          padding: 12px;
          border-radius: var(--r-l);
          background: var(--surface);
          border: 1px solid var(--border);
          box-shadow: 0 16px 36px color-mix(in srgb, var(--shadow-c) 85%, transparent);
          z-index: 999;
        }

        .dd-head {
          display: flex;
          flex-direction: column;
          gap: 2px;
          padding: 2px 4px 6px;
        }
        .dd-head strong {
          font-size: 0.88rem;
          color: var(--text);
        }
        .dd-head span {
          font-size: 0.7rem;
          color: var(--muted);
          word-break: break-all;
          font-family: var(--font-mono);
        }
        .dd-head em {
          align-self: flex-start;
          margin-top: 4px;
          font-style: normal;
          font-size: 0.62rem;
          font-family: var(--font-mono);
          text-transform: uppercase;
          letter-spacing: 0.06em;
          padding: 2px 8px;
          border-radius: var(--r-l);
          color: var(--a2);
          background: color-mix(in srgb, var(--a2) 14%, transparent);
          border: 1px solid color-mix(in srgb, var(--a2) 30%, transparent);
        }
        .dd-sep {
          height: 1px;
          background: var(--border);
          margin: 4px 0 6px;
        }

        :global(.dropdown-item) {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: var(--r-s);
          font-size: 0.8rem;
          background: transparent;
          border: none;
          color: var(--text);
          cursor: pointer;
          width: 100%;
          text-align: left;
        }

        :global(.dropdown-item:hover) {
          background: color-mix(in srgb, var(--text) 6%, transparent);
        }

        /* SEARCH MODAL SOLID */
        .search-modal-backdrop {
          position: fixed;
          inset: 0;
          background: color-mix(in srgb, var(--bg1) 85%, transparent);
          backdrop-filter: blur(8px);
          z-index: 99999;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 15vh;
        }

        :global(.search-modal-solid) {
          width: min(580px, 92%);
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: var(--r-l);
          padding: 20px;
          box-shadow: 0 25px 60px color-mix(in srgb, var(--shadow-c) 95%, transparent);
        }

        .search-input-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          background: var(--surface-2);
          border: 1px solid var(--border);
          border-radius: var(--r-m);
          padding: 0 14px;
          margin-bottom: 14px;
        }

        .search-field {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          font-family: var(--font-mono);
          font-size: 0.92rem;
          color: var(--text);
          padding: 12px 0;
        }

        .search-results {
          max-height: 280px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .si-empty {
          padding: 18px 14px;
          font-size: 0.82rem;
          color: var(--muted);
          text-align: center;
        }
        .si-badges { display: flex; gap: 4px; flex-shrink: 0; flex-wrap: wrap; max-width: 104px; }
        .si-badge {
          flex-shrink: 0;
          min-width: 44px;
          padding: 2px 7px;
          border-radius: var(--r-s);
          text-align: center;
          font-family: var(--font-mono);
          font-size: 0.62rem;
          font-weight: 800;
          color: var(--mc, var(--a2));
          background: color-mix(in srgb, var(--mc, var(--a2)) 14%, transparent);
          border: 1px solid color-mix(in srgb, var(--mc, var(--a2)) 38%, transparent);
        }
        .si-page {
          font-weight: 600;
        }
        .m-GET { --mc: var(--ok); } .m-POST { --mc: var(--warn); } .m-PUT { --mc: var(--info); } .m-PATCH { --mc: #c084fc; } .m-DELETE { --mc: var(--err); }
        .si-text {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
        }
        .si-text b {
          font-size: 0.84rem;
          font-weight: 600;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .si-path {
          font-family: var(--font-mono);
          font-size: 0.78rem !important;
        }
        .si-text small {
          font-size: 0.68rem;
          color: var(--muted);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .search-item {
          display: flex;
          align-items: center;
          gap: 10px;
          min-height: 46px;
          padding: 6px 12px;
          border-radius: var(--r-s);
          font-family: var(--font-mono);
          cursor: pointer;
          background: color-mix(in srgb, var(--text) 3%, transparent);
          color: var(--text);
        }

        .search-item:hover {
          background: rgba(56, 189, 248, 0.18);
          color: var(--a2);
        }

        .search-modal-backdrop {
          padding-top: max(var(--safe-top), 12vh);
          padding-left: 12px;
          padding-right: 12px;
        }

        :global(.search-modal-solid) {
          max-height: calc(100dvh - 24vh);
          display: flex;
          flex-direction: column;
        }

        .search-results {
          max-height: min(280px, 45dvh);
          overscroll-behavior: contain;
        }

        @media (max-width: 400px) {
          .top-header-nav {
            --hd-size: 38px;
            gap: 6px;
            padding: 7px;
          }
          .hd-side {
            gap: 6px;
          }
        }
      `}</style>
    </ThemeContext.Provider>
  );
}