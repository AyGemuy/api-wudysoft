/**
 * NEXUS OS // Central API Configuration (SERVER ONLY)
 * 100% HARDCODED — tidak ada process.env / .env / dotenv yang dibaca.
 * Ubah nilai langsung di file ini. JANGAN impor file ini dari kode klien (berisi rahasia).
 * File .cjs agar bisa dipakai bersama oleh server custom (src/index.js), logger, dan route Next.js.
 */
const site = require("./siteConfig.cjs");

const apiConfig = {
  // Credential Admin
  PASSWORD: "wudysoft",

  // Database MongoDB (semua data akun, profil, dan log live-stats disimpan di sini)
  MONGODB_URI:
    "mongodb+srv://Wudysoft:wudysoft@wudysoft.2hm26ic.mongodb.net/Api?retryWrites=true&w=majority&appName=Wudysoft",

  // Domain & URL publik
  DOMAIN_URL: site.DOMAIN_URL,
  DOMAIN_KOYEB: "wudysoft.koyeb.app",
  DOMAIN_VERCEL: "koyeb-api-ebon.vercel.app",
  EMAIL: "wudysoft@mail.com",
  PORT: site.PORT,

  // Rate Limiter
  LIMIT_POINTS: 30,
  LIMIT_DURATION: 60,

  // Rahasia JWT / NextAuth
  JWT_SECRET:
    "eyJhbGciOiJIUzI1NiJ9.eyJwYXNzd29yZCI6Ind1ZHlzb2Z0Iiwid2ViIjoid3VkeXNvZnQueHl6IiwiZW1haWwiOiJ3dWR5c29mdEBtYWlsLmNvbSJ9.D-KTApxg5_Ta36D7Mxv6sir4Zk6EHPMpFC4rMhIm82Y",

  // OAuth Google
  GOOGLE_CLIENT_ID: "944945631984-bo92nme2or2biuns93i8ai9j4g2gj34c.apps.googleusercontent.com",
  GOOGLE_CLIENT_SECRET: "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",

  // OAuth GitHub — ISI GITHUB_SECRET dengan Client Secret dari GitHub OAuth App.
  // (Nilai sebelumnya identik dengan secret Google sehingga login GitHub pasti ditolak;
  //  selama kosong, tombol GitHub otomatis disembunyikan.)
  GITHUB_ID: "Ov23litwcoA0MkgF5vLW",
  GITHUB_SECRET: "",

  // External Keys
  SONIVA_KEY: "",
  SUNOAPI_KEY: "",
};

module.exports = apiConfig;
