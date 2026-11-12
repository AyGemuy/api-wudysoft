import axios from "axios";
import FormData from "form-data";
import crypto from "crypto";
import apiConfig from "@/configs/apiConfig";
const BASE = "https://vosu.ai";
const MAIL = `https://${apiConfig.DOMAIN_URL}/api/mails/v34`;
const UA = "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/127.0.0.0 Mobile Safari/537.36";
const POLL_MS = 3e3,
  POLL_MAX = 60;
const IMG_MODELS = {
  "text-nano-banana-2": {
    api: "ai-image-generator",
    engine: "text-nano-banana-2",
    imgKey: null,
    multi: false,
    params: {
      aspect_ratio: "1:1",
      resolution: "1K"
    }
  },
  "image-nano-banana-2": {
    api: "ai-image-generator",
    engine: "image-nano-banana-2",
    imgKey: "image_urls",
    multi: true,
    params: {
      aspect_ratio: "auto",
      resolution: "1K"
    }
  },
  "text-nano-banana-pro": {
    api: "ai-image-generator",
    engine: "text-nano-banana-pro",
    imgKey: null,
    multi: false,
    params: {
      aspect_ratio: "1:1",
      resolution: "1K"
    }
  },
  "image-nano-banana-pro": {
    api: "ai-image-generator",
    engine: "image-nano-banana-pro",
    imgKey: "image_urls",
    multi: true,
    params: {
      aspect_ratio: "auto",
      resolution: "1K"
    }
  },
  "text-nano-banana": {
    api: "ai-image-generator",
    engine: "text-nano-banana",
    imgKey: null,
    multi: false,
    params: {
      aspect_ratio: "1:1"
    }
  },
  "image-nano-banana": {
    api: "ai-image-generator",
    engine: "image-nano-banana",
    imgKey: "image_urls",
    multi: true,
    params: {
      aspect_ratio: "auto"
    }
  },
  "text-gpt-image-2.0": {
    api: "ai-image-generator",
    engine: "text-gpt-image-2.0",
    imgKey: null,
    multi: false,
    params: {
      image_size: "landscape_4_3"
    }
  },
  "image-gpt-image-2.0": {
    api: "ai-image-generator",
    engine: "image-gpt-image-2.0",
    imgKey: "image_urls",
    multi: true,
    params: {
      image_size: "auto"
    }
  },
  "text-gpt-image-1.5": {
    api: "ai-image-generator",
    engine: "text-gpt-image-1.5",
    imgKey: null,
    multi: false,
    params: {
      image_size: "1024x1024"
    }
  },
  "image-gpt-image-1.5": {
    api: "ai-image-generator",
    engine: "image-gpt-image-1.5",
    imgKey: "image_urls",
    multi: true,
    params: {
      image_size: "auto"
    }
  },
  "text-gpt-image-1": {
    api: "ai-image-generator",
    engine: "text-gpt-image-1",
    imgKey: null,
    multi: false,
    params: {
      image_size: "auto"
    }
  },
  "image-gpt-image-1": {
    api: "ai-image-generator",
    engine: "image-gpt-image-1",
    imgKey: "image_urls",
    multi: true,
    params: {
      image_size: "auto"
    }
  },
  "text-gpt-image-1-mini": {
    api: "ai-image-generator",
    engine: "text-gpt-image-1-mini",
    imgKey: null,
    multi: false,
    params: {
      image_size: "auto"
    }
  },
  "image-gpt-image-1-mini": {
    api: "ai-image-generator",
    engine: "image-gpt-image-1-mini",
    imgKey: "image_urls",
    multi: true,
    params: {
      image_size: "auto"
    }
  },
  "text-z-image-turbo": {
    api: "ai-image-generator",
    engine: "text-z-image-turbo",
    imgKey: null,
    multi: false,
    params: {
      image_size: "landscape_4_3"
    }
  },
  "image-z-image-turbo": {
    api: "ai-image-generator",
    engine: "image-z-image-turbo",
    imgKey: "image_url",
    multi: false,
    params: {
      image_size: "auto"
    }
  },
  "text-z-image-turbo-lora": {
    api: "ai-image-generator",
    engine: "text-z-image-turbo-lora",
    imgKey: null,
    multi: false,
    params: {
      image_size: "landscape_4_3"
    }
  },
  "image-z-image-turbo-lora": {
    api: "ai-image-generator",
    engine: "image-z-image-turbo-lora",
    imgKey: "image_url",
    multi: false,
    params: {
      image_size: "auto"
    }
  },
  "text-flux-2-pro": {
    api: "ai-image-generator",
    engine: "text-flux-2-pro",
    imgKey: null,
    multi: false,
    params: {
      image_size: "landscape_4_3"
    }
  },
  "image-flux-2-pro": {
    api: "ai-image-generator",
    engine: "image-flux-2-pro",
    imgKey: "image_urls",
    multi: true,
    params: {
      image_size: "auto"
    }
  },
  "text-flux-2": {
    api: "ai-image-generator",
    engine: "text-flux-2",
    imgKey: null,
    multi: false,
    params: {
      image_size: "landscape_4_3"
    }
  },
  "image-flux-2": {
    api: "ai-image-generator",
    engine: "image-flux-2",
    imgKey: "image_urls",
    multi: true,
    params: {
      image_size: "landscape_4_3"
    }
  },
  "text-flux-2-flash": {
    api: "ai-image-generator",
    engine: "text-flux-2-flash",
    imgKey: null,
    multi: false,
    params: {
      image_size: "landscape_4_3"
    }
  },
  "image-flux-2-flash": {
    api: "ai-image-generator",
    engine: "image-flux-2-flash",
    imgKey: "image_urls",
    multi: true,
    params: {
      image_size: "square_hd"
    }
  },
  "text-flux-2-turbo": {
    api: "ai-image-generator",
    engine: "text-flux-2-turbo",
    imgKey: null,
    multi: false,
    params: {
      image_size: "landscape_4_3"
    }
  },
  "image-flux-2-turbo": {
    api: "ai-image-generator",
    engine: "image-flux-2-turbo",
    imgKey: "image_urls",
    multi: true,
    params: {
      image_size: "square_hd"
    }
  },
  "text-flux-2-lora": {
    api: "ai-image-generator",
    engine: "text-flux-2-lora",
    imgKey: null,
    multi: false,
    params: {
      image_size: "landscape_4_3"
    }
  },
  "image-flux-2-lora": {
    api: "ai-image-generator",
    engine: "image-flux-2-lora",
    imgKey: "image_urls",
    multi: true,
    params: {
      image_size: "square_hd"
    }
  },
  "text-flux-2-max": {
    api: "ai-image-generator",
    engine: "text-flux-2-max",
    imgKey: null,
    multi: false,
    params: {
      image_size: "landscape_4_3"
    }
  },
  "image-flux-2-max": {
    api: "ai-image-generator",
    engine: "image-flux-2-max",
    imgKey: "image_urls",
    multi: true,
    params: {
      image_size: "auto"
    }
  },
  "text-flux-pro-v1.1-ultra": {
    api: "ai-image-generator",
    engine: "text-flux-pro-v1.1-ultra",
    imgKey: null,
    multi: false,
    params: {
      aspect_ratio: "16:9"
    }
  },
  "image-flux-pro-v1.1-ultra-redux": {
    api: "ai-image-generator",
    engine: "image-flux-pro-v1.1-ultra-redux",
    imgKey: "image_url",
    multi: false,
    params: {
      aspect_ratio: "16:9"
    }
  },
  "text-flux-pro-v1.1": {
    api: "ai-image-generator",
    engine: "text-flux-pro-v1.1",
    imgKey: null,
    multi: false,
    params: {
      image_size: "landscape_4_3"
    }
  },
  "image-flux-pro-v1.1-redux": {
    api: "ai-image-generator",
    engine: "image-flux-pro-v1.1-redux",
    imgKey: "image_url",
    multi: false,
    params: {
      image_size: "landscape_4_3"
    }
  },
  "text-flux-kontext-lora": {
    api: "ai-image-generator",
    engine: "text-flux-kontext-lora",
    imgKey: null,
    multi: false,
    params: {
      image_size: "landscape_4_3"
    }
  },
  "image-flux-kontext-lora": {
    api: "ai-image-generator",
    engine: "image-flux-kontext-lora",
    imgKey: "image_url",
    multi: false,
    params: {
      resolution_mode: "match_input"
    }
  },
  "text-flux-pro-kontext": {
    api: "ai-image-generator",
    engine: "text-flux-pro-kontext",
    imgKey: null,
    multi: false,
    params: {
      aspect_ratio: "1:1"
    }
  },
  "image-flux-pro-kontext": {
    api: "ai-image-generator",
    engine: "image-flux-pro-kontext",
    imgKey: "image_url",
    multi: false,
    params: {
      aspect_ratio: "1:1"
    }
  },
  "text-flux-pro-kontext-max": {
    api: "ai-image-generator",
    engine: "text-flux-pro-kontext-max",
    imgKey: null,
    multi: false,
    params: {
      aspect_ratio: "1:1"
    }
  },
  "image-flux-pro-kontext-max": {
    api: "ai-image-generator",
    engine: "image-flux-pro-kontext-max",
    imgKey: "image_url",
    multi: false,
    params: {
      aspect_ratio: ""
    }
  },
  "text-flux-dev": {
    api: "ai-image-generator",
    engine: "text-flux-dev",
    imgKey: null,
    multi: false,
    params: {
      image_size: "landscape_4_3"
    }
  },
  "image-flux-dev-redux": {
    api: "ai-image-generator",
    engine: "image-flux-dev-redux",
    imgKey: "image_url",
    multi: false,
    params: {
      image_size: "landscape_4_3"
    }
  },
  "text-flux-lora": {
    api: "ai-image-generator",
    engine: "text-flux-lora",
    imgKey: null,
    multi: false,
    params: {
      image_size: "landscape_4_3"
    }
  },
  "image-flux-lora": {
    api: "ai-image-generator",
    engine: "image-flux-lora",
    imgKey: "image_url",
    multi: false,
    params: {
      image_size: "portrait_4_3"
    }
  },
  "text-flux-srpo-dev": {
    api: "ai-image-generator",
    engine: "text-flux-srpo-dev",
    imgKey: null,
    multi: false,
    params: {
      image_size: "landscape_4_3"
    }
  },
  "image-flux-srpo-dev": {
    api: "ai-image-generator",
    engine: "image-flux-srpo-dev",
    imgKey: "image_url",
    multi: false,
    params: {
      image_size: "landscape_4_3"
    }
  },
  "text-recraft-v3": {
    api: "ai-image-generator",
    engine: "text-recraft-v3",
    imgKey: null,
    multi: false,
    params: {
      image_size: "square_hd"
    }
  },
  "image-recraft-v3": {
    api: "ai-image-generator",
    engine: "image-recraft-v3",
    imgKey: "image_url",
    multi: false,
    params: {}
  },
  "text-reve": {
    api: "ai-image-generator",
    engine: "text-reve",
    imgKey: null,
    multi: false,
    params: {
      aspect_ratio: "3:2"
    }
  },
  "image-reve": {
    api: "ai-image-generator",
    engine: "image-reve",
    imgKey: "image_url",
    multi: false,
    params: {}
  },
  "text-luma-photon": {
    api: "ai-image-generator",
    engine: "text-luma-photon",
    imgKey: null,
    multi: false,
    params: {
      aspect_ratio: "1:1"
    }
  },
  "image-luma-photon": {
    api: "ai-image-generator",
    engine: "image-luma-photon",
    imgKey: "image_url",
    multi: false,
    params: {
      aspect_ratio: "16:9"
    }
  },
  "text-luma-photon-flash": {
    api: "ai-image-generator",
    engine: "text-luma-photon-flash",
    imgKey: null,
    multi: false,
    params: {
      aspect_ratio: "1:1"
    }
  },
  "image-luma-photon-flash": {
    api: "ai-image-generator",
    engine: "image-luma-photon-flash",
    imgKey: "image_url",
    multi: false,
    params: {
      aspect_ratio: "16:9"
    }
  },
  "text-minimax-image-1": {
    api: "ai-image-generator",
    engine: "text-minimax-image-1",
    imgKey: null,
    multi: false,
    params: {
      aspect_ratio: "1:1"
    }
  },
  "image-minimax-image-1": {
    api: "ai-image-generator",
    engine: "image-minimax-image-1",
    imgKey: "image_url",
    multi: false,
    params: {
      aspect_ratio: "1:1"
    }
  },
  "text-bytedance-seedream-v4": {
    api: "ai-image-generator",
    engine: "text-bytedance-seedream-v4",
    imgKey: null,
    multi: false,
    params: {
      image_size: "auto"
    }
  },
  "image-bytedance-seedream-v4": {
    api: "ai-image-generator",
    engine: "image-bytedance-seedream-v4",
    imgKey: "image_urls",
    multi: true,
    params: {
      image_size: "auto"
    }
  },
  "text-fal-ai-bytedance-seedream-v4.5": {
    api: "ai-image-generator",
    engine: "text-fal-ai-bytedance-seedream-v4.5",
    imgKey: null,
    multi: false,
    params: {
      image_size: "square_hd"
    }
  },
  "image-fal-ai-bytedance-seedream-v4.5": {
    api: "ai-image-generator",
    engine: "image-fal-ai-bytedance-seedream-v4.5",
    imgKey: "image_urls",
    multi: true,
    params: {
      image_size: "square_hd"
    }
  },
  "text-fal-ai-bytedance-seedream-v5-lite": {
    api: "ai-image-generator",
    engine: "text-fal-ai-bytedance-seedream-v5-lite",
    imgKey: null,
    multi: false,
    params: {
      image_size: "auto_2K"
    }
  },
  "image-fal-ai-bytedance-seedream-v5-lite": {
    api: "ai-image-generator",
    engine: "image-fal-ai-bytedance-seedream-v5-lite",
    imgKey: "image_urls",
    multi: true,
    params: {
      image_size: "auto_2K"
    }
  },
  "text-xai-grok-imagine-image": {
    api: "ai-image-generator",
    engine: "text-xai-grok-imagine-image",
    imgKey: null,
    multi: false,
    params: {
      aspect_ratio: "1:1"
    }
  },
  "image-xai-grok-imagine-image": {
    api: "ai-image-generator",
    engine: "image-xai-grok-imagine-image",
    imgKey: "image_url",
    multi: false,
    params: {}
  },
  "image-kling-image-o3": {
    api: "ai-image-generator",
    engine: "image-kling-image-o3",
    imgKey: "image_urls",
    multi: true,
    params: {
      aspect_ratio: "auto",
      resolution: "1K"
    }
  },
  "image-kling-image-v3": {
    api: "ai-image-generator",
    engine: "image-kling-image-v3",
    imgKey: "image_url",
    multi: false,
    params: {
      aspect_ratio: "16:9",
      resolution: "1K"
    }
  },
  "text-qwen-image-2-pro": {
    api: "ai-image-generator",
    engine: "text-qwen-image-2-pro",
    imgKey: null,
    multi: false,
    params: {
      image_size: "square_hd"
    }
  },
  "image-qwen-image-2-pro": {
    api: "ai-image-generator",
    engine: "image-qwen-image-2-pro",
    imgKey: "image_urls",
    multi: true,
    params: {
      image_size: "square_hd"
    }
  },
  "text-qwen-image-2": {
    api: "ai-image-generator",
    engine: "text-qwen-image-2",
    imgKey: null,
    multi: false,
    params: {
      image_size: "square_hd"
    }
  },
  "image-qwen-image-2": {
    api: "ai-image-generator",
    engine: "image-qwen-image-2",
    imgKey: "image_urls",
    multi: true,
    params: {
      image_size: "square_hd"
    }
  },
  "text-ideogram-v3": {
    api: "ai-image-generator",
    engine: "text-ideogram-v3",
    imgKey: null,
    multi: false,
    params: {
      rendering_speed: "BALANCED",
      image_size: "square_hd"
    }
  },
  "image-ideogram-v3": {
    api: "ai-image-generator",
    engine: "image-ideogram-v3",
    imgKey: "image_url",
    multi: false,
    params: {
      rendering_speed: "BALANCED"
    }
  },
  "text-wan-v2.7": {
    api: "ai-image-generator",
    engine: "text-wan-v2.7",
    imgKey: null,
    multi: false,
    params: {
      image_size: "square_hd"
    }
  },
  "image-wan-v2.7": {
    api: "ai-image-generator",
    engine: "image-wan-v2.7",
    imgKey: "image_urls",
    multi: true,
    params: {
      image_size: "square_hd"
    }
  },
  "text-wan-v2.7-pro": {
    api: "ai-image-generator",
    engine: "text-wan-v2.7-pro",
    imgKey: null,
    multi: false,
    params: {
      image_size: "square_hd"
    }
  },
  "image-wan-v2.7-pro": {
    api: "ai-image-generator",
    engine: "image-wan-v2.7-pro",
    imgKey: "image_urls",
    multi: true,
    params: {
      image_size: "square_hd"
    }
  }
};
const MUSIC_MODELS = {
  "elevenlabs-music": {
    api: "ai-music-generator",
    engine: "elevenlabs-music",
    settingsPlace: "promptStart",
    fields: ["prompt", "vocal_gender", "output_format", "music_style"]
  },
  "minimax-music-v2": {
    api: "ai-music-generator",
    engine: "minimax-music-v2",
    settingsPlace: "promptStart",
    fields: ["prompt", "lyrics_prompt"]
  },
  "lyria-3.0-pro": {
    api: "ai-music-generator",
    engine: "lyria-3.0-pro",
    settingsPlace: "promptStart",
    fields: ["prompt"]
  }
};
const ALL_MODELS = {
  ...IMG_MODELS,
  ...MUSIC_MODELS
};
const b64e = s => Buffer.from(s).toString("base64");
const b64d = s => Buffer.from(s, "base64").toString();
class Vosu {
  constructor() {
    this.http = axios.create({
      baseURL: BASE,
      headers: {
        "user-agent": UA,
        accept: "*/*",
        "accept-language": "id-ID",
        "cache-control": "no-cache",
        pragma: "no-cache"
      },
      withCredentials: true
    });
    this._jar = {};
    this.state = null;
    this.http.interceptors.request.use(cfg => {
      const c = Object.entries(this._jar).map(([k, v]) => `${k}=${v}`).join("; ");
      if (c) cfg.headers["cookie"] = c;
      return cfg;
    });
    this.http.interceptors.response.use(res => {
      for (const raw of res.headers?.["set-cookie"] || []) {
        const [pair] = raw.split(";");
        const idx = pair.indexOf("=");
        if (idx > 0) this._jar[pair.slice(0, idx).trim()] = pair.slice(idx + 1).trim();
      }
      return res;
    }, err => Promise.reject(err));
  }
  validateModel(engine) {
    const m = ALL_MODELS[engine];
    if (!m) {
      const available = Object.keys(ALL_MODELS).join(", ");
      throw new Error(`[model] engine "${engine}" tidak ditemukan.\nModel tersedia: ${available}`);
    }
    return m;
  }
  validateInput({
    engine,
    prompt,
    image,
    ...opts
  }) {
    const m = ALL_MODELS[engine];
    const isMusic = !!MUSIC_MODELS[engine];
    if (!isMusic && m.imgKey && m.imgKey !== null) {
      const imgRequired = ["image-kling-image-o3", "image-kling-image-v3"].includes(engine) || engine.startsWith("image-");
      if (imgRequired && !image) {
        throw new Error(`[input] engine "${engine}" memerlukan input image.`);
      }
    }
    if (m.multi === false && Array.isArray(image) && image.length > 1) {
      throw new Error(`[input] engine "${engine}" hanya mendukung 1 gambar, bukan array.`);
    }
    if (!prompt || prompt.trim().length < 10) {
      throw new Error(`[input] prompt minimal 10 karakter.`);
    }
  }
  async _mkMail() {
    console.log("[mail] create temp email...");
    const {
      data
    } = await axios.get(`${MAIL}?action=create`);
    const {
      token,
      email
    } = data?.result || {};
    console.log("[mail] email:", email);
    return {
      token: token,
      email: email
    };
  }
  async _waitMail(token, keyword = "verify", ms = 4e3, tries = 20) {
    for (let i = 0; i < tries; i++) {
      console.log(`[mail] polling inbox (${i + 1}/${tries})...`);
      await new Promise(r => setTimeout(r, ms));
      const {
        data
      } = await axios.get(`${MAIL}?action=message&token=${token}`);
      const msgs = data?.result?.messages || [];
      const hit = msgs.find(m => (m.bodyHtml || m.subject || "").toLowerCase().includes(keyword));
      if (hit) return hit;
    }
    throw new Error("mail: verification email not received");
  }
  _extractToken(html = "") {
    return html.match(/token=([A-Za-z0-9_\-]+)/)?.[1] || null;
  }
  async _register() {
    const {
      token: mailToken,
      email
    } = await this._mkMail();
    const pass = email;
    console.log("[auth] registering...");
    await this.http.post("/api/auth/email/register", {
      email: email,
      name: email,
      password: pass
    }, {
      headers: {
        "content-type": "application/json",
        origin: BASE,
        referer: `${BASE}/auth/register`
      }
    });
    console.log("[auth] waiting verify email...");
    const msg = await this._waitMail(mailToken, "verify");
    const vtoken = this._extractToken(msg.bodyHtml || "");
    if (!vtoken) throw new Error("verify token not found in email");
    console.log("[auth] verifying email...");
    await this.http.post("/api/auth/email/verify", {
      token: vtoken
    }, {
      headers: {
        "content-type": "application/json",
        origin: BASE,
        referer: `${BASE}/auth/verify`
      }
    });
    console.log("[auth] fetching csrf...");
    const csrf = await this._csrf();
    console.log("[auth] logging in...");
    await this.http.post("/api/auth/callback/credentials", new URLSearchParams({
      redirect: "false",
      email: email,
      password: pass,
      callbackUrl: "/",
      csrfToken: csrf,
      json: "true"
    }).toString(), {
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        origin: BASE,
        referer: `${BASE}/auth/login?verified=1`
      }
    });
    await this._onboard();
    await this._claim();
    this.state = b64e(JSON.stringify({
      email: email,
      pass: pass,
      jar: this._jar
    }));
    console.log("[auth] done. state saved.");
    return this.state;
  }
  async _csrf() {
    const {
      data
    } = await this.http.get("/api/auth/csrf", {
      headers: {
        referer: `${BASE}/auth/login?verified=1`
      }
    });
    return data?.csrfToken || this._jar["__Host-vosu.csrf-token"]?.split("%7C")[0] || "";
  }
  async _onboard() {
    console.log("[onboard] completing steps...");
    const ref = `${BASE}/onboarding?callbackUrl=%2Fhome`;
    const base = {
      "How do you plan to use VOSU?": ["Create content for clients"]
    };
    const steps = [{
      stepId: "use_plan",
      answers: {
        ...base
      }
    }, {
      stepId: "experience",
      answers: {
        ...base,
        "How experienced are you with AI?": "Beginner"
      }
    }, {
      stepId: "create_first",
      answers: {
        ...base,
        "How experienced are you with AI?": "Beginner",
        "What do you want to create first?": ["UGC Ads & Product Videos"]
      }
    }, {
      stepId: "frustrations",
      answers: {
        ...base,
        "How experienced are you with AI?": "Beginner",
        "What do you want to create first?": ["UGC Ads & Product Videos"],
        "What frustrates you most about AI content generation?": ["Switching between too many AI tools"]
      }
    }, {
      stepId: "referral",
      answers: {
        ...base,
        "How experienced are you with AI?": "Beginner",
        "What do you want to create first?": ["UGC Ads & Product Videos"],
        "What frustrates you most about AI content generation?": ["Switching between too many AI tools"],
        "How did you hear about VOSU?": ["Instagram"]
      }
    }];
    for (const body of steps) {
      await this.http.post("/api/onboarding/step", body, {
        headers: {
          "content-type": "application/json",
          origin: BASE,
          referer: ref
        }
      });
    }
    await this.http.post("/api/onboarding/complete", {
      answers: {
        ...base,
        "How experienced are you with AI?": "Beginner",
        "What do you want to create first?": ["UGC Ads & Product Videos"],
        "What frustrates you most about AI content generation?": ["Switching between too many AI tools"],
        "How did you hear about VOSU?": ["Instagram"]
      }
    }, {
      headers: {
        "content-type": "application/json",
        origin: BASE,
        referer: ref
      }
    });
  }
  async _claim() {
    console.log("[rewards] claiming...");
    try {
      await this.http.post("/api/rewards/claim", null, {
        headers: {
          "content-length": "0",
          "content-type": "application/json",
          origin: BASE
        }
      });
    } catch (_) {}
  }
  async init(state = null) {
    const s = state || this.state;
    if (s) {
      try {
        const {
          jar
        } = JSON.parse(b64d(s));
        this._jar = jar || {};
        this.state = s;
        console.log("[init] restored session from state");
        return s;
      } catch (_) {}
    }
    return this._register();
  }
  async _upload(src, mime = "image/jpeg", fname = "upload.jpg") {
    console.log("[upload] resolving image...");
    let buf;
    if (Buffer.isBuffer(src)) {
      buf = src;
    } else if (typeof src === "string" && /^https?:\/\//.test(src)) {
      const {
        data
      } = await axios.get(src, {
        responseType: "arraybuffer"
      });
      buf = Buffer.from(data);
    } else if (typeof src === "string") {
      buf = Buffer.from(src.replace(/^data:[^;]+;base64,/, ""), "base64");
    } else {
      throw new Error("image: unsupported input type");
    }
    const fd = new FormData();
    fd.append("file", buf, {
      filename: fname,
      contentType: mime
    });
    console.log("[upload] uploading...");
    const {
      data
    } = await this.http.post("/api/upload/expirable?type=image&expiresInSeconds=7200&expirable=false", fd, {
      headers: {
        ...fd.getHeaders(),
        origin: BASE
      }
    });
    const url = data?.file?.url;
    console.log("[upload] url:", url);
    return url;
  }
  async _poll(actId, histType = "image") {
    for (let i = 0; i < POLL_MAX; i++) {
      await new Promise(r => setTimeout(r, POLL_MS));
      console.log(`[poll] checking ${actId} (${i + 1}/${POLL_MAX})...`);
      try {
        const {
          data
        } = await this.http.get(`/api/user/history/${actId}?type=${histType}`);
        const item = data?.item;
        if (item?.status === "completed") {
          console.log("[poll] completed!");
          return item;
        }
        if (item?.status === "failed") throw new Error("task failed: " + (item.errorMessage || "unknown"));
      } catch (e) {
        if (e.message.startsWith("task failed")) throw e;
      }
    }
    throw new Error("poll: timeout");
  }
  _buildImgPayload(meta, imageUrls, prompt, opts) {
    const payload = {
      prompt: prompt,
      ...meta.params
    };
    const allowed = new Set([...Object.keys(meta.params), "aspect_ratio", "resolution", "image_size", "rendering_speed", "resolution_mode"]);
    for (const [k, v] of Object.entries(opts)) {
      if (allowed.has(k)) payload[k] = v;
    }
    if (imageUrls.length && meta.imgKey) {
      payload[meta.imgKey] = meta.multi ? imageUrls : imageUrls[0];
    }
    return payload;
  }
  _buildMusicPayload(meta, prompt, opts) {
    const musicStyle = opts.musicStyle || opts.music_style || "pop, rock";
    const vocalGender = opts.vocalGender || opts.vocal_gender || "male";
    const outputFormat = opts.outputFormat || opts.output_format || "mp3_44100_128";
    const lyricsPrompt = opts.lyricsPrompt || opts.lyrics_prompt || "";
    let fullPrompt = prompt;
    if (meta.engine === "elevenlabs-music") {
      fullPrompt = `Music style: ${musicStyle}. ${vocalGender === "male" ? "Male" : "Female"} vocals. Output format: MP3 128kbps. ${prompt}`;
    }
    const payload = {
      prompt: fullPrompt
    };
    if (meta.engine === "elevenlabs-music") {
      payload.vocal_gender = vocalGender;
      payload.output_format = outputFormat;
      if (opts.music_style) payload.music_style = musicStyle;
    } else if (meta.engine === "minimax-music-v2") {
      payload.lyrics_prompt = lyricsPrompt;
    }
    const settings = {
      outputNumber: opts.outputNumber || 1
    };
    const musicSettings = meta.engine === "elevenlabs-music" ? {
      musicStyle: musicStyle,
      vocalGender: vocalGender,
      outputFormat: outputFormat
    } : {};
    return {
      payload: payload,
      settings: settings,
      musicSettings: musicSettings
    };
  }
  async generate({
    state,
    engine,
    type,
    prompt,
    image,
    ...opts
  }) {
    try {
      await this.init(state || this.state);
      const isMusic = type === "music";
      let resolvedEngine = engine;
      if (!resolvedEngine) {
        if (isMusic) {
          resolvedEngine = "elevenlabs-music";
        } else if (image) {
          resolvedEngine = "image-nano-banana-2";
        } else {
          resolvedEngine = "text-nano-banana-2";
        }
      }
      const meta = this.validateModel(resolvedEngine);
      this.validateInput({
        engine: resolvedEngine,
        prompt: prompt,
        image: image,
        ...opts
      });
      let imageUrls = [];
      if (image && !isMusic) {
        const imgs = Array.isArray(image) ? image : [image];
        for (const src of imgs) {
          imageUrls.push(await this._upload(src));
        }
      }
      const apiType = meta.api;
      const endpoint = `/api/engine/v2/${apiType}?engine=${resolvedEngine}`;
      const referer = `${BASE}/generate/${isMusic ? "music" : "image"}/${resolvedEngine}`;
      let body;
      if (isMusic) {
        const {
          payload,
          settings,
          musicSettings
        } = this._buildMusicPayload(meta, prompt, opts);
        body = {
          payload: payload,
          settings: settings,
          ...Object.keys(musicSettings).length ? {
            musicSettings: musicSettings
          } : {}
        };
      } else {
        const payload = this._buildImgPayload(meta, imageUrls, prompt, opts);
        body = {
          payload: payload,
          settings: {
            outputNumber: opts.outputNumber || 1
          }
        };
      }
      console.log(`[generate] submitting ${resolvedEngine}...`);
      const {
        data
      } = await this.http.post(endpoint, body, {
        headers: {
          "content-type": "application/json",
          origin: BASE,
          referer: referer
        }
      });
      const actId = data?.data?.activityId;
      if (!actId) throw new Error("no activityId returned: " + JSON.stringify(data));
      console.log("[generate] activityId:", actId);
      const histType = isMusic ? "audio" : "image";
      const result = await this._poll(actId, histType);
      return {
        state: this.state,
        result: result
      };
    } catch (err) {
      console.error("[generate] error:", err?.response?.data || err.message);
      throw err;
    }
  }
  models(type) {
    if (type === "music") return Object.keys(MUSIC_MODELS);
    if (type === "image") return Object.keys(IMG_MODELS);
    return Object.keys(ALL_MODELS);
  }
}
export default async function handler(req, res) {
  const params = req.method === "GET" ? req.query : req.body;
  if (!params.prompt) {
    return res.status(400).json({
      error: "Parameter 'prompt' diperlukan"
    });
  }
  const api = new Vosu();
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