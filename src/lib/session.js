import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
const secret = () => apiConfig.JWT_SECRET || "nexus-default-super-secret-key-32chars!";
const b64 = s => Buffer.from(s).toString("base64url");
const mac = s => crypto.createHmac("sha256", secret()).update(s).digest("base64url");
export function sign(data, maxAgeSec = 60 * 60 * 24 * 7) {
  const payload = {
    ...data,
    iat: Date.now(),
    exp: Date.now() + maxAgeSec * 1e3
  };
  const body = b64(JSON.stringify(payload));
  return `${body}.${mac(body)}`;
}
export function verify(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  const expectedSig = mac(body);
  const bufSig = Buffer.from(sig);
  const bufExpected = Buffer.from(expectedSig);
  if (bufSig.length !== bufExpected.length || !crypto.timingSafeEqual(bufSig, bufExpected)) {
    return null;
  }
  try {
    const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
    if (!data.exp || data.exp < Date.now()) return null;
    return data;
  } catch {
    return null;
  }
}
export function parseCookies(req) {
  const cookieHeader = req?.headers?.cookie || req?.headers?.get?.("cookie") || "";
  const out = {};
  cookieHeader.split(";").forEach(p => {
    const i = p.indexOf("=");
    if (i > 0) {
      out[p.slice(0, i).trim()] = decodeURIComponent(p.slice(i + 1).trim());
    }
  });
  return out;
}
export function cookie(name, value, maxAge = 60 * 60 * 24 * 7) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`;
}
export const getSession = req => verify(parseCookies(req).sid);
export function startSession(res, user, maxAgeSec = 60 * 60 * 24 * 7) {
  const token = sign(user, maxAgeSec);
  const prev = res.getHeader("Set-Cookie");
  const cookieList = prev ? Array.isArray(prev) ? prev : [prev] : [];
  res.setHeader("Set-Cookie", [...cookieList, cookie("sid", token, maxAgeSec)]);
}
export function endSession(res) {
  const prev = res.getHeader("Set-Cookie");
  const cookieList = prev ? Array.isArray(prev) ? prev : [prev] : [];
  res.setHeader("Set-Cookie", [...cookieList, cookie("sid", "", 0)]);
}