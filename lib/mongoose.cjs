'use strict';
/**
 * Koneksi MongoDB tunggal (CommonJS) — dipakai route Next.js, server custom, dan logger.
 * - Satu promise koneksi dibagi lintas modul (globalThis) → tidak ada koneksi ganda / balapan.
 * - Aman untuk serverless: percobaan singkat, tidak memblokir lama bila DB mati.
 * - URI dibaca dari configs/apiConfig.cjs (hardcoded), bukan dari .env.
 */
const mongoose = require('mongoose');
const apiConfig = require('../configs/apiConfig.cjs');

const g = globalThis;
const S = g.__wudysoftMongo || (g.__wudysoftMongo = { promise: null, failedAt: 0, listeners: false });

const ATTEMPTS = 2;
const COOLDOWN_MS = 5000; // setelah gagal total, jangan langsung hantam DB lagi

function registerListeners() {
  if (S.listeners) return;
  S.listeners = true;
  mongoose.connection.on('disconnected', () => { S.promise = null; });
  mongoose.connection.on('error', (e) => console.error('[MONGO] error:', e?.message));
}

async function open() {
  let lastErr;
  for (let i = 1; i <= ATTEMPTS; i++) {
    try {
      await mongoose.connect(apiConfig.MONGODB_URI, {
        serverSelectionTimeoutMS: 6000,
        socketTimeoutMS: 30000,
        maxPoolSize: 10,
        bufferCommands: false,
      });
      registerListeners();
      return mongoose;
    } catch (err) {
      lastErr = err;
      if (i < ATTEMPTS) await new Promise((r) => setTimeout(r, 400 * i));
    }
  }
  throw lastErr;
}

async function connectMongo() {
  if (mongoose.connection.readyState === 1) return mongoose;
  if (!S.promise) {
    if (S.failedAt && Date.now() - S.failedAt < COOLDOWN_MS) throw new Error('Database tidak tersedia (mencoba lagi sebentar lagi)');
    S.promise = open().then(
      (m) => { S.failedAt = 0; console.log(`[MONGO] terhubung: ${mongoose.connection.host}/${mongoose.connection.name}`); return m; },
      (err) => { S.promise = null; S.failedAt = Date.now(); console.error('[MONGO] gagal konek:', err?.message); throw err; }
    );
  }
  await S.promise;
  return mongoose;
}

module.exports = connectMongo;
module.exports.default = connectMongo;
module.exports.isConnected = () => mongoose.connection.readyState === 1;
