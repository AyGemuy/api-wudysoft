import {
  NextResponse
} from "next/server";
import {
  checkRateLimit,
  clientIp
} from "./src/lib/rateLimit";
export function middleware(req) {
  const {
    pathname
  } = req.nextUrl;
  const ip = clientIp(req);
  if (pathname.startsWith("/api") && !pathname.startsWith("/api/auth")) {
    const routeKey = `mw::${pathname}::${ip}`;
    const r = checkRateLimit(routeKey);
    if (!r.ok) {
      return new NextResponse(JSON.stringify({
        ok: false,
        error: "Terlalu banyak permintaan (Rate limit exceeded). Coba lagi nanti.",
        limit: r.limit,
        retryAfter: r.resetSec
      }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(r.resetSec),
          "X-RateLimit-Limit": String(r.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(r.resetSec)
        }
      });
    }
  }
  const sessionToken = req.cookies.get("__Secure-next-auth.session-token") || req.cookies.get("next-auth.session-token") || req.cookies.get("sid");
  if (pathname.startsWith("/playground") && !sessionToken) {
    const url = req.nextUrl.clone();
    url.pathname = "/auth";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }
  if (pathname === "/auth" && sessionToken) {
    const nextDestination = req.nextUrl.searchParams.get("next") || "/playground";
    const url = req.nextUrl.clone();
    url.pathname = nextDestination;
    url.search = "";
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set("X-Frame-Options", "SAMEORIGIN");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  return res;
}
export const config = {
  matcher: ["/((?!_next/static|_next/image|icons|favicon.ico|sw.js|manifest.json|og.png).*)"]
};