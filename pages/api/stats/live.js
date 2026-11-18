import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { sysInfo } from "@/lib/sysInfo";
import { liveSnapshot } from "@/lib/liveData";

/**
 * Polling untuk hosting tanpa WebSocket (mis. Netlify).
 *   GET /api/stats/live            → snapshot terbaru
 *   GET /api/stats/live?after=<ts> → event dengan ts >= after (klien membuang duplikat berdasarkan id)
 * Data dibaca dari MongoDB (+ event yang belum tersimpan di memori), jadi konsisten walau
 * request ditangani instance serverless yang berbeda-beda.
 */
async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ ok: false, error: "Belum login" });
  res.setHeader("Cache-Control", "no-store");

  const after = Math.max(0, Number(req.query.after) || 0);
  const snap = await liveSnapshot({ after });
  return res.status(200).json({
    ok: true,
    transport: "poll",
    source: snap.source,
    events: snap.events,
    counters: snap.counters,
    sys: sysInfo(),
    serverTime: Date.now(),
  });
}

export default withApiLog(withRateLimit(handler));
