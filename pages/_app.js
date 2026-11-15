import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { SessionProvider } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import Layout from '@/components/Layout';
import Preloader from '@/components/Preloader';
import PageTransition from '@/components/PageTransition';
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
        <PageTransition>
          <Component {...pageProps} />
        </PageTransition>
      </Layout>
    </SessionProvider>
  );
}
