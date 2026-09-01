import axios from "axios";
import FormData from "form-data";
import https from "https";
import crypto from "crypto";
class FlixGen {
  constructor() {
    this.cfg = {
      base: "https://flix.aritek.app",
      auth: "",
      sign: "e5fce0f8136217ad645df2a0cb1f1188dd2fbab8",
      ver: "34",
      def: {
        ctry_target: "indonesia"
      }
    };
    this.deviceId = this.genId();
    this.initialized = false;
    this.httpsAgent = new https.Agent({
      keepAlive: true,
      rejectUnauthorized: false
    });
  }
  genId() {
    try {
      return crypto.randomBytes(8).toString("hex");
    } catch (err) {
      console.error(`[CRYPTO ERR] Failed to generate Device ID: ${err.message}`);
      return "0666b2e8da418dfa";
    }
  }
  getH(isJson = false) {
    try {
      let formattedAuth = "Bearer";
      if (this.cfg.auth) {
        const trimmedAuth = this.cfg.auth.trim();
        if (trimmedAuth.toLowerCase().startsWith("bearer")) {
          formattedAuth = trimmedAuth;
        } else {
          formattedAuth = `Bearer ${trimmedAuth}`;
        }
      }
      const headers = {
        "User-Agent": "okhttp/5.1.0",
        "Accept-Encoding": "gzip",
        sign: this.cfg.sign,
        pt: "",
        "ctry-target": this.cfg.def.ctry_target,
        versioncode: this.cfg.ver,
        authorization: formattedAuth,
        "device-id": this.deviceId
      };
      if (isJson) headers["Content-Type"] = "application/json";
      return headers;
    } catch (err) {
      console.error(`[HEADER ERR] Failed to compose headers: ${err.message}`);
      return {};
    }
  }
  async req(config) {
    try {
      config.httpsAgent = this.httpsAgent;
      if (!config.headers) {
        config.headers = this.getH(config.data && typeof config.data === "string");
      }
      return await axios(config);
    } catch (error) {
      if (error.response && error.response.status === 401 && !config._isRetry) {
        console.warn("[AUTH] 401 Unauthorized. refreshing active token session...");
        config._isRetry = true;
        try {
          await this.getUsr();
          config.headers = this.getH(config.data && typeof config.data === "string");
          console.log("[AUTH] Token refresh complete, retrying previous execution...");
          return await axios(config);
        } catch (refreshError) {
          console.error(`[AUTH ERR] Request retry failed: ${refreshError.message}`);
          return {
            status: "failed",
            result: refreshError.message
          };
        }
      }
      return {
        status: "failed",
        result: error.message
      };
    }
  }
  async getUsr() {
    console.log("[USER] Launching session token handshake...");
    try {
      const res = await axios.get(`${this.cfg.base}/api/v1/user/info`, {
        headers: this.getH(),
        httpsAgent: this.httpsAgent
      });
      if (res.data && res.data.success && res.data.data?.token) {
        this.cfg.auth = res.data.data.token;
        this.initialized = true;
        console.log(`[USER] JWT Token bound. Client session is configured.`);
      }
      return res.data;
    } catch (error) {
      console.error(`[USER ERR] Failed to establish connection handshake: ${error.message}`);
      return {
        status: "failed",
        result: error.message
      };
    }
  }
  async template({
    filter = "all"
  } = {}) {
    console.log(`[TEMPLATE] Fetching and parsing template lists with filter: ${filter}`);
    try {
      const res = await this.req({
        method: "GET",
        url: `${this.cfg.base}/api/v1/flix/home`
      });
      if (res.status === "failed") {
        return res;
      }
      const rawData = res.data?.data || {};
      const items = [];
      const findItemsRecursive = obj => {
        if (!obj || typeof obj !== "object") return;
        if (Array.isArray(obj)) {
          for (const item of obj) {
            if (item && typeof item === "object" && item.code) {
              items.push(item);
            } else {
              findItemsRecursive(item);
            }
          }
        } else {
          for (const key of Object.keys(obj)) {
            if (key === "items" && Array.isArray(obj[key])) {
              for (const item of obj[key]) {
                if (item && typeof item === "object" && item.code) {
                  items.push(item);
                }
              }
            } else {
              findItemsRecursive(obj[key]);
            }
          }
        }
      };
      findItemsRecursive(rawData);
      let result = items;
      if (filter && filter !== "all") {
        const queryFilter = filter.toLowerCase();
        result = items.filter(item => {
          const type = (item.type || "").toLowerCase();
          return type.includes(queryFilter);
        });
      }
      return {
        status: "success",
        result: result
      };
    } catch (error) {
      console.error(`[TEMPLATE ERR] Failed to resolve templates: ${error.message}`);
      return {
        status: "failed",
        result: error.message
      };
    }
  }
  async poll(jobId) {
    console.log(`[POLL START] Tracking queued Job ID: ${jobId}`);
    const max = 60;
    let attempts = 0;
    while (attempts < max) {
      try {
        console.log(`[POLL] Loop ${attempts + 1}/${max}`);
        const res = await this.req({
          method: "POST",
          url: `${this.cfg.base}/api/v1/generate/status`,
          data: JSON.stringify({
            ids: [jobId]
          })
        });
        if (res.status === "failed") {
          return res;
        }
        if (res.data && res.data.success && res.data.data?.length > 0) {
          const job = res.data.data[0];
          if (job.status === "succeeded" && job.url) {
            console.log(`[POLL SUCCESS] Resolved URL: ${job.url}`);
            return {
              url: job.url,
              jobId: job.jobId
            };
          } else if (job.status === "failed") {
            return {
              status: "failed",
              result: "Task execution reported as failed on backend"
            };
          }
        }
        attempts++;
        await new Promise(r => setTimeout(r, 3e3));
      } catch (error) {
        console.error(`[POLL ERR] Error during polling iteration: ${error.message}`);
        attempts++;
        await new Promise(r => setTimeout(r, 3e3));
      }
    }
    return {
      status: "failed",
      result: "Polling execution expired, task exceeded limit"
    };
  }
  async genT2I(prompt, overrides = {}) {
    console.log(`[T2I] Sending prompt data payload...`);
    try {
      const payload = {
        ...overrides
      };
      if (prompt) {
        payload.prompt = Array.isArray(prompt) ? prompt : [prompt];
      }
      const res = await this.req({
        method: "POST",
        url: `${this.cfg.base}/api/v2/image/t2i`,
        data: JSON.stringify(payload)
      });
      return res.status === "failed" ? res : res.data;
    } catch (error) {
      console.error(`[T2I ERR] Text-to-Image request failed: ${error.message}`);
      return {
        status: "failed",
        result: error.message
      };
    }
  }
  async genI2I(media, prompt = "", overrides = {}) {
    console.log(`[I2I] Processing form-data media payload...`);
    try {
      const form = new FormData();
      const buffer = await this.slvM(media);
      if (buffer && buffer.status === "failed") {
        return buffer;
      }
      const fields = {
        prompt: prompt,
        deviceID: this.deviceId,
        versionCode: this.cfg.ver,
        ...overrides
      };
      form.append("image", buffer, {
        filename: "input.png",
        contentType: "image/png"
      });
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined && value !== null) {
          form.append(key, value.toString());
        }
      }
      const res = await this.req({
        method: "POST",
        url: `${this.cfg.base}/api/v1/image/i2i`,
        data: form,
        headers: {
          ...this.getH(),
          ...form.getHeaders()
        }
      });
      return res.status === "failed" ? res : res.data;
    } catch (error) {
      console.error(`[I2I ERR] Image-to-Image request failed: ${error.message}`);
      return {
        status: "failed",
        result: error.message
      };
    }
  }
  async genT2V(prompt, overrides = {}) {
    console.log(`[T2V] Sending prompt video payload...`);
    try {
      const payload = {
        ai_sound: 0,
        aspect_ratio: "auto",
        ctry_target: this.cfg.def.ctry_target,
        deviceID: this.deviceId,
        isPremium: 0,
        prompt: prompt || "",
        used: [],
        versionCode: parseInt(this.cfg.ver),
        ...overrides
      };
      const res = await this.req({
        method: "POST",
        url: `${this.cfg.base}/api/v1/video/t2v`,
        data: JSON.stringify(payload)
      });
      return res.status === "failed" ? res : res.data;
    } catch (error) {
      console.error(`[T2V ERR] Text-to-Video request failed: ${error.message}`);
      return {
        status: "failed",
        result: error.message
      };
    }
  }
  async genI2V(media, prompt = "", overrides = {}) {
    console.log(`[I2V] Processing video form-data payload...`);
    try {
      const form = new FormData();
      const buffer = await this.slvM(media);
      if (buffer && buffer.status === "failed") {
        return buffer;
      }
      const fields = {
        prompt: prompt,
        ai_sound: 0,
        aspect_ratio: "auto",
        deviceID: this.deviceId,
        versionCode: this.cfg.ver,
        ...overrides
      };
      form.append("image", buffer, {
        filename: "input.png",
        contentType: "image/png"
      });
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined && value !== null) {
          form.append(key, value.toString());
        }
      }
      const res = await this.req({
        method: "POST",
        url: `${this.cfg.base}/api/v1/video/i2v`,
        data: form,
        headers: {
          ...this.getH(),
          ...form.getHeaders()
        }
      });
      return res.status === "failed" ? res : res.data;
    } catch (error) {
      console.error(`[I2V ERR] Image-to-Video request failed: ${error.message}`);
      return {
        status: "failed",
        result: error.message
      };
    }
  }
  async slvM(media) {
    try {
      if (Buffer.isBuffer(media)) {
        return media;
      }
      if (typeof media === "string") {
        if (media.startsWith("http")) {
          const res = await axios.get(media, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        return Buffer.from(media.replace(/^data:image\/\w+;base64,/, ""), "base64");
      }
      return {
        status: "failed",
        result: "Format media tidak didukung"
      };
    } catch (error) {
      console.error(`[MEDIA ERR] Error resolving buffer: ${error.message}`);
      return {
        status: "failed",
        result: error.message
      };
    }
  }
  async generate({
    mode = "image",
    prompt,
    media,
    ...rest
  }) {
    try {
      if (!this.cfg.auth) {
        const authRes = await this.getUsr();
        if (authRes && authRes.status === "failed") {
          return authRes;
        }
      }
      let response;
      const targetMode = (mode || "image").toLowerCase();
      const hasMedia = Boolean(media);
      switch (targetMode) {
        case "image":
          if (hasMedia) {
            console.log("[AUTO] Media terdeteksi -> Mode I2I dijalankan");
            response = await this.genI2I(media, prompt, rest);
          } else {
            if (!prompt) {
              return {
                status: "failed",
                result: "Parameter 'prompt' wajib disediakan untuk Text-to-Image"
              };
            }
            console.log("[AUTO] Tanpa media -> Mode T2I dijalankan");
            response = await this.genT2I(prompt, rest);
          }
          break;
        case "video":
          if (hasMedia) {
            console.log("[AUTO] Media terdeteksi -> Mode I2V dijalankan");
            response = await this.genI2V(media, prompt, rest);
          } else {
            if (!prompt) {
              return {
                status: "failed",
                result: "Parameter 'prompt' wajib disediakan untuk Text-to-Video"
              };
            }
            console.log("[AUTO] Tanpa media -> Mode T2V dijalankan");
            response = await this.genT2V(prompt, rest);
          }
          break;
        default:
          return {
            status: "failed",
              result: `Mode '${mode}' tidak valid. Pilihan hanya 'image' atau 'video'`
          };
      }
      if (response && response.status === "failed") {
        return response;
      }
      if (response?.data?.url) {
        return {
          status: "success",
          result: {
            url: response.data.url
          }
        };
      }
      const jobId = response?.data?.jobId || response?.jobId;
      if (jobId) {
        const pollResult = await this.poll(jobId);
        if (pollResult.status === "failed") {
          return pollResult;
        }
        response = pollResult;
      }
      return {
        status: "success",
        result: response
      };
    } catch (error) {
      console.error(`[GEN CONTROL ERR] General execution crashed: ${error.message}`);
      return {
        status: "failed",
        result: error.message
      };
    }
  }
}
export default async function handler(req, res) {
  const {
    action = "generate", ...params
  } = req.method === "GET" ? req.query : req.body;
  const validActions = ["template", "generate"];
  if (!validActions.includes(action)) {
    return res.status(400).json({
      status: false,
      error: `Action tidak valid: '${action}'.`,
      valid_actions: validActions
    });
  }
  const scraper = new FlixGen();
  try {
    let response;
    switch (action) {
      case "template":
        response = await scraper.template(params);
        break;
      case "generate":
        const hasPrompt = !!params.prompt;
        const hasMedia = !!params.media;
        if (!hasPrompt && !hasMedia) {
          return res.status(400).json({
            status: false,
            error: "Parameter 'prompt' atau 'media' wajib diisi untuk generate."
          });
        }
        response = await scraper.generate(params);
        break;
      default:
        return res.status(400).json({
          status: false,
          error: "Action tidak dikenali."
        });
    }
    if (!response) {
      return res.status(502).json({
        status: false,
        error: "Server target tidak memberikan respon atau data kosong."
      });
    }
    return res.status(200).json({
      status: response.status === "success" || response.success ? true : false,
      action: action,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on '${action}':`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan pada internal server API.",
      error: error.message || "Unknown Error"
    });
  }
}