import axios from "axios";
import crypto from "crypto";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy untuk Picuki Site:", proxy);
class PicukiSite {
  constructor() {
    this.tsDef = 1781518409360;
    this.tscDef = 0;
    this.svDef = 2;
    this.scDef = 12;
    this.efDef = 448;
    this.dfDef = 0;
    this.saltHex = "47346c030ceb8d573190ceef3bddc1506490b7ee15e425319c2072ce9031c33c";
    this.commonHeaders = {
      "accept-language": "id-ID",
      referer: "https://picuki.site/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _sign(url, ts) {
    try {
      console.log("[PROSES] Menggenerate signature HMAC-SHA256 offline untuk Picuki...");
      const jsonPart = `{"_df":${this.dfDef},"_ef":${this.efDef},"_sc":${this.scDef},"target_url":"${url}"}`;
      const strMentah = `${jsonPart}${ts}`;
      const keyBuffer = Buffer.from(this.saltHex, "hex");
      return crypto.createHmac("sha256", keyBuffer).update(strMentah).digest("hex");
    } catch (err) {
      console.error("[ERROR] Gagal generate signature HMAC Picuki:", err.message);
      return null;
    }
  }
  async _msec() {
    try {
      console.log("[PROSES] Mengambil nilai msec picuki via Axios...");
      const response = await axios.get(`${proxy}https://picuki.site/msec`, {
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
      console.error("[ERROR] Gagal mengambil msec server picuki:", err.message);
      return null;
    }
  }
  async download({
    url
  }) {
    try {
      console.log("[PROSES] Memulai alur download picuki untuk URL:", url);
      const msec = await this._msec();
      if (!msec) return {
        success: false,
        error: "Gagal mendapatkan msec dari picuki"
      };
      console.log(`[SUKSES] msec didapat: ${msec}`);
      const ts = Math.floor(msec * 1e3) - 1644;
      const s = this._sign(url, ts);
      if (!s) return {
        success: false,
        error: "Gagal membuat signature HMAC Picuki"
      };
      console.log(`[SUKSES] ts dihitung: ${ts}, _s: ${s}`);
      const payload = {
        target_url: url,
        _sc: this.scDef,
        _ef: this.efDef,
        _df: this.dfDef,
        ts: ts,
        _ts: this.tsDef,
        _tsc: this.tscDef,
        _sv: this.svDef,
        _s: s
      };
      console.log("[PROSES] Mengirim payload JSON ke endpoint api-wh convert picuki...");
      const response = await axios.post(`${proxy}https://api-wh.picuki.site/api/convert`, payload, {
        headers: {
          ...this.commonHeaders,
          accept: "application/json, text/plain, */*",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://picuki.site",
          pragma: "no-cache",
          priority: "u=1, i",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      console.log("[SUKSES] Respons asli API Convert picuki berhasil didapatkan.");
      return response.data;
    } catch (err) {
      console.error("[FATAL ERROR] Terjadi kegagalan pada method download picuki:", err.message);
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
  const api = new PicukiSite();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL Picuki Site";
    return res.status(500).json({
      error: errorMessage
    });
  }
}