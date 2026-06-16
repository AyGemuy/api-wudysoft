import axios from "axios";
import crypto from "crypto";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url;
console.log("CORS proxy untuk SnapInsta Guru:", proxy);
class SnapInstaGuru {
  constructor() {
    this.tsDef = 1779091957309;
    this.tscDef = 0;
    this.saltHex = "c2235ac6eb890bc838a48ac9dce1f938163b98a2af342424209c342c5fa4b8ac";
    this.commonHeaders = {
      "accept-language": "id-ID",
      referer: "https://snapinsta.guru/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _sign(url, ts) {
    try {
      console.log("[PROSES] Menggenerate signature SHA-256 murni untuk SnapInsta...");
      const strMentah = `${url}${ts}${this.saltHex}`;
      return crypto.createHash("sha256").update(strMentah).digest("hex");
    } catch (err) {
      console.error("[ERROR] Gagal generate signature SHA-256 SnapInsta:", err.message);
      return null;
    }
  }
  async _msec() {
    try {
      console.log("[PROSES] Mengambil nilai msec snapinsta via Axios...");
      const response = await axios.get(`${proxy}https://snapinsta.guru/msec`, {
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
      console.error("[ERROR] Gagal mengambil msec server snapinsta:", err.message);
      return null;
    }
  }
  async download({
    url
  }) {
    try {
      console.log("[PROSES] Memulai alur download snapinsta untuk URL:", url);
      const msec = await this._msec();
      if (!msec) return {
        success: false,
        error: "Gagal mendapatkan msec dari snapinsta"
      };
      console.log(`[SUKSES] msec didapat: ${msec}`);
      const ts = Math.floor(msec * 1e3) - 1584;
      const s = this._sign(url, ts);
      if (!s) return {
        success: false,
        error: "Gagal membuat signature SHA-256 SnapInsta"
      };
      console.log(`[SUKSES] ts dihitung: ${ts}, _s: ${s}`);
      const payload = new URLSearchParams();
      payload.append("sf_url", url);
      payload.append("ts", ts.toString());
      payload.append("_ts", this.tsDef.toString());
      payload.append("_tsc", this.tscDef.toString());
      payload.append("_s", s);
      console.log("[PROSES] Mengirim payload Form-UrlEncoded ke endpoint convert...");
      const response = await axios.post(`${proxy}https://snapinsta.guru/api/convert`, payload.toString(), {
        headers: {
          ...this.commonHeaders,
          accept: "application/json, text/plain, */*",
          "cache-control": "no-cache",
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          origin: "https://snapinsta.guru",
          pragma: "no-cache",
          priority: "u=1, i",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin"
        }
      });
      console.log("[SUKSES] Respons asli API Convert snapinsta berhasil didapatkan.");
      return response.data;
    } catch (err) {
      console.error("[FATAL ERROR] Terjadi kegagalan pada method download snapinsta:", err.message);
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
  const api = new SnapInstaGuru();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL SnapInsta Guru";
    return res.status(500).json({
      error: errorMessage
    });
  }
}