import { Html, Head, Main, NextScript } from 'next/document';
import { THEME_BOOT_SCRIPT } from '@/src/lib/themes';

export default function Document() {
  return (
    <Html lang="id" data-theme="stealth">
      <Head>
        <meta charSet="utf-8" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />
        <meta name="theme-color" content="#07090e" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap"
          rel="stylesheet"
        />
      </Head>
      <body>
        <noscript>
          <style>{'.boot-overlay{display:none!important}html.is-loading{overflow:auto!important}'}</style>
        </noscript>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}