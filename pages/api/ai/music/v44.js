import axios from "axios";
import apiConfig from "@/configs/apiConfig";
class MakeSongClient {
  constructor() {
    try {
      this.base = "https://shipnewoo.vercel.app";
      this.fallback = "https://www.makesong.com";
      this.jar = {};
      this.email = null;
      this.csrf = null;
      this.api = axios.create({
        timeout: 6e4,
        maxRedirects: 5,
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=1, i",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      this.mailApi = axios.create({
        baseURL: `https://${apiConfig.DOMAIN_URL}`,
        timeout: 6e4,
        headers: {
          accept: "*/*",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      this.api.interceptors.response.use(res => {
        try {
          const sc = res.headers["set-cookie"];
          if (sc) {
            sc.forEach(c => {
              const [pair] = c.split(";");
              const [k, v] = pair.split("=");
              if (k && v) this.jar[k.trim()] = v.trim();
            });
          }
        } catch (e) {
          console.log("[Error Interceptor Cookie]:", e.message);
        }
        return res;
      }, async err => {
        try {
          if (err.config && !err.config._retry && this.base.includes("shipnewoo.vercel.app")) {
            console.log(`[!] Mengalihkan ke fallback host: ${this.fallback}`);
            err.config._retry = true;
            this.base = this.fallback;
            err.config.url = err.config.url.replace("https://shipnewoo.vercel.app", this.fallback);
            return this.api(err.config);
          }
        } catch (e) {
          console.log("[Error Interceptor Fallback]:", e.message);
        }
        return Promise.reject(err);
      });
      console.log("[Init] Client berhasil diinisialisasi");
    } catch (e) {
      console.log("[Init Error]:", e.message);
    }
  }
  _getCook() {
    try {
      if (!this.jar["NEXT_LOCALE"]) this.jar["NEXT_LOCALE"] = "en";
      return Object.entries(this.jar).map(([k, v]) => `${k}=${v}`).join("; ");
    } catch (e) {
      console.log("[Error _getCook]:", e.message);
      return "";
    }
  }
  _ldState(st) {
    try {
      if (!st) return;
      const d = JSON.parse(Buffer.from(st, "base64").toString("utf8"));
      this.jar = d.jar || {};
      this.email = d.email || null;
      this.csrf = d.csrf || null;
      console.log("[Proses] Sesi loaded dari base64 state");
    } catch (e) {
      console.log("[Error _ldState]:", e.message);
    }
  }
  _dpState() {
    try {
      return Buffer.from(JSON.stringify({
        jar: this.jar,
        email: this.email,
        csrf: this.csrf
      })).toString("base64");
    } catch (e) {
      console.log("[Error _dpState]:", e.message);
      return "";
    }
  }
  async _getCsrf() {
    try {
      console.log("[Proses] Ambil CSRF...");
      const r = await this.api.get(`${this.base}/api/auth/csrf`, {
        headers: {
          cookie: this._getCook(),
          referer: `${this.base}/ai-music-generator`
        }
      });
      this.csrf = r.data?.csrfToken || this.csrf;
      if (this.csrf) {
        this.jar["__Host-authjs.csrf-token"] = `${this.csrf}%7C` + (this.jar["__Host-authjs.csrf-token"]?.split("%7C")?.[1] || "");
      }
      console.log(`[Sukses] CSRF terupdate: ${this.csrf}`);
      return this.csrf;
    } catch (e) {
      console.log("[Error _getCsrf]:", e.message);
      return null;
    }
  }
  async _auth() {
    try {
      console.log("[Proses] Registrasi email baru...");
      const mRes = await this.mailApi.get("/api/mails/v9?action=create");
      this.email = mRes.data?.email || null;
      if (!this.email) throw new Error("Gagal dapat temp mail");
      console.log(`[Sukses] Email: ${this.email}`);
      await this._getCsrf();
      console.log("[Proses] Request OTP code...");
      await this.api.post(`${this.base}/api/auth/send-verification-code`, {
        email: this.email
      }, {
        headers: {
          cookie: this._getCook(),
          origin: this.base,
          referer: `${this.base}/ai-music-generator`
        }
      });
      let code = null;
      let attempts = 0;
      const maxAttempts = 60;
      console.log("[Proses] Polling cek inbox OTP (while loop)...");
      while (!code && attempts < maxAttempts) {
        attempts++;
        console.log(`[Proses] Cek Inbox OTP (Percobaan ${attempts}/${maxAttempts})...`);
        const inbox = await this.mailApi.get(`/api/mails/v9?action=message&email=${this.email}`);
        const text = inbox.data?.data?.[0]?.text_content || "";
        code = (text.match(/\b\d{6}\b/) || [])[0];
        if (!code) {
          await new Promise(r => setTimeout(r, 3e3));
        }
      }
      if (!code) throw new Error("OTP tidak ditemukan setelah batas waktu habis");
      console.log(`[Sukses] OTP didapatkan: ${code}`);
      console.log("[Proses] Submit OTP verification...");
      await this.api.post(`${this.base}/api/auth/callback/verification-code?`, `email=${encodeURIComponent(this.email)}&code=${code}&redirect=false&csrfToken=${this.csrf}&callbackUrl=${encodeURIComponent(this.base + "/ai-music-generator")}`, {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          cookie: this._getCook(),
          origin: this.base,
          referer: `${this.base}/ai-music-generator`,
          "x-auth-return-redirect": "1"
        }
      });
      console.log("[Proses] Sinkronisasi data tracking...");
      await this.api.post(`${this.base}/api/user/sync-tracking`, {
        first_visit_url: `${this.base}/ai-music-generator`,
        visit_timestamp: new Date().toISOString(),
        referrer: "",
        referrer_domain: "",
        traffic_source: "direct",
        source_name: "Direct",
        device_type: "mobile",
        signup_country: "ID",
        user_ip: "",
        hasInitialized: true
      }, {
        headers: {
          cookie: this._getCook(),
          origin: this.base,
          referer: `${this.base}/ai-music-generator`
        }
      });
      console.log("[Proses] Claim daily free credits...");
      await this.api.get(`${this.base}/api/user/daily-credits`, {
        headers: {
          cookie: this._getCook(),
          referer: `${this.base}/ai-music-generator`
        }
      });
      console.log("[Sukses] Registrasi akun selesai");
    } catch (e) {
      console.log("[Error _auth]:", e.message);
      throw e;
    }
  }
  async _ensure() {
    try {
      const hasSess = this.jar["__Secure-authjs.session-token"] || this.jar["__Host-authjs.session-token"];
      if (!hasSess) {
        console.log("[Peringatan] Sesi kosong, memicu auto-auth...");
        await this._auth();
      }
    } catch (e) {
      console.log("[Error _ensure]:", e.message);
      throw e;
    }
  }
  async create({
    state,
    prompt,
    ...rest
  }) {
    try {
      console.log("[Mulai] Menjalankan fungsi create...");
      if (state) this._ldState(state);
      await this._ensure();
      console.log("[Proses] Sending task create payload...");
      const res = await this.api.post(`${this.base}/api/music/generate`, {
        expectAiModel: rest.expectAiModel || "suno",
        inputType: rest.inputType || "20",
        makeInstrumental: rest.makeInstrumental || "false",
        title: rest.title || "Untitled",
        continueClipId: rest.continueClipId || "",
        continueAt: rest.continueAt || "",
        mvVersion: rest.mvVersion || "chirp-v5",
        callbackUrl: rest.callbackUrl || "",
        prompt: prompt || "A beautiful piano instrumental",
        tags: rest.tags || "Piano, Instrumental",
        negativeTags: rest.negativeTags || "",
        styleInfluence: rest.styleInfluence || 53
      }, {
        headers: {
          cookie: this._getCook(),
          origin: this.base,
          referer: `${this.base}/ai-music-generator`
        }
      });
      console.log("[Sukses] Fungsi create berhasil dieksekusi");
      return {
        status: true,
        result: res.data?.data || res.data,
        state: this._dpState()
      };
    } catch (e) {
      console.log("[Error create]:", e.message);
      return {
        status: false,
        result: e.message,
        state: this._dpState()
      };
    }
  }
  async status({
    state,
    id,
    ...rest
  }) {
    try {
      console.log("[Mulai] Menjalankan fungsi status...");
      if (state) this._ldState(state);
      await this._ensure();
      const tid = id || rest.taskBatchId;
      console.log(`[Proses] Fetching status task: ${tid}`);
      const res = await this.api.get(`${this.base}/api/music/status?taskBatchId=${tid}`, {
        headers: {
          cookie: this._getCook(),
          referer: `${this.base}/ai-music-generator`
        }
      });
      console.log("[Sukses] Fungsi status berhasil dieksekusi");
      return {
        status: true,
        result: res.data?.data || res.data,
        state: this._dpState()
      };
    } catch (e) {
      console.log("[Error status]:", e.message);
      return {
        status: false,
        result: e.message,
        state: this._dpState()
      };
    }
  }
  async chat({
    state,
    prompt,
    messages = [],
    ...rest
  }) {
    try {
      console.log("[Mulai] Menjalankan fungsi chat...");
      if (state) this._ldState(state);
      await this._ensure();
      let payloadMessages = [...messages];
      if (payloadMessages.length === 0) {
        payloadMessages.push({
          role: "assistant",
          content: "Hi! I'm your MakeSong assistant. I can help you with lyrics writing, song descriptions, creative ideas, and more. What would you like to work on today?"
        });
      }
      if (prompt) {
        payloadMessages.push({
          role: "user",
          content: prompt
        });
      }
      console.log("[Proses] Sending payload to ChatGPT assistant api...");
      const res = await this.api.post(`${this.base}/api/chat/chatgpt`, {
        messages: payloadMessages
      }, {
        headers: {
          "content-type": "application/json",
          cookie: this._getCook(),
          origin: this.base,
          referer: `${this.base}/ai-music-generator`
        }
      });
      console.log("[Sukses] Fungsi chat berhasil dieksekusi");
      return {
        status: true,
        result: res.data?.data || res.data,
        state: this._dpState()
      };
    } catch (e) {
      console.log("[Error chat]:", e.message);
      return {
        status: false,
        result: e.message,
        state: this._dpState()
      };
    }
  }
  async info({
    state
  }) {
    try {
      console.log("[Mulai] Menjalankan fungsi info...");
      if (state) this._ldState(state);
      await this._ensure();
      console.log("[Proses] Fetching user credits-info...");
      const res = await this.api.get(`${this.base}/api/user/credits-info`, {
        headers: {
          cookie: this._getCook(),
          referer: `${this.base}/ai-music-generator`
        }
      });
      console.log("[Sukses] Fungsi info berhasil dieksekusi");
      return {
        status: true,
        result: res.data?.data || res.data,
        state: this._dpState()
      };
    } catch (e) {
      console.log("[Error info]:", e.message);
      return {
        status: false,
        result: e.message,
        state: this._dpState()
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["chat", "info", "create", "status"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=create&prompt=test"
      }
    });
  }
  const api = new MakeSongClient();
  try {
    let response;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'chat'."
          });
        }
        response = await api.chat(params);
        break;
      case "info":
        if (!params.state) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'state' wajib diisi untuk action 'info'."
          });
        }
        response = await api.info(params);
        break;
      case "create":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'create'."
          });
        }
        response = await api.create(params);
        break;
      case "status":
        if (!params.state || !params.id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'state' dan 'id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
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
      message: "Terjadi kesalahan internal pada server.",
      error: error.message || "Unknown Error"
    });
  }
}