import { Html, Head, Main, NextScript } from 'next/document';
import site from '@/configs/siteConfig';
import { THEME_BOOT_SCRIPT, DEFAULT_CONFIG, resolveColors } from '@/src/lib/themes';

// Nilai awal (SSR) mengikuti tema bawaan. Setelah halaman termuat, boot script dan
// applyThemeAssets() (src/lib/themeAssets.js) menggantinya dengan warna tema pilihan pengunjung.
const C = resolveColors(DEFAULT_CONFIG);
const MODE = C.light ? 'light' : 'dark';

export default function Document() {
  return (
    <Html lang="id" data-theme={DEFAULT_CONFIG.theme} data-mode={MODE}>
      <Head>
        <meta charSet="utf-8" />

        {/* Tag yang ikut tema — harus berada SEBELUM boot script agar bisa diperbarui sebelum paint */}
        <meta name="theme-color" content={C.bg1} />
        <meta name="color-scheme" content={MODE} />
        <meta name="supported-color-schemes" content={MODE} />
        <meta name="msapplication-TileColor" content={C.a1} />
        <meta name="msapplication-TileImage" content="/icons/icon-192.png" />
        <meta name="msapplication-navbutton-color" content={C.bg1} />
        <meta name="apple-mobile-web-app-status-bar-style" content={C.light ? 'default' : 'black-translucent'} />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="mask-icon" href="/favicon.svg" color={C.a1} />
        <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />

        <link rel="icon" href="/favicon.ico" sizes="any" />
        <meta name="application-name" content={site.APP_NAME} />
        <meta name="apple-mobile-web-app-title" content={site.APP_NAME} />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="format-detection" content="telephone=no, address=no, email=no" />
        <meta name="referrer" content="strict-origin-when-cross-origin" />
        <meta name="author" content={site.APP_NAME} />
        <meta name="generator" content="Next.js" />
        <meta name="msapplication-tap-highlight" content="no" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;600&display=swap"
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
