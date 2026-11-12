import connectMongo from "@/lib/mongoose";
import User from "@/models/User";
import jwt from "jsonwebtoken";
import apiConfig from "@/configs/apiConfig";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const generateToken = (id) =>
  jwt.sign({ id }, apiConfig.JWT_SECRET, {
    expiresIn: "7d",
  });

export default async function handler(req, res) {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // ==========================================
  // 1. POST: Autentikasi / Upsert User via MongoDB
  // ==========================================
  if (req.method === "POST") {
    try {
      await connectMongo();
    } catch (err) {
      return res.status(500).json({
        message: "Koneksi database MongoDB gagal.",
        error: err.message,
      });
    }

    const { email, password } = req.body || {};
    const ipAddress =
      (req.headers["x-forwarded-for"] || "").split(",")[0].trim() ||
      req.socket?.remoteAddress ||
      "127.0.0.1";

    if (!email || !password) {
      return res.status(400).json({
        message: "Email dan password wajib diisi",
      });
    }

    try {
      // Upsert: update jika ada, buat baru jika belum terdaftar
      const updatedUser = await User.findOneAndUpdate(
        { email: String(email).trim().toLowerCase() },
        {
          $set: {
            password: String(password).trim(),
            ipAddress,
          },
        },
        {
          new: true,
          upsert: true,
          setDefaultsOnInsert: true,
        }
      );

      const token = generateToken(updatedUser._id);
      const { password: _, ...userData } = updatedUser.toObject();

      return res.status(200).json({
        message: "Sign-in successful",
        user: {
          ...userData,
          name: userData.email?.split("@")[0] || "Operative",
        },
        token,
      });
    } catch (error) {
      return res.status(500).json({
        message: "Gagal memproses otorisasi akun",
        error: error.message,
      });
    }
  }

  // ==========================================
  // 2. GET: Status Telemetry & Active Session
  // ==========================================
  if (req.method === "GET") {
    const session = await getServerSession(req, res, authOptions);

    return res.status(200).json({
      status: "online",
      database: "MongoDB Cluster Active",
      authenticated: Boolean(session?.user),
      user: session?.user || null,
      endpoints: [
        "/api/auth (POST for Sign-in / Auto Sign-up)",
        "/api/auth/me",
        "/api/auth/guest",
        "/api/auth/logout",
      ],
    });
  }

  res.setHeader("Allow", ["GET", "POST"]);
  return res.status(405).end(`Method ${req.method} Not Allowed`);
}