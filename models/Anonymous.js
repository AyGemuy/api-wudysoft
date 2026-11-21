import mongoose from "mongoose";

const { Schema } = mongoose;

const SESSION_TTL_SECONDS = 60 * 60; // 1 jam

/**
 * Peserta chat anonim (matchmaking via Socket.IO, lihat pages/api/socket.js).
 * Dokumen dibuat saat socket terhubung dan dihapus otomatis 1 jam setelah dibuat.
 */
const AnonymousSchema = new Schema(
  {
    socketId: { type: String, required: true, unique: true, trim: true },
    // Nickname datang dari klien: dipotong (bukan ditolak) agar handler socket tidak melempar error.
    nickname: {
      type: String,
      default: "Anonymous",
      trim: true,
      set: (v) => String(v ?? "").replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, 32) || "Anonymous",
    },
    online: { type: Boolean, default: false },
    playing: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

// TTL sesi
AnonymousSchema.index({ createdAt: 1 }, { expireAfterSeconds: SESSION_TTL_SECONDS });
// Pencarian pasangan: findOne({ online: true, playing: false, socketId: { $ne } })
AnonymousSchema.index({ online: 1, playing: 1 });

export default mongoose.models.Anonymous || mongoose.model("Anonymous", AnonymousSchema);
