import { withApiLog } from "@/lib/apiLogger.cjs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { authenticateKey, keyFromRequest, publicKey } from "@/lib/apiKey";
import { findUserById } from "@/lib/users";

/**
 * GET /api/whoami → siapa pemanggilnya?
 * Autentikasi lewat header `x-api-key: wd_live_…` (atau `Authorization: Bearer wd_live_…`) ATAU sesi browser.
 * Dipakai untuk menguji kunci API dan sebagai contoh endpoint berotentikasi kunci.
 */
async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "x-api-key, authorization, content-type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") { res.setHeader("Allow", "GET, OPTIONS"); return res.status(405).json({ ok: false, message: "Method not allowed" }); }

  if (keyFromRequest(req)) {
    const r = await authenticateKey(req, { need: "read" }).catch(() => ({ ok: false, status: 500, message: "Kesalahan server" }));
    if (!r.ok) return res.status(r.status).json({ ok: false, message: r.message });
    const owner = await findUserById(r.key.userId).catch(() => null);
    return res.status(200).json({ ok: true, via: "api-key", key: publicKey(r.key), user: owner ? { id: String(owner._id), name: owner.name, role: owner.role } : { id: r.key.userId } });
  }
  const session = await getServerSession(req, res, authOptions);
  if (session?.user) return res.status(200).json({ ok: true, via: "session", user: { id: session.user.id, name: session.user.name, role: session.user.role, isGuest: !!session.user.isGuest } });
  return res.status(401).json({ ok: false, message: "Tidak terautentikasi. Kirim header x-api-key atau login." });
}

export default withApiLog(handler);
