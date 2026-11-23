import mongoose from "mongoose";

/**
 * Lampiran chat (gambar/video/audio/berkas) yang disimpan PERMANEN di MongoDB.
 * Host sementara (Tmpfiles, Uguu, Litterbox) menghapus file setelah beberapa jam, sehingga media
 * di room grup ikut hilang. Dengan model ini file hidup selama grup/pesannya ada dan disajikan
 * lewat GET /api/media/<id> (tanpa kedaluwarsa, tidak bergantung pada hosting mana pun).
 */
const MediaFileSchema = new mongoose.Schema(
  {
    data: { type: Buffer, required: true, select: false },
    mime: { type: String, default: "application/octet-stream" },
    name: { type: String, default: "" },
    size: { type: Number, default: 0 },
    owner: { type: String, default: "", index: true },
    room: { type: String, default: "", index: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

export default mongoose.models.MediaFile || mongoose.model("MediaFile", MediaFileSchema);
