import mongoose from "mongoose";

const PasteSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, maxlength: 64 },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    content: { type: String, required: true, maxlength: 500000 },
    syntax: { type: String, default: "text", trim: true, maxlength: 24 },
    // Paste kedaluwarsa otomatis dihapus MongoDB (TTL). Nilai null = permanen.
    expiresAt: { type: Date, default: null, index: { expireAfterSeconds: 0 } },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

PasteSchema.index({ createdAt: -1 });

export default mongoose.models.Paste || mongoose.model("Paste", PasteSchema);
