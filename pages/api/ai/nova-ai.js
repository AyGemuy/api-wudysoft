import axios from "axios";
import WebSocket from "ws";
import crypto from "crypto";
class NovaAI {
  constructor() {
    try {
      this.client = null;
      this._init();
    } catch (e) {
      console.error("[LOG] Gagal mengeksekusi constructor:", e.message);
    }
  }
  _init() {
    try {
      console.log("[LOG] Menginisialisasi HTTP Client NovaAI...");
      this.client = axios.create({
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 15; RMX3890 Build/AQ3A.240812.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/150.0.7871.124 Mobile Safari/537.36",
          "Accept-Encoding": "gzip, deflate, br, zstd",
          "Content-Type": "application/json",
          "sec-ch-ua-platform": '"Android"',
          "x-app-version": "2",
          "sec-ch-ua": '"Not;A=Brand";v="8", "Chromium";v="150", "Android WebView";v="150"',
          "sec-ch-ua-mobile": "?1",
          origin: "https://localhost",
          "x-requested-with": "com.voicepulse.ai",
          "sec-fetch-site": "cross-site",
          "sec-fetch-mode": "cors",
          "sec-fetch-dest": "empty",
          referer: "https://localhost/",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          priority: "u=1, i"
        }
      });
    } catch (e) {
      console.error("[LOG] Gagal menginisialisasi HTTP Client:", e.message);
    }
  }
  _toSnakeCase(obj) {
    try {
      if (Array.isArray(obj)) {
        return obj.map(item => this._toSnakeCase(item));
      } else if (obj !== null && typeof obj === "object") {
        const newObj = {};
        for (const key of Object.keys(obj)) {
          const snakeKey = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
          newObj[snakeKey] = this._toSnakeCase(obj[key]);
        }
        return newObj;
      }
      return obj;
    } catch (e) {
      return obj;
    }
  }
  _findKey(obj, key) {
    try {
      if (obj && typeof obj === "object") {
        if (key in obj) return obj[key];
        for (const k of Object.keys(obj)) {
          const found = this._findKey(obj[k], key);
          if (found) return found;
        }
      }
      return null;
    } catch (e) {
      return null;
    }
  }
  async models() {
    console.log("[LOG] Menghubungkan ke Firebase RTB WebSocket untuk mengambil daftar model...");
    return new Promise((resolve, reject) => {
      try {
        const wsUrl = `wss://app-ai-2026-default-rtdb.europe-west1.firebasedatabase.app/.ws?v=5&p=1:1065080770160:android:98ffeb594d4e9d3c9a2eb5&ns=app-ai-2026-default-rtdb`;
        const ws = new WebSocket(wsUrl, {
          headers: {
            Pragma: "no-cache",
            "Cache-Control": "no-cache",
            "User-Agent": "Mozilla/5.0 (Linux; Android 15; RMX3890 Build/AQ3A.240812.002; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/143.0.7499.146 Mobile Safari/537.36",
            Origin: "https://localhost"
          }
        });
        let isResolved = false;
        let expectedChunks = 0;
        let chunkBuffer = [];
        ws.on("open", () => {
          console.log("[LOG] WebSocket Firebase terhubung.");
        });
        ws.on("message", data => {
          try {
            const rawData = data.toString().trim();
            if (/^\d+$/.test(rawData)) {
              expectedChunks = parseInt(rawData, 10);
              chunkBuffer = [];
              console.log(`[LOG] Terdeteksi fragmen data besar (${expectedChunks} frame). Menyiapkan buffer...`);
              return;
            }
            let completeData = rawData;
            if (expectedChunks > 0) {
              chunkBuffer.push(rawData);
              if (chunkBuffer.length < expectedChunks) {
                return;
              }
              console.log("[LOG] Seluruh fragmen data berhasil terkumpul, merekonstruksi payload...");
              completeData = chunkBuffer.join("");
              expectedChunks = 0;
              chunkBuffer = [];
            }
            const frame = JSON.parse(completeData);
            if (frame?.t === "c" && frame?.d?.t === "h") {
              console.log("[LOG] Handshake HELLO diterima. Mengirim inisiasi statistik dan registrasi query...");
              ws.send(JSON.stringify({
                t: "d",
                d: {
                  r: 1,
                  a: "s",
                  b: {
                    c: {
                      "sdk.js.12-12-0": 1,
                      "framework.cordova": 1
                    }
                  }
                }
              }));
              ws.send(JSON.stringify({
                t: "d",
                d: {
                  r: 2,
                  a: "q",
                  b: {
                    p: "/remote_models",
                    h: ""
                  }
                }
              }));
              ws.send(JSON.stringify({
                t: "d",
                d: {
                  r: 3,
                  a: "g",
                  b: {
                    p: "/app_config",
                    q: {}
                  }
                }
              }));
            }
            const chatModels = this._findKey(frame, "chatModels");
            if (chatModels) {
              console.log("[LOG] Konfigurasi chatModels berhasil ditemukan.");
              const parsedList = [];
              Object.values(chatModels).forEach(modelObj => {
                const mappedObj = {
                  ...modelObj,
                  id: modelObj.code || "",
                  premium: modelObj.isLocked || false,
                  context: modelObj.contextWindow || 4e3
                };
                parsedList.push(this._toSnakeCase(mappedObj));
              });
              isResolved = true;
              ws.close();
              resolve({
                status: true,
                result: parsedList
              });
            }
          } catch (e) {
            console.error("[LOG] Gagal parse frame data:", e.message);
          }
        });
        ws.on("close", () => {
          console.log("[LOG] Koneksi WebSocket Firebase ditutup.");
          if (!isResolved) {
            resolve({
              status: false,
              result: "Koneksi ditutup sebelum data model berhasil diambil"
            });
          }
        });
        ws.on("error", err => {
          console.error("[LOG] Error pada WebSocket Firebase:", err.message);
          reject(err);
        });
      } catch (e) {
        reject(e);
      }
    });
  }
  async chat({
    prompt,
    model = "google/gemini-2.5-flash-lite",
    messages = [],
    ...rest
  }) {
    try {
      console.log("[LOG] Menyiapkan request chat...");
      const payloadMessages = [...messages];
      if (prompt) {
        payloadMessages.push({
          role: "user",
          content: prompt
        });
      }
      const payload = {
        body: {
          model: model,
          messages: payloadMessages,
          stream: true,
          max_tokens: rest.max_tokens || 1200
        },
        stream: true,
        ...rest
      };
      console.log(`[LOG] Mengirim request POST ke Worker (Model: ${model})...`);
      const response = await this.client.post("https://aichat-silence-fedf.malika-zahrane-1958.workers.dev", payload, {
        responseType: "stream"
      });
      return new Promise(resolve => {
        let fullText = "";
        const chunks = [];
        let streamBuffer = "";
        response.data.on("data", chunk => {
          const rawChunk = chunk.toString();
          const lines = (streamBuffer + rawChunk).split("\n");
          streamBuffer = lines.pop() || "";
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const cleaned = line.slice(6).trim();
              if (cleaned && cleaned !== "[DONE]") {
                try {
                  const parsed = JSON.parse(cleaned);
                  chunks.push(parsed);
                  const content = parsed?.choices?.[0]?.delta?.content || parsed?.delta || "";
                  if (content) {
                    fullText += content;
                  }
                } catch (e) {
                  chunks.push({
                    raw: cleaned
                  });
                  fullText += cleaned;
                }
              }
            }
          }
        });
        response.data.on("end", () => {
          if (streamBuffer.startsWith("data: ")) {
            const cleaned = streamBuffer.slice(6).trim();
            if (cleaned && cleaned !== "[DONE]") {
              try {
                const parsed = JSON.parse(cleaned);
                chunks.push(parsed);
                const content = parsed?.choices?.[0]?.delta?.content || parsed?.delta || "";
                if (content) {
                  fullText += content;
                }
              } catch (e) {
                chunks.push({
                  raw: cleaned
                });
                fullText += cleaned;
              }
            }
          }
          console.log("[LOG] Aliran stream data selesai.");
          resolve({
            status: true,
            result: fullText,
            chunks: chunks
          });
        });
      });
    } catch (error) {
      console.error("[LOG] Error pada fungsi utama chat:", error?.message || error);
      return {
        status: false,
        result: error?.message || "Internal Worker API Error",
        chunks: []
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["models", "chat"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          models: "/?action=models",
          chat: "/?action=chat&prompt=Halo&model=poolside/laguna-xs-2.1:free"
        }
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new NovaAI();
  try {
    let response;
    switch (action) {
      case "models":
        response = await api.models();
        break;
      case "chat":
        if (!params.prompt && (!params.messages || params.messages.length === 0)) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' atau 'messages' wajib diisi untuk action 'chat'.",
            example: "/?action=chat&prompt=Halo"
          });
        }
        response = await api.chat(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons dari server NovaAI. Coba lagi nanti."
      });
    }
    if (response.status === false) {
      return res.status(400).json({
        status: false,
        action: action,
        ...response
      });
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}