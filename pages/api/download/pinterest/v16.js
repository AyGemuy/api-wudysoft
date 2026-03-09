import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
class PinDownloader {
  constructor() {
    const jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: jar
    }));
    console.log("✓ Client initialized");
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log("→ Fetching:", url);
      const form = new FormData();
      form.append("url", url);
      const {
        data
      } = await this.client.post("https://savethatpin.com/id/", form, {
        headers: {
          ...form.getHeaders(),
          accept: "*/*",
          "accept-language": "id-ID",
          origin: "https://savethatpin.com",
          referer: "https://savethatpin.com/id/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest"
        },
        ...rest
      });
      console.log("✓ Response received");
      return this.prs(data?.html || data);
    } catch (err) {
      console.error("✗ Download error:", err?.message || err);
      throw err;
    }
  }
  ext(url) {
    return url?.match(/\.(\w+)$/)?.[1]?.toLowerCase() || "unknown";
  }
  prs(html) {
    try {
      console.log("→ Parsing HTML");
      const $ = cheerio.load(html);
      const title = $("h2").first().text()?.trim() || "No title";
      const vids = $(".preview-video source").map((i, el) => {
        const url = $(el).attr("src");
        const match = url?.match(/\/(\d+)p\//);
        const quality = match ? `${match[1]}p` : "unknown";
        const thumbnail = $(".preview-video").eq(i).attr("poster") || null;
        const ext = this.ext(url);
        return url ? {
          type: "video",
          url: url,
          quality: quality,
          thumbnail: thumbnail,
          ext: ext
        } : null;
      }).get().filter(Boolean);
      const imgs = $(".quality-btn").map((i, el) => {
        const url = $(el).attr("href");
        const isImg = url?.startsWith("https://i.pinimg.com/") || false;
        if (!isImg) return null;
        const match = url.match(/\/(\d+)x\//);
        const quality = match ? `${match[1]}p` : url.match(/\/originals\//)?.[0] ? "original" : "unknown";
        const ext = this.ext(url);
        return {
          type: "image",
          url: url,
          quality: quality,
          ext: ext
        };
      }).get().filter(Boolean);
      const result = [...vids, ...imgs];
      console.log(`✓ Found ${result.length} media(s)`);
      return {
        result: result,
        title: title,
        count: result.length
      };
    } catch (err) {
      console.error("✗ Parse error:", err?.message || err);
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
  const api = new PinDownloader();
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