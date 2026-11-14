import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import apiConfig from "@/configs/apiConfig";
import { checkRateLimit, clientIp } from "./src/lib/rateLimit";
import { safeNext } from "./src/lib/safeNext";

/** Halaman yang wajib login. Tambahkan path lain di sini bila perlu. */
const PROTECTED = ["/playground"];
const DEFAULT_AFTER_LOGIN = "/";

const siteUrl = String(apiConfig.DOMAIN_URL || "").startsWith("http")
  ? apiConfig.DOMAIN_URL
  : `https://${apiConfig.DOMAIN_URL}`;
// Harus sama dengan `useSecureCookies` di lib/auth.js
const preferSecure = process.env.NODE_ENV === "production" || siteUrl.startsWith("https");

const isProtected = (p) => PROTECTED.some((b) => p === b || p.startsWith(`${b}/`));
const isAuthRoot = (p) => p === "/auth" || p === "/auth/";

/**
 * Verifikasi JWT NextAuth yang sebenarnya (bukan sekadar cek keberadaan cookie).
 * getToken otomatis merakit cookie yang terpecah (session-token.0, .1, ...).
 * Cookie kedaluwarsa / secret berubah / rusak => dianggap belum login,
 * sehingga tidak ada lagi loop /auth <-> /playground.
 */
async function readSession(req) {
  for (const secureCookie of [preferSecure, !preferSecure]) {
    try {
      const token = await getToken({ req, secret: apiConfig.JWT_SECRET, secureCookie });
      if (token) return token;
    } catch {
      /* coba mode cookie berikutnya */
    }
  }
  return null;
}

function withSecurityHeaders(res) {
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}

export async function middleware(req) {
  const { pathname, search } = req.nextUrl;

  // 1. Rate limit API (kecuali /api/auth yang dikelola NextAuth)
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth")) {
    const r = checkRateLimit(`mw::${pathname}::${clientIp(req)}`);
    if (!r.ok) {
      return new NextResponse(
        JSON.stringify({
          ok: false,
          error: "Terlalu banyak permintaan (Rate limit exceeded). Coba lagi nanti.",
          limit: r.limit,
          retryAfter: r.resetSec,
        }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(r.resetSec),
            "X-RateLimit-Limit": String(r.limit),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(r.resetSec),
          },
        }
      );
    }
  }

  // 2. Guard halaman terproteksi & halaman /auth
  if (isProtected(pathname) || isAuthRoot(pathname)) {
    const session = await readSession(req);

    if (isProtected(pathname) && !session) {
      const url = req.nextUrl.clone();
      url.pathname = "/auth";
      url.search = "";
      url.searchParams.set("next", safeNext(`${pathname}${search}`, DEFAULT_AFTER_LOGIN));
      return withSecurityHeaders(NextResponse.redirect(url));
    }

    if (isAuthRoot(pathname) && session) {
      const dest = safeNext(req.nextUrl.searchParams.get("next"), DEFAULT_AFTER_LOGIN);
      return withSecurityHeaders(NextResponse.redirect(new URL(dest, req.url)));
    }
  }

  return withSecurityHeaders(NextResponse.next());
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|assets/|icons/|favicon.ico|sw.js|manifest.json|og.png|workbox-).*)",
  ],
};
