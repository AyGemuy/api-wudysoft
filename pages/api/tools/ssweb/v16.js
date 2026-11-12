import axios from "axios";
import * as cheerio from "cheerio";
class Gwifi {
  constructor() {
    this.viewports = [];
    this.cookies = [];
    this.commonHeaders = {
      "accept-language": "id-ID",
      "cache-control": "no-cache",
      pragma: "no-cache",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
    };
    this.client = axios.create({
      baseURL: "https://8gwifi.org"
    });
    this.client.interceptors.response.use(res => {
      const sc = res.headers["set-cookie"];
      if (sc) {
        this.cookies = [...this.cookies, ...sc];
        console.log("[LOG] Cookie diperbarui secara otomatis.");
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
      console.log("[LOG] Mengambil daftar viewport aktif...");
      const res = await this.client.get("/screenshot.jsp", {
        headers: {
          ...this.commonHeaders,
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          priority: "u=0, i",
          referer: "https://www.google.com/",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1"
        }
      });
      const $ = cheerio.load(res.data);
      this.viewports = $("input.viewport-checkbox").map((_, el) => $(el).attr("value") || $(el).val()).get();
      console.log(`[LOG] Berhasil memuat ${this.viewports.length} viewport.`);
      return this.viewports;
    } catch (err) {
      console.warn("[LOG] Gagal mengambil daftar viewport, menggunakan default.", err.message);
      this.viewports = ["360x640"];
      return this.viewports;
    }
  }
  async generate({
    url,
    ...rest
  }) {
    try {
      console.log("[LOG] Memproses pembuatan screenshot...");
      if (this.viewports.length === 0) {
        await this.init();
      }
      const cleanUrl = url.match(/^https?:\/\//) ? url : `https://${url}`;
      const inputViewport = rest.viewport || rest.viewport_size || "360x640";
      const selectedViewport = this.viewports.includes(inputViewport) ? inputViewport : "360x640";
      const parts = selectedViewport.includes("x") ? selectedViewport.split("x") : ["360", "640"];
      const width = parseInt(parts[0]) || 360;
      const height = parseInt(parts[1]) || 640;
      const isFull = rest.fullPage || rest.full_page || false;
      const reqId = `${cleanUrl}_${selectedViewport}_${Date.now()}`;
      const defaultPayload = {
        url: cleanUrl,
        width: width,
        height: height,
        viewport: selectedViewport,
        viewportWidth: width,
        viewportHeight: height,
        viewport_size: selectedViewport,
        device: selectedViewport,
        viewport_string: `${width}x${height}`,
        fullPage: isFull,
        full_page: isFull,
        capture_full_page: isFull,
        request_id: reqId
      };
      const payload = {
        ...defaultPayload,
        ...rest
      };
      console.log(`[LOG] Mengirim POST payload dengan ID: ${payload.request_id}`);
      const res = await this.client.post("/ScreenshotFunctionality", payload, {
        headers: {
          ...this.commonHeaders,
          accept: "*/*",
          "content-type": "application/json",
          origin: "https://8gwifi.org",
          priority: "u=1, i",
          referer: "https://8gwifi.org/screenshot.jsp",
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      const resultData = res?.data?.result;
      const base64Data = resultData?.screenshot_base64;
      if (!base64Data) {
        throw new Error(res?.data?.error || "Tidak ada respon data gambar dari server.");
      }
      console.log("[LOG] Pemrosesan gambar selesai.");
      return {
        status: resultData?.status_code || res?.status || 200,
        buffer: Buffer.from(base64Data, "base64"),
        contentType: "image/png"
      };
    } catch (err) {
      console.error("[LOG] Kesalahan saat generate screenshot:", err.message);
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
  const api = new Gwifi();
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