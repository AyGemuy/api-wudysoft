import axios from "axios";
import crypto from "crypto";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url;
console.log("CORS proxy untuk SSYoutube:", proxy);
class SSYoutube {
  constructor() {
    this.tsDef = 1781518364683;
    this.tscDef = 0;
    this.saltHex = "556684f810b787ea766d0d866a1223ff38b348a8ddee2920d7a7179f020cafca";
    this.commonHeaders = {
      "accept-language": "id-ID",
      referer: "https://id.ssyoutube.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _sign(url, ts) {
    try {
      console.log("[PROSES] Menggenerate signature SHA-256 murni untuk SSYoutube...");
      const jsonPart = `{"target_url":"${url}"}`;
      const strMentah = `${jsonPart}${ts}${this.saltHex}`;
      return crypto.createHash("sha256").update(strMentah).digest("hex");
    } catch (err) {
      console.error("[ERROR] Gagal generate signature SHA-256 SSYoutube:", err.message);
      return null;
    }
  }
  async _msec() {
    try {
      console.log("[PROSES] Mengambil nilai msec ssyoutube via Axios...");
      const response = await axios.get(`${proxy}https://id.ssyoutube.com/msec`, {
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
      console.error("[ERROR] Gagal mengambil msec server ssyoutube:", err.message);
      return null;
    }
  }
  async download({
    url
  }) {
    try {
      console.log("[PROSES] Memulai alur download ssyoutube untuk URL:", url);
      const msec = await this._msec();
      if (!msec) return {
        success: false,
        error: "Gagal mendapatkan msec dari ssyoutube"
      };
      console.log(`[SUKSES] msec didapat: ${msec}`);
      const ts = Math.floor(msec * 1e3);
      const s = this._sign(url, ts);
      if (!s) return {
        success: false,
        error: "Gagal membuat signature SHA-256 SSYoutube"
      };
      console.log(`[SUKSES] ts dihitung: ${ts}, _s: ${s}`);
      const payload = {
        target_url: url,
        ts: ts,
        _ts: this.tsDef,
        _tsc: this.tscDef,
        _s: s
      };
      console.log("[PROSES] Mengirim payload JSON ke endpoint api-wh convert ssyoutube...");
      const response = await axios.post(`${proxy}https://api-wh.ssyoutube.com/api/convert`, payload, {
        headers: {
          ...this.commonHeaders,
          accept: "application/json, text/plain, */*",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://id.ssyoutube.com",
          pragma: "no-cache",
          priority: "u=1, i",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      console.log("[SUKSES] Respons asli API Convert ssyoutube berhasil didapatkan.");
      return response.data;
    } catch (err) {
      console.error("[FATAL ERROR] Terjadi kegagalan pada method download ssyoutube:", err.message);
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
  const api = new SSYoutube();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL SSYoutube";
    return res.status(500).json({
      error: errorMessage
    });
  }
}