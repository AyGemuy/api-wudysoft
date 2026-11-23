/**
 * Deteksi platform deploy OTOMATIS — tidak ada pengaturan target yang perlu diisi.
 * Hanya membaca variabel yang DISEDIAKAN platform saat build (bukan file .env).
 *
 *  - Platform serverless/managed (Netlify, Vercel, Cloudflare Pages, AWS Amplify, Firebase, Azure SWA):
 *    runtime mereka membangun fungsinya sendiri → output "standalone" DIMATIKAN agar tidak bentrok.
 *  - Selain itu (VPS, Docker, Render, Railway, Fly.io, Koyeb, lokal, dsb.): "standalone" AKTIF
 *    sehingga hasil build kecil dan bisa dijalankan dengan `node .next/standalone/server.js`.
 */
const e = process.env;

const MANAGED = [
  ["netlify", () => e.NETLIFY || e.NETLIFY_LOCAL],
  ["vercel", () => e.VERCEL || e.NOW_BUILDER],
  ["cloudflare", () => e.CF_PAGES || e.CLOUDFLARE_PAGES],
  ["amplify", () => e.AWS_APP_ID || e.AWS_AMPLIFY],
  ["firebase", () => e.FIREBASE_CONFIG || e.FUNCTION_TARGET],
  ["azure-swa", () => e.SWA_CLI_PORT || e.AZURE_STATIC_WEB_APPS_API_TOKEN],
];

function detectPlatform() {
  for (const [name, test] of MANAGED) if (test()) return { name, managed: true };
  if (e.RENDER) return { name: "render", managed: false };
  if (e.RAILWAY_ENVIRONMENT || e.RAILWAY_PROJECT_ID) return { name: "railway", managed: false };
  if (e.FLY_APP_NAME) return { name: "fly", managed: false };
  if (e.KOYEB_APP_NAME) return { name: "koyeb", managed: false };
  if (e.DYNO) return { name: "heroku", managed: false };
  if (e.KUBERNETES_SERVICE_HOST) return { name: "kubernetes", managed: false };
  return { name: "node", managed: false };
}

const platform = detectPlatform();
module.exports = { platform, useStandalone: !platform.managed };
