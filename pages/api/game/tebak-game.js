import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import fetch from "node-fetch";
async function handler(req, res) {
  try {
    const src = await (await fetch("https://raw.githubusercontent.com/qisyana/scrape/main/tebakgame.json")).json();
    const json = src[Math.floor(Math.random() * src.length)];
    return res.status(200).json(json);
  } catch {
    res.status(500).json({
      error: "Failed to fetch data"
    });
  }
}

export default withApiLog(withRateLimit(handler));
