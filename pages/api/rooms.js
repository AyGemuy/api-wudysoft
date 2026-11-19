import { withApiLog } from "@/lib/apiLogger.cjs";
import dbConnect from "@/lib/mongoose";
import Room from "@/models/Room";
import mongoose from "mongoose";

async function handler(req, res) {
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
        // Daftar grup: ringkasan per grup (total pesan, pembuat, dll.) + pagination/pencarian/urutan
        const q = String(req.query.q || "").trim().slice(0, 60);
        const paged = req.query.page !== undefined || req.query.limit !== undefined;
        const limit = Math.min(48, Math.max(1, parseInt(req.query.limit, 10) || 12));
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const sortKey = { updated: { updatedAt: -1 }, created: { createdAt: -1 }, oldest: { createdAt: 1 }, name: { roomName: 1 }, total: { total: -1, updatedAt: -1 } }[req.query.sort] || { updatedAt: -1 };
        const match = q ? { roomName: { $regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" } } : {};
        const [out] = await Room.aggregate([
          { $match: match },
          {
            $project: {
              roomName: 1, isGroup: 1, createdAt: 1, updatedAt: 1, createdBy: 1, avatar: 1,
              total: { $size: { $filter: { input: { $ifNull: ["$messages", []] }, as: "m", cond: { $ne: ["$$m.isDeleted", true] } } } },
              firstAuthor: { $arrayElemAt: [{ $ifNull: ["$messages.name", []] }, 0] },
              lastAt: { $max: "$messages.timestamp" },
            },
          },
          { $sort: sortKey },
          { $facet: { items: paged ? [{ $skip: (page - 1) * limit }, { $limit: limit }] : [], count: [{ $count: "n" }] } },
        ]);
        const total = out?.count?.[0]?.n || 0;
        const data = (out?.items || []).map((r) => ({ ...r, createdBy: r.createdBy || r.firstAuthor || "" }));
        return res.status(200).json({ success: true, data, meta: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) } });
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
      createdBy,
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
          createdBy: String(createdBy || "").slice(0, 60),
          avatar: /^https?:\/\//i.test(String(avatar || "")) ? String(avatar).slice(0, 500) : "",
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

export default withApiLog(handler);
