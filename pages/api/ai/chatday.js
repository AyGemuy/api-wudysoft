import axios from "axios";
import crypto from "crypto";
class ChatDay {
  constructor() {
    try {
      this.jar = {};
      this.isAuthed = false;
      this.modelList = null;
      this.visitorId = this.genHex(32);
      this.convId = this.genAlphaNum(16);
      this.jar["chatday_device_id"] = `O-${this.genAlphaNum(19)}`;
      this.cli = axios.create({
        baseURL: "https://www.chatday.ai",
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://www.chatday.ai",
          pragma: "no-cache",
          priority: "u=1, i",
          referer: "https://www.chatday.ai/chat",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      this.cli.interceptors.request.use(cfg => {
        try {
          const c = Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ");
          if (c) cfg.headers.Cookie = c;
        } catch (e) {
          this._log(`Req Interceptor Error: ${e?.message}`);
        }
        return cfg;
      });
      this.cli.interceptors.response.use(res => {
        try {
          const sc = res.headers["set-cookie"] || res.headers["Set-Cookie"];
          if (sc) {
            const arr = Array.isArray(sc) ? sc : [sc];
            arr.forEach(item => {
              const [kv] = item.split(";");
              const [k, ...v] = kv.split("=");
              if (k) this.jar[k.trim()] = v.join("=").trim();
            });
          }
        } catch (e) {
          this._log(`Res Interceptor Error: ${e?.message}`);
        }
        return res;
      });
    } catch (err) {
      console.error("[ChatDay] Init Class Error:", err?.message);
    }
  }
  _log(m) {
    try {
      console.log(`[ChatDay] ${m}`);
    } catch {
      return null;
    }
  }
  _sd(s) {
    try {
      return typeof s === "string" ? JSON.parse(Buffer.from(s, "base64").toString("utf-8")) : s || {};
    } catch {
      return {};
    }
  }
  _se(d) {
    try {
      return Buffer.from(JSON.stringify(d || {})).toString("base64");
    } catch {
      return "";
    }
  }
  genHex(len) {
    return crypto.randomBytes(Math.ceil(len / 2)).toString("hex").slice(0, len);
  }
  genAlphaNum(len) {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    return Array.from({
      length: len
    }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  }
  async _init() {
    try {
      this._log("Initializing session & authentication...");
      await this.cli.post("/api/auth/sign-in/anonymous", {}, {
        headers: {
          "content-type": "application/json"
        }
      });
      this.isAuthed = true;
      this._log("Fetching available models...");
      const res = await this.cli.get("/api/v2/models");
      this.modelList = res.data?.models || [];
      this._log(`Loaded ${this.modelList.length} models.`);
      return true;
    } catch (e) {
      this._log(`Init error: ${e?.message}`);
      return false;
    }
  }
  async chat({
    state,
    prompt,
    model,
    conversation_id,
    visitor_id,
    ...rest
  }) {
    try {
      this._log("Preparing chat request...");
      const savedState = this._sd(state);
      this.jar = savedState?.cookies ? {
        ...savedState.cookies
      } : this.jar;
      if (!this.isAuthed || !this.modelList) {
        const initSuccess = await this._init();
        if (!initSuccess) {
          return {
            status: false,
            result: null,
            chunks: [],
            models: [],
            state: this._se({
              cookies: this.jar
            })
          };
        }
      }
      const activeContent = prompt || rest.content || rest.query;
      if (!activeContent) {
        this._log("Error: Prompt/Content is empty");
        return {
          status: false,
          result: "Parameter 'prompt' atau 'content' tidak boleh kosong.",
          chunks: [],
          models: this.modelList || [],
          state: this._se({
            cookies: this.jar
          })
        };
      }
      let selectedModel = model || "openai/gpt-5.5";
      const modelExists = this.modelList.some(m => m.id === selectedModel);
      if (!modelExists && this.modelList.length > 0) {
        selectedModel = this.modelList[0].id;
      }
      this.convId = conversation_id || this.convId;
      this.visitorId = visitor_id || this.visitorId;
      const payload = {
        content: activeContent,
        model: selectedModel,
        visitorId: this.visitorId,
        conversationId: this.convId
      };
      this._log("Posting request to /api/v2/chat/anonymous stream...");
      const response = await this.cli.post("/api/v2/chat/anonymous", payload, {
        responseType: "stream"
      });
      return new Promise(resolve => {
        try {
          let result = "";
          const chunks = [];
          let bufferStr = "";
          response.data.on("data", chunk => {
            try {
              bufferStr += chunk.toString("utf-8");
              const lines = bufferStr.split("\n");
              bufferStr = lines.pop() || "";
              for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || !trimmed.startsWith("data:")) continue;
                const rawData = trimmed.startsWith("data: ") ? trimmed.slice(6) : trimmed.slice(5).trim();
                if (rawData === "[DONE]") continue;
                try {
                  const json = JSON.parse(rawData);
                  chunks.push(json);
                  if (json?.type === "text-delta" && json?.delta) {
                    result += json.delta;
                  }
                } catch {}
              }
            } catch (e) {
              this._log(`Stream chunk error: ${e?.message}`);
            }
          });
          response.data.on("end", () => {
            try {
              this._log("Stream processing completed.");
              resolve({
                status: true,
                result: result,
                chunks: chunks,
                models: this.modelList || [],
                state: this._se({
                  cookies: this.jar
                })
              });
            } catch (e) {
              resolve({
                status: false,
                result: null,
                chunks: [],
                models: this.modelList || [],
                state: this._se({
                  cookies: this.jar
                })
              });
            }
          });
          response.data.on("error", err => {
            this._log(`Stream error event: ${err?.message}`);
            resolve({
              status: false,
              result: null,
              chunks: [],
              models: this.modelList || [],
              state: this._se({
                cookies: this.jar
              })
            });
          });
        } catch (e) {
          this._log(`Stream listener error: ${e?.message}`);
          resolve({
            status: false,
            result: null,
            chunks: [],
            models: this.modelList || [],
            state: this._se({
              cookies: this.jar
            })
          });
        }
      });
    } catch (err) {
      this._log(`Chat execution error: ${err?.message || "Unknown Error"}`);
      return {
        status: false,
        result: null,
        chunks: [],
        models: this.modelList || [],
        state: this._se({
          cookies: this.jar
        })
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