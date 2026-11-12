import axios from "axios";
class FastVidl {
  constructor() {
    this.cookies = {};
    this.api = axios.create({
      baseURL: "https://fastvidl.com",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://fastvidl.com",
        pragma: "no-cache",
        referer: "https://fastvidl.com/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    this.api.interceptors.request.use(config => {
      const cookieStr = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
      if (cookieStr) config.headers["cookie"] = cookieStr;
      return config;
    });
    this.api.interceptors.response.use(res => {
      const rawCookies = res.headers?.["set-cookie"] || [];
      rawCookies.forEach(c => {
        const [pair] = c.split(";");
        const [key, val] = pair.split("=");
        if (key && val) this.cookies[key.trim()] = val.trim();
      });
      return res;
    });
  }
  async post(path, body) {
    console.log(`[PROSES] POST ke ${path}...`);
    try {
      const res = await this.api.post(path, body);
      return res?.data || null;
    } catch (err) {
      console.error(`[GAGAL] POST ${path}:`, err?.response?.data || err?.message);
      return null;
    }
  }
  async download({
    url,
    ...rest
  }) {
    const targetUrl = url || rest?.target || "";
    console.log(`[PROSES] Memulai unduhan untuk URL: ${targetUrl}`);
    try {
      let data = await this.post("/api/lookup", {
        url: targetUrl
      });
      if (!data) {
        console.log("[PROSES] Lookup kosong/gagal, beralih ke fallback tiktok...");
        data = await this.post("/api/tiktok", {
          url: targetUrl
        });
      }
      return data;
    } catch (err) {
      console.log("[PROSES] Terjadi kesalahan, mencoba jalur fallback tiktok...");
      try {
        return await this.post("/api/tiktok", {
          url: targetUrl
        });
      } catch (fbErr) {
        console.error("[GAGAL] Semua jalur endpoint telah dicoba dan gagal.");
        return null;
      }
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
  const api = new FastVidl();
  try {
    const data = await api.download(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}