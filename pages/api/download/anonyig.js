import axios from "axios";
import crypto from "crypto";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url;
console.log("CORS proxy untuk AnonyIG:", proxy);
class AnonyIG {
  constructor() {
    this.tsDef = 1780475587419;
    this.tscDef = 0;
    this.svDef = 2;
    this.saltHex = "aedbdd3c03b9587584bf4f35ad845005051ee8ad913270273ce01192ba27f5fa";
    this.commonHeaders = {
      "accept-language": "id-ID",
      referer: "https://anonyig.com/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _sign(url, ts) {
    try {
      console.log("[PROSES] Menggenerate signature HMAC _s untuk AnonyIG...");
      const jsonPart = `{"target_url":"${url}"}`;
      const strMentah = `${jsonPart}${ts}`;
      const keyBuffer = Buffer.from(this.saltHex, "hex");
      return crypto.createHmac("sha256", keyBuffer).update(strMentah).digest("hex");
    } catch (err) {
      console.error("[ERROR] Gagal generate signature HMAC AnonyIG:", err.message);
      return null;
    }
  }
  async _msec() {
    try {
      console.log("[PROSES] Mengambil nilai msec anonyig via Axios...");
      const response = await axios.get(`${proxy}https://anonyig.com/msec`, {
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
      console.error("[ERROR] Gagal mengambil msec server anonyig:", err.message);
      return null;
    }
  }
  async download({
    url
  }) {
    try {
      console.log("[PROSES] Memulai alur download anonyig untuk URL:", url);
      const msec = await this._msec();
      if (!msec) return {
        success: false,
        error: "Gagal mendapatkan msec dari anonyig"
      };
      console.log(`[SUKSES] msec didapat: ${msec}`);
      const ts = Math.floor(msec * 1e3) - 1380;
      const s = this._sign(url, ts);
      if (!s) return {
        success: false,
        error: "Gagal membuat signature HMAC AnonyIG"
      };
      console.log(`[SUKSES] ts dihitung: ${ts}, _s: ${s}`);
      const payload = {
        target_url: url,
        ts: ts,
        _ts: this.tsDef,
        _tsc: this.tscDef,
        _sv: this.svDef,
        _s: s
      };
      console.log("[PROSES] Mengirim payload JSON ke endpoint api-wh anonyig...");
      const response = await axios.post(`${proxy}https://api-wh.anonyig.com/api/convert`, payload, {
        headers: {
          ...this.commonHeaders,
          accept: "application/json, text/plain, */*",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://anonyig.com",
          pragma: "no-cache",
          priority: "u=1, i",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      console.log("[SUKSES] Respons asli API Convert anonyig berhasil didapatkan.");
      return response.data;
    } catch (err) {
      console.error("[FATAL ERROR] Terjadi kegagalan pada method download anonyig:", err.message);
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
  const api = new AnonyIG();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL AnonyIG";
    return res.status(500).json({
      error: errorMessage
    });
  }
}