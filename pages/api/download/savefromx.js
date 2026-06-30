import axios from "axios";
import crypto from "crypto";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url;
console.log("CORS proxy untuk SaveFromX:", proxy);
class SaveFromX {
  constructor() {
    this.tsDef = 1779186906324;
    this.tscDef = 0;
    this.saltHex = "7c830e8b26e5f46b119c9354ae044fa91489655bc15c9fb09dd0b9d45aa16da4";
    this.commonHeaders = {
      "accept-language": "id-ID",
      referer: "https://savefromx.to/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _sign(url, ts) {
    try {
      console.log("[PROSES] Menggenerate signature SHA-256 murni untuk SaveFromX...");
      const strMentah = `${url}${ts}${this.saltHex}`;
      return crypto.createHash("sha256").update(strMentah).digest("hex");
    } catch (err) {
      console.error("[ERROR] Gagal generate signature SHA-256 SaveFromX:", err.message);
      return null;
    }
  }
  async _msec() {
    try {
      console.log("[PROSES] Mengambil nilai msec savefromx via Axios...");
      const response = await axios.get(`${proxy}https://savefromx.to/msec`, {
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
      console.error("[ERROR] Gagal mengambil msec server savefromx:", err.message);
      return null;
    }
  }
  async download({
    url
  }) {
    try {
      console.log("[PROSES] Memulai alur download savefromx untuk URL:", url);
      const msec = await this._msec();
      if (!msec) return {
        success: false,
        error: "Gagal mendapatkan msec dari savefromx"
      };
      console.log(`[SUKSES] msec didapat: ${msec}`);
      const ts = Math.floor(msec * 1e3) - 1584;
      const s = this._sign(url, ts);
      if (!s) return {
        success: false,
        error: "Gagal membuat signature SHA-256 SaveFromX"
      };
      console.log(`[SUKSES] ts dihitung: ${ts}, _s: ${s}`);
      const payload = new URLSearchParams();
      payload.append("sf_url", url);
      payload.append("ts", ts.toString());
      payload.append("_ts", this.tsDef.toString());
      payload.append("_tsc", this.tscDef.toString());
      payload.append("_s", s);
      console.log("[PROSES] Mengirim payload Form-UrlEncoded ke endpoint convert SaveFromX...");
      const response = await axios.post(`${proxy}https://savefromx.to/api/convert`, payload.toString(), {
        headers: {
          ...this.commonHeaders,
          accept: "application/json, text/plain, */*",
          "cache-control": "no-cache",
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          origin: "https://savefromx.to",
          pragma: "no-cache",
          priority: "u=1, i",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
      console.log("[SUKSES] Respons asli API Convert savefromx berhasil didapatkan.");
      return response.data;
    } catch (err) {
      console.error("[FATAL ERROR] Terjadi kegagalan pada method download savefromx:", err.message);
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
  const api = new SaveFromX();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL SaveFromX";
    return res.status(500).json({
      error: errorMessage
    });
  }
}