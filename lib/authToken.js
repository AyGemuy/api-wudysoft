import { getToken } from "next-auth/jwt";
import apiConfig from "@/configs/apiConfig";

const siteUrl = String(apiConfig.DOMAIN_URL || "").startsWith("http") ? apiConfig.DOMAIN_URL : `https://${apiConfig.DOMAIN_URL}`;
const preferSecure = process.env.NODE_ENV === "production" || siteUrl.startsWith("https");

function parseCookies(header = "") {
  const out = {};
  String(header).split(/;\s*/).forEach((p) => {
    const i = p.indexOf("=");
    if (i > 0) out[p.slice(0, i)] = decodeURIComponent(p.slice(i + 1));
  });
  return out;
}

/** Verifikasi JWT NextAuth dari header mentah (dipakai handshake Socket.IO). */
export async function tokenFromHeaders(headers) {
  const req = { headers, cookies: parseCookies(headers?.cookie) };
  for (const secureCookie of [preferSecure, !preferSecure]) {
    try {
      const t = await getToken({ req, secret: apiConfig.JWT_SECRET, secureCookie });
      if (t) return t;
    } catch {}
  }
  return null;
}
