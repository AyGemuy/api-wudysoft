import crypto from "crypto";
import ApiKey from "@/models/ApiKey";
import connectMongo from "@/lib/mongoose";
import { checkRateLimit, clientIp } from "@/src/lib/rateLimit";

export const KEY_PREFIX = "wd_live_";
export const hashKey = (k) => crypto.createHash("sha256").update(String(k)).digest("hex");

/** Buat kunci baru: wd_live_ + 32 byte acak (base64url). */
export function generateKey() {
  const raw = KEY_PREFIX + crypto.randomBytes(32).toString("base64url");
  return { raw, hash: hashKey(raw), prefix: raw.slice(0, 12) };
}

/** Ambil kunci dari header `x-api-key` atau `Authorization: Bearer wd_live_...`. */
export function keyFromRequest(req) {
  const h = req.headers || {};
  const x = h["x-api-key"];
  if (x) return String(x).trim();
  const a = String(h.authorization || "");
  const m = a.match(/^Bearer\s+(wd_live_\S+)$/i);
  return m ? m[1] : "";
}

/**
 * Autentikasi lewat kunci API. Mengembalikan { ok, key } atau { ok:false, status, message }.
 * Sekaligus menerapkan rate limit per kunci (120 permintaan / menit) dan mencatat pemakaian.
 */
export async function authenticateKey(req, { need = "read" } = {}) {
  const raw = keyFromRequest(req);
  if (!raw) return { ok: false, status: 401, message: "Kunci API tidak ada. Kirim header x-api-key." };
  if (!raw.startsWith(KEY_PREFIX) || raw.length < 20) return { ok: false, status: 401, message: "Format kunci API tidak valid." };
  await connectMongo();
  const doc = await ApiKey.findOne({ hash: hashKey(raw) });
  if (!doc || doc.revokedAt || (doc.expiresAt && doc.expiresAt < new Date())) return { ok: false, status: 401, message: "Kunci API tidak valid, dicabut, atau kedaluwarsa." };
  if (!doc.scopes.includes(need) && !doc.scopes.includes("write")) return { ok: false, status: 403, message: `Kunci ini tidak punya izin "${need}".` };
  const r = checkRateLimit(`key::${doc.id}`, 120, 60_000);
  if (!r.ok) return { ok: false, status: 429, message: `Batas 120 permintaan/menit tercapai. Coba lagi dalam ${r.resetSec} detik.` };
  ApiKey.updateOne({ _id: doc._id }, { $set: { lastUsedAt: new Date(), lastIp: clientIp(req) }, $inc: { uses: 1 } }).catch(() => {});
  return { ok: true, key: doc };
}

export const publicKey = (d) => ({
  id: String(d._id), name: d.name, prefix: d.prefix, scopes: d.scopes, createdAt: d.createdAt, lastUsedAt: d.lastUsedAt,
  uses: d.uses, expiresAt: d.expiresAt, revoked: !!d.revokedAt,
});
