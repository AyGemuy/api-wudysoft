import axios from "axios";
class TempMailSo {
  constructor() {
    this.baseURL = "https://tempmail.so/us/api/inbox";
    this.ua = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
  }
  enc(str) {
    return str ? Buffer.from(str).toString("base64") : "";
  }
  dec(str) {
    return str ? Buffer.from(str, "base64").toString("utf-8") : "";
  }
  parse(headers) {
    const cookies = headers?.["set-cookie"] || [];
    const target = cookies.find(c => c.includes("tm_session"));
    return target ? target.split(";")[0].split("=")[1] : null;
  }
  head(cookie = null) {
    return {
      accept: "application/json",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://tempmail.so/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": this.ua,
      "x-inbox-lifespan": "600",
      ...cookie ? {
        cookie: `tm_session=${cookie}`
      } : {}
    };
  }
  async create() {
    console.log("[Proses] Request email baru...");
    const time = Date.now();
    try {
      const res = await axios.get(`${this.baseURL}?requestTime=${time}&lang=us`, {
        headers: this.head()
      });
      const data = res?.data?.data || {};
      const plainCookie = this.parse(res.headers);
      if (!plainCookie) {
        console.log("[Info] Gagal mendapatkan cookie session dari server.");
      }
      const sessionB64 = this.enc(plainCookie);
      console.log(`[Sukses] Email: ${data?.name || "Unknown"}`);
      return {
        status: true,
        email: data?.name || null,
        id: data?.id || null,
        expire: data?.expires || 0,
        session: sessionB64
      };
    } catch (err) {
      console.error("[Error] Create:", err?.message);
      return {
        status: false,
        msg: err?.message
      };
    }
  }
  async message({
    session
  }) {
    const realCookie = this.dec(session || "");
    console.log("[Proses] Cek inbox...");
    const time = Date.now();
    if (!realCookie) return {
      status: false,
      msg: "Session invalid/kosong"
    };
    try {
      const res = await axios.get(`${this.baseURL}?requestTime=${time}&lang=us`, {
        headers: this.head(realCookie)
      });
      const data = res?.data?.data || {};
      const inbox = data?.inbox || [];
      console.log(`[Sukses] Inbox count: ${inbox.length}`);
      return {
        status: true,
        email: data?.name,
        inbox: inbox,
        count: inbox.length
      };
    } catch (err) {
      console.error("[Error] Message:", err?.message);
      return {
        status: false,
        msg: err?.message
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
  const api = new TempMailSo();
  try {
    let response;
    switch (action) {
      case "create":
        response = await api.create();
        break;
      case "message":
        if (!params.session) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'session' wajib diisi untuk action 'message'."
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