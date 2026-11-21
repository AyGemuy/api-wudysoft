import mongoose from "mongoose";

const { Schema } = mongoose;

/**
 * Penyimpanan JSON bebas per `customId` (pages/api/tools/db.js).
 * `data` bertipe Mixed: bentuknya ditentukan pemanggil.
 */
const DataUserSchema = new Schema(
  {
    customId: { type: String, required: true, unique: true, trim: true, maxlength: 120 },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

export default mongoose.models.DataUser || mongoose.model("DataUser", DataUserSchema);
