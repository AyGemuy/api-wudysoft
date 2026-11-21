import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Penghitung kunjungan per situs (pages/api/tools/hit/*).
 * Nama field snake_case dipertahankan karena langsung muncul di respons API.
 */
const CountHitSchema = new Schema(
  {
    site_name: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
    hit: { type: Number, default: 0, min: 0 },
    created_at: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

export default mongoose.models.CountHit || mongoose.model("CountHit", CountHitSchema);
