import mongoose from "mongoose";

const CodeShareSchema = new mongoose.Schema(
  {
    author: { type: String, required: true, trim: true, maxlength: 40 },
    fileName: { type: String, required: true, trim: true, maxlength: 120, index: true },
    code: { type: String, required: true, maxlength: 200000 },
    tag: { type: String, default: "Unknown", trim: true, maxlength: 24, index: true },
    likes: { type: Number, default: 0 },
    dislikes: { type: Number, default: 0 },
    views: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Kolom sort yang diizinkan di pages/api/code-share.js (fileName & tag sudah berindeks).
CodeShareSchema.index({ createdAt: -1 });
CodeShareSchema.index({ likes: -1 });
CodeShareSchema.index({ views: -1 });

export default mongoose.models.CodeShare || mongoose.model("CodeShare", CodeShareSchema);
