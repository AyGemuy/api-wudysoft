/**
 * NEXUS OS // Central API Configuration
 * HARDCODED STATIC CONFIG - 100% Bebas Ketergantungan .env Netlify
 */
const env = typeof process !== 'undefined' && process.env ? process.env : {};

const apiConfig = {
  // Credential Admin
  PASSWORD: env.MY_PASSWORD || "wudysoft",
  
  // Database MongoDB
  MONGODB_URI:
    env.MY_MONGODB_URI ||
    "mongodb+srv://Wudysoft:wudysoft@wudysoft.2hm26ic.mongodb.net/Api?retryWrites=true&w=majority&appName=Wudysoft",

  // Domain & URL Publik (Wajib HTTPS Netlify)
  DOMAIN_URL:
    env.MY_DOMAIN_URL ||
    env.NEXT_PUBLIC_APP_URL ||
    "api-wudysoft.netlify.app",

  DOMAIN_KOYEB: env.MY_DOMAIN_KOYEB || "wudysoft.koyeb.app",
  DOMAIN_VERCEL: env.MY_DOMAIN_VERCEL || "koyeb-api-ebon.vercel.app",
  EMAIL: env.MY_EMAIL || "wudysoft@mail.com",

  // Rate Limiter
  LIMIT_POINTS: Number(env.MY_LIMIT_POINTS || env.RATE_LIMIT_MAX) || 30,
  LIMIT_DURATION:
    Number(env.MY_LIMIT_DURATION || (Number(env.RATE_LIMIT_WINDOW_MS || 60000) / 1000)) || 60,

  // JWT & Session Secret
  JWT_SECRET:
    env.SESSION_SECRET ||
    env.MY_NEXTAUTH_SECRET ||
    env.NEXTAUTH_SECRET ||
    "eyJhbGciOiJIUzI1NiJ9.eyJwYXNzd29yZCI6Ind1ZHlzb2Z0Iiwid2ViIjoid3VkeXNvZnQueHl6IiwiZW1haWwiOiJ3dWR5c29mdEBtYWlsLmNvbSJ9.D-KTApxg5_Ta36D7Mxv6sir4Zk6EHPMpFC4rMhIm82Y",

  // OAuth Google
  GOOGLE_CLIENT_ID:
    env.MY_GOOGLE_CLIENT_ID ||
    env.GOOGLE_CLIENT_ID ||
    "944945631984-bo92nme2or2biuns93i8ai9j4g2gj34c.apps.googleusercontent.com",

  GOOGLE_CLIENT_SECRET:
    env.MY_GOOGLE_CLIENT_SECRET ||
    env.GOOGLE_CLIENT_SECRET ||
    "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",

  // OAuth GitHub
  GITHUB_ID:
    env.MY_GITHUB_ID ||
    env.GITHUB_ID ||
    env.GITHUB_CLIENT_ID ||
    "Ov23litwcoA0MkgF5vLW",

  GITHUB_SECRET:
    env.MY_GITHUB_SECRET ||
    env.GITHUB_SECRET ||
    env.GITHUB_CLIENT_SECRET ||
    "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",

  // External Keys
  SONIVA_KEY: env.MY_SONIVA_KEY || "",
  SUNOAPI_KEY: env.MY_SUNOAPI_KEY || "",
};

export default apiConfig;