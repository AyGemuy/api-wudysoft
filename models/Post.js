import mongoose from "mongoose";

const { Schema } = mongoose;

const DEFAULT_AVATAR = "https://placehold.co/40x40/cccccc/000000?text=NA";

/**
 * Postingan sederhana (pages/api/posts.js): judul, isi, penulis, dan avatar opsional.
 */
const PostSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    content: { type: String, required: true, maxlength: 20000 },
    author: { type: String, required: true, trim: true, maxlength: 64 },
    authorAvatar: { type: String, default: DEFAULT_AVATAR, trim: true, maxlength: 500 },
  },
  { timestamps: true }
);

// Daftar: terbaru dulu
PostSchema.index({ createdAt: -1 });

export default mongoose.models.Post || mongoose.model("Post", PostSchema);
