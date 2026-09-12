import axios from "axios";
import ApiKey from "@/configs/api-key";
const BASE = "https://api.runpod.ai/v2";
const MODELS = {
  "flux-dev": {
    id: "black-forest-labs-flux-1-dev",
    type: "image"
  },
  "flux-schnell": {
    id: "black-forest-labs-flux-1-schnell",
    type: "image"
  },
  "flux-kontext-dev": {
    id: "black-forest-labs-flux-1-kontext-dev",
    type: "image",
    i2i: true
  },
  "p-image-t2i": {
    id: "p-image-t2i",
    type: "image"
  },
  "p-image-edit": {
    id: "p-image-edit",
    type: "image",
    i2i: true
  },
  "qwen-image": {
    id: "qwen-image-t2i",
    type: "image"
  },
  "qwen-image-lora": {
    id: "qwen-image-lora",
    type: "image"
  },
  "qwen-image-edit": {
    id: "qwen-image-edit",
    type: "image",
    i2i: true
  },
  "qwen-image-edit-2511": {
    id: "qwen-image-edit-2511",
    type: "image",
    i2i: true
  },
  "qwen-image-edit-2511-lora": {
    id: "qwen-image-edit-2511-lora",
    type: "image",
    i2i: true
  },
  "seedream-4-t2i": {
    id: "seedream-4-t2i",
    type: "image"
  },
  "seedream-4-edit": {
    id: "seedream-4-edit",
    type: "image",
    i2i: true
  },
  "seedream-3": {
    id: "seedream-3",
    type: "image"
  },
  "wan-2-6-t2i": {
    id: "wan-2-6-t2i",
    type: "image"
  },
  "z-image-turbo": {
    id: "z-image-turbo",
    type: "image",
    i2i: true
  },
  "nano-banana-edit": {
    id: "nano-banana-edit",
    type: "image",
    i2i: true
  },
  "nano-banana-pro-edit": {
    id: "nano-banana-pro-edit",
    type: "image",
    i2i: true
  },
  infinitetalk: {
    id: "infinitetalk",
    type: "video",
    i2v: true
  },
  "kling-v2-1": {
    id: "kling-v2-1",
    type: "video",
    i2v: true
  },
  "kling-v2-6-motion-control": {
    id: "kling-v2-6-motion-control",
    type: "video",
    i2v: true
  },
  "kling-video-o1-r2v": {
    id: "kling-video-o1-r2v",
    type: "video",
    i2v: true
  },
  "seedance-1-pro": {
    id: "seedance-1-pro",
    type: "video"
  },
  "seedance-1-5-pro": {
    id: "seedance-1-5-pro",
    type: "video",
    i2v: true
  },
  "sora-2": {
    id: "sora-2",
    type: "video",
    i2v: true
  },
  "sora-2-pro": {
    id: "sora-2-pro",
    type: "video",
    i2v: true
  },
  "wan-2-6-t2v": {
    id: "wan-2-6-t2v",
    type: "video"
  },
  "wan-2-5": {
    id: "wan-2-5",
    type: "video",
    i2v: true
  },
  "wan-2-2-i2v-lora": {
    id: "wan-2-2-i2v-lora",
    type: "video",
    i2v: true
  },
  "wan-2-2-i2v": {
    id: "wan-2-2-i2v",
    type: "video",
    i2v: true
  },
  "wan-2-2-t2v": {
    id: "wan-2-2-t2v",
    type: "video"
  },
  "wan-2-1-i2v": {
    id: "wan-2-1-i2v",
    type: "video",
    i2v: true
  },
  "wan-2-1-t2v": {
    id: "wan-2-1-t2v",
    type: "video"
  },
  "granite-4": {
    id: "granite-4",
    type: "text"
  },
  "qwen3-32b": {
    id: "qwen3-32b",
    type: "text"
  },
  "chatterbox-turbo": {
    id: "chatterbox-turbo",
    type: "audio"
  },
  "whisper-v3": {
    id: "whisper-v3",
    type: "audio",
    i2i: true
  },
  "minimax-speech": {
    id: "minimax-speech",
    type: "audio"
  }
};
class RunPod {
  constructor() {
    this.keys = Array.isArray(ApiKey.runpod) ? ApiKey.runpod : [ApiKey.runpod];
    this.http = axios.create({
      baseURL: BASE,
      headers: {
        "Content-Type": "application/json"
      }
    });
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
    model = "p-image-t2i",
    prompt = "",
    image = "",
    key = "",
    ...rest
  } = {}) {
    try {
      const meta = MODELS[model];
      if (!meta) {
        return {
          status: "error",
          message: `Model "${model}" not found`,
          available: Object.keys(MODELS)
        };
      }
      const isEditMode = meta.i2i || meta.i2v;
      const errors = [];
      if (!prompt && meta.type !== "audio") errors.push("prompt");
      if (isEditMode && !image) errors.push("image");
      if (errors.length > 0) {
        return {
          status: "error",
          message: `Missing required input for model type: ${isEditMode ? "Edit/I2V" : "Generation"}`,
          required: errors,
          model_info: {
            key: model,
            ...meta
          }
        };
      }
      const input = {
        ...prompt ? {
          prompt: prompt
        } : {},
        ...image ? {
          image: image
        } : {},
        ...rest
      };
      const keysToTry = key ? [key] : this.keys;
      let lastErr;
      for (let i = 0; i < keysToTry.length; i++) {
        const currentKey = keysToTry[i];
        try {
          console.log(`[SUBMIT] ${model} | key_idx=${i}`);
          const {
            data
          } = await this.http.post(`/${meta.id}/run`, {
            input: input
          }, {
            headers: {
              Authorization: `Bearer ${currentKey}`
            }
          });
          if (!data?.id) throw new Error(JSON.stringify(data));
          return {
            status: "success",
            model: model,
            task_id: data.id,
            key_used: currentKey
          };
        } catch (e) {
          lastErr = e;
          console.warn(`[RETRY] key_idx=${i} failed: ${e.message}`);
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
    model = "p-image-t2i",
    task_id = "",
    key = ""
  } = {}) {
    try {
      if (!model || !task_id) throw new Error("Model and task_id required");
      const meta = MODELS[model];
      if (!meta) throw new Error("Invalid model key");
      const keysToTry = key ? [key] : this.keys;
      let lastErr;
      for (let i = 0; i < keysToTry.length; i++) {
        const currentKey = keysToTry[i];
        try {
          const {
            data
          } = await this.http.get(`/${meta.id}/status/${task_id}`, {
            headers: {
              Authorization: `Bearer ${currentKey}`
            }
          });
          return {
            status: "success",
            key_used: currentKey,
            ...data
          };
        } catch (e) {
          lastErr = e;
          console.warn(`[STATUS RETRY] key_idx=${i} failed: ${e.message}`);
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
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        example: "/?action=generate&prompt=cyberpunk%20city"
      }
    });
  }
  const api = new RunPod();
  try {
    let response;
    const customKey = params.key || params.api_key || "";
    switch (action) {
      case "models":
        response = await api.models(params);
        break;
      case "generate":
        if (!params.prompt && params.model !== "minimax-speech" && params.model !== "whisper-v3") {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate({
          ...params,
          key: customKey
        });
        break;
      case "status":
        if (!params.task_id) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'task_id' wajib diisi untuk action 'status'.",
            example: "daf9b16b-0a51-45c8-a8eb-740e9c9567e4-e1"
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
          error: `Action tidak valid: ${action}.`,
          valid_actions: validActions
        });
    }
    return res.status(200).json({
      status: true,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[FATAL ERROR] Kegagalan pada action '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal pada server.",
      error: error.message || "Unknown Error"
    });
  }
}