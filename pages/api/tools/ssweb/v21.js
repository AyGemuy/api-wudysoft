import axios from "axios";
import * as cheerio from "cheerio";
class EditMyScreenshot {
  constructor() {
    this.csrfToken = "";
    this.widths = [];
    this.cookies = [];
    this.client = axios.create({
      baseURL: "https://www.editmyscreenshot.com",
      headers: {
        accept: "image/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://www.editmyscreenshot.com",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://www.editmyscreenshot.com/website-screenshot",
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
        console.log("[LOG] Sesi cookie berhasil dimuat.");
      }
      return res;
    }, err => Promise.reject(err));
    this.client.interceptors.request.use(config => {
      if (this.cookies.length > 0) {
        config.headers["cookie"] = this.cookies.join("; ");
      }
      return config;
    }, err => Promise.reject(err));
  }
  async init() {
    try {
      console.log("[LOG] Mengakses halaman generator untuk inisialisasi sesi & resolusi...");
      const res = await this.client.get("/website-screenshot", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
          referer: "https://www.google.com/",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin"
        }
      });
      const $ = cheerio.load(res.data);
      this.csrfToken = $('meta[name="csrf-token"]').attr("content") || "";
      this.widths = $("select option, option").map((_, el) => $(el).attr("value") || $(el).val()).get().filter(val => val && /^\d+$/.test(val));
      if (this.widths.length === 0) {
        this.widths = ["1920", "1440", "1280", "1024", "768", "425", "375"];
      }
      console.log("[LOG] Token CSRF terdeteksi:", this.csrfToken ? "Ya" : "Tidak");
      console.log("[LOG] Daftar resolusi lebar layar (width) siap digunakan:", this.widths.join(", "));
      return {
        csrfToken: this.csrfToken,
        widths: this.widths
      };
    } catch (err) {
      console.warn("[LOG] Gagal melakukan inisialisasi data dinamis:", err.message);
      this.widths = ["1920", "1440", "1280", "1024", "768", "425", "375"];
      return {
        csrfToken: "",
        widths: this.widths
      };
    }
  }
  async generate({
    url,
    ...rest
  }) {
    try {
      console.log("[LOG] Memulai proses screenshot via EditMyScreenshot...");
      if (!this.csrfToken || this.widths.length === 0) {
        await this.init();
      }
      const cleanUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      const inputWidth = String(rest.width || "375");
      const selectedWidth = this.widths.includes(inputWidth) ? parseInt(inputWidth) : 375;
      const defaultPayload = {
        url: cleanUrl,
        fullPage: rest.fullPage || rest.full_page || false,
        width: selectedWidth,
        format: rest.format || "png",
        quality: parseInt(rest.quality) || 80,
        delay: parseInt(rest.delay) || 1
      };
      const payload = {
        ...defaultPayload,
        ...rest
      };
      console.log(`[LOG] Mengirim request POST capture untuk: ${cleanUrl} (lebar: ${payload.width})`);
      const res = await this.client.post("/api/screenshot", payload, {
        responseType: "arraybuffer",
        headers: {
          "content-type": "application/json",
          "x-csrf-token": this.csrfToken
        }
      });
      if (!res?.data) {
        throw new Error("Gagal menerima data biner gambar dari server.");
      }
      console.log("[LOG] File gambar berhasil diunduh.");
      return {
        status: res?.status || 200,
        buffer: Buffer.from(res.data),
        contentType: `image/${payload.format}`
      };
    } catch (err) {
      console.error("[LOG] Gagal mengeksekusi request di EditMyScreenshot:", err.message);
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
  const api = new EditMyScreenshot();
  try {
    const data = await api.generate(params);
    res.setHeader("Content-Type", data.contentType || "image/png");
    return res.status(data.status || 200).send(data.buffer);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}