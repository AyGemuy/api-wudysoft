import { useRouter } from 'next/router';
import { AnimatePresence, motion } from 'framer-motion';
import { useTheme } from './ThemeContext';

const VARIANTS = {
  slide: { initial: { opacity: 0, y: 14 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -10 } },
  fade: { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } },
  zoom: { initial: { opacity: 0, scale: 0.97 }, animate: { opacity: 1, scale: 1 }, exit: { opacity: 0, scale: 1.02 } },
};

/** Transisi antar halaman — jenis & kecepatan mengikuti pengaturan Theme Studio. */
export default function PageTransition({ children }) {
  const router = useRouter();
  const { config } = useTheme();
  const mode = config.anim === 'off' ? 'none' : config.animPage;

  if (mode === 'none') return <div style={{ width: '100%' }}>{children}</div>;
  const v = VARIANTS[mode] || VARIANTS.slide;
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={router.asPath.split('?')[0]}
        initial={v.initial}
        animate={v.animate}
        exit={v.exit}
        transition={{ duration: 0.24 / Math.max(0.5, config.speed), ease: [0.22, 1, 0.36, 1] }}
        style={{ width: '100%' }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
