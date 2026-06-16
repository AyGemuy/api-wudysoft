import axios from "axios";
import crypto from "crypto";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url;
console.log("CORS proxy untuk StoriesIG:", proxy);
class StoriesIG {
  constructor() {
    this.tsDef = 1781512078834;
    this.tscDef = 0;
    this.svDef = 2;
    this.saltHex = "0cddf0676e7b27f569d2e4cf131230d80eb9dd4107caed6919c786ff32eb91d5";
    this.commonHeaders = {
      "accept-language": "id-ID",
      referer: "https://storiesig.info/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _sign(url, ts) {
    try {
      console.log("[PROSES] Menggenerate signature HMAC _s untuk StoriesIG...");
      const jsonPart = `{"sf_url":"${url}"}`;
      const strMentah = `${jsonPart}${ts}`;
      const keyBuffer = Buffer.from(this.saltHex, "hex");
      return crypto.createHmac("sha256", keyBuffer).update(strMentah).digest("hex");
    } catch (err) {
      console.error("[ERROR] Gagal generate signature HMAC StoriesIG:", err.message);
      return null;
    }
  }
  async _msec() {
    try {
      console.log("[PROSES] Mengambil nilai msec storiesig via Axios...");
      const response = await axios.get(`${proxy}https://storiesig.info/msec`, {
        headers: {
          ...this.commonHeaders,
          accept: "*/*",
          "cache-control": "no-cache",
          pragma: "no-cache",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
      return response.data.msec;
    } catch (err) {
      console.error("[ERROR] Gagal mengambil msec server storiesig:", err.message);
      return null;
    }
  }
  async download({
    url
  }) {
    try {
      console.log("[PROSES] Memulai alur download storiesig untuk URL:", url);
      const msec = await this._msec();
      if (!msec) return {
        success: false,
        error: "Gagal mendapatkan msec dari storiesig"
      };
      console.log(`[SUKSES] msec didapat: ${msec}`);
      const ts = Math.floor(msec * 1e3) - 1380;
      const s = this._sign(url, ts);
      if (!s) return {
        success: false,
        error: "Gagal membuat signature HMAC StoriesIG"
      };
      console.log(`[SUKSES] ts dihitung: ${ts}, _s: ${s}`);
      const payload = new URLSearchParams({
        sf_url: url,
        ts: ts,
        _ts: this.tsDef,
        _tsc: this.tscDef,
        _sv: this.svDef,
        _s: s
      });
      console.log("[PROSES] Mengirim payload URL-Encoded ke endpoint api-wh storiesig...");
      const response = await axios.post(`${proxy}https://api-wh.storiesig.info/api/convert`, payload.toString(), {
        headers: {
          ...this.commonHeaders,
          accept: "application/json, text/plain, */*",
          "cache-control": "no-cache",
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          origin: "https://storiesig.info",
          pragma: "no-cache",
          priority: "u=1, i",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      console.log("[SUKSES] Respons asli API Convert storiesig berhasil didapatkan.");
      return response.data;
    } catch (err) {
      console.error("[FATAL ERROR] Terjadi kegagalan pada method download storiesig:", err.message);
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
  const api = new StoriesIG();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL StoriesIG";
    return res.status(500).json({
      error: errorMessage
    });
  }
}