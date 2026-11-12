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
