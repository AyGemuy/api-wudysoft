import axios from "axios";
class Aiw3Client {
  constructor() {
    this.base = "https://aiw3.ai";
    this.cookies = {};
    this.isInitialized = false;
    this.api = axios.create({
      baseURL: this.base,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        connection: "keep-alive",
        origin: this.base,
        pragma: "no-cache",
        referer: `${this.base}/home`,
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
  setCookieString(cookieString) {
    cookieString.split(";").forEach(c => {
      const parts = c.split("=");
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join("=").trim();
        this.cookies[key] = value;
      }
    });
  }
  async init() {
    if (this.isInitialized) return {
      success: true
    };
    try {
      console.log("[PROCESS] Initializing session via homepage...");
      await this.api.get("/home");
      this.isInitialized = true;
      console.log("[SUCCESS] Session initialized.");
      return {
        success: true
      };
    } catch (err) {
      console.error("[ERROR] Init Session Gagal:", err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async chat({
    prompt,
    messages = [],
    on_delta,
    ...rest
  }) {
    try {
      if (!this.isInitialized) {
        const initRes = await this.init();
        if (!initRes.success) {
          return {
            success: false,
            error: `Gagal inisialisasi awal: ${initRes.error}`
          };
        }
      }
      let finalMessages = [...messages];
      if (prompt && finalMessages.length === 0) {
        finalMessages.push({
          role: "user",
          content: prompt
        });
      }
      const payload = {
        messages: finalMessages,
        reply_locale: "en",
        ...rest
      };
      console.log("[PROCESS] Mengirimkan request stream ke aiw3...");
      const res = await this.api.post("/api/claw/openai-chat", payload, {
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
              const rawData = line.slice(6).trim();
              if (rawData === "[DONE]") return;
              try {
                const parsed = JSON.parse(rawData);
                if (parsed.type === "chunk" && parsed.content) {
                  fullResponse += parsed.content;
                  if (on_delta) on_delta(parsed.content);
                }
              } catch (e) {}
            }
          }
        });
        stream.on("end", () => {
          console.log("\n[SUCCESS] Stream selesai.");
          resolve({
            success: true,
            result: fullResponse
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
  const api = new Aiw3Client();
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