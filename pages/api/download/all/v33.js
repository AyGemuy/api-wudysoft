import axios from "axios";
class MeverClient {
  constructor() {
    this.base = "https://mever.zeabur.app/api/";
    this.headers = {
      "X-Package-Name": "com.dapascript.mever",
      "User-Agent": "okhttp/4.11.0"
    };
    this.map = {
      tiktok: "tiktok",
      douyin: "douyin",
      youtube: "youtube",
      facebook: "fb",
      instagram: "ig",
      pinterest: "pin-v2",
      pixiv: "pixiv",
      soundcloud: "soundcloud",
      spotify: "spotify",
      terabox: "terabox",
      threads: "threads",
      twitter: "twitter",
      videy: "videy",
      applemusic: "applemusic",
      ai: "meta",
      search: "goimg",
      config: "app-config"
    };
  }
  _l(msg) {
    console.log(`[${new Date().toISOString()}] ${msg}`);
  }
  _v(mode, rest) {
    if (!this.map[mode]) throw new Error(`Mode "${mode}" tidak valid!`);
    if (mode === "config") return true;
    const required = mode === "ai" || mode === "search" ? rest?.q : rest?.url;
    if (!required) throw new Error(`Parameter '${mode === "ai" ? "q" : "url"}' wajib diisi!`);
    return true;
  }
  async run({
    mode,
    ...rest
  }) {
    const start = Date.now();
    this._l(`Memulai request mode: ${mode || "unknown"}`);
    try {
      this._v(mode, rest);
      const path = this.map[mode];
      const params = {
        url: rest?.url || undefined,
        q: rest?.q || rest?.query || undefined,
        quality: rest?.quality || "720p",
        type: rest?.type || "video",
        ...rest?.params || {}
      };
      this._l(`Menghubungi endpoint: ${path}`);
      const {
        data,
        status
      } = await axios.get(`${this.base}${path}`, {
        params: params,
        headers: this.headers,
        timeout: 45e3
      });
      this._l(`Request selesai dalam ${Date.now() - start}ms`);
      return {
        success: true,
        mode: mode,
        status: status,
        data: data?.data || data
      };
    } catch (err) {
      this._l(`Eror pada mode ${mode}: ${err.message}`);
      return {
        success: false,
        message: err?.response?.data?.message || err.message,
        error_code: err?.response?.status || 500
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new MeverClient();
  try {
    const data = await api.run(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}