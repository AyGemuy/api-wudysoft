import crypto from "crypto";
import WebSocket from "ws";
import axios from "axios";
class UseAi {
  constructor() {
    this.cookies = {};
    this.ax = axios.create({
      baseURL: "https://use.ai",
      timeout: 6e4,
      withCredentials: true
    });
    this.uid = "";
    this.mxId = "";
    this.devId = "";
    this.chId = "";
    this.ready = false;
    this.ax.interceptors.request.use(cfg => {
      try {
        const ck = this._ckStr();
        if (ck) cfg.headers["Cookie"] = ck;
      } catch (err) {
        this._log("Interceptor-Req-Error", err.message);
      }
      return cfg;
    }, err => Promise.reject(err));
    this.ax.interceptors.response.use(res => {
      try {
        const sc = res.headers?.["set-cookie"];
        if (sc && Array.isArray(sc)) {
          sc.forEach(c => {
            const [pair] = c.split(";");
            const [k, ...v] = pair.split("=");
            if (k) this.cookies[k.trim()] = v.join("=").trim();
          });
          this._log("Interceptor", "Berhasil memperbarui cookie lokal dari server.");
        }
      } catch (err) {
        this._log("Interceptor-Res-Error", err.message);
      }
      return res;
    }, err => Promise.reject(err));
  }
  _log(step, message, detail = "") {
    console.log(`[UseAi] [${step}] ${message}`, detail);
  }
  _uuid() {
    return crypto.randomUUID();
  }
  _msgId() {
    return crypto.randomBytes(8).toString("hex");
  }
  _ckStr() {
    return Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
  }
  _load(state) {
    try {
      if (!state) return [];
      const decoded = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
      this._log("State", `Berhasil memuat ${decoded.length} riwayat pesan.`);
      return decoded;
    } catch (err) {
      this._log("State-Error", "Gagal decode base64, gunakan array kosong.", err.message);
      return [];
    }
  }
  _save(msgs) {
    try {
      return Buffer.from(JSON.stringify(msgs)).toString("base64");
    } catch (err) {
      this._log("State-Error", "Gagal encode ke base64.", err.message);
      return "";
    }
  }
  async init() {
    try {
      this._log("Auto-Init", "Mengunjungi https://use.ai/id untuk mendapatkan cookie session...");
      await this.ax.get("/id", {
        headers: {
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "Accept-Language": "id,ms;q=0.9,en;q=0.8",
          "sec-ch-ua": '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "upgrade-insecure-requests": "1",
          "sec-fetch-site": "none",
          "sec-fetch-mode": "navigate",
          "sec-fetch-user": "?1",
          "sec-fetch-dest": "document",
          dnt: "1"
        }
      });
      this.uid = this.cookies["guest_user_id"] || this._uuid();
      this.mxId = this.cookies["guest_mixpanel_id"] || this._uuid();
      this.devId = this._uuid();
      this.chId = this._uuid();
      this.ready = true;
      this._log("Auto-Init", `Sukses membuat session. GuestID: ${this.uid}`);
      return this._save([]);
    } catch (err) {
      this._log("Auto-Init-Error", err.message);
      throw err;
    }
  }
  async chat({
    state,
    prompt,
    messages,
    ...rest
  }) {
    try {
      if (!this.ready || !this.uid || !state) {
        this._log("Chat", "Session kosong/belum siap. Menjalankan auto-init...");
        state = await this.init();
      }
      let history = this._load(state);
      if (messages && Array.isArray(messages)) {
        this._log("Chat", "Menggabungkan riwayat pesan eksternal.");
        history = [...history, ...messages];
      }
      if (prompt) {
        history.push({
          id: this._msgId(),
          role: "user",
          parts: [{
            type: "text",
            text: prompt
          }],
          metadata: {
            isDeepResearchMode: false,
            isWebSearchMode: false,
            isAgenticMode: false,
            isImageGenerationMode: false,
            needsBlurPreview: false,
            deepResearchProcessor: "pro-fast",
            ...rest.metadata || {}
          }
        });
      }
      const q = `userId=guest%3A${this.uid}&userType=guest&planType=free&isTestUser=false`;
      const chunks = [];
      let done = false;
      this._log("WebSocket", "Membuka jabat tangan WebSocket ke subdomain agents...");
      await new Promise((res, rej) => {
        try {
          const ws = new WebSocket(`wss://agents.use.ai/agents/budget-agent/${this.chId}?${q}`, {
            headers: {
              Host: "agents.use.ai",
              Upgrade: "websocket",
              Connection: "Upgrade",
              Pragma: "no-cache",
              "Cache-Control": "no-cache",
              "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
              Origin: "https://use.ai",
              "Accept-Language": "id,ms;q=0.9,en;q=0.8",
              Cookie: this._ckStr()
            }
          });
          const tm = setTimeout(() => {
            if (!done) {
              done = true;
              clearTimeout(tm);
              ws.terminate();
              this._log("WebSocket", "Koneksi diputus otomatis akibat batas waktu (Timeout).");
              rej(new Error("Timeout"));
            }
          }, 45e3);
          ws.on("open", () => {
            try {
              this._log("WebSocket", "Terhubung. Mengirim parameter prewarm...");
              ws.send(JSON.stringify({
                type: "prewarm",
                chatId: this.chId
              }));
            } catch (err) {
              this._log("WebSocket-Open-Error", err.message);
            }
          });
          ws.on("message", data => {
            if (done) return;
            try {
              let str = data.toString().trim();
              if (!str || ["p", "h", "s", "o"].includes(str)) return;
              if (str.startsWith("s ") || str.startsWith("o ")) str = str.substring(2).trim();
              if (!str.startsWith("{") && str.includes("{")) str = str.substring(str.indexOf("{")).trim();
              const p = JSON.parse(str);
              if (p.type === "cf_agent_identity" || p.name === this.chId) {
                this._log("WebSocket", "Identitas terverifikasi. Mengirim paket submit-message...");
                ws.send(JSON.stringify({
                  chatId: this.chId,
                  userId: `guest:${this.uid}`,
                  userType: "guest",
                  planType: "free",
                  cfModelsVariant: "OFF",
                  mixpanelUserId: this.mxId,
                  deviceId: this.devId,
                  isMobile: true,
                  isWebSearchMode: false,
                  isDeepResearchMode: false,
                  isImageGenerationMode: false,
                  agenticMode: false,
                  connectorsEnabled: false,
                  selectedModel: "gateway-gpt-5",
                  locale: "id",
                  userTimezone: "Asia/Jakarta",
                  userCountry: "Indonesia (ID)",
                  messages: history,
                  trigger: "submit-message",
                  source: "chat_page",
                  ...rest
                }));
              }
              if (p.chunk?.text || p.chunk?.content) {
                chunks.push(p.chunk.text || p.chunk.content);
              }
              if (p.type === "stream-complete" || p.chunk?.type === "finish") {
                this._log("WebSocket", "Menerima frame penutup stream-complete. Auto-closing...");
                done = true;
                clearTimeout(tm);
                ws.terminate();
                res();
              }
            } catch (err) {}
          });
          ws.on("error", e => {
            this._log("WebSocket-Error", e.message);
            if (!done) {
              done = true;
              clearTimeout(tm);
              ws.terminate();
              rej(e);
            }
          });
          ws.on("close", () => {
            this._log("WebSocket", "Koneksi tertutup sepenuhnya.");
            if (!done) {
              done = true;
              clearTimeout(tm);
              ws.terminate();
              res();
            }
          });
        } catch (err) {
          this._log("WebSocket-Promise-Error", err.message);
          rej(err);
        }
      });
      this._log("Chat", "Mengeksekusi pengambilan data hasil final (GET Chat)...");
      const r = await this.ax.get(`https://agents.use.ai/chat?id=${this.chId}`, {
        headers: {
          accept: "*/*",
          "accept-language": "id,ms;q=0.9,en;q=0.8",
          origin: "https://use.ai",
          referer: "https://use.ai/id",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Mobile Safari/537.36",
          "x-guest-user-id": `guest:${this.uid}`,
          "sec-ch-ua": '"Chromium";v="148", "Google Chrome";v="148", "Not/A)Brand";v="99"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      let reply = "";
      const fetched = r.data?.messages || [];
      if (fetched.length > 0) {
        const last = fetched[fetched.length - 1];
        if (last.role === "assistant") {
          reply = last.parts?.[0]?.text || "";
          history = fetched;
          this._log("Chat", "Berhasil melakukan sinkronisasi data dari router HTTP.");
        }
      }
      if (!reply && chunks.length > 0) {
        this._log("Chat", "HTTP data kosong, menggunakan rekonstruksi data dari chunks WebSocket.");
        reply = chunks.join("");
        history.push({
          id: this._msgId(),
          role: "assistant",
          parts: [{
            type: "text",
            text: reply
          }]
        });
      }
      return {
        status: true,
        result: reply || "Gagal menangkap respon.",
        chunks: chunks.length > 0 ? chunks : [reply],
        state: this._save(history)
      };
    } catch (err) {
      this._log("Chat-Error", err.message);
      return {
        status: false,
        result: err.message,
        chunks: [],
        state: state || ""
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
  const api = new UseAi();
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