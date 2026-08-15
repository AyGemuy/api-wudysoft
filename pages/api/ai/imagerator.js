import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
class TechinfortainmentAI {
  constructor(config = {}) {
    this.url = config.url || config.baseURL || "https://techinfortainment.com";
    this.ep = {
      reg: "/ai-generation/users/register",
      stat: "/device/status",
      cred: "/ai-generation/users/{device_id}/credits",
      clm: "/ai-generation/users/{device_id}/claim",
      res: "/ai-generation/result",
      t2i: "/ai-generation/generate/text2image",
      t2v: "/ai-generation/generate/text2video",
      i2i: "/ai-generation/generate/image2image",
      i2v: "/ai-generation/generate/image2video",
      i2vP: "/ai-generation/generate/image2video-plus",
      ...config.ep || config.endpoints || {}
    };
    this.def = {
      app: "ai_imagerator",
      ver: "1.1.7",
      uType: "Organic",
      lType: "First_Launch",
      ratio: "lanskap",
      w: 768,
      h: 432,
      mT2I: "ZImageTurbo_INT8",
      mT2V: "Ltxv_13B_0_9_8_Distilled_FP8",
      mI2I: "Flux_2_Klein_4B_BF16",
      mI2V: "Ltxv_13B_0_9_8_Distilled_FP8",
      sT2I: 8,
      gT2I: 7.5,
      frm: 120,
      fps: 30,
      sI2V: 1,
      negP: "blur",
      maxAtm: 120,
      del: 3e3,
      ...config.def || config.defaults || {}
    };
    this.ratios = {
      lanskap: {
        w: 768,
        h: 432
      },
      landscape: {
        w: 768,
        h: 432
      },
      "16:9": {
        w: 768,
        h: 432
      },
      potret: {
        w: 432,
        h: 768
      },
      portrait: {
        w: 432,
        h: 768
      },
      "9:16": {
        w: 432,
        h: 768
      },
      persegi: {
        w: 512,
        h: 512
      },
      square: {
        w: 512,
        h: 512
      },
      "1:1": {
        w: 512,
        h: 512
      },
      "4:3": {
        w: 768,
        h: 576
      },
      "3:4": {
        w: 576,
        h: 768
      }
    };
    this.client = axios.create({
      baseURL: this.url,
      headers: {
        "User-Agent": "okhttp/5.1.0",
        Connection: "Keep-Alive",
        "Accept-Encoding": "gzip",
        ...config.headers || {}
      },
      timeout: config.timeout || 12e4
    });
  }
  _genId() {
    try {
      return crypto.randomBytes(8).toString("hex");
    } catch (err) {
      console.error("[ERROR] _genId:", err?.message || err);
      return Math.random().toString(36).substring(2, 18);
    }
  }
  _getDim(ratioInput, customW, customH) {
    if (customW && customH) {
      return {
        w: Number(customW),
        h: Number(customH)
      };
    }
    const key = String(ratioInput || this.def.ratio).toLowerCase().trim();
    return this.ratios[key] || {
      w: this.def.w,
      h: this.def.h
    };
  }
  async _reg(deviceId, ...rest) {
    try {
      console.log(`[LOG] Registering user device: ${deviceId}`);
      const payload = {
        device_id: deviceId,
        app_name: this.def.app,
        user_type: this.def.uType,
        purchase_token: "",
        product_id: "",
        ...rest[0] || {}
      };
      const res = await this.client.post(this.ep.reg, payload);
      return res?.data;
    } catch (err) {
      console.error("[ERROR] _reg:", err?.response?.data || err?.message || err);
      return err?.response?.data || {
        status: "error",
        message: err?.message
      };
    }
  }
  async _stat(deviceId, ...rest) {
    try {
      console.log(`[LOG] Checking device status: ${deviceId}`);
      const query = new URLSearchParams({
        device_id: deviceId,
        launch_type: this.def.lType,
        ...rest[0] || {}
      });
      const res = await this.client.get(`${this.ep.stat}?${query.toString()}`);
      return res?.data;
    } catch (err) {
      console.error("[ERROR] _stat:", err?.response?.data || err?.message || err);
      return err?.response?.data || {
        status: "error",
        message: err?.message
      };
    }
  }
  async _cred(deviceId, ...rest) {
    try {
      console.log(`[LOG] Fetching credits for device: ${deviceId}`);
      const endpoint = this.ep.cred.replace("{device_id}", deviceId);
      const query = new URLSearchParams({
        app_name: this.def.app,
        ...rest[0] || {}
      });
      const res = await this.client.get(`${endpoint}?${query.toString()}`);
      return res?.data;
    } catch (err) {
      console.error("[ERROR] _cred:", err?.response?.data || err?.message || err);
      return err?.response?.data || {
        status: "error",
        message: err?.message
      };
    }
  }
  async _clm(deviceId, ...rest) {
    try {
      console.log(`[LOG] Claiming daily credits for device: ${deviceId}`);
      const endpoint = this.ep.clm.replace("{device_id}", deviceId);
      const query = new URLSearchParams({
        app_name: this.def.app,
        ...rest[0] || {}
      });
      const res = await this.client.post(`${endpoint}?${query.toString()}`);
      return res?.data;
    } catch (err) {
      console.error("[ERROR] _clm:", err?.response?.data || err?.message || err);
      return err?.response?.data || {
        status: "error",
        message: err?.message
      };
    }
  }
  async _auth(sessionInput, ...rest) {
    try {
      const devId = typeof sessionInput === "object" ? sessionInput?.device_id : sessionInput || this._genId();
      console.log(`[LOG] Session authenticated. Device ID: ${devId}`);
      const restParams = rest[0] || {};
      await this._reg(devId, restParams);
      await this._stat(devId, restParams);
      console.log("[LOG] Force auto-claiming daily credits...");
      await this._clm(devId, restParams);
      const creditInfo = await this._cred(devId, restParams);
      const totalCredits = creditInfo?.credits ?? creditInfo?.total_credits ?? creditInfo?.available_credits ?? creditInfo?.data?.credits ?? "N/A";
      console.log(`[LOG] Total Credit before generation: ${totalCredits}`);
      return devId;
    } catch (err) {
      console.error("[ERROR] _auth:", err?.response?.data || err?.message || err);
      return typeof sessionInput === "object" ? sessionInput?.device_id : sessionInput || null;
    }
  }
  async _pImg(imgInput) {
    try {
      if (!imgInput) return null;
      console.log("[LOG] Resolving image input (URL/Base64/Buffer)...");
      if (Buffer.isBuffer(imgInput)) {
        return imgInput.length > 0 ? imgInput : null;
      }
      if (typeof imgInput === "string") {
        const trimmed = imgInput.trim();
        if (!trimmed) return null;
        if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
          console.log(`[LOG] Downloading image from URL...`);
          const res = await axios.get(trimmed, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        const cleanBase64 = trimmed.replace(/^data:image\/\w+;base64,/, "");
        return Buffer.from(cleanBase64, "base64");
      }
      console.error("[ERROR] _pImg: Unsupported image format");
      return null;
    } catch (err) {
      console.error("[ERROR] _pImg:", err?.message || err);
      return null;
    }
  }
  async _poll(requestId, ...rest) {
    try {
      const overrideParams = rest[0] || {};
      const maxAttempts = overrideParams.maxAtm || overrideParams.maxAttempts || this.def.maxAtm;
      const delayMs = overrideParams.del || overrideParams.delayMs || this.def.del;
      delete overrideParams.maxAtm;
      delete overrideParams.maxAttempts;
      delete overrideParams.del;
      delete overrideParams.delayMs;
      console.log(`[LOG] Polling task result for request_id: ${requestId}`);
      for (let i = 1; i <= maxAttempts; i++) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
        console.log(`[LOG] Polling attempt ${i}/${maxAttempts}...`);
        const query = new URLSearchParams({
          request_id: requestId,
          app_name: this.def.app,
          ...overrideParams
        });
        const res = await this.client.get(`${this.ep.res}?${query.toString()}`);
        const data = res?.data;
        const currentStatus = data?.status || "processing";
        if (["completed", "failed", "blocked", "ad_required", "expired"].includes(currentStatus)) {
          console.log(`[LOG] Task finished with status: ${currentStatus}`);
          return {
            status: currentStatus === "completed" ? "success" : "failed",
            result: data
          };
        }
      }
      return {
        status: "failed",
        result: {
          request_id: requestId,
          message: `Polling timeout reached (${maxAttempts} attempts)`
        }
      };
    } catch (err) {
      console.error("[ERROR] _poll:", err?.response?.data || err?.message || err);
      return {
        status: "error",
        result: err?.response?.data || {
          error_message: err?.message || "Unknown Error"
        }
      };
    }
  }
  async generate({
    prompt,
    image,
    session,
    ratio,
    video = false,
    plus = false,
    ...restPayload
  } = {}) {
    try {
      console.log("[LOG] Starting generation flow...");
      const isVid = Boolean(video);
      const isPls = Boolean(plus);
      const hasImg = Boolean(image);
      const cleanPrompt = typeof prompt === "string" ? prompt.trim() : "";
      const customW = restPayload.width || restPayload.w;
      const customH = restPayload.height || restPayload.h;
      delete restPayload.width;
      delete restPayload.w;
      delete restPayload.height;
      delete restPayload.h;
      const {
        w,
        h
      } = this._getDim(ratio, customW, customH);
      let featureMode = "";
      if (!hasImg) {
        featureMode = isVid ? "Text-to-Video" : "Text-to-Image";
        if (!cleanPrompt) {
          return {
            status: "error",
            result: {
              error_message: `Prompt wajib diisi untuk fitur ${featureMode}`
            },
            session: typeof session === "object" ? session?.device_id : session || null
          };
        }
      } else {
        featureMode = isVid ? isPls ? "Image-to-Video Plus" : "Image-to-Video" : "Image-to-Image";
        if (typeof image === "string" && !image.trim()) {
          return {
            status: "error",
            result: {
              error_message: `Gambar input tidak valid untuk fitur ${featureMode}`
            },
            session: typeof session === "object" ? session?.device_id : session || null
          };
        }
      }
      const devId = await this._auth(session);
      if (!devId) {
        return {
          status: "error",
          result: {
            error_message: "Authentication failed"
          },
          session: null
        };
      }
      let targetEp = "";
      let isMultipart = false;
      if (hasImg) {
        targetEp = isVid ? isPls ? this.ep.i2vP : this.ep.i2v : this.ep.i2i;
        isMultipart = true;
      } else {
        targetEp = isVid ? this.ep.t2v : this.ep.t2i;
      }
      console.log(`[LOG] Feature: ${featureMode} | Ratio: ${ratio || this.def.ratio} (${w}x${h}) | Target Endpoint: ${targetEp}`);
      let bodyPayload;
      let reqHeaders = {};
      if (isMultipart) {
        const imageBuffer = await this._pImg(image);
        if (!imageBuffer) {
          return {
            status: "error",
            result: {
              error_message: `Gagal memproses gambar input untuk fitur ${featureMode}`
            },
            session: devId
          };
        }
        const form = new FormData();
        const defaultModel = isVid ? this.def.mI2V : this.def.mI2I;
        const multipartPayload = {
          prompt: cleanPrompt,
          original_prompt: cleanPrompt,
          ...!isPls ? {
            model: defaultModel
          } : {},
          width: String(w),
          height: String(h),
          ...isVid ? {
            frames: String(this.def.frm),
            negative_prompt: this.def.negP
          } : {},
          ...isVid && !isPls ? {
            fps: String(this.def.fps),
            steps: String(this.def.sI2V)
          } : {},
          device_id: devId,
          user_type: this.def.uType,
          version: this.def.ver,
          app_name: this.def.app,
          ...restPayload
        };
        const filename = multipartPayload.filename || "input.jpg";
        delete multipartPayload.filename;
        form.append("image", imageBuffer, {
          filename: filename
        });
        Object.entries(multipartPayload).forEach(([key, val]) => {
          if (val !== undefined && val !== null) {
            form.append(key, String(val));
          }
        });
        bodyPayload = form;
        reqHeaders = {
          ...form.getHeaders()
        };
      } else {
        const defaultModel = isVid ? this.def.mT2V : this.def.mT2I;
        bodyPayload = {
          prompt: cleanPrompt,
          original_prompt: cleanPrompt,
          model: defaultModel,
          width: w,
          height: h,
          ...isVid ? {
            frames: this.def.frm
          } : {
            steps: this.def.sT2I,
            guidance: this.def.gT2I,
            negative_prompt: ""
          },
          device_id: devId,
          user_type: this.def.uType,
          version: this.def.ver,
          app_name: this.def.app,
          ...restPayload
        };
      }
      console.log("[LOG] Sending generation payload...");
      const response = await this.client.post(targetEp, bodyPayload, {
        headers: reqHeaders
      });
      const reqId = response?.data?.request_id;
      if (!reqId) {
        return {
          status: "error",
          result: response?.data || {
            error_message: "Gagal mendapatkan request_id dari server"
          },
          session: devId
        };
      }
      console.log(`[LOG] Task submitted! Request ID: ${reqId}`);
      const pollData = await this._poll(reqId);
      return {
        status: pollData.status,
        result: pollData.result,
        session: devId
      };
    } catch (err) {
      console.error("[ERROR] generate:", err?.response?.data || err?.message || err);
      return {
        status: "error",
        result: err?.response?.data || {
          error_message: err?.message || "Unknown Error"
        },
        session: typeof session === "object" ? session?.device_id : session || null
      };
    }
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new TechinfortainmentAI();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses request";
    return res.status(500).json({
      error: errorMessage
    });
  }
}