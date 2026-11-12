import axios from "axios";
const BASE = "https://weeb-api.vercel.app";
const API = "/telesticker";
class WeebStickerDL {
  constructor() {
    this.http = axios.create({
      baseURL: BASE,
      timeout: 3e4,
      validateStatus: s => s < 500
    });
  }
  parse(data) {
    const {
      stickers = [], ...info
    } = data;
    const result = stickers.map(url => ({
      file_url: url,
      file_name: url.split("/").pop()
    }));
    return {
      result: result,
      ...info
    };
  }
  async download({
    url,
    ...payload
  }) {
    console.log("[download] url:", url);
    try {
      const res = await this.http.get(API, {
        params: {
          url: url,
          ...payload
        }
      });
      console.log("[download] status:", res.status);
      if (!res.data?.name) throw new Error(res.data?.message || "invalid response");
      const parsed = this.parse(res.data);
      console.log("[download] stickers:", parsed.result?.length ?? 0);
      return parsed;
    } catch (err) {
      console.error("[download] error:", err?.response?.status, err?.response?.data || err?.code || err?.message);
      throw err;
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
  const api = new WeebStickerDL();
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