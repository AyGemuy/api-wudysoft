// Tanpa .env: semua pengaturan build ada di configs/siteConfig.cjs
const site = require("./configs/siteConfig.cjs");
const { platform, useStandalone } = require("./configs/platform.cjs");

/**
 * File yang TIDAK dibutuhkan saat runtime server, tetapi sering ikut terbawa ke fungsi
 * serverless dan membuatnya melewati batas 250 MB. Hanya alat build/dev & binary platform
 * yang dikecualikan, bukan paket yang diimpor kode Anda. Cek hasilnya dengan `npm run size`.
 */
const EXCLUDE_FROM_SERVER_TRACE = [
  "node_modules/@swc/core*/**",
  "node_modules/@next/swc*/**",
  "node_modules/@esbuild/**",
  "node_modules/esbuild/**",
  "node_modules/esbuild-*/**",
  "node_modules/typescript/**",
  "node_modules/eslint/**",
  "node_modules/eslint-*/**",
  "node_modules/@eslint/**",
  "node_modules/@eslint-community/**",
  "node_modules/webpack/**",
  "node_modules/postcss/**",
  "node_modules/tailwindcss/**",
  "node_modules/autoprefixer/**",
  "node_modules/@ducanh2912/**",
  "node_modules/workbox-*/**",
  "node_modules/sharp/**",
  "node_modules/@img/**",
  "node_modules/puppeteer/**",
  "node_modules/puppeteer-core/**",
  "node_modules/playwright*/**",
  "node_modules/@sparticuz/**",
  ".next/cache/**",
  "**/*.map",
];

/**
 * Aset klien yang TIDAK boleh di-obfuscate: runtime webpack/Next.js & framework.
 * Obfuscate bagian ini bisa merusak hydration dan hanya menambah ukuran.
 */
const OBFUSCATOR_EXCLUDES = [
  "static/chunks/webpack-*.js",
  "static/chunks/framework-*.js",
  "static/chunks/main-*.js",
  "static/chunks/main-app-*.js",
  "static/chunks/polyfills-*.js",
  "static/chunks/[0-9]*.js", // chunk vendor bersama (node_modules)
  "static/*/_buildManifest.js",
  "static/*/_ssgManifest.js",
  "**/node_modules/**",
];

