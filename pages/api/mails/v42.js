import axios from "axios";
import crypto from "crypto";
class TempMail {
  constructor() {
    this.baseUrl = "https://www.ryzenmail.com/api";
    this.headers = {
      "User-Agent": "com.ryzenmail.app/28 (Linux; U; Android 15; id_ID; RMX3890; Build/AQ3A.240812.002; Cronet/149.0.7827.159)",
      "Accept-Encoding": "gzip, deflate",
      "Content-Type": "application/json"
    };
    this.token = null;
  }
  _snake(obj) {
    try {
      if (Array.isArray(obj)) return obj.map(v => this._snake(v));
      if (obj !== null && typeof obj === "object") {
        return Object.keys(obj).reduce((acc, key) => {
          const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
          acc[snakeKey] = this._snake(obj[key]);
          return acc;
        }, {});
      }
      return obj;
    } catch (e) {
      console.error("[LOG ERROR _snake]", e.message);
      return obj;
    }
  }
  async _ensureToken(token) {
    if (token) {
      this.token = token;
      return;
    }
    console.log("[PROSES] Token tidak terdeteksi. Mendaftarkan perangkat baru secara otomatis...");
    try {
      const payload = {
        device_id: crypto.randomBytes(8).toString("hex"),
        platform: "android",
        fcm_token: `dTpoh7${crypto.randomBytes(24).toString("hex")}:APA91b${crypto.randomBytes(40).toString("hex")}`
      };
      const res = await axios.post(`${this.baseUrl}/register`, payload, {
        headers: {
          ...this.headers,
          authorization: ""
        }
      });
      this.token = res.data?.auth_token || res.data?.token;
      if (!this.token) {
        throw new Error("Gagal memperoleh token autentikasi dari respon registrasi.");
      }
      console.log(`[PROSES] Registrasi perangkat baru sukses. Sesi aktif dibuat.`);
    } catch (e) {
      console.error("[ERROR] Kegagalan pada proses _ensureToken:", e.message);
      throw e;
    }
  }
  async create({
    token,
    ...rest
  } = {}) {
    try {
      console.log("[PROSES] Memulai pembuatan email RyzenMail baru...");
      await this._ensureToken(token);
      const res = await axios.get(`${this.baseUrl}/generate_address`, {
        headers: {
          ...this.headers,
          authorization: `Bearer ${this.token}`
        },
        params: rest
      });
      const emailAddress = res.data?.address;
      console.log(`[PROSES] Alamat email berhasil dibuat: ${emailAddress}`);
      const result = this._snake(res.data);
      return {
        status: true,
        result: result,
        token: this.token
      };
    } catch (error) {
      console.error("[ERROR] Gagal pada fungsi async create:", error.message);
      return {
        status: false,
        result: error?.response?.data || error.message,
        token: token || this.token
      };
    }
  }
  async message({
    token,
    ...rest
  } = {}) {
    try {
      console.log("[PROSES] Memeriksa kotak masuk pesan...");
      await this._ensureToken(token);
      const res = await axios.get(`${this.baseUrl}/inbox`, {
        headers: {
          ...this.headers,
          authorization: `Bearer ${this.token}`
        },
        params: {
          page: 1,
          limit: 10,
          ...rest
        }
      });
      const messagesCount = res.data?.mails?.length || 0;
      console.log(`[PROSES] Inbox berhasil ditarik. Ditemukan ${messagesCount} pesan.`);
      const result = this._snake(res.data);
      return {
        status: true,
        result: result,
        token: this.token
      };
    } catch (error) {
      console.error("[ERROR] Gagal pada fungsi async message:", error.message);
      return {
        status: false,
        result: error?.response?.data || error.message,
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
  const validActions = ["create", "message"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: "/?action=create atau /?action=message&token=<auth_token_sesi>"
    });
  }
  const api = new TempMail();
  try {
    let response;
    switch (action) {
      case "create":
        response = await api.create(params);
        break;
      case "message":
        response = await api.message(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
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
      message: "Terjadi kesalahan pada target API.",
      error: error.message || "Unknown Error"
    });
  }
}