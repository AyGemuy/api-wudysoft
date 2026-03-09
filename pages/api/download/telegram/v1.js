import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
const BASE = "https://telegramdownloader.net";
const API = "/proxy.php";
class TgDownloaderNet {
  constructor() {
    this.jar = new CookieJar();
    this.http = wrapper(axios.create({
      baseURL: BASE,
      timeout: 3e4,
      validateStatus: s => s < 500,
      jar: this.jar,
      withCredentials: true
    }));
    this.ready = false;
  }
  headers(extra = {}) {
    return {
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      priority: "u=1, i",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      ...extra
    };
  }
  parse(data) {
    const inner = data?.data?.data || {};
    return {
      status: inner.status,
      link: inner.link,
      file_name: inner.file_name,
      expiry: inner.expiry
    };
  }
  async init() {
    console.log("[init] visiting homepage...");
    try {
      await this.http.get("/", {
        headers: this.headers({
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "none",
          "upgrade-insecure-requests": "1"
        })
      });
      const cookies = await this.jar.getCookies(BASE);
      console.log("[init] cookies:", cookies.map(c => `${c.key}=${c.value.slice(0, 16)}...`).join(", ") || "(none)");
      this.ready = true;
    } catch (err) {
      console.error("[init] error:", err?.message);
      throw err;
    }
  }
  async download({
    url,
    ...payload
  }) {
    if (!this.ready) await this.init();
    console.log("[download] url:", url);
    try {
      const body = new URLSearchParams({
        telegram_link: url,
        ...payload
      }).toString();
      const res = await this.http.post(API, body, {
        headers: this.headers({
          accept: "*/*",
          "content-type": "application/x-www-form-urlencoded",
          origin: BASE,
          referer: `${BASE}/`
        })
      });
      console.log("[download] status:", res.status, "| success:", res.data?.success);
      if (!res.data?.success) throw new Error(res.data?.message || "success=false");
      const parsed = this.parse(res.data);
      console.log("[download] link:", parsed.link);
      console.log("[download] expiry:", parsed.expiry);
      return parsed;
    } catch (err) {
      console.error("[download] error:", err?.response?.status, err?.response?.data || err?.code || err?.message);
      throw err;
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new TgDownloaderNet();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}