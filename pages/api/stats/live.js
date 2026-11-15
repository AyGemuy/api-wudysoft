import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { sysInfo } from "@/lib/sysInfo";
import logger from "@/lib/apiLogger.cjs";
import dbConnect from "@/lib/mongoose";
import ApiLog from "@/models/ApiLog";

/** Fallback polling untuk hosting tanpa WebSocket (mis. Netlify): GET ?since=<seq> */
export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ ok: false, error: "Belum login" });
  res.setHeader("Cache-Control", "no-store");

  const since = Number(req.query.since) || 0;
  let events = since ? logger.since(since) : logger.snapshot(100);
  let source = "memory";

  // Instance serverless baru → memori kosong; ambil riwayat dari MongoDB
  if (!since && events.length === 0) {
    try {
      await Promise.race([dbConnect(), new Promise((_, r) => setTimeout(() => r(new Error("timeout")), 2500))]);
      const rows = await ApiLog.find().sort({ timestamp: -1 }).limit(100).lean();
      events = rows.map((l, i) => ({
        id: String(l._id), seq: 0, ts: new Date(l.timestamp).getTime(), method: l.method, path: l.path,
        query: l.query ? JSON.parse(l.query) : {}, status: l.statusCode, ms: l.latencyMs, ip: l.ip, ua: l.ua || "",
        req: { bytes: l.reqBytes || 0, contentType: "", headers: {}, body: l.reqBody || "" },
        res: { bytes: l.resBytes || 0, contentType: l.contentType || "", headers: {}, body: l.resBody || "" },
      }));
      source = "db";
    } catch {}
  }

  const c = logger.counters();
  return res.status(200).json({ ok: true, transport: "poll", source, events, lastSeq: c.lastSeq, counters: c, sys: sysInfo(), serverTime: Date.now() });
}
