import axios from "axios";
import crypto from "crypto";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy untuk GramSnap:", proxy);
class GramSnap {
  constructor() {
    this.tsDef = 1779909303586;
    this.tscDef = 0;
    this.saltHex = "30386c2c947b47a1a3654d2f20efd7bc206898310f8d7f2d10a207cd1191ef28";
    this.commonHeaders = {
      "accept-language": "id-ID",
      referer: "https://gramsnap.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _sign(url, ts) {
    try {
      console.log("[PROSES] Menggenerate signature SHA-256 murni untuk GramSnap...");
      const jsonPart = `{"target_url":"${url}"}`;
      const strMentah = `${jsonPart}${ts}${this.saltHex}`;
      return crypto.createHash("sha256").update(strMentah).digest("hex");
    } catch (err) {
      console.error("[ERROR] Gagal generate signature SHA-256 GramSnap:", err.message);
      return null;
    }
  }
  async _msec() {
    try {
      console.log("[PROSES] Mengambil nilai msec gramsnap via Axios...");
      const response = await axios.get(`${proxy}https://gramsnap.com/msec`, {
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
      console.error("[ERROR] Gagal mengambil msec server gramsnap:", err.message);
      return null;
    }
  }
  async download({
    url
  }) {
    try {
      console.log("[PROSES] Memulai alur download gramsnap untuk URL:", url);
      const msec = await this._msec();
      if (!msec) return {
        success: false,
        error: "Gagal mendapatkan msec dari gramsnap"
      };
      console.log(`[SUKSES] msec didapat: ${msec}`);
      const ts = Math.floor(msec * 1e3) - 1573;
      const s = this._sign(url, ts);
      if (!s) return {
        success: false,
        error: "Gagal membuat signature SHA-256 GramSnap"
      };
      console.log(`[SUKSES] ts dihitung: ${ts}, _s: ${s}`);
      const payload = {
        target_url: url,
        ts: ts,
        _ts: this.tsDef,
        _tsc: this.tscDef,
        _s: s
      };
      console.log("[PROSES] Mengirim payload JSON ke endpoint api-wh gramsnap...");
      const response = await axios.post(`${proxy}https://api-wh.gramsnap.com/api/convert`, payload, {
        headers: {
          ...this.commonHeaders,
          accept: "application/json, text/plain, */*",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://gramsnap.com",
          pragma: "no-cache",
          priority: "u=1, i",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      console.log("[SUKSES] Respons asli API Convert gramsnap berhasil didapatkan.");
      return response.data;
    } catch (err) {
      console.error("[FATAL ERROR] Terjadi kegagalan pada method download gramsnap:", err.message);
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
  const api = new GramSnap();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL GramSnap";
    return res.status(500).json({
      error: errorMessage
    });
  }
}