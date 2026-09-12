import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class KordixClient {
  constructor() {
    try {
      this.base = "https://clone.kordix.cloud";
      this.token = null;
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
      console.error("[Kordix-Critical] Gagal inisialisasi constructor:", err.message);
    }
  }
  _log(msg, data = "") {
    try {
      console.log(`[Kordix-Log] ${msg}`, data);
    } catch (err) {
      console.error("[Kordix-Critical] Gagal melakukan log:", err.message);
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
      this._log("Gagal konversi snake_case:", err.message);
      return obj;
    }
  }
  async _auth() {
    try {
      if (this.token) return this.token;
      this._log("Memulai proses autentikasi...");
      const form = new FormData();
      form.append("key", crypto.randomBytes(8).toString("hex"));
      form.append("rc_user_id", `$RCAnonymousID:${crypto.randomBytes(16).toString("hex")}`);
      const res = await axios.post(`${this.base}/v2/login`, form, {
        headers: {
          ...this.headers,
          ...form.getHeaders(),
          Authorization: "Bearer"
        }
      });
      this.token = res.data?.token || null;
      this._log("Autentikasi berhasil, token disimpan.");
      return this.token;
    } catch (err) {
      this._log("Gagal autentikasi:", err.message);
      return null;
    }
  }
  async _getBal() {
    try {
      const tok = await this._auth();
      if (!tok) return 0;
      this._log("Mengambil sisa kredit...");
      const res = await axios.get(`${this.base}/v2/credits/balance`, {
        headers: {
          ...this.headers,
          Authorization: `Bearer ${tok}`
        }
      });
      return res.data?.remaining_credits ?? 0;
    } catch (err) {
      this._log("Gagal mengambil kredit:", err.message);
      return 0;
    }
  }
  async _calc(text) {
    try {
      const tok = await this._auth();
      if (!tok) return 0;
      const count = text?.length || 0;
      this._log(`Menghitung estimasi biaya kredit untuk ${count} karakter...`);
      const res = await axios.post(`${this.base}/v2/credits/calculate-cost`, {
        characterCount: count
      }, {
        headers: {
          ...this.headers,
          "Content-Type": "application/json",
          Authorization: `Bearer ${tok}`
        }
      });
      return res.data?.credit_cost ?? 0;
    } catch (err) {
      this._log("Gagal menghitung kredit:", err.message);
      return 0;
    }
  }
  async _poll(jobId) {
    try {
      const max = 60;
      const interval = 3e3;
      const tok = await this._auth();
      if (!tok) return null;
      for (let i = 0; i < max; i++) {
        try {
          this._log(`Polling task #${i + 1} untuk JobID: ${jobId}`);
          const res = await axios.get(`${this.base}/result/${jobId}`, {
            headers: {
              ...this.headers,
              Authorization: `Bearer ${tok}`
            }
          });
          if (res.data?.status === "finished") {
            this._log("Task selesai diproses.");
            const rawUrl = res.data?.audioUrl || "";
            const fullUrl = rawUrl.startsWith("http") ? rawUrl : `${this.base}${rawUrl}`;
            return {
              ...res.data,
              audioUrl: fullUrl
            };
          }
          this._log(`Status masih: ${res.data?.status || "processing"}. Menunggu...`);
        } catch (pollErr) {
          this._log(`Gagal dalam perulangan polling #${i + 1}:`, pollErr.message);
        }
        await new Promise(resolve => setTimeout(resolve, interval));
      }
      this._log("Polling timeout atau task gagal.");
      return null;
    } catch (err) {
      this._log("Gagal total pada fungsi polling:", err.message);
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
      const voiceId = voice || "93";
      const cost = await this._calc(txt);
      const balance = await this._getBal();
      this._log(`Info Kredit -> Sisa: ${balance}, Biaya: ${cost}`);
      this._log("Mengirim request pembuatan TTS...");
      const form = new FormData();
      form.append("celebrity_id", voiceId);
      form.append("text", txt);
      form.append("ref_text", rest.ref_text || "N/A");
      form.append("language", rest.language || "en");
      form.append("name", rest.name || "alek");
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
        }
      });
      const jobId = res.data?.job_id;
      if (!jobId) {
        this._log("Gagal mendapatkan Job ID dari server.");
        return {
          status: "error",
          result: "Missing job_id",
          token: activeToken
        };
      }
      const rawResult = await this._poll(jobId);
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
      this._log("Gagal pada method generate:", err.message);
      return {
        status: "error",
        result: err.message,
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
      this._log(`Mencari voice list dengan query: "${q}"`);
      const res = await axios.post(`${this.base}/celebrities/v2/ttsList`, {
        search: q,
        ...rest
      }, {
        headers: {
          ...this.headers,
          "Content-Type": "application/json",
          Authorization: `Bearer ${activeToken}`
        }
      });
      const items = (res.data?.items || []).map(item => {
        try {
          return {
            ...item,
            audioPath: item.audioPath?.startsWith("http") ? item.audioPath : `${this.base}${item.audioPath}`,
            image: item.image?.startsWith("http") ? item.image : `${this.base}${item.image}`
          };
        } catch (mapErr) {
          this._log("Gagal parsing item data search:", mapErr.message);
          return item;
        }
      });
      const rawResult = {
        ...res.data,
        items: items
      };
      return {
        status: "success",
        result: this._toSnake(rawResult),
        token: activeToken
      };
    } catch (err) {
      this._log("Gagal pada method search:", err.message);
      return {
        status: "error",
        result: err.message,
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
  const validActions = ["generate", "search"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=generate&text=Halo+dunia"
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
        if (!params.query) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'query' wajib diisi untuk action 'search'."
          });
        }
        response = await api.search(params);
        break;
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