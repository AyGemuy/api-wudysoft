import axios from "axios";
import crypto from "crypto";
class Genora {
  constructor() {
    this.cfg = {
      base: "https://generic.mindlinktechnology.com",
      key: "secure-app-v1",
      sec: "7f6d9948a773fc7b1613cbfc85462a650fc4559f2deb3cd5319ad486b6a9450d",
      m_txt: "gemini-3-flash-preview",
      m_img: "gemini-3.1-flash-image-preview",
      limT: "3",
      limI: "3"
    };
    this.modes = ["chat", "image"];
    try {
      this.axios = axios.create({
        baseURL: this.cfg.base,
        headers: {
          "Content-Type": "application/json"
        }
      });
      this.axios.interceptors.request.use(config => {
        try {
          const auth = this._sign();
          if (auth && typeof auth === "object" && auth.status === false) {
            return Promise.reject(new Error(auth.result));
          }
          config.headers["Authorization"] = auth;
          config.headers["X-Device-ID"] = this._id();
          config.headers["X-Premium-Status"] = "false";
          config.headers["X-Daily-Text-Limit"] = this.cfg.limT;
          config.headers["X-Daily-Image-Limit"] = this.cfg.limI;
          return config;
        } catch (err) {
          console.error("[Interceptor Error]", err.message);
          return Promise.reject(err);
        }
      });
      console.log("[Genora] Axios instance initialized.");
    } catch (err) {
      console.error("[Constructor Error]", err.message);
    }
  }
  _sign() {
    try {
      if (!this.cfg.key || !this.cfg.sec) {
        return {
          status: false,
          result: "HMAC Key or Secret missing",
          chunks: []
        };
      }
      const ts = Math.floor(Date.now() / 1e3);
      const nonce = Math.random().toString(36).substring(2);
      const data = `${this.cfg.key}:${ts}:${nonce}`;
      const hmac = crypto.createHmac("sha256", this.cfg.sec);
      hmac.update(data);
      const sign = hmac.digest("hex");
      return `HMAC-SHA256 ${this.cfg.key}:${ts}:${nonce}:${sign}`;
    } catch (err) {
      console.error("[Sign Error]", err.message);
      return {
        status: false,
        result: err.message,
        chunks: []
      };
    }
  }
  _id() {
    try {
      return crypto.randomBytes(16).toString("hex");
    } catch (err) {
      console.error("[DevId Error]", err.message);
      return "unknown_device";
    }
  }
  async _post(url, dto, options = {}) {
    try {
      const res = await this.axios.post(url, dto, options);
      return {
        status: true,
        result: res.data,
        chunks: []
      };
    } catch (err) {
      console.error(`[Post Error] ${url}:`, err.message);
      return {
        status: false,
        result: err.response?.data || err.message,
        chunks: []
      };
    }
  }
  _parse(stream) {
    return new Promise(resolve => {
      try {
        let buffer = "";
        const jsonChunks = [];
        stream.on("data", chunk => {
          try {
            buffer += chunk.toString();
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";
            for (let line of lines) {
              line = line.trim();
              if (line.startsWith("data:")) {
                const jsonStr = line.slice(5).trim();
                try {
                  const parsed = JSON.parse(jsonStr);
                  jsonChunks.push(parsed);
                } catch (e) {}
              }
            }
          } catch (err) {
            console.error("[Stream Chunk Process Error]", err.message);
          }
        });
        stream.on("end", () => {
          try {
            if (buffer.trim().startsWith("data:")) {
              const jsonStr = buffer.trim().slice(5).trim();
              try {
                const parsed = JSON.parse(jsonStr);
                jsonChunks.push(parsed);
              } catch (e) {}
            }
            if (jsonChunks.length === 0) {
              return resolve({
                status: false,
                result: "Stream selesai tanpa data chunk",
                chunks: []
              });
            }
            const finalResponse = JSON.parse(JSON.stringify(jsonChunks[0]));
            if (finalResponse?.candidates?.[0]?.content?.parts?.[0]) {
              const fullText = jsonChunks.map(c => c?.candidates?.[0]?.content?.parts?.[0]?.text).filter(Boolean).join("");
              finalResponse.candidates[0].content.parts[0].text = fullText;
            } else if (finalResponse?.choices?.[0]?.delta) {
              const fullContent = jsonChunks.map(c => c?.choices?.[0]?.delta?.content).filter(Boolean).join("");
              finalResponse.choices[0].message = {
                role: finalResponse.choices[0].delta.role || "assistant",
                content: fullContent
              };
              delete finalResponse.choices[0].delta;
            } else if (finalResponse?.text !== undefined) {
              finalResponse.text = jsonChunks.map(c => c.text).filter(Boolean).join("");
            }
            const lastChunk = jsonChunks[jsonChunks.length - 1];
            if (lastChunk?.usageMetadata) {
              finalResponse.usageMetadata = lastChunk.usageMetadata;
            } else if (lastChunk?.usage) {
              finalResponse.usage = lastChunk.usage;
            }
            return resolve({
              status: true,
              result: finalResponse,
              chunks: jsonChunks
            });
          } catch (err) {
            return resolve({
              status: false,
              result: err.message,
              chunks: jsonChunks
            });
          }
        });
        stream.on("error", err => {
          return resolve({
            status: false,
            result: `Stream event error: ${err.message}`,
            chunks: jsonChunks
          });
        });
      } catch (err) {
        console.error("[Stream Reader Internal Error]", err.message);
        return resolve({
          status: false,
          result: err.message,
          chunks: []
        });
      }
    });
  }
  async chat({
    mode,
    prompt,
    messages = [],
    ...rest
  }) {
    try {
      if (!mode) {
        return {
          status: false,
          result: `Parameter "mode" wajib diisi. Pilihan: ${this.modes.join(", ")}`,
          chunks: []
        };
      }
      const m = mode.toLowerCase();
      if (!this.modes.includes(m)) {
        return {
          status: false,
          result: `Mode "${mode}" tidak tersedia. List: ${this.modes.join(", ")}`,
          chunks: []
        };
      }
      if (!prompt) {
        return {
          status: false,
          result: "Parameter prompt wajib diisi.",
          chunks: []
        };
      }
      messages.push({
        role: "user",
        parts: [{
          text: prompt
        }]
      });
      switch (m) {
        case "image": {
          const model = rest.model || this.cfg.m_img;
          const dto = {
            contents: messages,
            generationConfig: rest.generationConfig || {},
            ...rest
          };
          return await this._post(`/ai/vision/image/genora/${model}`, dto);
        }
        case "chat": {
          const model = rest.model || this.cfg.m_txt;
          const dto = {
            contents: messages,
            generationConfig: rest.generationConfig || {},
            ...rest
          };
          const res = await this._post(`/ai/vision/stream/genora/${model}`, dto, {
            responseType: "stream"
          });
          if (res && res.status === false) return res;
          return await this._parse(res.result);
        }
        default:
          return {
            status: false,
              result: `Unhandled mode scenario: ${mode}`,
              chunks: []
          };
      }
    } catch (err) {
      console.error(`[Chat Method Error] [Gemini] [${mode}]:`, err.response?.data || err.message);
      return {
        status: false,
        result: err.response?.data || err.message,
        chunks: []
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new Genora();
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