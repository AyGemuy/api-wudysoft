import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class YTDownloader {
  constructor() {
    console.log("[Init] Membuat instance downloader");
    const jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: jar
    }));
    this.base = "https://app.ytdown.to/proxy.php";
    this.headers = {
      accept: "*/*",
      "accept-language": "id-ID",
      "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
      origin: "https://app.ytdown.to",
      referer: "https://app.ytdown.to/id2/",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      "x-requested-with": "XMLHttpRequest"
    };
  }
  snake(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(v => this.snake(v));
    return Object.keys(obj).reduce((acc, k) => {
      acc[k.replace(/[A-Z]/g, c => `_${c.toLowerCase()}`)] = this.snake(obj[k]);
      return acc;
    }, {});
  }
  async get(url) {
    console.log(`[Req] ${url?.substring(0, 60)}...`);
    try {
      const {
        data
      } = await this.client.post(this.base, `url=${encodeURIComponent(url)}`, {
        headers: this.headers
      });
      console.log(`[Res] ${data?.api?.status || "unknown"}`);
      return data;
    } catch (e) {
      console.error("[Err]", e?.message || e);
      throw e;
    }
  }
  async wait(url, delay = 3e3, max = 60) {
    console.log(`[Poll] Start (${delay}ms, max ${max}x)`);
    for (let i = 1; i <= max; i++) {
      try {
        const d = await this.get(url);
        const s = d?.api?.status;
        console.log(`[${i}/${max}] ${s}`);
        if (s === "completed") return d;
        await new Promise(r => setTimeout(r, delay));
      } catch (e) {
        if (i === max) throw e;
      }
    }
    throw new Error("Timeout");
  }
  async download({
    url,
    media = 1,
    delay = 3e3,
    max = 60
  }) {
    console.log(`[DL] URL: ${url}, Media: ${media}`);
    try {
      const init = await this.get(url);
      const ia = init?.api || {};
      const items = ia?.media_items || ia?.mediaItems || [];
      if (!items?.length) throw new Error("No media");
      const idx = media > 0 && media <= items.length ? media - 1 : 0;
      const sel = items[idx];
      const murl = sel?.media_url || sel?.mediaUrl;
      if (!murl) throw new Error("No media URL");
      console.log(`[Media] ${sel?.name || `#${idx + 1}`} ${idx !== media - 1 ? "(default fallback)" : ""}`);
      const poll = await this.wait(murl, delay, max);
      const pa = poll?.api || {};
      const list = items?.map((v, i) => ({
        index: i + 1,
        ...v
      })) || [];
      const info = {
        index: idx + 1,
        ...sel
      };
      return {
        result: this.snake({
          ...ia,
          ...pa
        }),
        available: this.snake(list),
        selected: this.snake(info)
      };
    } catch (e) {
      console.error("[DL Err]", e?.message || e);
      throw e;
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
  const api = new YTDownloader();
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