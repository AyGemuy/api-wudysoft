import mongoose from "mongoose";
import {
  v4 as uuidv4
} from "uuid";
const cardSchema = new mongoose.Schema({
  code: String,
  image: String,
  images: {
    svg: String,
    png: String
  },
  value: String,
  suit: String
}, {
  _id: false
});
const DeckSchema = new mongoose.Schema({
  _id: {
    type: String,
    default: uuidv4,
    required: true
  },
  deckApiId: {
    type: String,
    required: true
  },
  playerHand: [cardSchema],
  dealerHand: [cardSchema],
  playerScore: {
    type: Number,
    default: 0
  },
  dealerScore: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ["active", "player_bust", "dealer_bust", "player_win", "dealer_win", "push", "cleared"],
    default: "active"
  },
  message: {
    type: String,
    default: "New game created. Player's turn to 'hit' or 'stand'."
  },
  winner: {
    type: String,
    default: null
  }
}, {
  timestamps: true,
  _id: false
});
// Sesi game berlaku 1 hari: dihapus otomatis MongoDB 24 jam setelah update terakhir.
DeckSchema.index({
  updatedAt: 1
}, {
  expireAfterSeconds: 24 * 60 * 60
});
export default mongoose.models.Deck || mongoose.model("Deck", DeckSchema);