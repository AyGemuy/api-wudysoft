import { withRateLimit } from "@/src/lib/rateLimit";
import { withApiLog } from "@/lib/apiLogger.cjs";
import fetch from "node-fetch";
async function handler(req, res) {
  try {
    const {
      mp4
    } = await fetch("https://tucdn.wpon.cn/api-girl/index.php?wpon=json").then(r => r.json());
    if (!mp4) return res.status(500).end();
    const video = await fetch(`https:${mp4.startsWith("//") ? mp4 : `//${mp4}`}`).then(r => r.arrayBuffer());
    res.setHeader("Content-Type", "video/mp4");
    res.setHeader("Content-Disposition", 'inline; filename="video.mp4"');
    res.send(Buffer.from(video));
  } catch (err) {
    res.status(500).json({
      error: "Internal Server Error",
      details: err.message
    });
  }
}

export default withApiLog(withRateLimit(handler));
