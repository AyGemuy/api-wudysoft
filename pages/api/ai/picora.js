import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class Picora {
  constructor() {
    this.base = "https://api.picora.app/api";
    this.uuid = crypto.randomBytes(8).toString("hex");
    this.device = `RMX${crypto.randomInt(1e3, 9999)}`;
    this.versionCode = "81";
    this.headers = {
      "User-Agent": "okhttp/4.12.0",
      Accept: "application/json",
      "Accept-Encoding": "gzip",
      uuid: this.uuid,
      "accept-language": "id-ID",
      "x-app-version-code": this.versionCode,
      "x-app-version-name": "3.1.12"
    };
    this.isReady = false;
    this.isInitializing = false;
  }
  log(msg, data = "") {
    const time = new Date().toISOString();
    console.log(`[Picora] [${time}] ${msg}${data ? " " + JSON.stringify(data) : ""}`);
  }
  async req(m, path, d = null, h = {}) {
    try {
      if (!this.isReady && !this.isInitializing && !["/user", "/user/credit"].includes(path)) {
        this.log(`Session not ready. Triggering auto-auth pipeline before hitting ${path}...`);
        const auth = await this.init();
        if (!auth?.success) return auth;
      }
      this.log(`Sending request: ${m} ${path}`);
      const config = {
        method: m,
        url: `${this.base}${path}`,
        headers: {
          ...this.headers,
          ...h
        },
        data: d
      };
      const res = await axios(config);
      return res?.data;
    } catch (err) {
      const errMsg = err?.response?.data || err?.message;
      this.log(`[ERROR] Request ${m} ${path} failed:`, errMsg);
      return {
        success: false,
        error: errMsg
      };
    }
  }
  async styles() {
    try {
      this.log("Fetching available styles...");
      return await this.req("GET", "/styles");
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
  async home() {
    try {
      this.log("Fetching home feed data...");
      return await this.req("GET", `/home?version=${this.versionCode}`);
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
  async reg() {
    try {
      this.log("Registering user / device...");
      const body = {
        app_version: "3.1.12",
        country: "ID",
        device_name: this.device,
        device_type: "android",
        os_version: "15",
        timezone: "Asia/Makassar"
      };
      return await this.req("POST", "/user", body);
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
  async ob(resp) {
    try {
      this.log(`Submitting onboarding data: ${Object.keys(resp || {})[0] || "unknown"}`);
      const body = {
        app_version: "3.1.12",
        country: "ID",
        device_name: this.device,
        device_type: "android",
        onboarding_responses: resp,
        os_version: "15",
        timezone: "Asia/Makassar"
      };
      return await this.req("PUT", "/user", body);
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
  async getCr() {
    try {
      this.log("Fetching user credits status...");
      return await this.req("GET", "/user/credit");
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
  async up(img, styleId) {
    try {
      this.log("Converting image input to streamable buffer...");
      let fileBuffer;
      const fileName = `image_${Date.now()}.jpg`;
      if (Buffer.isBuffer(img)) {
        fileBuffer = img;
      } else if (typeof img === "string" && img.startsWith("data:")) {
        fileBuffer = Buffer.from(img.split(",")[1], "base64");
      } else if (typeof img === "string" && (img.startsWith("http://") || img.startsWith("https://"))) {
        this.log(`Downloading image from URL: ${img}`);
        const resp = await axios.get(img, {
          responseType: "arraybuffer"
        });
        fileBuffer = Buffer.from(resp.data);
      } else if (typeof img === "string") {
        fileBuffer = Buffer.from(img, "base64");
      } else {
        return {
          success: false,
          error: "Unsupported image format"
        };
      }
      this.log("Constructing FormData payload for upload...");
      const form = new FormData();
      form.append("file", fileBuffer, {
        filename: fileName,
        contentType: "image/jpeg"
      });
      form.append("media_type", "image");
      form.append("style_id", String(styleId));
      this.log("Uploading media to Picora storage...");
      return await this.req("POST", "/upload", form, form.getHeaders());
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
  async poll(taskId) {
    try {
      this.log(`Starting background polling for Task ID: ${taskId}`);
      await this.req("PUT", `/generation/${taskId}`, {
        seen: 1
      }).catch(() => {});
      let loopCount = 0;
      while (true) {
        const res = await this.req("GET", `/generation/${taskId}`);
        if (res?.success === false) return res;
        const task = res?.data;
        if (!task) {
          return {
            success: false,
            error: "Failed to retrieve task data from server."
          };
        }
        if (task.status === "complete" || task.error) {
          this.log(`Polling complete. Task ${taskId} finished with status: ${task.status}`);
          if (task.error) {
            return {
              success: false,
              error: task.error,
              ...task
            };
          }
          return {
            success: true,
            ...task
          };
        }
        if (loopCount % 3 === 0) {
          this.log(`Task ${taskId} status: [${task.status}]. Estimated: ${task?.estimated_time_sec ?? "N/A"}s. Waiting...`);
        }
        loopCount++;
        await new Promise(resolve => setTimeout(resolve, 3e3));
      }
    } catch (err) {
      this.log(`[ERROR] Exception caught during polling loop for Task ${taskId}:`, err.message);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async init() {
    try {
      if (this.isReady) return {
        success: true
      };
      this.isInitializing = true;
      this.log(`Initializing automated pipeline session. UUID: ${this.uuid}`);
      await this.reg();
      await this.ob({
        gender: ["Male"]
      });
      await this.ob({
        style: ["3D Animation", "90s Anime"]
      });
      const cr = await this.getCr();
      const canGen = cr?.data?.generation_access?.can_generate ?? false;
      if (!canGen) {
        this.isInitializing = false;
        return {
          success: false,
          error: `Generation blocked: ${cr?.data?.generation_access?.reason || "No free quota"}`
        };
      }
      this.isReady = true;
      this.isInitializing = false;
      this.log("Pipeline initialization cleared. Device ready for core execution.");
      return {
        success: true
      };
    } catch (err) {
      this.isInitializing = false;
      return {
        success: false,
        error: err.message
      };
    }
  }
  async generate({
    prompt = "",
    image = null,
    style_id = 302,
    ...rest
  } = {}) {
    try {
      this.log("Invoking .generate() pipeline...");
      this.log("Validating input parameters...");
      const hasPrompt = prompt && typeof prompt === "string" && prompt.trim() !== "" || rest?.input_data?.text;
      const hasImage = image || rest?.media_ids && rest.media_ids.length > 0;
      if (!hasPrompt && !hasImage) {
        return {
          success: false,
          error: `[VALIDATION ERROR] Harus mengisi salah satu parameter wajib: 'prompt' atau 'image' untuk style_id: ${style_id}`
        };
      }
      this.log("Input validation passed successfully.");
      const mediaIds = [];
      if (image) {
        this.log("Image argument detected. Starting media allocation loop...");
        const images = Array.isArray(image) ? image : [image];
        for (const img of images) {
          const upRes = await this.up(img, style_id);
          if (upRes?.success === false) return upRes;
          const mid = upRes?.data?.media_id;
          if (mid) {
            mediaIds.push(mid);
            this.log(`Media uploaded successfully. Registered Media ID: ${mid}`);
          }
        }
      }
      const body = {
        media_ids: mediaIds.length > 0 ? mediaIds : rest?.media_ids || [],
        regenerate: false,
        style_id: style_id,
        ...prompt ? {
          input_data: {
            text: prompt
          }
        } : {},
        ...rest
      };
      this.log("Submitting generation transaction payload...");
      const genRes = await this.req("POST", "/generate/async", body);
      if (genRes?.success === false) return genRes;
      const taskId = genRes?.data?.id;
      if (!taskId) return {
        success: false,
        error: "Server response did not yield a valid Task ID."
      };
      this.log(`Generation successfully queued. Received Task ID: ${taskId}`);
      return await this.poll(taskId);
    } catch (err) {
      return {
        success: false,
        error: err.message
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const {
    action,
    ...payload
  } = params;
  const validActions = ["generate", "styles", "home"];
  if (!action) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'action' wajib diisi.",
      available_actions: validActions,
      usage: {
        method: "GET / POST",
        examples: {
          styles: "/picora?action=styles",
          home: "/picora?action=home",
          generate: {
            url: "/picora",
            method: "POST",
            body: {
              action: "generate",
              prompt: "A futuristic cybercity in Indonesia",
              style_id: 302
            }
          }
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
  const api = new Picora();
  try {
    let response;
    switch (action) {
      case "styles":
        response = await api.styles();
        break;
      case "home":
        response = await api.home();
        break;
      case "generate":
        const hasPrompt = payload.prompt && typeof payload.prompt === "string" && payload.prompt.trim() !== "";
        const hasImage = payload.image || payload.media_ids && payload.media_ids.length > 0;
        if (!hasPrompt && !hasImage) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' atau 'image' wajib diisi untuk action 'generate'."
          });
        }
        if (payload.style_id) {
          payload.style_id = Number(payload.style_id);
        }
        response = await api.generate(payload);
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
        error: "Tidak ada respons dari core pipeline Picora. Coba lagi nanti."
      });
    }
    if (response.success === false) {
      return res.status(422).json({
        status: false,
        action: action,
        ...response
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
      message: "Terjadi kesalahan internal pada server endpoint Picora.",
      error: error.message || "Unknown Error"
    });
  }
}