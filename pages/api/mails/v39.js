import axios from "axios";
import crypto from "crypto";
class TempMail {
  constructor() {
    this.email = null;
    this.base = "https://tempmailget.com";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
  }
  _api() {
    return axios.create({
      baseURL: this.base,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: this.base + "/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": this.ua
      }
    });
  }
  _rand(name) {
    if (name) return name;
    const pfx = ["luckyshark", "boldlion", "fasttiger", "cleverfox"];
    const rPfx = pfx[Math.floor(Math.random() * pfx.length)];
    return `${rPfx}${crypto.randomInt(1e3, 1e4)}`;
  }
  async getDomains() {
    try {
      console.log("[TempMail] domain: fetch daftar domain aktif …");
      const res = await this._api().get("/api/domains");
      return {
        status: true,
        result: res.data
      };
    } catch (e) {
      console.error("[TempMail][ERR] domain:", e.message);
      return {
        status: false,
        result: e.message
      };
    }
  }
  async create({
    domain,
    name
  } = {}) {
    try {
      console.log("[TempMail] create: generate email baru …");
      let dom = domain;
      if (!dom) {
        const domData = await this.getDomains();
        if (domData.status && domData.result?.domains?.length > 0) {
          dom = domData.result.domains[0];
        } else {
          dom = "codelearnfast.com";
        }
      }
      const user = this._rand(name);
      this.email = `${user}@${dom}`;
      console.log("[TempMail] create: email berhasil dibuat ->", this.email);
      return {
        status: true,
        result: {
          email: this.email
        }
      };
    } catch (e) {
      console.error("[TempMail][ERR] create:", e.message);
      return {
        status: false,
        result: e.message
      };
    }
  }
  async message({
    email
  } = {}) {
    try {
      const addr = email || this.email;
      if (!addr) throw new Error("email kosong");
      console.log("[TempMail] message: hit POST refresh inbox ->", addr);
      const res = await this._api().post(`/api/emails/refresh?address=${encodeURIComponent(addr)}`, null, {
        headers: {
          "content-length": "0",
          origin: this.base
        }
      });
      console.log("[TempMail] message: sukses fetch,", Array.isArray(res.data) ? res.data.length : 0, "pesan.");
      return {
        status: true,
        result: {
          mails: res.data
        }
      };
    } catch (e) {
      console.error("[TempMail][ERR] message:", e.message);
      return {
        status: false,
        result: e.message
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
        response = await api.getDomains();
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