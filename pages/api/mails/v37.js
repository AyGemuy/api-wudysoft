import axios from "axios";
import crypto from "crypto";
const BASE = "https://tempmail.cn";
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
class TempMail {
  constructor() {
    this.email = null;
    this.sid = null;
  }
  enc(raw) {
    if (!raw) return null;
    return Buffer.from(raw).toString("base64");
  }
  dec(b64) {
    if (!b64) return null;
    const isB64 = /^[A-Za-z0-9+/]*={0,2}$/.test(b64) && b64.length % 4 === 0;
    return isB64 ? Buffer.from(b64, "base64").toString("utf-8") : b64;
  }
  http() {
    const h = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "user-agent": UA
    };
    if (this.sid) h.cookie = "connect.sid=" + this.sid;
    return axios.create({
      baseURL: BASE,
      headers: h,
      withCredentials: true
    });
  }
  async create({
    domain,
    name,
    ...rest
  } = {}) {
    try {
      console.log("[TempMail] create: menginisialisasi mailbox baru …");
      const dom = domain || "tempmail.cn";
      const user = name || crypto.randomBytes(4).toString("hex");
      const res = await this.http().get("/");
      this.ext(res.headers["set-cookie"]);
      this.email = user + "@" + dom;
      console.log("[TempMail] create: email diset ->", this.email);
      return {
        email: this.email,
        sid: this.enc(this.sid)
      };
    } catch (e) {
      console.error("[TempMail][ERR] create:", e.message);
      throw e;
    }
  }
  async message({
    email,
    sid,
    ...rest
  } = {}) {
    try {
      if (sid) {
        console.log("[TempMail] message: update sid baru (base64) …");
        this.sid = this.dec(sid);
      }
      const addr = email || this.email;
      if (!addr) throw new Error("email kosong");
      console.log("[TempMail] message: fetch inbox ->", addr);
      const res = await this.http().get("/api/mails/" + encodeURIComponent(addr));
      const data = res.data;
      const count = data ? Array.isArray(data) ? data.length : Array.isArray(data.mails) ? data.mails.length : 0 : 0;
      console.log("[TempMail] message: sukses,", count, "pesan.");
      return data;
    } catch (e) {
      console.error("[TempMail][ERR] message:", e.message);
      throw e;
    }
  }
  ext(cookie) {
    try {
      const raw = Array.isArray(cookie) ? cookie.join(";") : cookie || "";
      const m = raw.match(/connect\.sid=([^;]+)/);
      if (m && m[1]) {
        this.sid = m[1];
        console.log("[TempMail] ext: sid berhasil diperbarui.");
      }
    } catch (e) {
      console.error("[TempMail][ERR] ext:", e.message);
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
      usage: {
        method: "GET / POST",
        example: "/?action=create"
      }
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
        if (!params.email) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'email' wajib diisi untuk action 'message'."
          });
        }
        if (!params.sid) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'sid' wajib diisi untuk action 'message'."
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
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}