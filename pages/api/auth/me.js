import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const session = await getServerSession(req, res, authOptions);

  return res.status(200).json({
    authenticated: Boolean(session?.user),
    user: session?.user || null,
  });
}