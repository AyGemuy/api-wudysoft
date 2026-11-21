import mongoose from "mongoose";

/** Kunci API pribadi. Hanya hash SHA-256 yang disimpan; teks asli ditampilkan satu kali saat dibuat. */
const ApiKeySchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    prefix: { type: String, required: true }, // 12 karakter pertama, untuk dikenali di daftar
    hash: { type: String, required: true, unique: true, index: true },
    scopes: { type: [String], default: ["read"] }, // read | write
    createdAt: { type: Date, default: Date.now },
    lastUsedAt: { type: Date, default: null },
    lastIp: { type: String, default: "" },
    uses: { type: Number, default: 0 },
    // null = tanpa kedaluwarsa. Dokumen kedaluwarsa dihapus otomatis oleh MongoDB (TTL).
    expiresAt: { type: Date, default: null, index: { expireAfterSeconds: 0 } },
    revokedAt: { type: Date, default: null },
  },
  { versionKey: false }
);

export default mongoose.models.ApiKey || mongoose.model("ApiKey", ApiKeySchema);
