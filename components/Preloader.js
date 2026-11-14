import { useEffect, useRef, useState } from 'react';
import Router from 'next/router';
import { useSession } from 'next-auth/react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './Icons';

const MIN_BOOT_MS = 700; // splash tidak berkedip di koneksi cepat
const MAX_BOOT_MS = 8000; // pengaman bila ada aset yang menggantung
const ROUTE_DELAY_MS = 120; // loader halaman baru muncul bila transisi > 120ms
const ROUTE_MIN_MS = 300; // dan tampil minimal 300ms agar tidak kedip

const waitWindowLoad = () =>
  new Promise((resolve) => {
    if (document.readyState === 'complete') return resolve();
    window.addEventListener('load', resolve, { once: true });
  });

const waitFonts = () => (document.fonts?.ready ? document.fonts.ready.catch(() => {}) : Promise.resolve());
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * 1) BOOT: splash layar penuh (ikut dirender di SSR agar tidak ada flash konten)
 *    sampai: window `load` + font siap + sesi NextAuth selesai dicek + minimal 700ms.
 * 2) ROUTE: progress bar tipis di atas + kartu "Memuat halaman…" saat pindah halaman.
 */
export default function Preloader() {
  const { status } = useSession();

  const [assetsReady, setAssetsReady] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [booting, setBooting] = useState(true);
  const [progress, setProgress] = useState(6);

  const [routeLoading, setRouteLoading] = useState(false);
  const [bar, setBar] = useState({ active: false, pct: 0 });

  const sessionReady = status !== 'loading' || timedOut;
  const allReady = assetsReady && sessionReady;

  // --- BOOT: tunggu aset ---
  useEffect(() => {
    let alive = true;
    const maxTimer = setTimeout(() => {
      if (!alive) return;
      setTimedOut(true);
      setAssetsReady(true);
    }, MAX_BOOT_MS);

    Promise.all([waitWindowLoad(), waitFonts(), delay(MIN_BOOT_MS)]).then(() => {
      if (alive) setAssetsReady(true);
    });

    return () => {
      alive = false;
      clearTimeout(maxTimer);
    };
  }, []);

  // --- BOOT: progress menuju 90% selama menunggu, lalu 100% ---
  useEffect(() => {
    if (!booting) return;
    if (allReady) {
      setProgress(100);
      const t = setTimeout(() => setBooting(false), 320);
      return () => clearTimeout(t);
    }
    const id = setInterval(() => setProgress((p) => p + (90 - p) * 0.09), 120);
    return () => clearInterval(id);
  }, [allReady, booting]);

  // Kunci scroll selama splash
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('is-loading', booting);
    return () => root.classList.remove('is-loading');
  }, [booting]);

  // --- ROUTE: loader saat pindah halaman ---
  const trickle = useRef(null);
  useEffect(() => {
    let showTimer;
    let hideTimer;
    let shownAt = 0;

    const samePage = (url) => url.split('?')[0].split('#')[0] === Router.asPath.split('?')[0].split('#')[0];

    const start = (url) => {
      if (samePage(url)) return;
      clearTimeout(hideTimer);
      clearInterval(trickle.current);
      setBar({ active: true, pct: 12 });
      trickle.current = setInterval(
        () => setBar((b) => ({ ...b, pct: b.pct + (88 - b.pct) * 0.12 })),
        160
      );
      showTimer = setTimeout(() => {
        shownAt = Date.now();
        setRouteLoading(true);
      }, ROUTE_DELAY_MS);
    };

    const end = () => {
      clearTimeout(showTimer);
      clearInterval(trickle.current);
      setBar({ active: true, pct: 100 });
      setTimeout(() => setBar({ active: false, pct: 0 }), 260);
      if (!shownAt) return;
      const wait = Math.max(0, ROUTE_MIN_MS - (Date.now() - shownAt));
      hideTimer = setTimeout(() => {
        setRouteLoading(false);
        shownAt = 0;
      }, wait);
    };

    Router.events.on('routeChangeStart', start);
    Router.events.on('routeChangeComplete', end);
    Router.events.on('routeChangeError', end);
    return () => {
      Router.events.off('routeChangeStart', start);
      Router.events.off('routeChangeComplete', end);
      Router.events.off('routeChangeError', end);
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      clearInterval(trickle.current);
    };
  }, []);

  const label = allReady
    ? 'Siap'
    : assetsReady
      ? 'Memverifikasi sesi…'
      : progress < 40
        ? 'Memuat aset…'
        : progress < 70
          ? 'Memuat font & tema…'
          : 'Menyiapkan antarmuka…';

  return (
    <>
      {/* Progress bar tipis saat pindah halaman */}
      <div className="route-bar" aria-hidden="true">
        <div
          className="route-bar-fill"
          style={{
            transform: `scaleX(${bar.pct / 100})`,
            opacity: bar.active ? 1 : 0,
          }}
        />
      </div>

      {/* Kartu loading halaman */}
      <AnimatePresence>
        {!booting && routeLoading && (
          <motion.div
            key="route-loader"
            className="route-loader"
            role="status"
            aria-live="polite"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.18 }}
          >
            <span className="spinner" />
            <span>Memuat halaman…</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Splash awal */}
      <AnimatePresence>
        {booting && (
          <motion.div
            key="boot"
            className="boot-overlay"
            role="status"
            aria-busy="true"
            aria-live="polite"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 1.02, transition: { duration: 0.45, ease: 'easeOut' } }}
          >
            <div className="boot-ring">
              <motion.svg
                width="96"
                height="96"
                viewBox="0 0 100 100"
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.6, ease: 'linear' }}
                style={{ position: 'absolute', inset: 0 }}
              >
                <circle cx="50" cy="50" r="44" fill="none" stroke="color-mix(in srgb, var(--text) 8%, transparent)" strokeWidth="4" />
                <circle
                  cx="50"
                  cy="50"
                  r="44"
                  fill="none"
                  stroke="var(--a2)"
                  strokeWidth="4"
                  strokeDasharray="276"
                  strokeDashoffset="190"
                  strokeLinecap="round"
                />
              </motion.svg>
              <div className="boot-core">
                <Icons.Zap size={26} color="var(--on-accent)" />
              </div>
            </div>

            <div className="boot-title">NEXUS</div>

            <div className="boot-progress" aria-hidden="true">
              <div className="boot-progress-fill" style={{ width: `${Math.round(progress)}%` }} />
            </div>

            <div className="boot-meta">
              <span>{label}</span>
              <span>{Math.round(progress)}%</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
