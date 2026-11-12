import axios from "axios";
import crypto from "crypto";
class TempMail {
  constructor() {
    this.domains = ["ayu.biz.id", "ana.my.id", "andira.my.id"];
    this.http = axios.create({
      baseURL: "https://api.apps.web.id/email",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://afianf.vercel.app",
        pragma: "no-cache",
        referer: "https://afianf.vercel.app/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    this.rndDomain = () => this.domains[Math.floor(Math.random() * this.domains.length)];
    this.rndName = () => crypto.randomBytes(8).toString("hex");
    this.parse = raw => (raw ?? []).map(m => ({
      ...m,
      title: m?.title || "Tanpa Judul",
      html: m?.html_content || "",
      text: m?.text_content || "",
      sender: m?.sender || "unknown",
      time: m?.sent_time || "-"
    }));
  }
  async create({
    domain = this.rndDomain(),
    name = this.rndName(),
    ...rest
  } = {}) {
    const email = `${name}@${domain}`;
    console.log(`[create] membuat email: ${email}`);
    try {
      const res = await this.http.get("/get", {
        params: {
          address: email
        },
        ...rest
      });
      const data = this.parse(res?.data);
      console.log(`[create] berhasil, total pesan: ${data?.length || 0}`);
      return {
        result: data,
        email: email
      };
    } catch (err) {
      console.error(`[create] gagal:`, err?.response?.data || err?.message);
      return {
        result: null,
        email: email
      };
    }
  }
  async message({
    email,
    ...rest
  }) {
    console.log(`[message] mengambil pesan untuk: ${email}`);
    try {
      const res = await this.http.get("/get", {
        params: {
          address: email
        },
        ...rest
      });
      const data = this.parse(res?.data);
      console.log(`[message] ditemukan ${data?.length || 0} pesan`);
      return {
        result: data
      };
    } catch (err) {
      console.error(`[message] gagal:`, err?.response?.data || err?.message);
      return {
        result: null
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