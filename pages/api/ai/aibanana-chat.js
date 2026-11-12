import axios from "axios";
import {
  randomUUID
} from "crypto";
class BananaChat {
  constructor() {
    this.api = axios.create({
      baseURL: "https://aibanana.net/api",
      headers: {
        "content-type": "application/json",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36",
        referer: "https://aibanana.net/",
        origin: "https://aibanana.net"
      }
    });
  }
  async chat({
    prompt,
    history,
    ...rest
  }) {
    try {
      console.log(`[Process] Generating response for: ${prompt?.substring(0, 20)}...`);
      const payload = {
        message: prompt || "Hello",
        conversationHistory: history || [],
        ...rest
      };
      const {
        data
      } = await this.api.post("/chat/completion", payload);
      const result = data?.content || "No response";
      const updatedHistory = [...history || [], {
        id: randomUUID(),
        role: "user",
        content: prompt,
        timestamp: new Date().toISOString()
      }];
      updatedHistory.push({
        id: randomUUID(),
        role: "assistant",
        content: result,
        timestamp: new Date().toISOString()
      });
      console.log("[Success] Response received and history updated");
      return {
        result: result,
        history: updatedHistory,
        status: "success",
        timestamp: Date.now()
      };
    } catch (err) {
      console.error("[Error]", err?.response?.data || err.message);
      return {
        result: null,
        history: history || [],
        error: true
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new BananaChat();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}