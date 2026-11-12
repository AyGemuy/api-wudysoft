import dbConnect from "@/lib/mongoose";
import Room from "@/models/Room";
import mongoose from "mongoose";

export default async function handler(req, res) {
  try {
    await dbConnect();
  } catch (err) {
    return res.status(500).json({ success: false, message: "Koneksi database gagal", error: err.message });
  }

  // ==========================================
  // GET: Ambil Pesan Spesifik Room atau Daftar Semua Room
  // ==========================================
  if (req.method === "GET") {
    const { roomName } = req.query;
    if (roomName) {
      try {
        const room = await Room.findOne({ roomName: String(roomName).trim() });
        if (!room) {
          return res.status(404).json({ success: false, message: "Room not found" });
        }
        const activeMessages = room.messages.filter((msg) => !msg.isDeleted);
        return res.status(200).json({ success: true, data: activeMessages });
      } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching room messages" });
      }
    } else {
      try {
        const rooms = await Room.find({}, "roomName isGroup createdAt updatedAt").sort({ updatedAt: -1 });
        return res.status(200).json({ success: true, data: rooms || [] });
      } catch (error) {
        return res.status(500).json({ success: false, message: "Error fetching rooms" });
      }
    }
  }

  // ==========================================
  // POST: Chat Actions (Send, Edit, Delete, Reaction, Group Manage)
  // ==========================================
  if (req.method === "POST") {
    const {
      roomName,
      name,
      message,
      messageId,
      action,
      userId,
      avatar,
      replyToMessageId,
      emoji,
    } = req.body || {};

    // 1. Send Message
    if (action === "sendMessage" || action === "replyMessage") {
      if (!roomName || !name || !message || !userId) {
        return res.status(400).json({
          success: false,
          message: "Room name, name, user ID, and message are required",
        });
      }
      try {
        const timestamp = Date.now();
        const newMessage = {
          name,
          message,
          timestamp,
          avatar: avatar || "",
          userId,
          replyTo: replyToMessageId ? new mongoose.Types.ObjectId(replyToMessageId) : null,
          likes: [],
          dislikes: [],
          reactions: [],
          isDeleted: false,
          edited: null,
        };

        const updatedRoom = await Room.findOneAndUpdate(
          { roomName },
          {
            $push: { messages: newMessage },
            $setOnInsert: { isGroup: true },
          },
          { new: true, upsert: true, runValidators: true }
        );

        return res.status(201).json({ success: true, data: updatedRoom });
      } catch (error) {
        return res.status(500).json({ success: false, message: "Error saving message" });
      }
    }

    // 2. Edit Message
    if (action === "editMessage") {
      if (!roomName || !messageId || !message) {
        return res.status(400).json({ success: false, message: "Parameter tidak lengkap" });
      }
      try {
        const updatedRoom = await Room.findOneAndUpdate(
          { roomName, "messages._id": new mongoose.Types.ObjectId(messageId) },
          {
            $set: {
              "messages.$.message": message,
              "messages.$.edited": Date.now(),
            },
          },
          { new: true }
        );
        if (!updatedRoom) return res.status(404).json({ success: false, message: "Pesan tidak ditemukan" });
        return res.status(200).json({ success: true, data: updatedRoom });
      } catch (error) {
        return res.status(500).json({ success: false, message: "Error editing message" });
      }
    }

    // 3. Delete Message
    if (action === "deleteMessage") {
      if (!roomName || !messageId) {
        return res.status(400).json({ success: false, message: "Parameter tidak lengkap" });
      }
      try {
        const updatedRoom = await Room.findOneAndUpdate(
          { roomName, "messages._id": new mongoose.Types.ObjectId(messageId) },
          {
            $set: {
              "messages.$.isDeleted": true,
              "messages.$.message": "[Pesan ini telah dihapus]",
            },
          },
          { new: true }
        );
        if (!updatedRoom) return res.status(404).json({ success: false, message: "Pesan tidak ditemukan" });
        return res.status(200).json({ success: true, data: updatedRoom });
      } catch (error) {
        return res.status(500).json({ success: false, message: "Error deleting message" });
      }
    }

    // 4. Like / Dislike
    if (action === "toggleLike" || action === "toggleDislike") {
      if (!roomName || !messageId || !userId) {
        return res.status(400).json({ success: false, message: "Parameter tidak lengkap" });
      }
      try {
        const room = await Room.findOne({ roomName });
        if (!room) return res.status(404).json({ success: false, message: "Room not found" });

        const messageToUpdate = room.messages.id(messageId);
        if (!messageToUpdate) return res.status(404).json({ success: false, message: "Message not found" });

        const field = action === "toggleLike" ? "likes" : "dislikes";
        const oppositeField = action === "toggleLike" ? "dislikes" : "likes";

        if (messageToUpdate[field].includes(userId)) {
          messageToUpdate[field] = messageToUpdate[field].filter((id) => id.toString() !== userId.toString());
        } else {
          messageToUpdate[field].push(userId);
          messageToUpdate[oppositeField] = messageToUpdate[oppositeField].filter((id) => id.toString() !== userId.toString());
        }

        await room.save();
        return res.status(200).json({ success: true, data: room });
      } catch (error) {
        return res.status(500).json({ success: false, message: "Error toggling like/dislike" });
      }
    }

    // 5. Create Group
    if (action === "createGroup") {
      if (!roomName) return res.status(400).json({ success: false, message: "Nama grup diperlukan." });
      try {
        const cleanName = String(roomName).trim().toLowerCase();
        const existing = await Room.findOne({ roomName: cleanName });
        if (existing) {
          return res.status(409).json({ success: false, message: "Grup dengan nama ini sudah ada." });
        }
        const newRoom = await Room.create({
          roomName: cleanName,
          isGroup: true,
          messages: [],
        });
        return res.status(201).json({ success: true, message: "Grup berhasil dibuat!", data: newRoom });
      } catch (error) {
        return res.status(500).json({ success: false, message: "Gagal membuat grup baru." });
      }
    }

    // 6. Delete Group
    if (action === "deleteGroup") {
      if (!roomName) return res.status(400).json({ success: false, message: "Nama grup diperlukan." });
      try {
        const deletedRoom = await Room.findOneAndDelete({ roomName });
        if (!deletedRoom) return res.status(404).json({ success: false, message: "Grup tidak ditemukan." });
        return res.status(200).json({ success: true, message: "Grup berhasil dihapus!" });
      } catch (error) {
        return res.status(500).json({ success: false, message: "Gagal menghapus grup." });
      }
    }

    return res.status(405).json({ success: false, message: "Action not allowed" });
  }

  return res.status(405).json({ success: false, message: "Method Not Allowed" });
}