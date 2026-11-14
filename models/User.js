import mongoose from "mongoose";

const { Schema } = mongoose;

const LinkedProviderSchema = new Schema(
  {
    provider: { type: String, required: true },
    providerId: { type: String, required: true },
    linkedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const UserSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    name: { type: String, trim: true, maxlength: 64 },
    // Hash bcrypt. `select: false` agar tidak ikut terbawa ke query biasa.
    // Akun lama bisa masih berisi teks biasa; dimigrasi otomatis saat login berikutnya.
    password: { type: String, select: false },
    image: { type: String },
    role: { type: String, default: "user" },

    // provider pendaftaran awal: credentials | github | google
    provider: { type: String, default: "credentials" },
    providers: { type: [LinkedProviderSchema], default: [] },
    emailVerified: { type: Boolean, default: false },

    ipAddress: { type: String },
    lastLoginAt: { type: Date },

    // Proteksi brute force
    failedAttempts: { type: Number, default: 0 },
    lockUntil: { type: Date },
  },
  { timestamps: true }
);

export default mongoose.models.User || mongoose.model("User", UserSchema);
