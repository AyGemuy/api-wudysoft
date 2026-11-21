import { withApiLog } from "@/lib/apiLogger.cjs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

/**
 * GET /api/whoami → siapa pemanggilnya?
 * Terbuka tanpa API key (proyek open source). Jika ada sesi browser, data akun dikembalikan;
 * jika tidak, pemanggil dianggap anonim.
 */
async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "authorization, content-type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "GET") { res.setHeader("Allow", "GET, OPTIONS"); return res.status(405).json({ ok: false, message: "Method not allowed" }); }

  const session = await getServerSession(req, res, authOptions).catch(() => null);
  if (session?.user) return res.status(200).json({ ok: true, via: "session", user: { id: session.user.id, name: session.user.name, role: session.user.role, isGuest: !!session.user.isGuest } });
  return res.status(200).json({ ok: true, via: "anonymous", user: null });
}

export default withApiLog(handler);
