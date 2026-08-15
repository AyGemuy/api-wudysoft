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
        if (this.uid) {
          cfg.headers["x-guest-user-id"] = `guest:${this.uid}`;
          cfg.headers["x-user-id"] = `guest:${this.uid}`;
        }
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
      this._log("Auto-Init", "Mendapatkan cookie session & landing info...");
      const commonHeaders = {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "*/*",
        "Accept-Language": "id-ID,id;q=0.9,en;q=0.8",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        referer: "https://use.ai/id"
      };
      await this.ax.get("/v1/auth/get-session?disableCookieCache=true", {
        headers: commonHeaders
      });
      await this.ax.get("/v1/landing-deferred?locale=id", {
        headers: commonHeaders
      });
      this.uid = this.cookies["guest_user_id"] || this._uuid();
      this.mxId = this.cookies["guest_mixpanel_id"] || this._uuid();
      this.devId = this.cookies["mp_device_id"] || this._uuid();
      this.chId = this._uuid();
      this.ready = true;
      this._log("Auto-Init", `Sukses membuat session. GuestID: ${this.uid}`);
      return this._save([]);
    } catch (err) {
      this._log("Auto-Init-Error", err.message);
      throw err;
    }
  }
  async getAppToken() {
    try {
      this._log("App-Attestation", "Meminta app attestation token...");
      const res = await this.ax.post("/v1/auth/app-attestation", {}, {
        headers: {
          "Content-Type": "application/json",
          origin: "https://use.ai",
          referer: `https://use.ai/id/${this.chId}`
        }
      });
      return res.data?.token || "";
    } catch (err) {
      this._log("App-Attestation-Error", err.message);
      return "";
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
            userId: `guest:${this.uid}`,
            createdAt: new Date().toISOString(),
            ...rest.metadata || {}
          }
        });
      }
      const appToken = await this.getAppToken();
      const wsUrl = `wss://use.ai/agent/agents/budget-agent/${this.chId}?app_token=${encodeURIComponent(appToken)}&userId=guest%3A${this.uid}&userType=guest&planType=free&isTestUser=false&botd_verdict=clean`;
      const chunks = [];
      let done = false;
      this._log("WebSocket", "Membuka jabat tangan WebSocket...");
      await new Promise((res, rej) => {
        try {
          const ws = new WebSocket(wsUrl, {
            headers: {
              Pragma: "no-cache",
              "Cache-Control": "no-cache",
              "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
              Origin: "https://use.ai",
              "Accept-Language": "id-ID",
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
              this._log("WebSocket", "Terhubung. Mengirim paket submit-message...");
              ws.send(JSON.stringify({
                chatId: this.chId,
                userId: `guest:${this.uid}`,
                userType: "guest",
                planType: "free",
                isFreemium: false,
                isTestUser: false,
                cfModelsVariant: "OFF",
                mixpanelUserId: this.mxId,
                deviceId: this.devId,
                isMobile: true,
                isWebSearchMode: false,
                isDeepResearchMode: false,
                isImageGenerationMode: false,
                agenticMode: false,
                isStandaloneImageMode: false,
                needsBlurPreview: false,
                deepResearchProcessor: "pro-fast",
                selectedModel: "gateway-gpt-5-4",
                locale: "id",
                userTimezone: "Asia/Makassar",
                userCountry: "Indonesia (ID)",
                messages: history,
                trigger: "submit-message",
                source: "chat_page",
                ...rest
              }));
            } catch (err) {
              this._log("WebSocket-Open-Error", err.message);
            }
          });
          ws.on("message", data => {
            if (done) return;
            try {
              const str = data.toString().trim();
              if (!str) return;
              const p = JSON.parse(str);
              chunks.push(p);
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
      const reply = chunks.map(p => p.chunk?.delta || p.chunk?.text || p.chunk?.content || "").join("");
      if (reply) {
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
        chunks: chunks,
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