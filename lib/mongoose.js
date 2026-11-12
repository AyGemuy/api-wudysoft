import {
  LRUCache
} from "lru-cache";
import mongoose from "mongoose";
import apiConfig from "@/configs/apiConfig";
const isConnectedCache = globalThis.__mongoLruCache || (globalThis.__mongoLruCache = new LRUCache({
  max: 1e3,
  ttl: 1e3 * 60 * 60 * 12
}));
let listenersRegistered = globalThis.__mongoListenersRegistered || false;
const connectMongo = async () => {
  if (mongoose.connection.readyState === 1) {
    isConnectedCache.set("status", true);
    return;
  }
  if (isConnectedCache.get("status") && mongoose.connection.readyState !== 0) {
    return;
  }
  if (mongoose.connection.readyState === 2) {
    console.log("⏳ [MONGO] Koneksi MongoDB sedang berlangsung. Menunggu...");
    await new Promise(resolve => setTimeout(resolve, 500));
    return;
  }
  const MAX_RETRIES = 5;
  let retryCount = 0;
  while (retryCount < MAX_RETRIES) {
    try {
      console.log(`\x1b[36m[MONGO] Menghubungkan ke MongoDB (Percobaan ${retryCount + 1}/${MAX_RETRIES})...\x1b[0m`);
      await mongoose.connect(apiConfig.MONGODB_URI, {
        serverSelectionTimeoutMS: 5e3,
        socketTimeoutMS: 3e4,
        bufferCommands: false
      });
      isConnectedCache.set("status", true);
      console.log(`\x1b[32m✔ [MONGO OK] Terhubung ke: ${mongoose.connection.host}/${mongoose.connection.name}\x1b[0m`);
      if (!listenersRegistered) {
        mongoose.connection.on("connected", () => {
          console.log("[32m⚡ [MONGO] Mongoose reconnected to MongoDB.[0m");
          isConnectedCache.set("status", true);
        });
        mongoose.connection.on("error", err => {
          console.error("[31m❌ [MONGO ERR] Mongoose connection error:[0m", err);
          isConnectedCache.delete("status");
        });
        mongoose.connection.on("disconnected", () => {
          console.warn("[33m⚠️ [MONGO WARN] Mongoose disconnected from MongoDB.[0m");
          isConnectedCache.delete("status");
        });
        listenersRegistered = true;
        globalThis.__mongoListenersRegistered = true;
      }
      return;
    } catch (error) {
      retryCount++;
      console.error(`\x1b[31m🔴 [MONGO FAIL] Gagal konek (Percobaan ${retryCount}/${MAX_RETRIES}):\x1b[0m`, error.message);
      if (retryCount < MAX_RETRIES) {
        const backoffTime = Math.pow(2, retryCount) * 1e3;
        console.log(`\x1b[33m[MONGO] Mengulang dalam ${backoffTime / 1e3} detik...\x1b[0m`);
        await new Promise(resolve => setTimeout(resolve, backoffTime));
      } else {
        console.error("[31m❌ [MONGO FATAL] Semua percobaan koneksi gagal.[0m");
        isConnectedCache.delete("status");
        throw error;
      }
    }
  }
};
export default connectMongo;