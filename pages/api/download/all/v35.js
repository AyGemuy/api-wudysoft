import axios from "axios";
class Downloader {
  constructor() {
    this.base = "https://getindevice.com/api";
    this.ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
  }
  async getToken() {
    try {
      console.log("Logging: Fetching token...");
      const res = await axios.get(`${this.base}/token/`, {
        params: {
          _t: Date.now()
        },
        headers: {
          "User-Agent": this.ua,
          Referer: "https://getindevice.com/"
        }
      });
      return res.data?.token || null;
    } catch (e) {
      console.error("Logging: Error fetching token", e.message);
      return null;
    }
  }
  async download({
    url,
    ...rest
  }) {
    try {
      const token = await this.getToken();
      const t = token || "default-token-fallback";
      console.log(`Logging: Downloading ${url || "unknown url"}...`);
      const res = await axios.post(`${this.base}/download/`, {
        url: url
      }, {
        headers: {
          "User-Agent": this.ua,
          "x-request-token": t,
          "Content-Type": "application/json",
          Referer: "https://getindevice.com/"
        }
      });
      return res.data ? res.data : {
        error: "No data"
      };
    } catch (e) {
      console.error("Logging: Download failed", e.message);
      return {
        status: "failed",
        msg: e.message
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
  const api = new Downloader();
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