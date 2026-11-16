import { withApiLog } from "@/lib/apiLogger.cjs";
import fetch from "node-fetch";
async function handler(req, res) {
  try {
    const src = await (await fetch("https://api.jikan.moe/v4/random/characters")).json();
    const json = src.data;
    return res.status(200).json(json);
  } catch {
    res.status(500).json({
      error: "Failed to fetch data"
    });
  }
}

export default withApiLog(handler);
