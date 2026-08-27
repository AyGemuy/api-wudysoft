import axios from "axios";
import FormData from "form-data";
import crypto from "node:crypto";
class LupinAI {
  constructor() {
    this.token = null;
    this.user = null;
    this.modelList = [];
    this.base = "https://lupin-backend-production-3f26.up.railway.app/api/";
    this.http = axios.create({
      baseURL: this.base,
      headers: {
        "Content-Type": "application/json"
      }
    });
    this.http.interceptors.request.use(cfg => {
      if (this.token) cfg.headers.Authorization = `Bearer ${this.token}`;
      return cfg;
    });
  }
  async parseImg(src) {
    try {
      if (Buffer.isBuffer(src)) return {
        data: src,
        name: "image.jpg"
      };
      if (typeof src === "string") {
        if (/^https?:\/\//i.test(src)) {
          const res = await axios.get(src, {
            responseType: "arraybuffer"
          });
          return {
            data: Buffer.from(res?.data),
            name: "image.jpg"
          };
        }
        if (/^data:image\/[a-z]+;base64,/i.test(src)) {
          const pureBase64 = src.split(",")[1];
          return {
            data: Buffer.from(pureBase64, "base64"),
            name: "image.jpg"
          };
        }
        return {
          data: Buffer.from(src, "base64"),
          name: "image.jpg"
        };
      }
      return null;
    } catch (err) {
      console.error("[IMAGE ERROR]", err?.message || err);
      return null;
    }
  }
  async auth(id = null) {
    try {
      const uid = id || crypto.randomUUID();
      const res = await this.http.post("user", {
        id: uid,
        isAndroid: true
      });
      this.token = res?.data?.accessToken || res?.data;
      return {
        success: true,
        token: this.token
      };
    } catch (err) {
      return {
        success: false,
        error: err?.response?.data || err?.message
      };
    }
  }
  async unlock() {
    try {
      const res = await this.http.post("user/reviewer-unlock", {
        secret: "lupin_reviewer_2025"
      });
      return res?.data;
    } catch (err) {
      return {
        success: false,
        error: err?.response?.data || err?.message
      };
    }
  }
  async profile() {
    try {
      const res = await this.http.get("user");
      this.user = res?.data;
      return this.user;
    } catch (err) {
      return {
        success: false,
        error: err?.response?.data || err?.message
      };
    }
  }
  async models() {
    try {
      if (this.modelList?.length > 0) return this.modelList;
      const res = await this.http.get("category/aiModel");
      this.modelList = res?.data || [];
      return this.modelList;
    } catch (err) {
      return [];
    }
  }
  async generate({
    token,
    prompt,
    image,
    model,
    ...rest
  }) {
    try {
      if (token) this.token = token;
      if (!this.token) {
        const authRes = await this.auth();
        if (!authRes?.success) return {
          ...authRes,
          token: this.token
        };
        await this.unlock();
      }
      if (!this.user) await this.profile();
      const allModels = await this.models();
      const selectedModelName = model || "fal-ai/nano-banana";
      const modelSpec = allModels.find(m => m?.aiName?.toLowerCase() === selectedModelName?.toLowerCase() || m?.id === selectedModelName);
      const validRatios = modelSpec?.ratios ? modelSpec.ratios.split(",").map(r => r.trim()) : ["16:9", "9:16"];
      const validDurations = modelSpec?.durations ? modelSpec.durations.split(",").map(d => d.trim()) : ["4"];
      const validQualities = modelSpec?.qualities ? modelSpec.qualities.split(",").map(q => q.trim()) : ["720p"];
      const aspectRatio = rest?.aspectRatio || rest?.ratio || (validRatios.includes(rest?.ratio) ? rest.ratio : validRatios[0]);
      const duration = rest?.duration ? String(rest.duration) : validDurations[0];
      const quality = rest?.quality || validQualities[0];
      const coins = rest?.coins || String(modelSpec?.coins || (selectedModelName.includes("pro") ? "40" : "10"));
      const aiModel = modelSpec?.aiName || selectedModelName;
      const form = new FormData();
      form.append("prompt", prompt || "");
      form.append("aspectRatio", String(aspectRatio));
      form.append("duration", String(duration));
      form.append("aiModel", String(aiModel));
      form.append("coins", String(coins));
      form.append("quality", String(quality));
      if (image) {
        const imageList = Array.isArray(image) ? image : [image];
        for (const item of imageList) {
          const resolved = await this.parseImg(item);
          if (resolved?.data) form.append("photo", resolved.data, resolved.name);
        }
      }
      const res = await this.http.post("v2/video/fal-ai/v2", form, {
        headers: {
          ...form.getHeaders()
        }
      });
      return {
        token: this.token,
        task_id: res?.data?.videoId || res?.data?.requestId,
        ...res?.data
      };
    } catch (err) {
      return {
        success: false,
        token: this.token,
        error: err?.response?.data || err?.message
      };
    }
  }
  async status({
    token,
    task_id,
    ...rest
  }) {
    try {
      if (token) this.token = token;
      const targetId = task_id || rest?.id || rest?.videoId || rest?.requestId;
      if (!targetId) {
        return {
          success: false,
          token: this.token,
          message: "Parameter 'task_id' atau 'id' wajib diisi."
        };
      }
      const res = await this.http.get("v2/video");
      const list = Array.isArray(res?.data) ? res.data : [];
      const found = list.find(item => String(item?.id) === String(targetId) || String(item?.taskId) === String(targetId) || String(item?.videoId) === String(targetId));
      if (!found) {
        return {
          success: false,
          token: this.token,
          task_id: targetId,
          status: "not_found",
          message: "Video belum ditemukan di daftar creations."
        };
      }
      return {
        token: this.token,
        task_id: found.id,
        ...found
      };
    } catch (err) {
      return {
        success: false,
        token: this.token,
        task_id: task_id || rest?.id || rest?.videoId,
        error: err?.response?.data || err?.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body || {};
  const validActions = ["generate", "status", "models", "profile"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          generate: "/?action=generate&prompt=A+running+cat&model=fal-ai/sora-2/text-to-video/pro&ratio=16:9&duration=4",
          generate_image_to_video: "/?action=generate&prompt=Zoom+in&image=https://picsum.photos/300/300&model=fal-ai/nano-banana-pro",
          status: "/?action=status&task_id=4664&token=YOUR_TOKEN_HERE",
          models: "/?action=models",
          profile: "/?action=profile&token=YOUR_TOKEN_HERE"
        }
      }
    });
  }
  const api = new LupinAI();
  try {
    let response;
    switch (action) {
      case "generate":
      case "create":
        if (!params.prompt && !params.image) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' atau 'image' wajib diisi untuk action 'generate'."
          });
        }
        response = await api.generate(params);
        break;
      case "status":
      case "check":
        if (!params.task_id && !params.id && !params.videoId) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'task_id' atau 'id' wajib diisi untuk action 'status'."
          });
        }
        response = await api.status(params);
        break;
      case "models":
      case "list_models":
        const modelsData = await api.models();
        response = {
          models: modelsData
        };
        break;
      case "profile":
      case "user":
        if (!params.token && !api.token) {
          await api.auth();
          await api.unlock();
        }
        response = await api.profile();
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak valid: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (response && response.success === false) {
      return res.status(500).json({
        status: false,
        action: action,
        error: response.error || response.message || "Gagal memproses request internal API.",
        token: response.token || api.token || null
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
      action: action,
      error: error?.message || "Terjadi kesalahan internal pada server."
    });
  }
}