const nextConfig = {
  // 1. Kompresi HTTP response bawaan Next.js (gzip)
  compress: true,

  // 2. Matikan source map di production agar ukuran build jauh lebih kecil
  productionBrowserSourceMaps: false,

  // 2b. Minifier SWC (Rust, cepat) dengan mangling nama variabel/fungsi tingkat atas + 2 putaran kompresi.
  //     Hasilnya lebih kecil dari obfuscator ("mangled") dan tidak memperlambat runtime.
  swcMinify: true,
  compiler: {
    // buang console.log/info/debug dari bundle klien production (error & warn tetap ada untuk diagnosa)
    removeConsole: { exclude: ["error", "warn"] },
  },

  // 3. Memperkecil ukuran deployment (hanya menyertakan node_modules yang terpakai).
  //    Jalankan production dengan `node .next/standalone/server.js` (setelah menyalin
  //    `.next/static` dan `public`), atau tetap pakai `npm start` (server custom + Socket.IO).
  //    Platform terdeteksi otomatis (configs/platform.cjs): di Netlify/Vercel/Cloudflare/Amplify mode ini
  //    dimatikan (runtime mereka membangun fungsinya sendiri); di VPS/Docker/Render/Railway/dll. aktif.
  ...(useStandalone ? { output: "standalone" } : {}),

  reactStrictMode: true,
  poweredByHeader: false,
  images: {
    domains: ["avatars.githubusercontent.com", "lh3.googleusercontent.com", "images.unsplash.com"],
    formats: ["image/avif", "image/webp"], // gambar modern jauh lebih kecil → skor Lighthouse naik
    minimumCacheTTL: 60 * 60 * 24 * 30
  },
  experimental: {
    // hanya sertakan ikon/komponen yang benar-benar dipakai (tree-shaking agresif untuk paket besar)
    optimizePackageImports: ["lucide-react", "framer-motion", "date-fns", "highlight.js"],
    outputFileTracingExcludes: {
      "*": EXCLUDE_FROM_SERVER_TRACE
    }
  },

  webpack: (config, { dev, isServer }) => {
    // ws memakai modul native opsional; jangan di-bundle di sisi server
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push({
        "utf-8-validate": "commonjs utf-8-validate",
        bufferutil: "commonjs bufferutil"
      });
    }

    // Log API otomatis: bungkus semua route pages/api/** (kecuali daftar di bawah) tanpa mengubah file route.
    if (isServer) {
      config.module.rules.unshift({
        test: /[\\/]pages[\\/]api[\\/].+\.js$/,
        exclude: /[\\/]pages[\\/]api[\\/](auth[\\/]\[\.\.\.nextauth\]|stats|live|socket|avatar|og|preview)/,
        enforce: "pre",
        use: [{ loader: require("path").join(__dirname, "scripts", "api-log-loader.js") }],
      });
    }

    // Obfuscate hanya kode klien di production. Matikan lewat OBFUSCATE_CLIENT di configs/siteConfig.cjs.
    if (!dev && !isServer && site.OBFUSCATE_CLIENT) {
      const WebpackObfuscator = require("webpack-obfuscator");
      config.plugins.push(
        new WebpackObfuscator(
          {
            compact: true,
            renameGlobals: false,
            // "mangled" menghasilkan nama pendek (a, b, c) -> jauh lebih kecil daripada "hexadecimal" (_0x123abc)
            identifierNamesGenerator: "mangled",
            log: false,
            // Matikan stringArray agar ukuran file tidak membengkak
            stringArray: false,
            unicodeEscapeSequence: false,
            controlFlowFlattening: false,
            deadCodeInjection: false,
            selfDefending: false,
            disableConsoleOutput: true
          },
          OBFUSCATOR_EXCLUDES
        )
      );
    }
    // Bundle kecil & cepat: modul ESM di-concat (scope hoisting) dan chunk bersama dipecah wajar
    if (!dev && !isServer) {
      config.optimization.concatenateModules = true;
      config.optimization.usedExports = true;
      config.optimization.sideEffects = true;
    }
    return config;
  },

  // Halaman lama digabung: game → /games?g=…, kontak → tab di /profile (query asli, mis. ?id=, ikut diteruskan)
  async redirects() {
    return [
      { source: "/games/:slug(tictactoe|chess|blackjack|akinator|ludo|tebak-gambar)", destination: "/games?g=:slug", permanent: true },
      { source: "/status", destination: "/docs?tab=status", permanent: true },
      { source: "/stats", destination: "/docs?tab=stats", permanent: true },
      { source: "/comments", destination: "/community", permanent: true },
      { source: "/posts", destination: "/community?tab=posts", permanent: true },
      { source: "/contact", destination: "/profile?tab=kontak", permanent: true },
    ];
  },

  async headers() {
    return [{
      source: "/sw.js",
      headers: [{
        key: "Cache-Control",
        value: "no-cache, no-store, must-revalidate"
      }, {
        key: "Service-Worker-Allowed",
        value: "/"
      }]
    }, {
      // Respons API (JSON) tidak perlu diindeks mesin pencari; gambar preview /api/og dikecualikan
      source: "/api/:path((?!og$).*)",
      headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
    }, {
      // ikon & aset statis: cache panjang + revalidate di latar belakang
      source: "/:path(icons|assets)/:file*",
      headers: [{ key: "Cache-Control", value: "public, max-age=2592000, stale-while-revalidate=86400" }]
    }, {
      source: "/:file(favicon.ico|favicon.svg|og.jpg)",
      headers: [{ key: "Cache-Control", value: "public, max-age=604800, stale-while-revalidate=86400" }]
    }, {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" }
      ]
    }, {
      source: "/_next/static/:path*",
      headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }]
    }];
  }
};
module.exports = nextConfig;
