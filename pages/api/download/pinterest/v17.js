import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
class PintDownloader {
  constructor() {
    const jar = new CookieJar();
    this.client = wrapper(axios.create({
      jar: jar
    }));
    this.base = "https://pintdownloader.com/wp-admin/admin-ajax.php";
    console.log("✓ Client initialized");
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log("→ Fetching nonce");
      const nonce = await this.nonce();
      console.log("→ Processing:", url);
      const {
        data
      } = await this.client.post(this.base, `action=process_pinterest_url&url=${encodeURIComponent(url)}&nonce=${nonce}`, {
        headers: {
          accept: "*/*",
          "accept-language": "id-ID",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          origin: "https://pintdownloader.com",
          referer: "https://pintdownloader.com/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest"
        },
        ...rest
      });
      console.log("✓ Response received");
      return this.cnv(data);
    } catch (err) {
      console.error("✗ Download error:", err?.message || err);
      throw err;
    }
  }
  async nonce() {
    try {
      const {
        data
      } = await this.client.post(this.base, "action=pindl_refresh_nonce", {
        headers: {
          accept: "*/*",
          "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
          origin: "https://pintdownloader.com",
          referer: "https://pintdownloader.com/",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
        }
      });
      return data?.data?.nonce || null;
    } catch (err) {
      console.error("✗ Nonce error:", err?.message || err);
      throw err;
    }
  }
  snk(str) {
    return str?.replace(/([A-Z])/g, "_$1").toLowerCase().replace(/^_/, "") || str;
  }
  cnv(obj) {
    if (!obj || typeof obj !== "object") return obj;
    if (Array.isArray(obj)) return obj.map(i => this.cnv(i));
    return Object.keys(obj).reduce((acc, key) => {
      acc[this.snk(key)] = this.cnv(obj[key]);
      return acc;
    }, {});
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new PintDownloader();
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