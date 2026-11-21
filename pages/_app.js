import { useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { SessionProvider } from 'next-auth/react';
import { AnimatePresence, motion } from 'framer-motion';
import Seo from '@/components/Seo';
import Layout from '@/components/Layout';
import GlobalSounds from '@/components/GlobalSounds';
import Preloader from '@/components/Preloader';
import PageTransition from '@/components/PageTransition';
import { sound } from '@/src/lib/interactiveEffects';
import { lockZoom } from '@/src/lib/lockZoom';
import GlobalEffects from '@/components/motion/GlobalEffects';
import AudioControl from '@/components/AudioControl';
import AssistantFab from '@/components/AssistantFab';
import '@/styles/globals.css';
import '@/styles/motion.css';
import '@/styles/hljs.css';

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
      if (url.split('?')[0] !== router.asPath.split('?')[0]) sound.fx('nav');
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
      </Head>
      {/* Meta/OG bawaan untuk SEMUA halaman (halaman dengan <Seo> sendiri menimpa lewat key yang sama) */}
      <Seo path={router.asPath.split('?')[0].split('#')[0] || '/'} />

      {/* Splash awal + indikator loading antar halaman */}
      <Preloader />
      <GlobalEffects />
      <GlobalSounds />

      <Layout>
        <PageTransition>
          <Component {...pageProps} />
        </PageTransition>
        <AudioControl />
        <AssistantFab />
      </Layout>
    </SessionProvider>
  );
}
