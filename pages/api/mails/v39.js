import axios from "axios";
import crypto from "crypto";
const BASE = "https://tempmailget.com";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
class TempMail {
  constructor() {
    this.email = null;
  }
  http() {
    return axios.create({
      baseURL: BASE,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: BASE + "/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": UA
      }
    });
  }
  async getDomains() {
    try {
      console.log("[TempMail] domain: fetch daftar domain aktif …");
      const res = await this.http().get("/api/domains");
      return res.data;
    } catch (e) {
      console.error("[TempMail][ERR] domain:", e.message);
      throw e;
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
        if (domData && domData.domains && domData.domains.length > 0) {
          dom = domData.domains[0];
        } else {
          dom = "codelearnfast.com";
        }
      }
      const prefixes = ["luckyshark", "boldlion", "fasttiger", "cleverfox"];
      const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const user = name || `${randomPrefix}${crypto.randomInt(1e3, 9999)}`;
      this.email = `${user}@${dom}`;
      console.log("[TempMail] create: email berhasil dibuat ->", this.email);
      return {
        email: this.email
      };
    } catch (e) {
      console.error("[TempMail][ERR] create:", e.message);
      throw e;
    }
  }
  async message({
    email
  } = {}) {
    try {
      const addr = email || this.email;
      if (!addr) throw new Error("email kosong");
      console.log("[TempMail] message: hit POST refresh inbox ->", addr);
      const res = await this.http().post(`/api/emails/refresh?address=${encodeURIComponent(addr)}`, null, {
        headers: {
          "content-length": "0",
          origin: BASE
        }
      });
      const data = res.data;
      console.log("[TempMail] message: sukses fetch,", Array.isArray(data) ? data.length : 0, "pesan.");
      return {
        mails: data
      };
    } catch (e) {
      console.error("[TempMail][ERR] message:", e.message);
      throw e;
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