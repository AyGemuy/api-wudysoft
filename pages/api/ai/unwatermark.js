import axios from "axios";
import {
  randomBytes
} from "crypto";
import FormData from "form-data";
import PROMPT from "@/configs/ai-prompt";
import SpoofHead from "@/lib/spoof-head";
class UnwatermarkAI {
  constructor() {
    this.cfg = {
      base: "https://api.unwatermark.ai/api/web/v1",
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        origin: "https://unwatermark.ai",
        pragma: "no-cache",
        priority: "u=1, i",
        "product-code": "067003",
        "product-serial": randomBytes(3).toString("hex"),
        referer: "https://unwatermark.ai/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        ...SpoofHead()
      },
      endpoints: {
        "auto-watermark": "auto-watermark",
        "manual-watermark": "manual-watermark",
        "object-removal": "object-removal",
        "background-removal": "background-removal",
        "video-watermark": "video-watermark",
        "gif-watermark": "gif-watermark",
        "photo-editor-nano-banana": "photo-editor-nano-banana",
        "photo-editor-flux-kontext": "photo-editor-flux-kontext",
        "photo-editor-p-image-edit": "photo-editor-p-image-edit"
      },
      modeMap: {
        "auto-v1": "auto-watermark",
        "auto-v2": "auto-watermark",
        "auto-v2-upgrade": "auto-watermark",
        manual: "manual-watermark",
        object_remover: "object-removal",
        background_remover: "background-removal",
        video_watermark: "video-watermark",
        "gif-watermark-remover": "gif-watermark",
        photo_editor: "photo-editor-flux-kontext"
      },
      modelMap: {
        nano_banana: "photo-editor-nano-banana",
        nano_banana_pro: "photo-editor-nano-banana",
        flux_kontext: "photo-editor-flux-kontext",
        p_image_edit: "photo-editor-p-image-edit",
        seedream: "photo-editor-flux-kontext",
        flux_2_pro: "photo-editor-flux-kontext"
      },
      models: ["nano_banana", "nano_banana_pro", "flux_kontext", "p_image_edit", "seedream", "flux_2_pro"],
      modes: ["auto-v1", "auto-v2", "auto-v2-upgrade", "manual", "object_remover", "background_remover", "video_watermark", "gif-watermark-remover", "photo_editor"],
      ratios: ["match_input_image", "1:1", "3:2", "2:3", "9:16", "16:9", "3:4", "4:3"],
      defaults: {
        mode: "photo_editor",
        model: "nano_banana",
        prompt: PROMPT.text,
        ratio: "match_input_image",
        mask: null
      }
    };
  }
  mapMode(mode) {
    return this.cfg.modeMap[mode] || mode;
  }
  mapModel(model) {
    return this.cfg.modelMap[model] || model;
  }
  isVideoOrGif(endpoint) {
    return endpoint === "video-watermark" || endpoint === "gif-watermark";
  }
  validateInput(data) {
    console.log("[validate] Checking input...");
    const {
      mode,
      model,
      image,
      ratio
    } = data || {};
    const finalMode = mode || this.cfg.defaults.mode;
    const finalModel = model || this.cfg.defaults.model;
    const finalRatio = ratio || this.cfg.defaults.ratio;
    if (!this.cfg.modes.includes(finalMode) && !this.cfg.modeMap[finalMode] && !this.cfg.endpoints[finalMode]) {
      return {
        valid: false,
        error: `mode not supported. Available: ${this.cfg.modes.join(", ")}`
      };
    }
    if (!this.cfg.models.includes(finalModel) && !this.cfg.modelMap[finalModel] && !this.cfg.endpoints[finalModel]) {
      return {
        valid: false,
        error: `model not supported. Available: ${this.cfg.models.join(", ")}`
      };
    }
    if (!this.cfg.ratios.includes(finalRatio)) {
      return {
        valid: false,
        error: `ratio not supported. Available: ${this.cfg.ratios.join(", ")}`
      };
    }
    if (!image) {
      return {
        valid: false,
        error: "image required (url/base64/buffer/array)"
      };
    }
    console.log("[validate] Input valid ✓");
    return {
      valid: true
    };
  }
  async imageToBuffer(img) {
    console.log("[image] Processing image...");
    try {
      if (Buffer.isBuffer(img)) {
        console.log("[image] Already buffer ✓");
        return img;
      }
      if (typeof img === "string") {
        if (img.startsWith("http://") || img.startsWith("https://")) {
          console.log("[image] Fetching from URL...");
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (img.startsWith("data:image") || img.startsWith("data:video")) {
          console.log("[image] Converting base64...");
          const base64Data = img.split(",")[1] || img;
          return Buffer.from(base64Data, "base64");
        }
        console.log("[image] Parsing base64...");
        return Buffer.from(img, "base64");
      }
      if (Array.isArray(img)) {
        console.log("[image] Converting array...");
        return Buffer.from(img);
      }
      throw new Error("Unsupported image format");
    } catch (err) {
      console.log("[image] Error:", err?.message);
      throw err;
    }
  }
  getContentType(filename) {
    const ext = filename?.split(".").pop()?.toLowerCase() || "jpg";
    const types = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      mp4: "video/mp4",
      mov: "video/quicktime",
      avi: "video/x-msvideo"
    };
    return types[ext] || "image/jpeg";
  }
  async createJob(data) {
    const {
      mode = this.cfg.defaults.mode,
        model = this.cfg.defaults.model,
        image,
        prompt = this.cfg.defaults.prompt,
        ratio = this.cfg.defaults.ratio,
        mask = this.cfg.defaults.mask, ...rest
    } = data;
    const endpoint = model ? this.mapModel(model) : mode ? this.mapMode(mode) : this.mapModel(this.cfg.defaults.model);
    const url = `${this.cfg.base}/${endpoint}/create-job`;
    console.log("[create] Endpoint:", endpoint);
    console.log("[create] Building form data...");
    const form = new FormData();
    try {
      const images = Array.isArray(image) ? image : [image];
      for (const [idx, img] of images.entries()) {
        console.log(`[create] Adding image ${idx + 1}/${images.length}...`);
        const buffer = await this.imageToBuffer(img);
        const filename = `image_${Date.now()}_${idx}.jpg`;
        const contentType = this.getContentType(filename);
        form.append("target_images", buffer, {
          filename: filename,
          contentType: contentType
        });
      }
      if (mask) {
        console.log("[create] Adding mask...");
        const maskBuffer = await this.imageToBuffer(mask);
        form.append("mask", maskBuffer, {
          filename: `mask_${Date.now()}.png`,
          contentType: "image/png"
        });
      }
      if (prompt) {
        form.append("prompt", prompt);
      }
      if (ratio) {
        form.append("ratio", ratio);
      }
      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined && value !== null) {
          console.log(`[create] Adding ${key}:`, value);
          form.append(key, value);
        }
      }
      console.log("[create] Sending request...");
      const res = await axios.post(url, form, {
        headers: {
          ...this.cfg.headers,
          ...form.getHeaders()
        },
        timeout: 6e4
      });
      console.log("[create] Job created ✓");
      return res?.data || res;
    } catch (err) {
      console.log("[create] Error:", err?.response?.data || err?.message);
      throw err;
    }
  }
  async getJob(endpoint, jobId) {
    const url = `${this.cfg.base}/${endpoint}/get-job/${jobId}`;
    console.log("[get] Checking job status...");
    try {
      const res = await axios.get(url, {
        headers: this.cfg.headers,
        timeout: 3e4
      });
      return res?.data || res;
    } catch (err) {
      console.log("[get] Error:", err?.response?.data || err?.message);
      throw err;
    }
  }
  async pollJob(endpoint, jobId, maxAttempts = 60, delay = 3e3) {
    console.log("[poll] Starting polling...");
    for (let i = 0; i < maxAttempts; i++) {
      try {
        console.log(`[poll] Attempt ${i + 1}/${maxAttempts}...`);
        const res = await this.getJob(endpoint, jobId);
        const status = res?.result?.status ?? -1;
        const code = res?.code ?? 0;
        if (status === 1 && code === 1e5) {
          console.log("[poll] Task completed ✓");
          return res?.result || res;
        }
        if (status === -1 || status === 2 || code === 4e5) {
          console.log("[poll] Task failed ✗");
          throw new Error(res?.message?.id || res?.message?.en || `Task failed: status=${status}, code=${code}`);
        }
        if (status === 0 || code === 3e5) {
          console.log(`[poll] Processing... waiting ${delay}ms`);
          await new Promise(r => setTimeout(r, delay));
          continue;
        }
        console.log(`[poll] Unknown status=${status}, code=${code}, waiting...`);
        await new Promise(r => setTimeout(r, delay));
      } catch (err) {
        if (i === maxAttempts - 1) throw err;
        console.log("[poll] Retry on error...");
        await new Promise(r => setTimeout(r, delay));
      }
    }
    throw new Error("Polling timeout");
  }
  async generate({
    mode = this.cfg.defaults.mode,
    model = this.cfg.defaults.model,
    image = null,
    prompt = this.cfg.defaults.prompt,
    ratio = this.cfg.defaults.ratio,
    mask = this.cfg.defaults.mask,
    ...rest
  } = {}) {
    console.log("[generate] Starting...");
    try {
      const validation = this.validateInput({
        mode: mode,
        model: model,
        image: image,
        ratio: ratio
      });
      if (!validation.valid) {
        return {
          success: false,
          error: validation.error
        };
      }
      const endpoint = model ? this.mapModel(model) : mode ? this.mapMode(mode) : this.mapModel(this.cfg.defaults.model);
      const createRes = await this.createJob({
        mode: mode,
        model: model,
        image: image,
        prompt: prompt,
        ratio: ratio,
        mask: mask,
        ...rest
      });
      if (createRes?.code !== 3e5) {
        return {
          success: false,
          error: createRes?.message?.id || createRes?.message?.en || "Create job failed",
          code: createRes?.code
        };
      }
      const jobId = createRes?.result?.job_id;
      if (!jobId) {
        return {
          success: false,
          error: "No job_id received"
        };
      }
      console.log("[generate] Job ID:", jobId);
      console.log("[generate] Credits cost:", createRes?.result?.credits_cost);
      console.log("[generate] Free times left:", createRes?.result?.remaining_free_times);
      const result = await this.pollJob(endpoint, jobId);
      console.log("[generate] Success ✓");
      return {
        success: true,
        ...result
      };
    } catch (err) {
      console.log("[generate] Error:", err?.message);
      return {
        success: false,
        error: err?.message || "Unknown error"
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
  const api = new UnwatermarkAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}