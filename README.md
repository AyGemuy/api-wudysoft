# Glass Next

Starter Next.js bergaya glassmorphism: auth (OAuth + guest), playground, middleware anti-limit, PWA, OG tag lengkap.

## Install & jalankan
```bash
cp .env.example .env     # isi SESSION_SECRET & OAuth (opsional)
npm install
npm run build
npm run start            # production
# npm run dev            # development
```
Port otomatis: jika `PORT` dipakai, server pindah ke port kosong berikutnya dan menampilkan URL-nya.

## Struktur
```
src/index.js              server + auto port + log live
src/lib/                  session, rateLimit, oauth
middleware.js             rate limit /api, proteksi /playground, security header
pages/api/auth/*          guest, me, logout
pages/api/oauth/*         redirect + callback (github, google)
pages/api/playground/*    echo
pages/auth/*              hub, oauth, guest
pages/playground.js
components/               Seo, Background, Navbar, ThemePanel, Layout
public/                   manifest.json, sw.js, icons, og.png
```
## OAuth callback URL
`{URL}/api/oauth/callback/github` dan `{URL}/api/oauth/callback/google`

## Catatan
Rate limit memakai memori proses (cocok untuk 1 instance). Untuk banyak instance, ganti dengan Redis.

## Deploy ke Netlify

- Jika muncul `The function exceeds the maximum size of 250 MB`, jalankan `npm run build && npm run size`.
  Skrip menampilkan paket yang paling besar di fungsi serverless. `next.config.js` sudah mengecualikan
  alat build (SWC, esbuild, typescript, eslint, sharp, dst.) lewat `experimental.outputFileTracingExcludes`.
- Set environment variable `NEXTAUTH_URL` (mis. `https://situs-anda.netlify.app`) dan `SESSION_SECRET`.
- Spesifikasi OpenAPI dibuat otomatis oleh `scripts/openapi-gen.mjs` (jalan sebelum `dev` dan `build`).

## Realtime log API & stats

- Semua request `/api/*` dicatat oleh `lib/apiLogger.cjs` (method, path, query, status, durasi, ukuran, pratinjau body request/respons — data sensitif seperti password/token/cookie disamarkan).
- Halaman `/stats` menerima stream lewat **Socket.IO** (`/api/live` → `/api/live-socket`) dan otomatis turun ke **polling** (`/api/stats/live`) di hosting tanpa WebSocket seperti Netlify. Stream hanya untuk pengguna yang login.
- Dengan server custom (`npm start`) semua route direkam otomatis; tanpa server custom, route yang dibungkus `withApiLog` yang terekam.

## Build

- `OBFUSCATE=0 npm run build` mematikan webpack-obfuscator (obfuscator menambah ±11% ukuran JS klien; gunakan hanya bila perlu).
- `npm run start:standalone` menyalin aset statis lalu menjalankan `.next/standalone/server.js` (mode `output: "standalone"` dimatikan otomatis di Netlify).
