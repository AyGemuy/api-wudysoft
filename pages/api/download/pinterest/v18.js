import axios from "axios";
import * as cheerio from "cheerio";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class KlickDownloader {
  constructor() {
    const jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: jar
    }));
    this.base = "https://klickpin.com/id";
    console.log("✓ Client initialized");
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log("→ Fetching token");
      const token = await this.token();
      console.log("→ Processing:", url);
      const {
        data
      } = await this.client.post(`${this.base}/download`, `url=${encodeURIComponent(url)}&csrf_token=${token}`, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "accept-language": "id-ID",
          "content-type": "application/x-www-form-urlencoded",
          origin: "https://klickpin.com",
          referer: `${this.base}/`,
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        },
        ...rest
      });
      console.log("✓ Response received");
      return this.prs(data);
    } catch (err) {
      console.error("✗ Download error:", err?.message || err);
      throw err;
    }
  }
  async token() {
    try {
      const {
        data
      } = await this.client.get(`${this.base}/get-csrf-token.php?t=${Date.now()}`, {
        headers: {
          accept: "application/json",
          referer: `${this.base}/`,
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      console.log("✓ Token fetched");
      return data?.csrf_token || null;
    } catch (err) {
      console.error("✗ Token error:", err?.message || err);
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
      const title = $("h1.responsive-heading").text()?.trim() || "No title";
      const description = $(".active strong").text()?.trim() || "";
      const video = $("#myVideo").attr("data-src") || null;
      const videoBtn = $("#dlMP4").attr("onclick")?.match(/downloadFile\('([^']+)'/)?.[1];
      const image = $("#dljpg").attr("onclick")?.match(/downloadFile\('([^']+)'/)?.[1];
      const link2 = $("a.custom-button-style3").attr("href") || null;
      const result = [];
      const finalVideo = video || videoBtn;
      if (finalVideo) {
        result.push({
          type: "video",
          url: finalVideo,
          quality: finalVideo.match(/\/(\d+)p\//)?.[1] ? `${finalVideo.match(/\/(\d+)p\//)[1]}p` : "unknown",
          ext: this.ext(finalVideo)
        });
      }
      if (image) {
        result.push({
          type: "image",
          url: image,
          quality: image.match(/\/(\d+)x\//)?.[1] ? `${image.match(/\/(\d+)x\//)[1]}p` : "unknown",
          ext: this.ext(image)
        });
      }
      console.log(`✓ Found ${result.length} media(s)`);
      return {
        result: result,
        title: title,
        description: description,
        link2: link2
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
  const api = new KlickDownloader();
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