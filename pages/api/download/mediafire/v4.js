import axios from "axios";
const BASE = "https://cloud.vercel.app/api";
const HEADERS = {
  accept: "*/*",
  "accept-language": "id-ID",
  "cache-control": "no-cache",
  origin: "https://afianf.vercel.app",
  pragma: "no-cache",
  referer: "https://afianf.vercel.app/",
  "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
};
class Mediafire {
  constructor() {
    this.req = axios.create({
      baseURL: BASE,
      headers: HEADERS
    });
  }
  async get(path, params = {}) {
    console.log(`[GET] ${path}`, params);
    try {
      const {
        data
      } = await this.req.get(path, {
        params: params
      });
      console.log(`[OK] ${path}`);
      return data;
    } catch (e) {
      console.error(`[ERR] ${path} —`, e?.message || e);
      return null;
    }
  }
  async download({
    url,
    ...rest
  }) {
    console.log(`[download] mulai — url: ${url}`);
    try {
      const data = await this.get("/mediafire", {
        url: url,
        ...rest
      });
      console.log(`[download] selesai —`);
      return data;
    } catch (e) {
      console.error(`[download] gagal —`, e?.message || e);
      return null;
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
  const api = new Mediafire();
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