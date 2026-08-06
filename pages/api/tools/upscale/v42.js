import axios from "axios";
import FormData from "form-data";
import PROXY from "@/configs/proxy-cors";
const proxy = PROXY.url();
console.log("CORS proxy", proxy);
class SparkPix {
  constructor() {
    this.cookie = "";
    this.scales = [2, 3, 4];
    this.modes = ["enhance", "free-hd"];
    this.baseUrl = `${proxy}https://sparkpix.ai`;
    this.client = axios.create({
      baseURL: `${this.baseUrl}/api`,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache",
        priority: "u=1, i",
        origin: this.baseUrl,
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    this.client.interceptors.request.use(config => {
      console.log(`[PROSES] Mengirim request ke: ${config.url}`);
      if (this.cookie) {
        config.headers.cookie = this.cookie;
      }
      return config;
    }, err => Promise.reject(err));
    this.client.interceptors.response.use(res => {
      console.log(`[PROSES] Response diterima dengan status: ${res.status}`);
      const rawCookies = res.headers?.["set-cookie"] || [];
      if (rawCookies.length > 0) {
        const newCookies = rawCookies.map(c => c.split(";")[0]).join("; ");
        this.cookie = this.cookie ? `${this.cookie}; ${newCookies}` : newCookies;
        console.log("[PROSES] Cookie diperbarui otomatis via interceptor");
      }
      return res;
    }, err => Promise.reject(err));
  }
  async initCookie() {
    try {
      console.log("[PROSES] Mengunjungi landing page untuk fetch cookie awal...");
      await axios.get(this.baseUrl, {
        headers: this.client.defaults.headers
      });
      console.log("[PROSES] Inisialisasi cookie awal berhasil");
    } catch (e) {
      console.warn(`[PERINGATAN] Gagal auto-init cookie halaman utama: ${e.message}`);
    }
  }
  async cvt(img) {
    try {
      console.log("[PROSES] Mengonversi input image ke buffer...");
      if (Buffer.isBuffer(img)) return img;
      if (typeof img === "string") {
        if (img.startsWith("http")) {
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (img.includes("base64,")) {
          return Buffer.from(img.split("base64,")[1], "base64");
        }
        return Buffer.from(img, "base64");
      }
      throw new Error("Format image tidak dikenal.");
    } catch (e) {
      console.error(`[ERROR] Gagal konversi image: ${e.message}`);
      throw e;
    }
  }
  async generate({
    mode = "free-hd",
    image,
    scale = 4,
    ...rest
  }) {
    try {
      if (!this.cookie || !this.cookie.includes("sparkpix_session")) {
        await this.initCookie();
      }
      const finalMode = this.modes.includes(mode) ? mode : "free-hd";
      console.log(`[PROSES] Memulai proses generate dengan mode: ${finalMode}`);
      const path = finalMode === "enhance" ? "/enhance-upscale" : "/free-hd-upscale";
      const refererPath = finalMode === "enhance" ? "/aitools/upscale-image-to-8k" : "/aitools/free-hd-upscaler";
      const finalScale = this.scales.includes(Number(scale)) ? Number(scale) : 4;
      console.log(`[PROSES] Menggunakan scale: ${finalScale}`);
      const imgBuffer = await this.cvt(image);
      const form = new FormData();
      form.append("file", imgBuffer, {
        filename: "image.jpg",
        contentType: "image/jpeg"
      });
      form.append("scale", String(finalScale));
      form.append("face_enhance", String(rest?.face_enhance || false));
      Object.keys(rest).forEach(key => {
        if (key !== "face_enhance") form.append(key, String(rest[key]));
      });
      const response = await this.client.post(path, form, {
        headers: {
          ...form.getHeaders(),
          referer: `${this.baseUrl}${refererPath}`
        }
      });
      return response?.data || {
        success: false
      };
    } catch (e) {
      console.error(`[ERROR] Gagal mengeksekusi generate: ${e?.response?.data?.message || e.message}`);
      return {
        success: false,
        error: e?.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.image) {
    return res.status(400).json({
      error: "Parameter 'image' diperlukan"
    });
  }
  const api = new SparkPix();
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