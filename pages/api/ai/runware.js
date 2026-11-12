import axios from "axios";
import ApiKey from "@/configs/api-key";
const BASE = "https://api.runware.ai/v1";
const invalidKeys = new Set();
const MODELS = {
  "flux-schnell": {
    id: "runware:100@1",
    type: "image"
  },
  "flux-dev": {
    id: "runware:101@1",
    type: "image"
  },
  "sdxl-base": {
    id: "runware:10@1",
    type: "image"
  },
  "pony-diffusion-v6": {
    id: "civitai:257749@290640",
    type: "image"
  },
  "animagine-xl-3.1": {
    id: "civitai:260267@403476",
    type: "image"
  },
  "sd-1.5": {
    id: "runware:1@1",
    type: "image"
  },
  "realistic-vision-v6": {
    id: "civitai:245598@318622",
    type: "image"
  },
  epicrealism: {
    id: "civitai:25610@134065",
    type: "image"
  },
  "runware-edit": {
    id: "runware:400@4",
    type: "image",
    i2i: true
  },
  "flux-dev-i2i": {
    id: "runware:101@1",
    type: "image",
    i2i: true
  },
  "sdxl-inpaint": {
    id: "civitai:146033@162904",
    type: "image",
    i2i: true
  }
};
class RunWare {
  constructor() {
    this.keys = Array.isArray(ApiKey.runware) ? ApiKey.runware.filter(Boolean) : ApiKey.runware ? [ApiKey.runware] : [];
    this.http = axios.create({
      baseURL: BASE,
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "okhttp/4.12.0",
        Accept: "application/json"
      }
    });
  }
  markInvalid(key) {
    if (typeof key !== "string" || !key) return;
    if (!invalidKeys.has(key)) {
      invalidKeys.add(key);
      console.warn(`[INVALID-KEY] di-blacklist (401): ${key.slice(0, 12)}...`);
    }
  }
  markRecovered(key) {
    if (typeof key !== "string" || !key) return;
    if (invalidKeys.has(key)) {
      invalidKeys.delete(key);
      console.log(`[RECOVERED] key keluar dari blacklist: ${key.slice(0, 12)}...`);
    }
  }
  getAvailableKeys(customKey = "") {
    if (customKey && typeof customKey === "string" && customKey.trim()) {
      return [customKey.trim()];
    }
    return this.keys.filter(k => k && !invalidKeys.has(k));
  }
  models({
    type = ""
  } = {}) {
    const list = Object.entries(MODELS).map(([key, val]) => ({
      key: key,
      ...val
    }));
    return type ? list.filter(m => m.type === type) : list;
  }
  async generate({
    model = "flux-schnell",
    prompt = "",
    image = "",
    negativePrompt = "low quality, blurry, watermark, text, artifacts",
    width = 1024,
    height = 1024,
    steps = 4,
    CFGScale = 4,
    key = "",
    ...rest
  } = {}) {
    try {
      const meta = MODELS[model];
      if (!meta) {
        return {
          status: "error",
          message: `Model "${model}" tidak ditemukan.`,
          available: Object.keys(MODELS)
        };
      }
      const isEditMode = meta.i2i === true;
      const errors = [];
      if (!prompt) errors.push("prompt");
      if (isEditMode && !image) errors.push("image (base64 string)");
      if (errors.length > 0) {
        return {
          status: "error",
          message: `Gagal memproses request. Komponen wajib hilang untuk mode ${isEditMode ? "Image-to-Image" : "Text-to-Image"}.`,
          required: errors,
          model_info: {
            key: model,
            ...meta
          }
        };
      }
      const taskUUID = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}`;
      const taskPayload = {
        taskType: "imageInference",
        taskUUID: taskUUID,
        model: meta.id,
        positivePrompt: prompt,
        width: width,
        height: height,
        steps: steps,
        CFGScale: CFGScale,
        outputFormat: isEditMode ? "JPEG" : "PNG",
        outputType: "base64Data",
        deliveryMethod: "sync",
        ...rest
      };
      if (isEditMode) {
        taskPayload.inputs = {
          referenceImages: [image]
        };
      } else if (negativePrompt) {
        taskPayload.negativePrompt = negativePrompt;
      }
      const keysToTry = this.getAvailableKeys(key);
      if (!keysToTry.length) {
        return {
          status: "error",
          message: "Semua API Key Runware telah di-skip (401) atau tidak tersedia.",
          invalid_count: invalidKeys.size
        };
      }
      let lastErr;
      for (let i = 0; i < keysToTry.length; i++) {
        const currentKey = keysToTry[i];
        try {
          console.log(`[SUBMIT RUNWARE] Mode=${isEditMode ? "i2i" : "t2i"} | Model=${model} | Key Index=${i}`);
          const {
            data
          } = await this.http.post("/", [taskPayload], {
            headers: {
              Authorization: `Bearer ${currentKey}`
            }
          });
          if (!data || data.length === 0) {
            throw new Error("API Runware merespon dengan data kosong.");
          }
          this.markRecovered(currentKey);
          return {
            status: "success",
            model: model,
            mode: isEditMode ? "i2i" : "t2i",
            task_id: taskUUID,
            key_used: currentKey,
            data: data[0]
          };
        } catch (e) {
          lastErr = e;
          if (e.response?.status === 401) {
            this.markInvalid(currentKey);
            console.warn(`[SKIP-401 RUNWARE] key_idx=${i} di-skip, lanjut key berikutnya`);
            continue;
          }
          console.warn(`[RETRY RUNWARE] Key index ${i} bermasalah: ${e.message}`);
        }
      }
      throw lastErr;
    } catch (e) {
      return {
        status: "error",
        message: e.response?.data?.error || e.message
      };
    }
  }
  async status({
    task_id = "",
    key = ""
  } = {}) {
    const custom = key && typeof key === "string" && key.trim();
    let activeKey = null;
    if (custom) {
      activeKey = key.trim();
    } else {
      const pool = this.keys.filter(k => k && !invalidKeys.has(k));
      activeKey = pool[0] || null;
    }
    return {
      status: "success",
      message: "Runware menggunakan transaksi synchronous (sync). Gambar langsung dikembalikan di endpoint generate.",
      task_id: task_id,
      key_used: activeKey,
      invalid_count: invalidKeys.size
    };
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["models", "generate", "status"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib disertakan.",
      available_actions: validActions
    });
  }
  const api = new RunWare();
  try {
    let response;
    const customKey = params.key || params.api_key || "";
    switch (action) {
      case "models":
        response = await api.models(params);
        break;
      case "generate":
        response = await api.generate({
          ...params,
          key: customKey
        });
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'task_id' diperlukan untuk pengecekan status."
          });
        }
        response = await api.status({
          ...params,
          key: customKey
        });
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Aksi '${action}' tidak dikenal.`,
          valid_actions: validActions
        });
    }
    if (response.status === "error") {
      return res.status(400).json({
        status: false,
        ...response
      });
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] System Failure pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada struktur integrasi internal.",
      error: error.message || "Unknown Error"
    });
  }
}