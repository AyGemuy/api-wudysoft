import axios from "axios";
import crypto from "crypto";
class ChatDay {
  constructor() {
    this.base = "https://www.chatday.ai";
    this.cookies = {};
    this.isAuthed = false;
    this.modelList = null;
    this.visitorId = this.genHex(32);
    this.convId = this.genHex(16);
    this.api = axios.create({
      baseURL: this.base,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        referer: `${this.base}/chat`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      },
      withCredentials: false
    });
    this.api.interceptors.request.use(config => {
      const cookieStr = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
      if (cookieStr) config.headers["cookie"] = cookieStr;
      return config;
    });
    this.api.interceptors.response.use(res => {
      const setCookie = res.headers["set-cookie"];
      if (setCookie) {
        const cookiesArr = Array.isArray(setCookie) ? setCookie : [setCookie];
        cookiesArr.forEach(c => {
          const match = c.match(/^([^=]+)=([^;]+)/);
          if (match) this.cookies[match[1]] = match[2];
        });
      }
      return res;
    });
  }
  genHex(len) {
    return crypto.randomBytes(Math.ceil(len / 2)).toString("hex").slice(0, len);
  }
  async auth() {
    if (this.isAuthed) return {
      success: true
    };
    try {
      await this.api.post("/api/auth/sign-in/anonymous", {}, {
        headers: {
          "content-type": "application/json"
        }
      });
      this.isAuthed = true;
      return {
        success: true
      };
    } catch (err) {
      return {
        success: false,
        error: `Initialization failed: ${err.message}`
      };
    }
  }
  async models() {
    try {
      const authCheck = await this.auth();
      if (!authCheck.success) return authCheck;
      console.log("[PROCESS] Fetching available models...");
      const res = await this.api.get("/api/v2/models");
      this.modelList = res.data?.models || [];
      console.log(`[SUCCESS] Loaded ${this.modelList.length} models.`);
      return {
        success: true,
        data: this.modelList
      };
    } catch (err) {
      console.error("[ERROR] Fetch Models Gagal:", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async chat({
    model,
    content,
    conversation_id,
    visitor_id,
    on_delta,
    ...rest
  }) {
    try {
      if (!this.modelList) {
        const fetchRes = await this.models();
        if (!fetchRes.success) {
          return {
            success: false,
            error: `Gagal inisialisasi session/model: ${fetchRes.error}`
          };
        }
      }
      let selectedModel = model;
      const modelExists = this.modelList.some(m => m.id === model);
      if (!modelExists) {
        const defaultModel = this.modelList[0]?.id || "openai/gpt-5.5";
        console.warn(`[WARN] Model "${model}" tidak valid. Menggunakan default: "${defaultModel}"`);
        selectedModel = defaultModel;
      }
      console.log("[PROCESS] Initiating chat stream...");
      this.convId = conversation_id || this.convId;
      this.visitorId = visitor_id || this.visitorId;
      const payload = {
        content: content,
        model: selectedModel,
        visitorId: this.visitorId,
        conversationId: this.convId,
        ...rest
      };
      console.log(`[INFO] Session Active - ConvID: ${this.convId} | VisitorID: ${this.visitorId}`);
      const res = await this.api.post("/api/v2/chat/anonymous", payload, {
        headers: {
          "content-type": "application/json"
        },
        responseType: "stream"
      });
      return new Promise(resolve => {
        const stream = res.data;
        let buffer = "";
        let fullResponse = "";
        stream.on("data", chunk => {
          buffer += chunk.toString();
          const lines = buffer.split("\n");
          buffer = lines.pop();
          for (const line of lines) {
            if (!line.trim()) continue;
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") return;
              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "text-delta" && parsed.delta) {
                  fullResponse += parsed.delta;
                  if (on_delta) on_delta(parsed.delta);
                }
              } catch (e) {}
            }
          }
        });
        stream.on("end", () => {
          console.log("\n[SUCCESS] Stream selesai.");
          resolve({
            success: true,
            result: fullResponse,
            conversation_id: this.convId,
            visitor_id: this.visitorId,
            available_models: this.modelList
          });
        });
        stream.on("error", err => {
          console.error("[STREAM ERROR]:", err.message);
          resolve({
            success: false,
            error: err.message
          });
        });
      });
    } catch (err) {
      console.error("[ERROR] Chat Request Gagal:", err.message);
      return {
        success: false,
        error: err.message
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
  const api = new ChatDay();
  try {
    const data = await api.chat(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}