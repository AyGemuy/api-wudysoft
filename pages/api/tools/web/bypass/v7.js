import axios from "axios";
class Bypass {
  constructor() {
    this.base = "https://bypass-links.com";
    this.hdrs = {
      accept: "*/*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
  }
  _wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async _tok() {
    try {
      console.log("[REQ] Fetching bypass token...");
      const res = await axios.get(`${this.base}/api/token`, {
        headers: this.hdrs
      });
      const tok = res?.data?.token || null;
      console.log(tok ? "[RES] Token obtained." : "[RES] Token not found.");
      return tok;
    } catch (err) {
      console.error(`[_tok ERR] ${err?.response?.data ? JSON.stringify(err.response.data) : err.message}`);
      return null;
    }
  }
  async _byp(targetUrl, token) {
    try {
      console.log(`[REQ] Bypassing: ${targetUrl.substring(0, 40)}...`);
      const res = await axios.post(`${this.base}/api/bypass`, {
        url: targetUrl,
        bypass_token: token
      }, {
        headers: {
          ...this.hdrs,
          "content-type": "application/json",
          origin: this.base
        }
      });
      return res?.data || null;
    } catch (err) {
      console.error(`[_byp ERR] ${err?.response?.data ? JSON.stringify(err.response.data) : err.message}`);
      return null;
    }
  }
  async solve({
    url,
    ...rest
  }) {
    let count = 0;
    try {
      let currentUrl = url || "";
      if (!currentUrl) {
        console.error("[SOLVE ERR] URL kosong");
        return {
          status: false,
          result: "URL kosong",
          count: count
        };
      }
      const maxLoops = rest?.maxLoops ? rest.maxLoops : 5;
      let loop = true;
      console.log(`[START] Solving URL: ${currentUrl}`);
      while (loop && count < maxLoops) {
        count++;
        console.log(`[LOOP ${count}] Processing...`);
        const token = await this._tok();
        if (!token) return {
          status: false,
          result: "Gagal mendapatkan token",
          count: count
        };
        const res = await this._byp(currentUrl, token);
        if (!res?.success) {
          return {
            status: false,
            result: "API bypass gagal atau bad response",
            count: count
          };
        }
        const origHost = new URL(res?.original).hostname;
        const dirHost = new URL(res?.direct).hostname;
        console.log(`[LOOP ${count}] Orig: ${origHost} | Direct: ${dirHost}`);
        currentUrl = res?.direct;
        loop = origHost === dirHost ? true : false;
        if (loop && count < maxLoops) {
          console.log("[WAIT] Delay 3 detik...");
          await this._wait(3e3);
        }
      }
      console.log(`[SUCCESS] Final Direct URL: ${currentUrl}`);
      return {
        status: true,
        result: currentUrl,
        count: count
      };
    } catch (err) {
      const msg = err?.response ? JSON.stringify(err.response.data) : err.message;
      console.error(`[SOLVE ERR] ${msg}`);
      return {
        status: false,
        result: msg,
        count: count
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.url) {
    return res.status(400).json({
      success: false,
      error: "Parameter 'url' diperlukan"
    });
  }
  const api = new Bypass();
  try {
    const data = await api.solve(params);
    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || "Terjadi kesalahan saat memproses URL"
    });
  }
}