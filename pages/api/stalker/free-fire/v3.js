import axios from "axios";
import crypto from "node:crypto";
class GameSkinBo {
  constructor() {
    this.baseUrl = "https://gameskinbo.com";
    this.secKey = "GAMESKINBOFFIDCHECKERSECURITYPROTOCOL";
    this.cookies = new Map();
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: `${this.baseUrl}/free_fire_id_checker`,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-api-client": "gameskinbo-web"
      }
    });
    this.client.interceptors.request.use(config => {
      try {
        const cookieStr = Array.from(this.cookies.entries()).map(([k, v]) => `${k}=${v}`).join("; ");
        config.headers = config?.headers || {};
        if (cookieStr) config.headers["cookie"] = cookieStr;
      } catch (err) {
        console.log("[Warn Req Interceptor]:", err?.message || err);
      }
      return config;
    });
    this.client.interceptors.response.use(res => {
      try {
        const rawCookies = res?.headers?.["set-cookie"] || [];
        rawCookies.forEach(c => {
          const [pair] = (c || "").split(";");
          const [key, ...val] = (pair || "").split("=");
          if (key?.trim() && val?.length) {
            this.cookies.set(key.trim(), val.join("=").trim());
          }
        });
      } catch (err) {
        console.log("[Warn Res Interceptor]:", err?.message || err);
      }
      return res;
    });
  }
  _toSnake(str) {
    try {
      return (str || "").replace(/([a-z0-9])([A-Z])/g, "$1_$2").replace(/[-\s]+/g, "_").toLowerCase();
    } catch (err) {
      console.log("[Error _toSnake]:", err?.message || err);
      return str;
    }
  }
  _parse(val) {
    try {
      if (typeof val === "string") {
        const trimmed = val ? val.trim() : "";
        if (trimmed.startsWith("{") && trimmed.endsWith("}") || trimmed.startsWith("[") && trimmed.endsWith("]")) {
          return this._fmt(JSON.parse(trimmed));
        }
        if (trimmed.startsWith("/") && !trimmed.startsWith("//")) {
          return `${this.baseUrl}${trimmed}`;
        }
      }
      return val;
    } catch {
      return val;
    }
  }
  _fmt(data) {
    try {
      if (Array.isArray(data)) {
        return data.map(item => this._fmt(item));
      }
      if (data !== null && typeof data === "object") {
        const result = {};
        for (const [key, val] of Object.entries(data)) {
          const snakeKey = this._toSnake(key);
          result[snakeKey] = this._fmt(this._parse(val));
        }
        return result;
      }
      return this._parse(data);
    } catch (err) {
      console.log("[Error _fmt]:", err?.message || err);
      return data;
    }
  }
  _hmac(key, data) {
    try {
      return crypto.createHmac("sha256", key || "").update(data || "").digest("hex");
    } catch (err) {
      console.log("[Error _hmac]:", err?.message || err);
      return "";
    }
  }
  _genTok(uid) {
    try {
      const ts = Date.now();
      const timeBucket = String(Math.floor(ts / 3e4));
      const layer1Key = this._hmac(this.secKey, timeBucket).substring(0, 32);
      const dataToSign = `${uid}|${ts}`;
      const signature = this._hmac(layer1Key, dataToSign);
      const payload = `${uid}|${ts}|${signature}`;
      return Buffer.from(payload, "utf-8").toString("base64");
    } catch (err) {
      console.log("[Error _genTok]:", err?.message || err);
      return "";
    }
  }
  async _init() {
    try {
      console.log("[Process] Menginisialisasi session & cookie...");
      await this.client.get("/free_fire_id_checker", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"
        }
      });
      console.log("[Success] Session & cookie berhasil disinkronisasi");
    } catch (err) {
      console.log("[Warn _init]:", err?.response?.status || err?.message || err);
    }
  }
  async _csrf() {
    try {
      console.log("[Process] Mengambil CSRF token...");
      const res = await this.client.get("/api/csrf-token", {
        headers: {
          accept: "application/json"
        }
      });
      const token = res?.data?.csrfToken || "";
      console.log("[Success] CSRF token berhasil didapatkan");
      return token;
    } catch (err) {
      console.log("[Error _csrf]:", err?.response?.data || err?.message || err);
      throw err;
    }
  }
  async search({
    uid,
    ...rest
  }) {
    try {
      const targetUid = uid ? String(uid).trim() : "";
      if (!targetUid) throw new Error("UID wajib diisi");
      if (this.cookies.size === 0) {
        await this._init();
      }
      console.log(`[Process] Memulai pencarian untuk UID: ${targetUid}`);
      const csrfToken = await this._csrf();
      const token = this._genTok(targetUid);
      console.log("[Process] Mengirim request checker...");
      const res = await this.client.get("/api/ff_id_checker", {
        params: {
          uid: targetUid,
          token: token,
          ...rest
        },
        headers: {
          accept: "*/*",
          "x-csrf-token": csrfToken
        }
      });
      console.log("[Success] Data berhasil diterima, memformat output...");
      return {
        status: true,
        result: this._fmt(res?.data || {})
      };
    } catch (err) {
      console.log("[Error Search]:", err?.response?.data || err?.message || err);
      return {
        status: false,
        result: err?.response?.data || err?.message || "Failed to check player info"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.uid) {
    return res.status(400).json({
      error: "Parameter 'uid' diperlukan"
    });
  }
  const api = new GameSkinBo();
  try {
    const data = await api.search(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}