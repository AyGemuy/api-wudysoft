import axios from "axios";
const FREE_MODELS = ["google/gemini-2.5-flash-lite", "google/gemma-3-27b-it", "google/gemma-3-27b-it:free"];
const DEFAULT_MODEL = "google/gemini-2.5-flash-lite";
class GptChat {
  constructor() {
    try {
      this.base = "https://damp-haze-65c3.malika-zahrane-1958.workers.dev";
      this.secret = "NovaKey@A27Aa";
      this.models = FREE_MODELS;
      this.defaultModel = DEFAULT_MODEL;
      this.api = axios.create({
        timeout: 6e4,
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 15; RMX3890 Build/AQ3A.240812.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/149.0.7827.91 Mobile Safari/537.36",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Content-Type": "application/json",
          "sec-ch-ua-platform": '"Android"',
          "x-app-secret": this.secret,
          "sec-ch-ua": '"Android WebView";v="149", "Chromium";v="149", "Not)A;Brand";v="24"',
          "sec-ch-ua-mobile": "?1",
          origin: "https://localhost",
          "x-requested-with": "com.gptchat.ai",
          "sec-fetch-site": "cross-site",
          "sec-fetch-mode": "cors",
          "sec-fetch-dest": "empty",
          referer: "https://localhost/",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          priority: "u=1, i"
        }
      });
      console.log("[Init] GptChat ready");
    } catch (e) {
      console.log("[Init Error]", e?.message || e);
    }
  }
  _val(m) {
    try {
      const valid = this.models.includes(m) ? m : this.defaultModel;
      console.log(`[Model] ${m || "kosong"} → ${valid}`);
      return valid;
    } catch (e) {
      console.log("[Model Error]", e?.message || e);
      return this.defaultModel;
    }
  }
  _sse(stream) {
    return new Promise((resolve, reject) => {
      try {
        let raw = "";
        const chunks = [];
        let info = {};
        stream.on("data", chunk => {
          raw += chunk.toString();
        });
        stream.on("end", () => {
          try {
            const lines = raw.split("\n").filter(line => line.startsWith("data:"));
            if (lines.length === 0) throw new Error("No SSE data received");
            let fullText = "";
            for (const line of lines) {
              const jsonStr = line.slice(5).trim();
              if (jsonStr === "[DONE]") continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const content = parsed.choices?.[0]?.delta?.content || "";
                if (content) {
                  chunks.push(content);
                  fullText += content;
                }
                info = {
                  ...info,
                  ...parsed,
                  ...parsed.usage
                };
              } catch (_) {}
            }
            resolve({
              text: fullText,
              chunks: chunks,
              info: info
            });
          } catch (e) {
            reject(e);
          }
        });
        stream.on("error", reject);
      } catch (e) {
        reject(e);
      }
    });
  }
  async chat({
    model,
    prompt,
    messages,
    stream = true,
    ...rest
  }) {
    try {
      console.log("[Chat] Start");
      const selected = this._val(model);
      const history = Array.isArray(messages) ? [...messages] : [];
      if (prompt) {
        console.log(`[Chat] Push prompt: "${prompt.slice(0, 30)}..."`);
        history.push({
          role: "user",
          content: prompt
        });
      }
      if (history.length === 0) throw new Error("messages atau prompt harus diisi");
      const payload = {
        body: {
          model: selected,
          messages: history,
          stream: stream,
          ...rest
        },
        stream: stream
      };
      console.log("[Chat] Sending request (forced stream)...");
      const res = await this.api.post(this.base, payload, {
        responseType: "stream"
      });
      const {
        text,
        chunks,
        info
      } = await this._sse(res.data);
      console.log("[Chat] Success");
      return {
        status: true,
        result: text,
        chunks: chunks,
        model: selected,
        ...info
      };
    } catch (e) {
      const errMsg = e?.response?.data || e?.message || "Unknown error";
      console.log("[Chat Error]", errMsg);
      return {
        status: false,
        result: errMsg,
        chunks: [],
        error: errMsg
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
  const api = new GptChat();
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