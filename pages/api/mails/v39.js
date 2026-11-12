import axios from "axios";
import crypto from "crypto";
class TempMail {
  constructor() {
    this.email = null;
    this.base = "https://api.ragnarop.tech";
    this.secret = "LV5WwBJD2ird3ykP1koxLob6M6rYI3wLXvRjUgiPoMyTOo0QlNrkn7n5ykhT5FXD";
    this.ua = "Dart/3.3 (dart:io)";
    this.client = axios.create({
      baseURL: this.base,
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json; charset=utf-8",
        "User-Agent": this.ua,
        "Accept-Encoding": "gzip",
        "x-app-secret": this.secret
      }
    });
  }
  _sig(path) {
    try {
      const message = `${path}|${this.secret}`;
      return crypto.createHmac("sha256", this.secret).update(message).digest("hex");
    } catch (e) {
      console.error("[TempMail][ERR] _sig:", e.message);
      throw e;
    }
  }
  _hdrs(path) {
    try {
      return {
        "x-signature": this._sig(path)
      };
    } catch (e) {
      console.error("[TempMail][ERR] _hdrs:", e.message);
      throw e;
    }
  }
  _rnd(name) {
    try {
      const pfx = ["luckyshark", "boldlion", "fasttiger", "cleverfox"];
      const base = name || pfx[Math.floor(Math.random() * pfx.length)];
      const hex8 = crypto.randomBytes(4).toString("hex");
      const num4 = crypto.randomInt(1e3, 1e4).toString();
      return `${base}${hex8}${num4}`;
    } catch (e) {
      console.error("[TempMail][ERR] _rnd:", e.message);
      throw e;
    }
  }
  async doms() {
    try {
      console.log("[TempMail] doms: Mengambil daftar domain...");
      const path = "/api/domains";
      const res = await this.client.get(path, {
        headers: this._hdrs(path)
      });
      console.log("[TempMail] doms res:", res.data);
      return {
        status: true,
        result: res.data
      };
    } catch (e) {
      console.error("[TempMail][ERR] doms:", e.response?.data || e.message);
      return {
        status: false,
        result: e.response?.data || e.message
      };
    }
  }
  async create({
    domain,
    name
  } = {}) {
    try {
      console.log("[TempMail] create: Memulai pembuatan email...");
      let dom = domain;
      if (!dom) {
        const domData = await this.doms();
        if (domData.status && domData.result?.domains?.length > 0) {
          const domains = domData.result.domains;
          dom = domains[Math.floor(Math.random() * domains.length)];
        } else {
          dom = "codelearnfast.com";
        }
      }
      const user = this._rnd(name);
      if (user.length < 3) {
        throw new Error("Prefix minimal harus memiliki 3 karakter");
      }
      const regexValidasi = /^[a-zA-Z0-9._-]+$/;
      if (!regexValidasi.test(user)) {
        throw new Error("Prefix hanya boleh berisi huruf, angka, titik, garis bawah, dan tanda hubung");
      }
      const path = "/api/emails";
      const res = await this.client.get(`${path}?prefix=${user}&domain=${dom}`, {
        headers: this._hdrs(path)
      });
      console.log("[TempMail] create res:", res.data);
      this.email = `${user}@${dom}`;
      console.log("[TempMail] create: Email berhasil dibuat ->", this.email);
      return {
        status: true,
        result: {
          email: this.email,
          data: res.data
        }
      };
    } catch (e) {
      console.error("[TempMail][ERR] create:", e.response?.data || e.message);
      return {
        status: false,
        result: e.response?.data || e.message
      };
    }
  }
  async message({
    email
  } = {}) {
    try {
      const addr = email || this.email;
      if (!addr) throw new Error("Alamat email kosong");
      console.log("[TempMail] message: Memeriksa inbox untuk ->", addr);
      const path = "/api/emails";
      const res = await this.client.get(`${path}?address=${encodeURIComponent(addr)}`, {
        headers: this._hdrs(path)
      });
      console.log("[TempMail] message res:", res.data);
      return {
        status: true,
        result: {
          mails: res.data
        }
      };
    } catch (e) {
      console.error("[TempMail][ERR] message:", e.response?.data || e.message);
      return {
        status: false,
        result: e.response?.data || e.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["domain", "create", "message"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: "/?action=create atau /?action=message&email=contoh@domain.com"
    });
  }
  const api = new TempMail();
  try {
    let response;
    switch (action) {
      case "domain":
        response = await api.doms();
        break;
      case "create":
        response = await api.create(params);
        break;
      case "message":
        if (!params.email) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'email' wajib diisi untuk action 'message'."
          });
        }
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
      status: true,
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