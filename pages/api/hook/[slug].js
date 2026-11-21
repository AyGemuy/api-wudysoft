import { withApiLog } from "@/lib/apiLogger.cjs";
import connectMongo from "@/lib/mongoose";
import Webhook from "@/models/Webhook";
import { checkRateLimit, clientIp } from "@/src/lib/rateLimit";

/**
 * Penerima webhook PUBLIK: terima method apa pun di /api/hook/<slug>, simpan (maks 50 terbaru),
 * lalu balas sesuai pengaturan pemilik. Header sensitif (cookie, authorization) disamarkan.
 */
export const config = { api: { bodyParser: { sizeLimit: "100kb" } } };
const HIDE = /^(cookie|authorization|x-api-key|proxy-authorization|x-nf-|x-forwarded-for|x-real-ip)/i;

async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  if (req.method === "OPTIONS") return res.status(204).end();

  const slug = String(req.query.slug || "");
  if (!/^[a-z0-9]{8,24}$/.test(slug)) return res.status(404).json({ ok: false, message: "Webhook tidak ditemukan" });
  const ip = clientIp(req);
  const r = checkRateLimit(`hook::${slug}::${ip}`, 60, 60_000);
  if (!r.ok) return res.status(429).json({ ok: false, message: "Terlalu banyak permintaan" });

  try {
    await connectMongo();
    const headers = {};
    for (const [k, v] of Object.entries(req.headers)) headers[k] = HIDE.test(k) ? "[disamarkan]" : String(v).slice(0, 300);
    let body = req.body;
    if (body === undefined || body === null || body === "") body = "";
    else if (typeof body !== "string") body = JSON.stringify(body, null, 2);
    const { slug: _s, ...query } = req.query;
    const entry = { at: new Date(), method: req.method, query, headers, body: String(body).slice(0, 20000), size: Buffer.byteLength(String(body)), ip };
    const d = await Webhook.findOneAndUpdate(
      { slug, expiresAt: { $gt: new Date() } },
      { $push: { requests: { $each: [entry], $slice: -50 } }, $inc: { total: 1 } },
      { new: false, projection: { status: 1, responseBody: 1 } }
    ).lean();
    if (!d) return res.status(404).json({ ok: false, message: "Webhook tidak ditemukan atau sudah kedaluwarsa" });
    if (d.status === 204) return res.status(204).end();
    res.status(d.status);
    try { return res.json(JSON.parse(d.responseBody)); } catch { res.setHeader("Content-Type", "text/plain; charset=utf-8"); return res.send(d.responseBody); }
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Kesalahan server" });
  }
}

export default withApiLog(handler);
