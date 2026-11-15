import { withApiLog } from "@/lib/apiLogger.cjs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { withRateLimit, clientIp } from "@/src/lib/rateLimit";
import { AuthError, registerUser, verifyUser, issueApiToken } from "@/lib/users";

/**
 * Endpoint token untuk klien API (non-browser).
 *  - GET  /api/auth                      → status & sesi NextAuth saat ini
 *  - POST /api/auth {mode:"login", email, password}
 *  - POST /api/auth {mode:"register", name?, email, password}
 * Login web memakai NextAuth (/api/auth/callback/*), bukan endpoint ini.
 */
async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.status(200).end();

  if (req.method === "POST") {
    const { mode = "login", name, email, password } = req.body || {};
    const ip = clientIp(req);
    try {
      let user;
      if (mode === "register") {
        user = await registerUser({ name, email, password, ip });
      } else if (mode === "login") {
        user = await verifyUser({ email, password, ip });
      } else {
        return res.status(400).json({ message: 'mode harus "login" atau "register"' });
      }
      return res.status(mode === "register" ? 201 : 200).json({
        message: mode === "register" ? "Akun berhasil dibuat" : "Sign-in successful",
        user,
        token: issueApiToken(user.id),
      });
    } catch (err) {
      if (err instanceof AuthError) {
        const status =
          err.code === "EMAIL_TAKEN" ? 409 : err.code === "LOCKED" ? 429 : err.code === "INVALID_CREDENTIALS" ? 401 : 400;
        return res.status(status).json({ message: err.message, code: err.code });
      }
      console.error("[AUTH API]", err);
      return res.status(500).json({ message: "Gagal memproses permintaan autentikasi" });
    }
  }

  if (req.method === "GET") {
    const session = await getServerSession(req, res, authOptions);
    return res.status(200).json({
      status: "online",
      authenticated: Boolean(session?.user),
      user: session?.user ? { ...session.user, apiToken: undefined } : null,
      endpoints: [
        "/api/auth (POST login/register untuk token API)",
        "/api/auth/session",
        "/api/auth/providers",
        "/api/auth/csrf",
        "/api/auth/callback/credentials (NextAuth: masuk)",
        "/api/auth/callback/signup (NextAuth: daftar)",
        "/api/auth/callback/guest (NextAuth: tamu)",
        "/api/auth/signin/github | /api/auth/signin/google (OAuth)",
        "/api/auth/signout",
        "/api/auth/me",
      ],
    });
  }

  res.setHeader("Allow", ["GET", "POST", "OPTIONS"]);
  return res.status(405).json({ message: `Method ${req.method} not allowed` });
}

export default withApiLog(withRateLimit(handler, { limit: 15, windowMs: 60_000 }));
