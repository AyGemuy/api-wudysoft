import axios from "axios";
import * as cheerio from "cheerio";
class ScreenshotInk {
  constructor() {
    this.token = "";
    this.widths = [];
    this.cookies = [];
    this.client = axios.create({
      baseURL: "https://screenshotink.com",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://screenshotink.com/tools/website-screenshot",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    this.client.interceptors.response.use(res => {
      const sc = res.headers["set-cookie"];
      if (sc) {
        this.cookies = [...this.cookies, ...sc];
        console.log("[LOG] Cookie berhasil disinkronisasi.");
      }
      return res;
    }, err => Promise.reject(err));
    this.client.interceptors.request.use(config => {
      if (this.cookies.length > 0) {
        const originalCookie = config.headers["cookie"] || "";
        config.headers["cookie"] = `${originalCookie}; ${this.cookies.join("; ")}`.trim();
      }
      return config;
    }, err => Promise.reject(err));
  }
  async init() {
    try {
      console.log("[LOG] Membuka halaman alat untuk ekstraksi token dan lebar layar...");
      const res = await this.client.get("/tools/website-screenshot", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          referer: "https://www.google.com/",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "cross-site"
        }
      });
      const $ = cheerio.load(res.data);
      const scripts = $("script").map((_, el) => $(el).text()).get();
      let foundToken = "";
      for (const scriptContent of scripts) {
        const match = scriptContent.match(/"pgToken":\s*"([^"]+)"/);
        if (match) {
          foundToken = match[1];
          break;
        }
      }
      this.token = foundToken || "";
      this.widths = $("#pg-size option").map((_, el) => $(el).attr("value") || $(el).val()).get();
      console.log("[LOG] Token berhasil didapatkan:", this.token ? "Ya" : "Tidak");
      console.log("[LOG] Daftar resolusi lebar layar terdeteksi:", this.widths.join(", ") || "tidak ditemukan");
      return {
        token: this.token,
        widths: this.widths
      };
    } catch (err) {
      console.warn("[LOG] Gagal mengambil konfigurasi dinamis, menggunakan nilai default.", err.message);
      this.widths = ["1440", "1280", "768", "375"];
      return {
        token: "",
        widths: this.widths
      };
    }
  }
  async generate({
    url,
    ...rest
  }) {
    try {
      console.log("[LOG] Memproses pembuatan screenshot...");
      if (!this.token || this.widths.length === 0) {
        await this.init();
      }
      const cleanUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      const reqWidth = String(rest.width || "375");
      const selectedWidth = this.widths.includes(reqWidth) ? reqWidth : "375";
      const defaultPayload = {
        url: cleanUrl,
        width: selectedWidth,
        full_size: rest.fullPage || rest.full_page || rest.full_size || false,
        format: rest.format || "png",
        pg_token: this.token
      };
      const payload = {
        ...defaultPayload,
        ...rest
      };
      console.log(`[LOG] Mengirim data payload ke API playground untuk: ${cleanUrl} (lebar: ${payload.width})`);
      const res = await this.client.post("/api/playground", payload, {
        headers: {
          "content-type": "application/json",
          origin: "https://screenshotink.com"
        }
      });
      const resData = res?.data;
      if (!resData) {
        throw new Error("Server tidak mengembalikan respons JSON.");
      }
      console.log("[LOG] Respons JSON berhasil diterima.");
      return resData;
    } catch (err) {
      console.error("[LOG] Gagal melakukan screenshot di ScreenshotInk:", err.message);
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
  const api = new ScreenshotInk();
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