import axios from "axios";
import crypto from "crypto";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy untuk iGram:", proxy);
class IGramWorld {
  constructor() {
    this.tsDef = 1780475881508;
    this.tscDef = 0;
    this.svDef = 2;
    this.scDef = 0;
    this.efDef = 0;
    this.dfDef = 0;
    this.saltHex = "c0e7a409f0249d99ed761acce16d9305a2166e04b85f1c3c5d892af935fce833";
    this.commonHeaders = {
      "accept-language": "id-ID",
      referer: "https://igram.world/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _sign(url, ts, sc, ef, df) {
    try {
      console.log("[PROSES] Menggenerate signature HMAC _s untuk iGram World...");
      const jsonPart = `{"_df":${df},"_ef":${ef},"_sc":${sc},"target_url":"${url}"}`;
      const strMentah = `${jsonPart}${ts}`;
      const keyBuffer = Buffer.from(this.saltHex, "hex");
      return crypto.createHmac("sha256", keyBuffer).update(strMentah).digest("hex");
    } catch (err) {
      console.error("[ERROR] Gagal generate signature HMAC iGram:", err.message);
      return null;
    }
  }
  async _msec() {
    try {
      console.log("[PROSES] Mengambil nilai msec igram via Axios...");
      const response = await axios.get(`${proxy}https://igram.world/msec`, {
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
      console.error("[ERROR] Gagal mengambil msec server igram:", err.message);
      return null;
    }
  }
  async download({
    url
  }) {
    try {
      console.log("[PROSES] Memulai alur download igram untuk URL:", url);
      const msec = await this._msec();
      if (!msec) return {
        success: false,
        error: "Gagal mendapatkan msec dari igram"
      };
      console.log(`[SUKSES] msec didapat: ${msec}`);
      const ts = Math.floor(msec * 1e3) - 1675;
      const sc = this.scDef;
      const ef = this.efDef;
      const df = this.dfDef;
      const s = this._sign(url, ts, sc, ef, df);
      if (!s) return {
        success: false,
        error: "Gagal membuat signature HMAC iGram"
      };
      console.log(`[SUKSES] ts dihitung: ${ts}, _s: ${s}`);
      const payload = {
        target_url: url,
        _sc: sc,
        _ef: ef,
        _df: df,
        ts: ts,
        _ts: this.tsDef,
        _tsc: this.tscDef,
        _sv: this.svDef,
        _s: s
      };
      console.log("[PROSES] Mengirim payload JSON ke endpoint api-wh igram...");
      const response = await axios.post(`${proxy}https://api-wh.igram.world/api/convert`, payload, {
        headers: {
          ...this.commonHeaders,
          accept: "application/json, text/plain, */*",
          "cache-control": "no-cache",
          "content-type": "application/json",
          origin: "https://igram.world",
          pragma: "no-cache",
          priority: "u=1, i",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-site"
        }
      });
      console.log("[SUKSES] Respons asli API Convert igram berhasil didapatkan.");
      return response.data;
    } catch (err) {
      console.error("[FATAL ERROR] Terjadi kegagalan pada method download igram:", err.message);
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
  const api = new IGramWorld();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL iGram";
    return res.status(500).json({
      error: errorMessage
    });
  }
}