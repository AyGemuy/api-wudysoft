import { withApiLog } from "@/lib/apiLogger.cjs";
import mongoose from "mongoose";
import connectMongo from "@/lib/mongoose";
import User from "@/models/User";

/** Menyajikan foto profil unggahan dari MongoDB: GET /api/avatar/<userId>?v=<versi> */
async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).end();
  const { id } = req.query;
  if (!mongoose.isValidObjectId(id)) return res.status(404).end();
  try {
    await connectMongo();
    const doc = await User.findById(id).select("+avatarData").lean();
    const m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(doc?.avatarData || "");
    if (!m) return res.status(404).end();
    const buf = Buffer.from(m[2], "base64");
    res.setHeader("Content-Type", m[1]);
    res.setHeader("Content-Length", buf.length);
    res.setHeader("X-Content-Type-Options", "nosniff");
    // URL membawa ?v=<versi> sehingga aman di-cache lama
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).end(buf);
  } catch {
    return res.status(503).end();
  }
}

export default withApiLog(handler);
