/**
 * Wudysoft // Konfigurasi PUBLIK (aman diimpor dari kode klien).
 * Tidak ada rahasia di sini — rahasia ada di configs/apiConfig.cjs (khusus server).
 * Semua nilai ditulis langsung; proyek ini TIDAK membaca .env sama sekali.
 */
const DOMAIN_URL = "api-wudysoft.netlify.app";

module.exports = {
  APP_NAME: "Wudysoft",
  APP_TAGLINE: "API, Tools & Developer Platform",
  DOMAIN_URL,
  SITE_URL: `https://${DOMAIN_URL}`,
  // "netlify" = serverless (tanpa output standalone) · "vps" = server Node biasa (output standalone aktif)
  DEPLOY_TARGET: "netlify",
  // Obfuscate JS klien saat build production
  OBFUSCATE_CLIENT: true,
  PORT: 3000,
  // Pengembang / pemilik repo yang ditampilkan di halaman profil
  GITHUB_USER: "AyGemuy",
  // BGM bawaan (link YouTube video/playlist), otomatis menyala setelah interaksi pertama.
  // Kosongkan "" bila tidak ingin ada musik bawaan.
  // Pengunjung bisa menggantinya lewat tombol Audio; pilihannya tersimpan di browser.
  DEFAULT_BGM_URL: "https://youtu.be/sVTBz2FFbp8?si=ktD5TgC4-UtzNZ1Y",
};
