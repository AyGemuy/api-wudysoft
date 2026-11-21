import mongoose from "mongoose";

const { Schema } = mongoose;

const TTL_SECONDS = 12 * 60 * 60; // 12 jam

/**
 * Pemetaan ID pendek (task-xxxxxx-nnnnnn) → nilai asli (lib/encoder.js).
 * Dihapus otomatis 12 jam setelah dibuat.
 */
const UUIDMappingSchema = new Schema(
  {
    uuid: { type: String, required: true, unique: true, trim: true },
    value: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

UUIDMappingSchema.index({ createdAt: 1 }, { expireAfterSeconds: TTL_SECONDS });

export default mongoose.models.UUIDMapping || mongoose.model("UUIDMapping", UUIDMappingSchema);
