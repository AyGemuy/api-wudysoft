import mongoose from "mongoose";

const { Schema } = mongoose;

/* ---------------- field bersama ---------------- */
const authorField = { type: String, required: true, trim: true, maxlength: 64 };
const messageField = { type: String, required: true, trim: true, maxlength: 2000 };

/**
 * Balasan (sub-dokumen). `timestamp` = epoch ms, dipertahankan karena dipakai klien.
 */
const ReplySchema = new Schema(
  {
    name: authorField,
    message: messageField,
    timestamp: { type: Number, required: true, default: Date.now },
  },
  { _id: false }
);

/**
 * Komentar tingkat atas beserta balasannya (pages/api/comments.js).
 * `createdAt`/`updatedAt` dikelola Mongoose; `timestamp` tetap ada untuk kompatibilitas respons API.
 */
const CommentSchema = new Schema(
  {
    name: authorField,
    message: messageField,
    timestamp: { type: Number, required: true, default: Date.now },
    replies: { type: [ReplySchema], default: [] },
  },
  { timestamps: true }
);

// Daftar komentar: terbaru dulu
CommentSchema.index({ createdAt: -1 });

export default mongoose.models.Comment || mongoose.model("Comment", CommentSchema);
