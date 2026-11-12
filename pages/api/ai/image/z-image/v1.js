import axios from "axios";
import {
  wrapper
} from "axios-cookiejar-support";
import {
  CookieJar
} from "tough-cookie";
import crypto from "crypto";
class ZImage {
  constructor() {
    this.BASE = "https://zimageturbo.ai";
    this.UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
    this.HDRS = {
      "user-agent": this.UA,
      accept: "*/*",
      "accept-language": "id-ID",
      origin: this.BASE,
      referer: this.BASE + "/dashboard",
      pragma: "no-cache",
      "cache-control": "no-cache",
      "sec-ch-ua": '"Chromium";v="127", "Not)A;Brand";v="99"',
      "sec-ch-ua-mobile": "?1",
      "sec-ch-ua-platform": '"Android"',
      "sec-fetch-dest": "empty",
      "sec-fetch-mode": "cors",
      "sec-fetch-site": "same-origin"
    };
    this.GEN_ROUTES = {
      "minimax-image-01": "/api/image/minimax-image-01/generate",
      "z-image": "/api/image/z-image/generate",
      "z-image-base": "/api/image/z-image-base/generate",
      "grok-imagine": "/api/image/grok-imagine/generate",
      "flux-2": "/api/image/flux2/generate",
      "seedream-4.5": "/api/image/seedream45/generate",
      "seedream-5-lite": "/api/image/seedream5-lite/generate",
      cogview4: "/api/image/cogview4/generate",
      imagen4: "/api/image/imagen4/generate",
      wan26: "/api/image/wan26/generate",
      "kling-v3": "/api/image/kling-v3/generate",
      "kling-o1": "/api/image/kling-o1/generate",
      "kling-o3": "/api/image/kling-o3/generate",
      "glm-image": "/api/image/glm-image/generate",
      "flux-2-klein": "/api/image/flux2-klein/generate",
      "firered-image": "/api/image/firered-image/generate",
      reve: "/api/image/reve/generate",
      "ideogram-v3": "/api/image/ideogram-v3/generate",
      "hunyuan-image-3": "/api/image/hunyuan-image-3/generate",
      "riverflow-2-pro": "/api/image/riverflow-2-pro/generate",
      "recraft-v4": "/api/image/recraft-v4/generate"
    };
    this.key = "";
    this.ok = false;
    this.jar = new CookieJar();
    this.fp = this.mkFp();
    this.ax = wrapper(axios.create({
      baseURL: this.BASE,
      jar: this.jar,
      withCredentials: true,
      headers: this.HDRS
    }));
    this.ax.interceptors.request.use(config => {
      if (this.key && !config.headers["authorization"]) {
        config.headers["authorization"] = `Bearer ${this.key}`;
      }
      return config;
    });
  }
  log(tag, ...args) {
    console.log(`[${tag.toUpperCase()}]`, ...args);
  }
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  mkFp() {
    try {
      const raw = JSON.stringify({
        ua: this.UA,
        lang: "id-ID",
        tz: "Asia/Makassar",
        screen: "360x800x24",
        platform: "Linux armv8l",
        hw: 4
      });
      return {
        id: crypto.createHash("sha256").update(raw).digest("hex"),
        source: "custom",
        v: 1
      };
    } catch (e) {
      return {
        id: crypto.randomBytes(16).toString("hex"),
        source: "fallback",
        v: 1
      };
    }
  }
  async toDataUrl(src) {
    try {
      if (!src) return null;
      if (typeof src === "string" && src.startsWith("http")) {
        const r = await axios.get(src, {
          responseType: "arraybuffer"
        });
        return "data:image/jpeg;base64," + Buffer.from(r.data).toString("base64");
      }
      if (Buffer.isBuffer(src)) return "data:image/jpeg;base64," + src.toString("base64");
      if (typeof src === "string" && src.startsWith("data:")) return src;
      return "data:image/jpeg;base64," + src;
    } catch (e) {
      this.log("warn", "toDataUrl conversion failed, using original");
      return src;
    }
  }
  parseImgs(res) {
    try {
      if (typeof res === "string") {
        try {
          res = JSON.parse(res);
        } catch {}
      }
      const urls = Array.isArray(res) ? res : Array.isArray(res?.resultUrls) ? res.resultUrls : Array.isArray(res?.images) ? res.images : Array.isArray(res?.outputs) ? res.outputs : res?.url ? [res.url] : [];
      return urls.filter(u => typeof u === "string");
    } catch (e) {
      return [];
    }
  }
  async attempt(fn, tries = 3, delay = 3e3) {
    for (let i = 0; i < tries; i++) {
      try {
        return await fn();
      } catch (e) {
        const msg = e?.response?.data?.message || e?.message || "Unknown error";
        this.log("retry", `Attempt ${i + 1}/${tries}:`, msg);
        if (i < tries - 1) await this.sleep(delay);
        else throw e;
      }
    }
  }
  async guest(fid) {
    try {
      const targetId = fid || crypto.randomBytes(8).toString("hex") + Date.now().toString(36);
      return await this.attempt(async () => {
        const r = await this.ax.post("/api/auth/guest", {
          fingerprint_id: targetId
        });
        this.log("auth", "Guest session created");
        return r.data;
      });
    } catch (e) {
      this.log("error", "Guest login failed");
      return null;
    }
  }
  async claim() {
    try {
      return await this.attempt(async () => {
        const {
          data
        } = await this.ax.post("/api/billing/claim-first-time-credits", {
          m: this.fp.id,
          s: this.fp.source,
          v: this.fp.v
        });
        this.log("billing", data?.message || "Claim processed");
        return data;
      });
    } catch (e) {
      this.log("warn", "Claim credits failed (likely already claimed)");
      return null;
    }
  }
  async getCredits() {
    try {
      const {
        data
      } = await this.ax.get("/api/credits");
      const status = data?.data || data;
      this.log("credits", `Balance: ${status?.credits || 0}`);
      return status;
    } catch (e) {
      return null;
    }
  }
  async getKeys() {
    try {
      const {
        data
      } = await this.ax.get("/api/keys/list");
      return Array.isArray(data?.data) ? data.data : [];
    } catch (e) {
      return [];
    }
  }
  async createKey() {
    try {
      const desc = "Key-" + Math.random().toString(36).substring(7).toUpperCase();
      const {
        data
      } = await this.ax.post("/api/keys/create", {
        description: desc
      });
      this.key = data?.data?.api_key || "";
      this.log("key", "Generated new API key");
      return data?.data;
    } catch (e) {
      return null;
    }
  }
  async auth() {
    if (this.ok) return;
    try {
      this.log("init", "Starting authentication flow...");
      await this.guest();
      await this.claim();
      const keys = await this.getKeys();
      if (keys.length > 0) {
        this.key = keys[0].api_key;
        this.log("init", "Using existing API key");
      } else {
        await this.createKey();
      }
      await this.getCredits();
      this.ok = true;
      this.log("init", "Instance ready ✓");
    } catch (e) {
      this.log("error", "Auth flow failed", e.message);
    }
  }
  async generate({
    prompt,
    image,
    model = "minimax-image-01",
    size = "1024*1024",
    options = {}
  } = {}) {
    try {
      if (!prompt) throw new Error("Prompt is required");
      await this.auth();
      const body = {
        prompt: prompt,
        size: size,
        num_images: 1,
        prompt_optimizer: false,
        public: true,
        ...options
      };
      if (image) {
        const dataUri = await this.toDataUrl(Array.isArray(image) ? image[0] : image);
        if (["minimax-image-01", "kling-o1"].includes(model)) {
          body.image = dataUri;
        } else {
          body.images = [dataUri];
        }
        this.log("gen", `Mode: Image-to-Image (${model})`);
      } else {
        this.log("gen", `Mode: Text-to-Image (${model})`);
      }
      const route = this.GEN_ROUTES[model] || this.GEN_ROUTES["minimax-image-01"];
      const {
        data
      } = await this.attempt(() => this.ax.post(route, body));
      const taskId = data?.data?.task_id || data?.task_id;
      if (!taskId) throw new Error("No task_id found in response");
      this.log("gen", `Task started: ${taskId}`);
      return await this.poll(taskId, model);
    } catch (e) {
      this.log("error", "Generation failed", e.message);
      throw e;
    }
  }
  async poll(taskId, model, {
    interval = 3e3,
    timeout = 12e4
  } = {}) {
    const start = Date.now();
    const url = `/api/image/${model}/status?task_id=${taskId}`;
    while (Date.now() - start < timeout) {
      try {
        const {
          data
        } = await this.ax.get(url);
        const res = data?.data || data;
        const status = (res?.status || "").toUpperCase();
        this.log("poll", `Status: ${status}`);
        if (status === "SUCCESS") {
          const images = this.parseImgs(res?.response);
          this.log("poll", `Success! Found ${images.length} images`);
          return {
            taskId: taskId,
            images: images,
            success: true
          };
        }
        if (status === "FAILED") {
          throw new Error(res?.error_message || "Task failed on server");
        }
      } catch (e) {
        if (e.message.includes("failed")) throw e;
        this.log("warn", "Polling error, retrying...");
      }
      await this.sleep(interval);
    }
    throw new Error("Polling timeout");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new ZImage();
  try {
    const data = await api.generate(params);
    return res.status(200).json(data);
  } catch (error) {
    const errorMessage = error.message || "Terjadi kesalahan saat memproses URL";
    return res.status(500).json({
      error: errorMessage
    });
  }
}