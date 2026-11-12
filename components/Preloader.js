import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './Icons';

export default function Preloader() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const handleStart = () => setLoading(true);
    const handleComplete = () => setLoading(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  if (!mounted || !loading) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="preloader-overlay"
        initial={{ opacity: 1 }}
        exit={{ opacity: 0, transition: { duration: 0.3 } }}
      >
        <div className="preloader-ring">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.8, ease: 'linear' }}
            style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <svg width="70" height="70" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255, 255, 255, 0.08)" strokeWidth="4" />
              <circle
                cx="50"
                cy="50"
                r="42"
                fill="none"
                stroke="var(--a2)"
                strokeWidth="4"
                strokeDasharray="260"
                strokeDashoffset="180"
                strokeLinecap="round"
              />
            </svg>
          </motion.div>
          <Icons.Zap size={24} color="var(--a2)" />
        </div>

        <span className="preloader-text">NEXUS INITIALIZING</span>

        <div className="preloader-bar-wrap">
          <motion.div
            className="preloader-bar-line"
            animate={{ x: ['-100%', '200%'] }}
            transition={{ repeat: Infinity, duration: 1.4, ease: 'easeInOut' }}
          />
        </div>
      </motion.div>
    </AnimatePresence>
  );
}