/**
 * Logika akun (server-only): daftar, masuk, dan penautan OAuth.
 * Dipakai oleh lib/auth.js (NextAuth) dan /api/auth.
 */
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import connectMongo from "@/lib/mongoose";
import User from "@/models/User";
import apiConfig from "@/configs/apiConfig";

const BCRYPT_COST = 11;
const MAX_ATTEMPTS = 5;
const LOCK_MS = 10 * 60 * 1000;

export class AuthError extends Error {
  constructor(message, code = "AUTH_ERROR") {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

/* ---------------- validasi ---------------- */
export const normalizeEmail = (v) => String(v || "").trim().toLowerCase();

export function validateEmail(email) {
  return /^[^\s@]{1,64}@[^\s@]+\.[^\s@]{2,}$/.test(email) && email.length <= 254;
}

export function validatePassword(pw) {
  const p = String(pw || "");
  if (p.length < 8) return "Password minimal 8 karakter";
  if (p.length > 72) return "Password maksimal 72 karakter";
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return "Password harus mengandung huruf dan angka";
  return null;
}

export function cleanName(v, fallback = "") {
  const s = String(v || "")
    .replace(/[\u0000-\u001f\u007f<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 32);
  return s || fallback;
}

/* ---------------- util ---------------- */
let _dummy;
const dummyHash = async () => (_dummy ||= await bcrypt.hash("nexus-dummy-password", BCRYPT_COST));

const isBcryptHash = (s) => /^\$2[aby]\$\d{2}\$/.test(String(s || ""));

function safeEqual(a, b) {
  const ha = crypto.createHash("sha256").update(String(a)).digest();
  const hb = crypto.createHash("sha256").update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export const issueApiToken = (id) =>
  jwt.sign({ id: String(id) }, apiConfig.JWT_SECRET, { expiresIn: "7d" });

export function publicUser(doc) {
  return {
    id: String(doc._id),
    email: doc.email,
    name: doc.name || doc.email?.split("@")[0] || "User",
    image: doc.image || null,
    role: doc.role || "user",
    provider: doc.provider || "credentials",
  };
}

/* ---------------- daftar ---------------- */
export async function registerUser({ name, email, password, ip }) {
  email = normalizeEmail(email);
  if (!validateEmail(email)) throw new AuthError("Format email tidak valid", "INVALID_EMAIL");
  const pwError = validatePassword(password);
  if (pwError) throw new AuthError(pwError, "WEAK_PASSWORD");

  await connectMongo();

  const exists = await User.findOne({ email });
  if (exists) throw new AuthError("Email sudah terdaftar. Silakan masuk.", "EMAIL_TAKEN");

  const hash = await bcrypt.hash(String(password), BCRYPT_COST);
  try {
    const doc = await User.create({
      email,
      name: cleanName(name, email.split("@")[0]),
      password: hash,
      provider: "credentials",
      providers: [{ provider: "credentials", providerId: email }],
      ipAddress: ip,
      lastLoginAt: new Date(),
    });
    return publicUser(doc);
  } catch (err) {
    if (err?.code === 11000) throw new AuthError("Email sudah terdaftar. Silakan masuk.", "EMAIL_TAKEN");
    throw err;
  }
}

/* ---------------- masuk ---------------- */
export async function verifyUser({ email, password, ip }) {
  email = normalizeEmail(email);
  const generic = new AuthError("Email atau password salah", "INVALID_CREDENTIALS");
  if (!email || !password) throw new AuthError("Email dan password wajib diisi", "MISSING_FIELDS");

  await connectMongo();
  const doc = await User.findOne({ email }).select("+password");
  if (!doc) {
    // samakan waktu respons agar keberadaan email tidak bocor lewat timing
    await bcrypt.compare(String(password), await dummyHash());
    throw generic;
  }

  if (doc.lockUntil && doc.lockUntil.getTime() > Date.now()) {
    const mins = Math.ceil((doc.lockUntil.getTime() - Date.now()) / 60000);
    throw new AuthError(`Terlalu banyak percobaan gagal. Coba lagi dalam ${mins} menit.`, "LOCKED");
  }

  const stored = doc.password;
  let ok = false;
  if (!stored) {
    ok = false; // akun OAuth-only: belum punya password
  } else if (isBcryptHash(stored)) {
    ok = await bcrypt.compare(String(password), stored);
  } else {
    // akun lama (teks biasa): cocokkan lalu upgrade ke bcrypt
    ok = safeEqual(String(password).trim(), stored);
    if (ok) doc.password = await bcrypt.hash(String(password), BCRYPT_COST);
  }

  if (!ok) {
    doc.failedAttempts = (doc.failedAttempts || 0) + 1;
    if (doc.failedAttempts >= MAX_ATTEMPTS) {
      doc.lockUntil = new Date(Date.now() + LOCK_MS);
      doc.failedAttempts = 0;
    }
    await doc.save();
    throw generic;
  }

  doc.failedAttempts = 0;
  doc.lockUntil = undefined;
  doc.lastLoginAt = new Date();
  if (ip) doc.ipAddress = ip;
  await doc.save();
  return publicUser(doc);
}

/* ---------------- OAuth ---------------- */
/**
 * Cari akun berdasarkan (provider, providerId); kalau belum ada, tautkan ke akun
 * dengan email sama HANYA jika email dari provider terverifikasi; kalau tidak, buat baru.
 */
export async function upsertOAuthUser({ provider, providerId, email, name, image, emailVerified, ip }) {
  await connectMongo();
  providerId = String(providerId);
  email = normalizeEmail(email) || `${provider}_${providerId}@users.noreply.local`;

  let doc = await User.findOne({ providers: { $elemMatch: { provider, providerId } } });

  if (!doc && emailVerified) {
    doc = await User.findOne({ email });
    if (doc) {
      doc.providers = [...(doc.providers || []), { provider, providerId }];
      doc.emailVerified = true;
    }
  }

  if (!doc) {
    try {
      doc = await User.create({
        email,
        name: cleanName(name, email.split("@")[0]),
        image,
        provider,
        providers: [{ provider, providerId }],
        emailVerified: !!emailVerified,
        ipAddress: ip,
      });
    } catch (err) {
      if (err?.code === 11000) {
        // email sudah dipakai akun lain yang belum terverifikasi: jangan ambil alih
        throw new AuthError(
          "Email ini sudah terdaftar dengan metode lain. Masuk dengan email & password terlebih dahulu.",
          "OAUTH_EMAIL_CONFLICT"
        );
      }
      throw err;
    }
  } else {
    if (!doc.image && image) doc.image = image;
    if (!doc.name && name) doc.name = cleanName(name);
  }

  doc.lastLoginAt = new Date();
  if (ip) doc.ipAddress = ip;
  await doc.save();
  return publicUser(doc);
}
