import axios from "axios";
class TRWBypass {
  constructor() {
    this.api = axios.create({
      baseURL: "https://trw.lat",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        origin: "https://bypassunlock.com",
        referer: "https://bypassunlock.com/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    this.apiKey = "TRW_FREE-GAY-15a92945-9b04-4c75-8337-f2a6007281e9";
  }
  async req(endpoint, params = {}) {
    try {
      const res = await this.api.get(endpoint, {
        params: {
          apikey: this.apiKey,
          ...params
        }
      });
      return res?.data || {};
    } catch (e) {
      console.log(`[-] Req error: ${e.message}`);
      return {
        success: false,
        error: e.message
      };
    }
  }
  async solve({
    url
  }) {
    try {
      console.log(`[*] TRW Bypassing: ${url}...`);
      const output = await this.req("/api/bypass", {
        url: url
      });
      return output;
    } catch (err) {
      console.log("[!] Error:", err.message);
      return {
        result: null,
        success: false,
        error: err.message
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
  const api = new TRWBypass();
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