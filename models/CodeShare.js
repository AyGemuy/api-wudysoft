import mongoose from "mongoose";

const CodeSchema = new mongoose.Schema({
  author: { type: String, required: true, trim: true },
  fileName: { type: String, required: true, trim: true },
  code: { type: String, required: true },
  tag: { type: String, default: "Unknown", trim: true },
  likes: { type: Number, default: 0 },
  dislikes: { type: Number, default: 0 },
  views: { type: Number, default: 0 }
}, { timestamps: true });

CodeSchema.index({ createdAt: -1 });

export default mongoose.models.Code || mongoose.model("Code", CodeSchema);
