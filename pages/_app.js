import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { SessionProvider } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from '@/components/Layout';
import Preloader from '@/components/Preloader';
import { sound } from '@/src/lib/interactiveEffects';
import { lockZoom } from '@/src/lib/lockZoom';
import '@/styles/globals.css';

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  const router = useRouter();

  // 1. Service Worker PWA Register
  useEffect(() => {
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }
  }, []);

  // 1b. Kunci zoom/cubit (pinch, double-tap, ctrl+wheel)
  useEffect(() => lockZoom(), []);

  // 2. Efek suara saat pindah halaman (indikator loading ada di <Preloader />)
  useEffect(() => {
    const handleStart = (url) => {
      if (url.split('?')[0] !== router.asPath.split('?')[0]) sound.playBeep();
    };
    router.events.on('routeChangeStart', handleStart);
    return () => router.events.off('routeChangeStart', handleStart);
  }, [router]);

  return (
    <SessionProvider session={session}>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover"
        />
        <title>NEXUS OS // Cyber Dashboard Platform</title>
      </Head>

      {/* Splash awal + indikator loading antar halaman */}
      <Preloader />

      <Layout>
        {/* Transisi halaman. TANPA filter/blur: filter membuat elemen position:fixed
            di dalam halaman (modal, toast) ikut tergeser. */}
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={router.asPath.split('?')[0]}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            style={{ width: '100%' }}
          >
            <Component {...pageProps} />
          </motion.div>
        </AnimatePresence>
      </Layout>
    </SessionProvider>
  );
}
