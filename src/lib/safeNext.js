/**
 * Sanitasi parameter ?next= agar hanya path internal yang valid.
 * - Menolak URL eksternal (//evil.com, https://..., backslash, karakter kontrol)
 * - Menolak /auth* dan /api/* supaya tidak terjadi redirect loop
 * Aman dipakai di Edge (middleware) maupun di client.
 */
export function safeNext(raw, fallback = "/") {
  const v = Array.isArray(raw) ? raw[0] : raw;
  if (typeof v !== "string") return fallback;
  const s = v.trim();
  if (!s || !s.startsWith("/") || s.startsWith("//")) return fallback;
  if (s.includes("\\") || /[\x00-\x1f]/.test(s)) return fallback;
  try {
    const u = new URL(s, "http://localhost");
    if (u.origin !== "http://localhost") return fallback;
    if (u.pathname === "/auth" || u.pathname.startsWith("/auth/")) return fallback;
    if (u.pathname.startsWith("/api/")) return fallback;
    return u.pathname + u.search + u.hash;
  } catch {
    return fallback;
  }
}

export default safeNext;
