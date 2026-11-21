/**
 * Logika akun (server-only): daftar, masuk, dan penautan OAuth.
 * Dipakai oleh lib/auth.js (NextAuth) dan /api/auth.
 */
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import connectMongo from "@/lib/mongoose";
import User from "@/models/User";
import apiConfig from "@/configs/apiConfig";
import { notifyJoin } from "@/lib/notify";

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
const dummyHash = async () => (_dummy ||= await bcrypt.hash("wudysoft-dummy-password", BCRYPT_COST));

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

/** Bentuk lengkap untuk halaman profil (tanpa data sensitif). */
export function profileOf(doc) {
  return {
    ...publicUser(doc),
    bio: doc.bio || "",
    emailVerified: Boolean(doc.emailVerified),
    hasPassword: Boolean(doc.password),
    providers: (doc.providers || []).map((p) => ({ provider: p.provider, linkedAt: p.linkedAt })),
    createdAt: doc.createdAt,
    lastLoginAt: doc.lastLoginAt,
    updatedAt: doc.updatedAt,
  };
}

/** Ambil data terbaru dari DB (untuk menyegarkan token sesi). null bila akun sudah tidak ada. */
export async function findUserById(id) {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectMongo();
  return User.findById(id);
}

/* ---------------- profil ---------------- */
export function validateImageUrl(v) {
  const s = String(v || "").trim();
  if (!s) return "";
  if (s.length > 300) throw new AuthError("URL foto terlalu panjang (maks 300 karakter)", "INVALID_IMAGE");
  if (!/^https:\/\//i.test(s)) throw new AuthError("URL foto harus diawali https://", "INVALID_IMAGE");
  try { new URL(s); } catch { throw new AuthError("URL foto tidak valid", "INVALID_IMAGE"); }
  return s;
}

const AVATAR_MAX_BYTES = 60 * 1024;

export async function updateProfile(id, { name, bio, image, avatarData, removeAvatar }) {
  const doc = await findUserById(id);
  if (!doc) throw new AuthError("Akun tidak ditemukan", "NOT_FOUND");
  if (name !== undefined) {
    const n = cleanName(name);
    if (!n) throw new AuthError("Nama tidak boleh kosong", "INVALID_NAME");
    doc.name = n;
  }
  if (bio !== undefined) doc.bio = String(bio || "").replace(/[\u0000-\u001f\u007f<>]/g, " ").trim().slice(0, 160);
  if (avatarData) {
    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(String(avatarData));
    if (!m) throw new AuthError("Format foto tidak didukung (JPEG/PNG/WebP)", "INVALID_IMAGE");
    if (Math.ceil((m[2].length * 3) / 4) > AVATAR_MAX_BYTES) throw new AuthError("Foto terlalu besar (maks 60 KB setelah dikecilkan)", "INVALID_IMAGE");
    doc.avatarData = String(avatarData);
    doc.image = `/api/avatar/${doc._id}?v=${Date.now().toString(36)}`;
  } else if (removeAvatar) {
    doc.avatarData = undefined;
    doc.image = "";
  } else if (image !== undefined) {
    doc.image = validateImageUrl(image);
    doc.avatarData = undefined;
  }
  await doc.save();
  return profileOf(doc);
}

export async function changePassword(id, { current, next }) {
  const doc = await User.findById(id).select("+password");
  if (!doc) throw new AuthError("Akun tidak ditemukan", "NOT_FOUND");
  const pwError = validatePassword(next);
  if (pwError) throw new AuthError(pwError, "WEAK_PASSWORD");
  if (doc.password) {
    const stored = doc.password;
    const ok = isBcryptHash(stored) ? await bcrypt.compare(String(current || ""), stored) : safeEqual(String(current || "").trim(), stored);
    if (!ok) throw new AuthError("Password saat ini salah", "INVALID_CREDENTIALS");
  }
  doc.password = await bcrypt.hash(String(next), BCRYPT_COST);
  doc.failedAttempts = 0;
  doc.lockUntil = undefined;
  await doc.save();
  return profileOf(doc);
}

/** Pastikan indeks unik email benar-benar ada (autoIndex tidak andal di serverless). */
let _indexes;
const ensureIndexes = () => (_indexes ||= User.init().catch(() => { _indexes = undefined; }));

/* ---------------- daftar ---------------- */
export async function registerUser({ name, email, password, ip }) {
  email = normalizeEmail(email);
  if (!validateEmail(email)) throw new AuthError("Format email tidak valid", "INVALID_EMAIL");
  const pwError = validatePassword(password);
  if (pwError) throw new AuthError(pwError, "WEAK_PASSWORD");

  await connectMongo();
  await ensureIndexes();

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
    notifyJoin({ name: doc.name, email: doc.email, provider: "credentials" });
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

  let created = false;
  if (!doc) {
    try {
      created = true;
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
  if (created) notifyJoin({ name: doc.name, email: doc.email, provider });
  return publicUser(doc);
}
