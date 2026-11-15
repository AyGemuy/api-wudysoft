import { Server } from "socket.io";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { tokenFromHeaders } from "@/lib/authToken";
import { sysInfo } from "@/lib/sysInfo";
import logger from "@/lib/apiLogger.cjs";

const PATH = "/api/live-socket";

/**
 * Inisialisasi Socket.IO untuk telemetri realtime (log request/response + metrik sistem).
 * Hanya bekerja di server Node yang long-lived (server custom, `next start`, VPS).
 * Di serverless (Netlify) tidak ada WebSocket: klien otomatis memakai polling /api/stats/live.
 */
export default async function handler(req, res) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ ok: false, error: "Belum login" });

  try {
    const srv = res.socket?.server;
    if (!srv || typeof srv.on !== "function") return res.status(200).json({ ok: false, transport: "poll", reason: "server tidak mendukung WebSocket" });

    if (!srv.__nexusLive) {
      const io = new Server(srv, { path: PATH, addTrailingSlash: false, cors: { origin: true, credentials: true } });
      srv.__nexusLive = io;

      io.use(async (socket, next) => {
        const t = await tokenFromHeaders(socket.request.headers);
        return t ? next() : next(new Error("unauthorized"));
      });
      io.on("connection", (socket) => {
        socket.emit("snapshot", { events: logger.snapshot(150), counters: logger.counters(), sys: sysInfo() });
      });

      logger.bus.on("log", (ev) => { if (io.engine.clientsCount > 0) io.emit("log", ev); });
      const timer = setInterval(() => {
        if (io.engine.clientsCount > 0) io.emit("sys", { ...sysInfo(), counters: logger.counters() });
      }, 1500);
      timer.unref?.();
    }
    return res.status(200).json({ ok: true, transport: "socket.io", path: PATH });
  } catch (err) {
    return res.status(200).json({ ok: false, transport: "poll", reason: err.message });
  }
}
