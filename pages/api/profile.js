import { withApiLog } from "@/lib/apiLogger.cjs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, clientIp } from "@/src/lib/rateLimit";
import { AuthError, findUserById, profileOf, updateProfile, changePassword } from "@/lib/users";

/**
 * Profil akun (butuh sesi NextAuth).
 *  GET   /api/profile                       → data terbaru dari database
 *  PATCH /api/profile {name?, bio?, image?, avatarData?, removeAvatar?}
 *  POST  /api/profile {action:"password", currentPassword?, newPassword}
 * Setelah PATCH/POST sukses, klien memanggil `useSession().update()` agar token sesi ikut tersegarkan.
 */
export const config = { api: { bodyParser: { sizeLimit: "200kb" } } };

const STATUS = { NOT_FOUND: 404, INVALID_CREDENTIALS: 403 };

async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ ok: false, message: "Belum login" });
  const u = session.user;

  if (u.isGuest) {
    if (req.method === "GET") {
      return res.status(200).json({
        ok: true,
        profile: { id: u.id, name: u.name, email: null, image: null, role: "guest", provider: "guest", isGuest: true, providers: [], bio: "" },
      });
    }
    return res.status(403).json({ ok: false, message: "Akun tamu tidak bisa mengubah profil. Daftar akun untuk menyimpan data." });
  }

  try {
    if (req.method === "GET") {
      const doc = await findUserById(u.id);
      if (!doc) return res.status(404).json({ ok: false, message: "Akun tidak ditemukan di database" });
      return res.status(200).json({ ok: true, profile: { ...profileOf(doc), isGuest: false } });
    }

    if (req.method === "PATCH" || req.method === "POST") {
      const r = checkRateLimit(`profile::${u.id}`, 20, 60_000);
      if (!r.ok) return res.status(429).json({ ok: false, message: `Terlalu banyak perubahan. Coba lagi dalam ${r.resetSec} detik.` });
      const b = req.body || {};

      if (req.method === "POST") {
        if (b.action !== "password") return res.status(400).json({ ok: false, message: 'action harus "password"' });
        const profile = await changePassword(u.id, { current: b.currentPassword, next: b.newPassword });
        return res.status(200).json({ ok: true, message: "Password diperbarui", profile: { ...profile, isGuest: false } });
      }

      const profile = await updateProfile(u.id, {
        name: b.name,
        bio: b.bio,
        image: b.image,
        avatarData: b.avatarData,
        removeAvatar: b.removeAvatar === true,
      });
      return res.status(200).json({ ok: true, message: "Profil diperbarui", profile: { ...profile, isGuest: false } });
    }

    res.setHeader("Allow", ["GET", "PATCH", "POST"]);
    return res.status(405).json({ ok: false, message: `Method ${req.method} not allowed` });
  } catch (err) {
    if (err instanceof AuthError) return res.status(STATUS[err.code] || 400).json({ ok: false, message: err.message, code: err.code });
    console.error("[PROFILE]", err);
    return res.status(500).json({ ok: false, message: "Gagal memproses profil. Coba lagi." });
  }
}

export default withApiLog(handler);
