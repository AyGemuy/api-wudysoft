import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
class ImagyAPI {
  constructor() {
    this.baseURL = "https://gcp.imagy.app";
    this.apiURL = "/screenshot/createscreenshot";
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
    width = 1600,
    height = 900,
    fullPage = true,
    format = "png",
    output = "buffer"
  } = {}) {
    const targetUrl = url || "https://google.com";
    try {
      const response = await this.client.post(this.apiURL, {
        url: targetUrl,
        browserWidth: width,
        browserHeight: height,
        fullPage: fullPage,
        deviceScaleFactor: 1,
        format: format
      }, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "content-type": "application/json",
          origin: "https://imagy.app",
          priority: "u=1, i",
          referer: "https://imagy.app/",
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      const data = response?.data || {};
      const fileUrl = data.fileUrl || null;
      if (!fileUrl) throw new Error("Gagal mendapatkan URL file dari respons");
      const resImage = await axios.get(fileUrl, {
        responseType: "arraybuffer"
      });
      const buffer = Buffer.from(resImage?.data || "");
      const mime = resImage?.headers["content-type"] || `image/${format}`;
      const finalResult = output === "base64" && buffer.toString("base64") || output === "url" && fileUrl || buffer;
      return {
        success: true,
        data: finalResult,
        mime: mime,
        url: fileUrl
      };
    } catch (error) {
      const is503 = error.response?.status === 503;
      const errorMsg = is503 && "Server 503 (Overloaded/Bot Detected)" || error.message;
      console.error("[Imagy Error]", errorMsg);
      return {
        success: false,
        error: errorMsg,
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
  const api = new ImagyAPI();
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