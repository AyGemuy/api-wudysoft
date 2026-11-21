import { withApiLog } from "@/lib/apiLogger.cjs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import connectMongo from "@/lib/mongoose";
import ApiKey from "@/models/ApiKey";
import mongoose from "mongoose";
import { checkRateLimit } from "@/src/lib/rateLimit";
import { generateKey, publicKey } from "@/lib/apiKey";

/**
 * Kelola kunci API pribadi (butuh sesi, bukan akun tamu).
 *  GET    /api/keys                       → daftar kunci milik akun (tanpa hash)
 *  POST   /api/keys {name, scopes?, expiresInDays?} → buat kunci; `key` (teks asli) hanya muncul SEKALI
 *  DELETE /api/keys?id=<id>               → cabut kunci
 */
export const config = { api: { bodyParser: { sizeLimit: "10kb" } } };
const MAX_ACTIVE = 10;

async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const session = await getServerSession(req, res, authOptions);
  const u = session?.user;
  if (!u) return res.status(401).json({ ok: false, message: "Belum login" });
  if (u.isGuest) return res.status(403).json({ ok: false, message: "Akun tamu tidak bisa membuat kunci API. Daftar akun terlebih dahulu." });

  try {
    await connectMongo();
    if (req.method === "GET") {
      const list = await ApiKey.find({ userId: u.id }).sort({ createdAt: -1 }).lean();
      return res.status(200).json({ ok: true, max: MAX_ACTIVE, keys: list.map(publicKey) });
    }

    if (req.method === "POST") {
      const r = checkRateLimit(`keys::${u.id}`, 10, 60_000);
      if (!r.ok) return res.status(429).json({ ok: false, message: `Terlalu cepat. Coba lagi dalam ${r.resetSec} detik.` });
      const b = req.body || {};
      const name = String(b.name || "").trim().slice(0, 40);
      if (!name) return res.status(400).json({ ok: false, message: "Nama kunci wajib diisi." });
      const active = await ApiKey.countDocuments({ userId: u.id, revokedAt: null });
      if (active >= MAX_ACTIVE) return res.status(400).json({ ok: false, message: `Maksimal ${MAX_ACTIVE} kunci aktif. Cabut salah satu dulu.` });
      const scopes = Array.isArray(b.scopes) && b.scopes.includes("write") ? ["read", "write"] : ["read"];
      const days = Number(b.expiresInDays);
      const expiresAt = days > 0 && days <= 365 ? new Date(Date.now() + days * 86400000) : null;
      const { raw, hash, prefix } = generateKey();
      const doc = await ApiKey.create({ userId: u.id, name, prefix, hash, scopes, expiresAt });
      return res.status(201).json({ ok: true, key: raw, item: publicKey(doc), notice: "Simpan kunci ini sekarang — tidak akan ditampilkan lagi." });
    }

    if (req.method === "DELETE") {
      const id = String(req.query.id || "");
      if (!mongoose.isValidObjectId(id)) return res.status(400).json({ ok: false, message: "ID tidak valid" });
      const d = await ApiKey.findOneAndUpdate({ _id: id, userId: u.id, revokedAt: null }, { $set: { revokedAt: new Date() } }, { new: true });
      if (!d) return res.status(404).json({ ok: false, message: "Kunci tidak ditemukan" });
      return res.status(200).json({ ok: true, item: publicKey(d) });
    }

    res.setHeader("Allow", "GET, POST, DELETE");
    return res.status(405).json({ ok: false, message: "Method not allowed" });
  } catch (e) {
    return res.status(500).json({ ok: false, message: "Kesalahan server" });
  }
}

export default withApiLog(handler);
