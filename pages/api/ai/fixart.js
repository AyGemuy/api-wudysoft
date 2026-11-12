import axios from "axios";
import crypto from "crypto";
import FormData from "form-data";
class FixArtAI {
  constructor() {
    this.key = "e82ckenh8dichen8";
    this.salt = "36cd479b6b5";
    this.secret = "md5forencrypt";
    this.prefix = "nobody";
    this.vToken = null;
    this.token = "";
    this.gaId = `GA1.1.${Math.floor(1e9 + Math.random() * 9e9)}.${Math.floor(Date.now() / 1e3)}`;
    this.req = axios.create({
      baseURL: "https://backend.fixart.ai/api",
      timeout: 6e4,
      headers: {
        accept: "application/json, text/plain, */*",
        "accept-language": "en",
        "cache-control": "no-cache",
        locale: "en",
        origin: "https://fixart.ai",
        pragma: "no-cache",
        priority: "u=1, i",
        referer: "https://fixart.ai/",
        "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99", "Microsoft Edge Simulate";v="127", "Lemur";v="127"',
        "sec-ch-ua-mobile": "?1",
        "sec-ch-ua-platform": '"Android"',
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-site",
        "user-agent": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36"
      }
    });
    this.req.interceptors.request.use(async c => {
      if (!this.vToken && !c.url?.includes("/v2/user/register")) {
        await this.reg();
      }
      c.headers.gaclientid = this.gaId;
      c.headers.vtoken = this.vToken || "";
      c.headers.token = this.token || "";
      c.headers["browser-info"] = encodeURIComponent(JSON.stringify({
        language: "id-ID",
        languages: ["id-ID"],
        timeZone: "Asia/Makassar",
        timezoneOffset: -480,
        userAgent: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
        timeString: new Date().toString()
      }));
      return c;
    });
  }
  enc(url, data) {
    try {
      const raw = JSON.stringify(data);
      const sign = crypto.createHash("md5").update(`${this.prefix}${url}use${raw}${this.secret}`).digest("hex");
      const payload = `${url}-${this.salt}-${raw}-${this.salt}-${sign}`;
      const cipher = crypto.createCipheriv("aes-128-ecb", Buffer.from(this.key, "utf8"), null);
      cipher.setAutoPadding(true);
      return Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]).toString("hex").toUpperCase();
    } catch (e) {
      console.error("[FixArt] Encryption error:", e?.message || e);
      return null;
    }
  }
  encState() {
    try {
      const st = {
        vToken: this.vToken,
        token: this.token,
        gaId: this.gaId
      };
      return Buffer.from(JSON.stringify(st)).toString("base64");
    } catch (e) {
      return null;
    }
  }
  decState(st) {
    try {
      if (!st || typeof st !== "string") return;
      const data = JSON.parse(Buffer.from(st, "base64").toString("utf8"));
      if (data?.vToken) this.vToken = data.vToken;
      if (data?.token) this.token = data.token;
      if (data?.gaId) this.gaId = data.gaId;
    } catch (e) {
      console.warn("[FixArt] Invalid state string, skipping reuse.");
    }
  }
  async reg() {
    try {
      console.log("[FixArt] Registering new guest session...");
      const uuid = crypto.randomBytes(16).toString("hex");
      const payload = {
        uuid: uuid,
        endpoint_type: "web",
        subscribe_type: "0"
      };
      const encrypted = this.enc("/v2/user/register", payload);
      if (!encrypted) return {
        status: "error",
        result: "Encryption failed during registration",
        state: this.encState()
      };
      const res = await this.req.post("/v2/user/register", {
        params: encrypted
      }, {
        headers: {
          "content-type": "application/json"
        }
      });
      if (res.data?.code === 1 && res.data?.data?.vToken) {
        this.vToken = res.data.data.vToken;
        console.log(`[FixArt] Session registered successfully (ID: ${res.data.data.id})`);
        return {
          status: "success",
          result: this.vToken,
          state: this.encState()
        };
      }
      return {
        status: "error",
        result: res.data?.msg || "Registration failed",
        state: this.encState()
      };
    } catch (e) {
      console.error("[FixArt] Registration request error:", e?.message || e);
      return {
        status: "error",
        result: e?.message || e,
        state: this.encState()
      };
    }
  }
  async fetchModels(type = "t2i") {
    try {
      const path = type === "i2i" ? "/tools/image/img2imageModel" : "/tools/image/txt2imageModel";
      const res = await this.req.get(path);
      return res.data?.data?.models || [];
    } catch (e) {
      console.error(`[FixArt] Fetch models error (${type}):`, e?.message || e);
      return [];
    }
  }
  async toBuf(img) {
    try {
      if (Buffer.isBuffer(img)) return img;
      if (typeof img === "string") {
        if (img.startsWith("http://") || img.startsWith("https://")) {
          const res = await axios.get(img, {
            responseType: "arraybuffer"
          });
          return Buffer.from(res.data);
        }
        if (img.includes("base64,")) {
          return Buffer.from(img.split("base64,")[1], "base64");
        }
        return Buffer.from(img, "base64");
      }
      return null;
    } catch (e) {
      console.error("[FixArt] Image buffer conversion error:", e?.message || e);
      return null;
    }
  }
  async poll(jobId, maxTries = 60, interval = 3e3) {
    console.log(`[FixArt] Polling task: ${jobId}`);
    for (let i = 0; i < maxTries; i++) {
      try {
        await new Promise(r => setTimeout(r, interval));
        const res = await this.req.get("/tools/job/records", {
          params: {
            job_ids: jobId
          }
        });
        const rec = res.data?.data?.records?.[0];
        const status = rec?.status || "processing";
        console.log(`[FixArt] Poll #${i + 1}/${maxTries} -> Status: ${status}`);
        if (status === "success") {
          return {
            status: "success",
            result: rec.output_resource || rec.main_img || rec,
            state: this.encState()
          };
        }
        if (status === "failed" || status === "error") {
          return {
            status: "failed",
            result: rec?.msg || "Task failed on server",
            state: this.encState()
          };
        }
      } catch (e) {
        console.warn(`[FixArt] Poll attempt error (${i + 1}):`, e?.message || e);
      }
    }
    return {
      status: "timeout",
      result: `Task timed out after ${maxTries * (interval / 1e3)}s`,
      state: this.encState()
    };
  }
  async generate({
    state,
    prompt,
    image,
    model,
    ratio,
    ...rest
  }) {
    try {
      if (state) this.decState(state);
      const mode = image ? "i2i" : "t2i";
      console.log(`[FixArt] Initializing generation [Mode: ${mode.toUpperCase()}]`);
      if (!prompt && mode === "t2i") {
        return {
          status: "error",
          result: "Prompt is required for Text-to-Image",
          state: this.encState()
        };
      }
      if (!image && mode === "i2i") {
        return {
          status: "error",
          result: "Image is required for Image-to-Image",
          state: this.encState()
        };
      }
      const availableModels = await this.fetchModels(mode);
      if (!availableModels.length) {
        return {
          status: "error",
          result: "Failed to retrieve available models from server",
          state: this.encState()
        };
      }
      let targetModel = null;
      if (model) {
        targetModel = availableModels.find(m => m.name?.toLowerCase() === model?.toLowerCase() || m.key?.toLowerCase() === model?.toLowerCase() || m.extra_params?.model?.toLowerCase() === model?.toLowerCase());
        if (!targetModel) {
          const list = availableModels.map(m => ({
            name: m.name,
            key: m.key,
            cost: m.cost,
            ratios: m.options?.aspectRatio?.items?.map(r => r.title) || []
          }));
          return {
            status: "error",
            result: {
              message: `Model '${model}' not found for ${mode.toUpperCase()} mode. Available models listed below:`,
              available_models: list
            },
            state: this.encState()
          };
        }
      } else {
        targetModel = mode === "t2i" ? availableModels.find(m => m.name === "Fixart Spicy") || availableModels[0] : availableModels.find(m => m.name === "Qwen-Image-Edit Plus") || availableModels[0];
      }
      console.log(`[FixArt] Selected Model: "${targetModel.name}"`);
      let chosenRatio = ratio || "1:1";
      if (mode === "t2i" && targetModel.options?.aspectRatio?.items?.length) {
        const ratios = targetModel.options.aspectRatio.items;
        const matched = ratios.find(r => r.title === ratio || r.value === ratio);
        if (ratio && !matched) {
          return {
            status: "error",
            result: {
              message: `Ratio '${ratio}' is invalid for model '${targetModel.name}'. Available ratios:`,
              available_ratios: ratios.map(r => r.title)
            },
            state: this.encState()
          };
        }
        chosenRatio = matched ? matched.title : ratios[0].title;
      }
      const form = new FormData();
      if (mode === "i2i") {
        const imagesList = Array.isArray(image) ? image : [image];
        for (const [idx, imgItem] of imagesList.entries()) {
          const buf = await this.toBuf(imgItem);
          if (!buf) {
            return {
              status: "error",
              result: `Failed to resolve image at index ${idx}`,
              state: this.encState()
            };
          }
          form.append("images[]", buf, {
            filename: `${crypto.randomBytes(16).toString("hex")}.jpg`,
            contentType: "image/jpeg"
          });
        }
        const endpoint = "/tools/image/img2image";
        const paramsPayload = {
          name: targetModel.name,
          options: {
            prompt: prompt || "",
            publicVisibility: "0",
            ...rest.options || {}
          }
        };
        const encParams = this.enc(endpoint, paramsPayload);
        if (!encParams) return {
          status: "error",
          result: "Payload encryption failed",
          state: this.encState()
        };
        form.append("params", encParams);
        console.log("[FixArt] Submitting Image-to-Image request...");
        const res = await this.req.post(endpoint, form, {
          headers: form.getHeaders()
        });
        if (res.data?.code !== 1) {
          return {
            status: "error",
            result: res.data?.msg || "Image-to-Image generation rejected",
            state: this.encState()
          };
        }
        const jobId = res.data?.data?.job_id;
        if (!jobId) return {
          status: "error",
          result: "No job_id returned by server",
          state: this.encState()
        };
        return await this.poll(jobId);
      } else {
        const endpoint = "/tools/image/txt2image";
        const paramsPayload = {
          name: targetModel.name,
          options: {
            prompt: prompt,
            aspectRatio: chosenRatio,
            publicVisibility: "0",
            ...rest.options || {}
          }
        };
        const encParams = this.enc(endpoint, paramsPayload);
        if (!encParams) return {
          status: "error",
          result: "Payload encryption failed",
          state: this.encState()
        };
        form.append("params", encParams);
        console.log("[FixArt] Submitting Text-to-Image request...");
        const res = await this.req.post(endpoint, form, {
          headers: form.getHeaders()
        });
        if (res.data?.code !== 1) {
          return {
            status: "error",
            result: res.data?.msg || "Text-to-Image generation rejected",
            state: this.encState()
          };
        }
        const jobId = res.data?.data?.job_id;
        if (!jobId) return {
          status: "error",
          result: "No job_id returned by server",
          state: this.encState()
        };
        return await this.poll(jobId);
      }
    } catch (e) {
      console.error("[FixArt] Generate execution error:", e?.message || e);
      return {
        status: "error",
        result: e?.message || e,
        state: this.encState()
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
  const api = new FixArtAI();
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