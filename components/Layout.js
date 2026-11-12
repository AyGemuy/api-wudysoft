import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useSession, signOut } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './Icons';
import CustomThemeStudio from './CustomThemeStudio';
import InteractiveCanvas from './InteractiveCanvas';
import { sound } from '@/src/lib/interactiveEffects';

export default function Layout({ children }) {
  const router = useRouter();
  const { data: session } = useSession();
  const user = session?.user || null;

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [studioOpen, setStudioOpen] = useState(false);
  const [endpoints, setEndpoints] = useState([]);
  const [profileOpen, setProfileOpen] = useState(false);

  const [config, setConfig] = useState({
    theme: 'stealth',
    radius: 24,
    particle: 'rain',
    soundEnabled: true,
  });

  useEffect(() => {
    const saved = localStorage.getItem('nexus_theme_config');
    if (saved) {
      try {
        setConfig((p) => ({ ...p, ...JSON.parse(saved) }));
      } catch {}
    }
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', config.theme);
    document.documentElement.style.setProperty('--radius', `${config.radius}px`);
    sound.enabled = config.soundEnabled;
  }, [config]);

  useEffect(() => {
    fetch('/api/playground/endpoints')
      .then((r) => r.json())
      .then((d) => d.endpoints && setEndpoints(d.endpoints))
      .catch(() => setEndpoints(['/api/health', '/api/auth/me', '/api/playground/echo']));
  }, []);

  const searchResults = [
    ...endpoints.map((ep) => ({ type: 'Endpoint', title: ep, action: `/playground?endpoint=${ep}` })),
    { type: 'Navigation', title: 'Command Deck Dashboard', action: '/' },
    { type: 'Navigation', title: 'API Terminal Playground', action: '/playground' },
    { type: 'Navigation', title: 'System & API Stats', action: '/stats' },
    { type: 'Tools', title: 'Code Beautifier & Unpacker', action: '/tools/beautify' },
    { type: 'Tools', title: 'Multi-Host File Uploader', action: '/tools/upload' },
    { type: 'Comms', title: 'Cyber Rooms & Mesh Chat', action: '/rooms' },
    { type: 'Identity', title: 'Sign In / Authorization', action: '/auth' },
  ].filter((item) => item.title.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <>
      <InteractiveCanvas particleType={config.particle} />

      <div className="blobs">
        <div className="blob b1" />
        <div className="blob b2" />
        <div className="blob b3" />
      </div>

      {/* TOP HEADER DOCK */}
      <header className="top-header-wrap">
        <nav className="top-header-nav">
          <Link href="/" className="brand-link" onClick={() => sound.playClick()}>
            <div className="brand-badge">
              <Icons.Zap size={16} />
            </div>
            <div className="brand-text">
              <h2>NEXUS</h2>
              <span>SYS.ONLINE</span>
            </div>
          </Link>

          <button
            className="search-dock-btn"
            onClick={() => {
              sound.playClick();
              setSearchOpen(true);
            }}
          >
            <Icons.Search size={14} color="var(--a2)" />
            <span className="search-text">Quick Search...</span>
            <kbd className="search-kbd">⌘K</kbd>
          </button>

          <div className="header-right-tools">
            <button
              className="action-icon-btn"
              onClick={() => {
                sound.playClick();
                setStudioOpen(true);
              }}
              title="Theme Studio"
            >
              <Icons.Sliders size={16} color="var(--a2)" />
            </button>

            {user ? (
              <div style={{ position: 'relative' }}>
                <div
                  className="profile-pill-btn"
                  onClick={() => {
                    sound.playClick();
                    setProfileOpen(!profileOpen);
                  }}
                >
                  <div className="profile-avatar-circle">
                    {user.image ? (
                      <img src={user.image} alt="Avatar" />
                    ) : (
                      user.name?.[0]?.toUpperCase() || 'U'
                    )}
                  </div>
                  <span className="profile-name-text">{user.name?.split(' ')[0] || 'User'}</span>
                  <Icons.ChevronDown size={11} color="var(--muted)" />
                </div>

                <AnimatePresence>
                  {profileOpen && (
                    <motion.div
                      className="profile-dropdown-solid"
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.16 }}
                    >
                      <div style={{ paddingBottom: '6px' }}>
                        <strong style={{ fontSize: '0.85rem', color: '#fff', display: 'block' }}>{user.name}</strong>
                        <span style={{ fontSize: '0.7rem', color: 'var(--muted)', wordBreak: 'break-all', fontFamily: 'var(--font-mono)' }}>
                          {user.email}
                        </span>
                      </div>
                      <div style={{ height: '1px', background: 'var(--border)', margin: '4px 0 6px' }} />
                      <Link
                        href="/playground"
                        className="dropdown-item"
                        onClick={() => setProfileOpen(false)}
                      >
                        <Icons.Terminal size={14} color="var(--a2)" />
                        <span>Playground</span>
                      </Link>
                      <button
                        className="dropdown-item logout-btn"
                        onClick={() => {
                          setProfileOpen(false);
                          signOut({ callbackUrl: '/auth' });
                        }}
                      >
                        <Icons.LogOut size={14} color="#f87171" />
                        <span style={{ color: '#f87171' }}>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <Link href="/auth" className="btn primary signin-pill">
                Sign In
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
                  placeholder="Cari endpoint, file, navigasi..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button onClick={() => setSearchOpen(false)} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}>
                  <Icons.Close size={18} />
                </button>
              </div>

              <div className="search-results">
                {searchResults.map((item, idx) => (
                  <div
                    key={idx}
                    className="search-item"
                    onClick={() => {
                      sound.playBeep();
                      setSearchOpen(false);
                      if (item.custom) item.custom();
                      else router.push(item.action);
                    }}
                  >
                    <span style={{ fontSize: '0.85rem' }}>{item.title}</span>
                    <Icons.ChevronRight size={14} color="var(--a2)" />
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <CustomThemeStudio
        isOpen={studioOpen}
        onClose={() => setStudioOpen(false)}
        config={config}
        setConfig={setConfig}
      />

      <main className="wrap">{children}</main>

      {/* FLOATING BOTTOM NAVBAR */}
      <div className="floating-navbar-wrap">
        <nav className="floating-navbar">
          <Link href="/" className={`nav-tab ${router.pathname === '/' ? 'active' : ''}`} onClick={() => sound.playClick()}>
            <Icons.Home size={22} />
            {router.pathname === '/' && <motion.div layoutId="navDot" className="nav-active-dot" />}
          </Link>

          <Link href="/playground" className={`nav-tab ${router.pathname === '/playground' ? 'active' : ''}`} onClick={() => sound.playClick()}>
            <Icons.Terminal size={22} />
            {router.pathname === '/playground' && <motion.div layoutId="navDot" className="nav-active-dot" />}
          </Link>

          <button
            className="nav-center-action"
            onClick={() => {
              sound.playBeep();
              router.push('/playground');
            }}
          >
            <Icons.Zap size={24} />
          </button>

          <button
            className="nav-tab"
            onClick={() => {
              sound.playClick();
              setSearchOpen(true);
            }}
          >
            <Icons.Search size={22} />
          </button>

          <Link href="/auth" className={`nav-tab ${router.pathname.startsWith('/auth') ? 'active' : ''}`} onClick={() => sound.playClick()}>
            <Icons.User size={22} />
            {router.pathname.startsWith('/auth') && <motion.div layoutId="navDot" className="nav-active-dot" />}
          </Link>
        </nav>
      </div>

      <style jsx>{`
        .top-header-wrap {
          position: sticky;
          top: 10px;
          z-index: 900;
          width: 100%;
          max-width: 1140px;
          margin: 0 auto 20px;
          padding: 0 16px;
          box-sizing: border-box;
        }

        .top-header-nav {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 8px 16px;
          border-radius: 999px;
          background: rgba(13, 18, 30, 0.92);
          backdrop-filter: blur(28px);
          border: 1px solid var(--border);
          box-shadow: 0 14px 34px rgba(0, 0, 0, 0.6);
        }

        .brand-link {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-shrink: 0;
        }

        .brand-badge {
          width: 32px;
          height: 32px;
          border-radius: 10px;
          background: linear-gradient(135deg, var(--a1), var(--a3));
          display: flex;
          align-items: center;
          justify-content: center;
          color: #fff;
          box-shadow: 0 0 12px var(--border-glow);
        }

        .brand-text h2 {
          font-size: 0.9rem;
          margin: 0;
          letter-spacing: -0.02em;
        }

        .brand-text span {
          font-family: var(--font-mono);
          font-size: 0.62rem;
          color: var(--a2);
          display: block;
        }

        .search-dock-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid var(--border);
          color: var(--muted);
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 0.78rem;
          font-family: var(--font-mono);
          cursor: pointer;
        }

        .search-kbd {
          font-size: 0.65rem;
          background: rgba(255, 255, 255, 0.08);
          padding: 1px 5px;
          border-radius: 4px;
        }

        .header-right-tools {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .action-icon-btn {
          width: 34px;
          height: 34px;
          border-radius: 50%;
          border: 1px solid var(--border);
          background: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .profile-pill-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid var(--border);
          padding: 3px 10px 3px 3px;
          border-radius: 30px;
          cursor: pointer;
          max-width: 130px;
        }

        .profile-avatar-circle {
          width: 26px;
          height: 26px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--a1), var(--a2));
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.75rem;
          font-weight: bold;
          color: #fff;
          overflow: hidden;
        }

        .profile-avatar-circle img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .profile-name-text {
          font-size: 0.75rem;
          font-weight: 600;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .signin-pill {
          padding: 6px 14px !important;
          font-size: 0.75rem !important;
          border-radius: 20px !important;
        }

        .profile-dropdown-solid {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          width: 220px;
          padding: 10px;
          border-radius: 16px;
          background: #090e17 !important;
          border: 1px solid var(--border);
          box-shadow: 0 16px 36px rgba(0, 0, 0, 0.85);
          z-index: 999;
        }

        .dropdown-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 10px;
          border-radius: 10px;
          font-size: 0.8rem;
          background: transparent;
          border: none;
          color: var(--text);
          cursor: pointer;
          width: 100%;
          text-align: left;
        }

        .dropdown-item:hover {
          background: rgba(255, 255, 255, 0.06);
        }

        /* SEARCH MODAL SOLID */
        .search-modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          z-index: 99999;
          display: flex;
          justify-content: center;
          align-items: flex-start;
          padding-top: 15vh;
        }

        .search-modal-solid {
          width: min(580px, 92%);
          background: #0b111e !important;
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 20px;
          box-shadow: 0 25px 60px rgba(0, 0, 0, 0.95);
        }

        .search-input-wrap {
          display: flex;
          align-items: center;
          gap: 12px;
          background: #151e2f;
          border: 1px solid var(--border);
          border-radius: 14px;
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
          color: #fff;
          padding: 12px 0;
        }

        .search-results {
          max-height: 280px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .search-item {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 14px;
          border-radius: 10px;
          font-family: var(--font-mono);
          cursor: pointer;
          background: rgba(255, 255, 255, 0.03);
          color: #fff;
        }

        .search-item:hover {
          background: rgba(56, 189, 248, 0.18);
          color: var(--a2);
        }

        @media (max-width: 640px) {
          .top-header-wrap {
            top: 6px;
            padding: 0 8px;
            margin-bottom: 14px;
          }
          .top-header-nav {
            padding: 6px 10px;
          }
          .brand-text span,
          .search-dock-btn .search-text,
          .search-dock-btn .search-kbd {
            display: none !important;
          }
          .search-dock-btn {
            padding: 6px 10px;
            border-radius: 50%;
            width: 32px;
            height: 32px;
            justify-content: center;
          }
          .profile-pill-btn {
            max-width: 88px;
          }
        }
      `}</style>
    </>
  );
}