import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class AIArtGenClient {
  constructor() {
    this.appVersionCode = "831";
    this.appVersionName = "8.3.1";
    this.platform = "android";
    this.deviceId = this.genUUID();
    this.adId = this.genUUID();
    this.androidId = this.genAndroidId();
    this.bearerToken = null;
    this.taskId = null;
    this.hosts = {
      config: "https://config.production.aiartgen.net",
      account: "https://account.production.aiartgen.net",
      sync: "https://sync-task.production.aiartgen.net",
      async: "https://async-task.production.aiartgen.net",
      upload: "https://upload.production.aiartgen.net"
    };
    this.imageModels = [{
      id: "dream_shape_lighting",
      name: "General",
      cost: 1,
      work_type: "text2img"
    }, {
      id: "juggernaut_lighting",
      name: "Realistic",
      cost: 1,
      work_type: "text2img"
    }, {
      id: "redcraft_illustrious",
      name: "Realistic 2",
      cost: 1,
      work_type: "text2img"
    }, {
      id: "ilustreal_illustrious",
      name: "Realistic 3",
      cost: 2,
      work_type: "text2img"
    }, {
      id: "babes_illustrious",
      name: "Realistic 4",
      cost: 2,
      work_type: "text2img"
    }, {
      id: "raemu_lighting",
      name: "Anime",
      cost: 1,
      work_type: "text2img"
    }, {
      id: "wai_Illustrious",
      name: "Anime 2",
      cost: 2,
      work_type: "text2img"
    }, {
      id: "illustrij_Illustrious",
      name: "Anime 2.5D",
      cost: 2,
      work_type: "text2img"
    }, {
      id: "prefect_illustrious",
      name: "Anime 3",
      cost: 1,
      work_type: "text2img"
    }, {
      id: "goddess_illustrious",
      name: "Realistic 6",
      cost: 2,
      work_type: "text2img"
    }, {
      id: "perfectdeliberate_illustrious",
      name: "Anime 2.5D 2",
      cost: 2,
      work_type: "text2img"
    }, {
      id: "guofeng_sdxl",
      name: "GuoFeng",
      cost: 1,
      work_type: "text2img"
    }, {
      id: "disney_cartoon_sdxl",
      name: "Disney Cartoon",
      cost: 1,
      work_type: "text2img"
    }, {
      id: "samaritan_sdxl",
      name: "Samaritan",
      cost: 1,
      work_type: "text2img"
    }, {
      id: "prefectious_illustrious",
      name: "Anime 4",
      cost: 1,
      work_type: "text2img"
    }, {
      id: "realvis_lighting",
      name: "Realistic 5",
      cost: 1,
      work_type: "text2img"
    }, {
      id: "flux2_klein_fast",
      name: "Flux 2 Klein Fast",
      cost: 2.5,
      work_type: "flux2_text2img"
    }, {
      id: "flux2_klein",
      name: "Flux 2 Klein",
      cost: 2.5,
      work_type: "flux2_text2img"
    }, {
      id: "redzimage_zimg",
      name: "ZImage",
      cost: 2,
      work_type: "zimg_text2img"
    }, {
      id: "qwen_text2img",
      name: "Qwen Text2Img",
      cost: 1,
      work_type: "qwen_text2img"
    }, {
      id: "hidream_text2img",
      name: "HiDream Qwen",
      cost: 2,
      work_type: "hidream_text2img"
    }];
    this.config = {
      image: {
        ratio: ["1:1", "9:16", "16:9", "3:4", "4:3", "2:3", "3:2"]
      },
      video: {
        duration: [5, 10, 20],
        resolution: ["480p", "720p", "1080p"],
        engine: [{
          id: "wan2_2",
          name: "Wan 2.2",
          work_types: {
            text2video: "text2video_wan",
            image2video: "image2video_wan"
          }
        }, {
          id: "hunyuan1_5",
          name: "Hunyuan 1.5",
          work_types: {
            text2video: "text2video_hunyuan",
            image2video: "image2video_hunyuan"
          }
        }, {
          id: "ltx2",
          name: "LTX 2",
          work_types: {
            text2video: "text2video_ltx2",
            image2video: "image2video_ltx2"
          }
        }],
        work_type: ["text2video_sulphur", "image2video_sulphur", "text2video_ltx2_3", "image2video_ltx2_3", "text2video_ltx2", "image2video_ltx2", "text2video_hunyuan", "image2video_hunyuan", "text2video_hunyuan_720p", "image2video_hunyuan_720p", "text2video_wan", "image2video_wan", "text2video_wan_720P", "image2video_wan_720P"]
      }
    };
    this.imageRatios = this.config.image.ratio;
    this.videoDurations = this.config.video.duration;
    this.videoResolutions = this.config.video.resolution;
    this.videoEngines = this.config.video.engine;
    this.videoWorkTypes = this.config.video.work_type;
  }
  genUUID() {
    return crypto.randomUUID();
  }
  genAndroidId() {
    return crypto.randomBytes(8).toString("hex");
  }
  toBase64(obj) {
    return Buffer.from(JSON.stringify(obj)).toString("base64");
  }
  fromBase64(str) {
    return JSON.parse(Buffer.from(str, "base64").toString());
  }
  _applyState(state) {
    if (!state) return;
    try {
      const data = this.fromBase64(state);
      if (data.device_id) this.deviceId = data.device_id;
      if (data.ad_id) this.adId = data.ad_id;
      if (data.android_id) this.androidId = data.android_id;
      if (data.task_id) this.taskId = data.task_id;
      if (data.token) this.bearerToken = data.token;
      console.log("[state] Applied state:", data);
    } catch (e) {
      console.warn("[state] Failed to apply state:", e.message);
    }
  }
  _getEffectiveToken(tokenParam, state) {
    if (tokenParam) return tokenParam;
    if (state) {
      try {
        const data = this.fromBase64(state);
        if (data.token) return data.token;
      } catch (e) {}
    }
    return this.bearerToken;
  }
  _buildState(token) {
    return this.toBase64({
      device_id: this.deviceId,
      ad_id: this.adId,
      android_id: this.androidId,
      task_id: this.taskId,
      token: token || this.bearerToken || null
    });
  }
  _buildQuery(params = {}) {
    const base = {
      app_version_code: this.appVersionCode,
      app_version_name: this.appVersionName,
      device_id: this.deviceId,
      platform: this.platform,
      ad_id: this.adId,
      android_id: this.androidId,
      ...params
    };
    return new URLSearchParams(base).toString();
  }
  async _request(url, method = "GET", body = null, extraHeaders = {}, token = this.bearerToken) {
    console.log(`[request] ${method} ${url}`);
    const userAgent = `AIArtGen/${this.appVersionName} (${this.platform}; ${this.deviceId})`;
    const opts = {
      method: method,
      url: url,
      headers: {
        "User-Agent": userAgent,
        "Accept-Encoding": "gzip",
        "X-Client-Version": this.appVersionName,
        ...token && {
          Authorization: `Bearer ${token}`
        },
        ...extraHeaders
      },
      timeout: 12e4
    };
    if (body) {
      if (body instanceof FormData) {
        opts.data = body;
        opts.headers = {
          ...opts.headers,
          ...body.getHeaders()
        };
      } else {
        opts.data = body;
        opts.headers["Content-Type"] = "application/json";
      }
    }
    try {
      const resp = await axios(opts);
      console.log(`[request] Response status: ${resp.status}`);
      return resp.data;
    } catch (err) {
      console.error(`[request] Error: ${err.message}`);
      throw err;
    }
  }
  async _uploadImage(imageInput, token) {
    console.log("[upload] Processing image input...");
    let buffer;
    let filename = "upload.jpg";
    let contentType = "image/jpeg";
    if (typeof imageInput === "string") {
      if (imageInput.startsWith("data:")) {
        const matches = imageInput.match(/^data:([^;]+);base64,(.+)$/);
        if (matches) {
          const mimeType = matches[1];
          contentType = mimeType;
          const ext = mimeType.split("/")[1] || "jpg";
          filename = `upload.${ext}`;
          buffer = Buffer.from(matches[2], "base64");
          console.log("[upload] Decoded data URL image");
        } else {
          throw new Error("Invalid data URL");
        }
      } else if (/^https?:\/\//.test(imageInput)) {
        console.log("[upload] Fetching image from URL...");
        const response = await axios.get(imageInput, {
          responseType: "arraybuffer"
        });
        buffer = Buffer.from(response.data);
        const contentHeader = response.headers["content-type"];
        if (contentHeader) {
          contentType = contentHeader.split(";")[0];
          const ext = contentType.split("/")[1] || "jpg";
          filename = `upload.${ext}`;
        }
        console.log("[upload] Fetched image from URL");
      } else {
        const isBase64 = /^[A-Za-z0-9+/]+={0,2}$/.test(imageInput) && imageInput.length > 100;
        if (isBase64) {
          buffer = Buffer.from(imageInput, "base64");
          filename = "upload.jpg";
          console.log("[upload] Decoded base64 string");
        } else {
          throw new Error("Unsupported image string format. Use data URL, HTTP URL, or base64 string.");
        }
      }
    } else if (Buffer.isBuffer(imageInput)) {
      buffer = imageInput;
      console.log("[upload] Received Buffer");
    } else {
      throw new Error("Image input must be a string (URL or base64) or Buffer");
    }
    if (!buffer) throw new Error("Could not extract image buffer");
    const form = new FormData();
    form.append("file", buffer, {
      filename: filename,
      contentType: contentType
    });
    form.append("mimeType", contentType);
    const uploadUrl = `${this.hosts.upload}/api/v1/upload?${this._buildQuery()}`;
    console.log(`[upload] Sending to ${uploadUrl}`);
    const resp = await this._request(uploadUrl, "POST", form, {}, token);
    const filePath = resp?.file_path ?? resp?.data?.file_path ?? resp?.url;
    if (!filePath) throw new Error("Upload failed: no file_path returned");
    console.log(`[upload] Uploaded to: ${filePath}`);
    return filePath;
  }
  async uploadImage({
    state,
    token,
    image
  }) {
    console.log("[uploadImage] Uploading image...");
    try {
      if (state) this._applyState(state);
      const effectiveToken = this._getEffectiveToken(token, state);
      const filePath = await this._uploadImage(image, effectiveToken);
      const newState = this._buildState(effectiveToken);
      return {
        status: true,
        result: {
          file_path: filePath
        },
        state: newState
      };
    } catch (err) {
      console.error("[uploadImage] Error:", err.message);
      return {
        status: false,
        result: {
          error: err.message
        },
        state: null
      };
    }
  }
  async generate({
    state,
    token,
    mode = "image",
    prompt,
    image = null,
    ...rest
  }) {
    console.log(`[generate] Starting ${mode} generation with prompt: "${prompt}"`);
    try {
      if (state) this._applyState(state);
      let effectiveToken = this._getEffectiveToken(token, state);
      if (!effectiveToken) {
        this.deviceId = this.genUUID();
        this.adId = this.genUUID();
        this.androidId = this.genAndroidId();
        console.log("[generate] Guest mode: device IDs refreshed");
        effectiveToken = null;
      }
      console.log("[generate] Fetching account config...");
      const configUrl = `${this.hosts.config}/api/v1/config?${this._buildQuery({
client_diamonds: 0
})}`;
      const config = await this._request(configUrl, "GET", null, {}, effectiveToken);
      const diamonds = config?.account_info?.diamonds ?? 0;
      console.log(`[generate] Current diamonds: ${diamonds}`);
      let imageUrl = null;
      if (image) {
        console.log("[generate] Uploading image...");
        imageUrl = await this._uploadImage(image, effectiveToken);
        console.log(`[generate] Image uploaded: ${imageUrl}`);
      }
      let payload, endpoint, hostKey;
      switch (mode) {
        case "image": {
          const modelId = rest.modelId || "flux2_klein_fast";
          let workType = rest.workType;
          if (!workType) {
            const model = this.imageModels.find(m => m.id === modelId);
            workType = model?.work_type || "text2img";
          }
          payload = {
            device_id: this.deviceId,
            prompt: prompt,
            prompt_translated: prompt,
            negative_prompt: rest.negativePrompt || "",
            model_id: modelId,
            work_type: workType,
            width: rest.width || 756,
            height: rest.height || 1344,
            seed: rest.seed || Math.floor(Math.random() * 1e12),
            priority: 0,
            has_face: rest.hasFace || false,
            batch_size: 1,
            steps: rest.steps || 40,
            cfg_scale: rest.cfgScale || 7,
            is4k: rest.is4k || false,
            client_diamonds: diamonds,
            ratio: rest.ratio || "9:16",
            style: rest.style || "base",
            ...imageUrl && {
              prompt_image: imageUrl
            }
          };
          endpoint = "/api/v1/sync_task/add";
          hostKey = "sync";
          break;
        }
        case "video": {
          const workType = rest.workType || (imageUrl ? "image2video_wan" : "text2video_wan");
          const duration = rest.videoDuration || 5;
          payload = {
            device_id: this.deviceId,
            prompt: prompt,
            prompt_translated: prompt,
            negative_prompt: rest.negativePrompt || "",
            model_id: "static",
            work_type: workType,
            width: 1024,
            height: 1024,
            seed: rest.seed || Math.floor(Math.random() * 1e12),
            priority: 0,
            has_face: rest.hasFace || false,
            batch_size: 1,
            steps: rest.steps || 40,
            cfg_scale: rest.cfgScale || 7,
            is4k: rest.is4k || false,
            client_diamonds: diamonds,
            ratio: rest.ratio || "9:16",
            style: rest.style || "",
            video_width: rest.videoWidth || 720,
            video_height: rest.videoHeight || 1280,
            video_duration: duration,
            duration: duration,
            ...imageUrl && {
              prompt_image: imageUrl
            }
          };
          endpoint = "/api/v1/async_task/add";
          hostKey = "async";
          break;
        }
        default:
          throw new Error(`Unsupported mode: ${mode}`);
      }
      const url = `${this.hosts[hostKey]}${endpoint}?${this._buildQuery()}`;
      console.log(`[generate] Sending ${mode} task to ${url}`);
      const resp = await this._request(url, "POST", payload, {}, effectiveToken);
      console.log("[generate] Task submitted:", resp);
      const newState = this._buildState(effectiveToken);
      const status = resp?.success === true || !!resp?.task_id;
      return {
        status: status,
        result: resp,
        state: newState
      };
    } catch (err) {
      console.error("[generate] Error:", err.message);
      return {
        status: false,
        result: {
          error: err.message
        },
        state: null
      };
    }
  }
  async status({
    state,
    token,
    mode = "image",
    task_id,
    ...rest
  }) {
    console.log(`[status] Fetching status for ${mode} task ${task_id}`);
    try {
      if (!task_id && this.taskId) {
        task_id = this.taskId;
        console.log(`[status] Auto-loaded task_id from state: ${task_id}`);
      }
      if (!task_id) {
        throw new Error("task_id is required and not found in state");
      }
      const effectiveToken = this._getEffectiveToken(token, state);
      let url, method = "GET",
        body = null;
      switch (mode) {
        case "image":
          url = `${this.hosts.sync}/api/v1/sync_task/status/${task_id}?${this._buildQuery()}`;
          break;
        case "video":
          url = `${this.hosts.async}/api/v1/async_task/batch-status?${this._buildQuery()}`;
          method = "POST";
          body = {
            task_ids: [task_id]
          };
          break;
        default:
          throw new Error(`Unsupported mode: ${mode}`);
      }
      console.log(`[status] Requesting ${method} ${url}`);
      const resp = await this._request(url, method, body, {}, effectiveToken);
      let result = resp;
      if (mode === "video") {
        const tasks = Array.isArray(resp) ? resp : resp?.tasks ?? [];
        result = tasks.find(t => t.task_id === task_id) || resp;
      }
      if (result && (result.status === "completed" || result.progress === 100)) {
        console.log("[status] Task completed, fetching result via getResult...");
        const newState = this._buildState(effectiveToken);
        const resultData = await this.getResult({
          state: newState,
          token: effectiveToken,
          mode: mode,
          task_id: task_id
        });
        return {
          status: resultData.status,
          result: resultData.result,
          state: resultData.state
        };
      }
      const newState = this._buildState(effectiveToken);
      const status = result !== null && result !== undefined;
      return {
        status: status,
        result: result,
        state: newState
      };
    } catch (err) {
      console.error("[status] Error:", err.message);
      return {
        status: false,
        result: {
          error: err.message
        },
        state: null
      };
    }
  }
  async getResult({
    state,
    token,
    mode = "image",
    task_id
  }) {
    console.log(`[getResult] Fetching result for ${mode} task ${task_id}`);
    try {
      if (state) this._applyState(state);
      const effectiveToken = this._getEffectiveToken(token, state);
      let result;
      if (mode === "image") {
        const url = `${this.hosts.sync}/api/v1/sync_task/result/${task_id}?${this._buildQuery()}`;
        result = await this._request(url, "GET", null, {}, effectiveToken);
      } else if (mode === "video") {
        const url = `${this.hosts.async}/api/v1/async_task/batch-status?${this._buildQuery()}`;
        const body = {
          task_ids: [task_id]
        };
        const resp = await this._request(url, "POST", body, {}, effectiveToken);
        const tasks = Array.isArray(resp) ? resp : resp?.tasks ?? [];
        result = tasks.find(t => t.task_id === task_id) || resp;
      } else {
        throw new Error(`Unsupported mode: ${mode}`);
      }
      const newState = this._buildState(effectiveToken);
      const status = result !== null && result !== undefined;
      return {
        status: status,
        result: result,
        state: newState
      };
    } catch (err) {
      console.error("[getResult] Error:", err.message);
      return {
        status: false,
        result: {
          error: err.message
        },
        state: null
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action,
    ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["generate", "status"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          generate: "/?action=generate&prompt=cute+cat",
          status: "/?action=status&mode=image&task_id=112233&state=eyJhxxx"
        }
      }
    });
  }
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const api = new AIArtGenClient();
  try {
    let response;
    switch (action) {
      case "generate":
        if (!params.prompt) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' wajib diisi untuk action 'generate'.",
            example: "/?action=generate&prompt=cute+cat"
          });
        }
        response = await api.generate(params);
        break;
      case "status":
        if (!params.state) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'state' wajib diisi untuk action 'status'.",
            example: "/?action=status&mode=image&state=eyJhxxx&task_id=112233"
          });
        }
        response = await api.status(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: `Action tidak dikenali: '${action}'.`,
          valid_actions: validActions
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        action: action,
        error: "Tidak ada respons. Coba lagi nanti."
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
      message: "Terjadi kesalahan internal pada server atau target website.",
      error: error.message || "Unknown Error"
    });
  }
}