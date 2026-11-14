require("dotenv").config();

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,

  // 1. Kompresi HTTP response bawaan Next.js (Gzip)
  compress: true,

  // 2. Matikan source map di production agar ukuran build jauh lebih kecil
  productionBrowserSourceMaps: false,

  // 3. Memperkecil ukuran deployment (hanya menyertakan node_modules yang terpakai)
  // Catatan: jika pakai ini, jalankan production dengan `node .next/standalone/server.js`
  // Hapus baris ini jika Anda tetap ingin menjalankan via `next start` biasa.
  output: "standalone",

  // 4. Hapus console.log secara native lewat SWC (lebih ringan daripada plugin obfuscator)
  compiler: {
    removeConsole: process.env.NODE_ENV === "production" ? { exclude: ["error"] } : false,
  },

  images: {
    domains: [
      "avatars.githubusercontent.com",
      "lh3.googleusercontent.com",
      "images.unsplash.com",
    ],
    // Format gambar modern yang jauh lebih terkompresi
    formats: ["image/avif", "image/webp"],
  },

  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
          {
            key: "Service-Worker-Allowed",
            value: "/",
          },
        ],
      },
    ];
  },

  webpack: (config, { dev, isServer }) => {
    config.externals = config.externals || [];
    config.externals.push({
      "utf-8-validate": "commonjs utf-8-validate",
      bufferutil: "commonjs bufferutil",
    });

    if (!dev && !isServer) {
      // OPSI A (Paling Kompres): Cukup andalkan minifier bawaan Next.js (SWC/Terser).
      // Jika Anda tetap ingin menggunakan WebpackObfuscator, gunakan setting paling ringkas berikut:
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
            disableConsoleOutput: true,
          },
          ["node_modules/**"]
        )
      );

      // OPSI B (Tambahan): Pre-compress aset statis ke .gz & .br (jika pakai Nginx/CDN atau custom server)
      // Install dulu: npm i -D compression-webpack-plugin
      /*
      const CompressionPlugin = require("compression-webpack-plugin");
      config.plugins.push(
        new CompressionPlugin({
          algorithm: "gzip",
          test: /\.(js|css|html|svg)$/,
          threshold: 10240,
          minRatio: 0.8,
        })
      );
      */
    }

    return config;
  },
};

module.exports = nextConfig;