import axios from "axios";
import crypto from "crypto";
import SpoofHead from "@/lib/spoof-head";
class HeadshotMaster {
  constructor() {
    this.rand = crypto.randomUUID();
    this.cfg = {
      baseUrl: "https://api.headshotmaster.io/hsmaster/api",
      origin: "https://headshotmaster.io",
      referer: "https://headshotmaster.io/",
      identityId: this.rand,
      ua: "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36",
      models: {
        combiner: ["nano_banana", "seedream_4_2k", "pruna_image_editor"],
        generator: ["headshot_master_ai"],
        styles: ["action_figure", "3d_chibi_toy", "barbie", "realistic", "pop_mart", "lego", "jellycat", "craft_style", "soft_toy"]
      },
      apps: {
        COMBINER: "image_combiner",
        FIGURE: "action_figure_generator"
      }
    };
    this.token = this.rand;
    this.http = axios.create({
      baseURL: this.cfg.baseUrl,
      headers: {
        accept: "application/json",
        "accept-language": "id-ID",
        origin: this.cfg.origin,
        referer: this.cfg.referer,
        "user-agent": this.cfg.ua,
        "x-identity-id": this.cfg.identityId,
        ...SpoofHead()
      }
    });
  }
  validate(opt = {}) {
    const errors = [];
    const warnings = [];
    const validApps = Object.values(this.cfg.apps);
    if (opt?.app && !validApps.includes(opt.app)) {
      errors.push({
        field: "app",
        value: opt.app,
        valid: validApps,
        message: `Invalid app. Use: ${validApps.join(", ")}`
      });
    }
    const allModels = [...this.cfg.models.combiner, ...this.cfg.models.generator];
    if (opt?.model && !allModels.includes(opt.model)) {
      errors.push({
        field: "model",
        value: opt.model,
        valid: allModels,
        message: `Invalid model. Use: ${allModels.join(", ")}`
      });
    }
    if (opt?.style && !this.cfg.models.styles.includes(opt.style)) {
      errors.push({
        field: "style",
        value: opt.style,
        valid: this.cfg.models.styles,
        message: `Invalid style. Use: ${this.cfg.models.styles.join(", ")}`
      });
    }
    if (opt?.app === this.cfg.apps.COMBINER && opt?.model && !this.cfg.models.combiner.includes(opt.model)) {
      warnings.push({
        field: "model",
        message: `Model '${opt.model}' may not work with '${opt.app}'. Try: ${this.cfg.models.combiner.join(", ")}`
      });
    }
    if (opt?.app === this.cfg.apps.FIGURE && opt?.model && !this.cfg.models.generator.includes(opt.model)) {
      warnings.push({
        field: "model",
        message: `Model '${opt.model}' may not work with '${opt.app}'. Try: ${this.cfg.models.generator.join(", ")}`
      });
    }
    if (!opt?.image && !opt?.prompt) {
      errors.push({
        field: "input",
        message: "Provide image or prompt"
      });
    }
    return {
      valid: errors.length === 0,
      errors: errors,
      warnings: warnings
    };
  }
  async req(endpoint, data = null, method = null) {
    try {
      const m = method || (data ? "post" : "get");
      const res = await this.http({
        url: endpoint,
        method: m,
        data: data,
        headers: {
          "x-auth-challenge": this.token,
          ...data ? {
            "content-type": "application/json"
          } : {}
        }
      });
      return res.data;
    } catch (err) {
      const errorData = err.response?.data || {
        message: err.message
      };
      throw new Error(`[API_ERR] ${endpoint}: ${JSON.stringify(errorData)}`);
    }
  }
  async auth() {
    try {
      console.log("🛡️  Authenticating...");
      this.token = this.rand;
      const res = await this.req("/sys/challenge/token");
      if (res?.data?.challenge_token) {
        this.token = res.data.challenge_token;
        console.log("✅ Auth Token Secured");
      }
    } catch (err) {
      throw new Error(`Auth Failed: ${err.message}`);
    }
  }
  async upload(image) {
    const urls = [];
    if (!image || Array.isArray(image) && image.length === 0) return urls;
    const list = Array.isArray(image) ? image : [image];
    try {
      const pre = await this.req(`/aigc/file/upload/request?f_suffix=png&count=${list.length}&unsafe=1`);
      const slots = pre?.data;
      let i = 0;
      for (const img of list) {
        console.log(`📤 Uploading ${i + 1}/${list.length}...`);
        let buffer;
        if (typeof img === "string" && img.startsWith("http")) {
          const fetchRes = await axios.get(img, {
            responseType: "arraybuffer"
          });
          buffer = fetchRes.data;
        } else {
          buffer = Buffer.isBuffer(img) ? img : Buffer.from(img);
        }
        await axios.put(slots[i]?.put, buffer, {
          headers: {
            "Content-Type": "image/png"
          }
        });
        urls.push(slots[i]?.get);
        i++;
      }
      return urls;
    } catch (err) {
      throw new Error(`Upload Failed: ${err.message}`);
    }
  }
  async generate(opt = {}) {
    try {
      const validation = this.validate(opt);
      if (!validation.valid) {
        return {
          success: false,
          errors: validation.errors,
          warnings: validation.warnings
        };
      }
      if (validation.warnings?.length > 0) {
        console.warn("⚠️  Warnings:", JSON.stringify(validation.warnings, null, 2));
      }
      await this.auth();
      const media_urls = await this.upload(opt?.image);
      const payload = {
        app_code: opt?.app || this.cfg.apps.COMBINER,
        model_code: opt?.model || this.cfg.models.combiner[0],
        media_urls: media_urls,
        extra_params: {},
        ...opt?.prompt && {
          user_prompt: opt.prompt
        },
        ...opt?.style && {
          style: opt.style
        },
        aspect_ratio: opt?.ratio || ""
      };
      console.log(`🚀 Task: ${payload.app_code} (${payload.model_code})`);
      const task = await this.req("/aigc/task/create", payload);
      const cid = task?.data?.creation_id;
      if (!cid) throw new Error("No Creation ID");
      this.token = "";
      const pollResult = await this.poll(cid);
      return {
        success: true,
        ...pollResult,
        creation_id: cid,
        app: payload.app_code,
        model: payload.model_code,
        style: opt?.style || null,
        warnings: validation.warnings
      };
    } catch (err) {
      console.error(`💀 Error: ${err.message}`);
      return {
        success: false,
        error: err.message
      };
    }
  }
  async poll(id) {
    console.log(`📋 Monitoring: ${id}`);
    for (let i = 0; i < 60; i++) {
      const res = await this.req(`/aigc/task/result/get?creation_id=${id}`);
      const status = res?.data?.status;
      if (status === 2) return {
        result: res?.data?.list
      };
      if (status === 3) throw new Error("Task failed");
      process.stdout.write("·");
      await new Promise(r => setTimeout(r, 3e3));
    }
    throw new Error("Timeout");
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  const api = new HeadshotMaster();
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