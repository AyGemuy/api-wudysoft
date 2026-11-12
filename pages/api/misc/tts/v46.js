import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class KordixClient {
  constructor() {
    try {
      this.base = "https://clone.kordix.cloud";
      this.token = null;
      this.userId = null;
      this.headers = {
        "User-Agent": "Ktor client",
        Connection: "Keep-Alive",
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Platform": "ANDROID",
        "X-AppCheck-Token": "",
        "Accept-Charset": "UTF-8"
      };
    } catch (err) {
      console.error("[Kordix-Critical] Inisialisasi gagal:", err.message);
    }
  }
  _log(msg, data = "") {
    try {
      console.log(`[Kordix-Log] ${msg}`, data);
    } catch (err) {
      console.error("[Kordix-Critical] Log error:", err.message);
    }
  }
  _toSnake(obj) {
    try {
      if (Array.isArray(obj)) {
        return obj.map(v => this._toSnake(v));
      }
      if (obj !== null && obj !== undefined && obj.constructor === Object) {
        return Object.keys(obj).reduce((acc, key) => {
          const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "");
          acc[snakeKey] = this._toSnake(obj[key]);
          return acc;
        }, {});
      }
      return obj;
    } catch (err) {
      return obj;
    }
  }
  async _auth() {
    try {
      if (this.token) return this.token;
      this._log("Melakukan autentikasi...");
      const form = new FormData();
      form.append("key", crypto.randomBytes(8).toString("hex"));
      form.append("rc_user_id", `$RCAnonymousID:${crypto.randomBytes(16).toString("hex")}`);
      const res = await axios.post(`${this.base}/v2/login`, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders(),
          Authorization: "Bearer"
        },
        timeout: 1e4
      });
      this.token = res.data?.token || null;
      this.userId = res.data?.user_id || null;
      this._log("Autentikasi berhasil.");
      await this.getRewardStatus(this.token);
      return this.token;
    } catch (err) {
      this._log("Autentikasi gagal:", err.message);
      return null;
    }
  }
  async getRewardStatus(token) {
    try {
      const tok = token || this.token;
      if (!tok) return null;
      this._log("Mengambil status reward ad...");
      const res = await axios.get(`${this.base}/v2/credits/reward-ad/status`, {
        headers: {
          ...this.headers,
          Authorization: `Bearer ${tok}`
        },
        timeout: 6e3
      });
      this._log("Status reward:", res.data);
      return res.data;
    } catch (err) {
      this._log("Reward API dilewati (error):", err.message);
      return null;
    }
  }
  async _getBal(token) {
    try {
      const tok = token || this.token;
      if (!tok) return null;
      const res = await axios.get(`${this.base}/v2/credits/balance`, {
        headers: {
          ...this.headers,
          Authorization: `Bearer ${tok}`
        },
        timeout: 6e3
      });
      return res.data;
    } catch (err) {
      this._log("Balance API dilewati (error):", err.message);
      return null;
    }
  }
  async _calc(text, token) {
    try {
      const tok = token || this.token;
      if (!tok) return 0;
      const res = await axios.post(`${this.base}/v2/credits/calculate-cost`, {
        characterCount: text?.length || 0
      }, {
        headers: {
          ...this.headers,
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok}`
        },
        timeout: 6e3
      });
      return res.data?.credit_cost ?? 0;
    } catch (err) {
      this._log("Calculate cost dilewati (error):", err.message);
      return 0;
    }
  }
  async _poll(jobId, token) {
    try {
      const max = 40;
      const interval = 3e3;
      const tok = token || this.token;
      if (!tok) return null;
      for (let i = 0; i < max; i++) {
        try {
          this._log(`Polling task #${i + 1} untuk JobID: ${jobId}`);
          const res = await axios.get(`${this.base}/result/${jobId}`, {
            headers: {
              ...this.headers,
              Authorization: `Bearer ${tok}`
            },
            timeout: 8e3
          });
          if (res.data?.status === "finished") {
            this._log("Task selesai.");
            const rawUrl = res.data?.audioUrl || "";
            const fullUrl = rawUrl.startsWith("http") ? rawUrl : `${this.base}${rawUrl}`;
            return {
              ...res.data,
              audioUrl: fullUrl
            };
          }
        } catch (pollErr) {
          this._log(`Polling #${i + 1} error (skip, lanjut coba lagi):`, pollErr.message);
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      }
      return null;
    } catch (err) {
      this._log("Polling error:", err.message);
      return null;
    }
  }
  async generate({
    token,
    text,
    voice,
    ...rest
  }) {
    try {
      const activeToken = token || this.token || await this._auth();
      if (!activeToken) {
        return {
          status: "error",
          result: "Authentication required",
          token: null
        };
      }
      const txt = text || "Default text";
      const voiceId = voice || "349";
      await Promise.allSettled([this.getRewardStatus(activeToken), this._getBal(activeToken), this._calc(txt, activeToken)]);
      this._log("Mengirim request TTS...");
      const form = new FormData();
      form.append("celebrity_id", String(voiceId));
      form.append("text", txt);
      form.append("ref_text", rest.ref_text || "N/A");
      form.append("language", rest.language || "en");
      form.append("name", rest.name || "sumi anjir");
      form.append("tags", rest.tags || "TTS");
      form.append("speed", rest.speed || "1.0");
      form.append("volume", rest.volume || "0.0");
      form.append("normalize", rest.normalize || "true");
      form.append("temperature", rest.temperature || "0.7");
      const res = await axios.post(`${this.base}/v2/tts`, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders(),
          Authorization: `Bearer ${activeToken}`
        },
        timeout: 15e3
      });
      const jobId = res.data?.job_id;
      if (!jobId) {
        return {
          status: "error",
          result: "Missing job_id",
          token: activeToken
        };
      }
      const rawResult = await this._poll(jobId, activeToken);
      if (!rawResult) {
        return {
          status: "error",
          result: "Polling failed or timeout",
          token: activeToken
        };
      }
      return {
        status: "success",
        result: this._toSnake(rawResult),
        token: activeToken
      };
    } catch (err) {
      this._log("Generate gagal:", err.message);
      return {
        status: "error",
        result: err.response?.data?.message || err.message,
        token: token || this.token
      };
    }
  }
  async search({
    token,
    query,
    ...rest
  }) {
    try {
      const activeToken = token || this.token || await this._auth();
      if (!activeToken) {
        return {
          status: "error",
          result: "Authentication required",
          token: null
        };
      }
      const q = query || "";
      const res = await axios.post(`${this.base}/celebrities/v2/ttsList`, {
        search: q,
        ...rest
      }, {
        headers: {
          ...this.headers,
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`
        },
        timeout: 1e4
      });
      const items = (res.data?.items || []).map(item => ({
        ...item,
        audioPath: item.audioPath?.startsWith("http") ? item.audioPath : `${this.base}${item.audioPath}`,
        image: item.image?.startsWith("http") ? item.image : `${this.base}${item.image}`
      }));
      return {
        status: "success",
        result: this._toSnake({
          ...res.data,
          items: items
        }),
        token: activeToken
      };
    } catch (err) {
      this._log("Search gagal:", err.message);
      return {
        status: "error",
        result: err.response?.data?.message || err.message,
        token: token || this.token
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["generate", "search", "reward", "balance"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=generate&text=Halo+dunia&voice=349"
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: "${action}".`,
      valid_actions: validActions
    });
  }
  const api = new KordixClient();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.text) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'text' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "search":
        response = await api.search(params);
        break;
      case "reward": {
        const token = params.token || await api._auth();
        const data = await api.getRewardStatus(token);
        response = {
          status: "success",
          result: api._toSnake(data || {}),
          token: token
        };
        break;
      }
      case "balance": {
        const token = params.token || await api._auth();
        const data = await api._getBal(token);
        response = {
          status: "success",
          result: api._toSnake(data || {}),
          token: token
        };
        break;
      }
    }
    return res.status(200).json({
      status: response?.status === "success",
      action: action,
      ...response
    });
  } catch (error) {
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error.message || "Unknown Error"
    });
  }
}