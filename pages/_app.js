import { useEffect, useState } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { SessionProvider } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from '@/components/Layout';
import Preloader from '@/components/Preloader';
import { sound } from '@/src/lib/interactiveEffects';
import '@/styles/globals.css';

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter();
  const [routeChanging, setRouteChanging] = useState(false);

  // 1. Service Worker PWA Register
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // 2. Route Transition Events & Audio Sound Effects
  useEffect(() => {
    const handleStart = (url) => {
      if (url !== router.asPath) {
        sound.playBeep();
        setRouteChanging(true);
      }
    };
    const handleComplete = () => setRouteChanging(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  return (
    <SessionProvider session={session}>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
        <title>NEXUS OS // Cyber Dashboard Platform</title>
      </Head>

      {/* Cyber Preloader Initial Mount */}
      <Preloader />

      {/* Top Scanline Route Progress Bar */}
      <AnimatePresence>
        {routeChanging && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: '3px',
              background: 'linear-gradient(90deg, var(--a1), var(--a2), var(--a3))',
              transformOrigin: '0%',
              zIndex: 99999,
              boxShadow: '0 0 14px var(--a2)',
            }}
          />
        )}
      </AnimatePresence>

      <Layout>
        {/* Full Page Fluid Transition */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={router.asPath.split('?')[0]}
            initial={{ opacity: 0, y: 16, filter: 'blur(6px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -16, filter: 'blur(6px)' }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: '100%' }}
          >
            <Component {...pageProps} />
          </motion.div>
        </AnimatePresence>
      </Layout>
    </SessionProvider>
  );
}