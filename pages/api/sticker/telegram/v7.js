import axios from "axios";
import {
  randomBytes
} from "crypto";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
const BASE = "https://z.tools";
const API = "/api/t/telegram-stickers-downloader";
const MEDIA = "/api/utils/media/";
const PROXY = "/api/utils/image-proxy/";
class TgStickerDL {
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
  hex(len) {
    return randomBytes(Math.ceil(len / 2)).toString("hex").slice(0, len);
  }
  headers(extra = {}) {
    const tid = this.hex(32),
      sid = this.hex(16);
    return {
      "accept-language": "id-ID,id;q=0.9",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-nuxt-locale": "en",
      "x-timezone": "Asia/Makassar",
      baggage: ["sentry-environment=production", "sentry-public_key=8a893a4af5845d7ed6b0f22ff1911c09", `sentry-trace_id=${tid}`, "sentry-org_id=878306", "sentry-transaction=%2Ft%2Ftelegram-stickers-downloader", "sentry-sampled=true", `sentry-sample_rand=${Math.random()}`, "sentry-sample_rate=1"].join(","),
      "sentry-trace": `${tid}-${sid}-1`,
      ...extra
    };
  }
  resolve(s) {
    if (!s) return "";
    if (s.startsWith("http") || s.startsWith("blob:") || s.startsWith("data:")) return s;
    if (s.startsWith(PROXY) || s.startsWith(MEDIA)) return `${BASE}${s}`;
    return `${BASE}${PROXY}${s}`;
  }
  parse(data) {
    const {
      stickers = [], ...info
    } = data?.data || data;
    const result = stickers.map(s => ({
      ...s,
      file_url: this.resolve(s.file_url),
      thumbnail: s.thumbnail ?? s.thumb ?? null
    }));
    return {
      result: result,
      ...info
    };
  }
  async init() {
    console.log("[init] visiting tool page...");
    try {
      await this.http.get("/t/telegram-stickers-downloader", {
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
      const hdrs = this.headers({
        accept: "application/json, text/plain, */*",
        origin: BASE,
        referer: `${BASE}/t/telegram-stickers-downloader`,
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin"
      });
      console.log("[download] trace:", hdrs["sentry-trace"]);
      const res = await this.http.get(API, {
        params: {
          url: url,
          ...payload
        },
        headers: hdrs
      });
      console.log("[download] status:", res.status, "| success:", res.data?.success);
      if (res.status === 401) throw new Error("401 - session init failed");
      if (!res.data?.success) throw new Error(res.data?.message || "success=false");
      const parsed = this.parse(res.data);
      console.log("[download] stickers:", parsed.result?.length ?? 0);
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
  const api = new TgStickerDL();
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