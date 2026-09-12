import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import * as cheerio from "cheerio";
class RobinReach {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: this.jar,
      baseURL: "https://robinreach.com",
      headers: {
        "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json"
      }
    }));
  }
  async getToken(path) {
    try {
      console.log(`[LOG] Syncing session: ${path}`);
      const {
        data
      } = await this.client.get(path);
      const $ = cheerio.load(data);
      return $('meta[name="csrf-token"]').attr("content") || "";
    } catch (e) {
      console.error(`[ERR] CSRF Error: ${e.message}`);
      return "";
    }
  }
  parseResult(res, type) {
    const rawPath = res?.proxy_download_url || "";
    if (!rawPath) return null;
    try {
      const fullUrl = new URL(rawPath, this.client.defaults.baseURL);
      if (!fullUrl.searchParams.has("filename")) {
        fullUrl.searchParams.set("filename", res?.filename || `${type}_download.mp4`);
      }
      return fullUrl.toString();
    } catch (e) {
      return rawPath.startsWith("http") ? rawPath : `${this.client.defaults.baseURL}${rawPath}`;
    }
  }
  async download({
    url,
    type = "tik",
    ...rest
  }) {
    try {
      console.log(`[LOG] Downloading ${type}...`);
      const isIg = type === "ig";
      const ref = isIg ? "/en/free-tools/instagram-reel-downloader" : "/en/free-tools/tiktok-video-downloader";
      const api = isIg ? "/free-tools/download-instagram-reel" : "/free-tools/download-tiktok-video";
      const token = await this.getToken(ref);
      const payload = isIg ? {
        free_tool: {
          instagram_url: url
        }
      } : {
        tiktok_url: url || ""
      };
      const {
        data
      } = await this.client.post(api, payload, {
        headers: {
          "x-csrf-token": token,
          Referer: `${this.client.defaults.baseURL}${ref}`
        }
      });
      return {
        success: data?.success ?? false,
        result: this.parseResult(data, type),
        filename: data?.filename || "file.mp4",
        ...data?.usage_info
      };
    } catch (e) {
      console.error(`[ERR] Process failed: ${e.response?.data?.error || e.message}`);
      return {
        success: false,
        error: e.message
      };
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
  const api = new RobinReach();
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