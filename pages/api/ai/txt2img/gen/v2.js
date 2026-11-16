import { withApiLog } from "@/lib/apiLogger.cjs";
import axios from "axios";
async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt parameter is required"
    });
  }
  const imageUrl = `https://imgen.duck.mom/prompt/${encodeURIComponent(prompt)}`;
  try {
    const response = await axios.get(imageUrl, {
      responseType: "arraybuffer"
    });
    res.setHeader("Content-Type", "image/png");
    res.setHeader("Content-Disposition", 'inline; filename="generated_image.png"');
    res.end(response.data);
  } catch (error) {
    return res.status(500).json({
      error: "Failed to fetch the image"
    });
  }
}

export default withApiLog(handler);
