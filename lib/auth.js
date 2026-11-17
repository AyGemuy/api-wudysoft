import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import GithubProvider from "next-auth/providers/github";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
import { checkRateLimit } from "@/src/lib/rateLimit";
import {
  AuthError,
  verifyUser,
  registerUser,
  upsertOAuthUser,
  issueApiToken,
  cleanName,
  findUserById,
} from "@/lib/users";

// Tanpa .env: NextAuth biasanya butuh NEXTAUTH_URL. Dengan AUTH_TRUST_HOST, NextAuth memakai host
// request yang sebenarnya (Netlify / VPS / localhost) sehingga callback OAuth & nama cookie
// (secure atau tidak) selalu cocok di server, middleware, dan getServerSession.
if (typeof process !== "undefined" && process.env) process.env.AUTH_TRUST_HOST = "true";

const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 hari

const ipOf = (req) =>
  String(req?.headers?.["x-forwarded-for"] || req?.headers?.["x-real-ip"] || "")
    .split(",")[0]
    .trim() || "127.0.0.1";

/** Batasi percobaan per IP supaya endpoint callback tidak bisa di-brute force. */
function throttle(scope, req, limit, windowMs = 60_000) {
  const r = checkRateLimit(`auth::${scope}::${ipOf(req)}`, limit, windowMs);
  if (!r.ok) throw new AuthError(`Terlalu banyak percobaan. Coba lagi dalam ${r.resetSec} detik.`, "RATE_LIMITED");
}

/** Error aplikasi → pesan jelas; error tak terduga → pesan generik (detail hanya di log). */
function toClientError(err, fallback) {
  if (err instanceof AuthError) return new Error(err.message);
  console.error("[AUTH]", err);
  return new Error(fallback);
}

const hasOAuth = (id, secret) => Boolean(id && secret);

const SYNC_EVERY_MS = 5 * 60 * 1000;

/** Cookie JWT dibatasi ±4 KB: hanya simpan URL gambar pendek (bukan data URL). */
const safePicture = (v) => (typeof v === "string" && v.length > 0 && v.length <= 300 && !v.startsWith("data:") ? v : null);

/** Cari/buat akun di DB untuk login OAuth lalu salin hasilnya ke objek `user` (dipakai callback jwt). */
async function syncOAuthUser(user, account, profile) {
  if (user.__synced) return;
  const verified = account.provider === "google" ? profile?.email_verified === true : Boolean(user.email);
  const db = await upsertOAuthUser({
    provider: account.provider,
    providerId: account.providerAccountId,
    email: user.email,
    name: user.name,
    image: user.image,
    emailVerified: verified,
  });
  user.id = db.id;
  user.name = db.name;
  user.email = db.email;
  user.image = db.image;
  user.role = db.role;
  user.apiToken = issueApiToken(db.id);
  user.__synced = true;
}

