import { withApiLog } from "@/lib/apiLogger.cjs";
import crypto from "crypto";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectMongo from "@/lib/mongoose";
import Webhook from "@/models/Webhook";
import { checkRateLimit } from "@/src/lib/rateLimit";

/**
 * Kelola endpoint webhook penampung (butuh sesi).
 *  GET    /api/hooks              → daftar milik akun
 *  GET    /api/hooks?slug=…       → detail + request masuk (untuk polling)
 *  POST   /api/hooks {name?, status?, responseBody?, ttlHours?}  → buat
 *  PATCH  /api/hooks {slug, clear?:true, status?, responseBody?, name?}
 *  DELETE /api/hooks?slug=…
 * Penerima publik ada di /api/hook/<slug>.
 */
export const config = { api: { bodyParser: { sizeLimit: "20kb" } } };
const MAX_HOOKS = 10;
const isSlug = (s) => /^[a-z0-9]{8,24}$/.test(String(s || ""));
const brief = (d) => ({ slug: d.slug, name: d.name, status: d.status, responseBody: d.responseBody, total: d.total, createdAt: d.createdAt, expiresAt: d.expiresAt, count: d.requests?.length || 0 });

async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const session = await getServerSession(req, res, authOptions);
  const u = session?.user;
  if (!u) return res.status(401).json({ ok: false, message: "Belum login" });
  try {
    await connectMongo();
    const owner = { ownerId: u.id };

    if (req.method === "GET") {
      if (req.query.slug) {
        const d = await Webhook.findOne({ slug: String(req.query.slug), ...owner }).lean();
        if (!d) return res.status(404).json({ ok: false, message: "Webhook tidak ditemukan" });
        return res.status(200).json({ ok: true, hook: brief(d), requests: [...d.requests].reverse() });
      }
      const list = await Webhook.find(owner).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ ok: true, max: MAX_HOOKS, hooks: list.map(brief) });
    }

    if (req.method === "POST") {
      const r = checkRateLimit(`hooks::${u.id}`, 10, 60_000);
      if (!r.ok) return res.status(429).json({ ok: false, message: `Terlalu cepat. Coba lagi dalam ${r.resetSec} detik.` });
      if ((await Webhook.countDocuments(owner)) >= MAX_HOOKS) return res.status(400).json({ ok: false, message: `Maksimal ${MAX_HOOKS} webhook. Hapus salah satu dulu.` });
      const b = req.body || {};
      const ttl = Math.min(168, Math.max(1, Number(b.ttlHours) || 24));
      const status = [200, 201, 202, 204, 400, 401, 403, 404, 429, 500, 503].includes(Number(b.status)) ? Number(b.status) : 200;
      const d = await Webhook.create({
        slug: crypto.randomBytes(9).toString("hex").slice(0, 14), ...owner,
        name: String(b.name || "Webhook").trim().slice(0, 40) || "Webhook", status,
        responseBody: String(b.responseBody ?? '{"ok":true}').slice(0, 2000),
        expiresAt: new Date(Date.now() + ttl * 3600_000),
      });
      return res.status(201).json({ ok: true, hook: brief(d) });
    }

    if (req.method === "PATCH") {
      const b = req.body || {};
      if (!isSlug(b.slug)) return res.status(400).json({ ok: false, message: "Slug tidak valid" });
      const set = {};
      if (b.name !== undefined) set.name = String(b.name).trim().slice(0, 40) || "Webhook";
      if ([200, 201, 202, 204, 400, 401, 403, 404, 429, 500, 503].includes(Number(b.status))) set.status = Number(b.status);
      if (b.responseBody !== undefined) set.responseBody = String(b.responseBody).slice(0, 2000);
      if (b.clear) { set.requests = []; set.total = 0; }
      const d = await Webhook.findOneAndUpdate({ slug: b.slug, ...owner }, { $set: set }, { new: true }).lean();
      if (!d) return res.status(404).json({ ok: false, message: "Webhook tidak ditemukan" });
      return res.status(200).json({ ok: true, hook: brief(d) });
    }

    if (req.method === "DELETE") {
      if (!isSlug(req.query.slug)) return res.status(400).json({ ok: false, message: "Slug tidak valid" });
      const r = await Webhook.deleteOne({ slug: String(req.query.slug), ...owner });
      return res.status(r.deletedCount ? 200 : 404).json({ ok: !!r.deletedCount });
    }

    res.setHeader("Allow", "GET, POST, PATCH, DELETE");
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Kesalahan server" });
  }
}

export default withApiLog(handler);
