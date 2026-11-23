import mongoose from "mongoose";
import { getServerSession } from "next-auth/next";
import * as fileType from "file-type";
import dbConnect from "@/lib/mongoose";
import { authOptions } from "@/lib/auth";
import MediaFile from "@/models/MediaFile";
import { kindFromMime } from "@/src/lib/mediaStore";

const fileTypeFromBuffer = fileType.fileTypeFromBuffer || fileType.fromBuffer || fileType.default?.fileTypeFromBuffer || fileType.default?.fromBuffer;

// Body mentah (biner) dibaca manual agar tidak ada batas bodyParser & tidak ada base64.
export const config = { api: { bodyParser: false } };

// 4 MB: respons biner di hosting serverless dikodekan base64 (+33%) dan dibatasi ±6 MB.
const MAX_BYTES = 4 * 1024 * 1024;

function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let n = 0;
    req.on("data", (c) => {
      n += c.length;
      if (n > limit) { reject(Object.assign(new Error("too_large"), { code: "too_large" })); req.destroy(); return; }
      chunks.push(c);
    });
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

/**
 * POST /api/media?name=foto.jpg&room=nama-grup   (body = isi file mentah, wajib login)
 * → { success, data: { url: "/api/media/<id>", id, type, name, size, mime } }
 */
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ success: false, message: "Method Not Allowed" });
  const session = await getServerSession(req, res, authOptions).catch(() => null);
  if (!session?.user?.id) return res.status(401).json({ success: false, message: "Masuk dulu untuk mengunggah media." });
  if (Number(req.headers["content-length"] || 0) > MAX_BYTES) {
    return res.status(413).json({ success: false, message: "Ukuran file maksimal 4 MB." });
  }
  let buf;
  try {
    buf = await readBody(req, MAX_BYTES);
  } catch (e) {
    if (e.code === "too_large") return res.status(413).json({ success: false, message: "Ukuran file maksimal 4 MB." });
    return res.status(400).json({ success: false, message: "Gagal membaca file." });
  }
  if (!buf.length) return res.status(400).json({ success: false, message: "File kosong." });

  const name = String(req.query.name || "berkas").replace(/[\r\n"\\/]/g, "_").slice(0, 120);
  let mime = "application/octet-stream";
  try {
    const ft = fileTypeFromBuffer ? await fileTypeFromBuffer(buf) : null;
    if (ft?.mime) mime = ft.mime;
    else if (/\.(txt|md|json|csv|log)$/i.test(name)) mime = "text/plain";
  } catch {}

  try {
    await dbConnect();
    const doc = await MediaFile.create({
      data: buf,
      mime,
      name,
      size: buf.length,
      owner: String(session.user.id),
      room: String(req.query.room || "").slice(0, 80),
    });
    return res.status(201).json({
      success: true,
      data: { id: String(doc._id), url: `/api/media/${doc._id}`, type: kindFromMime(mime, name), name, size: buf.length, mime },
    });
  } catch (e) {
    return res.status(500).json({ success: false, message: "Gagal menyimpan media." });
  }
}
