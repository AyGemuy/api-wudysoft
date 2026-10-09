import axios from "axios";
class TeraboxDownloader {
  constructor() {
    this.base = "https://sechno.com";
    this.client = axios.create({
      baseURL: this.base,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: this.base,
        pragma: "no-cache",
        referer: `${this.base}/tools/terabox-downloader`,
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Mobile Safari/537.36"
      },
      timeout: 3e4
    });
    this.init();
  }
  init() {
    this.client.interceptors.request.use(cfg => {
      console.log(`[REQ] ${cfg?.method?.toUpperCase() || "POST"} -> ${cfg?.url || ""}`);
      return cfg;
    }, err => {
      console.log(`[REQ ERR] ${err?.message || "Request error"}`);
      return Promise.reject(err);
    });
    this.client.interceptors.response.use(res => {
      console.log(`[RES] Status: ${res?.status || 200}`);
      return res;
    }, err => {
      console.log(`[RES ERR] ${err?.message || "Response error"}`);
      return Promise.reject(err);
    });
  }
  snk(data) {
    if (Array.isArray(data)) {
      return data.map(item => this.snk(item));
    }
    if (data && typeof data === "object") {
      return Object.keys(data).reduce((acc, key) => {
        const snakeKey = key.replace(/([A-Z])/g, "_$1").toLowerCase();
        acc[snakeKey] = this.snk(data[key]);
        return acc;
      }, {});
    }
    if (typeof data === "string") {
      return data.startsWith("/") ? `${this.base}${data}` : data;
    }
    return data;
  }
  async download({
    url,
    ...rest
  }) {
    try {
      console.log(`[Terabox] Memproses URL: ${url || "empty"}`);
      if (!url) {
        throw new Error("URL wajib diisi");
      }
      const payload = {
        url: url ? url.trim() : "",
        ...rest
      };
      const res = await this.client.post("/api/terabox", payload);
      const raw = res?.data || {};
      if (!raw?.success) {
        throw new Error(raw?.message ? raw.message : "Gagal mengambil data dari API");
      }
      const formatted = this.snk(raw);
      delete formatted.success;
      console.log(`[Terabox] Berhasil diproses: ${formatted?.title || "No Title"}`);
      return {
        status: true,
        result: formatted ? formatted : {}
      };
    } catch (err) {
      console.log(`[Terabox Error] ${err?.message || "Terjadi kesalahan sistem"}`);
      return {
        status: false,
        result: {
          message: err?.message ? err.message : "Unknown error"
        }
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
  const api = new TeraboxDownloader();
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