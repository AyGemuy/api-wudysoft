import { useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import { motion, useReducedMotion } from 'framer-motion';
import { useTheme } from './ThemeContext';

const E = [0.22, 1, 0.36, 1];

/** Varian transisi halaman. Semuanya hanya memakai transform/opacity/filter → mulus di GPU. */
const VARIANTS = {
  slide: { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } },
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  zoom: { initial: { opacity: 0, scale: 0.96 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.03 } },
  blur: { initial: { opacity: 0, filter: 'blur(14px)' }, animate: { opacity: 1, filter: 'blur(0px)' }, exit: { opacity: 0, filter: 'blur(10px)' } },
  slideX: { initial: { opacity: 0, x: 40 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: -40 } },
  slideXr: { initial: { opacity: 0, x: -40 }, animate: { opacity: 1, x: 0 }, exit: { opacity: 0, x: 40 } },
  rise: { initial: { opacity: 0, y: 44, scale: 0.98 }, animate: { opacity: 1, y: 0, scale: 1 }, exit: { opacity: 0, y: 20 } },
  flip: { initial: { opacity: 0, rotateX: -12, y: 20, transformPerspective: 1100 }, animate: { opacity: 1, rotateX: 0, y: 0, transformPerspective: 1100 }, exit: { opacity: 0, rotateX: 8, transformPerspective: 1100 } },
  drop: { initial: { opacity: 0, y: -36 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: 24 } },
  skew: { initial: { opacity: 0, skewY: 2.5, y: 26 }, animate: { opacity: 1, skewY: 0, y: 0 }, exit: { opacity: 0, skewY: -1.5, y: -14 } },
};

/** Mode "auto": tiap bagian situs punya gaya masuk sendiri supaya navigasi terasa beragam. */
const AUTO = {
  '/': 'zoom',
  '/playground': 'slideX',
  '/stats': 'rise',
  '/rooms': 'slideXr',
  '/tools': 'flip',
  '/auth': 'blur',
  '/profile': 'drop',
};
const autoFor = (path) => {
  if (AUTO[path]) return AUTO[path];
  const seg = `/${path.split('/')[1] || ''}`;
  return AUTO[seg] || 'slide';
};

/** Transisi antar halaman — jenis & kecepatan mengikuti pengaturan Theme Studio ("auto" = beragam per halaman). */
export default function PageTransition({ children }) {
  const router = useRouter();
  const { config } = useTheme();
  const reduced = useReducedMotion();
  const path = router.asPath.split('?')[0].split('#')[0];
  const requested = config.anim === 'off' || reduced ? 'none' : config.animPage;
  const name = requested === 'auto' ? autoFor(path) : requested;
  // varian dikunci per halaman agar exit memakai gaya halaman yang ditinggalkan
  const locked = useRef({});
  locked.current[path] = locked.current[path] || name;

  // Scroll ke atas tiap pindah halaman (dulu lewat onExitComplete)
  useEffect(() => { window.scrollTo(0, 0); }, [path]);

  if (requested === 'none') return <div style={{ width: '100%' }}>{children}</div>;
  const v = VARIANTS[locked.current[path]] || VARIANTS.slide;
  const d = 0.34 / Math.max(0.5, config.speed);

  // Hanya animasi MASUK. AnimatePresence mode="wait" dibuang: bila animasi keluar tidak selesai
  // (klik cepat, tombol ⚡/dial, back), halaman baru tetap tak terlihat (kosong) sampai di-refresh.
  return (
    <motion.div
      key={path}
      initial={v.initial}
      animate={v.animate}
      transition={{ duration: d, ease: E }}
      style={{ width: '100%', willChange: 'transform, opacity' }}
    >
      {children}
    </motion.div>
  );
}
