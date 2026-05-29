import axios from "axios";
import crypto from "crypto";
const BASE_URL = "https://aiplatform.tattooidea.ai/aimodels/api/v1/ai";
class NanoBanana {
  constructor() {
    this.uniqueId = crypto.randomBytes(16).toString("hex");
    this.pageId = 711;
    this.source = "nanobanana2ai.com";
    this.channel = null;
    this.MODEL_CHANNEL = {
      nanobanana: "NANOBANANA_IMAGE",
      "nanobanana-pro": "NANOBANANA_PRO_IMAGE",
      "nanobanana-2": "NANOBANANA_2_IMAGE",
      Sora: "GPT_4O_IMAGE",
      "flux-kontext-pro": "FLUX_IMAGE",
      "flux-kontext-max": "FLUX_IMAGE",
      seedream: "SEEDREAM_V4_IMAGE",
      "midjourney-relaxed": "MJ_IMAGE",
      "midjourney-fast": "MJ_IMAGE",
      "midjourney-turbo": "MJ_IMAGE",
      "flux-2-flex": "FLUX2_FLEX_IMAGE",
      "flux-2-pro": "FLUX2_PRO_IMAGE",
      "z-image": "Z_IMAGE",
      "seedream-v4-5": "SEEDREAM_V45_IMAGE",
      "seedream-5-lite": "SEEDREAM_V5_LITE_IMAGE"
    };
    this.VALID_RATIOS = {
      "1:1": true,
      "9:16": true,
      "16:9": true,
      "3:4": true,
      "4:3": true,
      "3:2": true,
      "2:3": true,
      "5:4": true,
      "4:5": true,
      "1:2": true,
      "2:1": true,
      "21:9": true,
      auto: true
    };
    this.VALID_OUTPUTS = {
      png: true,
      jpeg: true,
      jpg: true
    };
    this.client = axios.create({
      baseURL: BASE_URL,
      headers: {
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        "content-type": "application/json",
        origin: "https://nanobanana2ai.com",
        pragma: "no-cache",
        referer: "https://nanobanana2ai.com/",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        uniqueid: this.uniqueId
      }
    });
  }
  log(step, data) {
    const label = data !== undefined ? `[NanoBanana] ${step} →` : `[NanoBanana] ${step}`;
    data !== undefined ? console.log(label, data) : console.log(label);
  }
  validate(model, ratio, output) {
    this.log("validate", {
      model: model,
      ratio: ratio,
      output: output
    });
    if (!model) return {
      ok: false,
      error: "model is required"
    };
    if (!Object.keys(this.MODEL_CHANNEL).includes(model)) {
      return {
        ok: false,
        error: `model invalid, valid: ${Object.keys(this.MODEL_CHANNEL).join(", ")}`
      };
    }
    if (ratio && !this.VALID_RATIOS[ratio]) {
      return {
        ok: false,
        error: `ratio invalid, valid: ${Object.keys(this.VALID_RATIOS).join(", ")}`
      };
    }
    if (output && !this.VALID_OUTPUTS[output]) {
      return {
        ok: false,
        error: `output invalid, valid: ${Object.keys(this.VALID_OUTPUTS).join(", ")}`
      };
    }
    return {
      ok: true
    };
  }
  async toBase64(img) {
    this.log("toBase64 detecting input type...");
    try {
      if (Buffer.isBuffer(img)) {
        this.log("toBase64 source: Buffer");
        return img.toString("base64");
      }
      if (typeof img === "string" && img.startsWith("http")) {
        this.log("toBase64 source: URL", img);
        const res = await this.client.get(img, {
          baseURL: "",
          responseType: "arraybuffer"
        });
        this.log("toBase64 URL fetched, size:", res.data.byteLength);
        return Buffer.from(res.data).toString("base64");
      }
      if (typeof img === "string") {
        this.log("toBase64 source: base64 string (passthrough)");
        return img;
      }
      this.log("toBase64 unknown type, passthrough");
      return img;
    } catch (err) {
      this.log("toBase64 error", err.message);
      return {
        ok: false,
        error: `toBase64 failed: ${err.message}`
      };
    }
  }
  async resolveImages(image) {
    this.log("resolveImages start");
    try {
      const imgs = Array.isArray(image) ? image : [image];
      this.log(`resolveImages count`, imgs.length);
      const resolved = [];
      for (const img of imgs) {
        const b64 = await this.toBase64(img);
        if (b64 && b64.ok === false) return b64;
        resolved.push(b64);
        this.log(`resolveImages done ${resolved.length}/${imgs.length}`);
      }
      this.log("resolveImages all resolved");
      return resolved;
    } catch (err) {
      this.log("resolveImages error", err.message);
      return {
        ok: false,
        error: `resolveImages failed: ${err.message}`
      };
    }
  }
  buildBody(params) {
    const {
      prompt,
      channel,
      ratio,
      output,
      imageUrls,
      isI2I,
      rest
    } = params;
    this.log("buildBody", {
      isI2I: isI2I,
      ratio: ratio,
      output: output,
      channel: channel
    });
    const type = isI2I ? "Image Editing" : "Text to Image";
    const body = {
      prompt: prompt,
      channel: channel,
      pageId: this.pageId,
      source: this.source,
      watermarkFlag: false,
      privateFlag: false,
      isTemp: true,
      type: type,
      aspectRatio: ratio || "auto",
      resolution: rest.resolution || "1K",
      outputFormat: output || "png",
      googleSearch: rest.googleSearch || false
    };
    if (isI2I) body.imageUrls = imageUrls;
    const {
      resolution,
      googleSearch,
      ...restClean
    } = rest;
    Object.assign(body, restClean);
    return body;
  }
  async createTask(body) {
    this.log("createTask POST /image/create");
    try {
      const res = await this.client.post("/image/create", body);
      const code = res.data?.code;
      const taskId = res.data?.data;
      const message = res.data?.message;
      this.log("createTask response", {
        code: code,
        taskId: taskId,
        message: message
      });
      if (code !== 200 || !taskId) {
        return {
          ok: false,
          error: message || "Failed to create task",
          raw: res.data
        };
      }
      return {
        ok: true,
        taskId: taskId
      };
    } catch (err) {
      this.log("createTask error", err.message);
      return {
        ok: false,
        error: `createTask failed: ${err.message}`
      };
    }
  }
  parseComplete(completeData) {
    this.log("parseComplete");
    try {
      const complete = JSON.parse(completeData || "{}");
      const urls = complete?.data?.result_object?.resultUrls || complete?.data?.result_urls || [];
      this.log("parseComplete urls found", urls.length);
      return urls;
    } catch (err) {
      this.log("parseComplete parse error", err.message);
      return [];
    }
  }
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  async poll(taskId, maxTries, interval) {
    maxTries = maxTries || 60;
    interval = interval || 3e3;
    this.log("poll start", {
      taskId: taskId,
      maxTries: maxTries,
      interval: interval
    });
    try {
      for (let i = 0; i < maxTries; i++) {
        this.log(`poll attempt ${i + 1}/${maxTries}`);
        await this.sleep(interval);
        let res;
        try {
          res = await this.client.get("/" + taskId, {
            params: {
              channel: this.channel
            }
          });
        } catch (err) {
          this.log(`poll request error attempt ${i + 1}`, err.message);
          continue;
        }
        const data = res.data?.data;
        const state = data?.state;
        const progress = data?.progress;
        this.log(`poll state: ${state}, progress: ${progress}`);
        if (state === 1) {
          this.log("poll completed ✓");
          const urls = this.parseComplete(data?.completeData);
          const {
            completeData,
            param,
            ...info
          } = data;
          return {
            result: urls,
            ...info
          };
        }
        if (state === 2) {
          this.log("poll task failed", data?.failMsg);
          const {
            completeData,
            param,
            ...info
          } = data;
          return {
            result: null,
            error: data?.failMsg || "Task failed",
            ...info
          };
        }
      }
      this.log("poll timeout");
      return {
        result: null,
        error: "Polling timeout: task did not complete in time"
      };
    } catch (err) {
      this.log("poll error", err.message);
      return {
        result: null,
        error: `poll failed: ${err.message}`
      };
    }
  }
  async generate({
    model = "nanobanana-2",
    prompt,
    image,
    ratio = "auto",
    output = "png",
    ...rest
  } = {}) {
    model = model || "nanobanana-2";
    ratio = ratio || "auto";
    output = output || "png";
    this.log("generate start", {
      model: model,
      prompt: prompt?.slice(0, 60),
      ratio: ratio,
      output: output
    });
    try {
      if (!prompt) {
        this.log("generate validation fail: prompt required");
        return {
          ok: false,
          error: "prompt is required"
        };
      }
      const v = this.validate(model, ratio, output);
      if (!v.ok) {
        this.log("generate validation fail", v.error);
        return v;
      }
      const channel = this.channel || this.MODEL_CHANNEL[model] || "NANOBANANA_2_IMAGE";
      this.channel = channel;
      this.log("generate channel", channel);
      let imageUrls = [];
      if (image) {
        this.log("generate resolving images...");
        const resolved = await this.resolveImages(image);
        if (resolved && resolved.ok === false) return resolved;
        imageUrls = resolved;
      }
      const isI2I = imageUrls.length > 0;
      this.log("generate mode", isI2I ? "Image to Image" : "Text to Image");
      const body = this.buildBody({
        prompt: prompt,
        channel: channel,
        ratio: ratio,
        output: output,
        imageUrls: imageUrls,
        isI2I: isI2I,
        rest: rest
      });
      this.log("generate body built");
      const created = await this.createTask(body);
      if (!created.ok) return created;
      this.log("generate task created", created.taskId);
      const polled = await this.poll(created.taskId);
      this.log("generate done", {
        result: polled.result?.length ?? 0
      });
      return {
        ok: true,
        taskId: created.taskId,
        ...polled
      };
    } catch (err) {
      this.log("generate error", err.message);
      return {
        ok: false,
        error: `generate failed: ${err.message}`
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
  const api = new NanoBanana();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses.";
    return res.status(500).json({
      error: errorMessage
    });
  }
}