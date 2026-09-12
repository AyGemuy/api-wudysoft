import axios from "axios";
import * as cheerio from "cheerio";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import qs from "qs";
class BrightSEOTools {
  constructor() {
    this.baseURL = "https://brightseotools.com";
    this.path = "/website-screenshot-generator";
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: this.baseURL,
      jar: this.jar,
      withCredentials: true,
      timeout: 6e4
    }));
  }
  async generate({
    url,
    type = "desktop",
    output = "buffer"
  } = {}) {
    const targetUrl = url || "https://google.com";
    console.log("[BrightSEO] Processing:", targetUrl);
    try {
      const initialReq = await this.client.get(this.path, {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      const $initial = cheerio.load(initialReq.data);
      const csrfToken = $initial('input[name="_token"]').val();
      if (!csrfToken) throw new Error("Could not find CSRF token");
      const postData = qs.stringify({
        _token: csrfToken,
        url: targetUrl,
        type: type
      });
      const response = await this.client.post(this.path, postData, {
        headers: {
          "content-type": "application/x-www-form-urlencoded",
          origin: this.baseURL,
          referer: this.baseURL + this.path,
          "upgrade-insecure-requests": "1",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      const $result = cheerio.load(response.data);
      const imgPath = $result("img.screenshot").attr("src");
      if (!imgPath) throw new Error("Screenshot image not found in response");
      console.log("[BrightSEO] Image URL:", imgPath);
      const resImage = await this.client.get(imgPath, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(resImage?.data || "");
      const mime = resImage?.headers["content-type"] || "image/png";
      const finalResult = output === "base64" && buffer.toString("base64") || output === "url" && imgPath || buffer;
      return {
        success: true,
        data: finalResult,
        mime: mime,
        url: imgPath
      };
    } catch (error) {
      console.error("[BrightSEO Error]", error.message);
      return {
        success: false,
        error: error.response?.data?.message || error.message || "Request failed",
        status: error.response?.status
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
  const api = new BrightSEOTools();
  try {
    const result = await api.generate(params);
    res.setHeader("Content-Type", result.mime);
    return res.status(200).send(result.data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}