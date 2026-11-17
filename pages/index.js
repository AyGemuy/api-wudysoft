import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import {
  motion,
  AnimatePresence,
  animate,
  useInView,
  useMotionValue,
  useSpring,
} from 'framer-motion';
import Seo from '@/components/Seo';
import { Icons } from '@/components/Icons';
import { useTheme } from '@/components/ThemeContext';
import { sound } from '@/src/lib/interactiveEffects';
import { SITE_PAGES, CATEGORIES } from '@/src/lib/siteMap';
import { PRESETS } from '@/src/lib/themes';

const HOST = 'wudysoft.app';
const ROTATING = ['API Playground', 'Realtime Rooms', 'Dev Tools', 'Theme Studio', 'Live Telemetry'];

/* ------------------------------------------------------------------ */
/* Util                                                               */
/* ------------------------------------------------------------------ */
function useCountUp(target, start, duration = 1.1) {
  const [v, setV] = useState(0);
  useEffect(() => {
    if (!start) return;
    const c = animate(0, target, { duration, ease: 'easeOut', onUpdate: (x) => setV(Math.round(x)) });
    return () => c.stop();
  }, [target, start, duration]);
  return v;
}

function greeting(h) {
  if (h < 4) return 'Selamat dini hari';
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

/* ------------------------------------------------------------------ */
/* Preview animasi per kartu (murni CSS / SVG, tanpa gambar)           */
/* ------------------------------------------------------------------ */
function Preview({ type }) {
  switch (type) {
    case 'terminal':
      return (
        <div className="hx-pv hx-term">
          <div className="hx-line l1"><b>$</b> curl /api/health</div>
          <div className="hx-line l2"><em>200 OK</em> · 42ms</div>
          <div className="hx-line l3">{'{ "ok": true, "db": "up" }'}</div>
          <div className="hx-line l4"><b>$</b> <span className="hx-cursor" /></div>
        </div>
      );
    case 'chart':
      return (
        <div className="hx-pv hx-chart">
          <div className="hx-bars">
            {[55, 80, 45, 90, 62, 100, 70].map((h, i) => (
              <span key={i} style={{ height: `${h}%`, animationDelay: `${i * 0.12}s` }} />
            ))}
          </div>
          <svg viewBox="0 0 140 50" preserveAspectRatio="none" className="hx-line-svg">
            <polyline points="0,40 20,28 40,34 60,16 80,24 100,8 120,18 140,4" />
          </svg>
        </div>
      );
    case 'chat':
      return (
        <div className="hx-pv hx-chat">
          <div className="hx-bub a">Server up? 👀</div>
          <div className="hx-bub b">All green ✅</div>
          <div className="hx-bub a c3">Deploy now</div>
          <div className="hx-typing"><i /><i /><i /></div>
        </div>
      );
    case 'code':
      return (
        <div className="hx-pv hx-code">
          {[62, 40, 78, 52, 70, 34, 58].map((w, i) => (
            <div key={i} className="hx-cl" style={{ paddingLeft: `${(i % 3) * 14}px` }}>
              <span style={{ width: `${w}%`, animationDelay: `${i * 0.15}s` }} />
            </div>
          ))}
          <div className="hx-braces">{'{ }'}</div>
        </div>
      );
    case 'upload':
      return (
        <div className="hx-pv hx-up">
          <div className="hx-drop">
            <Icons.UploadCloud size={30} />
          </div>
          <div className="hx-prog"><span /></div>
          <div className="hx-files"><i /><i /><i /></div>
        </div>
      );
    case 'theme':
      return (
        <div className="hx-pv hx-theme">
          <div className="hx-orbit">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <span key={i} style={{ '--i': i }} />
            ))}
          </div>
          <div className="hx-orbit-core" />
        </div>
      );
    case 'lock':
      return (
        <div className="hx-pv hx-lock">
          <span className="hx-ring r1" />
          <span className="hx-ring r2" />
          <span className="hx-ring r3" />
          <div className="hx-lock-core"><Icons.Lock size={26} /></div>
          <span className="hx-scan" />
        </div>
      );
    case 'guest':
      return (
        <div className="hx-pv hx-guest">
          <span className="hx-ripple" />
          <span className="hx-ripple d2" />
          <div className="hx-avatar"><Icons.Zap size={26} /></div>
          <span className="hx-dot-orbit"><i /></span>
        </div>
      );
    default: // json
      return (
        <div className="hx-pv hx-json">
          <div className="hx-jl"><i className="k" />{'{'}</div>
          <div className="hx-jl in"><i className="k" /><u className="s" style={{ width: '46%' }} /></div>
          <div className="hx-jl in"><i className="k" /><u className="n" style={{ width: '28%' }} /></div>
          <div className="hx-jl in"><i className="k" /><u className="b" style={{ width: '36%' }} /></div>
          <div className="hx-jl">{'}'}</div>
          <span className="hx-status-dot" />
        </div>
      );
  }
}

