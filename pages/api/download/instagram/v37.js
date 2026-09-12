import axios from "axios";
import * as cheerio from "cheerio";
class InstaSave {
  constructor() {
    console.log("[Log] Init class...");
    try {
      this.types = ["media", "story", "dp"];
      this.client = axios.create({
        baseURL: "https://api.instasave.website",
        method: "POST",
        headers: {
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "Content-Type": "application/x-www-form-urlencoded",
          Referer: "https://instasave.website/",
          "Accept-Language": "id-ID",
          "sec-ch-ua-mobile": "?1",
          "User-Agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "sec-ch-ua-platform": '"Android"'
        }
      });
    } catch (err) {
      console.error(`[Error] Init: ${err.message}`);
    }
  }
  async req(url, data) {
    console.log(`[Log] Request: ${url}`);
    try {
      const res = await this.client({
        url: url,
        data: data
      });
      return {
        success: true,
        data: res.data
      };
    } catch (err) {
      console.error(`[Error] Req: ${err.message}`);
      return {
        success: false,
        message: err.message
      };
    }
  }
  parse(html) {
    console.log("[Log] Parsing...");
    try {
      const clean = (html || "").replace(/loader\['style'\]\['display'\]='none',document\['getElementById'\]\('div_download'\)\['innerHTML'\]='/g, "").replace(/',document\['getElementById'\]\('downloader'\)\['remove'\]\(\),showAd\(\);/g, "").replace(/\\x22/g, '"').replace(/\\x20/g, " ");
      const $ = cheerio.load(clean);
      const results = $(".download-box .download-items").map((_, el) => ({
        thumb: $(el).find(".download-items__thumb img").attr("src") || "",
        download: $(el).find(".download-items__btn a").attr("href") || ""
      })).get();
      return {
        success: true,
        results: results
      };
    } catch (err) {
      console.error(`[Error] Parse: ${err.message}`);
      return {
        success: false,
        message: err.message,
        results: []
      };
    }
  }
  async download({
    url,
    type,
    ...rest
  }) {
    console.log("[Log] Downloading...");
    try {
      const target = url?.trim() || "";
      const actType = type ? type.trim().toLowerCase() : "media";
      if (!this.types.includes(actType)) {
        return {
          success: false,
          message: `Invalid type: ${actType}`,
          valid_types: this.types
        };
      }
      if (!target) return {
        success: false,
        message: "URL empty."
      };
      const res = await this.req(`/${actType}`, `url=${encodeURIComponent(target)}&lang=en`);
      return res.success ? this.parse(res.data) : res;
    } catch (err) {
      console.error(`[Error] Fatal: ${err.message}`);
      return {
        success: false,
        message: err.message
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
  const api = new InstaSave();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}