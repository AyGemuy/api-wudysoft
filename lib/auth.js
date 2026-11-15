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
} from "@/lib/users";

const siteUrl = apiConfig.DOMAIN_URL.startsWith("http")
  ? apiConfig.DOMAIN_URL.replace(/\/$/, "")
  : `https://${apiConfig.DOMAIN_URL.replace(/\/$/, "")}`;

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
    // Selalu kembalikan path relatif: aman walau NEXTAUTH_URL salah (mis. masih localhost).
    async redirect({ url, baseUrl }) {
      try {
        if (url.startsWith("/") && !url.startsWith("//")) return url;
        const u = new URL(url);
        if (u.origin === new URL(baseUrl).origin) return `${u.pathname}${u.search}${u.hash}` || "/";
      } catch {}
      return "/";
    },

    async jwt({ token, user, account, profile }) {
      // `user` hanya ada saat proses masuk (pertama kali token dibuat)
      if (user) {
        token.isNewSignIn = true;
        token.isGuest = Boolean(user.isGuest);
        token.id = user.id;
        token.email = user.email ?? null;
        token.name = user.name;
        token.picture = user.image || null;
        token.role = user.role || (user.isGuest ? "guest" : "user");
        token.provider = user.isGuest ? "guest" : account?.provider === "signup" ? "credentials" : account?.provider || "credentials";
        if (user.apiToken) token.apiToken = user.apiToken;

        if (account?.type === "oauth") {
          try {
            const verified =
              account.provider === "google" ? profile?.email_verified === true : Boolean(user.email);
            const db = await upsertOAuthUser({
              provider: account.provider,
              providerId: account.providerAccountId,
              email: user.email,
              name: user.name,
              image: user.image,
              emailVerified: verified,
            });
            token.id = db.id;
            token.name = db.name;
            token.email = db.email;
            token.picture = db.image;
            token.role = db.role;
            token.apiToken = issueApiToken(db.id);
          } catch (err) {
            if (err instanceof AuthError) throw err;
            // database tidak tersedia: tetap boleh masuk dengan identitas dari provider
            console.error("[AUTH] upsert OAuth gagal:", err?.message);
            token.id = `${account.provider}:${account.providerAccountId}`;
          }
        }
      } else if (token.isNewSignIn) {
        token.isNewSignIn = false; // hanya true pada sesi pertama setelah masuk
      }
      return token;
    },

    async session({ session, token }) {
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
  useSecureCookies: process.env.NODE_ENV === "production" || siteUrl.startsWith("https"),
  debug: false,
};
