import axios from "axios";
class ImageStudio {
  constructor() {
    this.base = "https://ai-image-studio-app-api.vercel.app";
    this.trackerUrl = "https://visitor-tracking-api.vercel.app/api/visit";
    this.headers = {
      accept: "application/json, text/plain, */*",
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      "content-type": "application/json",
      origin: "https://ai-image-studio-app.vercel.app",
      pragma: "no-cache",
      priority: "u=1, i",
      referer: "https://ai-image-studio-app.vercel.app/",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "cross-site",
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.api = axios.create({
      baseURL: this.base,
      headers: this.headers
    });
  }
  toS(o) {
    try {
      if (Array.isArray(o)) return o.map(item => this.toS(item));
      if (o !== null && typeof o === "object") {
        return Object.keys(o).reduce((acc, key) => {
          const snakeKey = key.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
          acc[snakeKey] = this.toS(o[key]);
          return acc;
        }, {});
      }
      return o;
    } catch (err) {
      return o;
    }
  }
  async vst() {
    try {
      console.log("[Process] Mengirim data kunjungan...");
      const res = await axios.post(this.trackerUrl, {
        projectName: "ai-image-studio-app"
      }, {
        headers: this.headers
      });
      console.log("[Process] Tracker berhasil:", res?.data?.message || "Done");
      return {
        success: true
      };
    } catch (err) {
      console.error("[Process Warning] Tracker gagal:", err?.response?.data || err?.message || err);
      return {
        success: false
      };
    }
  }
  async generate({
    prompt,
    ...rest
  }) {
    try {
      await this.vst();
      console.log("[Process] Menyiapkan payload generate...");
      const payload = {
        prompt: prompt || "Cute cat",
        ...rest
      };
      console.log("[Process] Mengirim request POST...");
      const res = await this.api.post("/api/image/generate", payload);
      console.log("[Process] Selesai, menyusun respons...");
      return this.toS(res?.data || {});
    } catch (err) {
      console.error("[Process Error] Gagal generate:", err?.response?.data || err?.message || err);
      return this.toS(err?.response?.data || {
        success: false,
        message: err?.message || "api_error"
      });
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new ImageStudio();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}