export const authOptions = {
  providers: [
    // ---- Masuk dengan email & password ----
    CredentialsProvider({
      id: "credentials",
      name: "Email & Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        try {
          throttle("login", req, 10);
          const ip = ipOf(req);
          const user = await verifyUser({ email: credentials?.email, password: credentials?.password, ip });
          return { ...user, apiToken: issueApiToken(user.id), isGuest: false };
        } catch (err) {
          throw toClientError(err, "Gagal masuk. Coba lagi.");
        }
      },
    }),

    // ---- Daftar akun baru (sekaligus langsung masuk) ----
    CredentialsProvider({
      id: "signup",
      name: "Daftar",
      credentials: {
        name: { label: "Nama", type: "text" },
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, req) {
        try {
          throttle("signup", req, 5, 10 * 60_000);
          const user = await registerUser({
            name: credentials?.name,
            email: credentials?.email,
            password: credentials?.password,
            ip: ipOf(req),
          });
          return { ...user, apiToken: issueApiToken(user.id), isGuest: false };
        } catch (err) {
          throw toClientError(err, "Gagal membuat akun. Coba lagi.");
        }
      },
    }),

    // ---- Tamu: tanpa database, sesi sementara ----
    CredentialsProvider({
      id: "guest",
      name: "Tamu",
      credentials: { name: { label: "Nama", type: "text" } },
      async authorize(credentials, req) {
        try {
          throttle("guest", req, 15);
        } catch (err) {
          throw toClientError(err, "Terlalu banyak percobaan.");
        }
        const id = `guest_${crypto.randomUUID()}`;
        const suffix = crypto.randomBytes(2).toString("hex").toUpperCase();
        return {
          id,
          name: cleanName(credentials?.name, `Operative-${suffix}`),
          email: null,
          isGuest: true,
        };
      },
    }),

    // ---- OAuth (hanya yang kredensialnya tersedia) ----
    ...(hasOAuth(apiConfig.GOOGLE_CLIENT_ID, apiConfig.GOOGLE_CLIENT_SECRET)
      ? [GoogleProvider({ clientId: apiConfig.GOOGLE_CLIENT_ID, clientSecret: apiConfig.GOOGLE_CLIENT_SECRET })]
      : []),
    ...(hasOAuth(apiConfig.GITHUB_ID, apiConfig.GITHUB_SECRET)
      ? [GithubProvider({ clientId: apiConfig.GITHUB_ID, clientSecret: apiConfig.GITHUB_SECRET })]
      : []),
  ],

  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE },
  jwt: { maxAge: SESSION_MAX_AGE },

  callbacks: {
    // Selalu kembalikan URL ABSOLUT di origin yang sama: klien NextAuth memanggil `new URL(data.url)`,
    // jadi path relatif ("/") membuat signIn() melempar error walau login sebenarnya berhasil.
    async redirect({ url, baseUrl }) {
      try {
        const base = new URL(baseUrl);
        const target = new URL(url, base);
        if (target.origin === base.origin) return target.href;
      } catch {}
      return baseUrl;
    },

    // OAuth: samakan dengan database SEBELUM sesi dibuat (konflik email → kembali ke /auth dengan pesan).
    async signIn({ user, account, profile }) {
      if (account?.type === "oauth") {
        try {
          await syncOAuthUser(user, account, profile);
        } catch (err) {
          if (err instanceof AuthError && err.code === "OAUTH_EMAIL_CONFLICT") return "/auth?error=OAuthAccountNotLinked";
          if (err instanceof AuthError) return `/auth?error=${encodeURIComponent(err.message)}`;
          // database tidak tersedia: tetap boleh masuk dengan identitas dari provider
          console.error("[AUTH] sinkron OAuth gagal:", err?.message);
          user.id = `${account.provider}:${account.providerAccountId}`;
          user.role = "user";
        }
      }
      return true;
    },

    async jwt({ token, user, account, trigger }) {
      // `user` hanya ada saat proses masuk (pertama kali token dibuat)
      if (user) {
        token.isNewSignIn = true;
        token.isGuest = Boolean(user.isGuest);
        token.id = user.id;
        token.email = user.email ?? null;
        token.name = user.name;
        token.picture = safePicture(user.image);
        token.role = user.role || (user.isGuest ? "guest" : "user");
        token.provider = user.isGuest ? "guest" : account?.provider === "signup" ? "credentials" : account?.provider || "credentials";
        token.apiToken = user.apiToken || (user.isGuest ? undefined : issueApiToken(user.id));
        token.syncedAt = Date.now();
        return token;
      }

      token.isNewSignIn = false; // hanya true pada sesi pertama setelah masuk

      // Segarkan profil dari DB: saat `useSession().update()` dipanggil, dan berkala (mis. role/nama berubah)
      const stale = !token.syncedAt || Date.now() - token.syncedAt > SYNC_EVERY_MS;
      if (!token.isGuest && token.id && (trigger === "update" || stale)) {
        try {
          const doc = await findUserById(token.id);
          if (doc) {
            token.name = doc.name || token.name;
            token.email = doc.email ?? token.email;
            token.picture = safePicture(doc.image);
            token.role = doc.role || "user";
          } else if (/^[a-f0-9]{24}$/i.test(String(token.id))) {
            token.revoked = true; // akun sudah dihapus
          }
          token.syncedAt = Date.now();
        } catch {
          /* DB sedang tidak tersedia: pakai data token saat ini */
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (token?.revoked) return { ...session, user: undefined, expires: new Date(0).toISOString() };
      if (token && session.user) {
        session.user.id = token.id;
        session.user.email = token.email ?? null;
        session.user.name = token.name;
        session.user.image = token.picture || null;
        session.user.role = token.role || "user";
        session.user.isGuest = Boolean(token.isGuest);
        session.user.isNewSignIn = Boolean(token.isNewSignIn);
        session.user.apiToken = token.apiToken;
        session.user.provider = token.provider || (token.isGuest ? "guest" : "credentials");
      }
      return session;
    },
  },

  pages: {
    signIn: "/auth",
    signOut: "/auth",
    error: "/auth",
  },

  secret: apiConfig.JWT_SECRET,
  // useSecureCookies sengaja TIDAK di-set: NextAuth menentukannya dari protokol request (lihat AUTH_TRUST_HOST),
  // sehingga cookie sama persis dibaca oleh NextAuth, getServerSession, dan middleware.
  debug: false,
};
