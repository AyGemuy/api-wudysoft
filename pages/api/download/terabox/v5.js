import axios from "axios";
import https from "https";
class TeraBoxDl {
  constructor() {
    this.config = {
      api: "https://teraboxdl.site/api/proxy",
      origin: "https://teraboxdl.site",
      referer: "https://teraboxdl.site/",
      ua: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.ax = axios.create({
      baseURL: this.config.api,
      timeout: 3e4,
      httpsAgent: new https.Agent({
        keepAlive: true
      }),
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: this.config.origin,
        pragma: "no-cache",
        priority: "u=1, i",
        referer: this.config.referer,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": this.config.ua
      }
    });
  }
  log(step, msg, type = "info") {
    const ts = new Date().toLocaleTimeString();
    const icon = type === "error" ? "❌" : type === "warn" ? "⚠️" : "ℹ️";
    console.log(`[${ts}][TeraBox][${step}] ${icon} ${msg}`);
  }
  async download({
    url: teraUrl
  }) {
    this.log("Init", `Requesting proxy for: ${teraUrl}`);
    try {
      const payload = {
        url: teraUrl
      };
      const {
        data
      } = await this.ax.post("", payload);
      if (!data) {
        throw new Error("Empty response from proxy server");
      }
      this.log("Success", "Data retrieved successfully");
      return {
        success: true,
        ...data,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      const errMsg = err.response?.data?.message || err.message;
      this.log("Fatal", errMsg, "error");
      return {
        success: false,
        error: errMsg
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
  const api = new TeraBoxDl();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}