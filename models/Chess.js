import mongoose from "mongoose";
const ChessSchema = new mongoose.Schema({
  boardConfiguration: {
    type: Object,
    required: true
  },
  turn: {
    type: String,
    enum: ["white", "black"],
    required: true
  },
  isFinished: {
    type: Boolean,
    default: false
  },
  winner: {
    type: String,
    enum: ["white", "black", "draw", null],
    default: null
  }
}, {
  timestamps: true
});
// Sesi game berlaku 1 hari: dihapus otomatis MongoDB 24 jam setelah update terakhir.
ChessSchema.index({
  updatedAt: 1
}, {
  expireAfterSeconds: 24 * 60 * 60
});
export default mongoose.models.Chess || mongoose.model("Chess", ChessSchema);