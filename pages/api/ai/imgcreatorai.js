import axios from "axios";
import * as cheerio from "cheerio";
class ImgCreatorAI {
  constructor() {
    try {
      this.debug = true;
      this.baseURL = "https://imgcreatorai.io";
      this.csrfToken = null;
      this.cookies = {};
      this.models = ["nano-banana-2", "nano-banana-pro", "gpt-image-2"];
      this.ratios = ["auto", "1:1", "16:9", "9:16", "3:4", "4:3"];
      this.resolutions = ["1K", "2K", "4K"];
      this.http = axios.create({
        baseURL: this.baseURL,
        timeout: 6e4,
        headers: {
          accept: "*/*",
          "accept-language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
          "cache-control": "no-cache",
          pragma: "no-cache",
          priority: "u=1, i",
          origin: this.baseURL,
          referer: `${this.baseURL}/ai-image-editor`,
          "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
          "sec-ch-ua-mobile": "?1",
          "sec-ch-ua-platform": '"Android"',
          "sec-fetch-dest": "empty",
          "sec-fetch-mode": "cors",
          "sec-fetch-site": "same-origin",
          "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
          "x-requested-with": "XMLHttpRequest"
        }
      });
      this.http.interceptors.request.use(cfg => {
        try {
          cfg.headers = cfg.headers || {};
          const cookieStr = Object.entries(this.cookies).map(([k, v]) => `${k}=${v}`).join("; ");
          if (cookieStr) cfg.headers["cookie"] = cookieStr;
          if (this.csrfToken) cfg.headers["x-csrf-token"] = this.csrfToken;
          return cfg;
        } catch (err) {
          this.log("ERROR", `Interceptor Request: ${err?.message || err}`);
          return cfg;
        }
      });
      this.http.interceptors.response.use(res => {
        try {
          const setCookies = res.headers?.["set-cookie"] || [];
          for (const item of setCookies) {
            const [pair] = item.split(";");
            const [k, v] = pair.split("=");
            if (k && v) this.cookies[k.trim()] = v.trim();
          }
          return res;
        } catch (err) {
          this.log("ERROR", `Interceptor Response: ${err?.message || err}`);
          return res;
        }
      });
    } catch (err) {
      this.log("ERROR", `Constructor Error: ${err?.message || err}`);
    }
  }
  log(type = "INFO", msg = "") {
    if (!this.debug && type === "DEBUG") return;
    const time = new Date().toISOString().split("T")[1].slice(0, 8);
    console.log(`[ImgCreatorAI:${type}][${time}] ${msg}`);
  }
  async init() {
    try {
      this.log("DEBUG", "Scraping session & CSRF Token dengan Cheerio...");
      const res = await this.http.get("/ai-image-editor", {
        headers: {
          accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "cross-site"
        }
      });
      const $ = cheerio.load(res?.data || "");
      this.csrfToken = $('meta[name="csrf-token"]').attr("content") || null;
      if (!this.csrfToken) {
        return {
          status: false,
          error: "CSRF token meta tag tidak ditemukan di halaman."
        };
      }
      this.log("DEBUG", `CSRF Token ditemukan: ${this.csrfToken.slice(0, 10)}...`);
      return {
        status: true,
        token: this.csrfToken
      };
    } catch (err) {
      this.log("ERROR", `Init Error: ${err?.message || err}`);
      return {
        status: false,
        error: err?.message || "Gagal inisialisasi sesi."
      };
    }
  }
  async toB64(img = null) {
    try {
      if (!img) return null;
      if (Buffer.isBuffer(img)) {
        return img.toString("base64");
      }
      if (typeof img === "string") {
        if (/^https?:\/\//i.test(img)) {
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data).toString("base64");
        }
        return img.includes("base64,") ? img.split("base64,")[1] : img.trim();
      }
      return null;
    } catch (err) {
      this.log("ERROR", `toB64 Error: ${err?.message || err}`);
      return null;
    }
  }
  val(p = {}) {
    if (!p?.prompt?.trim() && !p?.image) {
      return {
        valid: false,
        error: "Parameter 'prompt' atau 'image' wajib diisi."
      };
    }
    if (p.model && !this.models.includes(p.model)) {
      return {
        valid: false,
        error: `Model '${p.model}' tidak valid. Pilihan: ${this.models.join(", ")}`
      };
    }
    if (p.ratio && !this.ratios.includes(p.ratio)) {
      return {
        valid: false,
        error: `Ratio '${p.ratio}' tidak valid. Pilihan: ${this.ratios.join(", ")}`
      };
    }
    if (p.resolution && !this.resolutions.includes(p.resolution)) {
      return {
        valid: false,
        error: `Resolusi '${p.resolution}' tidak valid. Pilihan: ${this.resolutions.join(", ")}`
      };
    }
    return {
      valid: true
    };
  }
  async poll(taskId = "", maxAttempt = 60, delay = 3e3) {
    try {
      this.log("INFO", `Polling status task: ${taskId}`);
      for (let i = 1; i <= maxAttempt; i++) {
        await new Promise(resolve => setTimeout(resolve, delay));
        try {
          const {
            data
          } = await this.http.get(`/query/${taskId}`);
          this.log("DEBUG", `Polling #${i}/${maxAttempt} -> Status: ${data?.status || "unknown"}`);
          if (data?.status === "completed" && data?.image) {
            const rawB64 = data.image.includes("base64,") ? data.image.split("base64,")[1] : data.image;
            const imgBuffer = Buffer.from(rawB64, "base64");
            return {
              status: true,
              buffer: imgBuffer,
              contentType: "image/png"
            };
          }
          if (data?.status === "failed" || data?.status === "error") {
            return {
              status: false,
              buffer: null,
              contentType: null,
              error: data?.message || "Pembuatan gambar gagal di server."
            };
          }
        } catch (pollErr) {
          this.log("WARN", `Polling Warning #${i}: ${pollErr?.message || pollErr}`);
        }
      }
      return {
        status: false,
        buffer: null,
        contentType: null,
        error: `Timeout: Task tidak selesai dalam ${maxAttempt * (delay / 1e3)} detik.`
      };
    } catch (err) {
      this.log("ERROR", `Polling Error: ${err?.message || err}`);
      return {
        status: false,
        buffer: null,
        contentType: null,
        error: err?.message || "Polling gagal dijalankan."
      };
    }
  }
  async generate({
    prompt = "",
    image = null,
    model = "nano-banana-2",
    ratio = "auto",
    ...rest
  }) {
    try {
      this.log("INFO", "Memulai alur proses generate...");
      const check = this.val({
        prompt: prompt,
        image: image,
        model: model,
        ratio: ratio,
        ...rest
      });
      if (!check.valid) {
        return {
          status: false,
          buffer: null,
          contentType: null,
          error: check.error
        };
      }
      if (!this.csrfToken) {
        const initRes = await this.init();
        if (!initRes.status) {
          return {
            status: false,
            buffer: null,
            contentType: null,
            error: initRes.error
          };
        }
      }
      const b64Images = [];
      if (image) {
        const rawList = Array.isArray(image) ? image : [image];
        for (const item of rawList) {
          const b64 = await this.toB64(item);
          if (b64) b64Images.push(b64);
        }
      }
      const selectedModel = model || "nano-banana-2";
      const selectedRatio = ratio || "auto";
      const selectedRes = rest?.resolution || "1K";
      const pageId = b64Images.length > 0 ? "ai_image_editor_page" : "nanobanana_page";
      const payload = {
        prompt: prompt || "Enhance and edit image",
        aspect_ratio: selectedRatio,
        model: selectedModel,
        resolution: selectedRes,
        pageId: pageId,
        images: b64Images,
        ...b64Images.length > 0 ? {
          image: b64Images[0]
        } : {},
        ...rest
      };
      this.log("DEBUG", `Mengirim request generate -> Model: ${selectedModel}, Images: ${b64Images.length}`);
      const {
        data
      } = await this.http.post("/nanobanana/generate-guest", payload, {
        headers: {
          "content-type": "application/json"
        }
      });
      if (!data?.success || !data?.task_id) {
        return {
          status: false,
          buffer: null,
          contentType: null,
          error: data?.message || "Gagal membuat task pada server."
        };
      }
      this.log("INFO", `Task berhasil dibuat -> Task ID: ${data.task_id}`);
      return await this.poll(data.task_id, 60, 3e3);
    } catch (err) {
      this.log("ERROR", `Generation Error: ${err?.message || err}`);
      return {
        status: false,
        buffer: null,
        contentType: null,
        error: err?.response?.data?.message || err?.message || "Terjadi kesalahan internal."
      };
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
  const api = new ImgCreatorAI();
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