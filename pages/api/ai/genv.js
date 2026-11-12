import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class GeminiGenAPI {
  constructor() {
    this.baseUrl = "https://api.geminigen.ai";
    this.token = null;
    this.secret = "dm1dyxu11up17ana6pqvuaufkyijigdq";
    this.modes = {
      free: {
        endpoint: "/mobile/v1/video-gen/free",
        required: ["prompt|image"],
        allowedAspectRatios: ["portrait", "landscape", "square"],
        field_mapping: {
          aspect_ratio_field: "orientation",
          image_field: "files",
          model_field: null,
          resolution_field: null,
          duration_field: null,
          output_format_field: null,
          extra_fields: {}
        },
        defaults: {
          model: "free-video",
          aspect_ratio: "landscape"
        }
      },
      grok: {
        endpoint: "/mobile/v3/video-gen/grok-stream",
        required: ["prompt|image"],
        allowedAspectRatios: ["portrait", "landscape", "square"],
        allowedResolutions: ["720p", "1080p"],
        allowedDurations: ["6", "10"],
        field_mapping: {
          aspect_ratio_field: "aspect_ratio",
          image_field: "files",
          model_field: "model",
          resolution_field: "resolution",
          duration_field: "duration",
          output_format_field: null,
          extra_fields: {
            turnstile_token: "skip",
            service_mode: "stable"
          }
        },
        defaults: {
          model: "grok-video",
          aspect_ratio: "landscape",
          resolution: "720p",
          duration: "6"
        }
      },
      premium: {
        endpoint: "/mobile/v3/video-gen",
        required: ["prompt|image"],
        allowedModels: ["veo-3.1", "veo-3.1-lite", "veo-3.1-fast"],
        allowedAspectRatios: ["9:16", "16:9"],
        allowedResolutions: ["720p", "1080p"],
        allowedDurations: ["8"],
        field_mapping: {
          aspect_ratio_field: "aspect_ratio",
          image_field: "image",
          model_field: "model",
          resolution_field: "resolution",
          duration_field: "duration",
          output_format_field: null,
          extra_fields: {
            service_mode: "stable"
          }
        },
        defaults: {
          model: "veo-3.1",
          aspect_ratio: "16:9",
          resolution: "720p",
          duration: "8"
        }
      },
      "free-image": {
        endpoint: "/mobile/v1/imagen/free",
        required: ["prompt"],
        allowedAspectRatios: ["portrait", "landscape", "square"],
        field_mapping: {
          aspect_ratio_field: "orientation",
          image_field: "files",
          model_field: null,
          resolution_field: null,
          duration_field: null,
          output_format_field: null,
          extra_fields: {}
        },
        defaults: {
          aspect_ratio: "landscape"
        }
      },
      imgv2: {
        endpoint: "/mobile/v2/generate_image",
        required: ["prompt"],
        allowedModels: ["nano-banana-pro", "nano-banana-2", "imagen-4"],
        allowedAspectRatios: ["1:1", "16:9", "9:16", "4:3", "3:4", "3:2", "2:3", "4:5", "5:4", "21:9"],
        allowedResolutions: ["1K", "2K"],
        allowedOutputFormats: ["png", "jpg"],
        field_mapping: {
          aspect_ratio_field: "aspect_ratio",
          image_field: "files",
          model_field: "model",
          resolution_field: "resolution",
          duration_field: null,
          output_format_field: "output_format",
          extra_fields: {}
        },
        defaults: {
          model: "imagen-4",
          aspect_ratio: "1:1",
          resolution: "1K",
          output_format: "jpg"
        }
      },
      "grok-image": {
        endpoint: "/mobile/v1/imagen/grok",
        required: ["prompt"],
        allowedAspectRatios: ["square", "landscape", "portrait", "horizontal", "vertical"],
        field_mapping: {
          aspect_ratio_field: "orientation",
          image_field: "files",
          model_field: null,
          resolution_field: null,
          duration_field: null,
          output_format_field: null,
          extra_fields: {
            turnstile_token: "skip",
            num_result: 1
          }
        },
        defaults: {
          aspect_ratio: "landscape"
        }
      },
      board: {
        endpoint: "/mobile/v1/video-storyboard/grok",
        required: ["scenes"],
        allowedAspectRatios: ["portrait", "landscape", "square"],
        allowedResolutions: ["720p", "1080p"],
        field_mapping: {
          aspect_ratio_field: "aspect_ratio",
          image_field: "files",
          model_field: "model",
          resolution_field: "resolution",
          duration_field: null,
          output_format_field: null,
          extra_fields: {
            turnstile_token: "skip"
          }
        },
        defaults: {
          model: "grok-video",
          aspect_ratio: "landscape",
          resolution: "720p"
        }
      }
    };
    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 3e4,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    });
    this.client.interceptors.request.use(config => {
      console.log(`[GeminiGen] [Request] ${config.method?.toUpperCase()} -> ${config.url}`);
      const sec = this._secHeaders();
      config.headers["x-timestamp"] = sec["x-timestamp"];
      config.headers["x-token"] = sec["x-token"];
      if (this.token) {
        config.headers["Authorization"] = `Bearer ${this.token}`;
      }
      return config;
    }, error => Promise.reject(error));
  }
  _secHeaders() {
    const timestamp = Math.floor(Date.now() / 1e3).toString();
    const base64Timestamp = Buffer.from(timestamp, "utf8").toString("base64");
    const concatenated = this.secret + base64Timestamp;
    const token = crypto.createHash("md5").update(concatenated, "utf8").digest("hex");
    return {
      "x-timestamp": timestamp,
      "x-token": token
    };
  }
  _encryptPlan(plainText) {
    const key = crypto.createHash("sha256").update(this.secret).digest();
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
    let encrypted = cipher.update(plainText, "utf8", "base64");
    encrypted += cipher.final("base64");
    const ivBase64 = iv.toString("base64");
    return `${encrypted}:${ivBase64}`;
  }
  async _ensureActivated() {
    if (this.token) {
      return this.token;
    }
    console.log("[GeminiGen] No token found. Auto-activating...");
    const randomUuid = crypto.randomUUID();
    const randomFcmToken = crypto.randomBytes(32).toString("hex");
    const data = await this.reg({
      uuid: randomUuid,
      fcm: randomFcmToken
    });
    if (data?.access_token) {
      this.setToken(data.access_token);
      return this.token;
    }
    return null;
  }
  async _solveImg(img) {
    if (!img) return null;
    try {
      if (Buffer.isBuffer(img)) return img;
      if (typeof img === "string") {
        if (img.startsWith("http://") || img.startsWith("https://")) {
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (img.includes("base64,") || /^[a-zA-Z0-9+/=]+$/.test(img.replace(/[\s\r\n]+/g, ""))) {
          const cleanBase64 = img.includes("base64,") ? img.split("base64,")[1] : img;
          return Buffer.from(cleanBase64, "base64");
        }
      }
      return img;
    } catch (err) {
      console.error("[GeminiGen] Image resolve error:", err.message);
      return null;
    }
  }
  async _buildForm(config, prompt, image, params) {
    const form = new FormData();
    const mapping = config.field_mapping;
    form.append("prompt", prompt || "");
    if (image && mapping.image_field) {
      const resolvedImg = await this._solveImg(image);
      if (resolvedImg) {
        form.append(mapping.image_field, resolvedImg, {
          filename: "image.jpg",
          contentType: "image/jpeg"
        });
      }
    }
    if (mapping.model_field && params.model) {
      form.append(mapping.model_field, params.model);
    }
    if (mapping.aspect_ratio_field && params.aspect_ratio) {
      form.append(mapping.aspect_ratio_field, params.aspect_ratio);
    }
    if (mapping.resolution_field && params.resolution) {
      form.append(mapping.resolution_field, params.resolution);
    }
    if (mapping.duration_field && params.duration) {
      form.append(mapping.duration_field, params.duration);
    }
    if (mapping.output_format_field && params.output_format) {
      form.append(mapping.output_format_field, params.output_format);
    }
    if (params.scenes) {
      form.append("scenes", JSON.stringify(params.scenes));
    }
    if (mapping.extra_fields) {
      Object.keys(mapping.extra_fields).forEach(key => {
        form.append(key, params[key] !== undefined ? params[key] : mapping.extra_fields[key]);
      });
    }
    return form;
  }
  async _sendGeneration(config, form) {
    const response = await this.client.post(config.endpoint, form, {
      headers: form.getHeaders()
    });
    return {
      success: true,
      token: this.token,
      ...response.data
    };
  }
  async _board({
    scenes,
    model,
    ...rest
  }) {
    const form = new FormData();
    form.append("scenes", JSON.stringify(scenes));
    form.append("model", model);
    form.append("aspect_ratio", rest.aspectRatio);
    form.append("resolution", rest.resolution);
    form.append("turnstile_token", rest.turnstileToken);
    const response = await this.client.post("/mobile/v1/video-storyboard/grok", form, {
      headers: form.getHeaders()
    });
    return {
      success: true,
      token: this.token,
      ...response.data
    };
  }
  async _imgv2({
    prompt,
    model,
    ...rest
  }) {
    const form = new FormData();
    form.append("prompt", prompt ? prompt : "");
    form.append("model", model);
    form.append("aspect_ratio", rest.aspectRatio);
    form.append("output_format", rest.outputFormat);
    form.append("resolution", rest.resolution);
    const response = await this.client.post("/mobile/v2/generate_image", form, {
      headers: form.getHeaders()
    });
    return {
      success: true,
      token: this.token,
      ...response.data
    };
  }
  async _grok({
    prompt,
    orientation,
    ...rest
  }) {
    const form = new FormData();
    form.append("prompt", prompt ? prompt : "");
    form.append("orientation", orientation);
    form.append("turnstile_token", rest.turnstileToken);
    form.append("num_result", rest.numResult);
    const response = await this.client.post("/mobile/v1/imagen/grok", form, {
      headers: form.getHeaders()
    });
    return {
      success: true,
      token: this.token,
      ...response.data
    };
  }
  async _premium({
    prompt,
    resolvedImg,
    ...rest
  }) {
    const form = new FormData();
    form.append("prompt", prompt ? prompt : "");
    if (resolvedImg) {
      form.append("image", resolvedImg, {
        filename: "image.jpg",
        contentType: "image/jpeg"
      });
    }
    form.append("model", rest.model);
    form.append("duration", rest.duration);
    form.append("resolution", rest.resolution);
    form.append("aspect_ratio", rest.aspectRatio);
    form.append("service_mode", rest.serviceMode);
    const response = await this.client.post("/mobile/v3/video-gen", form, {
      headers: form.getHeaders()
    });
    return {
      success: true,
      token: this.token,
      ...response.data
    };
  }
  async _free({
    prompt,
    resolvedImg,
    ...rest
  }) {
    const form = new FormData();
    form.append("prompt", prompt ? prompt : "");
    if (resolvedImg) {
      form.append("image", resolvedImg, {
        filename: "image.jpg",
        contentType: "image/jpeg"
      });
    }
    form.append("model", rest.model);
    form.append("duration", rest.duration);
    form.append("resolution", rest.resolution);
    form.append("aspect_ratio", rest.aspectRatio);
    form.append("service_mode", rest.serviceMode);
    const response = await this.client.post("/mobile/v1/video-gen/free", form, {
      headers: form.getHeaders()
    });
    return {
      success: true,
      token: this.token,
      ...response.data
    };
  }
  async _freeImage({
    prompt,
    resolvedImg,
    ...rest
  }) {
    const form = new FormData();
    form.append("prompt", prompt ? prompt : "");
    if (resolvedImg) {
      form.append("files", resolvedImg, {
        filename: "image.jpg",
        contentType: "image/jpeg"
      });
    }
    form.append("orientation", rest.aspectRatio);
    const response = await this.client.post("/mobile/v1/imagen/free", form, {
      headers: form.getHeaders()
    });
    return {
      success: true,
      token: this.token,
      ...response.data
    };
  }
  setToken(token) {
    this.token = token || null;
    console.log("[GeminiGen] Authorization token updated.");
  }
  async reg({
    token,
    uuid,
    fcm,
    ...rest
  }) {
    try {
      if (token) this.setToken(token);
      const payload = {
        mobile_device_uuid: uuid,
        platform: "GenV-APP",
        device_token: fcm,
        device_type: "android",
        ...rest
      };
      const response = await this.client.post("/mobile/v1/uuid/activate-account", payload);
      return {
        success: true,
        token: this.token,
        ...response.data
      };
    } catch (err) {
      console.error("[GeminiGen] Registration failed.");
      return {
        success: false,
        token: this.token,
        error: err.response?.data || err.message
      };
    }
  }
  async login({
    token,
    user,
    pass,
    ...rest
  }) {
    try {
      if (token) this.setToken(token);
      const payload = {
        username: user,
        password: pass,
        platform: "GenV-APP",
        ...rest
      };
      const response = await this.client.post("/mobile/v1/login", payload);
      return {
        success: true,
        token: this.token,
        ...response.data
      };
    } catch (err) {
      console.error("[GeminiGen] Login failed.");
      return {
        success: false,
        token: this.token,
        error: err.response?.data || err.message
      };
    }
  }
  async refresh({
    token,
    rToken,
    ...rest
  }) {
    try {
      if (token) this.setToken(token);
      const payload = {
        refresh_token: rToken,
        ...rest
      };
      const response = await this.client.post("/mobile/v1/refresh-token", payload);
      return {
        success: true,
        token: this.token,
        ...response.data
      };
    } catch (err) {
      console.error("[GeminiGen] Token refresh failed.");
      return {
        success: false,
        token: this.token,
        error: err.response?.data || err.message
      };
    }
  }
  async me({
    token,
    ...rest
  } = {}) {
    try {
      if (token) this.setToken(token);
      const activeToken = await this._ensureActivated();
      if (!activeToken) return {
        success: false,
        token: null,
        error: "Activation/Authorization failed."
      };
      const response = await this.client.get("/mobile/v1/me", {
        params: rest
      });
      return {
        success: true,
        token: this.token,
        ...response.data
      };
    } catch (err) {
      console.error("[GeminiGen] Fetch profile failed.");
      return {
        success: false,
        token: this.token,
        error: err.response?.data || err.message
      };
    }
  }
  async history({
    token,
    limit = 10,
    page = 1,
    filter = null,
    ...rest
  } = {}) {
    try {
      if (token) this.setToken(token);
      const activeToken = await this._ensureActivated();
      if (!activeToken) return {
        success: false,
        token: null,
        error: "Activation/Authorization failed."
      };
      let url = `/mobile/v1/histories?items_per_page=${limit}&page=${page}`;
      url = filter ? `${url}&filter_by=${encodeURIComponent(filter)}` : url;
      const response = await this.client.get(url, {
        params: rest
      });
      return {
        success: true,
        token: this.token,
        ...response.data
      };
    } catch (err) {
      console.error("[GeminiGen] Fetch history failed.");
      return {
        success: false,
        token: this.token,
        error: err.response?.data || err.message
      };
    }
  }
  async del({
    token,
    id,
    ...rest
  }) {
    try {
      if (token) this.setToken(token);
      const activeToken = await this._ensureActivated();
      if (!activeToken) return {
        success: false,
        token: null,
        error: "Activation/Authorization failed."
      };
      const response = await this.client.delete(`/mobile/v1/history/${id}`, {
        params: rest
      });
      return {
        success: true,
        token: this.token,
        ...response.data
      };
    } catch (err) {
      console.error("[GeminiGen] Delete history item failed.");
      return {
        success: false,
        token: this.token,
        error: err.response?.data || err.message
      };
    }
  }
  async status({
    token,
    uuid,
    ...rest
  }) {
    try {
      if (token) this.setToken(token);
      const activeToken = await this._ensureActivated();
      if (!activeToken) return {
        success: false,
        token: null,
        error: "Activation/Authorization failed."
      };
      const response = await this.client.get(`/mobile/v1/history/${uuid}`, {
        params: rest
      });
      return {
        success: true,
        token: this.token,
        ...response.data
      };
    } catch (err) {
      console.error("[GeminiGen] Status check failed.");
      return {
        success: false,
        token: this.token,
        error: err.response?.data || err.message
      };
    }
  }
  async gen({
    token,
    mode,
    prompt,
    image,
    ...rest
  }) {
    try {
      if (token) this.setToken(token);
      const activeToken = await this._ensureActivated();
      if (!activeToken) return {
        success: false,
        token: null,
        error: "Activation/Authorization failed."
      };
      const targetMode = mode ? mode.toLowerCase() : "";
      const availableModes = Object.keys(this.modes);
      if (!targetMode || !availableModes.includes(targetMode)) {
        console.log(`[GeminiGen] Validation Error: Unsupported or missing mode "${targetMode}".`);
        return {
          success: false,
          token: this.token,
          error: `Unsupported or missing mode: "${targetMode}"`,
          availableModes: availableModes
        };
      }
      const modeConfig = this.modes[targetMode];
      console.log(`[GeminiGen] Validating requirements for mode: ${targetMode}`);
      for (const req of modeConfig.required) {
        if (req.includes("|")) {
          const options = req.split("|");
          const passes = options.some(opt => {
            if (opt === "prompt") return !!prompt;
            if (opt === "image") return !!image;
            return !!rest[opt];
          });
          if (!passes) {
            console.log(`[GeminiGen] Validation Error: At least one of [${options.join(", ")}] is required.`);
            return {
              success: false,
              token: this.token,
              error: `Validation failed: missing required fields.`,
              required: modeConfig.required
            };
          }
        } else {
          if (req === "scenes") {
            if (!rest.scenes || !Array.isArray(rest.scenes) || rest.scenes.length === 0) {
              console.log(`[GeminiGen] Validation Error: "scenes" must be a non-empty array.`);
              return {
                success: false,
                token: this.token,
                error: `scenes is required and must be a non-empty array for ${targetMode} mode`,
                required: ["scenes"]
              };
            }
          } else if (req === "prompt" && !prompt) {
            console.log(`[GeminiGen] Validation Error: "prompt" is required.`);
            return {
              success: false,
              token: this.token,
              error: `prompt is required for ${targetMode} mode`,
              required: ["prompt"]
            };
          } else if (req === "image" && !image) {
            console.log(`[GeminiGen] Validation Error: "image" is required.`);
            return {
              success: false,
              token: this.token,
              error: `image is required for ${targetMode} mode`,
              required: ["image"]
            };
          }
        }
      }
      const mergedParams = {
        ...modeConfig.defaults,
        ...rest
      };
      if (mergedParams.model && modeConfig.allowedModels && !modeConfig.allowedModels.includes(mergedParams.model)) {
        return {
          success: false,
          token: this.token,
          error: `Invalid model "${mergedParams.model}" for mode "${targetMode}".`,
          allowedModels: modeConfig.allowedModels
        };
      }
      if (mergedParams.aspect_ratio && modeConfig.allowedAspectRatios && !modeConfig.allowedAspectRatios.includes(mergedParams.aspect_ratio)) {
        return {
          success: false,
          token: this.token,
          error: `Invalid aspect_ratio "${mergedParams.aspect_ratio}" for mode "${targetMode}".`,
          allowedAspectRatios: modeConfig.allowedAspectRatios
        };
      }
      if (mergedParams.resolution && modeConfig.allowedResolutions && !modeConfig.allowedResolutions.includes(mergedParams.resolution)) {
        return {
          success: false,
          token: this.token,
          error: `Invalid resolution "${mergedParams.resolution}" for mode "${targetMode}".`,
          allowedResolutions: modeConfig.allowedResolutions
        };
      }
      if (mergedParams.duration && modeConfig.allowedDurations && !modeConfig.allowedDurations.includes(mergedParams.duration.toString())) {
        return {
          success: false,
          token: this.token,
          error: `Invalid duration "${mergedParams.duration}" for mode "${targetMode}".`,
          allowedDurations: modeConfig.allowedDurations
        };
      }
      if (mergedParams.output_format && modeConfig.allowedOutputFormats && !modeConfig.allowedOutputFormats.includes(mergedParams.output_format)) {
        return {
          success: false,
          token: this.token,
          error: `Invalid output_format "${mergedParams.output_format}" for mode "${targetMode}".`,
          allowedOutputFormats: modeConfig.allowedOutputFormats
        };
      }
      const resolvedImg = image ? await this._solveImg(image) : null;
      switch (targetMode) {
        case "grok":
          return await this._grok({
            prompt: prompt,
            orientation: mergedParams.orientation || mergedParams.aspect_ratio,
            ...mergedParams
          });
        case "imgv2":
          return await this._imgv2({
            prompt: prompt,
            ...mergedParams
          });
        case "board":
          return await this._board({
            scenes: mergedParams.scenes,
            ...mergedParams
          });
        case "free-image":
          return await this._freeImage({
            prompt: prompt,
            resolvedImg: resolvedImg,
            ...mergedParams
          });
        case "free":
          return await this._free({
            prompt: prompt,
            resolvedImg: resolvedImg,
            ...mergedParams
          });
        case "premium":
          return await this._premium({
            prompt: prompt,
            resolvedImg: resolvedImg,
            ...mergedParams
          });
        default:
          return {
            success: false,
              token: this.token,
              error: `Unsupported mode: ${targetMode}`
          };
      }
    } catch (err) {
      console.error("[GeminiGen] Consolidated generation failed.");
      return {
        success: false,
        token: this.token,
        error: err.message
      };
    }
  }
  async redeem({
    token,
    code,
    ...rest
  }) {
    try {
      if (token) this.setToken(token);
      const activeToken = await this._ensureActivated();
      if (!activeToken) return {
        success: false,
        token: null,
        error: "Activation/Authorization failed."
      };
      const payload = {
        gift_card_code: code,
        ...rest
      };
      const response = await this.client.post("/mobile/v1/redeem-gift-card", payload);
      return {
        success: true,
        token: this.token,
        ...response.data
      };
    } catch (err) {
      console.error("[GeminiGen] Gift card redemption failed.");
      return {
        success: false,
        token: this.token,
        error: err.response?.data || err.message
      };
    }
  }
  async report({
    token,
    uuid,
    reason,
    ...rest
  }) {
    try {
      if (token) this.setToken(token);
      const activeToken = await this._ensureActivated();
      if (!activeToken) return {
        success: false,
        token: null,
        error: "Activation/Authorization failed."
      };
      const payload = {
        history_uuid: uuid,
        reason: reason,
        email: rest.email || null,
        note: rest.note || null,
        ...rest
      };
      const response = await this.client.post("/mobile/v1/reports", payload);
      return {
        success: true,
        token: this.token,
        ...response.data
      };
    } catch (err) {
      console.error("[GeminiGen] Report submission failed.");
      return {
        success: false,
        token: this.token,
        error: err.response?.data || err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["profile", "history", "status", "delete", "generate", "redeem", "report"];
  if (!action) {
    return res.status(400).json({
      success: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          profile: "/api/gemini?action=profile&authToken=TOKEN_OPSIONAL",
          history: "/api/gemini?action=history&limit=10&page=1&filter=landscape&authToken=TOKEN_OPSIONAL",
          status: "/api/gemini?action=status&id=ID_RIWAYAT&authToken=TOKEN_OPSIONAL",
          delete: "/api/gemini?action=delete&id=ID_RIWAYAT&authToken=TOKEN_OPSIONAL",
          redeem: "/api/gemini?action=redeem&code=KODE_GIFT_CARD&authToken=TOKEN_OPSIONAL",
          report: "/api/gemini?action=report&uuid=UUID_RIWAYAT&reason=Alasan_Laporan&authToken=TOKEN_OPSIONAL",
          generate: {
            endpoint: "/api/gemini?action=generate",
            method: "POST",
            body: {
              authToken: "TOKEN_OPSIONAL",
              mode: "free",
              prompt: "Kucing futuristik di luar angkasa",
              image: "URL_ATAU_BASE64_GAMBAR_OPSIONAL"
            }
          }
        }
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      success: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new GeminiGenAPI();
  try {
    let response;
    console.log(`[Next.js API] Executing action: '${action}'`);
    switch (action) {
      case "profile":
        response = await api.me(params);
        break;
      case "history":
        response = await api.history(params);
        break;
      case "status":
        if (!params.id) {
          return res.status(400).json({
            success: false,
            error: "Parameter 'id' wajib diisi untuk memeriksa status pembuatan."
          });
        }
        response = await api.status(params);
        break;
      case "delete":
        if (!params.id) {
          return res.status(400).json({
            success: false,
            error: "Parameter 'id' wajib diisi untuk menghapus item riwayat."
          });
        }
        response = await api.del(params);
        break;
      case "redeem":
        if (!params.code) {
          return res.status(400).json({
            success: false,
            error: "Parameter 'code' (kode gift card) wajib diisi."
          });
        }
        response = await api.redeem(params);
        break;
      case "report":
        if (!params.uuid || !params.reason) {
          return res.status(400).json({
            success: false,
            error: "Parameter 'uuid' dan 'reason' wajib disertakan untuk membuat laporan."
          });
        }
        response = await api.report(params);
        break;
      case "generate":
        response = await api.gen(params);
        break;
      default:
        return res.status(400).json({
          success: false,
          error: "Aksi tidak dikenali oleh sistem API."
        });
    }
    if (!response) {
      return res.status(502).json({
        success: false,
        error: "Koneksi ke server hulu API gagal atau data kosong."
      });
    }
    return res.status(200).json({
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on action '${action}':`, error);
    return res.status(500).json({
      success: false,
      message: "Terjadi kesalahan sistem internal pada API Next.js.",
      error: error.message || "Unknown Error Exception"
    });
  }
}