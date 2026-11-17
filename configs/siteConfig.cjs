/**
 * Wudysoft // Konfigurasi PUBLIK (aman diimpor dari kode klien).
 * Tidak ada rahasia di sini — rahasia ada di configs/apiConfig.cjs (khusus server).
 * Semua nilai ditulis langsung; proyek ini TIDAK membaca .env sama sekali.
 */
const DOMAIN_URL = "api-wudysoft.netlify.app";

module.exports = {
  APP_NAME: "Wudysoft",
  APP_TAGLINE: "Cyber Dashboard Platform",
  DOMAIN_URL,
  SITE_URL: `https://${DOMAIN_URL}`,
  // "netlify" = serverless (tanpa output standalone) · "vps" = server Node biasa (output standalone aktif)
  DEPLOY_TARGET: "netlify",
  // Obfuscate JS klien saat build production
  OBFUSCATE_CLIENT: true,
  PORT: 3000,
};
