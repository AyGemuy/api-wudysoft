import crypto from "crypto";
import axios from "axios";
import WebSocket from "ws";
import qs from "qs";
class MateAIClient {
  constructor() {
    console.log("[LOG] Menginisiasi instansi MateAIClient...");
    try {
      this.deviceId = crypto.randomUUID().replace(/-/g, "").toUpperCase();
      this.uid = null;
      this.freeUsage = null;
      this.baseUrl = "https://wenan.saetatech.com";
      this.wsUrl = "wss://chatai.saetatech.com/wss";
      this.headers = {
        "User-Agent": "okhttp/4.10.0",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/x-www-form-urlencoded",
        "language-code": "en"
      };
      console.log(`[LOG] Perangkat disiapkan. Device ID: ${this.deviceId}`);
    } catch (err) {
      console.error("[LOG] Gagal menginisiasi instansi:", err?.message || err);
    }
  }
  _k(obj) {
    console.log("[LOG] Memformat ulang key result menjadi snake_case...");
    try {
      if (obj === null || typeof obj !== "object") {
        return obj;
      }
      if (Array.isArray(obj)) {
        return obj.map(item => this._k(item));
      }
      return Object.keys(obj).reduce((acc, key) => {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        acc[snakeKey] = this._k(obj[key]);
        return acc;
      }, {});
    } catch (err) {
      console.error("[LOG] Gagal memformat key menjadi snake_case:", err?.message || err);
      return obj;
    }
  }
  _h(data) {
    console.log("[LOG] Menghitung MD5 hash...");
    try {
      if (!data) {
        console.warn("[LOG] Data kosong pada hash helper.");
        return "";
      }
      return crypto.createHash("md5").update(data, "utf-8").digest("hex");
    } catch (err) {
      console.error("[LOG] Kesalahan pada helper _h:", err?.message || err);
      return "";
    }
  }
  _s(body) {
    console.log("[LOG] Memproses pembuatan signature payload...");
    try {
      if (!body) {
        console.warn("[LOG] Body kosong pada signature helper.");
        return "";
      }
      const uuid = body.uuid || this.deviceId;
      const hashResult = this._h(uuid + "gys554");
      const key = hashResult ? hashResult.substring(3, 8) : "";
      const sortedKeys = Object.keys(body).sort();
      const pairs = [];
      for (const k of sortedKeys) {
        if (["sign", "content", "keyword", "base64"].includes(k)) continue;
        const val = body[k];
        if (val === null || val === undefined || String(val) === "" || String(val).toLowerCase() === "null") continue;
        if (typeof val === "string" && val.includes("[")) continue;
        pairs.push(`${k}=${val}`);
      }
      const signStr = `keyValue=${key}&${pairs.join("&")}`;
      return this._h(signStr).toUpperCase();
    } catch (err) {
      console.error("[LOG] Kesalahan pada helper _s:", err?.message || err);
      return "";
    }
  }
  _p(params = {}, activeToken = null) {
    console.log("[LOG] Menyusun parameter payload ter-sign via qs...");
    try {
      const payload = {
        pid: "115",
        os_type: "1",
        channel: "wab_admin",
        version: "1.5.0",
        sver: "15",
        mobile_model: "realme",
        uuid: this.deviceId,
        uid: activeToken || this.uid || "",
        timestamp: String(Math.floor(Date.now() / 1e3)),
        noncestr: crypto.randomBytes(16).toString("hex"),
        ...params
      };
      payload.sign = this._s(payload);
      return qs.stringify(payload);
    } catch (err) {
      console.error("[LOG] Kesalahan pada helper _p:", err?.message || err);
      return "";
    }
  }
  async _f(activeToken = null) {
    console.log("[LOG] Mengambil batas penggunaan gratis (free usage)...");
    try {
      const targetToken = activeToken || this.uid;
      if (!targetToken) {
        console.error("[LOG] UID kosong saat memanggil helper _f.");
        return {
          error: "UID is required for free usage query"
        };
      }
      const getHeaders = {
        ...this.headers
      };
      delete getHeaders["Content-Type"];
      const res = await axios.get(`${this.baseUrl}/api/model/freeUsage?uid=${targetToken}`, {
        headers: getHeaders
      });
      if (res?.data?.Header?.status === 0) {
        const content = res?.data?.Content || {};
        console.log("[LOG] Berhasil memperbarui data free usage.");
        return {
          data: content
        };
      }
      return {
        error: res?.data?.Header?.msg || "Gagal mengambil data free usage"
      };
    } catch (err) {
      console.error("[LOG] Kesalahan pada helper _f:", err?.message || err);
      return {
        error: err?.message || String(err)
      };
    }
  }
  async _l() {
    console.log("[LOG] Menjalankan fungsi login otomatis...");
    try {
      const params = this._p({
        uid: ""
      });
      const res = await axios.post(`${this.baseUrl}/api/auth/login`, params, {
        headers: this.headers
      });
      if (res?.data?.Header?.status === 0) {
        this.uid = res?.data?.Content?.uid || null;
        console.log(`[LOG] Login berhasil. UID tersimpan: ${this.uid}`);
        const freeUsageData = await this._f(this.uid);
        this.freeUsage = freeUsageData?.data || null;
        return {
          uid: this.uid,
          freeUsage: this.freeUsage
        };
      }
      console.error("[LOG] Gagal login, respon API tidak valid:", res?.data?.Header?.msg);
      return {
        error: res?.data?.Header?.msg || "Gagal memperoleh otentikasi"
      };
    } catch (err) {
      console.error("[LOG] Kesalahan pada helper _l:", err?.message || err);
      return {
        error: err?.message || String(err)
      };
    }
  }
  _w(payload) {
    return new Promise(resolve => {
      console.log("[LOG] Menghubungkan sesi WebSocket...");
      try {
        let fullText = "";
        const chunks = [];
        const ws = new WebSocket(this.wsUrl);
        ws.on("open", () => {
          console.log("[LOG] WebSocket terbuka. Mengirim payload...");
          try {
            ws.send(JSON.stringify(payload));
          } catch (sendErr) {
            console.error("[LOG] Gagal mengirim pesan:", sendErr?.message || sendErr);
            ws.close();
            resolve({
              error: sendErr?.message || "WebSocket write failed",
              chunks: chunks
            });
          }
        });
        ws.on("message", msg => {
          try {
            const data = JSON.parse(msg.toString());
            if (data?.type === "chat") {
              if (data?.status === 400) {
                ws.close();
                resolve({
                  error: data?.content || "Format tidak didukung",
                  chunks: chunks
                });
              }
              chunks.push(data);
              if (data?.content) {
                fullText += data.content;
              }
              if (data?.status === 200) {
                ws.close();
                resolve({
                  data: fullText,
                  chunks: chunks
                });
              }
            }
          } catch (parseErr) {}
        });
        ws.on("error", err => {
          console.error("[LOG] Error terjadi di saluran WebSocket:", err?.message || err);
          resolve({
            error: err?.message || "WebSocket connection error",
            chunks: chunks
          });
        });
        ws.on("close", () => {
          console.log("[LOG] Sesi WebSocket ditutup.");
          resolve({
            data: fullText || "Tidak ada respon yang diterima",
            chunks: chunks
          });
        });
      } catch (err) {
        console.error("[LOG] Kesalahan pada helper _w:", err?.message || err);
        resolve({
          error: err?.message || String(err),
          chunks: []
        });
      }
    });
  }
  async chat({
    prompt,
    messages,
    token,
    ...rest
  }) {
    console.log("[LOG] Memproses permintaan obrolan...");
    try {
      if (!prompt) {
        console.error("[LOG] Validasi gagal: prompt wajib diisi.");
        return {
          status: false,
          result: "prompt is required",
          token: token || this.uid || ""
        };
      }
      let activeToken = token || this.uid;
      if (!activeToken) {
        const auth = await this._l();
        if (auth?.error) return {
          status: false,
          result: `Authentication failed: ${auth.error}`,
          token: ""
        };
        activeToken = this.uid;
      }
      const msgs = messages || [];
      msgs.push({
        role: "user",
        content: prompt,
        content_type: "text"
      });
      const payload = {
        bot_id: "1001",
        type: "chat",
        uid: activeToken,
        pid: "115",
        channel: "wab_admin",
        version: "1.5.0",
        prompt: prompt,
        additional_messages: msgs,
        ...rest
      };
      const response = await this._w(payload);
      if (response?.error) {
        return {
          status: false,
          result: this._k(response.error),
          token: activeToken
        };
      }
      return {
        status: true,
        result: this._k({
          text: response.data,
          chunks: response.chunks
        }),
        token: activeToken
      };
    } catch (err) {
      console.error("[LOG] Kesalahan pada metode chat:", err?.message || err);
      return {
        status: false,
        result: this._k(err?.message || String(err)),
        token: token || this.uid || ""
      };
    }
  }
  async image({
    prompt,
    token,
    ...rest
  }) {
    console.log("[LOG] Memproses pembuatan gambar...");
    try {
      if (!prompt) {
        console.error("[LOG] Validasi gagal: prompt wajib diisi.");
        return {
          status: false,
          result: "prompt is required",
          token: token || this.uid || ""
        };
      }
      let activeToken = token || this.uid;
      if (!activeToken) {
        const auth = await this._l();
        if (auth?.error) return {
          status: false,
          result: `Authentication failed: ${auth.error}`,
          token: ""
        };
        activeToken = this.uid;
      }
      const payloadParams = {
        wm: "true",
        prompt: prompt,
        guidance_scale: "7",
        seed: String(Math.floor(Math.random() * 2e9)),
        num: "1",
        scene: "text2img",
        size: "1024x1024",
        model: "seedream-4.0",
        ...rest
      };
      const payload = this._p(payloadParams, activeToken);
      const res = await axios.post(`${this.baseUrl}/api/v2/generate/image`, payload, {
        headers: this.headers
      });
      return {
        status: true,
        result: this._k(res?.data || {}),
        token: activeToken
      };
    } catch (err) {
      console.error("[LOG] Kesalahan pada metode image:", err?.message || err);
      return {
        status: false,
        result: this._k(err?.message || String(err)),
        token: token || this.uid || ""
      };
    }
  }
  async video({
    prompt,
    token,
    ...rest
  }) {
    console.log("[LOG] Memproses pembuatan video...");
    try {
      if (!prompt) {
        console.error("[LOG] Validasi gagal: prompt wajib diisi.");
        return {
          status: false,
          result: "prompt is required",
          token: token || this.uid || ""
        };
      }
      let activeToken = token || this.uid;
      if (!activeToken) {
        const auth = await this._l();
        if (auth?.error) return {
          status: false,
          result: `Authentication failed: ${auth.error}`,
          token: ""
        };
        activeToken = this.uid;
      }
      const payloadParams = {
        wm: "true",
        prompt: prompt,
        seed: String(Math.floor(Math.random() * 2e9)),
        num: "1",
        scene: "text2video",
        model: "doubao-video",
        rt: "adaptive",
        rs: "720p",
        dur: "5",
        cf: "true",
        ...rest
      };
      const payload = this._p(payloadParams, activeToken);
      const res = await axios.post(`${this.baseUrl}/api/v2/generate/video`, payload, {
        headers: this.headers
      });
      return {
        status: true,
        result: this._k(res?.data || {}),
        token: activeToken
      };
    } catch (err) {
      console.error("[LOG] Kesalahan pada metode video:", err?.message || err);
      return {
        status: false,
        result: this._k(err?.message || String(err)),
        token: token || this.uid || ""
      };
    }
  }
  async status({
    mode,
    token,
    ...rest
  }) {
    console.log(`[LOG] Memeriksa status untuk mode: ${mode}...`);
    try {
      if (!mode) {
        console.error("[LOG] Validasi gagal: mode wajib diisi.");
        return {
          status: false,
          result: "mode is required",
          token: token || this.uid || ""
        };
      }
      let activeToken = token || this.uid;
      if (!activeToken) {
        const auth = await this._l();
        if (auth?.error) return {
          status: false,
          result: `Authentication failed: ${auth.error}`,
          token: ""
        };
        activeToken = this.uid;
      }
      const taskId = rest?.taskId || "";
      switch (mode) {
        case "image":
        case "video": {
          if (!taskId) {
            console.error("[LOG] Validasi gagal: taskId dibutuhkan.");
            return {
              status: false,
              result: "taskId is required for media status check",
              token: activeToken
            };
          }
          const payloadParams = {
            id: taskId,
            ...rest
          };
          const payload = this._p(payloadParams, activeToken);
          const res = await axios.post(`${this.baseUrl}/api/generate/query`, payload, {
            headers: this.headers
          });
          return {
            status: true,
            result: this._k(res?.data || {}),
            token: activeToken
          };
        }
        case "chat": {
          return {
            status: true,
            result: this._k({
              uid: activeToken,
              status: "aktif",
              freeUsage: this.freeUsage,
              ...rest
            }),
            token: activeToken
          };
        }
        default: {
          console.warn(`[LOG] Mode status '${mode}' tidak didukung.`);
          return {
            status: false,
            result: `Mode status '${mode}' tidak didukung`,
            token: activeToken
          };
        }
      }
    } catch (err) {
      console.error("[LOG] Kesalahan pada metode status:", err?.message || err);
      return {
        status: false,
        result: this._k(err?.message || String(err)),
        token: token || this.uid || ""
      };
    }
  }
  async search({
    query,
    token,
    ...rest
  }) {
    console.log(`[LOG] Mencari bot dengan query: ${query}...`);
    try {
      if (!query) {
        console.error("[LOG] Validasi gagal: query wajib diisi.");
        return {
          status: false,
          result: "query is required",
          token: token || this.uid || ""
        };
      }
      let activeToken = token || this.uid;
      if (!activeToken) {
        const auth = await this._l();
        if (auth?.error) return {
          status: false,
          result: `Authentication failed: ${auth.error}`,
          token: ""
        };
        activeToken = this.uid;
      }
      const payloadParams = {
        keyword: query,
        ...rest
      };
      const payload = this._p(payloadParams, activeToken);
      const res = await axios.post(`${this.baseUrl}/api/coze/bot/search`, payload, {
        headers: this.headers
      });
      return {
        status: true,
        result: this._k(res?.data || {}),
        token: activeToken
      };
    } catch (err) {
      console.error("[LOG] Kesalahan pada metode search:", err?.message || err);
      return {
        status: false,
        result: this._k(err?.message || String(err)),
        token: token || this.uid || ""
      };
    }
  }
  async list({
    query,
    token,
    ...rest
  }) {
    console.log("[LOG] Mengambil daftar kategori bot...");
    try {
      if (!query) {
        console.error("[LOG] Validasi gagal: query wajib diisi.");
        return {
          status: false,
          result: "query is required",
          token: token || this.uid || ""
        };
      }
      let activeToken = token || this.uid;
      if (!activeToken) {
        const auth = await this._l();
        if (auth?.error) return {
          status: false,
          result: `Authentication failed: ${auth.error}`,
          token: ""
        };
        activeToken = this.uid;
      }
      const payloadParams = {
        keyword: query,
        ...rest
      };
      const payload = this._p(payloadParams, activeToken);
      const res = await axios.post(`${this.baseUrl}/api/coze/bot/cateList`, payload, {
        headers: this.headers
      });
      return {
        status: true,
        result: this._k(res?.data || {}),
        token: activeToken
      };
    } catch (err) {
      console.error("[LOG] Kesalahan pada metode list:", err?.message || err);
      return {
        status: false,
        result: this._k(err?.message || String(err)),
        token: token || this.uid || ""
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["chat", "image", "video", "status", "search", "list"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          chat: "/?action=chat&prompt=Halo+apa+kabar&token=optional_token",
          image: "/?action=image&prompt=futuristic+city&token=optional_token",
          video: "/?action=video&prompt=flying+car&token=optional_token",
          status: "/?action=status&mode=image&taskId=task_id_contoh&token=optional_token",
          search: "/?action=search&query=gojo&token=optional_token",
          list: "/?action=list&query=all&token=optional_token"
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
  const api = new MateAIClient();
  try {
    let response;
    const token = params.token || params.uid || null;
    switch (action) {
      case "chat":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk obrolan."
          });
        }
        response = await api.chat({
          prompt: params.prompt,
          messages: params.messages || null,
          token: token,
          ...params
        });
        break;
      case "image":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk pembuatan gambar."
          });
        }
        response = await api.image({
          prompt: params.prompt,
          token: token,
          ...params
        });
        break;
      case "video":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk pembuatan video."
          });
        }
        response = await api.video({
          prompt: params.prompt,
          token: token,
          ...params
        });
        break;
      case "status":
        const statusMode = params.mode || params.status_mode || "chat";
        const targetTaskId = params.taskId || params.task_id || params.id;
        if (["image", "video"].includes(statusMode) && !targetTaskId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'taskId' wajib diisi untuk meninjau status pembuatan media."
          });
        }
        response = await api.status({
          mode: statusMode,
          taskId: targetTaskId,
          token: token,
          ...params
        });
        break;
      case "search":
        const searchQuery = params.query || params.keyword || params.q;
        if (!searchQuery) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk pencarian bot."
          });
        }
        response = await api.search({
          query: searchQuery,
          token: token,
          ...params
        });
        break;
      case "list":
        const listQuery = params.query || params.keyword || params.q;
        if (!listQuery) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk melihat daftar kategori."
          });
        }
        response = await api.list({
          query: listQuery,
          token: token,
          ...params
        });
        break;
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        error: "Server target tidak memberikan respon atau data kosong."
      });
    }
    if (response.status === false) {
      return res.status(422).json({
        action: action,
        ...response
      });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error.message || "Unknown Error"
    });
  }
}