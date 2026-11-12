import axios from "axios";
import crypto from "crypto";
class Facebook {
  constructor() {
    this.tsDef = 1766396381230;
    this.tscDef = 0;
    this.saltHex = "c47a3e2900a97965e28e98e342d5313faac60a2566967eac86159347d2461324";
    this.commonHeaders = {
      "accept-language": "id-ID",
      referer: "https://facebookdownloader.io/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _sign(url, ts) {
    try {
      const strMentah = `${url}${ts}${this.saltHex}`;
      return crypto.createHash("sha256").update(strMentah).digest("hex");
    } catch (err) {
      console.error("[ERROR] Gagal generate signature SHA-256:", err.message);
      return null;
    }
  }
  async _msec() {
    try {
      const response = await axios.get(`https://facebookdownloader.io/msec`, {
        headers: {
          ...this.commonHeaders,
          accept: "*/*",
          "cache-control": "no-cache",
          pragma: "no-cache"
        }
      });
      return response.data.msec;
    } catch (err) {
      console.error("[ERROR] Gagal mengambil msec:", err.message);
      return null;
    }
  }
  async download({
    url
  }) {
    try {
      console.log("[PROSES] Memulai download Facebook Reels untuk URL:", url);
      const msec = await this._msec();
      if (!msec) return {
        success: false,
        error: "Gagal mendapatkan msec dari server"
      };
      const ts = Math.floor(msec * 1e3) - 1634;
      const s = this._sign(url, ts);
      if (!s) return {
        success: false,
        error: "Gagal membuat signature"
      };
      const payload = new URLSearchParams();
      payload.append("sf_url", url);
      payload.append("ts", ts.toString());
      payload.append("_ts", this.tsDef.toString());
      payload.append("_tsc", this.tscDef.toString());
      payload.append("_s", s);
      const response = await axios.post(`https://facebookdownloader.io/api/convert`, payload.toString(), {
        headers: {
          ...this.commonHeaders,
          accept: "application/json, text/plain, */*",
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          origin: "https://facebookdownloader.io"
        }
      });
      return response.data;
    } catch (err) {
      console.error("[FATAL ERROR] Terjadi kegagalan pada method download:", err.message);
      return {
        success: false,
        error: err.message,
        output: err.response ? err.response.data : null
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
  const api = new Facebook();
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