import mongoose from "mongoose";

const ApiLogSchema = new mongoose.Schema(
  {
    path: {
      type: String,
      required: true,
      index: true,
    },
    method: {
      type: String,
      required: true,
      default: "GET",
    },
    statusCode: {
      type: Number,
      required: true,
      index: true,
    },
    latencyMs: {
      type: Number,
      required: true,
    },
    isSuccess: {
      type: Boolean,
      required: true,
      index: true,
    },
    ip: {
      type: String,
      default: "127.0.0.1",
    },
    timestamp: {
      type: Date,
      default: Date.now,
      index: { expires: "7d" }, // Auto-delete log setelah 7 hari
    },
  },
  {
    timestamps: false,
  }
);

export default mongoose.models.ApiLog || mongoose.model("ApiLog", ApiLogSchema);