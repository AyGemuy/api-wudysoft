import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class WowDownloader {
  constructor() {
    this.base = "https://wowdownloader.com";
    this.jar = new CookieJar();
    this.csrf = null;
    this.initOk = false;
    this.axios = wrapper(axios.create({
      baseURL: this.base,
      jar: this.jar,
      withCredentials: true,
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
        "Accept-Language": "id-ID",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        Pragma: "no-cache",
        Referer: `${this.base}/`,
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "same-origin",
        "Sec-Fetch-User": "?1",
        "Upgrade-Insecure-Requests": "1",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"'
      }
    }));
    this._map = [
      ["tiktok.com", "tiktok-video-downloader"],
      ["youtube.com", "youtube-video-downloader"],
      ["youtu.be", "youtube-video-downloader"],
      ["instagram.com", "instagram-video-downloader"],
      ["pinterest.com", "pinterest-video-downloader"],
      ["linkedin.com", "linkedin-video-downloader"],
      ["spotify.com", "spotify-downloader"],
      ["soundcloud.com", "soundcloud-downloader"],
      ["twitter.com", "twitter-video-downloader"],
      ["x.com", "twitter-video-downloader"],
      ["facebook.com", "facebook-video-downloader"],
      ["fb.watch", "facebook-video-downloader"]
    ];
  }
  _detId(url) {
    try {
      const q = new URL(url);
      if (q.searchParams.has("tool")) return q.searchParams.get("tool");
      const m = q.pathname.match(/^\/tool\/([^/?#]+)/);
      if (m) return m[1];
      for (const [domain, slug] of this._map) {
        if (q.hostname.includes(domain)) return slug;
      }
    } catch (e) {
      console.error("[WD_DET_URL_ERR]", e.message);
    }
    try {
      const low = url.toLowerCase();
      const uniqueSlugs = [...new Set(this._map.map(([_, slug]) => slug))];
      for (const slug of uniqueSlugs) {
        if (low.includes(slug)) return slug;
      }
    } catch (e) {
      console.error("[WD_DET_SLUG_ERR]", e.message);
    }
    return null;
  }
  async _get(p) {
    try {
      const u = p.startsWith("http") ? p : this.base + p;
      console.log("[WD_FETCH]", u);
      const res = await this.axios.get(u);
      return res.data;
    } catch (e) {
      console.error("[WD_GET_ERR]", e.message);
      throw e;
    }
  }
  _csrf(h) {
    try {
      return cheerio.load(h)('meta[name="csrf-token"]').attr("content") || null;
    } catch (e) {
      console.error("[WD_CSRF_ERR]", e.message);
      return null;
    }
  }
  async init() {
    if (this.initOk) return;
    try {
      const h = await this._get("/");
      this.csrf = this._csrf(h);
      if (!this.csrf) throw new Error("No CSRF");
      console.log("[WD_CSRF_OK]", this.csrf);
      this.initOk = true;
    } catch (e) {
      console.error("[WD_INIT_FAILED]", e.message);
      throw e;
    }
  }
  getSupportedSlugs() {
    return [...new Set(this._map.map(([_, slug]) => slug))];
  }
  detectToolId(u) {
    try {
      return this._detId(u);
    } catch (e) {
      console.error("[WD_DETECT_ERR]", e.message);
      return null;
    }
  }
  async download({
    url,
    tool,
    ...rest
  }) {
    try {
      if (!this.initOk) await this.init();
      const id = tool || this.detectToolId(url);
      if (!id) throw new Error("Tool ID undetected");
      console.log("[WD_TARGET_TOOL]", id);
      const pay = {
        url: url,
        tool: id,
        ...rest
      };
      console.log("[WD_POST_API]", pay);
      const res = await this.axios.post("/api/download", pay, {
        headers: {
          Accept: "*/*",
          "Content-Type": "application/json",
          "X-CSRF-TOKEN": this.csrf,
          Origin: this.base,
          Referer: `${this.base}/tool/${id}?url=${encodeURIComponent(url)}`,
          "Sec-Fetch-Dest": "empty",
          "Sec-Fetch-Mode": "cors"
        }
      });
      return res.data;
    } catch (e) {
      console.error("[WD_DOWNLOAD_ERR]", e.message, e.response?.status, e.response?.data);
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
  const api = new WowDownloader();
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