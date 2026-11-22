import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      auto: true,
    },
    name: {
      type: String,
      required: true,
    },
    avatar: {
      type: String,
      default: "",
    },
    // @username gaya WhatsApp (diturunkan dari nama + id pengguna)
    username: {
      type: String,
      default: "",
    },
    // boleh kosong bila pesan hanya berisi media
    message: {
      type: String,
      default: "",
    },
    // lampiran yang sudah terunggah ke URL publik
    media: {
      type: [
        {
          _id: false,
          url: { type: String, required: true },
          type: { type: String, enum: ["image", "video", "audio", "file"], default: "file" },
          name: { type: String, default: "" },
          size: { type: Number, default: 0 },
          mime: { type: String, default: "" },
        },
      ],
      default: [],
    },
    // cuplikan pesan yang dibalas (tetap tampil walau pesan aslinya dihapus)
    replyPreview: {
      type: new mongoose.Schema(
        {
          _id: false,
          name: { type: String, default: "" },
          username: { type: String, default: "" },
          userId: { type: String, default: "" },
          text: { type: String, default: "" },
          mediaType: { type: String, default: "" },
          mediaUrl: { type: String, default: "" },
        },
        { _id: false }
      ),
      default: null,
    },
    userId: {
      type: String,
      default: "",
    },
    timestamp: {
      type: Number,
      required: true,
    },
    edited: {
      type: Number,
      default: null,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    likes: {
      type: [String],
      default: [],
    },
    dislikes: {
      type: [String],
      default: [],
    },
    reactions: [
      {
        emoji: String,
        userId: String,
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
  },
  {
    timestamps: false,
  }
);

const RoomSchema = new mongoose.Schema(
  {
    roomName: {
      type: String,
      required: true,
      unique: true,
    },
    messages: [MessageSchema],
    isGroup: {
      type: Boolean,
      default: true,
    },
    // opsional: pembuat & foto grup (grup lama tanpa field ini tetap valid)
    createdBy: {
      type: String,
      default: "",
    },
    avatar: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// Daftar room diurutkan lewat updatedAt / createdAt (lihat pages/api/rooms.js).
RoomSchema.index({ updatedAt: -1 });
RoomSchema.index({ createdAt: -1 });

export default mongoose.models.Room || mongoose.model("Room", RoomSchema);