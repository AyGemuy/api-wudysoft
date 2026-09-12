import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
class DuskClient {
  constructor() {
    this.jar = new CookieJar();
    this.api = wrapper(axios.create({
      baseURL: "https://duskai.io/api",
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://duskai.io",
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
    }));
    this.mailUrl = `https://${apiConfig.DOMAIN_URL}/api/mails/v9`;
    this.uid = null;
    this.did = crypto.randomUUID();
    this.api.defaults.headers["cookie"] = `dusk_did=${this.did}`;
  }
  _log(m, type = "INFO") {
    console.log(`[${new Date().toISOString()}] [${type}] ${m}`);
  }
  _rnd() {
    const s = crypto.randomBytes(4).toString("hex");
    return {
      user: s,
      pass: crypto.randomBytes(8).toString("hex")
    };
  }
  _toSnakeCase(obj) {
    if (Array.isArray(obj)) {
      return obj.map(v => this._toSnakeCase(v));
    } else if (obj !== null && obj !== undefined && obj.constructor === Object) {
      return Object.keys(obj).reduce((acc, key) => {
        const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        acc[snakeKey] = this._toSnakeCase(obj[key]);
        return acc;
      }, {});
    }
    return obj;
  }
  async _rState(state) {
    try {
      if (!state) return null;
      const parsed = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
      if (parsed.cookies) {
        for (const c of parsed.cookies) {
          await this.jar.setCookie(c, "https://duskai.io");
        }
      }
      this.uid = parsed.userId || this.uid;
      this.did = parsed.deviceId || this.did;
      this.api.defaults.headers["cookie"] = `dusk_did=${this.did}`;
      this._log("State b64 berhasil dipulihkan.");
      return parsed;
    } catch (e) {
      this._log(`Gagal memproses state b64: ${e.message}`, "WARN");
      return null;
    }
  }
  async _dState() {
    try {
      const cookies = await this.jar.getCookies("https://duskai.io");
      const data = {
        cookies: cookies.map(c => c.toString()),
        userId: this.uid,
        deviceId: this.did
      };
      return Buffer.from(JSON.stringify(data)).toString("base64");
    } catch (e) {
      this._log(`Gagal membuat dump state: ${e.message}`, "WARN");
      return "";
    }
  }
  async _fetchSession() {
    try {
      this._log("Mengambil detail session terbaru dari API...");
      this.api.defaults.headers["referer"] = "https://duskai.io/discover";
      const res = await this.api.get("/auth/session");
      delete this.api.defaults.headers["referer"];
      if (res.data?.userId) {
        this.uid = res.data.userId;
        this._log(`UserId berhasil diperbarui dari session: ${this.uid}`);
        return true;
      }
    } catch (e) {
      this._log(`Gagal sinkronisasi session API: ${e.message}`, "WARN");
    }
    return false;
  }
  async _ensureState(state) {
    if (state) {
      await this._rState(state);
      if (!this.uid) {
        await this._fetchSession();
      }
    } else if (!this.uid) {
      this._log("State kosong dan sesi belum ada. Menjalankan auto-register...", "WARN");
      const reg = await this.register();
      if (!reg.status) {
        throw new Error(`Auto-registration gagal: ${reg.result.error_message}`);
      }
    }
  }
  _formatAvatar(path) {
    if (!path) return "";
    if (path.startsWith("http")) return path;
    return `https://duskai.io${path}`;
  }
  async register() {
    try {
      this._log("Membuat email baru via API Wudysoft...");
      const mRes = await axios.get(`${this.mailUrl}?action=create`);
      const email = mRes.data?.email || null;
      if (!email) throw new Error("Gagal mendapatkan alamat email baru");
      this._log(`Email berhasil dialokasikan: ${email}`);
      const {
        user,
        pass
      } = this._rnd();
      this._log(`Mengirim payload pendaftaran untuk user: ${user}`);
      this.api.defaults.headers["referer"] = "https://duskai.io/login";
      await this.api.post("/auth", {
        action: "register",
        username: user,
        email: email,
        password: pass,
        birthYear: 2001,
        deviceId: this.did,
        tosAgreed: true
      });
      delete this.api.defaults.headers["referer"];
      this._log("Pendaftaran dikirim. Memulai pemindaian inbox OTP...");
      let token = null;
      const attempts = Array.from({
        length: 10
      });
      for (const _ of attempts) {
        await new Promise(r => setTimeout(r, 3e3));
        const check = await axios.get(`${this.mailUrl}?action=message&email=${email}`);
        const msg = check.data?.data?.[0]?.text_content || "";
        const match = msg.match(/token=([a-f0-9]+)/);
        if (match?.[1]) {
          token = match[1];
          break;
        }
      }
      if (!token) throw new Error("Token link konfirmasi email tidak ditemukan / timeout");
      this._log(`Token verifikasi ditemukan: ${token}`);
      const customHeaders = {
        accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        priority: "u=0, i",
        "sec-fetch-dest": "document",
        "sec-fetch-mode": "navigate",
        "sec-fetch-site": "none",
        "sec-fetch-user": "?1",
        "upgrade-insecure-requests": "1"
      };
      await this.api.get(`/auth/verify-email?token=${token}`, {
        headers: customHeaders
      });
      this._log("Verifikasi email berhasil, memicu inisialisasi session cookie...");
      await this.api.get("/characters?public=true");
      await this._fetchSession();
      if (!this.uid) {
        throw new Error("Gagal mendapatkan userId asli dari session setelah registrasi.");
      }
      return {
        status: true,
        result: {
          user_id: this.uid,
          device_id: this.did,
          account_email: email,
          account_username: user,
          account_password: pass
        },
        state: await this._dState()
      };
    } catch (e) {
      this._log(`Proses registrasi gagal: ${e.message}`, "ERROR");
      return {
        status: false,
        result: {
          error_message: e.message
        },
        state: null
      };
    }
  }
  async search({
    state,
    query = "raiden",
    ...rest
  } = {}) {
    try {
      this._log(`Melakukan pencarian karakter dengan kriteria query: "${query || ""}"`);
      await this._ensureState(state);
      const endpoints = ["/characters?public=true", "/characters/discover"];
      const rawCharacters = [];
      for (const endpoint of endpoints) {
        try {
          const res = await this.api.get(endpoint);
          const characters = res.data?.characters || [];
          rawCharacters.push(...characters);
        } catch (err) {
          this._log(`Gagal memuat data dari ${endpoint}: ${err.message}`, "WARN");
        }
      }
      const combined = [];
      for (const item of rawCharacters) {
        if (!combined.find(c => c.id === item.id)) {
          combined.push(item);
        }
      }
      const filtered = combined.filter(c => {
        const q = (query || "").toLowerCase();
        const matchesName = c.name?.toLowerCase().includes(q);
        const matchesDesc = c.descriptionShort?.toLowerCase().includes(q);
        const matchesTags = c.tags?.some(t => t.toLowerCase().includes(q));
        return !q || matchesName || matchesDesc || matchesTags;
      }).map(c => {
        const normalized = {
          char_id: c.id,
          ...c,
          avatar: this._formatAvatar(c.avatar)
        };
        return this._toSnakeCase(normalized);
      }).sort((a, b) => (b.chat_count || 0) - (a.chat_count || 0));
      return {
        status: true,
        result: filtered,
        state: await this._dState()
      };
    } catch (e) {
      this._log(`Gagal memproses fungsi search: ${e.message}`, "ERROR");
      return {
        status: false,
        result: {
          error_message: e.message
        },
        state: null
      };
    }
  }
  async chat({
    state,
    prompt = "Halo!",
    char_id = "custom_baac93d9",
    conv_id,
    ...rest
  }) {
    try {
      this._log(`Mempersiapkan pengiriman chat ke karakter: ${char_id}`);
      await this._ensureState(state);
      this._log(`Mengambil info detail karakter untuk ID: ${char_id}...`);
      let charInfo = null;
      try {
        const infoRes = await this.api.get(`/characters?charId=${char_id}`);
        if (infoRes.data) {
          const normalizedChar = {
            char_id: infoRes.data.id,
            ...infoRes.data,
            avatar: this._formatAvatar(infoRes.data.avatar)
          };
          charInfo = this._toSnakeCase(normalizedChar);
        }
      } catch (err) {
        this._log(`Gagal mengambil data info karakter: ${err.message}. Melanjutkan chat tanpa info tambahan.`, "WARN");
      }
      let activeConvId = conv_id || null;
      if (!activeConvId) {
        this._log("Mengecek riwayat conversation ID yang sudah aktif sebelumnya...");
        try {
          const convRes = await this.api.get(`/conversations?userId=${this.uid || ""}`);
          const list = convRes.data?.conversations || [];
          const found = list.find(c => c.characterId === char_id);
          if (found?.id) {
            activeConvId = found.id;
          }
        } catch (err) {
          this._log(`Endpoint /conversations tidak merespon: ${err.message}. Mencoba alternatif /chat/history...`, "WARN");
        }
        if (!activeConvId) {
          try {
            this._log(`Mencari active session room via /chat/history...`);
            this.api.defaults.headers["referer"] = `https://duskai.io/chat?character=${char_id}`;
            const histRes = await this.api.get(`/chat/history?userId=${this.uid}&characterId=${char_id}`);
            if (histRes.data?.conversationId) {
              activeConvId = histRes.data.conversationId;
              this._log(`Conversation ID ditemukan dari history: ${activeConvId}`);
            }
          } catch (histErr) {
            this._log(`Gagal mengambil dari /chat/history: ${histErr.message}`, "WARN");
          }
        }
        if (!activeConvId) {
          activeConvId = crypto.randomUUID();
          this._log(`Tidak ada riwayat lama. Membuat conversation ID baru: ${activeConvId}`);
        }
      }
      this.api.defaults.headers["referer"] = `https://duskai.io/chat?character=${char_id}`;
      const response = await this.api.post("/chat", {
        userId: this.uid,
        characterId: char_id,
        message: prompt,
        persona: "",
        responseMode: "normal",
        conversationId: activeConvId,
        isRetry: false,
        ...rest
      }, {
        responseType: "stream"
      });
      delete this.api.defaults.headers["referer"];
      let fullText = "";
      let buffer = "";
      await new Promise((resolve, reject) => {
        response.data.on("data", chunk => {
          buffer += chunk.toString("utf-8");
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";
          for (const line of lines) {
            const trimmedLine = line.trim();
            if (trimmedLine.startsWith("data: ")) {
              const raw = trimmedLine.slice(6).trim();
              if (raw === "[DONE]") break;
              try {
                const json = JSON.parse(raw);
                if (json?.text) {
                  fullText += json.text;
                }
              } catch (_) {}
            }
          }
        });
        response.data.on("end", () => {
          if (buffer.trim().startsWith("data: ")) {
            const raw = buffer.trim().slice(6).trim();
            try {
              const json = JSON.parse(raw);
              if (json?.text) fullText += json.text;
            } catch (_) {}
          }
          resolve();
        });
        response.data.on("error", err => reject(err));
      });
      return {
        status: true,
        result: {
          text: fullText || "No response details received",
          conv_id: activeConvId,
          character: charInfo
        },
        state: await this._dState()
      };
    } catch (e) {
      this._log(`Gagal memproses pengiriman chat: ${e.message}`, "ERROR");
      return {
        status: false,
        result: {
          error_message: e.message
        },
        state: null
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["search", "chat"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          search: "/?action=search&query=neon",
          chat: "/?action=generate&text=Hello&slug=beef-tv-series-font"
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
  const api = new DuskClient();
  try {
    let response;
    switch (action) {
      case "search":
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'.",
            example: "/?action=search&query=raiden"
          });
        }
        response = await api.search(params);
        break;
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'chat'.",
            example: "/?action=chat&query=raiden"
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
        error: "Tidak ada respons. Coba lagi nanti."
      });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server scraper.",
      error: error.message || "Unknown Error"
    });
  }
}