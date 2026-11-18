import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);
  res.setHeader("Cache-Control", "no-store");

  // apiToken tidak ikut dikirim ke endpoint publik ini
  const user = session?.user ? { ...session.user, apiToken: undefined } : null;
  return res.status(200).json({ authenticated: Boolean(user), user });
}

export default withApiLog(withRateLimit(handler));
