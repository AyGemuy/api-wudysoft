import axios from "axios";
import ApiKey from "@/configs/api-key";
const BASE = "https://api.runware.ai/v1";
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
    this.keys = ApiKey.runware || [];
    this._idx = 0;
    this.http = axios.create({
      baseURL: BASE
    });
    this.http.interceptors.request.use(cfg => {
      cfg.headers["Authorization"] = `Bearer ${this.keys[this._idx]}`;
      cfg.headers["Content-Type"] = "application/json";
      cfg.headers["User-Agent"] = "okhttp/4.12.0";
      cfg.headers["Accept"] = "application/json";
      return cfg;
    });
  }
  models({
    type = ""
  }) {
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
      const taskUUID = crypto.randomUUID ? crypto.randomUUID() : `task-${Date.now()}`;
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
      } else {
        if (negativePrompt) {
          taskPayload.negativePrompt = negativePrompt;
        }
      }
      let lastErr;
      for (let i = 0; i < this.keys.length; i++) {
        this._idx = i;
        try {
          console.log(`[SUBMIT RUNWARE] Mode=${isEditMode ? "i2i" : "t2i"} | Model=${model} | Key Index=${i}`);
          const {
            data
          } = await this.http.post("/", [taskPayload]);
          if (!data || data.length === 0) throw new Error("API Runware merespon dengan data kosong.");
          return {
            status: "success",
            model: model,
            mode: isEditMode ? "i2i" : "t2i",
            task_id: taskUUID,
            data: data[0]
          };
        } catch (e) {
          lastErr = e;
          console.warn(`[RETRY RUNWARE] Key index ${i} bermasalah. Mencoba pencadangan...`);
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
    task_id = ""
  } = {}) {
    return {
      status: "success",
      message: "Runware menggunakan transaksi synchronous (sync). Gambar langsung dikembalikan di endpoint generate.",
      task_id: task_id
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
    switch (action) {
      case "models":
        response = await api.models(params);
        break;
      case "generate":
        response = await api.generate(params);
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'task_id' diperlukan untuk pengecekan status."
          });
        }
        response = await api.status(params);
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