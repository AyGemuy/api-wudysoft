import axios from "axios";
class Geekflare {
  constructor() {
    this.client = axios.create({
      baseURL: "https://geekflare.com",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://geekflare.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://geekflare.com/tools/webpage-screenshot/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
  }
  _fmt(str) {
    return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
  }
  _snk(obj) {
    if (typeof obj !== "object" || obj === null) return obj;
    if (Array.isArray(obj)) return obj.map(item => this._snk(item));
    return Object.keys(obj).reduce((acc, key) => {
      const snakeKey = this._fmt(key);
      acc[snakeKey] = this._snk(obj[key]);
      return acc;
    }, {});
  }
  async generate({
    url,
    ...rest
  }) {
    try {
      console.log("[LOG] Memulai proses screenshot via Geekflare...");
      const cleanUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      const defaultPayload = {
        url: cleanUrl,
        device: rest.device || "mobile",
        type: rest.format || rest.type || "png",
        fullPage: rest.fullPage || rest.full_page || false
      };
      const finalPayload = {
        ...defaultPayload,
        ...rest
      };
      console.log(`[LOG] Mengirim POST request payload ke Geekflare untuk: ${cleanUrl}`);
      const res = await this.client.post("/tools/api/webpage-screenshot/", {
        payload: finalPayload
      });
      const rawData = res?.data?.data;
      if (!rawData) {
        throw new Error("Respons dari server Geekflare kosong atau tidak valid.");
      }
      console.log("[LOG] Berhasil menerima respons. Melakukan konversi ke snake_case...");
      const snakeResult = this._snk(rawData);
      return {
        status: res?.status || 200,
        result: snakeResult
      };
    } catch (err) {
      console.error("[LOG] Gagal mengeksekusi request di Geekflare:", err.message);
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
  const api = new Geekflare();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}