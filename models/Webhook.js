import mongoose from "mongoose";

/** Endpoint penampung webhook sementara. Request masuk disimpan (maks 50 terbaru) lalu kedaluwarsa otomatis. */
const ReqSchema = new mongoose.Schema(
  {
    at: { type: Date, default: Date.now },
    method: String,
    query: { type: mongoose.Schema.Types.Mixed, default: {} },
    headers: { type: mongoose.Schema.Types.Mixed, default: {} },
    body: { type: String, default: "" },
    size: { type: Number, default: 0 },
    ip: { type: String, default: "" },
  },
  { _id: false }
);

const WebhookSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true, index: true },
    ownerId: { type: String, required: true, index: true },
    name: { type: String, default: "Webhook", maxlength: 40 },
    // Balasan yang dikirim ke pemanggil
    status: { type: Number, default: 200 },
    responseBody: { type: String, default: '{"ok":true}', maxlength: 2000 },
    total: { type: Number, default: 0 },
    requests: { type: [ReqSchema], default: [] },
    createdAt: { type: Date, default: Date.now },
    expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
  },
  { versionKey: false }
);

export default mongoose.models.Webhook || mongoose.model("Webhook", WebhookSchema);
