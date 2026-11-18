import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import fetch from "node-fetch";
async function groq(q) {
  try {
    const {
      data
    } = await (await fetch("https://api-zenn.vercel.app/api/ai/groq?q=" + q))?.json();
    return data;
  } catch (error) {
    throw new Error("Error:", error.message);
  }
}
async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) return res.status(400).json({
    message: "No prompt provided"
  });
  const result = await groq(prompt);
  return res.status(200).json({
    result: typeof result === "object" ? result : result
  });
}

export default withApiLog(withRateLimit(handler));
