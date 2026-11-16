import { withApiLog } from "@/lib/apiLogger.cjs";
import axios from "axios";
async function handler(req, res) {
  const {
    prompt
  } = req.method === "GET" ? req.query : req.body;
  if (!prompt) {
    return res.status(400).json({
      error: "Prompt is required"
    });
  }
  try {
    const response = await axios.post("https://chattv.vercel.app/api/generate-response", {
      message: prompt
    });
    return res.status(200).json({
      result: response.data
    });
  } catch (error) {
    return res.status(500).json({
      error: "Internal Server Error"
    });
  }
}

export default withApiLog(handler);
