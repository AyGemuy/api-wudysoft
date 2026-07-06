import axios from "axios";
import {
  CookieJar
} from "tough-cookie";
import {
  wrapper
} from "axios-cookiejar-support";
import FormData from "form-data";
class Phototune {
  constructor() {
    this.jar = new CookieJar();
    this.client = wrapper(axios.create({
      baseURL: "https://phototune.ai",
      jar: this.jar,
      withCredentials: true,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID,id;q=0.9,en;q=0.8",
        "cache-control": "no-cache",
        pragma: "no-cache",
        origin: "https://phototune.ai",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        "x-requested-with": "XMLHttpRequest"
      }
    }));
    this.modes = ["generator", "enhancer", "upscaler", "background", "watermark"];
    this.styles = ["none", "anime", "comics", "simple3DRender", "lowResPixelArt", "retro80sComics", "vintageComics", "whimsicalWatercolor", "vintageIllustration", "modernImpressionism", "epicGreg", "phonePhoto", "casualPhoto", "nostalgic90sPhoto", "cottagecorePastoralPhoto", "quietLuxuryPhoto", "classicFilmPhoto", "cyberpunkRainPhoto", "wideAnglePeephole"];
    this.session = null;
    this.csrf = null;
    this.isInit = false;
  }
  async _init() {
    try {
      console.log("[Process] Initializing fresh session & cookies...");
      await this.client.get("/process-generator", {
        headers: {
          accept: "text/html"
        }
      });
      const cookies = await this.jar.getCookies("https://phototune.ai");
      this.csrf = cookies.find(c => c.key === "csrf_token")?.value || null;
      this.session = cookies.find(c => c.key === "phototune_session")?.value || null;
      if (!this.csrf || !this.session) {
        throw new Error(`Gagal mendapatkan credentials dari Cookie. CSRF: ${!!this.csrf}, Session: ${!!this.session}`);
      }
      this.client.defaults.headers["x-csrf-token"] = this.csrf;
      this.isInit = true;
      console.log("[Success] Initialization complete.");
    } catch (e) {
      console.error("[Error] Initialization failed:", e?.message || e);
      throw e;
    }
  }
  async _img(input) {
    try {
      if (Buffer.isBuffer(input)) return {
        data: input,
        ext: "jpg"
      };
      if (typeof input === "string") {
        if (input.startsWith("http")) {
          const res = await axios.get(input, {
            responseType: "arraybuffer"
          });
          return {
            data: Buffer.from(res.data),
            ext: "jpg"
          };
        }
        if (input.startsWith("data:image")) {
          const matches = input.match(/^data:image\/([A-Za-z-+.]+);base64,(.+)$/);
          return {
            data: Buffer.from(matches[2], "base64"),
            ext: matches[1] || "jpg"
          };
        }
        return {
          data: Buffer.from(input, "base64"),
          ext: "jpg"
        };
      }
      return {
        error: true,
        message: "Format image tidak dikenal"
      };
    } catch (e) {
      return {
        error: true,
        message: `Gagal memproses image: ${e.message}`
      };
    }
  }
  async _up(buffer, ext) {
    try {
      const form = new FormData();
      form.append("image", buffer, {
        filename: `blob.${ext}`,
        contentType: `image/${ext}`
      });
      const res = await this.client.post("/api/upload", form, {
        headers: form.getHeaders()
      });
      return res?.data?.success ? res.data : {
        error: true,
        message: "Upload gagal tanpa response sukses"
      };
    } catch (e) {
      return {
        error: true,
        message: `Upload gagal: ${e?.response?.data?.message || e.message}`
      };
    }
  }
  async _poll(taskId) {
    let attempts = 0;
    const maxAttempts = 60;
    console.log(`[Process] Polling task status for: ${taskId}`);
    return new Promise(resolve => {
      const interval = setInterval(async () => {
        try {
          attempts++;
          const res = await this.client.get(`/api/tasks/${taskId}`);
          const data = res?.data || {};
          const status = data.status || "failed";
          console.log(`[Polling] Attempt ${attempts}: Status -> ${status}`);
          if (status === "completed") {
            clearInterval(interval);
            const resultUrl = `https://phototune.ai/api/tasks/${taskId}/result`;
            resolve({
              ...data,
              result: resultUrl
            });
          } else if (status === "failed" || attempts >= maxAttempts) {
            clearInterval(interval);
            resolve({
              status: status === "failed" ? "failed" : "timeout",
              result: null
            });
          }
        } catch (e) {
          clearInterval(interval);
          resolve({
            status: "failed",
            result: e.message
          });
        }
      }, 3e3);
    });
  }
  async generate({
    mode,
    image,
    ...rest
  }) {
    try {
      const selectedMode = mode || null;
      if (!this.modes.includes(selectedMode)) {
        return {
          status: "failed",
          result: `Mode "${selectedMode}" tidak tersedia. Silakan pilih salah satu dari: ${this.modes.join(", ")}`
        };
      }
      const selectedStyle = rest?.style || "none";
      let payload = {
        type: selectedMode
      };
      let parsedImg = null;
      switch (selectedMode) {
        case "generator": {
          if (!this.styles.includes(selectedStyle)) {
            return {
              status: "failed",
              result: `Style "${selectedStyle}" tidak tersedia. Silakan pilih salah satu dari: ${this.styles.join(", ")}`
            };
          }
          if (!rest?.prompt) {
            return {
              status: "failed",
              result: "Prompt required untuk mode generator"
            };
          }
          payload.prompt = rest.prompt;
          payload.style = selectedStyle;
          break;
        }
        case "enhancer":
        case "upscaler":
        case "background":
        case "watermark": {
          if (!image) {
            return {
              status: "failed",
              result: `Image required untuk mode ${selectedMode}`
            };
          }
          parsedImg = await this._img(image);
          if (parsedImg?.error) {
            return {
              status: "failed",
              result: parsedImg.message
            };
          }
          break;
        }
        default:
          return {
            status: "failed",
              result: "Mode handler tidak terdefinisi"
          };
      }
      if (!this.isInit) {
        await this._init();
      }
      if (selectedMode !== "generator" && parsedImg) {
        switch (selectedMode) {
          case "background": {
            const uploaded = await this._up(parsedImg.data, parsedImg.ext);
            if (uploaded?.error || !uploaded?.url) {
              return {
                status: "failed",
                result: uploaded?.message || "Gagal mendapatkan url upload background"
              };
            }
            payload.image = {
              buffer: parsedImg.data,
              filename: "blob",
              contentType: `image/${parsedImg.ext}`
            };
            payload.source_image = uploaded.url;
            break;
          }
          default: {
            payload.file = {
              buffer: parsedImg.data,
              filename: "blob",
              contentType: `image/${parsedImg.ext}`
            };
            payload.source_image = rest?.source_image || `/uploads/mock_fallback_${Date.now()}.jpg`;
            if (selectedMode === "upscaler") payload.scale = String(rest?.scale || 2);
            if (selectedMode === "enhancer") payload.mode = rest?.enhancerMode || "default";
            break;
          }
        }
      }
      const finalPayload = {
        ...payload,
        ...rest
      };
      const form = new FormData();
      for (const [key, value] of Object.entries(finalPayload)) {
        if (key === "enhancerMode") continue;
        if (value && typeof value === "object" && value.buffer) {
          form.append(key, value.buffer, {
            filename: value.filename,
            contentType: value.contentType
          });
        } else {
          form.append(key, String(value));
        }
      }
      console.log(`[Process] Submitting task [Mode: ${selectedMode}]...`);
      const res = await this.client.post("/api/tasks", form, {
        headers: form.getHeaders()
      });
      const taskId = res?.data?.task_id;
      if (!taskId) return {
        status: "failed",
        result: "Gagal mendapatkan Task ID"
      };
      return await this._poll(taskId);
    } catch (e) {
      console.error(`[Error] Execution failed:`, e?.message || e);
      return {
        status: "failed",
        result: e?.message || "Unknown error"
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new Phototune();
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