import axios from "axios";
import FormData from "form-data";
import https from "https";
import crypto from "crypto";
class AritekT2P {
  constructor() {
    this.cfg = {
      base: "https://t2p.aritek.app",
      auth: "",
      sign: "7259cb222a66496242650023583742fe40ea0a80",
      ver: "23",
      def: {
        isPremium: 0,
        ctry_target: "others"
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
        this.cfg.def.isPremium = res.data.data.is_premium ? 1 : 0;
        this.initialized = true;
        console.log(`[USER] JWT Token bound.`);
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
        ctry_target: this.cfg.def.ctry_target,
        prompt: prompt,
        ...overrides
      };
      const res = await this.req({
        method: "POST",
        url: `${this.cfg.base}/api/v1/image/t2i`,
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
  async genT2V(prompt, overrides = {}) {
    console.log(`[T2V] Sending prompt video payload...`);
    try {
      const payload = {
        ai_sound: 0,
        aspect_ratio: "auto",
        ctry_target: this.cfg.def.ctry_target,
        deviceID: this.deviceId,
        isPremium: this.cfg.def.isPremium,
        used: [],
        versionCode: parseInt(this.cfg.ver),
        prompt: prompt,
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
  async genI2V(prompt, media, overrides = {}) {
    console.log(`[I2V] Processing video form-data payload...`);
    try {
      const form = new FormData();
      const buffer = await this.slvM(media);
      if (buffer && buffer.status === "failed") {
        return buffer;
      }
      const fields = {
        versionCode: this.cfg.ver,
        deviceID: this.deviceId,
        isPremium: this.cfg.def.isPremium.toString(),
        ctry_target: this.cfg.def.ctry_target,
        aspect_ratio: "auto",
        ai_sound: "0",
        ...overrides
      };
      if (prompt) {
        fields.prompt = prompt;
      }
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
    mode = "t2v",
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
      switch (mode) {
        case "t2i":
          if (!prompt) {
            return {
              status: "failed",
              result: "Parameter 'prompt' wajib diisi untuk t2i"
            };
          }
          response = await this.genT2I(prompt, rest);
          break;
        case "t2v":
          if (!prompt) {
            return {
              status: "failed",
              result: "Parameter 'prompt' wajib diisi untuk t2v"
            };
          }
          response = await this.genT2V(prompt, rest);
          break;
        case "i2v":
          if (!media) {
            return {
              status: "failed",
              result: "Parameter 'media' (gambar) wajib disediakan untuk i2v"
            };
          }
          response = await this.genI2V(prompt, media, rest);
          break;
        default:
          return {
            status: "failed",
              result: `Unsupported mode: ${mode}. Gunakan 't2i', 't2v', atau 'i2v'.`
          };
      }
      if (response && response.status === "failed") {
        return response;
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
  const params = req.method === "GET" ? req.query : req.body;
  const {
    mode
  } = params;
  if (!mode) {
    return res.status(400).json({
      status: false,
      error: "Parameter 'mode' wajib diisi.",
      valid_modes: ["t2i", "t2v", "i2v"],
      usage: {
        examples: {
          t2i: "/api?mode=t2i&prompt=cute+car",
          t2v: "/api?mode=t2v&prompt=beavers+dressed+as+construction+workers",
          i2v: "/api?mode=i2v&media=URL_GAMBAR&prompt=make+it+move"
        }
      }
    });
  }
  const scraper = new AritekT2P();
  try {
    const response = await scraper.generate(params);
    if (!response) {
      return res.status(502).json({
        status: false,
        error: "Server target tidak memberikan respons."
      });
    }
    return res.status(200).json({
      status: response.status === "success" || response.success ? true : false,
      ...response
    });
  } catch (error) {
    console.error(`[API ERROR] Exception on generation:`, error);
    return res.status(500).json({
      status: false,
      message: "Terjadi kesalahan internal.",
      error: error.message || "Unknown Error"
    });
  }
}