/* ------------------------------------------------------------------ */
/* Kartu halaman: link preview → preview → body → footer               */
/* ------------------------------------------------------------------ */
function PageCard({ page, index, user, hoverMode, speed, onAction }) {
  const tiltOn = hoverMode === 'tilt';
  const ref = useRef(null);
  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 190, damping: 17 });
  const sry = useSpring(ry, { stiffness: 190, damping: 17 });
  const Icon = Icons[page.icon] || Icons.Zap;
  const catLabel = CATEGORIES.find((c) => c.id === page.category)?.label || page.category;
  const url = page.action ? `${HOST}/theme-studio` : `${HOST}${page.href}`;
  const locked = page.locked && !user;

  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const px = (e.clientX - r.left) / r.width;
    const py = (e.clientY - r.top) / r.height;
    el.style.setProperty('--mx', `${px * 100}%`);
    el.style.setProperty('--my', `${py * 100}%`);
    if (tiltOn && e.pointerType === 'mouse') {
      ry.set((px - 0.5) * 9);
      rx.set(-(py - 0.5) * 9);
    }
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  const card = (
    <motion.article
      ref={ref}
      className="hx-card glass"
      style={{ rotateX: srx, rotateY: sry, transformPerspective: 900, '--ac': `var(--${page.accent})` }}
      whileHover={hoverMode === 'lift' ? { y: -7 } : undefined}
      transition={{ type: 'spring', stiffness: 300, damping: 22 }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      <span className="hx-spot" aria-hidden="true" />

      {/* 1. Link preview (chrome) */}
      <div className="hx-chrome">
        <span className="hx-traffic" aria-hidden="true"><i /><i /><i /></span>
        <span className="hx-url">
          {locked ? <Icons.Lock size={10} /> : <Icons.Link size={10} />}
          <span>{url}</span>
        </span>
        <span className="hx-status">{page.status}</span>
      </div>

      {/* 2. Preview animasi */}
      <div className="hx-preview">
        <Preview type={page.preview} />
        <span className="hx-num">{String(index + 1).padStart(2, '0')}</span>
      </div>

      {/* 3. Body */}
      <div className="hx-body">
        <div className="hx-title-row">
          <span className="hx-icon"><Icon size={18} /></span>
          <h3>{page.title}</h3>
        </div>
        <p>{page.desc}</p>
        <div className="hx-tags">
          {page.tags.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
      </div>

      {/* 4. Footer */}
      <div className="hx-foot">
        <span className="hx-cat">{catLabel}</span>
        <span className="hx-meta">
          {locked && (
            <span className="hx-lockhint" title="Perlu login">
              <Icons.Lock size={11} /> Login
            </span>
          )}
          {page.external && <Icons.ExternalLink size={12} />}
        </span>
        <span className="hx-open">
          {page.action ? 'Atur' : 'Buka'}
          <Icons.ArrowRight size={14} />
        </span>
      </div>
    </motion.article>
  );

  const enter = {
    hidden: { opacity: 0, y: 34, scale: 0.95 },
    show: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { duration: 0.55 / speed, delay: Math.min(index, 6) * (0.06 / speed), ease: [0.22, 1, 0.36, 1] },
    },
  };

  const click = () => sound.playClick();
  let inner;
  if (page.action) {
    inner = (
      <button type="button" className="hx-link" onClick={() => { click(); onAction(page.action); }}>
        {card}
      </button>
    );
  } else if (page.external) {
    inner = (
      <a className="hx-link" href={page.href} target="_blank" rel="noopener noreferrer" onClick={click}>
        {card}
      </a>
    );
  } else {
    inner = (
      <Link className="hx-link" href={page.href} onClick={click}>
        {card}
      </Link>
    );
  }

  return (
    <motion.div
      layout="position"
      className="hx-item"
      variants={enter}
      initial="hidden"
      whileInView="show"
      exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
      viewport={{ once: true, margin: '0px 0px -60px 0px' }}
    >
      {inner}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/* Halaman Home                                                        */
/* ------------------------------------------------------------------ */
export default function Home() {
  const { data: session } = useSession();
  const { config, openStudio } = useTheme();
  const user = session?.user || null;
  const speed = config.anim === 'off' ? 1000 : config.speed;
  const entrance = config.anim === 'off' || !config.animEntrance ? 1000 : config.speed; // kecepatan animasi masuk

  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('all');
  const [word, setWord] = useState(0);
  const [now, setNow] = useState(null);
  const [health, setHealth] = useState(null);
  const searchRef = useRef(null);
  const statsRef = useRef(null);
  const statsIn = useInView(statsRef, { once: true });

  // jam & sapaan
  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // kata berputar
  useEffect(() => {
    if (config.anim === 'off') return;
    const id = setInterval(() => setWord((w) => (w + 1) % ROTATING.length), 2400 / speed);
    return () => clearInterval(id);
  }, [config.anim, speed]);

  // status API
  useEffect(() => {
    let alive = true;
    const t0 = performance.now();
    fetch('/api/health', { cache: 'no-store' })
      .then((r) => alive && setHealth({ ok: r.ok, ms: Math.round(performance.now() - t0) }))
      .catch(() => alive && setHealth({ ok: false, ms: 0 }));
    return () => {
      alive = false;
    };
  }, []);

  // pintasan "/" untuk fokus ke pencarian
  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase();
      if (e.key === '/' && !['input', 'textarea', 'select'].includes(tag) && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SITE_PAGES.filter((p) => {
      if (cat !== 'all' && p.category !== cat) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.desc.toLowerCase().includes(q) ||
        p.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [query, cat]);

  const countPages = useCountUp(SITE_PAGES.length, statsIn);
  const countThemes = useCountUp(PRESETS.length, statsIn);
  const countCats = useCountUp(CATEGORIES.length - 1, statsIn);

  const hours = now ? now.getHours() : 12;
  const clock = now
    ? `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`
    : '--:--:--';
  const firstName = user?.name?.split(' ')[0];

  const handleAction = (a) => {
    if (a === 'theme') openStudio();
  };

  return (
    <>
      <Seo title="Command Deck" />

      {/* ============ HERO ============ */}
      <section className="hx-hero">
        <motion.div
          className="hx-toprow"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 / entrance }}
        >
          <div className="hx-pill">
            <span className="hx-live" />
            <span>{user ? (user.isGuest ? 'GUEST RECON' : 'AUTHORIZED OPERATOR') : 'BELUM MASUK'}</span>
          </div>
          <div className="hx-clock" aria-label="Jam lokal">
            <Icons.Clock size={13} />
            <span className="hx-mono">{clock}</span>
          </div>
        </motion.div>

        <motion.h1
          className="hx-h1"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 / entrance, ease: [0.22, 1, 0.36, 1] }}
        >
          {greeting(hours)}
          {firstName ? `, ${firstName}` : ''}.
          <br />
          <span className="hx-grad">Command Deck</span>
        </motion.h1>

        <motion.p
          className="hx-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 / entrance, duration: 0.6 / entrance }}
        >
          Satu dasbor untuk{' '}
          <span className="hx-rotor" aria-live="polite">
            {ROTATING.map((w, i) => (
              <span key={w} className={i === word ? 'on' : ''} aria-hidden={i !== word}>
                {w}
              </span>
            ))}
          </span>
        </motion.p>

        <motion.div
          className="hx-cta"
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 / entrance, duration: 0.5 / entrance }}
        >
          <Link href="/playground" className="btn primary" onClick={() => sound.playClick()}>
            <Icons.Terminal size={16} /> Buka Playground
          </Link>
          <button
            type="button"
            className="btn"
            onClick={() => {
              sound.playClick();
              openStudio();
            }}
          >
            <Icons.Sliders size={16} /> Atur Tema
          </button>
        </motion.div>

        <motion.div
          ref={statsRef}
          className="hx-stats"
          initial="hidden"
          animate="show"
          variants={{ show: { transition: { staggerChildren: 0.08 / entrance, delayChildren: 0.35 / entrance } } }}
        >
          {[
            { k: 'Halaman', v: countPages, icon: 'Layers' },
            { k: 'Preset tema', v: countThemes, icon: 'Sliders' },
            { k: 'Kategori', v: countCats, icon: 'Folder' },
          ].map((st) => {
            const SIcon = Icons[st.icon] || Icons.Zap;
            return (
              <motion.div
                key={st.k}
                className="hx-stat glass"
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              >
                <span className="hx-stat-ico"><SIcon size={15} /></span>
                <strong>{st.v}</strong>
                <span className="hx-stat-label">{st.k}</span>
              </motion.div>
            );
          })}
          <motion.div
            className="hx-stat glass"
            variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
          >
            <span className="hx-stat-ico">
              <i className={`hx-health ${health ? (health.ok ? 'ok' : 'err') : ''}`} />
            </span>
            <strong className="hx-mono">{health ? (health.ok ? `${health.ms}` : '—') : '…'}<small>{health?.ok ? 'ms' : ''}</small></strong>
            <span className="hx-stat-label">{health ? (health.ok ? 'API online' : 'API offline') : 'Cek API'}</span>
          </motion.div>
        </motion.div>
      </section>

      {/* ============ TOOLBAR ============ */}
      <motion.div
        className="hx-toolbar"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45 / entrance, duration: 0.5 / entrance }}
      >
        <label className="hx-search glass">
          <Icons.Search size={16} color="var(--a2)" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && (setQuery(''), e.currentTarget.blur())}
            placeholder="Cari halaman, tools, endpoint…"
            aria-label="Cari halaman"
          />
          {query ? (
            <button type="button" onClick={() => setQuery('')} aria-label="Hapus">
              <Icons.Close size={15} />
            </button>
          ) : (
            <kbd>/</kbd>
          )}
        </label>

        <div className="hx-chips" role="tablist" aria-label="Kategori">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              role="tab"
              aria-selected={cat === c.id}
              className={`hx-chip ${cat === c.id ? 'active' : ''}`}
              onClick={() => {
                sound.playClick();
                setCat(c.id);
              }}
            >
              {cat === c.id && (
                <motion.span
                  layoutId="hxChip"
                  className="hx-chip-bg"
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                />
              )}
              <span className="hx-chip-label">{c.label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      <div className="hx-count" aria-live="polite">
        <AnimatePresence mode="wait">
          <motion.span
            key={`${filtered.length}-${cat}-${query}`}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            {filtered.length} halaman ditemukan
          </motion.span>
        </AnimatePresence>
      </div>

      {/* ============ GRID CARD ============ */}
      <div className="hx-grid">
        <AnimatePresence mode="popLayout">
          {filtered.map((p) => (
            <PageCard
              key={p.id}
              page={p}
              index={SITE_PAGES.indexOf(p)}
              user={user}
              hoverMode={config.anim === 'off' ? 'none' : config.animHover}
              speed={entrance}
              onAction={handleAction}
            />
          ))}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {filtered.length === 0 && (
          <motion.div
            className="hx-empty glass"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <Icons.Search size={30} color="var(--a2)" />
            <h3>Tidak ada hasil</h3>
            <p>Coba kata kunci lain atau pilih kategori “Semua”.</p>
            <button
              type="button"
              className="btn"
              onClick={() => {
                setQuery('');
                setCat('all');
              }}
            >
              Reset filter
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <style jsx global>{`
        /* ---------- HERO ---------- */
        .hx-hero {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: var(--s-4);
          padding: 0;
        }
        .hx-toprow {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--s-3);
          flex-wrap: wrap;
        }
        .hx-pill,
        .hx-clock {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          min-height: 30px;
          padding: 0 12px;
          border-radius: var(--r-chip);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          letter-spacing: 0.06em;
        }
        .hx-pill {
          color: var(--a2);
          background: color-mix(in srgb, var(--a2) 12%, transparent);
          border: 1px solid color-mix(in srgb, var(--a2) 35%, transparent);
        }
        .hx-clock {
          color: var(--muted);
          background: color-mix(in srgb, var(--text) 5%, transparent);
          border: 1px solid var(--border);
        }
        .hx-live {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: var(--a2);
          box-shadow: 0 0 10px var(--a2);
          animation: hx-ping calc(1.6s / var(--speed)) ease-in-out infinite;
        }
        .hx-h1 {
          font-size: clamp(2rem, 1.2rem + 4vw, 3.5rem);
          line-height: 1.08;
          letter-spacing: -0.02em;
        }
        .hx-grad {
          background: linear-gradient(90deg, var(--a1), var(--a2), var(--a3), var(--a1));
          background-size: 300% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          color: transparent;
          animation: hx-flow calc(7s / var(--speed)) linear infinite;
        }
        .hx-sub {
          font-size: clamp(1rem, 0.9rem + 0.6vw, 1.25rem);
          display: flex;
          flex-wrap: wrap;
          align-items: baseline;
          gap: 8px;
          color: var(--muted);
        }
        .hx-rotor {
          display: inline-grid; /* lebar = kata terpanjang, tanpa lompatan layout */
          font-weight: 700;
        }
        .hx-rotor > span {
          grid-area: 1 / 1;
          color: var(--a2);
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.35s ease, transform 0.35s ease;
        }
        .hx-rotor > span.on {
          opacity: 1;
          transform: none;
        }
        .hx-cta {
          display: flex;
          flex-wrap: wrap;
          gap: var(--s-3);
        }
        .hx-cta :global(.btn) {
          min-height: 46px;
          padding-left: 20px;
          padding-right: 20px;
        }
        .hx-stats {
          width: 100%;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: var(--s-3);
          margin-top: var(--s-2);
        }
        @media (min-width: 720px) {
          .hx-stats {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: var(--s-4);
          }
        }
        .hx-stat {
          position: relative;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
          padding: calc(16px * var(--space)) calc(16px * var(--space)) calc(14px * var(--space));
        }
        .hx-stat-ico {
          width: 28px;
          height: 28px;
          display: grid;
          place-items: center;
          margin-bottom: 6px;
          border-radius: 9px;
          color: var(--a2);
          background: color-mix(in srgb, var(--a2) 13%, transparent);
        }
        .hx-stat strong {
          font-size: clamp(1.5rem, 1.2rem + 1.2vw, 2rem);
          line-height: 1.05;
          background: linear-gradient(135deg, var(--a2), var(--a3));
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hx-stat strong small {
          font-size: 0.55em;
          margin-left: 3px;
          -webkit-text-fill-color: var(--muted);
        }
        .hx-stat-label {
          font-size: 0.72rem;
          font-family: var(--font-mono);
          color: var(--muted);
        }
        .hx-mono {
          font-family: var(--font-mono);
          font-variant-numeric: tabular-nums;
        }
        .hx-health {
          width: 9px;
          height: 9px;
          border-radius: 50%;
          background: var(--muted);
          display: inline-block;
        }
        .hx-health.ok {
          background: #34d399;
          box-shadow: 0 0 8px #34d399;
          animation: hx-ping calc(1.8s / var(--speed)) ease-in-out infinite;
        }
        .hx-health.err {
          background: #f87171;
        }

        /* ---------- TOOLBAR ---------- */
        .hx-toolbar {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: var(--s-3);
          margin: var(--stack) 0 var(--s-3);
        }
        .hx-search {
          flex: 1 1 260px;
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 0 16px;
          min-height: 48px;
          border-radius: var(--r-input) !important;
        }
        .hx-search:focus-within {
          border-color: var(--a2);
          box-shadow: 0 0 0 3px color-mix(in srgb, var(--a2) 25%, transparent);
        }
        .hx-search input {
          flex: 1;
          min-width: 0;
          background: transparent;
          border: none;
          outline: none;
          color: var(--text);
          font: inherit;
          font-family: var(--font-mono);
          font-size: 0.88rem;
        }
        .hx-search button {
          display: flex;
          background: none;
          border: none;
          color: var(--muted);
          cursor: pointer;
        }
        .hx-search kbd {
          font-size: 0.68rem;
          padding: 1px 7px;
          border-radius: 6px;
          color: var(--muted);
          background: color-mix(in srgb, var(--text) 8%, transparent);
          border: 1px solid var(--border);
        }
        .hx-chips {
          display: flex;
          gap: 4px;
          padding: 4px;
          max-width: 100%;
          overflow-x: auto;
          border-radius: var(--r-input);
          background: var(--glass);
          border: 1px solid var(--border);
          scrollbar-width: none;
          -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent);
          mask-image: linear-gradient(90deg, #000 calc(100% - 28px), transparent);
        }
        .hx-chips::-webkit-scrollbar {
          display: none;
        }
        .hx-chip {
          position: relative;
          flex-shrink: 0;
          min-height: 38px;
          padding: 0 16px;
          border: none;
          background: transparent;
          border-radius: var(--r-chip);
          color: var(--muted);
          font-family: var(--font-mono);
          font-size: 0.76rem;
          cursor: pointer;
          transition: color 0.2s;
        }
        .hx-chip.active {
          color: var(--on-accent);
        }
        .hx-chip-bg {
          position: absolute;
          inset: 0;
          border-radius: var(--r-chip);
          background: linear-gradient(135deg, var(--a1), var(--a3));
          box-shadow: 0 4px 14px var(--border-glow);
        }
        .hx-chip-label {
          position: relative;
        }
        .hx-count {
          min-height: 22px;
          margin-bottom: var(--s-4);
          font-family: var(--font-mono);
          font-size: 0.72rem;
          color: var(--muted);
        }

        /* ---------- GRID ---------- */
        .hx-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(min(100%, var(--card-min)), 1fr));
          gap: calc(20px * var(--space));
          align-items: stretch;
        }
        .hx-item {
          min-width: 0;
          display: flex;
        }
        .hx-link {
          display: flex;
          width: 100%;
          padding: 0;
          border: none;
          background: none;
          font: inherit;
          color: inherit;
          text-align: left;
          cursor: pointer;
          border-radius: var(--radius);
          perspective: 900px;
        }
        .hx-link:focus-visible {
          outline: 2px solid var(--a2);
          outline-offset: 3px;
        }

        /* ---------- KARTU ---------- */
        .hx-card {
          --mx: 50%;
          --my: 0%;
          position: relative;
          display: flex;
          flex-direction: column;
          width: 100%;
          overflow: hidden;
          transform-style: preserve-3d;
          transition: border-color 0.25s ease, box-shadow 0.3s ease;
          will-change: transform;
        }
        .hx-card:hover {
          border-color: color-mix(in srgb, var(--ac) 70%, transparent);
          box-shadow: 0 22px 50px -18px color-mix(in srgb, var(--ac) 55%, transparent),
            0 0 0 1px color-mix(in srgb, var(--ac) 35%, transparent);
        }
        .hx-spot {
          position: absolute;
          inset: 0;
          pointer-events: none;
          opacity: 0;
          z-index: 3;
          transition: opacity 0.3s ease;
          background: radial-gradient(
            260px circle at var(--mx) var(--my),
            color-mix(in srgb, var(--ac) 22%, transparent),
            transparent 65%
          );
        }
        .hx-card:hover .hx-spot {
          opacity: 1;
        }

        /* 1. link preview chrome */
        .hx-chrome {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          border-bottom: 1px solid var(--border);
          background: color-mix(in srgb, var(--text) 4%, transparent);
        }
        .hx-traffic {
          display: flex;
          gap: 5px;
          flex-shrink: 0;
        }
        .hx-traffic i {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: color-mix(in srgb, var(--text) 22%, transparent);
          transition: background 0.25s ease;
        }
        .hx-card:hover .hx-traffic i:nth-child(1) {
          background: #f87171;
        }
        .hx-card:hover .hx-traffic i:nth-child(2) {
          background: #fbbf24;
        }
        .hx-card:hover .hx-traffic i:nth-child(3) {
          background: #34d399;
        }
        .hx-url {
          flex: 1;
          min-width: 0;
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          border-radius: var(--r-chip);
          font-family: var(--font-mono);
          font-size: 0.66rem;
          color: var(--muted);
          background: color-mix(in srgb, var(--bg1) 45%, transparent);
          border: 1px solid var(--border);
        }
        .hx-url span {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .hx-status {
          flex-shrink: 0;
          font-family: var(--font-mono);
          font-size: 0.6rem;
          font-weight: 700;
          letter-spacing: 0.05em;
          padding: 3px 7px;
          border-radius: 6px;
          color: var(--ac);
          background: color-mix(in srgb, var(--ac) 14%, transparent);
          border: 1px solid color-mix(in srgb, var(--ac) 35%, transparent);
        }

        /* 2. preview */
        .hx-preview {
          position: relative;
          height: 150px;
          overflow: hidden;
          background: radial-gradient(circle at 25% 15%, color-mix(in srgb, var(--ac) 30%, transparent), transparent 62%),
            linear-gradient(180deg, color-mix(in srgb, var(--bg1) 55%, transparent), color-mix(in srgb, var(--bg2) 60%, transparent));
        }
        .hx-num {
          position: absolute;
          right: 10px;
          top: 6px;
          font-family: var(--font-mono);
          font-size: 0.66rem;
          color: color-mix(in srgb, var(--text) 35%, transparent);
        }
        .hx-pv {
          position: absolute;
          inset: 0;
          padding: 16px 18px;
          transition: transform 0.5s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .hx-card:hover .hx-pv {
          transform: scale(1.05);
        }

        /* terminal */
        .hx-term {
          font-family: var(--font-mono);
          font-size: 0.72rem;
          display: flex;
          flex-direction: column;
          gap: 7px;
          color: var(--text);
        }
        .hx-line {
          width: 0;
          overflow: hidden;
          white-space: nowrap;
          animation: hx-type calc(6s / var(--speed)) steps(26) infinite;
        }
        .hx-line b {
          color: var(--ac);
        }
        .hx-line em {
          color: #34d399;
          font-style: normal;
        }
        .hx-line.l2 {
          animation-delay: calc(0.6s / var(--speed));
        }
        .hx-line.l3 {
          animation-delay: calc(1.2s / var(--speed));
          color: var(--muted);
        }
        .hx-line.l4 {
          animation-delay: calc(1.8s / var(--speed));
        }
        .hx-cursor {
          display: inline-block;
          width: 7px;
          height: 13px;
          vertical-align: -2px;
          background: var(--ac);
          animation: hx-blink calc(0.9s / var(--speed)) steps(1) infinite;
        }

        /* chart */
        .hx-chart {
          display: flex;
          align-items: flex-end;
        }
        .hx-bars {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: flex-end;
          gap: 8px;
        }
        .hx-bars span {
          flex: 1;
          border-radius: 6px 6px 2px 2px;
          background: linear-gradient(180deg, var(--ac), color-mix(in srgb, var(--ac) 20%, transparent));
          transform-origin: bottom;
          animation: hx-bar calc(2.6s / var(--speed)) ease-in-out infinite;
        }
        .hx-line-svg {
          position: absolute;
          inset: 16px 18px;
          width: calc(100% - 36px);
          height: calc(100% - 32px);
          overflow: visible;
        }
        .hx-line-svg polyline {
          fill: none;
          stroke: var(--text);
          stroke-width: 2;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-dasharray: 260;
          stroke-dashoffset: 260;
          filter: drop-shadow(0 0 4px var(--ac));
          animation: hx-draw calc(3.6s / var(--speed)) ease-in-out infinite;
        }

        /* chat */
        .hx-chat {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 0.72rem;
        }
        .hx-bub {
          max-width: 70%;
          padding: 7px 12px;
          border-radius: 14px;
          opacity: 0;
          transform: translateY(8px) scale(0.9);
          animation: hx-pop calc(6s / var(--speed)) ease-out infinite;
        }
        .hx-bub.a {
          align-self: flex-start;
          background: color-mix(in srgb, var(--text) 12%, transparent);
          border-bottom-left-radius: 4px;
        }
        .hx-bub.b {
          align-self: flex-end;
          background: var(--ac);
          color: var(--on-accent);
          border-bottom-right-radius: 4px;
          animation-delay: calc(0.9s / var(--speed));
        }
        .hx-bub.c3 {
          animation-delay: calc(1.8s / var(--speed));
        }
        .hx-typing {
          align-self: flex-end;
          display: flex;
          gap: 4px;
          padding: 8px 10px;
          border-radius: 12px;
          background: color-mix(in srgb, var(--ac) 25%, transparent);
        }
        .hx-typing i {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--ac);
          animation: hx-dots calc(1s / var(--speed)) ease-in-out infinite;
        }
        .hx-typing i:nth-child(2) {
          animation-delay: 0.15s;
        }
        .hx-typing i:nth-child(3) {
          animation-delay: 0.3s;
        }

        /* code */
        .hx-code {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .hx-cl {
          height: 9px;
        }
        .hx-cl span {
          display: block;
          height: 100%;
          border-radius: 5px;
          background: linear-gradient(90deg, var(--ac), color-mix(in srgb, var(--a3) 70%, var(--ac)), var(--ac));
          background-size: 220% 100%;
          opacity: 0.8;
          animation: hx-sweep calc(2.8s / var(--speed)) linear infinite;
        }
        .hx-braces {
          position: absolute;
          right: 16px;
          bottom: 8px;
          font-family: var(--font-mono);
          font-size: 2.2rem;
          font-weight: 700;
          color: color-mix(in srgb, var(--ac) 40%, transparent);
          animation: hx-float calc(3s / var(--speed)) ease-in-out infinite;
        }

        /* upload */
        .hx-up {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }
        .hx-drop {
          width: 60px;
          height: 50px;
          border-radius: 14px;
          border: 2px dashed color-mix(in srgb, var(--ac) 70%, transparent);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ac);
          animation: hx-float calc(2s / var(--speed)) ease-in-out infinite;
        }
        .hx-prog {
          width: 70%;
          height: 6px;
          border-radius: 6px;
          overflow: hidden;
          background: color-mix(in srgb, var(--text) 12%, transparent);
        }
        .hx-prog span {
          display: block;
          height: 100%;
          width: 100%;
          border-radius: 6px;
          transform-origin: left;
          background: linear-gradient(90deg, var(--ac), var(--a3));
          animation: hx-fill calc(3.2s / var(--speed)) ease-in-out infinite;
        }
        .hx-files {
          display: flex;
          gap: 6px;
        }
        .hx-files i {
          width: 22px;
          height: 8px;
          border-radius: 4px;
          background: color-mix(in srgb, var(--ac) 55%, transparent);
          animation: hx-ping calc(1.8s / var(--speed)) ease-in-out infinite;
        }
        .hx-files i:nth-child(2) {
          animation-delay: 0.2s;
        }
        .hx-files i:nth-child(3) {
          animation-delay: 0.4s;
        }

        /* theme */
        .hx-theme {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hx-orbit {
          position: relative;
          width: 108px;
          height: 108px;
          animation: hx-spin calc(14s / var(--speed)) linear infinite, hx-hue calc(8s / var(--speed)) linear infinite;
        }
        .hx-orbit span {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 22px;
          height: 22px;
          margin: -11px;
          border-radius: 50%;
          background: conic-gradient(var(--a1), var(--a2), var(--a3), var(--a1));
          transform: rotate(calc(var(--i) * 60deg)) translateY(-46px);
          box-shadow: 0 0 12px color-mix(in srgb, var(--ac) 60%, transparent);
        }
        .hx-orbit-core {
          position: absolute;
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: conic-gradient(var(--a1), var(--a2), var(--a3), var(--a1));
          animation: hx-spin calc(5s / var(--speed)) linear infinite reverse;
        }

        /* lock */
        .hx-lock,
        .hx-guest {
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .hx-ring,
        .hx-ripple {
          position: absolute;
          width: 64px;
          height: 64px;
          border-radius: 50%;
          border: 2px solid var(--ac);
          opacity: 0;
          animation: hx-ring calc(3s / var(--speed)) ease-out infinite;
        }
        .hx-ring.r2,
        .hx-ripple.d2 {
          animation-delay: calc(1s / var(--speed));
        }
        .hx-ring.r3 {
          animation-delay: calc(2s / var(--speed));
        }
        .hx-lock-core,
        .hx-avatar {
          position: relative;
          z-index: 1;
          width: 56px;
          height: 56px;
          border-radius: 18px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--on-accent);
          background: linear-gradient(135deg, var(--a1), var(--a3));
          box-shadow: 0 0 26px color-mix(in srgb, var(--ac) 55%, transparent);
        }
        .hx-avatar {
          border-radius: 50%;
          animation: hx-float calc(2.4s / var(--speed)) ease-in-out infinite;
        }
        .hx-scan {
          position: absolute;
          left: 12%;
          right: 12%;
          height: 2px;
          background: linear-gradient(90deg, transparent, var(--ac), transparent);
          box-shadow: 0 0 10px var(--ac);
          animation: hx-scan calc(2.6s / var(--speed)) ease-in-out infinite alternate;
        }
        .hx-dot-orbit {
          position: absolute;
          width: 92px;
          height: 92px;
          animation: hx-spin calc(4s / var(--speed)) linear infinite;
        }
        .hx-dot-orbit i {
          position: absolute;
          top: 0;
          left: 50%;
          width: 9px;
          height: 9px;
          margin-left: -4px;
          border-radius: 50%;
          background: var(--ac);
          box-shadow: 0 0 10px var(--ac);
        }

        /* json */
        .hx-json {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-family: var(--font-mono);
          font-size: 0.8rem;
          color: var(--muted);
        }
        .hx-jl {
          display: flex;
          align-items: center;
          gap: 8px;
          height: 14px;
        }
        .hx-jl.in {
          padding-left: 16px;
        }
        .hx-jl i,
        .hx-jl u {
          display: block;
          height: 7px;
          border-radius: 4px;
          text-decoration: none;
          animation: hx-sweep calc(3s / var(--speed)) linear infinite;
          background-size: 220% 100%;
        }
        .hx-jl i.k {
          width: 22%;
          background-image: linear-gradient(90deg, var(--a3), color-mix(in srgb, var(--a3) 40%, transparent), var(--a3));
        }
        .hx-jl u.s {
          background-image: linear-gradient(90deg, #34d399, color-mix(in srgb, #34d399 40%, transparent), #34d399);
        }
        .hx-jl u.n {
          background-image: linear-gradient(90deg, #fbbf24, color-mix(in srgb, #fbbf24 40%, transparent), #fbbf24);
        }
        .hx-jl u.b {
          background-image: linear-gradient(90deg, var(--a2), color-mix(in srgb, var(--a2) 40%, transparent), var(--a2));
        }
        .hx-status-dot {
          position: absolute;
          right: 18px;
          top: 16px;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #34d399;
          box-shadow: 0 0 12px #34d399;
          animation: hx-ping calc(1.6s / var(--speed)) ease-in-out infinite;
        }

        /* 3. body */
        .hx-body {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 10px;
          padding: calc(16px * var(--space)) calc(18px * var(--space)) calc(10px * var(--space));
        }
        .hx-title-row {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .hx-title-row h3 {
          font-size: 1.05rem;
          min-width: 0;
        }
        .hx-icon {
          flex-shrink: 0;
          width: 34px;
          height: 34px;
          border-radius: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--ac);
          background: color-mix(in srgb, var(--ac) 14%, transparent);
          border: 1px solid color-mix(in srgb, var(--ac) 30%, transparent);
          transition: transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1);
        }
        .hx-card:hover .hx-icon {
          transform: rotate(-10deg) scale(1.14);
        }
        .hx-body p {
          font-size: 0.84rem;
          line-height: 1.55;
        }
        .hx-tags {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: auto;
          padding-top: 2px;
        }
        .hx-tags span {
          font-family: var(--font-mono);
          font-size: 0.64rem;
          padding: 3px 8px;
          border-radius: 6px;
          color: var(--muted);
          background: color-mix(in srgb, var(--text) 6%, transparent);
          border: 1px solid var(--border);
        }

        /* 4. footer */
        .hx-foot {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: calc(12px * var(--space)) calc(18px * var(--space));
          border-top: 1px solid var(--border);
          font-family: var(--font-mono);
          font-size: 0.7rem;
          color: var(--muted);
        }
        .hx-cat {
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }
        .hx-meta {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .hx-lockhint {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #fbbf24;
        }
        .hx-open {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-weight: 700;
          color: var(--ac);
        }
        .hx-open svg {
          transition: transform 0.25s ease;
        }
        .hx-card:hover .hx-open svg {
          transform: translateX(5px);
        }

        /* ---------- EMPTY ---------- */
        .hx-empty {
          margin-top: 10px;
          padding: 36px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          text-align: center;
        }

        /* ---------- KEYFRAMES ---------- */
        @keyframes hx-flow {
          to {
            background-position: 300% 0;
          }
        }
        @keyframes hx-ping {
          50% {
            opacity: 0.35;
            transform: scale(0.8);
          }
        }
        @keyframes hx-type {
          0% {
            width: 0;
          }
          30%,
          88% {
            width: 100%;
          }
          100% {
            width: 0;
          }
        }
        @keyframes hx-blink {
          50% {
            opacity: 0;
          }
        }
        @keyframes hx-bar {
          0%,
          100% {
            transform: scaleY(0.45);
          }
          50% {
            transform: scaleY(1);
          }
        }
        @keyframes hx-draw {
          0% {
            stroke-dashoffset: 260;
          }
          55%,
          85% {
            stroke-dashoffset: 0;
          }
          100% {
            stroke-dashoffset: -260;
          }
        }
        @keyframes hx-pop {
          0%,
          6% {
            opacity: 0;
            transform: translateY(8px) scale(0.9);
          }
          14%,
          82% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
          94%,
          100% {
            opacity: 0;
            transform: translateY(-4px) scale(0.98);
          }
        }
        @keyframes hx-dots {
          0%,
          100% {
            transform: translateY(0);
            opacity: 0.5;
          }
          50% {
            transform: translateY(-4px);
            opacity: 1;
          }
        }
        @keyframes hx-sweep {
          to {
            background-position: -220% 0;
          }
        }
        @keyframes hx-float {
          50% {
            transform: translateY(-6px);
          }
        }
        @keyframes hx-fill {
          0% {
            transform: scaleX(0);
          }
          70%,
          100% {
            transform: scaleX(1);
          }
        }
        @keyframes hx-spin {
          to {
            transform: rotate(360deg);
          }
        }
        @keyframes hx-hue {
          to {
            filter: hue-rotate(360deg);
          }
        }
        @keyframes hx-ring {
          0% {
            opacity: 0.8;
            transform: scale(0.6);
          }
          100% {
            opacity: 0;
            transform: scale(2.1);
          }
        }
        @keyframes hx-scan {
          from {
            top: 18%;
          }
          to {
            top: 78%;
          }
        }

        @media (max-width: 560px) {
          .hx-term {
            font-size: 0.66rem;
          }
          .hx-preview {
            height: 130px;
          }
          .hx-chips {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
}
