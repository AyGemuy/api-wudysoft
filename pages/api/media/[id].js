import mongoose from "mongoose";
import dbConnect from "@/lib/mongoose";
import MediaFile from "@/models/MediaFile";
import { isInlineSafe } from "@/src/lib/mediaStore";

/** GET /api/media/<id> — menyajikan lampiran chat dari MongoDB (cache selamanya; id tidak pernah dipakai ulang). */
export default async function handler(req, res) {
  if (req.method !== "GET" && req.method !== "HEAD") return res.status(405).end();
  const { id } = req.query;
  if (!mongoose.isValidObjectId(id)) return res.status(404).end();
  try {
    await dbConnect();
    const doc = await MediaFile.findById(id).select("+data").lean();
    if (!doc?.data) return res.status(404).end();
    const buf = Buffer.from(doc.data.buffer || doc.data);
    const inline = isInlineSafe(doc.mime);
    const safeName = encodeURIComponent(doc.name || "berkas");
    res.setHeader("Content-Type", inline ? doc.mime : "application/octet-stream");
    res.setHeader("Content-Length", buf.length);
    res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename*=UTF-8''${safeName}`);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
    res.setHeader("Accept-Ranges", "none");
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.status(200).end(req.method === "HEAD" ? undefined : buf);
  } catch {
    return res.status(503).end();
  }
}
